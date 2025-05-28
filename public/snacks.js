// Global variables
let snacksData = []
let currentEditingId = null
let isEditMode = false

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

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
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
    const stickerIcons = ["🍕", "🍔", "🍟", "🌭", "🍿", "🥤", "🍩", "🍪", "🍫", "🍬", "🍭", "🍦", "🍧", "🍰", "🧁", "🍡"]
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

// Particle System
function createParticles() {
    const particlesContainer = document.getElementById("particles")
    const particleCount = 30

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div")
        particle.className = "particle"
        particle.style.left = Math.random() * 100 + "%"
        particle.style.animationDelay = Math.random() * 8 + "s"
        particle.style.animationDuration = Math.random() * 4 + 6 + "s"
        particlesContainer.appendChild(particle)
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

// Format currency
function formatCurrency(amount) {
    return "₹" + Number.parseFloat(amount).toFixed(2)
}

// Get stock status based on quantity
function getStockStatus(quantity) {
    if (quantity === 0) return "out"
    if (quantity < 11) return "low"
    return "sufficient"
}

// Get stock status text
function getStockStatusText(quantity) {
    if (quantity === 0) return "Out of Stock"
    if (quantity < 11) return "Low Stock"
    return "In Stock"
}

// Render snacks grid
function renderSnacks(snacks) {
    const grid = document.getElementById("snacksGrid")

    if (snacks.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p style="text-align: center; padding: 40px; color: #666;">
                    No snacks found. Add your first snack!
                </p>
            </div>
        `
        return
    }

    grid.innerHTML = snacks
        .map((snack) => {
            const stockStatus = getStockStatus(snack.quantity)
            const stockText = getStockStatusText(snack.quantity)
            return `
        <div class="snack-card stock-${stockStatus}" data-id="${snack._id}">
            <div class="stock-indicator ${stockStatus}">${stockText}</div>
            <img src="/api/snacks/image/${snack._id}" alt="${snack.name}" class="snack-image" onerror="this.src='/placeholder.svg?height=180&width=250'">
            <div class="snack-details">
                <h3 class="snack-name">${snack.name}</h3>
                <div class="snack-price">${formatCurrency(snack.price)}</div>
                <div class="quantity-control">
                    <button class="quantity-btn decrease-btn" onclick="decreaseQuantity('${snack._id}')">-</button>
                    <input type="number" class="quantity-input" value="${snack.quantity}" min="0" onchange="updateQuantity('${snack._id}', this.value)">
                    <button class="quantity-btn increase-btn" onclick="increaseQuantity('${snack._id}')">+</button>
                </div>
                <div class="snack-actions">
                    <button class="action-btn edit-btn" onclick="editSnack('${snack._id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteSnack('${snack._id}')">Delete</button>
                </div>
            </div>
        </div>
      `
        })
        .join("")
}

// Fetch and render snacks
async function fetchAndRenderSnacks() {
    try {
        const res = await fetch("http://localhost:3000/api/snacks/all")
        if (!res.ok) {
            throw new Error("Failed to fetch snacks")
        }

        snacksData = await res.json()
        renderSnacks(snacksData)
    } catch (error) {
        console.error("Error fetching snacks:", error)
        const grid = document.getElementById("snacksGrid")
        grid.innerHTML = `
            <div class="empty-state">
                <p style="text-align: center; padding: 40px; color: red;">
                    Failed to load snacks. Please check your connection.
                </p>
            </div>
        `
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById("searchInput")
    searchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase()
        const filteredSnacks = snacksData.filter((snack) => snack.name.toLowerCase().includes(searchTerm))
        renderSnacks(filteredSnacks)
        playSound(400, 0.1)
    })
}

// Open add snack modal
function openAddModal() {
    playSound(600, 0.2)
    isEditMode = false
    currentEditingId = null
    document.getElementById("modalTitle").textContent = "Add New Snack"
    document.getElementById("snackForm").reset()
    document.getElementById("imagePreview").style.display = "none"
    document.getElementById("snackModal").style.display = "block"
}

// Edit snack
function editSnack(snackId) {
    try {
        playSound(600, 0.2)
        const snack = snacksData.find((s) => s._id === snackId)

        if (!snack) {
            throw new Error("Snack not found")
        }

        isEditMode = true
        currentEditingId = snackId

        document.getElementById("modalTitle").textContent = "Edit Snack"
        document.getElementById("snackName").value = snack.name
        document.getElementById("snackPrice").value = snack.price
        document.getElementById("snackQuantity").value = snack.quantity
        document.getElementById("snackImage").value = snack.imageUrl || ""

        document.getElementById("snackModal").style.display = "block"
    } catch (error) {
        console.error("Error loading snack:", error)
        showMessage("Unable to load snack details. Please try again.", "error")
    }
}

// Delete snack
async function deleteSnack(snackId) {
    playSound(800, 0.3)
    if (confirm("Are you sure you want to delete this snack? This action cannot be undone.")) {
        try {
            const res = await fetch(`http://localhost:3000/api/snacks/delete/${snackId}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                throw new Error("Failed to delete snack")
            }

            await fetchAndRenderSnacks()
            playSound(1000, 0.2)
            showMessage("✓ Snack deleted successfully!", "success")
        } catch (error) {
            console.error("Error deleting snack:", error)
            showMessage("Failed to delete snack. Please try again.", "error")
        }
    }
}

