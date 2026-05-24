const TEACHER_PASSWORD = "D1g1!0!"; // Change this// pretest.js

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyCmNDYkOH9tt6pdUSoUq9vwXocFy3MuIh0",
  authDomain: "digit-41192.firebaseapp.com",
  projectId: "digit-41192",
  storageBucket: "digit-41192.firebasestorage.app",
  messagingSenderId: "1000290231887",
  appId: "1:1000290231887:web:e8949c66821fec80816c3a",
  measurementId: "G-6VEFTKQPBK"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let forceRetakeMode = false;
let adminAuthUnsubscribe = null;
let adminPopupInProgress = false;

function formatAdminAuthError(err) {
  const code = (err && err.code) ? err.code : 'unknown';
  const message = (err && err.message) ? String(err.message) : '';
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('api_key_http_referrer_blocked') ||
    lowerMessage.includes('requests from referer') ||
    lowerMessage.includes('identitytoolkit.googleapis.com')
  ) {
    return 'Login blocked by API key referrer restrictions. In Google Cloud Console, allow this domain under API key HTTP referrers and keep Identity Toolkit API enabled.';
  }

  if (code === 'auth/cancelled-popup-request') {
    return 'A login popup is already open. Complete that popup first.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completion. Click Sign in again or use Redirect Sign-in.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by the browser. Use redirect sign-in below.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled in Firebase Auth. Enable Google provider in Authentication > Sign-in method.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized. Add this Codespaces domain in Firebase Auth authorized domains.';
  }
  return `${message || 'Sign-in failed.'} (${code})`;
}

const REMEMBER_PREF_KEY = 'digitech_remember_pref';
const SAVED_USERNAME_KEY = 'digitech_saved_username';

async function configureAuthPersistence(rememberUser) {
  const mode = rememberUser
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION;
  try {
    await firebase.auth().setPersistence(mode);
  } catch (error) {
    console.warn('Could not set auth persistence:', error);
  }
}

configureAuthPersistence(localStorage.getItem(REMEMBER_PREF_KEY) !== '0');

