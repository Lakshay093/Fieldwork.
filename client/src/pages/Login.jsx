import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../api/auth.jsx';
import { messageFor } from '../api/client.js';
import { Brand, Icon } from '../components/Icon.jsx';
import { Notice } from '../components/Feedback.jsx';

export function Login() {
  const { user, signIn, expired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user)
    return (
      <Navigate to={user.role === 'manager' ? '/team' : '/leave'} replace />
    );
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <header>
        <Brand />
        <span className="login-header-note">A little space for life.</span>
      </header>
      <main className="login-card">
        <section className="login-intro">
          <span className="eyebrow">TIME OFF, SIMPLIFIED</span>
          <h1>
            Your time.
            <br />A little more
            <br />
            <em>in balance.</em>
          </h1>
          <p>
            Plan a break, see your balance,
            <br />
            and keep your team in the loop.
          </p>
          <div className="calendar-art" aria-hidden="true">
            <div>
              <span>A LITTLE TIME AWAY</span>
              <Icon name="calendar" />
            </div>
            <div className="art-days">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
              {[12, 13, 14, 15, 16, 17, 18].map((day) => (
                <b
                  key={day}
                  className={day >= 14 && day <= 16 ? 'day-away' : ''}
                >
                  {day}
                </b>
              ))}
            </div>
            <p>
              <span className="live-dot" /> 3 days for you. The weekend, too.
            </p>
          </div>
          <span className="intro-foot">GOOD WORK. WELL-EARNED REST.</span>
        </section>
        <section className="login-form">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p className="subtle">Sign in to manage your time off.</p>
          {expired && (
            <Notice kind="success">
              Your session ended. Please sign in again.
            </Notice>
          )}
          <Notice onDismiss={() => setError('')}>{error}</Notice>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button className="button primary login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="login-help">Need access? Your team manager can help.</p>
        </section>
      </main>
      <footer>Fieldwork · People & culture</footer>
    </div>
  );
}
