import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { dateRange, leaveLabels } from '../utils.js';

export function ConfirmDialog({ action, leave, busy, onClose, onConfirm }) {
  const dialog = useRef(null);
  const [comment, setComment] = useState('');
  const rejection = action === 'reject';
  const label =
    action === 'approve'
      ? 'Approve request'
      : rejection
        ? 'Reject request'
        : 'Cancel request';
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && (!rejection || comment.trim()))
            onConfirm(comment.trim());
        }}
      >
        <div className="dialog-heading">
          <span className="eyebrow">
            {leave.employee?.name || 'YOUR REQUEST'}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="dialog-title">{label}?</h2>
        <p className="dialog-description">
          {leaveLabels[leave.type]} ·{' '}
          {dateRange(leave.startDate, leave.endDate)}
          <br />
          {leave.workingDays} working day{leave.workingDays === 1 ? '' : 's'}
        </p>
        {action === 'cancel' ? (
          <p className="subtle">
            {leave.status === 'approved'
              ? 'These days will be returned to your available balance.'
              : 'The days reserved for this request will be released.'}
          </p>
        ) : (
          <div className="field">
            <label htmlFor="decision-comment">
              Comment <span>{rejection ? '(required)' : '(optional)'}</span>
            </label>
            <textarea
              id="decision-comment"
              rows="3"
              maxLength="500"
              required={rejection}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              autoFocus={rejection}
            />
            <small>
              {rejection
                ? 'Let your teammate know why this request cannot be approved.'
                : 'Your teammate will see this with the decision.'}
            </small>
          </div>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Go back
          </button>
          <button
            className={`button ${rejection ? 'danger' : 'primary'}`}
            disabled={busy || (rejection && !comment.trim())}
          >
            {busy ? 'Saving…' : label}
          </button>
        </div>
      </form>
    </dialog>
  );
}
