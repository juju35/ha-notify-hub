# Changelog

## 0.11.0 - 2026-11-27

### Features
- Illustrated header (card and panel): a mailbox on its post with letters flying in along a dotted path. On an alert to acknowledge, its flag goes up and a bell rings beside it.
- Card: the status pill sits right after the title, like on the other ha-* cards; a long subtitle ends before the scene.

## 0.10.1 - 2026-11-27

### Fixes
- Tiles have the 10 px corner radius shared by the ha-* cards.
- Illustrated header (card and panel): the ground bar is 10 px thick and the warning colour is the theme's `--warning-color` (fallback `#ffa600`), like on the other ha-* cards.

## 0.10.0 - 2026-11-26

### Features
- **Captured notifications held back** (#22), in the Sources step of the options, off by default: a **grace period after startup** (`capture_grace_minutes`: what is captured during these minutes after Home Assistant started waits until the end of it), a **delay before sending** (`capture_delay_minutes`) and **capture rules** (`capture_rules`, YAML) by kind (repair / persistent), integration and id with wildcards (`restart_required_*`): `action` send, ignore, journal (kept in the journal only) or digest, a `delay_minutes` of their own, and a shared `topic` that makes notifications of several sources about the same incident duplicates of the first. A held notification is sent only if it is still there when its wait ends (a repair fixed, a notification dismissed meanwhile is dropped); a source forced to the critical priority is never held back.

## 0.9.0 - 2026-11-24

### Features
- **People left out** (#18): in the Routing tab, *Do not notify this person* (under *Channels*) keeps a person out of every notification, named ones included — technical accounts (an MCP or MQTT user), a wall tablet. They are listed last, folded to their name (*Not notified*), and no longer offered in a source's people. Option `excluded_people`.
- **Presence from a sensor** (#18): a person's presence can be read from a binary sensor (a room presence system such as ESPresence), an input boolean or a device tracker instead of their location: `on` or `home` is at home; while it is unavailable, the person's location counts. Picked under *Channels* (presence, occupancy and motion sensors first), shown next to *Home* / *Away*. Option `presence`.

## 0.8.0 - 2026-11-24

### Features
- Notify entities as channels (#14): the integrations on Home Assistant's notify entity platform (Telegram bot, …) are offered in the channel pickers (people, SMS escalation), named after the entity, and sent to with `notify.send_message` (message and title). `notify.send_message` itself, which needs an entity, is no longer offered as a channel; the hub's own entity never is.

## 0.7.3 - 2026-11-24

### Maintenance
- The frontend source is split into ES modules: `src/notify-hub-panel/` (entry `src/notify-hub-panel/index.js`), `src/notify-hub-card/` (entry `src/notify-hub-card/index.js`), cut at its sections, with the translations in one file per language (`i18n/<lang>.js`). `scripts/build-frontend.mjs` assembles them, in their original order, into `custom_components/notify_hub/frontend/notify-hub-panel.js`, `custom_components/notify_hub/frontend/notify-hub-card.js`, no longer committed; the tests, the screenshots and the release build them first. The release zip is unchanged.

## 0.7.2 - 2026-11-22

### Performance
- Card picker: the previews are back (`preview: true`), and light. Each card's preview is drawn only once it scrolls into view of Home Assistant's card picker, which otherwise builds the preview of every card at once: until then it holds Home Assistant's state (no render, no history request, no animation). On a dashboard or in the card editor the card is drawn as before.

## 0.7.1 - 2026-11-22

### Performance
- Card picker: the cards no longer ask Home Assistant for a live preview (`preview: false` in `window.customCards`). The picker drew every card at once (history requests, animations), which made the list slow to open; it now shows each card's description instead.

## 0.7.0 - 2026-11-21

### Features
- Panel: past 24 px of scroll the top bar folds into one sticky bar, as on the dashboards' illustrated headers (ha-dashboard-header) — the icon, title and line, the tabs as round icon pills with their counts, the status pill and the round buttons; back at the top it unfolds. The content does not move. On a narrow panel the pills get a row of their own under the bar, the status turns to a dot and only the first round button is kept.

## 0.6.0 - 2026-11-21

### Features

- A muted source still lets its critical notifications through (a leak, smoke…): they are sent and wait for their acknowledgement as usual; the rest stays muted
- Panel, Sources tab: the priorities (tags and the priority list of a source) are shown in the panel's language

### Fixes

- Captured persistent notifications: one raised by a channel of the hub itself (`notify.persistent_notification` set as a person's channel) was captured and sent again, for ever; the hub's own sends are no longer captured
- Panel, Sources tab on a phone: a source's tags go on their own line under its name instead of squeezing it (« Quiet hours ignored » was wrapped on three lines)

## 0.5.0 - 2026-11-21

### Features

- The hub as a notify target: a `notify.notify_hub` action (`message`, `title`, `target` for the people, `data` with the hub's `priority`, `topic`, `source`, `url`) and a `notify.notify_hub` entity for `notify.send_message` — pick it in any integration that asks for a notify service, and its notifications follow the hub's rules
- Sources: a notification sent by an integration (through `notify.notify_hub` or `notify_hub.send`) is filed under that integration, found from the call
- The hub never lists or calls itself as a channel (no loop)

## 0.4.0 - 2026-11-21

### Features

- Sources tab: set a source's people (and its other rules) ahead of its first notification — pick any loaded integration in the list
- Source cards name the people a source is reserved for; the Routing tab lists, under each person, the sources reserved for them

## 0.3.0 - 2026-11-21

### Features

- Sources: each notification is filed under its source — found by itself from the calling automation or script (the integration most of its entities belong to, helpers and templates left aside; the automation itself otherwise), or given to `notify_hub.send` as an integration domain, an entity id or a free text; the action returns it (`source`)
- Per-source rules (panel's new **Sources** tab, or YAML in the options flow): name, icon, color, forced priority, people, duplicate delay, quiet hours ignored, muted (kept in the journal as `muted`, sent to nobody)
- The source's icon and color go to the Android notifications (`notification_icon`, `color`); the journal and the card show the integration's logo (or the icon set), tinted with its color
- Journal: click a source to show only its notifications
- Capture (both off by default): Home Assistant's persistent notifications and new repairs go through the hub too, filed under their integration
- Options flow: a menu between the rules and the sources

## 0.2.0 - 2026-11-20

### Features

- Panel: the top bar can be hidden (Settings tab, `hide_header`), the tabs staying with the menu and the buttons, like the other ha-* panels
- Card: the header illustration (`illustration_theme`) is in the visual editor
- Card: the header scene sits in the bottom-right corner, under the status pill (70 px high), so the title and subtitle stay clear at every width
- Card and panel: every count tile carries its state badge (grey at zero)

### Fixes

- Card and panel no longer change height or make the dashboard scroll by themselves on state updates: the card patches its DOM in place (it was rebuilt, collapsing for a moment, at every change of the hub's sensor), and neither reacts to entities it does not use
- Panel: a field being edited in Rules or Settings keeps its focus and its value when the data refreshes (every 30 s or at each notification)
- Card: the counts switch to two columns on narrow cards (the container query never applied; "To acknowledge" overflowed at 300 px)
- Card and panel: the status pill sits on the title's line; on a narrow panel it shows the count alone instead of hiding the title
- Card: the notification ages ("3 min") move on by themselves
- Panel: "nobody" and "failed" statuses translated; tabs reachable with the arrow keys; the toast is announced to screen readers
- A phone renamed in Home Assistant still gets its notifications (the Companion app service is named after the registered device name)
- A digest nobody can receive (no channel, or every channel failing) keeps its notifications queued for the next digest instead of dropping them as "nobody"
- The actions work on Home Assistant 2024.12 (the documented minimum): `async_loaded_entries` only came later

### Performance

- Card and panel: the hub's sensor is looked up once instead of scanning every state at each update
- The counts are computed once per change of the journal instead of once per sensor

### Maintenance

- Version consistency also checks `const.py` and the panel and card version constants
- Layout regression check (`scripts/layout_check.py`) run by the Screenshots workflow
- Tests for the WebSocket commands, the options flow, the diagnostics and the dashboard resources (coverage 76 % → 90 %)

## 0.1.1 - 2026-11-20

### Fixes

- Panel: illustrated header 90 px high, like the card and the other ha-* panels (was 110 px)

## 0.1.0 - 2026-11-20

### Features

- `notify_hub.send`: one action for every automation, with four priorities (critical, alert, info, digest), a topic, a source and the people concerned
- Each person's phones found from their `person` entity, overridable per person
- Quiet hours, duplicates dropped, digests at chosen times, away mode
- Critical notifications: Acknowledge button, escalation to everyone then to an SMS service, cleared on every phone once acknowledged
- `notify_hub.acknowledge` and `notify_hub.send_digest` actions, `notify_hub_notification` event
- Sensors: sent today, grouped, held, duplicates avoided, to acknowledge
- Sidebar panel (journal, routing, rules, settings) with a badge while something waits for an acknowledgement
- Lovelace card with an animated illustrated header and the Acknowledge button
- 22 languages
