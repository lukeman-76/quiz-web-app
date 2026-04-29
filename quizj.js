// ============================================
// CONSTANTS & GLOBAL VARIABLES
// ============================================

// Admin password for panel access
const ADMIN_PASSWORD = "pa55w0rd";

// Track admin authentication status
let adminAuthenticated = false;

// Default questions (backup if localStorage is empty)
const defaultQuestions = [
  { q: "HTML stands for?", o: ["Hyper Text Markup Language", "High Tech Language", "Hyper Tool Language", "None of above"], a: 0 },
  { q: "CSS is used for?", o: ["Structure", "Styling", "Logic", "Database"], a: 1 },
  { q: "JavaScript is a?", o: ["Programming Language", "Markup Language", "Style Language", "Database Language"], a: 0 },
  { q: "Which symbol is used for comments in JavaScript?", o: ["//", "<!--", "**", "##"], a: 0 },
  { q: "What does SQL stand for?", o: ["Structured Query Language", "Simple Query Language", "Styled Question Language", "System Query Language"], a: 0 }
];

// Application state variables
let questions = [];        // Array of question objects
let current = 0;           // Current question index
let score = 0;             // User's current score
let answered = false;      // Whether current question has been answered
let time = 15;             // Time remaining for current question
let user = "";             // User's name
let timerInterval;         // Reference to timer interval
let category = "General";  // Selected quiz category
let currentView = "home";  // Current UI view (home, leaderboard, admin)


// ============================================
// TIMER MANAGEMENT
// ============================================

// Clear the active timer to prevent memory leaks
function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}


// ============================================
// DATA PERSISTENCE (LocalStorage)
// ============================================

// Load questions from localStorage or use defaults
function loadData() {
  try {
    const savedQuestions = localStorage.getItem("questions");
    questions = savedQuestions ? JSON.parse(savedQuestions) : [...defaultQuestions];
  } catch (e) {
    questions = [...defaultQuestions];
    showToast("Error loading data, using defaults", "error");
  }
}

// Save questions to localStorage
function saveQuestions() {
  try {
    localStorage.setItem("questions", JSON.stringify(questions));
    showToast("Questions saved successfully!", "success");
  } catch (e) {
    showToast("Error saving questions", "error");
  }
}

// Save user's score to localStorage
function saveScore() {
  try {
    let scores = JSON.parse(localStorage.getItem("scores")) || [];
    scores.push({
      name: user,
      score: score,
      total: questions.length,
      date: new Date().toISOString()
    });
    // Keep only last 50 scores to save space
    if (scores.length > 50) scores = scores.slice(-50);
    localStorage.setItem("scores", JSON.stringify(scores));
  } catch (e) {
    console.error("Failed to save score", e);
  }
}


// ============================================
// UI NOTIFICATIONS (Toast)
// ============================================

