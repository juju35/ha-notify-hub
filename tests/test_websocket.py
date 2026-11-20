"""The panel's WebSocket commands, the options flow and the diagnostics."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.notify_hub.const import CONF_HIDE_HEADER, CONF_PEOPLE, CONF_SMS_SERVICE, DOMAIN
from custom_components.notify_hub.diagnostics import async_get_config_entry_diagnostics

from .test_hub import ANNE, people, send, sent, setup_hub  # noqa: F401 — `sent` is a fixture


async def _ws(client, **message: Any) -> dict[str, Any]:
    await client.send_json_auto_id(message)
    return await client.receive_json()


async def test_state_and_save(hass: HomeAssistant, hass_ws_client, sent) -> None:
    people(hass)
    entry = await setup_hub(hass)
    await send(hass, message="Hello", priority="info")
    client = await hass_ws_client(hass)
    state = await _ws(client, type=f"{DOMAIN}/state", limit=5)
    assert state["success"]
    assert state["result"]["counts"]["sent_today"] == 1 and len(state["result"]["recent"]) == 1
    assert ANNE in state["result"]["services"]
    # A limit out of range is refused.
    assert not (await _ws(client, type=f"{DOMAIN}/state", limit=0))["success"]

    saved = await _ws(
        client,
        type=f"{DOMAIN}/save",
        options={
            "quiet_start": "23:5",
            "digest_times": ["19:00", "8:00", "19:00"],
            CONF_PEOPLE: {"person.anne": [ANNE], "person.ben": []},
            CONF_SMS_SERVICE: "",
            CONF_HIDE_HEADER: "all",
        },
    )
    assert saved["success"]
    options = entry.options
    assert options["quiet_start"] == "23:05"
    assert options["digest_times"] == ["08:00", "19:00"]
    assert options[CONF_PEOPLE] == {"person.anne": [ANNE]}
    assert CONF_SMS_SERVICE not in options
    assert options[CONF_HIDE_HEADER] == "all"
    invalid = await _ws(client, type=f"{DOMAIN}/save", options={CONF_HIDE_HEADER: "sometimes"})
    assert not invalid["success"] and invalid["error"]["code"] == "invalid"


async def test_test_ack_and_digest(hass: HomeAssistant, hass_ws_client, sent) -> None:
    people(hass)
    await setup_hub(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type=f"{DOMAIN}/test", priority="critical")
    assert result["success"] and result["result"]["status"] == "pending"
    ack = await _ws(client, type=f"{DOMAIN}/acknowledge")
    assert ack["result"] == {"acknowledged": 1}
    await send(hass, message="Later", priority="digest")
    digest = await _ws(client, type=f"{DOMAIN}/digest")
    assert digest["result"] == {"sent": 1}


async def test_commands_need_an_admin(hass: HomeAssistant, hass_ws_client, hass_admin_user, sent) -> None:
    people(hass)
    await setup_hub(hass)
    hass_admin_user.groups = []
    client = await hass_ws_client(hass)
    for command in ("state", "acknowledge", "test", "digest"):
        result = await _ws(client, type=f"{DOMAIN}/{command}")
        assert not result["success"] and result["error"]["code"] == "unauthorized", command


async def test_commands_without_the_hub(hass: HomeAssistant, hass_ws_client, sent) -> None:
    people(hass)
    entry = await setup_hub(hass)
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    for message in ({"type": f"{DOMAIN}/state"}, {"type": f"{DOMAIN}/save", "options": {}}):
        result = await _ws(client, **message)
        assert not result["success"] and result["error"]["code"] == "not_loaded"


async def test_options_flow(hass: HomeAssistant, sent) -> None:
    people(hass)
    entry = await setup_hub(hass, **{CONF_SMS_SERVICE: "notify.sms"})
    flow = await hass.config_entries.options.async_init(entry.entry_id)
    assert flow["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        flow["flow_id"],
        {
            "quiet_enabled": True,
            "quiet_start": "21:30:00",
            "quiet_end": "06:45:00",
            "dedup_minutes": 5,
            "digest_times": ["18:00", "07:00"],
            "escalation_first": 8,
            "escalation_second": 3,
            "sms_service": " ",
            "away_mode": True,
            "retention_days": 3,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    options = entry.options
    assert options["quiet_start"] == "21:30" and options["quiet_end"] == "06:45"
    assert options["digest_times"] == ["07:00", "18:00"]
    assert options["escalation_minutes"] == [8, 8]  # the second step never comes before the first
    assert CONF_SMS_SERVICE not in options
    assert options[CONF_PEOPLE]  # kept: not part of the form


async def test_single_instance(hass: HomeAssistant, sent) -> None:
    await setup_hub(hass)
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.ABORT and result["reason"] == "single_instance_allowed"


async def test_config_flow_creates_the_hub(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY and result["options"]["quiet_enabled"] is True


async def test_diagnostics_leave_the_texts_out(hass: HomeAssistant, sent) -> None:
    people(hass)
    entry = await setup_hub(hass)
    await send(hass, message="Secret code 1234", title="Door", priority="info")
    diagnostics = await async_get_config_entry_diagnostics(hass, entry)
    assert diagnostics["journal"][0]["status"] == "delivered"
    assert "Secret code 1234" not in str(diagnostics) and "Door" not in str(diagnostics)
