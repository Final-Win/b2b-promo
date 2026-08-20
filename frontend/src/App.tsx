import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './api/authApi';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CalendarPage from './pages/CalendarPage';
import MyPage from './pages/MyPage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthed = useAuthStore((s) => s.accessToken !== null);
  return isAuthed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setAccessToken(data.access_token);
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, [setAccessToken]);

  if (booting) return <p>로딩 중...</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <CalendarPage />
            </RequireAuth>
          }
        />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
