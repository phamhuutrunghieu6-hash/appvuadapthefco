/* =====================================================
   VuaDapTheFCO — script.js
   ===================================================== */

'use strict';

/* ── Constants ─────────────────────────────────── */
const ADMIN_TG_LINK  = 'https://t.me/Vuadapthesieudz';
const ADMIN_TG_USER  = '@Vuadapthesieudz';
const COUNTER_NS     = 'vuadapthefco-web';        // CounterAPI namespace
const COUNTER_KEY    = 'visits';

/* Default bots — will be overridden by bots.json or localStorage */
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

/* Card style pool — cycles for each bot */
const CARD_STYLES = [
  { cls: 'bcard-dark  span-2c2r bcard-feat', btn: 'u-white',   bar: ''          },
  { cls: 'bcard-tg',                          btn: 'u-white',   bar: 'bar-blue'  },
  { cls: '',                                  btn: 'u-dark',    bar: 'bar-gold'  },
  { cls: 'bcard-violet',                      btn: 'u-white',   bar: ''          },
  { cls: '',                                  btn: 'u-gold',    bar: 'bar-green' },
  { cls: 'bcard-green span-2c',               btn: 'u-white',   bar: ''          },
  { cls: '',                                  btn: 'u-dark',    bar: 'bar-violet'},
  { cls: 'bcard-gold',                        btn: 'u-white',   bar: ''          },
];

/* ── Data Loading ────────────────────────────────── */
async function loadBots() {
  /* 1. Try localStorage override (set by admin panel) */
  const lsData = localStorage.getItem('vuadapthefco_bots');
  if (lsData) {
    try { return JSON.parse(lsData); } catch(e) {}
  }
  /* 2. Try fetching bots.json from repo */
  try {
    const res = await fetch('./bots.json?v=' + Date.now());
    if (res.ok) return await res.json();
  } catch(e) {}
  /* 3. Fallback */
  return DEFAULT_BOTS;
}

/* ── Bento Grid Renderer ─────────────────────────── */
function buildBotCard(bot, styleIndex) {
  const s = CARD_STYLES[styleIndex % CARD_STYLES.length];
  const isFeatured = styleIndex === 0;

  const card = document.createElement('div');
  card.className = `bcard reveal ${s.cls}`;
  card.setAttribute('data-index', styleIndex);

  const barHtml  = s.bar ? `<div class="card-bar ${s.bar}"></div>` : '';

  card.innerHTML = `
    ${barHtml}
    <div>
      <div class="bcard-emoji">${bot.emoji || '🤖'}</div>
      <div class="bcard-name">${escHtml(bot.name)}</div>
      ${bot.desc ? `<div class="bcard-desc">${escHtml(bot.desc)}</div>` : ''}
      ${bot.username ? `<div class="bcard-user">${escHtml(bot.username)}</div>` : ''}
    </div>
    <a href="${escHtml(bot.link)}" target="_blank" rel="noopener" class="btn-use ${s.btn}">
      ${isFeatured ? '🚀 Dùng Ngay' : 'Dùng Ngay →'}
    </a>
  `;
  return card;
}

function buildStatCard(count) {
  const card = document.createElement('div');
  card.className = 'bcard bcard-stat reveal';
  card.innerHTML = `
    <div>
      <div class="bstat-num" id="gridVisCount">${count !== null ? fmtNum(count) : '—'}</div>
      <div class="bstat-lbl">Lượt truy cập</div>
    </div>
    <div class="bstat-tag">📊 Real-time counter</div>
  `;
  return card;
}

function buildAdminCard() {
  const adminLink = localStorage.getItem('vuadapthefco_admin_link') || ADMIN_TG_LINK;
  const adminUser = localStorage.getItem('vuadapthefco_admin_user') || ADMIN_TG_USER;
  const card = document.createElement('div');
  card.className = 'bcard bcard-tg reveal';
  card.innerHTML = `
    <div>
      <div class="bcard-emoji">✈️</div>
      <div class="bcard-name">Admin</div>
      <div class="bcard-user" style="color:rgba(255,255,255,.6)">${escHtml(adminUser)}</div>
    </div>
    <a href="${escHtml(adminLink)}" target="_blank" rel="noopener" class="btn-use u-white">
      Nhắn Tin →
    </a>
  `;
  return card;
}

