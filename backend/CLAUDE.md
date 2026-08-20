# 업무 관리 툴 백엔드 개발을 위한 지침

## 반드시 준수할 사항

- SOLID 원칙을 반드시 지킬 것
- Clean 아키텍쳐를 반드시 구현할 것

## 참조 문서

| 문서 | 내용 |
|---|---|
| [../docs/1-domain-definition.md](../docs/1-domain-definition.md) | 도메인정의서 — 용어, 도메인 이벤트, 데이터 모델, 비기능요구사항 |
| [../docs/4-project-principle.md](../docs/4-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 코드/네이밍, 테스트, 보안, 디렉토리 구조 |
| [../docs/7-erd.md](../docs/7-erd.md) / [../docs/7-schema.sql](../docs/7-schema.sql) | ERD 및 DB 스키마(DDL) |
| [../docs/8-plan.md](../docs/8-plan.md) | 실행계획 — Task 분해, 의존 관계, API 계약, 완료조건 체크리스트 |
| [../docs/swagger.json](../docs/swagger.json) | OpenAPI 3.0 스펙 |

작업 전 관련 문서를 먼저 확인하고, 문서 간 내용이 상충되면 `../docs/8-plan.md` 4절(API 계약)과 `../docs/7-schema.sql`을 최신 근거로 우선한다.
