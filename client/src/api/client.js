const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let token = sessionStorage.getItem('fieldwork.token');

export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem('fieldwork.token', value);
  else sessionStorage.removeItem('fieldwork.token');
}

export function hasToken() {
  return Boolean(token);
}

export async function api(path, { body, ...options } = {}) {
  const sentToken = token;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(sentToken && { Authorization: `Bearer ${sentToken}` }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== '/auth/login' &&
      sentToken === token
    ) {
      setToken(null);
      window.dispatchEvent(new Event('fieldwork:expired'));
    }
    const error = new Error(
      data.error?.message ||
        'The request could not be completed. Please try again.',
    );
    error.fields = data.error?.fields;
    error.code = data.error?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export function messageFor(error) {
  return error instanceof TypeError
    ? 'Could not reach the server. Check your connection and try again.'
    : error.message;
}
