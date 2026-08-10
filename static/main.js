function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showInlineError(containerId, message, isSuccess = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let errDiv = container.querySelector('.inline-msg');
  if (!errDiv) {
    errDiv = document.createElement('div');
    errDiv.className = 'inline-msg';
    container.insertBefore(errDiv, container.firstChild);
  }
  errDiv.style.cssText = isSuccess
    ? 'background: rgba(34, 197, 94, 0.15); border: 0.0625rem solid rgba(34, 197, 94, 0.4); color: #4ade80; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; margin-bottom: 1rem; text-align: center;'
    : 'background: rgba(239, 68, 68, 0.15); border: 0.0625rem solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem; margin-bottom: 1rem; text-align: center;';
  errDiv.textContent = message;
  errDiv.style.display = 'block';
}

function hideInlineError(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const errDiv = container.querySelector('.inline-msg');
  if (errDiv) errDiv.style.display = 'none';
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

// 1. Handle Skill Chip Selection on Registration
document.addEventListener('DOMContentLoaded', () => {
  const skillChips = document.querySelectorAll('.skill-chip');
  if (skillChips.length > 0) {
    skillChips.forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const activeSkills = Array.from(document.querySelectorAll('.skill-chip.active'))
          .map(c => c.getAttribute('data-skill'));
        const hiddenInput = document.getElementById('skillsInput');
        if (hiddenInput) {
          hiddenInput.value = activeSkills.join(', ');
        }
      });
    });
  }
});

// 2. Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideInlineError('loginForm');
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
      showInlineError('loginForm', data.error || 'Login failed');
    }
  });
}

// 3. Handle Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideInlineError('registerForm');
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email.trim())) {
      showInlineError('registerForm', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      showInlineError('registerForm', 'Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      showInlineError('registerForm', 'Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(password)) {
      showInlineError('registerForm', 'Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9]/.test(password)) {
      showInlineError('registerForm', 'Password must contain at least one number (0-9).');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      showInlineError('registerForm', 'Password must contain at least one special symbol (!@#$%^&*...).');
      return;
    }

    const phone = document.getElementById('phone')?.value || null;
    const age = document.getElementById('age')?.value ? parseInt(document.getElementById('age').value) : null;
    const major = document.getElementById('major')?.value || null;
    const skillsRaw = document.getElementById('skillsInput')?.value || '';
    const skillsList = skillsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, phone, age, major, skills: skillsList })
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = '/login';
    } else {
      showInlineError('registerForm', data.error || 'Registration failed');
    }
  });
}

// 4. Load Courses with Search & Category Filters
let currentCategory = 'all';

async function loadCourses(searchQuery = '', category = 'all') {
  const grid = document.getElementById('courseGrid');
  if (!grid) return;

  const url = `/api/courses?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  const courses = await res.json();

  if (courses.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No courses found matching your criteria.</div>`;
    return;
  }

  grid.innerHTML = courses.map(c => `
    <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <h3>${c.title}</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0;">Instructor: ${c.instructor}</p>
        <p style="font-size: 0.95rem; margin-bottom: 1rem;">${c.description || ''}</p>
        <div style="margin-bottom: 1rem;">
          ${(c.skill_requirements || '').split(',').map(s => `<span class="badge-tag">${s.trim()}</span>`).join('')}
        </div>
      </div>
      <div>
        <a href="/course-details?id=${c.id}" class="btn-outline" style="font-size:0.85rem; padding:0.4rem 0.8rem; width: 100%; text-align: center; text-decoration: none; display: block;">👁️ View Course Details</a>
      </div>
    </div>
  `).join('');
}

const searchInput = document.getElementById('searchInput');
const categoryFilters = document.getElementById('categoryFilters');

if (categoryFilters) {
  categoryFilters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      loadCourses(searchInput ? searchInput.value : '', currentCategory);
    });
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => loadCourses(e.target.value, currentCategory));
  loadCourses('', 'all');
}