// Ensure reads/writes work with Firestore rules that require authenticated users.
async function ensureFirebaseReady() {
  if (firebase.auth().currentUser) return firebase.auth().currentUser;
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

function formatDbError(error) {
  const code = error && error.code ? error.code : 'unknown';
  if (code === 'permission-denied') {
    return '[Database permission denied]';
  }
  if (code === 'unauthenticated') {
    return '[Authentication required before saving]';
  }
  return `[Error saving to database: ${code}]`;
}

function formatAdminResultsError(error) {
  const code = error && error.code ? error.code : 'unknown';
  if (code === 'permission-denied') {
    return 'Missing or insufficient permissions. Firestore rules must allow admin read access to quizResults and submissions.';
  }
  return (error && error.message) ? error.message : `Unknown error (${code})`;
}

function usernameToEmail(username) {
  const safe = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (!safe) return null;
  return `${safe}@digitech.local`;
}

function getStudentIdentity() {
  const user = firebase.auth().currentUser;
  if (user && !user.isAnonymous) {
    const fallbackName = user.email ? user.email.split('@')[0] : 'student';
    return {
      username: user.displayName || fallbackName,
      userId: user.uid,
      email: user.email || null,
      authenticated: true
    };
  }
  return {
    username: localStorage.getItem(SAVED_USERNAME_KEY) || '',
    userId: null,
    email: null,
    authenticated: false
  };
}

function revealMainSite() {
  const overlay = document.getElementById('quiz-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('overflow-hidden');
  const mainApp = document.getElementById('main-app');
  if (mainApp) {
    mainApp.classList.remove('hidden');
    mainApp.style.display = '';
  }
  const mainContent = document.querySelector('.container');
  if (mainContent) mainContent.style.display = '';
  const retakeBtn = document.getElementById('retake-link');
  if (retakeBtn) retakeBtn.style.display = '';
}

function showCompletedPrompt(identity) {
  let overlay = document.getElementById('quiz-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'quiz-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#101010';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontFamily = "'Space Mono', monospace";
    document.body.appendChild(overlay);
  }

  const currentName = identity && identity.username ? identity.username : 'student';
  overlay.innerHTML = `
    <div style="background:#18181b;border:2px solid #00ff41;box-shadow:0 0 40px #00ff4177,0 0 8px #00ff41;max-width:560px;width:95vw;padding:2rem;border-radius:1.2rem;text-align:left;box-sizing:border-box;">
      <div style="font-size:1.15rem;color:#00ff41;font-family:'Space Mono',monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:1.8rem;">&#x25B6;</span> <span>Pre-Test Already Completed</span>
      </div>
      <div style="margin-top:1rem;color:#c7f9d8;line-height:1.5;">
        Signed in as <b>${escapeHTML(currentName)}</b>. This account already has a saved pre-test.
      </div>
      <div style="margin-top:1.4rem;display:flex;gap:0.7rem;flex-wrap:wrap;">
        <button id="continue-current-student" style="padding:0.55rem 1.1rem;background:#00ff41;color:#18181b;font-weight:bold;border:none;border-radius:0.45rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Continue to Site</button>
        <button id="switch-student-account" style="padding:0.55rem 1.1rem;background:#101010;color:#00ff41;font-weight:bold;border:1px solid #00ff41;border-radius:0.45rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Switch Student Login</button>
      </div>
    </div>
  `;

  document.getElementById('continue-current-student').onclick = () => {
    revealMainSite();
  };

  document.getElementById('switch-student-account').onclick = async () => {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error('Sign out failed while switching student:', error);
    }
    forceRetakeMode = false;
    showQuizOverlay();
  };
}

function updateStudentSessionUI(user) {
  const logoutBtn = document.getElementById('student-logout-link');
  const badge = document.getElementById('student-session-badge');
  if (!logoutBtn || !badge) return;

  if (user && !user.isAnonymous) {
    const label = user.displayName || (user.email ? user.email.split('@')[0] : 'student');
    logoutBtn.style.display = '';
    badge.style.display = '';
    badge.textContent = `Signed in: ${label}`;
    return;
  }

  logoutBtn.style.display = 'none';
  badge.style.display = 'none';
}

function setupStudentLogoutUI() {
  const logoutBtn = document.getElementById('student-logout-link');
  if (!logoutBtn) return;

  logoutBtn.onclick = async () => {
    try {
      await firebase.auth().signOut();
      if (localStorage.getItem(REMEMBER_PREF_KEY) === '0') {
        localStorage.removeItem(SAVED_USERNAME_KEY);
      }
      forceRetakeMode = false;
      showQuizOverlay();
    } catch (error) {
      console.error('Student logout failed:', error);
    }
  };

  firebase.auth().onAuthStateChanged((user) => {
    updateStudentSessionUI(user);
  });
}

const questions = [
  {
    question: "What is digital citizenship?",
    options: [
      "Being responsible and respectful when using technology and the internet",
      "Having a digital ID from the government",
      "Working as a programmer for a tech company",
      "Using social media daily"
    ],
    answer: 0
  },
  {
    question: "What is misinformation?",
    options: [
      "Information that is false or misleading, intentionally or unintentionally shared",
      "Any information posted on social media",
      "Information that is very long and detailed",
      "News articles from traditional media"
    ],
    answer: 0
  },
  {
    question: "What is computational thinking?",
    options: [
      "Breaking down complex problems into smaller steps and solving them logically",
      "Typing code very quickly",
      "Playing computer games",
      "Using a computer calculator"
    ],
    answer: 0
  },
  {
    question: "Which of these is a correct way to print text in Python?",
    options: [
      "print('Hello, World!')",
      "console.log('Hello, World!')",
      "System.out.println('Hello, World!')",
      "echo 'Hello, World!'"
    ],
    answer: 0
  },
  {
    question: "In Python, what does a loop do?",
    options: [
      "Repeats a block of code multiple times",
      "Makes a circular shape on the screen",
      "Connects two pieces of code together",
      "Stops a program from running"
    ],
    answer: 0
  },
  {
    question: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "Home Tool Markup Language",
      "Hyperlinks and Text Markup Language",
      "High-Tech Modern Language"
    ],
    answer: 0
  },
  {
    question: "What is CSS used for in web development?",
    options: [
      "Styling and layout of web pages (colours, fonts, spacing)",
      "Adding interactivity and buttons",
      "Storing and managing data",
      "Creating databases"
    ],
    answer: 0
  },
  {
    question: "What is a data visualisation?",
    options: [
      "A chart, graph, or visual representation of data to make it easier to understand",
      "A written report about data",
      "A database that stores information",
      "The process of collecting data from surveys"
    ],
    answer: 0
  },
  {
    question: "What is artificial intelligence (AI)?",
    options: [
      "Technology that uses machine learning to complete tasks and make decisions",
      "A robot that walks like a human",
      "Any computer program written by humans",
      "Technology from science fiction movies only"
    ],
    answer: 0
  },
  {
    question: "What is an ethical concern when using AI?",
    options: [
      "AI systems may have bias and can affect people's lives unfairly",
      "AI is always correct and never makes mistakes",
      "AI cannot be used for important decisions",
      "AI has no impact on society"
    ],
    answer: 0
  }
];

// --- Randomize Answer Positions ---
function randomizeQuestions() {
  questions.forEach(q => {
    // Get the correct answer text
    const correctAnswer = q.options[q.answer];
    // Shuffle the options array
    for (let i = q.options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
    }
    // Update the answer index to match the new position of the correct answer
    q.answer = q.options.indexOf(correctAnswer);
  });
}

// Randomize on page load
randomizeQuestions();


function typeWriter(element, text, speed = 25, callback) {
  let i = 0;
  function typing() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    } else if (callback) {
      callback();
    }
  }
  element.innerHTML = '';
  typing();
}


