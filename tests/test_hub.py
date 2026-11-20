"""Routing, quiet hours, duplicates, digests, escalation and acknowledgement."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.notify_hub.config_flow import default_options
from custom_components.notify_hub.const import (
    ACK_ACTION,
    CONF_AWAY_MODE,
    CONF_PEOPLE,
    CONF_QUIET_ENABLED,
    CONF_QUIET_END,
    CONF_QUIET_START,
    CONF_SMS_SERVICE,
    DOMAIN,
    EVENT_ACTION,
)
from custom_components.notify_hub.hub import in_window, parse_time

ANNE = "notify.mobile_app_anne_phone"
BEN = "notify.mobile_app_ben_phone"
SMS = "notify.sms"


def people(hass: HomeAssistant, anne: str = "home", ben: str = "not_home") -> None:
    hass.states.async_set("person.anne", anne, {"friendly_name": "Anne"})
    hass.states.async_set("person.ben", ben, {"friendly_name": "Ben"})


async def setup_hub(hass: HomeAssistant, **options: Any) -> MockConfigEntry:
    opts = {
        **default_options(),
        CONF_QUIET_ENABLED: False,
        CONF_PEOPLE: {"person.anne": [ANNE], "person.ben": [BEN]},
        **options,
    }
    entry = MockConfigEntry(domain=DOMAIN, title="Notify Hub", data={}, options=opts)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def send(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(DOMAIN, "send", data, blocking=True, return_response=True)


def to(sent: list, service: str) -> list[dict[str, Any]]:
    return [data for name, data in sent if name == service]


def test_time_window() -> None:
    assert parse_time("22:30", "00:00").hour == 22
    assert parse_time("nope", "07:00").hour == 7
    assert in_window(parse_time("23:00", ""), parse_time("22:00", ""), parse_time("07:00", ""))
    assert in_window(parse_time("06:59", ""), parse_time("22:00", ""), parse_time("07:00", ""))
    assert not in_window(parse_time("07:00", ""), parse_time("22:00", ""), parse_time("07:00", ""))
    assert in_window(parse_time("13:00", ""), parse_time("12:00", ""), parse_time("14:00", ""))


async def test_info_and_alert_go_to_the_people_at_home(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    result = await send(hass, message="Dishwasher done", priority="info", source="House Rules")
    assert result["status"] == "delivered" and result["people"] == ["Anne"]
    assert to(sent, ANNE)[0]["data"]["group"] == "House Rules" and not to(sent, BEN)
    await send(hass, message="Window open", priority="alert")
    assert len(to(sent, ANNE)) == 2 and not to(sent, BEN)


async def test_nobody_home(hass: HomeAssistant, sent) -> None:
    people(hass, anne="not_home")
    entry = await setup_hub(hass)
    # An alert goes to everyone, an info waits for the digest.
    assert (await send(hass, message="Window open", priority="alert"))["people"] == ["Anne", "Ben"]
    assert (await send(hass, message="Parcel delivered", priority="info"))["status"] == "grouped"
    # Away mode: infos go to everyone too.
    hass.config_entries.async_update_entry(entry, options={**entry.options, CONF_AWAY_MODE: True})
    assert (await send(hass, message="Another parcel", priority="info"))["status"] == "delivered"


async def test_people_named(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    result = await send(hass, message="For Ben", people=["person.ben"])
    assert result["people"] == ["Ben"] and not to(sent, ANNE)


async def test_duplicates_are_dropped(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    await send(hass, message="CO2 high", topic="co2")
    assert (await send(hass, message="CO2 still high", topic="co2"))["status"] == "duplicate"
    assert len(to(sent, ANNE)) == 1
    assert hass.states.get("sensor.notify_hub_duplicates_avoided").state == "1"


async def test_quiet_hours_hold_then_release(hass: HomeAssistant, sent, freezer) -> None:
    freezer.move_to(dt_util.as_utc(dt_util.now().replace(hour=23, minute=0)))
    people(hass)
    await setup_hub(hass, **{CONF_QUIET_ENABLED: True, CONF_QUIET_START: "22:00", CONF_QUIET_END: "07:00"})
    assert (await send(hass, message="Low battery", priority="alert"))["status"] == "held"
    assert (await send(hass, message="Leak!", priority="critical"))["status"] == "pending"
    assert len(sent) == 2  # the critical one, to both
    assert to(sent, ANNE)[0]["data"]["push"]["interruption-level"] == "critical"
    assert hass.states.get("sensor.notify_hub_held_by_the_quiet_hours").state == "1"
    freezer.tick(timedelta(hours=8, minutes=5))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert any(d["message"] == "Low battery" for d in to(sent, ANNE))


async def test_digest(hass: HomeAssistant, sent, freezer) -> None:
    freezer.move_to(dt_util.as_utc(dt_util.now().replace(hour=7, minute=50)))
    people(hass)
    await setup_hub(hass)
    for n in range(3):
        await send(hass, message=f"Parcel {n}", priority="digest")
    assert not sent
    assert hass.states.get("sensor.notify_hub_waiting_for_the_digest").state == "3"
    freezer.tick(timedelta(minutes=11))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(to(sent, ANNE)) == 1
    assert to(sent, ANNE)[0]["title"] == "Digest · 3"
    assert "Parcel 2" in to(sent, ANNE)[0]["message"]
    assert hass.states.get("sensor.notify_hub_waiting_for_the_digest").state == "0"


async def test_critical_escalates_until_acknowledged(hass: HomeAssistant, sent, freezer) -> None:
    people(hass)
    await setup_hub(hass, **{CONF_SMS_SERVICE: SMS})
    result = await send(hass, message="Leak!", title="Kitchen", priority="critical")
    assert result["status"] == "pending" and result["people"] == ["Anne", "Ben"]
    actions = to(sent, ANNE)[0]["data"]["actions"]
    assert actions[0]["action"] == f"{ACK_ACTION}_{result['id']}"
    assert hass.states.get("sensor.notify_hub_critical_to_acknowledge").state == "1"

    freezer.tick(timedelta(minutes=5, seconds=30))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert len(to(sent, ANNE)) == 2 and not to(sent, SMS)

    freezer.tick(timedelta(minutes=5))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert to(sent, SMS)[0]["message"] == "Leak!"


async def test_acknowledge_from_the_phone(hass: HomeAssistant, sent, freezer) -> None:
    people(hass)
    await setup_hub(hass, **{CONF_SMS_SERVICE: SMS})
    result = await send(hass, message="Leak!", priority="critical")
    hass.bus.async_fire(EVENT_ACTION, {"action": f"{ACK_ACTION}_{result['id']}"})
    await hass.async_block_till_done()
    assert hass.states.get("sensor.notify_hub_critical_to_acknowledge").state == "0"
    # Cleared on the phones, never escalated.
    assert any(d["message"] == "clear_notification" for d in to(sent, ANNE))
    freezer.tick(timedelta(minutes=20))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert not to(sent, SMS)


async def test_acknowledge_action_and_card_attributes(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    await send(hass, message="Leak!", priority="critical")
    attributes = hass.states.get("sensor.notify_hub_critical_to_acknowledge").attributes
    assert attributes["notify_hub"] is True
    assert attributes["recent"][0]["status"] == "pending"
    response = await hass.services.async_call(DOMAIN, "acknowledge", {}, blocking=True, return_response=True)
    assert response == {"acknowledged": 1}


async def test_found_channels(hass: HomeAssistant, sent) -> None:
    """Without channels set by hand: the notify service of the person's mobile app tracker."""
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er

    app = MockConfigEntry(domain="mobile_app")
    app.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=app.entry_id, identifiers={("mobile_app", "x")}, name="Anne Phone"
    )
    tracker = er.async_get(hass).async_get_or_create(
        "device_tracker", "mobile_app", "x", device_id=device.id, config_entry=app
    )
    hass.states.async_set("person.anne", "home", {"friendly_name": "Anne", "device_trackers": [tracker.entity_id]})
    entry = await setup_hub(hass, **{CONF_PEOPLE: {}})
    hub = entry.runtime_data
    assert hub.people()[0]["channels"] == [ANNE] and not hub.people()[0]["custom"]


