// Check for authentication
const token = localStorage.getItem("token")
if (!token) {
    alert("Unauthorized access. Please log in first.")
    window.location.href = "login.html"
}
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}
// Global variables
let allLogs = []
let allBills = []
let filteredLogs = []

// Audio context for sound effects
let audioContext
let audioInitialized = false

// Initialize audio on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === "suspended") {
        audioContext.resume()
    }
    audioInitialized = true
}

function playSound(frequency, duration) {
    try {
        if (!audioInitialized || !audioContext) return

        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = "sine"

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
    } catch (e) {
        console.log("Audio not supported")
    }
}

// Initialize audio on first click
window.addEventListener(
    "click",
    () => {
        if (!audioInitialized) {
            initAudioContext()
        }
    },
    { once: true },
)

// Gaming Stickers
function createGamingStickers() {
    const stickersContainer = document.getElementById("gamingStickers")
    const stickerIcons = ["🎮", "🖥️", "⚡", "🏆", "⭐", "🎯", "💎", "🔥", "🎪", "🎨", "🎭", "🎊", "🎉", "🌟", "💫"]
    const stickerCount = 25

    for (let i = 0; i < stickerCount; i++) {
        const sticker = document.createElement("div")
        sticker.className = "sticker"
        sticker.textContent = stickerIcons[Math.floor(Math.random() * stickerIcons.length)]
        sticker.style.left = Math.random() * 100 + "%"
        sticker.style.top = Math.random() * 100 + "%"
        sticker.style.animationDelay = Math.random() * 15 + "s"
        sticker.style.fontSize = Math.random() * 20 + 20 + "px"
        stickersContainer.appendChild(sticker)
    }
}

// Menu Toggle Functionality
function setupMenu() {
    const menuToggle = document.getElementById("menuToggle")
    const sideMenu = document.getElementById("sideMenu")
    const menuOverlay = document.getElementById("menuOverlay")

    menuToggle.addEventListener("click", function () {
        playSound(600, 0.2)
        this.classList.toggle("active")
        sideMenu.classList.toggle("open")
        menuOverlay.classList.toggle("active")
    })

    menuOverlay.addEventListener("click", () => {
        menuToggle.classList.remove("active")
        sideMenu.classList.remove("open")
        menuOverlay.classList.remove("active")
        playSound(400, 0.1)
    })

    // Menu item hover effects
    document.querySelectorAll(".menu-item").forEach((item) => {
        item.addEventListener("mouseenter", () => playSound(300, 0.1))
    })
}

// Particle System
function createParticles() {
    const particlesContainer = document.getElementById("particles")
    const particleCount = 50

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div")
        particle.className = "particle"
        particle.style.left = Math.random() * 100 + "%"
        particle.style.animationDelay = Math.random() * 6 + "s"
        particle.style.animationDuration = Math.random() * 3 + 3 + "s"
        particlesContainer.appendChild(particle)
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString)
    return (
        date.toLocaleDateString("en-IN") +
        " " +
        date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        })
    )
}

// Fetch edit logs
async function fetchEditLogs() {
    try {
        const response = await fetch("http://localhost:3000/api/edit/all-logs", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error("Failed to fetch edit logs")
        }

        const data = await response.json()
        return data.editLogs
    } catch (error) {
        console.error("Error fetching edit logs:", error)
        return []
    }
}

// Fetch all bills
async function fetchAllBills() {
    try {
        const response = await fetch("http://localhost:3000/api/bills/all", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error("Failed to fetch bills")
        }

        const bills = await response.json()
        return bills
    } catch (error) {
        console.error("Error fetching bills:", error)
        return []
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById("searchInput")
    const searchStats = document.getElementById("searchStats")

    searchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase().trim()

        if (searchTerm === "") {
            filteredLogs = allLogs
            searchStats.classList.remove("show")
        } else {
            filteredLogs = allLogs.filter((log) => {
                const bill = allBills.find((b) => b._id === log.billId)
                if (!bill) return false

                const customerName = bill.userName?.toLowerCase() || ""
                const contactNo = bill.contactNo?.toLowerCase() || ""

                return customerName.includes(searchTerm) || contactNo.includes(searchTerm)
            })

            searchStats.textContent = `Found ${filteredLogs.length} result(s) for "${this.value}"`
            searchStats.classList.add("show")
        }

        renderEditLogs(filteredLogs, allBills)
        playSound(400, 0.1)
    })
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById("searchInput")
    const searchStats = document.getElementById("searchStats")

    searchInput.value = ""
    filteredLogs = allLogs
    searchStats.classList.remove("show")
    renderEditLogs(filteredLogs, allBills)
    playSound(600, 0.2)
}

