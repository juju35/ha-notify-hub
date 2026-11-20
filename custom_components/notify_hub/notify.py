"""The hub as a notify target, for the integrations that only know how to call a notify service.

- `notify.notify_hub`, a notify action (the legacy kind most integrations pick from a list of `notify.*` services):
  `message`, `title`, `target` (people) and `data`, whose `priority`, `topic`, `source`, `url` and `people` keys are
  the hub's, the rest going to the phones as is;
- the `notify.notify_hub` entity, for `notify.send_message` (message and title only).

Both go through `notify_hub.send`'s rules; the source is found from the integration that called (see sources.py).
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.notify import NotifyEntity
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    ATTR_DATA,
    ATTR_MESSAGE,
    ATTR_PEOPLE,
    ATTR_PRIORITY,
    ATTR_SOURCE,
    ATTR_TITLE,
    ATTR_TOPIC,
    ATTR_URL,
    DOMAIN,
    PRIORITIES,
    PRIORITY_INFO,
    TITLE,
)
from .hub import NotifyHub

NOTIFY_SERVICE = DOMAIN  # notify.notify_hub
ATTR_TARGET = "target"

LEGACY_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_MESSAGE): cv.string,
        vol.Optional(ATTR_TITLE): cv.string,
        vol.Optional(ATTR_TARGET): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_DATA): vol.Any(None, dict),
    },
    extra=vol.ALLOW_EXTRA,  # some integrations add their own keys: ignored
)


def _str(value: Any) -> str | None:
    return str(value) if value not in (None, "") else None


def async_register_notify_service(hass: HomeAssistant, hub: NotifyHub) -> None:
    """`notify.notify_hub`, while the hub is loaded."""

    async def handle(call: ServiceCall) -> None:
        data = dict(call.data.get(ATTR_DATA) or {})
        priority = str(data.pop(ATTR_PRIORITY, PRIORITY_INFO)).lower()
        people = call.data.get(ATTR_TARGET) or cv.ensure_list(data.pop(ATTR_PEOPLE, None) or [])
        data.pop(ATTR_PEOPLE, None)
        await hub.async_send(
            call.data[ATTR_MESSAGE],
            title=_str(call.data.get(ATTR_TITLE)),
            priority=priority if priority in PRIORITIES else PRIORITY_INFO,
            topic=_str(data.pop(ATTR_TOPIC, None)),
            source=_str(data.pop(ATTR_SOURCE, None)),
            people=[str(p) for p in people] or None,
            url=_str(data.pop(ATTR_URL, None)),
            data=data,
            context=call.context,
        )

    hass.services.async_register("notify", NOTIFY_SERVICE, handle, LEGACY_SCHEMA)


def async_remove_notify_service(hass: HomeAssistant) -> None:
    hass.services.async_remove("notify", NOTIFY_SERVICE)


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([NotifyHubEntity(entry.runtime_data)])


class NotifyHubEntity(NotifyEntity):
    """`notify.notify_hub`: `notify.send_message` through the hub, as an info."""

    _attr_has_entity_name = True
    _attr_name = None  # the device's name: notify.notify_hub
    _attr_should_poll = False

    def __init__(self, hub: NotifyHub) -> None:
        self.hub = hub
        self._attr_unique_id = f"{hub.entry.entry_id}_notify"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, hub.entry.entry_id)},
            name=TITLE,
            manufacturer="juju35",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_send_message(self, message: str, title: str | None = None) -> None:
        await self.hub.async_send(message, title=title, context=self._context)
