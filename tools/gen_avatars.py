# -*- coding: utf-8 -*-
"""恋ログ用のアバターイラスト16種+アプリアイコンを Gemini (Nano Banana) で生成。"""
import sys, pathlib, io
from google import genai
from google.genai import types
from PIL import Image

KEY = pathlib.Path(r"C:\Users\matsumotoyoshiki\Desktop\実験\API\gemini_API.txt").read_text(encoding="utf-8").strip()
ROOT = pathlib.Path(__file__).resolve().parent.parent
AV_OUT = ROOT / "assets" / "avatars"
IC_OUT = ROOT / "assets" / "icons"
AV_OUT.mkdir(parents=True, exist_ok=True)
IC_OUT.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=KEY)
MODEL = "gemini-3-pro-image"

STYLE = ("cute flat vector portrait illustration, bust-up avatar, kawaii Japanese anime-lite style, "
         "soft warm pastel colors, clean thin outlines, gentle smile, friendly, "
         "centered face, square 1:1 composition, plain solid pastel background filling the whole square, "
         "no text, no letters, no watermark, high quality, consistent illustration style")

FEMALES = [
    "a young Japanese woman in her 20s with long straight dark brown hair, soft pink blouse",
    "a young Japanese woman with a shoulder-length wavy bob, beige cardigan, warm smile",
    "a young Japanese woman with a high ponytail, sporty white shirt, cheerful",
    "a young Japanese woman with short black hair and bangs, mint green top, calm",
    "a Japanese woman in her late 20s with long wavy chestnut hair, elegant white dress",
    "a young Japanese woman with twin side buns, playful expression, lavender hoodie",
    "a Japanese woman with a low bun and round glasses, smart navy jacket, intellectual",
    "a young Japanese woman with medium ash-brown hair and inner color, trendy, yellow top",
]

MALES = [
    "a young Japanese man in his 20s with short black hair, white shirt, gentle smile",
    "a young Japanese man with medium wavy dark hair, casual gray hoodie, relaxed",
    "a Japanese man in his late 20s with a neat undercut hairstyle, navy suit jacket, confident",
    "a young Japanese man with slightly long center-parted hair, olive green shirt, calm",
    "a Japanese man with short brown hair and glasses, light blue shirt, friendly and smart",
    "a young Japanese man with a sporty short haircut, red training jacket, energetic",
    "a Japanese man in his 30s with a light stubble beard and short hair, denim shirt, mature",
    "a young Japanese man with soft permed hair, beige sweater, kind and warm",
]

ICON_PROMPT = (
    "A modern smartphone app icon: a cute glossy coral-pink heart combined with a small open notebook "
    "or diary page tucked behind it, flat vector style with soft gradients (#ff8e9d to #f2536a), "
    "on a soft cream white (#fff7f4) rounded background filling the whole square edge-to-edge, "
    "kawaii, clean, minimal, no text, no letters, square 1:1, high quality app icon design"
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
    jobs = []
    for i, desc in enumerate(FEMALES, 1):
        jobs.append((f"f{i:02d}", desc + ", " + STYLE, AV_OUT, 256))
    for i, desc in enumerate(MALES, 1):
        jobs.append((f"m{i:02d}", desc + ", " + STYLE, AV_OUT, 256))

    ok = 0
    for name, prompt, outdir, size in jobs:
        if only and name not in only:
            continue
        target = outdir / f"{name}.png"
        if target.exists() and not only:
            print(f"skip(既存): {name}")
            ok += 1
            continue
        print(f"生成中: {name} ...", flush=True)
        try:
            data = gen_image(prompt)
            if data:
                save_resized(data, target, size)
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

    print(f"\n完了: {ok} 件")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
