
// PC Data
const pcData = [
    { id: 1, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 2, status: 'occupied', timeRemaining: '2h 15m' },
    { id: 3, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 4, status: 'ending-soon', timeRemaining: '12m' },
    { id: 5, status: 'occupied', timeRemaining: '1h 45m' },
    { id: 6, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 7, status: 'ending-soon', timeRemaining: '8m' },
    { id: 8, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 9, status: 'occupied', timeRemaining: '3h 22m' },
    { id: 10, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 11, status: 'ending-soon', timeRemaining: '15m' },
    { id: 12, status: 'occupied', timeRemaining: '45m' },
    { id: 13, status: 'available', timeRemaining: 'Ready to Play' },
    { id: 14, status: 'available', timeRemaining: 'Ready to Play' }
];

let selectedPCs = [];
let unpaidBills = [
    { id: 1, pc: 'PC 2', hours: 2, userName: 'John Doe', contact: '123-456-7890', amount: 40 },
    { id: 2, pc: 'PC 5', hours: 1.5, userName: 'Jane Smith', contact: '098-765-4321', amount: 30 }
];

// Sidebar functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('open');
    mainContent.classList.toggle('shifted');
}

function setActiveSection(section) {
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    // Add active class to clicked item
    event.target.classList.add('active');

    // Here you can add logic to show different sections
    console.log('Active section:', section);
}

