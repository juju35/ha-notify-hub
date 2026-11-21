/**
 * notify-hub-panel — Notify Hub's sidebar panel (administrators): the journal of the notifications, the people and
 * their channels, the rules (priorities, quiet hours, duplicates, digests), the sources (each integration's rule and
 * look, the notifications captured from Home Assistant) and the settings (escalation, SMS, journal, tests). Talks to the integration over its WebSocket commands (notify_hub/state, /save, /acknowledge,
 * /test, /digest). Its layout follows the other ha-* panels: an illustrated header across the whole width, the tabs
 * under it, the current tab in the address.
 * https://github.com/juju35/ha-notify-hub
 */
var NOTIFY_HUB_PANEL_VERSION = '0.5.1';

var NH_PANEL_I18N = {
  en: { tab_journal: "Journal", tab_routing: "Routing", tab_rules: "Rules", tab_settings: "Settings", c_sent: "Sent today", c_grouped: "In the digest", c_duplicates: "Duplicates avoided (7 d)", c_pending: "Critical to acknowledge", c_held: "Held by the quiet hours", f_all: "All", f_critical: "Critical", f_pending: "To acknowledge", f_grouped: "In the digest", f_held: "Held", f_duplicate: "Duplicates", col_message: "Message", col_source: "Source", col_people: "People", col_time: "Time", col_status: "Status", empty: "No notification", people: "People and channels", home: "Home", away: "Away", channels: "Channels", found: "Found automatically", custom: "Set by hand", reset: "Back to automatic", no_channel: "No channel", no_people: "No person in Home Assistant", escalation: "Escalation of the critical ones", escalation_text: "The people concerned, then everyone after {a} min, then the SMS service after {b} min. Stops as soon as someone acknowledges.", rules_priorities: "Priorities", p_critical: "Immediately, through the quiet hours, critical sound, until acknowledged", p_alert: "The people at home (everyone when nobody is), held during the quiet hours", p_info: "The people at home, held during the quiet hours; with nobody home, the next digest", p_digest: "Always grouped, sent at the digest times", quiet: "Quiet hours", quiet_start: "Start", quiet_end: "End", dedup: "Ignore duplicates for", dedup_text: "Same topic (or same title and message) within this time", digest_times: "Digest times", add_time: "Add", away_mode: "Away mode", away_text: "With nobody home, infos go to everyone instead of the digest", sms: "SMS service", sms_none: "None", esc_first: "Again to everyone after", esc_second: "SMS after", retention: "Keep the journal", days: "days", minutes: "min", test: "Send a test", test_info: "Info test", test_critical: "Critical test", digest_now: "Send the digest now", save: "Save", saved: "Saved", sent_ok: "Sent", error: "Error", subtitle_quiet: "Quiet hours until {t}", subtitle_ok: "{n} sent today", acknowledge_all: "Acknowledge all", hide_header: "Hide the top bar", hide_header_help: "The tabs stay, with the menu and the buttons in their row.", st_nobody: "Nobody to notify", st_failed: "Failed", tab_sources: "Sources", src_list: "Sources of the notifications", src_capture: "Captured from Home Assistant", src_help: "A source is found by itself: the integration of the entities the sending automation uses, or the source given to notify_hub.send (an integration, an entity or a text). Its rule applies before the hub's rules.", src_empty: "No source yet: they appear with the first notifications.", cap_persistent: "Persistent notifications", cap_persistent_help: "The ones the integrations post in Home Assistant (the sidebar bell) also go through the hub, as infos.", cap_repairs: "New repairs", cap_repairs_help: "Each new repair goes through the hub: an alert for an error, an info for a warning.", src_count: "{n} in 7 days", src_last: "last {t}", src_edit: "Customize", src_name: "Name", src_icon: "Icon", src_color: "Color", src_priority: "Priority", src_as_sent: "As sent", src_people: "Only these people", src_people_help: "None ticked: as the priority says.", src_dedup_help: "Empty: the hub's delay.", src_quiet: "Through the quiet hours", src_quiet_tag: "Quiet hours ignored", src_quiet_help: "Alerts and infos from this source are not held.", src_muted_help: "Kept in the journal, sent to nobody.", src_reset: "Remove the customization", st_muted: "Muted", src_add: "Add", src_pick: "Set a source ahead: pick an integration…", p_sources: "Only for them:" },
  fr: { tab_journal: "Journal", tab_routing: "Routage", tab_rules: "Règles", tab_settings: "Réglages", c_sent: "Envoyées aujourd’hui", c_grouped: "Dans le résumé", c_duplicates: "Doublons évités (7 j)", c_pending: "Critiques à acquitter", c_held: "Retenues (heures calmes)", f_all: "Toutes", f_critical: "Critiques", f_pending: "À acquitter", f_grouped: "Dans le résumé", f_held: "Retenues", f_duplicate: "Doublons", col_message: "Message", col_source: "Source", col_people: "Destinataires", col_time: "Heure", col_status: "État", empty: "Aucune notification", people: "Personnes et canaux", home: "Présent", away: "Absent", channels: "Canaux", found: "Trouvés automatiquement", custom: "Réglés à la main", reset: "Revenir en automatique", no_channel: "Aucun canal", no_people: "Aucune personne dans Home Assistant", escalation: "Relance des critiques", escalation_text: "Les personnes concernées, puis tout le monde après {a} min, puis le service SMS après {b} min. S’arrête dès qu’une personne acquitte.", rules_priorities: "Priorités", p_critical: "Immédiat, même en heures calmes, son critique, jusqu’à l’acquittement", p_alert: "Les présents (tout le monde si personne n’est là), retenue en heures calmes", p_info: "Les présents, retenue en heures calmes ; personne à la maison : le prochain résumé", p_digest: "Toujours regroupée, envoyée aux heures des résumés", quiet: "Heures calmes", quiet_start: "Début", quiet_end: "Fin", dedup: "Ignorer les doublons pendant", dedup_text: "Même sujet (ou même titre et message) dans ce délai", digest_times: "Heures des résumés", add_time: "Ajouter", away_mode: "Mode absence", away_text: "Personne à la maison : les infos partent à tout le monde au lieu du résumé", sms: "Service SMS", sms_none: "Aucun", esc_first: "De nouveau à tous après", esc_second: "SMS après", retention: "Garder le journal", days: "jours", minutes: "min", test: "Envoyer un test", test_info: "Test info", test_critical: "Test critique", digest_now: "Envoyer le résumé maintenant", save: "Enregistrer", saved: "Enregistré", sent_ok: "Envoyé", error: "Erreur", subtitle_quiet: "Heures calmes jusqu’à {t}", subtitle_ok: "{n} envoyées aujourd’hui", acknowledge_all: "Tout acquitter", hide_header: "Masquer la barre du haut", hide_header_help: "Les onglets restent, avec le menu et les boutons sur leur ligne.", st_nobody: "Personne à prévenir", st_failed: "Échec", tab_sources: "Sources", src_list: "Sources des notifications", src_capture: "Captées dans Home Assistant", src_help: "Une source est trouvée toute seule : l’intégration des entités de l’automatisation qui envoie, ou la source donnée à notify_hub.send (une intégration, une entité ou un texte). Sa règle s’applique avant celles du hub.", src_empty: "Aucune source pour l’instant : elles apparaissent avec les premières notifications.", cap_persistent: "Notifications persistantes", cap_persistent_help: "Celles que les intégrations publient dans Home Assistant (la cloche de la barre latérale) passent aussi par le hub, en info.", cap_repairs: "Nouvelles réparations", cap_repairs_help: "Chaque nouvelle réparation passe par le hub : une alerte pour une erreur, une info pour un avertissement.", src_count: "{n} en 7 jours", src_last: "dernière {t}", src_edit: "Personnaliser", src_name: "Nom", src_icon: "Icône", src_color: "Couleur", src_priority: "Priorité", src_as_sent: "Comme envoyée", src_people: "Seulement ces personnes", src_people_help: "Aucune cochée : selon la priorité.", src_dedup_help: "Vide : le délai du hub.", src_quiet: "Même en heures calmes", src_quiet_tag: "Heures calmes ignorées", src_quiet_help: "Les alertes et infos de cette source ne sont pas retenues.", src_muted_help: "Gardée dans le journal, envoyée à personne.", src_reset: "Retirer la personnalisation", st_muted: "Muette", src_add: "Ajouter", src_pick: "Régler une source à l’avance : choisir une intégration…", p_sources: "Rien que pour eux :" },
  de: { tab_journal: "Journal", tab_routing: "Verteilung", tab_rules: "Regeln", tab_settings: "Einstellungen", c_sent: "Heute gesendet", c_grouped: "In der Zusammenfassung", c_duplicates: "Vermiedene Duplikate (7 T.)", c_pending: "Zu bestätigende kritische", c_held: "Durch Ruhezeit zurückgehalten", f_all: "Alle", f_critical: "Kritisch", f_pending: "Zu bestätigen", f_grouped: "In der Zusammenfassung", f_held: "Zurückgehalten", f_duplicate: "Duplikate", col_message: "Nachricht", col_source: "Quelle", col_people: "Personen", col_time: "Zeit", col_status: "Status", empty: "Keine Benachrichtigung", people: "Personen und Kanäle", home: "Zu Hause", away: "Abwesend", channels: "Kanäle", found: "Automatisch gefunden", custom: "Manuell festgelegt", reset: "Zurück zu automatisch", no_channel: "Kein Kanal", no_people: "Keine Person in Home Assistant", escalation: "Eskalation der kritischen", escalation_text: "Die betroffenen Personen, dann alle nach {a} Min., dann der SMS-Dienst nach {b} Min. Endet, sobald jemand bestätigt.", rules_priorities: "Prioritäten", p_critical: "Sofort, auch in der Ruhezeit, kritischer Ton, bis zur Bestätigung", p_alert: "Anwesende (alle, wenn niemand da ist), in der Ruhezeit zurückgehalten", p_info: "Anwesende, in der Ruhezeit zurückgehalten; niemand zu Hause: nächste Zusammenfassung", p_digest: "Immer gruppiert, zu den Zeiten der Zusammenfassung gesendet", quiet: "Ruhezeiten", quiet_start: "Beginn", quiet_end: "Ende", dedup: "Duplikate ignorieren für", dedup_text: "Gleiches Thema (oder gleicher Titel und Text) in dieser Zeit", digest_times: "Zeiten der Zusammenfassung", add_time: "Hinzufügen", away_mode: "Abwesenheitsmodus", away_text: "Niemand zu Hause: Infos gehen an alle statt in die Zusammenfassung", sms: "SMS-Dienst", sms_none: "Keiner", esc_first: "Erneut an alle nach", esc_second: "SMS nach", retention: "Journal behalten", days: "Tage", minutes: "Min.", test: "Test senden", test_info: "Info-Test", test_critical: "Kritischer Test", digest_now: "Zusammenfassung jetzt senden", save: "Speichern", saved: "Gespeichert", sent_ok: "Gesendet", error: "Fehler", subtitle_quiet: "Ruhezeit bis {t}", subtitle_ok: "{n} heute gesendet", acknowledge_all: "Alle bestätigen", hide_header: "Obere Leiste ausblenden", hide_header_help: "Die Reiter bleiben, mit dem Menü und den Schaltflächen in ihrer Zeile.", st_nobody: "Niemand zu benachrichtigen", st_failed: "Fehlgeschlagen", tab_sources: "Quellen", src_list: "Quellen der Benachrichtigungen", src_capture: "Aus Home Assistant erfasst", src_help: "Eine Quelle wird selbst ermittelt: die Integration der Entitäten der sendenden Automatisierung oder die an notify_hub.send übergebene Quelle (Integration, Entität oder Text). Ihre Regel gilt vor den Regeln des Hubs.", src_empty: "Noch keine Quelle: sie erscheinen mit den ersten Benachrichtigungen.", cap_persistent: "Dauerhafte Benachrichtigungen", cap_persistent_help: "Die von Integrationen in Home Assistant angezeigten (Glocke der Seitenleiste) laufen auch über den Hub, als Info.", cap_repairs: "Neue Reparaturen", cap_repairs_help: "Jede neue Reparatur läuft über den Hub: ein Alarm bei einem Fehler, eine Info bei einer Warnung.", src_count: "{n} in 7 Tagen", src_last: "zuletzt {t}", src_edit: "Anpassen", src_name: "Name", src_icon: "Symbol", src_color: "Farbe", src_priority: "Priorität", src_as_sent: "Wie gesendet", src_people: "Nur diese Personen", src_people_help: "Keine angehakt: nach Priorität.", src_dedup_help: "Leer: Frist des Hubs.", src_quiet: "Auch in der Ruhezeit", src_quiet_tag: "Ruhezeit ignoriert", src_quiet_help: "Alarme und Infos dieser Quelle werden nicht zurückgehalten.", src_muted_help: "Im Journal behalten, an niemanden gesendet.", src_reset: "Anpassung entfernen", st_muted: "Stumm", src_add: "Hinzufügen", src_pick: "Quelle vorab einstellen: Integration wählen…", p_sources: "Nur für sie:" },
  es: { tab_journal: "Registro", tab_routing: "Enrutado", tab_rules: "Reglas", tab_settings: "Ajustes", c_sent: "Enviadas hoy", c_grouped: "En el resumen", c_duplicates: "Duplicados evitados (7 d)", c_pending: "Críticas por confirmar", c_held: "Retenidas por el silencio", f_all: "Todas", f_critical: "Críticas", f_pending: "Por confirmar", f_grouped: "En el resumen", f_held: "Retenidas", f_duplicate: "Duplicados", col_message: "Mensaje", col_source: "Origen", col_people: "Personas", col_time: "Hora", col_status: "Estado", empty: "Sin notificaciones", people: "Personas y canales", home: "En casa", away: "Fuera", channels: "Canales", found: "Encontrados automáticamente", custom: "Fijados a mano", reset: "Volver a automático", no_channel: "Sin canal", no_people: "No hay personas en Home Assistant", escalation: "Escalado de las críticas", escalation_text: "Las personas afectadas, luego todos tras {a} min, luego el servicio SMS tras {b} min. Se detiene en cuanto alguien confirma.", rules_priorities: "Prioridades", p_critical: "Inmediato, incluso en silencio, sonido crítico, hasta confirmar", p_alert: "Los presentes (todos si no hay nadie), retenida en silencio", p_info: "Los presentes, retenida en silencio; sin nadie en casa: el próximo resumen", p_digest: "Siempre agrupada, enviada a las horas del resumen", quiet: "Horas de silencio", quiet_start: "Inicio", quiet_end: "Fin", dedup: "Ignorar duplicados durante", dedup_text: "Mismo tema (o mismo título y mensaje) en este plazo", digest_times: "Horas del resumen", add_time: "Añadir", away_mode: "Modo ausencia", away_text: "Sin nadie en casa: las infos van a todos en vez de al resumen", sms: "Servicio SMS", sms_none: "Ninguno", esc_first: "De nuevo a todos tras", esc_second: "SMS tras", retention: "Conservar el registro", days: "días", minutes: "min", test: "Enviar una prueba", test_info: "Prueba info", test_critical: "Prueba crítica", digest_now: "Enviar el resumen ahora", save: "Guardar", saved: "Guardado", sent_ok: "Enviado", error: "Error", subtitle_quiet: "Silencio hasta las {t}", subtitle_ok: "{n} enviadas hoy", acknowledge_all: "Confirmar todas", hide_header: "Ocultar la barra superior", hide_header_help: "Las pestañas se quedan, con el menú y los botones en su fila.", st_nobody: "Nadie a quien avisar", st_failed: "Fallida", tab_sources: "Orígenes", src_list: "Orígenes de las notificaciones", src_capture: "Capturadas en Home Assistant", src_help: "Un origen se encuentra solo: la integración de las entidades de la automatización que envía, o el origen dado a notify_hub.send (una integración, una entidad o un texto). Su regla se aplica antes que las del hub.", src_empty: "Aún no hay orígenes: aparecen con las primeras notificaciones.", cap_persistent: "Notificaciones persistentes", cap_persistent_help: "Las que las integraciones publican en Home Assistant (la campana de la barra lateral) también pasan por el hub, como info.", cap_repairs: "Nuevas reparaciones", cap_repairs_help: "Cada nueva reparación pasa por el hub: una alerta para un error, una info para un aviso.", src_count: "{n} en 7 días", src_last: "última {t}", src_edit: "Personalizar", src_name: "Nombre", src_icon: "Icono", src_color: "Color", src_priority: "Prioridad", src_as_sent: "Como se envió", src_people: "Solo estas personas", src_people_help: "Ninguna marcada: según la prioridad.", src_dedup_help: "Vacío: el plazo del hub.", src_quiet: "Incluso en silencio", src_quiet_tag: "Silencio ignorado", src_quiet_help: "Las alertas e infos de este origen no se retienen.", src_muted_help: "Guardada en el registro, enviada a nadie.", src_reset: "Quitar la personalización", st_muted: "Silenciada", src_add: "Añadir", src_pick: "Ajustar un origen de antemano: elegir una integración…", p_sources: "Solo para ellos:" },
  it: { tab_journal: "Registro", tab_routing: "Instradamento", tab_rules: "Regole", tab_settings: "Impostazioni", c_sent: "Inviate oggi", c_grouped: "Nel riepilogo", c_duplicates: "Duplicati evitati (7 g)", c_pending: "Critiche da confermare", c_held: "Trattenute dal silenzio", f_all: "Tutte", f_critical: "Critiche", f_pending: "Da confermare", f_grouped: "Nel riepilogo", f_held: "Trattenute", f_duplicate: "Duplicati", col_message: "Messaggio", col_source: "Origine", col_people: "Persone", col_time: "Ora", col_status: "Stato", empty: "Nessuna notifica", people: "Persone e canali", home: "In casa", away: "Fuori", channels: "Canali", found: "Trovati automaticamente", custom: "Impostati a mano", reset: "Torna all’automatico", no_channel: "Nessun canale", no_people: "Nessuna persona in Home Assistant", escalation: "Escalation delle critiche", escalation_text: "Le persone interessate, poi tutti dopo {a} min, poi il servizio SMS dopo {b} min. Si ferma appena qualcuno conferma.", rules_priorities: "Priorità", p_critical: "Subito, anche nel silenzio, suono critico, fino alla conferma", p_alert: "I presenti (tutti se non c’è nessuno), trattenuta nel silenzio", p_info: "I presenti, trattenuta nel silenzio; nessuno in casa: il prossimo riepilogo", p_digest: "Sempre raggruppata, inviata agli orari del riepilogo", quiet: "Ore di silenzio", quiet_start: "Inizio", quiet_end: "Fine", dedup: "Ignora i duplicati per", dedup_text: "Stesso argomento (o stesso titolo e messaggio) in questo tempo", digest_times: "Orari del riepilogo", add_time: "Aggiungi", away_mode: "Modalità assenza", away_text: "Nessuno in casa: le info vanno a tutti invece che al riepilogo", sms: "Servizio SMS", sms_none: "Nessuno", esc_first: "Di nuovo a tutti dopo", esc_second: "SMS dopo", retention: "Conserva il registro", days: "giorni", minutes: "min", test: "Invia un test", test_info: "Test info", test_critical: "Test critico", digest_now: "Invia il riepilogo ora", save: "Salva", saved: "Salvato", sent_ok: "Inviato", error: "Errore", subtitle_quiet: "Silenzio fino alle {t}", subtitle_ok: "{n} inviate oggi", acknowledge_all: "Conferma tutte", hide_header: "Nascondi la barra superiore", hide_header_help: "Le schede restano, con il menu e i pulsanti sulla loro riga.", st_nobody: "Nessuno da avvisare", st_failed: "Non riuscita", tab_sources: "Origini", src_list: "Origini delle notifiche", src_capture: "Catturate in Home Assistant", src_help: "Un’origine è trovata da sola: l’integrazione delle entità dell’automazione che invia, o l’origine data a notify_hub.send (un’integrazione, un’entità o un testo). La sua regola si applica prima di quelle dell’hub.", src_empty: "Ancora nessuna origine: compaiono con le prime notifiche.", cap_persistent: "Notifiche persistenti", cap_persistent_help: "Quelle che le integrazioni pubblicano in Home Assistant (la campanella della barra laterale) passano anche dall’hub, come info.", cap_repairs: "Nuove riparazioni", cap_repairs_help: "Ogni nuova riparazione passa dall’hub: un avviso per un errore, un’info per un avvertimento.", src_count: "{n} in 7 giorni", src_last: "ultima {t}", src_edit: "Personalizza", src_name: "Nome", src_icon: "Icona", src_color: "Colore", src_priority: "Priorità", src_as_sent: "Come inviata", src_people: "Solo queste persone", src_people_help: "Nessuna spuntata: secondo la priorità.", src_dedup_help: "Vuoto: il tempo dell’hub.", src_quiet: "Anche nel silenzio", src_quiet_tag: "Silenzio ignorato", src_quiet_help: "Avvisi e info di questa origine non sono trattenuti.", src_muted_help: "Tenuta nel registro, inviata a nessuno.", src_reset: "Togli la personalizzazione", st_muted: "Silenziata", src_add: "Aggiungi", src_pick: "Imposta un’origine in anticipo: scegli un’integrazione…", p_sources: "Solo per loro:" },
  nl: { tab_journal: "Logboek", tab_routing: "Routering", tab_rules: "Regels", tab_settings: "Instellingen", c_sent: "Vandaag verstuurd", c_grouped: "In het overzicht", c_duplicates: "Dubbele vermeden (7 d)", c_pending: "Kritiek te bevestigen", c_held: "Vastgehouden (stille uren)", f_all: "Alle", f_critical: "Kritiek", f_pending: "Te bevestigen", f_grouped: "In het overzicht", f_held: "Vastgehouden", f_duplicate: "Dubbel", col_message: "Bericht", col_source: "Bron", col_people: "Personen", col_time: "Tijd", col_status: "Status", empty: "Geen meldingen", people: "Personen en kanalen", home: "Thuis", away: "Afwezig", channels: "Kanalen", found: "Automatisch gevonden", custom: "Handmatig ingesteld", reset: "Terug naar automatisch", no_channel: "Geen kanaal", no_people: "Geen personen in Home Assistant", escalation: "Escalatie van kritieke", escalation_text: "De betrokken personen, dan iedereen na {a} min, dan de sms-dienst na {b} min. Stopt zodra iemand bevestigt.", rules_priorities: "Prioriteiten", p_critical: "Direct, ook in stille uren, kritiek geluid, tot bevestiging", p_alert: "Aanwezigen (iedereen als niemand thuis is), vastgehouden in stille uren", p_info: "Aanwezigen, vastgehouden in stille uren; niemand thuis: volgend overzicht", p_digest: "Altijd gegroepeerd, verstuurd op de tijden van het overzicht", quiet: "Stille uren", quiet_start: "Begin", quiet_end: "Einde", dedup: "Dubbele negeren gedurende", dedup_text: "Zelfde onderwerp (of titel en bericht) binnen deze tijd", digest_times: "Tijden van het overzicht", add_time: "Toevoegen", away_mode: "Afwezigheidsmodus", away_text: "Niemand thuis: info gaat naar iedereen in plaats van het overzicht", sms: "Sms-dienst", sms_none: "Geen", esc_first: "Opnieuw naar iedereen na", esc_second: "Sms na", retention: "Logboek bewaren", days: "dagen", minutes: "min", test: "Test versturen", test_info: "Infotest", test_critical: "Kritieke test", digest_now: "Overzicht nu versturen", save: "Opslaan", saved: "Opgeslagen", sent_ok: "Verstuurd", error: "Fout", subtitle_quiet: "Stil tot {t}", subtitle_ok: "{n} vandaag verstuurd", acknowledge_all: "Alles bevestigen", hide_header: "Bovenbalk verbergen", hide_header_help: "De tabbladen blijven, met het menu en de knoppen op hun rij.", st_nobody: "Niemand te melden", st_failed: "Mislukt", tab_sources: "Bronnen", src_list: "Bronnen van de meldingen", src_capture: "Opgevangen in Home Assistant", src_help: "Een bron wordt vanzelf gevonden: de integratie van de entiteiten van de verzendende automatisering, of de bron gegeven aan notify_hub.send (een integratie, entiteit of tekst). Haar regel geldt vóór de regels van de hub.", src_empty: "Nog geen bronnen: ze verschijnen met de eerste meldingen.", cap_persistent: "Blijvende meldingen", cap_persistent_help: "Die de integraties in Home Assistant plaatsen (de bel in de zijbalk) gaan ook via de hub, als info.", cap_repairs: "Nieuwe reparaties", cap_repairs_help: "Elke nieuwe reparatie gaat via de hub: een alarm bij een fout, een info bij een waarschuwing.", src_count: "{n} in 7 dagen", src_last: "laatst {t}", src_edit: "Aanpassen", src_name: "Naam", src_icon: "Pictogram", src_color: "Kleur", src_priority: "Prioriteit", src_as_sent: "Zoals verstuurd", src_people: "Alleen deze personen", src_people_help: "Geen aangevinkt: volgens de prioriteit.", src_dedup_help: "Leeg: de termijn van de hub.", src_quiet: "Ook in stille uren", src_quiet_tag: "Stille uren genegeerd", src_quiet_help: "Alarmen en info van deze bron worden niet vastgehouden.", src_muted_help: "Bewaard in het logboek, naar niemand verstuurd.", src_reset: "Aanpassing verwijderen", st_muted: "Gedempt", src_add: "Toevoegen", src_pick: "Bron vooraf instellen: kies een integratie…", p_sources: "Alleen voor hen:" },
  pt: { tab_journal: "Registo", tab_routing: "Encaminhamento", tab_rules: "Regras", tab_settings: "Definições", c_sent: "Enviadas hoje", c_grouped: "No resumo", c_duplicates: "Duplicados evitados (7 d)", c_pending: "Críticas por confirmar", c_held: "Retidas pelo silêncio", f_all: "Todas", f_critical: "Críticas", f_pending: "Por confirmar", f_grouped: "No resumo", f_held: "Retidas", f_duplicate: "Duplicados", col_message: "Mensagem", col_source: "Origem", col_people: "Pessoas", col_time: "Hora", col_status: "Estado", empty: "Sem notificações", people: "Pessoas e canais", home: "Em casa", away: "Fora", channels: "Canais", found: "Encontrados automaticamente", custom: "Definidos à mão", reset: "Voltar ao automático", no_channel: "Sem canal", no_people: "Sem pessoas no Home Assistant", escalation: "Escalada das críticas", escalation_text: "As pessoas visadas, depois todos após {a} min, depois o serviço SMS após {b} min. Para assim que alguém confirma.", rules_priorities: "Prioridades", p_critical: "Imediato, mesmo em silêncio, som crítico, até confirmar", p_alert: "Os presentes (todos se não estiver ninguém), retida em silêncio", p_info: "Os presentes, retida em silêncio; ninguém em casa: o próximo resumo", p_digest: "Sempre agrupada, enviada às horas do resumo", quiet: "Horas de silêncio", quiet_start: "Início", quiet_end: "Fim", dedup: "Ignorar duplicados durante", dedup_text: "Mesmo tema (ou mesmo título e mensagem) dentro deste tempo", digest_times: "Horas do resumo", add_time: "Adicionar", away_mode: "Modo ausência", away_text: "Ninguém em casa: as infos vão para todos em vez do resumo", sms: "Serviço SMS", sms_none: "Nenhum", esc_first: "De novo a todos após", esc_second: "SMS após", retention: "Manter o registo", days: "dias", minutes: "min", test: "Enviar um teste", test_info: "Teste info", test_critical: "Teste crítico", digest_now: "Enviar o resumo agora", save: "Guardar", saved: "Guardado", sent_ok: "Enviado", error: "Erro", subtitle_quiet: "Silêncio até às {t}", subtitle_ok: "{n} enviadas hoje", acknowledge_all: "Confirmar todas", hide_header: "Ocultar a barra superior", hide_header_help: "Os separadores ficam, com o menu e os botões na sua linha.", st_nobody: "Ninguém a avisar", st_failed: "Falhou", tab_sources: "Origens", src_list: "Origens das notificações", src_capture: "Captadas no Home Assistant", src_help: "Uma origem é encontrada sozinha: a integração das entidades da automatização que envia, ou a origem dada a notify_hub.send (uma integração, uma entidade ou um texto). A sua regra aplica-se antes das do hub.", src_empty: "Ainda sem origens: aparecem com as primeiras notificações.", cap_persistent: "Notificações persistentes", cap_persistent_help: "As que as integrações publicam no Home Assistant (o sino da barra lateral) também passam pelo hub, como info.", cap_repairs: "Novas reparações", cap_repairs_help: "Cada nova reparação passa pelo hub: um alerta para um erro, uma info para um aviso.", src_count: "{n} em 7 dias", src_last: "última {t}", src_edit: "Personalizar", src_name: "Nome", src_icon: "Ícone", src_color: "Cor", src_priority: "Prioridade", src_as_sent: "Como enviada", src_people: "Só estas pessoas", src_people_help: "Nenhuma marcada: conforme a prioridade.", src_dedup_help: "Vazio: o prazo do hub.", src_quiet: "Mesmo em silêncio", src_quiet_tag: "Silêncio ignorado", src_quiet_help: "Alertas e infos desta origem não são retidos.", src_muted_help: "Guardada no registo, enviada a ninguém.", src_reset: "Retirar a personalização", st_muted: "Silenciada", src_add: "Adicionar", src_pick: "Definir uma origem antecipadamente: escolher uma integração…", p_sources: "Só para eles:" },
  pl: { tab_journal: "Dziennik", tab_routing: "Kierowanie", tab_rules: "Reguły", tab_settings: "Ustawienia", c_sent: "Wysłane dziś", c_grouped: "W podsumowaniu", c_duplicates: "Uniknięte duplikaty (7 dni)", c_pending: "Krytyczne do potwierdzenia", c_held: "Wstrzymane przez ciszę", f_all: "Wszystkie", f_critical: "Krytyczne", f_pending: "Do potwierdzenia", f_grouped: "W podsumowaniu", f_held: "Wstrzymane", f_duplicate: "Duplikaty", col_message: "Wiadomość", col_source: "Źródło", col_people: "Osoby", col_time: "Czas", col_status: "Stan", empty: "Brak powiadomień", people: "Osoby i kanały", home: "W domu", away: "Poza domem", channels: "Kanały", found: "Znalezione automatycznie", custom: "Ustawione ręcznie", reset: "Wróć do automatycznych", no_channel: "Brak kanału", no_people: "Brak osób w Home Assistant", escalation: "Eskalacja krytycznych", escalation_text: "Zainteresowane osoby, potem wszyscy po {a} min, potem usługa SMS po {b} min. Kończy się, gdy ktoś potwierdzi.", rules_priorities: "Priorytety", p_critical: "Natychmiast, także w ciszy, dźwięk krytyczny, do potwierdzenia", p_alert: "Obecni (wszyscy, gdy nikogo nie ma), wstrzymane w ciszy", p_info: "Obecni, wstrzymane w ciszy; nikogo w domu: następne podsumowanie", p_digest: "Zawsze grupowane, wysyłane w godzinach podsumowania", quiet: "Godziny ciszy", quiet_start: "Początek", quiet_end: "Koniec", dedup: "Ignoruj duplikaty przez", dedup_text: "Ten sam temat (lub tytuł i treść) w tym czasie", digest_times: "Godziny podsumowania", add_time: "Dodaj", away_mode: "Tryb nieobecności", away_text: "Nikogo w domu: informacje trafiają do wszystkich zamiast do podsumowania", sms: "Usługa SMS", sms_none: "Brak", esc_first: "Ponownie do wszystkich po", esc_second: "SMS po", retention: "Przechowuj dziennik", days: "dni", minutes: "min", test: "Wyślij test", test_info: "Test informacji", test_critical: "Test krytyczny", digest_now: "Wyślij podsumowanie teraz", save: "Zapisz", saved: "Zapisano", sent_ok: "Wysłano", error: "Błąd", subtitle_quiet: "Cisza do {t}", subtitle_ok: "Wysłane dziś: {n}", acknowledge_all: "Potwierdź wszystkie", hide_header: "Ukryj górny pasek", hide_header_help: "Karty zostają, z menu i przyciskami w ich wierszu.", st_nobody: "Brak odbiorców", st_failed: "Błąd", tab_sources: "Źródła", src_list: "Źródła powiadomień", src_capture: "Przechwycone w Home Assistant", src_help: "Źródło jest ustalane samo: integracja encji automatyzacji, która wysyła, lub źródło podane w notify_hub.send (integracja, encja lub tekst). Jego reguła działa przed regułami huba.", src_empty: "Brak źródeł: pojawią się z pierwszymi powiadomieniami.", cap_persistent: "Powiadomienia trwałe", cap_persistent_help: "Te, które integracje publikują w Home Assistant (dzwonek paska bocznego), też przechodzą przez hub, jako informacje.", cap_repairs: "Nowe naprawy", cap_repairs_help: "Każda nowa naprawa przechodzi przez hub: alarm dla błędu, informacja dla ostrzeżenia.", src_count: "{n} w 7 dni", src_last: "ostatnio {t}", src_edit: "Dostosuj", src_name: "Nazwa", src_icon: "Ikona", src_color: "Kolor", src_priority: "Priorytet", src_as_sent: "Jak wysłano", src_people: "Tylko te osoby", src_people_help: "Żadna nie zaznaczona: według priorytetu.", src_dedup_help: "Puste: czas huba.", src_quiet: "Także w ciszy", src_quiet_tag: "Cisza pomijana", src_quiet_help: "Alarmy i informacje z tego źródła nie są wstrzymywane.", src_muted_help: "Zostaje w dzienniku, nie trafia do nikogo.", src_reset: "Usuń dostosowanie", st_muted: "Wyciszone", src_add: "Dodaj", src_pick: "Ustaw źródło z góry: wybierz integrację…", p_sources: "Tylko dla nich:" },
  sr: { tab_journal: "Дневник", tab_routing: "Усмеравање", tab_rules: "Правила", tab_settings: "Подешавања", c_sent: "Послато данас", c_grouped: "У прегледу", c_duplicates: "Избегнути дупликати (7 д)", c_pending: "Критична за потврду", c_held: "Задржано тихим сатима", f_all: "Сва", f_critical: "Критична", f_pending: "За потврду", f_grouped: "У прегледу", f_held: "Задржана", f_duplicate: "Дупликати", col_message: "Порука", col_source: "Извор", col_people: "Особе", col_time: "Време", col_status: "Стање", empty: "Нема обавештења", people: "Особе и канали", home: "Код куће", away: "Одсутан", channels: "Канали", found: "Пронађени аутоматски", custom: "Подешени ручно", reset: "Назад на аутоматски", no_channel: "Нема канала", no_people: "Нема особа у Home Assistant", escalation: "Понављање критичних", escalation_text: "Особе на које се односи, затим сви после {a} мин, затим СМС услуга после {b} мин. Стаје чим неко потврди.", rules_priorities: "Приоритети", p_critical: "Одмах, и у тихим сатима, критичан звук, до потврде", p_alert: "Присутни (сви ако нико није ту), задржано у тихим сатима", p_info: "Присутни, задржано у тихим сатима; нико код куће: следећи преглед", p_digest: "Увек груписано, шаље се у времена прегледа", quiet: "Тихи сати", quiet_start: "Почетак", quiet_end: "Крај", dedup: "Занемари дупликате током", dedup_text: "Иста тема (или исти наслов и порука) у овом року", digest_times: "Времена прегледа", add_time: "Додај", away_mode: "Режим одсуства", away_text: "Нико код куће: информације иду свима уместо у преглед", sms: "СМС услуга", sms_none: "Ниједна", esc_first: "Поново свима после", esc_second: "СМС после", retention: "Чувај дневник", days: "дана", minutes: "мин", test: "Пошаљи пробу", test_info: "Проба информације", test_critical: "Критична проба", digest_now: "Пошаљи преглед сада", save: "Сачувај", saved: "Сачувано", sent_ok: "Послато", error: "Грешка", subtitle_quiet: "Тихи сати до {t}", subtitle_ok: "Послато данас: {n}", acknowledge_all: "Потврди сва", hide_header: "Сакриј горњу траку", hide_header_help: "Картице остају, са менијем и дугмадима у њиховом реду.", st_nobody: "Нема коме да се јави", st_failed: "Неуспело", tab_sources: "Извори", src_list: "Извори обавештења", src_capture: "Ухваћено у Home Assistant", src_help: "Извор се проналази сам: интеграција ентитета аутоматизације која шаље, или извор дат у notify_hub.send (интеграција, ентитет или текст). Његово правило важи пре правила хаба.", src_empty: "Још нема извора: појављују се са првим обавештењима.", cap_persistent: "Трајна обавештења", cap_persistent_help: "Она која интеграције објављују у Home Assistant (звонце бочне траке) такође иду кроз хаб, као информације.", cap_repairs: "Нове поправке", cap_repairs_help: "Свака нова поправка иде кроз хаб: узбуна за грешку, информација за упозорење.", src_count: "{n} за 7 дана", src_last: "последње {t}", src_edit: "Прилагоди", src_name: "Назив", src_icon: "Иконица", src_color: "Боја", src_priority: "Приоритет", src_as_sent: "Како је послато", src_people: "Само ове особе", src_people_help: "Ниједна означена: према приоритету.", src_dedup_help: "Празно: рок хаба.", src_quiet: "И у тихим сатима", src_quiet_tag: "Тихи сати занемарени", src_quiet_help: "Узбуне и информације овог извора се не задржавају.", src_muted_help: "Чува се у дневнику, не шаље се никоме.", src_reset: "Уклони прилагођавање", st_muted: "Утишано", src_add: "Додај", src_pick: "Подеси извор унапред: изабери интеграцију…", p_sources: "Само за њих:" },
  "sr-Latn": { tab_journal: "Dnevnik", tab_routing: "Usmeravanje", tab_rules: "Pravila", tab_settings: "Podešavanja", c_sent: "Poslato danas", c_grouped: "U pregledu", c_duplicates: "Izbegnuti duplikati (7 d)", c_pending: "Kritična za potvrdu", c_held: "Zadržano tihim satima", f_all: "Sva", f_critical: "Kritična", f_pending: "Za potvrdu", f_grouped: "U pregledu", f_held: "Zadržana", f_duplicate: "Duplikati", col_message: "Poruka", col_source: "Izvor", col_people: "Osobe", col_time: "Vreme", col_status: "Stanje", empty: "Nema obaveštenja", people: "Osobe i kanali", home: "Kod kuće", away: "Odsutan", channels: "Kanali", found: "Pronađeni automatski", custom: "Podešeni ručno", reset: "Nazad na automatski", no_channel: "Nema kanala", no_people: "Nema osoba u Home Assistant", escalation: "Ponavljanje kritičnih", escalation_text: "Osobe na koje se odnosi, zatim svi posle {a} min, zatim SMS usluga posle {b} min. Staje čim neko potvrdi.", rules_priorities: "Prioriteti", p_critical: "Odmah, i u tihim satima, kritičan zvuk, do potvrde", p_alert: "Prisutni (svi ako niko nije tu), zadržano u tihim satima", p_info: "Prisutni, zadržano u tihim satima; niko kod kuće: sledeći pregled", p_digest: "Uvek grupisano, šalje se u vremena pregleda", quiet: "Tihi sati", quiet_start: "Početak", quiet_end: "Kraj", dedup: "Zanemari duplikate tokom", dedup_text: "Ista tema (ili isti naslov i poruka) u ovom roku", digest_times: "Vremena pregleda", add_time: "Dodaj", away_mode: "Režim odsustva", away_text: "Niko kod kuće: informacije idu svima umesto u pregled", sms: "SMS usluga", sms_none: "Nijedna", esc_first: "Ponovo svima posle", esc_second: "SMS posle", retention: "Čuvaj dnevnik", days: "dana", minutes: "min", test: "Pošalji probu", test_info: "Proba informacije", test_critical: "Kritična proba", digest_now: "Pošalji pregled sada", save: "Sačuvaj", saved: "Sačuvano", sent_ok: "Poslato", error: "Greška", subtitle_quiet: "Tihi sati do {t}", subtitle_ok: "Poslato danas: {n}", acknowledge_all: "Potvrdi sva", hide_header: "Sakrij gornju traku", hide_header_help: "Kartice ostaju, sa menijem i dugmadima u njihovom redu.", st_nobody: "Nema kome da se javi", st_failed: "Neuspelo", tab_sources: "Izvori", src_list: "Izvori obaveštenja", src_capture: "Uhvaćeno u Home Assistant", src_help: "Izvor se pronalazi sam: integracija entiteta automatizacije koja šalje, ili izvor dat u notify_hub.send (integracija, entitet ili tekst). Njegovo pravilo važi pre pravila haba.", src_empty: "Još nema izvora: pojavljuju se sa prvim obaveštenjima.", cap_persistent: "Trajna obaveštenja", cap_persistent_help: "Ona koja integracije objavljuju u Home Assistant (zvonce bočne trake) takođe idu kroz hab, kao informacije.", cap_repairs: "Nove popravke", cap_repairs_help: "Svaka nova popravka ide kroz hab: uzbuna za grešku, informacija za upozorenje.", src_count: "{n} za 7 dana", src_last: "poslednje {t}", src_edit: "Prilagodi", src_name: "Naziv", src_icon: "Ikonica", src_color: "Boja", src_priority: "Prioritet", src_as_sent: "Kako je poslato", src_people: "Samo ove osobe", src_people_help: "Nijedna označena: prema prioritetu.", src_dedup_help: "Prazno: rok haba.", src_quiet: "I u tihim satima", src_quiet_tag: "Tihi sati zanemareni", src_quiet_help: "Uzbune i informacije ovog izvora se ne zadržavaju.", src_muted_help: "Čuva se u dnevniku, ne šalje se nikome.", src_reset: "Ukloni prilagođavanje", st_muted: "Utišano", src_add: "Dodaj", src_pick: "Podesi izvor unapred: izaberi integraciju…", p_sources: "Samo za njih:" },
  ro: { tab_journal: "Jurnal", tab_routing: "Direcționare", tab_rules: "Reguli", tab_settings: "Setări", c_sent: "Trimise azi", c_grouped: "În rezumat", c_duplicates: "Duplicate evitate (7 z)", c_pending: "Critice de confirmat", c_held: "Reținute de liniște", f_all: "Toate", f_critical: "Critice", f_pending: "De confirmat", f_grouped: "În rezumat", f_held: "Reținute", f_duplicate: "Duplicate", col_message: "Mesaj", col_source: "Sursă", col_people: "Persoane", col_time: "Ora", col_status: "Stare", empty: "Nicio notificare", people: "Persoane și canale", home: "Acasă", away: "Plecat", channels: "Canale", found: "Găsite automat", custom: "Setate manual", reset: "Înapoi la automat", no_channel: "Niciun canal", no_people: "Nicio persoană în Home Assistant", escalation: "Escaladarea celor critice", escalation_text: "Persoanele vizate, apoi toți după {a} min, apoi serviciul SMS după {b} min. Se oprește când cineva confirmă.", rules_priorities: "Priorități", p_critical: "Imediat, chiar și în liniște, sunet critic, până la confirmare", p_alert: "Cei prezenți (toți dacă nu e nimeni), reținută în liniște", p_info: "Cei prezenți, reținută în liniște; nimeni acasă: următorul rezumat", p_digest: "Mereu grupată, trimisă la orele rezumatului", quiet: "Ore de liniște", quiet_start: "Început", quiet_end: "Sfârșit", dedup: "Ignoră duplicatele timp de", dedup_text: "Același subiect (sau același titlu și mesaj) în acest interval", digest_times: "Orele rezumatului", add_time: "Adaugă", away_mode: "Mod absență", away_text: "Nimeni acasă: informările merg la toți în loc de rezumat", sms: "Serviciu SMS", sms_none: "Niciunul", esc_first: "Din nou la toți după", esc_second: "SMS după", retention: "Păstrează jurnalul", days: "zile", minutes: "min", test: "Trimite un test", test_info: "Test informare", test_critical: "Test critic", digest_now: "Trimite rezumatul acum", save: "Salvează", saved: "Salvat", sent_ok: "Trimis", error: "Eroare", subtitle_quiet: "Liniște până la {t}", subtitle_ok: "Trimise azi: {n}", acknowledge_all: "Confirmă toate", hide_header: "Ascunde bara de sus", hide_header_help: "Filele rămân, cu meniul și butoanele pe rândul lor.", st_nobody: "Nimeni de anunțat", st_failed: "Eșuată", tab_sources: "Surse", src_list: "Sursele notificărilor", src_capture: "Captate în Home Assistant", src_help: "O sursă se găsește singură: integrarea entităților automatizării care trimite, sau sursa dată la notify_hub.send (o integrare, o entitate sau un text). Regula ei se aplică înaintea regulilor hubului.", src_empty: "Încă nicio sursă: apar odată cu primele notificări.", cap_persistent: "Notificări persistente", cap_persistent_help: "Cele pe care integrările le publică în Home Assistant (clopoțelul barei laterale) trec și prin hub, ca informări.", cap_repairs: "Reparații noi", cap_repairs_help: "Fiecare reparație nouă trece prin hub: o alertă pentru o eroare, o informare pentru un avertisment.", src_count: "{n} în 7 zile", src_last: "ultima {t}", src_edit: "Personalizează", src_name: "Nume", src_icon: "Pictogramă", src_color: "Culoare", src_priority: "Prioritate", src_as_sent: "Cum a fost trimisă", src_people: "Doar aceste persoane", src_people_help: "Niciuna bifată: după prioritate.", src_dedup_help: "Gol: intervalul hubului.", src_quiet: "Chiar și în liniște", src_quiet_tag: "Liniște ignorată", src_quiet_help: "Alertele și informările acestei surse nu sunt reținute.", src_muted_help: "Păstrată în jurnal, trimisă nimănui.", src_reset: "Elimină personalizarea", st_muted: "Silențioasă", src_add: "Adaugă", src_pick: "Setează o sursă dinainte: alege o integrare…", p_sources: "Doar pentru ei:" },
  da: { tab_journal: "Journal", tab_routing: "Routing", tab_rules: "Regler", tab_settings: "Indstillinger", c_sent: "Sendt i dag", c_grouped: "I oversigten", c_duplicates: "Undgåede dubletter (7 d)", c_pending: "Kritiske at bekræfte", c_held: "Holdt tilbage (stille timer)", f_all: "Alle", f_critical: "Kritiske", f_pending: "Skal bekræftes", f_grouped: "I oversigten", f_held: "Holdt tilbage", f_duplicate: "Dubletter", col_message: "Besked", col_source: "Kilde", col_people: "Personer", col_time: "Tid", col_status: "Status", empty: "Ingen notifikationer", people: "Personer og kanaler", home: "Hjemme", away: "Ude", channels: "Kanaler", found: "Fundet automatisk", custom: "Sat manuelt", reset: "Tilbage til automatisk", no_channel: "Ingen kanal", no_people: "Ingen personer i Home Assistant", escalation: "Eskalering af kritiske", escalation_text: "De berørte personer, så alle efter {a} min, så sms-tjenesten efter {b} min. Stopper, så snart nogen bekræfter.", rules_priorities: "Prioriteter", p_critical: "Straks, også i stille timer, kritisk lyd, indtil bekræftet", p_alert: "De hjemme (alle når ingen er hjemme), holdt tilbage i stille timer", p_info: "De hjemme, holdt tilbage i stille timer; ingen hjemme: næste oversigt", p_digest: "Altid grupperet, sendt på oversigtens tidspunkter", quiet: "Stille timer", quiet_start: "Start", quiet_end: "Slut", dedup: "Ignorer dubletter i", dedup_text: "Samme emne (eller titel og besked) inden for denne tid", digest_times: "Tidspunkter for oversigten", add_time: "Tilføj", away_mode: "Fraværstilstand", away_text: "Ingen hjemme: info går til alle i stedet for oversigten", sms: "Sms-tjeneste", sms_none: "Ingen", esc_first: "Igen til alle efter", esc_second: "Sms efter", retention: "Behold journalen", days: "dage", minutes: "min", test: "Send en test", test_info: "Infotest", test_critical: "Kritisk test", digest_now: "Send oversigten nu", save: "Gem", saved: "Gemt", sent_ok: "Sendt", error: "Fejl", subtitle_quiet: "Stille til {t}", subtitle_ok: "{n} sendt i dag", acknowledge_all: "Bekræft alle", hide_header: "Skjul topbjælken", hide_header_help: "Fanerne bliver, med menuen og knapperne på deres række.", st_nobody: "Ingen at underrette", st_failed: "Mislykkedes", tab_sources: "Kilder", src_list: "Notifikationernes kilder", src_capture: "Opfanget i Home Assistant", src_help: "En kilde findes af sig selv: integrationen for enhederne i den afsendende automatisering, eller kilden givet til notify_hub.send (en integration, en enhed eller en tekst). Dens regel gælder før hubbens regler.", src_empty: "Ingen kilder endnu: de vises med de første notifikationer.", cap_persistent: "Vedvarende notifikationer", cap_persistent_help: "Dem, integrationer viser i Home Assistant (klokken i sidebjælken), går også gennem hubben, som info.", cap_repairs: "Nye reparationer", cap_repairs_help: "Hver ny reparation går gennem hubben: en alarm for en fejl, en info for en advarsel.", src_count: "{n} på 7 dage", src_last: "seneste {t}", src_edit: "Tilpas", src_name: "Navn", src_icon: "Ikon", src_color: "Farve", src_priority: "Prioritet", src_as_sent: "Som sendt", src_people: "Kun disse personer", src_people_help: "Ingen afkrydset: efter prioriteten.", src_dedup_help: "Tom: hubbens frist.", src_quiet: "Også i stille timer", src_quiet_tag: "Stille timer ignoreret", src_quiet_help: "Alarmer og info fra denne kilde holdes ikke tilbage.", src_muted_help: "Gemt i loggen, sendt til ingen.", src_reset: "Fjern tilpasningen", st_muted: "Lydløs", src_add: "Tilføj", src_pick: "Indstil en kilde på forhånd: vælg en integration…", p_sources: "Kun for dem:" },
  sv: { tab_journal: "Logg", tab_routing: "Dirigering", tab_rules: "Regler", tab_settings: "Inställningar", c_sent: "Skickade i dag", c_grouped: "I sammanfattningen", c_duplicates: "Undvikna dubbletter (7 d)", c_pending: "Kritiska att bekräfta", c_held: "Hållna (tysta timmar)", f_all: "Alla", f_critical: "Kritiska", f_pending: "Att bekräfta", f_grouped: "I sammanfattningen", f_held: "Hållna", f_duplicate: "Dubbletter", col_message: "Meddelande", col_source: "Källa", col_people: "Personer", col_time: "Tid", col_status: "Status", empty: "Inga aviseringar", people: "Personer och kanaler", home: "Hemma", away: "Borta", channels: "Kanaler", found: "Hittade automatiskt", custom: "Inställda manuellt", reset: "Tillbaka till automatiskt", no_channel: "Ingen kanal", no_people: "Inga personer i Home Assistant", escalation: "Eskalering av kritiska", escalation_text: "De berörda personerna, sedan alla efter {a} min, sedan sms-tjänsten efter {b} min. Stoppar så snart någon bekräftar.", rules_priorities: "Prioriteter", p_critical: "Direkt, även under tysta timmar, kritiskt ljud, tills bekräftad", p_alert: "De hemma (alla när ingen är hemma), hållen under tysta timmar", p_info: "De hemma, hållen under tysta timmar; ingen hemma: nästa sammanfattning", p_digest: "Alltid grupperad, skickas vid sammanfattningens tider", quiet: "Tysta timmar", quiet_start: "Början", quiet_end: "Slut", dedup: "Ignorera dubbletter i", dedup_text: "Samma ämne (eller rubrik och meddelande) inom denna tid", digest_times: "Tider för sammanfattningen", add_time: "Lägg till", away_mode: "Bortaläge", away_text: "Ingen hemma: info går till alla i stället för sammanfattningen", sms: "Sms-tjänst", sms_none: "Ingen", esc_first: "Igen till alla efter", esc_second: "Sms efter", retention: "Behåll loggen", days: "dagar", minutes: "min", test: "Skicka ett test", test_info: "Infotest", test_critical: "Kritiskt test", digest_now: "Skicka sammanfattningen nu", save: "Spara", saved: "Sparad", sent_ok: "Skickad", error: "Fel", subtitle_quiet: "Tyst till {t}", subtitle_ok: "{n} skickade i dag", acknowledge_all: "Bekräfta alla", hide_header: "Dölj det övre fältet", hide_header_help: "Flikarna finns kvar, med menyn och knapparna på deras rad.", st_nobody: "Ingen att avisera", st_failed: "Misslyckades", tab_sources: "Källor", src_list: "Aviseringarnas källor", src_capture: "Fångade i Home Assistant", src_help: "En källa hittas av sig själv: integrationen för entiteterna i den sändande automatiseringen, eller källan som ges till notify_hub.send (en integration, en entitet eller en text). Dess regel gäller före hubbens regler.", src_empty: "Inga källor än: de visas med de första aviseringarna.", cap_persistent: "Beständiga aviseringar", cap_persistent_help: "De som integrationer visar i Home Assistant (klockan i sidofältet) går också genom hubben, som info.", cap_repairs: "Nya reparationer", cap_repairs_help: "Varje ny reparation går genom hubben: ett larm för ett fel, en info för en varning.", src_count: "{n} på 7 dagar", src_last: "senast {t}", src_edit: "Anpassa", src_name: "Namn", src_icon: "Ikon", src_color: "Färg", src_priority: "Prioritet", src_as_sent: "Som skickad", src_people: "Bara dessa personer", src_people_help: "Ingen markerad: enligt prioriteten.", src_dedup_help: "Tomt: hubbens tid.", src_quiet: "Även under tysta timmar", src_quiet_tag: "Tysta timmar ignoreras", src_quiet_help: "Larm och info från denna källa hålls inte kvar.", src_muted_help: "Sparas i loggen, skickas till ingen.", src_reset: "Ta bort anpassningen", st_muted: "Tystad", src_add: "Lägg till", src_pick: "Ställ in en källa i förväg: välj en integration…", p_sources: "Bara för dem:" },
  bg: { tab_journal: "Дневник", tab_routing: "Маршрутизиране", tab_rules: "Правила", tab_settings: "Настройки", c_sent: "Изпратени днес", c_grouped: "В обобщението", c_duplicates: "Избегнати дубликати (7 д)", c_pending: "Критични за потвърждение", c_held: "Задържани от тихите часове", f_all: "Всички", f_critical: "Критични", f_pending: "За потвърждение", f_grouped: "В обобщението", f_held: "Задържани", f_duplicate: "Дубликати", col_message: "Съобщение", col_source: "Източник", col_people: "Хора", col_time: "Час", col_status: "Състояние", empty: "Няма известия", people: "Хора и канали", home: "У дома", away: "Навън", channels: "Канали", found: "Открити автоматично", custom: "Зададени ръчно", reset: "Обратно към автоматично", no_channel: "Няма канал", no_people: "Няма хора в Home Assistant", escalation: "Ескалация на критичните", escalation_text: "Засегнатите хора, после всички след {a} мин, после SMS услугата след {b} мин. Спира щом някой потвърди.", rules_priorities: "Приоритети", p_critical: "Веднага, и в тихите часове, критичен звук, до потвърждение", p_alert: "Присъстващите (всички, ако няма никой), задържано в тихите часове", p_info: "Присъстващите, задържано в тихите часове; никой у дома: следващото обобщение", p_digest: "Винаги групирано, изпраща се в часовете на обобщението", quiet: "Тихи часове", quiet_start: "Начало", quiet_end: "Край", dedup: "Пренебрегвай дубликати за", dedup_text: "Същата тема (или заглавие и съобщение) в този срок", digest_times: "Часове на обобщението", add_time: "Добави", away_mode: "Режим отсъствие", away_text: "Никой у дома: информацията отива до всички вместо в обобщението", sms: "SMS услуга", sms_none: "Няма", esc_first: "Отново до всички след", esc_second: "SMS след", retention: "Пази дневника", days: "дни", minutes: "мин", test: "Изпрати тест", test_info: "Тест информация", test_critical: "Критичен тест", digest_now: "Изпрати обобщението сега", save: "Запази", saved: "Запазено", sent_ok: "Изпратено", error: "Грешка", subtitle_quiet: "Тихо до {t}", subtitle_ok: "Изпратени днес: {n}", acknowledge_all: "Потвърди всички", hide_header: "Скрий горната лента", hide_header_help: "Разделите остават, с менюто и бутоните на техния ред.", st_nobody: "Няма кого да известим", st_failed: "Неуспешно", tab_sources: "Източници", src_list: "Източници на известията", src_capture: "Прихванати в Home Assistant", src_help: "Източникът се открива сам: интеграцията на обектите на изпращащата автоматизация или източникът, подаден на notify_hub.send (интеграция, обект или текст). Правилото му важи преди правилата на хъба.", src_empty: "Още няма източници: появяват се с първите известия.", cap_persistent: "Постоянни известия", cap_persistent_help: "Тези, които интеграциите публикуват в Home Assistant (камбанката на страничната лента), също минават през хъба, като информация.", cap_repairs: "Нови поправки", cap_repairs_help: "Всяка нова поправка минава през хъба: тревога при грешка, информация при предупреждение.", src_count: "{n} за 7 дни", src_last: "последно {t}", src_edit: "Персонализиране", src_name: "Име", src_icon: "Икона", src_color: "Цвят", src_priority: "Приоритет", src_as_sent: "Както е изпратено", src_people: "Само тези хора", src_people_help: "Нищо отметнато: според приоритета.", src_dedup_help: "Празно: срокът на хъба.", src_quiet: "Дори в тихите часове", src_quiet_tag: "Тихите часове се пренебрегват", src_quiet_help: "Тревогите и информацията от този източник не се задържат.", src_muted_help: "Пази се в дневника, не се изпраща на никого.", src_reset: "Премахване на персонализирането", st_muted: "Заглушено", src_add: "Добавяне", src_pick: "Задайте източник предварително: изберете интеграция…", p_sources: "Само за тях:" },
  ru: { tab_journal: "Журнал", tab_routing: "Маршрутизация", tab_rules: "Правила", tab_settings: "Настройки", c_sent: "Отправлено сегодня", c_grouped: "В сводке", c_duplicates: "Избежано дублей (7 дн.)", c_pending: "Критические к подтверждению", c_held: "Задержаны тихими часами", f_all: "Все", f_critical: "Критические", f_pending: "К подтверждению", f_grouped: "В сводке", f_held: "Задержанные", f_duplicate: "Дубли", col_message: "Сообщение", col_source: "Источник", col_people: "Люди", col_time: "Время", col_status: "Статус", empty: "Нет уведомлений", people: "Люди и каналы", home: "Дома", away: "Не дома", channels: "Каналы", found: "Найдены автоматически", custom: "Заданы вручную", reset: "Вернуть автоматически", no_channel: "Нет канала", no_people: "Нет людей в Home Assistant", escalation: "Эскалация критических", escalation_text: "Нужные люди, затем все через {a} мин, затем служба SMS через {b} мин. Прекращается, как только кто-то подтвердит.", rules_priorities: "Приоритеты", p_critical: "Сразу, даже в тихие часы, критический звук, до подтверждения", p_alert: "Присутствующие (все, если дома никого), задерживается в тихие часы", p_info: "Присутствующие, задерживается в тихие часы; дома никого: следующая сводка", p_digest: "Всегда группируется, отправляется во время сводки", quiet: "Тихие часы", quiet_start: "Начало", quiet_end: "Конец", dedup: "Игнорировать дубли в течение", dedup_text: "Та же тема (или заголовок и сообщение) в этот срок", digest_times: "Время сводки", add_time: "Добавить", away_mode: "Режим отсутствия", away_text: "Дома никого: информация уходит всем вместо сводки", sms: "Служба SMS", sms_none: "Нет", esc_first: "Снова всем через", esc_second: "SMS через", retention: "Хранить журнал", days: "дн.", minutes: "мин", test: "Отправить тест", test_info: "Тест информации", test_critical: "Критический тест", digest_now: "Отправить сводку сейчас", save: "Сохранить", saved: "Сохранено", sent_ok: "Отправлено", error: "Ошибка", subtitle_quiet: "Тишина до {t}", subtitle_ok: "Отправлено сегодня: {n}", acknowledge_all: "Подтвердить все", hide_header: "Скрыть верхнюю панель", hide_header_help: "Вкладки остаются, с меню и кнопками в их строке.", st_nobody: "Некого уведомить", st_failed: "Ошибка", tab_sources: "Источники", src_list: "Источники уведомлений", src_capture: "Перехвачено в Home Assistant", src_help: "Источник определяется сам: интеграция объектов отправляющей автоматизации или источник, переданный в notify_hub.send (интеграция, объект или текст). Его правило применяется до правил хаба.", src_empty: "Источников пока нет: они появятся с первыми уведомлениями.", cap_persistent: "Постоянные уведомления", cap_persistent_help: "Те, что интеграции публикуют в Home Assistant (колокольчик боковой панели), тоже проходят через хаб, как информация.", cap_repairs: "Новые исправления", cap_repairs_help: "Каждое новое исправление проходит через хаб: тревога при ошибке, информация при предупреждении.", src_count: "{n} за 7 дней", src_last: "последнее {t}", src_edit: "Настроить", src_name: "Имя", src_icon: "Значок", src_color: "Цвет", src_priority: "Приоритет", src_as_sent: "Как отправлено", src_people: "Только эти люди", src_people_help: "Ничего не отмечено: по приоритету.", src_dedup_help: "Пусто: срок хаба.", src_quiet: "Даже в тихие часы", src_quiet_tag: "Тихие часы игнорируются", src_quiet_help: "Тревоги и информация этого источника не задерживаются.", src_muted_help: "Хранится в журнале, никому не отправляется.", src_reset: "Убрать настройку", st_muted: "Без звука", src_add: "Добавить", src_pick: "Настроить источник заранее: выберите интеграцию…", p_sources: "Только для них:" },
  uk: { tab_journal: "Журнал", tab_routing: "Маршрутизація", tab_rules: "Правила", tab_settings: "Налаштування", c_sent: "Надіслано сьогодні", c_grouped: "У підсумку", c_duplicates: "Уникнуто дублікатів (7 дн.)", c_pending: "Критичні до підтвердження", c_held: "Затримані тихими годинами", f_all: "Усі", f_critical: "Критичні", f_pending: "До підтвердження", f_grouped: "У підсумку", f_held: "Затримані", f_duplicate: "Дублікати", col_message: "Повідомлення", col_source: "Джерело", col_people: "Люди", col_time: "Час", col_status: "Стан", empty: "Немає сповіщень", people: "Люди та канали", home: "Вдома", away: "Не вдома", channels: "Канали", found: "Знайдено автоматично", custom: "Задано вручну", reset: "Повернути автоматично", no_channel: "Немає каналу", no_people: "Немає людей у Home Assistant", escalation: "Ескалація критичних", escalation_text: "Потрібні люди, потім усі через {a} хв, потім служба SMS через {b} хв. Припиняється, щойно хтось підтвердить.", rules_priorities: "Пріоритети", p_critical: "Одразу, навіть у тихі години, критичний звук, до підтвердження", p_alert: "Присутні (усі, якщо вдома нікого), затримується в тихі години", p_info: "Присутні, затримується в тихі години; вдома нікого: наступний підсумок", p_digest: "Завжди групується, надсилається в час підсумку", quiet: "Тихі години", quiet_start: "Початок", quiet_end: "Кінець", dedup: "Ігнорувати дублікати протягом", dedup_text: "Та сама тема (або заголовок і повідомлення) в цей строк", digest_times: "Час підсумку", add_time: "Додати", away_mode: "Режим відсутності", away_text: "Вдома нікого: інформація йде всім замість підсумку", sms: "Служба SMS", sms_none: "Немає", esc_first: "Знову всім через", esc_second: "SMS через", retention: "Зберігати журнал", days: "дн.", minutes: "хв", test: "Надіслати тест", test_info: "Тест інформації", test_critical: "Критичний тест", digest_now: "Надіслати підсумок зараз", save: "Зберегти", saved: "Збережено", sent_ok: "Надіслано", error: "Помилка", subtitle_quiet: "Тиша до {t}", subtitle_ok: "Надіслано сьогодні: {n}", acknowledge_all: "Підтвердити всі", hide_header: "Сховати верхню панель", hide_header_help: "Вкладки залишаються, з меню та кнопками в їхньому рядку.", st_nobody: "Нікого сповістити", st_failed: "Помилка", tab_sources: "Джерела", src_list: "Джерела сповіщень", src_capture: "Перехоплено в Home Assistant", src_help: "Джерело визначається саме: інтеграція сутностей автоматизації, що надсилає, або джерело, передане в notify_hub.send (інтеграція, сутність або текст). Його правило діє раніше за правила хаба.", src_empty: "Джерел поки немає: вони з’являться з першими сповіщеннями.", cap_persistent: "Постійні сповіщення", cap_persistent_help: "Ті, що інтеграції публікують у Home Assistant (дзвіночок бічної панелі), теж проходять через хаб, як інформація.", cap_repairs: "Нові виправлення", cap_repairs_help: "Кожне нове виправлення проходить через хаб: тривога для помилки, інформація для попередження.", src_count: "{n} за 7 днів", src_last: "останнє {t}", src_edit: "Налаштувати", src_name: "Назва", src_icon: "Значок", src_color: "Колір", src_priority: "Пріоритет", src_as_sent: "Як надіслано", src_people: "Лише ці люди", src_people_help: "Нічого не позначено: за пріоритетом.", src_dedup_help: "Порожньо: строк хаба.", src_quiet: "Навіть у тихі години", src_quiet_tag: "Тихі години ігноруються", src_quiet_help: "Тривоги та інформація цього джерела не затримуються.", src_muted_help: "Зберігається в журналі, нікому не надсилається.", src_reset: "Прибрати налаштування", st_muted: "Без звуку", src_add: "Додати", src_pick: "Налаштувати джерело заздалегідь: виберіть інтеграцію…", p_sources: "Лише для них:" },
  hu: { tab_journal: "Napló", tab_routing: "Irányítás", tab_rules: "Szabályok", tab_settings: "Beállítások", c_sent: "Ma elküldve", c_grouped: "Az összefoglalóban", c_duplicates: "Elkerült ismétlődők (7 nap)", c_pending: "Nyugtázandó kritikusak", c_held: "Csendes órák miatt visszatartva", f_all: "Mind", f_critical: "Kritikus", f_pending: "Nyugtázandó", f_grouped: "Az összefoglalóban", f_held: "Visszatartva", f_duplicate: "Ismétlődők", col_message: "Üzenet", col_source: "Forrás", col_people: "Személyek", col_time: "Idő", col_status: "Állapot", empty: "Nincs értesítés", people: "Személyek és csatornák", home: "Otthon", away: "Távol", channels: "Csatornák", found: "Automatikusan talált", custom: "Kézzel beállítva", reset: "Vissza automatikusra", no_channel: "Nincs csatorna", no_people: "Nincs személy a Home Assistantban", escalation: "Kritikusak eszkalációja", escalation_text: "Az érintettek, majd mindenki {a} perc után, majd az SMS szolgáltatás {b} perc után. Leáll, amint valaki nyugtáz.", rules_priorities: "Prioritások", p_critical: "Azonnal, csendes órákban is, kritikus hang, nyugtázásig", p_alert: "Az otthon lévők (mindenki, ha senki sincs otthon), csendes órákban visszatartva", p_info: "Az otthon lévők, csendes órákban visszatartva; senki sincs otthon: következő összefoglaló", p_digest: "Mindig csoportosítva, az összefoglaló időpontjaiban küldve", quiet: "Csendes órák", quiet_start: "Kezdet", quiet_end: "Vége", dedup: "Ismétlődők kihagyása", dedup_text: "Azonos téma (vagy cím és üzenet) ezen időn belül", digest_times: "Összefoglaló időpontjai", add_time: "Hozzáadás", away_mode: "Távollét mód", away_text: "Senki sincs otthon: az infók mindenkihez mennek az összefoglaló helyett", sms: "SMS szolgáltatás", sms_none: "Nincs", esc_first: "Újra mindenkinek ennyi után", esc_second: "SMS ennyi után", retention: "Napló megőrzése", days: "nap", minutes: "perc", test: "Teszt küldése", test_info: "Info teszt", test_critical: "Kritikus teszt", digest_now: "Összefoglaló küldése most", save: "Mentés", saved: "Mentve", sent_ok: "Elküldve", error: "Hiba", subtitle_quiet: "Csend {t}-ig", subtitle_ok: "Ma elküldve: {n}", acknowledge_all: "Mind nyugtázása", hide_header: "Felső sáv elrejtése", hide_header_help: "A fülek maradnak, a menüvel és a gombokkal a sorukban.", st_nobody: "Nincs kit értesíteni", st_failed: "Sikertelen", tab_sources: "Források", src_list: "Az értesítések forrásai", src_capture: "Elfogva a Home Assistantben", src_help: "A forrás magától kiderül: a küldő automatizálás entitásainak integrációja, vagy a notify_hub.send számára megadott forrás (integráció, entitás vagy szöveg). A szabálya a hub szabályai előtt érvényes.", src_empty: "Még nincs forrás: az első értesítésekkel jelennek meg.", cap_persistent: "Állandó értesítések", cap_persistent_help: "Amiket az integrációk a Home Assistantben közzétesznek (az oldalsáv csengője), azok is a hubon mennek át, információként.", cap_repairs: "Új javítások", cap_repairs_help: "Minden új javítás a hubon megy át: riasztás hiba, információ figyelmeztetés esetén.", src_count: "{n} 7 nap alatt", src_last: "utoljára {t}", src_edit: "Testreszabás", src_name: "Név", src_icon: "Ikon", src_color: "Szín", src_priority: "Prioritás", src_as_sent: "Ahogy küldték", src_people: "Csak ezek a személyek", src_people_help: "Egy sincs bejelölve: a prioritás szerint.", src_dedup_help: "Üres: a hub ideje.", src_quiet: "Csendes órákban is", src_quiet_tag: "Csendes órák figyelmen kívül", src_quiet_help: "A forrás riasztásait és információit nem tartja vissza.", src_muted_help: "A naplóban marad, senkinek sem megy.", src_reset: "Testreszabás eltávolítása", st_muted: "Némítva", src_add: "Hozzáadás", src_pick: "Forrás előre beállítása: válasszon integrációt…", p_sources: "Csak nekik:" },
  sk: { tab_journal: "Denník", tab_routing: "Smerovanie", tab_rules: "Pravidlá", tab_settings: "Nastavenia", c_sent: "Odoslané dnes", c_grouped: "V prehľade", c_duplicates: "Zabránené duplikáty (7 d)", c_pending: "Kritické na potvrdenie", c_held: "Zadržané tichými hodinami", f_all: "Všetky", f_critical: "Kritické", f_pending: "Na potvrdenie", f_grouped: "V prehľade", f_held: "Zadržané", f_duplicate: "Duplikáty", col_message: "Správa", col_source: "Zdroj", col_people: "Osoby", col_time: "Čas", col_status: "Stav", empty: "Žiadne upozornenia", people: "Osoby a kanály", home: "Doma", away: "Preč", channels: "Kanály", found: "Nájdené automaticky", custom: "Nastavené ručne", reset: "Späť na automatické", no_channel: "Žiadny kanál", no_people: "Žiadne osoby v Home Assistant", escalation: "Eskalácia kritických", escalation_text: "Dotknuté osoby, potom všetci po {a} min, potom služba SMS po {b} min. Skončí, keď niekto potvrdí.", rules_priorities: "Priority", p_critical: "Hneď, aj v tichých hodinách, kritický zvuk, do potvrdenia", p_alert: "Prítomní (všetci, ak nikto nie je doma), zadržané v tichých hodinách", p_info: "Prítomní, zadržané v tichých hodinách; nikto doma: ďalší prehľad", p_digest: "Vždy zoskupené, posiela sa v časoch prehľadu", quiet: "Tiché hodiny", quiet_start: "Začiatok", quiet_end: "Koniec", dedup: "Ignorovať duplikáty počas", dedup_text: "Rovnaká téma (alebo názov a správa) v tomto čase", digest_times: "Časy prehľadu", add_time: "Pridať", away_mode: "Režim neprítomnosti", away_text: "Nikto doma: informácie idú všetkým namiesto prehľadu", sms: "Služba SMS", sms_none: "Žiadna", esc_first: "Znova všetkým po", esc_second: "SMS po", retention: "Uchovávať denník", days: "dní", minutes: "min", test: "Odoslať test", test_info: "Test informácie", test_critical: "Kritický test", digest_now: "Odoslať prehľad teraz", save: "Uložiť", saved: "Uložené", sent_ok: "Odoslané", error: "Chyba", subtitle_quiet: "Ticho do {t}", subtitle_ok: "Odoslané dnes: {n}", acknowledge_all: "Potvrdiť všetky", hide_header: "Skryť horný pruh", hide_header_help: "Karty zostanú, s ponukou a tlačidlami v ich riadku.", st_nobody: "Nikoho upozorniť", st_failed: "Zlyhalo", tab_sources: "Zdroje", src_list: "Zdroje upozornení", src_capture: "Zachytené v Home Assistant", src_help: "Zdroj sa nájde sám: integrácia entít odosielajúcej automatizácie alebo zdroj zadaný v notify_hub.send (integrácia, entita alebo text). Jeho pravidlo platí pred pravidlami hubu.", src_empty: "Zatiaľ žiadne zdroje: objavia sa s prvými upozorneniami.", cap_persistent: "Trvalé upozornenia", cap_persistent_help: "Tie, ktoré integrácie zverejňujú v Home Assistant (zvonček bočného panela), idú tiež cez hub, ako info.", cap_repairs: "Nové opravy", cap_repairs_help: "Každá nová oprava ide cez hub: poplach pri chybe, info pri varovaní.", src_count: "{n} za 7 dní", src_last: "naposledy {t}", src_edit: "Prispôsobiť", src_name: "Názov", src_icon: "Ikona", src_color: "Farba", src_priority: "Priorita", src_as_sent: "Ako bolo odoslané", src_people: "Len tieto osoby", src_people_help: "Nič nezaškrtnuté: podľa priority.", src_dedup_help: "Prázdne: lehota hubu.", src_quiet: "Aj v tichých hodinách", src_quiet_tag: "Tiché hodiny ignorované", src_quiet_help: "Poplachy a info z tohto zdroja sa nezadržiavajú.", src_muted_help: "Ostáva v denníku, nikomu sa neposiela.", src_reset: "Odstrániť prispôsobenie", st_muted: "Stlmené", src_add: "Pridať", src_pick: "Nastaviť zdroj vopred: vyberte integráciu…", p_sources: "Len pre nich:" },
  cs: { tab_journal: "Deník", tab_routing: "Směrování", tab_rules: "Pravidla", tab_settings: "Nastavení", c_sent: "Odesláno dnes", c_grouped: "V přehledu", c_duplicates: "Zabráněné duplikáty (7 d)", c_pending: "Kritická k potvrzení", c_held: "Zadrženo tichými hodinami", f_all: "Vše", f_critical: "Kritická", f_pending: "K potvrzení", f_grouped: "V přehledu", f_held: "Zadržená", f_duplicate: "Duplikáty", col_message: "Zpráva", col_source: "Zdroj", col_people: "Osoby", col_time: "Čas", col_status: "Stav", empty: "Žádná oznámení", people: "Osoby a kanály", home: "Doma", away: "Pryč", channels: "Kanály", found: "Nalezené automaticky", custom: "Nastavené ručně", reset: "Zpět na automatické", no_channel: "Žádný kanál", no_people: "Žádné osoby v Home Assistant", escalation: "Eskalace kritických", escalation_text: "Dotčené osoby, pak všichni po {a} min, pak služba SMS po {b} min. Skončí, jakmile někdo potvrdí.", rules_priorities: "Priority", p_critical: "Hned, i v tichých hodinách, kritický zvuk, do potvrzení", p_alert: "Přítomní (všichni, když nikdo není doma), zadrženo v tichých hodinách", p_info: "Přítomní, zadrženo v tichých hodinách; nikdo doma: další přehled", p_digest: "Vždy seskupeno, odesílá se v časech přehledu", quiet: "Tiché hodiny", quiet_start: "Začátek", quiet_end: "Konec", dedup: "Ignorovat duplikáty po dobu", dedup_text: "Stejné téma (nebo název a zpráva) v této době", digest_times: "Časy přehledu", add_time: "Přidat", away_mode: "Režim nepřítomnosti", away_text: "Nikdo doma: informace jdou všem místo přehledu", sms: "Služba SMS", sms_none: "Žádná", esc_first: "Znovu všem po", esc_second: "SMS po", retention: "Uchovávat deník", days: "dní", minutes: "min", test: "Odeslat test", test_info: "Test informace", test_critical: "Kritický test", digest_now: "Odeslat přehled hned", save: "Uložit", saved: "Uloženo", sent_ok: "Odesláno", error: "Chyba", subtitle_quiet: "Ticho do {t}", subtitle_ok: "Odesláno dnes: {n}", acknowledge_all: "Potvrdit vše", hide_header: "Skrýt horní lištu", hide_header_help: "Karty zůstanou, s nabídkou a tlačítky v jejich řádku.", st_nobody: "Nikoho upozornit", st_failed: "Selhalo", tab_sources: "Zdroje", src_list: "Zdroje oznámení", src_capture: "Zachyceno v Home Assistant", src_help: "Zdroj se najde sám: integrace entit odesílající automatizace, nebo zdroj zadaný v notify_hub.send (integrace, entita nebo text). Jeho pravidlo platí před pravidly hubu.", src_empty: "Zatím žádné zdroje: objeví se s prvními oznámeními.", cap_persistent: "Trvalá oznámení", cap_persistent_help: "Ta, která integrace zveřejňují v Home Assistant (zvonek postranního panelu), jdou také přes hub, jako info.", cap_repairs: "Nové opravy", cap_repairs_help: "Každá nová oprava jde přes hub: poplach při chybě, info při varování.", src_count: "{n} za 7 dní", src_last: "naposledy {t}", src_edit: "Přizpůsobit", src_name: "Název", src_icon: "Ikona", src_color: "Barva", src_priority: "Priorita", src_as_sent: "Jak bylo odesláno", src_people: "Jen tyto osoby", src_people_help: "Nic nezaškrtnuto: podle priority.", src_dedup_help: "Prázdné: lhůta hubu.", src_quiet: "I v tichých hodinách", src_quiet_tag: "Tiché hodiny ignorovány", src_quiet_help: "Poplachy a info z tohoto zdroje se nezadržují.", src_muted_help: "Zůstává v deníku, nikomu se neposílá.", src_reset: "Odebrat přizpůsobení", st_muted: "Ztlumeno", src_add: "Přidat", src_pick: "Nastavit zdroj předem: vyberte integraci…", p_sources: "Jen pro ně:" },
  sl: { tab_journal: "Dnevnik", tab_routing: "Usmerjanje", tab_rules: "Pravila", tab_settings: "Nastavitve", c_sent: "Poslano danes", c_grouped: "V povzetku", c_duplicates: "Preprečeni dvojniki (7 d)", c_pending: "Kritična za potrditev", c_held: "Zadržano zaradi tihih ur", f_all: "Vsa", f_critical: "Kritična", f_pending: "Za potrditev", f_grouped: "V povzetku", f_held: "Zadržana", f_duplicate: "Dvojniki", col_message: "Sporočilo", col_source: "Vir", col_people: "Osebe", col_time: "Čas", col_status: "Stanje", empty: "Ni obvestil", people: "Osebe in kanali", home: "Doma", away: "Odsoten", channels: "Kanali", found: "Najdeni samodejno", custom: "Nastavljeni ročno", reset: "Nazaj na samodejno", no_channel: "Ni kanala", no_people: "Ni oseb v Home Assistant", escalation: "Stopnjevanje kritičnih", escalation_text: "Prizadete osebe, nato vsi po {a} min, nato storitev SMS po {b} min. Ustavi se, ko kdo potrdi.", rules_priorities: "Prednosti", p_critical: "Takoj, tudi v tihih urah, kritičen zvok, do potrditve", p_alert: "Prisotni (vsi, če ni nikogar doma), zadržano v tihih urah", p_info: "Prisotni, zadržano v tihih urah; nikogar doma: naslednji povzetek", p_digest: "Vedno združeno, poslano ob časih povzetka", quiet: "Tihe ure", quiet_start: "Začetek", quiet_end: "Konec", dedup: "Prezri dvojnike za", dedup_text: "Ista tema (ali naslov in sporočilo) v tem času", digest_times: "Časi povzetka", add_time: "Dodaj", away_mode: "Način odsotnosti", away_text: "Nikogar doma: informacije gredo vsem namesto v povzetek", sms: "Storitev SMS", sms_none: "Brez", esc_first: "Znova vsem po", esc_second: "SMS po", retention: "Hrani dnevnik", days: "dni", minutes: "min", test: "Pošlji preizkus", test_info: "Preizkus informacije", test_critical: "Kritični preizkus", digest_now: "Pošlji povzetek zdaj", save: "Shrani", saved: "Shranjeno", sent_ok: "Poslano", error: "Napaka", subtitle_quiet: "Tišina do {t}", subtitle_ok: "Poslano danes: {n}", acknowledge_all: "Potrdi vse", hide_header: "Skrij zgornjo vrstico", hide_header_help: "Zavihki ostanejo, z menijem in gumbi v njihovi vrstici.", st_nobody: "Nikogar za obvestiti", st_failed: "Ni uspelo", tab_sources: "Viri", src_list: "Viri obvestil", src_capture: "Ujeto v Home Assistant", src_help: "Vir se najde sam: integracija entitet avtomatizacije, ki pošilja, ali vir, podan v notify_hub.send (integracija, entiteta ali besedilo). Njegovo pravilo velja pred pravili vozlišča.", src_empty: "Še ni virov: pojavijo se s prvimi obvestili.", cap_persistent: "Trajna obvestila", cap_persistent_help: "Tista, ki jih integracije objavijo v Home Assistant (zvonec stranske vrstice), gredo tudi skozi vozlišče, kot informacije.", cap_repairs: "Nova popravila", cap_repairs_help: "Vsako novo popravilo gre skozi vozlišče: alarm za napako, informacija za opozorilo.", src_count: "{n} v 7 dneh", src_last: "zadnje {t}", src_edit: "Prilagodi", src_name: "Ime", src_icon: "Ikona", src_color: "Barva", src_priority: "Prednost", src_as_sent: "Kot je bilo poslano", src_people: "Samo te osebe", src_people_help: "Nič označeno: po prednosti.", src_dedup_help: "Prazno: rok vozlišča.", src_quiet: "Tudi v tihih urah", src_quiet_tag: "Tihe ure prezrte", src_quiet_help: "Alarmi in informacije tega vira niso zadržani.", src_muted_help: "Ostane v dnevniku, ne gre nikomur.", src_reset: "Odstrani prilagoditev", st_muted: "Utišano", src_add: "Dodaj", src_pick: "Nastavi vir vnaprej: izberi integracijo…", p_sources: "Samo zanje:" },
  lv: { tab_journal: "Žurnāls", tab_routing: "Maršrutēšana", tab_rules: "Noteikumi", tab_settings: "Iestatījumi", c_sent: "Nosūtīti šodien", c_grouped: "Kopsavilkumā", c_duplicates: "Novērsti dublikāti (7 d)", c_pending: "Apstiprināmie kritiskie", c_held: "Aizturēti klusajās stundās", f_all: "Visi", f_critical: "Kritiskie", f_pending: "Jāapstiprina", f_grouped: "Kopsavilkumā", f_held: "Aizturētie", f_duplicate: "Dublikāti", col_message: "Ziņa", col_source: "Avots", col_people: "Personas", col_time: "Laiks", col_status: "Stāvoklis", empty: "Nav paziņojumu", people: "Personas un kanāli", home: "Mājās", away: "Prom", channels: "Kanāli", found: "Atrasti automātiski", custom: "Iestatīti manuāli", reset: "Atpakaļ uz automātisko", no_channel: "Nav kanāla", no_people: "Home Assistant nav personu", escalation: "Kritisko eskalācija", escalation_text: "Attiecīgās personas, tad visi pēc {a} min, tad SMS pakalpojums pēc {b} min. Apstājas, tiklīdz kāds apstiprina.", rules_priorities: "Prioritātes", p_critical: "Uzreiz, arī klusajās stundās, kritiska skaņa, līdz apstiprināšanai", p_alert: "Klātesošie (visi, ja neviena nav mājās), aizturēts klusajās stundās", p_info: "Klātesošie, aizturēts klusajās stundās; neviena mājās: nākamais kopsavilkums", p_digest: "Vienmēr grupēts, sūtīts kopsavilkuma laikos", quiet: "Klusās stundas", quiet_start: "Sākums", quiet_end: "Beigas", dedup: "Ignorēt dublikātus", dedup_text: "Tā pati tēma (vai virsraksts un ziņa) šajā laikā", digest_times: "Kopsavilkuma laiki", add_time: "Pievienot", away_mode: "Prombūtnes režīms", away_text: "Neviena mājās: informācija visiem, nevis kopsavilkumā", sms: "SMS pakalpojums", sms_none: "Nav", esc_first: "Atkal visiem pēc", esc_second: "SMS pēc", retention: "Glabāt žurnālu", days: "dienas", minutes: "min", test: "Sūtīt testu", test_info: "Informācijas tests", test_critical: "Kritisks tests", digest_now: "Sūtīt kopsavilkumu tagad", save: "Saglabāt", saved: "Saglabāts", sent_ok: "Nosūtīts", error: "Kļūda", subtitle_quiet: "Klusums līdz {t}", subtitle_ok: "Nosūtīti šodien: {n}", acknowledge_all: "Apstiprināt visus", hide_header: "Paslēpt augšējo joslu", hide_header_help: "Cilnes paliek, ar izvēlni un pogām to rindā.", st_nobody: "Nav kam paziņot", st_failed: "Neizdevās", tab_sources: "Avoti", src_list: "Paziņojumu avoti", src_capture: "Uztverts Home Assistant", src_help: "Avots tiek atrasts pats: sūtošās automatizācijas vienību integrācija vai avots, kas dots notify_hub.send (integrācija, vienība vai teksts). Tā noteikums darbojas pirms centrmezgla noteikumiem.", src_empty: "Vēl nav avotu: tie parādās ar pirmajiem paziņojumiem.", cap_persistent: "Pastāvīgie paziņojumi", cap_persistent_help: "Tie, ko integrācijas publicē Home Assistant (sānjoslas zvaniņš), arī iet caur centrmezglu, kā informācija.", cap_repairs: "Jauni labojumi", cap_repairs_help: "Katrs jauns labojums iet caur centrmezglu: trauksme kļūdai, informācija brīdinājumam.", src_count: "{n} 7 dienās", src_last: "pēdējais {t}", src_edit: "Pielāgot", src_name: "Nosaukums", src_icon: "Ikona", src_color: "Krāsa", src_priority: "Prioritāte", src_as_sent: "Kā nosūtīts", src_people: "Tikai šīs personas", src_people_help: "Nekas nav atzīmēts: pēc prioritātes.", src_dedup_help: "Tukšs: centrmezgla termiņš.", src_quiet: "Arī klusajās stundās", src_quiet_tag: "Klusās stundas ignorētas", src_quiet_help: "Šī avota trauksmes un informācija netiek aizturētas.", src_muted_help: "Paliek žurnālā, netiek sūtīts nevienam.", src_reset: "Noņemt pielāgojumu", st_muted: "Apklusināts", src_add: "Pievienot", src_pick: "Iestatīt avotu iepriekš: izvēlieties integrāciju…", p_sources: "Tikai viņiem:" },
  el: { tab_journal: "Ημερολόγιο", tab_routing: "Δρομολόγηση", tab_rules: "Κανόνες", tab_settings: "Ρυθμίσεις", c_sent: "Στάλθηκαν σήμερα", c_grouped: "Στη σύνοψη", c_duplicates: "Διπλότυπα που αποφεύχθηκαν (7 ημ.)", c_pending: "Κρίσιμες προς επιβεβαίωση", c_held: "Σε αναμονή λόγω ησυχίας", f_all: "Όλες", f_critical: "Κρίσιμες", f_pending: "Προς επιβεβαίωση", f_grouped: "Στη σύνοψη", f_held: "Σε αναμονή", f_duplicate: "Διπλότυπα", col_message: "Μήνυμα", col_source: "Πηγή", col_people: "Άτομα", col_time: "Ώρα", col_status: "Κατάσταση", empty: "Καμία ειδοποίηση", people: "Άτομα και κανάλια", home: "Σπίτι", away: "Εκτός", channels: "Κανάλια", found: "Βρέθηκαν αυτόματα", custom: "Ορίστηκαν χειροκίνητα", reset: "Επιστροφή στο αυτόματο", no_channel: "Χωρίς κανάλι", no_people: "Κανένα άτομο στο Home Assistant", escalation: "Κλιμάκωση κρίσιμων", escalation_text: "Τα σχετικά άτομα, μετά όλοι μετά από {a} λεπ., μετά η υπηρεσία SMS μετά από {b} λεπ. Σταματά μόλις κάποιος επιβεβαιώσει.", rules_priorities: "Προτεραιότητες", p_critical: "Αμέσως, και σε ώρες ησυχίας, κρίσιμος ήχος, μέχρι επιβεβαίωση", p_alert: "Όσοι είναι σπίτι (όλοι αν δεν είναι κανείς), σε αναμονή στις ώρες ησυχίας", p_info: "Όσοι είναι σπίτι, σε αναμονή στις ώρες ησυχίας· κανείς σπίτι: η επόμενη σύνοψη", p_digest: "Πάντα ομαδοποιημένη, στέλνεται στις ώρες της σύνοψης", quiet: "Ώρες ησυχίας", quiet_start: "Έναρξη", quiet_end: "Λήξη", dedup: "Αγνόηση διπλότυπων για", dedup_text: "Ίδιο θέμα (ή τίτλος και μήνυμα) σε αυτό το διάστημα", digest_times: "Ώρες σύνοψης", add_time: "Προσθήκη", away_mode: "Λειτουργία απουσίας", away_text: "Κανείς σπίτι: οι πληροφορίες πάνε σε όλους αντί για τη σύνοψη", sms: "Υπηρεσία SMS", sms_none: "Καμία", esc_first: "Ξανά σε όλους μετά από", esc_second: "SMS μετά από", retention: "Διατήρηση ημερολογίου", days: "ημέρες", minutes: "λεπ.", test: "Αποστολή δοκιμής", test_info: "Δοκιμή πληροφορίας", test_critical: "Κρίσιμη δοκιμή", digest_now: "Αποστολή σύνοψης τώρα", save: "Αποθήκευση", saved: "Αποθηκεύτηκε", sent_ok: "Στάλθηκε", error: "Σφάλμα", subtitle_quiet: "Ησυχία έως {t}", subtitle_ok: "Στάλθηκαν σήμερα: {n}", acknowledge_all: "Επιβεβαίωση όλων", hide_header: "Απόκρυψη της επάνω γραμμής", hide_header_help: "Οι καρτέλες μένουν, με το μενού και τα κουμπιά στη σειρά τους.", st_nobody: "Κανείς για ειδοποίηση", st_failed: "Απέτυχε", tab_sources: "Πηγές", src_list: "Πηγές των ειδοποιήσεων", src_capture: "Από το Home Assistant", src_help: "Η πηγή βρίσκεται μόνη της: η ενσωμάτωση των οντοτήτων του αυτοματισμού που στέλνει, ή η πηγή που δίνεται στο notify_hub.send (ενσωμάτωση, οντότητα ή κείμενο). Ο κανόνας της ισχύει πριν από τους κανόνες του hub.", src_empty: "Καμία πηγή ακόμη: εμφανίζονται με τις πρώτες ειδοποιήσεις.", cap_persistent: "Μόνιμες ειδοποιήσεις", cap_persistent_help: "Όσες δημοσιεύουν οι ενσωματώσεις στο Home Assistant (το κουδούνι της πλαϊνής μπάρας) περνούν επίσης από το hub, ως πληροφορίες.", cap_repairs: "Νέες επιδιορθώσεις", cap_repairs_help: "Κάθε νέα επιδιόρθωση περνά από το hub: συναγερμός για σφάλμα, πληροφορία για προειδοποίηση.", src_count: "{n} σε 7 ημέρες", src_last: "τελευταία {t}", src_edit: "Προσαρμογή", src_name: "Όνομα", src_icon: "Εικονίδιο", src_color: "Χρώμα", src_priority: "Προτεραιότητα", src_as_sent: "Όπως στάλθηκε", src_people: "Μόνο αυτά τα άτομα", src_people_help: "Κανένα επιλεγμένο: κατά την προτεραιότητα.", src_dedup_help: "Κενό: το διάστημα του hub.", src_quiet: "Ακόμη και σε ώρες ησυχίας", src_quiet_tag: "Ώρες ησυχίας αγνοούνται", src_quiet_help: "Οι συναγερμοί και οι πληροφορίες αυτής της πηγής δεν κρατούνται.", src_muted_help: "Μένει στο ημερολόγιο, δεν στέλνεται σε κανέναν.", src_reset: "Αφαίρεση προσαρμογής", st_muted: "Σε σίγαση", src_add: "Προσθήκη", src_pick: "Ορίστε μια πηγή εκ των προτέρων: επιλέξτε ενσωμάτωση…", p_sources: "Μόνο γι’ αυτούς:" },
};

