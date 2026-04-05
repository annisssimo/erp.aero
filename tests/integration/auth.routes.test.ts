import request from 'supertest';
import { createApp } from '../../src/app';
import { sequelize } from '../../src/config/database';

const app = createApp();

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /signup', () => {
  it('201 + token pair on new user', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ id: 'signup@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('409 when user already exists', async () => {
    await request(app).post('/signup').send({ id: 'dup@test.com', password: 'password123' });
    const res = await request(app)
      .post('/signup')
      .send({ id: 'dup@test.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('400 when id is missing', async () => {
    const res = await request(app).post('/signup').send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('400 when password too short', async () => {
    const res = await request(app).post('/signup').send({ id: 'short@test.com', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /signin', () => {
  beforeAll(async () => {
    await request(app).post('/signup').send({ id: 'login@test.com', password: 'password123' });
  });

  it('200 + token pair on valid credentials', async () => {
    const res = await request(app)
      .post('/signin')
      .send({ id: 'login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('401 on wrong password', async () => {
    const res = await request(app)
      .post('/signin')
      .send({ id: 'login@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('401 on non-existent user', async () => {
    const res = await request(app)
      .post('/signin')
      .send({ id: 'ghost@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /signin/new_token', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/signup')
      .send({ id: 'refresh@test.com', password: 'password123' });
    refreshToken = res.body.refreshToken as string;
  });

  it('200 + new token pair on valid refresh token', async () => {
    const res = await request(app).post('/signin/new_token').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it('401 on already-used refresh token (rotation)', async () => {
    // Use a fresh token to avoid interference from the previous test
    const signupRes = await request(app)
      .post('/signup')
      .send({ id: 'rotation@test.com', password: 'password123' });
    const originalToken = signupRes.body.refreshToken as string;

    const first = await request(app)
      .post('/signin/new_token')
      .send({ refreshToken: originalToken });
    const second = await request(app)
      .post('/signin/new_token')
      .send({ refreshToken: originalToken });

    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
  });

  it('401 on invalid refresh token', async () => {
    const res = await request(app).post('/signin/new_token').send({ refreshToken: 'garbage' });
    expect(res.status).toBe(401);
  });
});

describe('GET /info', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/signup')
      .send({ id: 'info@test.com', password: 'password123' });
    accessToken = res.body.accessToken as string;
  });

  it('200 + user id when authenticated', async () => {
    const res = await request(app).get('/info').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'info@test.com' });
  });

  it('401 without token', async () => {
    const res = await request(app).get('/info');
    expect(res.status).toBe(401);
  });
});

describe('GET /logout', () => {
  it('invalidates current device session but not others', async () => {
    const deviceA = await request(app)
      .post('/signup')
      .send({ id: 'multi@test.com', password: 'password123' });

    const deviceB = await request(app)
      .post('/signin')
      .send({ id: 'multi@test.com', password: 'password123' });

    const tokenA = deviceA.body.accessToken as string;
    const tokenB = deviceB.body.accessToken as string;

    // Logout device A
    await request(app).get('/logout').set('Authorization', `Bearer ${tokenA}`);

    // Device A is now locked
    const infoA = await request(app).get('/info').set('Authorization', `Bearer ${tokenA}`);
    expect(infoA.status).toBe(401);

    // Device B still works
    const infoB = await request(app).get('/info').set('Authorization', `Bearer ${tokenB}`);
    expect(infoB.status).toBe(200);
  });
});