// 5. Load Recommendations with Skill Badges
async function loadRecommendations() {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;

  const res = await fetch('/api/recommendations', { headers: getAuthHeader() });
  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }

  const recs = await res.json();
  if (recs.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No matching recommendations found for your selected skills.</div>`;
    return;
  }

  grid.innerHTML = recs.map(c => `
    <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
          <h3>${c.title}</h3>
          <span class="match-pill">${c.match_score > 0 ? `Matched: ${c.matched_skills.slice(0, 2).join(', ')}` : 'Recommended'}</span>
        </div>
        <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Instructor: ${c.instructor}</p>
        <p style="font-size: 0.95rem; margin-bottom: 1rem;">${c.description || ''}</p>
        <div style="margin-bottom: 1rem;">
          ${(c.skill_requirements || '').split(',').map(s => `<span class="badge-tag">${s.trim()}</span>`).join('')}
        </div>
      </div>
      <div>
        <a href="/course-details?id=${c.id}" class="btn-outline" style="font-size:0.85rem; padding:0.4rem 0.8rem; width: 100%; text-align: center; text-decoration: none; display: block;">👁️ View Course Details</a>
      </div>
    </div>
  `).join('');
}

loadRecommendations();

// 6. Load User Profile & Enrolled Courses
async function loadProfile() {
  const profileCard = document.getElementById('profileCard');
  if (!profileCard) return;

  const token = localStorage.getItem('token');
  if (!token) {
    profileCard.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h3 style="margin-bottom: 1rem;">Not Logged In</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Please log in to view your profile and skills.</p>
        <a href="/login" class="btn-indigo" style="display: inline-block;">Log In Here</a>
      </div>
    `;
    return;
  }

  const res = await fetch('/api/users/me', { headers: getAuthHeader() });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  const u = await res.json();
  const enrolledList = u.enrolled_courses || [];

  const avatarDisplay = u.avatar_url
    ? `<img src="${u.avatar_url}" style="width: 4.5rem; height: 4.5rem; border-radius: 50%; object-fit: cover; border: 0.125rem solid var(--primary-indigo);">`
    : `<div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 1.85rem; font-weight: 700; color: #fff;">
        ${(u.username || 'U')[0].toUpperCase()}
       </div>`;

  profileCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 0.0625rem solid var(--border-glass); padding-bottom: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        ${avatarDisplay}
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700;">${u.username}</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">${u.email}</p>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button onclick="toggleEditProfileForm()" class="btn-outline" style="font-size: 0.85rem; padding: 0.5rem 1rem;">✏️ Edit Profile</button>
        <button onclick="toggleChangePasswordForm()" class="btn-outline" style="font-size: 0.85rem; padding: 0.5rem 1rem; border-color: rgba(168, 85, 247, 0.4); color: #c084fc;">🔑 Change Password</button>
      </div>
    </div>

    <!-- Hidden Edit Profile Form -->
    <div id="editProfileContainer" style="display: none; background: rgba(15, 23, 42, 0.75); padding: 1.5rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-focus); margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Edit Profile Info</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Email Address</label>
          <input type="email" id="editEmail" class="glow-input" value="${u.email}">
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Profile Picture URL</label>
          <input type="url" id="editAvatarUrl" class="glow-input" value="${u.avatar_url || ''}" placeholder="https://example.com/avatar.jpg">
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Academic Major</label>
          <input type="text" id="editMajor" class="glow-input" value="${u.major || ''}" placeholder="e.g. Computer Science">
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Phone Number</label>
          <input type="text" id="editPhone" class="glow-input" value="${u.phone || ''}" placeholder="+1 555-0199">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button onclick="toggleEditProfileForm()" class="btn-outline" style="padding: 0.5rem 1rem;">Cancel</button>
        <button onclick="submitProfileEdit()" class="btn-indigo" style="padding: 0.5rem 1.25rem;">Save Profile</button>
      </div>
    </div>

    <!-- Hidden Change Password Form -->
    <div id="changePasswordContainer" style="display: none; background: rgba(15, 23, 42, 0.8); padding: 1.5rem; border-radius: var(--radius-md); border: 0.0625rem solid rgba(168, 85, 247, 0.4); margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: #e9d5ff;">🔑 Change Account Password</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Current (Old) Password</label>
          <div style="position: relative;">
            <input type="password" id="oldPasswordInput" class="glow-input" placeholder="Enter your current password">
            <button type="button" onclick="togglePasswordVisibility('oldPasswordInput', this)" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem;" aria-label="Show password">👁️</button>
          </div>
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">New Password</label>
          <div style="position: relative;">
            <input type="password" id="newPasswordInput" class="glow-input" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 symbol">
            <button type="button" onclick="togglePasswordVisibility('newPasswordInput', this)" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem;" aria-label="Show password">👁️</button>
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button onclick="toggleChangePasswordForm()" class="btn-outline" style="padding: 0.5rem 1rem;">Cancel</button>
        <button onclick="submitPasswordChange()" class="btn-indigo" style="padding: 0.5rem 1.25rem; background: linear-gradient(135deg, #a855f7, #6366f1);">Update Password</button>
      </div>
    </div>


    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-glass);">
        <div style="font-size: 0.8rem; color: var(--text-muted);">Major</div>
        <div style="font-weight: 600; margin-top: 0.25rem;">${u.major || 'Not specified'}</div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-glass);">
        <div style="font-size: 0.8rem; color: var(--text-muted);">Age</div>
        <div style="font-weight: 600; margin-top: 0.25rem;">${u.age ? u.age + ' years' : 'Not specified'}</div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-glass);">
        <div style="font-size: 0.8rem; color: var(--text-muted);">Phone</div>
        <div style="font-weight: 600; margin-top: 0.25rem;">${u.phone || 'Not specified'}</div>
      </div>
    </div>

    <div style="margin-bottom: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem;">Selected Skills & Interests</h3>
        <button onclick="toggleAddSkillForm()" class="btn-indigo" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">➕ Add New Skill</button>
      </div>

      <!-- Hidden inline Add Skill Form -->
      <div id="addSkillContainer" style="display: none; background: rgba(15, 23, 42, 0.7); padding: 1.25rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-focus); margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Add a Skill to Your Career Profile</h4>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input type="text" id="newSkillName" class="glow-input" placeholder="Skill name (e.g. Cybersecurity, Flutter, Python...)" style="flex: 2; min-width: 12rem;">
          <select id="newSkillProficiency" class="glow-input" style="flex: 1; min-width: 8rem;">
            <option value="Beginner">Beginner</option>
            <option value="Intermediate" selected>Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <button onclick="submitNewSkill()" class="btn-indigo" style="padding: 0.6rem 1.25rem;">Save Skill</button>
        </div>
      </div>

      <div>
        ${(u.skills || []).length > 0
          ? u.skills.map(s => `
              <span class="badge-tag" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                ⚡ ${s.skill_name} (${s.proficiency || 'Beginner'})
                <button onclick="deleteSkill('${s.skill_id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; padding: 0; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='var(--text-muted)'" title="Remove Skill">✕</button>
              </span>
            `).join(' ')
          : '<p style="color: var(--text-muted); font-size: 0.9rem;">No skills selected yet.</p>'}
      </div>
    </div>

    <!-- Enrolled Courses Section -->
    <div style="border-top: 0.0625rem solid var(--border-glass); padding-top: 1.5rem; margin-top: 1.5rem;">
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        🎓 Enrolled Courses <span style="font-size: 0.8rem; color: var(--primary-indigo); background: rgba(99, 102, 241, 0.15); padding: 0.2rem 0.5rem; border-radius: 1rem;">${enrolledList.length}</span>
      </h3>

      ${enrolledList.length > 0
        ? `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem;">
            ${enrolledList.map(c => `
              <div style="background: rgba(15, 23, 42, 0.6); border: 0.0625rem solid var(--border-glass); padding: 1.25rem; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 1.05rem; margin-bottom: 0.3rem; color: #fff;">${c.title}</h4>
                  <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Instructor: ${c.instructor}</p>
                  <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${c.description || ''}</p>
                  <span style="font-size: 0.75rem; color: #4ade80; display: block; margin-bottom: 0.75rem;">Enrolled on: ${c.enrolled_at || 'Recently'}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <a href="/course-details?id=${c.id}" class="btn-outline" style="font-size: 0.75rem; padding: 0.35rem 0.6rem; flex: 1; text-align: center; text-decoration: none;">View</a>
                  <button onclick="unenrollFromCourse('${c.id}')" class="btn-outline" style="font-size: 0.75rem; padding: 0.35rem 0.6rem; border-color: rgba(239, 68, 68, 0.4); color: #f87171;" title="Drop / Unenroll from course">Unenroll</button>
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div style="background: rgba(15, 23, 42, 0.4); border: 0.0625rem dashed var(--border-glass); padding: 2rem; border-radius: var(--radius-md); text-align: center;">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">You haven't enrolled in any courses yet.</p>
            <a href="/courses" class="btn-indigo" style="font-size: 0.85rem; padding: 0.5rem 1rem; text-decoration: none; display: inline-block;">Browse Courses</a>
          </div>`
      }
    </div>

    <div style="margin-top: 2rem; border-top: 0.0625rem solid var(--border-glass); padding-top: 1.5rem; text-align: right;">
      <button onclick="localStorage.removeItem('token'); window.location.href='/login';" class="btn-outline" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171;">Log Out</button>
    </div>
  `;
}

