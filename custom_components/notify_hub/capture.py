"""The notifications other integrations raise inside Home Assistant, sent through the hub too (options, both off by
default):
- persistent notifications (the bell of the sidebar): filed under the integration the start of their id names
  (`<domain>_…`), else Home Assistant; priority info; topic `persistent:<id>`, so the same one raised again is a
  duplicate;
- new repairs (Settings → Repairs), not the ones updated or already there at startup: filed under their integration;
  an error or a critical one is an alert, a warning an info; topic `repair:<domain>:<id>`; tapping opens the repairs.
A source's rule (sources.py) then applies as for any notification: a forced priority, its people, muted…

Held back (options, off by default), so that a passing anomaly does not notify:
- `capture_grace_minutes`: during these minutes after Home Assistant started, a captured notification waits for the
  end of the grace period (resources missing while the integrations load, then back);
- `capture_delay_minutes`: every captured notification waits this long;
- `capture_rules`: a list of rules, the first one matching wins — `kind` (repair / persistent), `domain` (the
  integration), `id` (the repair's or the notification's id, `*` and `?` as wildcards: `restart_required_*`), then
  `action` (send, ignore, journal: kept in the journal only, digest: in the next digest), `delay_minutes` (instead of
  `capture_delay_minutes`) and `topic` (a shared topic: notifications of several sources about the same incident
  count as duplicates of the first within the duplicate delay).
A held notification is sent only if it is still there at the end of its wait: a repair fixed, a notification
dismissed meanwhile is dropped. A source whose rule forces the critical priority is never held back.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from contextvars import ContextVar
from datetime import datetime, timedelta
from fnmatch import fnmatchcase
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import persistent_notification
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.translation import async_get_translations
from homeassistant.util import dt as dt_util

from .const import (
    CONF_CAPTURE_DELAY,
    CONF_CAPTURE_GRACE,
    CONF_CAPTURE_PERSISTENT,
    CONF_CAPTURE_REPAIRS,
    CONF_CAPTURE_RULES,
    PRIORITY_ALERT,
    PRIORITY_CRITICAL,
    PRIORITY_DIGEST,
    PRIORITY_INFO,
)
from .sources import guess_domain, integration_name

if TYPE_CHECKING:
    from .hub import NotifyHub

_LOGGER = logging.getLogger(__name__)

REPAIRS_URL = "/config/repairs"

# True while the hub sends through a channel: a persistent notification raised then is the hub's own (a channel such as
# notify.persistent_notification), not one to capture, or it would be sent again, and again.
SENDING: ContextVar[bool] = ContextVar("notify_hub_sending", default=False)


KINDS = ("repair", "persistent")
ACTIONS = ("send", "ignore", "journal", "digest")
_MINUTES = vol.All(vol.Coerce(float), vol.Range(min=0, max=1440))
CAPTURE_RULE_SCHEMA = vol.Schema(
    {
        vol.Optional("kind"): vol.In(KINDS),
        vol.Optional("domain"): vol.All(str, vol.Strip, vol.Lower),
        vol.Optional("id"): vol.All(str, vol.Strip),
        vol.Optional("action"): vol.In(ACTIONS),
        vol.Optional("delay_minutes"): _MINUTES,
        vol.Optional("topic"): vol.All(str, vol.Strip, vol.Length(min=1)),
    }
)
CAPTURE_RULES_SCHEMA = vol.All(vol.Any(None, [CAPTURE_RULE_SCHEMA]), lambda v: [r for r in v or [] if r])


def match_rule(rules: list[dict[str, Any]], kind: str, domain: str, item_id: str) -> dict[str, Any]:
    """The first capture rule matching a captured notification, `{}` when none does."""
    for rule in rules or []:
        if rule.get("kind") not in (None, kind):
            continue
        if rule.get("domain") not in (None, domain.lower()):
            continue
        if rule.get("id") is not None and not fnmatchcase(item_id, rule["id"]):
            continue
        return rule
    return {}


def _found(hass: HomeAssistant, domain: str, origin: str) -> dict[str, Any]:
    return {"key": domain, "name": integration_name(hass, domain), "domain": domain, "origin": origin}


class Capture:
    """Listens to the persistent notifications and the repairs while their option is on."""

    def __init__(self, hub: NotifyHub) -> None:
        self.hub = hub
        self.hass = hub.hass
        self._unsub: dict[str, Callable[[], None]] = {}
        # Held notifications, by (kind, id): their timer.
        self._held: dict[tuple[str, str], Callable[[], None]] = {}
        # When Home Assistant started (the grace period counts from it); None while it is starting. Set up on a
        # running Home Assistant (a reload), there is no grace period.
        self._started: datetime | None = dt_util.utcnow() - timedelta(days=1) if hub.hass.is_running else None
        if self._started is None:
            hub.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._on_started)

    @callback
    def _on_started(self, _event: Event) -> None:
        self._started = dt_util.utcnow()

    @callback
    def async_sync(self) -> None:
        """Start or stop each listener as its option says (called at setup and on every options change)."""
        wanted = {
            CONF_CAPTURE_PERSISTENT: bool(self.hub.options.get(CONF_CAPTURE_PERSISTENT)),
            CONF_CAPTURE_REPAIRS: bool(self.hub.options.get(CONF_CAPTURE_REPAIRS)),
        }
        for key, on in wanted.items():
            if on and key not in self._unsub:
                self._unsub[key] = (
                    persistent_notification.async_register_callback(self.hass, self._on_persistent)
                    if key == CONF_CAPTURE_PERSISTENT
                    else self.hass.bus.async_listen(ir.EVENT_REPAIRS_ISSUE_REGISTRY_UPDATED, self._on_repair)
                )
            elif not on and key in self._unsub:
                self._unsub.pop(key)()

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsub.values():
            unsub()
        self._unsub.clear()
        for cancel in self._held.values():
            cancel()
        self._held.clear()

    # ── Holding back ────────────────────────────────────────────────────────

    def _wait(self, rule: dict[str, Any], domain: str) -> float:
        """Seconds a captured notification waits: its delay, at least to the end of the grace period."""
        if self.hub.source_rule(domain).get("priority") == PRIORITY_CRITICAL:
            return 0.0
        options = self.hub.options
        delay = rule.get("delay_minutes", options.get(CONF_CAPTURE_DELAY) or 0)
        wait = float(delay or 0) * 60
        grace = float(options.get(CONF_CAPTURE_GRACE) or 0) * 60
        if grace:
            since = (dt_util.utcnow() - self._started).total_seconds() if self._started else 0.0
            wait = max(wait, grace - since)
        return max(wait, 0.0)

    def _handle(
        self,
        kind: str,
        key: str,
        domain: str,
        item_id: str,
        send: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]],
        still_there: Callable[[], bool],
    ) -> None:
        """Send a captured notification now, or once its wait is over if it is still there; or drop it."""
        rule = match_rule(self.hub.options.get(CONF_CAPTURE_RULES) or [], kind, domain, item_id)
        if rule.get("action") == "ignore":
            return
        held = (kind, key)
        self._cancel(held)
        wait = self._wait(rule, domain)
        if not wait:
            self.hass.async_create_task(send(rule), eager_start=False)
            return

        @callback
        def fire(_now: datetime) -> None:
            self._held.pop(held, None)
            if still_there():
                self.hass.async_create_task(send(rule), eager_start=False)

        self._held[held] = async_call_later(self.hass, wait, fire)

    @callback
    def _cancel(self, key: tuple[str, str]) -> None:
        cancel = self._held.pop(key, None)
        if cancel:
            cancel()

    def _send_kwargs(self, rule: dict[str, Any], priority: str, topic: str) -> dict[str, Any]:
        action = rule.get("action")
        return {
            "priority": PRIORITY_DIGEST if action == "digest" else priority,
            "topic": rule.get("topic") or topic,
            "journal_only": action == "journal",
        }

    # ── Persistent notifications ────────────────────────────────────────────

    @callback
    def _on_persistent(
        self, update: persistent_notification.UpdateType, notifications: dict[str, persistent_notification.Notification]
    ) -> None:
        if update == persistent_notification.UpdateType.REMOVED:
            # Dismissed while held back: never sent.
            for nid in notifications:
                self._cancel(("persistent", nid))
            return
        if update != persistent_notification.UpdateType.ADDED or SENDING.get():
            return
        for nid, notification in notifications.items():
            domain = guess_domain(self.hass, nid) or "homeassistant"
            # A held one is dropped by its REMOVED update, so it is still there when its wait ends.
            self._handle(
                "persistent",
                nid,
                domain,
                nid,
                lambda rule, nid=nid, n=dict(notification), d=domain: self._send_persistent(nid, n, d, rule),
                lambda: True,
            )

    async def _send_persistent(self, nid: str, notification: dict[str, Any], domain: str, rule: dict[str, Any]) -> None:
        await self.hub.async_send(
            str(notification.get("message") or ""),
            title=notification.get("title") or None,
            found=_found(self.hass, domain, nid),
            **self._send_kwargs(rule, PRIORITY_INFO, f"persistent:{nid}"),
        )

    # ── Repairs ─────────────────────────────────────────────────────────────

    def _issue(self, domain: str, issue_id: str) -> ir.IssueEntry | None:
        issue = ir.async_get(self.hass).async_get_issue(domain, issue_id)
        if issue is None or issue.dismissed_version is not None or not issue.active:
            return None
        return issue

    @callback
    def _on_repair(self, event: Event) -> None:
        action = event.data.get("action")
        domain, issue_id = str(event.data.get("domain") or ""), str(event.data.get("issue_id") or "")
        key = f"{domain}:{issue_id}"
        if action == "remove":
            # Fixed (or gone) while held back: never sent.
            self._cancel(("repair", key))
            return
        if action != "create" or self._issue(domain, issue_id) is None:
            return
        self._handle(
            "repair",
            key,
            domain,
            issue_id,
            lambda rule: self._send_repair(domain, issue_id, rule),
            lambda: self._issue(domain, issue_id) is not None,
        )

    async def _send_repair(self, domain: str, issue_id: str, rule: dict[str, Any]) -> None:
        issue = self._issue(domain, issue_id)
        if issue is None:
            return
        title, message = await self._repair_text(issue)
        severity = str(issue.severity or "")
        await self.hub.async_send(
            message,
            title=title,
            url=REPAIRS_URL,
            found=_found(self.hass, issue.domain, issue_id),
            **self._send_kwargs(
                rule,
                PRIORITY_ALERT if severity in ("critical", "error") else PRIORITY_INFO,
                f"repair:{domain}:{issue_id}",
            ),
        )

    async def _repair_text(self, issue: ir.IssueEntry) -> tuple[str, str]:
        """The repair's title (in Home Assistant's language) and a short message."""
        name = integration_name(self.hass, issue.domain)
        title = ""
        if issue.translation_key:
            domain = getattr(issue, "translation_domain", None) or issue.domain
            key = f"component.{domain}.issues.{issue.translation_key}.title"
            try:
                strings = await async_get_translations(self.hass, self.hass.config.language, "issues", [domain])
                title = strings.get(key, "")
                for name_, value in (issue.translation_placeholders or {}).items():
                    title = title.replace("{" + name_ + "}", str(value))
            except Exception:  # noqa: BLE001 — a missing translation leaves the id
                _LOGGER.debug("No translation for the repair %s", key)
        return title or issue.issue_id.replace("_", " "), name
