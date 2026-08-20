require('dotenv').config();

const { Pool } = require('pg');
const request = require('supertest');
const app = require('../src/app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uniqueEmail = (tag) => `test_be3_${tag}_${Date.now()}@example.com`;
const titleTag = (tag) => `test_be3_${tag}_${Date.now()}`;

async function signupAndLogin(tag) {
  const email = uniqueEmail(tag);
  const password = 'password123';
  await request(app).post('/auth/signup').send({ email, password, name: '홍길동' });
  const loginRes = await request(app).post('/auth/login').send({ email, password });
  return { id: loginRes.body.user.id, token: loginRes.body.access_token, email, password };
}

async function promoteToAdminAndRelogin(user) {
  await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [user.id]);
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: user.email, password: user.password });
  return loginRes.body.access_token;
}

let userA; // 작성자
let userB; // 타인(일반 회원)
let userAdmin; // 관리자(타인)
let tokenA;
let tokenB;
let tokenAdmin;

beforeAll(async () => {
  const a = await signupAndLogin('userA');
  const b = await signupAndLogin('userB');
  const admin = await signupAndLogin('userAdmin');
  userA = a.id;
  userB = b.id;
  userAdmin = admin.id;
  tokenA = a.token;
  tokenB = b.token;
  tokenAdmin = await promoteToAdminAndRelogin(admin);
});

afterAll(async () => {
  await pool.query(
    "DELETE FROM time_allocations WHERE wbs_id IN (SELECT id FROM wbs WHERE title LIKE 'test_be3_%')"
  );
  await pool.query("DELETE FROM wbs WHERE title LIKE 'test_be3_%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_be3_%'");
  await pool.end();
  await require('../src/db/pool').end();
});

describe('PUT /wbs/:id 관리자 예외 및 DONE 전이', () => {
  let wbsId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('base'),
        content: '내용',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [{ work_date: '2026-08-11', hours: 2 }],
      });
    wbsId = res.body.id;
  });

  it('일반 회원(작성자 아님, B)이 타인 글을 수정하면 403 FORBIDDEN을 반환한다 (회귀)', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        assignee_id: userA,
        title: titleTag('non_author_forbidden'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'TODO',
        time_allocations: [],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('일반 회원(B)이 타인 글의 status를 DONE으로 시도해도 403 FORBIDDEN을 반환한다 (작성자 체크 우선)', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        assignee_id: userA,
        title: titleTag('non_author_done_forbidden'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'DONE',
        time_allocations: [],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('관리자가 타인 글을 수정하면 200 성공하며 title이 실제로 반영된다', async () => {
    const newTitle = titleTag('admin_update_ok');
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        assignee_id: userA,
        title: newTitle,
        content: '관리자 수정',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'TODO',
        time_allocations: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(newTitle);

    const getRes = await request(app).get(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.body.title).toBe(newTitle);
  });

  it('관리자가 타인 글 삭제를 시도하면 403 FORBIDDEN을 반환한다', async () => {
    const res = await request(app).delete(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('일반 회원(작성자 본인)이 자기 글의 status를 DONE으로 변경하면 403 FORBIDDEN을 반환한다', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('author_done_forbidden'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'DONE',
        time_allocations: [],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('관리자가 타인 글의 status를 DONE으로 변경하면 200 성공하며 status가 DONE이 된다', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        assignee_id: userA,
        title: titleTag('admin_done_ok'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'DONE',
        time_allocations: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DONE');
  });

  it('회귀: 작성자 본인이 자기 글을 DONE이 아닌 다른 상태(IN_PROGRESS)로 바꾸면 정상 200을 반환한다', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('author_inprogress_ok'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'IN_PROGRESS',
        time_allocations: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });
});
