/* Persistent learner state. Single source of truth for progress.
   Everything is namespaced under one localStorage key so export/import is trivial. */
const KEY = 'fl-lab:v1';

const blank = () => ({
  cards:    {},   // cardId -> {ef, interval, due, reps, lapses, last}
  concepts: {},   // conceptId -> {seen, correct, wrong, lastSeen, xp}
  quiz:     {},   // quizId -> {attempts, correct}
  notes:    {},   // conceptId -> free-text self-explanation
  sessions: [],   // {t, kind, correct, total}
  flags:    {},   // arbitrary per-module scratch state
  streak:   { days: 0, last: null },
  theme:    null,   // null = follow the host/OS until the user picks one
});

function load() {
  try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { return blank(); }
}

export const store = {
  state: load(),

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
    this._emit();
  },

  reset() { this.state = blank(); this.save(); },

  /* --- concepts: mastery is a decaying, evidence-weighted estimate --- */
  concept(id) {
    return (this.state.concepts[id] ||= { seen: 0, correct: 0, wrong: 0, lastSeen: 0, xp: 0 });
  },

  /** Record one piece of evidence about a concept. */
  record(conceptId, correct, xp = 1) {
    if (!conceptId) return;
    const c = this.concept(conceptId);
    c.seen++; correct ? c.correct++ : c.wrong++;
    c.lastSeen = Date.now();
    c.xp += correct ? xp : 0;
    this.touchStreak();
    this.save();
  },

  /** 0..1. Laplace-smoothed accuracy, damped by how little evidence exists,
      then faded by time since last practice (forgetting is real). */
  mastery(conceptId) {
    const c = this.state.concepts[conceptId];
    if (!c || !c.seen) return 0;
    const acc = (c.correct + 1) / (c.seen + 2);
    const confidence = Math.min(1, c.seen / 6);
    const days = (Date.now() - c.lastSeen) / 864e5;
    const decay = Math.exp(-days / 21);          // ~3 week half-life-ish
    return Math.max(0, Math.min(1, acc * confidence * (0.45 + 0.55 * decay)));
  },

  totalXp() {
    return Object.values(this.state.concepts).reduce((s, c) => s + (c.xp || 0), 0);
  },

  logSession(kind, correct, total) {
    this.state.sessions.push({ t: Date.now(), kind, correct, total });
    if (this.state.sessions.length > 400) this.state.sessions.shift();
    this.save();
  },

  touchStreak() {
    const today = new Date().toDateString();
    const s = this.state.streak;
    if (s.last === today) return;
    const y = new Date(Date.now() - 864e5).toDateString();
    s.days = (s.last === y) ? s.days + 1 : 1;
    s.last = today;
  },

  /* --- per-module scratch space --- */
  flag(k, v) {
    if (v === undefined) return this.state.flags[k];
    this.state.flags[k] = v; this.save(); return v;
  },

  /* --- change notification --- */
  _subs: new Set(),
  onChange(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
  _emit() { this._subs.forEach(f => { try { f(this.state); } catch (e) { console.error(e); } }); },

  export() { return JSON.stringify(this.state, null, 2); },
  import(json) { this.state = Object.assign(blank(), JSON.parse(json)); this.save(); },
};
