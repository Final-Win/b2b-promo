# Team WBS 프로젝트 구조 설계 원칙

1인 개발, 7일 일정, 사내 사용자 10~100명 규모 도구. 아래 원칙은 이 규모에 맞춘 실용 기준이며, 마이크로서비스/과도한 레이어링/미사용 확장 포인트는 만들지 않는다.

## 1. 공통 최상위 원칙

- **단일 진실 소스(Single Source of Truth)**: 서버 상태(WBS, 회원, 시간 할당)는 PostgreSQL이 유일한 진실. 프론트는 TanStack Query 캐시를 그 상태의 반영본으로만 취급하고, Zustand는 서버 데이터를 절대 복제하지 않는다.
- **역할 분리**: Zustand = UI/클라이언트 전역 상태(선택된 날짜, 드래그 중인 막대, 모달 열림 여부 등)만. TanStack Query = 서버 데이터 fetch/캐시/mutation만. 이 둘을 섞어서 서버 데이터를 Zustand에 넣지 않는다.
- **얇은 계층 유지**: 라우트(컨트롤러) → 쿼리 함수 → DB. 이 이상으로 서비스/리포지토리/DTO 계층을 쪼개지 않는다. 도메인이 3개 엔티티(회원/WBS/시간할당)뿐이므로 파일당 계층 하나면 충분.
- **도메인 문서가 기준**: `1-domain-definition.md`의 상태값, 권한 규칙, 데이터 제약을 코드로 그대로 옮긴다. 새로운 추상화를 만들기 전에 도메인 문서에 근거가 있는지 먼저 확인한다.
- **필요한 것만 구현**: PRD 4절 "제외(2차)" 항목(관리자 전용 화면, 알림, 주간 집계)은 코드/스키마에 자리조차 만들지 않는다.

## 2. 의존성 / 레이어 원칙

**백엔드 (Express + pg)**
- 요청 흐름: `routes → controller → db(query)` 단방향.
- ORM 없이 `pg`의 파라미터 바인딩(`$1, $2 ...`)만 사용. 쿼리 빌더/ORM 추가 금지 — 3개 테이블에 불필요.
- 인증 미들웨어(JWT 검증)는 라우트 진입 전 1곳에서만 처리, 각 컨트롤러에서 중복 검증하지 않음.
- 권한 검증은 컨트롤러 레벨에서 명시적으로 처리(별도 권한 프레임워크/데코레이터 금지): 본인 글만 등록/수정/삭제 가능, 관리자는 등록/수정만 예외(타인 글도 가능)하고 **삭제는 관리자도 불가, 작성자 본인 한정**(도메인정의서 5절), 상태를 DONE으로 바꾸는 것은 관리자만 가능.
- 모든 SQL은 예외 없이 `db/` 함수를 통해서만 실행(컨트롤러 직접 작성 금지) — "재사용 여부"를 매번 판단하지 않도록 기준을 단일화.
- WBS 저장/수정은 트랜잭션으로 묶는다(`db/tx.js`의 `withTransaction` 한 곳). 시간 할당 수정은 기존 레코드 전량 삭제 후 재삽입 — 부분 실패로 WBS만 저장되고 시간이 누락되는 사고를 막기 위함.
- DB로 해결되는 제약은 DB에 둔다: `time_allocations.wbs_id`는 `ON DELETE CASCADE`(도메인 4절 "WBS삭제됨→하위 시간 할당 함께 삭제"), `wbs`에 `CHECK (end_date >= start_date)`, `time_allocations`에 `UNIQUE(wbs_id, work_date)`. 앱 코드로 다시 검증하지 않음.
- 테이블 간 제약이라 DB로 처리 안 되는 것은 컨트롤러에서 검증: `time_allocations.work_date`가 해당 WBS의 `start_date~end_date` 범위 내인지(도메인정의서 6절 데이터 품질 규칙).
- 에러 응답은 `{ error: { code, message } }` 고정 포맷. 상태코드는 401(인증 실패)/403(권한 없음)/400(검증 오류, 예: 종료일<시작일)/404(없는 리소스)만 사용. `code` 값 목록은 8-plan.md 4절 표를 따른다.
- CORS는 `cors({ origin: 프론트 주소, credentials: true })`. refresh 쿠키는 `httpOnly`, `SameSite=Lax`, 로컬은 `secure=false`.

