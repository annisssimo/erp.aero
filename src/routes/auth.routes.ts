import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { AppError } from '../errors/app-error';

interface SignupBody {
  id: string;
  password: string;
}

interface SigninBody {
  id: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validate = (req: Request<Record<string, string>, any, any>) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg as string, 400);
  }
};

router.post(
  '/signup',
  [
    body('id')
      .notEmpty()
      .withMessage('id (phone or email) is required')
      .custom((value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
        if (!emailRegex.test(value) && !phoneRegex.test(value)) {
          throw new Error('id must be a valid email or phone number');
        }
        return true;
      }),
    body('password').isLength({ min: 6 }).withMessage('password min 6 chars'),
  ],
  asyncHandler(async (req: Request<Record<string, string>, unknown, SignupBody>, res: Response) => {
    validate(req);
    const tokens = await authService.register(req.body.id, req.body.password);
    return res.status(201).json(tokens);
  }),
);

router.post(
  '/signin',
  [
    body('id').notEmpty().withMessage('id is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  asyncHandler(async (req: Request<Record<string, string>, unknown, SigninBody>, res: Response) => {
    validate(req);
    const tokens = await authService.login(req.body.id, req.body.password);
    return res.json(tokens);
  }),
);

router.post(
  '/signin/new_token',
  [body('refreshToken').notEmpty().withMessage('refreshToken is required')],
  asyncHandler(
    async (req: Request<Record<string, string>, unknown, RefreshBody>, res: Response) => {
      validate(req);
      const tokens = await authService.refreshTokens(req.body.refreshToken);
      return res.json(tokens);
    },
  ),
);

router.get('/info', authMiddleware, (req: Request, res: Response) => {
  res.json({ id: req.user!.userId });
});

router.get(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.user!.userId, req.user!.deviceId);
    return res.json({ message: 'Logged out successfully' });
  }),
);

export default router;
