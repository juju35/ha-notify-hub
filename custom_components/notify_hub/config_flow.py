"""Config flow: one hub, nothing to ask. Options, in two steps: the rules (quiet hours, duplicates, digests,
escalation — also in the panel's Rules and Settings tabs) and the sources (each source's rule as YAML, the captured
notifications — also in the panel's Sources tab)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    ObjectSelector,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TimeSelector,
)

from .capture import CAPTURE_RULES_SCHEMA
from .const import (
    CONF_AWAY_MODE,
    CONF_CAPTURE_DELAY,
    CONF_CAPTURE_GRACE,
    CONF_CAPTURE_PERSISTENT,
    CONF_CAPTURE_REPAIRS,
    CONF_CAPTURE_RULES,
    CONF_DEDUP_MINUTES,
    CONF_DIGEST_TIMES,
    CONF_ESCALATION_MINUTES,
    CONF_QUIET_ENABLED,
    CONF_QUIET_END,
    CONF_QUIET_START,
    CONF_RETENTION_DAYS,
    CONF_SMS_SERVICE,
    CONF_SOURCES,
    DEFAULT_DEDUP_MINUTES,
    DEFAULT_DIGEST_TIMES,
    DEFAULT_ESCALATION_MINUTES,
    DEFAULT_QUIET_END,
    DEFAULT_QUIET_START,
    DEFAULT_RETENTION_DAYS,
    DOMAIN,
    TITLE,
)
from .hub import parse_time
from .sources import SOURCES_SCHEMA, clean_sources


def default_options() -> dict[str, Any]:
    return {
        CONF_QUIET_ENABLED: True,
        CONF_QUIET_START: DEFAULT_QUIET_START,
        CONF_QUIET_END: DEFAULT_QUIET_END,
        CONF_DEDUP_MINUTES: DEFAULT_DEDUP_MINUTES,
        CONF_DIGEST_TIMES: list(DEFAULT_DIGEST_TIMES),
        CONF_ESCALATION_MINUTES: list(DEFAULT_ESCALATION_MINUTES),
        CONF_AWAY_MODE: False,
        CONF_RETENTION_DAYS: DEFAULT_RETENTION_DAYS,
    }


def _minutes(minimum: int, maximum: int) -> NumberSelector:
    return NumberSelector(
        NumberSelectorConfig(min=minimum, max=maximum, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement="min")
    )


class NotifyHubConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={}, options=default_options())
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return NotifyHubOptionsFlow()


class NotifyHubOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["rules", "sources"])

    async def async_step_sources(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Each source's rule, as YAML (same fields as the panel's Sources tab), and the captured notifications."""
        errors: dict[str, str] = {}
        current = self.config_entry.options
        if user_input is not None:
            try:
                sources = clean_sources(SOURCES_SCHEMA(user_input.get(CONF_SOURCES) or {}))
            except vol.Invalid:
                errors[CONF_SOURCES] = "invalid_sources"
            try:
                rules = CAPTURE_RULES_SCHEMA(user_input.get(CONF_CAPTURE_RULES) or [])
            except vol.Invalid:
                errors[CONF_CAPTURE_RULES] = "invalid_capture_rules"
            if not errors:
                data = {
                    **current,
                    CONF_SOURCES: sources,
                    CONF_CAPTURE_PERSISTENT: bool(user_input.get(CONF_CAPTURE_PERSISTENT)),
                    CONF_CAPTURE_REPAIRS: bool(user_input.get(CONF_CAPTURE_REPAIRS)),
                    CONF_CAPTURE_GRACE: int(user_input.get(CONF_CAPTURE_GRACE) or 0),
                    CONF_CAPTURE_DELAY: int(user_input.get(CONF_CAPTURE_DELAY) or 0),
                    CONF_CAPTURE_RULES: rules,
                }
                # Left at their default: kept out of the options.
                for key in (CONF_CAPTURE_GRACE, CONF_CAPTURE_DELAY, CONF_CAPTURE_RULES):
                    if not data[key]:
                        data.pop(key)
                return self.async_create_entry(data=data)
        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_SOURCES, description={"suggested_value": dict(current.get(CONF_SOURCES) or {})}
                ): ObjectSelector(),
                vol.Required(
                    CONF_CAPTURE_PERSISTENT, default=bool(current.get(CONF_CAPTURE_PERSISTENT))
                ): BooleanSelector(),
                vol.Required(CONF_CAPTURE_REPAIRS, default=bool(current.get(CONF_CAPTURE_REPAIRS))): BooleanSelector(),
                vol.Required(CONF_CAPTURE_GRACE, default=int(current.get(CONF_CAPTURE_GRACE) or 0)): _minutes(0, 120),
                vol.Required(CONF_CAPTURE_DELAY, default=int(current.get(CONF_CAPTURE_DELAY) or 0)): _minutes(0, 1440),
                vol.Optional(
                    CONF_CAPTURE_RULES, description={"suggested_value": list(current.get(CONF_CAPTURE_RULES) or [])}
                ): ObjectSelector(),
            }
        )
        return self.async_show_form(step_id="sources", data_schema=schema, errors=errors)

    async def async_step_rules(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**default_options(), **self.config_entry.options}
        if user_input is not None:
            first, second = int(user_input.pop("escalation_first")), int(user_input.pop("escalation_second"))
            options = {
                **self.config_entry.options,
                **user_input,
                CONF_QUIET_START: parse_time(user_input[CONF_QUIET_START], DEFAULT_QUIET_START).strftime("%H:%M"),
                CONF_QUIET_END: parse_time(user_input[CONF_QUIET_END], DEFAULT_QUIET_END).strftime("%H:%M"),
                CONF_DIGEST_TIMES: sorted(
                    {parse_time(t, "08:00").strftime("%H:%M") for t in user_input[CONF_DIGEST_TIMES]}
                ),
                CONF_ESCALATION_MINUTES: [first, max(second, first)],
                CONF_DEDUP_MINUTES: int(user_input[CONF_DEDUP_MINUTES]),
                CONF_RETENTION_DAYS: int(user_input[CONF_RETENTION_DAYS]),
            }
            if not (user_input.get(CONF_SMS_SERVICE) or "").strip():
                options.pop(CONF_SMS_SERVICE, None)
            return self.async_create_entry(data=options)
        escalation = current[CONF_ESCALATION_MINUTES]
        schema = vol.Schema(
            {
                vol.Required(CONF_QUIET_ENABLED, default=current[CONF_QUIET_ENABLED]): BooleanSelector(),
                vol.Required(CONF_QUIET_START, default=current[CONF_QUIET_START]): TimeSelector(),
                vol.Required(CONF_QUIET_END, default=current[CONF_QUIET_END]): TimeSelector(),
                vol.Required(CONF_DEDUP_MINUTES, default=current[CONF_DEDUP_MINUTES]): _minutes(0, 1440),
                vol.Required(CONF_DIGEST_TIMES, default=list(current[CONF_DIGEST_TIMES])): SelectSelector(
                    SelectSelectorConfig(
                        options=[f"{h:02d}:00" for h in range(24)],
                        multiple=True,
                        custom_value=True,
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Required("escalation_first", default=int(escalation[0])): _minutes(1, 120),
                vol.Required("escalation_second", default=int(escalation[1])): _minutes(1, 240),
                vol.Optional(
                    CONF_SMS_SERVICE, description={"suggested_value": current.get(CONF_SMS_SERVICE)}
                ): TextSelector(),
                vol.Required(CONF_AWAY_MODE, default=current[CONF_AWAY_MODE]): BooleanSelector(),
                vol.Required(CONF_RETENTION_DAYS, default=current[CONF_RETENTION_DAYS]): NumberSelector(
                    NumberSelectorConfig(min=1, max=90, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement="d")
                ),
            }
        )
        return self.async_show_form(step_id="rules", data_schema=schema)
