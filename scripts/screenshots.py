"""Render the Notify Hub card and panel with mock data and save the README screenshots.

Usage: python scripts/screenshots.py  (needs `pip install playwright pillow`, `playwright install chromium`, and ffmpeg
for the GIF). CHROMIUM_PATH=/path/to/chrome to use another browser. The clock is frozen so the times stay the same.
A file is only rewritten when its decoded pixels change: an unchanged render leaves no diff to commit.
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "custom_components/notify_hub/frontend"
OUT = ROOT / "screenshots"
NOW = "2026-11-20T18:00:00+01:00"
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

THEMES = {
    "light": {
        "--primary-background-color": "#e8eaed",
        "--secondary-background-color": "#f1f2f4",
        "--card-background-color": "#ffffff",
        "--primary-text-color": "#212121",
        "--secondary-text-color": "#727272",
        "--divider-color": "rgba(0,0,0,.12)",
    },
    "dark": {
        "--primary-background-color": "#111111",
        "--secondary-background-color": "#262626",
        "--card-background-color": "#1c1c1c",
        "--primary-text-color": "#e1e1e1",
        "--secondary-text-color": "#9b9b9b",
        "--divider-color": "rgba(225,225,225,.12)",
    },
}
COMMON = {"--success-color": "#43a047", "--warning-color": "#ffa600", "--error-color": "#db4437"}


def _entry(n, minutes, title, message, status, priority="info", source="", people=("Alex", "Sam")):
    hour, minute = divmod(18 * 60 - minutes, 60)
    return {
        "id": f"e{n:03d}",
        "time": f"2026-11-20T{hour:02d}:{minute:02d}:00+01:00",
        "title": title,
        "message": message,
        "priority": priority,
        "source": source,
        "source_key": source.lower().replace(" ", "_"),
        "people": list(people),
        "status": status,
    }


RECENT = [
    _entry(1, 3, "Washing machine", "The cycle is finished", "delivered", source="Laundry"),
    _entry(2, 12, "Front door", "Left open for 10 minutes", "delivered", "alert", "Doors", ("Alex",)),
    _entry(3, 25, "Bin day", "Recycling goes out tonight", "grouped", "digest", "Waste"),
    _entry(4, 31, "Front door", "Left open for 10 minutes", "duplicate", "alert", "Doors", ()),
    _entry(5, 48, "Dishwasher", "Program finished", "delivered", source="Kitchen"),
    _entry(6, 95, "Battery low", "Hall motion sensor at 8 %", "grouped", "digest", "Batteries"),
]
ALARM = [_entry(0, 1, "Water leak", "Leak detected under the kitchen sink", "pending", "critical", "Safety")]


def _source(name, count, minutes, rule=None, origins=()):
    hour, minute = divmod(18 * 60 - minutes, 60)
    return {
        "key": name.lower(),
        "name": name,
        "domain": None,
        "origins": list(origins),
        "count": count,
        "muted": count if (rule or {}).get("muted") else 0,
        "last": f"2026-11-20T{hour:02d}:{minute:02d}:00+01:00",
        "rule": rule or {},
    }


SOURCES = [
    _source("Doors", 9, 12, {"color": "#f59e0b", "ignore_quiet": True}, ("Front door left open",)),
    _source("Laundry", 6, 3, {"color": "#0ea5e9"}, ("Washing machine finished", "Dryer finished")),
    _source("Batteries", 4, 95, {"priority": "digest"}, ("Low batteries",)),
    _source("Safety", 2, 1, {"color": "#ef4444", "priority": "critical", "people": ["person.alex"]}, ("Water leak",)),
    _source("Garden", 2, 300, {"muted": True}, ("Rain sensor",)),
    _source("Kitchen", 1, 48, None, ("Dishwasher finished",)),
]
LOOKS = {s["key"]: s for s in SOURCES}


def summary(recent):
    return {
        "counts": {
            "sent_today": 14,
            "grouped": sum(e["status"] == "grouped" for e in recent),
            "held": 0,
            "duplicates": 3,
            "pending": sum(e["status"] == "pending" for e in recent),
        },
        "quiet": False,
        "quiet_hours": ["22:00", "07:00"],
        "next_digest": "19:00",
        "recent": recent,
        "sources": {
            k: {"name": v["name"], "domain": None, "icon": None, "color": v["rule"].get("color")}
            for k, v in LOOKS.items()
        },
    }


PANEL_STATE = {
    "version": "0.1.1",
    **summary(ALARM + RECENT),
    "people": [
        {
            "entity_id": "person.alex",
            "name": "Alex",
            "home": True,
            "channels": ["notify.mobile_app_pixel_8"],
            "custom": False,
            "presence": "binary_sensor.alex_bluetooth_presence",
        },
        {
            "entity_id": "person.sam",
            "name": "Sam",
            "home": False,
            "channels": ["notify.mobile_app_iphone", "notify.mobile_app_ipad"],
            "custom": True,
        },
        {
            "entity_id": "person.wall_tablet",
            "name": "Wall tablet",
            "home": True,
            "channels": [],
            "custom": False,
            "excluded": True,
        },
    ],
    "services": [
        "notify.mobile_app_ipad",
        "notify.mobile_app_iphone",
        "notify.mobile_app_pixel_8",
        "notify.sms_gateway",
    ],
    "options": {
        "quiet_enabled": True,
        "quiet_start": "22:00",
        "quiet_end": "07:00",
        "dedup_minutes": 10,
        "digest_times": ["08:00", "19:00"],
        "escalation_minutes": [5, 10],
        "sms_service": "notify.sms_gateway",
        "away_mode": False,
        "retention_days": 7,
        "capture_persistent": True,
        "capture_repairs": False,
        "excluded_people": ["person.wall_tablet"],
        "presence": {"person.alex": "binary_sensor.alex_bluetooth_presence"},
        "sources": {s["key"]: s["rule"] for s in SOURCES if s["rule"]},
    },
    "sources": SOURCES,
    "integrations": [
        {"domain": "zha", "name": "Zigbee Home Automation"},
        {"domain": "mobile_app", "name": "Mobile App"},
    ],
}

# "My notifications" of the user linked to Sam: infos and one source turned off.
MINE_STATE = {
    "person": {"entity_id": "person.sam", "name": "Sam", "picture": None, "excluded": False},
    "sources": [
        {
            "key": s["key"],
            "name": s["name"],
            "domain": s.get("domain"),
            **{k: s["rule"].get(k) for k in ("icon", "color")},
        }
        for s in SOURCES
    ],
    "priorities": ["alert", "info", "digest"],
    "subscription": {"sources": [SOURCES[-1]["key"]], "priorities": ["info"]},
}

# Card shots: (file stem, journal) — the calm card and the one waiting for an acknowledgement.
CARD_SHOTS = [("card", RECENT), ("card-alert", ALARM + RECENT[:3])]
PANEL_SHOTS = ["journal", "routing", "rules", "sources", "mine", "settings"]

HA_CARD = """
// Every animation, the ones inside shadow roots too (document.getAnimations() leaves those out).
window.nhAnimations = (root = document) => [...root.getAnimations(),
  ...[...root.querySelectorAll("*")].filter((e) => e.shadowRoot).flatMap((e) => nhAnimations(e.shadowRoot))];
