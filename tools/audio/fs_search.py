"""List CC0 candidates on Freesound for each sound the game needs (public search pages, no account).
Run: python -I tools/audio/fs_search.py [key or query ...]
Prints id, user, title, seconds, downloads, rating. Nothing is downloaded.
(From the GREYLINE method: T:/Dev/greyline/docs/handoff-sound-effects.md.)"""
import html
import re
import sys
import time
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (game-dev asset search)"
QUERIES = {  # the game's voices (src/client/audio/sound.ts)
    "pistol": "pistol gunshot",
    "revolver": "revolver gunshot",
    "smg": "submachine gun single shot",
    "shotgun": "shotgun shot",
    "rifle": "rifle gunshot",
    "sniper": "sniper rifle shot",
    "minigun": "minigun",
    "flame": "flamethrower",
    "launcher": "grenade launcher",
    "rocket": "rocket launch",
    "cannon": "tank cannon",
    "punch": "punch impact",
    "swing": "whoosh swing",
    "slash": "knife slash",
    "boom": "explosion",
    "crash": "car crash metal",
    "splash": "water splash",
    "horn": "car horn",
    "siren": "police siren",
    "cash": "cash register",
}
FIELDS = ("sound-id", "username", "title", "duration", "num-downloads")


def search(q, page=1):
    url = "https://freesound.org/search/?" + urllib.parse.urlencode(
        {"q": q, "f": 'license:"Creative Commons 0"', "s": "Downloads (most first)", "page": page})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    text = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    out = []
    for block in text.split('class="bw-search__result"')[1:]:
        row = {}
        for f in FIELDS:
            m = re.search(r'data-%s="([^"]*)"' % f, block)
            row[f] = html.unescape(m.group(1)) if m else ""
        m = re.search(r'aria-label="Average rating of ([0-9.]+)"', block)
        row["rating"] = m.group(1) if m else "-"
        out.append(row)
    return out


def main():
    wanted = sys.argv[1:] or list(QUERIES)
    for key in wanted:
        q = QUERIES.get(key, key)
        print("== %s  (%s)" % (key, q))
        for r in search(q)[:8]:
            print("  %-7s %-18s %6.1fs  dl %-6s r %-4s %s" % (r["sound-id"], r["username"][:18],
                  float(r["duration"] or 0), r["num-downloads"], r["rating"], r["title"][:60]))
        time.sleep(1.0)


if __name__ == "__main__":
    main()
