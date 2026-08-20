# Team WBS 스타일 가이드

근거 문서: `images/재고재배치_Tableau_화면기획_시각화.html`, `images/주문제한_대시보드_수정기획v12.html` (사내 디자인가이드를 반영해 만든 실제 화면기획), `images/3-calendar-main.svg`, `images/4-wbs-detail-panel.svg` (본 프로젝트 와이어프레임).

두 사내 화면기획은 색상값이 미세하게 다르지만(예: `#087f67` vs `#08765d`) 같은 디자인 언어(포레스트 그린 + 민트 배경 + 세만틱 레드/블루/앰버, 유사한 radius·shadow·타이포)를 쓰고 있다. 이 문서는 그 공통분모를 Team WBS용 토큰 하나로 통합한 것이다.

별도 CSS 프레임워크/디자인 시스템 라이브러리는 도입하지 않는다(`4-project-principle.md` 3절 원칙). CSS 커스텀 프로퍼티(`:root` 변수) + 순수 CSS만 사용한다.

## 1. 색상 토큰

```css
:root {
  /* Primary — forest green */
  --color-primary-900: #0b3d30;  /* 헤더/사이드바 배경(진한 톤) */
  --color-primary-700: #08795f;  /* 기본 액션(버튼/포커스/강조선) */
  --color-primary-100: #dff2eb;  /* 옅은 배경(강조 배지, 선택 행) */
  --color-primary-50:  #f0faf6;  /* 가장 옅은 배경 */

  /* Semantic */
  --color-info:      #2f6fa6;
  --color-info-bg:    #edf5fb;
  --color-warning:   #a9670f;
  --color-warning-bg: #fff6e6;
  --color-danger:    #c2453d;
  --color-danger-bg:  #fdeeec;

  /* Neutral */
  --color-ink:    #1f2d2a;  /* 본문 텍스트 */
  --color-sub:    #586965;  /* 보조 텍스트(라벨 등) */
  --color-muted:  #6f8079;  /* 캡션/placeholder */
  --color-line:        #dbe4e0;  /* 기본 테두리 */
  --color-line-strong: #bdcbc7;  /* input/select 테두리 */
  --color-surface: #ffffff; /* 카드/패널 배경 */
  --color-canvas:  #f2f6f4; /* 페이지 배경 */

  --shadow-card: 0 6px 20px rgba(15, 61, 48, .08);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;
}
```

### WBS 상태값 색상 (`shared/constants.ts`의 `WBS_STATUS_COLORS`)

도메인정의서/와이어프레임 기준 3색 그룹(회색·하늘색·초록색)을 위 팔레트 톤에 맞춰 매핑한다.

| 상태 | 색상 | 값 |
|---|---|---|
| `TODO` | 회색 | `#94a3a0` |
| `IN_PROGRESS` | 하늘색 | `#2f6fa6` (info) |
| `QA` | 하늘색(진하게) | `#245781` |
| `RESOLVED` | 초록색 | `#3fae86` |
| `DONE` | 초록색(진하게) | `#08795f` (primary-700) |

### 시맨틱 사용처
- **info(blue)**: 진행중 상태, 안내성 배지
- **warning(amber)**: 8시간 초과 경고, "확인 필요"류 상태
- **danger(red)**: 오류 메시지, 삭제 버튼 아웃라인
- **primary(green)**: 기본 액션 버튼, 포커스 링, 완료/해결 상태, 헤더 배경

## 2. 타이포그래피

```css
body {
  font-family: "Pretendard", "Noto Sans KR", "Malgun Gothic", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-ink);
}
```

- 제목(`h1`, 패널 타이틀): `font-weight: 800~900`, `letter-spacing: -0.4px` 내외
- 라벨(`label`, 테이블 헤더): `font-size: 10~11px`, `font-weight: 700~800`, `color: var(--color-sub)`
- 본문/입력값: `13px`, `font-weight: 400~650`
- 숫자 강조(통계 값 등): `font-size: 20~27px`, `font-weight: 850~900`

