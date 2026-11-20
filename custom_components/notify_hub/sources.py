"""Where a notification comes from: the integration (or automation, or free text) it is filed under, and the rules and
look set for it.

A source has a key (an integration domain, `automation.<id>` / `script.<id>` when the automation uses no integration,
else the slug of the text given), a name (the integration's, the automation's or the text) and, for an integration,
its domain (the panel and the card show its brand logo).

Resolution, `source` given to `notify_hub.send`:
- an entity id: the integration of that entity (its platform), the entity's name as the origin;
- a loaded integration's domain: that integration;
- anything else: free text, kept as it was written.
Without `source`, from the call's context: the automation or script that made the call (the one whose last run
carries that context), then the integration most of its entities belong to (helpers, templates and Home Assistant
itself left aside); the automation itself when it only uses those.

Each source may have, in the options (`sources`): a name, an icon (mdi:), a color, a forced priority, its own
people, its own duplicate delay, quiet hours ignored, or be muted (kept in the journal, sent to nobody).
"""

from __future__ import annotations

import logging
from collections import Counter
from typing import Any

import voluptuous as vol
from homeassistant.const import Platform
from homeassistant.core import Context, HomeAssistant, State, split_entity_id
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_loaded_integration
from homeassistant.util import slugify

from .const import PRIORITIES

_LOGGER = logging.getLogger(__name__)

# Platforms that say nothing about where a notification comes from: helpers, templates, the core.
NEUTRAL_PLATFORMS = frozenset(
    {
        "automation",
        "counter",
        "group",
        "homeassistant",
        "input_boolean",
        "input_button",
        "input_datetime",
        "input_number",
        "input_select",
        "input_text",
        "notify_hub",
        "person",
        "schedule",
        "script",
        "sun",
        "template",
        "time_date",
        "timer",
        "zone",
    }
)
# Entity domains of Home Assistant's own entities (platforms are not domains: `sensor` is never an integration).
_ENTITY_DOMAINS = frozenset(p.value for p in Platform)
RULE_KEYS = ("name", "icon", "color", "priority", "people", "ignore_quiet", "dedup_minutes", "muted")


def integration_name(hass: HomeAssistant, domain: str) -> str:
    """The integration's name as Home Assistant shows it (its domain when it is not loaded)."""
    try:
        return async_get_loaded_integration(hass, domain).name
    except Exception:  # noqa: BLE001 — not loaded, or a custom one gone
        return domain.replace("_", " ").title()


def is_integration(hass: HomeAssistant, value: str) -> bool:
    return value in hass.config.components and value not in _ENTITY_DOMAINS and "." not in value


def _source(hass: HomeAssistant, domain: str, origin: str | None = None) -> dict[str, Any]:
    return {"key": domain, "name": integration_name(hass, domain), "domain": domain, "origin": origin}


def _entity_name(state: State | None, entity_id: str) -> str:
    return str(state.attributes.get("friendly_name") or state.name) if state else entity_id


def _platform(hass: HomeAssistant, entity_id: str) -> str | None:
    entry = er.async_get(hass).async_get(entity_id)
    return entry.platform if entry else None


def _caller(hass: HomeAssistant, context: Context | None) -> State | None:
    """The automation or script whose last run made the call: its state was written with that run's context."""
    if context is None:
        return None
    ids = {context.id, context.parent_id} - {None}
    for domain in ("script", "automation"):  # a script called by an automation: the script first
        for state in hass.states.async_all(domain):
            if state.context.id in ids:
                return state
    return None


def _entities_of(hass: HomeAssistant, caller: State) -> list[str]:
    domain = split_entity_id(caller.entity_id)[0]
    try:
        if domain == "automation":
            from homeassistant.components.automation import entities_in_automation

            return entities_in_automation(hass, caller.entity_id)
        from homeassistant.components.script import entities_in_script

        return entities_in_script(hass, caller.entity_id)
    except Exception:  # noqa: BLE001 — the automation or the script is not loaded any more
        return []


def integration_of(hass: HomeAssistant, entities: list[str]) -> str | None:
    """The integration most of these entities belong to, the neutral ones left aside."""
    platforms = Counter(p for e in entities if (p := _platform(hass, e)) and p not in NEUTRAL_PLATFORMS)
    return platforms.most_common(1)[0][0] if platforms else None


def resolve(hass: HomeAssistant, source: str | None, context: Context | None = None) -> dict[str, Any]:
    """The source of a notification: {key, name, domain, origin}; key "" when nothing tells it."""
    text = str(source or "").strip()
    if text:
        if "." in text and " " not in text and (platform := _platform(hass, text)):
            return _source(hass, platform, _entity_name(hass.states.get(text), text))
        if is_integration(hass, text):
            return _source(hass, text)
        return {"key": slugify(text) or text, "name": text, "domain": None, "origin": None}
    caller = _caller(hass, context)
    if caller is None:
        return {"key": "", "name": "", "domain": None, "origin": None}
    name = _entity_name(caller, caller.entity_id)
    if domain := integration_of(hass, _entities_of(hass, caller)):
        return _source(hass, domain, name)
    return {"key": caller.entity_id, "name": name, "domain": None, "origin": None}


def guess_domain(hass: HomeAssistant, notification_id: str) -> str | None:
    """The integration a persistent notification belongs to, read from the start of its id (`<domain>_…`)."""
    candidates = [d for d in hass.config.components if "." not in d and d not in _ENTITY_DOMAINS]
    nid = notification_id.lower()
    found = [d for d in candidates if nid == d or nid.startswith((f"{d}_", f"{d}-", f"{d}.", f"{d}:"))]
    return max(found, key=len) if found else None


def clean_rule(rule: dict[str, Any]) -> dict[str, Any]:
    """A rule without its empty fields (an empty rule is no rule)."""
    out: dict[str, Any] = {}
    for key in RULE_KEYS:
        value = rule.get(key)
        if value is None or value == "" or value == [] or value is False:
            continue
        out[key] = value
    return out


_COLOR = vol.Match(r"^#[0-9a-fA-F]{6}$")
# One source's rule (sources.py): every field optional, an empty one means "as the hub's rules".
RULE_SCHEMA = vol.Schema(
    {
        vol.Optional("name"): vol.Any(None, str),
        vol.Optional("icon"): vol.Any(None, "", vol.Match(r"^mdi:[a-z0-9-]+$")),
        vol.Optional("color"): vol.Any(None, "", _COLOR),
        vol.Optional("priority"): vol.Any(None, "", vol.In(PRIORITIES)),
        vol.Optional("people"): vol.Any(None, [str]),
        vol.Optional("ignore_quiet"): bool,
        vol.Optional("dedup_minutes"): vol.Any(None, "", vol.All(vol.Coerce(int), vol.Range(min=0, max=1440))),
        vol.Optional("muted"): bool,
    }
)
SOURCES_SCHEMA = vol.Schema({str: RULE_SCHEMA})


def clean_sources(sources: dict[str, dict]) -> dict[str, dict]:
    """The rules without their empty fields, a source left with none dropped."""
    out = {}
    for key, rule in sources.items():
        if key and (cleaned := clean_rule({k: v.strip() if isinstance(v, str) else v for k, v in rule.items()})):
            out[key] = cleaned
    return out
