import { WBS_STATUS_COLORS } from '../../shared/constants';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import type { Wbs } from '../../api/wbsApi';

interface WbsBarProps {
  wbs: Wbs;
  startCol: number;
  endCol: number;
  row: number;
}

export default function WbsBar({ wbs, startCol, endCol, row }: WbsBarProps) {
  const openEdit = useWbsPanelStore((s) => s.openEdit);

  return (
    <button
      onClick={() => openEdit(String(wbs.id))}
      title={wbs.title}
      style={{
        gridColumn: `${startCol} / ${endCol + 1}`,
        gridRow: row,
        background: WBS_STATUS_COLORS[wbs.status],
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        padding: '2px 6px',
        margin: '1px 2px',
        fontSize: 12,
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {wbs.title}
    </button>
  );
}