## 3. 레이아웃 / 컴포넌트 패턴

### 헤더(topbar)
어두운 primary-900 배경 + 흰 텍스트. 좌측 서비스/팀명, 중앙 또는 인접에 이동 컨트롤, 우측 보조 메뉴.
```css
.topbar {
  background: linear-gradient(105deg, var(--color-primary-900), var(--color-primary-700));
  color: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
```

### 패널/카드
```css
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
```

### 버튼
```css
.btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-primary-900);
  font-weight: 700;
}
.btn.primary {
  border-color: var(--color-primary-700);
  background: var(--color-primary-700);
  color: #fff;
}
.btn.danger-outline {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: #fff;
}
```

### 입력 필드
```css
input, select, textarea {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-ink);
}
input:focus, select:focus, textarea:focus {
  border-color: var(--color-primary-700);
  box-shadow: 0 0 0 3px rgba(8, 121, 95, .12);
  outline: none;
}
label { display: block; margin-bottom: 5px; color: var(--color-sub); font-size: 11px; font-weight: 700; }
```

### 배지 / 태그(상태 표시)
pill 형태, 시맨틱 색상 쌍(텍스트 색 + 옅은 배경색)으로 표현.
```css
.tag { display: inline-flex; padding: 3px 8px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 800; }
.tag.info    { color: var(--color-info);    background: var(--color-info-bg); }
.tag.warning { color: var(--color-warning); background: var(--color-warning-bg); }
.tag.danger  { color: var(--color-danger);  background: var(--color-danger-bg); }
.tag.neutral { color: var(--color-sub);     background: #eef1f0; }
```

### 세그먼트 탭(내 WBS관리 상태 탭 등)
```css
.segmented button {
  height: 31px;
  padding: 0 13px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-pill);
  color: var(--color-sub);
  background: #fff;
  font-weight: 800;
}
.segmented button.active {
  border-color: var(--color-primary-700);
  background: var(--color-primary-700);
  color: #fff;
}
```

### 경고/오류 메시지
```css
.field-error { color: var(--color-danger); font-size: 12px; margin-top: 4px; }
.warn-inline { color: var(--color-warning); font-weight: 700; }
```

## 4. 적용 대상 (프론트엔드)

`frontend/src/shared/theme.css`에 위 토큰과 공통 엘리먼트 스타일(button/input/label 기본값)을 정의하고 `main.tsx`에서 전역 로드한다. 각 화면은 이 토큰(`var(--color-*)`)만 참조하며 개별 컴포넌트에 하드코딩된 hex 값을 두지 않는다(`shared/constants.ts`의 `WBS_STATUS_COLORS`만 예외 — 도메인 상태값 색상이라 별도 상수로 관리).

| 화면/컴포넌트 | 적용 내용 |
|---|---|
| `CalendarPage.tsx` | 헤더를 topbar 패턴(어두운 그라디언트)으로, 버튼을 `.btn` 패턴으로 |
| `CalendarGrid.tsx` / `WbsBar.tsx` | 그리드 라인 색을 `--color-line`, 오늘 강조를 `--color-primary-700` 계열로, 막대 색은 `WBS_STATUS_COLORS` 갱신값 사용 |
| `WbsDetailPanel.tsx` | 패널을 `.panel` 카드로, 입력필드/라벨을 공통 패턴으로, 저장은 `.btn.primary`, 삭제는 `.btn.danger-outline`, 8시간 경고는 `.warn-inline` |
| `MyWbsTabs.tsx` | 탭을 `.segmented` 패턴으로, 목록 항목에 상태 `.tag` 배지 |
| `LoginPage.tsx` / `SignupPage.tsx` / `MyPage.tsx` | 입력/버튼 공통 패턴 적용, 오류 메시지를 `.field-error`로 |
