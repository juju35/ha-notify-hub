/**
 * notify-hub-card — the notifications of the house handled by Notify Hub: an illustrated header (a bell ringing,
 * letters flying, night with the dark theme) with the state of the hub, the counts (sent today, waiting for the
 * digest, held by the quiet hours, critical to acknowledge) and the latest notifications, a critical one with its
 * Acknowledge button, each with its source (the integration's logo, or the icon and color set for it in the panel).
 * Reads the hub's "Critical to acknowledge" sensor (its `notify_hub` attribute).
 * Served and added to the dashboard resources by the integration.
 * https://github.com/juju35/ha-notify-hub
 */
import { pickerDefine } from "./card-picker.js";
import { NH_CARD_I18N } from "./i18n/nh-card-i18n.js";

export var NOTIFY_HUB_CARD_VERSION = '0.7.3';


export var NH_DEFAULTS = { rows: 4, illustration_theme: 'auto' };
// The tone of each status: the dot, the line under the message and the header.
export var NH_TONES = {
  delivered: 'ok',
  acknowledged: 'ok',
  pending: 'bad',
  held: 'idle',
  grouped: 'warn',
  duplicate: 'info',
  nobody: 'bad',
  failed: 'bad',
  muted: 'idle',
};
export var NH_ICONS = {
  bell: 'M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  bad: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  warn: 'M19,15H15A3,3 0 0,1 12,18A3,3 0 0,1 9,15H5V5H19M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z',
  idle: 'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z',
  info: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
};