function toggleEditProfileForm() {
  const container = document.getElementById('editProfileContainer');
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleChangePasswordForm() {
  const container = document.getElementById('changePasswordContainer');
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
}

async function submitProfileEdit() {
  hideInlineError('editProfileContainer');
  const email = document.getElementById('editEmail')?.value;
  const avatar_url = document.getElementById('editAvatarUrl')?.value;
  const major = document.getElementById('editMajor')?.value;
  const phone = document.getElementById('editPhone')?.value;

  const res = await fetch('/api/users/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ email, avatar_url, major, phone })
  });

  const data = await res.json();
  if (res.ok) {
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    loadProfile();
  } else {
    showInlineError('editProfileContainer', data.error || 'Failed to update profile');
  }
}

async function submitPasswordChange() {
  hideInlineError('changePasswordContainer');
  const old_password = document.getElementById('oldPasswordInput')?.value;
  const new_password = document.getElementById('newPasswordInput')?.value;

  if (!old_password || !new_password) {
    showInlineError('changePasswordContainer', 'Please enter both your current password and your new password.');
    return;
  }

  const res = await fetch('/api/users/me/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ old_password, new_password })
  });

  const data = await res.json();
  if (res.ok) {
    showInlineError('changePasswordContainer', 'Password updated successfully!', true);
    setTimeout(() => {
      toggleChangePasswordForm();
      loadProfile();
    }, 1500);
  } else {
    showInlineError('changePasswordContainer', data.error || 'Failed to update password');
  }
}



