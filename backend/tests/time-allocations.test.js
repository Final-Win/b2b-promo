require('dotenv').config();

const { Pool } = require('pg');
const request = require('supertest');
const app = require('../src/app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uniqueEmail = (tag) => `test_be4_${tag}_${Date.now()}@example.com`;
const titleTag = (tag) => `test_be4_${tag}_${Date.now()}`;

let userA; // 담당자
let userB; // 타인
let tokenA;
let tokenB;

async function signupAndLogin(tag) {
  const email = uniqueEmail(tag);
  const password = 'password123';
  await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });
  const loginRes = await request(app).post('/auth/login').send({ email, password });
  return { id: loginRes.body.user.id, token: loginRes.body.access_token };
}

beforeAll(async () => {
  const a = await signupAndLogin('userA');
  const b = await signupAndLogin('userB');
  userA = a.id;
  userB = b.id;
  tokenA = a.token;
  tokenB = b.token;
});

afterAll(async () => {
  await pool.query(
    "DELETE FROM time_allocations WHERE wbs_id IN (SELECT id FROM wbs WHERE title LIKE 'test_be4_%')"
  );
  await pool.query("DELETE FROM wbs WHERE title LIKE 'test_be4_%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_be4_%'");
  await pool.end();
  await require('../src/db/pool').end();
});

describe('GET /time-allocations/daily-sum', () => {
  it('비로그인 요청은 401 UNAUTHORIZED를 반환한다', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, from: '2026-08-01', to: '2026-08-31' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('user_id가 없으면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ from: '2026-08-01', to: '2026-08-31' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('from이 없으면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, to: '2026-08-31' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('to가 없으면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, from: '2026-08-01' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('같은 담당자의 서로 다른 WBS에 같은 날짜로 할당한 시간이 합산되어 반환된다', async () => {
    await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('sum_wbs1'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [{ work_date: '2026-08-11', hours: 3 }],
      });
    await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('sum_wbs2'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [{ work_date: '2026-08-11', hours: 5 }],
      });

    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, from: '2026-08-01', to: '2026-08-31' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const entry = res.body.find((d) => d.work_date === '2026-08-11');
    expect(entry).toBeDefined();
    expect(entry.total_hours).toBe(8);
  });

  it('타인(B) 토큰으로 로그인한 상태에서 user_id=A로 조회해도 200으로 성공한다 (타인 조회 허용)', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, from: '2026-08-01', to: '2026-08-31' })
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
  });

  it('시간 할당이 없는 날짜는 응답 배열에 포함되지 않는다', async () => {
    const res = await request(app)
      .get('/time-allocations/daily-sum')
      .query({ user_id: userA, from: '2026-08-01', to: '2026-08-31' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const emptyDateEntry = res.body.find((d) => d.work_date === '2026-08-13');
    expect(emptyDateEntry).toBeUndefined();
  });

  it('여러 WBS의 시간 할당 합이 8시간을 넘어도 POST /wbs는 하드 블록 없이 둘 다 200으로 성공한다', async () => {
    const res1 = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('overflow_wbs1'),
        content: null,
        start_date: '2026-08-15',
        end_date: '2026-08-19',
        time_allocations: [{ work_date: '2026-08-16', hours: 6 }],
      });
    const res2 = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('overflow_wbs2'),
        content: null,
        start_date: '2026-08-15',
        end_date: '2026-08-19',
        time_allocations: [{ work_date: '2026-08-16', hours: 6 }],
      });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