// Particle System
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Sound Effects
function playSound(frequency, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Generate PC Cards
function generatePCCards() {
    const pcGrid = document.getElementById('pcGrid');
    pcGrid.innerHTML = '';

    pcData.forEach(pc => {
        const pcCard = document.createElement('div');
        pcCard.className = `pc-card ${pc.status}`;
        pcCard.onclick = () => selectPC(pc.id);

        let extendButtons = '';
        if (pc.status === 'ending-soon' || pc.status === 'occupied') {
            extendButtons = `
                        <div class="extend-buttons">
                            <button class="extend-btn" onclick="extendTime(${pc.id}, 15); event.stopPropagation();">+15m</button>
                            <button class="extend-btn" onclick="extendTime(${pc.id}, 30); event.stopPropagation();">+30m</button>
                        </div>
                    `;
        }

        pcCard.innerHTML = `
                    <div class="pc-header">
                        <div class="pc-number">PC ${pc.id}</div>
                        <div class="pc-status ${pc.status}">${pc.status.replace('-', ' ')}</div>
                    </div>
                    <div class="pc-specs">
                        RTX 4080 • i7-13700K • 32GB RAM • 240Hz Monitor
                    </div>
                    <div class="pc-time ${pc.status}">${pc.timeRemaining}</div>
                    ${extendButtons}
                `;

        pcGrid.appendChild(pcCard);
    });

    updateStatusCounts();
}

// Update Status Counts
function updateStatusCounts() {
    const available = pcData.filter(pc => pc.status === 'available').length;
    const endingSoon = pcData.filter(pc => pc.status === 'ending-soon').length;
    const occupied = pcData.filter(pc => pc.status === 'occupied').length;

    document.getElementById('availableCount').textContent = available;
    document.getElementById('endingSoonCount').textContent = endingSoon;
    document.getElementById('occupiedCount').textContent = occupied;
}

// Select PC
function selectPC(pcId) {
    const pc = pcData.find(p => p.id === pcId);

    if (pc.status === 'occupied') {
        playSound(300, 0.3); // Error sound
        return;
    }

    playSound(600, 0.2); // Selection sound

    const pcCard = event.currentTarget;

    if (selectedPCs.includes(pcId)) {
        // Deselect PC
        selectedPCs = selectedPCs.filter(id => id !== pcId);
        pcCard.classList.remove('selected');
    } else {
        // Select PC
        selectedPCs.push(pcId);
        pcCard.classList.add('selected');
    }

    updateSelectedPCsList();

    if (selectedPCs.length > 0) {
        document.getElementById('bookSection').classList.add('show');
    } else {
        document.getElementById('bookSection').classList.remove('show');
    }
}

// Update Selected PCs List
function updateSelectedPCsList() {
    const selectedPcsList = document.getElementById('selectedPcsList');
    selectedPcsList.innerHTML = '';

    selectedPCs.forEach(pcId => {
        const pcDiv = document.createElement('div');
        pcDiv.style.cssText = 'padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
        pcDiv.innerHTML = `
                    <span>PC ${pcId}</span>
                    <button onclick="removeSelectedPC(${pcId})" style="background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
                `;
        selectedPcsList.appendChild(pcDiv);
    });
}

// Remove Selected PC
function removeSelectedPC(pcId) {
    selectedPCs = selectedPCs.filter(id => id !== pcId);
    document.querySelectorAll('.pc-card').forEach(card => {
        if (card.querySelector('.pc-number').textContent === `PC ${pcId}`) {
            card.classList.remove('selected');
        }
    });
    updateSelectedPCsList();

    if (selectedPCs.length === 0) {
        cancelSelection();
    }
}

// Cancel Selection
function cancelSelection() {
    playSound(400, 0.2);

    document.querySelectorAll('.pc-card').forEach(card => {
        card.classList.remove('selected');
    });

    selectedPCs = [];
    document.getElementById('bookSection').classList.remove('show');
}

// Book Selected PCs
function bookSelectedPCs() {
    const hours = document.getElementById('hoursSelect').value;
    const userName = document.getElementById('userName').value;
    const contactNumber = document.getElementById('contactNumber').value;

    if (!userName || !contactNumber) {
        alert('Please fill in all fields');
        return;
    }

    playSound(800, 0.3); // Success sound

    // Add to unpaid bills
    selectedPCs.forEach(pcId => {
        const newBill = {
            id: unpaidBills.length + 1,
            pc: `PC ${pcId}`,
            hours: parseFloat(hours),
            userName: userName,
            contact: contactNumber,
            amount: parseFloat(hours) * 20 // $20 per hour
        };
        unpaidBills.push(newBill);

        // Update PC status
        const pc = pcData.find(p => p.id === pcId);
        pc.status = 'occupied';
        pc.timeRemaining = `${hours}h 00m`;
    });

    updateUnpaidBills();
    generatePCCards();
    cancelSelection();

    // Clear form
    document.getElementById('userName').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('hoursSelect').value = '1';
}

// Extend Time
function extendTime(pcId, minutes) {
    playSound(600, 0.2);

    // Add to existing bill or create new one
    const existingBill = unpaidBills.find(bill => bill.pc === `PC ${pcId}`);
    const additionalAmount = (minutes / 60) * 20; // $20 per hour

    if (existingBill) {
        existingBill.hours += minutes / 60;
        existingBill.amount += additionalAmount;
    } else {
        const newBill = {
            id: unpaidBills.length + 1,
            pc: `PC ${pcId}`,
            hours: minutes / 60,
            userName: 'Extension',
            contact: 'N/A',
            amount: additionalAmount
        };
        unpaidBills.push(newBill);
    }

    updateUnpaidBills();
}

// Update Unpaid Bills
function updateUnpaidBills() {
    const unpaidBillsContainer = document.getElementById('unpaidBills');
    unpaidBillsContainer.innerHTML = '';

    if (unpaidBills.length === 0) {
        unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">No unpaid bills</div>';
        return;
    }

    unpaidBills.forEach(bill => {
        const billDiv = document.createElement('div');
        billDiv.className = 'bill-item';
        billDiv.innerHTML = `
                    <div class="bill-pc">${bill.pc}</div>
                    <div class="bill-details">
                        ${bill.userName} • ${bill.contact}<br>
                        ${bill.hours} hours
                    </div>
                    <div class="bill-amount">$${bill.amount.toFixed(2)}</div>
                    <button class="pay-btn" onclick="showPaymentModal(${bill.id})">Pay Bill</button>
                `;
        unpaidBillsContainer.appendChild(billDiv);
    });
}

// Show Payment Modal
function showPaymentModal(billId) {
    const bill = unpaidBills.find(b => b.id === billId);
    const paymentSummary = document.getElementById('paymentSummary');

    paymentSummary.innerHTML = `
                <div><strong>PC:</strong> ${bill.pc}</div>
                <div><strong>Customer:</strong> ${bill.userName}</div>
                <div><strong>Contact:</strong> ${bill.contact}</div>
                <div><strong>Hours:</strong> ${bill.hours}</div>
                <div><strong>Rate:</strong> $20/hour</div>
                <div class="payment-total">Total: $${bill.amount.toFixed(2)}</div>
            `;

    document.getElementById('paymentModal').classList.add('show');
    document.getElementById('paymentModal').dataset.billId = billId;
}

// Close Payment Modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

// Confirm Payment
function confirmPayment() {
    const billId = parseInt(document.getElementById('paymentModal').dataset.billId);

    // Remove bill from unpaid bills
    unpaidBills = unpaidBills.filter(bill => bill.id !== billId);

    updateUnpaidBills();
    closePaymentModal();

    playSound(800, 0.5); // Success sound

    // Show success message
    setTimeout(() => {
        alert('Payment successful!');
    }, 100);
}

// Simulate real-time updates
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Randomly update some PCs
        const randomIndex = Math.floor(Math.random() * pcData.length);
        const pc = pcData[randomIndex];

        if (pc.status === 'ending-soon') {
            // Simulate time countdown
            const currentTime = parseInt(pc.timeRemaining);
            if (currentTime > 1) {
                pc.timeRemaining = (currentTime - 1) + 'm';
            } else {
                pc.status = 'available';
                pc.timeRemaining = 'Ready to Play';
            }
        } else if (pc.status === 'occupied') {
            // Randomly make some PCs available
            if (Math.random() < 0.02) { // 2% chance per update
                pc.status = 'available';
                pc.timeRemaining = 'Ready to Play';
            }
        }

        generatePCCards();
    }, 5000); // Update every 5 seconds
}

// Initialize
createParticles();
generatePCCards();
updateUnpaidBills();
simulateRealTimeUpdates();

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        cancelSelection();
        closePaymentModal();
    }
});

// Close sidebar when clicking outside
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
        document.getElementById('mainContent').classList.remove('shifted');
    }
});
