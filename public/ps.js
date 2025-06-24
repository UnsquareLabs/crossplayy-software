// Check authentication
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
// PS Data
const psData = [
    { id: 1, status: "available" },
    { id: 2, status: "available" },
    { id: 3, status: "available" },
    { id: 4, status: "available" },
    { id: 5, status: "available" },
    { id: 6, status: "available" },
    { id: 7, status: "available" },
]

const psPlayersMap = {}
let selectedPS5s = []
let snacksData = []
let snacksCart = []
let isPrebookMode = false
let currentBillId = null
let selectedBillInfo = null

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

// Snacks Workflow Functions
async function startSnacksWorkflow() {
    try {
        const response = await fetch("/api/bills/all", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.message || "Unauthorized")
        }

        const bills = await response.json()
        const unpaidBills = bills.filter((bill) => !bill.status && bill.type == "ps")

        if (unpaidBills.length === 0) {
            alert("No unpaid bills available!")
            return
        }

        showBillSelectionModal(unpaidBills)
        playSound(600, 0.2)
    } catch (error) {
        console.error("Error fetching bills:", error)
        alert("Failed to load bills. Please try again.")
    }
}

function showBillSelectionModal(bills) {
    const modal = document.getElementById("billSelectionModal")
    const billsList = document.getElementById("billSelectionList")

    billsList.innerHTML = bills
        .map((bill) => {
            const pss = bill.psUnits
                .map((ps) => {
                    const hours = Math.floor(ps.duration / 60)
                    const mins = ps.duration % 60
                    let timeStr = ""
                    if (hours > 0) timeStr += `${hours} hr `
                    if (mins > 0) timeStr += `${mins} min`
                    return `${ps.psId} (${timeStr.trim()})`
                })
                .join(", ")

            const bookingDate = new Date(bill.bookingTime)
            const istTime = bookingDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })

            return `
            <div class="bill-item selectable" onclick="selectBillForSnacks('${bill._id}', '${bill.userName}', '${pss}')">
                <div class="bill-ps">${bill.userName} • ${bill.contactNo}</div>
                <div class="bill-details">
                    ${pss}<br>
                    <small>Booked at: ${istTime}</small>
                </div>
                <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
            </div>
        `
        })
        .join("")

    modal.classList.add("show")
}

function selectBillForSnacks(billId, userName, ps5s) {
    currentBillId = billId
    selectedBillInfo = { userName, ps5s }

    closeBillSelection()
    setTimeout(() => {
        openSnacksPanel()
        playSound(800, 0.2)
    }, 50)
}

function closeBillSelection() {
    document.getElementById("billSelectionModal").classList.remove("show")
}

async function openSnacksPanel() {
    const snacksPanel = document.getElementById("snacksPanel")
    const selectedBillInfoDiv = document.getElementById("selectedBillInfo")

    if (selectedBillInfo) {
        selectedBillInfoDiv.innerHTML = `
            <strong>Selected Bill:</strong> ${selectedBillInfo.userName}<br>
            <small>${selectedBillInfo.ps5s}</small>
        `
    }

    snacksPanel.classList.add("open")

    if (snacksData.length === 0) {
        await loadSnacksData()
    }
}

function closeSnacksPanel() {
    document.getElementById("snacksPanel").classList.remove("open")
    currentBillId = null
    selectedBillInfo = null
    clearCart()
    playSound(400, 0.2)
}

