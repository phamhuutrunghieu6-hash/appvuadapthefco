/* vdtfco-secure-panel-x7k2m9.js — VuaDapTheFCO Admin Panel */
'use strict';

const ADMIN_PW_KEY    = 'vuadapthefco_admin_pw';
const BOTS_KEY        = 'vuadapthefco_bots';
const ADMIN_LINK_KEY  = 'vuadapthefco_admin_link';
const ADMIN_USER_KEY  = 'vuadapthefco_admin_user';

const DEFAULT_PW   = 'trunghieu08';
const DEFAULT_BOTS = [
  {
    id: 1,
    name:     'Bot FCO VIP',
    username: '@dapthefcovip_bot',
    link:     'https://t.me/dapthefcovip_bot',
    desc:     'Bot Telegram chính thức của VuaDapTheFCO. Hỗ trợ đầy đủ tính năng, cập nhật liên tục.',
    emoji:    '🤖',
    featured: true,
    type:     'telegram'
  }
];

/* ── Helpers ───────────────────────────────── */
function getPassword() {
  return localStorage.getItem(ADMIN_PW_KEY) || DEFAULT_PW;
}
function getBots() {
  try {
    const s = localStorage.getItem(BOTS_KEY);
    return s ? JSON.parse(s) : [...DEFAULT_BOTS];
  } catch(e) { return [...DEFAULT_BOTS]; }
}
function saveBots(bots) {
  localStorage.setItem(BOTS_KEY, JSON.stringify(bots));
}
function genId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (isError) el.style.background = '#ef4444';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function normLink(val) {
  val = val.trim();
  if (val.startsWith('@')) return 'https://t.me/' + val.slice(1);
  if (!val.startsWith('http')) return 'https://' + val;
  return val;
}

/* ── Lock / Auth ────────────────────────────── */
const lockScreen = document.getElementById('lockScreen');
const dashboard  = document.getElementById('dashboard');
const lockForm   = document.getElementById('lockForm');
const pwInput    = document.getElementById('pwInput');
const pwError    = document.getElementById('pwError');

