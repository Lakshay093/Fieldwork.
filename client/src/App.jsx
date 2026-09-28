import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './api/auth.jsx';
import { Layout } from './components/Layout.jsx';
import { Loading, Notice } from './components/Feedback.jsx';
import { Login } from './pages/Login.jsx';
import { Employee } from './pages/Employee.jsx';
import { Manager } from './pages/Manager.jsx';

function RoleGuard({ role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return (
      <Navigate to={user.role === 'manager' ? '/team' : '/leave'} replace />
    );
  return <Outlet />;
}
function AppRoutes() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <div className="session-screen">
        <Loading text="Opening your workspace…" />
      </div>
    );
  if (auth.error)
    return (
      <div className="session-screen">
        <Notice>{auth.error}</Notice>
        <button className="button primary" onClick={auth.restore}>
          Try again
        </button>
        <button className="button secondary" onClick={auth.signOut}>
          Back to sign in
        </button>
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RoleGuard />}>
        <Route element={<Layout />}>
          <Route element={<RoleGuard role="employee" />}>
            <Route path="/leave" element={<Employee />} />
          </Route>
          <Route element={<RoleGuard role="manager" />}>
            <Route path="/team" element={<Manager />} />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={auth.user?.role === 'manager' ? '/team' : '/leave'}
            replace
          />
        }
      />
    </Routes>
  );
}
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
