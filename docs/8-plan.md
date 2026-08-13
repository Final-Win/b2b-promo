# Team WBS 실행계획

근거 문서: [1-domain-definition.md](./1-domain-definition.md) · [2-PRD.md](./2-PRD.md) · [3-user-scenario.md](./3-user-scenario.md) · [4-project-principle.md](./4-project-principle.md) · [6-wireframe.md](./6-wireframe.md) · [7-schema.sql](./7-schema.sql)

1인 개발 / 7일. Task는 DB → 백엔드 → 프론트엔드 순으로 의존하며, 같은 계층 내 Task는 선행 Task만 끝나면 순서를 바꿔도 된다.

## Task 의존 관계

```
DB-1 ─┬─ BE-1 ─┬─ BE-2 ── BE-3 ── BE-4       FE-1 ── FE-2 ─┬─ FE-3 ── FE-4 ── FE-5
      │        │                                            └─ (BE 완료 후 연동)
      └─ DB-2 ─┘                                     전체 ──> QA-1
```

---

## 1. 데이터베이스

### DB-1. 스키마 생성
- 선행: 없음
- 작업: `docs/7-schema.sql`을 `backend/db/schema.sql`로 배치하고 로컬 PostgreSQL 17에 적용. users / wbs / time_allocations 3개 테이블, CHECK·UNIQUE·FK(CASCADE/RESTRICT) 제약, 인덱스 5개, `updated_at` 트리거 포함.
- 완료 조건
  - [ ] `psql -f backend/db/schema.sql` 이 오류 없이 실행됨
  - [ ] 3개 테이블과 인덱스 5개가 생성됨 (`\d+` 로 확인)
  - [ ] `end_date < start_date` INSERT가 CHECK 제약으로 거부됨
  - [ ] 같은 `(wbs_id, work_date)` 중복 INSERT가 UNIQUE 제약으로 거부됨
  - [ ] WBS 1건 삭제 시 하위 time_allocations가 함께 삭제됨(CASCADE)
  - [ ] wbs UPDATE 시 `updated_at`이 트리거로 자동 갱신됨

### DB-2. 최초 관리자 시드
- 선행: DB-1
- 작업: `backend/db/seed.sql`에 관리자 계정 1건 INSERT(`role='ADMIN'`, 비밀번호는 bcrypt 해시값). 관리자 계정 관리 UI는 2차 범위이므로 시드로만 생성.
- 완료 조건
  - [ ] seed.sql 실행 후 `role='ADMIN'` 계정이 1건 존재
  - [ ] 해당 계정의 password가 평문이 아닌 bcrypt 해시로 저장됨

---

## 2. 백엔드 (Node.js + Express + pg)

