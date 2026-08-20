import { useEffect, useState } from 'react';
import './WbsDetailPanel.css';
import { useWbsPanelStore } from '../../api/wbsPanelStore';
import { useWbs, useCreateWbs, useUpdateWbs, useDeleteWbs } from '../../api/wbsApi';
import type { TimeAllocation, WbsInput } from '../../api/wbsApi';
import { useUsers } from '../../api/usersApi';
import { useDailySum } from '../../api/timeAllocationApi';
import { useMe } from '../../api/authApi';
import { ApiError } from '../../api/client';
import { WBS_STATUSES, DAILY_BASE_HOURS } from '../../shared/constants';
import type { WbsStatus } from '../../shared/constants';

// toISOString()은 UTC 기준으로 변환하므로 UTC+ 시간대에서는 로컬 자정이 전날로 밀린다.
// 날짜만 다룰 때는 로컬 필드(getFullYear/Month/Date)로 직접 포맷해야 하루 밀림이 없다.
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function datesBetween(start: string, end: string): string[] {
  if (!start || !end || end < start) return [];
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function withdrawnSuffix(status: string) {
  return status === 'WITHDRAWN' ? '(탈퇴)' : '';
}

export default function WbsDetailPanel() {
  const { isOpen, wbsId, mode, initialStartDate, initialEndDate, close } = useWbsPanelStore();
  const { data: me } = useMe(isOpen);
  const { data: users } = useUsers();
  const { data: wbs } = useWbs(mode === 'edit' ? wbsId : null);
  const createWbs = useCreateWbs();
  const updateWbs = useUpdateWbs(wbsId ?? '');
  const deleteWbs = useDeleteWbs();

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [status, setStatus] = useState<WbsStatus>('TODO');
  const [content, setContent] = useState('');
  const [hoursByDate, setHoursByDate] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && wbs) {
      setTitle(wbs.title);
      setAssigneeId(wbs.assignee_id);
      setStartDate(wbs.start_date);
      setEndDate(wbs.end_date);
      setStatus(wbs.status);
      setContent(wbs.content ?? '');
      const map: Record<string, string> = {};
      for (const ta of wbs.time_allocations) map[ta.work_date] = String(ta.hours);
      setHoursByDate(map);
    } else if (mode === 'create') {
      setTitle('');
      setAssigneeId('');
      setStartDate(initialStartDate ?? todayStr());
      setEndDate(initialEndDate ?? todayStr());
      setStatus('TODO');
      setContent('');
      setHoursByDate({});
    }
    setError(null);
  }, [isOpen, mode, wbs, initialStartDate, initialEndDate]);

  const { data: dailySums } = useDailySum(
    typeof assigneeId === 'number' ? assigneeId : null,
    startDate,
    endDate,
  );

  if (!isOpen) return null;

  const isAdmin = me?.role === 'ADMIN';
  const isWriter = mode === 'edit' && wbs != null && me != null && String(wbs.writer_id) === String(me.id);

  const dates = datesBetween(startDate, endDate);
  const localTotal = dates.reduce((sum, d) => sum + (Number(hoursByDate[d]) || 0), 0);

  const originalHoursByDate: Record<string, number> =
    mode === 'edit' && wbs
      ? Object.fromEntries(wbs.time_allocations.map((ta) => [ta.work_date, ta.hours]))
      : {};

  const serverSumByDate: Record<string, number> = Object.fromEntries(
    (dailySums ?? []).map((s) => [s.work_date, s.total_hours]),
  );

  function isOverLimit(date: string): boolean {
    const server = serverSumByDate[date] ?? 0;
    const original = originalHoursByDate[date] ?? 0;
    const current = Number(hoursByDate[date]) || 0;
    return server - original + current > DAILY_BASE_HOURS;
  }

  function handleSave() {
    if (endDate < startDate) {
      setError('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }
    if (assigneeId === '') {
      setError('담당자를 선택해주세요.');
      return;
    }
    setError(null);
    const time_allocations: TimeAllocation[] = dates
      .filter((d) => hoursByDate[d] && Number(hoursByDate[d]) > 0)
      .map((d) => ({ work_date: d, hours: Number(hoursByDate[d]) }));
    const body: WbsInput = {
      assignee_id: assigneeId,
      title,
      content,
      start_date: startDate,
      end_date: endDate,
      status,
      time_allocations,
    };
    const onSuccess = () => close();
    const onError = (err: unknown) => {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.');
    };
    if (mode === 'create') {
      createWbs.mutate(body, { onSuccess, onError });
    } else if (wbsId && updateWbs) {
      updateWbs.mutate(body, { onSuccess, onError });
    }
  }

  function handleDelete() {
    if (!wbsId) return;
    deleteWbs.mutate(wbsId, {
      onSuccess: () => close(),
      onError: (err) => setError(err instanceof ApiError ? err.message : '삭제에 실패했습니다.'),
    });
  }

  return (
    <div className="wbs-detail-panel panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{mode === 'create' ? 'WBS 등록' : 'WBS 상세'}</h2>
        <button className="btn" onClick={close}>닫기</button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {mode === 'edit' && wbs && (
        <p style={{ fontSize: 12, color: 'var(--color-sub)' }}>
          작성자: {wbs.writer_name}
          {withdrawnSuffix(wbs.writer_status)} / 담당자: {wbs.assignee_name}
          {withdrawnSuffix(wbs.assignee_status)}
        </p>
      )}

      <label>
        제목
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label>
        담당자
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">선택</option>
          {(users ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {withdrawnSuffix(u.status)}
            </option>
          ))}
        </select>
      </label>

      <label>
        시작일
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>

      <label>
        종료일
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>

      <label>
        상태
        <select value={status} onChange={(e) => setStatus(e.target.value as WbsStatus)}>
          {WBS_STATUSES.filter((s) => s !== 'DONE' || isAdmin).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label>
        내용
        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <div>
        <h3 style={{ fontSize: 14 }}>일자별 수행시간</h3>
        {dates.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{d}</span>
            <input
              type="number"
              min={1}
              max={8}
              value={hoursByDate[d] ?? ''}
              onChange={(e) => setHoursByDate({ ...hoursByDate, [d]: e.target.value })}
            />
            {isOverLimit(d) && <span className="warn-inline">⚠ 8시간 초과</span>}
          </div>
        ))}
        <p>이 WBS 합계: {localTotal}시간</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={handleSave}>저장</button>
        {isWriter && (
          <button className="btn danger-outline" onClick={handleDelete}>
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
