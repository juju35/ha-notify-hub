"""The few texts the hub writes into the notifications themselves, in Home Assistant's language."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

# key: acknowledge (the button of a critical notification), digest (the digest's title), more (lines left out).
TEXTS: dict[str, dict[str, str]] = {
    "en": {"acknowledge": "Acknowledge", "digest": "Digest · {n}", "more": "+{n} more"},
    "fr": {"acknowledge": "Acquitter", "digest": "Résumé · {n}", "more": "+{n} autres"},
    "de": {"acknowledge": "Bestätigen", "digest": "Zusammenfassung · {n}", "more": "+{n} weitere"},
    "es": {"acknowledge": "Confirmar", "digest": "Resumen · {n}", "more": "+{n} más"},
    "it": {"acknowledge": "Conferma", "digest": "Riepilogo · {n}", "more": "+{n} altre"},
    "nl": {"acknowledge": "Bevestigen", "digest": "Overzicht · {n}", "more": "+{n} meer"},
    "pt": {"acknowledge": "Confirmar", "digest": "Resumo · {n}", "more": "+{n} mais"},
    "pl": {"acknowledge": "Potwierdź", "digest": "Podsumowanie · {n}", "more": "+{n} więcej"},
    "sr": {"acknowledge": "Потврди", "digest": "Преглед · {n}", "more": "+{n} још"},
    "sr-Latn": {"acknowledge": "Potvrdi", "digest": "Pregled · {n}", "more": "+{n} još"},
    "ro": {"acknowledge": "Confirmă", "digest": "Rezumat · {n}", "more": "+{n} în plus"},
    "da": {"acknowledge": "Bekræft", "digest": "Oversigt · {n}", "more": "+{n} flere"},
    "sv": {"acknowledge": "Bekräfta", "digest": "Sammanfattning · {n}", "more": "+{n} till"},
    "bg": {"acknowledge": "Потвърди", "digest": "Обобщение · {n}", "more": "+{n} още"},
    "ru": {"acknowledge": "Подтвердить", "digest": "Сводка · {n}", "more": "+{n} ещё"},
    "uk": {"acknowledge": "Підтвердити", "digest": "Підсумок · {n}", "more": "+{n} ще"},
    "hu": {"acknowledge": "Nyugtázás", "digest": "Összefoglaló · {n}", "more": "+{n} további"},
    "sk": {"acknowledge": "Potvrdiť", "digest": "Prehľad · {n}", "more": "+{n} ďalších"},
    "cs": {"acknowledge": "Potvrdit", "digest": "Přehled · {n}", "more": "+{n} dalších"},
    "sl": {"acknowledge": "Potrdi", "digest": "Povzetek · {n}", "more": "+{n} več"},
    "lv": {"acknowledge": "Apstiprināt", "digest": "Kopsavilkums · {n}", "more": "+{n} vēl"},
    "el": {"acknowledge": "Επιβεβαίωση", "digest": "Σύνοψη · {n}", "more": "+{n} ακόμη"},
}


def text(hass: HomeAssistant, key: str, **values: object) -> str:
    """The text in Home Assistant's language (its exact code, then its base language, then English)."""
    language = str(hass.config.language or "en")
    table = TEXTS.get(language) or TEXTS.get(language.split("-")[0]) or TEXTS["en"]
    template = table.get(key, TEXTS["en"][key])
    for name, value in values.items():
        template = template.replace("{" + name + "}", str(value))
    return template
