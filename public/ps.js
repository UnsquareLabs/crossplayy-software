const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized access. Please log in first.');
    window.location.href = 'login.html'; // Redirect to login page
}
// PS Data
const psData = [
    { id: 1, status: 'available' }, { id: 2, status: 'available' }, { id: 3, status: 'available' }, { id: 4, status: 'available' }, { id: 5, status: 'available' },
    { id: 6, status: 'available' }, { id: 7, status: 'available' }
];
let psPlayersMap = {};
let selectedPS5s = [];
let snacksData = [];
let snacksCart = [];
let currentBillId = null;
let selectedBillInfo = null;

// Sidebar functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('open');
    mainContent.classList.toggle('shifted');
}

function setActiveSection(section) {
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
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

// Snacks Workflow Functions
async function startSnacksWorkflow() {
    try {
        const response = await fetch('http://localhost:3000/api/bills/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const bills = await response.json();

        const unpaidBills = bills.filter(bill => !bill.status && bill.type == 'ps');

        if (unpaidBills.length === 0) {
            alert('No unpaid bills available!');
            return;
        }

        showBillSelectionModal(unpaidBills);
        playSound(600, 0.2);
    } catch (error) {
        console.error('Error fetching bills:', error);
        alert('Failed to load bills. Please try again.');
    }
}

function showBillSelectionModal(bills) {
    const modal = document.getElementById('billSelectionModal');
    const billsList = document.getElementById('billSelectionList');

    billsList.innerHTML = bills.map(bill => {
        const pss = bill.psUnits.map(ps => {
            const hours = Math.floor(ps.duration / 60);
            const mins = ps.duration % 60;
            let timeStr = '';
            if (hours > 0) timeStr += `${hours} hr `;
            if (mins > 0) timeStr += `${mins} min`;
            return `${ps.psId} (${timeStr.trim()})`;
        }).join(', ');

        const bookingDate = new Date(bill.bookingTime);
        const istTime = bookingDate.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="bill-item selectable" onclick="selectBillForSnacks('${bill._id}', '${bill.userName}', '${pss}')">
                <div class="bill-ps">${bill.userName} • ${bill.contactNo}</div>
                <div class="bill-details">
                    ${pss}<br>
                    <small>Booked at: ${istTime}</small>
                </div>
                <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    modal.classList.add('show');
}

function selectBillForSnacks(billId, userName, ps5s) {
    currentBillId = billId;
    selectedBillInfo = { userName, ps5s };

    closeBillSelection();
    // Add a small delay to ensure modal is fully hidden
    setTimeout(() => {
        openSnacksPanel();
        playSound(800, 0.2);
    }, 50); // 50ms delay
    // openSnacksPanel();
    // playSound(800, 0.2);
}

function closeBillSelection() {
    document.getElementById('billSelectionModal').classList.remove('show');
}

async function openSnacksPanel() {
    const snacksPanel = document.getElementById('snacksPanel');
    const selectedBillInfoDiv = document.getElementById('selectedBillInfo');

    // Update selected bill info
    if (selectedBillInfo) {
        selectedBillInfoDiv.innerHTML = `
            <strong>Selected Bill:</strong> ${selectedBillInfo.userName}<br>
            <small>${selectedBillInfo.ps5s}</small>
        `;
    }

    snacksPanel.classList.add('open');
    console.log("opened");

    // Load snacks data if not already loaded
    if (snacksData.length === 0) {
        await loadSnacksData();
    }
}

function closeSnacksPanel() {
    document.getElementById('snacksPanel').classList.remove('open');
    // Reset workflow state
    currentBillId = null;
    selectedBillInfo = null;
    clearCart();
    playSound(400, 0.2);
}

async function loadSnacksData() {
    try {
        const response = await fetch('http://localhost:3000/api/snacks/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch snacks');
        }

        snacksData = await response.json();
        renderSnacksGrid();
        setupSnacksSearch();
        setupCategoryFilter();
    } catch (error) {
        console.error('Error loading snacks:', error);
        document.getElementById('snacksGrid').innerHTML =
            '<div style="text-align: center; color: #ff453a; padding: 20px;">Failed to load snacks</div>';
    }
}

async function fetchSnackImage(snackId, token) {
    try {
        const res = await fetch(`/api/snacks/image/${snackId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error('Image fetch failed');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('Failed to fetch image for snack:', snackId, err);
        return ''; // fallback: empty src or placeholder image url
    }
}

async function renderSnacksGrid(filteredSnacks = null) {
    const snacksGrid = document.getElementById('snacksGrid');
    const snacksToRender = filteredSnacks || snacksData;
    const token = localStorage.getItem('token');  // get your JWT token

    if (snacksToRender.length === 0) {
        snacksGrid.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 20px;">No snacks found</div>';
        return;
    }

    // First render the markup with placeholder src for images
    snacksGrid.innerHTML = snacksToRender.map(snack => {
        const cartItem = snacksCart.find(item => item.id === snack._id);
        const quantityInCart = cartItem ? cartItem.quantity : 0;
        const isOutOfStock = snack.quantity <= 0;

        return `
      <div class="snack-item" data-category="${snack.category}" id="snack-${snack._id}">
        <div class="snack-header">
          <img src="" alt="${snack.name}" class="snack-img-preview" id="snack-img-${snack._id}" />
          <div class="snack-info">
            <h4>${snack.name}</h4>
            <div class="snack-price">₹${snack.price}</div>
          </div>
          <div class="snack-stock ${isOutOfStock ? 'out-of-stock' : ''}">
            ${isOutOfStock ? 'Out of Stock' : `${snack.quantity} left`}
          </div>
        </div>
        <div class="snack-controls">
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateSnackQuantity('${snack._id}', -1)" 
              ${quantityInCart <= 0 ? 'disabled' : ''}>-</button>
            <div class="quantity-display">${quantityInCart}</div>
            <button class="qty-btn" onclick="updateSnackQuantity('${snack._id}', 1)" 
              ${isOutOfStock || quantityInCart >= snack.quantity ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Then fetch each snack image with auth and update src dynamically
    for (const snack of snacksToRender) {
        const imgSrc = await fetchSnackImage(snack._id, token);
        if (imgSrc) {
            const imgElement = document.getElementById(`snack-img-${snack._id}`);
            if (imgElement) {
                imgElement.src = imgSrc;
            }
        }
    }
}


function updateSnackQuantity(snackId, change) {
    const snack = snacksData.find(s => s._id === snackId);
    if (!snack) return;

    const existingCartItem = snacksCart.find(item => item.id === snackId);

    if (existingCartItem) {
        existingCartItem.quantity += change;
        if (existingCartItem.quantity <= 0) {
            snacksCart = snacksCart.filter(item => item.id !== snackId);
        }
    } else if (change > 0) {
        snacksCart.push({
            id: snackId,
            name: snack.name,
            price: snack.price,
            quantity: 1
        });
    }

    playSound(change > 0 ? 800 : 400, 0.1);
    renderSnacksGrid();
    updateSnacksCart();
}

function updateSnacksCart() {
    const cartContainer = document.getElementById('snacksCart');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    if (snacksCart.length === 0) {
        cartContainer.style.display = 'none';
        return;
    }

    cartContainer.style.display = 'block';

    let total = 0;
    cartItems.innerHTML = snacksCart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">${item.quantity} × ₹${item.price}</div>
                </div>
                <div class="cart-item-total">₹${itemTotal}</div>
            </div>
        `;
    }).join('');

    cartTotal.textContent = `₹${total}`;
}

function clearCart() {
    snacksCart = [];
    renderSnacksGrid();
    updateSnacksCart();
    playSound(400, 0.3);
}

async function addCartToBill() {
    if (snacksCart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    if (!currentBillId) {
        alert('No bill selected!');
        return;
    }

    try {
        // Add snacks to bill
        const response = await fetch(`http://localhost:3000/api/bills/${currentBillId}/add-snacks`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ snacks: snacksCart })
        });

        if (!response.ok) {
            throw new Error('Failed to add snacks to bill');
        }

        // Update snack quantities in database
        for (const cartItem of snacksCart) {
            await fetch(`http://localhost:3000/api/snacks/${cartItem.id}/update-quantity`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantityUsed: cartItem.quantity })
            });
        }

        // Success feedback
        playSound(1000, 0.5);
        alert('Snacks added to bill successfully!');

        // Clean up and refresh
        closeSnacksPanel();
        updateUnpaidBills();

        // Reload snacks data to reflect updated quantities
        await loadSnacksData();

    } catch (error) {
        console.error('Error adding snacks to bill:', error);
        alert('Failed to add snacks to bill. Please try again.');
    }
}