function toggleAddSkillForm() {
  const container = document.getElementById('addSkillContainer');
  if (container) {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  }
}

async function submitNewSkill() {
  hideInlineError('addSkillContainer');
  const nameInput = document.getElementById('newSkillName');
  const profSelect = document.getElementById('newSkillProficiency');
  if (!nameInput || !nameInput.value.trim()) {
    showInlineError('addSkillContainer', 'Please enter a skill name.');
    return;
  }

  const res = await fetch('/api/users/skills', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      skill_name: nameInput.value.trim(),
      proficiency: profSelect ? profSelect.value : 'Intermediate'
    })
  });

  const data = await res.json();
  if (res.ok) {
    loadProfile();
  } else {
    showInlineError('addSkillContainer', data.error || 'Failed to add skill');
  }
}

async function deleteSkill(skillId) {
  const res = await fetch(`/api/users/skills/${skillId}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });

  if (res.ok) {
    loadProfile();
  } else {
    showInlineError('profileCard', 'Failed to delete skill');
  }
}

// 7. Load Standalone Course Details Page
async function loadCourseDetails() {
  const card = document.getElementById('detailsCard');
  if (!card) return;

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');

  if (!courseId) {
    card.innerHTML = `<div style="text-align: center; padding: 2rem;">Invalid course ID. <a href="/courses" style="color: var(--primary-indigo);">Back to courses</a></div>`;
    return;
  }

  const res = await fetch(`/api/courses/${courseId}`);
  if (!res.ok) {
    card.innerHTML = `<div style="text-align: center; padding: 2rem;">Course not found. <a href="/courses" style="color: var(--primary-indigo);">Back to courses</a></div>`;
    return;
  }

  const c = await res.json();

  // Check enrollment state if user is logged in
  let isEnrolled = false;
  const token = localStorage.getItem('token');
  if (token) {
    const profileRes = await fetch('/api/users/me', { headers: getAuthHeader() });
    if (profileRes.ok) {
      const u = await profileRes.json();
      isEnrolled = (u.enrolled_courses || []).some(ec => ec.id === courseId);
    }
  }

  card.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <a href="javascript:history.back()" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.3rem; margin-bottom: 1rem;">← Back</a>
      <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${c.title}</h1>
      <p style="color: var(--primary-indigo); font-weight: 600; font-size: 1.05rem;">Instructor: ${c.instructor}</p>
    </div>

    <div style="background: rgba(15, 23, 42, 0.5); padding: 1.5rem; border-radius: var(--radius-md); border: 0.0625rem solid var(--border-glass); margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Course Description</h3>
      <p style="line-height: 1.7; color: #cbd5e1;">${c.description || 'No detailed description available.'}</p>
    </div>

    <div style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Skills & Technologies Covered</h3>
      <div>
        ${(c.skill_requirements || '').split(',').map(s => `<span class="badge-tag" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">⚡ ${s.trim()}</span>`).join(' ')}
      </div>
    </div>

    <div id="enrollActionContainer" style="border-top: 0.0625rem solid var(--border-glass); padding-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      ${isEnrolled
        ? `<div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: #4ade80; font-weight: 600; font-size: 1.05rem;">✅ You are enrolled in this course</span>
            <button onclick="unenrollFromCourse('${c.id}', true)" class="btn-outline" style="border-color: rgba(239, 68, 68, 0.4); color: #f87171;">Unenroll</button>
           </div>`
        : `<button onclick="enrollInCourse('${c.id}')" class="btn-indigo" style="padding: 0.75rem 2rem; font-size: 1rem;">🎓 Enroll in Course</button>`
      }
      <a href="/courses" class="btn-outline">Browse More Courses</a>
    </div>
  `;
}

async function enrollInCourse(courseId) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const res = await fetch(`/api/courses/${courseId}/enroll`, {
    method: 'POST',
    headers: getAuthHeader()
  });

  if (res.ok) {
    loadCourseDetails();
  } else {
    showInlineError('enrollActionContainer', 'Failed to enroll in course');
  }
}

async function unenrollFromCourse(courseId, reloadDetails = false) {
  const res = await fetch(`/api/courses/${courseId}/unenroll`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });

  if (res.ok) {
    if (reloadDetails) {
      loadCourseDetails();
    } else {
      loadProfile();
    }
  }
}

loadProfile();
loadCourseDetails();





