export const leaveLabels = { casual: 'Casual leave', sick: 'Sick leave' };
export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name) =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
export function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}
export function dateRange(start, end) {
  return start === end
    ? formatDate(start, { year: 'numeric' })
    : `${formatDate(start)} – ${formatDate(end, { year: 'numeric' })}`;
}
export const canCancel = (leave) =>
  leave.status === 'pending' ||
  (leave.status === 'approved' && leave.startDate > today());