// Display a temporary notification message
function showToast(message, type = "success") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast");
  existingToasts.forEach(toast => toast.remove());

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  // Set color based on message type
  if (type === "error") {
    toast.style.background = "#dc2626";
    toast.style.boxShadow = "0 4px 12px rgba(220,38,38,0.4)";
  } else if (type === "correct") {
    toast.style.background = "#16a34a";
    toast.style.boxShadow = "0 4px 12px rgba(22,163,74,0.4)";
  } else if (type === "wrong") {
    toast.style.background = "#ea580c";
    toast.style.boxShadow = "0 4px 12px rgba(234,88,12,0.4)";
  } else {
    toast.style.background = "rgba(15, 23, 42, 0.95)";
    toast.style.backdropFilter = "blur(8px)";
  }

  toast.style.color = "#ffffff";
  toast.style.fontWeight = "bold";
  toast.style.textShadow = "0 1px 2px rgba(0,0,0,0.2)";

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (toast && toast.remove) {
      toast.style.animation = "fadeOutDown 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}


// ============================================
// ADMIN PANEL SECURITY (Password Modal)
// ============================================

// Request admin access - show password modal
function requestAdminAccess() {
  if (adminAuthenticated) {
    navigateTo('admin');
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="password-modal">
      <h3> Admin Access</h3>
      <p>Please enter the administrator password</p>
      <input type="password" id="adminPasswordInput" placeholder="Enter password" autocomplete="off">
      <button onclick="verifyAdminPassword()">Verify Access</button>
      <div id="passwordError" class="error-msg"> Incorrect password. Please try again.</div>
    </div>
  `;

  document.body.appendChild(modal);

  // Auto-focus the input field
  setTimeout(() => {
    const input = document.getElementById("adminPasswordInput");
    if (input) input.focus();
  }, 100);

  // Allow Enter key to submit
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      verifyAdminPassword();
    }
  };

  const input = document.getElementById("adminPasswordInput");
  if (input) {
    input.addEventListener("keypress", handleKeyPress);
  }

  window.currentPasswordModal = modal;
}

// Verify the entered password
function verifyAdminPassword() {
  const passwordInput = document.getElementById("adminPasswordInput");
  const errorDiv = document.getElementById("passwordError");
  const enteredPassword = passwordInput ? passwordInput.value : "";

  if (enteredPassword === ADMIN_PASSWORD) {
    adminAuthenticated = true;
    if (window.currentPasswordModal) {
      window.currentPasswordModal.remove();
      window.currentPasswordModal = null;
    }
    showToast("Admin access granted!", "success");
    navigateTo('admin');
  } else {
    if (errorDiv) {
      errorDiv.style.display = "block";
      errorDiv.style.animation = "shake 0.3s ease";
      setTimeout(() => {
        if (errorDiv) errorDiv.style.animation = "";
      }, 300);
    }
    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.focus();
    }
    showToast("Incorrect admin password", "error");
  }
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
  if (window.currentPasswordModal && e.target === window.currentPasswordModal) {
    window.currentPasswordModal.remove();
    window.currentPasswordModal = null;
  }
});


// ============================================
// SECURITY: XSS Prevention
// ============================================

// Escape HTML special characters to prevent XSS attacks
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}


// ============================================
// NAVIGATION & STATE MANAGEMENT
// ============================================

// Update active button styling in navigation bar
function updateNavActive(view) {
  const homeBtn = document.getElementById("navHomeBtn");
  const lbBtn = document.getElementById("navLeaderboardBtn");
  const adminBtn = document.getElementById("navAdminBtn");

  if (homeBtn) homeBtn.classList.remove("active");
  if (lbBtn) lbBtn.classList.remove("active");
  if (adminBtn) adminBtn.classList.remove("active");

  if (view === "home") homeBtn?.classList.add("active");
  else if (view === "leaderboard") lbBtn?.classList.add("active");
  else if (view === "admin") adminBtn?.classList.add("active");
}

// Main navigation controller (state machine)
function navigateTo(view) {
  clearTimer();
  currentView = view;
  updateNavActive(view);

  if (view === "home") {
    showHomeScreen();
  } else if (view === "leaderboard") {
    renderLeaderboardPanel();
  } else if (view === "admin") {
    renderAdminPanel();
  }
}


// ============================================
// HOME SCREEN
// ============================================

function showHomeScreen() {
  // Reset quiz state
  current = 0;
  score = 0;
  answered = false;
  time = 15;
  user = "";

  document.getElementById("app").innerHTML = `
    <h2> Quiz Web App</h2>
    <p style="color:var(--text-light); margin: 10px 0;">Test your knowledge!</p>
    <input id="name" placeholder="Enter your name" autocomplete="off">
    <select id="category">
      <option value="General">General Knowledge</option>
      <option value="Technology">Technology</option>
      <option value="Science">Science</option>
    </select>
    <button onclick="startQuiz()"> Start Quiz</button>
    <div class="button-group" style="margin-top: 15px;">
      <button onclick="navigateTo('leaderboard')"> Quick Leaderboard</button>
      <button onclick="requestAdminAccess()"> Admin Panel</button>
    </div>
    <p style="font-size:12px; margin-top:20px; color:var(--text-light);"> ${questions.length} questions available</p>
  `;

  // Apply saved dark mode preference
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
}


// ============================================
// QUIZ ENGINE
// ============================================

function startQuiz() {
  const nameInput = document.getElementById("name");
  if (!nameInput) return;
  user = nameInput.value.trim();
  category = document.getElementById("category").value;

  if (!user) {
    showToast("Please enter your name!", "error");
    return;
  }
  loadQuestion();
}

function loadQuestion() {
  answered = false;
  time = 15;
  clearTimer();

  if (current >= questions.length) {
    showResult();
    return;
  }

  const q = questions[current];
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="top">
      <span> ${escapeHtml(user)}</span>
      <span> ${current + 1}/${questions.length}</span>
      <span id="timer"> ${time}s</span>
    </div>
    <div class="progress-bar">
      <div class="progress" style="width:${(current / questions.length) * 100}%"></div>
    </div>
    <h3>${escapeHtml(q.q)}</h3>
    <div id="opts"></div>
    <div class="button-group">
      <button onclick="nextQuestion()">Next →</button>
      <button onclick="quitQuiz()" class="quit-btn"> Quit</button>
    </div>
  `;

  // Create answer options dynamically
  q.o.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `<span style="font-weight:bold;">${String.fromCharCode(65 + i)}.</span> ${escapeHtml(opt)}`;
    div.onclick = () => selectAnswer(i);
    document.getElementById("opts").appendChild(div);
  });

  startTimer();
}

