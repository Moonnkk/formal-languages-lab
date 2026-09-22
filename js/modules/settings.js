/* Settings — theme, data portability, and an honest reset.
   Everything lives in this browser's localStorage. No account, no server,
   no telemetry: that is a deliberate design choice, and the page says so. */

export default {
  id: 'settings',
  title: 'Settings',

  mount(root, { store, srs, ui, curriculum, go }) {
    const { h, clear, toast } = ui;
    ui.loadCss('css/modules/core.css');

    const view = h('div');
    root.appendChild(view);
    render();

    function render() {
      clear(view);
      view.appendChild(ui.pageHead('Your data', 'Settings',
        'Everything this app knows about you is a single JSON blob in this browser. Nothing is uploaded anywhere.'));

      /* theme */
      const theme = store.state.theme || document.documentElement.dataset.theme || 'dark';
      view.appendChild(h('div.card',
        h('h3', 'Appearance'),
        h('div.row',
          ...['dark', 'light'].map(t => h('button' + (t === theme ? '.btn-primary' : ''), {
            onclick: () => {
              store.state.theme = t; store.save();
              document.documentElement.dataset.theme = t; render();
            }
          }, t[0].toUpperCase() + t.slice(1))))));

      /* stats */
      const cardCount = Object.keys(store.state.cards).length;
      const seen = curriculum.concepts.filter(c => store.state.concepts[c.id]?.seen).length;
      const sessions = store.state.sessions.length;
      view.appendChild(h('div.card',
        h('h3', 'What is stored'),
        h('ul.small.muted',
          h('li', `${cardCount} flashcard schedules (interval, ease, next due date)`),
          h('li', `${seen} concepts with practice history`),
          h('li', `${sessions} recorded sessions`),
          h('li', `${Object.keys(store.state.notes).length} of your own written notes`),
          h('li', `day streak: ${store.state.streak.days || 0}`))));

      /* export / import */
      const ta = h('textarea', { rows: 6, placeholder: 'Paste a previously exported backup here…' });
      view.appendChild(h('div.card',
        h('h3', 'Backup & move'),
        h('p.small.muted', 'Clearing your browser data wipes your schedule. If you have put weeks into this, export it.'),
        h('div.row',
          h('button', {
            onclick: () => {
              const blob = new Blob([store.export()], { type: 'application/json' });
              const a = h('a', { href: URL.createObjectURL(blob),
                download: 'formal-languages-lab-' + new Date().toISOString().slice(0, 10) + '.json' });
              document.body.appendChild(a); a.click(); a.remove();
              toast('Exported', 'good');
            }
          }, 'Download backup'),
          h('button.btn-ghost', {
            onclick: async () => {
              try { await navigator.clipboard.writeText(store.export()); toast('Copied to clipboard', 'good'); }
              catch { toast('Clipboard blocked — use Download', 'bad'); }
            }
          }, 'Copy to clipboard')),
        h('hr', { style: { border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' } }),
        ta,
        h('div.row', { style: { marginTop: '8px' } },
          h('button', {
            onclick: () => {
              try { store.import(ta.value); toast('Restored', 'good'); render(); }
              catch (e) { toast('That is not a valid backup', 'bad'); }
            }
          }, 'Restore from JSON'))));

      /* targeted resets */
      view.appendChild(h('div.card',
        h('h3', 'Start over'),
        h('p.small.muted', 'Resetting the schedule is sometimes the right call after a long break — but be aware you will lose the evidence of what you already knew.'),
        h('div.row',
          h('button.btn-ghost', {
            onclick: () => { store.state.cards = {}; store.save(); toast('Card schedule cleared'); render(); }
          }, 'Reset card schedule only'),
          h('button.btn-bad', {
            onclick: e => {
              const b = e.target;
              if (b.dataset.armed) { store.reset(); toast('Everything reset'); render(); }
              else { b.dataset.armed = '1'; b.textContent = 'Really erase everything?'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Erase all progress'; } }, 4000); }
            }
          }, 'Erase all progress'))));

      /* credits */
      view.appendChild(h('div.card',
        h('h3', 'About'),
        h('p.small.muted', { html:
          'Course material: <a href="https://github.com/karlstroetmann/Formal-Languages" target="_blank" rel="noopener">karlstroetmann/Formal-Languages</a> — ' +
          'lecture notes and notebooks by Prof. Dr. Karl Stroetmann. This trainer is an independent study aid built on top of that syllabus; ' +
          'it is not a substitute for the notes, and where the two disagree, the notes are right.' }),
        h('p.small.faint', 'No frameworks, no network calls, no analytics. View source — it is all plain ES modules.')));
    }
  },
};
