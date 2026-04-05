import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { createApp } from '../../src/app';
import { sequelize } from '../../src/config/database';

const app = createApp();

let accessToken: string;

const UPLOAD_TEST_DIR = path.resolve('uploads_test');

beforeAll(async () => {
  await sequelize.sync({ force: true });

  if (!fs.existsSync(UPLOAD_TEST_DIR)) {
    fs.mkdirSync(UPLOAD_TEST_DIR, { recursive: true });
  }

  const res = await request(app)
    .post('/signup')
    .send({ id: 'fileuser@test.com', password: 'password123' });

  accessToken = res.body.accessToken as string;
});

afterAll(async () => {
  await sequelize.close();

  if (fs.existsSync(UPLOAD_TEST_DIR)) {
    fs.rmSync(UPLOAD_TEST_DIR, { recursive: true, force: true });
  }
});

function auth() {
  return { Authorization: `Bearer ${accessToken}` };
}

function testFilePath() {
  return path.resolve(__dirname, '../fixtures/test-file.txt');
}

describe('POST /file/upload', () => {
  it('201 + file id after upload', async () => {
    const res = await request(app).post('/file/upload').set(auth()).attach('file', testFilePath());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('400 when no file attached', async () => {
    const res = await request(app).post('/file/upload').set(auth());
    expect(res.status).toBe(400);
  });

  it('401 without token', async () => {
    const res = await request(app).post('/file/upload').attach('file', testFilePath());
    expect(res.status).toBe(401);
  });
});

describe('GET /file/list', () => {
  it('returns paginated list with metadata', async () => {
    const res = await request(app).get('/file/list').set(auth()).query({ list_size: 5, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('files');
    expect(Array.isArray(res.body.files)).toBe(true);
  });

  it('defaults to page=1 and list_size=10 when not provided', async () => {
    const res = await request(app).get('/file/list').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.listSize).toBe(10);
  });
});

describe('GET /file/:id', () => {
  let fileId: number;

  beforeAll(async () => {
    const res = await request(app).post('/file/upload').set(auth()).attach('file', testFilePath());
    fileId = res.body.id as number;
  });

  it('returns file info', async () => {
    const res = await request(app).get(`/file/${fileId}`).set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: fileId,
      name: 'test-file.txt',
      ext: 'txt',
      mimeType: 'text/plain',
    });
    expect(res.body).toHaveProperty('size');
    expect(res.body).toHaveProperty('uploadDate');
  });

  it('404 for non-existent id', async () => {
    const res = await request(app).get('/file/999999').set(auth());
    expect(res.status).toBe(404);
  });
});

describe('GET /file/download/:id', () => {
  let fileId: number;

  beforeAll(async () => {
    const res = await request(app).post('/file/upload').set(auth()).attach('file', testFilePath());
    fileId = res.body.id as number;
  });

  it('returns file as attachment', async () => {
    const res = await request(app).get(`/file/download/${fileId}`).set(auth());

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });
});

describe('PUT /file/update/:id', () => {
  let fileId: number;

  beforeAll(async () => {
    const res = await request(app).post('/file/upload').set(auth()).attach('file', testFilePath());
    fileId = res.body.id as number;
  });

  it('replaces file and returns same id', async () => {
    const res = await request(app)
      .put(`/file/update/${fileId}`)
      .set(auth())
      .attach('file', testFilePath());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: fileId });
  });

  it('404 for non-existent id', async () => {
    const res = await request(app)
      .put('/file/update/999999')
      .set(auth())
      .attach('file', testFilePath());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /file/delete/:id', () => {
  let fileId: number;

  beforeAll(async () => {
    const res = await request(app).post('/file/upload').set(auth()).attach('file', testFilePath());
    fileId = res.body.id as number;
  });

  it('deletes file and returns confirmation', async () => {
    const res = await request(app).delete(`/file/delete/${fileId}`).set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('404 after deletion', async () => {
    const res = await request(app).delete(`/file/delete/${fileId}`).set(auth());
    expect(res.status).toBe(404);
  });
});
