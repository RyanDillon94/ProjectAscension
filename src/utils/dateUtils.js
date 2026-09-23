export function getCurrentDate() {
  const testDate = localStorage.getItem('p35_test_date');
  return testDate ? new Date(testDate) : new Date();
}

export function getCurrentDateString() {
  const d = getCurrentDate();
  return d.toISOString().split('T')[0];
}

export function getDeloadOffset() {
  const stored = localStorage.getItem('p35_deload_offset');
  return stored ? parseInt(stored, 10) : 0;
}

export function toggleDeloadWeek() {
  const current = getDeloadOffset();
  const next = current === 0 ? 7 : 0;
  localStorage.setItem('p35_deload_offset', next.toString());
  window.location.reload();
}

export function todayKey(now = getCurrentDate()) {
  return now.toISOString().slice(0, 10);
}

export function lastSundayKey(now = getCurrentDate()) {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 0 : day;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}