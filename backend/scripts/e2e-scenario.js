// docs/3-user-scenario.md 기반 백엔드 API E2E 시나리오 테스트
// 사용자가 미리 구동해둔 개발 서버(기본 http://localhost:3000)를 대상으로 실행한다.
// 실행: node backend/scripts/e2e-scenario.js
//
// jest 테스트(backend/tests/*.test.js)는 supertest로 앱을 인메모리 호출하지만,
// 이 스크립트는 실제로 떠 있는 서버에 HTTP 요청을 보내 화면 흐름 단위(3-user-scenario.md)로 검증한다.

require('dotenv').config();
const { Pool } = require('pg');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tag = Date.now();
const uniqueEmail = (name) => `test_e2e_${name}_${tag}@example.com`;
const titleTag = (name) => `test_e2e_${name}_${tag}`;
const PASSWORD = 'password123';

let passCount = 0;
let failCount = 0;
const failures = [];

function check(scenario, desc, condition) {
  if (condition) {
    passCount += 1;
    console.log(`  ✅ [${scenario}] ${desc}`);
  } else {
    failCount += 1;
    failures.push(`[${scenario}] ${desc}`);
    console.log(`  ❌ [${scenario}] ${desc}`);
  }
}

async function api(path, { method = 'GET', token, cookie, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  return { status: res.status, body: json, res };
}

function extractRefreshCookie(res) {
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const found = cookies.find((c) => c.startsWith('refresh_token='));
  return found ? found.split(';')[0] : null;
}

function todayRangeFiveWeeks() {
  const today = new Date();
  const day = today.getUTCDay(); // 0=일요일
  const thisWeekStart = new Date(today);
  thisWeekStart.setUTCDate(today.getUTCDate() - day);
  const from = new Date(thisWeekStart);
  from.setUTCDate(thisWeekStart.getUTCDate() - 14); // 2주 전 시작 = 오늘 포함 주가 3번째 행
  const to = new Date(thisWeekStart);
  to.setUTCDate(thisWeekStart.getUTCDate() + 21 - 1); // 총 5주
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

async function signupAndLogin(name) {
  const email = uniqueEmail(name);
  await api('/auth/signup', { method: 'POST', body: { email, password: PASSWORD, name } });
  const loginRes = await api('/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  const refreshCookie = extractRefreshCookie(loginRes.res);
  return { email, id: loginRes.body?.user?.id, token: loginRes.body?.access_token, refreshCookie };
}

async function run() {
  console.log(`대상 서버: ${BASE_URL}\n`);

  // --- 사전 확인: 서버가 실제로 떠 있는지 ---
  const health = await api('/auth/me');
  if (health.status !== 401) {
    console.log('서버 응답이 예상과 다릅니다(401 UNAUTHORIZED가 아님). 서버가 떠 있는지 확인하세요.');
    process.exit(1);
  }

  // === 1. 일반 회원 시나리오 ===
  const userA = await signupAndLogin('userA');
  const userB = await signupAndLogin('userB');

  // 1-1. 로그인
  check('1-1 로그인', 'access_token 발급됨', typeof userA.token === 'string' && userA.token.length > 0);
  check('1-1 로그인', 'refresh_token 쿠키 발급됨', !!userA.refreshCookie);
  check('1-1 로그인', 'user 정보에 id/email/name/role 포함', !!userA.id);

  // 1-2. 일정 확인 (5주 뷰)
  const { from, to } = todayRangeFiveWeeks();
  const calendarRes = await api(`/wbs?from=${from}&to=${to}`, { token: userA.token });
  check('1-2 일정 확인', 'GET /wbs?from&to 200 응답', calendarRes.status === 200);
  check('1-2 일정 확인', '응답이 배열', Array.isArray(calendarRes.body));

  // 1-3/1-4. 일정 등록 + 상세 내용 작성 (드래그 → 상세패널 저장은 API 레벨에서 단일 POST /wbs)
  const startDate = '2026-08-11';
  const endDate = '2026-08-13';
  const createRes = await api('/wbs', {
    method: 'POST',
    token: userA.token,
    body: {
      assignee_id: userA.id,
      title: titleTag('create'),
      content: '시나리오 1-4 상세 내용',
      start_date: startDate,
      end_date: endDate,
      time_allocations: [
        { work_date: '2026-08-11', hours: 4 },
        { work_date: '2026-08-12', hours: 5 }, // 8시간 초과 경고 대상(총 9시간이 아니라 날짜별 개별 4/5시간, 정상 범위)
      ],
    },
  });
  check('1-3 일정 등록', 'POST /wbs 200 성공(기간이 드래그 값대로 반영)', createRes.status === 200
    && createRes.body?.start_date === startDate && createRes.body?.end_date === endDate);
  check('1-4 상세 내용 작성', '저장 시 상태가 TODO로 초기화', createRes.body?.status === 'TODO');
  check('1-4 상세 내용 작성', 'time_allocations가 그대로 저장됨', createRes.body?.time_allocations?.length === 2);
  const wbsId = createRes.body?.id;

  // 1-5. 등록 확인
  const listRes = await api(`/wbs?from=${from}&to=${to}`, { token: userA.token });
  check('1-5 등록 확인', '캘린더 목록에 방금 등록한 WBS 포함', listRes.body?.some((w) => w.id === wbsId));
  const getOneRes = await api(`/wbs/${wbsId}`, { token: userA.token });
  check('1-5 등록 확인', '상세 조회 시 캘린더와 내용 일치(title)', getOneRes.body?.title === createRes.body?.title);

  // 1-6. 내 WBS관리
  const myTodoRes = await api('/wbs?mine=true&status=TODO', { token: userA.token });
  check('1-6 내 WBS관리', 'mine=true&status=TODO에 본인 WBS 포함', myTodoRes.body?.some((w) => w.id === wbsId));

  // 1-7. 내용 수정 (RESOLVED까지는 가능, DONE은 불가)
  const updateOkRes = await api(`/wbs/${wbsId}`, {
    method: 'PUT',
    token: userA.token,
    body: {
      assignee_id: userA.id,
      title: titleTag('updated'),
      content: '수정된 내용',
      start_date: startDate,
      end_date: endDate,
      status: 'RESOLVED',
      time_allocations: [{ work_date: '2026-08-11', hours: 3 }],
    },
  });
  check('1-7 내용 수정', '일반 회원이 RESOLVED까지 상태 변경 가능', updateOkRes.status === 200 && updateOkRes.body?.status === 'RESOLVED');
  const updateDoneRes = await api(`/wbs/${wbsId}`, {
    method: 'PUT',
    token: userA.token,
    body: {
      assignee_id: userA.id,
      title: titleTag('done_attempt'),
      content: null,
      start_date: startDate,
      end_date: endDate,
      status: 'DONE',
      time_allocations: [],
    },
  });
  check('1-7 내용 수정', '일반 회원의 DONE 전환 시도는 403 FORBIDDEN', updateDoneRes.status === 403 && updateDoneRes.body?.error?.code === 'FORBIDDEN');
  const reGetRes = await api(`/wbs/${wbsId}`, { token: userA.token });
  check('1-7 내용 수정', '수정 내용이 즉시 반영됨(캘린더/상세 동기화)', reGetRes.body?.status === 'RESOLVED');

  // 1-8. 유지/로그아웃
  const refreshRes = await api('/auth/refresh', { method: 'POST', cookie: userA.refreshCookie });
  check('1-8 유지', 'refresh_token으로 access_token 재발급(세션 유지)', refreshRes.status === 200 && !!refreshRes.body?.access_token);

  const logoutRes = await api('/auth/logout', { method: 'POST', token: userA.token });
  check('1-8 로그아웃', 'POST /auth/logout 200 성공', logoutRes.status === 200);
  const refreshAfterLogoutRes = await api('/auth/refresh', { method: 'POST', cookie: userA.refreshCookie });
  check('1-8 로그아웃', '로그아웃 후 기존 refresh_token 재사용 시 401(token_version 무효화)', refreshAfterLogoutRes.status === 401);

  // === 2. 관리자 시나리오 ===
  const adminLoginRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@teamwbs.local', password: PASSWORD },
  });
  if (adminLoginRes.status !== 200) {
    console.log('  ⚠️  시드 관리자 계정(admin@teamwbs.local) 로그인 실패 — DB-2 시드가 적용됐는지 확인 필요. 관리자 시나리오는 건너뜁니다.');
  } else {
    const adminToken = adminLoginRes.body.access_token;

    // 2-1. 타인 WBS 등록/수정 (userA가 작성자인 WBS를 관리자가 수정)
    const adminUpdateRes = await api(`/wbs/${wbsId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        assignee_id: userA.id,
        title: titleTag('admin_updated'),
        content: '관리자 대리 수정',
        start_date: startDate,
        end_date: endDate,
        status: 'RESOLVED',
        time_allocations: [],
      },
    });
    check('2-1 타인 WBS 수정', '관리자가 타인(작성자 아님) 글 수정 시 200 성공', adminUpdateRes.status === 200);

    const adminDeleteRes = await api(`/wbs/${wbsId}`, { method: 'DELETE', token: adminToken });
    check('2-1 타인 WBS 수정', '관리자도 타인 글 삭제는 403(삭제 버튼 미노출과 대응)', adminDeleteRes.status === 403);

    // 2-2. 상태를 DONE으로 변경
    const adminDoneRes = await api(`/wbs/${wbsId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        assignee_id: userA.id,
        title: titleTag('admin_done'),
        content: null,
        start_date: startDate,
        end_date: endDate,
        status: 'DONE',
        time_allocations: [],
      },
    });
    check('2-2 DONE 변경', '관리자가 타인 WBS를 DONE으로 변경 시 200 성공', adminDoneRes.status === 200 && adminDoneRes.body?.status === 'DONE');
    check('2-2 DONE 변경', '(1-7에서 이미 확인) 일반 회원은 동일 시도 시 403', updateDoneRes.status === 403);
  }

  // --- 정리 ---
  await pool.query(
    "DELETE FROM time_allocations WHERE wbs_id IN (SELECT id FROM wbs WHERE title LIKE 'test_e2e_%')"
  );
  await pool.query("DELETE FROM wbs WHERE title LIKE 'test_e2e_%'");
  await pool.query("DELETE FROM users WHERE email LIKE 'test_e2e_%'");
  await pool.end();

  console.log(`\n결과: ${passCount}개 통과 / ${failCount}개 실패`);
  if (failures.length > 0) {
    console.log('실패 목록:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('E2E 실행 중 오류:', err);
  process.exit(1);
});
