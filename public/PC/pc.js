const token = localStorage.getItem("token")

if (!token) {
  alert("Unauthorized. Please log in first.")
  window.location.href = "../login/login.html"
}
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token")
    window.location.href = "../login/login.html"
  }
}

// PC Data
const pcData = [
  { id: 1, status: "available" },
  { id: 2, status: "available" },
  { id: 3, status: "available" },
  { id: 4, status: "available" },
  { id: 5, status: "available" },
  { id: 6, status: "available" },
  { id: 7, status: "available" },
  { id: 8, status: "available" },
  { id: 9, status: "available" },
  { id: 10, status: "available" },
  { id: 11, status: "available" },
  { id: 12, status: "available" },
  { id: 13, status: "available" },
  { id: 14, status: "available" },
]

let selectedPCs = []
let snacksData = []
let snacksCart = []
let currentBillId = null
let selectedBillInfo = null
let isPrebookMode = false
let currentEditingPrebookingId = null

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
let audioInitialized = false

// Initialize audio on first user interaction
function initAudioContext() {
  if (audioContext.state === "suspended") {
    audioContext.resume()
  }
  audioInitialized = true
}

function playSound(frequency, duration) {
  try {
    if (!audioInitialized) return

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

// Update prebooking count in header and status card
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
      const psBookings = prebookings.filter((p) => p.type === "pc")

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
    const psBookings = prebookings.filter((p) => p.type === "pc")

    displayPrebookings(psBookings)
    document.getElementById("prebookingModal").classList.add("show")
    playSound(600, 0.2)
  } catch (error) {
    console.error("Error fetching prebookings:", error)
    alert("Failed to load prebookings. Please try again.")
  }
}

function displayPrebookings(prebookings) {
  const prebookingList = document.getElementById("prebookingList")

  if (prebookings.length === 0) {
    prebookingList.innerHTML =
      '<div style="text-align: center; opacity: 0.6; padding: 40px;">No prebookings found</div>'
    return
  }

  prebookingList.innerHTML = prebookings
    .map((prebooking) => {
      const scheduledDate = new Date(prebooking.scheduledDate)
      const formattedDate = scheduledDate.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      const hours = Math.floor(prebooking.duration / 60)
      const mins = prebooking.duration % 60
      let durationStr = ""
      if (hours > 0) durationStr += `${hours}h `
      if (mins > 0) durationStr += `${mins}m`

      return `
            <div class="prebooking-item">
                <div class="prebooking-info">
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Customer</div>
                        <div class="prebooking-value">${prebooking.name}</div>
                    </div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Contact</div>
                        <div class="prebooking-value">${prebooking.contactNo}</div>
                    </div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Scheduled Date</div>
                        <div class="prebooking-value">${formattedDate}</div>
                    </div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Duration</div>
                        <div class="prebooking-value">${durationStr.trim()}</div>
                    </div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Type</div>
                        <div class="prebooking-value">${prebooking.type.toUpperCase()}</div>
                    </div>
                    <div class="prebooking-detail">
                        <div class="prebooking-label">Units</div>
                        <div class="prebooking-value">
                            ${prebooking.type === "pc" ? `${prebooking.pcUnits || 0} PCs` : `${prebooking.psUnits || 0} PS`}
                        </div>
                    </div>
                </div>
                <div class="prebooking-actions">
                    <button class="edit-prebooking-btn" onclick="editPrebooking('${prebooking._id}')">
                        ✏️ Edit
                    </button>
                    <button class="delete-prebooking-btn" onclick="deletePrebooking('${prebooking._id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `
    })
    .join("")
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
    })

    if (!response.ok) {
      throw new Error("Failed to fetch prebooking details")
    }

    const prebookings = await response.json()
    const prebooking = prebookings.find((p) => p._id === prebookingId)

    if (!prebooking) {
      alert("Prebooking not found")
      return
    }

    currentEditingPrebookingId = prebookingId

    // Populate edit form
    document.getElementById("editName").value = prebooking.name
    document.getElementById("editContactNo").value = prebooking.contactNo

    // Format date for datetime-local input
    const scheduledDate = new Date(prebooking.scheduledDate)

    // Convert to IST manually (IST = UTC + 5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
    const istDate = new Date(scheduledDate.getTime() + istOffsetMs)

    // Format as "YYYY-MM-DDTHH:MM" for input type="datetime-local"
    const formattedDateTime = istDate.toISOString().slice(0, 16)
    document.getElementById("editScheduledDate").value = formattedDateTime

    document.getElementById("editDuration").value = prebooking.duration
    document.getElementById("editPcUnits").value = (prebooking.pcUnits || []).join(", ");
    // document.getElementById("editPcUnits").value = prebooking.pcUnits || 0

    document.getElementById("editPrebookingModal").classList.add("show")
    updatePCTimes()
    playSound(600, 0.2)
  } catch (error) {
    console.error("Error loading prebooking for edit:", error)
    alert("Failed to load prebooking details. Please try again.")
  }
}

