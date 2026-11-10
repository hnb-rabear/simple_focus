import { localDate, yesterday, sitesToCount, blockedSite, staleUsageKeys, applyDue } from './logic.js';

const BLOCKED_URL = chrome.runtime.getURL('blocked.html');

// Alarms may be cleared on browser restart, so make sure the alarm exists
// every time the worker starts. Do not re-create it, because that would reset its timer.
// lastTick starts with the alarm, so the popup countdown moves before the first tick.
chrome.alarms.get('tick').then((a) => a || Promise.all([
  chrome.alarms.create('tick', { periodInMinutes: 1 }),
  chrome.storage.local.set({ lastTick: Date.now() }),
]));
// lastTick (local only) lets the popup add the seconds since the last save to its countdown.
chrome.alarms.onAlarm.addListener((a) => a.name === 'tick' &&
  tick().finally(() => chrome.storage.local.set({ lastTick: Date.now() })));

async function deviceId() {
  let { deviceId } = await chrome.storage.local.get('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId });
  }
  return deviceId;
}

// ponytail: sampled once per minute; switching sites mid-minute can be off by up to 1 min.
async function tick() {
  const urls = (await chrome.tabs.query({})).map((t) => t.url);
  const items = await chrome.storage.sync.get(null);
  // Any PC applies due changes; two PCs doing it at once write the same result.
  const due = applyDue(items, Date.now());
  if (due) {
    await chrome.storage.sync.set(due).catch(console.warn);
    Object.assign(items, due);
  }
  const sites = sitesToCount(items, await chrome.idle.queryState(60), urls);
  if (!sites.length) return;

  const key = 'usage_' + (await deviceId());
  const today = localDate();
  let mine = items[key];
  if (mine?.date !== today) {
    mine = { date: today, s: {} };
    const stale = staleUsageKeys(items, yesterday());
    if (stale.length) await chrome.storage.sync.remove(stale).catch(console.warn);
  }
  for (const site of sites) mine.s[site] = (mine.s[site] || 0) + 60;
  try {
    await chrome.storage.sync.set({ [key]: mine });
  } catch (e) {
    console.warn('usage write failed, retry next tick', e); // quota: skip this tick
  }
}

// Any synced change (from this PC or another) can push a site over its limit.
async function enforceAll() {
  const items = await chrome.storage.sync.get(null);
  const today = localDate();
  for (const tab of await chrome.tabs.query({})) {
    if (tab.url && blockedSite(tab.url, items, today)) chrome.tabs.update(tab.id, { url: BLOCKED_URL });
  }
}
chrome.storage.onChanged.addListener((_, area) => area === 'sync' && enforceAll());

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (!info.url) return;
  const items = await chrome.storage.sync.get(null);
  if (blockedSite(info.url, items, localDate())) chrome.tabs.update(tabId, { url: BLOCKED_URL });
});
