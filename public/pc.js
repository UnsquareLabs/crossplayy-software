
// PC Data
const pcData = [
    { id: 1, status: 'available' }, { id: 2, status: 'available' }, { id: 3, status: 'available' }, { id: 4, status: 'available' }, { id: 5, status: 'available' },
    { id: 6, status: 'available' }, { id: 7, status: 'available' }, { id: 8, status: 'available' }, { id: 9, status: 'available' }, { id: 10, status: 'available' },
    { id: 11, status: 'available' }, { id: 12, status: 'available' }, { id: 13, status: 'available' }, { id: 14, status: 'available' }
];


let selectedPCs = [];


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

async function fetchPCStatus(pcId) {
    try {
        const res = await fetch(`http://localhost:3000/api/pc/timeleft/PC${pcId}`);
        const data = await res.json();

        let minutes = data.timeLeft;
        let status = 'available';
        let timeRemaining = 'Ready to Play';

        if (typeof minutes === 'number' && minutes > 0) {
            if (minutes <= 15) {
                status = 'ending-soon';
                timeRemaining = `${minutes}m`;
            } else {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                timeRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                status = 'occupied';
            }
        }

        // Check unpaid bills only if status is still 'available'
        if (status === 'available') {
            const billsRes = await fetch('http://localhost:3000/api/bills/all');
            const bills = await billsRes.json();

            for (const bill of bills) {
                if (!bill.status) {
                    const pcUnitMatch = bill.pcUnits.find(unit => unit.pcId === `PC${pcId}`);
                    if (pcUnitMatch) {
                        return {
                            status: 'payment-due',
                            timeRemaining: 'Payment Due'
                        };
                    }
                }
            }
        }

        return { status, timeRemaining };

    } catch (err) {
        console.error(`Error fetching time for PC ${pcId}`, err);
        return { status: 'available', timeRemaining: 'Ready to Play' };
    }
}

async function initializePCCards() {
    const pcGrid = document.getElementById('pcGrid');
    pcGrid.innerHTML = '';

    for (const pc of pcData) {
        const pcCard = document.createElement('div');
        pcCard.id = `pc-card-${pc.id}`;
        pcCard.className = `pc-card available`; // default
        pcCard.onclick = () => selectPC(pc.id);

        pcCard.innerHTML = `
            <div class="pc-header">
                <div class="pc-number">PC ${pc.id}</div>
                <div class="pc-status">Loading...</div>
            </div>
            <div class="pc-specs">
                RTX 4080 • i7-13700K • 32GB RAM • 240Hz Monitor
            </div>
            <div class="pc-time">Checking...</div>
            <div class="extend-buttons"></div>
        `;

        pcGrid.appendChild(pcCard);
    }

    // Start live update loop
    updatePCTimes(); // First run immediately
    setInterval(updatePCTimes, 60000); // Every 1 min
}
async function updatePCTimes() {
    for (const pc of pcData) {
        const card = document.getElementById(`pc-card-${pc.id}`);
        const statusDiv = card.querySelector('.pc-status');
        const timeDiv = card.querySelector('.pc-time');
        const extendDiv = card.querySelector('.extend-buttons');

        const { status, timeRemaining } = await fetchPCStatus(pc.id);

        pc.status = status;
        // Set card class
        card.className = `pc-card ${status}`;

        // Update status and time
        statusDiv.textContent = status.replace('-', ' ');
        statusDiv.className = `pc-status ${status}`;
        timeDiv.textContent = timeRemaining;
        timeDiv.className = `pc-time ${status}`;

        // Update extend buttons
        if (status === 'occupied' || status === 'ending-soon') {
            extendDiv.innerHTML = `
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 15); event.stopPropagation();">+15m</button>
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 30); event.stopPropagation();">+30m</button>
            `;
        } else {
            extendDiv.innerHTML = '';
        }
    }

    updateStatusCounts(); // Recalculate counts
}
function confirmExtend(pcId, minutes) {
    const price = minutes === 15 ? 20 : 25;
    const confirmed = confirm(`Are you sure you want to extend PC ${pcId} by ${minutes} minutes for ₹${price}?`);
    if (confirmed) {
        extendTime(pcId, minutes);
    }
}


