import { useEffect, useRef, useState } from 'react';
import { api, messageFor } from '../api/client.js';
import { today } from '../utils.js';
import { Icon } from './Icon.jsx';
import { Notice } from './Feedback.jsx';

const initial = { type: 'casual', startDate: '', endDate: '', reason: '' };

export function ApplyForm({ onCreated, version = 0, disabled = false }) {
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const inFlight = useRef(false);
  const key = `${form.type}:${form.startDate}:${form.endDate}:${version}:${retry}`;
  useEffect(() => {
    if (!form.startDate || !form.endDate) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          type: form.type,
          start: form.startDate,
          end: form.endDate,
        });
        const result = await api(`/leaves/preview?${query}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setPreview({ key, result });
      } catch (error) {
        if (!controller.signal.aborted)
          setPreview({ key, error: messageFor(error) });
      }
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.type, form.startDate, form.endDate, key]);
  const current = preview?.key === key ? preview : null;
  const ready = Boolean(
    current?.result &&
    !current.result.blockingError &&
    form.reason.trim().length >= 5 &&
    form.reason.trim().length <= 500 &&
    !disabled,
  );
  function change(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFields((previous) => ({ ...previous, [name]: null }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api('/leaves', { method: 'POST', body: form });
      setForm(initial);
      setPreview(null);
      await onCreated();
    } catch (error) {
      setError(messageFor(error));
      setFields(error.fields || {});
      setRetry((value) => value + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const fieldError = (name) =>
    fields[name] && (
      <small id={`${name}-error`} className="field-error">
        {fields[name].join(' ')}
      </small>
    );
  return (
    <section className="panel apply-panel" id="new-request">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PLAN A LITTLE TIME AWAY</span>
          <h2>New request</h2>
        </div>
        <span className="panel-icon">
          <Icon name="plus" />
        </span>
      </div>
      <form onSubmit={submit}>
        <Notice onDismiss={() => setError('')}>{error}</Notice>
        <fieldset disabled={busy || disabled}>
          <div className="field">
            <label htmlFor="leave-type">Leave type</label>
            <select
              id="leave-type"
              name="type"
              value={form.type}
              onChange={change}
              aria-invalid={Boolean(fields.type)}
              aria-describedby={fields.type ? 'type-error' : undefined}
            >
              <option value="casual">Casual leave</option>
              <option value="sick">Sick leave</option>
            </select>
            {fieldError('type')}
          </div>
          <div className="date-fields">
            <div className="field">
              <label htmlFor="start-date">From</label>
              <input
                id="start-date"
                name="startDate"
                type="date"
                min={today()}
                required
                value={form.startDate}
                onChange={change}
                aria-invalid={Boolean(fields.startDate)}
                aria-describedby={
                  fields.startDate ? 'startDate-error' : undefined
                }
              />
              {fieldError('startDate')}
            </div>
            <div className="field">
              <label htmlFor="end-date">To</label>
              <input
                id="end-date"
                name="endDate"
                type="date"
                min={form.startDate || today()}
                required
                value={form.endDate}
                onChange={change}
                aria-invalid={Boolean(fields.endDate)}
                aria-describedby={fields.endDate ? 'endDate-error' : undefined}
              />
              {fieldError('endDate')}
            </div>
          </div>
          <div className="field">
            <label htmlFor="reason">
              Reason <span>5–500 characters</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              rows="3"
              maxLength="500"
              required
              value={form.reason}
              onChange={change}
              aria-invalid={Boolean(fields.reason)}
              aria-describedby="reason-count"
            />
            {fieldError('reason')}
            <small className="character-count" id="reason-count">
              {form.reason.length} / 500
            </small>
          </div>
        </fieldset>
        <div
          className={`preview-box ${current?.error || current?.result?.blockingError ? 'preview-blocked' : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {!form.startDate || !form.endDate ? (
            <>
              <Icon name="calendar" />
              <span>
                Choose your dates to see a day-by-day balance preview.
              </span>
            </>
          ) : !current ? (
            <>
              <span className="spinner" />
              <span>Checking dates and balance…</span>
            </>
          ) : current.error ? (
            <Notice
              onDismiss={() =>
                setPreview((previous) => ({ ...previous, dismissed: true }))
              }
            >
              {!current.dismissed && current.error}
            </Notice>
          ) : current.result.blockingError ? (
            <>
              <Icon name="info" />
              <span>{current.result.blockingError.message}</span>
            </>
          ) : (
            <>
              <Icon name="check" />
              <div>
                <strong>
                  {current.result.workingDays} working day
                  {current.result.workingDays === 1 ? '' : 's'} · balance after:{' '}
                  {current.result.balanceAfter}
                </strong>
                <small>
                  {current.result.weekendDaysSkipped > 0
                    ? `${current.result.weekendDaysSkipped} weekend days skipped`
                    : 'No weekend days in this range'}
                  {current.result.holidaysSkipped > 0
                    ? ` · ${current.result.holidaysSkipped} public holiday skipped`
                    : ''}
                </small>
              </div>
            </>
          )}
        </div>
        {current?.error && (
          <button
            type="button"
            className="text-button preview-retry"
            onClick={() => setRetry((value) => value + 1)}
          >
            Check dates again
          </button>
        )}
        <button
          className="button primary submit-request"
          disabled={!ready || busy}
        >
          {busy ? 'Sending request…' : 'Send request'}
          <Icon name="arrow" />
        </button>
        <p className="form-footnote">
          <Icon name="info" size={14} />
          Your manager will review your request.
        </p>
      </form>
    </section>
  );
}
