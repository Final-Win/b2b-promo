require('dotenv').config();

const { Pool } = require('pg');
const request = require('supertest');
const app = require('../src/app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uniqueEmail = (tag) => `test_be2_${tag}_${Date.now()}@example.com`;
const titleTag = (tag) => `test_be2_${tag}_${Date.now()}`;

let userA; // 작성자
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
    "DELETE FROM time_allocations WHERE wbs_id IN (SELECT id FROM wbs WHERE title LIKE 'test_be2_%')"
  );
  await pool.query("DELETE FROM wbs WHERE title LIKE 'test_be2_%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_be2_%'");
  await pool.end();
  await require('../src/db/pool').end();
});

describe('POST /wbs', () => {
  it('성공 시 status는 TODO, time_allocations가 그대로 반영되며 writer_id/writer_status/assignee_status를 포함한다', async () => {
    const res = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('post_ok'),
        content: '내용',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'DONE',
        time_allocations: [{ work_date: '2026-08-11', hours: 4 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TODO');
    expect(res.body.time_allocations).toEqual([{ work_date: '2026-08-11', hours: 4 }]);
    expect(res.body.writer_id).toBe(userA);
    expect(res.body.writer_status).toBeDefined();
    expect(res.body.assignee_status).toBeDefined();
  });

  it('end_date < start_date이면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('post_bad_range'),
        content: null,
        start_date: '2026-08-14',
        end_date: '2026-08-10',
        time_allocations: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('time_allocations의 work_date가 기간 밖이면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('post_bad_alloc'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [{ work_date: '2026-08-20', hours: 2 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /wbs/:id, PUT /wbs/:id, DELETE /wbs/:id', () => {
  let wbsId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud'),
        content: '내용',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [{ work_date: '2026-08-11', hours: 2 }],
      });
    wbsId = res.body.id;
  });

  it('GET /wbs/:id로 방금 만든 WBS를 조회할 수 있다', async () => {
    const res = await request(app).get(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(wbsId);
  });

  it('존재하지 않는 id를 조회하면 404 NOT_FOUND를 반환한다', async () => {
    const res = await request(app).get('/wbs/999999999').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PUT으로 time_allocations를 교체하면 재조회 시 새 값만 남는다', async () => {
    const putRes = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud_updated'),
        content: '수정됨',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'TODO',
        time_allocations: [{ work_date: '2026-08-12', hours: 5 }],
      });
    expect(putRes.status).toBe(200);

    const getRes = await request(app).get(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.body.time_allocations).toEqual([{ work_date: '2026-08-12', hours: 5 }]);
  });

  it('PUT으로 time_allocations: []을 보내면 재조회 시 빈 배열이 된다', async () => {
    const putRes = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud_empty'),
        content: '수정됨',
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'TODO',
        time_allocations: [],
      });
    expect(putRes.status).toBe(200);

    const getRes = await request(app).get(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.body.time_allocations).toEqual([]);
  });

  it('존재하지 않는 id에 PUT하면 404 NOT_FOUND를 반환한다', async () => {
    const res = await request(app)
      .put('/wbs/999999999')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud_notfound'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [],
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('작성자가 아닌 회원(B)의 토큰으로 PUT하면 403 FORBIDDEN을 반환한다', async () => {
    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud_forbidden'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        time_allocations: [],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('작성자가 아닌 회원(B)의 토큰으로 DELETE하면 403 FORBIDDEN을 반환한다', async () => {
    const res = await request(app).delete(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('작성자(A) 본인이 DELETE하면 200, 이후 조회 시 404이며 time_allocations도 DB에서 제거된다', async () => {
    const delRes = await request(app).delete(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(delRes.status).toBe(200);

    const getRes = await request(app).get(`/wbs/${wbsId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.status).toBe(404);

    const allocRes = await pool.query('SELECT COUNT(*) FROM time_allocations WHERE wbs_id = $1', [wbsId]);
    expect(Number(allocRes.rows[0].count)).toBe(0);
  });

  it('존재하지 않는 id에 DELETE하면 404 NOT_FOUND를 반환한다', async () => {
    const res = await request(app).delete('/wbs/999999999').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('트랜잭션 롤백: work_date가 중복된 time_allocations로 PUT하면 실패하고, 이전 title/할당 건수가 그대로 유지된다', async () => {
    const beforeTitle = pool.query('SELECT title FROM wbs WHERE id = $1', [wbsId]);
    const beforeAlloc = pool.query('SELECT COUNT(*) FROM time_allocations WHERE wbs_id = $1', [wbsId]);
    const [beforeTitleRes, beforeAllocRes] = await Promise.all([beforeTitle, beforeAlloc]);

    const res = await request(app)
      .put(`/wbs/${wbsId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('crud_rollback_attempt'),
        content: null,
        start_date: '2026-08-10',
        end_date: '2026-08-14',
        status: 'TODO',
        time_allocations: [
          { work_date: '2026-08-11', hours: 2 },
          { work_date: '2026-08-11', hours: 3 },
        ],
      });
    expect(res.status).toBe(500);

    const afterTitleRes = await pool.query('SELECT title FROM wbs WHERE id = $1', [wbsId]);
    const afterAllocRes = await pool.query('SELECT COUNT(*) FROM time_allocations WHERE wbs_id = $1', [wbsId]);

    expect(afterTitleRes.rows[0].title).toBe(beforeTitleRes.rows[0].title);
    expect(afterAllocRes.rows[0].count).toBe(beforeAllocRes.rows[0].count);
  });
});

describe('GET /wbs 목록 조회', () => {
  it('from/to/mine이 모두 생략되면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app).get('/wbs').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('from/to로 조회하면 겹치는 기간의 WBS만 포함되고 겹치지 않는 WBS는 제외된다', async () => {
    const inRangeRes = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('range_in'),
        content: null,
        start_date: '2026-09-01',
        end_date: '2026-09-05',
        time_allocations: [],
      });
    const outRangeRes = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('range_out'),
        content: null,
        start_date: '2026-10-01',
        end_date: '2026-10-05',
        time_allocations: [],
      });

    const res = await request(app)
      .get('/wbs')
      .query({ from: '2026-09-01', to: '2026-09-10' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((w) => w.id);
    expect(ids).toContain(inRangeRes.body.id);
    expect(ids).not.toContain(outRangeRes.body.id);
  });

  it('mine=true&status=TODO로 조회하면 본인 작성 WBS 중 TODO 상태만 반환된다', async () => {
    const todoRes = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('mine_todo'),
        content: null,
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        time_allocations: [],
      });
    const doneRes = await request(app)
      .post('/wbs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        assignee_id: userA,
        title: titleTag('mine_done'),
        content: null,
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        time_allocations: [],
      });
    await pool.query("UPDATE wbs SET status = 'DONE' WHERE id = $1", [doneRes.body.id]);

    const res = await request(app)
      .get('/wbs')
      .query({ mine: 'true', status: 'TODO' })
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((w) => w.id);
    expect(ids).toContain(todoRes.body.id);
    expect(ids).not.toContain(doneRes.body.id);
    res.body.forEach((w) => expect(w.status).toBe('TODO'));
  });
});
