"""Fetch the chosen CC0 sounds from Freesound (no account): for each, read the sound's own page,
confirm its licence is CC0, then download the 128 kbps Ogg preview from cdn.freesound.org into
thirdparty/_incoming/freesound/ (quarantine) and check it really is an Ogg file.
Writes manifest.json (title, author, page, licence) for the ASSETS.md ledger.
Run: python -I -X utf8 tools/audio/fs_fetch.py [key ...]  (keys: fetch only those; the manifest keeps the rest)
(From the GREYLINE method: T:/Dev/greyline/docs/handoff-sound-effects.md.)"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "thirdparty", "_incoming", "freesound")
UA = "Mozilla/5.0 (game-dev asset fetch)"
CHOSEN = [  # key, sound id (the page's address names the author: freesound.org/s/<id>/ redirects there)
    ("pistol", 427592),
    ("revolver", 683186),
    ("mg_burst", 482122),  # smg and minigun: single shots cut from the burst
    ("shotgun", 427595),
    ("rifle", 427596),
    ("sniper", 514228),
    ("flame", 260554),
    ("launcher", 163458),
    ("rocket", 521377),
    ("cannon", 448002),
    ("punch", 94778),
    ("swing", 60013),
    ("slash", 35213),
    ("boom", 235968),
    ("crash", 151624),
    ("splash", 442773),
    ("horn", 434878),
    ("siren", 52906),
    ("cash", 209578),
    ("horn_small", 94868),
    ("horn_deep", 450821),
    ("horn_air", 131930),
    ("horn_bus", 451697),
    ("horn_icecream", 128573),
    ("engine_car", 522225),
    ("engine_diesel", 128160),
    ("engine_bike", 119455),
    ("engine_mini", 269771),     # 2002 Mini Cooper 1.6 petrol idle: ordinary cars (engine_car)
    ("engine_crv", 369054),      # Honda CR-V idle, exterior: SUVs, pickups, vans (engine_suv)
    ("engine_maserati", 585215), # Maserati GranTurismo V8 idle: sports cars (engine_sport)
    ("engine_firebird", 157142), # 1975 Pontiac Firebird, free exhaust: muscle cars (engine_muscle)
    ("phone_ring", 456433),      # Western Electric 500 bell: ringing payphones
]
CC0 = "creativecommons.org/publicdomain/zero"


def get(url, final=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = urllib.request.urlopen(req, timeout=60)
    return (r.read(), r.geturl()) if final else r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]  # keys to fetch (none: all of them)
    mpath = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for key, sid in CHOSEN:
        if only and key not in only:
            continue
        raw, page_url = get("https://freesound.org/s/%d/" % sid, final=True)
        page = raw.decode("utf-8", "replace")
        who = re.search(r"freesound\.org/people/([^/]+)/sounds/%d/" % sid, page_url)
        if not who:
            print("SKIP %s: the page address names no author (%s)" % (key, page_url))
            continue
        user = urllib.parse.unquote(who.group(1))
        if CC0 not in page:
            print("SKIP %s: licence on the page is not CC0" % key)
            continue
        m = re.search(r'data-ogg="(https://cdn\.freesound\.org/previews/[^"]+)"', page)
        if not m:
            print("SKIP %s: no preview found" % key)
            continue
        url = m.group(1).replace("-lq.ogg", "-hq.ogg")
        title = re.search(r'data-title="([^"]*)"', page)
        data = get(url)
        if not data.startswith(b"OggS"):
            print("REJECT %s: not an Ogg file" % key)
            continue
        path = os.path.join(OUT, "%s_%d.ogg" % (key, sid))
        with open(path, "wb") as f:
            f.write(data)
        manifest[key] = {"id": sid, "author": user, "title": html.unescape(title.group(1)) if title else "",
                         "page": page_url, "file": url, "licence": "CC0", "bytes": len(data)}
        print("ok %-13s %7.1f KB  %s" % (key, len(data) / 1024, manifest[key]["title"]))
        time.sleep(1.0)
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)


if __name__ == "__main__":
    main()