function startTimer() {
  clearTimer();
  timerInterval = setInterval(() => {
    if (time > 0 && !answered) {
      time--;
      const timerEl = document.getElementById("timer");
      if (timerEl) timerEl.textContent = ` ${time}s`;

      if (time === 0) {
        clearTimer();
        if (!answered) {
          const correctIndex = questions[current].a;
          const options = document.querySelectorAll(".option");
          options.forEach((opt, idx) => {
            if (idx === correctIndex) opt.classList.add("correct");
            opt.style.pointerEvents = "none";
          });
          answered = true;
          showToast(`TIME'S UP! Answer: ${escapeHtml(questions[current].o[correctIndex])}`, "error");
        }
      }
    } else if (answered) {
      clearTimer();
    }
  }, 1000);
}

function selectAnswer(selectedIndex) {
  if (answered) return;
  answered = true;
  clearTimer();

  const correctIndex = questions[current].a;
  const options = document.querySelectorAll(".option");
  options.forEach(opt => opt.style.pointerEvents = "none");

  options.forEach((opt, idx) => {
    if (idx === correctIndex) {
      opt.classList.add("correct");
      if (idx === selectedIndex && idx === correctIndex) {
        score++;
        showToast(`CORRECT! +1 point`, "correct");
      }
    } else if (idx === selectedIndex && idx !== correctIndex) {
      opt.classList.add("wrong");
      showToast(`WRONG! Correct: ${escapeHtml(questions[current].o[correctIndex])}`, "wrong");
    }
  });
}

function nextQuestion() {
  if (!answered && time > 0) {
    showToast("Please select an answer first!", "error");
    return;
  }
  current++;
  if (current < questions.length) {
    loadQuestion();
  } else {
    showResult();
  }
}

function quitQuiz() {
  if (confirm("Quit quiz? Your progress will be lost!")) {
    clearTimer();
    navigateTo("home");
    showToast("Quiz ended");
  }
}

function showResult() {
  clearTimer();
  saveScore();

  const percentage = (score / questions.length) * 100;
  let grade = "";

  if (percentage >= 90) {
    grade = "Excellent!";
  } else if (percentage >= 70) {
    grade = "Good Job!";
  } else if (percentage >= 50) {
    grade = "Keep Learning!";
  } else {
    grade = "Need Practice!";
  }

  document.getElementById("app").innerHTML = `
    <h2> Quiz Completed! </h2>
    <h3>${grade}</h3>
    <p style="font-size:24px; margin:20px 0;">${escapeHtml(user)}, Your Score: <strong style="color:var(--primary);">${score}/${questions.length}</strong></p>
    <p>Percentage: ${percentage.toFixed(1)}%</p>
    <div class="button-group">
      <button onclick="downloadCertificate()"> Download Certificate</button>
      <button onclick="navigateTo('leaderboard')"> View Leaderboard</button>
      <button onclick="navigateTo('home')"> Back to Home</button>
    </div>
  `;
}


// ============================================
// LEADERBOARD PANEL
// ============================================

function renderLeaderboardPanel() {
  clearTimer();
  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem("scores")) || [];
  } catch (e) {
    console.error(e);
  }

  // Keep only the best score per user
  const bestScores = {};
  scores.forEach(s => {
    const key = s.name;
    if (!bestScores[key] || s.score > bestScores[key].score) {
      bestScores[key] = s;
    }
  });

  // Sort by score (highest first) and take top 10
  const sorted = Object.values(bestScores).sort((a, b) => b.score - a.score).slice(0, 10);

  document.getElementById("app").innerHTML = `
    <h2> Top 10 Leaderboard </h2>
    <ul class="leaderboard">
      ${sorted.map((s, idx) => `
        <li><span>${idx + 1}. ${escapeHtml(s.name)}</span><span>${s.score}/${s.total || questions.length}</span></li>
      `).join('')}
      ${sorted.length === 0 ? '<li style="color:var(--text-light);"> No scores yet. Be the first!</li>' : ''}
    </ul>
    <div class="button-group">
      <button onclick="navigateTo('home')"> Back to Home</button>
      <button onclick="clearLeaderboardData()" class="quit-btn"> Clear All Scores</button>
    </div>
  `;
}

function clearLeaderboardData() {
  if (confirm(" Are you sure you want to clear all scores? This cannot be undone!")) {
    localStorage.removeItem("scores");
    showToast("Leaderboard cleared!");
    renderLeaderboardPanel();
  }
}


// ============================================
// ADMIN PANEL (CRUD Operations)
// ============================================

