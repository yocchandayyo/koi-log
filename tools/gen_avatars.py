# -*- coding: utf-8 -*-
"""恋ログ「夜の手帳」デザイン用の画像素材を Gemini (Nano Banana Pro) で生成。
アバター16種 / アプリアイコン(maskableセーフゾーン対応) / 空画面イラスト"""
import sys, pathlib, io
from google import genai
from google.genai import types
from PIL import Image

KEY = pathlib.Path(r"C:\Users\matsumotoyoshiki\Desktop\実験\API\gemini_API.txt").read_text(encoding="utf-8").strip()
ROOT = pathlib.Path(__file__).resolve().parent.parent
AV_OUT = ROOT / "assets" / "avatars"
IC_OUT = ROOT / "assets" / "icons"
IL_OUT = ROOT / "assets" / "illust"
for d in (AV_OUT, IC_OUT, IL_OUT):
    d.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=KEY)
MODEL = "gemini-3-pro-image"

# 陽だまりの手帳トーン: 生成りの紙、昼下がりのやわらかい光、紅と琥珀のアクセント
STYLE = ("elegant flat vector portrait illustration, bust-up avatar, Japanese anime-lite style, "
         "bathed in soft warm afternoon sunlight, bright and cheerful, gentle warm expression, "
         "fresh warm color grading, cozy daytime cafe mood, "
         "clean thin outlines, centered face, square 1:1 composition, "
         "plain solid warm cream background (#f6efe6) filling the whole square, "
         "no text, no letters, no watermark, high quality, consistent illustration style")

FEMALES = [
    "a young Japanese woman in her 20s with long straight dark brown hair, soft rose blouse",
    "a young Japanese woman with a shoulder-length wavy bob, beige cardigan, warm smile",
    "a young Japanese woman with a high ponytail, casual white shirt, cheerful",
    "a young Japanese woman with short black hair and bangs, sage green top, calm",
    "a Japanese woman in her late 20s with long wavy chestnut hair, elegant ivory dress",
    "a young Japanese woman with twin side buns, playful expression, lavender knit",
    "a Japanese woman with a low bun and round glasses, smart navy jacket, intellectual",
    "a young Japanese woman with medium ash-brown hair, trendy mustard top",
]

MALES = [
    "a young Japanese man in his 20s with short black hair, white shirt, gentle smile",
    "a young Japanese man with medium wavy dark hair, casual charcoal hoodie, relaxed",
    "a Japanese man in his late 20s with a neat undercut hairstyle, navy suit jacket, confident",
    "a young Japanese man with slightly long center-parted hair, olive shirt, calm",
    "a Japanese man with short brown hair and glasses, dusty blue shirt, friendly and smart",
    "a young Japanese man with a sporty short haircut, burgundy jacket, energetic",
    "a Japanese man in his 30s with a light stubble beard and short hair, denim shirt, mature",
    "a young Japanese man with soft permed hair, camel sweater, kind and warm",
]

# maskable対応: 主役は中央60%に収め、四辺まで背景を敷く
ICON_PROMPT = (
    "A premium smartphone app icon: a small elegant closed diary notebook with a rose-pink "
    "heart emblem and a thin gold ribbon bookmark on its cream cover, flat vector style with "
    "subtle gradients, rose pink (#e0607e) and amber gold (#d9a441) accents on a warm cream "
    "background (#fbf6ef) that fills the ENTIRE square edge-to-edge, the notebook motif "
    "centered and occupying only the central 60% of the square with generous even margins "
    "on all sides, bright cheerful warm mood, minimal, refined, "
    "no text, no letters, square 1:1, high quality"
)

EMPTY_PROMPT = (
    "A cozy minimal spot illustration: an open blank diary notebook on a bright wooden cafe "
    "table by a sunny window, soft warm afternoon sunlight streaming in, a tiny rose-pink "
    "heart-shaped bookmark resting on the page, a cup of milk tea beside it, a small potted "
    "flower, elegant flat vector style, warm cream, rose and gold accents, bright cheerful "
    "daytime mood, plain solid warm cream background (#fbf6ef) filling the whole square "
    "edge-to-edge, generous margins around the subject, no text, no letters, square 1:1, high quality"
)


def gen_image(prompt):
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["Image"]),
    )
    for part in resp.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    return None


def save_resized(data, path, size):
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG", optimize=True)
    print(f"  -> {path.name} ({path.stat().st_size // 1024} KB)", flush=True)


def main(only=None):
    jobs = [(f"f{i:02d}", d) for i, d in enumerate(FEMALES, 1)] + \
           [(f"m{i:02d}", d) for i, d in enumerate(MALES, 1)]

    ok = 0
    for name, desc in jobs:
        if only and name not in only:
            continue
        print(f"生成中: {name} ...", flush=True)
        try:
            data = gen_image(desc + ", " + STYLE)
            if data:
                save_resized(data, AV_OUT / f"{name}.png", 256)
                ok += 1
            else:
                print(f"  !! 画像なし: {name}")
        except Exception as e:
            print(f"  ERROR {name}: {e}")

    if not only or "icon" in only:
        print("生成中: アプリアイコン ...", flush=True)
        try:
            data = gen_image(ICON_PROMPT)
            if data:
                save_resized(data, IC_OUT / "icon-512.png", 512)
                save_resized(data, IC_OUT / "icon-192.png", 192)
                ok += 1
        except Exception as e:
            print(f"  ERROR icon: {e}")

    if not only or "empty" in only:
        print("生成中: 空画面イラスト ...", flush=True)
        try:
            data = gen_image(EMPTY_PROMPT)
            if data:
                save_resized(data, IL_OUT / "empty.png", 512)
                ok += 1
        except Exception as e:
            print(f"  ERROR empty: {e}")

    print(f"\n完了: {ok} 件")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
