const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized. Please log in first.');
    window.location.href = 'login.html';
}
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// PC Data
const pcData = [
    { id: 1, status: 'available' }, { id: 2, status: 'available' }, { id: 3, status: 'available' }, { id: 4, status: 'available' }, { id: 5, status: 'available' },
    { id: 6, status: 'available' }, { id: 7, status: 'available' }, { id: 8, status: 'available' }, { id: 9, status: 'available' }, { id: 10, status: 'available' },
    { id: 11, status: 'available' }, { id: 12, status: 'available' }, { id: 13, status: 'available' }, { id: 14, status: 'available' }
];

let selectedPCs = [];
let snacksData = [];
let snacksCart = [];
let currentBillId = null;
let selectedBillInfo = null;

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

// Initialize audio on first user interaction
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

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Initialize audio on first click
window.addEventListener('click', () => {
    if (!audioInitialized) {
        initAudioContext();
    }
}, { once: true });

// Gaming Stickers
function createGamingStickers() {
    const stickersContainer = document.getElementById('gamingStickers');
    const stickerIcons = ['🎮', '🖥️', '⚡', '🏆', '⭐', '🎯', '💎', '🔥', '🎪', '🎨', '🎭', '🎊', '🎉', '🌟', '💫'];
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

// Snacks Workflow Functions
async function startSnacksWorkflow() {
    try {
        const response = await fetch('/api/bills/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Unauthorized');
        }

        const bills = await response.json();
        const unpaidBills = bills.filter(bill => !bill.status && bill.type == 'pc');

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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="bill-item selectable" onclick="selectBillForSnacks('${bill._id}', '${bill.userName}', '${pcs}')">
                <div class="bill-pc">${bill.userName} • ${bill.contactNo}</div>
                <div class="bill-details">
                    ${pcs}<br>
                    <small>Booked at: ${istTime}</small>
                </div>
                <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    modal.classList.add('show');
}

function selectBillForSnacks(billId, userName, pcs) {
    currentBillId = billId;
    selectedBillInfo = { userName, pcs };

    closeBillSelection();
    setTimeout(() => {
        openSnacksPanel();
        playSound(800, 0.2);
    }, 50);
}

function closeBillSelection() {
    document.getElementById('billSelectionModal').classList.remove('show');
}

async function openSnacksPanel() {
    const snacksPanel = document.getElementById('snacksPanel');
    const selectedBillInfoDiv = document.getElementById('selectedBillInfo');

    if (selectedBillInfo) {
        selectedBillInfoDiv.innerHTML = `
            <strong>Selected Bill:</strong> ${selectedBillInfo.userName}<br>
            <small>${selectedBillInfo.pcs}</small>
        `;
    }

    snacksPanel.classList.add('open');

    if (snacksData.length === 0) {
        await loadSnacksData();
    }
}

function closeSnacksPanel() {
    document.getElementById('snacksPanel').classList.remove('open');
    currentBillId = null;
    selectedBillInfo = null;
    clearCart();
    playSound(400, 0.2);
}

async function loadSnacksData() {
    try {
        const response = await fetch('/api/snacks/all', {
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
        return '';
    }
}

async function renderSnacksGrid(filteredSnacks = null) {
    const snacksGrid = document.getElementById('snacksGrid');
    const snacksToRender = filteredSnacks || snacksData;
    const token = localStorage.getItem('token');

    if (snacksToRender.length === 0) {
        snacksGrid.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 20px;">No snacks found</div>';
        return;
    }

    snacksGrid.innerHTML = snacksToRender.map(snack => {
        const cartItem = snacksCart.find(item => item.id === snack._id);
        const quantityInCart = cartItem ? cartItem.quantity : 0;
        const isOutOfStock = snack.quantity <= 0;

        return `
      <div class="snack-item" data-category="${snack.category}" id="snack-${snack._id}">
        <div class="snack-header">
          <img src="/placeholder.svg" alt="${snack.name}" class="snack-img-preview" id="snack-img-${snack._id}" />
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

async function updateSnackQuantity(snackId, change) {
    const snack = snacksData.find(snacks => snacks._id === snackId);
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

    const updatedQuantity = snacksCart.find(item => item.id === snackId)?.quantity || 0;

    const snackItemElement = document.querySelector(`[onclick="updateSnackQuantity('${snackId}', -1)"]`)?.closest('.snack-item');
    if (snackItemElement) {
        const qtyDisplay = snackItemElement.querySelector('.quantity-display');
        const minusBtn = snackItemElement.querySelector(`.qty-btn[onclick="updateSnackQuantity('${snackId}', -1)"]`);
        const plusBtn = snackItemElement.querySelector(`.qty-btn[onclick="updateSnackQuantity('${snackId}', 1)"]`);

        qtyDisplay.textContent = updatedQuantity;
        minusBtn.disabled = updatedQuantity <= 0;
        plusBtn.disabled = updatedQuantity >= snack.quantity;
    }

    playSound(change > 0 ? 800 : 400, 0.1);
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
        for (const item of snacksCart) {
            const res = await fetch(`/api/snacks/consume/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usedQuantity: item.quantity }),
            });

            if (!res.ok) {
                const errData = await res.json();
                alert(`Error with ${item.name}: ${errData.message}`);
                return;
            }
        }

        const response = await fetch('/api/bills/addSnack', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                billId: currentBillId,
                snacks: snacksCart
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add snacks to bill');
        }

        playSound(1000, 0.5);
        alert('Snacks added to bill successfully!');

        clearCart();
        closeSnacksPanel();
        updateUnpaidBills();
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

// PC Management Functions
async function fetchPCStatus(pcId) {
    try {
        const res = await fetch(`/api/pc/timeleft/PC${pcId}`, {
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
            const billsRes = await fetch('/api/bills/all', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const bills = await billsRes.json();

            for (const bill of bills) {
                if (!bill.status && bill.type === 'pc') {
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
        pcCard.className = `pc-card available`;
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
            <div class="unfreeze-button"></div>
        `;

        pcGrid.appendChild(pcCard);
    }

    updatePCTimes();
    setInterval(updatePCTimes, 60000);
}

async function unfreezePC(formattedPcId) {
    const pcId = formattedPcId.toString().startsWith('pc') ? formattedPcId : `PC${formattedPcId}`;
    try {
        const res = await fetch('/api/pc/unfreeze', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pcId })
        });

        const data = await res.json();
        if (res.ok) {
            alert(`✓ PC ${pcId} unfrozen successfully.`);
            updatePCTimes();
        } else {
            alert(`Failed to unfreeze PC: ${data.message}`);
        }
    } catch (err) {
        console.error('Error unfreezing PC:', err);
        alert('An unexpected error occurred.');
    }
}

async function updatePCTimes() {
    for (const pc of pcData) {
        const card = document.getElementById(`pc-card-${pc.id}`);
        const statusDiv = card.querySelector('.pc-status');
        const timeDiv = card.querySelector('.pc-time');
        const extendDiv = card.querySelector('.extend-buttons');
        const unfreeze = card.querySelector('.unfreeze-button');

        const { status, timeRemaining } = await fetchPCStatus(pc.id);

        pc.status = status;
        card.className = `pc-card ${status}`;

        statusDiv.textContent = status.replace('-', ' ');
        statusDiv.className = `pc-status ${status}`;
        timeDiv.textContent = timeRemaining;
        timeDiv.className = `pc-time ${status}`;

        if (status === 'occupied' || status === 'ending-soon') {
            extendDiv.innerHTML = `
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 15); event.stopPropagation();">+15m</button>
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 30); event.stopPropagation();">+30m</button>
            `;
            unfreeze.innerHTML = `
                <button class="unfreeze-btn" onclick="event.stopPropagation(); unfreezePCConfirm('${pc.id}')">Unfreeze</button>
            `
        } else {
            extendDiv.innerHTML = '';
            unfreeze.innerHTML = '';
        }
    }

    updateStatusCounts();
}

function confirmExtend(pcId, minutes) {
    const price = minutes === 15 ? 20 : 25;
    const confirmed = confirm(`Are you sure you want to extend PC ${pcId} by ${minutes} minutes for ₹${price}?`);
    if (confirmed) {
        extendTime(pcId, minutes);
    }
}

function unfreezePCConfirm(pcId) {
    const confirmed = confirm(`Are you sure you want to unfreeze the pc${pcId}?`);
    if (confirmed) {
        unfreezePC(pcId);
    }
}

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

function selectPC(pcId) {
    const pc = pcData.find(p => p.id === pcId);

    if (!pc) {
        console.warn(`PC with ID ${pcId} not found in pcData.`);
        return;
    }

    if (pc.status !== 'available') {
        playSound(300, 0.3);
        return;
    }

    playSound(600, 0.2);
    const pcCard = event.currentTarget;

    if (selectedPCs.includes(pcId)) {
        selectedPCs = selectedPCs.filter(id => id !== pcId);
        pcCard.classList.remove('selected');
    } else {
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

function cancelSelection() {
    playSound(400, 0.2);

    document.querySelectorAll('.pc-card').forEach(card => {
        card.classList.remove('selected');
    });

    selectedPCs = [];
    document.getElementById('bookSection').classList.remove('show');
}

async function bookSelectedPCs() {
    const hours = parseFloat(document.getElementById('hoursSelect').value);
    const userName = document.getElementById('userName').value;
    const contactNumber = document.getElementById('contactNumber').value;

    if (!userName || !contactNumber) {
        alert('Please fill in all fields');
        return;
    }

    const duration = (hours) * 60;

    const bookings = selectedPCs.map(pcId => ({
        pcId: `PC${pcId}`,
        duration
    }));

    try {
        const response = await fetch('/api/pc/book', {
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
            pcUnits: bookings,
            type: 'pc'
        };

        const billResponse = await fetch('/api/bills/create', {
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
        await initializePCCards();
        cancelSelection();

        document.getElementById('userName').value = '';
        document.getElementById('contactNumber').value = '';
        document.getElementById('hoursSelect').value = '1';

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed. Please try again.');
    }
}

async function extendTime(pcId, minutes) {
    playSound(600, 0.2);

    try {
        const billResponse = await fetch('/api/bills/extend-bill', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pcId: `PC${pcId}`, extendTime: minutes, type: 'pc' })
        });

        const billData = await billResponse.json();

        if (billResponse.ok) {
            console.log("✅ Updated bill:", billData.bill);
        } else {
            console.warn("⚠️ Failed to update bill:", billData.message);
        }

        const bookingResponse = await fetch('/api/pc/extend-booking', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pcId: `PC${pcId}`, extendDuration: minutes })
        });

        const bookingData = await bookingResponse.json();

        if (bookingResponse.ok) {
            console.log("✅ PC duration extended:", bookingData.pc);
        } else {
            console.warn("⚠️ Failed to extend PC booking:", bookingData.message);
        }

        updatePCTimes();
        updateUnpaidBills();

    } catch (error) {
        console.error("❌ Error extending time:", error);
    }
}

async function updateUnpaidBills() {
    const unpaidBillsContainer = document.getElementById('unpaidBills');
    unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">Loading bills...</div>';

    try {
        const res = await fetch('/api/bills/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const bills = await res.json();

        unpaidBillsContainer.innerHTML = '';

        const unpaid = bills.filter(bill => !bill.status && bill.type === 'pc');

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
                <div class="bill-pc">${bill.userName} • ${bill.contactNo}<br></div>
                <div class="bill-details">
                    ${pcs}<br>
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
        const res = await fetch(`/api/bills/${billId}`, {
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

        const pcUsageList = bill.pcUnits.map(unit => {
            return `<div>• ${unit.pcId} - ${unit.duration} mins</div>`;
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
                <div><strong>Paid Amount:</strong> ₹${bill.paidAmt?.toFixed(2) || 0}</div>
                <div><strong>Remaining Amount:</strong> ₹${bill.remainingAmt.toFixed(2)}</div>
            `;
        }

        const paymentSummary = document.getElementById('paymentSummary');
        const originalAmount = bill.amount.toFixed(2);

        paymentSummary.innerHTML = `
            <div><strong>Booking Time:</strong> ${formattedBookingTime}</div>
            <div><strong>Customer Name:</strong> ${bill.userName}</div>
            <div><strong>Contact No:</strong> ${bill.contactNo}</div>
            <div><strong>PC Used:</strong></div>
            <div style="margin-left: 15px;">${pcUsageList}</div>
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
            <div class="payment-total" style="margin-top: 10px;">
                <strong>Total Amount:</strong> ₹<span id="finalAmount">${originalAmount}</span>
            </div>
        `;

        const discountInput = document.getElementById('discountInput');
        const finalAmountDisplay = document.getElementById('finalAmount');

        discountInput.addEventListener('input', () => {
            let discount = parseFloat(discountInput.value) || 0;
            discount = Math.max(0, Math.min(discount, bill.amount));

            const finalAmount = (bill.amount - discount).toFixed(2);
            finalAmountDisplay.textContent = finalAmount;
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
        const match = walletText.match(/₹(\d+)/);
        if (match && match[1]) {
            wallet = parseInt(match[1], 10);
        }
    }
    else {
        wallet = -1;
    }

    try {
        const response = await fetch(`/api/bills/${billId}/pay`, {
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

        const billRes = await fetch(`/api/bills/${billId}`, {
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
            loyaltyPoints:
                bill.gamingTotal >= 360 ? 30 :
                    bill.gamingTotal >= 180 ? 15 :
                        bill.gamingTotal >= 150 ? 10 :
                            bill.gamingTotal >= 100 ? 5 :
                                0
        };

        const customerRes = await fetch('/api/customer/createOrAdd', {
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

        updatePCTimes();
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

// Initialize
createGamingStickers();
createParticles();
setupMenu();
initializePCCards();
updateUnpaidBills();

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        cancelSelection();
        closePaymentModal();
        closeBillSelection();
        if (document.getElementById('snacksPanel').classList.contains('open')) {
            closeSnacksPanel();
        }

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

// Close modals when clicking outside
document.addEventListener('click', function (e) {
    const snacksPanel = document.getElementById('snacksPanel');
    const billSelectionModal = document.getElementById('billSelectionModal');

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