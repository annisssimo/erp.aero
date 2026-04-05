import fs from 'fs';
import path from 'path';
import { File } from '../models/file';
import { AppError } from '../errors/app-error';

export interface FileInfo {
  id: number;
  name: string;
  ext: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
}

export interface FileListResult {
  total: number;
  page: number;
  listSize: number;
  files: FileInfo[];
}

export class FileService {
  async upload(file: Express.Multer.File): Promise<{ id: number }> {
    const ext = path.extname(file.originalname).replace('.', '');

    const record = await File.create({
      name: file.originalname,
      ext,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      uploadDate: new Date(),
    });

    return { id: record.id };
  }

  async list(listSize: number, page: number): Promise<FileListResult> {
    const offset = (page - 1) * listSize;

    const { count, rows } = await File.findAndCountAll({
      limit: listSize,
      offset,
      order: [['uploadDate', 'DESC']],
      attributes: ['id', 'name', 'ext', 'mimeType', 'size', 'uploadDate'],
    });

    return {
      total: count,
      page,
      listSize,
      files: rows as unknown as FileInfo[],
    };
  }

  async getById(id: number): Promise<FileInfo> {
    const record = await File.findByPk(id, {
      attributes: ['id', 'name', 'ext', 'mimeType', 'size', 'uploadDate'],
    });

    if (!record) {
      throw new AppError('File not found', 404);
    }

    return record as unknown as FileInfo;
  }

  async delete(id: number): Promise<void> {
    const record = await File.findByPk(id);

    if (!record) {
      throw new AppError('File not found', 404);
    }

    if (fs.existsSync(record.path)) {
      fs.unlinkSync(record.path);
    }

    await record.destroy();
  }

  async getFilePath(id: number): Promise<{ filePath: string; name: string; mimeType: string }> {
    const record = await File.findByPk(id);

    if (!record) {
      throw new AppError('File not found', 404);
    }

    if (!fs.existsSync(record.path)) {
      throw new AppError('File not found on disk', 404);
    }

    return { filePath: path.resolve(record.path), name: record.name, mimeType: record.mimeType };
  }

  async update(id: number, file: Express.Multer.File): Promise<{ id: number }> {
    const record = await File.findByPk(id);

    if (!record) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new AppError('File not found', 404);
    }

    if (fs.existsSync(record.path)) {
      fs.unlinkSync(record.path);
    }

    const ext = path.extname(file.originalname).replace('.', '');
    record.name = file.originalname;
    record.ext = ext;
    record.mimeType = file.mimetype;
    record.size = file.size;
    record.path = file.path;
    record.uploadDate = new Date();
    await record.save();

    return { id: record.id };
  }
}

export const fileService = new FileService();
