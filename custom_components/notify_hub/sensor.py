"""Sensors: notifications sent today, waiting for the digest, held by the quiet hours, duplicates avoided, critical
ones waiting to be acknowledged (the card's and the sidebar badge's source)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, TITLE
from .hub import NotifyHub

KEYS = ("sent_today", "grouped", "held", "duplicates", "pending")


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    hub: NotifyHub = entry.runtime_data
    async_add_entities(NotifyHubSensor(hub, key) for key in KEYS)


class NotifyHubSensor(SensorEntity):
    """One count of the hub; the `pending` one carries what the card shows."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, hub: NotifyHub, key: str) -> None:
        self.hub = hub
        self.key = key
        self._attr_translation_key = key
        self._attr_unique_id = f"{hub.entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, hub.entry.entry_id)},
            name=TITLE,
            manufacturer="juju35",
            entry_type=DeviceEntryType.SERVICE,
        )
        if key == "pending":
            # The card's source: every change of the journal shows at once, kept out of the recorder.
            self._unrecorded_attributes = frozenset(
                {"recent", "counts", "quiet", "quiet_hours", "next_digest", "sources"}
            )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.hub.async_add_listener(self._update))

    @callback
    def _update(self) -> None:
        self.async_write_ha_state()

    @property
    def native_value(self) -> int:
        return self.hub.counts()[self.key]

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if self.key != "pending":
            return None
        return {"notify_hub": True, **self.hub.summary(10)}
