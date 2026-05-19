import { UserService } from '../userService';
import User from '../../models/User';
import { Role } from '../../types/auth';

jest.mock('../../models/User', () => ({
  findByPk: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: '123', email: 'test@test.com' };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('123');

      expect(User.findByPk).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('123');

      expect(User.findByPk).toHaveBeenCalledWith('123');
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const mockData = { firstName: 'Updated' };

      await userService.updateUser('123', mockData as any);

      expect(User.update).toHaveBeenCalledWith(mockData, { where: { id: '123' } });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users sorted by createdAt', async () => {
      const mockUsers = [{ id: '1' }, { id: '2' }];
      (User.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(User.findAll).toHaveBeenCalledWith({ order: [['createdAt', 'DESC']] });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('setUserRole', () => {
    it('should update the role of a user', async () => {
      await userService.setUserRole('123', Role.ADMIN);

      expect(User.update).toHaveBeenCalledWith({ role: 'admin' }, { where: { id: '123' } });
    });
  });

  describe('topUp', () => {
    it('should successfully top up user credits', async () => {
      const mockUser = {
        id: '123',
        increment: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue(undefined),
        wallet_balance: 150,
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.topUp('123', 50);

      expect(User.findByPk).toHaveBeenCalledWith('123');
      expect(mockUser.increment).toHaveBeenCalledWith('wallet_balance', { by: 50 });
      expect(mockUser.reload).toHaveBeenCalled();
      expect(result).toBe(150);
    });

    it('should throw error if user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userService.topUp('123', 50)).rejects.toThrow('User not found');
    });
  });
});
