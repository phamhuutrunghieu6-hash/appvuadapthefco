/*  FCO Auto Upgrade PRO V3.0 - Telegram Mini App
    AI Engine: Tail-3 Admin Match + Galaxy UI V3 + Bot Broadcast  */

(function () {
    'use strict';

    // ==================== CONFIG ====================
    const CONFIG = {
        ADMIN_IDS: ['7324360114'],
        API_URL: 'api.php',
        BASE_RATES: { 4: 40, 5: 35, 6: 30, 7: 20, 8: 10 },
        MAX_RATE: 85,
        MIN_RATE: 3,
        ADMIN_TG: 'https://t.me/Vuadapthesieudz',    // ← Đổi username admin
        SHOP_BOT: 'https://t.me/endyyshop_bot'   // ← Đổi username bot shop
    };

    // ==================== STATE ====================
    const state = {
        currentLevel: 5,
        adminEditLevel: 4,
        userId: null,
        isAdmin: false,
        sequences: {},
        announcements: [],
        isMaintenance: false,
        currentRate: 0,
        theme: localStorage.getItem('fco_theme') || 'dark',
        accessType: null,
        keyInfo: null,
        keyFilter: 'all',
        prevStatus: ''
    };

    // ==================== INIT ====================
    function init() {
        applyTheme(state.theme);
        initTelegram();
        initSpaceCanvas();
        initMeteors();
        bindEvents();
        loadSettings();
        loadAnnouncements();
        loadSequences(state.currentLevel);
        checkUserAccess();
        renderContactCard();
    }

    function initTelegram() {
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                var user = tg.initDataUnsafe && tg.initDataUnsafe.user;
                if (user) {
                    state.userId = String(user.id);
                    state.userName = user.first_name || '';
                    state.userUsername = user.username || '';
                }
                if (tg.colorScheme === 'light') {
                    state.theme = 'light';
                    applyTheme('light');
                }
            }
        } catch (e) {
            console.log('Not in Telegram environment');
        }
        // Fallback userId khi không trong Telegram (dev/testing)
        if (!state.userId) {
            state.userId = 'guest_' + (localStorage.getItem('fco_guest_id') || Math.random().toString(36).substr(2, 8));
            localStorage.setItem('fco_guest_id', state.userId.replace('guest_', ''));
        }
        renderUserInfo();
        checkAdmin();
    }

    function checkAdmin() {
        state.isAdmin = CONFIG.ADMIN_IDS.includes(state.userId);
        // Tự động hiện tab Admin nếu là admin
        if (state.isAdmin) {
            var adminNav = document.getElementById('navAdmin');
            if (adminNav) adminNav.classList.remove('hidden');
        }
    }

    // ==================== THEME ====================
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        state.theme = theme;
        localStorage.setItem('fco_theme', theme);
    }

    // ==================== EVENTS ====================
    function bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', function () {
            applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        });

        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = this.getAttribute('data-tab');
                switchTab(tab);
            });
        });

        // Level buttons (main)
        document.getElementById('levelButtons').addEventListener('click', function (e) {
            var btn = e.target.closest('.level-btn');
            if (!btn) return;
            document.querySelectorAll('#levelButtons .level-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.currentLevel = parseInt(btn.getAttribute('data-level'));
            loadSequences(state.currentLevel);
            recalculateRate();
        });

        // Sequence input
        var seqInput = document.getElementById('sequenceInput');
        seqInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            recalculateRate();
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', function () {
            document.getElementById('sequenceInput').value = '';
            recalculateRate();
        });

        // Admin level tabs
        document.getElementById('adminLevelTabs').addEventListener('click', function (e) {
            var btn = e.target.closest('.admin-level-btn');
            if (!btn) return;
            document.querySelectorAll('.admin-level-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.adminEditLevel = parseInt(btn.getAttribute('data-admin-level'));
            loadAdminSequences();
        });

        // Save sequences
        document.getElementById('saveSequences').addEventListener('click', saveSequences);

        // Maintenance toggle
        document.getElementById('maintenanceToggle').addEventListener('change', toggleMaintenance);

        // Add announcement
        document.getElementById('addAnnouncement').addEventListener('click', addAnnouncement);

        // Key modal
        document.getElementById('activateKeyBtn').addEventListener('click', handleActivateKey);
        document.getElementById('keyInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleActivateKey();
        });

        // Open key modal manually (badge click)
        document.getElementById('accessBadge').addEventListener('click', function () {
            if (state.accessType !== 'admin' && state.accessType !== 'key') {
                switchTab('tabKey');
            }
        });
        var keyModalCloseBtn = document.getElementById('keyModalClose');
        if (keyModalCloseBtn) {
            keyModalCloseBtn.addEventListener('click', function () {
                hideKeyModal();
            });
        }
        // Close modal on backdrop click
        var keyModalBackdrop = document.getElementById('keyModalBackdrop');
        if (keyModalBackdrop) {
            keyModalBackdrop.addEventListener('click', function () {
                hideKeyModal();
            });
        }

        // Key Tab: activate key
        document.getElementById('keyTabActivateBtn').addEventListener('click', handleKeyTabActivate);
        document.getElementById('keyTabInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleKeyTabActivate();
        });

        // Admin key management
        document.getElementById('generateKeysBtn').addEventListener('click', handleGenerateKeys);
        document.querySelectorAll('.key-filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.key-filter-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.keyFilter = this.getAttribute('data-filter');
                renderKeyList(state._lastKeyData);
            });
        });

        // Secret Admin Access: long-press on version badge (3 seconds)
        initSecretAdminAccess();

        // Admin Quick Actions
        var qcopyEl = document.getElementById('quickCopyKeys');
        if (qcopyEl) qcopyEl.addEventListener('click', handleCopyUnusedKeys);

        var qclearEl = document.getElementById('quickClearLogs');
        if (qclearEl) qclearEl.addEventListener('click', function () {
            if (!confirm('Xóa toàn bộ nhật ký Admin?')) return;
            fetch(CONFIG.API_URL + '?action=clear_admin_logs', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: state.userId })
            }).then(function (r) { return r.json(); }).then(function (d) {
                if (d.success) { showToast('🗑️ Đã xóa logs', 'success'); loadAdminLogs(); }
                else showToast(d.error || 'Lỗi', 'error');
            }).catch(function () { showToast('Lỗi kết nối', 'error'); });
        });

        var qrefreshEl = document.getElementById('quickRefresh');
        if (qrefreshEl) qrefreshEl.addEventListener('click', function () {
            loadAdminKeys();
            loadAdminUsers();
            loadAdminStats();
            loadAdminLogs();
            showToast('🔄 Đã refresh dữ liệu', 'success');
        });

        // Admin Broadcast
        var bcastTargetEl = document.getElementById('broadcastTarget');
        if (bcastTargetEl) bcastTargetEl.addEventListener('change', function() {
            var row = document.getElementById('broadcastUserIdRow');
            if (row) {
                if (this.value === 'single') row.classList.remove('hidden');
                else row.classList.add('hidden');
            }
        });

        var bcastBtn = document.getElementById('sendBroadcastBtn');
        if (bcastBtn) bcastBtn.addEventListener('click', handleSendBroadcast);
    }

    // ==================== SECRET ADMIN ACCESS ====================
    function initSecretAdminAccess() {
        var versionBadge = document.querySelector('.app-version');
        if (!versionBadge) return;
        var _longPressTimer = null;
        var _pressCount = 0;
        var _pressResetTimer = null;

        // Method 1: Long press (3s) on version badge
        versionBadge.addEventListener('mousedown', startLongPress);
        versionBadge.addEventListener('touchstart', function (e) { e.preventDefault(); startLongPress(); }, { passive: false });
        versionBadge.addEventListener('mouseup', cancelLongPress);
        versionBadge.addEventListener('mouseleave', cancelLongPress);
        versionBadge.addEventListener('touchend', cancelLongPress);
        versionBadge.addEventListener('touchcancel', cancelLongPress);

        function startLongPress() {
            cancelLongPress();
            versionBadge.classList.add('pressing');
            _longPressTimer = setTimeout(function () {
                versionBadge.classList.remove('pressing');
                if (state.isAdmin) {
                    showToast('🔓 Admin Panel mở', 'success');
                    switchTab('tabAdmin');
                    // Show admin nav temporarily
                    var adminNav = document.getElementById('navAdmin');
                    if (adminNav) adminNav.classList.remove('hidden');
                } else {
                    showToast('⛔ Bạn không có quyền Admin', 'error');
                }
            }, 3000);
        }

        function cancelLongPress() {
            if (_longPressTimer) {
                clearTimeout(_longPressTimer);
                _longPressTimer = null;
            }
            versionBadge.classList.remove('pressing');
        }

        // Method 2: Tap 5 times quickly on title
        var appTitle = document.querySelector('.app-title');
        if (appTitle) {
            appTitle.addEventListener('click', function () {
                _pressCount++;
                clearTimeout(_pressResetTimer);
                _pressResetTimer = setTimeout(function () { _pressCount = 0; }, 2000);
                if (_pressCount >= 5) {
                    _pressCount = 0;
                    if (state.isAdmin) {
                        showToast('🔓 Admin Panel mở', 'success');
                        switchTab('tabAdmin');
                        var adminNav = document.getElementById('navAdmin');
                        if (adminNav) adminNav.classList.remove('hidden');
                    } else {
                        showToast('⛔ Không có quyền truy cập', 'error');
                    }
                }
            });
        }
    }

    function switchTab(tabId) {
        // Admin luôn được phép truy cập mọi tab
        if (state.isAdmin) {
            // Admin bypass all restrictions
        } else if (tabId === 'tabMain' && state.accessType !== 'key' && state.accessType !== 'admin') {
            // Chặn user chưa có key vào tab Main Tool
            showToast('🔒 Bạn cần kích hoạt Key để sử dụng công cụ', 'error');
            switchTab('tabKey');
            return;
        }
        document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
        document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
        var pane = document.getElementById(tabId);
        if (pane) pane.classList.add('active');
        var navBtn = document.querySelector('.nav-btn[data-tab="' + tabId + '"]');
        if (navBtn) navBtn.classList.add('active');
        if (tabId === 'tabAdmin') {
            loadAdminSequences();
            renderAdminAnnouncements();
            loadAdminKeys();
            loadAdminUsers();
            loadAdminStats();
            loadAdminLogs();
        }
        if (tabId === 'tabInfo') {
            renderAnnouncements();
        }
    }

    // ==================== AI MATCHING ENGINE ====================
    function parseSequence(seqStr) {
        var parts = seqStr.trim().split('=');
        var root = parts[0].split('').map(Number);
        var continuations = parts.slice(1).map(Number);
        return { root: root, continuations: continuations, raw: seqStr };
    }

    // ========== ENGINE V3.0: Dây mồi admin + Phân tích 3 số cuối ==========
    // Bỏ hoàn toàn đỏ/đen (bệt/bủng/trùng số)
    // Thay bằng: khớp 3 số cuối user với dây admin + công thức additive từ 2.0

    function calculateRate(userDigits) {
        var level = state.currentLevel;
        var seqs = state.sequences[level];

        if (!userDigits || userDigits.length === 0) return { rate: 0, status: 'idle', matches: [], patterns: [], bestPattern: null, confidence: { level: 0, label: '' } };
        if (!seqs || seqs.length === 0) return { rate: 8, status: 'nodata', matches: [], patterns: [], bestPattern: null, confidence: { level: 0, label: '' } };

        var len = userDigits.length;

        // === PHASE 1: Tìm dây admin khớp nhất (head / tail / partial) ===
        var bestScore = 0;
        var bestSeq = null;
        var bestMatchDetails = [];

        for (var s = 0; s < seqs.length; s++) {
            var parsed = parseSequence(seqs[s]);
            var root = parsed.root;
            var conts = parsed.continuations;
            var rootLen = root.length;
            var score = 0;
            var details = [];

            // Head match
            var headScore = 0;
            var headDetails = [];
            var headMatched = 0;
            for (var i = 0; i < Math.min(len, rootLen); i++) {
                var ud = userDigits[i];
                var rd = root[i];
                if (ud === rd) {
                    headMatched++;
                    headScore += 2 + (i * 1.5);
                    headDetails.push('match');
                } else if (Math.abs(ud - rd) <= 1) {
                    headScore += 1 + (i * 0.5);
                    headDetails.push('near');
                } else {
                    headScore += 0.3;
                    headDetails.push('miss');
                }
            }
            if (headMatched === rootLen && len >= rootLen) headScore += 8;
            if (len > rootLen && headMatched === rootLen && conts.length > 0) {
                for (var j = rootLen; j < len; j++) {
                    var contIdx = (j - rootLen) % conts.length;
                    var expected = conts[contIdx];
                    if (userDigits[j] === expected) { headScore += 4 + ((j - rootLen) * 1); headDetails.push('match'); }
                    else if (Math.abs(userDigits[j] - expected) <= 1) { headScore += 1.5; headDetails.push('near'); }
                    else { headScore += 0.2; headDetails.push('miss'); }
                }
            }
            while (headDetails.length < len) headDetails.push('neutral');

            // Tail match
            var tailScore = 0;
            var tailDetails = [];
            if (len > rootLen) {
                var tailStart = len - rootLen;
                var tailMatched = 0;
                for (var t = 0; t < rootLen; t++) {
                    if (userDigits[tailStart + t] === root[t]) { tailMatched++; tailScore += 2 + (t * 1.5); }
                    else if (Math.abs(userDigits[tailStart + t] - root[t]) <= 1) { tailScore += 0.8; }
                }
                if (tailMatched === rootLen) tailScore += 10;
                for (var td = 0; td < tailStart; td++) tailDetails.push('neutral');
                for (var t2 = 0; t2 < rootLen; t2++) {
                    if (userDigits[tailStart + t2] === root[t2]) tailDetails.push('match');
                    else if (Math.abs(userDigits[tailStart + t2] - root[t2]) <= 1) tailDetails.push('near');
                    else tailDetails.push('miss');
                }
            }

            // Partial tail
            var partialTailScore = 0;
            for (var pl = 1; pl <= Math.min(len, rootLen - 1); pl++) {
                var partialStart = len - pl;
                var pMatched = 0;
                for (var p = 0; p < pl; p++) { if (userDigits[partialStart + p] === root[p]) pMatched++; }
                if (pMatched === pl) partialTailScore = Math.max(partialTailScore, pl * 3);
            }

            if (tailScore > headScore) { score = tailScore + partialTailScore * 0.3; details = tailDetails.slice(); }
            else { score = headScore + partialTailScore * 0.3; details = headDetails.slice(); }

            if (score > bestScore) { bestScore = score; bestSeq = parsed; bestMatchDetails = details.slice(); }
        }

        // === PHASE 2: Phân tích 3 số cuối khớp dây admin (THAY THẾ ĐỎ/ĐEN) ===
        // Chỉ tail3 ảnh hưởng tỉ lệ, soi cầu bệt chỉ hiển thị UI
        var tail3Result = AIEngine.analyzeTail3Match(userDigits, seqs);
        var tail3Score  = tail3Result.score;

        // === PHASE 3: Công thức ADDITIVE từ 2.0 (uy tín hơn composite) ===
        // finalRate = startRate + lengthBonus + adminMatchScore + tail3Score + noise
        var startRate   = 5;
        var lengthBonus = Math.min(len * 1.2, 15);
        var noise       = AIEngine.smartNoise(bestScore / 40, len, tail3Result.matchCount);

        var finalRate = startRate + lengthBonus + (bestScore * 0.8) + tail3Score + noise;

        // Cộng hưởng: khớp đầu dây admin + khớp 3 số cuối cùng lúc
        if (bestScore > 20 && tail3Result.matched) {
            finalRate = finalRate * 1.12;
        }

        finalRate = Math.max(CONFIG.MIN_RATE, Math.min(CONFIG.MAX_RATE, finalRate));
        finalRate = Math.round(finalRate * 10) / 10;

        // Status
        var status = 'verylow';
        if (finalRate >= 70) status = 'high';
        else if (finalRate >= 45) status = 'medium';
        else if (finalRate >= 25) status = 'low';

        // (patterns đã bỏ — không hiện phân tích kỹ thuật ra UI)

        var confLevel = tail3Result.matchCount >= 2 ? 4
                      : (tail3Result.matched ? 3
                      : (bestScore > 15 ? 2 : 1));
        var confLabels = ['', '⚠️ Tham khảo', '⚡ Khá tin cậy', '✅ Tin cậy', '🔥 Rất tin cậy'];

        return {
            rate:       finalRate,
            status:     status,
            matches:    bestMatchDetails,
            confidence: { level: confLevel, label: confLabels[confLevel] }
        };
    }

    function recalculateRate() {
        var input = document.getElementById('sequenceInput').value;
        var userDigits = input.split('').map(Number);
        var result = calculateRate(userDigits);

        state.currentRate = result.rate;
        updateGauge(result.rate);
        updateDigitDisplay(userDigits, result.matches);
        updateRateStatus(result);
        updateRollSuggestion(result.rate, result.status);
    }

    // ==================== RENDER USER INFO ====================
    function renderUserInfo() {
        var greetingEl = document.getElementById('userGreeting');
        var avatarEl = document.getElementById('userAvatar');
        var nameEl = document.getElementById('userDisplayName');
        if (!greetingEl || !avatarEl) return;

        var name = state.userName || state.userUsername || '';
        if (!name) return; // guest - ẩn

        var initial = name.charAt(0).toUpperCase();
        avatarEl.textContent = initial;
        if (nameEl) nameEl.textContent = name.length > 10 ? name.substr(0, 10) + '…' : name;
        greetingEl.classList.remove('hidden');

        // Greeting toast
        setTimeout(function () {
            showToast('👋 Xin chào, ' + name + '!', 'info');
        }, 900);
    }

    // ==================== RENDER CONTACT CARD ====================
    function renderContactCard() {
        var btnContainer = document.getElementById('contactButtons');
        if (!btnContainer) return;
        btnContainer.innerHTML =
            '<a href="' + CONFIG.ADMIN_TG + '" target="_blank" class="contact-btn">' +
            '<span class="contact-icon">👤</span>' +
            '<div class="contact-info">' +
            '<span class="contact-label">Admin hỗ trợ</span>' +
            '<span class="contact-sub">Nhắn trực tiếp qua Telegram</span>' +
            '</div>' +
            '<span class="contact-arrow">→</span>' +
            '</a>' +
            '<a href="' + CONFIG.SHOP_BOT + '" target="_blank" class="contact-btn shop-btn">' +
            '<span class="contact-icon">🤖</span>' +
            '<div class="contact-info">' +
            '<span class="contact-label">Bot Shop</span>' +
            '<span class="contact-sub">Mua Key tự động 24/7</span>' +
            '</div>' +
            '<span class="contact-arrow">→</span>' +
            '</a>';
    }

    // ==================== CELEBRATION ====================
    function triggerCelebration() {
        var rateCard = document.querySelector('.rate-card');
        if (rateCard) {
            rateCard.classList.remove('celebrating');
            void rateCard.offsetWidth; // reflow
            rateCard.classList.add('celebrating');
            setTimeout(function () { rateCard.classList.remove('celebrating'); }, 1400);
        }
        // Sparks
        var container = document.querySelector('.gauge-container');
        if (!container) return;
        var dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]];
        dirs.forEach(function (d, i) {
            setTimeout(function () {
                var spark = document.createElement('div');
                spark.className = 'celebrate-spark';
                spark.style.left = (30 + Math.random() * 40) + '%';
                spark.style.top = (25 + Math.random() * 50) + '%';
                spark.style.setProperty('--sx', (d[0] * (15 + Math.random() * 20)) + 'px');
                spark.style.setProperty('--sy', (d[1] * (15 + Math.random() * 20)) + 'px');
                container.appendChild(spark);
                setTimeout(function () { spark.remove(); }, 1000);
            }, i * 80);
        });
    }

    // ==================== UI UPDATES ====================
    function updateGauge(rate) {
        var circumference = 2 * Math.PI * 80;
        var offset = circumference - (rate / 100) * circumference;
        var circle = document.getElementById('gaugeCircle');
        var glow   = document.getElementById('gaugeGlow');
        if (circle) circle.style.strokeDashoffset = offset;
        if (glow)   glow.style.strokeDashoffset   = offset;

        var rateEl = document.getElementById('rateValue');
        if (rateEl) animateNumber(rateEl, rate);
    }

    function animateNumber(el, target) {
        if (isNaN(target)) target = 0;
        var current = parseFloat(el.textContent) || 0;
        if (isNaN(current)) current = 0;
        var diff = target - current;
        var steps = 15;
        var step = 0;
        function tick() {
            step++;
            var progress = step / steps;
            var eased = 1 - Math.pow(1 - progress, 3);
            var val = Math.round((current + diff * eased) * 10) / 10;
            el.textContent = isNaN(val) ? '0' : val;
            if (step < steps) requestAnimationFrame(tick);
        }
        tick();
    }

    function updateDigitDisplay(digits, matches) {
        var container = document.getElementById('digitDisplay');
        container.innerHTML = '';
        for (var i = 0; i < digits.length; i++) {
            var chip = document.createElement('span');
            chip.className = 'digit-chip ' + (matches[i] || 'neutral');
            if (i === digits.length - 1 && digits.length > 0) chip.classList.add('latest');
            chip.textContent = digits[i];
            chip.style.animationDelay = (i * 0.04) + 's';
            container.appendChild(chip);
        }
    }

    function updateRateStatus(result) {
        var el = document.getElementById('rateStatus');
        var confBadge = document.getElementById('confidenceBadge');
        el.className = 'rate-status';
        if (confBadge) { confBadge.classList.add('hidden'); confBadge.className = 'confidence-badge hidden'; confBadge.textContent = ''; }

        if (result.status === 'idle') {
            el.innerHTML = '<span class="status-idle">✨ Nhập dây mồi để bắt đầu phân tích</span>';
        } else if (result.status === 'nodata') {
            el.innerHTML = '⚠️ Chưa có dây mồi cho mức +' + state.currentLevel + '<br><small>Liên hệ Admin để cập nhật.</small>';
            el.classList.add('warning');
        } else {
            if (result.status === 'high') {
                el.innerHTML = '🔥 <strong>Tỉ lệ CAO!</strong><br><small>Dây mồi đang rất đẹp — có thể cân nhắc vào kèo!</small>';
                el.classList.add('good');
                if (state.prevStatus !== 'high') triggerCelebration();
            } else if (result.status === 'medium') {
                el.innerHTML = '⚡ <strong>Khá ổn định</strong><br><small>Dây đang ổn, theo dõi thêm vài số nữa.</small>';
                el.classList.add('warning');
            } else if (result.status === 'low') {
                el.innerHTML = '📉 <strong>Cần mồi thêm</strong><br><small>Tỉ lệ chưa đủ cao, tiếp tục mồi thêm nhé.</small>';
                el.classList.add('danger');
            } else {
                el.innerHTML = '⏳ <strong>Chưa đẹp</strong><br><small>Dây chưa vào form, tiếp tục chờ mồi thêm.</small>';
                el.classList.add('danger');
            }
            state.prevStatus = result.status;
            if (confBadge && result.confidence && result.confidence.label) {
                confBadge.textContent = result.confidence.label;
                confBadge.className = 'confidence-badge level-' + result.confidence.level;
                confBadge.classList.remove('hidden');
            }
        }
    }

    function updateRollSuggestion(rate, status) {
        var rollEl = document.getElementById('rollSuggestion');
        var adviceEl = document.getElementById('rollAdvice');

        if (rate <= 0 || status === 'idle') {
            rollEl.textContent = '--';
            adviceEl.textContent = '';
            return;
        }

        var rolls = Math.max(1, Math.ceil((100 - rate) / rate * 2.5));
        rolls = Math.min(rolls, 50);
        rollEl.textContent = rolls;

        if (rate >= 75) {
            adviceEl.textContent = '✅ Tỉ lệ tốt! Nên thử ' + rolls + ' roll, khả năng thành công cao.';
        } else if (rate >= 50) {
            adviceEl.textContent = '⚡ Có thể thử ' + rolls + ' roll. Theo dõi thêm để tối ưu.';
        } else {
            adviceEl.textContent = '⏳ Chưa nên vào kèo. Tiếp tục mồi thêm để tăng tỉ lệ.';
        }
    }

    // ==================== API ====================
    function apiCall(action, data, callback) {
        var url = CONFIG.API_URL + '?action=' + action;
        var opts = { method: 'GET', headers: { 'Content-Type': 'application/json' } };

        if (data && action.indexOf('get_') === 0) {
            for (var key in data) { url += '&' + key + '=' + encodeURIComponent(data[key]); }
        } else if (data) {
            opts.method = 'POST';
            opts.body = JSON.stringify(Object.assign({ admin_id: state.userId }, data));
        }

        fetch(url, opts)
            .then(function (r) { return r.json(); })
            .then(function (d) { if (callback) callback(null, d); })
            .catch(function (e) {
                console.error('API Error:', e);
                var handled = handleOffline(action, data, callback);
                if (!handled && callback) callback(e, null);
            });
    }

    function handleOffline(action, data, callback) {
        if (action === 'get_sequences') {
            var stored = localStorage.getItem('fco_sequences');
            if (stored) {
                var seqs = JSON.parse(stored);
                if (callback) callback(null, { success: true, data: seqs });
                return true;
            }
        }
        return false;
    }

    // ==================== LOAD DATA ====================
    function loadSettings() {
        fetch(CONFIG.API_URL + '?action=get_settings')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    state.isMaintenance = d.data.maintenance || false;
                    if (d.data.admin_ids) CONFIG.ADMIN_IDS = d.data.admin_ids;
                    checkAdmin();
                    checkMaintenance();
                    if (state.isAdmin) {
                        document.getElementById('maintenanceToggle').checked = state.isMaintenance;
                        document.getElementById('maintenanceStatus').textContent =
                            state.isMaintenance ? '🔴 Đang bật' : 'Đang tắt';
                    }
                }
            })
            .catch(function () { checkMaintenance(); });
    }

    function checkMaintenance() {
        var overlay = document.getElementById('maintenanceOverlay');
        if (state.isMaintenance && !state.isAdmin) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    function loadSequences(level) {
        fetch(CONFIG.API_URL + '?action=get_sequences&level=' + level)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    state.sequences[level] = d.data;
                    localStorage.setItem('fco_seq_' + level, JSON.stringify(d.data));
                }
            })
            .catch(function () {
                var cached = localStorage.getItem('fco_seq_' + level);
                if (cached) state.sequences[level] = JSON.parse(cached);
            });
    }

    function loadAnnouncements() {
        fetch(CONFIG.API_URL + '?action=get_announcements')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    state.announcements = d.data;
                    renderAnnouncements();
                }
            })
            .catch(function () {
                renderAnnouncements();
            });
    }

    function renderAnnouncements() {
        var container = document.getElementById('announcementList');
        if (!state.announcements || state.announcements.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có thông báo nào</div>';
            return;
        }
        container.innerHTML = '';
        state.announcements.forEach(function (ann) {
            var item = document.createElement('div');
            item.className = 'announcement-item';
            item.innerHTML = '<div class="ann-date">' + (ann.date || '') + '</div>' +
                '<div class="ann-text">' + escapeHtml(ann.text) + '</div>';
            container.appendChild(item);
        });
    }

    // ==================== ADMIN FUNCTIONS ====================
    function loadAdminSequences() {
        var level = state.adminEditLevel;
        var textarea = document.getElementById('adminSequences');
        fetch(CONFIG.API_URL + '?action=get_sequences&level=' + level)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    textarea.value = d.data.join('\n');
                } else {
                    textarea.value = '';
                }
            })
            .catch(function () {
                var cached = localStorage.getItem('fco_seq_' + level);
                textarea.value = cached ? JSON.parse(cached).join('\n') : '';
            });
    }

    function saveSequences() {
        var level = state.adminEditLevel;
        var textarea = document.getElementById('adminSequences');
        var lines = textarea.value.split('\n').filter(function (l) { return l.trim().length > 0; });
        var statusEl = document.getElementById('saveStatus');

        for (var i = 0; i < lines.length; i++) {
            if (!/^\d+(=\d+)*$/.test(lines[i].trim())) {
                statusEl.textContent = '❌ Dòng ' + (i + 1) + ' sai format! Đúng: 422=2=4=6=8';
                statusEl.className = 'save-status error';
                return;
            }
        }

        fetch(CONFIG.API_URL + '?action=save_sequences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: state.userId, level: level, sequences: lines })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success) {
                    statusEl.textContent = '✅ Đã lưu dây mồi +' + level + ' thành công!';
                    statusEl.className = 'save-status success';
                    state.sequences[level] = lines;
                    localStorage.setItem('fco_seq_' + level, JSON.stringify(lines));
                    showToast('Đã lưu dây mồi +' + level, 'success');
                } else {
                    statusEl.textContent = '❌ ' + (d.error || 'Lỗi lưu');
                    statusEl.className = 'save-status error';
                }
            })
            .catch(function () {
                localStorage.setItem('fco_seq_' + level, JSON.stringify(lines));
                state.sequences[level] = lines;
                statusEl.textContent = '✅ Đã lưu local (API offline)';
                statusEl.className = 'save-status success';
            });

        setTimeout(function () { statusEl.textContent = ''; }, 4000);
    }

    function toggleMaintenance() {
        var checked = document.getElementById('maintenanceToggle').checked;
        fetch(CONFIG.API_URL + '?action=toggle_maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: state.userId, maintenance: checked })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success) {
                    state.isMaintenance = checked;
                    document.getElementById('maintenanceStatus').textContent =
                        checked ? '🔴 Đang bật' : 'Đang tắt';
                    showToast(checked ? 'Đã bật bảo trì' : 'Đã tắt bảo trì', checked ? 'error' : 'success');
                }
            })
            .catch(function () {
                showToast('Lỗi kết nối API', 'error');
            });
    }

    function addAnnouncement() {
        var textarea = document.getElementById('newAnnouncement');
        var text = textarea.value.trim();
        if (!text) { showToast('Nhập nội dung thông báo', 'error'); return; }

        fetch(CONFIG.API_URL + '?action=save_announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: state.userId, text: text })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success) {
                    textarea.value = '';
                    state.announcements.unshift({
                        id: (d.data && d.data.id) || Date.now(),
                        text: text,
                        date: new Date().toLocaleDateString('vi-VN')
                    });
                    renderAdminAnnouncements();
                    showToast('Đã thêm thông báo', 'success');
                }
            })
            .catch(function () { showToast('Lỗi kết nối', 'error'); });
    }

    function deleteAnnouncement(id) {
        fetch(CONFIG.API_URL + '?action=delete_announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: state.userId, id: id })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success) {
                    state.announcements = state.announcements.filter(function (a) { return a.id !== id; });
                    renderAdminAnnouncements();
                    showToast('Đã xóa thông báo', 'success');
                }
            })
            .catch(function () { showToast('Lỗi', 'error'); });
    }

    function renderAdminAnnouncements() {
        var container = document.getElementById('adminAnnouncementList');
        if (!container) return;
        if (!state.announcements || state.announcements.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có thông báo</div>';
            return;
        }
        container.innerHTML = '';
        state.announcements.forEach(function (ann) {
            var item = document.createElement('div');
            item.className = 'announcement-item';
            item.innerHTML = '<div class="ann-admin-item">' +
                '<div><div class="ann-date">' + (ann.date || '') + '</div>' +
                '<div class="ann-text">' + escapeHtml(ann.text) + '</div></div>' +
                '<button class="ann-del-btn" data-id="' + ann.id + '">🗑️</button>' +
                '</div>';
            container.appendChild(item);
        });
        container.querySelectorAll('.ann-del-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteAnnouncement(this.getAttribute('data-id'));
            });
        });
    }

    // ==================== SPACE CANVAS (Stars) ====================
    function initSpaceCanvas() {
        var canvas = document.getElementById('spaceCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, stars = [];

        function resize() {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Init stars AFTER resize so W/H are correct
        for (var i = 0; i < 160; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.6 + 0.2,
                o: Math.random() * 0.6 + 0.2,
                s: Math.random() * 0.4 + 0.1,
                d: Math.random() * Math.PI * 2
            });
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            var t = Date.now() / 1000;
            stars.forEach(function(star) {
                var twinkle = star.o + Math.sin(t * star.s + star.d) * 0.3;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(200,180,255,' + Math.max(0.05, Math.min(1, twinkle)) + ')';
                ctx.fill();
            });
            requestAnimationFrame(draw);
        }
        draw();
    }

    // ==================== METEORS ====================
    function initMeteors() {
        var container = document.getElementById('meteorContainer');
        if (!container) return;

        function spawnMeteor() {
            var el = document.createElement('div');
            el.className = 'meteor';
            var left = 10 + Math.random() * 80;
            var angle = 20 + Math.random() * 30;
            var dur   = 1.2 + Math.random() * 2;
            var delay = Math.random() * 6;
            var h     = 60 + Math.random() * 80;
            el.style.cssText = 'left:' + left + '%;' +
                '--angle:' + angle + 'deg;' +
                'height:' + h + 'px;' +
                'animation-duration:' + dur + 's;' +
                'animation-delay:' + delay + 's;';
            container.appendChild(el);
            setTimeout(function() { el.remove(); }, (dur + delay + 0.5) * 1000);
        }

        // Spawn initial batch
        for (var i = 0; i < 6; i++) spawnMeteor();
        // Keep spawning
        setInterval(function() { spawnMeteor(); }, 1800);
    }

    // ==================== KEY SYSTEM ====================
    function checkUserAccess() {
        var url = CONFIG.API_URL + '?action=check_access&user_id=' + encodeURIComponent(state.userId || '');
        if (state.userName) url += '&first_name=' + encodeURIComponent(state.userName);
        if (state.userUsername) url += '&username=' + encodeURIComponent(state.userUsername);

        fetch(url).then(function (r) { return r.json(); }).then(function (d) {
            var data = d.success ? d.data : { access: false, type: 'locked' };
            state.accessType = data.type;
            state.keyInfo = data;

            // Server xác nhận admin → hiện tab Admin
            if (data.type === 'admin') {
                state.isAdmin = true;
                var adminNav = document.getElementById('navAdmin');
                if (adminNav) adminNav.classList.remove('hidden');
                hideKeyModal();
                updateAccessBadge(data);
                updateKeyTabUI();
                return;
            }

            if (data.type === 'banned') {
                document.getElementById('bannedOverlay').classList.remove('hidden');
                return;
            }

            if (data.type === 'key' && data.access) {
                hideKeyModal();
                updateAccessBadge(data);
                updateKeyTabUI();
                if (data.expiry_warning) {
                    var banner = document.getElementById('expiryBanner');
                    var text = document.getElementById('expiryText');
                    banner.classList.remove('hidden');
                    var dl = data.days_left !== null ? Math.ceil(data.days_left) : 0;
                    text.textContent = 'Key sắp hết hạn! Còn ' + dl + ' ngày. Liên hệ Admin gia hạn.';
                }
                return;
            }

            // Không có key → hiện modal nhưng cho phép đóng để xem Info/Key tab
            updateAccessBadge(data);
            showKeyModal(false);
            updateKeyTabUI();
        }).catch(function () {
            // Offline → hiện modal
            state.accessType = 'locked';
            updateAccessBadge({ type: 'locked' });
            showKeyModal(false);
            updateKeyTabUI();
        });
    }

    function showKeyModal(forced) {
        var modal = document.getElementById('keyModal');
        var closeBtn = document.getElementById('keyModalClose');
        var desc = document.getElementById('keyModalDesc');
        modal.classList.remove('hidden');
        document.getElementById('keyError').textContent = '';
        document.getElementById('keyInput').value = '';
        if (forced) {
            closeBtn.classList.add('hidden');
            desc.textContent = 'Nhập Key để sử dụng công cụ. Liên hệ Admin để mua Key.';
        } else {
            closeBtn.classList.remove('hidden');
            desc.innerHTML = 'Nhập Key để sử dụng công cụ.<br><small style="opacity:0.7">Bạn có thể đóng để xem bảng giá và thông tin tại tab Key & Thông Tin.</small>';
        }
    }

    function hideKeyModal() {
        document.getElementById('keyModal').classList.add('hidden');
    }

    function updateKeyCardVisibility(data) {
        var card = document.getElementById('activateKeyCard');
        if (!card) return;
        if (data.type === 'key' || data.type === 'admin') {
            card.classList.add('hidden');
        } else {
            card.classList.remove('hidden');
        }
    }

    function handleActivateKey() {
        var keyInput = document.getElementById('keyInput');
        var key = keyInput.value.trim().toUpperCase();
        var errorEl = document.getElementById('keyError');
        var btn = document.getElementById('activateKeyBtn');

        if (!key) { errorEl.textContent = 'Vui lòng nhập key'; return; }

        btn.disabled = true;
        btn.textContent = '⏳ Đang kiểm tra...';
        errorEl.textContent = '';

        KeySystem.activateKey(state.userId, key, CONFIG.API_URL, function (success, data, error) {
            btn.disabled = false;
            btn.textContent = '⚡ Kích hoạt Key';
            if (success) {
                state.accessType = 'key';
                state.keyInfo = data;
                hideKeyModal();
                updateAccessBadge({ type: 'key', key_type: data.type, expires_at: data.expires_at });
                updateKeyCardVisibility({ type: 'key' });
                updateKeyTabUI();
                showToast('✅ Kích hoạt key thành công! Loại: ' + data.type, 'success');
            } else {
                errorEl.textContent = error || 'Key không hợp lệ hoặc đã được sử dụng';
            }
        });
    }

    function updateAccessBadge(data) {
        var badge = document.getElementById('accessBadge');
        var text  = document.getElementById('accessBadgeText');
        if (!badge || !text) return;
        badge.classList.remove('hidden', 'locked', 'vip', 'admin');

        if (data.type === 'admin') {
            badge.classList.add('admin');
            text.textContent = '👑 ADMIN';
        } else if (data.type === 'key') {
            badge.classList.add('vip');
            text.textContent = '⭐ VIP ' + (data.key_type || '');
        } else {
            badge.classList.add('locked');
            text.textContent = '🔒 Chưa kích hoạt';
        }
    }

    // ==================== KEY TAB UI ====================
    function updateKeyTabUI() {
        var iconEl = document.getElementById('keyTabStatusIcon');
        var titleEl = document.getElementById('keyTabStatusTitle');
        var descEl = document.getElementById('keyTabStatusDesc');
        var timerCard = document.getElementById('timerCard');

        if (timerCard) timerCard.classList.add('hidden'); // Luôn ẩn timer

        if (state.accessType === 'admin') {
            iconEl.textContent = '👑';
            titleEl.textContent = 'ADMIN';
            descEl.textContent = 'Quyền quản trị viên — không giới hạn';
        } else if (state.accessType === 'key') {
            iconEl.textContent = '⭐';
            titleEl.textContent = 'VIP ' + (state.keyInfo && state.keyInfo.key_type || '');
            var exp = state.keyInfo && state.keyInfo.expires_at;
            descEl.textContent = exp && exp !== '9999-12-31' ? 'Hết hạn: ' + exp : 'Vĩnh viễn — không giới hạn';
        } else {
            iconEl.textContent = '🔒';
            titleEl.textContent = 'Chưa kích hoạt';
            descEl.textContent = 'Mua Key từ Admin để sử dụng công cụ';
        }
    }

    function handleKeyTabActivate() {
        var input = document.getElementById('keyTabInput');
        var key = input.value.trim().toUpperCase();
        var errorEl = document.getElementById('keyTabError');
        var successEl = document.getElementById('keyTabSuccess');
        var btn = document.getElementById('keyTabActivateBtn');

        successEl.classList.add('hidden');
        if (!key) { errorEl.textContent = 'Vui lòng nhập mã Key'; return; }

        btn.disabled = true;
        btn.textContent = '⏳ Đang kiểm tra...';
        errorEl.textContent = '';

        KeySystem.activateKey(state.userId, key, CONFIG.API_URL, function (success, data, error) {
            btn.disabled = false;
            btn.textContent = '⚡ Kích hoạt Key';
            if (success) {
                state.accessType = 'key';
                state.keyInfo = data;
                input.value = '';
                errorEl.textContent = '';
                hideKeyModal();
                updateAccessBadge({ type: 'key', key_type: data.type, expires_at: data.expires_at });
                updateKeyTabUI();
                successEl.textContent = '✅ Kích hoạt thành công! Loại: ' + data.type;
                successEl.classList.remove('hidden');
                showToast('✅ Kích hoạt key thành công!', 'success');
            } else {
                errorEl.textContent = error || 'Key không hợp lệ hoặc đã được sử dụng';
            }
        });
    }

    function handleGenerateKeys() {
        var type = document.getElementById('keyType').value;
        var count = parseInt(document.getElementById('keyCount').value);
        var btn = document.getElementById('generateKeysBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang tạo...';

        KeySystem.generateKeys(state.userId, type, count, CONFIG.API_URL, function (success, data, error) {
            btn.disabled = false;
            btn.textContent = '🔧 Tạo Key';
            if (success) {
                showToast('✅ Đã tạo ' + data.count + ' key ' + type, 'success');
                loadAdminKeys();
            } else {
                showToast('❌ ' + (error || 'Lỗi tạo key'), 'error');
            }
        });
    }

    function loadAdminKeys() {
        KeySystem.getKeys(state.userId, CONFIG.API_URL, function (success, data) {
            if (success && data) {
                state._lastKeyData = data;
                renderKeyStats(data.stats);
                renderKeyList(data);
            }
        });
    }

    function renderKeyStats(stats) {
        if (!stats) return;
        var el = document.getElementById('keyStats');
        if (!el) return;
        el.innerHTML =
            '<span class="key-stat-badge stat-total">Tổng: '   + (stats.total   || 0) + '</span>' +
            '<span class="key-stat-badge stat-unused">Còn: '   + (stats.unused  || 0) + '</span>' +
            '<span class="key-stat-badge stat-active">Active: ' + (stats.active  || 0) + '</span>' +
            '<span class="key-stat-badge stat-expired">Hết hạn: '+ (stats.expired || 0) + '</span>';
    }

    function renderKeyList(data) {
        var container = document.getElementById('keyList');
        if (!container) return;
        if (!data || !data.keys) { container.innerHTML = '<div class="empty-state">Chưa có key nào</div>'; return; }

        var keys   = data.keys;
        var filter = state.keyFilter;
        var search = (document.getElementById('keySearch') ? document.getElementById('keySearch').value : '').toLowerCase();
        var html   = '';
        var count  = 0;

        for (var code in keys) {
            var k = keys[code];
            if (filter !== 'all' && k.status !== filter) continue;
            if (search && code.toLowerCase().indexOf(search) === -1) continue;
            count++;
            var typeLabel  = k.type === 'LIFE' ? 'Vĩnh viễn' : k.type;
            var badgeClass = 'badge-' + k.status;
            var metaText   = typeLabel;
            if (k.activated_by) metaText += ' · ' + k.activated_by;
            if (k.expires_at && k.type !== 'LIFE') metaText += ' · HH: ' + k.expires_at;

            html += '<div class="key-item">' +
                '<span class="key-code" title="' + escapeHtml(code) + '">' + escapeHtml(code) + '</span>' +
                '<span class="key-badge ' + badgeClass + '">' + k.status + '</span>' +
                '<div class="key-actions">' +
                '<button class="key-action-btn copy" data-key="' + code + '" title="Copy">📋</button>' +
                (k.status !== 'active' ? '' : '<button class="key-action-btn extend" data-key="' + code + '" title="Gia hạn">➕</button>') +
                (k.status === 'unused' ? '<button class="key-action-btn del" data-key="' + code + '" title="Xóa">🗑️</button>' : '') +
                '</div></div>';
        }

        container.innerHTML = count > 0 ? html : '<div class="empty-state">Không có key nào</div>';

        // Bind key search live filter
        var ks = document.getElementById('keySearch');
        if (ks && !ks._bound) {
            ks._bound = true;
            ks.addEventListener('input', function() { renderKeyList(state._lastKeyData); });
        }

        container.querySelectorAll('.key-action-btn.copy').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var keyCode = this.getAttribute('data-key');
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(keyCode).then(function () { showToast('📋 Đã copy: ' + keyCode, 'success'); });
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = keyCode; document.body.appendChild(ta); ta.select();
                    document.execCommand('copy'); document.body.removeChild(ta);
                    showToast('📋 Đã copy: ' + keyCode, 'success');
                }
            });
        });

        container.querySelectorAll('.key-action-btn.del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var keyCode = this.getAttribute('data-key');
                if (!confirm('Xóa key ' + keyCode + '?')) return;
                KeySystem.deleteKey(state.userId, keyCode, CONFIG.API_URL, function (success) {
                    if (success) { showToast('Đã xóa key', 'success'); loadAdminKeys(); }
                    else showToast('Lỗi xóa key', 'error');
                });
            });
        });

        container.querySelectorAll('.key-action-btn.extend').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var keyCode = this.getAttribute('data-key');
                var days = parseInt(prompt('Gia hạn bao nhiêu ngày?', '7'));
                if (!days || isNaN(days)) return;
                KeySystem.extendKey(state.userId, keyCode, days, CONFIG.API_URL, function (success, data, error) {
                    if (success) { showToast('✅ Đã gia hạn thêm ' + days + ' ngày', 'success'); loadAdminKeys(); }
                    else showToast('❌ ' + (error || 'Lỗi gia hạn'), 'error');
                });
            });
        });
    }

    // ==================== ADMIN: USERS, STATS, LOGS ====================
    // Bind user search once (not inside fetch to avoid duplicates)
    var _userSearchBound = false;
    function loadAdminUsers() {
        fetch(CONFIG.API_URL + '?action=get_users&admin_id=' + encodeURIComponent(state.userId))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    state._lastUserData = d.data;
                    renderUserStats(d.data.stats);
                    renderUserList(d.data.users, '');
                    if (!_userSearchBound) {
                        _userSearchBound = true;
                        document.getElementById('userSearch').addEventListener('input', function () {
                            renderUserList(state._lastUserData.users, this.value.trim().toLowerCase());
                        });
                    }
                }
            }).catch(function () { });
    }

    function renderUserStats(stats) {
        if (!stats) return;
        var el = document.getElementById('userStats');
        if (!el) return;
        el.innerHTML =
            '<span class="key-stat-badge stat-total">Tổng: '   + (stats.total  || 0) + '</span>' +
            '<span class="key-stat-badge stat-active">VIP: '   + (stats.vip    || 0) + '</span>' +
            '<span class="key-stat-badge stat-unused">Free: '  + (stats.free   || 0) + '</span>' +
            '<span class="key-stat-badge stat-expired">Banned: '+ (stats.banned || 0) + '</span>';
    }

    function renderUserList(users, search) {
        var container = document.getElementById('userList');
        if (!container) return;
        if (!users || Object.keys(users).length === 0) { container.innerHTML = '<div class="empty-state">Chưa có user nào</div>'; return; }
        var html = '', count = 0;
        var sortBy = document.getElementById('userSort') ? document.getElementById('userSort').value : 'last_seen';
        var uids = Object.keys(users);
        uids.sort(function(a, b) {
            if (sortBy === 'visits') return (users[b].visits || 0) - (users[a].visits || 0);
            if (sortBy === 'access') return (users[b].access_type || '').localeCompare(users[a].access_type || '');
            return (users[b].last_seen || '').localeCompare(users[a].last_seen || '');
        });
        for (var i = 0; i < uids.length; i++) {
            var uid = uids[i];
            var u = users[uid];
            var name = u.first_name || u.username || uid;
            if (search && name.toLowerCase().indexOf(search) === -1 && uid.indexOf(search) === -1) continue;
            count++;
            var initial = (name.charAt(0) || '?').toUpperCase();
            var badgeCls = u.banned ? 'badge-expired' : (u.access_type === 'key' ? 'badge-active' : 'badge-unused');
            var badgeTxt = u.banned ? '🚫 BAN' : (u.access_type === 'key' ? '⭐ VIP' : '🔒 FREE');
            var banBtn = u.banned
                ? '<button class="user-action-btn unban-btn" data-uid="' + uid + '">Unban</button>'
                : '<button class="user-action-btn ban-btn" data-uid="' + uid + '">Ban</button>';
            html += '<div class="user-item">' +
                '<div class="user-avatar-sm">' + initial + '</div>' +
                '<div class="user-info">' +
                '<div class="user-name-text">' + escapeHtml(name) + '</div>' +
                '<div class="user-id-text">ID: ' + uid + ' · ' + (u.last_seen || '') + '</div>' +
                '</div>' +
                '<span class="key-badge ' + badgeCls + '">' + badgeTxt + '</span>' +
                '<div class="user-actions-sm">' + banBtn + '</div>' +
                '</div>';
        }
        container.innerHTML = count > 0 ? html : '<div class="empty-state">Không tìm thấy</div>';
        container.querySelectorAll('.user-action-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var uid    = this.getAttribute('data-uid');
                var isBan  = this.classList.contains('ban-btn');
                var action = isBan ? 'ban_user' : 'unban_user';
                fetch(CONFIG.API_URL + '?action=' + action, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_id: state.userId, user_id: uid })
                }).then(function (r) { return r.json(); }).then(function (d) {
                    if (d.success) { showToast(isBan ? 'Đã ban user' : 'Đã unban user', 'success'); loadAdminUsers(); loadAdminLogs(); }
                    else showToast(d.error || 'Lỗi', 'error');
                }).catch(function () { showToast('Lỗi kết nối', 'error'); });
            });
        });
    }

    function loadAdminStats() {
        fetch(CONFIG.API_URL + '?action=get_stats&admin_id=' + encodeURIComponent(state.userId))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    renderRevenueStats(d.data);
                    // Update Dashboard 6 cards
                    var el;
                    el = document.getElementById('dashTotalUsers'); if (el) el.textContent = d.data.total_users || 0;
                    el = document.getElementById('dashVipUsers'); if (el) el.textContent = d.data.vip_users || 0;
                    el = document.getElementById('dashBanned'); if (el) el.textContent = d.data.banned_count || 0;
                    el = document.getElementById('dashTotalKeys'); if (el) el.textContent = d.data.total_keys || 0;
                    el = document.getElementById('dashActiveKeys'); if (el) el.textContent = d.data.active_keys || 0;
                    el = document.getElementById('dashOnline'); if (el) el.textContent = d.data.online_now || 0;
                }
            }).catch(function () { });
    }

    function renderRevenueStats(data) {
        var el = document.getElementById('revenueStats');
        var bt = data.keys_by_type || {};
        var at = data.active_by_type || {};
        el.innerHTML = '<div class="revenue-row">' +
            '<div class="revenue-card"><span class="rev-num">' + (data.total_keys || 0) + '</span><span class="rev-label">Tổng Key</span></div>' +
            '<div class="revenue-card"><span class="rev-num">' + (data.total_users || 0) + '</span><span class="rev-label">Tổng User</span></div>' +
            '</div>' +
            '<div class="stats-section-title">Key theo loại (tổng / active)</div>' +
            '<div class="revenue-row">' +
            '<div class="revenue-card"><span class="rev-num">' + (bt['1D'] || 0) + '/' + (at['1D'] || 0) + '</span><span class="rev-label">1 Ngày</span></div>' +
            '<div class="revenue-card"><span class="rev-num">' + (bt['7D'] || 0) + '/' + (at['7D'] || 0) + '</span><span class="rev-label">7 Ngày</span></div>' +
            '<div class="revenue-card"><span class="rev-num">' + (bt['30D'] || 0) + '/' + (at['30D'] || 0) + '</span><span class="rev-label">30 Ngày</span></div>' +
            '<div class="revenue-card"><span class="rev-num">' + (bt['LIFE'] || 0) + '/' + (at['LIFE'] || 0) + '</span><span class="rev-label">Vĩnh viễn</span></div>' +
            '</div>';
    }

    function handleCopyUnusedKeys() {
        fetch(CONFIG.API_URL + '?action=copy_unused_keys&admin_id=' + encodeURIComponent(state.userId))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) {
                    var keys = d.data.keys || [];
                    if (keys.length === 0) {
                        showToast('Không có key chưa dùng', 'info');
                        return;
                    }
                    var text = keys.join('\n');
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(function () {
                            showToast('📋 Đã copy ' + keys.length + ' key!', 'success');
                        });
                    } else {
                        // Fallback
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        showToast('📋 Đã copy ' + keys.length + ' key!', 'success');
                    }
                } else {
                    showToast(d.error || 'Lỗi', 'error');
                }
            }).catch(function () { showToast('Lỗi kết nối', 'error'); });
    }

    // ==================== ADMIN BROADCAST ====================
    function handleSendBroadcast() {
        var targetEl  = document.getElementById('broadcastTarget');
        var msgEl     = document.getElementById('broadcastMessage');
        var statusEl  = document.getElementById('broadcastStatus');
        var btn       = document.getElementById('sendBroadcastBtn');
        var userIdEl  = document.getElementById('broadcastUserId');

        if (!targetEl || !msgEl || !statusEl || !btn) {
            console.error('Broadcast: thiếu element trong DOM');
            return;
        }

        var target  = targetEl.value;
        var msg     = msgEl.value.trim();
        var userId  = target === 'single' ? ((userIdEl ? userIdEl.value : '') || '').trim() : '';

        if (!msg) {
            statusEl.textContent = '❌ Nhập nội dung tin nhắn!';
            statusEl.className = 'save-status error';
            return;
        }
        if (target === 'single' && !userId) {
            statusEl.textContent = '❌ Nhập Telegram User ID!';
            statusEl.className = 'save-status error';
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Đang gửi...';
        statusEl.textContent = '';
        statusEl.className = 'save-status';

        fetch(CONFIG.API_URL + '?action=send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: state.userId,
                target:   target,
                user_id:  userId,
                message:  msg
            })
        })
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function(d) {
            btn.disabled = false;
            btn.textContent = '🚀 Gửi tin nhắn';
            if (d.success) {
                var sent   = (d.data && d.data.sent)   ? d.data.sent   : 0;
                var failed = (d.data && d.data.failed) ? d.data.failed : 0;
                var total  = (d.data && d.data.total)  ? d.data.total  : 0;
                statusEl.textContent = '✅ Gửi thành công: ' + sent + '/' + total + ' user' +
                    (failed > 0 ? ' (' + failed + ' thất bại — user chưa từng chat với bot)' : '');
                statusEl.className = 'save-status success';
                msgEl.value = '';
                showToast('📨 Đã gửi tới ' + sent + ' user!', 'success');
                loadAdminLogs();
            } else {
                statusEl.textContent = '❌ ' + (d.error || 'Lỗi không xác định');
                statusEl.className = 'save-status error';
                showToast('❌ ' + (d.error || 'Lỗi gửi'), 'error');
            }
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.textContent = '🚀 Gửi tin nhắn';
            statusEl.textContent = '❌ Lỗi kết nối: ' + (err.message || 'Không thể kết nối API');
            statusEl.className = 'save-status error';
        });
    }

    function loadAdminLogs() {
        fetch(CONFIG.API_URL + '?action=get_admin_logs&admin_id=' + encodeURIComponent(state.userId))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.success && d.data) renderAdminLogs(d.data);
            }).catch(function () { });
    }

    function renderAdminLogs(logs) {
        var container = document.getElementById('adminLogList');
        if (!logs || logs.length === 0) { container.innerHTML = '<div class="empty-state">Chưa có nhật ký</div>'; return; }
        var html = '';
        logs.forEach(function (log) {
            html += '<div class="log-item">' +
                '<span class="log-time">' + (log.time || '') + '</span> ' +
                '<span class="log-action">' + escapeHtml(log.action || '') + '</span><br>' +
                '<span class="log-details">' + escapeHtml(log.details || '') + '</span>' +
                '</div>';
        });
        container.innerHTML = html;
    }

    // ==================== UTILITIES ====================
    function showToast(msg, type) {
        var toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = 'toast ' + (type || 'info');
        setTimeout(function () { toast.classList.add('show'); }, 10);
        setTimeout(function () { toast.classList.remove('show'); }, 3000);
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== START ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();