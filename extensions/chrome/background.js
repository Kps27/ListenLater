const API = 'http://127.0.0.1:3333';
const TOKEN = 'dev-guest-token';

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const root = document.querySelector('article') || document.querySelector('main') || document.body;
      return {
        url: location.href,
        title: document.title,
        text: (root.innerText || '').trim().slice(0, 500000),
      };
    },
  });
  if (!result?.text || result.text.split(/\s+/).length < 30) {
    console.warn('Listen Later: not enough text on page');
    return;
  }
  const res = await fetch(`${API}/v1/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'extension',
      client_text: result,
    }),
  });
  if (!res.ok) console.error('Listen Later save failed', await res.text());
});
