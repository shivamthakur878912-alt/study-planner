// ============================================================
// Study Planner — Shared Data Layer (localStorage)
// ============================================================

const STORAGE_KEY = 'studyPlannerData';

// ---------- Theme Application ----------
function applyTheme() {
  var settings = loadData();
  var theme = (settings.settings && settings.settings.theme) || 'light';
  var html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'system') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  } else {
    html.classList.remove('dark');
  }
}

// Apply theme immediately on script load
applyTheme();

// Listen for system theme changes when using system mode
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    applyTheme();
  });
}

// ---------- Default data structure ----------
function defaultData() {
  return {
    subjects: [],
    sessions: [],
    goals: [],
    settings: {
      name: '',
      email: '',
      major: '',
      academicYear: 'Sophomore (Year 2)',
      bio: '',
      dailyTarget: 4,
      weeklyTarget: 20,
      pomodoroDuration: 25,
      notifications: true,
      theme: 'light'
    }
  };
}

// ---------- Core CRUD helpers ----------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // Merge with defaults in case new fields were added
    const d = defaultData();
    return {
      subjects: parsed.subjects || d.subjects,
      sessions: parsed.sessions || d.sessions,
      goals: parsed.goals || d.goals,
      settings: { ...d.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return defaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSubjects() { return loadData().subjects; }
function getSessions() { return loadData().sessions; }
function getGoals() { return loadData().goals; }
function getSettings() { return loadData().settings; }

// ---------- Subject helpers ----------
function addSubject(subject) {
  const data = loadData();
  subject.id = generateId();
  subject.completedTopics = 0;
  subject.createdAt = new Date().toISOString();
  data.subjects.push(subject);
  saveData(data);
  return subject;
}

function updateSubject(id, updates) {
  const data = loadData();
  const idx = data.subjects.findIndex(s => s.id === id);
  if (idx !== -1) {
    data.subjects[idx] = { ...data.subjects[idx], ...updates };
    saveData(data);
    return data.subjects[idx];
  }
  return null;
}

function deleteSubject(id) {
  const data = loadData();
  data.subjects = data.subjects.filter(s => s.id !== id);
  saveData(data);
}

// ---------- Session helpers ----------
function addSession(session) {
  const data = loadData();
  session.id = generateId();
  session.status = session.status || 'pending';
  session.createdAt = new Date().toISOString();
  data.sessions.push(session);
  saveData(data);
  return session;
}

function updateSession(id, updates) {
  const data = loadData();
  const idx = data.sessions.findIndex(s => s.id === id);
  if (idx !== -1) {
    data.sessions[idx] = { ...data.sessions[idx], ...updates };
    saveData(data);
    return data.sessions[idx];
  }
  return null;
}

function deleteSession(id) {
  const data = loadData();
  data.sessions = data.sessions.filter(s => s.id !== id);
  saveData(data);
}

// ---------- Goal helpers ----------
function addGoal(goal) {
  const data = loadData();
  goal.id = generateId();
  goal.current = goal.current || 0;
  goal.status = 'active';
  goal.createdAt = new Date().toISOString();
  data.goals.push(goal);
  saveData(data);
  return goal;
}

function updateGoal(id, updates) {
  const data = loadData();
  const idx = data.goals.findIndex(g => g.id === id);
  if (idx !== -1) {
    data.goals[idx] = { ...data.goals[idx], ...updates };
    // Auto-complete if current >= target
    if (data.goals[idx].current >= data.goals[idx].target && data.goals[idx].status === 'active') {
      data.goals[idx].status = 'completed';
    }
    saveData(data);
    return data.goals[idx];
  }
  return null;
}

function deleteGoal(id) {
  const data = loadData();
  data.goals = data.goals.filter(g => g.id !== id);
  saveData(data);
}

// ---------- Settings helpers ----------
function saveSettings(updates) {
  const data = loadData();
  data.settings = { ...data.settings, ...updates };
  saveData(data);
  return data.settings;
}

// ---------- Analytics / Calculation helpers ----------

/** Get sessions for a specific date (YYYY-MM-DD) */
function getSessionsForDate(dateStr) {
  return getSessions().filter(s => s.date === dateStr);
}

/** Get today's date string */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Calculate total study hours from completed sessions */
function getTotalStudyHours() {
  return getSessions()
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
}

/** Calculate study hours for today */
function getTodayStudyHours() {
  const today = todayStr();
  return getSessions()
    .filter(s => s.status === 'completed' && s.date === today)
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
}

/** Get completed session count */
function getCompletedSessionCount() {
  return getSessions().filter(s => s.status === 'completed').length;
}

/** Get pending session count */
function getPendingSessionCount() {
  return getSessions().filter(s => s.status !== 'completed').length;
}

/** Calculate weekly study hours (last 7 days) */
function getWeeklyStudyHours() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  return getSessions()
    .filter(s => s.status === 'completed' && s.date >= weekAgoStr)
    .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
}

/** Get daily hours for last 7 days (returns array of {day, hours, dateStr}) */
function getLast7DaysHours() {
  const result = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const hours = getSessions()
      .filter(s => s.status === 'completed' && s.date === dateStr)
      .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
    result.push({ day: dayNames[d.getDay()], hours, dateStr });
  }
  return result;
}

