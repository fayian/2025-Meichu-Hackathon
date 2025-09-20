# App Icons and Assets

This folder contains the application icons and assets for the MX Creative Console Assistant.

## Icon Requirements

The application needs icons in the following formats:

### Windows
- `icon.ico` - 256x256, 128x128, 64x64, 48x48, 32x32, 16x16 pixels
- Should include multiple sizes in the same file

### macOS  
- `icon.icns` - 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16 pixels
- Created using iconutil or other icns creation tools

### Linux
- `icon.png` - 512x512 pixels (PNG format)

### Tray Icon
- `tray-icon.png` - 16x16 or 32x32 pixels for system tray

## Design Guidelines

The icon should represent:
- Gaming/Console theme (gamepad, controller)  
- Productivity/Focus (timer, dashboard)
- Modern/Tech aesthetic
- Brand colors: Primary #4ecdc4, Secondary #ff6b6b

## Creating Icons

1. Design a master icon at 1024x1024 resolution
2. Use tools like:
   - **Windows**: IcoFX, Paint.NET with ICO plugin
   - **macOS**: iconutil (command line), Icon Composer
   - **Cross-platform**: GIMP, Photoshop, online converters

3. Export to required formats
4. Replace placeholder files in this directory

## SVG Source

A source SVG file is provided (`icon-source.svg`) that can be used as a starting point for creating the various icon formats.