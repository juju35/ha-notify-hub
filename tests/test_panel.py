"""The card in the dashboard resources (storage mode), kept to one item at the current version."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from homeassistant.core import HomeAssistant

from custom_components.notify_hub import panel


class FakeResources:
    def __init__(self, items: list[dict[str, Any]]) -> None:
        self.items = items

    async def async_get_info(self) -> dict[str, int]:
        return {"resources": len(self.items)}

    def async_items(self) -> list[dict[str, Any]]:
        return list(self.items)

    async def async_create_item(self, data: dict[str, Any]) -> None:
        self.items.append({"id": str(len(self.items) + 1), **data})

    async def async_update_item(self, item_id: str, data: dict[str, Any]) -> None:
        for item in self.items:
            if item["id"] == item_id:
                item.update(data)

    async def async_delete_item(self, item_id: str) -> None:
        self.items = [i for i in self.items if i["id"] != item_id]


URL = panel.CARD_URLS[0]


async def test_resource_added_updated_and_deduplicated(hass: HomeAssistant) -> None:
    resources = FakeResources([])
    hass.data["lovelace"] = SimpleNamespace(resource_mode="storage", resources=resources)
    assert await panel._async_register_resource(hass, f"{URL}?v=1")
    assert [i["url"] for i in resources.items] == [f"{URL}?v=1"]
    resources.items.append({"id": "9", "url": f"{URL}?v=0", "res_type": "module"})
    assert await panel._async_register_resource(hass, f"{URL}?v=2")
    assert [i["url"] for i in resources.items] == [f"{URL}?v=2"]
    await panel.async_remove_card(hass)
    assert resources.items == []


async def test_yaml_mode_and_old_layout(hass: HomeAssistant) -> None:
    hass.data["lovelace"] = SimpleNamespace(mode="yaml", resources=FakeResources([]))
    assert not await panel._async_register_resource(hass, f"{URL}?v=1")
    await panel.async_remove_card(hass)  # nothing to remove in YAML mode
    resources = FakeResources([])
    hass.data["lovelace"] = {"mode": "storage", "resources": resources}  # before Home Assistant 2025.2
    assert panel._storage_resources(hass) is resources


async def test_resource_error_falls_back(hass: HomeAssistant) -> None:
    class Broken(FakeResources):
        async def async_get_info(self) -> dict[str, int]:
            raise RuntimeError("storage unavailable")

    hass.data["lovelace"] = SimpleNamespace(resource_mode="storage", resources=Broken([]))
    assert not await panel._async_register_resource(hass, f"{URL}?v=1")


async def test_panel_needs_the_frontend(hass: HomeAssistant) -> None:
    """Without the frontend (tests, minimal setups) nothing is registered and nothing fails."""
    await panel.async_register_panel(hass)
    panel.async_unregister_panel(hass)
    assert (
        panel._version()
        == __import__("json").loads((panel.FRONTEND_DIR.parent / "manifest.json").read_text(encoding="utf-8"))[
            "version"
        ]
    )
