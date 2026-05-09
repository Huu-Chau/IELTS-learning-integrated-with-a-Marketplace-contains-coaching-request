import { Server, Socket } from 'socket.io';
import { registerSpeakingSocketHandlers } from '../speakingSessionController';
import { Ollama } from 'ollama';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { storageProvider } from '../../services/storage/StorageService';
import { attemptService } from '../../services/attemptService';
import MockMaterial from '../../models/MockMaterial';

// --- Mocks ---
jest.mock('ollama');
jest.mock('fs');
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => callback(null, { stdout: '{"text": "mock transcript"}' }, { stderr: '' }))
}));
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: (fn: any) => {
      // If it's exec, mock it to return resolved promise
      if (fn.name === 'exec' || fn === jest.requireMock('child_process').exec) {
         return jest.fn().mockResolvedValue({ stdout: '{"text": "mock transcript", "fluency": {"wordsPerMinute": 100, "pauseCount": 0, "avgPauseDuration": 0, "longestPause": 0, "wordCount": 2}}' });
      }
      return originalUtil.promisify(fn);
    }
  };
});
jest.mock('../../services/storage/StorageService', () => ({
  storageProvider: {
    uploadFile: jest.fn(),
  },
}));
jest.mock('../../services/attemptService', () => ({
  attemptService: {
    createAttempt: jest.fn(),
  },
}));
jest.mock('../../models/MockMaterial', () => ({
  findOne: jest.fn(),
}));

describe('speakingSessionController', () => {
  let mockIo: Partial<Server>;
  let mockSocket: Partial<Socket>;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    handlers = {};

    mockSocket = {
      id: 'socket-123',
      on: jest.fn().mockImplementation((event, callback) => {
        handlers[event] = callback;
        return mockSocket;
      }),
      emit: jest.fn(),
    };

    mockIo = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'connection') {
          callback(mockSocket as Socket);
        }
        return mockIo;
      }),
    };

    (Ollama as jest.Mock).mockImplementation(() => ({
      list: jest.fn().mockResolvedValue({}),
      chat: jest.fn().mockResolvedValue((async function* () {
        yield { message: { content: 'Mock response' } };
      })()),
    }));

    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('mock audio data'));
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

    jest.clearAllMocks();
  });

  it('should register connection handler', () => {
    registerSpeakingSocketHandlers(mockIo as Server);
    expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('speaking:start', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('speaking:audio', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('speaking:end', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  describe('socket events', () => {
    beforeEach(() => {
      registerSpeakingSocketHandlers(mockIo as Server);
    });

    describe('speaking:start', () => {
      it('should initialize session and emit ready event with default random topic', async () => {
        await handlers['speaking:start']();

        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:ready', expect.objectContaining({
          topicInfo: expect.any(Object),
          greeting: expect.any(String),
        }));
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:ai_audio', expect.any(Buffer));
      });

      it('should load topic from DB if setId and testNum are provided', async () => {
        const mockContent = {
          tests: [{
            test_number: 1,
            parts: [
              { part_number: 1, topic: 'DB Topic 1' },
              { part_number: 2, topic: 'DB Topic 2' },
              { part_number: 3, topic: 'DB Topic 3' }
            ]
          }]
        };
        (MockMaterial.findOne as jest.Mock).mockResolvedValue({ content: mockContent });

        await handlers['speaking:start']({ setId: 'cambridge-19', testNum: 1 });

        expect(MockMaterial.findOne).toHaveBeenCalledWith({
          where: { skill: 'SPEAKING', book: 'Cambridge 19' }
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:ready', expect.objectContaining({
          topicInfo: expect.any(Object),
          greeting: expect.stringContaining('DB Topic 1'),
        }));
      });

      it('should emit error if Ollama is unreachable', async () => {
        (Ollama as jest.Mock).mockImplementation(() => ({
          list: jest.fn().mockRejectedValue(new Error('Connection refused')),
        }));

        await handlers['speaking:start']();

        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:error', { message: 'Could not connect to AI model. Is Ollama running?' });
      });
    });

    describe('speaking:audio', () => {
      beforeEach(async () => {
        // Start a session first to populate the map
        await handlers['speaking:start']({ userId: 'user123' });
        (mockSocket.emit as jest.Mock).mockClear();
      });

      it('should emit error if no active session', async () => {
        // change socket id to simulate no session
        (mockSocket as any).id = 'socket-456';
        await handlers['speaking:audio']({ audio: Buffer.from('data'), mimeType: 'audio/webm' });
        
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:error', { message: 'No active session. Please start a new test.' });
      });

      it('should process audio, generate transcript and AI response', async () => {
        await handlers['speaking:audio']({ audio: Buffer.from('data'), mimeType: 'audio/webm' });

        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:processing', { status: 'transcribing' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:transcript', { speaker: 'user', text: 'mock transcript' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:processing', { status: 'thinking' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:transcript', { speaker: 'ai', text: 'Mock response' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:processing', { status: 'speaking' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:ai_audio', expect.any(Buffer));
      });
    });

    describe('speaking:end', () => {
      beforeEach(async () => {
        // Start a session first to populate the map
        await handlers['speaking:start']({ userId: 'user123' });
        (mockSocket.emit as jest.Mock).mockClear();

        // Feed some audio to get chunks
        await handlers['speaking:audio']({ audio: Buffer.from('data'), mimeType: 'audio/webm' });
        (mockSocket.emit as jest.Mock).mockClear();
      });

      it('should emit error if no active session', async () => {
        (mockSocket as any).id = 'socket-456';
        await handlers['speaking:end']();
        
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:error', { message: 'No active session to evaluate.' });
      });

      it('should evaluate the session, upload recording, and save attempt', async () => {
        const mockOllamaChat = jest.fn().mockResolvedValue((async function* () {
          yield { message: { content: 'Overall Estimated Band Score: 7.5' } };
        })());
        (Ollama as jest.Mock).mockImplementation(() => ({
          list: jest.fn().mockResolvedValue({}),
          chat: mockOllamaChat,
        }));

        (storageProvider.uploadFile as jest.Mock).mockResolvedValue('http://mock-storage/master.webm');
        (attemptService.createAttempt as jest.Mock).mockResolvedValue({ id: 999 });

        await handlers['speaking:end']();

        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:processing', { status: 'evaluating' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:evaluation_chunk', { text: 'Overall Estimated Band Score: 7.5' });
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:evaluation_done');
        
        expect(storageProvider.uploadFile).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:recording_saved', { recordingPath: 'http://mock-storage/master.webm' });

        expect(attemptService.createAttempt).toHaveBeenCalledWith(expect.objectContaining({
          userId: 'user123',
          type: 'speaking',
          score: 7.5,
          recordingPath: 'http://mock-storage/master.webm',
        }));
        
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:result_saved', { attemptId: 999, bandScore: 7.5 });
      });
      
      it('should handle evaluation failure gracefully', async () => {
         (Ollama as jest.Mock).mockImplementation(() => ({
          list: jest.fn().mockResolvedValue({}),
          chat: jest.fn().mockRejectedValue(new Error('AI Eval failed')),
        }));

        await handlers['speaking:end']();

        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:error', { message: 'Evaluation failed.' });
      });
    });

    describe('disconnect', () => {
      it('should clean up the session on disconnect', async () => {
        await handlers['speaking:start']({ userId: 'user123' });
        await handlers['disconnect']();
        
        // Ensure session is deleted, test by triggering end and expecting no session error
        await handlers['speaking:end']();
        expect(mockSocket.emit).toHaveBeenCalledWith('speaking:error', { message: 'No active session to evaluate.' });
      });
    });
  });
});
