import { useEffect, useRef, useState } from 'react';
import { WBS_STATUS_COLORS } from '../../shared/constants';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import { useUpdateWbs } from '../../api/wbsApi';
import type { Wbs, WbsInput } from '../../api/wbsApi';
import { addDays, diffDays, toISO } from './dateUtils';

interface WbsBarProps {
  wbs: Wbs;
  startCol: number;
  endCol: number;
  row: number;
  weekStart: Date;
}

export default function WbsBar({ wbs, startCol, endCol, row, weekStart }: WbsBarProps) {
  const openEdit = useWbsPanelStore((s) => s.openEdit);
  const updateWbs = useUpdateWbs(String(wbs.id));
  const barRef = useRef<HTMLButtonElement>(null);
  const [resizing, setResizing] = useState(false);
  const [previewEndDate, setPreviewEndDate] = useState<string | null>(null);

  const weekEndISO = toISO(addDays(weekStart, 6));
  // 이 주(week)에 렌더링된 구간이 실제 종료일을 포함할 때만(다음 주로 이어지지 않을 때만) 끝단 리사이즈 핸들을 노출한다.
  // 데스크탑 마우스 드래그 전용 기능(요구사항: 3절 전환 트리거의 축소판 대신 원안 유지).
  const showResizeHandle = wbs.end_date <= weekEndISO;

  useEffect(() => {
    if (!resizing) return;

    function handleMouseMove(e: MouseEvent) {
      const rowContainer = barRef.current?.parentElement;
      if (!rowContainer) return;
      const rect = rowContainer.getBoundingClientRect();
      const colWidth = rect.width / 7;
      const dayIndex = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / colWidth)));
      let newEnd = toISO(addDays(weekStart, dayIndex));
      if (newEnd < wbs.start_date) newEnd = wbs.start_date;
      setPreviewEndDate(newEnd);
    }

    function handleMouseUp() {
      setResizing(false);
      setPreviewEndDate((current) => {
        if (current && current !== wbs.end_date) {
          const body: WbsInput = {
            assignee_id: wbs.assignee_id,
            title: wbs.title,
            content: wbs.content ?? '',
            start_date: wbs.start_date,
            end_date: current,
            status: wbs.status,
            time_allocations: wbs.time_allocations,
          };
          updateWbs.mutate(body);
        }
        return null;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, weekStart, wbs, updateWbs]);

  const previewEndCol = previewEndDate
    ? Math.min(7, Math.max(startCol, diffDays(new Date(previewEndDate), weekStart) + 1))
    : endCol;
  const displayEndCol = resizing ? previewEndCol : endCol;

  return (
    <button
      ref={barRef}
      onClick={() => {
        if (!resizing) openEdit(String(wbs.id));
      }}
      title={wbs.title}
      style={{
        gridColumn: `${startCol} / ${displayEndCol + 1}`,
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
        position: 'relative',
      }}
    >
      {wbs.title}
      {showResizeHandle && (
        <span
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setResizing(true);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
          }}
        />
      )}
    </button>
  );
}