async function showQuizOverlay() {

  await ensureFirebaseReady();
  const initialIdentity = getStudentIdentity();
  const forceRetake = forceRetakeMode;

  // Check if user has already completed the pretest using Firestore only.
  let username = initialIdentity.username;
  
  if (!forceRetake && initialIdentity.authenticated) {
    try {
      const byUserId = await db.collection('quizResults').where('userId', '==', initialIdentity.userId).limit(1).get();
      const hasResult = !byUserId.empty;
      if (hasResult) {
        // Already completed: skip pretest and continue to main site.
        revealMainSite();
        return;
      }
    } catch (e) {
      console.log('Firestore check failed, continuing to pretest');
    }
  }
  // Hide main site
  const retakeBtn = document.getElementById('retake-link');
  if (retakeBtn) retakeBtn.style.display = 'none';
  document.body.classList.add('overflow-hidden');
  const mainContent = document.querySelector('.container');
  if (mainContent) mainContent.style.display = 'none';

  // Create overlay
  let overlay = document.getElementById('quiz-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'quiz-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#101010';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontFamily = "'Space Mono', monospace";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="background:#18181b;border:2px solid #00ff41;box-shadow:0 0 40px #00ff4177,0 0 8px #00ff41;max-width:600px;width:95vw;padding:2.5rem 2rem;border-radius:1.5rem;text-align:left;box-sizing:border-box;">
      <div style="font-size:1.2rem;color:#00ff41;font-family:'Space Mono',monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:2rem;">&#x25B6;</span> <span>DigiTech Terminal Pre-Test</span>
      </div>
      <div id="quiz-username-area" style="margin:2.5rem 0 1.5rem 0;">
        <div style="margin-bottom: 1.5rem;">
          <span style="color:#00ff41;">alias@digitech:~$</span> <input id="quiz-username" type="text" placeholder="create username" style="width:60%;padding:0.5rem 1rem;font-size:1.1rem;background:#18181b;color:#00ff41;border:1.5px solid #00ff41;border-radius:0.5rem;outline:none;box-shadow:0 0 8px #00ff4155;font-family:'Space Mono',monospace;" maxlength="24" autocomplete="username">
          <button id="quiz-username-btn" style="margin-left:0.5rem;padding:0.5rem 1.2rem;background:#00ff41;color:#18181b;font-weight:bold;border:none;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Start Quiz</button>
          <span class="blinking-cursor" style="color:#00ff41;font-weight:bold;font-size:1.2rem;margin-left:0.2rem;">█</span>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:-0.6rem;margin-bottom:1.1rem;">
          <input id="quiz-password" type="password" placeholder="password (6+ chars)" style="flex:1;min-width:220px;padding:0.45rem 0.8rem;font-size:1rem;background:#18181b;color:#00ff41;border:1.5px solid #00ff41;border-radius:0.5rem;outline:none;box-shadow:0 0 8px #00ff4155;font-family:'Space Mono',monospace;" autocomplete="current-password">
          <button id="student-create-btn" style="padding:0.45rem 0.85rem;background:#00ff41;color:#18181b;font-weight:bold;border:none;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Create Account</button>
          <button id="student-login-btn" style="padding:0.45rem 0.85rem;background:#00441a;color:#00ff41;font-weight:bold;border:1px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Login</button>
        </div>
        <label style="display:flex;align-items:center;gap:0.45rem;color:#8de6b3;font-size:0.82rem;margin-top:-0.3rem;margin-bottom:0.8rem;cursor:pointer;">
          <input id="remember-student-login" type="checkbox" style="accent-color:#00ff41;" ${localStorage.getItem(REMEMBER_PREF_KEY) !== '0' ? 'checked' : ''}>
          Remember login on this device
        </label>
        <div id="student-auth-status" style="margin-top:-0.5rem;margin-bottom:0.9rem;color:#6ee7b7;font-size:0.85rem;">${initialIdentity.authenticated ? 'Signed in. Your work will save to your account.' : 'Create or login to save work under your account.'}</div>
        <div style="border-top: 1px solid #00ff41; padding-top: 1rem; color: #00ff41; font-size: 0.9rem; text-align: center;">
          <div style="margin-bottom: 0.75rem;">Already completed this pretest?</div>
          <button id="skip-if-completed-btn" style="width: 100%; padding:0.5rem 1rem;background:#00441a;color:#00ff41;border:1px solid #00ff41;border-radius:0.5rem;cursor:pointer;font-family:'Space Mono',monospace; font-weight: bold;">Check if Completed</button>
          <div id="skip-status" style="margin-top: 0.5rem; font-size: 0.85rem; color: #ffaa00;"></div>
        </div>
      </div>
      <div id="quiz-area" style="display:none;"></div>
      <div id="quiz-score-area" style="display:none;"></div>
    </div>
    <style>
      .blinking-cursor { animation: blink 1s steps(1) infinite; }
      @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
    </style>
  `;
  document.getElementById('quiz-username-btn').onclick = () => {
    const username = document.getElementById('quiz-username').value.trim();
    if (username.length < 2) {
      document.getElementById('quiz-username').style.borderColor = 'red';
      return;
    }
    const authUser = firebase.auth().currentUser;
    if (!authUser || authUser.isAnonymous) {
      const authStatus = document.getElementById('student-auth-status');
      if (authStatus) {
        authStatus.textContent = 'Login required before starting the quiz.';
        authStatus.style.color = '#f87171';
      }
      return;
    }
    forceRetakeMode = false;
    document.getElementById('quiz-username-area').style.display = 'none';
    showQuestion(0);
  };
  const authStatus = document.getElementById('student-auth-status');
  const passwordInput = document.getElementById('quiz-password');
  const rememberCheckbox = document.getElementById('remember-student-login');
  const createBtn = document.getElementById('student-create-btn');
  const loginBtn = document.getElementById('student-login-btn');
  const setAuthStatus = (text, color) => {
    authStatus.textContent = text;
    authStatus.style.color = color;
  };
  const resolveAuthInputs = () => {
    const enteredUsername = document.getElementById('quiz-username').value.trim();
    const enteredPassword = passwordInput.value;
    if (enteredUsername.length < 2) {
      setAuthStatus('Username must be at least 2 characters.', '#f87171');
      return null;
    }
    if (enteredPassword.length < 6) {
      setAuthStatus('Password must be at least 6 characters.', '#f87171');
      return null;
    }
    const email = usernameToEmail(enteredUsername);
    if (!email) {
      setAuthStatus('Use letters and numbers in username.', '#f87171');
      return null;
    }
    const rememberLogin = !!(rememberCheckbox && rememberCheckbox.checked);
    return { enteredUsername, enteredPassword, email, rememberLogin };
  };
  if (rememberCheckbox) {
    rememberCheckbox.onchange = () => {
      localStorage.setItem(REMEMBER_PREF_KEY, rememberCheckbox.checked ? '1' : '0');
    };
  }
  if (createBtn) {
    createBtn.onclick = async () => {
      const payload = resolveAuthInputs();
      if (!payload) return;
      setAuthStatus('Creating account...', '#ffaa00');
      try {
        await configureAuthPersistence(payload.rememberLogin);
        const credential = await firebase.auth().createUserWithEmailAndPassword(payload.email, payload.enteredPassword);
        if (credential.user) {
          await credential.user.updateProfile({ displayName: payload.enteredUsername });
        }
        localStorage.setItem(SAVED_USERNAME_KEY, payload.enteredUsername);
        document.getElementById('quiz-username').value = payload.enteredUsername;
        setAuthStatus('Account created. Your work will save to this account.', '#00ff41');
      } catch (error) {
        if (error && error.code === 'auth/email-already-in-use') {
          setAuthStatus('Username already exists. Use Login instead.', '#f87171');
        } else {
          setAuthStatus(`Auth error: ${error.code || 'unknown'}`, '#f87171');
        }
      }
    };
  }
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const payload = resolveAuthInputs();
      if (!payload) return;
      setAuthStatus('Signing in...', '#ffaa00');
      try {
        await configureAuthPersistence(payload.rememberLogin);
        const credential = await firebase.auth().signInWithEmailAndPassword(payload.email, payload.enteredPassword);
        if (credential.user && !credential.user.displayName) {
          await credential.user.updateProfile({ displayName: payload.enteredUsername });
        }
        localStorage.setItem(SAVED_USERNAME_KEY, payload.enteredUsername);
        document.getElementById('quiz-username').value = payload.enteredUsername;
        setAuthStatus('Login successful. Your work will save to this account.', '#00ff41');
      } catch (error) {
        setAuthStatus(`Login failed: ${error.code || 'unknown'}`, '#f87171');
      }
    };
  }
  if (username) {
    document.getElementById('quiz-username').value = username;
  }
  document.getElementById('quiz-username').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('quiz-username-btn').click();
  });

  // Skip if Already Completed functionality
  const skipBtn = document.getElementById('skip-if-completed-btn');
  const skipStatus = document.getElementById('skip-status');
  const usernameInput = document.getElementById('quiz-username');

  if (skipBtn) {
    skipBtn.onclick = async () => {
      const authUser = firebase.auth().currentUser;
      if (!authUser || authUser.isAnonymous) {
        skipStatus.style.color = '#ff4444';
        skipStatus.textContent = 'Login required before completion check.';
        return;
      }

      try {
        skipStatus.textContent = 'Checking...';
        skipStatus.style.color = '#ffaa00';
        
        // Query Firestore for this signed-in user ID.
        const snap = await db.collection('quizResults').where('userId', '==', authUser.uid).limit(1).get();
        
        if (!snap.empty) {
          // Already completed - show main course
          skipStatus.textContent = '✓ Found! Loading course...';
          skipStatus.style.color = '#00ff41';

          setTimeout(() => {
            revealMainSite();
          }, 500);
        } else {
          // Not found - they need to take the pretest
          skipStatus.textContent = '✗ No completed test found for this login. Start the pretest above.';
          skipStatus.style.color = '#ff8844';
        }
      } catch (error) {
        console.error('Error checking completion:', error);
        if (error && error.code === 'permission-denied') {
          skipStatus.textContent = '✗ Cannot check completion: Firestore rules blocked read access.';
        } else {
          skipStatus.textContent = `✗ Error checking: ${error.code || 'unknown-error'}`;
        }
        skipStatus.style.color = '#ff4444';
      }
    };
  }
}

let userAnswers = Array(questions.length).fill(null);
let currentQ = 0;

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showQuestion(idx) {
  currentQ = idx;
  const quizArea = document.getElementById('quiz-area');
  quizArea.style.display = '';
  quizArea.innerHTML = `
    <div id='hacker-question' style='min-height:3.5rem;font-size:1.2rem;color:#00ff41;text-shadow:0 0 8px #00ff41;font-family:monospace;'> </div>
    <div id='hacker-options' style='margin-top:1.5rem;'></div>
    <div id='nav-btns'></div>
  `;
  const q = questions[idx];
  if (!q || !q.question) {
    document.getElementById('hacker-question').innerHTML = '<span style="color:#f87171">[Error: Question not found]</span>';
    console.error('Question missing or undefined at index', idx, q);
    return;
  }
  typeWriter(document.getElementById('hacker-question'), `${idx+1}. ${q.question}`, 18, () => {
    const optionsDiv = document.getElementById('hacker-options');
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
      optionsDiv.innerHTML = '<span style="color:#f87171">[Error: Options missing]</span>';
      console.error('Options missing or undefined at index', idx, q);
      return;
    }
    optionsDiv.innerHTML = q.options.map((opt, oidx) => `
      <label style='display:block;margin-bottom:0.7rem;cursor:pointer;font-family:monospace;'>
        <input type='radio' name='q${idx}' value='${oidx}' style='accent-color:#00ff41;margin-right:0.7rem;' ${userAnswers[idx]===oidx?'checked':''}>
        <span style='color:#00ff41;text-shadow:0 0 6px #00ff41;'>${escapeHTML(opt)}</span>
      </label>
    `).join('');
    optionsDiv.querySelectorAll('input[type=radio]').forEach(input => {
      input.onchange = e => {
        userAnswers[idx] = parseInt(e.target.value);
        // Neon flash effect
        input.parentElement.style.background = '#003b1a';
        setTimeout(()=>{input.parentElement.style.background='';}, 200);
      };
    });
    // Render navigation buttons only after typing and options are ready
    const navBtns = document.getElementById('nav-btns');
    navBtns.innerHTML = '';
    const navDiv = document.createElement('div');
    navDiv.style.marginTop = '2rem';
    navDiv.style.display = 'flex';
    navDiv.style.gap = '1rem';
    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.id = 'prev-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.style.padding = '0.5rem 1.2rem';
    prevBtn.style.background = '#222';
    prevBtn.style.color = '#00ff41';
    prevBtn.style.fontWeight = 'bold';
    prevBtn.style.border = '1.5px solid #00ff41';
    prevBtn.style.borderRadius = '0.5rem';
    prevBtn.style.boxShadow = '0 0 8px #00ff41';
    prevBtn.style.cursor = 'pointer';
    prevBtn.style.fontFamily = 'monospace';
    if(idx === 0) prevBtn.style.display = 'none';
    prevBtn.onclick = () => { if(idx > 0) showQuestion(idx-1); };
    // Next/Submit button
    const nextBtn = document.createElement('button');
    nextBtn.id = 'next-btn';
    nextBtn.textContent = idx === questions.length-1 ? 'Submit' : 'Next >';
    nextBtn.style.padding = '0.5rem 1.5rem';
    nextBtn.style.background = '#00ff41';
    nextBtn.style.color = '#18181b';
    nextBtn.style.fontWeight = 'bold';
    nextBtn.style.border = 'none';
    nextBtn.style.borderRadius = '0.5rem';
    nextBtn.style.boxShadow = '0 0 8px #00ff41';
    nextBtn.style.cursor = 'pointer';
    nextBtn.style.fontFamily = 'monospace';
    nextBtn.onclick = () => {
      if (userAnswers[idx] === null) {
        document.getElementById('hacker-question').style.color = '#f87171';
        setTimeout(()=>{document.getElementById('hacker-question').style.color='#00ff41';}, 400);
        return;
      }
      if (idx === questions.length-1) {
        showScore();
      } else {
        showQuestion(idx+1);
      }
    };
    navDiv.appendChild(prevBtn);
    navDiv.appendChild(nextBtn);
    navBtns.appendChild(navDiv);
  });
}

async function showScore() {
  const quizArea = document.getElementById('quiz-area');
  quizArea.style.display = 'none';
  const scoreArea = document.getElementById('quiz-score-area');
  scoreArea.style.display = '';
  await ensureFirebaseReady();
  const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === questions[idx].answer ? 1 : 0), 0);
  const identity = getStudentIdentity();
  const username = identity.username;
  const result = {
    username,
    userId: identity.userId,
    email: identity.email,
    score,
    total: questions.length,
    date: new Date().toISOString(),
    answers: userAnswers
  };
  // Save to Firestore
  let saveMsg = '';
  try {
    await db.collection('quizResults').add(result);
    saveMsg = `<span style='color:#00ff41;'>[Saved to database]</span>`;
  } catch (e) {
    saveMsg = `<span style='color:#f87171;'>${formatDbError(e)}</span>`;
    console.error('Firestore save error:', e);
  }
  // Animated score reveal
  let shown = 0;
  scoreArea.innerHTML = `<div style='font-size:2.2rem;color:#00ff41;text-shadow:0 0 12px #00ff41;font-weight:bold;font-family:monospace;'>Score: <span id='score-anim'>0</span> / ${questions.length}</div><div style='margin-top:0.5rem;'>${saveMsg}</div><div style='margin-top:1.5rem;'><button id='reveal-site-btn' style='padding:0.7rem 2rem;background:#00ff41;color:#18181b;font-weight:bold;border:none;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-size:1.1rem;font-family:monospace;'>Enter Site</button></div>`;
  const anim = setInterval(()=>{
    if (shown < score) {
      shown++;
      document.getElementById('score-anim').textContent = shown;
    } else {
      clearInterval(anim);
    }
  }, 120);
  document.getElementById('reveal-site-btn').onclick = () => {
    // Hide overlay, show site
    forceRetakeMode = false;
    document.getElementById('quiz-overlay').remove();
    revealMainSite();
  };
}

function addRetakeButton() {
  if (document.getElementById('retake-link')) return;
  const btn = document.createElement('button');
  btn.id = 'retake-link';
  btn.textContent = 'RETAKE PRETEST';
  btn.style.position = 'fixed';
  btn.style.bottom = '6px';
  btn.style.left = '50%';
  btn.style.transform = 'translateX(-50%)';
  btn.style.padding = '0.55rem 1rem';
  btn.style.background = '#101010';
  btn.style.color = '#00ff41';
  btn.style.fontWeight = 'bold';
  btn.style.border = '1.5px solid #00ff41';
  btn.style.borderRadius = '0.5rem';
  btn.style.boxShadow = '0 0 8px #00ff41';
  btn.style.cursor = 'pointer';
  btn.style.fontFamily = 'monospace';
  btn.style.zIndex = '99998';
  btn.onclick = () => {
    forceRetakeMode = true;
    showQuizOverlay();
  };
  document.body.appendChild(btn);
}

// --- Admin Google Sign-In Restriction ---
const ADMIN_EMAIL = "pb@hurunuicollege.school.nz"; // CHANGE THIS TO YOUR GOOGLE EMAIL

document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().getRedirectResult().catch((err) => {
    console.error('Admin redirect sign-in result error:', err);
  });
  setupStudentLogoutUI();
  addRetakeButton();
  showQuizOverlay();

  // Admin Modal Logic
  const adminLink = document.getElementById('admin-link');
  const adminModal = document.getElementById('admin-modal');
  const closeAdminModal = document.getElementById('close-admin-modal');
  const adminModalContent = document.getElementById('admin-modal-content');

  if (adminLink && adminModal && closeAdminModal && adminModalContent) {
    adminLink.onclick = async () => {
      if (adminAuthUnsubscribe) {
        adminAuthUnsubscribe();
        adminAuthUnsubscribe = null;
      }
      adminModal.classList.remove('hidden');
      adminModalContent.innerHTML = `<div style="color:#00ff41;font-family:monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;">
        <span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> AUTHENTICATING...<br><span style="font-size:0.9em;color:#6ee7b7;">(Google Admin Terminal)</span>
      </div>
      <style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>`;
      adminAuthUnsubscribe = firebase.auth().onAuthStateChanged(async user => {
        if (!user || user.isAnonymous) {
          // Not signed in: show Google Sign-In button
          adminModalContent.innerHTML = `
            <div style="color:#00ff41;font-family:monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;">
              <span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> <span>ADMIN LOGIN REQUIRED</span>
              <div style="margin:1.5rem 0 1rem 0;color:#6ee7b7;">Sign in with Google to access admin results.</div>
              <button id="admin-google-signin" style="padding:0.7rem 2rem;background:#101010;color:#00ff41;font-weight:bold;border:1.5px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-size:1.1rem;font-family:monospace;display:flex;align-items:center;gap:0.7em;">
                <img src='https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' style='height:1.2em;vertical-align:middle;'> <span>Sign in with Google</span>
              </button>
              <button id="admin-google-redirect" style="margin-top:0.7rem;padding:0.55rem 1.2rem;background:#003b1a;color:#00ff41;font-weight:bold;border:1px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-size:0.95rem;font-family:monospace;display:none;">
                Use Redirect Sign-in
              </button>
              <button id="admin-google-popup" style="margin-top:0.7rem;padding:0.55rem 1.2rem;background:#101010;color:#00ff41;font-weight:bold;border:1px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-size:0.95rem;font-family:monospace;display:none;">
                Try Popup Sign-in Instead
              </button>
              <div id="admin-login-error" style="color:#f87171;margin-top:1em;"></div>
            </div>
            <style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>
          `;
          const provider = new firebase.auth.GoogleAuthProvider();
          const redirectBtn = document.getElementById('admin-google-redirect');
          const popupBtn = document.getElementById('admin-google-popup');
          if (redirectBtn) {
            redirectBtn.onclick = async () => {
              try {
                await firebase.auth().signInWithRedirect(provider);
              } catch (err) {
                const errorEl = document.getElementById('admin-login-error');
                if (errorEl) errorEl.textContent = formatAdminAuthError(err);
              }
            };
          }
          // Codespaces and school devices are often popup-restricted; use redirect by default.
          document.getElementById('admin-google-signin').onclick = async () => {
            try {
              await firebase.auth().signInWithRedirect(provider);
            } catch (err) {
              const errorEl = document.getElementById('admin-login-error');
              if (errorEl) errorEl.textContent = formatAdminAuthError(err);
            }
          };

          if (popupBtn) {
            popupBtn.style.display = 'inline-block';
          }

          if (popupBtn) {
            popupBtn.onclick = async () => {
            if (adminPopupInProgress) return;
            const signInBtn = document.getElementById('admin-google-signin');
            try {
              adminPopupInProgress = true;
              if (signInBtn) signInBtn.disabled = true;
              popupBtn.disabled = true;
              await firebase.auth().signInWithPopup(provider);
            } catch (err) {
              const errorEl = document.getElementById('admin-login-error');
              if (errorEl) {
                errorEl.textContent = formatAdminAuthError(err);
              }
              if (err && (
                err.code === 'auth/popup-blocked' ||
                err.code === 'auth/cancelled-popup-request' ||
                err.code === 'auth/popup-closed-by-user'
              )) {
                if (redirectBtn) {
                  redirectBtn.style.display = 'inline-block';
                }
              }
            } finally {
              adminPopupInProgress = false;
              if (signInBtn) signInBtn.disabled = false;
              popupBtn.disabled = false;
            }
            };
          }
        } else if (user.email !== ADMIN_EMAIL) {
          // Signed in, but not admin
          adminModalContent.innerHTML = `<div style='color:#f87171;font-family:monospace;text-shadow:0 0 8px #00ff41;'><span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> ACCESS DENIED<br><span style='color:#6ee7b7;'>Signed in as <b>${escapeHTML(user.email)}</b>.<br>Only the admin may view results.</span><br><button id='admin-logout' style='margin-top:1.5em;padding:0.5em 1.5em;background:#101010;color:#00ff41;font-weight:bold;border:1.5px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:monospace;'>Logout</button></div><style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>`;
          document.getElementById('admin-logout').onclick = () => firebase.auth().signOut();
        } else {
          // Signed in as admin: show results
          adminModalContent.innerHTML = `<div style='color:#00ff41;font-family:monospace;text-shadow:0 0 8px #00ff41;'><span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> ACCESS GRANTED<br><span style='color:#6ee7b7;'>Welcome, <b>${escapeHTML(user.email)}</b></span><br><button id='admin-logout' style='margin:1em 0 1.5em 0;padding:0.5em 1.5em;background:#101010;color:#00ff41;font-weight:bold;border:1.5px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:monospace;'>Logout</button><div id='admin-results-table' style='margin-top:1.5em;'></div></div><style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>`;
          document.getElementById('admin-logout').onclick = () => firebase.auth().signOut();
          const resultsDiv = document.getElementById('admin-results-table');
          // Quiz Results
          let html = `<div style='margin-bottom:2em;'>`;
          html += `<div style='color:#00ff41;font-weight:bold;margin-bottom:0.5em;'>Quiz Results</div>`;
          html += `<div style='color:#00ff41;'>Loading quiz results...</div>`;
          html += `</div>`;
          resultsDiv.innerHTML = html;
          try {
            const snap = await db.collection('quizResults').orderBy('date', 'desc').limit(50).get();
            if (snap.empty) {
              resultsDiv.innerHTML = '<div style="color:#fbbf24;">No quiz results found.</div>';
            } else {
              let quizHtml = `<pre style='color:#00ff41;background:#101010;padding:0.5em 0.2em;font-size:1em;overflow-x:auto;border-radius:0.5em;border:1.5px solid #00ff41;'><span style='color:#6ee7b7;'>┌───────────────┬───────┬────────────────────────────┐\n│ User         │ Score │ Date                       │\n├───────────────┼───────┼────────────────────────────┤</span>\n`;
              snap.forEach(doc => {
                const d = doc.data();
                const user = (d.username||'').padEnd(13).slice(0,13);
                const score = `${d.score} / ${d.total||10}`.padEnd(7);
                const date = d.date?new Date(d.date).toLocaleString().padEnd(26):''.padEnd(26);
                quizHtml += `│ ${escapeHTML(user)} │ ${escapeHTML(score)} │ ${escapeHTML(date)} │\n`;
              });
              quizHtml += `<span style='color:#6ee7b7;'>└───────────────┴───────┴────────────────────────────┘</span></pre>`;
              resultsDiv.innerHTML = `<div style='margin-bottom:2em;'><div style='color:#00ff41;font-weight:bold;margin-bottom:0.5em;'>Quiz Results</div>${quizHtml}</div>`;
            }
          } catch (e) {
            resultsDiv.innerHTML = `<div style='color:#f87171;'>Error loading quiz results.<br>${formatAdminResultsError(e)}</div>`;
          }
          // Project Submissions
          let subHtml = `<div style='color:#00ff41;font-weight:bold;margin:2em 0 0.5em 0;'>Project Submissions</div>`;
          subHtml += `<div style='color:#00ff41;'>Loading submissions...</div>`;
          resultsDiv.innerHTML += subHtml;
          try {
            const subSnap = await db.collection('submissions').orderBy('date', 'desc').limit(50).get();
            if (subSnap.empty) {
              resultsDiv.innerHTML += '<div style="color:#fbbf24;">No project submissions found.</div>';
            } else {
              let table = `<pre style='color:#00ff41;background:#101010;padding:0.5em 0.2em;font-size:1em;overflow-x:auto;border-radius:0.5em;border:1.5px solid #00ff41;'><span style='color:#6ee7b7;'>┌───────────────┬──────────────────────┬────────────────────────────┬────────────────────────────┐\n│ User         │ Project Name         │ Project Link               │ Planning Doc               │\n├───────────────┼──────────────────────┼────────────────────────────┼────────────────────────────┤</span>\n`;
              subSnap.forEach(doc => {
                const d = doc.data();
                const user = (d.username||'').padEnd(13).slice(0,13);
                const pname = (d.projectName||'').padEnd(20).slice(0,20);
                const plink = d.projectLink ? d.projectLink : '';
                const pdoc = d.planningDoc ? d.planningDoc : '';
                table += `│ ${escapeHTML(user)} │ ${escapeHTML(pname)} │ ${plink ? `<a href='${escapeHTML(plink)}' target='_blank' style='color:#22d3ee;text-decoration:underline;'>link</a>`.padEnd(26) : ''.padEnd(26)} │ ${pdoc ? `<a href='${escapeHTML(pdoc)}' target='_blank' style='color:#22d3ee;text-decoration:underline;'>doc</a>`.padEnd(26) : ''.padEnd(26)} │\n`;
              });
              table += `<span style='color:#6ee7b7;'>└───────────────┴──────────────────────┴────────────────────────────┴────────────────────────────┘</span></pre>`;
              resultsDiv.innerHTML += table;
            }
          } catch (e) {
            resultsDiv.innerHTML += `<div style='color:#f87171;'>Error loading submissions.<br>${formatAdminResultsError(e)}</div>`;
          }
        }
      });
    };
    closeAdminModal.onclick = () => {
      if (adminAuthUnsubscribe) {
        adminAuthUnsubscribe();
        adminAuthUnsubscribe = null;
      }
      adminModal.classList.add('hidden');
    };
    // Optional: close modal on background click
    adminModal.onclick = (e) => {
      if (e.target === adminModal) {
        if (adminAuthUnsubscribe) {
          adminAuthUnsubscribe();
          adminAuthUnsubscribe = null;
        }
        adminModal.classList.add('hidden');
      }
    };
  }

  // Teacher Portal Logic
  const TEACHER_PASSWORD = "D1g1!0!"; // Change this to your desired password
  const teacherLink = document.getElementById('teacher-link');
  const teacherModal = document.getElementById('teacher-modal');
  const closeTeacherModal = document.getElementById('close-teacher-modal');
  const teacherLoginArea = document.getElementById('teacher-login-area');
  const teacherContentArea = document.getElementById('teacher-content-area');
  const teacherPasswordInput = document.getElementById('teacher-password');
  const teacherLoginBtn = document.getElementById('teacher-login-btn');
  const teacherLogoutBtn = document.getElementById('teacher-logout-btn');
  const teacherLoginError = document.getElementById('teacher-login-error');

  if (teacherLink && teacherModal && closeTeacherModal) {
    console.log('Teacher portal elements found!');
    console.log('teacherPasswordInput:', teacherPasswordInput);
    console.log('teacherLoginBtn:', teacherLoginBtn);
    
    teacherLink.onclick = () => {
      teacherModal.classList.remove('hidden');
      teacherLoginArea.classList.remove('hidden');
      teacherContentArea.classList.add('hidden');
      teacherPasswordInput.value = '';
      teacherLoginError.textContent = '';
    };

    teacherLoginBtn.onclick = () => {
      const password = teacherPasswordInput.value;
      console.log('Password entered:', password);
      console.log('Expected password:', TEACHER_PASSWORD);
      console.log('Match?', password === TEACHER_PASSWORD);
      
      if (password === TEACHER_PASSWORD) {
        console.log('Password correct! Showing content area');
        teacherLoginArea.classList.add('hidden');
        teacherContentArea.classList.remove('hidden');
      } else {
        console.log('Password incorrect');
        teacherLoginError.textContent = 'Incorrect password. Try again.';
        teacherPasswordInput.style.borderColor = '#ef4444';
        setTimeout(() => {
          teacherPasswordInput.style.borderColor = '';
        }, 500);
      }
    };

    teacherPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') teacherLoginBtn.click();
    });

    teacherLogoutBtn.onclick = () => {
      teacherLoginArea.classList.remove('hidden');
      teacherContentArea.classList.add('hidden');
      teacherPasswordInput.value = '';
      teacherLoginError.textContent = '';
    };

    closeTeacherModal.onclick = () => {
      teacherModal.classList.add('hidden');
    };

    teacherModal.onclick = e => {
      if (e.target === teacherModal) teacherModal.classList.add('hidden');
    };

    // Pretest Bypass Functionality
    const bypassBtn = document.getElementById('bypass-btn');
    const bypassMessage = document.getElementById('bypass-message');

    if (bypassBtn) {
      bypassBtn.onclick = async () => {
        try {
          // Teacher bypass is in-memory only for this open page/session.
          forceRetakeMode = false;

          bypassMessage.textContent = '✓ Pretest bypassed for this session.';
          bypassMessage.style.color = '#4ade80';

          revealMainSite();
        } catch (error) {
          console.error('Error bypassing pretest:', error);
          bypassMessage.textContent = 'Error: Could not bypass pretest.';
          bypassMessage.style.color = '#ef4444';
        }
      };
    }
  }
});