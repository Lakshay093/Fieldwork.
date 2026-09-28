import { Icon } from './Icon.jsx';

export function Notice({ children, onDismiss, kind = 'error' }) {
  if (!children) return null;
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <Icon name={kind === 'error' ? 'info' : 'check'} />
      <span>{children}</span>
      {onDismiss && (
        <button
          className="icon-button"
          type="button"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
export function Loading({ text = 'Loading your workspace…' }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {text}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="calendar" size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Badge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span />
      {status}
    </span>
  );
}
