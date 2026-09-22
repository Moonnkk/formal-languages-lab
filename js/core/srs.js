/* SM-2 spaced repetition.
   Humans forget on an exponential curve; the only cheap counter-measure is
   testing yourself just before you would have forgotten. That is all this is. */
import { store } from './store.js';

const DAY = 864e5;
export const GRADES = [
  { g: 0, label: 'Blank',  hint: 'No idea',                 cls: 'btn-bad'  },
  { g: 3, label: 'Hard',   hint: 'Got it, but it hurt',     cls: ''         },
  { g: 4, label: 'Good',   hint: 'Recalled with effort',    cls: ''         },
  { g: 5, label: 'Easy',   hint: 'Instant',                 cls: 'btn-good' },
];

export const srs = {
  card(id) {
    return (store.state.cards[id] ||= { ef: 2.5, interval: 0, due: 0, reps: 0, lapses: 0, last: 0 });
  },

  isDue(id, now = Date.now()) { const c = store.state.cards[id]; return !c || c.due <= now; },

  /** Cards to study now: due ones first (most overdue first), then new ones. */
  queue(ids, now = Date.now(), maxNew = 12) {
    const seen = [], fresh = [];
    for (const id of ids) {
      const c = store.state.cards[id];
      if (!c || !c.reps) fresh.push(id);
      else if (c.due <= now) seen.push(id);
    }
    seen.sort((a, b) => store.state.cards[a].due - store.state.cards[b].due);
    return [...seen, ...fresh.slice(0, maxNew)];
  },

  /** grade 0..5; <3 is a lapse. Returns the updated card. */
  review(id, grade) {
    const c = this.card(id);
    if (grade < 3) {
      c.lapses++; c.reps = 0; c.interval = 0;
      c.ef = Math.max(1.3, c.ef - 0.2);
      c.due = Date.now() + 6e4;            // ~1 min: see it again this session
    } else {
      c.reps++;
      c.ef = Math.max(1.3, c.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
      c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 6 : Math.round(c.interval * c.ef);
      // a little jitter so decks don't clump into one brutal day
      const jitter = 1 + (Math.random() - 0.5) * 0.15;
      c.due = Date.now() + c.interval * DAY * jitter;
    }
    c.last = Date.now();
    store.save();
    return c;
  },

  stats(ids, now = Date.now()) {
    let neu = 0, due = 0, learning = 0, mature = 0;
    for (const id of ids) {
      const c = store.state.cards[id];
      if (!c || !c.reps) { neu++; continue; }
      if (c.due <= now) due++;
      c.interval >= 21 ? mature++ : learning++;
    }
    return { neu, due, learning, mature, total: ids.length };
  },

  humanDue(id) {
    const c = store.state.cards[id];
    if (!c || !c.reps) return 'new';
    const d = Math.round((c.due - Date.now()) / DAY);
    return d <= 0 ? 'now' : d === 1 ? 'tomorrow' : `in ${d}d`;
  },
};
