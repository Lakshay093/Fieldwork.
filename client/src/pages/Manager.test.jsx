// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { api } from '../api/client.js';
import { Manager } from './Manager.jsx';

vi.mock('../api/auth.jsx', () => ({
  useAuth: () => ({ user: { name: 'Meera Kapoor', role: 'manager' } }),
}));
vi.mock('../api/client.js', () => ({
  api: vi.fn(),
  messageFor: (error) => error.message,
}));
afterEach(cleanup);
it('refreshes the queue and shows a plain message when a decision loses a race', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  let changed = false;
  const leave = {
    id: 'request-1',
    employeeId: 'employee-1',
    type: 'casual',
    startDate: '2027-09-06',
    endDate: '2027-09-08',
    workingDays: 3,
    status: 'pending',
    reason: 'Family celebration.',
    createdAt: '2027-09-01T12:00:00Z',
    employee: { name: 'Aisha Khan', balances: { casual: 12 } },
  };
  api.mockImplementation(async (path) => {
    if (path.includes('/approve')) {
      changed = true;
      throw Object.assign(
        new Error(
          'This request is no longer pending. Refresh to see its current status.',
        ),
        { status: 409 },
      );
    }
    if (path === '/leaves/pending') return { leaves: changed ? [] : [leave] };
    return { leaves: [] };
  });
  render(<Manager />);
  await userEvent.click(
    await screen.findByRole('button', {
      name: 'Approve request from Aisha Khan',
    }),
  );
  const dialog = screen.getByRole('dialog');
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Approve request' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('no longer pending'),
  );
  expect(await screen.findByText('You’re all caught up.')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Approve request from Aisha Khan' }),
  ).not.toBeInTheDocument();
  expect(
    api.mock.calls.filter(([path]) => path === '/leaves/pending'),
  ).toHaveLength(2);
});