async function loadSnacksData() {
    try {
        const response = await fetch("/api/snacks/all", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        if (!response.ok) {
            throw new Error("Failed to fetch snacks")
        }

        snacksData = await response.json()
        renderSnacksGrid()
        setupSnacksSearch()
        setupCategoryFilter()
    } catch (error) {
        console.error("Error loading snacks:", error)
        document.getElementById("snacksGrid").innerHTML =
            '<div style="text-align: center; color: #ff453a; padding: 20px;">Failed to load snacks</div>'
    }
}

async function fetchSnackImage(snackId, token) {
    try {
        const res = await fetch(`/api/snacks/image/${snackId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        if (!res.ok) throw new Error("Image fetch failed")
        const blob = await res.blob()
        return URL.createObjectURL(blob)
    } catch (err) {
        console.error("Failed to fetch image for snack:", snackId, err)
        return ""
    }
}

async function renderSnacksGrid(filteredSnacks = null) {
    const snacksGrid = document.getElementById("snacksGrid")
    const snacksToRender = filteredSnacks || snacksData
    const token = localStorage.getItem("token")

    if (snacksToRender.length === 0) {
        snacksGrid.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 20px;">No snacks found</div>'
        return
    }

    snacksGrid.innerHTML = snacksToRender
        .map((snack) => {
            const cartItem = snacksCart.find((item) => item.id === snack._id)
            const quantityInCart = cartItem ? cartItem.quantity : 0
            const isOutOfStock = snack.quantity <= 0

            return `
      <div class="snack-item" data-category="${snack.category}" id="snack-${snack._id}">
        <div class="snack-header">
          <img src="/placeholder.svg?height=70&width=80" alt="${snack.name}" class="snack-img-preview" id="snack-img-${snack._id}" />
          <div class="snack-info">
            <h4>${snack.name}</h4>
            <div class="snack-price">₹${snack.price}</div>
          </div>
          <div class="snack-stock ${isOutOfStock ? "out-of-stock" : ""}">
            ${isOutOfStock ? "Out of Stock" : `${snack.quantity} left`}
          </div>
        </div>
        <div class="snack-controls">
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateSnackQuantity('${snack._id}', -1)" 
              ${quantityInCart <= 0 ? "disabled" : ""}>-</button>
            <div class="quantity-display">${quantityInCart}</div>
            <button class="qty-btn" onclick="updateSnackQuantity('${snack._id}', 1)" 
              ${isOutOfStock || quantityInCart >= snack.quantity ? "disabled" : ""}>+</button>
          </div>
        </div>
      </div>
    `
        })
        .join("")

    for (const snack of snacksToRender) {
        const imgSrc = await fetchSnackImage(snack._id, token)
        if (imgSrc) {
            const imgElement = document.getElementById(`snack-img-${snack._id}`)
            if (imgElement) {
                imgElement.src = imgSrc
            }
        }
    }
}

function updateSnackQuantity(snackId, change) {
    const snack = snacksData.find((s) => s._id === snackId)
    if (!snack) return

    const existingCartItem = snacksCart.find((item) => item.id === snackId)

    if (existingCartItem) {
        existingCartItem.quantity += change
        if (existingCartItem.quantity <= 0) {
            snacksCart = snacksCart.filter((item) => item.id !== snackId)
        }
    } else if (change > 0) {
        snacksCart.push({
            id: snackId,
            name: snack.name,
            price: snack.price,
            quantity: 1,
        })
    }

    const updatedQuantity = snacksCart.find((item) => item.id === snackId)?.quantity || 0

    const snackItemElement = document
        .querySelector(`[onclick="updateSnackQuantity('${snackId}', -1)"]`)
        ?.closest(".snack-item")
    if (snackItemElement) {
        const qtyDisplay = snackItemElement.querySelector(".quantity-display")
        const minusBtn = snackItemElement.querySelector(`.qty-btn[onclick="updateSnackQuantity('${snackId}', -1)"]`)
        const plusBtn = snackItemElement.querySelector(`.qty-btn[onclick="updateSnackQuantity('${snackId}', 1)"]`)

        qtyDisplay.textContent = updatedQuantity
        minusBtn.disabled = updatedQuantity <= 0
        plusBtn.disabled = updatedQuantity >= snack.quantity
    }

    playSound(change > 0 ? 800 : 400, 0.1)
    updateSnacksCart()
}

function updateSnacksCart() {
    const cartContainer = document.getElementById("snacksCart")
    const cartItems = document.getElementById("cartItems")
    const cartTotal = document.getElementById("cartTotal")

    if (snacksCart.length === 0) {
        cartContainer.style.display = "none"
        return
    }

    cartContainer.style.display = "block"

    let total = 0
    cartItems.innerHTML = snacksCart
        .map((item) => {
            const itemTotal = item.price * item.quantity
            total += itemTotal

            return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">${item.quantity} × ₹${item.price}</div>
                </div>
                <div class="cart-item-total">₹${itemTotal}</div>
            </div>
        `
        })
        .join("")

    cartTotal.textContent = `₹${total}`
}

function clearCart() {
    snacksCart = []
    renderSnacksGrid()
    updateSnacksCart()
    playSound(400, 0.3)
}

async function addCartToBill() {
    if (snacksCart.length === 0) {
        alert("Cart is empty!")
        return
    }

    if (!currentBillId) {
        alert("No bill selected!")
        return
    }

    try {
        for (const item of snacksCart) {
            const res = await fetch(`/api/snacks/consume/${item.id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ usedQuantity: item.quantity }),
            })

            if (!res.ok) {
                const errData = await res.json()
                alert(`Error with ${item.name}: ${errData.message}`)
                return
            }
        }

        const response = await fetch("/api/bills/addSnack", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                billId: currentBillId,
                snacks: snacksCart,
            }),
        })

        if (!response.ok) {
            throw new Error("Failed to add snacks to bill")
        }

        playSound(1000, 0.5)
        alert("Snacks added to bill successfully!")

        clearCart()
        closeSnacksPanel()
        updateUnpaidBills()
        await loadSnacksData()
    } catch (error) {
        console.error("Error adding snacks to bill:", error)
        alert("Failed to add snacks to bill. Please try again.")
    }
}

function setupSnacksSearch() {
    const searchInput = document.getElementById("snacksSearch")
    searchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase()
        const filteredSnacks = snacksData.filter((snack) => snack.name.toLowerCase().includes(searchTerm))
        renderSnacksGrid(filteredSnacks)
    })
}

function setupCategoryFilter() {
    const categoryButtons = document.querySelectorAll(".category-btn")
    categoryButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            categoryButtons.forEach((b) => b.classList.remove("active"))
            this.classList.add("active")

            const category = this.dataset.category
            const filteredSnacks = category === "all" ? snacksData : snacksData.filter((snack) => snack.category === category)

            renderSnacksGrid(filteredSnacks)
            playSound(500, 0.1)
        })
    })
}

// PS Management Functions
async function fetchPSStatus(psId) {
    try {
        const res = await fetch(`/api/ps/timeleft/PS${psId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        const data = await res.json()

        const minutes = data.timeLeft
        let status = "available"
        let timeRemaining = "Ready to Play"

        if (typeof minutes === "number" && minutes > 0) {
            if (minutes <= 15) {
                status = "ending-soon"
                timeRemaining = `${minutes}m`
            } else {
                const hours = Math.floor(minutes / 60)
                const mins = minutes % 60
                timeRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                status = "occupied"
            }
        }

        if (status === "available") {
            const billsRes = await fetch("/api/bills/all", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })
            const bills = await billsRes.json()

            for (const bill of bills) {
                if (!bill.status && bill.type === "ps") {
                    const psUnitMatch = bill.psUnits.find((unit) => unit.psId === `PS${psId}`)
                    if (psUnitMatch) {
                        return {
                            status: "payment-due",
                            timeRemaining: "Payment Due",
                        }
                    }
                }
            }
        }
        // ✅ NEW: Fetch next booking for PS with debug
        const prebookRes = await fetch("/api/prebook/", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        const prebookings = await prebookRes.json();

        if (!Array.isArray(prebookings)) {
            // console.warn("⚠️ prebookings is not an array:", prebookings);
            return { status, timeRemaining, nextBookingTime: null };
        }

        const now = new Date();
        // console.log(`🔍 Checking future bookings for PS${psId} at ${now.toISOString()}`);

        // Filter for matching future bookings for this psId
        const upcoming = prebookings
            .filter(pb => {
                const match =
                    pb.type === "ps" &&
                    Array.isArray(pb.psUnits) &&
                    pb.psUnits.some(unit => String(unit.psId).trim() === `PS${String(psId).trim()}`) &&
                    new Date(pb.scheduledDate) > now &&
                    !pb.isConvertedToBill;

                // if (match) {
                //     // console.log(`✅ Matched prebooking ID: ${pb._id} | Scheduled: ${pb.scheduledDate}`);
                //     pb.psUnits.forEach(unit => {
                //         console.log(`  └─ 🎮 PS Unit: ${unit.psId}, Players: ${unit.players?.length ?? 0}, Duration: ${unit.duration} mins`);
                //     });
                // }

                return match;
            })
            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

        // console.log(`📊 Total upcoming PS bookings for today: ${upcoming.length}`);

        // upcoming.forEach((pb, index) => {
        //     console.log(`  #${index + 1}: ${pb.scheduledDate} by ${pb.name} (ID: ${pb._id})`);
        // });

        // if (upcoming.length > 0) {
        //     console.log(`📅 Next booking for PS${psId}: ${upcoming[0].scheduledDate}`);
        // } else {
        //     console.log(`🆓 No upcoming booking found for PS${psId}`);
        // }

        const nextBookingTime = upcoming.length > 0 ? upcoming[0].scheduledDate : null;

        return { status, timeRemaining, nextBookingTime };


    } catch (err) {
        console.error(`Error fetching time for PS5 ${psId}`, err)
        return { status: "available", timeRemaining: "Ready to Play" }
    }
}

async function initializePSCards() {
    const psGrid = document.getElementById("psGrid")
    psGrid.innerHTML = ""

    for (const ps of psData) {
        const psCard = document.createElement("div")
        psCard.id = `ps-card-${ps.id}`
        psCard.className = `ps-card available`
        psCard.onclick = () => selectPS(ps.id)

        psCard.innerHTML = `
            <div class="ps-header">
                <div class="ps-number">PS5 ${ps.id}</div>
                <div class="ps-status">Loading...</div>
            </div>
            <div class="ps-specs">
                PS5 • AMD Zen 2 • DualSense Controller • 4K HDR Gaming
            </div>
            <div class="next-booking">Next booking: --</div>
            <div class="ps-time">Checking...</div>
            <div class="extend-buttons"></div>
            <div class="unfreeze-button"></div>
        `

        psGrid.appendChild(psCard)
    }

    updatePSTimes()
    setInterval(updatePSTimes, 60000)
}

async function unfreezePS(formattedPsId) {
    const psId = formattedPsId.toString().startsWith("ps") ? formattedPsId : `PS${formattedPsId}`
    try {
        const res = await fetch("/api/ps/unfreeze", {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ psId }),
        })

        const data = await res.json()
        if (res.ok) {
            alert(`✓ PS ${psId} unfrozen successfully.`)
            updatePSTimes()
        } else {
            alert(`Failed to unfreeze PS: ${data.message}`)
        }
    } catch (err) {
        console.error("Error unfreezing PS:", err)
        alert("An unexpected error occurred.")
    }
}
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
        weekday: 'short',      // e.g., "Fri"
        month: 'short',        // e.g., "Jun"
        day: 'numeric',        // e.g., "21"
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}
const activeCountdowns = {}; // Holds active countdown intervals per PC

async function updatePSTimes() {
    for (const ps of psData) {
        const card = document.getElementById(`ps-card-${ps.id}`)
        if (!card) continue

        const statusDiv = card.querySelector(".ps-status")
        const timeDiv = card.querySelector(".ps-time")
        const extendDiv = card.querySelector(".extend-buttons")
        const unfreeze = card.querySelector(".unfreeze-button")
        const nextBookingDiv = card.querySelector(".next-booking")
        const { status, timeRemaining, nextBookingTime } = await fetchPSStatus(ps.id)

        ps.status = status
        card.className = `ps-card ${status}`

        statusDiv.textContent = status.replace("-", " ")
        statusDiv.className = `ps-status ${status}`
        timeDiv.textContent = timeRemaining
        timeDiv.className = `ps-time ${status}`

        if (nextBookingDiv) {
            nextBookingDiv.textContent = nextBookingTime
                ? `Next booking: ${formatTime(nextBookingTime)}`
                : "Next booking: --"
        }

        if (status === "occupied" || status === "ending-soon") {
            extendDiv.innerHTML = `
                <button class="extend-btn" onclick="confirmExtend(${ps.id}, 15); event.stopPropagation();">+15m</button>
                <button class="extend-btn" onclick="confirmExtend(${ps.id}, 30); event.stopPropagation();">+30m</button>
            `
            unfreeze.innerHTML = `
                <button class="unfreeze-btn" onclick="event.stopPropagation(); unfreezePSConfirm('${ps.id}')">Unfreeze</button>
            `
        } else {
            extendDiv.innerHTML = ""
            unfreeze.innerHTML = ""
        }

        // 15-minute warning logic
        const countdownBoxId = `countdown-box-${ps.id}`
        let countdownBox = card.querySelector(`#${countdownBoxId}`)
        const fifteenMinutesMs = 15 * 60 * 1000
        const now = new Date()

        if (nextBookingTime) {
            const nextTime = new Date(nextBookingTime)
            const diff = nextTime - now

            if (diff <= fifteenMinutesMs && diff > 0) {
                if (!countdownBox) {
                    countdownBox = document.createElement("div")
                    countdownBox.id = countdownBoxId
                    countdownBox.className = "countdown-box"
                    card.appendChild(countdownBox)
                }

                if (!activeCountdowns[ps.id]) {
                    activeCountdowns[ps.id] = setInterval(() => {
                        const remaining = nextTime - new Date()
                        if (remaining <= 0) {
                            clearInterval(activeCountdowns[ps.id])
                            delete activeCountdowns[ps.id]
                            countdownBox.remove()
                            return
                        }

                        const mins = Math.floor(remaining / 60000)
                        const secs = Math.floor((remaining % 60000) / 1000)
                        countdownBox.textContent = `⚠️ Booking in: ${mins}m ${secs}s`
                    }, 1000)
                }
            } else {
                // Remove countdown if not within 15 mins
                if (countdownBox) countdownBox.remove()
                if (activeCountdowns[ps.id]) {
                    clearInterval(activeCountdowns[ps.id])
                    delete activeCountdowns[ps.id]
                }
            }
        }
    }
    updateStatusCounts()
}

function confirmExtend(psId, minutes) {
    const price = minutes === 15 ? 20 : 25
    const confirmed = confirm(`Are you sure you want to extend PS ${psId} by ${minutes} minutes for ₹${price}?`)
    if (confirmed) {
        extendTime(psId, minutes)
    }
}

function unfreezePSConfirm(psId) {
    const confirmed = confirm(`Are you sure you want to unfreeze the ps${psId}?`)
    if (confirmed) {
        unfreezePS(psId)
    }
}

function updateStatusCounts() {
    const psCards = document.querySelectorAll(".ps-card")

    let available = 0
    let endingSoon = 0
    let occupied = 0

    psCards.forEach((card) => {
        if (card.classList.contains("available")) available++
        else if (card.classList.contains("ending-soon")) endingSoon++
        else if (card.classList.contains("occupied")) occupied++
    })

    document.getElementById("availableCount").textContent = available
    document.getElementById("endingSoonCount").textContent = endingSoon
    document.getElementById("occupiedCount").textContent = occupied
}
let flag = false;
function selectPS(psId) {
    const ps = psData.find((p) => p.id === psId)

    if (!ps) {
        console.warn(`PS with ID ${psId} not found in psData.`)
        return
    }
    if (ps.status === "occupied" || ps.status === "ending-soon" || ps.status === "payment-due") {
        playSound(500, 0.2);

        // Set context flag
        // occupiedPcContext = true;

        isPrebookMode = true;
        flag = true;
        // Clear previous selection and select only this PC
        selectedPS = [psId];
        updateSelectedPSsList();

        // Show booking section with prebook mode
        document.getElementById("bookSection").classList.add("show");

        // Force prebook mode UI
        const prebookButton = document.getElementById("prebookButton");
        const bookButton = document.getElementById("bookButton");
        const prebookingSection = document.getElementById("prebookingSection");

        prebookButton.classList.add("active");
        prebookButton.textContent = "📅 Cancel Prebook";
        bookButton.textContent = "Create Prebooking";
        prebookingSection.style.display = "block";

        // Hide regular booking button
        bookButton.style.display = "block";

        // Set minimum date to current date and time
        const now = new Date();
        const minDateTime = now.toISOString().slice(0, 16);
        document.getElementById("scheduledDateTime").min = minDateTime;

        return;
    }
    if (ps.status !== "available") {
        playSound(300, 0.3)
        // flag = false;
        return
    }

    playSound(600, 0.2)
    const psCard = event.currentTarget

    if (selectedPS5s.includes(psId)) {
        selectedPS5s = selectedPS5s.filter((id) => id !== psId)
        delete psPlayersMap[psId]
        psCard.classList.remove("selected")
    } else {
        selectedPS5s.push(psId)
        psPlayersMap[psId] = 1
        psCard.classList.add("selected")
    }

    updateSelectedPSsList()

    if (selectedPS5s.length > 0) {
        document.getElementById("bookSection").classList.add("show")
    } else {
        document.getElementById("bookSection").classList.remove("show")
    }
}

function setPlayersForPS(psId, players) {
    psPlayersMap[psId] = Number.parseInt(players)
}

function updateSelectedPSsList() {
    const selectedPSsList = document.getElementById("selectedPSsList")
    selectedPSsList.innerHTML = ""

    selectedPS5s.forEach((psId) => {
        const noOfPlayers = psPlayersMap[psId] || 1

        const psDiv = document.createElement("div")
        psDiv.style.cssText =
            "padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px;"

        psDiv.innerHTML = `
            <span>PS ${psId}</span>
            <label>
                Players:
                <select onchange="setPlayersForPS(${psId}, this.value)">
                    ${[1, 2, 3, 4].map((p) => `<option value="${p}" ${p === noOfPlayers ? "selected" : ""}>${p}</option>`).join("")}
                </select>
            </label>
            <button onclick="removeSelectedPS(${psId})" style="background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
        `

        selectedPSsList.appendChild(psDiv)
    })
}

async function updatePrebookingCount() {
    try {
        const response = await fetch("/api/prebook", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (response.ok) {
            const prebookings = await response.json()
            // ✅ Filter only PS type bookings
            const psBookings = prebookings.filter(p => p.type === 'ps');

            const count = psBookings.length

            // Update header button count
            const headerCount = document.getElementById("prebookingCount")
            if (headerCount) {
                headerCount.textContent = count
            }

            // Update status card count
            const statusCount = document.getElementById("prebookingStatusCount")
            if (statusCount) {
                statusCount.textContent = count
            }
        }
    } catch (error) {
        console.error("Error fetching prebooking count:", error)
    }
}

// Prebooking Management Functions
async function openPrebookingModal() {
    try {
        const response = await fetch("/api/prebook", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error("Failed to fetch prebookings")
        }

        const prebookings = await response.json()
        const psBookings = prebookings.filter(p => p.type === 'ps');

        displayPrebookings(psBookings)
        document.getElementById("prebookingModal").classList.add("show")
        playSound(600, 0.2)
    } catch (error) {
        console.error("Error fetching prebookings:", error)
        alert("Failed to load prebookings. Please try again.")
    }
}
function togglePlayerDetails(id) {
    const el = document.getElementById(id);
    if (el.style.display === "none") {
        el.style.display = "block";
    } else {
        el.style.display = "none";
    }
}

function displayPrebookings(prebookings) {
    const prebookingList = document.getElementById("prebookingList");

    if (prebookings.length === 0) {
        prebookingList.innerHTML =
            '<div style="text-align: center; opacity: 0.6; padding: 40px;">No prebookings found</div>';
        return;
    }

    prebookingList.innerHTML = prebookings
        .map((prebooking, index) => {
            const scheduledDate = new Date(prebooking.scheduledDate);
            const formattedDate = scheduledDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

            const hours = Math.floor(prebooking.duration / 60);
            const mins = prebooking.duration % 60;
            let durationStr = "";
            if (hours > 0) durationStr += `${hours}h `;
            if (mins > 0) durationStr += `${mins}m`;

            let unitsHtml = "";

            if (prebooking.type === "pc") {
                unitsHtml = prebooking.pcUnits
                    .map((unit, i) => `PC${unit}`)
                    .join(", ");
            } else {
                unitsHtml = prebooking.psUnits
                    .map((unit, uIndex) => {
                        const playerDetails = unit.players
                            .map(
                                (p) =>
                                    `<div class="player-line">Player ${p.playerNo} - ${p.duration} min</div>`
                            )
                            .join("");

                        const toggleId = `playerToggle-${index}-${uIndex}`;

                        return `
                            <div class="ps-unit">
                                <div><strong>${unit.psId}</strong> — ${unit.duration} min</div>
                                <button onclick="togglePlayerDetails('${toggleId}')" class="show-players-btn">👥 Show Players</button>
                                <div id="${toggleId}" class="player-details" style="display: none; margin-top: 4px;">
                                    ${playerDetails}
                                </div>
                            </div>
                        `;
                    })
                    .join("");
            }

            return `
            <div class="prebooking-item">
                <div class="prebooking-info">
                    <div class="prebooking-detail"><div class="prebooking-label">Customer</div><div class="prebooking-value">${prebooking.name}</div></div>
                    <div class="prebooking-detail"><div class="prebooking-label">Contact</div><div class="prebooking-value">${prebooking.contactNo}</div></div>
                    <div class="prebooking-detail"><div class="prebooking-label">Scheduled Date</div><div class="prebooking-value">${formattedDate}</div></div>
                    <div class="prebooking-detail"><div class="prebooking-label">Duration</div><div class="prebooking-value">${durationStr.trim()}</div></div>
                    <div class="prebooking-detail"><div class="prebooking-label">Type</div><div class="prebooking-value">${prebooking.type.toUpperCase()}</div></div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Units</div>
                        <div class="prebooking-value">${unitsHtml}</div>
                    </div>
                </div>
                <div class="prebooking-actions">
                    <button class="edit-prebooking-btn" onclick="editPrebooking('${prebooking._id}')">✏️ Edit</button>
                    <button class="delete-prebooking-btn" onclick="deletePrebooking('${prebooking._id}')">🗑️ Delete</button>
                </div>
            </div>
            `;
        })
        .join("");
}

async function deletePrebooking(prebookingId) {
    if (!confirm("Are you sure you want to delete this prebooking?")) {
        return
    }

    try {
        const response = await fetch(`/api/prebook/${prebookingId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to delete prebooking")
        }

        playSound(400, 0.3)
        alert("Prebooking deleted successfully!")
        openPrebookingModal() // Refresh the list
        updatePrebookingCount() // Update counts
    } catch (error) {
        console.error("Error deleting prebooking:", error)
        alert("Failed to delete prebooking. Please try again.")
    }
}

function closePrebookingModal() {
    document.getElementById("prebookingModal").classList.remove("show")
    playSound(400, 0.1)
}

async function editPrebooking(prebookingId) {
    try {
        const response = await fetch("/api/prebook", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch prebooking details");
        }

        const prebookings = await response.json();
        const prebooking = prebookings.find((p) => p._id === prebookingId);

        if (!prebooking) {
            alert("Prebooking not found");
            return;
        }

        currentEditingPrebookingId = prebookingId;

        // Populate main fields
        document.getElementById("editName").value = prebooking.name;
        document.getElementById("editContactNo").value = prebooking.contactNo;

        const scheduledDate = new Date(prebooking.scheduledDate);

        // Convert to IST manually (IST = UTC + 5:30)
        const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
        const istDate = new Date(scheduledDate.getTime() + istOffsetMs);

        // Format as "YYYY-MM-DDTHH:MM" for input type="datetime-local"
        const formattedDateTime = istDate.toISOString().slice(0, 16);
        document.getElementById("editScheduledDate").value = formattedDateTime;


        document.getElementById("editDuration").value = prebooking.duration;

        // Populate PS units and player inputs
        const container = document.getElementById("editPsUnitsContainer");
        container.innerHTML = prebooking.psUnits
            .map((unit, index) => {
                const playersHTML = unit.players
                    .map(
                        (player) => `
                        <div class="form-subgroup">
                            <label>Player ${player.playerNo} Duration (min)</label>
                            <input type="number"
                                class="form-input player-duration-input"
                                data-psindex="${index}"
                                data-player="${player.playerNo}"
                                value="${player.duration}"
                                min="10"
                                step="10"
                            />
                        </div>`
                    )
                    .join("");

                return `
                    <div class="form-group ps-unit-edit-block">
                        <label class="form-label">PS Unit: ${unit.psId}</label>
                        ${playersHTML}
                    </div>`;
            })
            .join("");

        // Show modal
        document.getElementById("editPrebookingModal").classList.add("show");
        playSound(600, 0.2);
    } catch (error) {
        console.error("Error loading prebooking for edit:", error);
        alert("Failed to load prebooking details. Please try again.");
    }
}

function closeEditPrebookingModal() {
    document.getElementById("editPrebookingModal").classList.remove("show")
    currentEditingPrebookingId = null
    playSound(400, 0.1)
}

async function saveEditedPrebooking() {
    if (!currentEditingPrebookingId) {
        alert("No prebooking selected for editing");
        return;
    }

    const name = document.getElementById("editName").value.trim();
    const contactNo = document.getElementById("editContactNo").value.trim();
    const scheduledDate = document.getElementById("editScheduledDate").value;
    const duration = Number.parseInt(document.getElementById("editDuration").value);

    if (!name || !contactNo || !scheduledDate || !duration) {
        alert("Please fill in all required fields");
        return;
    }

    // Rebuild psUnits from form fields
    const psUnitsMap = {};
    document.querySelectorAll(".player-duration-input").forEach((input) => {
        const psIndex = input.dataset.psindex;
        const playerNo = parseInt(input.dataset.player, 10);
        const playerDuration = parseInt(input.value, 10);

        if (!psUnitsMap[psIndex]) {
            psUnitsMap[psIndex] = {
                psId: `PS${parseInt(psIndex) + 1}`, // Or store original psId via data attr if needed
                duration: duration,
                players: [],
            };
        }

        psUnitsMap[psIndex].players.push({
            playerNo,
            duration: playerDuration,
        });
    });

    const psUnits = Object.values(psUnitsMap);

    if (psUnits.length === 0) {
        alert("Please specify at least one PS unit and player details");
        return;
    }

    const payload = {
        name,
        contactNo,
        scheduledDate,
        duration,
        type: "ps",
        pcUnits: [], // Since it's PS only
        psUnits,
        billedBy: "Admin",
    };

    try {
        const response = await fetch(`/api/prebook/${currentEditingPrebookingId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update prebooking");
        }

        playSound(800, 0.3);
        alert("Prebooking updated successfully!");
        closeEditPrebookingModal();
        openPrebookingModal(); // Refresh the list
        updatePrebookingCount(); // Update counter
    } catch (error) {
        console.error("Error updating prebooking:", error);
        alert("Failed to update prebooking. Please try again.");
    }
}

async function convertDuePSPrebookings() {
    try {
        const response = await fetch("/api/prebook/convert-due", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const result = await response.json();

            // Filter only PS bills
            const psBills = result.bills?.filter(b => b.type === 'ps') || [];

            if (psBills.length > 0) {
                console.log(`🎮 Converted ${psBills.length} due PS prebookings to bills`);

                // Update UI components specific to PS
                await updateUnpaidBills();       // Optional: If same list
                await updatePrebookingCount();   // Optional: If shows PS count

                // Show toast/alert or log
                showNotification(`${psBills.length} PS prebooking(s) converted to bills`, "success");
            }
        } else {
            console.warn("Failed to convert due PS prebookings:", await response.text());
        }
    } catch (error) {
        console.error("Error in auto-convert PS prebookings:", error);
    }
}

// Start auto-conversion of due PS prebookings every 60 seconds
setInterval(convertDuePSPrebookings, 30000); // Every 30 seconds

// Run once immediately on page load
convertDuePSPrebookings();


function removeSelectedPS(psId) {
    selectedPS5s = selectedPS5s.filter((id) => id !== psId)
    document.querySelectorAll(".ps-card").forEach((card) => {
        if (card.querySelector(".ps-number").textContent === `PS5 ${psId}`) {
            card.classList.remove("selected")
        }
    })
    updateSelectedPSsList()

    if (selectedPS5s.length === 0) {
        cancelSelection()
    }
}

function cancelSelection() {
    playSound(400, 0.2)

    document.querySelectorAll(".ps-card").forEach((card) => {
        card.classList.remove("selected")
    })
    isPrebookMode = false
    selectedPS5s = []
    document.getElementById("bookSection").classList.remove("show")
}

async function bookSelectedPSs() {
    const hours = Number.parseFloat(document.getElementById("hoursSelect").value)
    const userName = document.getElementById("userName").value
    const contactNumber = document.getElementById("contactNumber").value
    const bookButton = document.getElementById('bookButton'); // 🔁 Make sure your button has this ID
    bookButton.disabled = true; // Disable immediately
    if (!userName || !contactNumber) {
        alert("Please fill in all fields")
        return
    }

    const duration = hours * 60

    const bookings = selectedPS5s.map((psId) => ({
        psId: `PS${psId}`,
        duration,
        players: psPlayersMap[psId] || 1,
    }))

    const psUnits = selectedPS5s.map((psId) => {
        const playerCount = psPlayersMap[psId] || 1;

        const players = Array.from({ length: playerCount }, (_, i) => ({
            playerNo: i + 1,
            duration: duration, // each player has same duration; customize if needed
        }));

        return {
            psId: `PS${psId}`,
            duration,
            players,
        };
    });

    if (isPrebookMode) {
        // Handle prebooking
        const scheduledDateTime = document.getElementById("scheduledDateTime").value

        if (!scheduledDateTime) {
            alert("Please select a scheduled date and time for prebooking")
            bookButton.disabled = false
            return
        }

        try {
            const response = await fetch("/api/prebook/create", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "ps",
                    pcUnits: [], // empty for PS bookings
                    psUnits,
                    name: userName,
                    contactNo: contactNumber,
                    scheduledDate: scheduledDateTime,
                    duration,
                    billedBy: "Admin",
                }),
            });


            const result = await response.json()

            if (!response.ok) {
                alert(`Prebooking failed: ${result.message}`)
                return
            }

            playSound(800, 0.3)
            alert("Prebooking created successfully!")

            // Reset form
            document.getElementById("userName").value = ""
            document.getElementById("contactNumber").value = ""
            document.getElementById("hoursSelect").value = "1"
            document.getElementById("scheduledDateTime").value = ""

            cancelSelection()
            isPrebookMode = false
            updatePrebookingCount() // Update prebooking counts
        } catch (error) {
            console.error("Prebooking error:", error)
            alert("Prebooking failed. Please try again.")
        }
    } else {
        try {
            const response = await fetch("/api/ps/book", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ bookings }),
            })

            const result = await response.json()

            if (!response.ok) {
                alert(`Booking failed: ${result.message}`)
                return
            }

            const billPayload = {
                userName,
                contactNo: contactNumber,
                psUnits: bookings,
                type: "ps",
            }

            const billResponse = await fetch("/api/bills/create", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(billPayload),
            })

            const billResult = await billResponse.json()

            if (!billResponse.ok) {
                alert(`Billing failed: ${billResult.message}`)
                return
            }

            playSound(800, 0.3)

            await updateUnpaidBills()
            await initializePSCards()
            cancelSelection()

            document.getElementById("userName").value = ""
            document.getElementById("contactNumber").value = ""
            document.getElementById("hoursSelect").value = "1"
        } catch (error) {
            console.error("Booking error:", error)
            alert("Booking failed. Please try again.")
        } finally {
            setTimeout(() => {
                bookButton.disabled = false; // Re-enable after 5 seconds
            }, 5000);
        }
    }
}

