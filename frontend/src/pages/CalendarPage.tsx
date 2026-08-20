import { useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarGrid from '../features/calendar/CalendarGrid';
import WbsDetailPanel from '../features/wbs-detail/WbsDetailPanel';
import MyWbsTabs from '../features/my-wbs/MyWbsTabs';

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isMyWbsOpen, setIsMyWbsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>B2B 프로모션</h1>
        <button onClick={() => setWeekOffset((o) => o - 1)}>이전주</button>
        <button onClick={() => setWeekOffset((o) => o + 1)}>다음주</button>
        <Link to="/me" style={{ marginLeft: 'auto' }}>
          마이페이지
        </Link>
      </header>

      <CalendarGrid weekOffset={weekOffset} />

      <button
        style={{ position: 'fixed', right: 24, bottom: 24, padding: '10px 16px', borderRadius: 8 }}
        onClick={() => setIsMyWbsOpen((o) => !o)}
      >
        내 WBS관리 탭
      </button>

      {isMyWbsOpen && <MyWbsTabs onClose={() => setIsMyWbsOpen(false)} />}

      <WbsDetailPanel />
    </div>
  );
}
