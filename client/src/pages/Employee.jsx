import { useRef, useState } from 'react';
import { useAuth } from '../api/auth.jsx';
import { api, messageFor } from '../api/client.js';
import { useResource } from '../api/useResource.js';
import { ApplyForm } from '../components/ApplyForm.jsx';
import { BalanceCard } from '../components/BalanceCard.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Badge, Empty, Loading, Notice } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { canCancel, dateRange, leaveLabels } from '../utils.js';

export function Employee() {
  const { user } = useAuth();
  const { data, loading, error, refresh, dismissError } =
    useResource('/leaves/mine');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [version, setVersion] = useState(0);
  const inFlight = useRef(false);
  async function reload() {
    await refresh();
    setVersion((value) => value + 1);
  }
  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError('');
    try {
      await api(`/leaves/${selected.id}/cancel`, { method: 'PATCH', body: {} });
      setMessage('Request cancelled. Your available balance has been updated.');
    } catch (error) {
      setActionError(messageFor(error));
    } finally {
      setSelected(null);
      setBusy(false);
      inFlight.current = false;
      await reload();
    }
  }
  const leaves =
    data?.leaves.filter(
      (leave) => filter === 'all' || leave.status === filter,
    ) || [];
  const pending =
    data?.leaves.filter((leave) => leave.status === 'pending').length || 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>My time off</h1>
          <p>
            A little room for life, {user.name.split(' ')[0]}. Here’s where your
            days stand.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={reload}
          disabled={loading}
        >
          <Icon name="refresh" />
          Refresh
        </button>
      </div>
      <Notice onDismiss={dismissError}>{error}</Notice>
      <Notice onDismiss={() => setActionError('')}>{actionError}</Notice>
      <Notice kind="success" onDismiss={() => setMessage('')}>
        {message}
      </Notice>
      {!data && loading ? (
        <Loading />
      ) : !data ? (
        <div className="panel">
          <Empty title="Your balances are unavailable">
            Try refreshing to reconnect to your workspace.
          </Empty>
        </div>
      ) : (
        <section className="balance-section" aria-label="Your leave balances">
          <BalanceCard type="casual" balance={data.balances.casual} />
          <BalanceCard type="sick" balance={data.balances.sick} />
          <div className="balance-aside">
            <span className="eyebrow">A QUICK REMINDER</span>
            <h3>
              Good plans start
              <br />
              with a little notice.
            </h3>
            <p>Give your team time to plan around your absence.</p>
            <span className="year-label">
              <span className="live-dot" />
              {new Date().getUTCFullYear()} leave allowance
            </span>
          </div>
        </section>
      )}
      <div className="employee-grid">
        <ApplyForm
          version={version}
          disabled={!data}
          onCreated={async () => {
            setMessage('Request sent. Your manager will take it from here.');
            await reload();
          }}
        />
        <section className="panel requests-panel" id="requests">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">KEEP TRACK</span>
              <h2>
                My requests{' '}
                <span className="count-pill">{data?.leaves.length ?? '—'}</span>
              </h2>
            </div>
            <span className="quiet-label">{pending} pending</span>
          </div>
          <div className="table-toolbar">
            <span>Your leave, at a glance.</span>
            <label className="sr-only" htmlFor="request-filter">
              Filter requests
            </label>
            <select
              id="request-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {loading && !data ? (
            <Loading text="Loading requests…" />
          ) : !data ? (
            <Empty title="Requests are unavailable">
              Refresh your workspace to try again.
            </Empty>
          ) : !leaves.length ? (
            <Empty
              title={
                filter === 'all'
                  ? 'A little time for yourself?'
                  : `No ${filter} requests`
              }
            >
              {filter === 'all'
                ? 'Your leave requests will appear here once you send your first one.'
                : 'Requests with this status will appear here.'}
            </Empty>
          ) : (
            <div className="table-scroll">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th scope="col">Leave & dates</th>
                    <th scope="col">Days</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <strong>{leaveLabels[leave.type]}</strong>
                        <span className="date-line">
                          {dateRange(leave.startDate, leave.endDate)}
                        </span>
                        <p className="request-reason">{leave.reason}</p>
                        {leave.managerComment && (
                          <p className="manager-comment">
                            Manager: {leave.managerComment}
                          </p>
                        )}
                      </td>
                      <td className="days-cell">
                        {leave.workingDays}
                        <small>working</small>
                      </td>
                      <td>
                        <Badge status={leave.status} />
                      </td>
                      <td>
                        {canCancel(leave) && (
                          <button
                            className="text-button"
                            onClick={() => setSelected(leave)}
                            aria-label={`Cancel ${leaveLabels[leave.type]} from ${leave.startDate}`}
                          >
                            Cancel
                          </button>
                        )}
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
              Pending requests reserve days. Your balance is deducted on
              approval.
            </span>
          </div>
        </section>
      </div>
      {selected && (
        <ConfirmDialog
          action="cancel"
          leave={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onConfirm={cancel}
        />
      )}
    </>
  );
}
