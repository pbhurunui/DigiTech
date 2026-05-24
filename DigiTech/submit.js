function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatWeeklyLoadError(error) {
  const code = error && error.code ? error.code : 'unknown';
  if (code === 'permission-denied') {
    return 'Missing or insufficient permissions. Firestore rules must allow signed-in students to read their own weeklyProgress records.';
  }
  return (error && error.message) ? error.message : `Unknown error (${code})`;
}

async function copyWeeklyCode(code, weekNumber, label = 'Code') {
  try {
    await navigator.clipboard.writeText(code || '');
    const msgDiv = document.getElementById('weekly-save-message');
    if (msgDiv) {
      msgDiv.classList.remove('hidden');
      msgDiv.textContent = `Week ${weekNumber} ${label} copied. Paste it into your editor.`;
      msgDiv.classList.remove('text-yellow-400', 'text-red-400');
      msgDiv.classList.add('text-green-400');
    }
  } catch (e) {
    const msgDiv = document.getElementById('weekly-save-message');
    if (msgDiv) {
      msgDiv.classList.remove('hidden');
      msgDiv.textContent = 'Could not copy automatically. Select the code text and copy manually.';
      msgDiv.classList.remove('text-yellow-400', 'text-green-400');
      msgDiv.classList.add('text-red-400');
    }
  }
}

// Handles student project submission and saves to Firestore
async function handleSubmission(event) {
  event.preventDefault();
  if (typeof ensureFirebaseReady === 'function') {
    await ensureFirebaseReady();
  }
  const authUser = firebase.auth().currentUser;
  const msgDiv = document.getElementById('submission-message');
  if (!authUser || authUser.isAnonymous) {
    msgDiv.classList.remove('hidden');
    msgDiv.textContent = 'Login required: create/login with username + password before submitting.';
    msgDiv.classList.remove('text-yellow-400', 'text-green-400');
    msgDiv.classList.add('text-red-400');
    return;
  }
  const usernameFromAuth = authUser && !authUser.isAnonymous
    ? (authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'student'))
    : null;
  const projectName = document.getElementById('projectName').value.trim();
  const projectLink = document.getElementById('projectLink').value.trim();
  const planningDoc = document.getElementById('planningDoc').value.trim();
  const username = usernameFromAuth || 'Anonymous';
  const submission = {
    username,
    userId: authUser ? authUser.uid : null,
    email: authUser && !authUser.isAnonymous ? authUser.email : null,
    projectName,
    projectLink,
    planningDoc,
    date: new Date().toISOString()
  };
  msgDiv.classList.remove('hidden');
  msgDiv.textContent = 'Uploading...';
  db.collection('submissions').add(submission)
    .then(() => {
      msgDiv.textContent = 'Submission successful!';
      msgDiv.classList.remove('text-yellow-400');
      msgDiv.classList.add('text-green-400');
    })
    .catch(e => {
      msgDiv.textContent = 'Error: ' + e.message;
      msgDiv.classList.remove('text-yellow-400');
      msgDiv.classList.add('text-red-400');
    });
}

async function saveWeeklyProgress(event) {
  event.preventDefault();
  const msgDiv = document.getElementById('weekly-save-message');
  msgDiv.classList.remove('hidden');
  if (typeof ensureFirebaseReady === 'function') {
    await ensureFirebaseReady();
  }
  const authUser = firebase.auth().currentUser;
  if (!authUser || authUser.isAnonymous) {
    msgDiv.textContent = 'Login required: create/login with username + password before saving weekly work.';
    msgDiv.classList.remove('text-yellow-400', 'text-green-400');
    msgDiv.classList.add('text-red-400');
    return;
  }

  const weekNumber = parseInt(document.getElementById('weekNumber').value, 10);
  const programizLink = document.getElementById('programizLink').value.trim();
  const weeklyNotes = document.getElementById('weeklyNotes').value.trim();
  const weeklyHtmlSnapshot = document.getElementById('weeklyHtmlSnapshot').value;
  const weeklyCssSnapshot = document.getElementById('weeklyCssSnapshot').value;
  const weeklyJsSnapshot = document.getElementById('weeklyJsSnapshot').value;

  if (!weekNumber || weekNumber < 1 || weekNumber > 9) {
    msgDiv.textContent = 'Week number must be between 1 and 9.';
    msgDiv.classList.remove('text-yellow-400', 'text-green-400');
    msgDiv.classList.add('text-red-400');
    return;
  }

  const username = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'student');
  const docId = `${authUser.uid}_week_${weekNumber}`;
  const payload = {
    userId: authUser.uid,
    email: authUser.email || null,
    username,
    weekNumber,
    programizLink,
    weeklyNotes,
    weeklyHtmlSnapshot,
    weeklyCssSnapshot,
    weeklyJsSnapshot,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAtIso: new Date().toISOString()
  };

  msgDiv.textContent = 'Saving weekly progress...';
  msgDiv.classList.remove('text-red-400', 'text-green-400');
  msgDiv.classList.add('text-yellow-400');

  try {
    await db.collection('weeklyProgress').doc(docId).set(payload, { merge: true });
    msgDiv.textContent = `Week ${weekNumber} saved successfully.`;
    msgDiv.classList.remove('text-yellow-400', 'text-red-400');
    msgDiv.classList.add('text-green-400');
    await loadWeeklyProgressForStudent();
  } catch (e) {
    msgDiv.textContent = 'Error: ' + e.message;
    msgDiv.classList.remove('text-yellow-400', 'text-green-400');
    msgDiv.classList.add('text-red-400');
  }
}

