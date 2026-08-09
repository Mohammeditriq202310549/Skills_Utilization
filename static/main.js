function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.setAttribute('aria-label', 'Show password');
  }
}


// 1. Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/recommendations';
    } else {
      alert(data.error || 'Login failed');
    }
  });
}

// 2. Handle Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      alert('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(password)) {
      alert('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9]/.test(password)) {
      alert('Password must contain at least one number (0-9).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      alert('Password must contain at least one special symbol (!@#$%^&*...).');
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Account registered successfully! Redirecting you to the login page...');
      window.location.href = '/login';
    } else {
      alert(data.error || 'Registration failed');
    }
  });
}



// 3. Load Courses with Search
async function loadCourses(searchQuery = '') {
  const grid = document.getElementById('courseGrid');
  if (!grid) return;

  const res = await fetch(`/api/courses?search=${encodeURIComponent(searchQuery)}`);
  const courses = await res.json();

  grid.innerHTML = courses.map(c => `
    <div class="glass-card">
      <h3>${c.title}</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0;">Instructor: ${c.instructor}</p>
      <p style="font-size: 0.95rem;">${c.description || ''}</p>
      <div style="margin-top: 1rem;">
        ${(c.skill_requirements || '').split(',').map(s => `<span class="badge-tag">${s.trim()}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => loadCourses(e.target.value));
  loadCourses();
}

// 4. Load Recommendations
async function loadRecommendations() {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;

  const res = await fetch('/api/recommendations', { headers: getAuthHeader() });
  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }

  const recs = await res.json();
  grid.innerHTML = recs.map(c => `
    <div class="glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
        <h3>${c.title}</h3>
        <span class="match-pill">${c.match_score > 0 ? `${c.match_score} Skills Matched` : 'Recommended'}</span>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Instructor: ${c.instructor}</p>
      <p style="font-size: 0.95rem;">${c.description || ''}</p>
    </div>
  `).join('');
}

loadRecommendations();
