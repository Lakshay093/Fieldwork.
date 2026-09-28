import { Icon } from './Icon.jsx';
import { leaveLabels } from '../utils.js';

export function BalanceCard({ type, balance }) {
  return (
    <article className="balance-card">
      <div className="balance-top">
        <span>
          <Icon name={type === 'casual' ? 'calendar' : 'plus'} />
          {leaveLabels[type]}
        </span>
        <span className="allowance-tag">{balance.total} day allowance</span>
      </div>
      <div className="balance-amount">
        <strong>{balance.available}</strong>
        <span>days available</span>
      </div>
      <div
        className="balance-track"
        role="img"
        aria-label={`${balance.used} used, ${balance.pending} pending, ${balance.available} available`}
      >
        <span
          className="track-used"
          style={{
            width: `${balance.total ? (balance.used / balance.total) * 100 : 0}%`,
          }}
        />
        <span
          className="track-pending"
          style={{
            width: `${balance.total ? (balance.pending / balance.total) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="balance-legend">
        <span>
          <i className="legend-used" />
          {balance.used} used
        </span>
        <span>
          <i className="legend-pending" />
          {balance.pending} pending
        </span>
        <span>{balance.total} total</span>
      </div>
    </article>
  );
}
