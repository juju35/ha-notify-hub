"""Constants for Notify Hub."""

from __future__ import annotations

from datetime import timedelta
from typing import Final

DOMAIN: Final = "notify_hub"
TITLE: Final = "Notify Hub"
VERSION: Final = "0.2.0"

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
CONF_RETENTION_DAYS: Final = "retention_days"
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
