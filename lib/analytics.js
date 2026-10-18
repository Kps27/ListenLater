/** MVP analytics — counts only, never titles, URLs, or article text (handoff §10). */

const MAX = 200;

export function createAnalytics(storage) {
  let events = storage.get('ll-analytics', []);

  function track(name, props = {}) {
    const row = { name, props, at: new Date().toISOString() };
    events.push(row);
    if (events.length > MAX) events = events.slice(-MAX);
    storage.set('ll-analytics', events);
    if (storage.get('ll-analytics-debug', false)) {
      console.info('[listen-later analytics]', name, props);
    }
  }

  return { track, snapshot: () => events.slice() };
}
