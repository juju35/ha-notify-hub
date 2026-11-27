"""Constants for Notify Hub."""

from __future__ import annotations

from datetime import timedelta
from typing import Final

DOMAIN: Final = "notify_hub"
TITLE: Final = "Notify Hub"
VERSION: Final = "0.11.0"

# Priorities, from the most to the least urgent.
PRIORITY_CRITICAL: Final = "critical"
PRIORITY_ALERT: Final = "alert"
PRIORITY_INFO: Final = "info"
PRIORITY_DIGEST: Final = "digest"
PRIORITIES: Final = (PRIORITY_CRITICAL, PRIORITY_ALERT, PRIORITY_INFO, PRIORITY_DIGEST)

# What became of a notification (the journal's `status`).
STATUS_DELIVERED: Final = "delivered"
STATUS_HELD: Final = "held"  # waiting for the end of the quiet hours
STATUS_GROUPED: Final = "grouped"  # in the next digest
STATUS_DUPLICATE: Final = "duplicate"  # same topic too soon: not sent
STATUS_PENDING: Final = "pending"  # critical, waiting to be acknowledged
STATUS_ACKNOWLEDGED: Final = "acknowledged"
STATUS_NOBODY: Final = "nobody"  # no channel to send it to
STATUS_FAILED: Final = "failed"
STATUS_MUTED: Final = "muted"  # its source is muted: kept in the journal, sent to nobody

# Options (entry options, edited in the panel's Rules and Settings tabs or the options flow).
CONF_QUIET_START: Final = "quiet_start"
CONF_QUIET_END: Final = "quiet_end"
CONF_QUIET_ENABLED: Final = "quiet_enabled"
CONF_DEDUP_MINUTES: Final = "dedup_minutes"
CONF_DIGEST_TIMES: Final = "digest_times"
CONF_ESCALATION_MINUTES: Final = "escalation_minutes"
CONF_SMS_SERVICE: Final = "sms_service"
CONF_AWAY_MODE: Final = "away_mode"
CONF_PEOPLE: Final = "people"  # {person entity: [notify services]}: overrides the channels found
# [person entity]: people who are never notified (technical accounts, a wall tablet…), listed apart in the panel.
CONF_EXCLUDED_PEOPLE: Final = "excluded_people"
# {person entity: entity}: where a person's presence is read instead of the person's own state (a binary sensor of a
# room presence system such as ESPresence, an input_boolean, a device tracker): `on` or `home` is at home.
CONF_PRESENCE: Final = "presence"
CONF_RETENTION_DAYS: Final = "retention_days"
# {source key: rule} — name, icon, color, priority, people, ignore_quiet, dedup_minutes, muted (see sources.py).
CONF_SOURCES: Final = "sources"
# The notifications other integrations raise in Home Assistant, sent through the hub too.
CONF_CAPTURE_PERSISTENT: Final = "capture_persistent"  # persistent notifications (the bell of the sidebar)
CONF_CAPTURE_REPAIRS: Final = "capture_repairs"  # new repairs (Settings → Repairs)
# Captured notifications held back: minutes after Home Assistant started during which they wait (a repair raised
# while the integrations load, then gone), a delay for every captured one (sent only if still there), and the rules
# by integration and id (capture.py).
CONF_CAPTURE_GRACE: Final = "capture_grace_minutes"
CONF_CAPTURE_DELAY: Final = "capture_delay_minutes"
CONF_CAPTURE_RULES: Final = "capture_rules"
# The panel's top bar: "off" (shown) or "all" (hidden, the tabs stay with the menu and the buttons).
CONF_HIDE_HEADER: Final = "hide_header"
HIDE_HEADER_MODES: Final = ("off", "all")

DEFAULT_QUIET_START: Final = "22:00"
DEFAULT_QUIET_END: Final = "07:00"
DEFAULT_DEDUP_MINUTES: Final = 10
DEFAULT_DIGEST_TIMES: Final = ("08:00", "19:00")
# A critical notification goes again to everyone after the first delay, then to the SMS service after the second.
DEFAULT_ESCALATION_MINUTES: Final = (5, 10)
DEFAULT_RETENTION_DAYS: Final = 7

# Journal kept in .storage, newest first.
MAX_JOURNAL: Final = 500
STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1
SAVE_DELAY: Final = 5
TICK: Final = timedelta(seconds=30)

# The action id of the "Acknowledge" button of a critical notification (mobile app actionable notifications).
ACK_ACTION: Final = "NOTIFY_HUB_ACK"
EVENT_ACTION: Final = "mobile_app_notification_action"
# Fired for every notification handled, with its journal entry.
EVENT_SENT: Final = f"{DOMAIN}_notification"

SERVICE_SEND: Final = "send"
SERVICE_ACKNOWLEDGE: Final = "acknowledge"
SERVICE_SEND_DIGEST: Final = "send_digest"
ATTR_MESSAGE: Final = "message"
ATTR_TITLE: Final = "title"
ATTR_PRIORITY: Final = "priority"
ATTR_TOPIC: Final = "topic"
ATTR_SOURCE: Final = "source"
ATTR_PEOPLE: Final = "people"
ATTR_URL: Final = "url"
ATTR_DATA: Final = "data"
ATTR_ID: Final = "id"

PANEL_URL: Final = "notify-hub"
PANEL_ICON: Final = "mdi:bell-badge-outline"
