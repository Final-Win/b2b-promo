import { useWbsList } from '../../api/wbsApi';
import WbsBar from './WbsBar';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

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
                    style={{
                      gridColumn: i + 1,
                      gridRow: 1,
                      padding: 4,
                      fontWeight: dayISO === todayISO ? 'bold' : 'normal',
                      color: dayISO === todayISO ? '#2563eb' : undefined,
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
                  <WbsBar key={w.id} wbs={w} startCol={startCol} endCol={endCol} row={i + 2} />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
