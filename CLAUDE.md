# b2b-promo 프로젝트의 촤상위 지침

## 반드시 준수할 최우선 지침

- 모든 대화, 입출력은 한국어로 할 것
- 오버엔지니어링 금지
- 지시하지 않은 작업은 수행하지 말 것

## 개발할 때 다음 사항을 준수할 것

- 안드레 카파시의 CLAUDE.md
- https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/refs/heads/main/CLAUDE.md

## docs/ 참조 문서

| 문서 | 내용 |
|---|---|
| [docs/1-domain-definition.md](docs/1-domain-definition.md) | 도메인정의서 — 용어, 도메인 이벤트, 데이터 모델, 비기능요구사항 |
| [docs/2-PRD.md](docs/2-PRD.md) | PRD — 목표, 범위, 화면 목록, 일정, 기술스택 |
| [docs/3-user-scenario.md](docs/3-user-scenario.md) | 사용자 시나리오 — 일반 회원/관리자 흐름 |
| [docs/4-project-principle.md](docs/4-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 코드/네이밍, 테스트, 보안, 디렉토리 구조 |
| [docs/5-arch-diagram.md](docs/5-arch-diagram.md) | 기술 아키텍처 다이어그램(Mermaid) |
| [docs/6-wireframe.md](docs/6-wireframe.md) | 화면별 와이어프레임 |
| [docs/7-erd.md](docs/7-erd.md) / [docs/7-schema.sql](docs/7-schema.sql) | ERD 및 DB 스키마(DDL) |
| [docs/8-plan.md](docs/8-plan.md) | 실행계획 — Task 분해, 의존 관계, 완료조건 체크리스트 |
| [docs/swagger.json](docs/swagger.json) | OpenAPI 3.0 스펙 |

작업 전 관련 문서를 먼저 확인하고, 문서 간 내용이 상충되면 `8-plan.md` 4절(API 계약)과 `7-schema.sql`을 최신 근거로 우선한다.