function closeEditPrebookingModal() {
  document.getElementById("editPrebookingModal").classList.remove("show")
  currentEditingPrebookingId = null
  playSound(400, 0.1)
}

async function saveEditedPrebooking() {
  if (!currentEditingPrebookingId) {
    alert("No prebooking selected for editing")
    return
  }

  const name = document.getElementById("editName").value.trim()
  const contactNo = document.getElementById("editContactNo").value.trim()
  // const scheduledDate = document.getElementById("editScheduledDate").value
  // Handle prebooking
  const localDateTime = document.getElementById("editScheduledDate").value

  // Convert local datetime string to UTC
  const scheduledDate = new Date(localDateTime).toISOString();
  const duration = Number.parseInt(document.getElementById("editDuration").value)
  // const pcUnitsRaw = document.getElementById("editPcUnits").value.trim();
  // const pcUnits = pcUnitsRaw ? pcUnitsRaw.split(",").map(u => u.trim()) : [];
  // const psUnits = 0
  const nameRegex = /^[A-Za-z\s]+$/;
  const phoneRegex = /^\d{10}$/;

  if (!nameRegex.test(name)) {
    alert("❌ Customer name must only contain letters and spaces.");
    return;
  }

  if (!phoneRegex.test(contactNo)) {
    alert("❌ Contact number must be exactly 10 digits.");
    return;
  }

  if (!name || !contactNo || !scheduledDate || !duration) {
    alert("Please fill in all required fields")
    return
  }

  // if (pcUnits === 0 && psUnits === 0) {
  //   alert("Please specify at least one PC or PS unit")
  //   return
  // }

  // const type = pcUnits > 0 ? "pc" : "ps"

  try {
    const response = await fetch(`/api/prebook/${currentEditingPrebookingId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        contactNo,
        scheduledDate,
        duration,
        // type,
        // pcUnits: type === "pc" ? pcUnits : 0,
        // psUnits: type === "ps" ? psUnits : 0,
        // billedBy: "Admin", // You can modify this based on your auth system
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to update prebooking")
    }

    playSound(800, 0.3)
    alert("Prebooking updated successfully!")
    closeEditPrebookingModal()
    openPrebookingModal() // Refresh the list
    updatePrebookingCount() // Update counts
  } catch (error) {
    console.error("Error updating prebooking:", error)
    alert("Failed to update prebooking. Please try again.")
  }
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

// Auto-convert due prebookings to bills
async function convertDuePrebookings() {
  try {
    const response = await fetch("/api/prebook/convert-due", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const result = await response.json()
      if (result.bills && result.bills.length > 0) {
        console.log(`✅ Converted ${result.bills.length} due prebookings to bills`)

        // Update UI components
        await updateUnpaidBills()
        await updatePrebookingCount()

        // Optional: Show a subtle notification
        showNotification(`${result.bills.length} prebooking(s) converted to bills`, "success")
      }
    } else {
      console.warn("Failed to convert due prebookings:", await response.text())
    }
  } catch (error) {
    console.error("Error in auto-convert prebookings:", error)
  }
}

// Notification system for prebooking conversions
function showNotification(message, type = "info") {
  // Create notification element if it doesn't exist
  let notificationContainer = document.getElementById("notificationContainer")
  if (!notificationContainer) {
    notificationContainer = document.createElement("div")
    notificationContainer.id = "notificationContainer"
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    `
    document.body.appendChild(notificationContainer)
  }

  const notification = document.createElement("div")
  notification.style.cssText = `
    background: ${type === "success" ? "rgba(40, 167, 69, 0.9)" : "rgba(0, 123, 255, 0.9)"};
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    margin-bottom: 10px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transform: translateX(100%);
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    cursor: pointer;
  `

  notification.textContent = `📅 ${message}`
  notificationContainer.appendChild(notification)

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }, 4000)

  // Click to dismiss
  notification.addEventListener("click", () => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  })
}

