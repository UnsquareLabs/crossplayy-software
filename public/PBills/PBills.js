const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized access. Please log in first.');
    window.location.href = '../login/login.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        window.location.href = '../login/login.html';
    }
}

// Global variables
let billsData = [];
let filteredBills = [];
let currentEditingId = null;
let currentPage = 1;
let billsPerPage = 30;
let displayedBills = 0;

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

function initAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    audioInitialized = true;
}

function playSound(frequency, duration) {
    try {
        if (!audioInitialized) return;

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
        console.log('Audio not supported');
    }
}

window.addEventListener('click', () => {
    if (!audioInitialized) {
        initAudioContext();
    }
}, { once: true });

// Gaming Stickers
function createGamingStickers() {
    const stickersContainer = document.getElementById('gamingStickers');
    const stickerIcons = ['🎮', '🖥️', '⌨️', '🖱️', '🎧', '🕹️', '💻', '📱', '🎯', '⚡', '🔥', '💎', '🏆', '🎪', '🎨', '🎭'];
    const stickerCount = 25;

    for (let i = 0; i < stickerCount; i++) {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.textContent = stickerIcons[Math.floor(Math.random() * stickerIcons.length)];
        sticker.style.left = Math.random() * 100 + '%';
        sticker.style.top = Math.random() * 100 + '%';
        sticker.style.animationDelay = Math.random() * 15 + 's';
        sticker.style.fontSize = (Math.random() * 20 + 20) + 'px';
        stickersContainer.appendChild(sticker);
    }
}

// Particle System
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 6) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Menu Toggle Functionality
function setupMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    menuToggle.addEventListener('click', function () {
        playSound(600, 0.2);
        this.classList.toggle('active');
        sideMenu.classList.toggle('open');
        menuOverlay.classList.toggle('active');
    });

    menuOverlay.addEventListener('click', function () {
        menuToggle.classList.remove('active');
        sideMenu.classList.remove('open');
        menuOverlay.classList.remove('active');
        playSound(400, 0.1);
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => playSound(300, 0.1));
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format Units
function formatUnits(bill) {
    const units = bill.type === 'ps' ? bill.psUnits : bill.pcUnits;

    return units.map(unit => {
        const duration = unit.duration;
        const timeStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;

        if (bill.type === 'ps') {
            const totalPlayers = Array.isArray(unit.players) ? unit.players.length : 1;
            return `<span class="pc-units">${unit.psId} • ${timeStr} • ${totalPlayers}P</span>`;
        } else {
            return `<span class="pc-units">${unit.pcId} • ${timeStr}</span>`;
        }
    });
}

// Sort bills by booking time (newest first)
function sortBillsByDate(bills) {
    return bills.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));
}

// Update pagination info
function updatePaginationInfo(showing, total, filtered) {
    const paginationInfo = document.getElementById('paginationInfo');
    paginationInfo.textContent = `Showing ${showing} of ${filtered} bills`;
}

// Update load more button
function updateLoadMoreButton(totalBills) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (displayedBills >= totalBills) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

