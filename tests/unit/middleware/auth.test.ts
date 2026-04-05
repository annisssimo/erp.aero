import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../../../src/middleware/auth';
import { Token } from '../../../src/models/token';

jest.mock('../../../src/models/token');

function mockReqRes(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request;
  const res = {} as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('authMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next(AppError 401) when no Authorization header', async () => {
    const { req, res, next } = mockReqRes();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next(AppError 401) for malformed header', async () => {
    const { req, res, next } = mockReqRes('Basic sometoken');
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next(AppError 401) for invalid token', async () => {
    const { req, res, next } = mockReqRes('Bearer not-a-jwt');
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next(AppError 401) when session is revoked', async () => {
    const token = jwt.sign(
      { userId: 'u@test.com', deviceId: 'dev-1' },
      process.env.JWT_SECRET as string,
      { expiresIn: '10m' },
    );
    (Token.findOne as jest.Mock).mockResolvedValue(null);

    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('sets req.user and calls next() for valid token with active session', async () => {
    const token = jwt.sign(
      { userId: 'u@test.com', deviceId: 'dev-1' },
      process.env.JWT_SECRET as string,
      { expiresIn: '10m' },
    );
    (Token.findOne as jest.Mock).mockResolvedValue({ id: 1 });

    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ userId: 'u@test.com', deviceId: 'dev-1' });
  });
});
