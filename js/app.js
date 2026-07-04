import * as store from './store.js';
import { AVATARS } from './avatars.js';

const view = document.getElementById('view');
const fab = document.getElementById('fab');
const backBtn = document.getElementById('back-btn');
const settingsBtn = document.getElementById('settings-btn');
const topbarTitle = document.getElementById('topbar-title');

// 画面の状態: { name: 'home'|'detail'|'form'|'settings', id?, filter? }
let screen = { name: 'home', filter: 'all' };

/* ---------- helpers ---------- */

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

const INITIAL_COLORS = ['#f2a0ae', '#a0c8f2', '#a8dcc3', '#e3c39a', '#c3aee6', '#f2c4a0'];

function avatarHtml(person, cls = 'avatar') {
  if (person.avatar) {
    return `<img class="${cls}" src="${esc(person.avatar)}" alt="">`;
  }
  const ch = (person.name || '?').trim().charAt(0) || '?';
  let hash = 0;
  for (const c of person.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const color = INITIAL_COLORS[hash % INITIAL_COLORS.length];
  return `<div class="avatar-initial" style="background:${color}">${esc(ch)}</div>`;
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

/* ---------- navigation ---------- */

function go(next) {
  screen = next;
  render();
  window.scrollTo(0, 0);
}

backBtn.addEventListener('click', () => {
  if (screen.name === 'form' && screen.id) go({ name: 'detail', id: screen.id });
  else go({ name: 'home', filter: screen.filter || 'all' });
});

settingsBtn.addEventListener('click', () => go({ name: 'settings', filter: screen.filter }));

fab.addEventListener('click', () => go({ name: 'form', id: null, filter: screen.filter }));

/* ---------- render ---------- */

function render() {
  const isHome = screen.name === 'home';
  backBtn.classList.toggle('hidden', isHome);
  settingsBtn.classList.toggle('hidden', !isHome);
  fab.classList.toggle('hidden', !isHome);

  if (screen.name === 'home') renderHome();
  else if (screen.name === 'detail') renderDetail();
  else if (screen.name === 'form') renderForm();
  else if (screen.name === 'settings') renderSettings();
}

/* ---------- home ---------- */

function renderHome() {
  topbarTitle.textContent = '恋ログ';
  const filter = screen.filter || 'all';
  const people = store.getPeople();
  const shown = filter === 'all' ? people : people.filter(p => p.status === filter);

  const chips = [
    `<button class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">すべて</button>`,
    ...store.STATUSES.map(s => {
      const n = people.filter(p => p.status === s.id).length;
      return `<button class="chip ${filter === s.id ? 'active' : ''}" data-filter="${s.id}">${s.label}${n ? ` ${n}` : ''}</button>`;
    }),
  ].join('');

  let body;
  if (people.length === 0) {
    body = `<div class="empty">
      <div class="heart">💌</div>
      <p>まだ誰も登録されていません。<br>右下の「＋」から最初のひとりを<br>登録してみましょう!</p>
    </div>`;
  } else if (shown.length === 0) {
    body = `<div class="empty"><p>この状態の相手はいません</p></div>`;
  } else {
    body = `<div class="card-list">` + shown.map(p => {
      const nd = p.nextDate && p.nextDate.date
        ? `<span class="next">📅 ${fmtDate(p.nextDate.date)} ${esc(p.nextDate.plan)}</span>` : '';
      const sub = [p.app, p.job].filter(Boolean).join('・');
      return `<button class="person-card" data-id="${p.id}">
        ${avatarHtml(p)}
        <span class="info">
          <span class="name-row"><span class="name">${esc(p.name) || '(名前なし)'}</span>
          ${p.age ? `<span class="age">${esc(p.age)}歳</span>` : ''}</span>
          ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
          ${p.rating ? `<span class="stars">${stars(p.rating)}</span>` : ''}
          ${nd}
        </span>
        <span class="badge ${p.status}">${store.statusLabel(p.status)}</span>
      </button>`;
    }).join('') + `</div>`;
  }

  view.innerHTML = `<div class="chips">${chips}</div>${body}`;

  view.querySelectorAll('.chip').forEach(c =>
    c.addEventListener('click', () => go({ name: 'home', filter: c.dataset.filter })));
  view.querySelectorAll('.person-card').forEach(c =>
    c.addEventListener('click', () => go({ name: 'detail', id: c.dataset.id, filter })));
}

/* ---------- detail ---------- */

function renderDetail() {
  const p = store.getPerson(screen.id);
  if (!p) { go({ name: 'home', filter: screen.filter }); return; }
  topbarTitle.textContent = p.name || '詳細';

  const profRows = [
    ['出会ったアプリ', p.app],
    ['職業', p.job],
    ['住まい', p.area],
    ['趣味', p.hobbies],
    ['メモ', p.memo],
  ].filter(([, v]) => v)
   .map(([k, v]) => `<div class="prof-row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`)
   .join('') || `<div class="prof-row"><span class="v" style="color:var(--ink-soft)">プロフィール未入力</span></div>`;

  const statusChips = store.STATUSES.map(s =>
    `<button class="chip ${p.status === s.id ? `s-on ${s.id}` : ''}" data-status="${s.id}">${s.label}</button>`
  ).join('');

  const starBtns = [1, 2, 3, 4, 5].map(n =>
    `<button data-star="${n}" class="${p.rating >= n ? 'on' : ''}">★</button>`).join('');

  const compat = (p.goodPoints || p.badPoints) ? `
    <div class="section compat">
      <h2>💘 相性メモ</h2>
      ${p.goodPoints ? `<div class="good"><span class="lbl">合うところ</span>${esc(p.goodPoints)}</div>` : ''}
      ${p.badPoints ? `<div class="bad"><span class="lbl">気になるところ</span>${esc(p.badPoints)}</div>` : ''}
    </div>` : '';

  const next = (p.nextDate && p.nextDate.date) ? `
    <div class="section">
      <h2>📅 次の予定</h2>
      <div class="next-box">${fmtDate(p.nextDate.date)}　${esc(p.nextDate.plan) || '(内容未定)'}</div>
    </div>` : '';

  const tlItems = p.timeline.map(t => `
    <li class="tl-item">
      <div class="tl-head">
        <span class="tl-date">${fmtDate(t.date)}</span>
        <span class="tl-type">${store.tlTypeLabel(t.type)}</span>
        <button class="tl-del" data-del-tl="${t.id}" aria-label="削除">✕</button>
      </div>
      <div class="tl-text">${esc(t.text)}</div>
    </li>`).join('') || `<p class="settings-desc">まだ記録がありません。会った日や話した内容をメモしておくと「この話したっけ?」が防げます。</p>`;

  const tlOptions = store.TL_TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');

  view.innerHTML = `
    <div class="detail-head">
      ${avatarHtml(p)}
      <div class="name">${esc(p.name) || '(名前なし)'}</div>
      <div class="meta">${[p.age ? p.age + '歳' : '', p.app].filter(Boolean).join('・')}</div>
      <div class="stars-edit">${starBtns}</div>
      <div class="status-picker">${statusChips}</div>
    </div>
    ${next}
    <div class="section"><h2>👤 プロフィール</h2>${profRows}</div>
    ${compat}
    <div class="section">
      <h2>📖 タイムライン</h2>
      <div class="tl-form">
        <div class="row1">
          <input type="date" id="tl-date" value="${today()}">
          <select id="tl-type">${tlOptions}</select>
        </div>
        <div class="row2">
          <textarea id="tl-text" placeholder="話した内容、行った場所、印象など"></textarea>
          <button class="tl-add" id="tl-add">記録</button>
        </div>
      </div>
      <ul class="tl-list">${tlItems}</ul>
    </div>
    <div class="detail-actions">
      <button class="btn btn-danger" id="del-btn">削除</button>
      <button class="btn btn-primary" id="edit-btn">編集する</button>
    </div>`;

  view.querySelectorAll('[data-status]').forEach(b =>
    b.addEventListener('click', () => {
      store.setStatus(p.id, b.dataset.status);
      renderDetail();
    }));

  view.querySelectorAll('[data-star]').forEach(b =>
    b.addEventListener('click', () => {
      const n = Number(b.dataset.star);
      store.setRating(p.id, p.rating === n ? 0 : n);
      renderDetail();
    }));

  document.getElementById('tl-add').addEventListener('click', () => {
    const text = document.getElementById('tl-text').value.trim();
    if (!text) { toast('内容を入力してください'); return; }
    store.addTimeline(p.id, {
      date: document.getElementById('tl-date').value || today(),
      type: document.getElementById('tl-type').value,
      text,
    });
    renderDetail();
    toast('記録しました');
  });

  view.querySelectorAll('[data-del-tl]').forEach(b =>
    b.addEventListener('click', () => {
      store.deleteTimeline(p.id, b.dataset.delTl);
      renderDetail();
    }));

  document.getElementById('edit-btn').addEventListener('click', () =>
    go({ name: 'form', id: p.id, filter: screen.filter }));

  document.getElementById('del-btn').addEventListener('click', () => {
    if (confirm(`「${p.name || '(名前なし)'}」を削除しますか?\nタイムラインの記録もすべて消えます。`)) {
      store.deletePerson(p.id);
      toast('削除しました');
      go({ name: 'home', filter: screen.filter });
    }
  });
}

/* ---------- form (add / edit) ---------- */

function renderForm() {
  const editing = !!screen.id;
  const p = editing ? store.getPerson(screen.id) : store.newPerson();
  if (!p) { go({ name: 'home' }); return; }
  topbarTitle.textContent = editing ? '編集' : '新しい相手を登録';

  let selectedAvatar = p.avatar;

  const avatarBtns = [
    `<button type="button" data-av=""><span class="no-avatar">なし</span></button>`,
    ...AVATARS.map(a => `<button type="button" data-av="${a}"><img src="${a}" alt="" loading="lazy"></button>`),
  ].join('');

  const statusOptions = store.STATUSES.map(s =>
    `<option value="${s.id}" ${p.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('');

  view.innerHTML = `
    <form class="form" id="person-form">
      <div class="section">
        <h2>🎨 アバター</h2>
        <div class="avatar-grid" id="avatar-grid">${avatarBtns}</div>
      </div>
      <div class="section">
        <h2>👤 基本情報</h2>
        <div class="form">
          <div class="field-row">
            <div class="field" style="flex:2"><label>名前(ニックネーム)*</label>
              <input type="text" id="f-name" value="${esc(p.name)}" required></div>
            <div class="field"><label>年齢</label>
              <input type="number" id="f-age" value="${p.age ?? ''}" min="18" max="99"></div>
          </div>
          <div class="field"><label>出会ったアプリ</label>
            <input type="text" id="f-app" value="${esc(p.app)}" placeholder="例: ペアーズ、タップル" list="app-list">
            <datalist id="app-list">
              <option value="ペアーズ"><option value="タップル"><option value="with">
              <option value="Omiai"><option value="Tinder"><option value="バチェラーデート">
            </datalist></div>
          <div class="field-row">
            <div class="field"><label>職業</label><input type="text" id="f-job" value="${esc(p.job)}"></div>
            <div class="field"><label>住まい</label><input type="text" id="f-area" value="${esc(p.area)}"></div>
          </div>
          <div class="field"><label>趣味</label><input type="text" id="f-hobbies" value="${esc(p.hobbies)}"></div>
          <div class="field"><label>ステータス</label><select id="f-status">${statusOptions}</select></div>
        </div>
      </div>
      <div class="section">
        <h2>💘 相性メモ</h2>
        <div class="form">
          <div class="field"><label>合うところ</label><textarea id="f-good">${esc(p.goodPoints)}</textarea></div>
          <div class="field"><label>気になるところ</label><textarea id="f-bad">${esc(p.badPoints)}</textarea></div>
          <div class="field"><label>フリーメモ</label><textarea id="f-memo">${esc(p.memo)}</textarea></div>
        </div>
      </div>
      <div class="section">
        <h2>📅 次の予定</h2>
        <div class="field-row">
          <div class="field"><label>日付</label><input type="date" id="f-nd-date" value="${esc(p.nextDate?.date || '')}"></div>
          <div class="field" style="flex:2"><label>内容</label><input type="text" id="f-nd-plan" value="${esc(p.nextDate?.plan || '')}" placeholder="例: 新宿でディナー"></div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary">${editing ? '保存する' : '登録する'}</button>
    </form>`;

  const grid = document.getElementById('avatar-grid');
  const markSel = () => grid.querySelectorAll('button').forEach(b =>
    b.classList.toggle('sel', b.dataset.av === selectedAvatar));
  markSel();
  grid.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { selectedAvatar = b.dataset.av; markSel(); }));

  document.getElementById('person-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('f-name').value.trim();
    if (!name) { toast('名前を入力してください'); return; }
    const ageVal = document.getElementById('f-age').value;
    Object.assign(p, {
      name,
      age: ageVal ? Number(ageVal) : null,
      app: document.getElementById('f-app').value.trim(),
      job: document.getElementById('f-job').value.trim(),
      area: document.getElementById('f-area').value.trim(),
      hobbies: document.getElementById('f-hobbies').value.trim(),
      status: document.getElementById('f-status').value,
      avatar: selectedAvatar,
      goodPoints: document.getElementById('f-good').value.trim(),
      badPoints: document.getElementById('f-bad').value.trim(),
      memo: document.getElementById('f-memo').value.trim(),
      nextDate: {
        date: document.getElementById('f-nd-date').value,
        plan: document.getElementById('f-nd-plan').value.trim(),
      },
    });
    store.upsertPerson(p);
    toast(editing ? '保存しました' : '登録しました');
    go({ name: 'detail', id: p.id, filter: screen.filter });
  });
}

/* ---------- settings ---------- */

function renderSettings() {
  topbarTitle.textContent = '設定';
  const count = store.getPeople().length;

  view.innerHTML = `
    <div class="section">
      <h2>🔒 データについて</h2>
      <p class="settings-desc">恋ログのデータはこのスマホ(ブラウザ)の中だけに保存されます。サーバーには一切送信されません。<br>現在の登録人数: <b>${count}人</b></p>
    </div>
    <div class="section">
      <h2>💾 バックアップ</h2>
      <p class="settings-desc">機種変更やブラウザの履歴削除でデータが消えることがあります。定期的にバックアップを保存しておくと安心です。</p>
      <div class="detail-actions" style="margin-top:8px">
        <button class="btn btn-primary" id="export-btn">保存する</button>
        <button class="btn btn-ghost" id="import-btn">復元する</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" class="hidden">
    </div>
    <div class="section">
      <h2>⚠️ 危険な操作</h2>
      <button class="btn btn-danger" id="wipe-btn" style="width:100%">全データを削除する</button>
    </div>
    <p class="settings-desc" style="text-align:center;margin-top:16px">恋ログ v1.0</p>`;

  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `koilog-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('バックアップを保存しました');
  });

  const fileInput = document.getElementById('import-file');
  document.getElementById('import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const n = store.importJson(await file.text());
      toast(`${n}人分のデータを復元しました`);
      go({ name: 'home', filter: 'all' });
    } catch (err) {
      toast('復元に失敗: ' + err.message);
    }
  });

  document.getElementById('wipe-btn').addEventListener('click', () => {
    if (confirm('本当に全データを削除しますか?') && confirm('この操作は元に戻せません。よろしいですか?')) {
      store.wipeAll();
      toast('全データを削除しました');
      go({ name: 'home', filter: 'all' });
    }
  });
}

/* ---------- start ---------- */
render();