**프론트엔드 (React 19)**
- 계층 순서는 `pages → features → api → shared`. 상위 계층은 자신과 하위 계층을 import할 수 있고, 역방향(하위가 상위를 import)은 금지.
- 서버 통신은 반드시 TanStack Query hook을 통해서만. 컴포넌트에서 직접 fetch 호출 금지. 모든 요청은 `api/client.ts`의 공용 fetch 래퍼를 거친다: 401 응답 시 refresh 1회 시도 후 재요청, 실패하면 로그인 화면으로 이동.
- Refresh Token은 httpOnly 쿠키로 저장(서버가 `Set-Cookie`로 내려줌, 프론트 JS는 접근하지 않음). Access Token만 메모리(Zustand)에 둔다. 새로고침 시 accessToken이 비어 있으므로, **앱 부팅 직후 `/auth/refresh`를 1회 호출해 세션을 복원하고 그 호출이 끝난 뒤에 라우터 가드를 활성화한다**(그 전에 가드가 동작하면 재발급 기회 없이 로그인 화면으로 튕긴다 — 시나리오 1-8 "세션 유지").
- 데이터를 바꾸는 mutation은 성공 시 관련 쿼리를 `invalidateQueries`로 무효화한다(WBS 등록/수정/삭제 → `wbs` 목록). 로그아웃·탈퇴 시에는 `queryClient.clear()`로 전체 캐시를 비운다 — 다른 계정으로 재로그인했을 때 이전 사용자 데이터가 노출되지 않도록.
- 컴포넌트 트리는 화면 단위(캘린더, 상세패널, 내 WBS관리 탭)로만 분리하고, 재사용되지 않는 컴포넌트를 미리 공통화하지 않는다. Zustand 스토어도 실제로 형제 컴포넌트 간 공유가 필요할 때만 만들고, 컴포넌트 내부에서만 쓰는 상태(드래그 중 구간 등)는 `useState`로 충분.

## 3. 코드 / 네이밍 원칙

- DB 컬럼명은 도메인정의서의 물리명(snake_case)을 그대로 사용. API 응답도 동일 필드명 유지(camelCase 변환 등 불필요한 매핑 레이어 만들지 않음).
- 상태값 문자열(`TODO`, `IN_PROGRESS`, `QA`, `RESOLVED`, `DONE`)은 상수 하나로 관리(백엔드: `constants.js`, 프론트: `constants.ts`), 프론트/백엔드 양쪽에 하드코딩 금지.
- 파일명은 도메인 용어 그대로: `wbs.controller.js`, `wbsApi.ts`, `TimeAllocationInput.tsx` 등. 축약어·범용 이름(`utils2.js`, `helper.js`) 지양.
- 타입/인터페이스는 실제로 여러 곳에서 쓰이는 것만 정의. 백엔드는 JS, 프론트는 TS(구조 예시가 `.tsx/.ts` 기준).
- 요청/응답 필드명은 배열 키까지 전부 snake_case로 통일한다(`time_allocations`, `work_date`, `user_id`). camelCase 예외를 두지 않는다 — 매핑 레이어를 만들지 않기 위한 규칙이므로 예외가 생기면 규칙 자체가 무의미해진다.
- 회원별 일자 시간 합계(8시간 초과 경고)는 서버가 `assignee_id` 기준으로 계산해 반환하고, 프론트는 받은 값에 현재 편집 중인 미저장 입력값만 더해 표시한다. 전용 조회 `GET /time-allocations/daily-sum?user_id&from&to`를 두고, 저장 자체는 WBS 등록/수정 요청 바디에 `time_allocations` 배열을 포함해 한 번에 처리(별도 등록 API 불필요).
- 탈퇴 회원 표기는 서버가 `writer_status`/`assignee_status`만 내려주고 `"(탈퇴)"` 문자열 합성은 프론트가 담당한다(서버에서 문자열을 가공하지 않음).
- 반응형 레이아웃은 별도 CSS 프레임워크 추가 없이 CSS 기본 미디어 쿼리로 처리(캘린더는 가로 스크롤 허용, 상세패널은 좁은 화면에서 하단 시트로 전환).

## 4. 테스트 / 품질 원칙

- 1인 7일 일정 특성상 E2E/유닛 테스트 풀세트는 하지 않는다. **핵심 도메인 규칙**(권한 검증, 8시간 초과 경고, 상태 전이 권한, work_date 범위 검증)에 대해서만 supertest로 백엔드 API 레벨 테스트 최소 1개씩 작성, `backend/tests/*.test.js`에 배치(end_date ≥ start_date, work_date 중복은 DB 제약이 처리하므로 별도 테스트 불필요).
- 프론트는 별도 테스트 프레임워크 도입 없이, 7일차 "통합 테스트" 일정에서 수동 시나리오 검증(3-user-scenario.md 기준)으로 대체.
- 린트/포맷은 기존 프로젝트 설정(ESLint/Prettier)만 사용, 규칙 커스터마이징 최소화.

## 5. 설정 / 보안 / 운영 원칙

