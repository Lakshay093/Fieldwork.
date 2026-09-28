// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { api, hasToken, setToken } from './client.js';

afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});
it('stores the session token and logs out on an authenticated 401', async () => {
  setToken('session-token');
  expect(sessionStorage.getItem('fieldwork.token')).toBe('session-token');
  const expired = vi.fn();
  window.addEventListener('fieldwork:expired', expired, { once: true });
  const fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({
      error: { code: 'SESSION_EXPIRED', message: 'Please sign in again.' },
    }),
  });
  vi.stubGlobal('fetch', fetch);
  await expect(api('/leaves/mine')).rejects.toMatchObject({ status: 401 });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer session-token',
  );
  expect(hasToken()).toBe(false);
  expect(sessionStorage.getItem('fieldwork.token')).toBeNull();
  expect(expired).toHaveBeenCalledTimes(1);
});
it('retains a valid session when a login attempt fails', async () => {
  setToken('session-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid credentials.' } }),
    }),
  );
  await expect(
    api('/auth/login', { method: 'POST', body: {} }),
  ).rejects.toThrow('Invalid credentials.');
  expect(hasToken()).toBe(true);
});
