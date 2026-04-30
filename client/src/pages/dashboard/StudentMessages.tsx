import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import {
    Send,
    Search,
    MessageSquare,
    Loader2,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OtherUser {
    id: string;
    name: string;
    email: string;
}

interface Conversation {
    conversationId: string;
    otherId: string;
    otherUser: OtherUser;
    lastMessage: string;
    lastAt: string;
    unreadCount: number;
}

interface Message {
    id: number;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'meeting_link';
    isRead: boolean;
    sentAt: string;
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
    const isMeetingLink = msg.type === 'meeting_link';
    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
                className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${isMine
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
            >
                {isMeetingLink ? (
                    <a
                        href={msg.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm font-medium underline ${isMine ? 'text-indigo-200' : 'text-indigo-600'}`}
                    >
                        🎥 Join Meeting
                    </a>
                ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-300' : 'text-gray-400'} text-right`}>
                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentMessages() {
    console.log('[StudentMessages] render called');

    const { conversationId: paramConvId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();
    const { user, getIdToken } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [convsLoading, setConvsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [activeConvId, setActiveConvId] = useState<string | null>(paramConvId ?? null);
    const [activeReceiverId, setActiveReceiverId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Keep track of active conversation for socket events without stale closures
    const activeConvIdRef = useRef<string | null>(activeConvId);
    useEffect(() => {
        activeConvIdRef.current = activeConvId;
    }, [activeConvId]);

    // ── Socket Connection ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.uid) return;

        const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] });

        socket.on('connect', () => {
            console.log('[StudentMessages] socket connected');
            socket.emit('join_user_room', user.uid);
        });

        socket.on('new_message', (newMessage: Message) => {
            console.log('[StudentMessages] socket new_message received', newMessage);

            // 1. Update messages array if this message belongs to the active conversation
            setMessages((prev) => {
                // To avoid duplicate messages (if sender receives their own broadcast via socket after HTTP response)
                if (prev.some((m) => m.id === newMessage.id)) return prev;

                if (activeConvIdRef.current === newMessage.conversationId) {
                    return [...prev, newMessage];
                }
                return prev;
            });

            // 2. Update conversations list
            setConversations((prev) => {
                const updated = prev.map((conv) => {
                    if (conv.conversationId === newMessage.conversationId) {
                        const isReceiver = newMessage.receiverId === user.uid;
                        const isNotActive = activeConvIdRef.current !== newMessage.conversationId;
                        return {
                            ...conv,
                            lastMessage: newMessage.content,
                            lastAt: newMessage.sentAt,
                            unreadCount: (isReceiver && isNotActive) ? conv.unreadCount + 1 : conv.unreadCount,
                        };
                    }
                    return conv;
                });

                // Sort updated to bring the latest conversation to top
                updated.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
                return updated;
            });
        });

        return () => {
            socket.disconnect();
            console.log('[StudentMessages] socket disconnected');
        };
    }, [user?.uid]);

    // ── Fetch conversations ───────────────────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        console.log('[StudentMessages] fetchConversations called');
        try {
            const token = await getIdToken();
            const data = await apiClient.get('/messages/conversations', token);
            setConversations(data);
            console.log('[StudentMessages] fetchConversations success', { count: data.length });
        } catch (err) {
            console.error('[StudentMessages] fetchConversations error', err);
        } finally {
            setConvsLoading(false);
        }
    }, [getIdToken]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Resolve receiverId when arriving via URL param
    useEffect(() => {
        if (paramConvId && conversations.length > 0 && !activeReceiverId) {
            const conv = conversations.find((c) => c.conversationId === paramConvId);
            if (conv) setActiveReceiverId(conv.otherId);
        }
    }, [paramConvId, conversations, activeReceiverId]);

    // ── Fetch messages (with polling) ─────────────────────────────────────────
    const fetchMessages = useCallback(async (convId: string) => {
        console.log('[StudentMessages] fetchMessages called', { convId });
        try {
            const token = await getIdToken();
            const data = await apiClient.get(`/messages/${convId}`, token);
            setMessages(data);
        } catch (err) {
            console.error('[StudentMessages] fetchMessages error', err);
        }
    }, [getIdToken]);

    useEffect(() => {
        if (!activeConvId) return;
        setMsgsLoading(true);
        fetchMessages(activeConvId).finally(() => setMsgsLoading(false));
    }, [activeConvId, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Select conversation ────────────────────────────────────────────────────
    const handleSelectConv = useCallback((conv: Conversation) => {
        console.log('[StudentMessages] handleSelectConv called', { convId: conv.conversationId });
        setActiveConvId(conv.conversationId);
        setActiveReceiverId(conv.otherId);
        navigate(`/messages/${conv.conversationId}`, { replace: true });
    }, [navigate]);

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (sending) return;
        const content = messageInput.trim();
        if (!content || !activeReceiverId) return;
        console.log('[StudentMessages] handleSend called', { content });
        setSending(true);
        try {
            const token = await getIdToken();
            const sentMsg = await apiClient.post(`/messages/send/${activeReceiverId}`, { content }, token);
            setMessageInput('');
            
            // Immediate update for the sender (fallback in case socket is delayed)
            if (sentMsg && sentMsg.id) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                
                // Update conversation preview immediately
                setConversations((prev) => {
                    const updated = prev.map((conv) => {
                        if (conv.conversationId === sentMsg.conversationId) {
                            return { ...conv, lastMessage: sentMsg.content, lastAt: sentMsg.sentAt };
                        }
                        return conv;
                    });
                    updated.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
                    return updated;
                });
            }

            console.log('[StudentMessages] handleSend success');
        } catch (err) {
            console.error('[StudentMessages] handleSend error', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sending) {
                handleSend();
            }
        }
    };

    const filteredConvs = conversations.filter((c) =>
        c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeConv = conversations.find((c) => c.conversationId === activeConvId);

    return (
        <DashboardLayout role="student">
            <div className="h-[calc(100vh-9rem)] flex bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                {/* ── LEFT: Conversation list ──────────────────────────── */}
                <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
                    <div className="px-4 py-4 border-b border-gray-50">
                        <h2 className="font-bold text-gray-800 mb-3">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="message-search"
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {convsLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                                            <div className="h-2.5 bg-gray-100 rounded w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
                                <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">No conversations yet.</p>
                                <p className="text-xs text-gray-300 mt-1">
                                    Conversations will appear here after a tutor accepts your request.
                                </p>
                            </div>
                        ) : (
                            filteredConvs.map((conv) => (
                                <button
                                    key={conv.conversationId}
                                    id={`conv-${conv.conversationId}`}
                                    onClick={() => handleSelectConv(conv)}
                                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeConvId === conv.conversationId ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                                        }`}
                                >
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                                        {conv.otherUser.name[0]?.toUpperCase() ?? 'T'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{conv.otherUser.name}</p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                                {new Date(conv.lastAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="ml-1 flex-shrink-0 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Chat window ───────────────────────────────── */}
                {!activeConvId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                        <div className="p-5 bg-indigo-50 rounded-full mb-5">
                            <MessageSquare className="h-10 w-10 text-indigo-400" />
                        </div>
                        <h3 className="font-semibold text-gray-700 text-lg">Your messages</h3>
                        <p className="text-gray-400 text-sm mt-1.5 max-w-xs">
                            Select a conversation from the left panel to start chatting with your tutor.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Chat header */}
                        <div className="flex items-center px-5 py-3.5 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700">
                                    {activeConv?.otherUser.name[0]?.toUpperCase() ?? 'T'}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{activeConv?.otherUser.name ?? 'Tutor'}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">Active</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/50">
                            {msgsLoading && messages.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 text-sm">No messages yet. Say hello! 👋</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === user?.uid} />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="px-5 py-4 border-t border-gray-100 bg-white">
                            <div className="flex items-end gap-3">
                                <textarea
                                    id="student-message-input"
                                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none max-h-28 overflow-y-auto"
                                />
                                <button
                                    id="student-send-message-btn"
                                    onClick={handleSend}
                                    disabled={!messageInput.trim() || sending}
                                    className="p-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0"
                                >
                                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