// Format units for display
function formatUnits(version, bill = null) {
    const units = []

    // Use version data if available, otherwise use bill data
    const pcUnits = version?.pcUnits || bill?.pcUnits || []
    const psUnits = version?.psUnits || bill?.psUnits || []

    pcUnits.forEach((unit) => {
        units.push(`<span class="unit-badge">${unit.pcId}: ${unit.duration}min</span>`)
    })

    psUnits.forEach((unit) => {
        units.push(`<span class="unit-badge">${unit.psId}: ${unit.duration}min</span>`)
    })

    return units.length > 0 ? units.join("") : '<span class="empty-cell">—</span>'
}

// Format snacks for display
function formatSnacks(bill) {
    if (!bill || !bill.snacks || bill.snacks.length === 0) {
        return '<span class="empty-cell">—</span>'
    }

    return bill.snacks
        .map((snack) => `<span class="snack-badge">${snack.name} x${snack.quantity} (₹${snack.price})</span>`)
        .join("")
}

// Calculate total amount
function calculateAmount(version) {
    const cash = version.cash || 0
    const upi = version.UPI || version.upi || 0
    const discount = version.discount || 0
    return cash + upi + discount
}

// Compare units for changes
function unitsChanged(prevUnits, currentUnits) {
    if (!prevUnits && !currentUnits) return false
    if (!prevUnits || !currentUnits) return true

    if (prevUnits.length !== currentUnits.length) return true

    // Compare each unit
    for (let i = 0; i < prevUnits.length; i++) {
        const prev = prevUnits[i]
        const curr = currentUnits[i]

        const prevId = prev.pcId || prev.psId
        const currId = curr.pcId || curr.psId

        if (prevId !== currId || prev.duration !== curr.duration) {
            return true
        }

        // Check players for PS units
        if ((prev.players || curr.players) && prev.players !== curr.players) {
            return true
        }
    }

    return false
}

// Render versions table with change highlighting
function renderVersionsTable(versions, bill) {
    let prevVersion = null

    // Process version rows with change highlighting
    const versionRows = versions
        .map((version, index) => {
            const isFirstVersion = index === 0
            const changes = {}

            // Compare with previous version to detect changes
            if (!isFirstVersion && prevVersion) {
                changes.cash = version.cash !== prevVersion.cash
                changes.upi = version.UPI !== prevVersion.UPI
                changes.discount = version.discount !== prevVersion.discount
                changes.wallet = version.wallet !== prevVersion.wallet
                changes.units =
                    unitsChanged(prevVersion.pcUnits, version.pcUnits) || unitsChanged(prevVersion.psUnits, version.psUnits)
                changes.amount = version.amount !== prevVersion.amount
            }

            // Store current version as previous for next iteration
            prevVersion = version

            return `
            <tr>
                <td><span class="version-badge">V${version.version}</span></td>
                <td>${bill?.userName || '<span class="empty-cell">—</span>'}</td>
                <td>${bill?.contactNo || '<span class="empty-cell">—</span>'}</td>
                <td class="units-cell ${!isFirstVersion && changes.units ? "changed-cell" : ""}">${formatUnits(version, bill)}</td>
                <td class="snacks-cell">${formatSnacks(bill)}</td>
                <td>${bill?.bookingTime ? formatDate(version.editedAt) : '<span class="empty-cell">—</span>'}</td>
                <td class="${!isFirstVersion && changes.cash ? "changed-cell" : ""}">₹${version.cash || 0}</td>
                <td class="${!isFirstVersion && changes.upi ? "changed-cell" : ""}">₹${version.UPI || 0}</td>
                <td class="${!isFirstVersion && changes.wallet ? "changed-cell" : ""}">₹${version.wallet || 0}</td>
                <td class="${!isFirstVersion && changes.discount ? "changed-cell" : ""}">₹${version.discount || 0}</td>
                <td class="amount-cell ${!isFirstVersion && changes.amount ? "changed-cell" : ""}">₹${version.amount || 0}</td>
                <td>${bill?.billedBy || '<span class="empty-cell">—</span>'}</td>
                <td>${version.editedBy}</td>
            </tr>
        `
        })
        .join("")

    // Compare current bill with last version for highlighting changes
    const lastVersion = versions[versions.length - 1]
    const currentChanges = {}

    if (lastVersion && bill) {
        currentChanges.cash = bill.cash !== lastVersion.cash
        currentChanges.upi = bill.upi !== lastVersion.UPI
        currentChanges.discount = bill.discount !== lastVersion.discount
        currentChanges.wallet = bill.wallet !== lastVersion.wallet
        currentChanges.units =
            unitsChanged(lastVersion.pcUnits, bill.pcUnits) || unitsChanged(lastVersion.psUnits, bill.psUnits)
        currentChanges.amount = bill.amount !== lastVersion.amount
    }

    // Add current version row
    const currentRow = bill
        ? `
        <tr class="current-row">
            <td><span class="current-badge">Current</span></td>
            <td>${bill.userName}</td>
            <td>${bill.contactNo}</td>
            <td class="units-cell ${currentChanges.units ? "changed-cell" : ""}">${formatUnits(null, bill)}</td>
            <td class="snacks-cell">${formatSnacks(bill)}</td>
            <td>-</td>
            <td class="${currentChanges.cash ? "changed-cell" : ""}">₹${bill.cash || 0}</td>
            <td class="${currentChanges.upi ? "changed-cell" : ""}">₹${bill.upi || 0}</td>
            <td class="${currentChanges.wallet ? "changed-cell" : ""}">₹${bill.wallet || 0}</td>
            <td class="${currentChanges.discount ? "changed-cell" : ""}">₹${bill.discount || 0}</td>
            <td class="amount-cell ${currentChanges.amount ? "changed-cell" : ""}">₹${bill.amount || 0}</td>
            <td>${bill.billedBy}</td>
            <td>—</td>
        </tr>
    `
        : ""

    return `
        <div class="table-container">
            <table class="versions-table">
                <thead>
                    <tr>
                        <th>Version</th>
                        <th>Customer Name</th>
                        <th>Contact</th>
                        <th>Units</th>
                        <th>Snacks</th>
                        <th>Edited At</th>
                        <th>Cash</th>
                        <th>UPI</th>
                        <th>Wallet</th>
                        <th>Discount</th>
                        <th>Amount</th>
                        <th>Billed by</th>
                        <th>Edited by</th>
                    </tr>
                </thead>
                <tbody>
                    ${versionRows}
                    ${currentRow}
                </tbody>
            </table>
        </div>
    `
}