export var nhEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export var nhIcon = (name, cls) => `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${NH_ICONS[name] || ''}"/></svg>`;
export var nhLang = (hass, config) => {
  var raw = String(config?.language || hass?.locale?.language || hass?.language || 'en');
  if (NH_CARD_I18N[raw]) return raw;
  var base = raw.split('-')[0];
  return NH_CARD_I18N[base] ? base : 'en';
};
// A notification's source: its icon (mdi:) set in the panel, else its integration's brand logo, tinted with its color.
export var nhSource = (look, dark) => {
  if (!look?.name) return '';
  var style = look.color ? ` style="--sc:${nhEsc(look.color)}"` : '';
  var mark = look.icon
    ? `<ha-icon icon="${nhEsc(look.icon)}"></ha-icon>`
    : look.domain
      ? `<img src="https://brands.home-assistant.io/_/${encodeURIComponent(look.domain)}/${dark ? 'dark_' : ''}icon.png" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : '';
  return `<span class="src${look.color ? ' tinted' : ''}"${style}>${mark}<span>${nhEsc(look.name)}</span></span>`;
};
export var nhFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));
// The hub's sensor: the one carrying the `notify_hub` attribute. The last one found is checked first, so the states
// are only scanned again when it is gone (a scan of every state on each update cost a lot on large installs).
export var nhFound = '';
export var nhFind = (hass) => {
  var states = hass?.states || {};
  if (nhFound && states[nhFound]?.attributes?.notify_hub) return nhFound;
  nhFound = Object.keys(states).find((id) => id.startsWith('sensor.') && states[id]?.attributes?.notify_hub) || '';
  return nhFound;
};

// In-place patching of the card's DOM (same approach as ha-flight-board-card): kept nodes keep their size, their
// running animations and their focus, so a state update never collapses the card for a frame (which made the
// sections grid reflow and the page scroll by itself). Children with a `data-key` are matched by key.
export var nhPatchAttrs = (cur, next) => {
  for (var { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (var { name: n, value } of next.attributes) if (cur.getAttribute(n) !== value) cur.setAttribute(n, value);
};
export var nhKey = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
export var nhPatchChildren = (cur, next) => {
  var old = [...cur.childNodes];
  var fresh = [...next.childNodes];
  var byKey = new Map();
  for (var o of old) {
    var k = nhKey(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  var used = new Set();
  fresh.forEach((n, i) => {
    var key = nhKey(n);
    var match = key !== null ? byKey.get(key) : old[i];
    if (!match || match.nodeType !== n.nodeType || match.nodeName !== n.nodeName || used.has(match) || (key === null && nhKey(match) !== null)) match = null;
    var ref = cur.childNodes[i] ?? null;
    if (!match) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(match);
    if (match !== ref) cur.insertBefore(match, ref);
    if (n.nodeType === 1) {
      nhPatchAttrs(match, n);
      nhPatchChildren(match, n);
    } else if (match.nodeValue !== n.nodeValue) match.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
export var nhMorph = (root, html) => {
  var tpl = document.createElement('template');
  tpl.innerHTML = html;
  nhPatchChildren(root, tpl.content);
};

export class NotifyHubCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('notify-hub-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = Object.assign({}, NH_DEFAULTS, config || {});
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    var id = this._config?.entity || nhFind(hass);
    var st = id ? hass.states[id] : undefined;
    // Only the hub's sensor, the theme and the language matter: any other entity changing leaves the card untouched.
    // The sensor object is compared first (Home Assistant keeps it when it does not change), then its content.
    if (st === this._st && hass.themes?.darkMode === this._dark && hass.locale?.language === this._lang) return;
    this._st = st;
    this._dark = hass.themes?.darkMode;
    this._lang = hass.locale?.language;
    var sig = JSON.stringify([st?.state, st?.attributes, this._dark, this._lang, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  connectedCallback() {
    // The "3 min" ages move on by themselves: patched in place once a minute (text only, nothing rebuilt).
    clearInterval(this._tick);
    this._tick = setInterval(() => this._render(), 60000);
    if (this._hass) this._render();
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
  }

  getCardSize() {
    return 3 + Math.min(Number(this._config?.rows) || 4, 8);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _t() {
    var lang = nhLang(this._hass, this._config);
    return Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[lang]);
  }

  _night() {
    var theme = this._config.illustration_theme;
    if (theme === 'day') return false;
    if (theme === 'night') return true;
    return !!this._hass?.themes?.darkMode;
  }

  _ago(iso, t) {
    var minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (!Number.isFinite(minutes) || minutes < 1) return t.ago_now;
    if (minutes < 60) return nhFill(t.ago_min, { n: minutes });
    var lang = nhLang(this._hass, this._config);
    if (minutes < 24 * 60) return nhFill(t.ago_h, { n: Math.round(minutes / 60) });
    try {
      return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
    } catch (_err) {
      return new Date(iso).toLocaleDateString();
    }
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
      // Built once: later updates patch the nodes inside <ha-card> (nhMorph), the card and its styles are kept.
      this.shadowRoot.innerHTML = `<style>${NotifyHubCard.styles()}</style><ha-card></ha-card>`;
    }
    var t = this._t();
    var id = this._config.entity || nhFind(this._hass);
    var st = id ? this._hass.states[id] : undefined;
    var a = st?.attributes;
    var body;
    var tone = 'ok';
    var subtitle = '';
    var pill = '';
    if (!a?.notify_hub) {
      tone = 'idle';
      body = `<div class="empty">${nhEsc(t.not_found)}</div>`;
    } else {
      var counts = a.counts || {};
      var pending = Number(counts.pending) || 0;
      tone = pending ? 'bad' : a.quiet ? 'idle' : 'ok';
      subtitle = a.quiet && a.quiet_hours ? nhFill(t.quiet_until, { t: a.quiet_hours[1] }) : counts.grouped && a.next_digest ? nhFill(t.next_digest, { t: a.next_digest }) : nhFill(t.sent, {}) + ` · ${counts.sent_today || 0}`;
      pill = pending ? nhFill(t.critical_n, { n: pending }) : t.all_quiet;
      var tiles = [
        // Every tile has its state badge: the tone of its count, grey (idle) at zero.
        ['sent', counts.sent_today, counts.sent_today ? 'ok' : 'idle'],
        ['grouped', counts.grouped, counts.grouped ? 'warn' : 'idle'],
        ['held', counts.held, 'idle'],
        ['pending', pending, pending ? 'bad' : 'idle'],
      ]
        .map(([k, v, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}" data-key="${k}"><span class="n">${nhEsc(v ?? 0)}</span><span class="k">${nhEsc(t[k])}</span>${cls ? '<span class="badge"></span>' : ''}</div>`)
        .join('');
      var rows = (a.recent || []).slice(0, Math.max(1, Number(this._config.rows) || 4));
      var list = rows.length
        ? rows
            .map((e) => {
              var tn = NH_TONES[e.status] || 'ok';
              var name = e.title || e.message;
              var sub = [t[`st_${e.status}`] || e.status, this._ago(e.time, t)].join(' · ');
              var look = (a.sources || {})[e.source_key] || (e.source ? { name: e.source, domain: e.domain } : null);
              var who = (e.people || []).join(', ');
              var ack = e.status === 'pending' ? `<button class="btn" type="button" data-ack="${nhEsc(e.id)}">${nhEsc(t.ack)}</button>` : '';
              return `<div class="row r-${tn}" data-key="${nhEsc(e.id)}"><span class="dot">${nhIcon(tn)}</span><span class="txt"><span class="nm">${nhEsc(name)}</span><span class="sub">${nhSource(look, this._night())}${nhEsc(sub)}</span></span>${who ? `<span class="chip">${nhEsc(who)}</span>` : ''}${ack}</div>`;
            })
            .join('')
        : `<div class="empty">${nhEsc(t.nothing)}</div>`;
      body = `<div class="tiles">${tiles}</div><div class="list">${list}</div>`;
    }
    var title = this._config.title || t.title;
    var card = this.shadowRoot.querySelector('ha-card');
    card.className = `tone-${tone}${this._night() ? ' night' : ''}`;
    nhMorph(
      card,
      `<div class="banner">
          ${NotifyHubCard.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="head">
            <span class="ico">${nhIcon('bell')}</span>
            <span class="htxt"><span class="title">${nhEsc(title)}</span>${subtitle ? `<span class="subtitle">${nhEsc(subtitle)}</span>` : ''}</span>
            ${pill ? `<span class="pill">${nhEsc(pill)}</span>` : ''}
          </div>
        </div>
        <div class="body">${body}</div>`,
    );
  }

  // The header's scene: a mailbox bell ringing (shaking when a critical one waits), letters on their way.
  static scene(alarm) {
    return `<svg class="scene" viewBox="0 0 200 90" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g class="letter l1"><rect x="40" y="38" width="30" height="20" rx="3"/><path d="M40 40 l15 10 l15 -10"/></g>
      <g class="letter l2"><rect x="150" y="46" width="24" height="16" rx="3"/><path d="M150 48 l12 8 l12 -8"/></g>
      <g class="bell${alarm ? ' ring' : ''}"><path class="bbody" d="M98 78 v-26 a18 18 0 0 1 36 0 v26 z"/><rect class="brim" x="94" y="76" width="44" height="6" rx="3"/><circle class="bclap" cx="116" cy="86" r="4"/></g>
      <path class="wave w1" d="M142 44 q7 7 0 14"/><path class="wave w2" d="M149 38 q12 13 0 26"/>
    </svg>`;
  }

  async _click(ev) {
    var btn = ev.composedPath().find((n) => n?.dataset?.ack);
    if (!btn) return;
    btn.disabled = true;
    try {
      await this._hass.callService('notify_hub', 'acknowledge', { id: btn.dataset.ack });
    } catch (_err) {
      btn.disabled = false;
    }
  }

  static styles() {
    return `
      :host { --nh-ok: var(--success-color, #43a047); --nh-warn: var(--warning-color, #f59e0b); --nh-bad: var(--error-color, #db4437);
              --nh-idle: var(--secondary-text-color, #727272); --nh-info: #2563eb; --nh-accent: #2563eb; }
      ha-card { overflow: hidden; }
      ha-card.tone-ok { --c: var(--nh-accent); } ha-card.tone-bad { --c: var(--nh-bad); } ha-card.tone-idle { --c: var(--nh-idle); }
      .banner { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#dbeafe, #f0f6ff); }
      .night .banner { background: linear-gradient(#0f1b33, #1c2a48); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #93c5fd; }
      .night .ground { background: #36507e; }
      .scene { position: absolute; right: 8px; bottom: 6px; height: 70px; width: auto; max-width: 46%; }
      .letter rect { fill: #fff; stroke: #93c5fd; stroke-width: 2; } .letter path { fill: none; stroke: #93c5fd; stroke-width: 2; }
      .night .letter rect { fill: #e6ebf3; stroke: #5b7bb3; } .night .letter path { stroke: #5b7bb3; }
      .bbody { fill: #93c5fd; } .brim, .bclap { fill: #60a5fa; }
      .night .bbody { fill: #5b7bb3; } .night .brim, .night .bclap { fill: #8fb3ee; }
      .tone-bad .bbody { fill: #fca5a5; } .tone-bad .brim, .tone-bad .bclap { fill: #ef4444; }
      .wave { fill: none; stroke: #3b82f6; stroke-width: 2.5; stroke-linecap: round; }
      .tone-bad .wave { stroke: #ef4444; } .tone-idle .wave { opacity: .25; }
      .letter { animation: nh-fly 6s ease-in-out infinite; } .l2 { animation-delay: -3s; }
      .wave { animation: nh-wave 1.8s ease-in-out infinite; } .w2 { animation-delay: .3s; }
      .bell { transform-box: fill-box; transform-origin: 50% 0; } .bell.ring { animation: nh-ring .9s ease-in-out infinite; }
      @keyframes nh-fly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -4px); } }
      @keyframes nh-wave { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
      @keyframes nh-ring { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(10deg); } 75% { transform: rotate(-10deg); } }
      @media (prefers-reduced-motion: reduce) { .letter, .wave, .bell.ring { animation: none; } }
      .head { position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: flex-start; gap: 12px; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 18%, #fff); color: var(--c); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #1c2a48); }
      .ico .ic { width: 22px; height: 22px; fill: currentColor; }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 16px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; font-size: 12px; line-height: 14px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
              color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .night .pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: color-mix(in srgb, var(--c) 25%, #1c2a48); }
      .body { container-type: inline-size; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .tile { position: relative; display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 10px; border-radius: 12px;
              background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .tile .n { font-size: 20px; font-weight: 700; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
      .tile .k { font-size: 12px; line-height: 1.2; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--nh-bad); }
      .badge { position: absolute; right: 9px; top: 9px; width: 8px; height: 8px; border-radius: 50%; }
      .t-ok .badge { background: var(--nh-ok); } .t-bad .badge { background: var(--nh-bad); } .t-warn .badge { background: var(--nh-warn); } .t-idle .badge { background: var(--nh-idle); }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--nh-ok); display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 10px; border-radius: 12px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.r-bad { --c: var(--nh-bad); background: color-mix(in srgb, var(--nh-bad) 9%, var(--secondary-background-color, transparent)); }
      .row.r-warn { --c: var(--nh-warn); } .row.r-idle { --c: var(--nh-idle); } .row.r-info { --c: var(--nh-info); }
      .dot { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .dot .ic { width: 16px; height: 16px; fill: currentColor; }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .src { --sc: var(--secondary-text-color); display: inline-flex; align-items: center; gap: 4px; margin-right: 3px; vertical-align: top; color: var(--secondary-text-color); --mdc-icon-size: 14px; }
      .src.tinted { color: color-mix(in srgb, var(--sc) 75%, var(--primary-text-color)); }
      .src img { width: 14px; height: 14px; object-fit: contain; } .src ha-icon { color: var(--sc); display: inline-flex; }
      .src > span::after { content: ' ·'; }
      .chip { flex: none; max-width: 30%; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              color: var(--secondary-text-color); background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .btn { flex: none; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 12px; border-radius: 999px;
             color: var(--primary-text-color); background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn:focus-visible { outline: 2px solid var(--nh-accent); outline-offset: 2px; }
      .btn[disabled] { opacity: .5; cursor: default; }
      .empty { padding: 10px 2px; font-size: 13px; color: var(--secondary-text-color); }
      @container (max-width: 308px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    `;
  }
}

