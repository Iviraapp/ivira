#!/bin/bash
# Generate iOS and Android splash screens and app icons
# Requires: ImageMagick (brew install imagemagick)

set -e

BRAND_BLUE="#1A3A8F"
BLACK="#000000"

echo "Generating IVIRA app assets..."

# Create base icon (1024x1024 for iOS App Store)
# IVIRA logo on black background
convert -size 1024x1024 xc:"$BLACK" \
  -fill "$BRAND_BLUE" -font "Inter-Bold" -pointsize 600 \
  -gravity center -annotate 0 "G" \
  assets/icon-base.png 2>/dev/null || echo "ImageMagick not installed. Create icons manually."

# iOS icon sizes
IOS_SIZES=(20 29 40 58 60 76 80 87 120 152 167 180 1024)
for size in "${IOS_SIZES[@]}"; do
  convert assets/icon-base.png -resize ${size}x${size} \
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-${size}x${size}.png" 2>/dev/null || true
done

# Android adaptive icon (foreground layer)
ANDROID_SIZES=("mdpi:48" "hdpi:72" "xhdpi:96" "xxhdpi:144" "xxxhdpi:192")
for entry in "${ANDROID_SIZES[@]}"; do
  dpi="${entry%%:*}"
  size="${entry##*:}"
  DIR="android/app/src/main/res/mipmap-${dpi}"
  mkdir -p "$DIR"
  convert assets/icon-base.png -resize ${size}x${size} "$DIR/ic_launcher.png" 2>/dev/null || true
  convert assets/icon-base.png -resize ${size}x${size} "$DIR/ic_launcher_round.png" 2>/dev/null || true
done

# Splash screens
# iOS (2732x2732 max for iPad Pro)
convert -size 2732x2732 xc:"$BLACK" \
  -fill "$BRAND_BLUE" -font "Inter-Bold" -pointsize 300 \
  -gravity center -annotate 0 "G" \
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png" 2>/dev/null || true

# Android splash
convert -size 1920x1920 xc:"$BLACK" \
  -fill "$BRAND_BLUE" -font "Inter-Bold" -pointsize 200 \
  -gravity center -annotate 0 "G" \
  "android/app/src/main/res/drawable/splash.png" 2>/dev/null || true

echo "Asset generation complete!"
echo "Note: For production, replace generated icons with designer-crafted versions."
