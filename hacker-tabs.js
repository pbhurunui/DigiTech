// Hacker-style tab navigation and section switching
function showSection(sectionId) {
  // Hide all main sections
  const sections = [
    'roadmap',
    'challenge',
    'checklist',
    'deliverables',
    'submission',
    'rubric'
  ];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  // Show the selected section
  const showEl = document.getElementById(sectionId);
  if (showEl) showEl.classList.remove('hidden');

  // Update nav-link active state and add hacker neon effect
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    link.style.color = '#22d3ee';
    link.style.textShadow = '';
    link.style.borderBottomColor = 'transparent';
  });
  // Find the nav-link for this section
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
      link.classList.add('active');
      link.style.color = '#00ff41';
      link.style.textShadow = '0 0 8px #00ff41, 0 0 2px #00ff41';
      link.style.borderBottomColor = '#00ff41';
    }
  });
}

// Set default section on load
window.addEventListener('DOMContentLoaded', () => {
  showSection('roadmap');
});
