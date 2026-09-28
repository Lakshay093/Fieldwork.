import { useRef, useState } from 'react';
import { useAuth } from '../api/auth.jsx';
import { api, messageFor } from '../api/client.js';
import { useResource } from '../api/useResource.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Badge, Empty, Loading, Notice } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { dateRange, formatDate, initials, leaveLabels } from '../utils.js';

export function Manager() {
  const { user } = useAuth();
  const queue = useResource('/leaves/pending');
  const recent = useResource('/leaves/decisions');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const leaves = queue.data?.leaves || [];
  const decisions = recent.data?.leaves || [];
  async function refresh() {
    await Promise.all([queue.refresh(), recent.refresh()]);
  }
  async function decide(comment) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await api(`/leaves/${selected.leave.id}/${selected.action}`, {
        method: 'PATCH',
        body: { comment },
      });
      setMessage(
        `${selected.leave.employee.name}’s request has been ${selected.action === 'approve' ? 'approved' : 'rejected'}.`,
      );
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setSelected(null);
      setBusy(false);
      inFlight.current = false;
      await refresh();
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TEAM WORKSPACE</span>
          <h1>Room for your team.</h1>
          <p>
            Hi {user.name.split(' ')[0]}. A few thoughtful decisions keep
            everyone moving.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={refresh}
          disabled={queue.loading || recent.loading}
        >
          <Icon name="refresh" />
          Refresh
        </button>
      </div>
      <Notice onDismiss={() => setError('')}>{error}</Notice>
      <Notice kind="success" onDismiss={() => setMessage('')}>
        {message}
      </Notice>
      <div className="manager-stats">
        <div>
          <span className="metric-icon">
            <Icon name="clock" />
          </span>
          <span>
            <small>Awaiting review</small>
            <strong>
              {queue.data ? leaves.length.toString().padStart(2, '0') : '—'}
              <em>requests</em>
            </strong>
          </span>
        </div>
        <div>
          <span className="metric-icon">
            <Icon name="calendar" />
          </span>
          <span>
            <small>Time requested</small>
            <strong>
              {queue.data
                ? leaves.reduce((sum, leave) => sum + leave.workingDays, 0)
                : '—'}
              <em>working days</em>
            </strong>
          </span>
        </div>
        <div>
          <span className="metric-icon">
            <Icon name="grid" />
          </span>
          <span>
            <small>Teammates waiting</small>
            <strong>
              {queue.data
                ? new Set(leaves.map((leave) => leave.employeeId)).size
                : '—'}
              <em>direct reports</em>
            </strong>
          </span>
        </div>
      </div>
      <section className="panel manager-queue">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">OVER TO YOU</span>
            <h2>
              Pending requests{' '}
              <span className="count-pill">
                {queue.data ? leaves.length : '—'}
              </span>
            </h2>
          </div>
          <span className="quiet-label">Oldest first</span>
        </div>
        <Notice onDismiss={queue.dismissError}>{queue.error}</Notice>
        {queue.loading && !queue.data ? (
          <Loading text="Loading your team’s requests…" />
        ) : !queue.data ? (
          <Empty title="The queue is unavailable">
            Use Refresh to try again.
          </Empty>
        ) : !leaves.length ? (
          <Empty title="You’re all caught up.">
            No pending requests from your direct reports. A little breathing
            room.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="manager-table">
              <thead>
                <tr>
                  <th scope="col">Team member</th>
                  <th scope="col">Leave & dates</th>
                  <th scope="col">Days</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Decision</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar">
                          {initials(leave.employee.name)}
                        </span>
                        <span>
                          <strong>{leave.employee.name}</strong>
                          <small>Requested {formatDate(leave.createdAt)}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{leaveLabels[leave.type]}</strong>
                      <span className="date-line">
                        {dateRange(leave.startDate, leave.endDate)}
                      </span>
                    </td>
                    <td className="days-cell">
                      {leave.workingDays}
                      <small>working</small>
                    </td>
                    <td className="days-cell">
                      {leave.employee.balances[leave.type]}
                      <small>remaining</small>
                    </td>
                    <td className="manager-reason">{leave.reason}</td>
                    <td>
                      <div className="decision-buttons">
                        <button
                          className="button small primary"
                          onClick={() =>
                            setSelected({ action: 'approve', leave })
                          }
                          aria-label={`Approve request from ${leave.employee.name}`}
                        >
                          <Icon name="check" size={15} />
                          Approve
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            setSelected({ action: 'reject', leave })
                          }
                          aria-label={`Reject request from ${leave.employee.name}`}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footnote">
          <Icon name="info" size={15} />
          <span>
            Balances are checked again when you approve. Rejected requests need
            a short comment.
          </span>
        </div>
      </section>
      <section className="panel recent-panel" id="requests">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">THE PAPER TRAIL</span>
            <h2>Recent decisions</h2>
          </div>
          <span className="quiet-label">Latest 50 decisions</span>
        </div>
        <Notice onDismiss={recent.dismissError}>{recent.error}</Notice>
        {recent.loading && !recent.data ? (
          <Loading text="Loading recent decisions…" />
        ) : !recent.data ? (
          <Empty title="Decisions are unavailable">
            Use Refresh to try again.
          </Empty>
        ) : !decisions.length ? (
          <Empty title="A fresh start">
            Your team’s reviewed requests will appear here.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="recent-table">
              <thead>
                <tr>
                  <th scope="col">Team member</th>
                  <th scope="col">Leave & dates</th>
                  <th scope="col">Decision</th>
                  <th scope="col">Comment</th>
                  <th scope="col">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <strong>{leave.employee.name}</strong>
                    </td>
                    <td>
                      <strong>{leaveLabels[leave.type]}</strong>
                      <span className="date-line">
                        {dateRange(leave.startDate, leave.endDate)}
                      </span>
                    </td>
                    <td>
                      <Badge status={leave.status} />
                    </td>
                    <td className="decision-comment">
                      {leave.managerComment || 'No comment added.'}
                    </td>
                    <td className="date-line">
                      {formatDate(leave.decidedAt, { year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected && (
        <ConfirmDialog
          key={selected.leave.id}
          action={selected.action}
          leave={selected.leave}
          busy={busy}
          onClose={() => setSelected(null)}
          onConfirm={decide}
        />
      )}
    </>
  );
}