// Prebooking Mode Toggle
function togglePrebookMode() {
  // Prevent toggling in occupied context
  // if (occupiedPcContext) {
  //   playSound(300, 0.1);
  //   isPrebookMode = true
  //   // return;
  // }

  isPrebookMode = true
  const prebookButton = document.getElementById("prebookButton")
  const bookButton = document.getElementById("bookButton")
  const prebookingSection = document.getElementById("prebookingSection")

  if (!flag) {
    prebookButton.classList.remove("active")
    prebookButton.textContent = "📅 Prebook"
    bookButton.textContent = "Book Now"
    prebookingSection.style.display = "block"
  }

  flag = false
  playSound(600, 0.2)
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
    const unpaidBills = bills.filter((bill) => !bill.status && bill.type == "pc")

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
      const pcs = bill.pcUnits
        .map((pc) => {
          const hours = Math.floor(pc.duration / 60)
          const mins = pc.duration % 60
          let timeStr = ""
          if (hours > 0) timeStr += `${hours} hr `
          if (mins > 0) timeStr += `${mins} min`
          return `${pc.pcId} (${timeStr.trim()})`
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
            <div class="bill-item selectable" onclick="selectBillForSnacks('${bill._id}', '${bill.userName}', '${pcs}')">
                <div class="bill-pc">${bill.userName} • ${bill.contactNo}</div>
                <div class="bill-details">
                    ${pcs}<br>
                    <small>Booked at: ${istTime}</small>
                </div>
                <div class="bill-amount">₹${bill.amount.toFixed(2)}</div>
            </div>
        `
    })
    .join("")

  modal.classList.add("show")
}

function selectBillForSnacks(billId, userName, pcs) {
  currentBillId = billId
  selectedBillInfo = { userName, pcs }

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
            <small>${selectedBillInfo.pcs}</small>
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
          <img src="/placeholder.svg" alt="${snack.name}" class="snack-img-preview" id="snack-img-${snack._id}" />
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

async function updateSnackQuantity(snackId, change) {
  const snack = snacksData.find((snacks) => snacks._id === snackId)
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

// PC Management Functions
// async function fetchPCStatus(pcId) {
//   try {
//     const res = await fetch(`/api/pc/timeleft/PC${pcId}`, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     })
//     const data = await res.json()

//     const minutes = data.timeLeft
//     let status = "available"
//     let timeRemaining = "Ready to Play"

//     if (typeof minutes === "number" && minutes > 0) {
//       if (minutes <= 15) {
//         status = "ending-soon"
//         timeRemaining = `${minutes}m`
//       } else {
//         const hours = Math.floor(minutes / 60)
//         const mins = minutes % 60
//         timeRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
//         status = "occupied"
//       }
//     }

//     if (status === "available") {
//       const billsRes = await fetch("/api/bills/all", {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       })
//       const bills = await billsRes.json()

//       for (const bill of bills) {
//         if (!bill.status && bill.type === "pc") {
//           const pcUnitMatch = bill.pcUnits.find((unit) => unit.pcId === `PC${pcId}`)
//           if (pcUnitMatch) {
//             return {
//               status: "payment-due",
//               timeRemaining: "Payment Due",
//             }
//           }
//         }
//       }
//     }
//     // ✅ NEW: Fetch next booking
//     const prebookRes = await fetch("/api/prebook/", {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     })
//     const prebookings = await prebookRes.json()
//     if (!Array.isArray(prebookings)) {
//       console.warn("⚠️ prebookings is not an array:", prebookings)
//       return { status, timeRemaining, nextBookingTime: null }
//     }

//     const now = new Date()
//     console.log(`🔍 Checking future bookings for PC${pcId}`)

//     const upcoming = prebookings
//       .filter((pb) => {
//         const match =
//           pb.type === "pc" &&
//           Array.isArray(pb.pcUnits) &&
//           pb.pcUnits.includes(String(pcId)) &&
//           new Date(pb.scheduledDate) > now &&
//           !pb.isConvertedToBill

//         if (match) {
//           console.log(`✅ Matched booking for PC${pcId}:`, pb)
//         }
//         return match
//       })
//       .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))

//     if (upcoming.length > 0) {
//       console.log(`📅 Next booking for PC${pcId}:`, upcoming[0].scheduledDate)
//     } else {
//       console.log(`🆓 No upcoming booking found for PC${pcId}`)
//     }

//     const nextBookingTime = upcoming.length > 0 ? upcoming[0].scheduledDate : null

//     return { status, timeRemaining, nextBookingTime }
//   } catch (err) {
//     console.error(`Error fetching time for PC ${pcId}`, err)
//     return { status: "available", timeRemaining: "Ready to Play" }
//   }
// }

const pcTimers = {} // 🆕 Map to track timers per PC

async function fetchPCStatus(pcId) {
  try {
    const res = await fetch(`/api/pc/timeleft/PC${pcId}`, {
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
        if (!bill.status && bill.type === "pc") {
          const pcUnitMatch = bill.pcUnits.find((unit) => unit.pcId === `PC${pcId}`)
          if (pcUnitMatch) {
            return {
              status: "payment-due",
              timeRemaining: "Payment Due",
            }
          }
        }
      }
    }

    // ✅ NEW: Fetch next booking
    const prebookRes = await fetch("/api/prebook/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    const prebookings = await prebookRes.json()
    if (!Array.isArray(prebookings)) {
      console.warn("⚠️ prebookings is not an array:", prebookings)
      return { status, timeRemaining, nextBookingTime: null }
    }

    const now = new Date()
    console.log(`🔍 Checking future bookings for PC${pcId}`)

    const upcoming = prebookings
      .filter((pb) => {
        const match =
          pb.type === "pc" &&
          Array.isArray(pb.pcUnits) &&
          pb.pcUnits.includes(String(pcId)) &&
          new Date(pb.scheduledDate) > now &&
          !pb.isConvertedToBill

        if (match) {
          console.log(`✅ Matched booking for PC${pcId}:`, pb)
        }
        return match
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))

    if (upcoming.length > 0) {
      console.log(`📅 Next booking for PC${pcId}:`, upcoming[0].scheduledDate)
    } else {
      console.log(`🆓 No upcoming booking found for PC${pcId}`)
    }

    const nextBookingTime = upcoming.length > 0 ? upcoming[0].scheduledDate : null

    // 🆕 Set/Reset Timer for next booking
    if (nextBookingTime) {
      const msUntilBooking = new Date(nextBookingTime).getTime() - now.getTime()
      if (msUntilBooking > 0) {
        if (pcTimers[pcId]) {
          clearTimeout(pcTimers[pcId])
          console.log(`🔁 Cleared existing timer for PC${pcId}`)
        }
        pcTimers[pcId] = setTimeout(() => {
          console.log(`⏱️ Booking time arrived for PC${pcId}. Trigger action.`)
          // 👉 Optionally refresh status, disable UI, or auto-transition
        }, msUntilBooking)
        console.log(`⏲️ Set timer for PC${pcId} in ${Math.round(msUntilBooking / 1000)} seconds`)
      }
    }

    return { status, timeRemaining, nextBookingTime }
  } catch (err) {
    console.error(`Error fetching time for PC ${pcId}`, err)
    return { status: "available", timeRemaining: "Ready to Play" }
  }
}


async function initializePCCards() {
  const pcGrid = document.getElementById("pcGrid")
  pcGrid.innerHTML = ""

  for (const pc of pcData) {
    const pcCard = document.createElement("div")
    pcCard.id = `pc-card-${pc.id}`
    pcCard.className = `pc-card available`
    pcCard.onclick = () => selectPC(pc.id)

    pcCard.innerHTML = `
            <div class="pc-header">
                <div class="pc-number">PC ${pc.id}</div>
                <div class="pc-status">Loading...</div>
            </div>
            <div class="pc-specs">
                RTX 4080 • i7-13700K • 32GB RAM • 32GB RAM • 240Hz Monitor
            </div>
            <div class="next-booking">Next booking: --</div>
            <div class="pc-time">Checking...</div>
            <div class="extend-buttons"></div>
            <div class="unfreeze-button"></div>
        `

    pcGrid.appendChild(pcCard)
  }

  updatePCTimes()
  setInterval(updatePCTimes, 10000)
}

async function unfreezePC(formattedPcId) {
  const pcId = formattedPcId.toString().startsWith("pc") ? formattedPcId : `PC${formattedPcId}`
  try {
    const res = await fetch("/api/pc/unfreeze", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pcId }),
    })

    const data = await res.json()
    if (res.ok) {
      alert(`✓ PC ${pcId} unfrozen successfully.`)
      updatePCTimes()
    } else {
      alert(`Failed to unfreeze PC: ${data.message}`)
    }
  } catch (err) {
    console.error("Error unfreezing PC:", err)
    alert("An unexpected error occurred.")
  }
}
const activeCountdowns = {} // Holds active countdown intervals per PC

async function updatePCTimes() {
  for (const pc of pcData) {
    const card = document.getElementById(`pc-card-${pc.id}`)
    const statusDiv = card.querySelector(".pc-status")
    const timeDiv = card.querySelector(".pc-time")
    const extendDiv = card.querySelector(".extend-buttons")
    const unfreeze = card.querySelector(".unfreeze-button")
    const nextBookingDiv = card.querySelector(".next-booking")

    const { status, timeRemaining, nextBookingTime } = await fetchPCStatus(pc.id)

    pc.status = status
    card.className = `pc-card ${status}`

    statusDiv.textContent = status.replace("-", " ")
    statusDiv.className = `pc-status ${status}`
    timeDiv.textContent = timeRemaining
    timeDiv.className = `pc-time ${status}`

    if (nextBookingDiv) {
      nextBookingDiv.textContent = nextBookingTime ? `Next booking: ${formatTime(nextBookingTime)}` : "Next booking: --"
    }

    if (status === "occupied" || status === "ending-soon") {
      extendDiv.innerHTML = `
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 15); event.stopPropagation();">+15m</button>
                <button class="extend-btn" onclick="confirmExtend(${pc.id}, 30); event.stopPropagation();">+30m</button>
            `
      unfreeze.innerHTML = `
                <button class="unfreeze-btn" onclick="event.stopPropagation(); unfreezePCConfirm('${pc.id}')">Unfreeze</button>
            `
    } else {
      extendDiv.innerHTML = ""
      unfreeze.innerHTML = ""
    }

    // 15-minute warning logic
    const countdownBoxId = `countdown-box-${pc.id}`
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

        if (!activeCountdowns[pc.id]) {
          activeCountdowns[pc.id] = setInterval(() => {
            const remaining = nextTime - new Date()
            if (remaining <= 0) {
              clearInterval(activeCountdowns[pc.id])
              delete activeCountdowns[pc.id]
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
        if (activeCountdowns[pc.id]) {
          clearInterval(activeCountdowns[pc.id])
          delete activeCountdowns[pc.id]
        }
      }
    }
  }
  updateStatusCounts()
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    weekday: "short", // e.g., "Fri"
    month: "short", // e.g., "Jun"
    day: "numeric", // e.g., "21"
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function confirmExtend(pcId, minutes) {
  // const price = minutes === 15 ? 20 : 25
  const confirmed = confirm(`Are you sure you want to extend PC ${pcId} by ${minutes} minutes ?`)
  if (confirmed) {
    extendTime(pcId, minutes)
  }
}

function unfreezePCConfirm(pcId) {
  const confirmed = confirm(`Are you sure you want to unfreeze the pc${pcId}?`)
  if (confirmed) {
    unfreezePC(pcId)
  }
}

function updateStatusCounts() {
  const pcCards = document.querySelectorAll(".pc-card")

  let available = 0
  let endingSoon = 0
  let occupied = 0

  pcCards.forEach((card) => {
    if (card.classList.contains("available")) available++
    else if (card.classList.contains("ending-soon")) endingSoon++
    else if (card.classList.contains("occupied")) occupied++
  })

  document.getElementById("availableCount").textContent = available
  document.getElementById("endingSoonCount").textContent = endingSoon
  document.getElementById("occupiedCount").textContent = occupied
}
// Refresh Functions
async function refreshPCCards() {
  playSound(600, 0.2)

  // Show loading state
  const refreshBtn = document.getElementById("refreshPCBtn")
  const originalText = refreshBtn.innerHTML
  refreshBtn.innerHTML = "🔄 Refreshing..."
  refreshBtn.disabled = true

  try {
    await updatePCTimes()
    await convertDuePrebookings()

    // Success feedback
    refreshBtn.innerHTML = "✅ Updated!"
    setTimeout(() => {
      refreshBtn.innerHTML = originalText
      refreshBtn.disabled = false
    }, 1500)
  } catch (error) {
    console.error("Error refreshing PC cards:", error)
    refreshBtn.innerHTML = "❌ Error"
    setTimeout(() => {
      refreshBtn.innerHTML = originalText
      refreshBtn.disabled = false
    }, 2000)
  }
}

async function refreshUnpaidBills() {
  playSound(600, 0.2)

  // Show loading state
  const refreshBtn = document.getElementById("refreshBillsBtn")
  const originalText = refreshBtn.innerHTML
  refreshBtn.innerHTML = "🔄 Refreshing..."
  refreshBtn.disabled = true

  try {
    await updateUnpaidBills()
    await convertDuePrebookings()
    // Success feedback
    refreshBtn.innerHTML = "✅ Updated!"
    setTimeout(() => {
      refreshBtn.innerHTML = originalText
      refreshBtn.disabled = false
    }, 1500)
  } catch (error) {
    console.error("Error refreshing unpaid bills:", error)
    refreshBtn.innerHTML = "❌ Error"
    setTimeout(() => {
      refreshBtn.innerHTML = originalText
      refreshBtn.disabled = false
    }, 2000)
  }
}
let flag = false
function selectPC(pcId) {
  const pc = pcData.find((p) => p.id === pcId)

  if (!pc) {
    console.warn(`PC with ID ${pcId} not found in pcData.`)
    return
  }
  // For occupied/ending-soon PCs
  if (pc.status === "occupied" || pc.status === "ending-soon" || pc.status === "payment-due") {
    playSound(500, 0.2)

    // Set context flag
    // occupiedPcContext = true;

    isPrebookMode = true
    flag = true
    // Clear previous selection and select only this PC
    selectedPCs = [pcId]
    updateSelectedPCsList()

    // Show booking section with prebook mode
    document.getElementById("bookSection").classList.add("show")

    // Force prebook mode UI
    const prebookButton = document.getElementById("prebookButton")
    const bookButton = document.getElementById("bookButton")
    const prebookingSection = document.getElementById("prebookingSection")

    prebookButton.classList.add("active")
    prebookButton.textContent = "📅 Cancel Prebook"
    bookButton.textContent = "Create Prebooking"
    prebookingSection.style.display = "block"

    // Hide regular booking button
    bookButton.style.display = "block"

    // Set minimum date to current date and time
    const now = new Date()
    const minDateTime = now.toISOString().slice(0, 16)
    document.getElementById("scheduledDateTime").min = minDateTime

    return
  }
  if (pc.status !== "available") {
    playSound(300, 0.3)
    return
  }

  playSound(600, 0.2)
  const pcCard = event.currentTarget

  if (selectedPCs.includes(pcId)) {
    selectedPCs = selectedPCs.filter((id) => id !== pcId)
    pcCard.classList.remove("selected")
  } else {
    selectedPCs.push(pcId)
    pcCard.classList.add("selected")
  }

  updateSelectedPCsList()

  if (selectedPCs.length > 0) {
    document.getElementById("bookSection").classList.add("show")
  } else {
    document.getElementById("bookSection").classList.remove("show")
  }
}

function updateSelectedPCsList() {
  const selectedPcsList = document.getElementById("selectedPcsList")
  selectedPcsList.innerHTML = ""

  selectedPCs.forEach((pcId) => {
    const pcDiv = document.createElement("div")
    pcDiv.style.cssText =
      "padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"
    pcDiv.innerHTML = `
            <span>PC ${pcId}</span>
            <button onclick="removeSelectedPC(${pcId})" style="background: rgba(255,69,58,0.2); border: 1px solid rgba(255,69,58,0.5); color: #ff453a; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
        `
    selectedPcsList.appendChild(pcDiv)
  })
}

function removeSelectedPC(pcId) {
  selectedPCs = selectedPCs.filter((id) => id !== pcId)
  document.querySelectorAll(".pc-card").forEach((card) => {
    if (card.querySelector(".pc-number").textContent === `PC ${pcId}`) {
      card.classList.remove("selected")
    }
  })
  updateSelectedPCsList()

  if (selectedPCs.length === 0) {
    cancelSelection()
  }
}

function cancelSelection() {
  playSound(400, 0.2)

  document.querySelectorAll(".pc-card").forEach((card) => {
    card.classList.remove("selected")
  })

  selectedPCs = []
  isPrebookMode = false
  // occupiedPcContext = false;  // Reset context flag

  // Reset prebook mode UI
  const prebookButton = document.getElementById("prebookButton")
  const bookButton = document.getElementById("bookButton")
  const prebookingSection = document.getElementById("prebookingSection")

  prebookButton.classList.remove("active")
  prebookButton.textContent = "📅 Prebook"
  bookButton.textContent = "Book Now"
  bookButton.style.display = "block" // Re-enable book button
  prebookingSection.style.display = "none"

  document.getElementById("bookSection").classList.remove("show")
}

async function bookSelectedPCs() {
  const bookButton = document.getElementById("bookButton")
  // bookButton.disabled = true

  const hours = Number.parseFloat(document.getElementById("hoursSelect").value)
  const userName = document.getElementById("userName").value.trim()
  const contactNumber = document.getElementById("contactNumber").value.trim()

  const nameRegex = /^[A-Za-z\s]+$/;
  const phoneRegex = /^\d{10}$/;

  if (!nameRegex.test(userName)) {
    alert("❌ User name must only contain letters and spaces.");
    return;
  }

  if (!phoneRegex.test(contactNumber)) {
    alert("❌ Contact number must be exactly 10 digits.");
    return;
  }

  const duration = hours * 60

  if (isPrebookMode) {
    // Handle prebooking
    const localDateTime = document.getElementById("scheduledDateTime").value

    // Convert local datetime string to UTC
    const scheduledDateTime = new Date(localDateTime).toISOString();


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
          type: "pc",
          pcUnits: selectedPCs,
          psUnits: [],
          name: userName,
          contactNo: contactNumber,
          scheduledDate: scheduledDateTime,
          duration: duration,
          // billedBy: "Admin", // You can modify this based on your auth system
        }),
      })

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
      updatePrebookingCount() // Update prebooking counts
    } catch (error) {
      console.error("Prebooking error:", error)
      alert("Prebooking failed. Please try again.")
    }
  } else {
    // Handle regular booking
    const bookings = selectedPCs.map((pcId) => ({
      pcId: `PC${pcId}`,
      duration,
    }))

    try {
      // ✅ Step 1: Check availability before booking
      const availabilityRes = await fetch("/api/prebook/check-availability", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: 'pc',
          pcUnits: bookings.map((b) => b.pcId),
          duration,
        }),
      })

      const availabilityResult = await availabilityRes.json()

      if (!availabilityRes.ok) {
        alert(`Cannot book: ${availabilityResult.message}`)
        return
      }

      const response = await fetch("/api/pc/book", {
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
        pcUnits: bookings,
        type: "pc",
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
      await initializePCCards()
      cancelSelection()

      document.getElementById("userName").value = ""
      document.getElementById("contactNumber").value = ""
      document.getElementById("hoursSelect").value = "1"
    } catch (error) {
      console.error("Booking error:", error)
      alert("Booking failed. Please try again.")
    }
  }

  setTimeout(() => {
    bookButton.disabled = false
  }, 5000)
}

async function extendTime(pcId, minutes) {
  playSound(600, 0.2)

  try {
    const billResponse = await fetch("/api/bills/extend-bill", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pcId: `PC${pcId}`, extendTime: minutes, type: "pc" }),
    })

    const billData = await billResponse.json()

    if (billResponse.ok) {
      console.log("✅ Updated bill:", billData.bill)
    } else {
      console.warn("⚠️ Failed to update bill:", billData.message)
    }

    const bookingResponse = await fetch("/api/pc/extend-booking", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pcId: `PC${pcId}`, extendDuration: minutes }),
    })

    const bookingData = await bookingResponse.json()

    if (bookingResponse.ok) {
      console.log("✅ PC duration extended:", bookingData.pc)
    } else {
      console.warn("⚠️ Failed to extend PC booking:", bookingData.message)
    }

    updatePCTimes()
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

    const unpaid = bills.filter((bill) => !bill.status && bill.type === "pc")

    if (unpaid.length === 0) {
      unpaidBillsContainer.innerHTML = '<div style="text-align: center; opacity: 0.6;">No unpaid bills</div>'
      return
    }

    unpaid.forEach((bill) => {
      const pcs = bill.pcUnits
        .map((pc) => {
          const hours = Math.floor(pc.duration / 60)
          const mins = pc.duration % 60
          let timeStr = ""
          if (hours > 0) timeStr += `${hours} hr `
          if (mins > 0) timeStr += `${mins} min`
          return `${pc.pcId} (${timeStr.trim()})`
        })
        .join(", ")

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
                <div class="bill-pc">${bill.userName} • ${bill.contactNo}<br></div>
                <div class="bill-details">
                    ${pcs}<br>
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
          walletDisplay.innerHTML = `Available Wallet Credit: ₹${data.walletCredit}`
        }
      })
      .catch((err) => {
        console.error("Error fetching wallet credit:", err)
      })

    // Fetch Loyalty Points
    fetch(`/api/customer/loyalty/${contactNo}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.loyaltyPoints !== undefined) {
          const loyaltyDisplay = document.getElementById("loyaltyPointsDisplay")
          loyaltyDisplay.innerHTML = `Available Loyalty Points: ₹${data.loyaltyPoints}`
        }
      })
      .catch((err) => {
        console.error("Error fetching loyalty points:", err)
      })

    const pcUsageList = bill.pcUnits
      .map((unit) => {
        return `<div>• ${unit.pcId} - ${unit.duration} mins</div>`
      })
      .join("")

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
    <div class="payment-info-grid">
        <div class="payment-card customer-info">
            <div class="card-header">
                <span class="card-icon">👤</span>
                <h4>Customer Details</h4>
            </div>
            <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${bill.userName}</span>
            </div>
            <div class="info-row">
                <span class="label">Contact:</span>
                <span class="value">${bill.contactNo}</span>
            </div>
            <div class="info-row">
                <span class="label">Booked:</span>
                <span class="value">${formattedBookingTime}</span>
            </div>
        </div>

        <div class="payment-card usage-info">
            <div class="card-header">
                <span class="card-icon">🎮</span>
                <h4>Gaming Session</h4>
            </div>
            <div class="usage-list">
                ${bill.pcUnits
        .map(
          (unit) => `
                    <div class="usage-item">
                        <span class="pc-name">${unit.pcId}</span>
                        <span class="duration">${unit.duration} mins</span>
                    </div>
                `,
        )
        .join("")}
            </div>
        </div>

        ${bill.snacks && bill.snacks.length > 0
        ? `
        <div class="payment-card snacks-info">
            <div class="card-header">
                <span class="card-icon">🍿</span>
                <h4>Snacks & Beverages</h4>
            </div>
            <div class="snacks-list">
                ${bill.snacks
          .map(
            (snack) => `
                    <div class="snack-item">
                        <span class="snack-name">${snack.name}</span>
                        <span class="snack-qty">${snack.quantity}x</span>
                        <span class="snack-price">₹${snack.price}</span>
                    </div>
                `,
          )
          .join("")}
            </div>
        </div>
        `
        : ""
      }

        <div class="payment-card payment-options">
            <div class="card-header">
                <span class="card-icon">💳</span>
                <h4>Payment Options</h4>
            </div>
            
            <div class="wallet-loyalty-section">
                <div class="option-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="useWalletCheckbox" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">Use Wallet Credit</span>
                    </label>
                    <div id="walletCreditDisplay" class="credit-display">Available: ₹0</div>
                </div>

                <div class="option-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="useLoyaltyCheckbox" />
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">Use Loyalty Points</span>
                    </label>
                    <div id="loyaltyPointsDisplay" class="credit-display">Available: ₹0</div>
                </div>
            </div>

            <div class="payment-inputs">
                <div class="input-group">
                    <label class="input-label">💰 Discount</label>
                    <input type="number" id="discountInput" min="0" value="0" class="payment-input" placeholder="0" />
                </div>
                
                <div class="payment-methods">
                    <div class="input-group">
                        <label class="input-label">💵 Cash Payment</label>
                        <input type="number" id="cashInput" min="0" class="payment-input" placeholder="0" />
                    </div>
                    <div class="input-group">
                        <label class="input-label">📱 UPI Payment</label>
                        <input type="number" id="upiInput" min="0" class="payment-input" placeholder="0" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="payment-total-section">
        <div class="total-breakdown">
            ${bill.remainingAmt > 0
        ? `
                <div class="amount-row">
                    <span>Paid Amount:</span>
                    <span>₹${bill.paidAmt?.toFixed(2) || 0}</span>
                </div>
                <div class="amount-row">
                    <span>Remaining:</span>
                    <span>₹${bill.remainingAmt.toFixed(2)}</span>
                </div>
            `
        : ""
      }
     ${bill.extensions?.length
        ? `
    <div class="amount-row">
      <span>Extended Time:</span>
      <span>
        ${Object.entries(
          bill.extensions.reduce((map, ext) => {
            const key = ext.unitId || "Unknown";
            map[key] = (map[key] || 0) + ext.minutes;
            return map;
          }, {})
        )
          .map(([unit, mins]) => `${unit}: ${mins} min`)
          .join(", ")}
      </span>
    </div>
  `
        : ""
      }


            <div class="total-row">
                <span>Total Amount:</span>
                <span class="total-amount">₹<span id="finalAmount">${originalAmount}</span></span>
            </div>
        </div>
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
  const useLoyalty = document.getElementById("useLoyaltyCheckbox").checked
  let wallet = -1 // Default to -1 if not used
  let loyalty = -1

  if (useWallet) {
    const walletText = document.getElementById("walletCreditDisplay").innerText
    const match = walletText.match(/₹(\d+)/)
    if (match && match[1]) {
      wallet = Number.parseInt(match[1], 10)
    }
  }

  if (useLoyalty) {
    const loyaltyText = document.getElementById("loyaltyPointsDisplay").innerText
    const match = loyaltyText.match(/₹(\d+)/)
    if (match && match[1]) {
      loyalty = Number.parseInt(match[1], 10)
    }
  }

  try {
    const oldBillRes = await fetch(`/api/bills/${billId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!oldBillRes.ok) throw new Error("Failed to fetch bill before payment")

    const oldBill = await oldBillRes.json()
    const paidAmt = oldBill.paidAmt || 0
    const totalSnacksPaid = oldBill.snacks
      .filter(snack => snack.paidFor)
      .reduce((total, snack) => total + (snack.price * snack.quantity), 0);

    const oldGamingTotal = paidAmt !== 0 ? paidAmt - totalSnacksPaid || 0 : 0
    console.log(oldGamingTotal)
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
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!newBillRes.ok) throw new Error("Failed to fetch updated bill")

    const newBill = await newBillRes.json()
    const newGamingTotal = newBill.gamingTotal || 0

    // 4. Loyalty Points Calculation
    const calculateLoyaltyPoints = (amount) => {
      if (amount >= 360) return 30
      if (amount >= 180) return 15
      if (amount >= 150) return 10
      if (amount >= 100) return 5
      return 0
    }

    const prevPoints = calculateLoyaltyPoints(oldGamingTotal)
    const newPoints = calculateLoyaltyPoints(newGamingTotal)
    console.log(prevPoints)
    console.log(newPoints)
    const netLoyaltyPoints = newPoints - prevPoints

    const customerPayload = {
      name: newBill.userName,
      contactNo: newBill.contactNo,
      loyaltyPoints: netLoyaltyPoints,
    }

    const customerRes = await fetch("/api/customer/createOrAdd", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customerPayload),
    })

    const customerResult = await customerRes.json()

    if (!customerRes.ok) {
      console.warn("Customer update failed:", customerResult.message)
    } else {
      console.log("Customer updated:", customerResult.message)
    }

    updatePCTimes()
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
initializePCCards()
updateUnpaidBills()
updatePrebookingCount() // Initialize prebooking count

// Update prebooking count periodically
setInterval(updatePrebookingCount, 30000) // Update every 30 seconds

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cancelSelection()
    closePaymentModal()
    closeBillSelection()
    closePrebookingModal()
    closeEditPrebookingModal()

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

// Start auto-conversion of due prebookings (runs every 60 seconds)
setInterval(convertDuePrebookings, 30000) // 60 seconds

// Run once immediately on page load
convertDuePrebookings()

console.log("🔄 Auto-conversion of due prebookings started (60-second interval)")
