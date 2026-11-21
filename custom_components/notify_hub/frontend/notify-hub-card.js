/**
 * notify-hub-card — the notifications of the house handled by Notify Hub: an illustrated header (a bell ringing,
 * letters flying, night with the dark theme) with the state of the hub, the counts (sent today, waiting for the
 * digest, held by the quiet hours, critical to acknowledge) and the latest notifications, a critical one with its
 * Acknowledge button, each with its source (the integration's logo, or the icon and color set for it in the panel).
 * Reads the hub's "Critical to acknowledge" sensor (its `notify_hub` attribute).
 * Served and added to the dashboard resources by the integration.
 * https://github.com/juju35/ha-notify-hub
 */
var NOTIFY_HUB_CARD_VERSION = '0.6.0';

var NH_CARD_I18N = {
  en: { title: "Notify Hub", sent: "Sent", grouped: "Grouped", held: "Held", pending: "To acknowledge", quiet_until: "Quiet hours until {t}", next_digest: "Next digest at {t}", all_quiet: "All quiet", nothing: "No notification yet", ack: "Acknowledge", st_delivered: "Delivered", st_held: "Held · quiet hours", st_grouped: "In the next digest", st_duplicate: "Duplicate ignored", st_pending: "Critical · waiting", st_acknowledged: "Acknowledged", st_nobody: "Nobody to notify", st_failed: "Failed", critical_n: "{n} critical", not_found: "Notify Hub is not set up", card_name: "Notify Hub Card", card_desc: "The notifications of the house: counts, the critical ones to acknowledge, the latest ones", ed_entity: "Sensor", ed_title: "Title", ed_rows: "Rows", ed_language: "Language", ago_now: "now", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Header illustration", it_auto: "Automatic (theme)", it_day: "Day", it_night: "Night", st_muted: "Muted" },
  fr: { title: "Notify Hub", sent: "Envoyées", grouped: "Regroupées", held: "Retenues", pending: "À acquitter", quiet_until: "Heures calmes jusqu’à {t}", next_digest: "Prochain résumé à {t}", all_quiet: "Tout est calme", nothing: "Aucune notification pour l’instant", ack: "Acquitter", st_delivered: "Délivrée", st_held: "Retenue · heures calmes", st_grouped: "Dans le prochain résumé", st_duplicate: "Doublon ignoré", st_pending: "Critique · en attente", st_acknowledged: "Acquittée", st_nobody: "Personne à prévenir", st_failed: "Échec", critical_n: "{n} critique(s)", not_found: "Notify Hub n’est pas configuré", card_name: "Carte Notify Hub", card_desc: "Les notifications de la maison : compteurs, critiques à acquitter, dernières envoyées", ed_entity: "Capteur", ed_title: "Titre", ed_rows: "Lignes", ed_language: "Langue", ago_now: "à l’instant", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Illustration de l’en-tête", it_auto: "Automatique (thème)", it_day: "Jour", it_night: "Nuit", st_muted: "Muette" },
  de: { title: "Notify Hub", sent: "Gesendet", grouped: "Gruppiert", held: "Zurückgehalten", pending: "Zu bestätigen", quiet_until: "Ruhezeit bis {t}", next_digest: "Nächste Zusammenfassung um {t}", all_quiet: "Alles ruhig", nothing: "Noch keine Benachrichtigung", ack: "Bestätigen", st_delivered: "Zugestellt", st_held: "Zurückgehalten · Ruhezeit", st_grouped: "In der nächsten Zusammenfassung", st_duplicate: "Duplikat ignoriert", st_pending: "Kritisch · wartet", st_acknowledged: "Bestätigt", st_nobody: "Niemand zu benachrichtigen", st_failed: "Fehlgeschlagen", critical_n: "{n} kritisch", not_found: "Notify Hub ist nicht eingerichtet", card_name: "Notify-Hub-Karte", card_desc: "Die Benachrichtigungen des Hauses: Zähler, zu bestätigende kritische, die letzten", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Zeilen", ed_language: "Sprache", ago_now: "jetzt", ago_min: "{n} Min.", ago_h: "{n} Std.", ed_illustration_theme: "Kopfzeilen-Illustration", it_auto: "Automatisch (Design)", it_day: "Tag", it_night: "Nacht", st_muted: "Stumm" },
  es: { title: "Notify Hub", sent: "Enviadas", grouped: "Agrupadas", held: "Retenidas", pending: "Por confirmar", quiet_until: "Silencio hasta las {t}", next_digest: "Próximo resumen a las {t}", all_quiet: "Todo tranquilo", nothing: "Aún no hay notificaciones", ack: "Confirmar", st_delivered: "Entregada", st_held: "Retenida · silencio", st_grouped: "En el próximo resumen", st_duplicate: "Duplicado ignorado", st_pending: "Crítica · en espera", st_acknowledged: "Confirmada", st_nobody: "Nadie a quien avisar", st_failed: "Fallida", critical_n: "{n} crítica(s)", not_found: "Notify Hub no está configurado", card_name: "Tarjeta Notify Hub", card_desc: "Las notificaciones de la casa: contadores, críticas por confirmar, las últimas", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Filas", ed_language: "Idioma", ago_now: "ahora", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustración del encabezado", it_auto: "Automática (tema)", it_day: "Día", it_night: "Noche", st_muted: "Silenciada" },
  it: { title: "Notify Hub", sent: "Inviate", grouped: "Raggruppate", held: "Trattenute", pending: "Da confermare", quiet_until: "Silenzio fino alle {t}", next_digest: "Prossimo riepilogo alle {t}", all_quiet: "Tutto tranquillo", nothing: "Ancora nessuna notifica", ack: "Conferma", st_delivered: "Consegnata", st_held: "Trattenuta · silenzio", st_grouped: "Nel prossimo riepilogo", st_duplicate: "Duplicato ignorato", st_pending: "Critica · in attesa", st_acknowledged: "Confermata", st_nobody: "Nessuno da avvisare", st_failed: "Non riuscita", critical_n: "{n} critiche", not_found: "Notify Hub non è configurato", card_name: "Scheda Notify Hub", card_desc: "Le notifiche della casa: contatori, critiche da confermare, le ultime", ed_entity: "Sensore", ed_title: "Titolo", ed_rows: "Righe", ed_language: "Lingua", ago_now: "ora", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Illustrazione dell’intestazione", it_auto: "Automatica (tema)", it_day: "Giorno", it_night: "Notte", st_muted: "Silenziata" },
  nl: { title: "Notify Hub", sent: "Verstuurd", grouped: "Gegroepeerd", held: "Vastgehouden", pending: "Te bevestigen", quiet_until: "Stil tot {t}", next_digest: "Volgend overzicht om {t}", all_quiet: "Alles rustig", nothing: "Nog geen melding", ack: "Bevestigen", st_delivered: "Afgeleverd", st_held: "Vastgehouden · stille uren", st_grouped: "In het volgende overzicht", st_duplicate: "Dubbel genegeerd", st_pending: "Kritiek · wacht", st_acknowledged: "Bevestigd", st_nobody: "Niemand te melden", st_failed: "Mislukt", critical_n: "{n} kritiek", not_found: "Notify Hub is niet ingesteld", card_name: "Notify Hub-kaart", card_desc: "De meldingen van het huis: tellers, te bevestigen kritieke, de laatste", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rijen", ed_language: "Taal", ago_now: "nu", ago_min: "{n} min", ago_h: "{n} u", ed_illustration_theme: "Illustratie van de kop", it_auto: "Automatisch (thema)", it_day: "Dag", it_night: "Nacht", st_muted: "Gedempt" },
  pt: { title: "Notify Hub", sent: "Enviadas", grouped: "Agrupadas", held: "Retidas", pending: "Por confirmar", quiet_until: "Silêncio até às {t}", next_digest: "Próximo resumo às {t}", all_quiet: "Tudo calmo", nothing: "Ainda sem notificações", ack: "Confirmar", st_delivered: "Entregue", st_held: "Retida · silêncio", st_grouped: "No próximo resumo", st_duplicate: "Duplicado ignorado", st_pending: "Crítica · à espera", st_acknowledged: "Confirmada", st_nobody: "Ninguém a avisar", st_failed: "Falhou", critical_n: "{n} crítica(s)", not_found: "O Notify Hub não está configurado", card_name: "Cartão Notify Hub", card_desc: "As notificações da casa: contadores, críticas por confirmar, as últimas", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Linhas", ed_language: "Idioma", ago_now: "agora", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustração do cabeçalho", it_auto: "Automática (tema)", it_day: "Dia", it_night: "Noite", st_muted: "Silenciada" },
  pl: { title: "Notify Hub", sent: "Wysłane", grouped: "Zgrupowane", held: "Wstrzymane", pending: "Do potwierdzenia", quiet_until: "Cisza do {t}", next_digest: "Następne podsumowanie o {t}", all_quiet: "Spokojnie", nothing: "Jeszcze brak powiadomień", ack: "Potwierdź", st_delivered: "Dostarczone", st_held: "Wstrzymane · cisza", st_grouped: "W następnym podsumowaniu", st_duplicate: "Duplikat pominięty", st_pending: "Krytyczne · czeka", st_acknowledged: "Potwierdzone", st_nobody: "Brak odbiorców", st_failed: "Błąd", critical_n: "Krytyczne: {n}", not_found: "Notify Hub nie jest skonfigurowany", card_name: "Karta Notify Hub", card_desc: "Powiadomienia domu: liczniki, krytyczne do potwierdzenia, ostatnie", ed_entity: "Czujnik", ed_title: "Tytuł", ed_rows: "Wiersze", ed_language: "Język", ago_now: "teraz", ago_min: "{n} min", ago_h: "{n} godz.", ed_illustration_theme: "Ilustracja nagłówka", it_auto: "Automatycznie (motyw)", it_day: "Dzień", it_night: "Noc", st_muted: "Wyciszone" },
  sr: { title: "Notify Hub", sent: "Послато", grouped: "Груписано", held: "Задржано", pending: "За потврду", quiet_until: "Тихи сати до {t}", next_digest: "Следећи преглед у {t}", all_quiet: "Све је мирно", nothing: "Још нема обавештења", ack: "Потврди", st_delivered: "Испоручено", st_held: "Задржано · тихи сати", st_grouped: "У следећем прегледу", st_duplicate: "Дупликат занемарен", st_pending: "Критично · чека", st_acknowledged: "Потврђено", st_nobody: "Нема коме да се јави", st_failed: "Неуспело", critical_n: "Критична: {n}", not_found: "Notify Hub није подешен", card_name: "Notify Hub картица", card_desc: "Обавештења куће: бројачи, критична за потврду, последња", ed_entity: "Сензор", ed_title: "Наслов", ed_rows: "Редови", ed_language: "Језик", ago_now: "сада", ago_min: "{n} мин", ago_h: "{n} ч", ed_illustration_theme: "Илустрација заглавља", it_auto: "Аутоматски (тема)", it_day: "Дан", it_night: "Ноћ", st_muted: "Утишано" },
  "sr-Latn": { title: "Notify Hub", sent: "Poslato", grouped: "Grupisano", held: "Zadržano", pending: "Za potvrdu", quiet_until: "Tihi sati do {t}", next_digest: "Sledeći pregled u {t}", all_quiet: "Sve je mirno", nothing: "Još nema obaveštenja", ack: "Potvrdi", st_delivered: "Isporučeno", st_held: "Zadržano · tihi sati", st_grouped: "U sledećem pregledu", st_duplicate: "Duplikat zanemaren", st_pending: "Kritično · čeka", st_acknowledged: "Potvrđeno", st_nobody: "Nema kome da se javi", st_failed: "Neuspelo", critical_n: "Kritična: {n}", not_found: "Notify Hub nije podešen", card_name: "Notify Hub kartica", card_desc: "Obaveštenja kuće: brojači, kritična za potvrdu, poslednja", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Redovi", ed_language: "Jezik", ago_now: "sada", ago_min: "{n} min", ago_h: "{n} č", ed_illustration_theme: "Ilustracija zaglavlja", it_auto: "Automatski (tema)", it_day: "Dan", it_night: "Noć", st_muted: "Utišano" },
  ro: { title: "Notify Hub", sent: "Trimise", grouped: "Grupate", held: "Reținute", pending: "De confirmat", quiet_until: "Liniște până la {t}", next_digest: "Următorul rezumat la {t}", all_quiet: "Totul e liniștit", nothing: "Încă nicio notificare", ack: "Confirmă", st_delivered: "Livrată", st_held: "Reținută · liniște", st_grouped: "În următorul rezumat", st_duplicate: "Duplicat ignorat", st_pending: "Critică · în așteptare", st_acknowledged: "Confirmată", st_nobody: "Nimeni de anunțat", st_failed: "Eșuată", critical_n: "Critice: {n}", not_found: "Notify Hub nu este configurat", card_name: "Card Notify Hub", card_desc: "Notificările casei: contoare, critice de confirmat, ultimele", ed_entity: "Senzor", ed_title: "Titlu", ed_rows: "Rânduri", ed_language: "Limbă", ago_now: "acum", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustrația antetului", it_auto: "Automat (temă)", it_day: "Zi", it_night: "Noapte", st_muted: "Silențioasă" },
  da: { title: "Notify Hub", sent: "Sendt", grouped: "Grupperet", held: "Holdt tilbage", pending: "Skal bekræftes", quiet_until: "Stille til {t}", next_digest: "Næste oversigt kl. {t}", all_quiet: "Alt er roligt", nothing: "Ingen notifikationer endnu", ack: "Bekræft", st_delivered: "Leveret", st_held: "Holdt tilbage · stille timer", st_grouped: "I næste oversigt", st_duplicate: "Dublet ignoreret", st_pending: "Kritisk · venter", st_acknowledged: "Bekræftet", st_nobody: "Ingen at underrette", st_failed: "Mislykkedes", critical_n: "{n} kritiske", not_found: "Notify Hub er ikke sat op", card_name: "Notify Hub-kort", card_desc: "Husets notifikationer: tællere, kritiske at bekræfte, de seneste", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rækker", ed_language: "Sprog", ago_now: "nu", ago_min: "{n} min", ago_h: "{n} t", ed_illustration_theme: "Illustration i toppen", it_auto: "Automatisk (tema)", it_day: "Dag", it_night: "Nat", st_muted: "Lydløs" },
  sv: { title: "Notify Hub", sent: "Skickade", grouped: "Grupperade", held: "Hållna", pending: "Att bekräfta", quiet_until: "Tyst till {t}", next_digest: "Nästa sammanfattning kl. {t}", all_quiet: "Allt lugnt", nothing: "Inga aviseringar än", ack: "Bekräfta", st_delivered: "Levererad", st_held: "Hållen · tysta timmar", st_grouped: "I nästa sammanfattning", st_duplicate: "Dubblett ignorerad", st_pending: "Kritisk · väntar", st_acknowledged: "Bekräftad", st_nobody: "Ingen att avisera", st_failed: "Misslyckades", critical_n: "{n} kritiska", not_found: "Notify Hub är inte konfigurerad", card_name: "Notify Hub-kort", card_desc: "Hemmets aviseringar: räknare, kritiska att bekräfta, de senaste", ed_entity: "Sensor", ed_title: "Rubrik", ed_rows: "Rader", ed_language: "Språk", ago_now: "nu", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Illustration i rubriken", it_auto: "Automatisk (tema)", it_day: "Dag", it_night: "Natt", st_muted: "Tystad" },
  bg: { title: "Notify Hub", sent: "Изпратени", grouped: "Групирани", held: "Задържани", pending: "За потвърждение", quiet_until: "Тихо до {t}", next_digest: "Следващо обобщение в {t}", all_quiet: "Всичко е спокойно", nothing: "Още няма известия", ack: "Потвърди", st_delivered: "Доставено", st_held: "Задържано · тихи часове", st_grouped: "В следващото обобщение", st_duplicate: "Дубликат пропуснат", st_pending: "Критично · чака", st_acknowledged: "Потвърдено", st_nobody: "Няма кого да известим", st_failed: "Неуспешно", critical_n: "Критични: {n}", not_found: "Notify Hub не е настроен", card_name: "Карта Notify Hub", card_desc: "Известията на дома: броячи, критични за потвърждение, последните", ed_entity: "Сензор", ed_title: "Заглавие", ed_rows: "Редове", ed_language: "Език", ago_now: "сега", ago_min: "{n} мин", ago_h: "{n} ч", ed_illustration_theme: "Илюстрация в заглавието", it_auto: "Автоматично (тема)", it_day: "Ден", it_night: "Нощ", st_muted: "Заглушено" },
  ru: { title: "Notify Hub", sent: "Отправлено", grouped: "Сгруппировано", held: "Задержано", pending: "К подтверждению", quiet_until: "Тишина до {t}", next_digest: "Следующая сводка в {t}", all_quiet: "Всё спокойно", nothing: "Уведомлений пока нет", ack: "Подтвердить", st_delivered: "Доставлено", st_held: "Задержано · тихие часы", st_grouped: "В следующей сводке", st_duplicate: "Дубль пропущен", st_pending: "Критическое · ждёт", st_acknowledged: "Подтверждено", st_nobody: "Некого уведомить", st_failed: "Ошибка", critical_n: "Критических: {n}", not_found: "Notify Hub не настроен", card_name: "Карточка Notify Hub", card_desc: "Уведомления дома: счётчики, критические к подтверждению, последние", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Строки", ed_language: "Язык", ago_now: "сейчас", ago_min: "{n} мин", ago_h: "{n} ч", ed_illustration_theme: "Иллюстрация заголовка", it_auto: "Автоматически (тема)", it_day: "День", it_night: "Ночь", st_muted: "Без звука" },
  uk: { title: "Notify Hub", sent: "Надіслано", grouped: "Згруповано", held: "Затримано", pending: "До підтвердження", quiet_until: "Тиша до {t}", next_digest: "Наступний підсумок о {t}", all_quiet: "Усе спокійно", nothing: "Сповіщень поки немає", ack: "Підтвердити", st_delivered: "Доставлено", st_held: "Затримано · тихі години", st_grouped: "У наступному підсумку", st_duplicate: "Дублікат пропущено", st_pending: "Критичне · чекає", st_acknowledged: "Підтверджено", st_nobody: "Нікого сповістити", st_failed: "Помилка", critical_n: "Критичних: {n}", not_found: "Notify Hub не налаштовано", card_name: "Картка Notify Hub", card_desc: "Сповіщення дому: лічильники, критичні до підтвердження, останні", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Рядки", ed_language: "Мова", ago_now: "зараз", ago_min: "{n} хв", ago_h: "{n} год", ed_illustration_theme: "Ілюстрація заголовка", it_auto: "Автоматично (тема)", it_day: "День", it_night: "Ніч", st_muted: "Без звуку" },
  hu: { title: "Notify Hub", sent: "Elküldve", grouped: "Csoportosítva", held: "Visszatartva", pending: "Nyugtázandó", quiet_until: "Csend {t}-ig", next_digest: "Következő összefoglaló: {t}", all_quiet: "Minden nyugodt", nothing: "Még nincs értesítés", ack: "Nyugtázás", st_delivered: "Kézbesítve", st_held: "Visszatartva · csendes órák", st_grouped: "A következő összefoglalóban", st_duplicate: "Ismétlődés kihagyva", st_pending: "Kritikus · vár", st_acknowledged: "Nyugtázva", st_nobody: "Nincs kit értesíteni", st_failed: "Sikertelen", critical_n: "Kritikus: {n}", not_found: "A Notify Hub nincs beállítva", card_name: "Notify Hub kártya", card_desc: "A ház értesítései: számlálók, nyugtázandó kritikusak, a legutóbbiak", ed_entity: "Érzékelő", ed_title: "Cím", ed_rows: "Sorok", ed_language: "Nyelv", ago_now: "most", ago_min: "{n} perc", ago_h: "{n} óra", ed_illustration_theme: "Fejléc illusztráció", it_auto: "Automatikus (téma)", it_day: "Nappal", it_night: "Éjszaka", st_muted: "Némítva" },
  sk: { title: "Notify Hub", sent: "Odoslané", grouped: "Zoskupené", held: "Zadržané", pending: "Na potvrdenie", quiet_until: "Ticho do {t}", next_digest: "Ďalší prehľad o {t}", all_quiet: "Všetko je pokojné", nothing: "Zatiaľ žiadne upozornenia", ack: "Potvrdiť", st_delivered: "Doručené", st_held: "Zadržané · tiché hodiny", st_grouped: "V ďalšom prehľade", st_duplicate: "Duplikát ignorovaný", st_pending: "Kritické · čaká", st_acknowledged: "Potvrdené", st_nobody: "Nikoho upozorniť", st_failed: "Zlyhalo", critical_n: "Kritické: {n}", not_found: "Notify Hub nie je nastavený", card_name: "Karta Notify Hub", card_desc: "Upozornenia domu: počítadlá, kritické na potvrdenie, posledné", ed_entity: "Senzor", ed_title: "Názov", ed_rows: "Riadky", ed_language: "Jazyk", ago_now: "teraz", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustrácia hlavičky", it_auto: "Automaticky (téma)", it_day: "Deň", it_night: "Noc", st_muted: "Stlmené" },
  cs: { title: "Notify Hub", sent: "Odesláno", grouped: "Seskupeno", held: "Zadrženo", pending: "K potvrzení", quiet_until: "Ticho do {t}", next_digest: "Další přehled v {t}", all_quiet: "Vše je klidné", nothing: "Zatím žádná oznámení", ack: "Potvrdit", st_delivered: "Doručeno", st_held: "Zadrženo · tiché hodiny", st_grouped: "V dalším přehledu", st_duplicate: "Duplikát ignorován", st_pending: "Kritické · čeká", st_acknowledged: "Potvrzeno", st_nobody: "Nikoho upozornit", st_failed: "Selhalo", critical_n: "Kritická: {n}", not_found: "Notify Hub není nastaven", card_name: "Karta Notify Hub", card_desc: "Oznámení domu: počítadla, kritická k potvrzení, poslední", ed_entity: "Senzor", ed_title: "Název", ed_rows: "Řádky", ed_language: "Jazyk", ago_now: "teď", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustrace záhlaví", it_auto: "Automaticky (motiv)", it_day: "Den", it_night: "Noc", st_muted: "Ztlumeno" },
  sl: { title: "Notify Hub", sent: "Poslano", grouped: "Združeno", held: "Zadržano", pending: "Za potrditev", quiet_until: "Tišina do {t}", next_digest: "Naslednji povzetek ob {t}", all_quiet: "Vse je mirno", nothing: "Še ni obvestil", ack: "Potrdi", st_delivered: "Dostavljeno", st_held: "Zadržano · tihe ure", st_grouped: "V naslednjem povzetku", st_duplicate: "Dvojnik prezrt", st_pending: "Kritično · čaka", st_acknowledged: "Potrjeno", st_nobody: "Nikogar za obvestiti", st_failed: "Ni uspelo", critical_n: "Kritična: {n}", not_found: "Notify Hub ni nastavljen", card_name: "Kartica Notify Hub", card_desc: "Obvestila hiše: števci, kritična za potrditev, zadnja", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Vrstice", ed_language: "Jezik", ago_now: "zdaj", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Ilustracija glave", it_auto: "Samodejno (tema)", it_day: "Dan", it_night: "Noč", st_muted: "Utišano" },
  lv: { title: "Notify Hub", sent: "Nosūtīti", grouped: "Grupēti", held: "Aizturēti", pending: "Jāapstiprina", quiet_until: "Klusums līdz {t}", next_digest: "Nākamais kopsavilkums {t}", all_quiet: "Viss mierīgi", nothing: "Vēl nav paziņojumu", ack: "Apstiprināt", st_delivered: "Piegādāts", st_held: "Aizturēts · klusās stundas", st_grouped: "Nākamajā kopsavilkumā", st_duplicate: "Dublikāts ignorēts", st_pending: "Kritisks · gaida", st_acknowledged: "Apstiprināts", st_nobody: "Nav kam paziņot", st_failed: "Neizdevās", critical_n: "Kritiskie: {n}", not_found: "Notify Hub nav iestatīts", card_name: "Notify Hub kartīte", card_desc: "Mājas paziņojumi: skaitītāji, apstiprināmie kritiskie, pēdējie", ed_entity: "Sensors", ed_title: "Virsraksts", ed_rows: "Rindas", ed_language: "Valoda", ago_now: "tagad", ago_min: "{n} min", ago_h: "{n} h", ed_illustration_theme: "Galvenes ilustrācija", it_auto: "Automātiski (tēma)", it_day: "Diena", it_night: "Nakts", st_muted: "Apklusināts" },
  el: { title: "Notify Hub", sent: "Στάλθηκαν", grouped: "Ομαδοποιημένες", held: "Σε αναμονή", pending: "Προς επιβεβαίωση", quiet_until: "Ησυχία έως {t}", next_digest: "Επόμενη σύνοψη στις {t}", all_quiet: "Όλα ήσυχα", nothing: "Καμία ειδοποίηση ακόμη", ack: "Επιβεβαίωση", st_delivered: "Παραδόθηκε", st_held: "Σε αναμονή · ώρες ησυχίας", st_grouped: "Στην επόμενη σύνοψη", st_duplicate: "Διπλότυπο αγνοήθηκε", st_pending: "Κρίσιμη · αναμένει", st_acknowledged: "Επιβεβαιώθηκε", st_nobody: "Κανείς για ειδοποίηση", st_failed: "Απέτυχε", critical_n: "Κρίσιμες: {n}", not_found: "Το Notify Hub δεν έχει ρυθμιστεί", card_name: "Κάρτα Notify Hub", card_desc: "Οι ειδοποιήσεις του σπιτιού: μετρητές, κρίσιμες προς επιβεβαίωση, οι πιο πρόσφατες", ed_entity: "Αισθητήρας", ed_title: "Τίτλος", ed_rows: "Γραμμές", ed_language: "Γλώσσα", ago_now: "τώρα", ago_min: "{n} λεπ.", ago_h: "{n} ώρ.", ed_illustration_theme: "Εικονογράφηση κεφαλίδας", it_auto: "Αυτόματα (θέμα)", it_day: "Ημέρα", it_night: "Νύχτα", st_muted: "Σε σίγαση" },
};

var NH_DEFAULTS = { rows: 4, illustration_theme: 'auto' };
// The tone of each status: the dot, the line under the message and the header.
var NH_TONES = {
  delivered: 'ok',
  acknowledged: 'ok',
  pending: 'bad',
  held: 'idle',
  grouped: 'warn',
  duplicate: 'info',
  nobody: 'bad',
  failed: 'bad',
  muted: 'idle',
};
var NH_ICONS = {
  bell: 'M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21',
  ok: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  bad: 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z',
  warn: 'M19,15H15A3,3 0 0,1 12,18A3,3 0 0,1 9,15H5V5H19M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z',
  idle: 'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z',
  info: 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
};

var nhEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
var nhIcon = (name, cls) => `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${NH_ICONS[name] || ''}"/></svg>`;
var nhLang = (hass, config) => {
  var raw = String(config?.language || hass?.locale?.language || hass?.language || 'en');
  if (NH_CARD_I18N[raw]) return raw;
  var base = raw.split('-')[0];
  return NH_CARD_I18N[base] ? base : 'en';
};
// A notification's source: its icon (mdi:) set in the panel, else its integration's brand logo, tinted with its color.
var nhSource = (look, dark) => {
  if (!look?.name) return '';
  var style = look.color ? ` style="--sc:${nhEsc(look.color)}"` : '';
  var mark = look.icon
    ? `<ha-icon icon="${nhEsc(look.icon)}"></ha-icon>`
    : look.domain
      ? `<img src="https://brands.home-assistant.io/_/${encodeURIComponent(look.domain)}/${dark ? 'dark_' : ''}icon.png" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : '';
  return `<span class="src${look.color ? ' tinted' : ''}"${style}>${mark}<span>${nhEsc(look.name)}</span></span>`;
};
var nhFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));
// The hub's sensor: the one carrying the `notify_hub` attribute. The last one found is checked first, so the states
// are only scanned again when it is gone (a scan of every state on each update cost a lot on large installs).
var nhFound = '';
var nhFind = (hass) => {
  var states = hass?.states || {};
  if (nhFound && states[nhFound]?.attributes?.notify_hub) return nhFound;
  nhFound = Object.keys(states).find((id) => id.startsWith('sensor.') && states[id]?.attributes?.notify_hub) || '';
  return nhFound;
};

// In-place patching of the card's DOM (same approach as ha-flight-board-card): kept nodes keep their size, their
// running animations and their focus, so a state update never collapses the card for a frame (which made the
// sections grid reflow and the page scroll by itself). Children with a `data-key` are matched by key.
var nhPatchAttrs = (cur, next) => {
  for (var { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (var { name: n, value } of next.attributes) if (cur.getAttribute(n) !== value) cur.setAttribute(n, value);
};
var nhKey = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
var nhPatchChildren = (cur, next) => {
  var old = [...cur.childNodes];
  var fresh = [...next.childNodes];
  var byKey = new Map();
  for (var o of old) {
    var k = nhKey(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  var used = new Set();
  fresh.forEach((n, i) => {
    var key = nhKey(n);
    var match = key !== null ? byKey.get(key) : old[i];
    if (!match || match.nodeType !== n.nodeType || match.nodeName !== n.nodeName || used.has(match) || (key === null && nhKey(match) !== null)) match = null;
    var ref = cur.childNodes[i] ?? null;
    if (!match) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(match);
    if (match !== ref) cur.insertBefore(match, ref);
    if (n.nodeType === 1) {
      nhPatchAttrs(match, n);
      nhPatchChildren(match, n);
    } else if (match.nodeValue !== n.nodeValue) match.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
var nhMorph = (root, html) => {
  var tpl = document.createElement('template');
  tpl.innerHTML = html;
  nhPatchChildren(root, tpl.content);
};

class NotifyHubCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('notify-hub-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = Object.assign({}, NH_DEFAULTS, config || {});
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    var id = this._config?.entity || nhFind(hass);
    var st = id ? hass.states[id] : undefined;
    // Only the hub's sensor, the theme and the language matter: any other entity changing leaves the card untouched.
    // The sensor object is compared first (Home Assistant keeps it when it does not change), then its content.
    if (st === this._st && hass.themes?.darkMode === this._dark && hass.locale?.language === this._lang) return;
    this._st = st;
    this._dark = hass.themes?.darkMode;
    this._lang = hass.locale?.language;
    var sig = JSON.stringify([st?.state, st?.attributes, this._dark, this._lang, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  connectedCallback() {
    // The "3 min" ages move on by themselves: patched in place once a minute (text only, nothing rebuilt).
    clearInterval(this._tick);
    this._tick = setInterval(() => this._render(), 60000);
    if (this._hass) this._render();
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
  }

  getCardSize() {
    return 3 + Math.min(Number(this._config?.rows) || 4, 8);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _t() {
    var lang = nhLang(this._hass, this._config);
    return Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[lang]);
  }

  _night() {
    var theme = this._config.illustration_theme;
    if (theme === 'day') return false;
    if (theme === 'night') return true;
    return !!this._hass?.themes?.darkMode;
  }

  _ago(iso, t) {
    var minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (!Number.isFinite(minutes) || minutes < 1) return t.ago_now;
    if (minutes < 60) return nhFill(t.ago_min, { n: minutes });
    var lang = nhLang(this._hass, this._config);
    if (minutes < 24 * 60) return nhFill(t.ago_h, { n: Math.round(minutes / 60) });
    try {
      return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
    } catch (_err) {
      return new Date(iso).toLocaleDateString();
    }
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
      // Built once: later updates patch the nodes inside <ha-card> (nhMorph), the card and its styles are kept.
      this.shadowRoot.innerHTML = `<style>${NotifyHubCard.styles()}</style><ha-card></ha-card>`;
    }
    var t = this._t();
    var id = this._config.entity || nhFind(this._hass);
    var st = id ? this._hass.states[id] : undefined;
    var a = st?.attributes;
    var body;
    var tone = 'ok';
    var subtitle = '';
    var pill = '';
    if (!a?.notify_hub) {
      tone = 'idle';
      body = `<div class="empty">${nhEsc(t.not_found)}</div>`;
    } else {
      var counts = a.counts || {};
      var pending = Number(counts.pending) || 0;
      tone = pending ? 'bad' : a.quiet ? 'idle' : 'ok';
      subtitle = a.quiet && a.quiet_hours ? nhFill(t.quiet_until, { t: a.quiet_hours[1] }) : counts.grouped && a.next_digest ? nhFill(t.next_digest, { t: a.next_digest }) : nhFill(t.sent, {}) + ` · ${counts.sent_today || 0}`;
      pill = pending ? nhFill(t.critical_n, { n: pending }) : t.all_quiet;
      var tiles = [
        // Every tile has its state badge: the tone of its count, grey (idle) at zero.
        ['sent', counts.sent_today, counts.sent_today ? 'ok' : 'idle'],
        ['grouped', counts.grouped, counts.grouped ? 'warn' : 'idle'],
        ['held', counts.held, 'idle'],
        ['pending', pending, pending ? 'bad' : 'idle'],
      ]
        .map(([k, v, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}" data-key="${k}"><span class="n">${nhEsc(v ?? 0)}</span><span class="k">${nhEsc(t[k])}</span>${cls ? '<span class="badge"></span>' : ''}</div>`)
        .join('');
      var rows = (a.recent || []).slice(0, Math.max(1, Number(this._config.rows) || 4));
      var list = rows.length
        ? rows
            .map((e) => {
              var tn = NH_TONES[e.status] || 'ok';
              var name = e.title || e.message;
              var sub = [t[`st_${e.status}`] || e.status, this._ago(e.time, t)].join(' · ');
              var look = (a.sources || {})[e.source_key] || (e.source ? { name: e.source, domain: e.domain } : null);
              var who = (e.people || []).join(', ');
              var ack = e.status === 'pending' ? `<button class="btn" type="button" data-ack="${nhEsc(e.id)}">${nhEsc(t.ack)}</button>` : '';
              return `<div class="row r-${tn}" data-key="${nhEsc(e.id)}"><span class="dot">${nhIcon(tn)}</span><span class="txt"><span class="nm">${nhEsc(name)}</span><span class="sub">${nhSource(look, this._night())}${nhEsc(sub)}</span></span>${who ? `<span class="chip">${nhEsc(who)}</span>` : ''}${ack}</div>`;
            })
            .join('')
        : `<div class="empty">${nhEsc(t.nothing)}</div>`;
      body = `<div class="tiles">${tiles}</div><div class="list">${list}</div>`;
    }
    var title = this._config.title || t.title;
    var card = this.shadowRoot.querySelector('ha-card');
    card.className = `tone-${tone}${this._night() ? ' night' : ''}`;
    nhMorph(
      card,
      `<div class="banner">
          ${NotifyHubCard.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="head">
            <span class="ico">${nhIcon('bell')}</span>
            <span class="htxt"><span class="title">${nhEsc(title)}</span>${subtitle ? `<span class="subtitle">${nhEsc(subtitle)}</span>` : ''}</span>
            ${pill ? `<span class="pill">${nhEsc(pill)}</span>` : ''}
          </div>
        </div>
        <div class="body">${body}</div>`,
    );
  }

  // The header's scene: a mailbox bell ringing (shaking when a critical one waits), letters on their way.
  static scene(alarm) {
    return `<svg class="scene" viewBox="0 0 200 90" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g class="letter l1"><rect x="40" y="38" width="30" height="20" rx="3"/><path d="M40 40 l15 10 l15 -10"/></g>
      <g class="letter l2"><rect x="150" y="46" width="24" height="16" rx="3"/><path d="M150 48 l12 8 l12 -8"/></g>
      <g class="bell${alarm ? ' ring' : ''}"><path class="bbody" d="M98 78 v-26 a18 18 0 0 1 36 0 v26 z"/><rect class="brim" x="94" y="76" width="44" height="6" rx="3"/><circle class="bclap" cx="116" cy="86" r="4"/></g>
      <path class="wave w1" d="M142 44 q7 7 0 14"/><path class="wave w2" d="M149 38 q12 13 0 26"/>
    </svg>`;
  }

  async _click(ev) {
    var btn = ev.composedPath().find((n) => n?.dataset?.ack);
    if (!btn) return;
    btn.disabled = true;
    try {
      await this._hass.callService('notify_hub', 'acknowledge', { id: btn.dataset.ack });
    } catch (_err) {
      btn.disabled = false;
    }
  }

  static styles() {
    return `
      :host { --nh-ok: var(--success-color, #43a047); --nh-warn: var(--warning-color, #f59e0b); --nh-bad: var(--error-color, #db4437);
              --nh-idle: var(--secondary-text-color, #727272); --nh-info: #2563eb; --nh-accent: #2563eb; }
      ha-card { overflow: hidden; }
      ha-card.tone-ok { --c: var(--nh-accent); } ha-card.tone-bad { --c: var(--nh-bad); } ha-card.tone-idle { --c: var(--nh-idle); }
      .banner { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#dbeafe, #f0f6ff); }
      .night .banner { background: linear-gradient(#0f1b33, #1c2a48); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #93c5fd; }
      .night .ground { background: #36507e; }
      .scene { position: absolute; right: 8px; bottom: 6px; height: 70px; width: auto; max-width: 46%; }
      .letter rect { fill: #fff; stroke: #93c5fd; stroke-width: 2; } .letter path { fill: none; stroke: #93c5fd; stroke-width: 2; }
      .night .letter rect { fill: #e6ebf3; stroke: #5b7bb3; } .night .letter path { stroke: #5b7bb3; }
      .bbody { fill: #93c5fd; } .brim, .bclap { fill: #60a5fa; }
      .night .bbody { fill: #5b7bb3; } .night .brim, .night .bclap { fill: #8fb3ee; }
      .tone-bad .bbody { fill: #fca5a5; } .tone-bad .brim, .tone-bad .bclap { fill: #ef4444; }
      .wave { fill: none; stroke: #3b82f6; stroke-width: 2.5; stroke-linecap: round; }
      .tone-bad .wave { stroke: #ef4444; } .tone-idle .wave { opacity: .25; }
      .letter { animation: nh-fly 6s ease-in-out infinite; } .l2 { animation-delay: -3s; }
      .wave { animation: nh-wave 1.8s ease-in-out infinite; } .w2 { animation-delay: .3s; }
      .bell { transform-box: fill-box; transform-origin: 50% 0; } .bell.ring { animation: nh-ring .9s ease-in-out infinite; }
      @keyframes nh-fly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6px, -4px); } }
      @keyframes nh-wave { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
      @keyframes nh-ring { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(10deg); } 75% { transform: rotate(-10deg); } }
      @media (prefers-reduced-motion: reduce) { .letter, .wave, .bell.ring { animation: none; } }
      .head { position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: flex-start; gap: 12px; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 18%, #fff); color: var(--c); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #1c2a48); }
      .ico .ic { width: 22px; height: 22px; fill: currentColor; }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 16px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; font-size: 12px; line-height: 14px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
              color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .night .pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: color-mix(in srgb, var(--c) 25%, #1c2a48); }
      .body { container-type: inline-size; padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .tile { position: relative; display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 10px; border-radius: 12px;
              background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .tile .n { font-size: 20px; font-weight: 700; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
      .tile .k { font-size: 12px; line-height: 1.2; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--nh-bad); }
      .badge { position: absolute; right: 9px; top: 9px; width: 8px; height: 8px; border-radius: 50%; }
      .t-ok .badge { background: var(--nh-ok); } .t-bad .badge { background: var(--nh-bad); } .t-warn .badge { background: var(--nh-warn); } .t-idle .badge { background: var(--nh-idle); }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--nh-ok); display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 10px; border-radius: 12px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.r-bad { --c: var(--nh-bad); background: color-mix(in srgb, var(--nh-bad) 9%, var(--secondary-background-color, transparent)); }
      .row.r-warn { --c: var(--nh-warn); } .row.r-idle { --c: var(--nh-idle); } .row.r-info { --c: var(--nh-info); }
      .dot { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .dot .ic { width: 16px; height: 16px; fill: currentColor; }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .src { --sc: var(--secondary-text-color); display: inline-flex; align-items: center; gap: 4px; margin-right: 3px; vertical-align: top; color: var(--secondary-text-color); --mdc-icon-size: 14px; }
      .src.tinted { color: color-mix(in srgb, var(--sc) 75%, var(--primary-text-color)); }
      .src img { width: 14px; height: 14px; object-fit: contain; } .src ha-icon { color: var(--sc); display: inline-flex; }
      .src > span::after { content: ' ·'; }
      .chip { flex: none; max-width: 30%; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              color: var(--secondary-text-color); background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .btn { flex: none; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 12px; border-radius: 999px;
             color: var(--primary-text-color); background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn:focus-visible { outline: 2px solid var(--nh-accent); outline-offset: 2px; }
      .btn[disabled] { opacity: .5; cursor: default; }
      .empty { padding: 10px 2px; font-size: 13px; color: var(--secondary-text-color); }
      @container (max-width: 308px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    `;
  }
}

class NotifyHubCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    // The form only needs hass for its pickers: handed over without rebuilding the schema at every state change.
    if (first) this._render();
    else if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._hass || !this._config) return;
    var lang = nhLang(this._hass, this._config);
    var t = Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[lang]);
    this._tr = t;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => this._tr[`ed_${s.name}`] || s.name;
      this._form.addEventListener('value-changed', (ev) => {
        var value = Object.assign({}, ev.detail.value);
        for (var key of Object.keys(value)) if (value[key] === '' || value[key] == null || value[key] === NH_DEFAULTS[key]) delete value[key];
        this._config = Object.assign({ type: this._config.type }, value);
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = Object.assign({}, NH_DEFAULTS, this._config);
    this._form.schema = [
      { name: 'entity', selector: { entity: { domain: 'sensor', integration: 'notify_hub' } } },
      { name: 'title', selector: { text: {} } },
      { name: 'rows', selector: { number: { min: 1, max: 8, mode: 'box' } } },
      {
        name: 'illustration_theme',
        selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'].map((v) => ({ value: v, label: t[`it_${v}`] })) } },
      },
      {
        name: 'language',
        selector: { select: { mode: 'dropdown', options: Object.keys(NH_CARD_I18N).map((l) => ({ value: l, label: l })) } },
      },
    ];
  }
}

if (!customElements.get('notify-hub-card')) customElements.define('notify-hub-card', NotifyHubCard);
if (!customElements.get('notify-hub-card-editor')) customElements.define('notify-hub-card-editor', NotifyHubCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'notify-hub-card')) {
  var nhT = Object.assign({}, NH_CARD_I18N.en, NH_CARD_I18N[nhLang(document.querySelector('home-assistant')?.hass, {})]);
  window.customCards.push({ type: 'notify-hub-card', name: nhT.card_name, description: nhT.card_desc, preview: true });
}
