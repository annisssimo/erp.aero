import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/services/auth.service';
import { User } from '../../../src/models/user';
import { Token } from '../../../src/models/token';

jest.mock('../../../src/models/user');
jest.mock('../../../src/models/token');

const service = new AuthService();

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('throws 409 if user already exists', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'test@test.com' });

      await expect(service.register('test@test.com', 'password123')).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(User.findByPk).toHaveBeenCalledWith('test@test.com');
    });

    it('creates user and returns token pair', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ id: 'new@test.com' });
      (Token.create as jest.Mock).mockResolvedValue({});

      const result = await service.register('new@test.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(User.create).toHaveBeenCalledTimes(1);
      expect(Token.create).toHaveBeenCalledTimes(1);
    });

    it('stores a bcrypt-hashed password', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      (Token.create as jest.Mock).mockResolvedValue({});

      let savedPassword = '';
      (User.create as jest.Mock).mockImplementation(async (data: { password: string }) => {
        savedPassword = data.password;
        return { id: 'u@test.com' };
      });

      await service.register('u@test.com', 'plaintext');

      expect(savedPassword).not.toBe('plaintext');
      await expect(bcrypt.compare('plaintext', savedPassword)).resolves.toBe(true);
    });
  });

  describe('login', () => {
    it('throws 401 for non-existent user', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.login('ghost@test.com', 'pass')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 for wrong password', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u@test.com', password: hashed });

      await expect(service.login('u@test.com', 'wrong')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('returns token pair on valid credentials', async () => {
      const hashed = await bcrypt.hash('password', 10);
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u@test.com', password: hashed });
      (Token.create as jest.Mock).mockResolvedValue({});

      const result = await service.login('u@test.com', 'password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('creates a new device session per login call', async () => {
      const hashed = await bcrypt.hash('password', 10);
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u@test.com', password: hashed });
      (Token.create as jest.Mock).mockResolvedValue({});

      const first = await service.login('u@test.com', 'password');
      const second = await service.login('u@test.com', 'password');

      // Different deviceId means different JWT payloads
      expect(first.accessToken).not.toBe(second.accessToken);
    });
  });

  describe('refreshTokens', () => {
    it('throws 401 for invalid refresh token string', async () => {
      await expect(service.refreshTokens('not-a-token')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when token record is revoked', async () => {
      const refreshToken = jwt.sign(
        { userId: 'u@test.com', deviceId: 'device-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '1h' },
      );
      (Token.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('rotates tokens and marks old record as revoked', async () => {
      const refreshToken = jwt.sign(
        { userId: 'u@test.com', deviceId: 'device-1' },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '1h' },
      );

      const mockRecord = { revoked: false, save: jest.fn() };
      (Token.findOne as jest.Mock).mockResolvedValue(mockRecord);
      (Token.create as jest.Mock).mockResolvedValue({});

      const result = await service.refreshTokens(refreshToken);

      expect(mockRecord.revoked).toBe(true);
      expect(mockRecord.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    it('revokes tokens for the specific device only', async () => {
      (Token.update as jest.Mock).mockResolvedValue([1]);

      await service.logout('u@test.com', 'device-1');

      expect(Token.update).toHaveBeenCalledWith(
        { revoked: true },
        { where: { userId: 'u@test.com', deviceId: 'device-1' } },
      );
    });
  });
});
