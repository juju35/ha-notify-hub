"""The notifications other integrations raise inside Home Assistant, sent through the hub too (options, both off by
default):
- persistent notifications (the bell of the sidebar): filed under the integration the start of their id names
  (`<domain>_…`), else Home Assistant; priority info; topic `persistent:<id>`, so the same one raised again is a
  duplicate;
- new repairs (Settings → Repairs), not the ones updated or already there at startup: filed under their integration;
  an error or a critical one is an alert, a warning an info; topic `repair:<domain>:<id>`; tapping opens the repairs.
A source's rule (sources.py) then applies as for any notification: a forced priority, its people, muted…
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from homeassistant.components import persistent_notification
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.translation import async_get_translations

from .const import CONF_CAPTURE_PERSISTENT, CONF_CAPTURE_REPAIRS, PRIORITY_ALERT, PRIORITY_INFO
from .sources import guess_domain, integration_name

if TYPE_CHECKING:
    from .hub import NotifyHub

_LOGGER = logging.getLogger(__name__)

REPAIRS_URL = "/config/repairs"


def _found(hass: HomeAssistant, domain: str, origin: str) -> dict[str, Any]:
    return {"key": domain, "name": integration_name(hass, domain), "domain": domain, "origin": origin}


class Capture:
    """Listens to the persistent notifications and the repairs while their option is on."""

    def __init__(self, hub: NotifyHub) -> None:
        self.hub = hub
        self.hass = hub.hass
        self._unsub: dict[str, Callable[[], None]] = {}

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

    # ── Persistent notifications ────────────────────────────────────────────

    @callback
    def _on_persistent(
        self, update: persistent_notification.UpdateType, notifications: dict[str, persistent_notification.Notification]
    ) -> None:
        if update != persistent_notification.UpdateType.ADDED:
            return
        for nid, notification in notifications.items():
            self.hass.async_create_task(self._send_persistent(nid, dict(notification)), eager_start=False)

    async def _send_persistent(self, nid: str, notification: dict[str, Any]) -> None:
        domain = guess_domain(self.hass, nid) or "homeassistant"
        await self.hub.async_send(
            str(notification.get("message") or ""),
            title=notification.get("title") or None,
            priority=PRIORITY_INFO,
            topic=f"persistent:{nid}",
            found=_found(self.hass, domain, nid),
        )

    # ── Repairs ─────────────────────────────────────────────────────────────

    async def _on_repair(self, event: Event) -> None:
        if event.data.get("action") != "create":
            return
        domain, issue_id = str(event.data.get("domain") or ""), str(event.data.get("issue_id") or "")
        issue = ir.async_get(self.hass).async_get_issue(domain, issue_id)
        if issue is None or issue.dismissed_version is not None or not issue.active:
            return
        title, message = await self._repair_text(issue)
        severity = str(issue.severity or "")
        await self.hub.async_send(
            message,
            title=title,
            priority=PRIORITY_ALERT if severity in ("critical", "error") else PRIORITY_INFO,
            topic=f"repair:{domain}:{issue_id}",
            url=REPAIRS_URL,
            found=_found(self.hass, issue.domain, issue_id),
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
