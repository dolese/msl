import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { RecordsPage } from './pages/RecordsPage';
import { NewRegistrationPage } from './pages/NewRegistrationPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SharedRecordPage } from './pages/SharedRecordPage';
import { AccountPage } from './pages/AccountPage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/s/:token" element={<SharedRecordPage />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/records/new" element={<RequireAuth permission="records:create"><NewRegistrationPage /></RequireAuth>} />
            <Route path="/records/:id" element={<RecordDetailPage />} />
            <Route path="/users" element={<RequireAuth permission="users:manage"><UsersPage /></RequireAuth>} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/audit" element={<RequireAuth permission="audit:read"><AuditLogPage /></RequireAuth>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
