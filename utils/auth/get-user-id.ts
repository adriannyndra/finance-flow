export function getUserId() {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; user_session=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}
