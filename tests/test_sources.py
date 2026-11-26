"""Sources: resolved from the text given or from the calling automation, their rules and look, the captures."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

from custom_components.notify_hub import sources
from custom_components.notify_hub.const import (
    CONF_CAPTURE_DELAY,
    CONF_CAPTURE_GRACE,
    CONF_CAPTURE_PERSISTENT,
    CONF_CAPTURE_REPAIRS,
    CONF_CAPTURE_RULES,
    CONF_QUIET_ENABLED,
    CONF_QUIET_END,
    CONF_QUIET_START,
    CONF_SOURCES,
    DOMAIN,
)

from .test_hub import ANNE, BEN, people, send, setup_hub, to


def acme(hass: HomeAssistant) -> str:
    """A loaded integration with one light."""
    hass.config.components.add("acme")
    return er.async_get(hass).async_get_or_create("light", "acme", "lamp-1", suggested_object_id="lamp").entity_id


def hub_of(hass: HomeAssistant):
    return hass.config_entries.async_entries(DOMAIN)[0].runtime_data


async def test_free_text_integration_and_entity(hass: HomeAssistant, sent) -> None:
    people(hass)
    lamp = acme(hass)
    await setup_hub(hass)
    assert (await send(hass, message="a", source="Safety"))["source"] == "safety"
    assert (await send(hass, message="b", source="acme"))["source"] == "acme"
    assert (await send(hass, message="c", source=lamp))["source"] == "acme"
    journal = hub_of(hass).journal
    assert journal[0]["source"] == "Acme" and journal[0]["domain"] == "acme" and journal[0]["origin"] == lamp
    assert journal[2]["source"] == "Safety" and journal[2]["domain"] is None
    assert (await send(hass, message="d"))["source"] == ""  # nothing tells it


async def test_found_from_the_calling_automation(hass: HomeAssistant, sent, monkeypatch) -> None:
    people(hass)
    lamp = acme(hass)
    await setup_hub(hass)
    run = Context()
    hass.states.async_set("automation.night", "on", {"friendly_name": "Night lights"}, context=run)
    monkeypatch.setattr(sources, "_entities_of", lambda h, caller: [lamp, "input_boolean.away"])
    await hass.services.async_call(DOMAIN, "send", {"message": "Lamp left on"}, blocking=True, context=run)
    entry = hub_of(hass).journal[0]
    assert (entry["source_key"], entry["source"], entry["origin"]) == ("acme", "Acme", "Night lights")
    # Only helpers: the automation itself.
    monkeypatch.setattr(sources, "_entities_of", lambda h, caller: ["input_boolean.away"])
    await hass.services.async_call(DOMAIN, "send", {"message": "Bye"}, blocking=True, context=run)
    entry = hub_of(hass).journal[0]
    assert (entry["source_key"], entry["source"]) == ("automation.night", "Night lights")
    # A script run by it (its own context, the automation's as parent): the script.
    child = Context(parent_id=run.id)
    hass.states.async_set("script.warn", "on", {"friendly_name": "Warn"}, context=child)
    await hass.services.async_call(DOMAIN, "send", {"message": "Hey"}, blocking=True, context=child)
    assert hub_of(hass).journal[0]["source_key"] == "script.warn"


async def test_rules(hass: HomeAssistant, sent) -> None:
    people(hass, anne="home", ben="home")
    rules = {
        "acme": {"name": "Lights", "priority": "digest"},
        "safety": {"priority": "critical", "people": ["person.ben"], "icon": "mdi:fire", "color": "#ff0000"},
        "garden": {"muted": True},
        "doors": {"dedup_minutes": 0},
        "night": {"ignore_quiet": True},
    }
    acme(hass)
    now = dt_util.now()
    await setup_hub(
        hass,
        **{
            CONF_SOURCES: rules,
            CONF_QUIET_ENABLED: True,
            CONF_QUIET_START: (now - timedelta(hours=1)).strftime("%H:%M"),
            CONF_QUIET_END: (now + timedelta(hours=1)).strftime("%H:%M"),
        },
    )
    assert (await send(hass, message="lamp", source="acme"))["status"] == "grouped"
    assert hub_of(hass).journal[0]["source"] == "Lights"
    result = await send(hass, message="smoke", source="Safety", priority="info")
    assert result["status"] == "pending" and result["people"] == ["Ben"]
    data = to(sent, BEN)[-1]["data"]
    assert data["notification_icon"] == "mdi:fire" and data["color"] == "#ff0000"
    assert not to(sent, ANNE)
    assert (await send(hass, message="rain", source="garden", priority="alert"))["status"] == "muted"
    # Muted, but a critical one still goes through (a leak, smoke…), as a critical.
    flood = await send(hass, message="flood", source="garden", priority="critical")
    assert flood["status"] == "pending" and flood["people"]
    assert (await send(hass, message="other", source="else"))["status"] == "held"  # quiet hours
    assert (await send(hass, message="owl", source="night"))["status"] == "delivered"
    for _ in range(2):
        assert (await send(hass, message="open", source="doors", priority="critical"))["status"] == "pending"


async def test_sources_listed(hass: HomeAssistant, hass_ws_client, sent) -> None:
    people(hass)
    acme(hass)
    hass.config.components.add("zeta")
    await setup_hub(
        hass,
        **{
            CONF_SOURCES: {
                "acme": {"icon": "mdi:lightbulb"},
                "unused": {"muted": True},
                "zeta": {"people": ["person.anne"]},
            }
        },
    )
    await send(hass, message="a", source="acme")
    await send(hass, message="b", source="acme")
    await send(hass, message="c", source="Safety")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/state"})
    state = (await client.receive_json())["result"]
    listed = {s["key"]: s for s in state["sources"]}
    assert [s["key"] for s in state["sources"]][:2] == ["acme", "safety"]
    assert listed["acme"]["count"] == 2 and listed["acme"]["rule"] == {"icon": "mdi:lightbulb"}
    assert listed["unused"]["count"] == 0 and listed["unused"]["rule"] == {"muted": True}
    assert {"domain": "acme", "name": "Acme"} in state["integrations"]
    assert (listed["zeta"]["name"], listed["zeta"]["domain"]) == ("Zeta", "zeta")  # set before any notification
    assert not any(i["domain"] in ("sensor", "notify_hub") for i in state["integrations"])
    assert state["sources"] and state["recent"][0]["source_key"] == "safety"
    look = hass.states.get("sensor.notify_hub_critical_to_acknowledge").attributes["sources"]
    assert look["acme"] == {"name": "Acme", "domain": "acme", "icon": "mdi:lightbulb", "color": None}
    # Saved from the panel: cleaned, an invalid one refused.
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/save", "options": {"sources": {"acme": {"color": "#00ff00", "icon": ""}, "x": {}}}}
    )
    saved = (await client.receive_json())["result"]["options"]
    assert saved["sources"] == {"acme": {"color": "#00ff00"}}
    await client.send_json_auto_id({"type": f"{DOMAIN}/save", "options": {"sources": {"acme": {"color": "red"}}}})
    assert not (await client.receive_json())["success"]


async def test_capture_persistent(hass: HomeAssistant, sent) -> None:
    people(hass)
    acme(hass)
    entry = await setup_hub(hass)
    persistent_notification.async_create(hass, "Ignored", "Before", "acme_before")
    await hass.async_block_till_done()
    assert not hub_of(hass).journal
    hass.config_entries.async_update_entry(entry, options={**entry.options, CONF_CAPTURE_PERSISTENT: True})
    await hass.async_block_till_done()
    persistent_notification.async_create(hass, "Bridge found", "Acme", "acme_discovery")
    persistent_notification.async_create(hass, "Login attempt", None, "unknown-login")
    await hass.async_block_till_done()
    journal = hub_of(hass).journal
    assert [e["source_key"] for e in journal] == ["homeassistant", "acme"]
    assert journal[1]["message"] == "Bridge found" and journal[1]["topic"] == "persistent:acme_discovery"
    assert to(sent, ANNE)
    hass.config_entries.async_update_entry(entry, options={**entry.options, CONF_CAPTURE_PERSISTENT: False})
    await hass.async_block_till_done()
    persistent_notification.async_create(hass, "Off again", None, "acme_off")
    await hass.async_block_till_done()
    assert len(hub_of(hass).journal) == 2


async def test_capture_skips_the_hubs_own_persistent_notifications(hass: HomeAssistant, sent) -> None:
    """A channel that raises a persistent notification (notify.persistent_notification) does not loop back."""
    people(hass, ben="home")
    raised: list[str] = []

    async def bell(call) -> None:
        raised.append(call.data["message"])
        if len(raised) < 5:  # a loop would go on for ever: stop it here
            persistent_notification.async_create(hass, call.data["message"], call.data.get("title"))

    hass.services.async_register("notify", "bell", bell)
    await setup_hub(
        hass,
        **{CONF_CAPTURE_PERSISTENT: True, "people": {"person.anne": ["notify.bell"], "person.ben": [BEN]}},
    )
    await send(hass, message="Washing machine done", source="acme")
    await hass.async_block_till_done()
    assert raised == ["Washing machine done"]
    assert len(hub_of(hass).journal) == 1
    # A persistent notification raised by something else is still captured.
    persistent_notification.async_create(hass, "Bridge found", None, "zeroconf_discovery")
    await hass.async_block_till_done()
    assert len(hub_of(hass).journal) == 2


async def test_capture_repairs(hass: HomeAssistant, sent) -> None:
    people(hass)
    acme(hass)
    await setup_hub(hass, **{CONF_CAPTURE_REPAIRS: True})

    def issue(issue_id: str, severity: ir.IssueSeverity) -> None:
        ir.async_create_issue(hass, "acme", issue_id, is_fixable=False, severity=severity, translation_key=issue_id)

    issue("bridge_offline", ir.IssueSeverity.ERROR)
    issue("old_firmware", ir.IssueSeverity.WARNING)
    issue("bridge_offline", ir.IssueSeverity.ERROR)  # updated, not new
    await hass.async_block_till_done()
    journal: list[dict[str, Any]] = hub_of(hass).journal
    assert [(e["priority"], e["topic"]) for e in journal] == [
        ("info", "repair:acme:old_firmware"),
        ("alert", "repair:acme:bridge_offline"),
    ]
    assert journal[0]["url"] == "/config/repairs" and journal[0]["source"] == "Acme"
    assert journal[0]["title"] == "old firmware"  # no translation: the id


def test_guess_domain(hass: HomeAssistant) -> None:
    hass.config.components.update({"acme", "acme_ble", "zha"})
    assert sources.guess_domain(hass, "acme_ble_pairing") == "acme_ble"
    assert sources.guess_domain(hass, "zha") == "zha"
    assert sources.guess_domain(hass, "sensor_x") is None
    assert sources.guess_domain(hass, "unknown") is None


# ── Captures held back (#22) ────────────────────────────────────────────────


async def _later(hass: HomeAssistant, freezer, minutes: float) -> None:
    from pytest_homeassistant_custom_component.common import async_fire_time_changed

    freezer.tick(timedelta(minutes=minutes))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


async def test_capture_delay_drops_a_repair_fixed_meanwhile(hass: HomeAssistant, sent, freezer) -> None:
    people(hass)
    acme(hass)
    await setup_hub(hass, **{CONF_CAPTURE_REPAIRS: True, CONF_CAPTURE_DELAY: 5})

    def issue(issue_id: str) -> None:
        ir.async_create_issue(
            hass, "acme", issue_id, is_fixable=False, severity=ir.IssueSeverity.ERROR, translation_key=issue_id
        )

    issue("lovelace_missing")
    issue("bridge_offline")
    await hass.async_block_till_done()
    assert not hub_of(hass).journal  # both held back
    ir.async_delete_issue(hass, "acme", "lovelace_missing")  # gone on its own
    await _later(hass, freezer, 6)
    assert [e["topic"] for e in hub_of(hass).journal] == ["repair:acme:bridge_offline"]


async def test_capture_grace_period_after_startup(hass: HomeAssistant, sent, freezer) -> None:
    people(hass)
    acme(hass)
    entry = await setup_hub(hass, **{CONF_CAPTURE_PERSISTENT: True, CONF_CAPTURE_GRACE: 3})
    capture = hub_of(hass).capture
    capture._started = dt_util.utcnow()  # Home Assistant just started
    persistent_notification.async_create(hass, "Resources missing", None, "acme_resources")
    persistent_notification.async_create(hass, "Still there", None, "acme_still")
    await hass.async_block_till_done()
    assert not hub_of(hass).journal
    persistent_notification.async_dismiss(hass, "acme_resources")
    await _later(hass, freezer, 4)
    assert [e["topic"] for e in hub_of(hass).journal] == ["persistent:acme_still"]
    # Once the grace period is over, sent at once.
    persistent_notification.async_create(hass, "Later", None, "acme_later")
    await hass.async_block_till_done()
    assert hub_of(hass).journal[0]["topic"] == "persistent:acme_later"
    assert entry.options[CONF_CAPTURE_GRACE] == 3


async def test_capture_rules_by_domain_and_id(hass: HomeAssistant, sent) -> None:
    people(hass)
    acme(hass)
    rules = [
        {"domain": "acme", "id": "restart_required_*", "action": "journal"},
        {"domain": "acme", "id": "noise", "action": "ignore"},
        {"domain": "acme", "id": "weekly_*", "action": "digest"},
        {"kind": "persistent", "id": "*-login", "topic": "auth_failure"},
        {"kind": "persistent", "domain": "acme", "topic": "auth_failure"},
    ]
    await setup_hub(hass, **{CONF_CAPTURE_REPAIRS: True, CONF_CAPTURE_PERSISTENT: True, CONF_CAPTURE_RULES: rules})
    for issue_id in ("restart_required_acme", "noise", "weekly_report"):
        ir.async_create_issue(
            hass, "acme", issue_id, is_fixable=False, severity=ir.IssueSeverity.ERROR, translation_key=issue_id
        )
    await hass.async_block_till_done()
    journal = hub_of(hass).journal
    assert [(e["topic"], e["status"]) for e in journal] == [
        ("repair:acme:weekly_report", "grouped"),
        ("repair:acme:restart_required_acme", "muted"),
    ]
    # Two sources, one incident: the second is a duplicate of the first.
    persistent_notification.async_create(hass, "Login attempt failed", None, "http-login")
    await hass.async_block_till_done()
    persistent_notification.async_create(hass, "Login attempt failed", None, "acme_login_failed")
    await hass.async_block_till_done()
    assert [(e["topic"], e["status"]) for e in hub_of(hass).journal[:2]] == [
        ("auth_failure", "duplicate"),
        ("auth_failure", "delivered"),
    ]


def test_match_rule() -> None:
    from custom_components.notify_hub.capture import CAPTURE_RULES_SCHEMA, match_rule

    rules = CAPTURE_RULES_SCHEMA([{"domain": " HACS ", "id": "restart_required_*", "action": "journal"}, {}])
    assert rules == [{"domain": "hacs", "id": "restart_required_*", "action": "journal"}]
    assert match_rule(rules, "repair", "hacs", "restart_required_ui")["action"] == "journal"
    assert match_rule(rules, "repair", "hacs", "other") == {}
    assert match_rule(rules, "repair", "spook", "restart_required_x") == {}
