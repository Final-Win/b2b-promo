import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../api/authApi';
import { ApiError } from '../api/client';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const signup = useSignup();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    signup.mutate(
      { name, email, password },
      { onSuccess: () => navigate('/login', { replace: true }) },
    );
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto' }}>
      <h1>회원가입</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            이름
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
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
        {signup.isError && (
          <p className="field-error">
            {signup.error instanceof ApiError ? signup.error.message : '회원가입에 실패했습니다.'}
          </p>
        )}
        <button type="submit" className="btn primary" disabled={signup.isPending} style={{ marginTop: 12, width: '100%' }}>
          가입하기
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
