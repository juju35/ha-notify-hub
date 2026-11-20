"""Notify Hub: one action for every notification of the house, routed by presence, quiet hours and priority."""

from __future__ import annotations

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import (
    ATTR_DATA,
    ATTR_ID,
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
    SERVICE_ACKNOWLEDGE,
    SERVICE_SEND,
    SERVICE_SEND_DIGEST,
)
from .hub import NotifyHub
from .panel import async_register_panel, async_remove_card, async_unregister_panel
from .websocket import async_register_websocket

PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type NotifyHubConfigEntry = ConfigEntry[NotifyHub]

SEND_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_MESSAGE): cv.string,
        vol.Optional(ATTR_TITLE): cv.string,
        vol.Optional(ATTR_PRIORITY, default=PRIORITY_INFO): vol.In(PRIORITIES),
        vol.Optional(ATTR_TOPIC): cv.string,
        vol.Optional(ATTR_SOURCE): cv.string,
        vol.Optional(ATTR_PEOPLE): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(ATTR_URL): cv.string,
        vol.Optional(ATTR_DATA): dict,
    }
)
ACK_SCHEMA = vol.Schema({vol.Optional(ATTR_ID): cv.string})


def hub_of(hass: HomeAssistant) -> NotifyHub:
    """The loaded hub (single config entry)."""
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        return entry.runtime_data
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async def send(call: ServiceCall) -> ServiceResponse:
        data = dict(call.data)
        entry = await hub_of(hass).async_send(
            data.pop(ATTR_MESSAGE),
            title=data.get(ATTR_TITLE),
            priority=data.get(ATTR_PRIORITY, PRIORITY_INFO),
            topic=data.get(ATTR_TOPIC),
            source=data.get(ATTR_SOURCE),
            people=data.get(ATTR_PEOPLE),
            url=data.get(ATTR_URL),
            data=data.get(ATTR_DATA),
        )
        return {"id": entry["id"], "status": entry["status"], "people": entry["people"]}

    async def acknowledge(call: ServiceCall) -> ServiceResponse:
        user = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        count = await hub_of(hass).async_acknowledge(call.data.get(ATTR_ID), user.name if user else None)
        return {"acknowledged": count}

    async def send_digest(call: ServiceCall) -> ServiceResponse:
        return {"sent": await hub_of(hass).async_send_digest()}

    hass.services.async_register(DOMAIN, SERVICE_SEND, send, SEND_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(
        DOMAIN, SERVICE_ACKNOWLEDGE, acknowledge, ACK_SCHEMA, supports_response=SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SEND_DIGEST, send_digest, vol.Schema({}), supports_response=SupportsResponse.OPTIONAL
    )
    async_register_websocket(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: NotifyHubConfigEntry) -> bool:
    hub = NotifyHub(hass, entry)
    await hub.async_load()
    entry.runtime_data = hub
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    await async_register_panel(hass)
    return True


async def _async_options_updated(hass: HomeAssistant, entry: NotifyHubConfigEntry) -> None:
    # The options are read live by the hub: the entities and the panel only need to show them.
    entry.runtime_data._changed()


async def async_unload_entry(hass: HomeAssistant, entry: NotifyHubConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_unload()
        async_unregister_panel(hass)
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: NotifyHubConfigEntry) -> None:
    """The integration removed: its card leaves the dashboard resources."""
    await async_remove_card(hass)
