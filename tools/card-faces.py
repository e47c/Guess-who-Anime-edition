"""Offline, run ONCE when the card list changes: find the face centre of every card picture and store it.

    py -3.12 tools/card-faces.py <folder with the card pictures, named <AniList id>.<ext>>

Needs opencv-python-headless and the MIT-licensed anime face detector by nagadomi
(https://github.com/nagadomi/lbpcascade_animeface): lbpcascade_animeface.xml next to the pictures.
Writes data/card-focus.json: { "<id>": { "w", "h", "fx", "fy", "fh", "src" } }
  fx, fy = the face centre as a share of the picture's width / height; fh = the face height as a share of the
  picture's height; src = "det" (detected), "det2" (detected with looser settings) or "default" (upper third, centred).
Hand corrections go in data/card-focus-fix.json (same fields, they win). tools/cards-build.mjs turns both into the
focusX / focusY / zoom / fit columns of js/vault/cards.js. Nothing runs at runtime: the browser only reads numbers.
"""
import cv2, json, os, sys

src_dir = sys.argv[1]
casc = cv2.CascadeClassifier(os.path.join(src_dir, "..", "lbpcascade_animeface.xml"))
out, stats = {}, {"det": 0, "det2": 0, "default": 0}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for f in sorted(os.listdir(src_dir)):
    cid = f.split(".")[0]
    img = cv2.imread(os.path.join(src_dir, f))
    if img is None:
        continue
    h, w = img.shape[:2]
    g = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    best, src = None, "default"
    for tag, sf, nb, ms in (("det", 1.05, 4, 0.12), ("det2", 1.03, 2, 0.08)):
        faces = casc.detectMultiScale(g, scaleFactor=sf, minNeighbors=nb, minSize=(int(w * ms), int(w * ms)))
        # drop what is almost never the face in these portraits: boxes low in the picture, tiny ones, and small low ones
        faces = [r for r in faces if not ((r[1] + r[3] / 2) > 0.7 * h or r[3] < 0.1 * h or ((r[1] + r[3] / 2) > 0.6 * h and r[3] < 0.2 * h))]
        if len(faces):
            # the biggest face, nudged toward the top of the picture (portraits put the main face high)
            best = max(faces, key=lambda r: r[2] * r[3] * (1.25 - (r[1] + r[3] / 2) / h * 0.5))
            src = tag
            break
    if best is not None:
        x, y, fw, fh = [int(v) for v in best]
        out[cid] = {"w": w, "h": h, "fx": round((x + fw / 2) / w, 3), "fy": round((y + fh / 2) / h, 3), "fh": round(fh / h, 3), "src": src}
    else:
        out[cid] = {"w": w, "h": h, "fx": 0.5, "fy": 0.3, "fh": 0.3, "src": "default"}
    stats[src] += 1
with open(os.path.join(root, "data", "card-focus.json"), "w", encoding="utf-8") as fp:
    json.dump(dict(sorted(out.items(), key=lambda kv: int(kv[0]))), fp, separators=(",", ":"))
print(len(out), "pictures", stats)