function setupSnacksSearch() {
    const searchInput = document.getElementById('snacksSearch');
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const filteredSnacks = snacksData.filter(snack =>
            snack.name.toLowerCase().includes(searchTerm)
        );
        renderSnacksGrid(filteredSnacks);
    });
}

function setupCategoryFilter() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            const filteredSnacks = category === 'all' ?
                snacksData :
                snacksData.filter(snack => snack.category === category);

            renderSnacksGrid(filteredSnacks);
            playSound(500, 0.1);
        });
    });
}

// PS Management Functions
async function fetchPSStatus(psId) {
    try {
        const res = await fetch(`http://localhost:3000/api/ps/timeleft/PS${psId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
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

        if (status === 'available') {
            const billsRes = await fetch('http://localhost:3000/api/bills/all', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const bills = await billsRes.json();

            for (const bill of bills) {
                if (!bill.status && bill.type === 'ps') {
                    const psUnitMatch = bill.psUnits.find(unit => unit.psId === `PS${psId}`);
                    if (psUnitMatch) {
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
        console.error(`Error fetching time for PS5 ${psId}`, err);
        return { status: 'available', timeRemaining: 'Ready to Play' };
    }
}

async function initializePSCards() {
    const psGrid = document.getElementById('psGrid');
    psGrid.innerHTML = '';

    for (const ps of psData) {
        const psCard = document.createElement('div');
        psCard.id = `ps-card-${ps.id}`;
        psCard.className = `ps-card available`;
        psCard.onclick = () => selectPS(ps.id);

        psCard.innerHTML = `
            <div class="ps-header">
                <div class="ps-number">PS5 ${ps.id}</div>
                <div class="ps-status">Loading...</div>
            </div>
            <div class="ps-specs">
                PS5 • AMD Zen 2 • DualSense Controller • 4K HDR Gaming
            </div>
            <div class="ps-time">Checking...</div>
            <div class="extend-buttons"></div>
            <div class="unfreeze-button"></div>
        `;

        psGrid.appendChild(psCard);
    }

    updatePSTimes();
    setInterval(updatePSTimes, 60000);
}
async function unfreezePS(formattedPsId) {
    const psId = formattedPsId.toString().startsWith('ps') ? formattedPsId : `PS${formattedPsId}`;
    try {
        const res = await fetch('http://localhost:3000/api/ps/unfreeze', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ psId })
        });

        const data = await res.json();
        if (res.ok) {
            alert(`✓ PS ${psId} unfrozen successfully.`);
            // Optionally re-render the PC cards
            updatePSTimes();
            console.log(formattedPsId);
        } else {
            alert(`Failed to unfreeze PS: ${data.message}`);
        }
    } catch (err) {
        console.error('Error unfreezing PS:', err);
        alert('An unexpected error occurred.');
    }
}
async function updatePSTimes() {
    for (const ps of psData) {
        const card = document.getElementById(`ps-card-${ps.id}`);
        const statusDiv = card.querySelector('.ps-status');
        const timeDiv = card.querySelector('.ps-time');
        const extendDiv = card.querySelector('.extend-buttons');
        const unfreeze = card.querySelector('.unfreeze-button');

        const { status, timeRemaining } = await fetchPSStatus(ps.id);

        ps.status = status;
        card.className = `ps-card ${status}`;

        statusDiv.textContent = status.replace('-', ' ');
        statusDiv.className = `ps-status ${status}`;
        timeDiv.textContent = timeRemaining;
        timeDiv.className = `ps-time ${status}`;

        if (status === 'occupied' || status === 'ending-soon') {
            extendDiv.innerHTML = `
                <button class="extend-btn" onclick="confirmExtend(${ps.id}, 15); event.stopPropagation();">+15m</button>
                <button class="extend-btn" onclick="confirmExtend(${ps.id}, 30); event.stopPropagation();">+30m</button>
            `;
            unfreeze.innerHTML = `
                <button class="unfreeze-btn" onclick="event.stopPropagation(); unfreezePS('${ps.id}')">Unfreeze</button>
            `
        } else {
            extendDiv.innerHTML = '';
            unfreeze.innerHTML = '';
        }
    }

    updateStatusCounts();
}

function confirmExtend(psId, minutes) {
    const price = minutes === 15 ? 20 : 25;
    const confirmed = confirm(`Are you sure you want to extend PS ${psId} by ${minutes} minutes for ₹${price}?`);
    if (confirmed) {
        extendTime(psId, minutes);
    }
}

function updateStatusCounts() {
    const psCards = document.querySelectorAll('.ps-card');

    let available = 0;
    let endingSoon = 0;
    let occupied = 0;

    psCards.forEach(card => {
        if (card.classList.contains('available')) available++;
        else if (card.classList.contains('ending-soon')) endingSoon++;
        else if (card.classList.contains('occupied')) occupied++;
    });

    document.getElementById('availableCount').textContent = available;
    document.getElementById('endingSoonCount').textContent = endingSoon;
    document.getElementById('occupiedCount').textContent = occupied;
}

function selectPS(psId) {
    console.log(`Trying to select PS: ${psId}`);

    const ps = psData.find(p => p.id === psId);
    console.log('Found PS5 data:', ps);

    if (!ps) {
        console.warn(`PS with ID ${psId} not found in psData.`);
        return;
    }

    if (ps.status !== 'available') {
        console.warn(`PS ${psId} is not available. Status: ${ps.status}`);
        playSound(300, 0.3);
        return;
    }

    playSound(600, 0.2);
    const psCard = event.currentTarget;

    if (selectedPS5s.includes(psId)) {
        // Deselect
        selectedPS5s = selectedPS5s.filter(id => id !== psId);
        delete psPlayersMap[psId];
        psCard.classList.remove('selected');
    } else {
        // Select
        selectedPS5s.push(psId);
        psPlayersMap[psId] = 1; // default to 1 player
        psCard.classList.add('selected');
    }


    updateSelectedPSsList();

    if (selectedPS5s.length > 0) {
        console.log(`Selected PSs:`, selectedPS5s);
        document.getElementById('bookSection').classList.add('show');
    } else {
        console.log(`No PS5s selected.`);
        document.getElementById('bookSection').classList.remove('show');
    }
}

function setPlayersForPS(psId, players) {
    psPlayersMap[psId] = parseInt(players);
}

function updateSelectedPSsList() {
    const selectedPSsList = document.getElementById('selectedPSsList');
    selectedPSsList.innerHTML = '';

    selectedPS5s.forEach(psId => {
        const noOfPlayers = psPlayersMap[psId] || 1;

        const psDiv = document.createElement('div');
        psDiv.style.cssText = 'padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px;';

        psDiv.innerHTML = `
            <span>PS ${psId}</span>
            <label>
                Players:
                <select onchange="setPlayersForPS(${psId}, this.value)">
                    ${[1, 2, 3, 4].map(p => `<option value="${p}" ${p === noOfPlayers ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            </label>
            <button onclick="removeSelectedPS(${psId})" style="background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
        `;

        selectedPSsList.appendChild(psDiv);
    });
}


function removeSelectedPS(psId) {
    selectedPS5s = selectedPS5s.filter(id => id !== psId);
    document.querySelectorAll('.ps-card').forEach(card => {
        if (card.querySelector('.ps-number').textContent === `PS ${psId}`) {
            card.classList.remove('selected');
        }
    });
    updateSelectedPSsList();

    if (selectedPS5s.length === 0) {
        cancelSelection();
    }
}

function cancelSelection() {
    playSound(400, 0.2);

    document.querySelectorAll('.ps-card').forEach(card => {
        card.classList.remove('selected');
    });

    selectedPS5s = [];
    document.getElementById('bookSection').classList.remove('show');
}

async function bookSelectedPSs() {
    const hours = parseFloat(document.getElementById('hoursSelect').value);
    const userName = document.getElementById('userName').value;
    const contactNumber = document.getElementById('contactNumber').value;

    if (!userName || !contactNumber) {
        alert('Please fill in all fields');
        return;
    }

    const duration = (hours) * 60;

    const bookings = selectedPS5s.map(psId => ({
        psId: `PS${psId}`,
        duration,
        players: psPlayersMap[psId] || 1
    }));

    try {
        const response = await fetch('http://localhost:3000/api/ps/book', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookings })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(`Booking failed: ${result.message}`);
            return;
        }

        const billPayload = {
            userName,
            contactNo: contactNumber,
            psUnits: bookings,
            type: 'ps',
        };

        const billResponse = await fetch('http://localhost:3000/api/bills/create', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(billPayload)
        });

        const billResult = await billResponse.json();

        if (!billResponse.ok) {
            alert(`Billing failed: ${billResult.message}`);
            return;
        }

        playSound(800, 0.3);

        await updateUnpaidBills();
        await initializePSCards();
        cancelSelection();

        document.getElementById('userName').value = '';
        document.getElementById('contactNumber').value = '';
        document.getElementById('hoursSelect').value = '1';

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed. Please try again.');
    }
}