async function renderBentoGrid() {
  const grid = document.getElementById('bentoGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const bots = await loadBots();

  /* Update bot count in hero */
  const botCountEl = document.getElementById('botCount');
  if (botCountEl) botCountEl.textContent = bots.length;

  /* Render bot cards */
  bots.forEach((bot, i) => {
    grid.appendChild(buildBotCard(bot, i));
  });

  /* Static extra cards: visitor stat + admin contact */
  grid.appendChild(buildStatCard(null));
  grid.appendChild(buildAdminCard());

  /* Activate reveal observer on new cards */
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* ── Visitor Counter ─────────────────────────────── */
async function fetchAndShowVisitorCount() {
  let count = null;
  try {
    /* CounterAPI.dev – increments on each page load */
    const r = await fetch(
      `https://api.counterapi.dev/v1/${COUNTER_NS}/${COUNTER_KEY}/up`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const d = await r.json();
      count = d.count ?? d.value ?? d.hits ?? null;
    }
  } catch(e) { /* network error / timeout */ }

  /* Fallback: local session counter (not shared across devices) */
  if (count === null) {
    const stored = parseInt(localStorage.getItem('_vcnt') || '0', 10) + 1;
    localStorage.setItem('_vcnt', stored);
    count = stored;
  }

  /* Animate hero number */
  const heroEl = document.getElementById('visitorCount');
  if (heroEl) animateNumber(heroEl, count);

  /* Update bento stat card once rendered */
  setTimeout(() => {
    const gridEl = document.getElementById('gridVisCount');
    if (gridEl) {
      gridEl.textContent = fmtNum(count);
    }
  }, 600);
}

/* ── Number Animations ───────────────────────────── */
function animateNumber(el, target) {
  const dur = 1400;
  const step = target / (dur / 16);
  let cur = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = fmtNum(Math.floor(cur));
    if (cur >= target) clearInterval(t);
  }, 16);
}

function fmtNum(n) {
  return Number(n).toLocaleString('vi-VN');
}

/* ── Escape HTML ─────────────────────────────────── */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ── Navbar ──────────────────────────────────────── */
(function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const ham      = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  /* Scroll: add glass class */
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveLink();
  }, { passive: true });

  /* Hamburger toggle */
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  /* Close on link click */
  navLinks.addEventListener('click', e => {
    if (e.target.classList.contains('nav-link')) {
      ham.classList.remove('open');
      navLinks.classList.remove('open');
    }
  });

  /* Active link on scroll */
  function updateActiveLink() {
    const sections = [
      { id:'home',    linkId:'nl-home'    },
      { id:'bots',    linkId:'nl-bots'    },
      { id:'guide',   linkId:'nl-guide'   },
      { id:'contact', linkId:'nl-contact' },
    ];
    const scrollY = window.scrollY + 120;
    let active = 'nl-home';
    sections.forEach(({ id, linkId }) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) active = linkId;
    });
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const aEl = document.getElementById(active);
    if (aEl) aEl.classList.add('active');
  }
  updateActiveLink();
})();

/* ── Smooth Scroll for all hash links ───────────── */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior:'smooth', block:'start' });
  }
});

/* ── Reveal Observer ─────────────────────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

/* ── Date in stat card ───────────────────────────── */
(function setDate() {
  const el = document.getElementById('sfcDate');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('vi-VN', {
    day:'2-digit', month:'2-digit', year:'numeric'
  });
})();

/* ── Admin contact card updater ──────────────────── */
(function updateAdminContact() {
  const adminLink = localStorage.getItem('vuadapthefco_admin_link') || ADMIN_TG_LINK;
  const adminUser = localStorage.getItem('vuadapthefco_admin_user') || ADMIN_TG_USER;
  const linkEl    = document.getElementById('adminContactLink');
  const userEl    = document.getElementById('adminUsernameDisplay');
  if (linkEl) linkEl.href = adminLink;
  if (userEl) userEl.textContent = adminUser;
})();

/* ── Init ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Observe static .reveal elements */
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* Render grid (async) then fire counter */
  await renderBentoGrid();
  fetchAndShowVisitorCount();
});