lockForm.addEventListener('submit', e => {
  e.preventDefault();
  if (pwInput.value === getPassword()) {
    lockScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    initDashboard();
  } else {
    pwError.textContent = '❌ Sai mật khẩu. Thử lại!';
    pwInput.value = '';
    pwInput.focus();
    setTimeout(() => { pwError.textContent = ''; }, 3000);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  dashboard.classList.add('hidden');
  lockScreen.classList.remove('hidden');
  pwInput.value = '';
  pwInput.focus();
});

/* ── Dashboard Init ─────────────────────────── */
function initDashboard() {
  renderBotList();
  loadSettings();
  resetForm();
}

/* ── Bot List ───────────────────────────────── */
function renderBotList() {
  const bots = getBots();
  const listEl = document.getElementById('botList');
  const countEl = document.getElementById('botCountBadge');
  countEl.textContent = `${bots.length} bot`;
  listEl.innerHTML = '';

  if (bots.length === 0) {
    listEl.innerHTML = '<p style="text-align:center;color:#9ca3af;font-size:13px;padding:20px">Chưa có bot nào. Thêm bot đầu tiên!</p>';
    return;
  }

  bots.forEach(bot => {
    const row = document.createElement('div');
    row.className = 'bot-row';
    row.innerHTML = `
      <div class="br-emoji">${escHtml(bot.emoji || '🤖')}</div>
      <div class="br-info">
        <div class="br-name">${escHtml(bot.name)}</div>
        <div class="br-user">${escHtml(bot.username || bot.link)}</div>
      </div>
      ${bot.featured ? '<span class="br-badge">⭐ Nổi bật</span>' : ''}
      <div class="br-actions">
        <button class="btn-edit" title="Sửa" data-id="${bot.id}">✏️</button>
        <button class="btn-del"  title="Xóa" data-id="${bot.id}">🗑️</button>
      </div>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editBot(Number(btn.dataset.id)));
  });
  listEl.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteBot(Number(btn.dataset.id)));
  });
}

/* ── Form Logic ─────────────────────────────── */
let editingId = null;

function resetForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Thêm Bot Mới';
  document.getElementById('editId').value   = '';
  document.getElementById('fName').value    = '';
  document.getElementById('fLink').value    = '';
  document.getElementById('fDesc').value    = '';
  document.getElementById('fEmoji').value   = '🤖';
  document.getElementById('fUsername').value= '';
  document.getElementById('fFeatured').checked = false;
  document.getElementById('saveBtn').textContent = '💾 Lưu Bot';
}

function editBot(id) {
  const bot = getBots().find(b => b.id === id);
  if (!bot) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Chỉnh Sửa Bot';
  document.getElementById('editId').value    = id;
  document.getElementById('fName').value     = bot.name;
  document.getElementById('fLink').value     = bot.link;
  document.getElementById('fDesc').value     = bot.desc || '';
  document.getElementById('fEmoji').value    = bot.emoji || '🤖';
  document.getElementById('fUsername').value = bot.username || '';
  document.getElementById('fFeatured').checked = !!bot.featured;
  document.getElementById('saveBtn').textContent = '✅ Cập Nhật Bot';
  document.getElementById('fName').focus();
  document.querySelector('.panel-form').scrollIntoView({ behavior:'smooth', block:'start' });
}

function deleteBot(id) {
  if (!confirm('Bạn chắc chắn muốn xóa bot này?')) return;
  const bots = getBots().filter(b => b.id !== id);
  saveBots(bots);
  renderBotList();
  toast('🗑️ Đã xóa bot');
}

document.getElementById('botForm').addEventListener('submit', e => {
  e.preventDefault();
  const bots = getBots();
  const name     = document.getElementById('fName').value.trim();
  const linkRaw  = document.getElementById('fLink').value.trim();
  const desc     = document.getElementById('fDesc').value.trim();
  const emoji    = document.getElementById('fEmoji').value.trim() || '🤖';
  const username = document.getElementById('fUsername').value.trim();
  const featured = document.getElementById('fFeatured').checked;
  const link     = normLink(linkRaw);

  if (!name || !linkRaw) {
    toast('❌ Vui lòng điền tên và link bot!', true); return;
  }

  if (editingId) {
    const idx = bots.findIndex(b => b.id === editingId);
    if (idx >= 0) {
      bots[idx] = { ...bots[idx], name, link, desc, emoji, username, featured };
    }
    toast('✅ Đã cập nhật bot!');
  } else {
    bots.push({ id:genId(), name, link, desc, emoji, username, featured, type:'telegram' });
    toast('✅ Đã thêm bot mới!');
  }

  saveBots(bots);
  renderBotList();
  resetForm();
});

document.getElementById('addNewBtn').addEventListener('click', () => {
  resetForm();
  document.getElementById('fName').focus();
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  resetForm();
});

/* ── Settings ───────────────────────────────── */
function loadSettings() {
  const adminLink = localStorage.getItem(ADMIN_LINK_KEY) || 'https://t.me/Vuadapthesieudz';
  const adminUser = localStorage.getItem(ADMIN_USER_KEY) || '@Vuadapthesieudz';
  document.getElementById('sAdminLink').value = adminLink;
  document.getElementById('sAdminUser').value = adminUser;
}

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const link = document.getElementById('sAdminLink').value.trim();
  const user = document.getElementById('sAdminUser').value.trim();
  if (!link) { toast('❌ Nhập link Telegram Admin!', true); return; }
  localStorage.setItem(ADMIN_LINK_KEY, normLink(link));
  localStorage.setItem(ADMIN_USER_KEY, user || link);
  toast('✅ Đã lưu cài đặt!');
});

document.getElementById('savePwBtn').addEventListener('click', () => {
  const newPw = document.getElementById('sNewPw').value.trim();
  if (newPw.length < 6) { toast('❌ Mật khẩu phải ít nhất 6 ký tự!', true); return; }
  localStorage.setItem(ADMIN_PW_KEY, newPw);
  document.getElementById('sNewPw').value = '';
  toast('🔑 Đã đổi mật khẩu thành công!');
});

/* ── Export JSON ────────────────────────────── */
document.getElementById('exportBtn').addEventListener('click', () => {
  const bots = getBots();
  const json = JSON.stringify(bots, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    const el = document.getElementById('exportSuccess');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
    toast('📋 Đã copy bots.json!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = json; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('📋 Đã copy bots.json!');
  });
});