// Render bills table with lazy loading
function renderBills(bills, append = false) {
    const tbody = document.getElementById('billsTableBody');

    if (bills.length === 0 && !append) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #666;">
                    No paid bills found.
                </td>
            </tr>
        `;
        updatePaginationInfo(0, 0, 0);
        return;
    }

    const startIndex = append ? displayedBills : 0;
    const endIndex = Math.min(startIndex + billsPerPage, bills.length);
    const billsToShow = bills.slice(startIndex, endIndex);

    if (!append) {
        tbody.innerHTML = '';
        displayedBills = 0;
    }

    const rows = billsToShow.map(bill => `
        <tr>
            <td>${bill.userName}</td>
            <td>${bill.contactNo}</td>
            <td>
                ${formatUnits(bill)}
                ${Array.isArray(bill.extensions) && bill.extensions.length > 0
            ? `<div class="extension-note">+${bill.extensions.reduce((sum, ext) => sum + ext.minutes, 0)} min extended</div>`
            : ''
        }
            </td>
            <td class="snacks-cell">
                ${bill.snacks && bill.snacks.length > 0
            ? bill.snacks.map(s => `<span>${s.name}${s.quantity}(${s.price})</span>`).join(' ')
            : '—'
        }
            </td>
            <td>${formatDate(bill.bookingTime)}</td>
            <td>₹${bill.cash || 0}</td>
            <td>₹${bill.upi || 0}</td>
            <td>₹${bill.wallet || 0}</td>
            <td>₹${bill.loyaltyPoints || 0}</td>
            <td>₹${bill.discount || 0}</td>
            <td class="amount">₹${bill.amount.toLocaleString()}</td>
            <td>${bill.billedBy}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editBill('${bill._id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteBill('${bill._id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.insertAdjacentHTML('beforeend', rows);
    displayedBills = endIndex;

    updatePaginationInfo(Math.min(displayedBills, bills.length), bills.length, bills.length);
    updateLoadMoreButton(bills.length);
}

// Load more bills
function loadMoreBills() {
    playSound(600, 0.2);
    const billsToRender = filteredBills.length > 0 ? filteredBills : billsData;
    renderBills(billsToRender, true);
    addTableEffects();
}

// Fetch and render paid bills
async function fetchAndRenderPaidBills() {
    try {
        const res = await fetch('/api/bills/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const allBills = await res.json();

        billsData = allBills.filter(bill => bill.status === true);
        billsData = sortBillsByDate(billsData);
        filteredBills = [...billsData];

        renderBills(billsData);
        addTableEffects();
    } catch (error) {
        console.error('Error fetching paid bills:', error);
        const tbody = document.getElementById('billsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: red;">
                    Failed to load paid bills.
                </td>
            </tr>
        `;
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        filteredBills = billsData.filter(bill =>
            bill.userName.toLowerCase().includes(searchTerm) ||
            bill.contactNo.includes(searchTerm)
        );

        displayedBills = 0;
        renderBills(filteredBills);
        addTableEffects();
        playSound(400, 0.1);
    });
}

// Excel Export Functions
function openExportModal() {
    playSound(600, 0.2);

    // Set default dates (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

    updateExportInfo();
    document.getElementById('exportModal').style.display = 'block';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    playSound(400, 0.1);
}

function updateExportInfo() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        const filteredForExport = billsData.filter(bill => {
            const billDate = new Date(bill.bookingTime).toISOString().split('T')[0];
            return billDate >= startDate && billDate <= endDate;
        });

        document.getElementById('exportInfo').textContent =
            `Found ${filteredForExport.length} bills in selected date range`;
    }
}

// Setup date change listeners
function setupExportModal() {
    document.getElementById('startDate').addEventListener('change', updateExportInfo);
    document.getElementById('endDate').addEventListener('change', updateExportInfo);
}

// Convert bills to CSV format
function convertToCSV(bills) {
    const headers = [
        'Customer Name', 'Contact', 'Units', 'Snacks', 'Booking Time',
        'Cash', 'UPI', 'Wallet', 'Loyalty Points', 'Discount', 'Amount', 'Billed By'
    ];

    const csvContent = [
        headers.join(','),
        ...bills.map(bill => {
            const units = formatUnitsForExport(bill);
            const snacks = bill.snacks && bill.snacks.length > 0
                ? bill.snacks.map(s => `${s.name}(${s.quantity})`).join('; ')
                : '';

            return [
                `"${bill.userName}"`,
                `"${bill.contactNo}"`,
                `"${units}"`,
                `"${snacks}"`,
                `"${formatDate(bill.bookingTime)}"`,
                bill.cash || 0,
                bill.upi || 0,
                bill.wallet || 0,
                bill.loyaltyPoints || 0,
                bill.discount || 0,
                bill.amount,
                `"${bill.billedBy}"`
            ].join(',');
        })
    ].join('\n');

    return csvContent;
}

function formatUnitsForExport(bill) {
    const units = bill.type === 'ps' ? bill.psUnits : bill.pcUnits;

    return units.map(unit => {
        const duration = unit.duration;
        const timeStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;

        if (bill.type === 'ps') {
            const totalPlayers = Array.isArray(unit.players) ? unit.players.length : 1;
            return `${unit.psId} • ${timeStr} • ${totalPlayers}P`;
        } else {
            return `${unit.pcId} • ${timeStr}`;
        }
    }).join('; ');
}

// Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Handle export form submission
document.getElementById('exportForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date cannot be after end date');
        return;
    }

    // Filter bills by date range
    const filteredForExport = billsData.filter(bill => {
        const billDate = new Date(bill.bookingTime).toISOString().split('T')[0];
        return billDate >= startDate && billDate <= endDate;
    });

    if (filteredForExport.length === 0) {
        alert('No bills found in the selected date range');
        return;
    }

    // Generate CSV and download
    const csvContent = convertToCSV(filteredForExport);
    const filename = `paid_bills_${startDate}_to_${endDate}.csv`;

    downloadCSV(csvContent, filename);
    closeExportModal();

    // Show success message
    showMessage(`✓ Exported ${filteredForExport.length} bills successfully!`, 'success');
    playSound(800, 0.3);
});

// Show success/error messages
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(45deg, #28a745, #20c997)' : 'linear-gradient(45deg, #dc3545, #e74c3c)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

// Edit bill functions (keeping existing functionality)
async function editBill(billId) {
    try {
        console.log("Editing bill ID:", billId);
        const res = await fetch(`/api/bills/${billId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!res.ok) {
            throw new Error('Failed to fetch bill');
        }

        const bill = await res.json();
        currentEditingId = billId;

        document.getElementById('editDiscount').value = bill.discount || 0;
        document.getElementById('editCash').value = bill.cash || 0;
        document.getElementById('editUpi').value = bill.upi || 0;
        document.getElementById('editWallet').value = bill.wallet || 0;
        document.getElementById('editLoyalty').value = bill.loyaltyPoints || 0;

        toggleUnitGroups(bill.pcUnits, bill.psUnits);

        if (bill.type === 'ps') {
            renderPsUnitsFields(bill.psUnits);
        } else {
            renderPcUnitsFields(bill.pcUnits);
        }

        document.getElementById('editModal').style.display = 'block';

    } catch (err) {
        console.error("Error loading bill:", err);
        alert("Unable to load bill details. Please try again.");
    }
}

function toggleUnitGroups(pcUnits, psUnits) {
    const pcGroup = document.getElementById('editPcUnitsGroup');
    const psGroup = document.getElementById('editPsUnitsGroup');

    pcGroup.style.display = (pcUnits && pcUnits.length > 0) ? 'block' : 'none';
    psGroup.style.display = (psUnits && psUnits.length > 0) ? 'block' : 'none';
}

function renderPcUnitsFields(pcUnits) {
    const container = document.getElementById('editPcUnitsContainer');
    container.innerHTML = '';

    pcUnits.forEach(unit => {
        const div = document.createElement('div');
        div.classList.add('pc-unit-row');

        div.innerHTML = `
            <input type="hidden" class="pc-id" value="${unit.pcId}" />
            <label>Duration:</label>
            <select class="pc-duration" required>
                <option value="60" ${unit.duration === 60 ? 'selected' : ''}>1 Hour</option>
                <option value="90" ${unit.duration === 90 ? 'selected' : ''}>1.5 Hour</option>
                <option value="120" ${unit.duration === 120 ? 'selected' : ''}>2 Hours</option>
                <option value="150" ${unit.duration === 150 ? 'selected' : ''}>2.5 Hour</option>
                <option value="180" ${unit.duration === 180 ? 'selected' : ''}>3 Hours</option>
                <option value="210" ${unit.duration === 210 ? 'selected' : ''}>3.5 Hour</option>
                <option value="240" ${unit.duration === 240 ? 'selected' : ''}>4 Hours</option>
                <option value="270" ${unit.duration === 270 ? 'selected' : ''}>4.5 Hour</option>
                <option value="300" ${unit.duration === 300 ? 'selected' : ''}>5 Hours</option>
                <option value="330" ${unit.duration === 330 ? 'selected' : ''}>5.5 Hour</option>
                <option value="360" ${unit.duration === 360 ? 'selected' : ''}>6 Hours</option>
                <option value="390" ${unit.duration === 390 ? 'selected' : ''}>6.5 Hour</option>
            </select>
        `;

        container.appendChild(div);
    });
}

function renderPsUnitsFields(psUnits) {
    const container = document.getElementById('editPsUnitsContainer');
    container.innerHTML = '';

    psUnits.forEach((unit, unitIndex) => {
        const div = document.createElement('div');
        div.className = 'ps-unit-row';
        const players = unit.players?.length ? unit.players : [{ playerNo: 1, duration: unit.duration }];

        const playerRows = players.map((p, playerIndex) => `
            <div class="player-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <label style="width: 80px;">Player ${playerIndex + 1}:</label>
                <input type="number" class="player-duration" value="${p.duration}" min="10" step="10" required style="width: 80px;" />
                <button type="button" onclick="deletePlayer(${unitIndex}, ${playerIndex})" style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 4px;">✕</button>
            </div>
        `).join('');

        div.innerHTML = `
            <input type="hidden" class="ps-id" value="${unit.psId}" />
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: bold;"> ${unit.psId}</div>
                <button type="button" onclick="togglePlayers(${unitIndex})"
                    style="background: #6c757d; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px;"
                >Show Players</button>
            </div>

            <div class="players-container" style="display: none; margin-top: 10px;">
                ${playerRows}
                <button type="button" onclick="addPlayer(${unitIndex})"
                    style="margin-top: 8px; background: #007bff; color: white; border: none; padding: 4px 10px; border-radius: 4px;"
                >+ Add Player</button>
            </div>
        `;

        container.appendChild(div);
    });
}

function togglePlayers(unitIndex) {
    const unit = document.querySelectorAll('.ps-unit-row')[unitIndex];
    const container = unit.querySelector('.players-container');
    const button = unit.querySelector('button');

    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    button.textContent = isHidden ? 'Hide Players' : 'Show Players';
}

function addPlayer(unitIndex) {
    const unit = document.querySelectorAll('.ps-unit-row')[unitIndex];
    const playersContainer = unit.querySelector('.players-container');
    const playerCount = playersContainer.querySelectorAll('.player-row').length;
    if (playerCount >= 4) {
        alert("Maximum 4 players allowed per unit.");
        return;
    }
    const newRow = document.createElement('div');
    newRow.className = 'player-row';
    newRow.style = "display: flex; align-items: center; gap: 10px; margin-bottom: 6px;";
    newRow.innerHTML = `
        <label style="width: 80px;">Player ${playerCount + 1}:</label>
        <input type="number" class="player-duration" value="60" min="10" step="10" required style="width: 80px;" />
        <button type="button" onclick="deletePlayer(${unitIndex}, ${playerCount})" style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 4px;">✕</button>
    `;
    playersContainer.insertBefore(newRow, playersContainer.lastElementChild);
}

function deletePlayer(unitIndex, playerIndex) {
    const unit = document.querySelectorAll('.ps-unit-row')[unitIndex];
    const rows = unit.querySelectorAll('.player-row');
    if (rows.length <= 1) {
        alert("At least one player is required.");
        return;
    }
    if (rows[playerIndex]) {
        rows[playerIndex].remove();
    }

    unit.querySelectorAll('.player-row').forEach((row, i) => {
        row.querySelector('label').textContent = `Player ${i + 1}:`;
        row.querySelector('button').setAttribute('onclick', `deletePlayer(${unitIndex}, ${i})`);
    });
}

// Delete bill
async function deleteBill(billId) {
    playSound(800, 0.3);
    if (confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
        try {
            const res = await fetch(`/api/bills/delete/${billId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error('Failed to delete bill');
            }

            fetchAndRenderPaidBills();
            playSound(1000, 0.2);
            showMessage('✓ Bill deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('Failed to delete the bill. Please try again.');
        }
    }
}

// Submit bill edit
async function submitBillEdit() {
    const cash = Number(document.getElementById('editCash').value) || 0;
    const upi = Number(document.getElementById('editUpi').value) || 0;
    const discount = Number(document.getElementById('editDiscount').value) || 0;
    const wallet = Number(document.getElementById('editWallet').value) || 0;
    const loyaltyPoints = Number(document.getElementById('editLoyalty').value) || 0;

    const pcUnits = Array.from(document.querySelectorAll('#editPcUnitsContainer .pc-unit-row')).map(row => ({
        pcId: row.querySelector('.pc-id').value,
        duration: parseInt(row.querySelector('.pc-duration').value)
    }));

    const psUnits = Array.from(document.querySelectorAll('#editPsUnitsContainer .ps-unit-row')).map(row => {
        const psId = row.querySelector('.ps-id').value;
        const playersContainer = row.querySelector('.players-container');
        const players = Array.from(playersContainer.querySelectorAll('.player-row')).map((playerRow, index) => {
            const duration = parseInt(playerRow.querySelector('.player-duration').value);
            return {
                playerNo: index + 1,
                duration,
            };
        });

        const duration = players.length > 0
            ? Math.max(...players.map(p => p.duration))
            : 0;

        return { psId, duration, players };
    });

    const updatedBill = {
        cash,
        upi,
        discount,
        wallet,
        loyaltyPoints
    };

    if (pcUnits.length > 0) {
        updatedBill.pcUnits = pcUnits;
    }

    if (psUnits.length > 0) {
        updatedBill.psUnits = psUnits;
    }

    try {
        const logRes = await fetch(`/api/edit/logs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ billId: currentEditingId })
        });

        if (!logRes.ok) {
            const errData = await logRes.json();
            alert(`Failed to log old bill: ${errData.message}`);
            return;
        }

        const res = await fetch(`/api/bills/edit/${currentEditingId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedBill)
        });

        if (!res.ok) {
            let errorMessage = 'Failed to update bill';
            try {
                const errorData = await res.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Parsing failed, keep default error message
            }

            alert(errorMessage);
            return;
        }

        const result = await res.json();

        if (!result.bill) {
            throw new Error('No bill data returned from server');
        }

        fetchAndRenderPaidBills();
        document.getElementById('editModal').style.display = 'none';
        showMessage('✓ Bill updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating bill:', error);
        alert('Something went wrong while updating the bill.');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingId = null;
    document.getElementById('editCash').value = '';
    document.getElementById('editUpi').value = '';
    document.getElementById('editDiscount').value = '';

    const pcContainer = document.getElementById('editPcUnitsContainer');
    pcContainer.innerHTML = '';

    const psContainer = document.getElementById('editPsUnitsContainer');
    psContainer.innerHTML = '';
    playSound(400, 0.1);
}

// Handle edit form submission
document.getElementById('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!currentEditingId) return;

    try {
        await submitBillEdit();
    } catch (err) {
        console.error('Edit submission failed:', err);
        alert('Something went wrong.');
    }
});

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const editModal = document.getElementById('editModal');
    const exportModal = document.getElementById('exportModal');

    if (event.target === editModal) {
        closeModal();
    }

    if (event.target === exportModal) {
        closeExportModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
        closeExportModal();

        const menuToggle = document.getElementById('menuToggle');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');

        if (sideMenu.classList.contains('open')) {
            menuToggle.classList.remove('active');
            sideMenu.classList.remove('open');
            menuOverlay.classList.remove('active');
        }
    }
});

// Add hover effects to table rows
function addTableEffects() {
    const tableRows = document.querySelectorAll('.bills-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', () => playSound(300, 0.05));
    });
}

// Initialize page
function initializePage() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('billsTable').style.display = 'none';
    document.getElementById('paginationContainer').style.display = 'none';

    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('billsTable').style.display = 'table';
        document.getElementById('paginationContainer').style.display = 'block';

        fetchAndRenderPaidBills();
        setupSearch();
        setupExportModal();
        addTableEffects();
        playSound(800, 0.3);
    }, 1500);
}

// Initialize everything
createGamingStickers();
createParticles();
setupMenu();
initializePage();

// Add CSS animation for success messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);