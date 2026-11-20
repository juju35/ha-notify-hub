"""Every translation has exactly the keys and placeholders of the English one."""

from __future__ import annotations

import json
import re
import string
from pathlib import Path

import pytest

TRANSLATIONS = Path(__file__).parent.parent / "custom_components" / "notify_hub" / "translations"
LANGUAGES = [
    "de", "es", "fr", "it", "nl", "pl", "pt", "pt-BR", "sr", "sr-Latn",
    "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el",
]  # fmt: skip


def _flatten(data: dict, prefix: str = "") -> dict[str, str]:
    flat: dict[str, str] = {}
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(_flatten(value, path))
        else:
            flat[path] = value
    return flat


def _load(language: str) -> dict[str, str]:
    return _flatten(json.loads((TRANSLATIONS / f"{language}.json").read_text(encoding="utf-8")))


def _placeholders(text: str) -> set[str]:
    return {name for _, name, _, _ in string.Formatter().parse(text) if name is not None}


def test_all_languages_are_tested():
    assert sorted(p.stem for p in TRANSLATIONS.glob("*.json")) == sorted(["en", *LANGUAGES])


@pytest.mark.parametrize("language", LANGUAGES)
def test_translation_parity(language: str):
    """Same keys as en.json, same placeholders in each string, nothing empty."""
    english, other = _load("en"), _load(language)
    assert sorted(other) == sorted(english)
    for key, text in english.items():
        assert other[key].strip(), key
        assert _placeholders(other[key]) == _placeholders(text), key


def test_brazilian_portuguese_is_european():
    assert _load("pt-BR") == _load("pt")


# Kept as is in the Cyrillic text: names, code and placeholders.
LATIN_ALLOWED = re.compile(
    r"Notify Hub|\bnotify(?:\.free_mobile)?\b|\b(?:critical|alert|info|digest)\b|\{[^}]*\}|\bID\b"
)


def test_serbian_scripts():
    """sr is written in Cyrillic and sr-Latn in Latin (apart from names and code)."""
    for key, text in _load("sr").items():
        assert not re.search(r"[A-Za-z]", LATIN_ALLOWED.sub("", text)), (key, text)
    for key, text in _load("sr-Latn").items():
        assert not re.search(r"[Ѐ-ӿ]", text), key


def test_priority_selector():
    import yaml

    from custom_components.notify_hub.const import PRIORITIES

    services = yaml.safe_load((TRANSLATIONS.parent / "services.yaml").read_text(encoding="utf-8"))
    assert services["send"]["fields"]["priority"]["selector"]["select"]["options"] == list(PRIORITIES)
    translated = json.loads((TRANSLATIONS / "en.json").read_text(encoding="utf-8"))["selector"]["priority"]["options"]
    assert sorted(translated) == sorted(PRIORITIES)