function renderAdminPanel() {
  if (!adminAuthenticated) {
    requestAdminAccess();
    return;
  }

  clearTimer();
  document.getElementById("app").innerHTML = `
    <h2> Admin Panel <span style="font-size:14px; background:var(--correct); padding:4px 10px; border-radius:20px;"> Secured</span></h2>
    <h3> Add New Question</h3>
    <input id="newQ" placeholder="Question" autocomplete="off">
    <input id="opt1" placeholder="Option 1">
    <input id="opt2" placeholder="Option 2">
    <input id="opt3" placeholder="Option 3">
    <input id="opt4" placeholder="Option 4">
    <select id="correct">
      <option value="0">Option 1 is correct</option>
      <option value="1">Option 2 is correct</option>
      <option value="2">Option 3 is correct</option>
      <option value="3">Option 4 is correct</option>
    </select>
    <button onclick="addQuestionInAdmin()"> Add Question</button>
    
    <h3> Manage Questions (${questions.length})</h3>
    <div class="admin-panel-scroll" id="questionListAdmin"></div>
    
    <div class="button-group">
      <button onclick="resetToDefaultQuestions()" class="quit-btn"> Reset to Default</button>
      <button onclick="navigateTo('home')"> Back to Home</button>
    </div>
  `;
  refreshQuestionListAdmin();
}

function refreshQuestionListAdmin() {
  const container = document.getElementById("questionListAdmin");
  if (!container) return;

  container.innerHTML = questions.map((q, idx) => `
    <div class="question-item">
      <strong>Q${idx + 1}: ${escapeHtml(q.q)}</strong>
      <small>${q.o.map((opt, i) => `${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}`).join(" | ")}</small>
      <button onclick="deleteQuestionFromAdmin(${idx})" class="delete-btn"> Delete</button>
    </div>
  `).join('');
}

function addQuestionInAdmin() {
  if (!adminAuthenticated) {
    requestAdminAccess();
    return;
  }

  const qtext = document.getElementById("newQ").value.trim();
  const opts = [
    document.getElementById("opt1").value.trim(),
    document.getElementById("opt2").value.trim(),
    document.getElementById("opt3").value.trim(),
    document.getElementById("opt4").value.trim()
  ];
  const correctIdx = parseInt(document.getElementById("correct").value);

  if (!qtext || opts.some(opt => !opt)) {
    showToast("Please fill all fields!", "error");
    return;
  }

  questions.push({ q: qtext, o: opts, a: correctIdx });
  saveQuestions();
  showToast("Question added successfully!");
  renderAdminPanel();
}

function deleteQuestionFromAdmin(index) {
  if (!adminAuthenticated) {
    requestAdminAccess();
    return;
  }

  if (confirm("Delete this question?")) {
    questions.splice(index, 1);
    saveQuestions();
    showToast("Question deleted!");
    renderAdminPanel();
  }
}

function resetToDefaultQuestions() {
  if (!adminAuthenticated) {
    requestAdminAccess();
    return;
  }

  if (confirm(" Reset all questions to default? This will delete all custom questions!")) {
    questions = [...defaultQuestions];
    saveQuestions();
    showToast("Reset to default questions!");
    renderAdminPanel();
  }
}


// ============================================
// CERTIFICATE GENERATION (jsPDF)
// ============================================

function downloadCertificate() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const percentage = (score / questions.length) * 100;

  // Draw decorative border
  doc.setDrawColor(79, 172, 254);
  doc.setLineWidth(2);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(79, 172, 254);
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);
  doc.line(20, 270, 190, 270);

  // Title
  doc.setFontSize(28);
  doc.setTextColor(79, 172, 254);
  doc.text("CERTIFICATE OF ACHIEVEMENT", 105, 60, { align: "center" });

  // Recipient line
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("This certificate is proudly presented to", 105, 95, { align: "center" });

  // User name
  doc.setFontSize(26);
  doc.setTextColor(244, 67, 54);
  doc.text(escapeHtml(user), 105, 125, { align: "center" });

  // Score details
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`For scoring ${score} out of ${questions.length} (${percentage.toFixed(1)}%)`, 105, 160, { align: "center" });
  doc.text(`in the ${category} Quiz`, 105, 180, { align: "center" });

  // Date
  const date = new Date().toLocaleDateString();
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${date}`, 105, 220, { align: "center" });

  // Signatures
  doc.line(50, 250, 90, 250);
  doc.text("Participant Signature", 70, 260, { align: "center" });
  doc.line(120, 250, 160, 250);
  doc.text("Quiz Master", 140, 260, { align: "center" });

  // Download PDF
  doc.save(`${user.replace(/\s/g, '_')}_certificate.pdf`);
  showToast("Certificate downloaded!");
}


// ============================================
// DARK MODE TOGGLE
// ============================================

function toggleDark() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  showToast(isDark ? "Dark mode enabled" : "Light mode enabled");
}


// ============================================
// INITIALIZATION
// ============================================

loadData();

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

navigateTo("home");