// Increase quantity
async function increaseQuantity(snackId) {
    try {
        playSound(500, 0.1)
        const snack = snacksData.find((s) => s._id === snackId)
        if (!snack) return

        const newQuantity = snack.quantity + 1
        await updateSnackQuantity(snackId, newQuantity)
    } catch (error) {
        console.error("Error increasing quantity:", error)
        showMessage("Failed to update quantity. Please try again.", "error")
    }
}

// Decrease quantity
async function decreaseQuantity(snackId) {
    try {
        playSound(400, 0.1)
        const snack = snacksData.find((s) => s._id === snackId)
        if (!snack || snack.quantity <= 0) return

        const newQuantity = snack.quantity - 1
        await updateSnackQuantity(snackId, newQuantity)
    } catch (error) {
        console.error("Error decreasing quantity:", error)
        showMessage("Failed to update quantity. Please try again.", "error")
    }
}

// Update quantity from input
async function updateQuantity(snackId, value) {
    try {
        playSound(450, 0.1)
        const newQuantity = Number.parseInt(value)
        if (isNaN(newQuantity) || newQuantity < 0) return

        await updateSnackQuantity(snackId, newQuantity)
    } catch (error) {
        console.error("Error updating quantity:", error)
        showMessage("Failed to update quantity. Please try again.", "error")
    }
}