### BE-1. 프로젝트 골격 + 인증
- 선행: DB-1, DB-2
- 작업
  - `4-project-principle.md` 6절 디렉토리 구조로 골격 생성(`routes/ controllers/ db/ middleware/ utils/`)
  - `db/pool.js`(pg Pool), `db/tx.js`(`withTransaction`), `middleware/errorHandler.js`(`{ error: { code, message } }` 고정 포맷)
  - 회원가입 / 로그인 / 로그아웃 / 탈퇴 / 토큰 재발급 API
  - JWT access(15분) + refresh(14일), refresh는 httpOnly 쿠키, 폐기는 `users.token_version` 증가
  - `middleware/auth.middleware.js`: 라우트 진입 전 JWT 검증, `req.user` 세팅
  - 환경변수 `.env` + `.env.example` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`)
- 완료 조건
  - [ ] 회원가입 시 비밀번호가 bcrypt로 해시되어 저장되고, 이메일 형식 오류/중복은 400으로 거부됨
  - [ ] 로그인 성공 시 access token(응답 바디) + refresh token(httpOnly 쿠키)이 발급됨
  - [ ] 만료된 access token으로 요청 시 401 반환
  - [ ] `/auth/refresh`가 쿠키의 refresh token으로 신규 access token을 발급함
  - [ ] 로그아웃/탈퇴 후 기존 refresh token으로 재발급 시도하면 `token_version` 불일치로 401 거부됨
  - [ ] 탈퇴 계정(`status='WITHDRAWN'`)으로 로그인 시도하면 거부됨
  - [ ] `.env`가 커밋되지 않고 `.env.example`만 저장소에 있음

### BE-2. WBS CRUD + 시간 할당 저장
- 선행: BE-1
- 작업
  - `GET /wbs?from&to` — 캘린더 5주치 조회(기간 겹치는 WBS 목록, 담당자 이름 포함)
  - `POST /wbs`, `PUT /wbs/:id`, `DELETE /wbs/:id`
  - 시간 할당은 별도 API 없이 WBS 요청 바디의 `timeAllocations` 배열로 함께 저장. 수정 시 기존 레코드 전량 삭제 후 재삽입, 전체를 `withTransaction`으로 묶음
  - 모든 SQL은 `db/*.db.js` 함수에만 작성(컨트롤러 직접 작성 금지)
  - 컨트롤러 검증: `work_date`가 해당 WBS의 `start_date ~ end_date` 범위 내인지
- 완료 조건
  - [ ] WBS 등록 시 상태가 `TODO`로 초기화되고 timeAllocations가 같은 트랜잭션에서 함께 저장됨
  - [ ] WBS 수정 시 기존 시간 할당이 전량 교체되고, 중간 실패 시 WBS 변경도 롤백됨
  - [ ] `work_date`가 WBS 기간을 벗어나면 400 반환
  - [ ] WBS 삭제 시 하위 시간 할당도 함께 사라짐
  - [ ] `GET /wbs?from&to`가 5주 범위와 겹치는 WBS만 반환함
  - [ ] 탈퇴 회원이 담당자/작성자인 WBS도 정상 조회되고 이름에 탈퇴 여부가 식별 가능함

### BE-3. 권한 검증 + 상태 전이
- 선행: BE-2
- 작업
  - 일반 회원: 본인 작성 글만 등록/수정/삭제
  - 관리자: 타인 글도 등록/수정 가능, **삭제는 작성자 본인만**(관리자도 불가)
  - 상태 전이: 일반 회원은 `RESOLVED`까지만, `DONE`은 관리자만 가능
- 완료 조건
  - [ ] 타인 글 수정/삭제 시도 시 일반 회원은 403 반환
  - [ ] 관리자가 타인 글을 수정하면 200으로 성공함
  - [ ] 관리자가 타인 글 삭제를 시도하면 403 반환
  - [ ] 일반 회원이 상태를 `DONE`으로 변경 시도하면 403 반환
  - [ ] 관리자가 상태를 `DONE`으로 변경하면 성공함

### BE-4. 일자별 합계 조회 (8시간 초과 경고용)
- 선행: BE-2
- 작업: `GET /time-allocations/daily-sum?userId&from&to` — 회원 기준으로 **모든 WBS를 합친** 일자별 시간 합계 반환. 8시간 초과 판정값은 서버가 계산하고 저장은 차단하지 않음.
- 완료 조건
  - [ ] 한 회원이 여러 WBS에 같은 날짜로 시간을 넣은 경우 합산값이 반환됨
  - [ ] 합계가 8시간을 넘는 날짜가 응답에서 식별 가능함
  - [ ] 8시간 초과 상태로도 WBS 저장이 정상 성공함(하드 블록 없음)

---

## 3. 프론트엔드 (React 19 + Zustand + TanStack Query)

### FE-1. 프로젝트 골격 + 통신 계층
- 선행: 없음 (BE-1 완료 후 실제 연동 확인)
- 작업
  - `4-project-principle.md` 6절 구조로 `pages/ features/ api/ shared/` 생성
  - `api/client.ts`: fetch 래퍼, 401 시 refresh 1회 재시도 후 실패하면 로그인 화면 이동
  - `api/queryClient.ts`, `shared/constants.ts`(상태값 5종 + 색상 매핑)
  - `authApi.ts` + `authStore`(Zustand, accessToken만 메모리 보관)
  - 라우터 설정, 미인증 시 로그인 화면으로 리다이렉트
- 완료 조건
  - [ ] 상태값/색상 상수가 한 파일에만 정의되고 하드코딩된 문자열이 없음
  - [ ] access token 만료 시 화면 조작 없이 자동 재발급되어 요청이 이어짐
  - [ ] 재발급 실패 시 로그인 화면으로 이동함
  - [ ] 새로고침해도 로그인 상태가 복원됨(쿠키 기반 재발급)

### FE-2. 로그인 / 회원가입 / 마이페이지
- 선행: FE-1, BE-1
- 작업: 와이어프레임 1·2·6번 화면 구현. 마이페이지는 이름/이메일 조회 + 로그아웃 + 탈퇴(확인 다이얼로그).
- 완료 조건
  - [ ] 로그인 성공 시 캘린더 메인으로 이동함
  - [ ] 로그인/회원가입 실패 시 필드 하단에 오류 메시지가 표시됨
  - [ ] 회원가입 후 로그인이 가능함
  - [ ] 로그아웃 시 로그인 화면으로 이동하고 이전 세션으로 재접근이 불가함
  - [ ] 탈퇴는 확인 다이얼로그를 거친 뒤 처리되고, 이후 같은 계정으로 로그인이 불가함

### FE-3. 캘린더 메인 (5주 뷰 + 막대 드래그)
- 선행: FE-2, BE-2
- 작업: 와이어프레임 3번 화면. 5주 그리드(오늘 포함 주가 항상 3번째 행), 상태별 색상 막대, 빈 구간 드래그로 신규 생성, 막대 끝단 드래그로 기간 조정, 이전주/다음주 이동. 드래그 중 상태는 컴포넌트 내부 `useState`.
- 완료 조건
  - [ ] 진입 시 오늘이 포함된 주가 정중앙(3번째 행)에 표시됨
  - [ ] WBS 막대가 시작일~종료일 구간에 걸쳐 상태별 색상(회색/하늘색/초록색)으로 표시됨
  - [ ] 빈 날짜 구간을 드래그하면 상세패널이 신규 작성 모드로 열리고 기간이 자동 반영됨
  - [ ] 막대 끝단 드래그로 기간을 조정하면 서버에 반영되고 화면이 갱신됨
  - [ ] 이전주/다음주 이동이 동작하고, 좁은 화면에서 가로 스크롤로 열람 가능함

### FE-4. 게시글 상세패널 (+ 시간 할당 입력)
- 선행: FE-3, BE-2, BE-3, BE-4
- 작업: 와이어프레임 4번 화면. 제목/내용/담당자/시작일/종료일/상태 + 일자별 수행시간(1시간 단위, 기간 범위만 입력칸 노출). 좁은 화면에서는 하단 시트로 전환. 권한에 따라 상태 옵션·삭제 버튼 노출 제어.
- 완료 조건
  - [ ] 캘린더에서 막대를 클릭하면 입력값이 그대로 표시됨
  - [ ] 일자별 시간 입력 시 이 WBS의 합계가 자동 표시됨
  - [ ] daily-sum 결과로 그 담당자의 해당 날짜 총합이 8시간을 넘는 날에만 경고가 표시되고, 저장은 차단되지 않음
  - [ ] 일반 회원 화면에서 `DONE` 옵션이 선택 불가함
  - [ ] 삭제 버튼이 작성자 본인에게만 노출됨(관리자 포함 타인에게는 미노출)
  - [ ] 종료일 < 시작일 입력 시 저장이 차단되고 오류 메시지가 표시됨
  - [ ] 좁은 화면에서 우측 패널이 하단 시트로 전환됨

### FE-5. 내 WBS관리 탭
- 선행: FE-4
- 작업: 와이어프레임 5번 화면. 우측 하단 진입 버튼, 상태값 5종 탭, 각 탭에 본인 WBS 목록(제목/기간/건수). 항목 클릭 시 상세패널 재사용. 주간 집계 통계는 2차 범위이므로 제외.
- 완료 조건
  - [ ] 상태별 탭 전환이 동작하고 각 탭에 본인 WBS만 표시됨
  - [ ] 각 상태의 건수가 표시됨
  - [ ] 목록 항목 클릭 시 상세패널이 열림(FE-4 컴포넌트 재사용)
  - [ ] 주간 할당시간·프로젝트 수 집계가 화면에 없음(2차 범위 미구현 확인)

---

## 4. 검증

### QA-1. 핵심 규칙 테스트 + 시나리오 검증
- 선행: 모든 BE / FE Task
- 작업
  - `backend/tests/*.test.js`에 supertest로 핵심 도메인 규칙 테스트: 권한 검증, 상태 전이 권한, 8시간 초과 경고, work_date 범위 검증
  - `3-user-scenario.md` 기준 수동 시나리오 검증(일반 회원 1-1~1-8, 관리자 2-1~2-2)
- 완료 조건
  - [ ] 핵심 규칙 4종에 대한 API 테스트가 각 1개 이상 작성되고 통과함
  - [ ] 일반 회원 시나리오 1-1~1-8이 끊김 없이 수행됨
  - [ ] 관리자 시나리오 2-1(타인 글 수정), 2-2(DONE 처리)가 수행됨
  - [ ] 캘린더 5주 조회가 1초 이내에 응답함
  - [ ] 좁은 화면에서 주요 화면이 반응형으로 동작함
