from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1000, 1400
OUTPUT = Path(__file__).with_name("test_receipt.jpg")


def load_font(size: int):
    candidates = [
        Path(r"C:\Windows\Fonts\consola.ttf"),
        Path(r"C:\Windows\Fonts\cour.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main():
    image = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(image)
    font = load_font(42)
    small_font = load_font(34)
    lines = [
        "DMART SUPERMARKET",
        "Date: 01/10/2026",
        "",
        "Amul Taaza Milk       64.00",
        "Harvest Gold Bread    45.00",
        "Lays Classic           20.00",
        "",
        "------------------------------",
        "TOTAL                129.00",
        "",
        "Thank You!",
    ]

    y = 100
    for index, line in enumerate(lines):
        active_font = font if index == 0 or line.startswith("TOTAL") else small_font
        draw.text((90, y), line, fill="black", font=active_font)
        y += 90

    image.save(OUTPUT, format="JPEG", quality=95, optimize=True)
    print(f"Generated {OUTPUT} ({WIDTH}x{HEIGHT}, JPEG quality 95)")


if __name__ == "__main__":
    main()
