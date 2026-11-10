import assert from 'node:assert/strict';
import { localDate, yesterday, normalizeSite, matchSite, siteOf, sitesToCount, requestChange, applyDue, DELAY_MS, formatTime, usedToday, isOverLimit, blockedSite, staleUsageKeys } from './logic.js';

// local dates (Date(y, m, d) is local time, so this works in any time zone)
assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
assert.equal(yesterday(new Date(2026, 2, 1, 0, 0, 30)), '2026-02-28');

// site input
assert.equal(normalizeSite(' https://www.YouTube.com/watch?v=1 '), 'youtube.com');
assert.equal(normalizeSite('m.youtube.com:443'), 'm.youtube.com');
assert.equal(normalizeSite('youtube'), null);
assert.equal(normalizeSite(''), null);

// matching
assert.equal(matchSite('m.youtube.com', ['youtube.com']), 'youtube.com');
assert.equal(matchSite('notyoutube.com', ['youtube.com']), null);
assert.equal(matchSite('a.b.com', ['b.com', 'a.b.com']), 'a.b.com');

const items = {
  limits: { 'youtube.com': 30, 'x.com': 0 },
  usage_A: { date: '2026-11-10', s: { 'youtube.com': 1200 } },
  usage_B: { date: '2026-11-10', s: { 'youtube.com': 600 } },
  usage_C: { date: '2026-11-09', s: { 'youtube.com': 9999 } },
  usage_D: { date: '2026-11-08', s: {} },
};
assert.equal(siteOf('https://m.youtube.com/watch', items), 'youtube.com');
assert.equal(siteOf('chrome://extensions', items), null);
assert.equal(siteOf('not a url', items), null);

// what counts this minute
const yt = 'https://www.youtube.com/watch?v=1';
const x = 'https://x.com/home';
assert.deepEqual(sitesToCount(items, 'active', [x, yt]), ['x.com', 'youtube.com']); // every open tab counts
assert.deepEqual(sitesToCount(items, 'idle', [yt]), ['youtube.com']); // idle still counts
assert.deepEqual(sitesToCount(items, 'active', [yt, 'https://m.youtube.com/']), ['youtube.com']); // same site counted once
assert.deepEqual(sitesToCount(items, 'locked', [x, yt]), []); // locked screen counts nothing
assert.deepEqual(sitesToCount(items, 'active', ['https://google.com/', undefined]), []); // no limit or no URL, no count

// lowering and adding apply now; raising and removing wait one hour
const lim = { limits: { 'a.com': 30 }, pending: { 'a.com': { min: 60, at: 5 } } };
assert.deepEqual(requestChange(lim, 'a.com', 10, 0), { limits: { 'a.com': 10 }, pending: {} }); // lower: now, drops pending
assert.deepEqual(requestChange(lim, 'b.com', 99, 0).limits['b.com'], 99); // new site: now
assert.deepEqual(requestChange(lim, 'a.com', 45, 0), { limits: { 'a.com': 30 }, pending: { 'a.com': { min: 45, at: DELAY_MS } } }); // raise: waits
assert.deepEqual(requestChange(lim, 'a.com', null, 0).pending['a.com'], { min: null, at: DELAY_MS }); // remove: waits
assert.equal(requestChange(lim, 'a.com', 45, 0).limits['a.com'], 30); // old limit kept while waiting

assert.equal(applyDue(lim, 4), null); // not due yet
assert.deepEqual(applyDue(lim, 5), { limits: { 'a.com': 60 }, pending: {} });
assert.deepEqual(applyDue({ limits: { 'a.com': 30 }, pending: { 'a.com': { min: null, at: 1 } } }, 1), { limits: {}, pending: {} });
assert.equal(applyDue({ limits: {} }, 1), null); // no pending key at all

// countdown text
assert.equal(formatTime(125), '2:05');
assert.equal(formatTime(5400), '90:00');
assert.equal(formatTime(-5), '0:00');

// sum across devices, old dates ignored
assert.equal(usedToday(items, 'youtube.com', '2026-11-10'), 1800);
assert.equal(isOverLimit(items, 'youtube.com', '2026-11-10'), true);
assert.equal(isOverLimit(items, 'youtube.com', '2026-11-11'), false);
assert.equal(isOverLimit(items, 'x.com', '2026-11-10'), true); // limit 0 = always blocked
assert.equal(isOverLimit(items, 'google.com', '2026-11-10'), false);

assert.equal(blockedSite('https://m.youtube.com/x', items, '2026-11-10'), 'youtube.com');
assert.equal(blockedSite('https://google.com/', items, '2026-11-10'), null);

// cleanup keeps today and yesterday
assert.deepEqual(staleUsageKeys(items, '2026-11-09'), ['usage_D']);

console.log('all tests passed');
