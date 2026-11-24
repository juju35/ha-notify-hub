"""The hub: every notification goes through `NotifyHub.async_send`, which routes, holds, groups or escalates it.

Routing: each person (`person.*`) has channels — the notify services of the mobile apps of their device trackers,
found by themselves, or the ones set in the options (`people`). A person in `excluded_people` is never notified;
whether a person is at home is read from their `presence` entity when one is set (on/home), else from the person.
By priority:
- critical: everyone at once, through the quiet hours, with the critical sound and an "Acknowledge" button; while
  nobody acknowledges, sent again to everyone after the first escalation delay, then to the SMS service after the
  second;
- alert: the people at home (everyone when nobody is home), held until the end of the quiet hours;
- info: the people at home, held during the quiet hours; with nobody home, put in the next digest (or sent to everyone
  in away mode);
- digest: kept for the next digest, sent at the digest times as one message.
A notification whose topic (else title and message) was handled less than `dedup_minutes` ago is not sent again.
Each notification is filed under its source (an integration, found by itself, see sources.py), whose rules — forced
priority, people, duplicate delay, quiet hours ignored, muted (its critical ones still sent) — apply before the above;
its icon and color go to the phones (Android) and to the panel and the card.
Everything is kept in a journal (.storage), newest first, for the panel, the card and the sensors.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from datetime import datetime, time, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_HOME, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import CALLBACK_TYPE, Context, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .capture import SENDING, Capture
from .const import (
    ACK_ACTION,
    CONF_AWAY_MODE,
    CONF_DEDUP_MINUTES,
    CONF_DIGEST_TIMES,
    CONF_ESCALATION_MINUTES,
    CONF_EXCLUDED_PEOPLE,
    CONF_PEOPLE,
    CONF_PRESENCE,
    CONF_QUIET_ENABLED,
    CONF_QUIET_END,
    CONF_QUIET_START,
    CONF_RETENTION_DAYS,
    CONF_SMS_SERVICE,
    CONF_SOURCES,
    DEFAULT_DEDUP_MINUTES,
    DEFAULT_DIGEST_TIMES,
    DEFAULT_ESCALATION_MINUTES,
    DEFAULT_QUIET_END,
    DEFAULT_QUIET_START,
    DEFAULT_RETENTION_DAYS,
    DOMAIN,
    EVENT_ACTION,
    EVENT_SENT,
    MAX_JOURNAL,
    PRIORITIES,
    PRIORITY_CRITICAL,
    PRIORITY_DIGEST,
    PRIORITY_INFO,
    SAVE_DELAY,
    STATUS_ACKNOWLEDGED,
    STATUS_DELIVERED,
    STATUS_DUPLICATE,
    STATUS_FAILED,
    STATUS_GROUPED,
    STATUS_HELD,
    STATUS_MUTED,
    STATUS_NOBODY,
    STATUS_PENDING,
    STORAGE_KEY,
    STORAGE_VERSION,
    TICK,
)
from .sources import integration_name, is_integration, resolve
from .strings import text

_LOGGER = logging.getLogger(__name__)

SERVICE_SEND_MESSAGE = "send_message"  # notify.send_message: the notify entities' action

# The statuses that count as "handled" for the duplicate check (a failed or duplicate one does not block the next).
_HANDLED = {STATUS_DELIVERED, STATUS_HELD, STATUS_GROUPED, STATUS_PENDING, STATUS_ACKNOWLEDGED}
# Lines listed in a digest message; the rest are counted.
DIGEST_LINES = 8


def parse_time(value: Any, default: str) -> time:
    """`HH:MM` (or `HH:MM:SS`) as a time; the default when it is not one."""
    for candidate in (value, default):
        try:
            parts = [int(p) for p in str(candidate).split(":")[:2]]
            return time(parts[0], parts[1])
        except (ValueError, IndexError):
            continue
    return time(0, 0)


def in_window(now: time, start: time, end: time) -> bool:
    """Whether `now` is in [start, end), the window crossing midnight when it ends before it starts."""
    if start == end:
        return False
    if start < end:
        return start <= now < end
    return now >= start or now < end


class NotifyHub:
    """Routes, holds, groups, deduplicates and escalates the notifications; keeps their journal."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.journal: list[dict[str, Any]] = []
        self._digest_sent: str | None = None  # "<date> <HH:MM>" of the last digest sent
        self._listeners: list[CALLBACK_TYPE] = []
        self._unsubs: list[Callable[[], None]] = []
        # counts() is read by the five sensors and the summary at every change: computed once per change (and per
        # hour, for the "today" and "7 days" windows) instead of parsing the whole journal six times.
        self._rev = 0
        self._counts: tuple[tuple[int, str], dict[str, int]] | None = None
        self.capture = Capture(self)

    # ── Options ─────────────────────────────────────────────────────────────

    @property
    def options(self) -> dict[str, Any]:
        return dict(self.entry.options)

    @property
    def quiet_hours(self) -> tuple[time, time] | None:
        """(start, end) of the quiet hours, None when they are off."""
        if not self.options.get(CONF_QUIET_ENABLED, True):
            return None
        return (
            parse_time(self.options.get(CONF_QUIET_START), DEFAULT_QUIET_START),
            parse_time(self.options.get(CONF_QUIET_END), DEFAULT_QUIET_END),
        )

    def is_quiet(self, now: datetime | None = None) -> bool:
        window = self.quiet_hours
        local = dt_util.as_local(now or dt_util.utcnow()).time()
        return window is not None and in_window(local, *window)

    @property
    def dedup(self) -> timedelta:
        return timedelta(minutes=float(self.options.get(CONF_DEDUP_MINUTES, DEFAULT_DEDUP_MINUTES)))

    @property
    def digest_times(self) -> list[time]:
        raw = self.options.get(CONF_DIGEST_TIMES, list(DEFAULT_DIGEST_TIMES))
        if isinstance(raw, str):
            raw = [part.strip() for part in raw.split(",") if part.strip()]
        return sorted({parse_time(value, "08:00") for value in raw})

    @property
    def escalation(self) -> tuple[float, float]:
        raw = self.options.get(CONF_ESCALATION_MINUTES, list(DEFAULT_ESCALATION_MINUTES))
        try:
            first, second = float(raw[0]), float(raw[1])
        except (TypeError, ValueError, IndexError):
            first, second = DEFAULT_ESCALATION_MINUTES
        return first, second

    def source_rule(self, key: str) -> dict[str, Any]:
        """The rule set for a source (empty when none)."""
        rules = self.options.get(CONF_SOURCES) or {}
        rule = rules.get(key) if key else None
        return dict(rule) if isinstance(rule, dict) else {}

    @property
    def sms_service(self) -> str | None:
        return str(self.options.get(CONF_SMS_SERVICE) or "").strip() or None

    # ── People and channels ─────────────────────────────────────────────────

    def people(self) -> list[dict[str, Any]]:
        """Every person: entity, name, at home, channels (the options' ones, else those found), whether set, whether
        excluded and the presence entity set for them."""
        overrides: dict[str, list[str]] = self.options.get(CONF_PEOPLE) or {}
        excluded = set(self.options.get(CONF_EXCLUDED_PEOPLE) or [])
        presence: dict[str, str] = self.options.get(CONF_PRESENCE) or {}
        out = []
        for state in sorted(self.hass.states.async_all("person"), key=lambda s: s.name.lower()):
            set_by_hand = state.entity_id in overrides
            channels = list(overrides[state.entity_id]) if set_by_hand else self._found_channels(state.entity_id)
            sensor = presence.get(state.entity_id)
            out.append(
                {
                    "entity_id": state.entity_id,
                    "name": state.name,
                    "home": self._at_home(state.state, sensor),
                    "channels": channels,
                    "custom": set_by_hand,
                    "excluded": state.entity_id in excluded,
                    "presence": sensor,
                    "picture": state.attributes.get("entity_picture"),
                }
            )
        return out

    def _at_home(self, person_state: str, sensor: str | None) -> bool:
        """At home: the presence entity's state when set and known (on, home), else the person's state."""
        other = self.hass.states.get(sensor) if sensor else None
        if other is not None and other.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return other.state in (STATE_ON, STATE_HOME)
        return person_state == STATE_HOME

    def _found_channels(self, person: str) -> list[str]:
        """The notify services of the mobile apps whose device tracker belongs to the person."""
        state = self.hass.states.get(person)
        trackers = state.attributes.get("device_trackers", []) if state else []
        entities, devices = er.async_get(self.hass), dr.async_get(self.hass)
        found: list[str] = []
        for tracker in trackers:
            entry = entities.async_get(tracker)
            if entry is None or entry.platform != "mobile_app" or entry.device_id is None:
                continue
            device = devices.async_get(entry.device_id)
            if device is None:
                continue
            # The Companion app names its notify service after the device name it registered with (the device's
            # `name`); a name given in Home Assistant (`name_by_user`) does not rename the service, so it is only
            # tried second (it used to be tried first, and a renamed phone got no notification).
            for name in (device.name, device.name_by_user):
                service = f"mobile_app_{slugify(name or '')}"
                if name and self.hass.services.has_service("notify", service):
                    if f"notify.{service}" not in found:
                        found.append(f"notify.{service}")
                    break
        return found

    def notify_services(self) -> list[str]:
        """Every channel for the panel's pickers: the legacy notify services and the notify entities (Telegram
        bot, …). Not the hub itself (a loop), nor `notify.send_message`, which needs an entity to send to."""
        services = self.hass.services.async_services().get("notify", {})
        legacy = {f"notify.{name}" for name in services if name not in (DOMAIN, SERVICE_SEND_MESSAGE)}
        return sorted(legacy | set(self._notify_entities()))

    def _own_entities(self) -> set[str]:
        """The hub's own notify entities (`notify.notify_hub`, whatever it was renamed to)."""
        entities = er.async_get(self.hass)
        own = {e.entity_id for e in er.async_entries_for_config_entry(entities, self.entry.entry_id)}
        return own | {f"notify.{DOMAIN}"}

    def _notify_entities(self) -> list[str]:
        """The notify entities of the other integrations, sent to with `notify.send_message`."""
        own = self._own_entities()
        return [e for e in self.hass.states.async_entity_ids("notify") if e not in own]

    def _targets(self, names: list[str] | None, *, present_only: bool) -> list[dict[str, Any]]:
        """The people to notify: those named (entity or name), else those at home (`present_only`), else everyone."""
        people = [p for p in self.people() if p["channels"] and not p["excluded"]]
        if names:
            wanted = {n.lower() for n in names}
            return [p for p in people if p["entity_id"].lower() in wanted or p["name"].lower() in wanted]
        if present_only:
            return [p for p in people if p["home"]]
        return people

    # ── Lifecycle ───────────────────────────────────────────────────────────

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        journal = data.get("journal")
        self.journal = [e for e in journal if isinstance(e, dict) and e.get("id")] if isinstance(journal, list) else []
        self._digest_sent = data.get("digest_sent")
        if self._digest_sent is None:
            # A first start sends no digest for a time already passed today.
            self._digest_sent = self._last_digest_slot(dt_util.now())
        self._unsubs.append(async_track_time_interval(self.hass, self._async_tick, TICK))
        self._unsubs.append(self.hass.bus.async_listen(EVENT_ACTION, self._async_on_action))
        self.capture.async_sync()

    @callback
    def async_options_updated(self) -> None:
        """The options changed: the captures follow them, the entities and the panel show them."""
        self.capture.async_sync()
        self._changed()

    async def async_unload(self) -> None:
        self.capture.async_stop()
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        return {"journal": self.journal[:MAX_JOURNAL], "digest_sent": self._digest_sent}

    def _changed(self) -> None:
        self._rev += 1
        self._store.async_delay_save(self._data, SAVE_DELAY)
        for listener in list(self._listeners):
            listener()

    @callback
    def async_add_listener(self, update: CALLBACK_TYPE) -> Callable[[], None]:
        self._listeners.append(update)
        return lambda: self._listeners.remove(update)

    # ── Sending ─────────────────────────────────────────────────────────────

    async def async_send(
        self,
        message: str,
        *,
        title: str | None = None,
        priority: str = PRIORITY_INFO,
        topic: str | None = None,
        source: str | None = None,
        people: list[str] | None = None,
        url: str | None = None,
        data: dict[str, Any] | None = None,
        context: Context | None = None,
        found: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Handle one notification; its journal entry (with its `status`) is returned.

        The source is resolved from `source` (else the caller found from `context`), unless `found` gives it already
        (a captured notification); its rule may force the priority and the people."""
        now = dt_util.utcnow()
        src = found or resolve(self.hass, source, context)
        rule = self.source_rule(src["key"])
        if rule.get("priority") in PRIORITIES:
            priority = rule["priority"]
        if not people and rule.get("people"):
            people = list(rule["people"])
        entry: dict[str, Any] = {
            "id": uuid.uuid4().hex[:12],
            "time": now.isoformat(),
            "title": title or "",
            "message": message,
            "priority": priority,
            "topic": topic or f"{title or ''}|{message}",
            "source": rule.get("name") or src["name"],
            "source_key": src["key"],
            "domain": src.get("domain"),
            "origin": src.get("origin"),
            "url": url,
            "data": data or {},
            "requested": list(people or []),
            "people": [],
            "status": STATUS_DELIVERED,
        }
        dedup = self.dedup
        if isinstance(rule.get("dedup_minutes"), int | float):
            dedup = timedelta(minutes=float(rule["dedup_minutes"]))
        # A muted source is kept quiet, but never its critical notifications (a leak, smoke…).
        if rule.get("muted") and priority != PRIORITY_CRITICAL:
            entry["status"] = STATUS_MUTED
        elif self._duplicate(entry, now, dedup):
            entry["status"] = STATUS_DUPLICATE
        elif priority == PRIORITY_DIGEST:
            entry["status"] = STATUS_GROUPED
        elif priority == PRIORITY_CRITICAL:
            await self._send_critical(entry, people)
        elif self.is_quiet(now) and not rule.get("ignore_quiet"):
            entry["status"] = STATUS_HELD
        else:
            await self._send_normal(entry, people)
        self._record(entry)
        return entry

    def _duplicate(self, entry: dict[str, Any], now: datetime, dedup: timedelta) -> bool:
        since = now - dedup
        for past in self.journal:
            if dt_util.parse_datetime(past["time"]) < since:
                break
            if past["topic"] == entry["topic"] and past["status"] in _HANDLED:
                return True
        return False

    async def _send_normal(self, entry: dict[str, Any], people: list[str] | None) -> None:
        """An alert or an info: the people at home (or the ones named); with nobody home, see the module doc."""
        targets = self._targets(people, present_only=True)
        if not targets and not people:
            if entry["priority"] == PRIORITY_INFO and not self.options.get(CONF_AWAY_MODE, False):
                entry["status"] = STATUS_GROUPED
                return
            targets = self._targets(None, present_only=False)
        await self._deliver(entry, targets)

    async def _send_critical(self, entry: dict[str, Any], people: list[str] | None) -> None:
        targets = self._targets(people, present_only=False)
        await self._deliver(entry, targets, critical=True)
        if entry["status"] == STATUS_DELIVERED:
            entry["status"] = STATUS_PENDING
            entry["stage"] = 0
            entry["next"] = (dt_util.utcnow() + timedelta(minutes=self.escalation[0])).isoformat()

    async def _deliver(self, entry: dict[str, Any], targets: list[dict[str, Any]], *, critical: bool = False) -> None:
        """Send to every channel of the targets; the status says whether anyone got it."""
        if not targets:
            entry["status"] = STATUS_NOBODY
            return
        reached: list[str] = []
        for person in targets:
            ok = False
            for channel in person["channels"]:
                ok = await self._call(channel, entry, critical=critical) or ok
            if ok:
                reached.append(person["name"])
        entry["people"] = sorted(set(entry["people"]) | set(reached))
        entry["status"] = STATUS_DELIVERED if reached else STATUS_FAILED

    async def _call(self, channel: str, entry: dict[str, Any], *, critical: bool) -> bool:
        domain, _, service = channel.partition(".")
        payload: dict[str, Any] = {"message": entry["message"]}
        if entry["title"]:
            payload["title"] = entry["title"]
        legacy = service not in (DOMAIN, SERVICE_SEND_MESSAGE) and self.hass.services.has_service(domain, service)
        if domain == "notify" and legacy:
            payload["data"] = self._mobile_data(entry, critical=critical, mobile=service.startswith("mobile_app_"))
        elif domain == "notify" and channel not in self._own_entities() and self.hass.states.get(channel) is not None:
            # A notify entity: `notify.send_message` takes a message and a title, no `data`.
            payload["entity_id"] = channel
            service = SERVICE_SEND_MESSAGE
        else:
            _LOGGER.warning("Notify Hub: %s is not a notify service or entity", channel)
            return False
        token = SENDING.set(True)
        try:
            await self.hass.services.async_call(domain, service, payload, blocking=True)
        except Exception:  # noqa: BLE001 — one channel failing must not stop the others
            _LOGGER.exception("Notify Hub could not send through %s", channel)
            return False
        finally:
            SENDING.reset(token)
        return True

    def _mobile_data(self, entry: dict[str, Any], *, critical: bool, mobile: bool) -> dict[str, Any]:
        """The notification's `data`: the caller's, plus for the mobile apps a tag (replaces the same notification),
        a group, the link, and for a critical one the critical sound and the Acknowledge button."""
        data = dict(entry.get("data") or {})
        if not mobile:
            return data
        data.setdefault("tag", entry["id"])
        if entry["source"]:
            data.setdefault("group", entry["source"])
        # The source's look (Android: the small icon and the accent of the notification).
        rule = self.source_rule(entry.get("source_key") or "")
        if str(rule.get("icon") or "").startswith("mdi:"):
            data.setdefault("notification_icon", rule["icon"])
        if rule.get("color"):
            data.setdefault("color", rule["color"])
        if entry.get("url"):
            data.setdefault("url", entry["url"])
            data.setdefault("clickAction", entry["url"])
        if critical:
            data.setdefault(
                "push", {"sound": {"name": "default", "critical": 1, "volume": 1.0}, "interruption-level": "critical"}
            )
            data.setdefault("ttl", 0)
            data.setdefault("priority", "high")
            data.setdefault("channel", "alarm_stream")
            data.setdefault(
                "actions", [{"action": f"{ACK_ACTION}_{entry['id']}", "title": text(self.hass, "acknowledge")}]
            )
        return data

    def _record(self, entry: dict[str, Any]) -> None:
        self.journal.insert(0, entry)
        del self.journal[MAX_JOURNAL:]
        self.hass.bus.async_fire(EVENT_SENT, {k: v for k, v in entry.items() if k != "data"})
        self._changed()

    # ── Acknowledgement ─────────────────────────────────────────────────────

    async def async_acknowledge(self, entry_id: str | None = None, by: str | None = None) -> int:
        """Acknowledge one critical notification (or every pending one): no more escalation, cleared on the
        phones. The number acknowledged."""
        done = 0
        for entry in self.journal:
            if entry["status"] != STATUS_PENDING or (entry_id and entry["id"] != entry_id):
                continue
            entry["status"] = STATUS_ACKNOWLEDGED
            entry["acknowledged"] = dt_util.utcnow().isoformat()
            entry["acknowledged_by"] = by
            entry.pop("next", None)
            done += 1
            await self._clear(entry)
        if done:
            self._changed()
        return done

    async def _clear(self, entry: dict[str, Any]) -> None:
        """Remove an acknowledged notification from the phones it went to."""
        for person in self.people():
            for channel in person["channels"]:
                domain, _, service = channel.partition(".")
                if not service.startswith("mobile_app_") or not self.hass.services.has_service(domain, service):
                    continue
                try:
                    await self.hass.services.async_call(
                        domain, service, {"message": "clear_notification", "data": {"tag": entry["id"]}}, blocking=False
                    )
                except Exception:  # noqa: BLE001
                    _LOGGER.debug("Could not clear %s on %s", entry["id"], channel)

    async def _async_on_action(self, event: Event) -> None:
        action = str(event.data.get("action") or "")
        if action.startswith(f"{ACK_ACTION}_"):
            user = event.context.user_id
            name = None
            if user and (found := await self.hass.auth.async_get_user(user)):
                name = found.name
            await self.async_acknowledge(action.removeprefix(f"{ACK_ACTION}_"), name)

    # ── The tick: quiet hours over, digests, escalation, retention ──────────

    async def _async_tick(self, now: datetime | None = None) -> None:
        now = now or dt_util.utcnow()
        changed = False
        if not self.is_quiet(now):
            changed = await self._release_held() or changed
        slot = self._last_digest_slot(dt_util.as_local(now))
        if slot and slot != self._digest_sent:
            self._digest_sent = slot
            await self.async_send_digest()
            changed = True
        changed = await self._escalate(now) or changed
        changed = self._prune(now) or changed
        if changed:
            self._changed()

    async def _release_held(self) -> bool:
        held = [e for e in reversed(self.journal) if e["status"] == STATUS_HELD]
        for entry in held:
            entry["released"] = dt_util.utcnow().isoformat()
            await self._send_normal(entry, entry.get("requested") or None)
        return bool(held)

    def _last_digest_slot(self, local: datetime) -> str | None:
        """The digest time of today already passed, as "<date> <HH:MM>", None before the first one."""
        passed = [t for t in self.digest_times if t <= local.time()]
        return f"{local.date().isoformat()} {passed[-1].strftime('%H:%M')}" if passed else None

    async def async_send_digest(self) -> int:
        """Send what waits for the digest as one message (everyone at home, else everyone); the number sent (0 when
        nobody could be reached: they wait for the next digest)."""
        waiting = [e for e in reversed(self.journal) if e["status"] == STATUS_GROUPED]
        if not waiting:
            return 0
        lines = [f"• {e['title']} — {e['message']}" if e["title"] else f"• {e['message']}" for e in waiting]
        more = len(lines) - DIGEST_LINES
        message = "\n".join(lines[:DIGEST_LINES]) + (f"\n{text(self.hass, 'more', n=more)}" if more > 0 else "")
        digest = {
            "id": uuid.uuid4().hex[:12],
            "title": text(self.hass, "digest", n=len(waiting)),
            "message": message,
            "priority": PRIORITY_DIGEST,
            "source": "",
            "people": [],
            "data": {},
        }
        targets = self._targets(None, present_only=True) or self._targets(None, present_only=False)
        await self._deliver(digest, targets)
        if digest["status"] != STATUS_DELIVERED:
            # Nobody reachable (no channel, or every channel failed): the notifications stay queued for the next
            # digest instead of being lost as "nobody".
            _LOGGER.warning(
                "Notify Hub: nobody reachable for the digest, %s notifications kept for the next one", len(waiting)
            )
            return 0
        for entry in waiting:
            entry["status"] = STATUS_DELIVERED
            entry["people"] = digest["people"]
            entry["digest"] = dt_util.utcnow().isoformat()
        self._changed()
        return len(waiting)

    async def _escalate(self, now: datetime) -> bool:
        changed = False
        first, second = self.escalation
        for entry in self.journal:
            if entry["status"] != STATUS_PENDING or not entry.get("next"):
                continue
            if dt_util.parse_datetime(entry["next"]) > now:
                continue
            stage = int(entry.get("stage", 0)) + 1
            entry["stage"] = stage
            changed = True
            if stage == 1:
                await self._deliver(entry, self._targets(None, present_only=False), critical=True)
                entry["status"] = STATUS_PENDING
                entry["next"] = (now + timedelta(minutes=max(second - first, 0))).isoformat()
            else:
                entry.pop("next", None)
                if self.sms_service:
                    await self._call(self.sms_service, {**entry, "data": {}}, critical=False)
                    entry["sms"] = True
        return changed

    def _prune(self, now: datetime) -> bool:
        days = float(self.options.get(CONF_RETENTION_DAYS, DEFAULT_RETENTION_DAYS))
        limit = now - timedelta(days=days)
        keep = [
            e
            for e in self.journal
            if dt_util.parse_datetime(e["time"]) >= limit
            or e["status"] in (STATUS_PENDING, STATUS_HELD, STATUS_GROUPED)
        ]
        if len(keep) == len(self.journal):
            return False
        self.journal = keep
        return True

    # ── Figures (sensors, card, panel) ──────────────────────────────────────

    def counts(self) -> dict[str, int]:
        key = (self._rev, dt_util.now().strftime("%Y-%m-%d %H"))
        if self._counts is not None and self._counts[0] == key:
            return dict(self._counts[1])
        result = self._count()
        self._counts = (key, result)
        return dict(result)

    def _count(self) -> dict[str, int]:
        today = dt_util.start_of_local_day()
        week = dt_util.utcnow() - timedelta(days=7)
        sent = grouped = duplicates = pending = held = 0
        for entry in self.journal:
            when = dt_util.parse_datetime(entry["time"])
            status = entry["status"]
            if status in (STATUS_DELIVERED, STATUS_PENDING, STATUS_ACKNOWLEDGED) and when >= today:
                sent += 1
            if status == STATUS_GROUPED:
                grouped += 1
            if status == STATUS_HELD:
                held += 1
            if status == STATUS_PENDING:
                pending += 1
            if status == STATUS_DUPLICATE and when >= week:
                duplicates += 1
        return {"sent_today": sent, "grouped": grouped, "held": held, "duplicates": duplicates, "pending": pending}

    def next_digest(self) -> str | None:
        """Local time (HH:MM) of the next digest time (None without any digest time)."""
        times = self.digest_times
        if not times:
            return None
        local = dt_util.now().time()
        upcoming = [t for t in times if t > local] or times
        return upcoming[0].strftime("%H:%M")

    @staticmethod
    def key_of(entry: dict[str, Any]) -> str:
        """The source key of a journal entry (older entries only have the source's text)."""
        if "source_key" in entry:
            return str(entry["source_key"] or "")
        return slugify(entry.get("source") or "")

    def look(self, entries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        """{source key: name, domain, icon, color} of the sources of these entries, for the card and the panel."""
        out: dict[str, dict[str, Any]] = {}
        for entry in entries:
            key = self.key_of(entry)
            if not key or key in out:
                continue
            rule = self.source_rule(key)
            out[key] = {
                "name": rule.get("name") or entry.get("source") or key,
                "domain": entry.get("domain"),
                "icon": rule.get("icon"),
                "color": rule.get("color"),
            }
        return out

    def sources(self) -> list[dict[str, Any]]:
        """Every source seen in the journal or given a rule: its look, its rule, its counts (7 days) and the last
        notification, the busiest first."""
        week = dt_util.utcnow() - timedelta(days=7)
        seen: dict[str, dict[str, Any]] = {}
        for entry in self.journal:  # newest first: the first one met is the last notification
            key = self.key_of(entry)
            if not key:
                continue
            item = seen.setdefault(
                key,
                {
                    "key": key,
                    "name": entry.get("source") or key,
                    "domain": entry.get("domain"),
                    "origins": [],
                    "count": 0,
                    "muted": 0,
                    "last": entry["time"],
                },
            )
            if dt_util.parse_datetime(entry["time"]) >= week:
                item["count"] += 1
                item["muted"] += entry["status"] == STATUS_MUTED
            if (origin := entry.get("origin")) and origin not in item["origins"] and len(item["origins"]) < 5:
                item["origins"].append(origin)
        for key, rule in (self.options.get(CONF_SOURCES) or {}).items():
            if key not in seen:
                # Set ahead of its first notification: an integration shows its name and logo already.
                domain = key if is_integration(self.hass, key) else None
                name = integration_name(self.hass, key) if domain else key
                seen[key] = {
                    "key": key,
                    "name": name,
                    "domain": domain,
                    "origins": [],
                    "count": 0,
                    "muted": 0,
                    "last": None,
                }
            item = seen[key]
            if isinstance(rule, dict):
                item["rule"] = rule
                item["name"] = rule.get("name") or item["name"]
        for item in seen.values():
            item.setdefault("rule", {})
        return sorted(seen.values(), key=lambda i: (-i["count"], str(i["name"]).lower()))

    def summary(self, limit: int = 20) -> dict[str, Any]:
        """What the card and the panel show."""
        quiet = self.quiet_hours
        recent = self.journal[:limit]
        return {
            "counts": self.counts(),
            "quiet": self.is_quiet(),
            "quiet_hours": [t.strftime("%H:%M") for t in quiet] if quiet else None,
            "next_digest": self.next_digest(),
            "recent": [{**{k: v for k, v in e.items() if k != "data"}, "source_key": self.key_of(e)} for e in recent],
            "sources": self.look(recent),
        }
