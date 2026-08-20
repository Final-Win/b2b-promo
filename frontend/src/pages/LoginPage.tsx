import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../api/authApi';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto' }}>
      <h1>로그인</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>
        {login.isError && (
          <p className="field-error">
            {login.error instanceof ApiError ? login.error.message : '로그인에 실패했습니다.'}
          </p>
        )}
        <button type="submit" className="btn primary" disabled={login.isPending} style={{ marginTop: 12, width: '100%' }}>
          로그인
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
}
