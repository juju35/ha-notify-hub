""""My notifications": each person turns off sources and priorities for themselves, never the critical ones."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from custom_components.notify_hub.const import CONF_SUBSCRIPTIONS, DOMAIN

from .test_hub import ANNE, BEN, people, send, setup_hub, to


async def _ws(client, **message: Any) -> dict[str, Any]:
    await client.send_json_auto_id(message)
    return await client.receive_json()


def both_home(hass: HomeAssistant) -> None:
    people(hass, anne="home", ben="home")


async def test_turned_off_priority_and_source(hass: HomeAssistant, sent) -> None:
    both_home(hass)
    await setup_hub(hass, **{CONF_SUBSCRIPTIONS: {"person.ben": {"sources": ["house_rules"], "priorities": ["info"]}}})
    result = await send(hass, message="Dishwasher done", priority="info", source="Weather")
    assert result["people"] == ["Anne"] and not to(sent, BEN)
    result = await send(hass, message="Window open", priority="alert", source="House Rules")
    assert result["people"] == ["Anne"] and not to(sent, BEN)
    result = await send(hass, message="Door open", priority="alert", source="Weather")
    assert result["people"] == ["Anne", "Ben"]


async def test_critical_always_comes_through(hass: HomeAssistant, sent) -> None:
    both_home(hass)
    off = {"sources": ["house_rules"], "priorities": ["alert", "info", "digest", "critical"]}
    await setup_hub(hass, **{CONF_SUBSCRIPTIONS: {"person.ben": off}})
    result = await send(hass, message="Leak", priority="critical", source="House Rules")
    assert result["people"] == ["Anne", "Ben"]


async def test_everyone_turned_it_off(hass: HomeAssistant, sent) -> None:
    both_home(hass)
    off = {"sources": [], "priorities": ["info"]}
    await setup_hub(hass, **{CONF_SUBSCRIPTIONS: {"person.anne": off, "person.ben": off}})
    result = await send(hass, message="Nothing", priority="info")
    assert result["status"] == "unsubscribed" and not sent


async def test_digest_per_person(hass: HomeAssistant, sent) -> None:
    both_home(hass)
    hub_entry = await setup_hub(hass, **{CONF_SUBSCRIPTIONS: {"person.ben": {"sources": ["weather"], "priorities": []}}})
    await send(hass, message="Parcel", priority="digest", source="Parcel")
    await send(hass, message="Rain", priority="digest", source="Weather")
    assert await hub_entry.runtime_data.async_send_digest() == 2
    assert "Rain" in to(sent, ANNE)[0]["message"] and "Parcel" in to(sent, ANNE)[0]["message"]
    assert "Rain" not in to(sent, BEN)[0]["message"] and "Parcel" in to(sent, BEN)[0]["message"]
    journal = {e["message"]: e for e in hub_entry.runtime_data.journal}
    assert journal["Rain"]["people"] == ["Anne"] and journal["Parcel"]["people"] == ["Anne", "Ben"]


async def test_digest_nobody_wants(hass: HomeAssistant, sent) -> None:
    both_home(hass)
    off = {"sources": [], "priorities": ["digest"]}
    hub_entry = await setup_hub(hass, **{CONF_SUBSCRIPTIONS: {"person.anne": off, "person.ben": off}})
    await send(hass, message="Parcel", priority="digest")
    assert await hub_entry.runtime_data.async_send_digest() == 0
    assert hub_entry.runtime_data.journal[0]["status"] == "unsubscribed" and not sent


async def test_mine_for_a_user(hass: HomeAssistant, hass_ws_client, hass_admin_user, sent) -> None:
    """Any user (not an administrator) reads and saves the choices of the person linked to them, only theirs."""
    hass.states.async_set("person.anne", "home", {"friendly_name": "Anne"})
    hass.states.async_set("person.ben", "home", {"friendly_name": "Ben", "user_id": hass_admin_user.id})
    entry = await setup_hub(hass)
    await send(hass, message="Hello", priority="info", source="Weather")
    hass_admin_user.groups = []
    client = await hass_ws_client(hass)
    mine = await _ws(client, type=f"{DOMAIN}/mine")
    assert mine["success"]
    assert mine["result"]["person"]["entity_id"] == "person.ben"
    assert [s["key"] for s in mine["result"]["sources"]] == ["weather"]
    assert mine["result"]["priorities"] == ["alert", "info", "digest"]
    saved = await _ws(client, type=f"{DOMAIN}/mine/save", sources=["weather"], priorities=["info"])
    assert saved["success"] and saved["result"]["subscription"] == {"sources": ["weather"], "priorities": ["info"]}
    assert entry.options[CONF_SUBSCRIPTIONS] == {"person.ben": {"sources": ["weather"], "priorities": ["info"]}}
    # Critical cannot be turned off.
    refused = await _ws(client, type=f"{DOMAIN}/mine/save", sources=[], priorities=["critical"])
    assert not refused["success"]
    # Everything back on: nothing kept.
    await _ws(client, type=f"{DOMAIN}/mine/save", sources=[], priorities=[])
    assert CONF_SUBSCRIPTIONS not in entry.options
    # The admin commands stay closed.
    assert not (await _ws(client, type=f"{DOMAIN}/state"))["success"]


async def test_mine_without_a_person(hass: HomeAssistant, hass_ws_client, sent) -> None:
    people(hass)
    await setup_hub(hass)
    client = await hass_ws_client(hass)
    mine = await _ws(client, type=f"{DOMAIN}/mine")
    assert mine["success"] and mine["result"]["person"] is None
    refused = await _ws(client, type=f"{DOMAIN}/mine/save", sources=[], priorities=[])
    assert refused["error"]["code"] == "no_person"
