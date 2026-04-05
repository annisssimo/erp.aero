import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user';
import { Token } from '../models/token';
import { AppError } from '../errors/app-error';
import type { JwtPayload } from '../middleware/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private generateTokenPair(userId: string, deviceId: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, deviceId } satisfies JwtPayload,
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '10m') as jwt.SignOptions['expiresIn'] },
    );

    const refreshToken = jwt.sign(
      { userId, deviceId } satisfies JwtPayload,
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES ?? '30d') as jwt.SignOptions['expiresIn'] },
    );

    return { accessToken, refreshToken };
  }

  async register(id: string, password: string): Promise<TokenPair> {
    const existing = await User.findByPk(id);
    if (existing) {
      throw new AppError('User already exists', 409);
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ id, password: hashed });

    const deviceId = uuidv4();
    const tokens = this.generateTokenPair(id, deviceId);
    await Token.create({ userId: id, deviceId, refreshToken: tokens.refreshToken });

    return tokens;
  }

  async login(id: string, password: string): Promise<TokenPair> {
    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const deviceId = uuidv4();
    const tokens = this.generateTokenPair(id, deviceId);
    await Token.create({ userId: id, deviceId, refreshToken: tokens.refreshToken });

    return tokens;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const record = await Token.findOne({
      where: {
        userId: payload.userId,
        deviceId: payload.deviceId,
        refreshToken,
        revoked: false,
      },
    });

    if (!record) {
      throw new AppError('Refresh token revoked or not found', 401);
    }

    record.revoked = true;
    await record.save();

    const newDeviceId = uuidv4();
    const tokens = this.generateTokenPair(payload.userId, newDeviceId);

    await Token.create({
      userId: payload.userId,
      deviceId: newDeviceId,
      refreshToken: tokens.refreshToken,
    });

    return tokens;
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await Token.update({ revoked: true }, { where: { userId, deviceId } });
  }
}

export const authService = new AuthService();
