import { useState } from 'react';
import './MyWbsTabs.css';
import { useMyWbsList } from '../../api/wbsApi';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import { WBS_STATUSES, WBS_STATUS_COLORS } from '../../shared/constants';
import type { WbsStatus } from '../../shared/constants';

interface Props {
  onClose: () => void;
}

export default function MyWbsTabs({ onClose }: Props) {
  const [tab, setTab] = useState<WbsStatus>('TODO');
  const { data: allMine } = useMyWbsList();
  const openEdit = useWbsPanelStore((s) => s.openEdit);

  const list = (allMine ?? []).filter((w) => w.status === tab);

  return (
    <div className="my-wbs-tabs panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>내 WBS관리</h2>
        <button className="btn" onClick={onClose}>닫기</button>
      </div>

      <div className="segmented">
        {WBS_STATUSES.map((s) => {
          const count = (allMine ?? []).filter((w) => w.status === s).length;
          return (
            <button key={s} onClick={() => setTab(s)} className={tab === s ? 'active' : ''}>
              {s} ({count})
            </button>
          );
        })}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {list.map((w) => (
          <li key={w.id}>
            <button
              onClick={() => openEdit(String(w.id))}
              style={{ width: '100%', textAlign: 'left', padding: '8px 4px', height: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="tag"
                  style={{ color: '#fff', background: WBS_STATUS_COLORS[w.status] }}
                >
                  {w.status}
                </span>
                <span>{w.title}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {w.start_date} ~ {w.end_date}
              </div>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li style={{ color: 'var(--color-muted)', padding: '8px 4px' }}>항목 없음</li>
        )}
      </ul>
    </div>
  );
}
