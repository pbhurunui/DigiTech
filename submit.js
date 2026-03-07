// Handles student project submission and saves to Firestore
function handleSubmission(event) {
  event.preventDefault();
  const projectName = document.getElementById('projectName').value.trim();
  const projectLink = document.getElementById('projectLink').value.trim();
  const planningDoc = document.getElementById('planningDoc').value.trim();
  const username = localStorage.getItem('digitech_username') || 'Anonymous';
  const submission = {
    username,
    projectName,
    projectLink,
    planningDoc,
    date: new Date().toISOString()
  };
  const msgDiv = document.getElementById('submission-message');
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
