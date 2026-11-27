// ── End of the folded top bar ──
import { NHP_FILTERS, NHP_TABS, NHP_TONES, NOTIFY_HUB_PANEL_VERSION, nhpAvatar, nhpEsc, nhpFill, nhpIcon } from "./base.js";
import { notifyHubPanelFold } from "./fold.js";
import { NH_PANEL_I18N } from "./i18n/nh-panel-i18n.js";

export class NotifyHubPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
    this._draft = {};
    this._filter = 'all';
    this._source = '';
    this._editing = null;
    this._srcEdit = null;
    this._srcDraft = {};
    this._srcNew = null;
    var tab = new URLSearchParams(location.search).get('tab');
    this._tab = NHP_TABS.includes(tab) ? tab : 'journal';
    this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    this.shadowRoot.addEventListener('change', (ev) => this._change(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => this._key(ev));
    // The page is built once; each part is then rewritten only when its own markup changes (_set), so a state
    // update elsewhere in Home Assistant leaves the panel alone and a field being typed in keeps its focus.
    this._parts = new Map();
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    // The hub's sensor changes with every notification: the journal is fetched again then. Any other state change
    // only redraws when the theme or the language changed (nothing else the panel shows comes from hass).
    var id = this._sensor && hass.states[this._sensor]?.attributes?.notify_hub ? this._sensor : Object.keys(hass.states).find((k) => k.startsWith('sensor.') && hass.states[k]?.attributes?.notify_hub);
    this._sensor = id || '';
    var stamp = id ? hass.states[id].last_updated : '';
    var look = `${!!hass.themes?.darkMode}|${hass.locale?.language || hass.language}`;
    if (first || stamp !== this._stamp) {
      this._stamp = stamp;
      this._look = look;
      this._load();
    } else if (look !== this._look) {
      this._look = look;
      this._render();
    }
  }

  set narrow(value) {
    if (value === this._narrow) return;
    this._narrow = value;
    this._render();
  }

  connectedCallback() {
    if (!this._fold && this.shadowRoot?.querySelector?.(".top")) this._attachFold();
    clearInterval(this._timer);
    this._timer = setInterval(() => this._load(), 30000);
    this._onPop = this._onPop || (() => {
      var tab = new URLSearchParams(location.search).get('tab');
      if (NHP_TABS.includes(tab) && tab !== this._tab) this._setTab(tab, false);
    });
    window.addEventListener('popstate', this._onPop);
  }

  disconnectedCallback() {
    this._fold?.detach();
    this._fold = null;
    clearInterval(this._timer);
    clearTimeout(this._toastTimer);
    window.removeEventListener('popstate', this._onPop);
  }

  // A channel's label: a notify entity's name (Telegram bot, …), else the service without its `notify.`.
  _channel(id) {
    return this._hass?.states?.[id]?.attributes?.friendly_name || String(id).replace('notify.', '');
  }

  _t() {
    var raw = String(this._hass?.locale?.language || this._hass?.language || 'en');
    var lang = NH_PANEL_I18N[raw] ? raw : NH_PANEL_I18N[raw.split('-')[0]] ? raw.split('-')[0] : 'en';
    return Object.assign({}, NH_PANEL_I18N.en, NH_PANEL_I18N[lang]);
  }

  async _load() {
    if (!this._hass) return;
    try {
      this._data = await this._hass.callWS({ type: 'notify_hub/state' });
      this._error = '';
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._render(true);
  }

  _options() {
    return Object.assign({}, this._data?.options || {}, this._draft);
  }

  _setTab(tab, push = true) {
    if (!NHP_TABS.includes(tab)) return;
    this._tab = tab;
    this._draft = {};
    this._editing = null;
    this._srcEdit = null;
    this._srcDraft = {};
    this._srcNew = null;
    this._filter = 'all';
    this._source = '';
    if (push) {
      var url = new URL(location.href);
      url.searchParams.set('tab', tab);
      history.replaceState(history.state, '', url);
    }
    this._render();
  }

  // Tabs: the arrows, Home and End move between them (WAI-ARIA tabs pattern).
  _key(ev) {
    if (!ev.target?.classList?.contains('tab')) return;
    var i = NHP_TABS.indexOf(this._tab);
    var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: NHP_TABS.length - 1 }[ev.key];
    if (next === undefined) return;
    ev.preventDefault();
    this._setTab(NHP_TABS[(next + NHP_TABS.length) % NHP_TABS.length]);
    this.shadowRoot.querySelector('.tab.on')?.focus();
  }

  // Rewrites one part of the page only when its markup changed.
  _set(selector, html) {
    if (this._parts.get(selector) === html) return;
    var el = this.shadowRoot.querySelector(selector);
    if (!el) return;
    this._parts.set(selector, html);
    el.innerHTML = html;
  }

  // The Save buttons follow the draft without redrawing the form (which would drop the focus of the next field).
  _syncSave() {
    var dirty = Object.keys(this._draft).length > 0;
    for (var btn of this.shadowRoot.querySelectorAll('[data-act="save"]')) btn.disabled = !dirty;
  }

  async _ws(message, done) {
    try {
      await this._hass.callWS(message);
      this._toast = done;
    } catch (err) {
      this._toast = `${this._t().error}: ${err?.message || err}`;
    }
    this._render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = '';
      this._render();
    }, 2500);
    await this._load();
  }

  _click(ev) {
    var el = ev.composedPath().find((n) => n?.dataset?.act);
    if (!el) return;
    var t = this._t();
    var act = el.dataset.act;
    if (act === 'tab') this._setTab(el.dataset.tab);
    else if (act === 'filter') {
      this._filter = el.dataset.filter;
      this._render();
    } else if (act === 'ack') this._ws({ type: 'notify_hub/acknowledge', ...(el.dataset.id ? { entry: el.dataset.id } : {}) }, t.saved);
    else if (act === 'test') this._ws({ type: 'notify_hub/test', priority: el.dataset.priority || 'info' }, t.sent_ok);
    else if (act === 'digest') this._ws({ type: 'notify_hub/digest' }, t.sent_ok);
    else if (act === 'edit') {
      this._editing = this._editing === el.dataset.person ? null : el.dataset.person;
      this._render();
    } else if (act === 'reset') {
      var people = Object.assign({}, this._options().people || {});
      delete people[el.dataset.person];
      this._editing = null;
      this._ws({ type: 'notify_hub/save', options: { people } }, t.saved);
    } else if (act === 'add-time') {
      var input = this.shadowRoot.querySelector('#new-time');
      if (!input?.value) return;
      var times = [...new Set([...(this._options().digest_times || []), input.value.slice(0, 5)])].sort();
      this._draft.digest_times = times;
      this._render();
    } else if (act === 'del-time') {
      this._draft.digest_times = (this._options().digest_times || []).filter((x) => x !== el.dataset.time);
      this._render();
    } else if (act === 'source') {
      // The journal shows one source only; the same one again (or its chip's ×) shows them all.
      this._source = this._source === el.dataset.key ? '' : el.dataset.key;
      this._render();
    } else if (act === 'src-add') {
      // A source set ahead of its first notification: an integration picked in the list, opened in the editor.
      var pick = this.shadowRoot.querySelector('#add-src');
      if (!pick?.value) return;
      var found = (this._data?.integrations || []).find((i) => i.domain === pick.value);
      this._srcNew = { key: pick.value, name: found?.name || pick.value, domain: pick.value, origins: [], count: 0, last: null, rule: {} };
      this._srcEdit = pick.value;
      this._srcDraft = {};
      this._render();
    } else if (act === 'src-edit') {
      this._srcEdit = this._srcEdit === el.dataset.key ? null : el.dataset.key;
      this._srcDraft = {};
      this._render();
    } else if (act === 'src-save' || act === 'src-reset') {
      var key = el.dataset.key;
      var sources = Object.assign({}, this._data?.options?.sources || {});
      if (act === 'src-reset') delete sources[key];
      else sources[key] = Object.assign({}, sources[key] || {}, this._srcDraft);
      this._srcEdit = null;
      this._srcDraft = {};
      this._srcNew = null;
      this._ws({ type: 'notify_hub/save', options: { sources } }, t.saved);
    } else if (act === 'save') {
      var draft = this._draft;
      this._draft = {};
      this._ws({ type: 'notify_hub/save', options: draft }, t.saved);
    }
  }

  _change(ev) {
    var el = ev.target;
    var key = el?.dataset?.key;
    if (el?.dataset?.src) {
      // A field of the source being edited: kept in its draft until its Save button.
      var field = el.dataset.src;
      var rule = (this._data?.options?.sources || {})[this._srcEdit] || {};
      if (field === 'people') {
        var who = new Set(this._srcDraft.people ?? rule.people ?? []);
        if (el.checked) who.add(el.dataset.person);
        else who.delete(el.dataset.person);
        this._srcDraft.people = [...who];
      } else if (el.type === 'checkbox') this._srcDraft[field] = el.checked;
      else if (field === 'dedup_minutes') this._srcDraft[field] = el.value === '' ? null : Number(el.value);
      else this._srcDraft[field] = el.value.trim() === '' ? null : el.value.trim();
      if (field === 'color' && el.type === 'color') {
        var text = this.shadowRoot.querySelector('[data-src="color"][type="text"]');
        if (text) text.value = el.value;
      } else if (field === 'color') {
        var pick = this.shadowRoot.querySelector('[data-src="color"][type="color"]');
        if (pick && /^#[0-9a-f]{6}$/i.test(el.value)) pick.value = el.value;
      }
      return;
    }
    if (key === 'capture_persistent' || key === 'capture_repairs') {
      // Applied at once, like the top bar switch.
      this._ws({ type: 'notify_hub/save', options: { [key]: el.checked } }, this._t().saved);
      return;
    }
    if (el?.dataset?.exclude) {
      // A person who is never notified (a technical account, a wall tablet): listed apart, at the bottom.
      var out = new Set(this._options().excluded_people || []);
      if (el.checked) out.add(el.dataset.exclude);
      else out.delete(el.dataset.exclude);
      this._ws({ type: 'notify_hub/save', options: { excluded_people: [...out] } }, this._t().saved);
      return;
    }
    if (el?.dataset?.presence) {
      // Where the person's presence is read: their own location (empty), or a binary sensor, input boolean, tracker.
      var presence = Object.assign({}, this._options().presence || {}, { [el.dataset.presence]: el.value || null });
      this._ws({ type: 'notify_hub/save', options: { presence } }, this._t().saved);
      return;
    }
    if (el?.dataset?.channel) {
      var person = el.dataset.person;
      var current = (this._data?.people || []).find((p) => p.entity_id === person)?.channels || [];
      var set = new Set(current);
      if (el.checked) set.add(el.dataset.channel);
      else set.delete(el.dataset.channel);
      var people = Object.assign({}, this._options().people || {}, { [person]: [...set] });
      this._ws({ type: 'notify_hub/save', options: { people } }, this._t().saved);
      return;
    }
    if (!key) return;
    var value = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    if (key === 'esc0' || key === 'esc1') {
      var esc = [...(this._options().escalation_minutes || [5, 10])];
      esc[key === 'esc0' ? 0 : 1] = Number(el.value);
      this._draft.escalation_minutes = esc;
    } else if (key === 'hide_header') {
      // Applied at once (like the other ha-* panels): saved without waiting for the Save button.
      this._ws({ type: 'notify_hub/save', options: { hide_header: el.checked ? 'all' : 'off' } }, this._t().saved);
      return;
    } else this._draft[key] = value === '' ? null : value;
    // The form is the one shown: only the Save buttons change, the fields keep their focus.
    this._parts.delete('.wrap');
    this._syncSave();
  }

  // `fromLoad`: a refresh of the data (sensor changed, 30 s timer). It leaves a form being edited as it is.
  /** The top bar folds on scroll into one bar with the tabs as icon pills (see notifyHubPanelFold). */
  _attachFold() {
    this._fold?.detach();
    this._fold = notifyHubPanelFold(this, {
      top: ".top",
      tabs: ".tabbar",
      tab: ".tab",
      key: (b) => b.dataset.tab,
      icons: {
        journal: "mdi:format-list-bulleted",
        routing: "mdi:call-split",
        rules: "mdi:filter-outline",
        sources: "mdi:import",
        settings: "mdi:cog",
      },
      badge: ".cnt",
      name: ".top .title",
      sub: ".top .subtitle",
      icon: ".top .ico",
      status: ".top .pill",
      acts: ".top .btns > *",
      accent: "#2563eb",
      menu: () => ({ hass: this._hass, narrow: this._narrow, show: Boolean(this._narrow) }),
    });
  }

  _render(fromLoad = false) {
    if (!this._hass) return;
    var t = this._t();
    var d = this._data;
    var counts = d?.counts || {};
    var pending = Number(counts.pending) || 0;
    var tone = pending ? 'bad' : d?.quiet ? 'idle' : 'ok';
    var subtitle = d ? (d.quiet && d.quiet_hours ? nhpFill(t.subtitle_quiet, { t: d.quiet_hours[1] }) : nhpFill(t.subtitle_ok, { n: counts.sent_today || 0 })) : '';
    var body = !d ? `<div class="empty">${nhpEsc(this._error || '…')}</div>` : this[`_${this._tab}`](d, t);
    var dark = !!this._hass.themes?.darkMode;
    var bare = (d?.options?.hide_header || 'off') !== 'off';
    if (!this._built) {
      this._built = true;
      this.shadowRoot.innerHTML = `<style>${NotifyHubPanel.styles()}</style>
        <div class="page">
          <header class="top"><div class="scene-box"></div><div class="ground"></div><div class="bar"><span class="menu-slot"></span><span class="head"></span><span class="btns"></span></div></header>
          <div class="tabbar"><span class="menu-slot"></span><nav class="tabs" role="tablist"></nav><span class="btns"></span></div>
          <main class="wrap"></main>
          <div class="toast" role="status" aria-live="polite"></div>
        </div>`;
    }
    this.toggleAttribute('bare', bare);
    this.shadowRoot.querySelector('.page').className = `page tone-${tone}${dark ? ' night' : ''}`;
    this._set('.scene-box', NotifyHubPanel.scene(tone === 'bad'));
    // Pill: on the title's line (the subtitle under it), at the right of the header.
    this._set(
      '.head',
      `<span class="ico">${nhpIcon('bell')}</span>
      <span class="htxt"><span class="title">Notify Hub</span><span class="subtitle">${nhpEsc(subtitle)}</span></span>
      ${pending ? `<span class="pill" title="${nhpEsc(t.c_pending)}">${nhpEsc(pending)}<span class="pl"> · ${nhpEsc(t.c_pending)}</span></span>` : ''}`,
    );
    var buttons = `<button class="round" type="button" data-act="test" data-priority="info" title="${nhpEsc(t.test_info)}" aria-label="${nhpEsc(t.test_info)}">${nhpIcon('send')}</button>
      <button class="round" type="button" data-act="digest" title="${nhpEsc(t.digest_now)}" aria-label="${nhpEsc(t.digest_now)}">${nhpIcon('tray')}</button>`;
    // The top bar hidden (option): the menu button and the round buttons move to the row of the tabs.
    this._set('.top .btns', bare ? '' : buttons);
    this._set('.tabbar .btns', bare ? buttons : '');
    this._set('.tabs', NHP_TABS.map((tab) => `<button type="button" role="tab" class="tab${tab === this._tab ? ' on' : ''}" aria-selected="${tab === this._tab}" tabindex="${tab === this._tab ? 0 : -1}" data-act="tab" data-tab="${tab}">${nhpEsc(t[`tab_${tab}`])}</button>`).join(''));
    var active = this.shadowRoot.activeElement;
    var editing = Object.keys(this._draft).length > 0 || (active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) && active.closest('.wrap'));
    var form = this._tab === 'rules' || this._tab === 'settings' || (this._tab === 'sources' && this._srcEdit);
    if (!(fromLoad && editing && form)) this._set('.wrap', body);
    var toast = this.shadowRoot.querySelector('.toast');
    toast.textContent = this._toast || '';
    toast.hidden = !this._toast;
    var slot = this.shadowRoot.querySelector(bare ? '.tabbar .menu-slot' : '.top .menu-slot');
    var menu = this.shadowRoot.querySelector('ha-menu-button');
    if (this._narrow) {
      if (!menu) {
        menu = document.createElement('ha-menu-button');
        menu.className = 'menu';
      }
      if (menu.parentElement !== slot) slot.appendChild(menu);
      menu.hass = this._hass;
      menu.narrow = this._narrow;
    } else if (menu) menu.remove();
    if (!this._fold) this._attachFold();
  }

  // jscpd:ignore-start
  // The header's scene, the card's own (each bundle keeps its copy: both load in one page, a shared top-level name
  // would clash). A mailbox on its post, letters flying in along a dotted path. On an alert to acknowledge,
  // its flag goes up and a bell rings beside it.
  static scene(alarm) {
    var letter = (x, y, r, k) =>
      `<g transform="rotate(${r} ${x + 11} ${y + 7})"><g class="letter l${k}"><rect x="${x}" y="${y}" width="22" height="15" rx="2"/><path d="M${x} ${y + 2}l11 7 11-7"/></g></g>`;
    return `<svg class="scene" viewBox="110 0 190 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <path class="trail" d="M60 46 q60 -40 150 -6"/>
      ${letter(128, 16, -4, 1)}${letter(172, 22, 6, 2)}
      <rect class="post" x="232" y="44" width="6" height="36"/>
      <path class="box" d="M212 44v-12a14 14 0 0 1 14-14h20a14 14 0 0 1 14 14v12z"/>
      <path class="door" d="M212 44v-12a14 14 0 0 1 28 0v12"/>
      <rect class="pole" x="258" y="${alarm ? 6 : 26}" width="3" height="${alarm ? 34 : 14}"/><rect class="cloth${alarm ? ' up' : ''}" x="261" y="${alarm ? 6 : 26}" width="12" height="8"/>
      ${alarm ? '<g class="bell ring"><path class="bbody" d="M272 66v-10a8 8 0 0 1 16 0v10z"/><rect class="brim" x="270" y="65" width="20" height="3" rx="1.5"/></g><path class="wave" d="M293 50q4 5 0 10"/>' : ''}
      <path class="tuft" d="M150 80q4-7 8 0M196 80q3-6 6 0"/>
    </svg>`;
  }
  // jscpd:ignore-end

  _journal(d, t) {
    var c = d.counts || {};
    var tiles = [
      // Every tile has its state badge: the tone of its count, grey (idle) at zero.
      ['c_sent', c.sent_today, c.sent_today ? 'ok' : 'idle'],
      ['c_grouped', c.grouped, c.grouped ? 'warn' : 'idle'],
      ['c_duplicates', c.duplicates, c.duplicates ? 'ok' : 'idle'],
      ['c_pending', c.pending, c.pending ? 'bad' : 'idle'],
    ]
      .map(([k, v, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${nhpEsc(v ?? 0)}</span><span class="k">${nhpEsc(t[k])}</span>${cls ? '<span class="badge"></span>' : ''}</div>`)
      .join('');
    var looks = Object.fromEntries((d.sources || []).map((x) => [x.key, { ...x, icon: x.rule?.icon, color: x.rule?.color }]));
    var dark = !!this._hass.themes?.darkMode;
    var match = (e) =>
      (!this._source || e.source_key === this._source) &&
      (this._filter === 'all' || (this._filter === 'critical' ? e.priority === 'critical' : e.status === this._filter));
    var rows = (d.recent || []).filter(match);
    var chips = NHP_FILTERS.map((f) => `<button type="button" class="chip${f === this._filter ? ' on' : ''}" data-act="filter" data-filter="${f}">${nhpEsc(t[`f_${f}`])}</button>`).join('');
    if (this._source) {
      var picked = looks[this._source] || { name: this._source };
      chips += `<button type="button" class="chip on src" data-act="source" data-key="${nhpEsc(this._source)}" aria-label="${nhpEsc(t.f_all)}">${nhpAvatar(picked, dark, 'av sm')}${nhpEsc(picked.name)}${nhpIcon('close')}</button>`;
    }
    var when = (iso) => this._when(iso);
    var list = rows.length
      ? rows
          .map((e) => {
            var tone = NHP_TONES[e.status] || 'ok';
            var status = { pending: t.f_pending, grouped: t.f_grouped, held: t.f_held, duplicate: t.f_duplicate, nobody: t.st_nobody, failed: t.st_failed, muted: t.st_muted }[e.status];
            var look = looks[e.source_key] || { name: e.source, domain: e.domain };
            var source = e.source_key
              ? `<button type="button" class="cell srcbtn" data-act="source" data-key="${nhpEsc(e.source_key)}" title="${nhpEsc(e.origin || e.source)}">${nhpAvatar(look, dark, 'av sm')}<span>${nhpEsc(e.source)}</span></button>`
              : '<span class="cell">—</span>';
            return `<div class="row r-${tone}">
              <span class="dot">${nhpIcon(tone)}</span>
              <span class="txt"><span class="nm">${nhpEsc(e.title || e.message)}</span><span class="sub">${nhpEsc(e.title ? e.message : '')}</span></span>
              ${source}
              <span class="cell">${nhpEsc((e.people || []).join(', ') || '—')}</span>
              <span class="cell time">${nhpEsc(when(e.time))}</span>
              ${e.status === 'pending' ? `<button class="btn" type="button" data-act="ack" data-id="${nhpEsc(e.id)}">${nhpEsc(t.acknowledge_all.split(' ')[0])}</button>` : `<span class="tag t-${tone}">${nhpEsc(e.status === 'delivered' || e.status === 'acknowledged' ? '✓' : status || e.status)}</span>`}
            </div>`;
          })
          .join('')
      : `<div class="empty">${nhpEsc(t.empty)}</div>`;
    return `<div class="tiles">${tiles}</div>
      <div class="chips">${chips}${c.pending ? `<button type="button" class="btn danger" data-act="ack">${nhpEsc(t.acknowledge_all)}</button>` : ''}</div>
      <div class="list">${list}</div>`;
  }

  _routing(d, t) {
    var people = d.people || [];
    var opts = this._options();
    var esc = opts.escalation_minutes || [5, 10];
    // The people never notified come last, folded to their name.
    var ordered = [...people.filter((p) => !p.excluded), ...people.filter((p) => p.excluded)];
    var cards = ordered.length
      ? ordered
          .map((p) => {
            var editing = this._editing === p.entity_id;
            var own = (d.sources || []).filter((x) => x.rule?.people?.includes(p.entity_id));
            var dedicated = own.length
              ? `<div class="chips"><span class="muted">${nhpEsc(t.p_sources)}</span>${own.map((x) => `<span class="chip static">${nhpAvatar({ domain: x.domain, icon: x.rule.icon, color: x.rule.color }, !!this._hass.themes?.darkMode, 'av sm')}${nhpEsc(x.name)}</span>`).join('')}</div>`
              : '';
            var channels = p.channels.length ? p.channels.map((c) => `<span class="chip static">${nhpEsc(this._channel(c))}</span>`).join('') : `<span class="muted">${nhpEsc(t.no_channel)}</span>`;
            var id = nhpEsc(p.entity_id);
            var exclude = `<label class="check"><input type="checkbox" data-exclude="${id}"${p.excluded ? ' checked' : ''}><span>${nhpEsc(t.p_exclude)}</span></label>`;
            var presence = `<label class="field"><span>${nhpEsc(t.p_presence)}</span><select data-presence="${id}"><option value="">${nhpEsc(t.p_presence_person)}</option>${this._presenceChoices(p.presence)
              .map((e) => `<option value="${nhpEsc(e.id)}"${e.id === p.presence ? ' selected' : ''}>${nhpEsc(e.name)}</option>`)
              .join('')}</select><small>${nhpEsc(t.p_presence_help)}</small></label>`;
            var picker = editing
              ? p.excluded
                ? `<div class="picker">${exclude}</div>`
                : `<div class="picker">${(d.services || []).map((s) => `<label class="check"><input type="checkbox" data-person="${id}" data-channel="${nhpEsc(s)}"${p.channels.includes(s) ? ' checked' : ''}><span>${nhpEsc(this._channel(s))}</span></label>`).join('')}
                  ${p.custom ? `<button type="button" class="btn" data-act="reset" data-person="${id}">${nhpEsc(t.reset)}</button>` : ''}</div>
                  <div class="picker col1">${presence}${exclude}</div>`
              : '';
            var where = p.presence ? `${p.home ? t.home : t.away} (${this._entityName(p.presence)})` : p.home ? t.home : t.away;
            var sub = p.excluded ? t.p_excluded : `${where} · ${p.custom ? t.custom : t.found}`;
            return `<div class="card p-${p.excluded ? 'excluded' : p.home ? 'home' : 'away'}">
              <div class="phead"><span class="dot">${nhpIcon('person')}</span>
                <span class="txt"><span class="nm">${nhpEsc(p.name)}</span><span class="sub">${nhpEsc(sub)}</span></span>
                <button type="button" class="btn" data-act="edit" data-person="${id}" aria-expanded="${editing}">${nhpEsc(t.channels)}</button></div>
              ${p.excluded ? '' : `<div class="chips">${channels}</div>${dedicated}`}${picker}
            </div>`;
          })
          .join('')
      : `<div class="empty">${nhpEsc(t.no_people)}</div>`;
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.people)}</h2>${cards}</section>
      <section class="col"><h2>${nhpEsc(t.escalation)}</h2><div class="card"><p class="text">${nhpEsc(nhpFill(t.escalation_text, { a: esc[0], b: esc[1] }))}</p>
      <div class="chips"><span class="chip static">${nhpEsc(t.p_alert.split(' (')[0])}</span><span class="muted">→ ${esc[0]} ${nhpEsc(t.minutes)} →</span><span class="chip static">${nhpEsc(t.f_all)}</span><span class="muted">→ ${esc[1]} ${nhpEsc(t.minutes)} →</span><span class="chip static">${nhpEsc(opts.sms_service ? this._channel(opts.sms_service) : t.sms_none)}</span></div>
      <div class="actions"><button type="button" class="btn danger" data-act="test" data-priority="critical">${nhpEsc(t.test_critical)}</button></div></div></section></div>`;
  }

  _entityName(id) {
    return this._hass?.states?.[id]?.attributes?.friendly_name || id;
  }

  // The entities a person's presence can be read from: binary sensors (presence, occupancy and motion first), input
  // booleans and device trackers, by name; the one set is kept even when it is gone.
  _presenceChoices(current) {
    var states = this._hass?.states || {};
    var first = new Set(['presence', 'occupancy', 'motion']);
    var list = Object.keys(states)
      .filter((id) => /^(binary_sensor|input_boolean|device_tracker)\./.test(id))
      .map((id) => ({ id, name: this._entityName(id), rank: id.startsWith('binary_sensor.') && first.has(states[id].attributes?.device_class) ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    if (current && !states[current]) list.unshift({ id: current, name: current, rank: 0 });
    return list;
  }

  _rules(d, t) {
    var o = this._options();
    var times = (o.digest_times || []).map((x) => `<span class="chip static">${nhpEsc(x)}<button type="button" class="x" data-act="del-time" data-time="${nhpEsc(x)}" aria-label="×">${nhpIcon('close')}</button></span>`).join('');
    var levels = ['critical', 'alert', 'info', 'digest']
      .map((p) => `<div class="lvl"><span class="tag t-${{ critical: 'bad', alert: 'warn', info: 'info', digest: 'idle' }[p]}">${nhpEsc(p)}</span><span>${nhpEsc(t[`p_${p}`])}</span></div>`)
      .join('');
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.rules_priorities)}</h2><div class="card">${levels}</div></section>
      <section class="col"><h2>${nhpEsc(t.quiet)}</h2><div class="card form">
        ${this._switch('quiet_enabled', t.quiet, o.quiet_enabled !== false)}
        <div class="grid2"><label class="field"><span>${nhpEsc(t.quiet_start)}</span><input type="time" data-key="quiet_start" value="${nhpEsc(o.quiet_start || '22:00')}"></label>
        <label class="field"><span>${nhpEsc(t.quiet_end)}</span><input type="time" data-key="quiet_end" value="${nhpEsc(o.quiet_end || '07:00')}"></label></div>
        <label class="field"><span>${nhpEsc(t.dedup)} (${nhpEsc(t.minutes)})</span><input type="number" min="0" max="1440" data-key="dedup_minutes" value="${nhpEsc(o.dedup_minutes ?? 10)}"><small>${nhpEsc(t.dedup_text)}</small></label>
        <div class="field"><span>${nhpEsc(t.digest_times)}</span><div class="chips">${times}<input id="new-time" type="time"><button type="button" class="btn" data-act="add-time">${nhpEsc(t.add_time)}</button></div></div>
        ${this._switch('away_mode', t.away_mode, !!o.away_mode, t.away_text)}
        ${this._saveBar(t)}
      </div></section></div>`;
  }

  _sources(d, t) {
    var o = this._options();
    var dark = !!this._hass.themes?.darkMode;
    var when = (iso) => this._when(iso);
    var capture = `<div class="card form">
        ${this._switch('capture_persistent', t.cap_persistent, !!o.capture_persistent, t.cap_persistent_help)}
        ${this._switch('capture_repairs', t.cap_repairs, !!o.capture_repairs, t.cap_repairs_help)}</div>`;
    var known = new Set((d.sources || []).map((x) => x.key));
    var fresh = this._srcNew && !known.has(this._srcNew.key) && this._srcEdit === this._srcNew.key ? [this._srcNew] : [];
    var all = [...fresh, ...(d.sources || [])];
    var list = all.length ? all.map((src) => this._sourceCard(d, t, src, dark, when)).join('') : `<div class="empty">${nhpEsc(t.src_empty)}</div>`;
    var choices = (d.integrations || []).filter((i) => !known.has(i.domain));
    var add = choices.length
      ? `<div class="addrow"><select id="add-src" aria-label="${nhpEsc(t.src_add)}"><option value="">${nhpEsc(t.src_pick)}</option>${choices.map((i) => `<option value="${nhpEsc(i.domain)}">${nhpEsc(i.name)}</option>`).join('')}</select><button type="button" class="btn" data-act="src-add">${nhpEsc(t.src_add)}</button></div>`
      : '';
    return `<div class="cols"><section class="col wide"><h2>${nhpEsc(t.src_list)}</h2>${add}${list}</section>
      <section class="col"><h2>${nhpEsc(t.src_capture)}</h2>${capture}<p class="muted wrapline">${nhpEsc(t.src_help)}</p></section></div>`;
  }

  _sourceCard(d, t, src, dark, when) {
    var rule = src.rule || {};
    var editing = this._srcEdit === src.key;
    var look = { domain: src.domain, icon: rule.icon, color: rule.color };
    var tags = [
      rule.priority ? `<span class="tag t-${{ critical: 'bad', alert: 'warn', info: 'info', digest: 'idle' }[rule.priority]}">${nhpEsc(t[`pn_${rule.priority}`] || rule.priority)}</span>` : '',
      rule.people?.length ? `<span class="tag t-info">${nhpIcon('person', 'ic xs')} ${nhpEsc(rule.people.map((id) => (d.people || []).find((p) => p.entity_id === id)?.name || id).join(', '))}</span>` : '',
      rule.ignore_quiet ? `<span class="tag t-warn">${nhpEsc(t.src_quiet_tag)}</span>` : '',
      rule.dedup_minutes != null ? `<span class="tag t-idle">${nhpEsc(rule.dedup_minutes)} ${nhpEsc(t.minutes)}</span>` : '',
      rule.muted ? `<span class="tag t-bad">${nhpEsc(t.st_muted)}</span>` : '',
    ].join('');
    var sub = [nhpFill(t.src_count, { n: src.count }), src.last ? nhpFill(t.src_last, { t: when(src.last) }) : '', src.domain || (src.key.includes('.') ? src.key : '')]
      .filter(Boolean)
      .join(' · ');
    var origins = src.origins?.length ? `<div class="chips">${src.origins.map((x) => `<span class="chip static">${nhpEsc(x)}</span>`).join('')}</div>` : '';
    return `<div class="card src-card${rule.muted ? ' muted-src' : ''}">
        <div class="phead">${nhpAvatar(look, dark)}
          <span class="txt"><span class="nm">${nhpEsc(src.name)}</span><span class="sub">${nhpEsc(sub)}</span></span>
          <span class="tags">${tags}</span>
          <button type="button" class="btn" data-act="src-edit" data-key="${nhpEsc(src.key)}" aria-expanded="${editing}">${nhpEsc(t.src_edit)}</button></div>
        ${origins}${editing ? this._sourceForm(d, t, src, rule) : ''}</div>`;
  }

  _sourceForm(d, t, src, rule) {
    var v = Object.assign({}, rule, this._srcDraft);
    var key = nhpEsc(src.key);
    var priorities = ['', 'critical', 'alert', 'info', 'digest']
      .map((p) => `<option value="${p}"${(v.priority || '') === p ? ' selected' : ''}>${nhpEsc(p ? t[`pn_${p}`] || p : t.src_as_sent)}</option>`)
      .join('');
    var chosen = new Set(v.people || []);
    var people = (d.people || [])
      .filter((p) => !p.excluded || chosen.has(p.entity_id))
      .map((p) => `<label class="check"><input type="checkbox" data-src="people" data-person="${nhpEsc(p.entity_id)}"${chosen.has(p.entity_id) ? ' checked' : ''}><span>${nhpEsc(p.name)}</span></label>`)
      .join('');
    var color = /^#[0-9a-f]{6}$/i.test(v.color || '') ? v.color : '#2563eb';
    return `<div class="form srcform">
        <div class="grid2"><label class="field"><span>${nhpEsc(t.src_name)}</span><input type="text" data-src="name" value="${nhpEsc(v.name || '')}" placeholder="${nhpEsc(src.name)}"></label>
        <label class="field"><span>${nhpEsc(t.src_icon)}</span><input type="text" data-src="icon" value="${nhpEsc(v.icon || '')}" placeholder="mdi:bell"></label></div>
        <div class="grid2"><label class="field"><span>${nhpEsc(t.src_color)}</span><span class="colorrow"><input type="color" data-src="color" value="${nhpEsc(color)}" aria-label="${nhpEsc(t.src_color)}"><input type="text" data-src="color" value="${nhpEsc(v.color || '')}" placeholder="#rrggbb"></span></label>
        <label class="field"><span>${nhpEsc(t.src_priority)}</span><select data-src="priority">${priorities}</select></label></div>
        <div class="field"><span>${nhpEsc(t.src_people)}</span><div class="picker">${people || `<span class="muted">${nhpEsc(t.no_people)}</span>`}</div><small>${nhpEsc(t.src_people_help)}</small></div>
        <label class="field"><span>${nhpEsc(t.dedup)} (${nhpEsc(t.minutes)})</span><input type="number" min="0" max="1440" data-src="dedup_minutes" value="${nhpEsc(v.dedup_minutes ?? '')}" placeholder="${nhpEsc(this._options().dedup_minutes ?? 10)}"><small>${nhpEsc(t.src_dedup_help)}</small></label>
        ${this._srcSwitch('ignore_quiet', t.src_quiet, !!v.ignore_quiet, t.src_quiet_help)}
        ${this._srcSwitch('muted', t.st_muted, !!v.muted, t.src_muted_help)}
        <div class="actions">${Object.keys(rule).length ? `<button type="button" class="btn danger" data-act="src-reset" data-key="${key}">${nhpEsc(t.src_reset)}</button>` : ''}
          <button type="button" class="btn primary" data-act="src-save" data-key="${key}">${nhpEsc(t.save)}</button></div></div>`;
  }

  _srcSwitch(field, label, on, help) {
    return `<label class="switch"><span class="stxt"><span class="nm">${nhpEsc(label)}</span>${help ? `<small>${nhpEsc(help)}</small>` : ''}</span><input type="checkbox" data-src="${field}"${on ? ' checked' : ''}><span class="sw" aria-hidden="true"></span></label>`;
  }

  _settings(d, t) {
    var o = this._options();
    var esc = o.escalation_minutes || [5, 10];
    var services = (d.services || []).filter((s) => !s.startsWith('notify.mobile_app_'));
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.escalation)}</h2><div class="card form">
        <label class="field"><span>${nhpEsc(t.sms)}</span><select data-key="sms_service"><option value="">${nhpEsc(t.sms_none)}</option>${services.map((s) => `<option value="${nhpEsc(s)}"${s === o.sms_service ? ' selected' : ''}>${nhpEsc(this._channel(s))}</option>`).join('')}</select></label>
        <div class="grid2"><label class="field"><span>${nhpEsc(t.esc_first)} (${nhpEsc(t.minutes)})</span><input type="number" min="1" max="240" data-key="esc0" value="${esc[0]}"></label>
        <label class="field"><span>${nhpEsc(t.esc_second)} (${nhpEsc(t.minutes)})</span><input type="number" min="1" max="240" data-key="esc1" value="${esc[1]}"></label></div>
        <label class="field"><span>${nhpEsc(t.retention)} (${nhpEsc(t.days)})</span><input type="number" min="1" max="90" data-key="retention_days" value="${nhpEsc(o.retention_days ?? 7)}"></label>
        ${this._saveBar(t)}
        ${this._switch('hide_header', t.hide_header, (o.hide_header || 'off') !== 'off', t.hide_header_help)}
      </div></section>
      <section class="col"><h2>${nhpEsc(t.test)}</h2><div class="card"><div class="actions">
        <button type="button" class="btn" data-act="test" data-priority="info">${nhpEsc(t.test_info)}</button>
        <button type="button" class="btn danger" data-act="test" data-priority="critical">${nhpEsc(t.test_critical)}</button>
        <button type="button" class="btn" data-act="digest">${nhpEsc(t.digest_now)}</button></div>
        <p class="muted">Notify Hub ${nhpEsc(d.version || NOTIFY_HUB_PANEL_VERSION)}</p></div></section></div>`;
  }

  _when(iso) {
    try {
      return new Date(iso).toLocaleString(this._hass.locale?.language || 'en', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    } catch (_err) {
      return iso;
    }
  }

  _switch(key, label, on, help) {
    return `<label class="switch"><span class="stxt"><span class="nm">${nhpEsc(label)}</span>${help ? `<small>${nhpEsc(help)}</small>` : ''}</span><input type="checkbox" data-key="${key}"${on ? ' checked' : ''}><span class="sw" aria-hidden="true"></span></label>`;
  }

  _saveBar(t) {
    var dirty = Object.keys(this._draft).length > 0;
    return `<div class="actions"><button type="button" class="btn primary" data-act="save"${dirty ? '' : ' disabled'}>${nhpEsc(t.save)}</button></div>`;
  }

  static styles() {
    return `
      :host { display: block; --ok: var(--success-color, #43a047); --warn: var(--warning-color, #ffa600); --bad: var(--error-color, #db4437);
              --idle: var(--secondary-text-color, #727272); --info: #2563eb; --accent: #2563eb; }
      .page { min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); font-family: var(--paper-font-body1_-_font-family, inherit); }
      .page.tone-ok { --c: var(--accent); } .page.tone-bad { --c: var(--bad); } .page.tone-idle { --c: var(--idle); }
      .top { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#dbeafe, #f0f6ff); }
      .night .top { background: linear-gradient(#0f1b33, #1c2a48); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #93c5fd; } .night .ground { background: #36507e; }
      .scene { position: absolute; right: 340px; bottom: 10px; height: 80px; width: 190px; max-width: 40%; }
      @media (max-width: 900px) { .scene { right: 120px; opacity: .35; } }
      .trail { fill: none; stroke: #93c5fd; stroke-width: 1.5; stroke-dasharray: 3 5; } .night .trail { stroke: #5b7bb3; }
      .letter rect { fill: #fff; stroke: #93c5fd; stroke-width: 1.8; } .letter path { fill: none; stroke: #93c5fd; stroke-width: 1.8; }
      .night .letter rect { fill: #e6ebf3; stroke: #5b7bb3; } .night .letter path { stroke: #5b7bb3; }
      .post { fill: #a8743f; } .night .post { fill: #7a5534; }
      .box { fill: #3b82f6; } .door { fill: #2563eb; } .night .box { fill: #2f5fb8; } .night .door { fill: #264f9c; }
      .pole { fill: #64748b; } .cloth { fill: #94a3b8; } .night .pole { fill: #94a3b8; } .night .cloth { fill: #64748b; }
      .cloth.up { fill: #ef4444; }
      .bbody { fill: #fca5a5; } .brim { fill: #ef4444; }
      .wave { fill: none; stroke: #ef4444; stroke-width: 2; stroke-linecap: round; animation: nhp-wave 1.8s ease-in-out infinite; }
      .tuft { fill: none; stroke: #60a5fa; stroke-width: 2; } .night .tuft { stroke: #3b6aa8; }
      .letter { animation: nhp-fly 6s ease-in-out infinite; } .l2 { animation-delay: -3s; }
      .bell { transform-box: fill-box; transform-origin: 50% 0; } .bell.ring { animation: nhp-ring .9s ease-in-out infinite; }
      @keyframes nhp-fly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, -5px); } }
      @keyframes nhp-wave { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
      @keyframes nhp-ring { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(10deg); } 75% { transform: rotate(-10deg); } }
      @media (prefers-reduced-motion: reduce) { .letter, .wave, .bell.ring { animation: none; } }
      .bar { position: absolute; left: 24px; right: 24px; top: 0; bottom: 10px; display: flex; align-items: center; gap: 12px; }
      .head { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; }
      .head .htxt { min-width: 84px; }
      @media (max-width: 600px) { .pill .pl { display: none; } }
      .btns, .menu-slot { flex: none; display: flex; align-items: center; gap: 12px; }
      .menu-slot:empty, .btns:empty { display: none; }
      :host([bare]) .top { display: none; }
      .tabbar { display: flex; align-items: center; gap: 12px; padding: 0 24px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); background: var(--card-background-color, #fff); }
      .tabbar .btns { gap: 8px; } .tabbar .round { width: 36px; height: 36px; }
      .tabbar .menu { color: var(--primary-text-color); margin-left: -8px; }
      .toast[hidden] { display: none; }
      .menu { color: #1f2937; } .night .menu { color: #f3f4f6; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 18%, #fff); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #1c2a48); }
      .ic { width: 20px; height: 20px; fill: currentColor; }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 20px; font-weight: 700; line-height: 26px; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; line-height: 18px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: 0 1 auto; min-width: 2.2em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 18px; font-size: 12px; line-height: 14px; font-weight: 600; padding: 4px 12px; border-radius: 999px; color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .round { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--c);
               border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); background: rgba(255,255,255,.6); }
      .night .round { background: rgba(0,0,0,.25); }
      .round:focus-visible, .tab:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .tabs { flex: 1; min-width: 0; display: flex; gap: 24px; overflow-x: auto; scrollbar-width: none; }
      .tab { font: inherit; font-size: 14px; font-weight: 600; background: none; border: 0; padding: 14px 0; cursor: pointer; white-space: nowrap;
             color: var(--secondary-text-color); border-bottom: 3px solid transparent; }
      .tab.on { color: var(--primary-text-color); border-bottom-color: var(--accent); }
      .wrap { max-width: 1180px; margin: 0 auto; padding: 20px 24px 40px; display: flex; flex-direction: column; gap: 16px; }
      h2 { margin: 4px 0 0; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 700px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .tile, .card { position: relative; background: var(--card-background-color, #fff); border-radius: 10px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.08)); }
      .tile { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
      .tile .n { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; } .tile .k { font-size: 13px; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--bad); }
      .badge { position: absolute; right: 12px; top: 12px; width: 9px; height: 9px; border-radius: 50%; }
      .t-bad .badge { background: var(--bad); } .t-warn .badge { background: var(--warn); } .t-ok .badge { background: var(--ok); } .t-idle .badge { background: var(--idle); }
      .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .chip { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
              border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--card-background-color, #fff); display: inline-flex; align-items: center; gap: 4px; }
      .chip.on { color: #1d4ed8; border-color: #93c5fd; background: #dbeafe; } .night .chip.on { color: #bfdbfe; background: #1e3a8a; border-color: #3b5bab; }
      .chip.static { cursor: default; background: var(--secondary-background-color, rgba(127,127,127,.1)); border-color: transparent; }
      .chip .x { border: 0; background: none; padding: 0; cursor: pointer; color: var(--secondary-text-color); display: grid; } .chip .x .ic { width: 14px; height: 14px; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--ok); display: grid; grid-template-columns: 34px minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) 150px 130px; align-items: center; gap: 12px;
             padding: 10px 14px; border-radius: 14px; background: var(--card-background-color, #fff); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.06)); }
      @media (max-width: 760px) { .row { grid-template-columns: 34px minmax(0, 1fr) auto; } .row .cell { display: none; } }
      .row.r-bad { --c: var(--bad); background: color-mix(in srgb, var(--bad) 8%, var(--card-background-color, #fff)); }
      .row.r-warn { --c: var(--warn); } .row.r-idle { --c: var(--idle); } .row.r-info { --c: var(--info); }
      .dot { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
      .dot .ic { width: 17px; height: 17px; }
      .txt { min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub, .cell, .muted, small { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      small { white-space: normal; }
      .row > .tag, .row > .btn { justify-self: end; }
      .tag { justify-self: start; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; color: color-mix(in srgb, var(--tc) 75%, var(--primary-text-color)); background: color-mix(in srgb, var(--tc) 16%, transparent); }
      .tag.t-ok { --tc: var(--ok); } .tag.t-bad { --tc: var(--bad); } .tag.t-warn { --tc: var(--warn); } .tag.t-idle { --tc: var(--idle); } .tag.t-info { --tc: var(--info); }
      .btn { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn.primary { color: color-mix(in srgb, var(--accent) 70%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
      .btn.danger { color: color-mix(in srgb, var(--bad) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--bad) 55%, transparent); }
      .btn[disabled] { opacity: .45; cursor: default; }
      .cols { display: flex; flex-wrap: wrap; gap: 20px; } .col { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
      .card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .phead { display: flex; align-items: center; gap: 10px; }
      .p-home { --c: var(--ok); } .p-away, .p-excluded { --c: var(--idle); }
      .p-excluded .phead .dot, .p-excluded .phead .txt { opacity: .55; }
      .picker.col1 { flex-direction: column; align-items: stretch; gap: 10px; }
      .picker { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-top: 6px; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
      .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
      .text { margin: 0; font-size: 13px; color: var(--secondary-text-color); }
      .lvl { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; align-items: center; font-size: 13px; }
      .form { gap: 14px; } .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: end; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .field input, .field select, #new-time { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .switch { display: flex; align-items: center; gap: 12px; cursor: pointer; }
      .stxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
      .sw { flex: none; width: 38px; height: 22px; border-radius: 999px; background: var(--divider-color, #ccc); position: relative; transition: background .2s; }
      .sw::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; }
      .switch input:checked + .sw { background: var(--accent); } .switch input:checked + .sw::after { transform: translateX(16px); }
      .switch input:focus-visible + .sw { outline: 2px solid var(--accent); outline-offset: 2px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .empty { padding: 16px; color: var(--secondary-text-color); font-size: 13px; }
      .av { --sc: var(--accent); flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; overflow: hidden; color: var(--sc);
            background: color-mix(in srgb, var(--sc) 14%, var(--card-background-color, #fff)); --mdc-icon-size: 18px; }
      .av img { width: 22px; height: 22px; object-fit: contain; } .av .ic { width: 17px; height: 17px; }
      .av.sm { width: 22px; height: 22px; --mdc-icon-size: 13px; } .av.sm img { width: 15px; height: 15px; } .av.sm .ic { width: 12px; height: 12px; }
      .srcbtn { font: inherit; font-size: 12px; color: var(--secondary-text-color); display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; }
      .srcbtn span:last-child { overflow: hidden; text-overflow: ellipsis; } .srcbtn:hover span:last-child { text-decoration: underline; }
      .chip.src .ic { width: 14px; height: 14px; }
      .tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; } .ic.xs { width: 12px; height: 12px; vertical-align: -2px; }
      .tags .tag { white-space: nowrap; }
      @media (max-width: 600px) { .src-card .phead { flex-wrap: wrap; } .src-card .phead .txt { flex: 1 1 0; min-width: 0; } .src-card .phead .tags { order: 3; flex-basis: 100%; justify-content: flex-start; padding-left: 44px; } .src-card .phead .tags:empty { display: none; } }
      .src-card.muted-src .phead > .av, .src-card.muted-src .phead .txt { opacity: .55; }
      .srcform { display: flex; flex-direction: column; padding-top: 12px; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
      .colorrow { display: flex; gap: 8px; } .colorrow input[type=color] { flex: none; width: 44px; padding: 2px; height: auto; } .colorrow input[type=text] { flex: 1; min-width: 0; }
      .addrow { display: flex; gap: 8px; } .addrow select { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px;
               color: var(--primary-text-color); background: var(--card-background-color, transparent); border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .col.wide { flex: 2 1 520px; } .wrapline { white-space: normal; margin: 0; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 10px 18px; border-radius: 999px; font-size: 13px;
               background: var(--primary-text-color); color: var(--primary-background-color); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    `;
  }
}

if (!customElements.get('notify-hub-panel')) customElements.define('notify-hub-panel', NotifyHubPanel);
