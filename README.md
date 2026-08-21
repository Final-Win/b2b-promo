# Team WBS

DT-AI팀 일정(WBS) 관리 웹 서비스. 캘린더에서 팀원의 업무를 등록·조회하고, 일자별 수행시간을 관리한다.

## Demo Site

- 프론트엔드: https://teamcj-schedule.vercel.app
- 백엔드 API: https://teamcj-schedule-api.vercel.app (Swagger UI는 운영에서 비활성화됨)

## 개발 문서 (docs/)

| 문서 | 내용 |
|---|---|
| [1-domain-definition.md](docs/1-domain-definition.md) | 도메인정의서 — 용어, 도메인 이벤트, 데이터 모델, 비기능요구사항 |
| [2-PRD.md](docs/2-PRD.md) | PRD — 목표, 범위, 화면 목록, 일정, 기술스택 |
| [3-user-scenario.md](docs/3-user-scenario.md) | 사용자 시나리오 — 일반 회원/관리자 흐름 |
| [4-project-principle.md](docs/4-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 코드/네이밍, 테스트, 보안, 디렉토리 구조 |
| [5-arch-diagram.md](docs/5-arch-diagram.md) | 기술 아키텍처 다이어그램 |
| [6-wireframe.md](docs/6-wireframe.md) | 화면별 와이어프레임 |
| [7-erd.md](docs/7-erd.md) / [7-schema.sql](docs/7-schema.sql) | ERD 및 DB 스키마(DDL) |
| [8-plan.md](docs/8-plan.md) | 실행계획 — Task 분해, 의존 관계, API 계약, 완료조건 체크리스트 |
| [9-style.md](docs/9-style.md) | 스타일 가이드 — 색상 토큰, 타이포그래피, 컴포넌트 패턴 |
| [swagger.json](docs/swagger.json) | OpenAPI 3.0 스펙 |

## 테스트용 사용자 계정

Demo Site와 로컬 개발 DB 모두에 아래 계정이 시딩되어 있다(비밀번호는 모두 동일).

| 구분 | 이메일 | 비밀번호 | 권한 |
|---|---|---|---|
| 관리자 | `admin@teamwbs.local` | `password123` | ADMIN |
| 일반 회원 | `user@teamwbs.local` | `password123` | USER |

로컬 개발 DB(`backend/db/seed.sql`)에는 추가로 일반 회원 3명(`alice@teamwbs.local`, `bob@teamwbs.local`, `carol@teamwbs.local`, 비밀번호 동일)이 있다.

## 간략한 테스트 시나리오

1. **일반 회원**: `user@teamwbs.local`로 로그인 → 캘린더 메인에서 오늘이 포함된 주가 정중앙(3번째 행)에 보이는지 확인 → 빈 날짜 구간을 드래그해 새 업무 등록(제목/담당자/기간/일자별 시간 입력 후 저장) → 캘린더에 TODO(회색) 막대로 즉시 반영되는지 확인 → 우측 하단 "내 WBS관리 탭"에서 상태별 탭 전환 확인 → 상태를 `DONE`으로 바꾸려 하면 선택 옵션에 없는지 확인(일반 회원은 `RESOLVED`까지만 가능)
2. **관리자**: `admin@teamwbs.local`로 로그인 → 1번에서 등록한 타인(user) 게시글을 열어 내용 수정 후 저장(200 성공) → 상태를 `DONE`으로 변경(관리자만 가능) → 같은 게시글의 삭제 버튼이 노출되지 않는지 확인(삭제는 작성자 본인만 가능, 관리자도 불가)
3. **반응형**: 브라우저 폭을 375px로 줄여 캘린더가 가로 스크롤로 열람되고, 게시글 상세패널/내 WBS관리 탭이 하단 시트 형태로 전환되는지 확인

E2E 자동 검증 결과는 [`qa/e2e-report.txt`](qa/e2e-report.txt), 화면 스크린샷은 [`qa/screenshots/`](qa/screenshots/) 참고.

## 기술 스택

- Frontend: React 19, Zustand, TanStack Query, Vite
- Backend: Node.js, Express, pg (PostgreSQL 드라이버)
- DB: PostgreSQL 17 (운영: Supabase)
- 배포: Vercel (프론트 정적 배포 + 백엔드 서버리스 함수)

## 로컬 실행

```bash
# 백엔드
cd backend
cp .env.example .env   # DATABASE_URL 등 채우기
npm install
npm run dev             # http://localhost:3000

# 프론트엔드
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

개발 규칙/지침은 [`CLAUDE.md`](CLAUDE.md) 참고.