- 환경변수(`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `CORS_ORIGIN`)는 `.env` + `.env.example`로 관리, 저장소에 실제 값 커밋 금지.
- 비밀번호는 bcrypt로 해시 저장(도메인정의서 7절). 평문 비교/저장 금지.
- JWT: access 15분 / refresh 14일. refresh 폐기는 별도 토큰 테이블 없이 `users.token_version` 증가로 처리(도메인정의서 6절 그대로) — 토큰 블랙리스트 테이블 등 추가 인프라 만들지 않음.
- 권한 검증은 프론트(버튼 미노출)와 백엔드(403 반환) 양쪽 모두 필수. 프론트 검증만으로 끝내지 않음.
- 배포/운영은 단일 Node 프로세스 + 단일 PostgreSQL 인스턴스 기준. 로드밸런서/큐/캐시 서버(Redis 등) 도입하지 않음 — 100명 규모에 불필요.
- 로깅은 요청 로깅 morgan 한 줄 + 에러 시 스택 콘솔 출력. 별도 로그 수집 인프라(ELK 등) 구축하지 않음.
- 인덱스는 실제 조회 경로에 필요한 5개만(7-schema.sql 기준): 캘린더 조회용 `wbs(start_date, end_date)` / `time_allocations(wbs_id, work_date)`, 권한 필터·내 WBS관리 탭용 `wbs(writer_id)` / `wbs(assignee_id)`, daily-sum용 `time_allocations(work_date)`.

## 6. 디렉토리 구조

### 프론트엔드 (React 19 + Zustand + TanStack Query)

```
frontend/
├── src/
│   ├── pages/                  # 화면 단위 (라우트 진입점)
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── CalendarPage.tsx        # 캘린더 메인
│   │   └── MyPage.tsx              # 마이페이지(탈퇴)
│   ├── features/                # 도메인별 UI 묶음 (화면 조합용 컴포넌트, 필요한 곳만 로컬 상태)
│   │   ├── calendar/
│   │   │   ├── CalendarGrid.tsx    # 5주 뷰, 막대 드래그(드래그 중 구간은 내부 useState)
│   │   │   └── WbsBar.tsx
│   │   ├── wbs-detail/
│   │   │   ├── WbsDetailPanel.tsx  # 상세패널(등록/수정), 시간 할당 입력 포함
│   │   │   └── TimeAllocationInput.tsx
│   │   └── my-wbs/
│   │       └── MyWbsTabs.tsx       # 상태별 내 WBS 목록
│   ├── api/                     # TanStack Query hooks + 통신 (서버 상태 전용)
│   │   ├── client.ts                # fetch 래퍼: credentials:'include', 401 시 refresh 재시도 1회
│   │   ├── authApi.ts               # useLogin, useSignup, useLogout, useMe, authStore(Zustand: accessToken)
│   │   ├── usersApi.ts              # useUsers (담당자 선택 목록)
│   │   ├── wbsApi.ts                # useWbsList, useWbs, useCreateWbs(시간할당 포함), useUpdateWbs, useDeleteWbs
│   │   ├── timeAllocationApi.ts     # useDailySum (8시간 초과 경고용 조회)
│   │   ├── wbsPanelStore.ts         # Zustand: 패널 열림 여부 / 대상 wbs_id / 모드
│   │   └── queryClient.ts
│   ├── shared/                  # 공통 UI/유틸 (상위 계층 import 금지)
│   │   ├── components/             # Button, Modal 등
│   │   └── constants.ts             # 상태값 enum, 색상 매핑, 일일 기준시간(8)
│   ├── App.tsx                   # 라우터 설정
│   └── main.tsx
└── package.json
```

### 백엔드 (Node.js + Express + pg)

```
backend/
├── src/
│   ├── routes/                  # URL ↔ 컨트롤러 매핑만
│   │   ├── auth.routes.js
│   │   ├── wbs.routes.js
│   │   └── timeAllocation.routes.js   # daily-sum 조회 전용(저장은 wbs.routes.js에 포함)
│   ├── controllers/              # 요청 검증 + 권한 체크 + db 호출 + 응답
│   │   ├── auth.controller.js       # 회원가입/로그인/탈퇴/토큰 재발급
│   │   ├── wbs.controller.js        # WBS CRUD(시간할당 포함 저장), 상태변경(권한별)
│   │   └── timeAllocation.controller.js  # daily-sum 조회만
│   ├── db/                       # SQL 쿼리 함수 (pg 직접 사용, 컨트롤러는 직접 SQL 작성 금지)
│   │   ├── pool.js                  # pg Pool 생성
│   │   ├── tx.js                    # withTransaction
│   │   ├── users.db.js
│   │   ├── wbs.db.js
│   │   └── timeAllocations.db.js
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT 검증, req.user 설정
│   │   └── errorHandler.js          # { error: { code, message } } 포맷 고정
│   ├── utils/
│   │   ├── jwt.js                   # access/refresh 발급·검증
│   │   └── constants.js             # 상태값, role 등
│   └── app.js
├── db/
│   ├── schema.sql                 # 테이블 생성 DDL (FK ON DELETE CASCADE, CHECK 제약, 인덱스 포함)
│   └── seed.sql                   # 최초 관리자 계정 시드
├── tests/
│   └── *.test.js                  # supertest, 핵심 도메인 규칙만
├── server.js
└── package.json
```

- 스킵: 리포지토리/서비스/DTO 계층 분리, GraphQL, 마이크로서비스 분할, Redis 캐시, 별도 로그 인프라. 사용자 100명·엔티티 3개 규모에서 추가 이득 없음. 필요해지면(예: 쿼리 재사용이 컨트롤러 5곳 이상에서 겹칠 때) `db/` 함수를 서비스 계층으로 승격.
