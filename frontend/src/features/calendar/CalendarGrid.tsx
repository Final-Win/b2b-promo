import { useEffect, useState } from 'react';
import { useWbsList } from '../../api/wbsApi';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import WbsBar from './WbsBar';
import { addDays, mondayOf, toISO, diffDays, WEEKDAYS_PER_ROW } from './dateUtils';
import { getHolidayName } from './holidays';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'];

interface CalendarGridProps {
  weekOffset: number;
}

export default function CalendarGrid({ weekOffset }: CalendarGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const centerMonday = addDays(mondayOf(today), weekOffset * 7);
  const gridStart = addDays(centerMonday, -14);
  const days = Array.from({ length: 35 }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: 5 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const from = toISO(days[0]);
  const to = toISO(days[34]);
  const { data: wbsList = [] } = useWbsList(from, to);
  const todayISO = toISO(today);

  const openCreate = useWbsPanelStore((s) => s.openCreate);

  // 데스크탑 마우스 드래그 전용 인터랙션(빈 구간 드래그 → 신규 작성).
  // 8-plan.md 3절 "전환 트리거"의 축소판(클릭→클릭)은 채택하지 않고 원안(드래그)을 유지한다.
  // 모바일/터치 환경은 이 드래그가 동작하지 않으며, 상세패널의 시작일/종료일 입력(FE-4)으로 대체된다.
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [dragCurrent, setDragCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!dragAnchor) return;
    function handleWindowMouseUp() {
      if (dragAnchor && dragCurrent) {
        const start = dragAnchor < dragCurrent ? dragAnchor : dragCurrent;
        const end = dragAnchor < dragCurrent ? dragCurrent : dragAnchor;
        openCreate({ start_date: start, end_date: end });
      }
      setDragAnchor(null);
      setDragCurrent(null);
    }
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [dragAnchor, dragCurrent, openCreate]);

  function isInDragRange(dayISO: string): boolean {
    if (!dragAnchor || !dragCurrent) return false;
    const start = dragAnchor < dragCurrent ? dragAnchor : dragCurrent;
    const end = dragAnchor < dragCurrent ? dragCurrent : dragAnchor;
    return dayISO >= start && dayISO <= end;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 560 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WEEKDAYS_PER_ROW}, minmax(110px, 1fr))` }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} style={{ fontWeight: 'bold', textAlign: 'center', padding: 4 }}>
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week) => {
          const weekStart = week[0];
          const weekStartISO = toISO(weekStart);
          const weekEndISO = toISO(addDays(weekStart, 6));
          const weekWbs = wbsList.filter(
            (w) => w.start_date <= weekEndISO && w.end_date >= weekStartISO,
          );
          // 토/일에만 걸쳐있는 항목은 평일 칸이 없으므로 이 주에서는 표시하지 않는다.
          const visibleWeekWbs = weekWbs
            .map((w) => ({
              w,
              startOffset: Math.max(0, diffDays(new Date(w.start_date), weekStart)),
              endOffset: Math.min(6, diffDays(new Date(w.end_date), weekStart)),
            }))
            .filter(({ startOffset }) => startOffset < WEEKDAYS_PER_ROW);

          return (
            <div
              key={weekStartISO}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${WEEKDAYS_PER_ROW}, minmax(110px, 1fr))`,
                // 1행(날짜 숫자)만 고정 높이로 확보한다. gridAutoRows를 고정값으로 두면
                // 날짜 셀의 '1 / span 999' 트릭이 빈 암시적 행 999개까지 그 높이로
                // 강제로 늘려버려 주(week) 한 줄이 수만 px로 부풀어버리므로 auto를 유지한다.
                // rowGap도 마찬가지 이유로 0을 유지한다 — 0이 아니면 999개 행 "사이사이"
                // 간격이 다 합산돼(예: 2px면 998×2px≈2000px) 막대가 하나도 없어도
                // 주(week) 한 줄이 수천 px로 부풀어버린다. 막대 사이 여백은 WbsBar 자체의
                // margin으로만 처리한다.
                gridTemplateRows: '22px',
                gridAutoRows: 'auto',
                rowGap: 0,
                borderTop: '1px solid var(--color-line)',
              }}
            >
              {week.slice(0, WEEKDAYS_PER_ROW).map((day, i) => {
                const dayISO = toISO(day);
                const holidayName = getHolidayName(day);
                return (
                  // 날짜 셀을 이 주(week)의 전체 행 범위(1 / -1)에 걸쳐 깔아서
                  // 막대가 빼곡히 채워져 있어도 막대 사이/뒤 빈 공간이면 어디를 눌러도
                  // 드래그가 시작되도록 한다. 막대는 이후 DOM 순서로 그 위에 그려져
                  // 막대 자체를 클릭하면 막대의 onClick(상세 열람)이 우선한다.
                  <div
                    key={dayISO}
                    title={holidayName ?? undefined}
                    onMouseDown={() => {
                      setDragAnchor(dayISO);
                      setDragCurrent(dayISO);
                    }}
                    onMouseEnter={() => {
                      if (dragAnchor) setDragCurrent(dayISO);
                    }}
                    style={{
                      gridColumn: i + 1,
                      // '-1'은 명시적 그리드 끝을 가리켜 auto로 추가되는 막대 행들을
                      // 안정적으로 덮지 못할 수 있어, 충분히 큰 span으로 전체를 덮는다.
                      // (실제로 하루에 30개 넘게 겹치는 일은 없으니 999까지는 필요 없다)
                      gridRow: '1 / span 30',
                      // 주의: 이 셀에 position/z-index를 주면 셀 전체(열 전체 높이)가
                      // 막대보다 위에서 클릭을 가로채 막대 클릭이 막힌다. static으로 두어
                      // 막대(WbsBar, position:relative)가 항상 이 셀 위에 그려지게 유지한다.
                      padding: '2px 4px',
                      fontWeight: dayISO === todayISO || holidayName ? 'bold' : 'normal',
                      color: holidayName
                        ? 'var(--color-danger)'
                        : dayISO === todayISO
                          ? 'var(--color-primary-700)'
                          : undefined,
                      background: isInDragRange(dayISO) ? 'var(--color-primary-100)' : undefined,
                      userSelect: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
              {/* ponytail: bars stack in list order without overlap-packing; add lane packing if a week regularly has many concurrent WBS */}
              {visibleWeekWbs.map(({ w, startOffset, endOffset }, i) => {
                const startCol = startOffset + 1;
                const endCol = Math.min(WEEKDAYS_PER_ROW, endOffset + 1);
                return (
                  <WbsBar
                    key={w.id}
                    wbs={w}
                    startCol={startCol}
                    endCol={endCol}
                    row={i + 2}
                    weekStart={weekStart}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
