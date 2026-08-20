import { useEffect, useState } from 'react';
import { useWbsList } from '../../api/wbsApi';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import WbsBar from './WbsBar';
import { addDays, mondayOf, toISO, diffDays } from './dateUtils';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

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
      <div style={{ minWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(90px, 1fr))' }}>
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

          return (
            <div
              key={weekStartISO}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(90px, 1fr))',
                gridAutoRows: 'auto',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              {week.map((day, i) => {
                const dayISO = toISO(day);
                return (
                  <div
                    key={dayISO}
                    onMouseDown={() => {
                      setDragAnchor(dayISO);
                      setDragCurrent(dayISO);
                    }}
                    onMouseEnter={() => {
                      if (dragAnchor) setDragCurrent(dayISO);
                    }}
                    style={{
                      gridColumn: i + 1,
                      gridRow: 1,
                      padding: 4,
                      fontWeight: dayISO === todayISO ? 'bold' : 'normal',
                      color: dayISO === todayISO ? '#2563eb' : undefined,
                      background: isInDragRange(dayISO) ? '#dbeafe' : undefined,
                      userSelect: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
              {/* ponytail: bars stack in list order without overlap-packing; add lane packing if a week regularly has many concurrent WBS */}
              {weekWbs.map((w, i) => {
                const start = new Date(w.start_date);
                const end = new Date(w.end_date);
                const startCol = Math.max(1, diffDays(start, weekStart) + 1);
                const endCol = Math.min(7, diffDays(end, weekStart) + 1);
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
