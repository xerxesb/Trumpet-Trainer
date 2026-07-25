// Sophie's Trumpet Practice Tracker — app.js
// Handles timer, manual session entry, localStorage persistence, and stats.

'use strict';

// ── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'trumpet_sessions';
const GOAL_KEY    = 'trumpet_weekly_goal'; // minutes per week

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function loadWeeklyGoal() {
  return parseInt(localStorage.getItem(GOAL_KEY), 10) || 60; // default 60 min/week
}

function saveWeeklyGoal(minutes) {
  localStorage.setItem(GOAL_KEY, String(minutes));
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function formatTimerDisplay(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Timer state ──────────────────────────────────────────────────────────────

let timerInterval = null;
let elapsedSeconds = 0;
let timerRunning = false;

// ── DOM references ───────────────────────────────────────────────────────────

const timerDisplay   = document.getElementById('timer-display');
const btnStart       = document.getElementById('btn-start');
const btnStop        = document.getElementById('btn-stop');
const btnReset       = document.getElementById('btn-reset');
const btnSave        = document.getElementById('btn-save');
const timerNoteInput = document.getElementById('timer-note');

const addDate        = document.getElementById('add-date');
const addMinutes     = document.getElementById('add-minutes');
const addNote        = document.getElementById('add-note');
const btnAddSession  = document.getElementById('btn-add-session');

const statTotal      = document.getElementById('stat-total');
const statSessions   = document.getElementById('stat-sessions');
const statAvg        = document.getElementById('stat-avg');
const statStreak     = document.getElementById('stat-streak');
const progressFill   = document.getElementById('progress-fill');
const progressPct    = document.getElementById('progress-pct');
const goalMessage    = document.getElementById('goal-message');
const goalInput      = document.getElementById('goal-input');

const historyList    = document.getElementById('history-list');
const toast          = document.getElementById('toast');

// ── Toast ────────────────────────────────────────────────────────────────────

let toastTimeout = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Timer logic ───────────────────────────────────────────────────────────────

function updateTimerDisplay() {
  timerDisplay.textContent = formatTimerDisplay(elapsedSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  btnStart.disabled = true;
  btnStop.disabled  = false;
  btnSave.disabled  = true;

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  timerRunning = false;
  clearInterval(timerInterval);
  btnStart.disabled = false;
  btnStop.disabled  = true;
  btnSave.disabled  = elapsedSeconds === 0;
}

function resetTimer() {
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  btnSave.disabled  = true;
  btnStart.disabled = false;
  btnStop.disabled  = true;
  timerNoteInput.value = '';
}

function saveTimerSession() {
  if (elapsedSeconds === 0) return;
  const session = {
    id:        Date.now(),
    date:      new Date().toISOString(),
    seconds:   elapsedSeconds,
    note:      timerNoteInput.value.trim(),
    source:    'timer',
  };
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  showToast('🎺 Session saved! Great practice, Sophie! 🌟');
  resetTimer();
  renderAll();
}

// ── Add Manual Session ────────────────────────────────────────────────────────

function addManualSession() {
  const dateVal    = addDate.value;
  const minutesVal = parseInt(addMinutes.value, 10);
  const noteVal    = addNote.value.trim();

  if (!dateVal) { showToast('⚠️ Please pick a date!'); return; }
  if (!minutesVal || minutesVal <= 0) { showToast('⚠️ Enter a valid duration (minutes)!'); return; }
  if (minutesVal > 600) { showToast('⚠️ Duration seems too long — please double-check!'); return; }

  const session = {
    id:      Date.now(),
    date:    new Date(dateVal + 'T12:00:00').toISOString(),
    seconds: minutesVal * 60,
    note:    noteVal,
    source:  'manual',
  };
  const sessions = loadSessions();
  sessions.unshift(session);
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveSessions(sessions);
  showToast('✨ Session added! Keep it up! 🎵');
  addDate.value    = '';
  addMinutes.value = '';
  addNote.value    = '';
  renderAll();
}

// ── Delete session ────────────────────────────────────────────────────────────

function deleteSession(id) {
  const sessions = loadSessions().filter(s => s.id !== id);
  saveSessions(sessions);
  renderAll();
  showToast('🗑️ Session removed.');
}

// ── Stats calculations ────────────────────────────────────────────────────────

function calcStats(sessions) {
  const totalSeconds  = sessions.reduce((sum, s) => sum + s.seconds, 0);
  const count         = sessions.length;
  const avgSeconds    = count > 0 ? Math.round(totalSeconds / count) : 0;

  // Streak: consecutive days with at least one session ending today or yesterday
  const daySet = new Set(sessions.map(s => s.date.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }

  // Weekly minutes (current week Sun–Sat)
  const weekStart    = startOfWeek(new Date());
  const weekEnd      = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekSeconds  = sessions
    .filter(s => { const d = new Date(s.date); return d >= weekStart && d < weekEnd; })
    .reduce((sum, s) => sum + s.seconds, 0);

  return { totalSeconds, count, avgSeconds, streak, weekSeconds };
}

// ── Encouraging messages ──────────────────────────────────────────────────────

const GOAL_MESSAGES = [
  { pct: 0,   msg: "Let's get started! 🎺 You've got this, Sophie!" },
  { pct: 25,  msg: "Good start! 🌸 Keep going!" },
  { pct: 50,  msg: "Halfway there! 🌟 Amazing work!" },
  { pct: 75,  msg: "Almost there! 🎶 So impressive!" },
  { pct: 100, msg: "Weekly goal smashed! 🏆🎉 Superstar Sophie!" },
];

function getGoalMessage(pct) {
  const entry = [...GOAL_MESSAGES].reverse().find(e => pct >= e.pct);
  return entry ? entry.msg : GOAL_MESSAGES[0].msg;
}

// ── Render ────────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['🎺', '🎵', '🌟', '⭐', '🎶', '🌺', '🦋', '✨'];

function renderStats(sessions) {
  const { totalSeconds, count, avgSeconds, streak, weekSeconds } = calcStats(sessions);
  const weeklyGoalSecs = loadWeeklyGoal() * 60;

  statTotal.textContent    = count > 0 ? formatDuration(totalSeconds) : '—';
  statSessions.textContent = count;
  statAvg.textContent      = count > 0 ? formatDuration(avgSeconds) : '—';
  statStreak.textContent   = streak > 0 ? `${streak} 🔥` : '—';

  const pct = weeklyGoalSecs > 0 ? Math.min(100, Math.round((weekSeconds / weeklyGoalSecs) * 100)) : 0;
  progressFill.style.width = `${pct}%`;
  progressPct.textContent  = `${pct}%`;
  goalMessage.textContent  = getGoalMessage(pct);
  goalInput.value          = loadWeeklyGoal();
}

function renderHistory(sessions) {
  historyList.innerHTML = '';
  if (sessions.length === 0) {
    historyList.innerHTML = '<li class="empty-state">No sessions yet — start practicing! 🎺</li>';
    return;
  }
  sessions.forEach((session, idx) => {
    const li    = document.createElement('li');
    li.className = 'history-item';

    const emoji = EMOJI_OPTIONS[idx % EMOJI_OPTIONS.length];

    li.innerHTML = `
      <span class="history-icon">${emoji}</span>
      <div class="history-info">
        <div class="history-date">${formatDate(session.date)}</div>
        <div class="history-duration">${formatDuration(session.seconds)}</div>
        ${session.note ? `<div class="history-note">💬 ${escapeHtml(session.note)}</div>` : ''}
      </div>
      <span class="history-badge">${session.source === 'timer' ? '⏱ Live' : '✏️ Added'}</span>
      <button class="btn-delete" aria-label="Delete session" data-id="${session.id}">🗑️</button>
    `;

    historyList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAll() {
  const sessions = loadSessions();
  renderStats(sessions);
  renderHistory(sessions);
}

// ── Event listeners ───────────────────────────────────────────────────────────

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);
btnSave.addEventListener('click',  saveTimerSession);

btnAddSession.addEventListener('click', addManualSession);

// Delete via event delegation
historyList.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (btn) {
    const id = parseInt(btn.dataset.id, 10);
    deleteSession(id);
  }
});

// Weekly goal change
goalInput.addEventListener('change', () => {
  const val = parseInt(goalInput.value, 10);
  if (val > 0 && val <= 600) {
    saveWeeklyGoal(val);
    renderAll();
  }
});

// Allow pressing Enter in the manual form
addMinutes.addEventListener('keydown', e => { if (e.key === 'Enter') addManualSession(); });
addNote.addEventListener('keydown',    e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addManualSession(); } });

// ── Init ──────────────────────────────────────────────────────────────────────

updateTimerDisplay();
renderAll();
