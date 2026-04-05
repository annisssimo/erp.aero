import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { fileService } from '../services/file.service';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

router.use(authMiddleware);

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    const result = await fileService.upload(req.file);
    return res.status(201).json(result);
  }),
);

router.get(
  '/list',
  asyncHandler(async (req: Request, res: Response) => {
    const listSize = parseInt(req.query.list_size as string, 10) || 10;
    const page = parseInt(req.query.page as string, 10) || 1;
    const result = await fileService.list(listSize, page);
    return res.json(result);
  }),
);

router.delete(
  '/delete/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await fileService.delete(parseInt(req.params.id, 10));
    return res.json({ message: 'File deleted' });
  }),
);

router.get(
  '/download/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { filePath, name, mimeType } = await fileService.getFilePath(parseInt(req.params.id, 10));
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Type', mimeType);
    return res.sendFile(filePath);
  }),
);

router.put(
  '/update/:id',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    const result = await fileService.update(parseInt(req.params.id, 10), req.file);
    return res.json(result);
  }),
);

// Must be last among GET /file/* to avoid swallowing other routes
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const fileInfo = await fileService.getById(parseInt(req.params.id, 10));
    return res.json(fileInfo);
  }),
);

export default router;
