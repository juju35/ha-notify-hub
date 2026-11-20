"""Layout regression check of the card and the panel: a state update must not rebuild them.

Mounts the card (with a Lit-like <ha-card> stand-in, whose shadow DOM renders in a microtask, like Home Assistant's)
and the panel in Chromium, pushes Home Assistant updates and fails when:
- an update of an entity the card does not use changes its DOM at all;
- an update of the hub's sensor replaces the card's <ha-card>, its header illustration or a kept row (it must patch
  them in place), or changes the card's height, even for a moment (synchronous read right after the update);
- the panel's DOM changes on an unrelated update, or a data refresh drops the focus of a field being edited.
Those rebuilds made the card collapse for a frame and the sections dashboard scroll by itself.

Usage: python scripts/layout_check.py  (needs `pip install playwright` and `playwright install chromium`;
CHROMIUM_PATH=/path/to/chrome to use another browser). Run by the Screenshots workflow.
"""

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

FRONTEND = Path(__file__).resolve().parent.parent / "custom_components/notify_hub/frontend"

STAND_IN = """
customElements.define('ha-card', class extends HTMLElement {
  constructor() { super(); this.updateComplete = new Promise((r) => (this._done = r)); }
  connectedCallback() {
    if (this.shadowRoot) return;
    const s = this.attachShadow({ mode: 'open' });
    queueMicrotask(() => { s.innerHTML = '<slot></slot>'; this._done(true); });
  }
});
"""

CARD_PROBE = """
async () => {
  const frames = (n) => new Promise((r) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : r()); f(n); });
  const now = Date.now();
  const entry = (n, min, title, status) => ({ id: 'e' + n, time: new Date(now - min * 60000).toISOString(), title,
    message: title, priority: 'info', source: '', people: ['Alex'], status });
  const attrs = { notify_hub: true, counts: { sent_today: 3, grouped: 1, held: 0, duplicates: 0, pending: 0 },
    quiet: false, quiet_hours: ['22:00', '07:00'], next_digest: '19:00',
    recent: [entry(1, 2, 'Washing machine', 'delivered'), entry(2, 9, 'Bin day', 'grouped'), entry(3, 30, 'Door', 'delivered')] };
  const id = 'sensor.notify_hub_critical_to_acknowledge';
  let hass = { language: 'en', locale: { language: 'en' }, themes: { darkMode: false }, callService: async () => {},
    states: { [id]: { entity_id: id, state: '0', attributes: attrs }, 'sensor.other': { entity_id: 'sensor.other', state: '0', attributes: {} } } };
  const box = document.createElement('div');
  box.style.width = '400px';
  document.body.appendChild(box);
  const card = document.createElement('notify-hub-card');
  card.setConfig({ type: 'custom:notify-hub-card' });
  card.hass = hass;
  box.appendChild(card);
  await frames(4);
  const root = card.shadowRoot;
  const haCard = root.querySelector('ha-card');
  const scene = root.querySelector('.scene');
  const binDay = () => [...root.querySelectorAll('.row')].find((r) => r.textContent.includes('Bin day'));
  const keep = binDay();
  const h0 = card.getBoundingClientRect().height;
  let mutations = 0;
  const mo = new MutationObserver((list) => (mutations += list.length));
  mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
  const out = { unrelated: 0, heights: [], replaced: [] };
  for (let i = 0; i < 20; i++) {
    const states = { ...hass.states };
    if (i % 2 === 0) {
      states['sensor.other'] = { ...states['sensor.other'], state: String(i) };
      hass = { ...hass, states };
      card.hass = hass;
      await frames(2);
      out.unrelated += mutations + mo.takeRecords().length;
    } else {
      const a = states[id].attributes;
      states[id] = { ...states[id], attributes: { ...a, counts: { ...a.counts, sent_today: 3 + i },
        recent: [entry(100 + i, 0, 'New ' + i, 'delivered'), ...a.recent.slice(1)] } };
      hass = { ...hass, states };
      card.hass = hass;
      out.heights.push(card.getBoundingClientRect().height);
      await frames(2);
      out.heights.push(card.getBoundingClientRect().height);
      mo.takeRecords();
    }
    mutations = 0;
  }
  mo.disconnect();
  if (root.querySelector('ha-card') !== haCard) out.replaced.push('ha-card');
  if (root.querySelector('.scene') !== scene) out.replaced.push('header illustration');
  if (binDay() !== keep) out.replaced.push('kept notification row');
  out.h0 = h0;
  return out;
}
"""