/** Calculate study streak (consecutive days with at least one completed session) */
function getStudyStreak() {
  let streak = 0;
  const d = new Date();
  // Check from today backwards
  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const hasSession = getSessions().some(s => s.status === 'completed' && s.date === dateStr);
    if (hasSession) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Get today's greeting based on time of day */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Format duration in hours to "Xh Ym" */
function formatHours(h) {
  if (h === 0) return '0h 0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return mins + 'm';
  if (mins === 0) return hrs + 'h';
  return hrs + 'h ' + mins + 'm';
}

/** Format a date string to readable format */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Get today's date in YYYY-MM-DD for input[type=date] */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Get current time HH:MM for input[type=time] */
function currentTimeStr() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

/** Subject progress: count completed sessions for a subject vs total topics */
function getSubjectProgress(subjectName) {
  const subject = getSubjects().find(s => s.name === subjectName);
  if (!subject) return { completed: 0, total: 0, percent: 0 };
  const completed = getSessions().filter(
    s => s.subject === subjectName && s.status === 'completed'
  ).length;
  const total = parseInt(subject.totalTopics) || 0;
  return {
    completed: subject.completedTopics || 0,
    total,
    percent: total > 0 ? Math.round(((subject.completedTopics || 0) / total) * 100) : 0
  };
}

/** Get upcoming sessions (pending, sorted by date+time) */
function getUpcomingSessions() {
  return getSessions()
    .filter(s => s.status !== 'completed')
    .sort((a, b) => {
      if (a.date === b.date) return (a.time || '').localeCompare(b.time || '');
      return (a.date || '').localeCompare(b.date || '');
    });
}

/** Get today's sessions */
function getTodaySessions() {
  return getSessions()
    .filter(s => s.date === todayStr())
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/** Search across subjects, sessions, goals */
function searchAll(query) {
  if (!query || query.trim().length < 2) return { subjects: [], sessions: [], goals: [] };
  const q = query.toLowerCase();
  return {
    subjects: getSubjects().filter(s =>
      s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)
    ),
    sessions: getSessions().filter(s =>
      s.subject.toLowerCase().includes(q) || (s.topic || '').toLowerCase().includes(q)
    ),
    goals: getGoals().filter(g =>
      g.title.toLowerCase().includes(q)
    )
  };
}

/** Get subject color based on index */
function getSubjectColor(index) {
  const colors = [
    { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary', badge: 'bg-primary-container text-on-primary-container' },
    { bg: 'bg-secondary/10', text: 'text-secondary', bar: 'bg-secondary', badge: 'bg-secondary-container text-on-secondary-container' },
    { bg: 'bg-tertiary/10', text: 'text-tertiary', bar: 'bg-tertiary', badge: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    { bg: 'bg-primary-container/20', text: 'text-primary-container', bar: 'bg-primary-container', badge: 'bg-primary-fixed text-on-primary-fixed' },
    { bg: 'bg-secondary-container/20', text: 'text-secondary-container', bar: 'bg-secondary-container', badge: 'bg-secondary-fixed text-on-secondary-fixed' },
  ];
  return colors[index % colors.length];
}

/** Get priority badge class */
function getPriorityClass(priority) {
  if (priority === 'High') return 'bg-error-container text-on-error-container';
  if (priority === 'Low') return 'bg-surface-container-high text-on-surface';
  return 'bg-secondary-fixed text-on-secondary-fixed';
}

/** Empty state HTML */
function emptyState(icon, title, subtitle) {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-space-md">
        <span class="material-symbols-outlined text-[32px] text-on-surface-variant">${icon}</span>
      </div>
      <h3 class="font-headline-sm text-on-surface mb-space-xs">${title}</h3>
      <p class="font-body-sm text-on-surface-variant max-w-sm">${subtitle}</p>
    </div>
  `;
}
