// ─────────────────────────────────────────────────────────────────────────────
// Auth Check
// ─────────────────────────────────────────────────────────────────────────────

const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized access. Please log in first.');
    window.location.href = 'login.html';
}

// ─────────────────────────────────────────────────────────────────────────────
// Globals
// ─────────────────────────────────────────────────────────────────────────────

let editLogsData = [];
let audioContext;
let audioInitialized = false;

// ─────────────────────────────────────────────────────────────────────────────
// Audio Functions
// ─────────────────────────────────────────────────────────────────────────────

function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audioInitialized = true;
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playSound(frequency, duration) {
    if (!audioInitialized || !audioContext) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

// Initialize audio on first interaction
window.addEventListener('click', () => {
    if (!audioInitialized) initAudioContext();
}, { once: true });

// ─────────────────────────────────────────────────────────────────────────────
// UI Enhancements (Particles, Stickers, Menu)
// ─────────────────────────────────────────────────────────────────────────────

function createGamingStickers() {
    const container = document.getElementById('gamingStickers');
    const icons = ['📝', '✏️', '📊', '🔍', '⚡', '🎯', '💎', '🏆', '⭐', '🎮', '💰', '🔥', '🌟', '💫', '📈', '🎪'];

    for (let i = 0; i < 25; i++) {
        const el = document.createElement('div');
        el.className = 'sticker';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.top = Math.random() * 100 + '%';
        el.style.animationDelay = Math.random() * 15 + 's';
        el.style.fontSize = (Math.random() * 20 + 20) + 'px';
        container.appendChild(el);
    }
}

function createParticles() {
    const container = document.getElementById('particles');

    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDelay = Math.random() * 8 + 's';
        el.style.animationDuration = (Math.random() * 4 + 6) + 's';
        container.appendChild(el);
    }
}

function setupMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');

    toggle.addEventListener('click', () => {
        playSound(600, 0.2);
        toggle.classList.toggle('active');
        menu.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        toggle.classList.remove('active');
        menu.classList.remove('open');
        overlay.classList.remove('active');
        playSound(400, 0.1);
    });

    document.querySelectorAll('.menu-item').forEach(item =>
        item.addEventListener('mouseenter', () => playSound(300, 0.1))
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatUnits(units) {
    if (!units) return '—';
    const all = [...(units.pcUnits || []), ...(units.psUnits || [])];
    if (all.length === 0) return '—';

    return all.map(unit => {
        const id = unit.pcId || unit.psId || 'Unknown';
        return `<span class="unit-item">${id} (${unit.duration || '?'} mins)</span>`;
    }).join(' ');
}

function formatSnacks(snacks) {
    if (!snacks || !snacks.length) return '—';
    return snacks.map(s => `<span class="snack-item">${s.name} x${s.qty}</span>`).join(' ');
}

function formatPaymentMethod(payment) {
    return payment ? `₹${payment}` : '—';
}

function formatAmount(amount) {
    return amount ? `₹${amount.toLocaleString()}` : '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Log Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderComparisonRow(label, before, after, changed) {
    return `
        <tr class="${changed ? 'changed' : ''}">
            <td class="row-label">${label}</td>
            <td class="before-row">${before || '—'}</td>
            <td class="after-row">${after || '—'}</td>
        </tr>
    `;
}

function renderEditLogEntry(log) {
    const entry = document.createElement('div');
    entry.className = 'edit-log-entry';

    const { beforeBill, afterBill } = log;
    const beforeUnits = { pcUnits: beforeBill.pcUnits || [], psUnits: beforeBill.psUnits || [] };
    const afterUnits = { pcUnits: afterBill.pcUnits || [], psUnits: afterBill.psUnits || [] };

    entry.innerHTML = `
        <div class="edit-info">
            <div class="edit-details">
                <span class="edit-user">Edited by: ${log.editedBy}</span>
                <span class="edit-timestamp">${formatDate(log.timestamp)}</span>
                <span class="bill-id">Bill ID: ${log.billId}</span>
            </div>
        </div>
        <table class="edit-table">
            <thead>
                <tr><th>Field</th><th>Before</th><th>After</th></tr>
            </thead>
            <tbody>
                ${renderComparisonRow('Customer Name', beforeBill.userName, afterBill.userName, log.changedFields.includes('userName'))}
                ${renderComparisonRow('Contact', beforeBill.contactNo, afterBill.contactNo, log.changedFields.includes('contactNo'))}
                ${renderComparisonRow('Units', formatUnits(beforeUnits), formatUnits(afterUnits), log.changedFields.includes('pcUnits') || log.changedFields.includes('psUnits'))}
                ${renderComparisonRow('Snacks', formatSnacks(beforeBill.snacks), formatSnacks(afterBill.snacks), log.changedFields.includes('snacks'))}
                ${renderComparisonRow('Cash', formatPaymentMethod(beforeBill.cash), formatPaymentMethod(afterBill.cash), log.changedFields.includes('cash'))}
                ${renderComparisonRow('UPI', formatPaymentMethod(beforeBill.UPI), formatPaymentMethod(afterBill.UPI), log.changedFields.includes('UPI'))}
                ${renderComparisonRow('Wallet', formatPaymentMethod(beforeBill.wallet), formatPaymentMethod(afterBill.wallet), log.changedFields.includes('wallet'))}
                ${renderComparisonRow('Discount', formatPaymentMethod(beforeBill.discount), formatPaymentMethod(afterBill.discount), log.changedFields.includes('discount'))}
                ${renderComparisonRow('Amount', formatAmount(beforeBill.amount), formatAmount(afterBill.amount), log.changedFields.includes('amount'))}
            </tbody>
        </table>
    `;

    return entry;
}

function renderEditLogs(logs) {
    const container = document.getElementById('editLogsContainer');
    container.innerHTML = '';

    document.getElementById('noLogsMessage').style.display = logs.length ? 'none' : 'block';

    logs.forEach(log => container.appendChild(renderEditLogEntry(log)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch & Process Edit Logs
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAndRenderEditLogs() {
    try {
        document.getElementById('loading').style.display = 'block';

        const res = await fetch('/api/edit/all-logs', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const editLogs = await res.json();
        const detailedLogs = [];

        for (const log of editLogs) {
            const versions = log.versions.sort((a, b) => a.version - b.version);
            const billRes = await fetch(`/api/bill/${log.billId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!billRes.ok) {
                console.error(`Failed to fetch bill ${log.billId}`);
                continue;
            }

            const latestBill = await billRes.json();

            for (let i = 0; i < versions.length; i++) {
                const before = i === 0 ? {} : versions[i - 1];
                const current = versions[i];

                const changedFields = Object.keys(current).filter(field => {
                    if (['editedAt', 'editedBy', 'version', '_id'].includes(field)) return false;
                    return JSON.stringify(current[field]) !== JSON.stringify(before[field] || null);
                });

                detailedLogs.push({
                    billId: log.billId,
                    version: current.version,
                    timestamp: current.editedAt,
                    editedBy: current.editedBy || 'Unknown',
                    changedFields,
                    beforeBill: { ...latestBill, ...before },
                    afterBill: { ...latestBill, ...current }
                });
            }
        }

        editLogsData = detailedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderEditLogs(editLogsData);
    } catch (err) {
        console.error('Failed to load edit logs:', err);
        document.getElementById('editLogsContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: red;">
                Failed to load edit logs. Please try again later.
            </div>
        `;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

function setupSearch() {
    const input = document.getElementById('searchInput');

    input.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        const filtered = editLogsData.filter(log =>
            log.billId.toLowerCase().includes(query) ||
            (log.editedBy?.toLowerCase().includes(query)) ||
            (log.beforeBill.userName?.toLowerCase().includes(query)) ||
            (log.afterBill.userName?.toLowerCase().includes(query))
        );

        renderEditLogs(filtered);
        playSound(400, 0.1);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('menuToggle')?.classList.remove('active');
        document.getElementById('sideMenu')?.classList.remove('open');
        document.getElementById('menuOverlay')?.classList.remove('active');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    createGamingStickers();
    createParticles();
    setupMenu();
    setupSearch();
    fetchAndRenderEditLogs();
});
