import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Token } from '../models/token';
import { AppError } from '../errors/app-error';

export interface JwtPayload {
  userId: string;
  deviceId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Access token required', 401));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Verify the session is still active (not revoked by logout)
    const session = await Token.findOne({
      where: { userId: payload.userId, deviceId: payload.deviceId, revoked: false },
    });

    if (!session) {
      next(new AppError('Session revoked', 401));
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Access token expired', 401));
    } else {
      next(new AppError('Invalid access token', 401));
    }
  }
}
