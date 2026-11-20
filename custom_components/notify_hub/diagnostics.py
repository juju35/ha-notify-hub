"""Diagnostics: the options and the last notifications (their texts left out)."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .hub import NotifyHub


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry) -> dict[str, Any]:
    hub: NotifyHub = entry.runtime_data
    return {
        "options": dict(entry.options),
        "counts": hub.counts(),
        "people": [{k: p[k] for k in ("entity_id", "home", "channels", "custom")} for p in hub.people()],
        "journal": [
            {k: e.get(k) for k in ("time", "priority", "status", "source", "stage", "people")} for e in hub.journal[:50]
        ],
    }
