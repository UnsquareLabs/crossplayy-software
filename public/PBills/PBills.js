const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized access. Please log in first.');
    window.location.href = '../login/login.html'; // Redirect to login page

}
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        window.location.href = '../login/login.html';
    }
}
// Sample data - replace with actual API calls
let billsData = [];

let currentEditingId = null;

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

// Sound Effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

// Call this on the first user gesture to enable audio
function initAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    audioInitialized = true;
}

function playSound(frequency, duration) {
    try {
        if (!audioInitialized) {
            // AudioContext not started yet, so don't play sound
            return;
        }

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

// Example: Call initAudioContext on first user interaction
window.addEventListener('click', () => {
    if (!audioInitialized) {
        initAudioContext();
    }
}, { once: true });


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

    // Menu item hover effects
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

// Format  Units
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


// Render bills table
function renderBills(bills) {
    const tbody = document.getElementById('billsTableBody');

    if (bills.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    No paid bills found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bills.map(bill => `
        <tr>
            <td>${bill.userName}</td>
            <td>${bill.contactNo}</td>
            <td>
  ${formatUnits(bill)}
  ${
    Array.isArray(bill.extensions) && bill.extensions.length > 0
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
            <td> ₹${bill.wallet || 0}</td>
            <td> ₹${bill.loyaltyPoints || 0}</td>
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
}


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

        // Fill form with editable fields
        document.getElementById('editDiscount').value = bill.discount || 0;
        document.getElementById('editCash').value = bill.cash || 0;
        document.getElementById('editUpi').value = bill.upi || 0;
        document.getElementById('editWallet').value = bill.wallet || 0;
        document.getElementById('editLoyalty').value = bill.loyaltyPoints || 0;
        // Example inside your editBill after units are loaded
        toggleUnitGroups(bill.pcUnits, bill.psUnits);

        // Conditionally render units
        if (bill.type === 'ps') {
            renderPsUnitsFields(bill.psUnits);
        } else {
            renderPcUnitsFields(bill.pcUnits);
        }

        // Show modal
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
function togglePlayerDetails(button) {
    const container = button.nextElementSibling;
    const isVisible = container.style.display === 'block';

    container.style.display = isVisible ? 'none' : 'block';
    button.textContent = isVisible ? 'Show Players' : 'Hide Players';
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

    // Re-label player numbers and reset button handlers
    unit.querySelectorAll('.player-row').forEach((row, i) => {
        row.querySelector('label').textContent = `Player ${i + 1}:`;
        row.querySelector('button').setAttribute('onclick', `deletePlayer(${unitIndex}, ${i})`);
    });
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

        // Update local billsData with fetched data
        billsData = allBills.filter(bill => bill.status === true);

        renderBills(billsData);
    } catch (error) {
        console.error('Error fetching paid bills:', error);
        const tbody = document.getElementById('billsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: red;">
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
        const filteredBills = billsData.filter(bill =>
            bill.userName.toLowerCase().includes(searchTerm) ||
            bill.contactNo.includes(searchTerm)
            // bill.pcUnits.some(unit => unit.pcId.toLowerCase().includes(searchTerm))
        );
        renderBills(filteredBills);
        playSound(400, 0.1);
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

            // Remove from local state and re-render
            // billsData = billsData.filter(bill => bill._id !== billId);
            fetchAndRenderPaidBills();
            playSound(1000, 0.2);

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #28a745, #20c997);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                z-index: 1001;
                animation: slideIn 0.3s ease;
            `;
            successMsg.textContent = '✓ Bill deleted successfully!';
            document.body.appendChild(successMsg);

            setTimeout(() => {
                successMsg.remove();
            }, 3000);
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('Failed to delete the bill. Please try again.');
        }
    }
}

// Edit bill
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
        // 🔁 Step 1: Log the old bill before updating
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
            // Try to parse error message from response body
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
            return; // stop execution here
        }

        // ✅ You forgot to parse the successful JSON response
        const result = await res.json();

        if (!result.bill) {
            throw new Error('No bill data returned from server');
        }

        fetchAndRenderPaidBills();
        document.getElementById('editModal').style.display = 'none';
        alert('✓ Bill updated successfully!');
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
    // Clear PC units container
    const pcContainer = document.getElementById('editPcUnitsContainer');
    pcContainer.innerHTML = '';

    // Clear PS units container
    const psContainer = document.getElementById('editPsUnitsContainer');
    psContainer.innerHTML = '';
    playSound(400, 0.1);
}

// Handle edit form submission
document.getElementById('editForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!currentEditingId) return;

    try {
        await submitBillEdit(); // 🔧 Now the backend will be called properly
    } catch (err) {
        console.error('Edit submission failed:', err);
        alert('Something went wrong.');
    }
});


// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
        // Close menu if open
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
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('billsTable').style.display = 'none';

    // Simulate loading delay
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('billsTable').style.display = 'table';

        fetchAndRenderPaidBills();
        setupSearch();
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