PANEL_PROBE = """
async () => {
  const frames = (n) => new Promise((r) => { const f = (k) => (k ? requestAnimationFrame(() => f(k - 1)) : r()); f(n); });
  const data = { version: 'x', counts: { sent_today: 1, grouped: 0, held: 0, duplicates: 0, pending: 0 }, quiet: false,
    quiet_hours: ['22:00', '07:00'], next_digest: '19:00', recent: [], people: [], services: ['notify.sms'],
    options: { quiet_enabled: true, quiet_start: '22:00', quiet_end: '07:00', dedup_minutes: 10, digest_times: ['08:00'],
      escalation_minutes: [5, 10], away_mode: false, retention_days: 7 } };
  const id = 'sensor.notify_hub_critical_to_acknowledge';
  let hass = { language: 'en', locale: { language: 'en' }, themes: { darkMode: false }, callWS: async () => structuredClone(data),
    states: { [id]: { entity_id: id, state: '0', attributes: { notify_hub: true }, last_updated: 'a' }, 'sensor.other': { state: '0', attributes: {} } } };
  history.replaceState(null, '', '/notify-hub?tab=rules');
  const el = document.createElement('notify-hub-panel');
  el.hass = hass;
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 50));
  await frames(2);
  let mutations = 0;
  const mo = new MutationObserver((list) => (mutations += list.length));
  mo.observe(el.shadowRoot, { subtree: true, childList: true, attributes: true, characterData: true });
  for (let i = 0; i < 10; i++) {
    hass = { ...hass, states: { ...hass.states, 'sensor.other': { state: String(i), attributes: {} } } };
    el.hass = hass;
    await frames(1);
  }
  const unrelated = mutations + mo.takeRecords().length;
  mo.disconnect();
  // A field being edited, then the hub's sensor changes: the data is fetched again, the field keeps its focus.
  const input = el.shadowRoot.querySelector('input[data-key="dedup_minutes"]');
  input.focus();
  input.value = '15';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  hass = { ...hass, states: { ...hass.states, [id]: { ...hass.states[id], last_updated: 'b' } } };
  el.hass = hass;
  await new Promise((r) => setTimeout(r, 50));
  await frames(2);
  const focusKept = el.shadowRoot.activeElement === input && input.isConnected;
  const saveEnabled = !el.shadowRoot.querySelector('[data-act="save"]').disabled;
  return { unrelated, focusKept, saveEnabled };
}
"""


def main() -> int:
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page()
        page.on("pageerror", lambda err: errors.append(f"page error: {err}"))
        # A real origin (not about:blank), so that the panel can keep its tab in the address.
        html = "<!doctype html><body style='margin:0;padding:16px;font-family:sans-serif'></body>"
        page.route("http://ha.test/**", lambda route: route.fulfill(content_type="text/html", body=html))
        page.goto("http://ha.test/notify-hub")
        page.add_script_tag(content=STAND_IN)
        page.add_script_tag(content=(FRONTEND / "notify-hub-card.js").read_text(encoding="utf-8"))
        page.add_script_tag(content=(FRONTEND / "notify-hub-panel.js").read_text(encoding="utf-8"))
        card = page.evaluate(CARD_PROBE)
        panel = page.evaluate(PANEL_PROBE)
        browser.close()
    print(json.dumps({"card": card, "panel": panel}))
    if card["unrelated"]:
        errors.append(f"card: {card['unrelated']} DOM mutations on updates of an entity it does not use")
    if any(abs(h - card["h0"]) > 0.5 for h in card["heights"]):
        errors.append(f"card: height moved on updates ({card['h0']} → {sorted(set(card['heights']))})")
    if card["replaced"]:
        errors.append(f"card: rebuilt instead of patched: {', '.join(card['replaced'])}")
    if panel["unrelated"]:
        errors.append(f"panel: {panel['unrelated']} DOM mutations on updates of an entity it does not use")
    if not panel["focusKept"] or not panel["saveEnabled"]:
        errors.append("panel: a data refresh dropped the field being edited")
    for error in errors:
        print(f"::error::{error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