async function loadWeeklyProgressForStudent() {
  const listDiv = document.getElementById('weekly-progress-list');
  if (!listDiv) return;
  const authUser = firebase.auth().currentUser;
  if (!authUser || authUser.isAnonymous) {
    listDiv.innerHTML = '<div class="text-gray-500">Login to view your weekly saved Programiz links.</div>';
    return;
  }

  listDiv.innerHTML = '<div class="text-gray-400">Loading your weekly saves...</div>';
  try {
    const snap = await db.collection('weeklyProgress').where('userId', '==', authUser.uid).get();
    if (snap.empty) {
      listDiv.innerHTML = '<div class="text-gray-500">No weekly saves yet. Start with Week 1.</div>';
      return;
    }
    const rows = snap.docs.map(doc => doc.data()).sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
    const html = rows.map(row => {
      const week = row.weekNumber || '-';
      const notes = row.weeklyNotes ? row.weeklyNotes : 'No notes';
      const htmlCode = row.weeklyHtmlSnapshot || '';
      const cssCode = row.weeklyCssSnapshot || '';
      const jsCode = row.weeklyJsSnapshot || '';
      const legacyCode = row.weeklyCodeSnapshot || '';
      const encodedHtmlCode = encodeURIComponent(htmlCode);
      const encodedCssCode = encodeURIComponent(cssCode);
      const encodedJsCode = encodeURIComponent(jsCode);
      const encodedLegacyCode = encodeURIComponent(legacyCode);
      const updated = row.updatedAtIso ? new Date(row.updatedAtIso).toLocaleString() : 'Unknown time';
      const hasStructured = htmlCode || cssCode || jsCode;
      return `<div style="padding:0.6rem 0.4rem;border-bottom:1px solid #3f3f46;"><div style="color:#00ff41;font-weight:bold;">Week ${week}</div><div><a href="${escapeHtml(row.programizLink)}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee;text-decoration:underline;word-break:break-all;">${escapeHtml(row.programizLink)}</a></div><div style="color:#a3a3a3;margin-top:0.2rem;">${escapeHtml(notes)}</div>${hasStructured ? `<div style="margin-top:0.55rem;"><div style="display:flex;gap:0.45rem;flex-wrap:wrap;"><button type="button" onclick="copyWeeklyCode(decodeURIComponent('${encodedHtmlCode}'), ${week}, 'HTML')" style="padding:0.35rem 0.7rem;background:#101010;color:#00ff41;border:1px solid #00ff41;border-radius:0.35rem;cursor:pointer;font-family:monospace;">Copy HTML</button><button type="button" onclick="copyWeeklyCode(decodeURIComponent('${encodedCssCode}'), ${week}, 'CSS')" style="padding:0.35rem 0.7rem;background:#101010;color:#00ff41;border:1px solid #00ff41;border-radius:0.35rem;cursor:pointer;font-family:monospace;">Copy CSS</button><button type="button" onclick="copyWeeklyCode(decodeURIComponent('${encodedJsCode}'), ${week}, 'JavaScript')" style="padding:0.35rem 0.7rem;background:#101010;color:#00ff41;border:1px solid #00ff41;border-radius:0.35rem;cursor:pointer;font-family:monospace;">Copy JavaScript</button></div><div style="margin-top:0.45rem;color:#22d3ee;font-weight:bold;">HTML</div><textarea readonly style="width:100%;margin-top:0.2rem;min-height:5rem;background:#0a0a0a;color:#f3f4f6;border:1px solid #3f3f46;border-radius:0.35rem;padding:0.45rem;font-family:monospace;">${escapeHtml(htmlCode)}</textarea><div style="margin-top:0.45rem;color:#22d3ee;font-weight:bold;">CSS</div><textarea readonly style="width:100%;margin-top:0.2rem;min-height:5rem;background:#0a0a0a;color:#f3f4f6;border:1px solid #3f3f46;border-radius:0.35rem;padding:0.45rem;font-family:monospace;">${escapeHtml(cssCode)}</textarea><div style="margin-top:0.45rem;color:#22d3ee;font-weight:bold;">JavaScript</div><textarea readonly style="width:100%;margin-top:0.2rem;min-height:5rem;background:#0a0a0a;color:#f3f4f6;border:1px solid #3f3f46;border-radius:0.35rem;padding:0.45rem;font-family:monospace;">${escapeHtml(jsCode)}</textarea></div>` : `<div style="margin-top:0.45rem;"><button type="button" onclick="copyWeeklyCode(decodeURIComponent('${encodedLegacyCode}'), ${week}, 'Code')" style="padding:0.35rem 0.7rem;background:#101010;color:#00ff41;border:1px solid #00ff41;border-radius:0.35rem;cursor:pointer;font-family:monospace;">Copy Week ${week} Code</button></div><textarea readonly style="width:100%;margin-top:0.45rem;min-height:7rem;background:#0a0a0a;color:#f3f4f6;border:1px solid #3f3f46;border-radius:0.35rem;padding:0.45rem;font-family:monospace;">${escapeHtml(legacyCode)}</textarea>`}<div style="color:#71717a;font-size:0.8rem;margin-top:0.2rem;">Last updated: ${updated}</div></div>`;
    }).join('');
    listDiv.innerHTML = `<div style="border:1px solid #3f3f46;border-radius:0.4rem;">${html}</div>`;
  } catch (e) {
    listDiv.innerHTML = `<div class="text-red-400">Error loading weekly saves: ${formatWeeklyLoadError(e)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(() => {
    loadWeeklyProgressForStudent();
  });
});
