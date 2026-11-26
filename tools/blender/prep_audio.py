"""Turn the quarantined Freesound recordings (thirdparty/_incoming/freesound/) into the game's sounds,
in Blender's Python (its `aud` module decodes and encodes Ogg):
- one-shots: the first event in the file (silence trimmed), or the whole recording trimmed, cut to at
  most `max` seconds with a short fade so rapid fire doesn't pile up
- loops: the steadiest stretch of the requested length, crossfaded end-into-start (the siren)
All mono 48 kHz, levelled to the same loudness (RMS -20 dB, peaks under -1 dB); the game sets each
voice's gain. Writes src/client/sfx/<key>.ogg, which Vite bundles.
Run: "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P tools/blender/prep_audio.py -- [keys]
(From the GREYLINE method: T:/Dev/greyline/docs/handoff-sound-effects.md.)"""
import json
import os
import sys

import aud
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "thirdparty", "_incoming", "freesound")
OUT = os.path.join(ROOT, "src", "client", "sfx")
RATE = 48000
TARGET_DB = -20.0
# key: source file key, mode (first | whole | loop), max seconds (loop: its length), optional span (s)
JOBS = {
    "pistol": {"src": "pistol", "mode": "first", "max": 0.6},
    "revolver": {"src": "revolver", "mode": "first", "max": 0.9},
    "smg": {"src": "mg_burst", "mode": "whole", "max": 0.14},
    "minigun": {"src": "mg_burst", "mode": "whole", "max": 0.09},
    "shotgun": {"src": "shotgun", "mode": "first", "max": 1.0},
    "rifle": {"src": "rifle", "mode": "first", "max": 0.7},
    "sniper": {"src": "sniper", "mode": "first", "max": 1.6},
    "flame": {"src": "flame", "mode": "whole", "max": 0.45},
    "launcher": {"src": "launcher", "mode": "whole", "max": 0.6},
    "rocket": {"src": "rocket", "mode": "whole", "max": 1.4},
    "cannon": {"src": "cannon", "mode": "first", "max": 2.5},
    "punch": {"src": "punch", "mode": "first", "max": 0.35},
    "swing": {"src": "swing", "mode": "first", "max": 0.4},
    "slash": {"src": "slash", "mode": "first", "max": 0.5},
    "boom": {"src": "boom", "mode": "whole", "max": 3.5},
    "crash": {"src": "crash", "mode": "first", "max": 0.5},
    "splash": {"src": "splash", "mode": "first", "max": 1.5},
    "horn": {"src": "horn", "mode": "first", "max": 0.8},
    "siren": {"src": "siren", "mode": "loop", "max": 3.5},
    "cash": {"src": "cash", "mode": "first", "max": 1.2},
    "horn_small": {"src": "horn_small", "mode": "first", "max": 0.5},
    "horn_deep": {"src": "horn_deep", "mode": "first", "max": 0.7, "span": (0, 3.2)},
    "horn_air": {"src": "horn_air", "mode": "whole", "max": 1.2},
    "horn_bus": {"src": "horn_bus", "mode": "whole", "max": 1.1, "span": (0, 1.15)},
    "horn_icecream": {"src": "horn_icecream", "mode": "whole", "max": 4.5, "span": (0, 5)},
    # engine_car's first source (Freesound 522225, a Peugeot 308 idle) sounded like a diesel truck
    # once pitched up; ordinary cars now use a petrol Mini Cooper.
    "engine_car": {"src": "engine_mini", "mode": "loop", "max": 1.8},
    "engine_suv": {"src": "engine_crv", "mode": "loop", "max": 3.0},
    "engine_sport": {"src": "engine_maserati", "mode": "loop", "max": 2.5, "span": (0, 4.6)},  # the idle, before the launch
    "engine_muscle": {"src": "engine_firebird", "mode": "loop", "max": 2.6},
    "phone_ring": {"src": "phone_ring", "mode": "first", "max": 2.7},  # one ring of the 2 s on / 4 s off cadence
    "engine_diesel": {"src": "engine_diesel", "mode": "loop", "max": 3.0},
    "engine_bike": {"src": "engine_bike", "mode": "loop", "max": 3.0},
    "skid": {"src": "skid", "mode": "loop", "max": 1.4, "span": (5.3, 7.0)},  # the loudest, steadiest squeal
}


def load(key):
    name = next(f for f in os.listdir(SRC) if f.startswith(key + "_") and f.endswith(".ogg"))
    s = aud.Sound(os.path.join(SRC, name)).resample(RATE, True)
    d = s.data().astype(np.float64)
    return d.mean(axis=1, keepdims=True)