async function extendTime(psId, minutes) {
    playSound(600, 0.2)

    try {
        const billResponse = await fetch("/api/bills/extend-bill", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ psId: `PS${psId}`, extendTime: minutes, type: "ps" }),
        })

        const billData = await billResponse.json()

        if (billResponse.ok) {
            console.log("✅ Updated bill:", billData.bill)
        } else {
            console.warn("⚠️ Failed to update bill:", billData.message)
        }

        const bookingResponse = await fetch("/api/ps/extend-booking", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ psId: `PS${psId}`, extendDuration: minutes }),
        })

        const bookingData = await bookingResponse.json()

        if (bookingResponse.ok) {
            console.log("✅ PS duration extended:", bookingData.ps)
        } else {
            console.warn("⚠️ Failed to extend PS booking:", bookingData.message)
        }

        updatePSTimes()
        updateUnpaidBills()
    } catch (error) {
        console.error("❌ Error extending time:", error)
    }
}

async function updateUnpaidBills() {
    const unpaidBillsContainer = document.getElementById("unpaidBills")
    unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">Loading bills...</div>'

    try {
        const res = await fetch("/api/bills/all", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        const bills = await res.json()

        unpaidBillsContainer.innerHTML = ""

        const unpaid = bills.filter((bill) => !bill.status && bill.type === "ps")

        if (unpaid.length === 0) {
            unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">No unpaid bills</div>'
            return
        }

        unpaid.forEach((bill) => {
            const pss = bill.psUnits.map((ps, idx) => {
                const durationStr = `${Math.floor(ps.duration / 60)}h ${ps.duration % 60}m`
                const players = ps.players?.length || 1

                const playersDetails = ps.players?.map(p => {
                    const h = Math.floor(p.duration / 60)
                    const m = p.duration % 60
                    const durStr = `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m" : ""}`
                    return `Player ${p.playerNo}: ${durStr.trim()}`
                }).join("<br>") || "Player 1: Full duration"

                return `
            <div style="margin-bottom: 5px;">
                <strong>${ps.psId}</strong> (${durationStr} • ${players}P)
                <div class="player-details" style="display:none; margin-left: 10px; font-size: 0.9em; color: #999;">
                    ${playersDetails}
                </div>               
            </div>
        `
            }).join("")

            const bookingDate = new Date(bill.bookingTime)
            const istTime = bookingDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })

            let snacksInfo = ""
            if (bill.snacks && bill.snacks.length > 0) {
                const snacksList = bill.snacks.map((snack) => `${snack.name} (${snack.quantity})`).join(", ")
                snacksInfo = `<br><small>🍿 Snacks: ${snacksList}</small>`
            }

            const billDiv = document.createElement("div")
            billDiv.className = "bill-item"
            billDiv.innerHTML = `
        <div class="bill-ps">${bill.userName} • ${bill.contactNo}<br></div>
        <div class="bill-details">
            ${pss}
            <small>Booked at: ${istTime}</small>
            ${snacksInfo}
        </div>
        <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
        <button class="pay-btn" onclick="showPaymentModal('${bill._id}')">Pay Bill</button>
    `
            unpaidBillsContainer.appendChild(billDiv)
        })

    } catch (err) {
        console.error("Error fetching bills:", err)
        unpaidBillsContainer.innerHTML = '<div style="text-align: center; color: red;">Failed to load bills</div>'
    }
}
function togglePlayers(id) {
    const el = document.getElementById(id)
    if (el) {
        el.style.display = el.style.display === "none" ? "block" : "none"
    }
}

