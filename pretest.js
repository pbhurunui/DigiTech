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

  // Check if user has already completed the pretest (localStorage first, then Firestore)
  let username = localStorage.getItem('digitech_username');
  const localScore = localStorage.getItem('digitech_score');
  
  // Check localStorage first (covers bypassed pretest and previously submitted scores)
  if (username && localScore) {
    document.body.classList.remove('overflow-hidden');
    const mainApp = document.getElementById('main-app');
    if (mainApp) mainApp.classList.remove('hidden');
    return;
  }
  
  // If no localStorage score, check Firestore
  if (username) {
    try {
      const snap = await db.collection('quizResults').where('username', '==', username).limit(1).get();
      if (!snap.empty) {
        // Already completed: skip overlay, show site
        document.body.classList.remove('overflow-hidden');
        const mainApp = document.getElementById('main-app');
        if (mainApp) mainApp.classList.remove('hidden');
        return;
      }
    } catch (e) {
      console.log('Firestore check failed, continuing to pretest');
    }
  }
  // Hide main site
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
          <span style="color:#00ff41;">alias@digitech:~$</span> <input id="quiz-username" type="text" placeholder="enter your hacker alias" style="width:60%;padding:0.5rem 1rem;font-size:1.1rem;background:#18181b;color:#00ff41;border:1.5px solid #00ff41;border-radius:0.5rem;outline:none;box-shadow:0 0 8px #00ff4155;font-family:'Space Mono',monospace;" maxlength="24" autocomplete="off">
          <button id="quiz-username-btn" style="margin-left:0.5rem;padding:0.5rem 1.2rem;background:#00ff41;color:#18181b;font-weight:bold;border:none;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-family:'Space Mono',monospace;">Start</button>
          <span class="blinking-cursor" style="color:#00ff41;font-weight:bold;font-size:1.2rem;margin-left:0.2rem;">█</span>
        </div>
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
    localStorage.setItem('digitech_username', username);
    document.getElementById('quiz-username-area').style.display = 'none';
    showQuestion(0);
  };
  document.getElementById('quiz-username').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('quiz-username-btn').click();
  });

  // Skip if Already Completed functionality
  const skipBtn = document.getElementById('skip-if-completed-btn');
  const skipStatus = document.getElementById('skip-status');
  const usernameInput = document.getElementById('quiz-username');

  if (skipBtn) {
    skipBtn.onclick = async () => {
      const username = usernameInput.value.trim();
      if (username.length < 2) {
        skipStatus.style.color = '#ff4444';
        skipStatus.textContent = 'Please enter a valid alias first';
        return;
      }

      try {
        skipStatus.textContent = 'Checking...';
        skipStatus.style.color = '#ffaa00';
        
        // Query Firestore for this username
        const snap = await db.collection('quizResults').where('username', '==', username).limit(1).get();
        
        if (!snap.empty) {
          // Already completed - show main course
          skipStatus.textContent = '✓ Found! Loading course...';
          skipStatus.style.color = '#00ff41';
          
          // Save to localStorage for this session
          localStorage.setItem('digitech_username', username);
          localStorage.setItem('digitech_score', '1'); // Mark as completed
          
          setTimeout(() => {
            // Hide quiz overlay and show main app
            document.body.classList.remove('overflow-hidden');
            const mainApp = document.getElementById('main-app');
            if (mainApp) {
              mainApp.classList.remove('hidden');
              mainApp.style.display = '';
            }
            overlay.style.display = 'none';
          }, 500);
        } else {
          // Not found - they need to take the pretest
          skipStatus.textContent = '✗ No record found. Start the pretest above.';
          skipStatus.style.color = '#ff8844';
        }
      } catch (error) {
        console.error('Error checking completion:', error);
        skipStatus.textContent = '✗ Error checking. Start the pretest above.';
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
  const score = userAnswers.reduce((acc, ans, idx) => acc + (ans === questions[idx].answer ? 1 : 0), 0);
  const username = localStorage.getItem('digitech_username') || 'Anonymous';
  const result = { username, score, total: questions.length, date: new Date().toISOString(), answers: userAnswers };
  localStorage.setItem('digitech_score', JSON.stringify(result));
  // Save to Firestore
  let saveMsg = '';
  try {
    await db.collection('quizResults').add(result);
    saveMsg = `<span style='color:#00ff41;'>[Saved to database]</span>`;
  } catch (e) {
    saveMsg = `<span style='color:#f87171;'>[Error saving to database]</span>`;
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
    document.getElementById('quiz-overlay').remove();
    document.body.classList.remove('overflow-hidden');
    const mainContent = document.querySelector('.container');
    if (mainContent) mainContent.style.display = '';
  };
}

// --- Admin Google Sign-In Restriction ---
const ADMIN_EMAIL = "pb@hurunuicollege.school.nz"; // CHANGE THIS TO YOUR GOOGLE EMAIL

document.addEventListener('DOMContentLoaded', () => {
  showQuizOverlay();

  // Admin Modal Logic
  const adminLink = document.getElementById('admin-link');
  const adminModal = document.getElementById('admin-modal');
  const closeAdminModal = document.getElementById('close-admin-modal');
  const adminModalContent = document.getElementById('admin-modal-content');

  if (adminLink && adminModal && closeAdminModal && adminModalContent) {
    adminLink.onclick = async () => {
      adminModal.classList.remove('hidden');
      adminModalContent.innerHTML = `<div style="color:#00ff41;font-family:monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;">
        <span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> AUTHENTICATING...<br><span style="font-size:0.9em;color:#6ee7b7;">(Google Admin Terminal)</span>
      </div>
      <style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>`;
      firebase.auth().onAuthStateChanged(async user => {
        if (!user) {
          // Not signed in: show Google Sign-In button
          adminModalContent.innerHTML = `
            <div style="color:#00ff41;font-family:monospace;text-shadow:0 0 8px #00ff41;letter-spacing:1px;">
              <span class="blinking-cursor" style="font-weight:bold;font-size:1.2rem;">█</span> <span>ADMIN LOGIN REQUIRED</span>
              <div style="margin:1.5rem 0 1rem 0;color:#6ee7b7;">Sign in with Google to access admin results.</div>
              <button id="admin-google-signin" style="padding:0.7rem 2rem;background:#101010;color:#00ff41;font-weight:bold;border:1.5px solid #00ff41;border-radius:0.5rem;box-shadow:0 0 8px #00ff41;cursor:pointer;font-size:1.1rem;font-family:monospace;display:flex;align-items:center;gap:0.7em;">
                <img src='https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' style='height:1.2em;vertical-align:middle;'> <span>Sign in with Google</span>
              </button>
              <div id="admin-login-error" style="color:#f87171;margin-top:1em;"></div>
            </div>
            <style>.blinking-cursor{animation:blink 1s steps(1) infinite;}@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}</style>
          `;
          document.getElementById('admin-google-signin').onclick = async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
              await firebase.auth().signInWithPopup(provider);
            } catch (err) {
              document.getElementById('admin-login-error').textContent = err.message;
            }
          };
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
            resultsDiv.innerHTML = `<div style='color:#f87171;'>Error loading quiz results.<br>${e.message}</div>`;
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
            resultsDiv.innerHTML += `<div style='color:#f87171;'>Error loading submissions.<br>${e.message}</div>`;
          }
        }
      });
    };
    closeAdminModal.onclick = () => {
      adminModal.classList.add('hidden');
    };
    // Optional: close modal on background click
    adminModal.onclick = e => {
      if (e.target === adminModal) adminModal.classList.add('hidden');
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
          // Generate a teacher alias
          const teacherAlias = 'teacher_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('digitech_username', teacherAlias);
          localStorage.setItem('digitech_score', '0');
          
          bypassMessage.textContent = '✓ Pretest bypassed. Reloading...';
          bypassMessage.style.color = '#4ade80';
          
          // Reload page so completion check runs with new localStorage values
          setTimeout(() => {
            location.reload();
          }, 500);
        } catch (error) {
          console.error('Error bypassing pretest:', error);
          bypassMessage.textContent = 'Error: Could not bypass pretest.';
          bypassMessage.style.color = '#ef4444';
        }
      };
    }
  }
});