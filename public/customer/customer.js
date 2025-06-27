const token = localStorage.getItem('token');

if (!token) {
    alert('Unauthorized access. Please log in first.');
    window.location.href = '../login/login.html'; // Redirect to login page


    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            window.location.href = '../login/login.html';
        }
    }
}
// Global variables
let customersData = [];
let currentEditingId = null;
let isEditMode = false;

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

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
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
    const stickerIcons = ['👥', '🎮', '💎', '🏆', '⭐', '🎯', '💰', '🔥', '⚡', '🎪', '🎨', '🎭', '🎊', '🎉', '🌟', '💫'];
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

    // Menu item hover effects
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => playSound(300, 0.1));
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// Get loyalty badge
function getLoyaltyBadge(points) {
    if (points >= 1000) return 'VIP';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    if (points >= 50) return 'Bronze';
    return 'New';
}

// Render customers table
function renderCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');

    if (customers.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                            No customers found. Add your first customer!
                        </td>
                    </tr>
                `;
        return;
    }

    tbody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.contactNo}</td>
                    <td class="loyalty-points">
                        ${customer.loyaltyPoints} 
                    </td>
                    <td>${formatDate(customer.createdAt)}</td>
                    <td class="Wallet-Credit">
                        ${customer.walletCredit} 
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="editCustomer('${customer._id}')">Edit</button>
                            <button class="action-btn delete-btn" onclick="deleteCustomer('${customer._id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
}

// Fetch and render customers
async function fetchAndRenderCustomers() {
    try {
        const res = await fetch('/api/customer/all', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            throw new Error('Failed to fetch customers');
        }

        customersData = await res.json();
        renderCustomers(customersData);
    } catch (error) {
        console.error('Error fetching customers:', error);
        const tbody = document.getElementById('customersTableBody');
        tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: red;">
                            Failed to load customers. Please check your connection.
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
        const filteredCustomers = customersData.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.contactNo.includes(searchTerm)
        );
        renderCustomers(filteredCustomers);
        playSound(400, 0.1);
    });
}

// Open add customer modal
function openAddModal() {
    playSound(600, 0.2);
    isEditMode = false;
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Add New Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerModal').style.display = 'block';
}

// Edit customer
async function editCustomer(customerId) {
    try {
        playSound(600, 0.2);
        const customer = customersData.find(c => c._id === customerId);

        if (!customer) {
            throw new Error('Customer not found');
        }

        isEditMode = true;
        currentEditingId = customerId;

        document.getElementById('modalTitle').textContent = 'Edit Customer';
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerContact').value = customer.contactNo;
        document.getElementById('customerLoyalty').value = customer.loyaltyPoints;
        document.getElementById('customerWallet').value = customer.walletCredit;

        document.getElementById('customerModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading customer:', error);
        showMessage('Unable to load customer details. Please try again.', 'error');
    }
}

// Delete customer
async function deleteCustomer(customerId) {
    playSound(800, 0.3);
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        try {
            const res = await fetch(`/api/customer/delete/${customerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error('Failed to delete customer');
            }

            await fetchAndRenderCustomers();
            playSound(1000, 0.2);
            showMessage('✓ Customer deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting customer:', error);
            showMessage('Failed to delete customer. Please try again.', 'error');
        }
    }
}

// Close modal
function closeModal() {
    document.getElementById('customerModal').style.display = 'none';
    currentEditingId = null;
    isEditMode = false;
    playSound(400, 0.1);
}

// Handle form submission
document.getElementById('customerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const customerData = {
        name: document.getElementById('customerName').value.trim(),
        contactNo: document.getElementById('customerContact').value.trim(),
        loyaltyPoints: parseInt(document.getElementById('customerLoyalty').value) || 0,
        walletCredit: parseInt(document.getElementById('customerWallet').value) || 0
    };

    try {
        let res;
        if (isEditMode && currentEditingId) {
            res = await fetch(`/api/customer/edit/${currentEditingId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });
        } else {
            res = await fetch('/api/customer/onlyCreate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });
        }

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to save customer');
        }

        await fetchAndRenderCustomers();
        closeModal();
        playSound(800, 0.3);
        const result = await res.json(); // ✅ Moved here, so it’s always defined
        // console.log(result.message);
        if (result.message === 'Customer phone no already exists in db') {
            showMessage('ℹ Customer already exists', 'info');
        } else {
            const message = isEditMode ? '✓ Customer updated successfully!' : '✓ Customer added successfully!';
            showMessage(message, 'success');
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        showMessage(error.message || 'Failed to save customer. Please try again.', 'error');
    }
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

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('customerModal');
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
    const tableRows = document.querySelectorAll('.customers-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', () => playSound(300, 0.05));
    });
}

// Initialize page
function initializePage() {
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('customersTable').style.display = 'none';

    // Simulate loading delay
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('customersTable').style.display = 'table';

        fetchAndRenderCustomers();
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