export class NotifyHubCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    // The form only needs hass for its pickers: handed over without rebuilding the schema at every state change.
    if (first) this._render();
    else if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._hass || !this._config) return;
    var lang = nhLang(this._hass, this._config);
    var t = Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[lang]);
    this._tr = t;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => this._tr[`ed_${s.name}`] || s.name;
      this._form.addEventListener('value-changed', (ev) => {
        var value = Object.assign({}, ev.detail.value);
        for (var key of Object.keys(value)) if (value[key] === '' || value[key] == null || value[key] === NH_DEFAULTS[key]) delete value[key];
        this._config = Object.assign({ type: this._config.type }, value);
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = Object.assign({}, NH_DEFAULTS, this._config);
    this._form.schema = [
      { name: 'entity', selector: { entity: { domain: 'sensor', integration: 'notify_hub' } } },
      { name: 'title', selector: { text: {} } },
      { name: 'rows', selector: { number: { min: 1, max: 8, mode: 'box' } } },
      {
        name: 'illustration_theme',
        selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'].map((v) => ({ value: v, label: t[`it_${v}`] })) } },
      },
      {
        name: 'language',
        selector: { select: { mode: 'dropdown', options: Object.keys(NH_CARD_I18N).map((l) => ({ value: l, label: l })) } },
      },
    ];
  }
}

if (!customElements.get('notify-hub-card')) pickerDefine('notify-hub-card', NotifyHubCard);
if (!customElements.get('notify-hub-card-editor')) pickerDefine('notify-hub-card-editor', NotifyHubCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'notify-hub-card')) {
  var nhT = Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[nhLang(document.querySelector('home-assistant')?.hass, {})]);
  window.customCards.push({ type: 'notify-hub-card', name: nhT.card_name, description: nhT.card_desc, preview: true });
}
