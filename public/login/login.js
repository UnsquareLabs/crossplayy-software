// const backendURL = 'http://localhost:3000';
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

// Gaming Sound Effects (Web Audio API)
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

// Form Handling
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('text').value;
  const password = document.getElementById('password').value;

  const button = this.querySelector('.login-btn');
  const loading = document.getElementById('loading');
  const successCheck = document.getElementById('successCheck');

  // Play login sound
  playSound(800, 0.2);

  // Show loading
  button.style.opacity = '0.5';
  button.disabled = true;
  loading.style.display = 'block';

  try {
    // Call backend login API
    const res = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Login failed');

    // Save JWT token
    localStorage.setItem('token', data.token);

    // If login is valid
    loading.style.display = 'none';
    successCheck.style.display = 'block';

    // Play success sound
    playSound(1000, 0.3);

    setTimeout(() => {
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 1s ease';

      setTimeout(() => {
        // alert('Login successful! Redirecting to game lobby...');
        window.location.href = '../PC/pc.html'; // actual redirect
      }, 3000);
    }, 1500);

  } catch (err) {
    loading.style.display = 'none';
    button.style.opacity = '1';
    button.disabled = false;
    alert('❌ ' + (err.message || 'Invalid login'));
  }
});


// Input Focus Effects
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function () {
    playSound(400, 0.1);
    this.parentElement.style.transform = 'scale(1.02)';
  });

  input.addEventListener('blur', function () {
    this.parentElement.style.transform = 'scale(1)';
  });
});


// Keyboard Shortcuts
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'Enter') {
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  }
});

// Initialize
createParticles();

// Add typing effect to welcome text
const welcomeText = document.querySelector('.welcome-text');
const originalText = welcomeText.textContent;
welcomeText.textContent = '';

let i = 0;
const typeWriter = () => {
  if (i < originalText.length) {
    welcomeText.textContent += originalText.charAt(i);
    i++;
    setTimeout(typeWriter, 100);
  }
};

setTimeout(typeWriter, 500);

// Login button hover effect
document.querySelector('.login-btn').addEventListener('mouseenter', function () {
  playSound(600, 0.1);
});
