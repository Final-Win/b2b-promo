import { useNavigate } from 'react-router-dom';
import { useLogout, useMe, useWithdraw } from '../api/authApi';

export default function MyPage() {
  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const navigate = useNavigate();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  function handleWithdraw() {
    if (!window.confirm('정말 탈퇴하시겠습니까?')) return;
    withdraw.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
  }

  if (isLoading) return <p>로딩 중...</p>;

  return (
    <div style={{ maxWidth: 320, margin: '80px auto' }}>
      <h1>마이페이지</h1>
      <p>이름: {user?.name}</p>
      <p>이메일: {user?.email}</p>
      <button onClick={handleLogout} disabled={logout.isPending}>
        로그아웃
      </button>
      <button
        onClick={handleWithdraw}
        disabled={withdraw.isPending}
        style={{ marginLeft: 12, color: 'red' }}
      >
        회원 탈퇴
      </button>
    </div>
  );
}