customElements.define("ha-card", class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML =
    "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
    "box-shadow:0 1px 3px rgba(0,0,0,.12);overflow:hidden}</style><slot></slot>"; }
});
"""


def page_html(theme, width):
    css = ";".join(f"{k}:{v}" for k, v in {**THEMES[theme], **COMMON}.items())
    return (
        f"<!doctype html><html><head><style>html,body{{margin:0;background:var(--primary-background-color);"
        f"font-family:Roboto,sans-serif;{css}}}#root{{width:{width}px;padding:16px;box-sizing:content-box}}</style>"
        f"</head><body><div id='root'></div><script>{HA_CARD}</script></body></html>"
    )


def hass(theme, state=None):
    states = {
        "binary_sensor.alex_bluetooth_presence": {
            "state": "on",
            "attributes": {"friendly_name": "Alex Bluetooth presence", "device_class": "presence"},
            "last_updated": NOW,
        }
    }
    if state is not None:
        states["sensor.notify_hub_pending"] = {
            "state": str(state["counts"]["pending"]),
            "attributes": {"notify_hub": True, **state},
            "last_updated": NOW,
        }
    return {"states": states, "themes": {"darkMode": theme == "dark"}, "locale": {"language": "en"}, "language": "en"}


def save(src: Path, dest: Path):
    """Keep the old file when its pixels are the same."""
    if dest.exists() and dest.suffix == ".png":
        with Image.open(src) as a, Image.open(dest) as b:
            if a.size == b.size and not ImageChops.difference(a.convert("RGBA"), b.convert("RGBA")).getbbox(
                alpha_only=False
            ):
                return
    shutil.copyfile(src, dest)
    print("wrote", dest.relative_to(ROOT))


def shoot_card(page, tmp, stem, recent, theme):
    page.set_content(page_html(theme, 460))
    page.add_script_tag(content=(FRONTEND / "notify-hub-card.js").read_text())
    page.evaluate(
        """([h]) => { const c = document.createElement('notify-hub-card'); c.setConfig({}); c.hass = h;
             document.getElementById('root').append(c); nhAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }); }""",
        [hass(theme, summary(recent))],
    )
    name = f"{stem}{'-dark' if theme == 'dark' else ''}.png"
    page.locator("#root").screenshot(path=tmp / name, animations="disabled")
    save(tmp / name, OUT / name)


def shoot_panel(page, tmp, tab, theme):
    page.set_content(page_html(theme, 1100))
    page.add_script_tag(content=(FRONTEND / "notify-hub-panel.js").read_text())
    page.evaluate(
        """async ([h, data, mine, tab]) => { h.callWS = async (m) => (m.type === 'notify_hub/mine' ? mine : data); const p = document.createElement('notify-hub-panel'); p._tab = tab;
             document.getElementById('root').style.padding = '0'; document.getElementById('root').append(p);
             p.hass = h; await new Promise((r) => setTimeout(r, 50)); nhAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }); }""",
        [hass(theme), PANEL_STATE, MINE_STATE, tab],
    )
    page.add_style_tag(content="notify-hub-panel{display:block} #root{min-height:0}")
    page.evaluate("document.querySelector('notify-hub-panel').shadowRoot.querySelector('.page').style.minHeight = '0'")
    name = f"panel-{tab}{'-dark' if theme == 'dark' else ''}.png"
    page.locator("#root").screenshot(path=tmp / name, animations="disabled")
    save(tmp / name, OUT / name)


def gif_ringing(page, tmp):
    """The bell ringing over a notification waiting for its acknowledgement."""
    if not shutil.which(FFMPEG):
        print("ffmpeg missing: GIF skipped")
        return
    page.set_content(page_html("light", 460))
    page.add_script_tag(content=(FRONTEND / "notify-hub-card.js").read_text())
    page.evaluate(
        """([h]) => { const c = document.createElement('notify-hub-card'); c.setConfig({}); c.hass = h;
             document.getElementById('root').append(c); }""",
        [hass("light", summary(ALARM))],
    )
    frames = tmp / "frames"
    frames.mkdir()
    for i in range(18):
        page.evaluate(
            """async (t) => { nhAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
                 await new Promise((r) => setTimeout(r, 30)); }""",
            i * 100,
        )
        page.locator("#root").screenshot(path=frames / f"{i:03d}.png")
    gif = tmp / "card-ringing.gif"
    subprocess.run(
        [FFMPEG, "-loglevel", "error", "-y", "-framerate", "10", "-i", str(frames / "%03d.png"),
         "-vf", "split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse=dither=none", "-loop", "0", str(gif)],
        check=True,
    )  # fmt: skip
    dest = OUT / gif.name
    if not dest.exists() or _gif_frames(gif) != _gif_frames(dest):
        shutil.copyfile(gif, dest)
        print("wrote", dest.relative_to(ROOT))


def _gif_frames(path):
    with Image.open(path) as im:
        out = []
        for i in range(getattr(im, "n_frames", 1)):
            im.seek(i)
            out.append(im.convert("RGBA").tobytes())
        return out


def main():
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir, sync_playwright() as pw:
        tmp = Path(tmpdir)
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=2)
        page.clock.set_fixed_time(NOW)
        page.goto("about:blank")
        for theme in THEMES:
            for stem, recent in CARD_SHOTS:
                shoot_card(page, tmp, stem, recent, theme)
            for tab in PANEL_SHOTS:
                shoot_panel(page, tmp, tab, theme)
        gif_ringing(page, tmp)
        browser.close()
    print(json.dumps(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