// Update Status Counts
function updateStatusCounts() {
    const pcCards = document.querySelectorAll('.pc-card');

    let available = 0;
    let endingSoon = 0;
    let occupied = 0;

    pcCards.forEach(card => {
        if (card.classList.contains('available')) available++;
        else if (card.classList.contains('ending-soon')) endingSoon++;
        else if (card.classList.contains('occupied')) occupied++;
    });

    document.getElementById('availableCount').textContent = available;
    document.getElementById('endingSoonCount').textContent = endingSoon;
    document.getElementById('occupiedCount').textContent = occupied;
}


// Select PC
function selectPC(pcId) {
    console.log(`Trying to select PC: ${pcId}`);

    const pc = pcData.find(p => p.id === pcId);
    console.log('Found PC data:', pc);

    if (!pc) {
        console.warn(`PC with ID ${pcId} not found in pcData.`);
        return;
    }

    if (pc.status !== 'available') {
        console.warn(`PC ${pcId} is not available. Status: ${pc.status}`);
        playSound(300, 0.3); // Error sound
        return;
    }

    playSound(600, 0.2); // Selection sound
    const pcCard = event.currentTarget;

    if (selectedPCs.includes(pcId)) {
        console.log(`Deselecting PC: ${pcId}`);
        selectedPCs = selectedPCs.filter(id => id !== pcId);
        pcCard.classList.remove('selected');
    } else {
        console.log(`Selecting PC: ${pcId}`);
        selectedPCs.push(pcId);
        pcCard.classList.add('selected');
    }

    updateSelectedPCsList();

    if (selectedPCs.length > 0) {
        console.log(`Selected PCs:`, selectedPCs);
        document.getElementById('bookSection').classList.add('show');
    } else {
        console.log(`No PCs selected.`);
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
async function bookSelectedPCs() {
    const hours = document.getElementById('hoursSelect').value;
    const userName = document.getElementById('userName').value;
    const contactNumber = document.getElementById('contactNumber').value;

    if (!userName || !contactNumber) {
        alert('Please fill in all fields');
        return;
    }

    const duration = parseInt(hours) * 60; // convert to minutes

    // Prepare bookings array
    const bookings = selectedPCs.map(pcId => ({
        pcId: `PC${pcId}`,
        duration
    }));

    try {
        const response = await fetch('http://localhost:3000/api/pc/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookings })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(`Booking failed: ${result.message}`);
            return;
        }

        // 2. Create a bill
        const billPayload = {
            userName,
            contactNo: contactNumber,
            pcUnits: bookings
        };

        const billResponse = await fetch('http://localhost:3000/api/bills/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billPayload)
        });

        const billResult = await billResponse.json();

        if (!billResponse.ok) {
            alert(`Billing failed: ${billResult.message}`);
            return;
        }

        playSound(800, 0.3); // Success sound



        await updateUnpaidBills();
        await initializePCCards(); // Refresh with live status
        cancelSelection();

        // Clear form
        document.getElementById('userName').value = '';
        document.getElementById('contactNumber').value = '';
        document.getElementById('hoursSelect').value = '1';

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed. Please try again.');
    }
}

// Extend Time
async function extendTime(pcId, minutes) {
    playSound(600, 0.2);

    try {
        // Step 1: Extend bill
        const billResponse = await fetch('http://localhost:3000/api/bills/extend-bill', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pcId: `PC${pcId}`, extendTime: minutes })
        });

        const billData = await billResponse.json();

        if (billResponse.ok) {
            console.log("✅ Updated bill:", billData.bill);
        } else {
            console.warn("⚠️ Failed to update bill:", billData.message);
        }

        // Step 2: Extend PC Booking
        const bookingResponse = await fetch('http://localhost:3000/api/pc/extend-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pcId: `PC${pcId}`, extendDuration: minutes }) // match backend key
        });

        const bookingData = await bookingResponse.json();

        if (bookingResponse.ok) {
            console.log("✅ PC duration extended:", bookingData.pc);
        } else {
            console.warn("⚠️ Failed to extend PC booking:", bookingData.message);
        }

        updatePCTimes();
        // Optionally refresh UI like unpaid bills or PC cards
        updateUnpaidBills();

    } catch (error) {
        console.error("❌ Error extending time:", error);
    }
}



