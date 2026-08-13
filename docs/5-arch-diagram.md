# 5. 기술 아키텍처 다이어그램

## 5.1 전체 시스템 구성도

브라우저(React) - 단일 Node.js 서버 - PostgreSQL 단일 인스턴스로 구성된 계층 구조.

```mermaid
flowchart TB
    subgraph 클라이언트["브라우저"]
        UI["React 19 화면\n(pages/features)"]
        ZS["Zustand\n(UI 상태, accessToken)"]
        TQ["TanStack Query\n(서버 상태 캐시)"]
        UI --> ZS
        UI --> TQ
    end

    TQ -- "HTTP(S) JSON\nAccess Token (api/client.ts)" --> MW

    subgraph 서버["단일 Node.js 프로세스"]
        MW["JWT 인증 미들웨어"]
        API["Express\nroutes → controller"]
        DB함수["db/ 쿼리 함수\n(pg 파라미터 바인딩)"]
        MW --> API --> DB함수
    end

    DB함수 -- "SQL" --> PG[("PostgreSQL 17\n(users / wbs / time_allocations)")]
```

## 5.2 인증(JWT access/refresh 재발급) 흐름

Access Token 만료 시 401 응답을 받으면 Refresh Token(httpOnly 쿠키)으로 재발급받는 흐름.

```mermaid
sequenceDiagram
    participant 브라우저 as 브라우저(api/client.ts)
    participant 서버 as Express 서버
    participant DB as PostgreSQL

    브라우저->>서버: API 요청 (Access Token 헤더)
    서버->>서버: Access Token 검증 → 만료
    서버-->>브라우저: 401 응답

    브라우저->>서버: /auth/refresh 요청 (httpOnly 쿠키의 Refresh Token)
    서버->>DB: users.token_version 조회
    DB-->>서버: token_version 반환
    서버->>서버: 토큰 내 버전과 비교

    alt 버전 일치(유효)
        서버-->>브라우저: 신규 Access Token 발급
        브라우저->>서버: 원요청 재시도 (신규 Access Token)
        서버-->>브라우저: 정상 응답
    else 버전 불일치(로그아웃/탈퇴)
        서버-->>브라우저: 401 (재발급 거부)
        브라우저->>브라우저: 로그인 화면으로 이동
    end

    note over 서버,DB: 로그아웃/탈퇴 시점에는
    서버->>DB: users.token_version +1 (기존 Refresh Token 전부 무효화)
```

## 5.3 프론트엔드 컴포넌트 구조

계층 의존 방향은 `pages → features → api → shared` 한 방향, 역방향 import 금지(4-project-principle.md 2절).

```mermaid
flowchart TB
    subgraph pages["pages (화면)"]
        Login["LoginPage"]
        Signup["SignupPage"]
        Calendar["CalendarPage"]
        My["MyPage"]
    end

    subgraph features["features (도메인 UI)"]
        CalGrid["calendar\nCalendarGrid, WbsBar"]
        Detail["wbs-detail\nWbsDetailPanel, TimeAllocationInput"]
        MyWbs["my-wbs\nMyWbsTabs"]
    end

    subgraph api["api (TanStack Query + 통신)"]
        Client["client.ts\n(fetch 래퍼, 401→refresh 재시도)"]
        AuthApi["authApi.ts"]
        WbsApi["wbsApi.ts"]
        TimeApi["timeAllocationApi.ts"]
    end

    subgraph shared["shared (공통 UI/유틸)"]
        Comp["components"]
        Const["constants.ts"]
    end

    Calendar --> CalGrid
    Calendar --> Detail
    Calendar --> MyWbs
    Login --> AuthApi
    Signup --> AuthApi
    My --> AuthApi

    CalGrid --> WbsApi
    Detail --> WbsApi
    Detail --> TimeApi
    MyWbs --> WbsApi

    AuthApi --> Client
    WbsApi --> Client
    TimeApi --> Client

    CalGrid --> Comp
    Detail --> Comp
    MyWbs --> Comp
    CalGrid --> Const
    Detail --> Const
```
