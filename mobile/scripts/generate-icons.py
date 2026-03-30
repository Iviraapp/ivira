#!/usr/bin/env python3
"""
Generate IVIRA branded app icons and splash screen using Pillow.

Icons generated:
  - icon.png (1024x1024) - Main app icon
  - adaptive-icon.png (1024x1024) - Android adaptive icon foreground
  - notification-icon.png (96x96) - Android notification icon (white on transparent)
  - splash.png (1080x1920) - Splash/launch screen

Brand:
  - Background: IVIRA Blue #3B82F6
  - Dark BG: #0A0E1A (splash screen)
  - Lettermark: White "V" (for IVIRA/Vira)
"""

import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# Brand colors
IVIRA_BLUE = (59, 130, 246)    # #3B82F6
DARK_BG = (10, 14, 26)         # #0A0E1A
WHITE = (255, 255, 255)


def draw_rounded_rect(img, xy, radius, fill):
    """Draw a proper anti-aliased rounded rectangle using supersampling."""
    x0, y0, x1, y1 = xy
    w = x1 - x0
    h = y1 - y0

    # Create at 4x resolution for anti-aliasing
    scale = 4
    big = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    r = radius * scale
    draw.rounded_rectangle([0, 0, w * scale - 1, h * scale - 1], radius=r, fill=fill)

    # Downscale with anti-aliasing
    small = big.resize((w, h), Image.LANCZOS)
    img.paste(small, (x0, y0), small)


def draw_v_lettermark(draw, size, color, y_offset=0, thickness=1.0):
    """
    Draw a clean geometric V lettermark centered in the canvas.
    """
    cx = size // 2
    cy = size // 2 + y_offset

    # V dimensions - slightly raised for optical centering
    v_half_width = int(size * 0.30)
    v_half_height = int(size * 0.22)
    stroke = int(size * 0.058 * thickness)

    # Key points
    top_y = cy - v_half_height
    bot_y = cy + v_half_height

    left_x = cx - v_half_width
    right_x = cx + v_half_width

    # V as a single polygon: outer left -> bottom -> outer right -> inner right -> inner bottom -> inner left
    v_polygon = [
        (left_x, top_y),                                    # outer top-left
        (left_x + int(stroke * 1.8), top_y),                # inner top-left
        (cx, bot_y - int(stroke * 1.4)),                     # inner bottom
        (right_x - int(stroke * 1.8), top_y),                # inner top-right
        (right_x, top_y),                                    # outer top-right
        (cx, bot_y),                                         # outer bottom point
    ]
    draw.polygon(v_polygon, fill=color)


def generate_app_icon(size=1024):
    """Generate the main app icon: IVIRA Blue rounded square with white V."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Rounded rectangle background (iOS-style corner radius ~22%)
    corner_radius = int(size * 0.22)
    draw_rounded_rect(img, (0, 0, size, size), corner_radius, IVIRA_BLUE)

    draw = ImageDraw.Draw(img)

    # Draw V lettermark, shifted up slightly for optical center
    draw_v_lettermark(draw, size, WHITE, y_offset=int(-size * 0.02))

    # Small white accent dot below the V tip
    cx = size // 2
    dot_y = int(size * 0.73)
    dot_r = int(size * 0.016)
    draw.ellipse(
        [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
        fill=WHITE
    )

    return img


def generate_adaptive_icon(size=1024):
    """
    Generate Android adaptive icon foreground.
    Full-bleed IVIRA Blue background; the OS handles shape masking.
    Safe zone is inner 66%, so the V is sized accordingly.
    """
    img = Image.new("RGBA", (size, size), IVIRA_BLUE + (255,))
    draw = ImageDraw.Draw(img)

    # V lettermark centered
    draw_v_lettermark(draw, size, WHITE, y_offset=int(-size * 0.02), thickness=0.9)

    # White accent dot
    cx = size // 2
    dot_y = int(size * 0.73)
    dot_r = int(size * 0.016)
    draw.ellipse(
        [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
        fill=WHITE
    )

    return img


def generate_notification_icon(size=96):
    """
    Generate Android notification icon.
    White silhouette on transparent background.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # White V, thicker strokes for legibility at small size
    draw_v_lettermark(draw, size, WHITE, y_offset=0, thickness=1.4)

    return img


def draw_text_centered(draw, text, y, font, fill):
    """Draw text horizontally centered."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    # Get image width from draw context
    img_width = draw.im.size[0]
    x = (img_width - tw) // 2
    draw.text((x, y), text, font=font, fill=fill)


def generate_splash(width=1080, height=1920):
    """
    Generate splash screen: dark background, white V lettermark,
    blue accent dot, and IVIRA text.
    """
    img = Image.new("RGBA", (width, height), DARK_BG + (255,))
    draw = ImageDraw.Draw(img)

    # V lettermark - draw it centered and sized for the splash
    v_size = int(width * 0.45)  # size of the virtual canvas for the V
    cx = width // 2
    cy = int(height * 0.40)    # position V above center

    # V dimensions
    v_half_width = int(v_size * 0.30)
    v_half_height = int(v_size * 0.22)
    stroke = int(v_size * 0.058)

    top_y = cy - v_half_height
    bot_y = cy + v_half_height
    left_x = cx - v_half_width
    right_x = cx + v_half_width

    v_polygon = [
        (left_x, top_y),
        (left_x + int(stroke * 1.8), top_y),
        (cx, bot_y - int(stroke * 1.4)),
        (right_x - int(stroke * 1.8), top_y),
        (right_x, top_y),
        (cx, bot_y),
    ]
    draw.polygon(v_polygon, fill=WHITE)

    # Blue accent dot below the V tip
    dot_y = bot_y + int(v_size * 0.08)
    dot_r = int(v_size * 0.016)
    draw.ellipse(
        [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
        fill=IVIRA_BLUE
    )

    # "IVIRA" text below the logo
    text_y = dot_y + int(v_size * 0.12)
    # Try to use a system font; fall back to default
    font_size = int(width * 0.08)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except (OSError, IOError):
            font = ImageFont.load_default()

    # Center the text
    bbox = draw.textbbox((0, 0), "IVIRA", font=font)
    tw = bbox[2] - bbox[0]
    text_x = (width - tw) // 2
    draw.text((text_x, text_y), "IVIRA", font=font, fill=WHITE)

    return img


def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)

    print("Generating IVIRA app icons...")

    icon = generate_app_icon(1024)
    icon_path = os.path.join(ASSETS_DIR, "icon.png")
    icon.save(icon_path, "PNG")
    print(f"  [OK] icon.png (1024x1024)")

    adaptive = generate_adaptive_icon(1024)
    adaptive_path = os.path.join(ASSETS_DIR, "adaptive-icon.png")
    adaptive.save(adaptive_path, "PNG")
    print(f"  [OK] adaptive-icon.png (1024x1024)")

    notif = generate_notification_icon(96)
    notif_path = os.path.join(ASSETS_DIR, "notification-icon.png")
    notif.save(notif_path, "PNG")
    print(f"  [OK] notification-icon.png (96x96)")

    splash = generate_splash(1080, 1920)
    splash_path = os.path.join(ASSETS_DIR, "splash.png")
    splash.save(splash_path, "PNG")
    print(f"  [OK] splash.png (1080x1920)")

    print(f"\nAll icons saved to {ASSETS_DIR}")
    print("\nReminder: Set android.adaptiveIcon.backgroundColor to #3B82F6 in app.json")


if __name__ == "__main__":
    main()
