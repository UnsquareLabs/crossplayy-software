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
    // const type = bill.type?.toUpperCase() || 'PC'; // Default to PC if undefined
    const units = bill.type === 'ps' ? bill.psUnits : bill.pcUnits;

    return units.map(unit => {
        if (bill.type === 'ps') {
            const playerInfo = unit.players ? ` (${unit.players}P)` : '';
            return `<span class="pc-units">${unit.psId}: ${unit.duration}min${playerInfo}</span>`;
        } else {
            return `<span class="pc-units">${unit.pcId}: ${unit.duration}min</span>`;
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
            <td>${formatUnits(bill)}</td>
            <td>${formatDate(bill.bookingTime)}</td>
            <td class="amount">₹${bill.amount.toLocaleString()}</td>
            <td><span class="status-badge status-paid">Paid</span></td>
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
        const res = await fetch(`http://localhost:3000/api/bills/${billId}`);
        if (!res.ok) {
            throw new Error('Failed to fetch bill');
        }

        const data = await res.json();
        const bill = data;

        currentEditingId = billId;

        // Fill modal form with fetched data
        document.getElementById('editUserName').value = bill.userName;
        document.getElementById('editContactNo').value = bill.contactNo;
        document.getElementById('editAmount').value = bill.amount;
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

function renderPcUnitsFields(pcUnits) {
    const container = document.getElementById('editPcUnitsContainer');
    container.innerHTML = ''; // Clear existing

    pcUnits.forEach((unit) => {
        const pcRow = document.createElement('div');
        pcRow.className = 'pc-unit-row';
        pcRow.innerHTML = `
            <input type="text" placeholder="PC ID" value="${unit.pcId}" class="pc-id" readonly />
            <input type="number" placeholder="Duration (min)" value="${unit.duration}" class="pc-duration" />
        `;
        container.appendChild(pcRow);
    });
}
function renderPsUnitsFields(psUnits) {
    const container = document.getElementById('editPsUnitsContainer');
    container.innerHTML = ''; // Clear existing

    psUnits.forEach((unit) => {
        const psRow = document.createElement('div');
        psRow.className = 'ps-unit-row';
        psRow.innerHTML = `
            <input type="text" placeholder="PS ID" value="${unit.psId}" class="ps-id" readonly />
            <input type="number" placeholder="no of players" value="${unit.players}" class="ps-players" />
            <input type="number" placeholder="Duration (min)" value="${unit.duration}" class="ps-duration" />
        `;
        container.appendChild(psRow);
    });
}



// Fetch and render paid bills
async function fetchAndRenderPaidBills() {
    try {
        const res = await fetch('http://localhost:3000/api/bills/all');
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
            const res = await fetch(`http://localhost:3000/api/bills/delete/${billId}`, {
                method: 'DELETE',
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
    const userName = document.getElementById('editUserName').value;
    const contactNo = document.getElementById('editContactNo').value;
    const amount = Number(document.getElementById('editAmount').value);

    const pcUnits = Array.from(document.querySelectorAll('#editPcUnitsContainer .pc-unit-row')).map(row => ({
        pcId: row.querySelector('.pc-id').value,
        duration: parseInt(row.querySelector('.pc-duration').value)
    }));

    const psUnits = Array.from(document.querySelectorAll('#editPsUnitsContainer .ps-unit-row')).map(row => ({
        psId: row.querySelector('.ps-id').value,
        duration: parseInt(row.querySelector('.ps-duration').value),
        players: parseInt(row.querySelector('.ps-players').value)
    }));
    const updatedBill = {
        userName,
        contactNo,
        amount
    };

    if (pcUnits.length > 0) {
        updatedBill.pcUnits = pcUnits;
    }

    if (psUnits.length > 0) {
        updatedBill.psUnits = psUnits;
    }
    try {
        const res = await fetch(`http://localhost:3000/api/bills/edit/${currentEditingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedBill)
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('Non-OK response:', text);
            throw new Error('Failed to update bill');
        }

        // Only parse JSON if there's content
        const text = await res.text();
        const result = text ? JSON.parse(text) : {};

        if (!result.bill) {
            throw new Error('No bill data returned from server');
        }

        fetchAndRenderPaidBills();
        document.getElementById('editModal').style.display = 'none';
        alert('✓ Bill updated successfully!');
    } catch (error) {
        console.error('Error updating bill:', error);
        alert('Failed to update bill. Check your input and try again.');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingId = null;
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
