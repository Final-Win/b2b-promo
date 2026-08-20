# 업무 관리 툴 백엔드 개발을 위한 지침

## 반드시 준수할 사항

- 아키텍처/레이어 구조는 `../docs/4-project-principle.md`를 따른다: `routes → controller → db` 3단 레이어만 사용하고, 서비스/리포지토리/DTO/Use Case 같은 추가 계층을 두지 않는다(1인 개발·소규모 사내 도구 규모에 맞춘 결정).
- 하드코딩 금지: 상태값·역할 등 반복되는 리터럴(`'ADMIN'`, `'DONE'`, `'WITHDRAWN'` 등)은 `src/utils/constants.js`에 상수로 정의해 참조한다.
- 에러 응답은 항상 `{ error: { code, message } }` 고정 포맷과 `../docs/8-plan.md` 4절의 code 목록만 사용한다. DB 드라이버가 던진 원본 에러(SQLSTATE, 제약명 등)를 그대로 클라이언트에 노출하지 않는다.

## 참조 문서

| 문서 | 내용 |
|---|---|
| [../docs/1-domain-definition.md](../docs/1-domain-definition.md) | 도메인정의서 — 용어, 도메인 이벤트, 데이터 모델, 비기능요구사항 |
| [../docs/4-project-principle.md](../docs/4-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 코드/네이밍, 테스트, 보안, 디렉토리 구조 |
| [../docs/7-erd.md](../docs/7-erd.md) / [../docs/7-schema.sql](../docs/7-schema.sql) | ERD 및 DB 스키마(DDL) |
| [../docs/8-plan.md](../docs/8-plan.md) | 실행계획 — Task 분해, 의존 관계, API 계약, 완료조건 체크리스트 |
| [../docs/swagger.json](../docs/swagger.json) | OpenAPI 3.0 스펙 |

작업 전 관련 문서를 먼저 확인하고, 문서 간 내용이 상충되면 `../docs/8-plan.md` 4절(API 계약)과 `../docs/7-schema.sql`을 최신 근거로 우선한다.
