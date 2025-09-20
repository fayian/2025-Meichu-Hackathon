#!/bin/bash

# Icon Generation Script for MX Creative Console Assistant
# This script helps generate all needed icon formats from the source SVG

echo "MX Creative Console Assistant - Icon Generation"
echo "=============================================="
echo ""

# Check if required tools are available
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed"
        return 1
    else
        echo "✅ $1 is available"
        return 0
    fi
}

echo "Checking required tools..."
INKSCAPE_AVAILABLE=false
CONVERT_AVAILABLE=false

if check_tool "inkscape"; then
    INKSCAPE_AVAILABLE=true
fi

if check_tool "convert"; then
    CONVERT_AVAILABLE=true
fi

echo ""

if [ "$INKSCAPE_AVAILABLE" = false ] && [ "$CONVERT_AVAILABLE" = false ]; then
    echo "❌ Neither Inkscape nor ImageMagick is available."
    echo "Please install one of them to generate icons:"
    echo ""
    echo "For Inkscape:"
    echo "  - Windows: Download from https://inkscape.org/"
    echo "  - macOS: brew install --cask inkscape"
    echo "  - Linux: sudo apt install inkscape (Ubuntu/Debian)"
    echo ""
    echo "For ImageMagick:"
    echo "  - Windows: Download from https://imagemagick.org/"
    echo "  - macOS: brew install imagemagick"
    echo "  - Linux: sudo apt install imagemagick (Ubuntu/Debian)"
    echo ""
    exit 1
fi

# Create output directory
mkdir -p generated

echo "Generating PNG files from SVG..."

# Generate PNG files using Inkscape (preferred) or ImageMagick
generate_png() {
    local size=$1
    local output="generated/icon-${size}x${size}.png"
    
    if [ "$INKSCAPE_AVAILABLE" = true ]; then
        inkscape --export-width=$size --export-height=$size --export-filename="$output" icon-source.svg
    else
        convert -background transparent -size ${size}x${size} icon-source.svg "$output"
    fi
    
    if [ -f "$output" ]; then
        echo "✅ Generated $output"
    else
        echo "❌ Failed to generate $output"
    fi
}

# Generate all required sizes
sizes=(16 32 48 64 128 256 512 1024)

for size in "${sizes[@]}"; do
    generate_png $size
done

echo ""
echo "Generating platform-specific formats..."

# Generate ICO file for Windows (requires ImageMagick)
if [ "$CONVERT_AVAILABLE" = true ]; then
    echo "Creating Windows ICO file..."
    convert generated/icon-16x16.png generated/icon-32x32.png generated/icon-48x48.png generated/icon-64x64.png generated/icon-128x128.png generated/icon-256x256.png generated/icon.ico
    if [ -f "generated/icon.ico" ]; then
        echo "✅ Generated icon.ico"
    else
        echo "❌ Failed to generate icon.ico"
    fi
else
    echo "⚠️  Skipping ICO generation (ImageMagick not available)"
    echo "   You can use online converters or Windows tools"
fi

# Copy files to final locations
echo ""
echo "Copying files to final locations..."

# Copy main icon files
cp generated/icon-256x256.png icon.png 2>/dev/null && echo "✅ Created icon.png"
cp generated/icon.ico . 2>/dev/null && echo "✅ Created icon.ico"

# Create tray icon (smaller version)
if [ "$INKSCAPE_AVAILABLE" = true ] || [ "$CONVERT_AVAILABLE" = true ]; then
    cp generated/icon-32x32.png tray-icon.png 2>/dev/null && echo "✅ Created tray-icon.png"
fi

echo ""
echo "Manual Steps Required:"
echo "====================="
echo ""
echo "1. For macOS ICNS file:"
echo "   - Use the generated PNG files with iconutil:"
echo "   - mkdir icon.iconset"
echo "   - Copy and rename PNG files to iconset format"
echo "   - iconutil -c icns icon.iconset"
echo ""
echo "2. Test all generated icons in your application"
echo ""
echo "3. Optimize PNG files if needed:"
echo "   - Use tools like pngcrush, optipng, or TinyPNG"
echo ""

if [ -d "generated" ]; then
    echo "Generated files are in the 'generated' folder"
    echo "✅ Icon generation completed!"
else
    echo "❌ Icon generation failed"
fi