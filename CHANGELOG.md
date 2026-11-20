# Changelog

## 0.1.0 - 2026-11-20

### Features

- `notify_hub.send`: one action for every automation, with four priorities (critical, alert, info, digest), a topic, a source and the people concerned
- Each person's phones found from their `person` entity, overridable per person
- Quiet hours, duplicates dropped, digests at chosen times, away mode
- Critical notifications: Acknowledge button, escalation to everyone then to an SMS service, cleared on every phone once acknowledged
- `notify_hub.acknowledge` and `notify_hub.send_digest` actions, `notify_hub_notification` event
- Sensors: sent today, grouped, held, duplicates avoided, to acknowledge
- Sidebar panel (journal, routing, rules, settings) with a badge while something waits for an acknowledgement
- Lovelace card with an animated illustrated header and the Acknowledge button
- 22 languages
