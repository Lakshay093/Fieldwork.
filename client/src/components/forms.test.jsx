// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { api } from '../api/client.js';
import { ApplyForm } from './ApplyForm.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';

vi.mock('../api/client.js', () => ({
  api: vi.fn(),
  messageFor: (error) => error.message,
}));
const summary = {
  workingDays: 3,
  weekendDaysSkipped: 2,
  holidaysSkipped: 0,
  availableBalance: 12,
  balanceAfter: 9,
  blockingError: null,
};
function fillForm() {
  fireEvent.change(screen.getByLabelText('From'), {
    target: { value: '2027-09-06' },
  });
  fireEvent.change(screen.getByLabelText('To'), {
    target: { value: '2027-09-08' },
  });
  fireEvent.change(screen.getByLabelText(/Reason/), {
    target: { value: 'Visiting my family.' },
  });
}
beforeEach(() => {
  api.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

it('requires a current, valid preview and a trimmed reason before sending', async () => {
  api.mockResolvedValue(summary);
  render(<ApplyForm onCreated={vi.fn()} />);
  const submit = screen.getByRole('button', { name: 'Send request' });
  expect(submit).toBeDisabled();
  fillForm();
  await screen.findByText('3 working days · balance after: 9');
  expect(screen.getByText('2 weekend days skipped')).toBeInTheDocument();
  expect(submit).toBeEnabled();
  fireEvent.change(screen.getByLabelText(/Reason/), {
    target: { value: '    ' },
  });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('To'), {
    target: { value: '2027-09-09' },
  });
  expect(screen.getByText('Checking dates and balance…')).toBeInTheDocument();
  expect(submit).toBeDisabled();
});

it('ignores stale previews after dates change', async () => {
  let resolveFirst, resolveSecond;
  api
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
  render(<ApplyForm onCreated={vi.fn()} />);
  fillForm();
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('To'), {
    target: { value: '2027-09-09' },
  });
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  resolveSecond({ ...summary, workingDays: 4, balanceAfter: 8 });
  await screen.findByText('4 working days · balance after: 8');
  resolveFirst(summary);
  expect(
    screen.queryByText('3 working days · balance after: 9'),
  ).not.toBeInTheDocument();
});

it('blocks conflicts and exposes a dismissible network error with retry', async () => {
  api
    .mockRejectedValueOnce(new Error('Connection unavailable.'))
    .mockResolvedValue({
      ...summary,
      blockingError: { message: 'This overlaps an existing request.' },
    });
  render(<ApplyForm onCreated={vi.fn()} />);
  fillForm();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Connection unavailable.',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Dismiss message' }),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Check dates again' }),
  );
  await screen.findByText('This overlaps an existing request.');
  expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
});

it('disables inputs during submission and sends only once on a double click', async () => {
  let finish;
  api.mockImplementation((path, options) =>
    options?.method === 'POST'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(summary),
  );
  const onCreated = vi.fn();
  render(<ApplyForm onCreated={onCreated} />);
  fillForm();
  await screen.findByText('3 working days · balance after: 9');
  await userEvent.dblClick(
    screen.getByRole('button', { name: 'Send request' }),
  );
  expect(
    screen.getByRole('button', { name: 'Sending request…' }),
  ).toBeDisabled();
  expect(screen.getByLabelText('From')).toBeDisabled();
  expect(
    api.mock.calls.filter(([, options]) => options?.method === 'POST'),
  ).toHaveLength(1);
  finish({ leave: { id: 'saved' } });
  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('From')).toHaveValue('');
});

it('requires a nonblank rejection comment in an accessible dialog', async () => {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      action="reject"
      leave={{
        type: 'casual',
        startDate: '2027-09-06',
        endDate: '2027-09-08',
        workingDays: 3,
      }}
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />,
  );
  expect(
    screen.getByRole('dialog', { name: 'Reject request?' }),
  ).toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: 'Reject request' });
  expect(confirm).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/Comment/), '  ');
  expect(confirm).toBeDisabled();
  await userEvent.type(
    screen.getByLabelText(/Comment/),
    'Please arrange cover.',
  );
  await userEvent.click(confirm);
  expect(onConfirm).toHaveBeenCalledWith('Please arrange cover.');
});
