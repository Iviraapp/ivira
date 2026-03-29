#!/usr/bin/env python3
"""
Generate IVIRA branded app icons using Pillow.

Icons generated:
  - icon.png (1024x1024) - Main app icon
  - adaptive-icon.png (1024x1024) - Android adaptive icon foreground
  - notification-icon.png (96x96) - Android notification icon (white on transparent)

Brand:
  - Background: Emerald #10B981
  - Accent: IVIRA Blue #3B82F6
  - Lettermark: White "V" (for IVIRA/Vira)
"""

import os
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# Brand colors
EMERALD = (16, 185, 129)       # #10B981
IVIRA_BLUE = (59, 130, 246)    # #3B82F6
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
    """Generate the main app icon: emerald rounded square with white V."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Rounded rectangle background (iOS-style corner radius ~22%)
    corner_radius = int(size * 0.22)
    draw_rounded_rect(img, (0, 0, size, size), corner_radius, EMERALD)

    draw = ImageDraw.Draw(img)

    # Draw V lettermark, shifted up slightly for optical center
    draw_v_lettermark(draw, size, WHITE, y_offset=int(-size * 0.02))

    # Small blue accent dot below the V tip
    cx = size // 2
    dot_y = int(size * 0.73)
    dot_r = int(size * 0.016)
    draw.ellipse(
        [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
        fill=IVIRA_BLUE
    )

    return img


def generate_adaptive_icon(size=1024):
    """
    Generate Android adaptive icon foreground.
    Full-bleed emerald background; the OS handles shape masking.
    Safe zone is inner 66%, so the V is sized accordingly.
    """
    img = Image.new("RGBA", (size, size), EMERALD + (255,))
    draw = ImageDraw.Draw(img)

    # V lettermark centered
    draw_v_lettermark(draw, size, WHITE, y_offset=int(-size * 0.02), thickness=0.9)

    # Blue accent dot
    cx = size // 2
    dot_y = int(size * 0.73)
    dot_r = int(size * 0.016)
    draw.ellipse(
        [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
        fill=IVIRA_BLUE
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

    print(f"\nAll icons saved to {ASSETS_DIR}")
    print("\nReminder: Set android.adaptiveIcon.backgroundColor to #10B981 in app.json")


if __name__ == "__main__":
    main()
