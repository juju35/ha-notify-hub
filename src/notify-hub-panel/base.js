/**
 * notify-hub-panel — Notify Hub's sidebar panel (administrators): the journal of the notifications, the people and
 * their channels, the rules (priorities, quiet hours, duplicates, digests), the sources (each integration's rule and
 * look, the notifications captured from Home Assistant) and the settings (escalation, SMS, journal, tests). Talks to the integration over its WebSocket commands (notify_hub/state, /save, /acknowledge,
 * /test, /digest). Its layout follows the other ha-* panels: an illustrated header across the whole width, the tabs
 * under it, the current tab in the address.
 * https://github.com/juju35/ha-notify-hub
 */
export var NOTIFY_HUB_PANEL_VERSION = '0.7.3';


export var NHP_TABS = ['journal', 'routing', 'rules', 'sources', 'settings'];
export var NHP_FILTERS = ['all', 'critical', 'pending', 'grouped', 'held', 'duplicate'];
export var NHP_TONES = { delivered: 'ok', acknowledged: 'ok', pending: 'bad', held: 'idle', grouped: 'warn', duplicate: 'info', nobody: 'bad', failed: 'bad', muted: 'idle' };
export var NHP_ICONS = {
  bell: 'M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21',
  send: 'M2,21L23,12L2,3V10L17,12L2,14V21Z',
  tray: 'M2 12H4V17H20V12H22V17A2 2 0 0 1 20 19H4A2 2 0 0 1 2 17M11 5H13V13.17L16.59 9.59L18 11L12 17L6 11L7.41 9.59L11 13.17Z',
  person: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  bad: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  warn: 'M19,15H15A3,3 0 0,1 12,18A3,3 0 0,1 9,15H5V5H19M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z',
  idle: 'M12 3A9 9 0 1 0 21 12 7 7 0 0 1 12 3Z',
  info: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

export var nhpEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export var nhpIcon = (name, cls) => `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${NHP_ICONS[name] || ''}"/></svg>`;
// A source's badge: its icon (mdi:) when one is set, else its integration's brand logo, else a generic one; tinted
// with its color.
export var nhpBrand = (domain, dark) => `https://brands.home-assistant.io/_/${encodeURIComponent(domain)}/${dark ? 'dark_' : ''}icon.png`;
export var nhpAvatar = (look, dark, cls) => {
  var style = look?.color ? ` style="--sc:${nhpEsc(look.color)}"` : '';
  var inner = look?.icon
    ? `<ha-icon icon="${nhpEsc(look.icon)}"></ha-icon>`
    : look?.domain
      ? `<img src="${nhpEsc(nhpBrand(look.domain, dark))}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : nhpIcon('bell');
  return `<span class="${cls || 'av'}${look?.color ? ' tinted' : ''}"${style}>${inner}</span>`;
};
export var nhpFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));
