"""The hub as a notify target: the `notify.notify_hub` action and entity, and the source found from the calling
integration."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.notify_hub.const import DOMAIN

from .test_hub import ANNE, BEN, people, setup_hub, to


def hub_of(hass: HomeAssistant):
    return hass.config_entries.async_entries(DOMAIN)[0].runtime_data


def integration_code(domain: str, body: str) -> dict:
    """Functions compiled as if in custom_components/<domain>/: what the call stack shows of an integration."""
    scope: dict = {}
    exec(compile(body, f"/config/custom_components/{domain}/monitor.py", "exec"), scope)  # noqa: S102
    return scope


async def test_notify_action_goes_through_the_hub(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    assert hass.services.has_service("notify", DOMAIN)
    await hass.services.async_call(
        "notify",
        DOMAIN,
        {
            "title": "Leak",
            "message": "Water under the sink",
            "target": ["person.ben"],
            "data": {"priority": "critical", "topic": "leak", "url": "/lovelace/home", "tag": "x"},
        },
        blocking=True,
    )
    entry = hub_of(hass).journal[0]
    assert (entry["priority"], entry["topic"], entry["url"], entry["requested"]) == (
        "critical",
        "leak",
        "/lovelace/home",
        ["person.ben"],
    )
    assert entry["data"] == {"tag": "x"} and to(sent, BEN) and not to(sent, ANNE)


async def test_notify_action_defaults_to_info(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    await hass.services.async_call("notify", DOMAIN, {"message": "Done", "data": {"priority": "nope"}}, blocking=True)
    assert hub_of(hass).journal[0]["priority"] == "info" and to(sent, ANNE)


async def test_source_found_from_the_calling_integration(hass: HomeAssistant, sent) -> None:
    people(hass)
    hass.config.components.add("acme")
    await setup_hub(hass)
    code = integration_code(
        "acme",
        "async def alert(hass):\n"
        "    await hass.services.async_call('notify', 'notify_hub', {'message': 'Low battery'}, blocking=True)\n"
        "async def send(hass):\n"
        "    await hass.services.async_call('notify_hub', 'send', {'message': 'Other'}, blocking=True)\n",
    )
    await code["alert"](hass)
    await code["send"](hass)
    journal = hub_of(hass).journal
    assert [e["source_key"] for e in journal] == ["acme", "acme"]


async def test_entity_send_message(hass: HomeAssistant, sent) -> None:
    people(hass)
    await setup_hub(hass)
    assert hass.states.get("notify.notify_hub") is not None
    await hass.services.async_call(
        "notify", "send_message", {"entity_id": "notify.notify_hub", "message": "Hi", "title": "T"}, blocking=True
    )
    entry = hub_of(hass).journal[0]
    assert (entry["title"], entry["message"], entry["priority"]) == ("T", "Hi", "info") and to(sent, ANNE)


async def test_never_its_own_channel(hass: HomeAssistant, sent) -> None:
    people(hass)
    entry = await setup_hub(hass)
    hub = hub_of(hass)
    assert "notify.notify_hub" not in hub.notify_services()
    loop = {"person.anne": ["notify.notify_hub"]}
    hass.config_entries.async_update_entry(entry, options={**entry.options, "people": loop})
    await hass.async_block_till_done()
    await hass.services.async_call(DOMAIN, "send", {"message": "Loop?"}, blocking=True)
    assert len(hub.journal) == 1


async def test_unloaded(hass: HomeAssistant, sent) -> None:
    people(hass)
    entry = await setup_hub(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert not hass.services.has_service("notify", DOMAIN)


async def test_notify_entity_channel(hass: HomeAssistant, sent) -> None:
    """A notify entity (Telegram bot, …) is a channel: offered in the pickers, sent to with notify.send_message."""
    people(hass)
    hass.states.async_set("notify.telegram_bot_1_2", "unknown", {"friendly_name": "Telegram"})
    received: list[dict] = []

    async def send_message(call) -> None:
        received.append(dict(call.data))

    entry = await setup_hub(hass)
    hass.services.async_register("notify", "send_message", send_message)  # in place of the notify platform's
    hub = hub_of(hass)
    channels = hub.notify_services()
    assert "notify.telegram_bot_1_2" in channels
    assert "notify.send_message" not in channels, "needs an entity: never a channel on its own"
    assert "notify.notify_hub" not in channels
    options = {**entry.options, "people": {"person.anne": ["notify.telegram_bot_1_2"]}}
    hass.config_entries.async_update_entry(entry, options=options)
    await hass.async_block_till_done()
    await hass.services.async_call(DOMAIN, "send", {"message": "Door open", "title": "Home"}, blocking=True)
    assert received == [{"entity_id": "notify.telegram_bot_1_2", "message": "Door open", "title": "Home"}]
    assert hub.journal[0]["status"] == "delivered"
