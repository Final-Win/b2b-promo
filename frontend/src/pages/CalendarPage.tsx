import { useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarGrid from '../features/calendar/CalendarGrid';
import WbsDetailPanel from '../features/wbs-detail/WbsDetailPanel';
import MyWbsTabs from '../features/my-wbs/MyWbsTabs';
import { addDays, mondayOf } from '../features/calendar/dateUtils';

const TEAM_NAME = import.meta.env.VITE_TEAM_NAME || 'Team WBS';

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isMyWbsOpen, setIsMyWbsOpen] = useState(false);

  // 화면 정중앙(3번째 행)에 오는 주의 월을 헤더에 표시 — 일별 그리드만 보고는
  // 몇 월인지 알 수 없다는 문제를 해결하기 위함.
  const today = new Date();
  const centerMonday = addDays(mondayOf(today), weekOffset * 7);
  const monthLabel = `${centerMonday.getFullYear()}년 ${centerMonday.getMonth() + 1}월`;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', padding: 16 }}>
      <header
        className="topbar"
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px' }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: '#fff' }}>{TEAM_NAME}</h1>
        <button className="btn" onClick={() => setWeekOffset((o) => o - 1)}>
          이전주
        </button>
        <span style={{ fontWeight: 800, minWidth: 100, textAlign: 'center' }}>{monthLabel}</span>
        <button className="btn" onClick={() => setWeekOffset((o) => o + 1)}>
          다음주
        </button>
        <Link to="/me" style={{ marginLeft: 'auto' }}>
          마이페이지
        </Link>
      </header>

      <CalendarGrid weekOffset={weekOffset} />

      <button
        className="btn primary"
        style={{ position: 'fixed', right: 24, bottom: 24, borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-card)' }}
        onClick={() => setIsMyWbsOpen((o) => !o)}
      >
        내 WBS관리 탭
      </button>

      {isMyWbsOpen && <MyWbsTabs onClose={() => setIsMyWbsOpen(false)} />}

      <WbsDetailPanel />
    </div>
  );
}