// Update snack quantity
async function updateSnackQuantity(snackId, newQuantity) {
    try {
        const snack = snacksData.find((s) => s._id === snackId)
        if (!snack) return

        const res = await fetch(`http://localhost:3000/api/snacks/edit/${snackId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...snack,
                quantity: newQuantity,
            }),
        })

        if (!res.ok) {
            throw new Error("Failed to update quantity")
        }

        // Update local data
        snack.quantity = newQuantity

        // Update UI with new stock status
        const card = document.querySelector(`.snack-card[data-id="${snackId}"]`)
        if (card) {
            const stockStatus = getStockStatus(newQuantity)
            const stockText = getStockStatusText(newQuantity)

            // Update card classes
            card.className = `snack-card stock-${stockStatus}`
            card.setAttribute("data-id", snackId)

            // Update stock indicator
            const stockIndicator = card.querySelector(".stock-indicator")
            if (stockIndicator) {
                stockIndicator.className = `stock-indicator ${stockStatus}`
                stockIndicator.textContent = stockText
            }

            // Update quantity input
            const quantityInput = card.querySelector(".quantity-input")
            if (quantityInput) {
                quantityInput.value = newQuantity
            }
        }
    } catch (error) {
        throw error
    }
}

// Close modal
function closeModal() {
    document.getElementById("snackModal").style.display = "none"
    currentEditingId = null
    isEditMode = false
    playSound(400, 0.1)
}

// Handle image preview
// function setupImagePreview() {
//     const imageInput = document.getElementById("snackImage")
//     const imagePreview = document.getElementById("imagePreview")
//     const previewImg = document.getElementById("previewImg")

//     imageInput.addEventListener("change", (e) => {
//         const file = e.target.files[0]
//         if (file) {
//             const reader = new FileReader()
//             reader.onload = (e) => {
//                 previewImg.src = e.target.result
//                 imagePreview.style.display = "block"
//             }
//             reader.readAsDataURL(file)
//         } else {
//             imagePreview.style.display = "none"
//         }
//     })
// }

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = (error) => reject(error)
    })
}

// Handle form submission
document.getElementById("snackForm").addEventListener("submit", async (e) => {
    e.preventDefault()

    const imageFile = document.getElementById("snackImage").files[0]
    const name = document.getElementById("snackName").value.trim()
    const price = document.getElementById("snackPrice").value
    const quantity = document.getElementById("snackQuantity").value
    // const snackId = 20;//document.getElementById("snackId").value // Optional input if you use custom snackId

    if (!name || !price || !quantity || !imageFile) {
        showMessage("All fields are required including image", "error")
        return
    }

    const formData = new FormData()
    // formData.append("snackId", snackId) // optional if you use custom numeric IDs
    formData.append("name", name)
    formData.append("price", price)
    formData.append("quantity", quantity)
    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {
        let res
        if (isEditMode && currentEditingId) {
            res = await fetch(`http://localhost:3000/api/snacks/edit/${currentEditingId}`, {
                method: "PUT",
                body: formData
            })
        } else {
            res = await fetch("http://localhost:3000/api/snacks/create", {
                method: "POST",
                body: formData
            })
        }

        if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.message || "Failed to save snack")
        }

        await fetchAndRenderSnacks()
        closeModal()
        playSound(800, 0.3)

        const message = isEditMode ? "✓ Snack updated successfully!" : "✓ Snack added successfully!"
        showMessage(message, "success")
    } catch (error) {
        console.error("Error saving snack:", error)
        showMessage(error.message || "Failed to save snack. Please try again.", "error")
    }
})


// Show success/error messages
function showMessage(message, type) {
    const messageDiv = document.createElement("div")
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "linear-gradient(45deg, #28a745, #20c997)" : type === "info" ? "linear-gradient(45deg, #17a2b8, #0dcaf0)" : "linear-gradient(45deg, #dc3545, #e74c3c)"};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `
    messageDiv.textContent = message
    document.body.appendChild(messageDiv)

    setTimeout(() => {
        messageDiv.remove()
    }, 4000)
}

// Close modal when clicking outside
window.addEventListener("click", (event) => {
    const modal = document.getElementById("snackModal")
    if (event.target === modal) {
        closeModal()
    }
})

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal()
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

// Add hover effects to snack cards
function addCardEffects() {
    const snackCards = document.querySelectorAll(".snack-card")
    snackCards.forEach((card) => {
        card.addEventListener("mouseenter", () => playSound(300, 0.05))
    })
}

// Initialize page
function initializePage() {
    // Show loading
    document.getElementById("loading").style.display = "block"
    document.getElementById("snacksGrid").style.display = "none"

    // Simulate loading delay
    setTimeout(() => {
        document.getElementById("loading").style.display = "none"
        document.getElementById("snacksGrid").style.display = "grid"

        fetchAndRenderSnacks()
        setupSearch()
        // setupImagePreview()
        addCardEffects()
        playSound(800, 0.3)
    }, 1500)
}

// Initialize everything
createGamingStickers()
createParticles()
setupMenu()
initializePage()
