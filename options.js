import { normalizeSite, usedToday, localDate, sitesToCount, formatTime, requestChange } from './logic.js';

const $ = (id) => document.getElementById(id);
let items = {};
let leftCells = [];
let pendingClocks = [];

async function render() {
  items = await chrome.storage.sync.get(null);
  leftCells = [];
  pendingClocks = [];
  const rows = Object.entries(items.limits || {}).sort().map(([site, min]) => {
    const tr = document.createElement('tr');
    tr.insertCell().textContent = site;
    const minCell = tr.insertCell();
    minCell.textContent = min;
    const p = items.pending?.[site];
    if (p) {
      const note = document.createElement('div');
      note.className = 'pending';
      const clock = document.createElement('span');
      pendingClocks.push([p.at, clock]);
      note.append(`${p.min == null ? 'Removed' : 'To ' + p.min} `, clock, ' ');
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancel';
      cancel.onclick = () => save((it) => {
        const pending = { ...it.pending };
        delete pending[site];
        return { pending };
      });
      note.append(cancel);
      minCell.append(note);
    }
    leftCells.push([site, tr.insertCell()]);
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.onclick = () => {
      $('site').value = site;
      $('min').value = min;
      $('min').focus();
    };
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.onclick = () => save((it) => requestChange(it, site, null, Date.now()));
    tr.insertCell().append(edit, ' ', btn);
    return tr;
  });
  $('rows').replaceChildren(...rows);
  updateLeft();
}

// Usage is saved once per minute. Between saves, add the seconds since the last save
// for every site open right now, so the countdown moves every second.
async function updateLeft() {
  // The change applies on the first minute's check after its time, so 0:00 can last up to a minute.
  for (const [at, clock] of pendingClocks) {
    const sec = (at - Date.now()) / 1000;
    clock.textContent = sec > 0 ? 'in ' + formatTime(sec) : 'within a minute';
  }
  const { lastTick = Date.now() } = await chrome.storage.local.get('lastTick');
  const open = sitesToCount(items, 'active', (await chrome.tabs.query({})).map((t) => t.url));
  const live = Math.min(60, Math.max(0, Math.floor((Date.now() - lastTick) / 1000)));
  const today = localDate();
  for (const [site, cell] of leftCells) {
    const used = usedToday(items, site, today) + (open.includes(site) ? live : 0);
    cell.textContent = formatTime(items.limits[site] * 60 - used);
  }
}
setInterval(updateLeft, 1000);

$('add').onsubmit = async (e) => {
  e.preventDefault();
  const site = normalizeSite($('site').value);
  $('err').textContent = site ? '' : 'Enter a site like youtube.com';
  if (!site) return;
  const min = Math.max(0, Math.floor(Number($('min').value) || 0));
  if (await save((it) => requestChange(it, site, min, Date.now()))) $('site').value = '';
};

// Re-reads storage first, because another PC may have changed it.
async function save(makePatch) {
  try {
    await chrome.storage.sync.set(makePatch(await chrome.storage.sync.get(['limits', 'pending'])));
    return true;
  } catch (err) {
    $('err').textContent = 'Could not save: ' + err.message;
    return false;
  }
}

chrome.storage.onChanged.addListener((_, area) => area === 'sync' && render());
render();