async def test_found_channels_after_a_rename(hass: HomeAssistant, sent) -> None:
    """A phone renamed in Home Assistant keeps its notify service (named after the registered device name)."""
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er

    app = MockConfigEntry(domain="mobile_app")
    app.add_to_hass(hass)
    registry = dr.async_get(hass)
    device = registry.async_get_or_create(
        config_entry_id=app.entry_id, identifiers={("mobile_app", "x")}, name="Anne Phone"
    )
    registry.async_update_device(device.id, name_by_user="Kitchen tablet")
    tracker = er.async_get(hass).async_get_or_create(
        "device_tracker", "mobile_app", "x", device_id=device.id, config_entry=app
    )
    hass.states.async_set("person.anne", "home", {"friendly_name": "Anne", "device_trackers": [tracker.entity_id]})
    entry = await setup_hub(hass, **{CONF_PEOPLE: {}})
    assert entry.runtime_data.people()[0]["channels"] == [ANNE]


async def test_counts_follow_the_journal(hass: HomeAssistant, sent) -> None:
    """The counts are cached between changes, and recomputed at each one."""
    people(hass)
    entry = await setup_hub(hass)
    hub = entry.runtime_data
    assert hub.counts()["sent_today"] == 0
    await send(hass, message="One", priority="info")
    assert hub.counts()["sent_today"] == 1
    counted = hub.counts()
    counted["sent_today"] = 99  # a copy: the cache is not changed by the caller
    assert hub.counts()["sent_today"] == 1
    await send(hass, message="Two", priority="digest")
    assert hub.counts()["grouped"] == 1


async def test_services_need_the_hub(hass: HomeAssistant, sent) -> None:
    """The actions answer with a clear error while the hub is not loaded."""
    from homeassistant.exceptions import ServiceValidationError

    people(hass)
    entry = await setup_hub(hass)
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    with pytest.raises(ServiceValidationError):
        await send(hass, message="Nobody listens")


async def test_digest_kept_when_nobody_is_reachable(hass: HomeAssistant, sent) -> None:
    """A digest nobody can receive leaves its notifications queued for the next one."""
    people(hass)
    entry = await setup_hub(hass, **{CONF_PEOPLE: {"person.anne": ["notify.gone"], "person.ben": ["notify.gone"]}})
    await send(hass, message="Battery low", priority="digest")
    response = await hass.services.async_call(DOMAIN, "send_digest", {}, blocking=True, return_response=True)
    assert response == {"sent": 0}
    hub = entry.runtime_data
    assert hub.journal[0]["status"] == "grouped" and hub.counts()["grouped"] == 1
    # Reachable again: the next digest carries it.
    hass.config_entries.async_update_entry(entry, options={**entry.options, CONF_PEOPLE: {"person.anne": [ANNE]}})
    await hass.async_block_till_done()
    response = await hass.services.async_call(DOMAIN, "send_digest", {}, blocking=True, return_response=True)
    assert response == {"sent": 1}
    assert hub.journal[0]["status"] == "delivered" and "Battery low" in to(sent, ANNE)[0]["message"]
