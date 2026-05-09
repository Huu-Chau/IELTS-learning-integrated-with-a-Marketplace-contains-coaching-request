import { PostgresMockMaterialStorage } from '../PostgresMockMaterialStorage';
import MockMaterial from '../../models/MockMaterial';

jest.mock('../../models/MockMaterial', () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
}));

describe('PostgresMockMaterialStorage', () => {
  let storage: PostgresMockMaterialStorage;

  beforeEach(() => {
    storage = new PostgresMockMaterialStorage();
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return material when found', async () => {
      const mockMaterial = { id: 'uuid-1', title: 'Test' };
      (MockMaterial.findByPk as jest.Mock).mockResolvedValue(mockMaterial);

      const result = await storage.getById('uuid-1');

      expect(MockMaterial.findByPk).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockMaterial);
    });

    it('should return null when not found', async () => {
      (MockMaterial.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await storage.getById('uuid-non-existent');

      expect(result).toBeNull();
    });

    it('should throw error when database fails', async () => {
      const error = new Error('DB Error');
      (MockMaterial.findByPk as jest.Mock).mockRejectedValue(error);

      await expect(storage.getById('uuid-1')).rejects.toThrow('DB Error');
    });
  });

  describe('getAllBySkill', () => {
    it('should return materials for a specific skill', async () => {
      const mockMaterials = [{ id: '1', skill: 'READING' }];
      (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

      const result = await storage.getAllBySkill('reading');

      expect(MockMaterial.findAll).toHaveBeenCalledWith({
        where: { skill: 'READING' },
        order: [['book', 'ASC'], ['test_number', 'ASC']],
      });
      expect(result).toEqual(mockMaterials);
    });

    it('should throw error when database fails', async () => {
      (MockMaterial.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(storage.getAllBySkill('LISTENING')).rejects.toThrow('DB Error');
    });
  });

  describe('getByBookAndSkill', () => {
    it('should translate numeric book to "Cambridge X" and return materials', async () => {
      const mockMaterials = [{ id: '1', book: 'Cambridge 18' }];
      (MockMaterial.findAll as jest.Mock).mockResolvedValue(mockMaterials);

      const result = await storage.getByBookAndSkill('18', 'listening');

      expect(MockMaterial.findAll).toHaveBeenCalledWith({
        where: {
          book: 'Cambridge 18',
          skill: 'LISTENING',
        },
        order: [['test_number', 'ASC']],
      });
      expect(result).toEqual(mockMaterials);
    });

    it('should use book name as is if it is not numeric', async () => {
      (MockMaterial.findAll as jest.Mock).mockResolvedValue([]);

      await storage.getByBookAndSkill('Cambridge 19', 'reading');

      expect(MockMaterial.findAll).toHaveBeenCalledWith({
        where: {
          book: 'Cambridge 19',
          skill: 'READING',
        },
        order: [['test_number', 'ASC']],
      });
    });

    it('should throw error when database fails', async () => {
      (MockMaterial.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(storage.getByBookAndSkill('18', 'READING')).rejects.toThrow('DB Error');
    });
  });

  describe('save', () => {
    it('should create and return new material', async () => {
      const input = { book: 'Cambridge 18', skill: 'WRITING' as const };
      const mockCreated = { id: 'new-id', ...input };
      (MockMaterial.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await storage.save(input as any);

      expect(MockMaterial.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockCreated);
    });

    it('should throw error when creation fails', async () => {
      (MockMaterial.create as jest.Mock).mockRejectedValue(new Error('Creation Failed'));

      await expect(storage.save({})).rejects.toThrow('Creation Failed');
    });
  });

  describe('delete', () => {
    it('should return true if material was deleted', async () => {
      (MockMaterial.destroy as jest.Mock).mockResolvedValue(1);

      const result = await storage.delete('uuid-1');

      expect(MockMaterial.destroy).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toBe(true);
    });

    it('should return false if no material was deleted', async () => {
      (MockMaterial.destroy as jest.Mock).mockResolvedValue(0);

      const result = await storage.delete('uuid-non-existent');

      expect(result).toBe(false);
    });

    it('should throw error when deletion fails', async () => {
      (MockMaterial.destroy as jest.Mock).mockRejectedValue(new Error('Delete Error'));

      await expect(storage.delete('uuid-1')).rejects.toThrow('Delete Error');
    });
  });
});