async function showPaymentModal(billId) {
    try {
        const res = await fetch(`/api/bills/${billId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        if (!res.ok) {
            throw new Error("Failed to fetch bill details")
        }

        const bill = await res.json()

        const bookingDate = new Date(bill.bookingTime)
        const formattedBookingTime = bookingDate.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Kolkata",
        })

        const contactNo = bill.contactNo

        fetch(`/api/customer/wallet/${contactNo}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.walletCredit !== undefined) {
                    const walletDisplay = document.getElementById("walletCreditDisplay")
                    if (walletDisplay) {
                        walletDisplay.innerHTML = `Available Wallet Credit: ₹${data.walletCredit}`
                    }
                }
            })
            .catch((err) => {
                console.error("Error fetching wallet credit:", err)
            })

        const psUsageList = bill.psUnits.map((ps, index) => {
            const hours = Math.floor(ps.duration / 60)
            const mins = ps.duration % 60
            const durationStr = `${hours > 0 ? hours + "h " : ""}${mins > 0 ? mins + "m" : ""}`.trim()

            const playersDetailId = `ps-players-${index}`
            const playersDetail = ps.players?.map((p) => {
                const h = Math.floor(p.duration / 60)
                const m = p.duration % 60
                const timeStr = `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m" : ""}`.trim()
                return `Player ${p.playerNo}: ${timeStr}`
            }).join("<br>") || "Player 1: Full duration"

            return `
            <div style="margin-bottom: 8px;">
                <strong>${ps.psId}</strong> (${durationStr})
                <button onclick="togglePlayers('${playersDetailId}')" style="margin-left: 10px; font-size: 12px;">Show/Hide Players</button>
                <div id="${playersDetailId}" style="margin-left: 15px; margin-top: 5px; font-size: 14px; color: #666; display: none;">
                    ${playersDetail}
                </div>
            </div>
        `
        }).join("")


        // Fetch Loyalty Points
        fetch(`/api/customer/loyalty/${contactNo}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.loyaltyPoints !== undefined) {
                    const loyaltyDisplay = document.getElementById('loyaltyPointsDisplay');
                    loyaltyDisplay.innerHTML = `Available Loyalty Points: ₹${data.loyaltyPoints}`;
                }
            })
            .catch(err => {
                console.error('Error fetching loyalty points:', err);
            });

        let snacksSection = ""
        if (bill.snacks && bill.snacks.length > 0) {
            const snacksList = bill.snacks
                .map((snack) => {
                    return `<div>• ${snack.name} - ${snack.quantity} × ₹${snack.price}</div>`
                })
                .join("")
            snacksSection = `
                    <div><strong>Snacks:</strong></div>
                    <div style="margin-left: 15px;">${snacksList}</div>
                `
        }

        let amountBreakdown = ""
        if (bill.remainingAmt > 0) {
            amountBreakdown = `
                    <div><strong>Paid Amount:</strong> ₹${bill.paidAmt?.toFixed(2) || 0}</div>
                    <div><strong>Remaining Amount:</strong> ₹${bill.remainingAmt.toFixed(2)}</div>
                `
        }

        const paymentSummary = document.getElementById("paymentSummary")
        const originalAmount = bill.amount.toFixed(2)

        paymentSummary.innerHTML = `
               <div style="margin-bottom: 8px;"><strong>Booking Time:</strong> ${formattedBookingTime}</div>
<div style="margin-bottom: 8px;"><strong>Customer:</strong> ${bill.userName}</div>
<div style="margin-bottom: 8px;"><strong>Contact:</strong> ${bill.contactNo}</div>
                <div><strong>PS Used:</strong></div>
<div style="margin-left: 15px; margin-bottom: 8px;">${psUsageList}</div>
                ${snacksSection}
                ${amountBreakdown}

                <!-- Wallet + Loyalty Side-by-Side -->
<div style="display: flex; justify-content: space-between; gap: 10px; margin: 10px 0;">
    <div style="flex: 1;">
        <label style="font-size: 14px;">
            <input type="checkbox" id="useWalletCheckbox" />
            Wallet
        </label>
        <div id="walletCreditDisplay" style="font-size: 13px; color: #555;"></div>
    </div>
    <div style="flex: 1;">
        <label style="font-size: 14px;">
            <input type="checkbox" id="useLoyaltyCheckbox" />
            Loyalty
        </label>
        <div id="loyaltyPointsDisplay" style="font-size: 13px; color: #555;"></div>
    </div>
</div>
                
             <!-- Discount -->
<div style="margin-bottom: 10px;">
    <label style="font-size: 14px;"><strong>Discount (₹):</strong></label>
    <input type="number" id="discountInput" min="0" value="0" 
        style="padding: 6px 10px; width: 100%; font-size: 14px; border-radius: 6px;" />
</div>

<!-- Cash & UPI side-by-side -->
<div style="display: flex; gap: 10px;">
    <div style="flex: 1;">
        <label style="font-size: 14px;"><strong>Cash (₹):</strong></label>
        <input type="number" id="cashInput" min="0" required 
            style="padding: 6px 10px; width: 100%; font-size: 14px; border-radius: 6px;" />
    </div>
    <div style="flex: 1;">
        <label style="font-size: 14px;"><strong>UPI (₹):</strong></label>
        <input type="number" id="upiInput" min="0" required 
            style="padding: 6px 10px; width: 100%; font-size: 14px; border-radius: 6px;" />
    </div>
</div>

 
<!-- Final Total -->
<div class="payment-total" style="margin-top: 12px; font-size: 16px;">
    <strong>Total:</strong> ₹<span id="finalAmount">${originalAmount}</span>
</div>
            `

        const discountInput = document.getElementById("discountInput")
        const finalAmountDisplay = document.getElementById("finalAmount")

        discountInput.addEventListener("input", () => {
            let discount = Number.parseFloat(discountInput.value) || 0
            discount = Math.max(0, Math.min(discount, bill.amount))

            const finalAmount = (bill.amount - discount).toFixed(2)
            finalAmountDisplay.textContent = finalAmount
        })

        const paymentModal = document.getElementById("paymentModal")
        paymentModal.classList.add("show")
        paymentModal.dataset.billId = bill._id
    } catch (error) {
        console.error("Error loading bill:", error)
        alert("Unable to load bill details. Please try again.")
    }
}

function closePaymentModal() {
    document.getElementById("paymentModal").classList.remove("show")
}

async function confirmPayment() {
    const billId = document.getElementById("paymentModal").dataset.billId
    const cash = Number.parseInt(document.getElementById("cashInput").value, 10) || 0
    const upi = Number.parseInt(document.getElementById("upiInput").value, 10) || 0
    const discount = Number.parseInt(document.getElementById("discountInput").value, 10) || 0
    const useWallet = document.getElementById("useWalletCheckbox").checked
    const useLoyalty = document.getElementById('useLoyaltyCheckbox').checked;
    let wallet = -1;  // Default to -1 if not used
    let loyalty = -1;

    if (useWallet) {
        const walletText = document.getElementById('walletCreditDisplay').innerText;
        const match = walletText.match(/₹(\d+)/);
        if (match && match[1]) {
            wallet = parseInt(match[1], 10);
        }
    }

    if (useLoyalty) {
        const loyaltyText = document.getElementById('loyaltyPointsDisplay').innerText;
        const match = loyaltyText.match(/₹(\d+)/);
        if (match && match[1]) {
            loyalty = parseInt(match[1], 10);
        }
    }

    try {
        const oldBillRes = await fetch(`/api/bills/${billId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!oldBillRes.ok) throw new Error('Failed to fetch bill before payment');

        const oldBill = await oldBillRes.json();
        const paidAmt = oldBill.paidAmt || 0;
        const oldGamingTotal = paidAmt !== 0 ? (oldBill.gamingTotal || 0) : 0;

        const response = await fetch(`/api/bills/${billId}/pay`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cash, upi, discount, wallet, loyalty }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            alert(errorData.message || "Failed to update bill status")
            return
        }

        const newBillRes = await fetch(`/api/bills/${billId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!newBillRes.ok) throw new Error('Failed to fetch updated bill');

        const newBill = await newBillRes.json();
        const newGamingTotal = newBill.gamingTotal || 0;

        // 4. Loyalty Points Calculation
        const calculateLoyaltyPoints = (amount) => {
            if (amount >= 360) return 30;
            if (amount >= 180) return 15;
            if (amount >= 150) return 10;
            if (amount >= 100) return 5;
            return 0;
        };

        const prevPoints = calculateLoyaltyPoints(oldGamingTotal);
        const newPoints = calculateLoyaltyPoints(newGamingTotal);
        console.log(prevPoints);
        console.log(newPoints)
        const netLoyaltyPoints = newPoints - prevPoints;

        const customerPayload = {
            name: newBill.userName,
            contactNo: newBill.contactNo,
            loyaltyPoints: netLoyaltyPoints
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
            console.warn("Customer save failed:", customerResult.message)
        } else {
            console.log("Customer update result:", customerResult.message)
        }

        updatePSTimes()
        updateUnpaidBills()
        closePaymentModal()

        playSound(800, 0.5)

        setTimeout(() => {
            alert("Payment successful!")
        }, 100)
    } catch (error) {
        console.error("Error updating bill status:", error)
        alert("Failed to confirm payment. Please try again.")
    }
}

// Initialize
createGamingStickers()
createParticles()
setupMenu()
initializePSCards()
updateUnpaidBills()
updatePrebookingCount() // Initialize prebooking count

// Update prebooking count periodically
setInterval(updatePrebookingCount, 30000)
// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        cancelSelection()
        closePaymentModal()
        closeBillSelection()
        if (document.getElementById("snacksPanel").classList.contains("open")) {
            closeSnacksPanel()
        }

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
})

// Close modals when clicking outside
document.addEventListener("click", (e) => {
    const snacksPanel = document.getElementById("snacksPanel")
    const billSelectionModal = document.getElementById("billSelectionModal")
    const prebookingModal = document.getElementById("prebookingModal")
    const editPrebookingModal = document.getElementById("editPrebookingModal")

    if (!snacksPanel.contains(e.target) && !e.target.closest(".add-snacks-btn")) {
        if (snacksPanel.classList.contains("open")) {
            closeSnacksPanel()
        }
    }

    if (
        !billSelectionModal.querySelector(".bill-selection-content").contains(e.target) &&
        billSelectionModal.classList.contains("show")
    ) {
        closeBillSelection()
    }

    if (
        !prebookingModal.querySelector(".prebooking-content").contains(e.target) &&
        prebookingModal.classList.contains("show")
    ) {
        closePrebookingModal()
    }

    if (
        !editPrebookingModal.querySelector(".edit-prebooking-content").contains(e.target) &&
        editPrebookingModal.classList.contains("show")
    ) {
        closeEditPrebookingModal()
    }
})

function togglePrebookMode() {
    // Prevent toggling in occupied context
    // if (occupiedPcContext) {
    //   playSound(300, 0.1);
    //   isPrebookMode = true
    //   // return;
    // }

    isPrebookMode = true;
    const prebookButton = document.getElementById("prebookButton")
    const bookButton = document.getElementById("bookButton")
    const prebookingSection = document.getElementById("prebookingSection")

    if (!flag) {
        prebookButton.classList.remove("active")
        prebookButton.textContent = "📅 Prebook"
        bookButton.textContent = "Book Now"
        prebookingSection.style.display = "block"
    }

    flag = false;
    playSound(600, 0.2)
}