async function extendTime(psId, minutes) {
    playSound(600, 0.2);

    try {
        const billResponse = await fetch('http://localhost:3000/api/bills/extend-bill', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ psId: `PS${psId}`, extendTime: minutes, type: 'ps' })
        });

        const billData = await billResponse.json();

        if (billResponse.ok) {
            console.log("✅ Updated bill:", billData.bill);
        } else {
            console.warn("⚠️ Failed to update bill:", billData.message);
        }

        const bookingResponse = await fetch('http://localhost:3000/api/ps/extend-booking', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ psId: `PS${psId}`, extendDuration: minutes })
        });

        const bookingData = await bookingResponse.json();

        if (bookingResponse.ok) {
            console.log("✅ PS duration extended:", bookingData.ps);
        } else {
            console.warn("⚠️ Failed to extend PS booking:", bookingData.message);
        }

        updatePSTimes();
        updateUnpaidBills();

    } catch (error) {
        console.error("❌ Error extending time:", error);
    }
}

async function updateUnpaidBills() {
    const unpaidBillsContainer = document.getElementById('unpaidBills');
    unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">Loading bills...</div>';

    try {
        const res = await fetch('http://localhost:3000/api/bills/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const bills = await res.json();

        unpaidBillsContainer.innerHTML = '';

        const unpaid = bills.filter(bill => !bill.status && bill.type === 'ps');

        if (unpaid.length === 0) {
            unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">No unpaid bills</div>';
            return;
        }

        unpaid.forEach(bill => {
            const pss = bill.psUnits.map(ps => {
                const hours = Math.floor(ps.duration / 60);
                const mins = ps.duration % 60;
                let timeStr = '';
                if (hours > 0) timeStr += `${hours} hr `;
                if (mins > 0) timeStr += `${mins} min`;
                const playersStr = ps.players ? ` • ${ps.players}P` : ''; // e.g. " • 2P"
                return `${ps.psId} (${timeStr.trim()} ${playersStr})`;
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

            let snacksInfo = '';
            if (bill.snacks && bill.snacks.length > 0) {
                const snacksList = bill.snacks.map(snack =>
                    `${snack.name} (${snack.quantity})`
                ).join(', ');
                snacksInfo = `<br><small>🍿 Snacks: ${snacksList}</small>`;
            }

            const billDiv = document.createElement('div');
            billDiv.className = 'bill-item';
            billDiv.innerHTML = `
                <div class="bill-ps">${bill.userName} • ${bill.contactNo}<br></div>
                <div class="bill-details">
                    ${pss}<br>
                    <small>Booked at: ${istTime}</small>
                    ${snacksInfo}
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

async function showPaymentModal(billId) {
    try {
        const res = await fetch(`http://localhost:3000/api/bills/${billId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            throw new Error('Failed to fetch bill details');
        }

        const bill = await res.json();

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

        const psUsageList = bill.psUnits.map(unit => {
            return `<div>• ${unit.psId} - ${unit.duration} mins - ${unit.players}P</div>`;
        }).join('');

        let snacksSection = '';
        if (bill.snacks && bill.snacks.length > 0) {
            const snacksList = bill.snacks.map(snack => {
                return `<div>• ${snack.name} - ${snack.quantity} × ₹${snack.price}</div>`;
            }).join('');
            snacksSection = `
                <div><strong>Snacks:</strong></div>
                <div style="margin-left: 15px;">${snacksList}</div>
            `;
        }

        let amountBreakdown = '';
        if (bill.remainingAmt > 0) {
            amountBreakdown = `
        <div><strong>Paid Amount:</strong> ₹${bill.paidAmt}</div>
        <div><strong>Remaining Amount:</strong> ₹${bill.remainingAmt.toFixed(2)}</div>
    `;
        }
        const contactNo = bill.contactNo;

        fetch(`/api/customer/wallet/${contactNo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.walletCredit !== undefined) {
                    const walletDisplay = document.getElementById('walletCreditDisplay');
                    walletDisplay.innerHTML = `Available Wallet Credit: ₹${data.walletCredit}`;
                }
            })
            .catch(err => {
                console.error('Error fetching wallet credit:', err);
            });
        const paymentSummary = document.getElementById('paymentSummary');
        paymentSummary.innerHTML = `
            <div><strong>Booking Time:</strong> ${formattedBookingTime}</div>
            <div><strong>Customer Name:</strong> ${bill.userName}</div>
            <div><strong>Contact No:</strong> ${bill.contactNo}</div>
            <div><strong>PS Used:</strong></div>
            <div style="margin-left: 15px;">${psUsageList}</div>
            ${snacksSection}
            ${amountBreakdown}
            <div id="walletSection" style="margin: 15px 0;">
    <label>
        <input type="checkbox" id="useWalletCheckbox" />
        <strong>Use Wallet Credit</strong>
    </label>
    <div id="walletCreditDisplay" style="margin-top: 5px; font-size: 14px; color: #444;"></div>
</div>
            <div style="margin-top: 15px;">
        <label><strong>Discount (₹):</strong></label><br/>
        <input type="number" id="discountInput" min="0" value="0" style="padding: 5px; width: 100%; margin-bottom: 15px;" />
    </div>

    <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
            <label><strong>Cash Payment (₹):</strong></label><br/>
            <input type="number" id="cashInput" min="0" required style="padding: 5px; width: 100%;" />
        </div>
        <div style="flex: 1;">
            <label><strong>UPI Payment (₹):</strong></label><br/>
            <input type="number" id="upiInput" min="0" required style="padding: 5px; width: 100%;" />
        </div>
    </div> 
            <div class="payment-total" style="margin-top: 10px;"><strong>Total Amount:</strong> ₹${bill.amount.toFixed(2)}</div>
            

        `;

        const discountInput = document.getElementById('discountInput');
        const totalAmountDiv = paymentSummary.querySelector('.payment-total');
        let originalAmount = bill.amount;

        discountInput.addEventListener('input', () => {
            const discount = parseFloat(discountInput.value) || 0;
            const finalAmount = Math.max(0, originalAmount - discount);
            totalAmountDiv.innerHTML = `<strong>Total Amount:</strong> ₹${finalAmount.toFixed(2)}`;
        });


        const paymentModal = document.getElementById('paymentModal');
        paymentModal.classList.add('show');
        paymentModal.dataset.billId = bill._id;

    } catch (error) {
        console.error('Error loading bill:', error);
        alert('Unable to load bill details. Please try again.');
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
}

async function confirmPayment() {
    const billId = document.getElementById('paymentModal').dataset.billId;
    const cash = parseInt(document.getElementById('cashInput').value, 10) || 0;
    const upi = parseInt(document.getElementById('upiInput').value, 10) || 0;
    const discount = parseInt(document.getElementById('discountInput').value, 10) || 0;
    const useWallet = document.getElementById('useWalletCheckbox').checked;
    let wallet = 0;

    if (useWallet) {
        const walletText = document.getElementById('walletCreditDisplay').innerText;
        const match = walletText.match(/₹(\d+)/); // Extract number from "Available Wallet Credit: ₹xxx"
        if (match && match[1]) {
            wallet = parseInt(match[1], 10);
        }
    }
    else {
        wallet = -1;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/bills/${billId}/pay`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cash, upi, discount, wallet })
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to update bill status');
            return;
        }

        const billRes = await fetch(`http://localhost:3000/api/bills/${billId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const bill = await billRes.json();

        if (!billRes.ok) {
            throw new Error('Failed to fetch updated bill details');
        }

        const customerPayload = {
            name: bill.userName,
            contactNo: bill.contactNo,
            loyaltyPoints: Math.floor(bill.gamingTotal / 100) * 5
        };

        const customerRes = await fetch('http://localhost:3000/api/customer/createOrAdd', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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

        updatePSTimes();
        updateUnpaidBills();
        closePaymentModal();

        playSound(800, 0.5);

        setTimeout(() => {
            alert('Payment successful!');
        }, 100);

    } catch (error) {
        console.error('Error updating bill status:', error);
        alert('Failed to confirm payment. Please try again.');
    }
}

function simulateRealTimeUpdates() {
    setInterval(() => {
        const randomIndex = Math.floor(Math.random() * psData.length);
        const ps = psData[randomIndex];

        if (ps.status === 'ending-soon') {
            const currentTime = parseInt(ps.timeRemaining);
            if (currentTime > 1) {
                ps.timeRemaining = (currentTime - 1) + 'm';
            } else {
                ps.status = 'available';
                ps.timeRemaining = 'Ready to Play';
            }
        } else if (ps.status === 'occupied') {
            if (Math.random() < 0.02) {
                ps.status = 'available';
                ps.timeRemaining = 'Ready to Play';
            }
        }
    }, 5000);
}

// Initialize
createParticles();
initializePSCards();
updateUnpaidBills();
simulateRealTimeUpdates();

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        cancelSelection();
        closePaymentModal();
        closeBillSelection();
        if (document.getElementById('snacksPanel').classList.contains('open')) {
            closeSnacksPanel();
        }
    }
});

// Close modals when clicking outside
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const snacksPanel = document.getElementById('snacksPanel');
    const billSelectionModal = document.getElementById('billSelectionModal');

    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
        document.getElementById('mainContent').classList.remove('shifted');
    }

    if (!snacksPanel.contains(e.target) && !e.target.closest('.add-snacks-btn')) {
        if (snacksPanel.classList.contains('open')) {
            closeSnacksPanel();
        }
    }

    if (!billSelectionModal.querySelector('.bill-selection-content').contains(e.target) &&
        billSelectionModal.classList.contains('show')) {
        closeBillSelection();
    }
});