// Update Unpaid Bills
async function updateUnpaidBills() {
    const unpaidBillsContainer = document.getElementById('unpaidBills');
    unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">Loading bills...</div>';

    try {
        const res = await fetch('http://localhost:3000/api/bills/all');
        const bills = await res.json();

        unpaidBillsContainer.innerHTML = '';

        const unpaid = bills.filter(bill => !bill.status);

        if (unpaid.length === 0) {
            unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">No unpaid bills</div>';
            return;
        }

        unpaid.forEach(bill => {
            const pcs = bill.pcUnits.map(pc => {
                const hours = Math.floor(pc.duration / 60);
                const mins = pc.duration % 60;
                let timeStr = '';
                if (hours > 0) timeStr += `${hours} hr `;
                if (mins > 0) timeStr += `${mins} min`;
                return `${pc.pcId} (${timeStr.trim()})`;
            }).join(', ');
            const bookingDate = new Date(bill.bookingTime);
            const istTime = bookingDate.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const billDiv = document.createElement('div');
            billDiv.className = 'bill-item';
            billDiv.innerHTML = `
                <div class="bill-pc">${bill.userName} • ${bill.contactNo}<br></div>
                <div class="bill-details">
                    ${pcs}<br>
                    <small>Booked at: ${istTime}</small>
                </div>
                <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
                <button class="pay-btn" onclick="showPaymentModal('${bill._id}')">Pay Bill</button>
            `;
            unpaidBillsContainer.appendChild(billDiv);
        });
    } catch (err) {
        console.error('Error fetching bills:', err);
        unpaidBillsContainer.innerHTML = '<div style="text-align: center; color: red;">Failed to load bills</div>';
    }
}


// Show Payment Modal
async function showPaymentModal(billId) {
    try {
        const res = await fetch(`http://localhost:3000/api/bills/${billId}`);
        if (!res.ok) {
            throw new Error('Failed to fetch bill details');
        }

        const bill = await res.json();

        // Format booking time nicely (e.g., "2025-05-27 14:30")
        const bookingDate = new Date(bill.bookingTime);
        const formattedBookingTime = bookingDate.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
        });

        // Build PC usage list with durations
        const pcUsageList = bill.pcUnits.map(unit => {
            return `<div>• ${unit.pcId} - ${unit.duration} mins</div>`;
        }).join('');

        const paymentSummary = document.getElementById('paymentSummary');
        paymentSummary.innerHTML = `
            <div><strong>Booking Time:</strong> ${formattedBookingTime}</div>
            <div><strong>Customer Name:</strong> ${bill.userName}</div>
            <div><strong>Contact No:</strong> ${bill.contactNo}</div>
            <div><strong>PC Used:</strong></div>
            <div style="margin-left: 15px;">${pcUsageList}</div>
            <div class="payment-total" style="margin-top: 10px;"><strong>Total Amount:</strong> ₹${bill.amount.toFixed(2)}</div>
        `;

        const paymentModal = document.getElementById('paymentModal');
        paymentModal.classList.add('show');
        paymentModal.dataset.billId = bill._id;

    } catch (error) {
        console.error('Error loading bill:', error);
        alert('Unable to load bill details. Please try again.');
    }
}



// Close Payment Modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

// Confirm Payment
async function confirmPayment() {
    const billId = document.getElementById('paymentModal').dataset.billId;

    try {
        // Call backend to mark bill as paid
        const response = await fetch(`http://localhost:3000/api/bills/${billId}/pay`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update bill status');
        }

        // Step 2: Fetch the updated bill data to get user info
        const billRes = await fetch(`http://localhost:3000/api/bills/${billId}`);
        const bill = await billRes.json();

        if (!billRes.ok) {
            throw new Error('Failed to fetch updated bill details');
        }

        // Step 3: Send customer data to /api/customer/create
        const customerPayload = {
            name: bill.userName,
            contactNo: bill.contactNo,
            loyaltyPoints: Math.floor(bill.amount / 100)*5 // 1 point per ₹10
        };

        const customerRes = await fetch('http://localhost:3000/api/customer/createOrAdd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerPayload)
        });

        const customerResult = await customerRes.json();

        if (!customerRes.ok) {
            console.warn('Customer save failed:', customerResult.message);
        } else {
            console.log('Customer update result:', customerResult.message);
        }

        updatePCTimes();
        updateUnpaidBills();
        closePaymentModal();

        playSound(800, 0.5); // Success sound

        setTimeout(() => {
            alert('Payment successful!');
        }, 100);

    } catch (error) {
        console.error('Error updating bill status:', error);
        alert('Failed to confirm payment. Please try again.');
    }
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
        // initializePCCards();
    }, 5000); // Update every 5 seconds
}

// Initialize
createParticles();
initializePCCards();
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
