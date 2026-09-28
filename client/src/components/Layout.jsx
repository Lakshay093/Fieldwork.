import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../api/auth.jsx';
import { initials, formatDate } from '../utils.js';
import { Brand, Icon } from './Icon.jsx';

export function Layout() {
  const { user, signOut } = useAuth();
  const isManager = user.role === 'manager';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
          <span className="workspace-label">PEOPLE & CULTURE</span>
        </div>
        <nav aria-label="Main navigation">
          <span className="nav-label">WORKSPACE</span>
          <NavLink to={isManager ? '/team' : '/leave'}>
            <Icon name="grid" />
            {isManager ? 'Team requests' : 'My time off'}
            <span className="nav-dot" />
          </NavLink>
          <a href="#requests">
            <Icon name="clock" />
            {isManager ? 'Recent decisions' : 'Request history'}
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="policy-note">
            <Icon name="calendar" />
            <strong>A note on your days</strong>
            <p>
              Weekends and public holidays are on us. Only working days count.
            </p>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{isManager ? 'Team manager' : 'Employee'}</small>
            </span>
            <button
              className="icon-button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-slash">/</span>{' '}
            <strong>{isManager ? 'Team requests' : 'My time off'}</strong>
          </span>
          <span className="topbar-date">
            <span className="live-dot" />
            {formatDate(new Date().toISOString(), {
              weekday: 'short',
              year: 'numeric',
            })}
          </span>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>
            Made by Lakshay Dhiman with{' '}
            <span role="img" aria-label="love">
              ♥
            </span>
          </span>
          <span>
            Fieldwork <span> / </span> Time off
          </span>
        </footer>
      </div>
    </div>
  );
}
