// Sample data - replace with actual API calls
let chartInstance = null;

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

function initAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    audioInitialized = true;
}

function playSound(frequency, duration) {
    try {
        if (!audioInitialized) {
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

// Initialize audio on first user interaction
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

// Date/Time Utilities
function convertISTtoUTC(istDateTime) {
    // IST is UTC+5:30
    const utcDate = new Date(istDateTime);
    return utcDate.toISOString();
}

function formatDateForInput(date) {
    // Format date for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Generate complete time range based on category
function generateCompleteTimeRange(startDate, endDate, rangeType) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeSlots = [];

    switch (rangeType) {
        case 'hourly':
            // Generate all hours between start and end
            const currentHour = new Date(start);
            currentHour.setMinutes(0, 0, 0);

            while (currentHour <= end) {
                timeSlots.push({
                    key: currentHour.getHours(),
                    label: formatHourLabel(currentHour.getHours()),
                    fullDate: new Date(currentHour)
                });
                currentHour.setHours(currentHour.getHours() + 1);
            }
            break;
        case 'daily':
            const currentDay = new Date(start);
            currentDay.setHours(0, 0, 0, 0);

            while (currentDay <= end) {
                const year = currentDay.getFullYear();
                const month = (currentDay.getMonth() + 1).toString().padStart(2, '0');
                const day = currentDay.getDate().toString().padStart(2, '0');

                const dateKey = `${year}-${month}-${day}`; // Use local date for key too
                const label = `${day} ${currentDay.toLocaleString('en-IN', { month: 'short' })}`;

                timeSlots.push({
                    key: dateKey,
                    label,
                    fullDate: new Date(currentDay)
                });

                currentDay.setDate(currentDay.getDate() + 1);
            }
            break;


        case 'weekly':
            // Generate all weeks between start and end
            const currentWeek = new Date(start);
            currentWeek.setHours(0, 0, 0, 0);

            while (currentWeek <= end) {
                const year = currentWeek.getFullYear();
                const weekNumber = getWeekNumber(currentWeek);
                const weekKey = `${year}-${weekNumber.toString().padStart(2, '0')}`;

                timeSlots.push({
                    key: weekKey,
                    label: `Week ${weekNumber}, ${year}`,
                    fullDate: new Date(currentWeek)
                });
                currentWeek.setDate(currentWeek.getDate() + 7);
            }
            break;

        case 'monthly':
            // Generate all months between start and end
            const currentMonth = new Date(start);
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);

            while (currentMonth <= end) {
                const year = currentMonth.getFullYear();
                const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
                const monthKey = `${year}-${month}`;

                timeSlots.push({
                    key: monthKey,
                    label: currentMonth.toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric'
                    }),
                    fullDate: new Date(currentMonth)
                });
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
            break;

        case 'yearly':
            // Generate all years between start and end
            const currentYear = new Date(start);
            currentYear.setMonth(0, 1);
            currentYear.setHours(0, 0, 0, 0);

            while (currentYear <= end) {
                const year = currentYear.getFullYear();
                timeSlots.push({
                    key: year.toString(),
                    label: year.toString(),
                    fullDate: new Date(currentYear)
                });
                currentYear.setFullYear(currentYear.getFullYear() + 1);
            }
            break;
    }

    return timeSlots;
}

function formatHourLabel(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Process API data and merge with complete time range
function processAnalyticsData(apiData, completeTimeRange, rangeType) {
    // Create a map of API data by key
    const dataMap = new Map();

    if (rangeType === 'hourly') {
        // For hourly, group by hour and sum amounts
        apiData.forEach(item => {
            const hour = new Date(item.time).getHours();
            if (dataMap.has(hour)) {
                dataMap.set(hour, dataMap.get(hour) + item.amount);
            } else {
                dataMap.set(hour, item.amount);
            }
        });
    } else {
        // For other types, use the label as key
        apiData.forEach(item => {
            dataMap.set(item.label, item.total);
        });
    }

    // Merge with complete time range
    const processedData = completeTimeRange.map(timeSlot => ({
        label: timeSlot.label,
        value: dataMap.get(timeSlot.key) || 0,
        key: timeSlot.key
    }));

    return processedData;
}

// Initialize default dates
function initializeDates() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    document.getElementById('startDate').value = formatDateForInput(startOfDay);
    document.getElementById('endDate').value = formatDateForInput(endOfDay);
}

// Generate Analytics
async function generateAnalytics() {
    const rangeType = document.getElementById('rangeType').value;
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;

    if (!startDateInput || !endDateInput) {
        alert('Please select both start and end dates');
        return;
    }
    // Convert to Date objects for comparison
    const start = new Date(startDateInput);
    const end = new Date(endDateInput);
    // Check if start date is after end date
    if (start > end) {
        alert('Start date cannot be after end date.');
        return;
    }
    // Enforce same date for 'hourly' range
    if (rangeType === 'hourly') {
        const isSameDate =
            start.getFullYear() === end.getFullYear() &&
            start.getMonth() === end.getMonth() &&
            start.getDate() === end.getDate();

        if (!isSameDate) {
            alert('For "hourly" range, the start and end date must be the same.');
            return;
        }
    }
    // console.log('Start Date (IST local input):', startDateInput);
    // console.log('End Date (IST local input):', endDateInput);

    // Convert IST to UTC
    const startDateUTC = convertISTtoUTC(startDateInput);
    const endDateUTC = convertISTtoUTC(endDateInput);

    // console.log(convertISTtoUTC(startDateInput)); 
    // console.log(convertISTtoUTC(endDateInput));

    const requestData = {
        rangeType: rangeType,
        startDate: startDateUTC,
        endDate: endDateUTC
    };

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';

    playSound(800, 0.3);

    try {
        const response = await fetch('http://localhost:3000/api/analytics/earnings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Hide loading
        document.getElementById('loading').style.display = 'none';

        // Generate complete time range
        const completeTimeRange = generateCompleteTimeRange(
            new Date(startDateInput),
            new Date(endDateInput),
            rangeType
        );

        console.log('Complete Time Range:', completeTimeRange);

        // Process data to include all time periods
        const processedData = processAnalyticsData(
            result.data || [],
            completeTimeRange,
            rangeType
        );

        console.log('Processed Data:', processedData);

        displayAnalytics(processedData, rangeType);
        playSound(1000, 0.5);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        document.getElementById('loading').style.display = 'none';
        showError('Failed to fetch analytics data. Please check your connection and try again.');
        playSound(400, 0.8);
    }
}

// Display Analytics Results
function displayAnalytics(data, rangeType) {
    // Calculate statistics
    let totalRevenue = 0;
    let maxRevenue = 0;
    let nonZeroCount = 0;

    data.forEach(item => {
        totalRevenue += item.value;
        maxRevenue = Math.max(maxRevenue, item.value);
        if (item.value > 0) nonZeroCount++;
    });

    const avgRevenue = nonZeroCount > 0 ? totalRevenue / nonZeroCount : 0;

    // Update statistics
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    document.getElementById('avgRevenue').textContent = `₹${Math.round(avgRevenue).toLocaleString()}`;
    document.getElementById('peakRevenue').textContent = `₹${maxRevenue.toLocaleString()}`;

    // Create chart
    createChart(data, rangeType);

    // Show results
    document.getElementById('resultsContainer').style.display = 'block';
}

// Create Chart
function createChart(data, rangeType) {
    const ctx = document.getElementById('analyticsChart').getContext('2d');

    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = data.map(item => item.label);
    const values = data.map(item => item.value);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0.2)');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: values,
                backgroundColor: gradient,
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#333'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#007bff',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            return `Revenue: ₹${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 123, 255, 0.1)'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        },
                        callback: function (value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 11
                        },
                        maxRotation: rangeType === 'hourly' ? 0 : 45,
                        callback: function (value, index) {
                            // For hourly, show all hours
                            if (rangeType === 'hourly') {
                                return this.getLabelForValue(value);
                            }
                            // For other types, show every nth label to avoid crowding
                            const totalLabels = this.chart.data.labels.length;
                            const maxLabels = 15;
                            const step = Math.ceil(totalLabels / maxLabels);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Show Error
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorContainer').style.display = 'block';
}

// Event Listeners
document.getElementById('generateBtn').addEventListener('click', generateAnalytics);

// Range type change handler
document.getElementById('rangeType').addEventListener('change', function () {
    playSound(500, 0.2);

    // Auto-adjust date range based on selection
    const rangeType = this.value;
    const now = new Date();
    let startDate, endDate;

    switch (rangeType) {
        case 'hourly':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'daily':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 2);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            return;
    }

    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(endDate);
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
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

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        generateAnalytics();
    }
});

// Initialize page
function initializePage() {
    initializeDates();
    playSound(800, 0.3);
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