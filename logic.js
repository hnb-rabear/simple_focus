// Pure functions only: no chrome.* calls, so `node test.mjs` can test them.

export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function yesterday(d = new Date()) {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return localDate(y);
}

export function normalizeSite(input) {
  const s = String(input).trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split(/[/?#]/)[0]
    .split(':')[0]
    .replace(/^www\./, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null;
}

export function matchSite(hostname, sites) {
  const h = hostname.toLowerCase();
  let best = null;
  for (const s of sites) {
    if ((h === s || h.endsWith('.' + s)) && (!best || s.length > best.length)) best = s;
  }
  return best;
}

export function siteOf(url, items) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  return matchSite(u.hostname, Object.keys(items.limits || {}));
}

// Sites to charge this minute: every site open in any tab, each once. A locked screen counts nothing.
export function sitesToCount(items, idleState, urls) {
  if (idleState === 'locked') return [];
  return [...new Set(urls.map((u) => siteOf(u, items)).filter(Boolean))];
}

export const DELAY_MS = 60 * 60 * 1000; // raising or removing a limit waits one hour

// newMin = null means "remove the site". Returns the patch for chrome.storage.sync:
// lowering or adding applies now; raising or removing becomes a pending change.
export function requestChange(items, site, newMin, now) {
  const limits = { ...items.limits };
  const pending = { ...items.pending };
  const cur = limits[site];
  if (newMin != null && (cur == null || newMin <= cur)) {
    limits[site] = newMin;
    delete pending[site];
  } else {
    pending[site] = { min: newMin, at: now + DELAY_MS };
  }
  return { limits, pending };
}

// Applies pending changes whose time has come. Returns null when nothing is due.
export function applyDue(items, now) {
  const due = Object.entries(items.pending || {}).filter(([, p]) => p.at <= now);
  if (!due.length) return null;
  const limits = { ...items.limits };
  const pending = { ...items.pending };
  for (const [site, p] of due) {
    if (p.min == null) delete limits[site];
    else limits[site] = p.min;
    delete pending[site];
  }
  return { limits, pending };
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function usedToday(items, site, today) {
  let sum = 0;
  for (const [k, v] of Object.entries(items)) {
    if (k.startsWith('usage_') && v?.date === today) sum += v.s?.[site] || 0;
  }
  return sum;
}

export function isOverLimit(items, site, today) {
  const limit = items.limits?.[site];
  return limit != null && usedToday(items, site, today) >= limit * 60;
}

export function blockedSite(url, items, today) {
  const site = siteOf(url, items);
  return site && isOverLimit(items, site, today) ? site : null;
}

export function staleUsageKeys(items, yesterdayDate) {
  return Object.keys(items).filter(
    (k) => k.startsWith('usage_') && !(items[k]?.date >= yesterdayDate)
  );
}