// Render edit logs
function renderEditLogs(logs, bills) {
    const logsContainer = document.getElementById("logsContainer")

    if (logs.length === 0) {
        logsContainer.innerHTML = `
            <div class="no-logs">
                ${filteredLogs !== allLogs ? "No matching edit logs found." : "No edit logs found."}
            </div>
        `
        return
    }

    // Create a map of bills by ID for quick lookup
    const billsMap = {}
    bills.forEach((bill) => {
        billsMap[bill._id] = bill
    })

    logsContainer.innerHTML = logs
        .map((log) => {
            const bill = billsMap[log.billId]
            if (!bill) {
                return ""
            }
            return `
            <div class="bill-section">
                <div class="bill-header">
                    <h2>Bill ID: ${log.billId}</h2>
                    <div class="created-at">Created: ${formatDate(bill.bookingTime)}</div>
                </div>
                ${renderVersionsTable(log.versions, bill)}
            </div>
        `
        })
        .join("")
}

// Initialize page
async function initializePage() {
    try {
        // Initialize visual effects
        createGamingStickers()
        createParticles()
        setupMenu()

        // Fetch both edit logs and bills data
        const [logs, bills] = await Promise.all([fetchEditLogs(), fetchAllBills()])

        allLogs = logs
        allBills = bills
        filteredLogs = logs

        document.getElementById("loading").style.display = "none"

        // Setup search functionality
        setupSearch()

        renderEditLogs(filteredLogs, allBills)
    } catch (error) {
        console.error("Error initializing page:", error)
        document.getElementById("loading").style.display = "none"
        document.getElementById("logsContainer").innerHTML = `
            <div class="no-logs">
                Error loading edit logs. Please try again later.
            </div>
        `
    }
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Close menu if open
        const menuToggle = document.getElementById("menuToggle")
        const sideMenu = document.getElementById("sideMenu")
        const menuOverlay = document.getElementById("menuOverlay")

        if (sideMenu.classList.contains("open")) {
            menuToggle.classList.remove("active")
            sideMenu.classList.remove("open")
            menuOverlay.classList.remove("active")
        }
    }

    // Focus search on Ctrl+F
    if (e.ctrlKey && e.key === "f") {
        e.preventDefault()
        document.getElementById("searchInput").focus()
    }
})

// Start the application
initializePage()