def envelope(d, win):
    mono = np.abs(d).mean(axis=1)
    n = len(mono) // win
    return np.sqrt((mono[: n * win].reshape(n, win) ** 2).mean(axis=1))


def steadiest(d, seconds):
    win = RATE // 10
    env = envelope(d, win)
    k = int(seconds * 10)
    if len(env) <= k:
        return d
    best, best_cv = 0, 1e9
    for i in range(0, len(env) - k):
        seg = env[i:i + k]
        cv = seg.std() / (seg.mean() + 1e-9)
        if seg.mean() > env.mean() * 0.4 and cv < best_cv:
            best, best_cv = i, cv
    return d[best * win:(best + k) * win]


def make_loop(d, seconds, fade_s=0.03):
    """A loop about `seconds` long whose length is a whole number of the sound's own cycles (a siren's
    wail): the end is cut where the waveform best matches the start, then a short crossfade."""
    win, f = RATE // 20, int(fade_s * RATE)
    lo, hi = int((seconds - 0.4) * RATE), int((seconds + 0.4) * RATE)
    ref = d[:win, 0]
    seg = d[lo:hi + win, 0]
    corr = np.correlate(seg, ref, "valid")
    energy = np.sqrt(np.convolve(seg ** 2, np.ones(win), "valid")) * np.sqrt((ref ** 2).sum()) + 1e-9
    n = lo + int(np.argmax(corr / energy))
    d = d[:n + f]
    head, body, tail = d[:f], d[f:n], d[n:n + f]
    w = np.linspace(0.0, 1.0, f)[:, None]
    return np.concatenate([tail * (1 - w) + head * w, body])  # end flows into start


def first_event(d):
    """The first event, silence trimmed."""
    env = envelope(d, RATE // 100)
    thr = env.max() * 0.08
    on = int(np.argmax(env > thr))
    after = env[on:]
    quiet = np.where(after < thr * 0.5)[0]
    gaps = [q for q in quiet if q > 15 and np.all(after[q:q + 12] < thr * 0.5)]
    end = on + (gaps[0] + 10 if gaps else len(after))
    a, b = max(on - 1, 0) * (RATE // 100), min(end, len(env)) * (RATE // 100)
    return d[a:b].copy()


def whole(d):
    """The whole recording with the silence before and after trimmed."""
    env = envelope(d, RATE // 100)
    loud = np.where(env > env.max() * 0.05)[0]
    a, b = max(loud[0] - 1, 0) * (RATE // 100), min(loud[-1] + 10, len(env)) * (RATE // 100)
    return d[a:b].copy()


def cut(d, seconds):
    """At most `seconds`, ending in a fade (a quarter of the length, 5 to 300 ms)."""
    d = d[:int(seconds * RATE)].copy()
    fade = int(min(0.3, max(0.005, len(d) / RATE * 0.25)) * RATE)
    fade = min(fade, len(d))
    d[-fade:] *= np.linspace(1.0, 0.0, fade)[:, None] ** 2
    return d


def level(d):
    rms = np.sqrt((d ** 2).mean())
    d = d * (10 ** (TARGET_DB / 20.0) / max(rms, 1e-9))
    peak = np.abs(d).max()
    return d * (0.89 / peak) if peak > 0.89 else d


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    rpath = os.path.join(OUT, "prep.json")
    report = json.load(open(rpath)) if os.path.exists(rpath) else {}
    for key, job in JOBS.items():
        if only and key not in only:
            continue
        d = load(job["src"])
        if "span" in job:
            a, b = job["span"]
            d = d[int(a * RATE):int(b * RATE)]
        if job["mode"] == "loop":
            d = make_loop(steadiest(d, job["max"] + 0.5), job["max"])
        else:
            d = cut(whole(d) if job["mode"] == "whole" else first_event(d), job["max"])
            fin = min(len(d), RATE * 3 // 1000)  # 3 ms fade-in: no click when a file starts mid-wave
            d[:fin] *= np.linspace(0.0, 1.0, fin)[:, None]
        d = level(d).astype(np.float32)
        snd = aud.Sound.buffer(np.ascontiguousarray(d), RATE)
        snd.write(os.path.join(OUT, key + ".ogg"), RATE, aud.CHANNELS_MONO, aud.FORMAT_S16,
                  aud.CONTAINER_OGG, aud.CODEC_VORBIS, 128000)
        report[key] = {"seconds": round(len(d) / RATE, 3), "loop": job["mode"] == "loop", "src": job["src"]}
        print("wrote %-9s %5.2f s %s" % (key, len(d) / RATE, job["mode"]))
    with open(rpath, "w") as f:
        json.dump(report, f, indent=1)


main()
