"""WebSocket commands of the panel: its state, acknowledge, send a test or the digest now, save the options."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import (
    CONF_AWAY_MODE,
    CONF_CAPTURE_PERSISTENT,
    CONF_CAPTURE_REPAIRS,
    CONF_DEDUP_MINUTES,
    CONF_DIGEST_TIMES,
    CONF_ESCALATION_MINUTES,
    CONF_HIDE_HEADER,
    CONF_PEOPLE,
    CONF_QUIET_ENABLED,
    CONF_QUIET_END,
    CONF_QUIET_START,
    CONF_RETENTION_DAYS,
    CONF_SMS_SERVICE,
    CONF_SOURCES,
    DOMAIN,
    HIDE_HEADER_MODES,
    MAX_JOURNAL,
    PRIORITIES,
    PRIORITY_INFO,
    VERSION,
)
from .hub import NotifyHub, parse_time
from .sources import SOURCES_SCHEMA, clean_sources

# What the panel may change, and how each value is checked.
OPTION_SCHEMA = vol.Schema(
    {
        vol.Optional(CONF_QUIET_ENABLED): bool,
        vol.Optional(CONF_QUIET_START): str,
        vol.Optional(CONF_QUIET_END): str,
        vol.Optional(CONF_DEDUP_MINUTES): vol.All(vol.Coerce(int), vol.Range(min=0, max=1440)),
        vol.Optional(CONF_DIGEST_TIMES): [str],
        vol.Optional(CONF_ESCALATION_MINUTES): vol.All(
            [vol.All(vol.Coerce(int), vol.Range(min=1, max=240))], vol.Length(2, 2)
        ),
        vol.Optional(CONF_SMS_SERVICE): vol.Any(None, str),
        vol.Optional(CONF_AWAY_MODE): bool,
        vol.Optional(CONF_RETENTION_DAYS): vol.All(vol.Coerce(int), vol.Range(min=1, max=90)),
        vol.Optional(CONF_PEOPLE): {str: [str]},
        vol.Optional(CONF_HIDE_HEADER): vol.In(HIDE_HEADER_MODES),
        vol.Optional(CONF_SOURCES): SOURCES_SCHEMA,
        vol.Optional(CONF_CAPTURE_PERSISTENT): bool,
        vol.Optional(CONF_CAPTURE_REPAIRS): bool,
    }
)


def _hub(hass: HomeAssistant) -> NotifyHub | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    return None


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    for command in (ws_state, ws_acknowledge, ws_test, ws_digest, ws_save):
        websocket_api.async_register_command(hass, command)


def _not_loaded(connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    connection.send_error(msg["id"], "not_loaded", "Notify Hub is not set up")


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/state",
        vol.Optional("limit", default=200): vol.All(int, vol.Range(min=1, max=MAX_JOURNAL)),
    }
)
@callback
def ws_state(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Everything the panel shows: journal, counts, people and their channels, options, notify services."""
    hub = _hub(hass)
    if hub is None:
        _not_loaded(connection, msg)
        return
    connection.send_result(
        msg["id"],
        {
            "version": VERSION,
            **hub.summary(msg["limit"]),
            "people": hub.people(),
            "services": hub.notify_services(),
            "sources": hub.sources(),
            "options": dict(hub.entry.options),
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/acknowledge", vol.Optional("entry"): str})
@websocket_api.async_response
async def ws_acknowledge(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _hub(hass)
    if hub is None:
        _not_loaded(connection, msg)
        return
    user = connection.user
    count = await hub.async_acknowledge(msg.get("entry"), user.name if user else None)
    connection.send_result(msg["id"], {"acknowledged": count})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/test",
        vol.Optional("priority", default=PRIORITY_INFO): vol.In(PRIORITIES),
        vol.Optional("message", default="Notify Hub test"): str,
    }
)
@websocket_api.async_response
async def ws_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _hub(hass)
    if hub is None:
        _not_loaded(connection, msg)
        return
    entry = await hub.async_send(
        msg["message"], title="Notify Hub", priority=msg["priority"], source=DOMAIN, topic=f"test:{msg['id']}"
    )
    connection.send_result(msg["id"], {"status": entry["status"], "people": entry["people"]})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/digest"})
@websocket_api.async_response
async def ws_digest(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    hub = _hub(hass)
    if hub is None:
        _not_loaded(connection, msg)
        return
    connection.send_result(msg["id"], {"sent": await hub.async_send_digest()})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/save", vol.Required("options"): dict})
@callback
def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Merge the changed options into the entry's; a person with no channel listed goes back to the ones found."""
    hub = _hub(hass)
    if hub is None:
        _not_loaded(connection, msg)
        return
    try:
        changes = OPTION_SCHEMA(msg["options"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    for key, default in ((CONF_QUIET_START, "22:00"), (CONF_QUIET_END, "07:00")):
        if key in changes:
            changes[key] = parse_time(changes[key], default).strftime("%H:%M")
    if CONF_DIGEST_TIMES in changes:
        changes[CONF_DIGEST_TIMES] = sorted(
            {parse_time(t, "08:00").strftime("%H:%M") for t in changes[CONF_DIGEST_TIMES]}
        )
    if CONF_PEOPLE in changes:
        changes[CONF_PEOPLE] = {person: channels for person, channels in changes[CONF_PEOPLE].items() if channels}
    if CONF_SOURCES in changes:
        changes[CONF_SOURCES] = clean_sources(changes[CONF_SOURCES])
    options = {**hub.entry.options, **changes}
    if not options.get(CONF_SMS_SERVICE):
        options.pop(CONF_SMS_SERVICE, None)
    hass.config_entries.async_update_entry(hub.entry, options=options)
    connection.send_result(msg["id"], {"options": options})