var NHP_TABS = ['journal', 'routing', 'rules', 'sources', 'settings'];
var NHP_FILTERS = ['all', 'critical', 'pending', 'grouped', 'held', 'duplicate'];
var NHP_TONES = { delivered: 'ok', acknowledged: 'ok', pending: 'bad', held: 'idle', grouped: 'warn', duplicate: 'info', nobody: 'bad', failed: 'bad', muted: 'idle' };
var NHP_ICONS = {
  bell: 'M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21',
  send: 'M2,21L23,12L2,3V10L17,12L2,14V21Z',
  tray: 'M2 12H4V17H20V12H22V17A2 2 0 0 1 20 19H4A2 2 0 0 1 2 17M11 5H13V13.17L16.59 9.59L18 11L12 17L6 11L7.41 9.59L11 13.17Z',
  person: 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  bad: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  warn: 'M19,15H15A3,3 0 0,1 12,18A3,3 0 0,1 9,15H5V5H19M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z',
  idle: 'M12 3A9 9 0 1 0 21 12 7 7 0 0 1 12 3Z',
  info: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

var nhpEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
var nhpIcon = (name, cls) => `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${NHP_ICONS[name] || ''}"/></svg>`;
// A source's badge: its icon (mdi:) when one is set, else its integration's brand logo, else a generic one; tinted
// with its color.
var nhpBrand = (domain, dark) => `https://brands.home-assistant.io/_/${encodeURIComponent(domain)}/${dark ? 'dark_' : ''}icon.png`;
var nhpAvatar = (look, dark, cls) => {
  var style = look?.color ? ` style="--sc:${nhpEsc(look.color)}"` : '';
  var inner = look?.icon
    ? `<ha-icon icon="${nhpEsc(look.icon)}"></ha-icon>`
    : look?.domain
      ? `<img src="${nhpEsc(nhpBrand(look.domain, dark))}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : nhpIcon('bell');
  return `<span class="${cls || 'av'}${look?.color ? ' tinted' : ''}"${style}>${inner}</span>`;
};
var nhpFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));

class NotifyHubPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
    this._draft = {};
    this._filter = 'all';
    this._source = '';
    this._editing = null;
    this._srcEdit = null;
    this._srcDraft = {};
    this._srcNew = null;
    var tab = new URLSearchParams(location.search).get('tab');
    this._tab = NHP_TABS.includes(tab) ? tab : 'journal';
    this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    this.shadowRoot.addEventListener('change', (ev) => this._change(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => this._key(ev));
    // The page is built once; each part is then rewritten only when its own markup changes (_set), so a state
    // update elsewhere in Home Assistant leaves the panel alone and a field being typed in keeps its focus.
    this._parts = new Map();
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    // The hub's sensor changes with every notification: the journal is fetched again then. Any other state change
    // only redraws when the theme or the language changed (nothing else the panel shows comes from hass).
    var id = this._sensor && hass.states[this._sensor]?.attributes?.notify_hub ? this._sensor : Object.keys(hass.states).find((k) => k.startsWith('sensor.') && hass.states[k]?.attributes?.notify_hub);
    this._sensor = id || '';
    var stamp = id ? hass.states[id].last_updated : '';
    var look = `${!!hass.themes?.darkMode}|${hass.locale?.language || hass.language}`;
    if (first || stamp !== this._stamp) {
      this._stamp = stamp;
      this._look = look;
      this._load();
    } else if (look !== this._look) {
      this._look = look;
      this._render();
    }
  }

  set narrow(value) {
    if (value === this._narrow) return;
    this._narrow = value;
    this._render();
  }

  connectedCallback() {
    clearInterval(this._timer);
    this._timer = setInterval(() => this._load(), 30000);
    this._onPop = this._onPop || (() => {
      var tab = new URLSearchParams(location.search).get('tab');
      if (NHP_TABS.includes(tab) && tab !== this._tab) this._setTab(tab, false);
    });
    window.addEventListener('popstate', this._onPop);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    clearTimeout(this._toastTimer);
    window.removeEventListener('popstate', this._onPop);
  }

  _t() {
    var raw = String(this._hass?.locale?.language || this._hass?.language || 'en');
    var lang = NH_PANEL_I18N[raw] ? raw : NH_PANEL_I18N[raw.split('-')[0]] ? raw.split('-')[0] : 'en';
    return Object.assign({}, NH_PANEL_I18N.en, NH_PANEL_I18N[lang]);
  }

  async _load() {
    if (!this._hass) return;
    try {
      this._data = await this._hass.callWS({ type: 'notify_hub/state' });
      this._error = '';
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._render(true);
  }

  _options() {
    return Object.assign({}, this._data?.options || {}, this._draft);
  }

  _setTab(tab, push = true) {
    if (!NHP_TABS.includes(tab)) return;
    this._tab = tab;
    this._draft = {};
    this._editing = null;
    this._srcEdit = null;
    this._srcDraft = {};
    this._srcNew = null;
    this._filter = 'all';
    this._source = '';
    if (push) {
      var url = new URL(location.href);
      url.searchParams.set('tab', tab);
      history.replaceState(history.state, '', url);
    }
    this._render();
  }

  // Tabs: the arrows, Home and End move between them (WAI-ARIA tabs pattern).
  _key(ev) {
    if (!ev.target?.classList?.contains('tab')) return;
    var i = NHP_TABS.indexOf(this._tab);
    var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: NHP_TABS.length - 1 }[ev.key];
    if (next === undefined) return;
    ev.preventDefault();
    this._setTab(NHP_TABS[(next + NHP_TABS.length) % NHP_TABS.length]);
    this.shadowRoot.querySelector('.tab.on')?.focus();
  }

  // Rewrites one part of the page only when its markup changed.
  _set(selector, html) {
    if (this._parts.get(selector) === html) return;
    var el = this.shadowRoot.querySelector(selector);
    if (!el) return;
    this._parts.set(selector, html);
    el.innerHTML = html;
  }

  // The Save buttons follow the draft without redrawing the form (which would drop the focus of the next field).
  _syncSave() {
    var dirty = Object.keys(this._draft).length > 0;
    for (var btn of this.shadowRoot.querySelectorAll('[data-act="save"]')) btn.disabled = !dirty;
  }

  async _ws(message, done) {
    try {
      await this._hass.callWS(message);
      this._toast = done;
    } catch (err) {
      this._toast = `${this._t().error}: ${err?.message || err}`;
    }
    this._render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = '';
      this._render();
    }, 2500);
    await this._load();
  }

  _click(ev) {
    var el = ev.composedPath().find((n) => n?.dataset?.act);
    if (!el) return;
    var t = this._t();
    var act = el.dataset.act;
    if (act === 'tab') this._setTab(el.dataset.tab);
    else if (act === 'filter') {
      this._filter = el.dataset.filter;
      this._render();
    } else if (act === 'ack') this._ws({ type: 'notify_hub/acknowledge', ...(el.dataset.id ? { entry: el.dataset.id } : {}) }, t.saved);
    else if (act === 'test') this._ws({ type: 'notify_hub/test', priority: el.dataset.priority || 'info' }, t.sent_ok);
    else if (act === 'digest') this._ws({ type: 'notify_hub/digest' }, t.sent_ok);
    else if (act === 'edit') {
      this._editing = this._editing === el.dataset.person ? null : el.dataset.person;
      this._render();
    } else if (act === 'reset') {
      var people = Object.assign({}, this._options().people || {});
      delete people[el.dataset.person];
      this._editing = null;
      this._ws({ type: 'notify_hub/save', options: { people } }, t.saved);
    } else if (act === 'add-time') {
      var input = this.shadowRoot.querySelector('#new-time');
      if (!input?.value) return;
      var times = [...new Set([...(this._options().digest_times || []), input.value.slice(0, 5)])].sort();
      this._draft.digest_times = times;
      this._render();
    } else if (act === 'del-time') {
      this._draft.digest_times = (this._options().digest_times || []).filter((x) => x !== el.dataset.time);
      this._render();
    } else if (act === 'source') {
      // The journal shows one source only; the same one again (or its chip's ×) shows them all.
      this._source = this._source === el.dataset.key ? '' : el.dataset.key;
      this._render();
    } else if (act === 'src-add') {
      // A source set ahead of its first notification: an integration picked in the list, opened in the editor.
      var pick = this.shadowRoot.querySelector('#add-src');
      if (!pick?.value) return;
      var found = (this._data?.integrations || []).find((i) => i.domain === pick.value);
      this._srcNew = { key: pick.value, name: found?.name || pick.value, domain: pick.value, origins: [], count: 0, last: null, rule: {} };
      this._srcEdit = pick.value;
      this._srcDraft = {};
      this._render();
    } else if (act === 'src-edit') {
      this._srcEdit = this._srcEdit === el.dataset.key ? null : el.dataset.key;
      this._srcDraft = {};
      this._render();
    } else if (act === 'src-save' || act === 'src-reset') {
      var key = el.dataset.key;
      var sources = Object.assign({}, this._data?.options?.sources || {});
      if (act === 'src-reset') delete sources[key];
      else sources[key] = Object.assign({}, sources[key] || {}, this._srcDraft);
      this._srcEdit = null;
      this._srcDraft = {};
      this._srcNew = null;
      this._ws({ type: 'notify_hub/save', options: { sources } }, t.saved);
    } else if (act === 'save') {
      var draft = this._draft;
      this._draft = {};
      this._ws({ type: 'notify_hub/save', options: draft }, t.saved);
    }
  }

  _change(ev) {
    var el = ev.target;
    var key = el?.dataset?.key;
    if (el?.dataset?.src) {
      // A field of the source being edited: kept in its draft until its Save button.
      var field = el.dataset.src;
      var rule = (this._data?.options?.sources || {})[this._srcEdit] || {};
      if (field === 'people') {
        var who = new Set(this._srcDraft.people ?? rule.people ?? []);
        if (el.checked) who.add(el.dataset.person);
        else who.delete(el.dataset.person);
        this._srcDraft.people = [...who];
      } else if (el.type === 'checkbox') this._srcDraft[field] = el.checked;
      else if (field === 'dedup_minutes') this._srcDraft[field] = el.value === '' ? null : Number(el.value);
      else this._srcDraft[field] = el.value.trim() === '' ? null : el.value.trim();
      if (field === 'color' && el.type === 'color') {
        var text = this.shadowRoot.querySelector('[data-src="color"][type="text"]');
        if (text) text.value = el.value;
      } else if (field === 'color') {
        var pick = this.shadowRoot.querySelector('[data-src="color"][type="color"]');
        if (pick && /^#[0-9a-f]{6}$/i.test(el.value)) pick.value = el.value;
      }
      return;
    }
    if (key === 'capture_persistent' || key === 'capture_repairs') {
      // Applied at once, like the top bar switch.
      this._ws({ type: 'notify_hub/save', options: { [key]: el.checked } }, this._t().saved);
      return;
    }
    if (el?.dataset?.channel) {
      var person = el.dataset.person;
      var current = (this._data?.people || []).find((p) => p.entity_id === person)?.channels || [];
      var set = new Set(current);
      if (el.checked) set.add(el.dataset.channel);
      else set.delete(el.dataset.channel);
      var people = Object.assign({}, this._options().people || {}, { [person]: [...set] });
      this._ws({ type: 'notify_hub/save', options: { people } }, this._t().saved);
      return;
    }
    if (!key) return;
    var value = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    if (key === 'esc0' || key === 'esc1') {
      var esc = [...(this._options().escalation_minutes || [5, 10])];
      esc[key === 'esc0' ? 0 : 1] = Number(el.value);
      this._draft.escalation_minutes = esc;
    } else if (key === 'hide_header') {
      // Applied at once (like the other ha-* panels): saved without waiting for the Save button.
      this._ws({ type: 'notify_hub/save', options: { hide_header: el.checked ? 'all' : 'off' } }, this._t().saved);
      return;
    } else this._draft[key] = value === '' ? null : value;
    // The form is the one shown: only the Save buttons change, the fields keep their focus.
    this._parts.delete('.wrap');
    this._syncSave();
  }

  // `fromLoad`: a refresh of the data (sensor changed, 30 s timer). It leaves a form being edited as it is.
  _render(fromLoad = false) {
    if (!this._hass) return;
    var t = this._t();
    var d = this._data;
    var counts = d?.counts || {};
    var pending = Number(counts.pending) || 0;
    var tone = pending ? 'bad' : d?.quiet ? 'idle' : 'ok';
    var subtitle = d ? (d.quiet && d.quiet_hours ? nhpFill(t.subtitle_quiet, { t: d.quiet_hours[1] }) : nhpFill(t.subtitle_ok, { n: counts.sent_today || 0 })) : '';
    var body = !d ? `<div class="empty">${nhpEsc(this._error || '…')}</div>` : this[`_${this._tab}`](d, t);
    var dark = !!this._hass.themes?.darkMode;
    var bare = (d?.options?.hide_header || 'off') !== 'off';
    if (!this._built) {
      this._built = true;
      this.shadowRoot.innerHTML = `<style>${NotifyHubPanel.styles()}</style>
        <div class="page">
          <header class="top"><div class="scene-box"></div><div class="ground"></div><div class="bar"><span class="menu-slot"></span><span class="head"></span><span class="btns"></span></div></header>
          <div class="tabbar"><span class="menu-slot"></span><nav class="tabs" role="tablist"></nav><span class="btns"></span></div>
          <main class="wrap"></main>
          <div class="toast" role="status" aria-live="polite"></div>
        </div>`;
    }
    this.toggleAttribute('bare', bare);
    this.shadowRoot.querySelector('.page').className = `page tone-${tone}${dark ? ' night' : ''}`;
    this._set('.scene-box', NotifyHubPanel.scene(tone === 'bad'));
    // Pill: on the title's line (the subtitle under it), at the right of the header.
    this._set(
      '.head',
      `<span class="ico">${nhpIcon('bell')}</span>
      <span class="htxt"><span class="title">Notify Hub</span><span class="subtitle">${nhpEsc(subtitle)}</span></span>
      ${pending ? `<span class="pill" title="${nhpEsc(t.c_pending)}">${nhpEsc(pending)}<span class="pl"> · ${nhpEsc(t.c_pending)}</span></span>` : ''}`,
    );
    var buttons = `<button class="round" type="button" data-act="test" data-priority="info" title="${nhpEsc(t.test_info)}" aria-label="${nhpEsc(t.test_info)}">${nhpIcon('send')}</button>
      <button class="round" type="button" data-act="digest" title="${nhpEsc(t.digest_now)}" aria-label="${nhpEsc(t.digest_now)}">${nhpIcon('tray')}</button>`;
    // The top bar hidden (option): the menu button and the round buttons move to the row of the tabs.
    this._set('.top .btns', bare ? '' : buttons);
    this._set('.tabbar .btns', bare ? buttons : '');
    this._set('.tabs', NHP_TABS.map((tab) => `<button type="button" role="tab" class="tab${tab === this._tab ? ' on' : ''}" aria-selected="${tab === this._tab}" tabindex="${tab === this._tab ? 0 : -1}" data-act="tab" data-tab="${tab}">${nhpEsc(t[`tab_${tab}`])}</button>`).join(''));
    var active = this.shadowRoot.activeElement;
    var editing = Object.keys(this._draft).length > 0 || (active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) && active.closest('.wrap'));
    var form = this._tab === 'rules' || this._tab === 'settings' || (this._tab === 'sources' && this._srcEdit);
    if (!(fromLoad && editing && form)) this._set('.wrap', body);
    var toast = this.shadowRoot.querySelector('.toast');
    toast.textContent = this._toast || '';
    toast.hidden = !this._toast;
    var slot = this.shadowRoot.querySelector(bare ? '.tabbar .menu-slot' : '.top .menu-slot');
    var menu = this.shadowRoot.querySelector('ha-menu-button');
    if (this._narrow) {
      if (!menu) {
        menu = document.createElement('ha-menu-button');
        menu.className = 'menu';
      }
      if (menu.parentElement !== slot) slot.appendChild(menu);
      menu.hass = this._hass;
      menu.narrow = this._narrow;
    } else if (menu) menu.remove();
  }

  static scene(alarm) {
    return `<svg class="scene" viewBox="0 0 320 110" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g class="letter l1"><rect x="70" y="48" width="44" height="28" rx="4"/><path d="M70 50 l22 14 l22 -14"/></g>
      <g class="letter l2"><rect x="250" y="58" width="36" height="24" rx="4"/><path d="M250 60 l18 12 l18 -12"/></g>
      <g class="bell${alarm ? ' ring' : ''}"><path class="bbody" d="M150 98 v-34 a26 26 0 0 1 52 0 v34 z"/><rect class="brim" x="144" y="96" width="64" height="7" rx="3"/><circle class="bclap" cx="176" cy="106" r="5"/></g>
      <path class="wave w1" d="M214 50 q10 10 0 20"/><path class="wave w2" d="M224 42 q18 18 0 36"/>
    </svg>`;
  }

  _journal(d, t) {
    var c = d.counts || {};
    var tiles = [
      // Every tile has its state badge: the tone of its count, grey (idle) at zero.
      ['c_sent', c.sent_today, c.sent_today ? 'ok' : 'idle'],
      ['c_grouped', c.grouped, c.grouped ? 'warn' : 'idle'],
      ['c_duplicates', c.duplicates, c.duplicates ? 'ok' : 'idle'],
      ['c_pending', c.pending, c.pending ? 'bad' : 'idle'],
    ]
      .map(([k, v, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${nhpEsc(v ?? 0)}</span><span class="k">${nhpEsc(t[k])}</span>${cls ? '<span class="badge"></span>' : ''}</div>`)
      .join('');
    var looks = Object.fromEntries((d.sources || []).map((x) => [x.key, { ...x, icon: x.rule?.icon, color: x.rule?.color }]));
    var dark = !!this._hass.themes?.darkMode;
    var match = (e) =>
      (!this._source || e.source_key === this._source) &&
      (this._filter === 'all' || (this._filter === 'critical' ? e.priority === 'critical' : e.status === this._filter));
    var rows = (d.recent || []).filter(match);
    var chips = NHP_FILTERS.map((f) => `<button type="button" class="chip${f === this._filter ? ' on' : ''}" data-act="filter" data-filter="${f}">${nhpEsc(t[`f_${f}`])}</button>`).join('');
    if (this._source) {
      var picked = looks[this._source] || { name: this._source };
      chips += `<button type="button" class="chip on src" data-act="source" data-key="${nhpEsc(this._source)}" aria-label="${nhpEsc(t.f_all)}">${nhpAvatar(picked, dark, 'av sm')}${nhpEsc(picked.name)}${nhpIcon('close')}</button>`;
    }
    var when = (iso) => this._when(iso);
    var list = rows.length
      ? rows
          .map((e) => {
            var tone = NHP_TONES[e.status] || 'ok';
            var status = { pending: t.f_pending, grouped: t.f_grouped, held: t.f_held, duplicate: t.f_duplicate, nobody: t.st_nobody, failed: t.st_failed, muted: t.st_muted }[e.status];
            var look = looks[e.source_key] || { name: e.source, domain: e.domain };
            var source = e.source_key
              ? `<button type="button" class="cell srcbtn" data-act="source" data-key="${nhpEsc(e.source_key)}" title="${nhpEsc(e.origin || e.source)}">${nhpAvatar(look, dark, 'av sm')}<span>${nhpEsc(e.source)}</span></button>`
              : '<span class="cell">—</span>';
            return `<div class="row r-${tone}">
              <span class="dot">${nhpIcon(tone)}</span>
              <span class="txt"><span class="nm">${nhpEsc(e.title || e.message)}</span><span class="sub">${nhpEsc(e.title ? e.message : '')}</span></span>
              ${source}
              <span class="cell">${nhpEsc((e.people || []).join(', ') || '—')}</span>
              <span class="cell time">${nhpEsc(when(e.time))}</span>
              ${e.status === 'pending' ? `<button class="btn" type="button" data-act="ack" data-id="${nhpEsc(e.id)}">${nhpEsc(t.acknowledge_all.split(' ')[0])}</button>` : `<span class="tag t-${tone}">${nhpEsc(e.status === 'delivered' || e.status === 'acknowledged' ? '✓' : status || e.status)}</span>`}
            </div>`;
          })
          .join('')
      : `<div class="empty">${nhpEsc(t.empty)}</div>`;
    return `<div class="tiles">${tiles}</div>
      <div class="chips">${chips}${c.pending ? `<button type="button" class="btn danger" data-act="ack">${nhpEsc(t.acknowledge_all)}</button>` : ''}</div>
      <div class="list">${list}</div>`;
  }

  _routing(d, t) {
    var people = d.people || [];
    var opts = this._options();
    var esc = opts.escalation_minutes || [5, 10];
    var cards = people.length
      ? people
          .map((p) => {
            var editing = this._editing === p.entity_id;
            var own = (d.sources || []).filter((x) => x.rule?.people?.includes(p.entity_id));
            var dedicated = own.length
              ? `<div class="chips"><span class="muted">${nhpEsc(t.p_sources)}</span>${own.map((x) => `<span class="chip static">${nhpAvatar({ domain: x.domain, icon: x.rule.icon, color: x.rule.color }, !!this._hass.themes?.darkMode, 'av sm')}${nhpEsc(x.name)}</span>`).join('')}</div>`
              : '';
            var channels = p.channels.length ? p.channels.map((c) => `<span class="chip static">${nhpEsc(c.replace('notify.', ''))}</span>`).join('') : `<span class="muted">${nhpEsc(t.no_channel)}</span>`;
            var picker = editing
              ? `<div class="picker">${(d.services || []).map((s) => `<label class="check"><input type="checkbox" data-person="${nhpEsc(p.entity_id)}" data-channel="${nhpEsc(s)}"${p.channels.includes(s) ? ' checked' : ''}><span>${nhpEsc(s.replace('notify.', ''))}</span></label>`).join('')}
                  ${p.custom ? `<button type="button" class="btn" data-act="reset" data-person="${nhpEsc(p.entity_id)}">${nhpEsc(t.reset)}</button>` : ''}</div>`
              : '';
            return `<div class="card p-${p.home ? 'home' : 'away'}">
              <div class="phead"><span class="dot">${nhpIcon('person')}</span>
                <span class="txt"><span class="nm">${nhpEsc(p.name)}</span><span class="sub">${nhpEsc(p.home ? t.home : t.away)} · ${nhpEsc(p.custom ? t.custom : t.found)}</span></span>
                <button type="button" class="btn" data-act="edit" data-person="${nhpEsc(p.entity_id)}" aria-expanded="${editing}">${nhpEsc(t.channels)}</button></div>
              <div class="chips">${channels}</div>${dedicated}${picker}
            </div>`;
          })
          .join('')
      : `<div class="empty">${nhpEsc(t.no_people)}</div>`;
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.people)}</h2>${cards}</section>
      <section class="col"><h2>${nhpEsc(t.escalation)}</h2><div class="card"><p class="text">${nhpEsc(nhpFill(t.escalation_text, { a: esc[0], b: esc[1] }))}</p>
      <div class="chips"><span class="chip static">${nhpEsc(t.p_alert.split(' (')[0])}</span><span class="muted">→ ${esc[0]} ${nhpEsc(t.minutes)} →</span><span class="chip static">${nhpEsc(t.f_all)}</span><span class="muted">→ ${esc[1]} ${nhpEsc(t.minutes)} →</span><span class="chip static">${nhpEsc(opts.sms_service ? opts.sms_service.replace('notify.', '') : t.sms_none)}</span></div>
      <div class="actions"><button type="button" class="btn danger" data-act="test" data-priority="critical">${nhpEsc(t.test_critical)}</button></div></div></section></div>`;
  }

  _rules(d, t) {
    var o = this._options();
    var times = (o.digest_times || []).map((x) => `<span class="chip static">${nhpEsc(x)}<button type="button" class="x" data-act="del-time" data-time="${nhpEsc(x)}" aria-label="×">${nhpIcon('close')}</button></span>`).join('');
    var levels = ['critical', 'alert', 'info', 'digest']
      .map((p) => `<div class="lvl"><span class="tag t-${{ critical: 'bad', alert: 'warn', info: 'info', digest: 'idle' }[p]}">${nhpEsc(p)}</span><span>${nhpEsc(t[`p_${p}`])}</span></div>`)
      .join('');
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.rules_priorities)}</h2><div class="card">${levels}</div></section>
      <section class="col"><h2>${nhpEsc(t.quiet)}</h2><div class="card form">
        ${this._switch('quiet_enabled', t.quiet, o.quiet_enabled !== false)}
        <div class="grid2"><label class="field"><span>${nhpEsc(t.quiet_start)}</span><input type="time" data-key="quiet_start" value="${nhpEsc(o.quiet_start || '22:00')}"></label>
        <label class="field"><span>${nhpEsc(t.quiet_end)}</span><input type="time" data-key="quiet_end" value="${nhpEsc(o.quiet_end || '07:00')}"></label></div>
        <label class="field"><span>${nhpEsc(t.dedup)} (${nhpEsc(t.minutes)})</span><input type="number" min="0" max="1440" data-key="dedup_minutes" value="${nhpEsc(o.dedup_minutes ?? 10)}"><small>${nhpEsc(t.dedup_text)}</small></label>
        <div class="field"><span>${nhpEsc(t.digest_times)}</span><div class="chips">${times}<input id="new-time" type="time"><button type="button" class="btn" data-act="add-time">${nhpEsc(t.add_time)}</button></div></div>
        ${this._switch('away_mode', t.away_mode, !!o.away_mode, t.away_text)}
        ${this._saveBar(t)}
      </div></section></div>`;
  }

  _sources(d, t) {
    var o = this._options();
    var dark = !!this._hass.themes?.darkMode;
    var when = (iso) => this._when(iso);
    var capture = `<div class="card form">
        ${this._switch('capture_persistent', t.cap_persistent, !!o.capture_persistent, t.cap_persistent_help)}
        ${this._switch('capture_repairs', t.cap_repairs, !!o.capture_repairs, t.cap_repairs_help)}</div>`;
    var known = new Set((d.sources || []).map((x) => x.key));
    var fresh = this._srcNew && !known.has(this._srcNew.key) && this._srcEdit === this._srcNew.key ? [this._srcNew] : [];
    var all = [...fresh, ...(d.sources || [])];
    var list = all.length ? all.map((src) => this._sourceCard(d, t, src, dark, when)).join('') : `<div class="empty">${nhpEsc(t.src_empty)}</div>`;
    var choices = (d.integrations || []).filter((i) => !known.has(i.domain));
    var add = choices.length
      ? `<div class="addrow"><select id="add-src" aria-label="${nhpEsc(t.src_add)}"><option value="">${nhpEsc(t.src_pick)}</option>${choices.map((i) => `<option value="${nhpEsc(i.domain)}">${nhpEsc(i.name)}</option>`).join('')}</select><button type="button" class="btn" data-act="src-add">${nhpEsc(t.src_add)}</button></div>`
      : '';
    return `<div class="cols"><section class="col wide"><h2>${nhpEsc(t.src_list)}</h2>${add}${list}</section>
      <section class="col"><h2>${nhpEsc(t.src_capture)}</h2>${capture}<p class="muted wrapline">${nhpEsc(t.src_help)}</p></section></div>`;
  }

  _sourceCard(d, t, src, dark, when) {
    var rule = src.rule || {};
    var editing = this._srcEdit === src.key;
    var look = { domain: src.domain, icon: rule.icon, color: rule.color };
    var tags = [
      rule.priority ? `<span class="tag t-${{ critical: 'bad', alert: 'warn', info: 'info', digest: 'idle' }[rule.priority]}">${nhpEsc(rule.priority)}</span>` : '',
      rule.people?.length ? `<span class="tag t-info">${nhpIcon('person', 'ic xs')} ${nhpEsc(rule.people.map((id) => (d.people || []).find((p) => p.entity_id === id)?.name || id).join(', '))}</span>` : '',
      rule.ignore_quiet ? `<span class="tag t-warn">${nhpEsc(t.src_quiet_tag)}</span>` : '',
      rule.dedup_minutes != null ? `<span class="tag t-idle">${nhpEsc(rule.dedup_minutes)} ${nhpEsc(t.minutes)}</span>` : '',
      rule.muted ? `<span class="tag t-bad">${nhpEsc(t.st_muted)}</span>` : '',
    ].join('');
    var sub = [nhpFill(t.src_count, { n: src.count }), src.last ? nhpFill(t.src_last, { t: when(src.last) }) : '', src.domain || (src.key.includes('.') ? src.key : '')]
      .filter(Boolean)
      .join(' · ');
    var origins = src.origins?.length ? `<div class="chips">${src.origins.map((x) => `<span class="chip static">${nhpEsc(x)}</span>`).join('')}</div>` : '';
    return `<div class="card src-card${rule.muted ? ' muted-src' : ''}">
        <div class="phead">${nhpAvatar(look, dark)}
          <span class="txt"><span class="nm">${nhpEsc(src.name)}</span><span class="sub">${nhpEsc(sub)}</span></span>
          <span class="tags">${tags}</span>
          <button type="button" class="btn" data-act="src-edit" data-key="${nhpEsc(src.key)}" aria-expanded="${editing}">${nhpEsc(t.src_edit)}</button></div>
        ${origins}${editing ? this._sourceForm(d, t, src, rule) : ''}</div>`;
  }

  _sourceForm(d, t, src, rule) {
    var v = Object.assign({}, rule, this._srcDraft);
    var key = nhpEsc(src.key);
    var priorities = ['', 'critical', 'alert', 'info', 'digest']
      .map((p) => `<option value="${p}"${(v.priority || '') === p ? ' selected' : ''}>${nhpEsc(p || t.src_as_sent)}</option>`)
      .join('');
    var chosen = new Set(v.people || []);
    var people = (d.people || [])
      .map((p) => `<label class="check"><input type="checkbox" data-src="people" data-person="${nhpEsc(p.entity_id)}"${chosen.has(p.entity_id) ? ' checked' : ''}><span>${nhpEsc(p.name)}</span></label>`)
      .join('');
    var color = /^#[0-9a-f]{6}$/i.test(v.color || '') ? v.color : '#2563eb';
    return `<div class="form srcform">
        <div class="grid2"><label class="field"><span>${nhpEsc(t.src_name)}</span><input type="text" data-src="name" value="${nhpEsc(v.name || '')}" placeholder="${nhpEsc(src.name)}"></label>
        <label class="field"><span>${nhpEsc(t.src_icon)}</span><input type="text" data-src="icon" value="${nhpEsc(v.icon || '')}" placeholder="mdi:bell"></label></div>
        <div class="grid2"><label class="field"><span>${nhpEsc(t.src_color)}</span><span class="colorrow"><input type="color" data-src="color" value="${nhpEsc(color)}" aria-label="${nhpEsc(t.src_color)}"><input type="text" data-src="color" value="${nhpEsc(v.color || '')}" placeholder="#rrggbb"></span></label>
        <label class="field"><span>${nhpEsc(t.src_priority)}</span><select data-src="priority">${priorities}</select></label></div>
        <div class="field"><span>${nhpEsc(t.src_people)}</span><div class="picker">${people || `<span class="muted">${nhpEsc(t.no_people)}</span>`}</div><small>${nhpEsc(t.src_people_help)}</small></div>
        <label class="field"><span>${nhpEsc(t.dedup)} (${nhpEsc(t.minutes)})</span><input type="number" min="0" max="1440" data-src="dedup_minutes" value="${nhpEsc(v.dedup_minutes ?? '')}" placeholder="${nhpEsc(this._options().dedup_minutes ?? 10)}"><small>${nhpEsc(t.src_dedup_help)}</small></label>
        ${this._srcSwitch('ignore_quiet', t.src_quiet, !!v.ignore_quiet, t.src_quiet_help)}
        ${this._srcSwitch('muted', t.st_muted, !!v.muted, t.src_muted_help)}
        <div class="actions">${Object.keys(rule).length ? `<button type="button" class="btn danger" data-act="src-reset" data-key="${key}">${nhpEsc(t.src_reset)}</button>` : ''}
          <button type="button" class="btn primary" data-act="src-save" data-key="${key}">${nhpEsc(t.save)}</button></div></div>`;
  }

  _srcSwitch(field, label, on, help) {
    return `<label class="switch"><span class="stxt"><span class="nm">${nhpEsc(label)}</span>${help ? `<small>${nhpEsc(help)}</small>` : ''}</span><input type="checkbox" data-src="${field}"${on ? ' checked' : ''}><span class="sw" aria-hidden="true"></span></label>`;
  }

  _settings(d, t) {
    var o = this._options();
    var esc = o.escalation_minutes || [5, 10];
    var services = (d.services || []).filter((s) => !s.startsWith('notify.mobile_app_'));
    return `<div class="cols"><section class="col"><h2>${nhpEsc(t.escalation)}</h2><div class="card form">
        <label class="field"><span>${nhpEsc(t.sms)}</span><select data-key="sms_service"><option value="">${nhpEsc(t.sms_none)}</option>${services.map((s) => `<option value="${nhpEsc(s)}"${s === o.sms_service ? ' selected' : ''}>${nhpEsc(s)}</option>`).join('')}</select></label>
        <div class="grid2"><label class="field"><span>${nhpEsc(t.esc_first)} (${nhpEsc(t.minutes)})</span><input type="number" min="1" max="240" data-key="esc0" value="${esc[0]}"></label>
        <label class="field"><span>${nhpEsc(t.esc_second)} (${nhpEsc(t.minutes)})</span><input type="number" min="1" max="240" data-key="esc1" value="${esc[1]}"></label></div>
        <label class="field"><span>${nhpEsc(t.retention)} (${nhpEsc(t.days)})</span><input type="number" min="1" max="90" data-key="retention_days" value="${nhpEsc(o.retention_days ?? 7)}"></label>
        ${this._saveBar(t)}
        ${this._switch('hide_header', t.hide_header, (o.hide_header || 'off') !== 'off', t.hide_header_help)}
      </div></section>
      <section class="col"><h2>${nhpEsc(t.test)}</h2><div class="card"><div class="actions">
        <button type="button" class="btn" data-act="test" data-priority="info">${nhpEsc(t.test_info)}</button>
        <button type="button" class="btn danger" data-act="test" data-priority="critical">${nhpEsc(t.test_critical)}</button>
        <button type="button" class="btn" data-act="digest">${nhpEsc(t.digest_now)}</button></div>
        <p class="muted">Notify Hub ${nhpEsc(d.version || NOTIFY_HUB_PANEL_VERSION)}</p></div></section></div>`;
  }

  _when(iso) {
    try {
      return new Date(iso).toLocaleString(this._hass.locale?.language || 'en', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    } catch (_err) {
      return iso;
    }
  }

  _switch(key, label, on, help) {
    return `<label class="switch"><span class="stxt"><span class="nm">${nhpEsc(label)}</span>${help ? `<small>${nhpEsc(help)}</small>` : ''}</span><input type="checkbox" data-key="${key}"${on ? ' checked' : ''}><span class="sw" aria-hidden="true"></span></label>`;
  }

  _saveBar(t) {
    var dirty = Object.keys(this._draft).length > 0;
    return `<div class="actions"><button type="button" class="btn primary" data-act="save"${dirty ? '' : ' disabled'}>${nhpEsc(t.save)}</button></div>`;
  }

  static styles() {
    return `
      :host { display: block; --ok: var(--success-color, #43a047); --warn: var(--warning-color, #f59e0b); --bad: var(--error-color, #db4437);
              --idle: var(--secondary-text-color, #727272); --info: #2563eb; --accent: #2563eb; }
      .page { min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); font-family: var(--paper-font-body1_-_font-family, inherit); }
      .page.tone-ok { --c: var(--accent); } .page.tone-bad { --c: var(--bad); } .page.tone-idle { --c: var(--idle); }
      .top { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#dbeafe, #f0f6ff); }
      .night .top { background: linear-gradient(#0f1b33, #1c2a48); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #93c5fd; } .night .ground { background: #36507e; }
      .scene { position: absolute; right: 340px; bottom: 6px; height: 84px; width: auto; max-width: 40%; }
      @media (max-width: 900px) { .scene { right: 120px; opacity: .35; } }
      .letter rect { fill: #fff; stroke: #93c5fd; stroke-width: 2; } .letter path { fill: none; stroke: #93c5fd; stroke-width: 2; }
      .night .letter rect { fill: #e6ebf3; stroke: #5b7bb3; } .night .letter path { stroke: #5b7bb3; }
      .bbody { fill: #93c5fd; } .brim, .bclap { fill: #60a5fa; } .night .bbody { fill: #5b7bb3; } .night .brim, .night .bclap { fill: #8fb3ee; }
      .tone-bad .bbody { fill: #fca5a5; } .tone-bad .brim, .tone-bad .bclap { fill: #ef4444; }
      .wave { fill: none; stroke: #3b82f6; stroke-width: 3; stroke-linecap: round; animation: nhp-wave 1.8s ease-in-out infinite; } .w2 { animation-delay: .3s; }
      .tone-bad .wave { stroke: #ef4444; } .tone-idle .wave { opacity: .25; animation: none; }
      .letter { animation: nhp-fly 6s ease-in-out infinite; } .l2 { animation-delay: -3s; }
      .bell { transform-box: fill-box; transform-origin: 50% 0; } .bell.ring { animation: nhp-ring .9s ease-in-out infinite; }
      @keyframes nhp-fly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, -5px); } }
      @keyframes nhp-wave { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
      @keyframes nhp-ring { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(10deg); } 75% { transform: rotate(-10deg); } }
      @media (prefers-reduced-motion: reduce) { .letter, .wave, .bell.ring { animation: none; } }
      .bar { position: absolute; left: 24px; right: 24px; top: 0; bottom: 6px; display: flex; align-items: center; gap: 12px; }
      .head { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; }
      .head .htxt { min-width: 84px; }
      @media (max-width: 600px) { .pill .pl { display: none; } }
      .btns, .menu-slot { flex: none; display: flex; align-items: center; gap: 12px; }
      .menu-slot:empty, .btns:empty { display: none; }
      :host([bare]) .top { display: none; }
      .tabbar { display: flex; align-items: center; gap: 12px; padding: 0 24px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); background: var(--card-background-color, #fff); }
      .tabbar .btns { gap: 8px; } .tabbar .round { width: 36px; height: 36px; }
      .tabbar .menu { color: var(--primary-text-color); margin-left: -8px; }
      .toast[hidden] { display: none; }
      .menu { color: #1f2937; } .night .menu { color: #f3f4f6; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 18%, #fff); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #1c2a48); }
      .ic { width: 20px; height: 20px; fill: currentColor; }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 20px; font-weight: 700; line-height: 26px; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; line-height: 18px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: 0 1 auto; min-width: 2.2em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 18px; font-size: 12px; line-height: 14px; font-weight: 600; padding: 4px 12px; border-radius: 999px; color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .round { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--c);
               border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); background: rgba(255,255,255,.6); }
      .night .round { background: rgba(0,0,0,.25); }
      .round:focus-visible, .tab:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .tabs { flex: 1; min-width: 0; display: flex; gap: 24px; overflow-x: auto; scrollbar-width: none; }
      .tab { font: inherit; font-size: 14px; font-weight: 600; background: none; border: 0; padding: 14px 0; cursor: pointer; white-space: nowrap;
             color: var(--secondary-text-color); border-bottom: 3px solid transparent; }
      .tab.on { color: var(--primary-text-color); border-bottom-color: var(--accent); }
      .wrap { max-width: 1180px; margin: 0 auto; padding: 20px 24px 40px; display: flex; flex-direction: column; gap: 16px; }
      h2 { margin: 4px 0 0; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 700px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .tile, .card { position: relative; background: var(--card-background-color, #fff); border-radius: 14px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.08)); }
      .tile { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
      .tile .n { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; } .tile .k { font-size: 13px; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--bad); }
      .badge { position: absolute; right: 12px; top: 12px; width: 9px; height: 9px; border-radius: 50%; }
      .t-bad .badge { background: var(--bad); } .t-warn .badge { background: var(--warn); } .t-ok .badge { background: var(--ok); } .t-idle .badge { background: var(--idle); }
      .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .chip { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
              border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--card-background-color, #fff); display: inline-flex; align-items: center; gap: 4px; }
      .chip.on { color: #1d4ed8; border-color: #93c5fd; background: #dbeafe; } .night .chip.on { color: #bfdbfe; background: #1e3a8a; border-color: #3b5bab; }
      .chip.static { cursor: default; background: var(--secondary-background-color, rgba(127,127,127,.1)); border-color: transparent; }
      .chip .x { border: 0; background: none; padding: 0; cursor: pointer; color: var(--secondary-text-color); display: grid; } .chip .x .ic { width: 14px; height: 14px; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--ok); display: grid; grid-template-columns: 34px minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) 150px 130px; align-items: center; gap: 12px;
             padding: 10px 14px; border-radius: 14px; background: var(--card-background-color, #fff); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.06)); }
      @media (max-width: 760px) { .row { grid-template-columns: 34px minmax(0, 1fr) auto; } .row .cell { display: none; } }
      .row.r-bad { --c: var(--bad); background: color-mix(in srgb, var(--bad) 8%, var(--card-background-color, #fff)); }
      .row.r-warn { --c: var(--warn); } .row.r-idle { --c: var(--idle); } .row.r-info { --c: var(--info); }
      .dot { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
      .dot .ic { width: 17px; height: 17px; }
      .txt { min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub, .cell, .muted, small { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      small { white-space: normal; }
      .row > .tag, .row > .btn { justify-self: end; }
      .tag { justify-self: start; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; color: color-mix(in srgb, var(--tc) 75%, var(--primary-text-color)); background: color-mix(in srgb, var(--tc) 16%, transparent); }
      .tag.t-ok { --tc: var(--ok); } .tag.t-bad { --tc: var(--bad); } .tag.t-warn { --tc: var(--warn); } .tag.t-idle { --tc: var(--idle); } .tag.t-info { --tc: var(--info); }
      .btn { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn.primary { color: color-mix(in srgb, var(--accent) 70%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
      .btn.danger { color: color-mix(in srgb, var(--bad) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--bad) 55%, transparent); }
      .btn[disabled] { opacity: .45; cursor: default; }
      .cols { display: flex; flex-wrap: wrap; gap: 20px; } .col { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
      .card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .phead { display: flex; align-items: center; gap: 10px; }
      .p-home { --c: var(--ok); } .p-away { --c: var(--idle); }
      .picker { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-top: 6px; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
      .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
      .text { margin: 0; font-size: 13px; color: var(--secondary-text-color); }
      .lvl { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; align-items: center; font-size: 13px; }
      .form { gap: 14px; } .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: end; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .field input, .field select, #new-time { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .switch { display: flex; align-items: center; gap: 12px; cursor: pointer; }
      .stxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
      .sw { flex: none; width: 38px; height: 22px; border-radius: 999px; background: var(--divider-color, #ccc); position: relative; transition: background .2s; }
      .sw::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; }
      .switch input:checked + .sw { background: var(--accent); } .switch input:checked + .sw::after { transform: translateX(16px); }
      .switch input:focus-visible + .sw { outline: 2px solid var(--accent); outline-offset: 2px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .empty { padding: 16px; color: var(--secondary-text-color); font-size: 13px; }
      .av { --sc: var(--accent); flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; overflow: hidden; color: var(--sc);
            background: color-mix(in srgb, var(--sc) 14%, var(--card-background-color, #fff)); --mdc-icon-size: 18px; }
      .av img { width: 22px; height: 22px; object-fit: contain; } .av .ic { width: 17px; height: 17px; }
      .av.sm { width: 22px; height: 22px; --mdc-icon-size: 13px; } .av.sm img { width: 15px; height: 15px; } .av.sm .ic { width: 12px; height: 12px; }
      .srcbtn { font: inherit; font-size: 12px; color: var(--secondary-text-color); display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; }
      .srcbtn span:last-child { overflow: hidden; text-overflow: ellipsis; } .srcbtn:hover span:last-child { text-decoration: underline; }
      .chip.src .ic { width: 14px; height: 14px; }
      .tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; } .ic.xs { width: 12px; height: 12px; vertical-align: -2px; }
      .tags .tag { white-space: nowrap; }
      @media (max-width: 600px) { .src-card .phead { flex-wrap: wrap; } .src-card .phead .txt { flex: 1 1 0; min-width: 0; } .src-card .phead .tags { order: 3; flex-basis: 100%; justify-content: flex-start; padding-left: 44px; } .src-card .phead .tags:empty { display: none; } }
      .src-card.muted-src .phead > .av, .src-card.muted-src .phead .txt { opacity: .55; }
      .srcform { display: flex; flex-direction: column; padding-top: 12px; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); }
      .colorrow { display: flex; gap: 8px; } .colorrow input[type=color] { flex: none; width: 44px; padding: 2px; height: auto; } .colorrow input[type=text] { flex: 1; min-width: 0; }
      .addrow { display: flex; gap: 8px; } .addrow select { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px;
               color: var(--primary-text-color); background: var(--card-background-color, transparent); border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .col.wide { flex: 2 1 520px; } .wrapline { white-space: normal; margin: 0; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 10px 18px; border-radius: 999px; font-size: 13px;
               background: var(--primary-text-color); color: var(--primary-background-color); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    `;
  }
}

if (!customElements.get('notify-hub-panel')) customElements.define('notify-hub-panel', NotifyHubPanel);
