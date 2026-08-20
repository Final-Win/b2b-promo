import { useState } from 'react';
import './MyWbsTabs.css';
import { useMyWbsList } from '../../api/wbsApi';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import { WBS_STATUSES } from '../../shared/constants';
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
    <div className="my-wbs-tabs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>내 WBS관리</h2>
        <button onClick={onClose}>닫기</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {WBS_STATUSES.map((s) => {
          const count = (allMine ?? []).filter((w) => w.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              style={{ fontWeight: tab === s ? 'bold' : 'normal' }}
            >
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
              style={{ width: '100%', textAlign: 'left', padding: '8px 4px' }}
            >
              <div>{w.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {w.start_date} ~ {w.end_date}
              </div>
            </button>
          </li>
        ))}
        {list.length === 0 && <li style={{ color: '#999', padding: '8px 4px' }}>항목 없음</li>}
      </ul>
    </div>
  );
}
