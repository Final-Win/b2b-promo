require('dotenv').config();

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uniqueEmail = (tag) => `test_be1_${tag}_${Date.now()}@example.com`;

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE 'test_be1_%'");
  await pool.end();
  await require('../src/db/pool').end();
});

describe('POST /auth/signup', () => {
  it('유효한 정보로 가입하면 200과 USER role을 반환한다', async () => {
    const email = uniqueEmail('signup_ok');
    const res = await request(app)
      .post('/auth/signup')
      .send({ email, password: 'password123', name: '홍길동' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email, name: '홍길동', role: 'USER' });
    expect(res.body.id).toBeDefined();
  });

  it('필수값이 누락되면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: uniqueEmail('signup_missing') });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('이메일 형식이 잘못되면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'password123', name: '홍길동' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DB 제약을 위반하는 값(형식은 유효하나 컬럼 길이 초과)이면 500과 고정 에러 포맷을 반환한다', async () => {
    const overlongLocal = 'a'.repeat(120);
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: `${overlongLocal}@example.com`, password: 'password123', name: '홍길동' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBeDefined();
    expect(res.body.error.message).toBeDefined();
  });

  it('이미 존재하는 이메일로 가입하면 400 DUPLICATE_EMAIL을 반환한다', async () => {
    const email = uniqueEmail('signup_dup');
    await request(app)
      .post('/auth/signup')
      .send({ email, password: 'password123', name: '홍길동' });

    const res = await request(app)
      .post('/auth/signup')
      .send({ email, password: 'password123', name: '홍길동' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });
});

describe('POST /auth/login', () => {
  it('올바른 이메일/비밀번호로 로그인하면 200과 access_token, refresh_token 쿠키를 반환한다', async () => {
    const email = uniqueEmail('login_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const res = await request(app).post('/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user).toMatchObject({ email, name: '홍길동', role: 'USER' });

    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token'));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  it('email 또는 password가 누락되면 401 UNAUTHORIZED를 반환한다', async () => {
    const res = await request(app).post('/auth/login').send({ email: uniqueEmail('login_missing') });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('존재하지 않는 이메일로 로그인하면 401 UNAUTHORIZED를 반환한다', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: uniqueEmail('login_nouser'), password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('틀린 비밀번호로 로그인하면 401 UNAUTHORIZED를 반환한다', async () => {
    const email = uniqueEmail('login_wrongpw');
    await request(app)
      .post('/auth/signup')
      .send({ email, password: 'password123', name: '홍길동' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('탈퇴한 계정으로 로그인하면 401 UNAUTHORIZED를 반환한다', async () => {
    const email = uniqueEmail('login_withdrawn');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const accessToken = loginRes.body.access_token;

    await request(app).delete('/auth/me').set('Authorization', `Bearer ${accessToken}`);

    const res = await request(app).post('/auth/login').send({ email, password });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /auth/refresh', () => {
  it('refresh_token 쿠키가 없으면 401을 반환한다', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('위조된 refresh_token 쿠키로 요청하면 401을 반환한다', async () => {
    const res = await request(app).post('/auth/refresh').set('Cookie', ['refresh_token=not-a-valid-jwt']);
    expect(res.status).toBe(401);
  });

  it('서명은 유효하나 존재하지 않는 사용자의 refresh_token이면 401을 반환한다', async () => {
    const bogusToken = jwt.sign({ id: 999999999, token_version: 0 }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '14d',
    });
    const res = await request(app).post('/auth/refresh').set('Cookie', [`refresh_token=${bogusToken}`]);
    expect(res.status).toBe(401);
  });

  it('정상 refresh_token 쿠키로 요청하면 200과 새 access_token, user를 반환한다', async () => {
    const email = uniqueEmail('refresh_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app).post('/auth/refresh').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user).toMatchObject({ email });
  });
});

describe('POST /auth/logout', () => {
  it('Authorization 헤더 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(401);
  });

  it('로그아웃 성공 후 기존 refresh_token으로 재발급 시도하면 401을 반환한다', async () => {
    const email = uniqueEmail('logout_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const accessToken = loginRes.body.access_token;
    const cookies = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app).post('/auth/refresh').set('Cookie', cookies);
    expect(refreshRes.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('Bearer 토큰 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('유효한 Bearer 토큰으로 요청하면 200과 사용자 정보를 반환한다', async () => {
    const email = uniqueEmail('me_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const accessToken = loginRes.body.access_token;

    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email, name: '홍길동', role: 'USER' });
  });

  it('만료된 access token으로 요청하면 401을 반환한다', async () => {
    const expiredToken = jwt.sign(
      { sub: 1, role: 'USER', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_ACCESS_SECRET
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });
});

describe('DELETE /auth/me', () => {
  it('Authorization 헤더 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).delete('/auth/me');
    expect(res.status).toBe(401);
  });

  it('회원탈퇴 성공 후 동일 계정으로 로그인하면 401을 반환한다', async () => {
    const email = uniqueEmail('withdraw_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const accessToken = loginRes.body.access_token;

    const deleteRes = await request(app)
      .delete('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteRes.status).toBe(200);

    const loginAfter = await request(app).post('/auth/login').send({ email, password });
    expect(loginAfter.status).toBe(401);
  });
});

describe('GET /users', () => {
  it('Bearer 토큰 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });

  it('유효한 Bearer 토큰으로 요청하면 200과 id/name/status만 가진 배열을 반환한다', async () => {
    const email = uniqueEmail('users_ok');
    const password = 'password123';
    await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });

    const loginRes = await request(app).post('/auth/login').send({ email, password });
    const accessToken = loginRes.body.access_token;

    const res = await request(app).get('/users').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((user) => {
      expect(Object.keys(user).sort()).toEqual(['id', 'name', 'status']);
    });
  });
});
