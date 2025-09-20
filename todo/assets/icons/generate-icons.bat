@echo off
echo MX Creative Console Assistant - Icon Generation (Windows)
echo =========================================================
echo.

REM Check if we're in the right directory
if not exist "icon-source.svg" (
    echo Error: icon-source.svg not found in current directory
    echo Please run this script from the assets/icons folder
    pause
    exit /b 1
)

REM Create output directory
if not exist "generated" mkdir generated

echo This script requires external tools to convert SVG to other formats.
echo.
echo Recommended tools:
echo - Inkscape (free): https://inkscape.org/
echo - ImageMagick (free): https://imagemagick.org/
echo - Online converters: convertio.co, cloudconvert.com
echo.
echo Manual conversion steps:
echo.
echo 1. Convert icon-source.svg to PNG files:
echo    - Size 16x16: icon-16x16.png
echo    - Size 32x32: icon-32x32.png  
echo    - Size 48x48: icon-48x48.png
echo    - Size 64x64: icon-64x64.png
echo    - Size 128x128: icon-128x128.png
echo    - Size 256x256: icon-256x256.png
echo    - Size 512x512: icon-512x512.png
echo    - Size 1024x1024: icon-1024x1024.png
echo.
echo 2. Create ICO file from multiple PNG sizes:
echo    - Use online ICO converter or Photoshop
echo    - Include sizes: 16, 32, 48, 64, 128, 256
echo    - Save as icon.ico
echo.
echo 3. For macOS ICNS:
echo    - Use IconFly, Image2icon, or online converter
echo    - Save as icon.icns
echo.
echo 4. Copy final files:
echo    - icon.png (256x256 or 512x512)
echo    - icon.ico (Windows)
echo    - icon.icns (macOS)  
echo    - tray-icon.png (16x16 or 32x32)
echo.

REM Check if Inkscape is available
where inkscape >nul 2>nul
if %errorlevel% == 0 (
    echo Found Inkscape! Generating PNG files...
    echo.
    
    inkscape --export-width=16 --export-height=16 --export-filename=generated/icon-16x16.png icon-source.svg
    inkscape --export-width=32 --export-height=32 --export-filename=generated/icon-32x32.png icon-source.svg
    inkscape --export-width=48 --export-height=48 --export-filename=generated/icon-48x48.png icon-source.svg
    inkscape --export-width=64 --export-height=64 --export-filename=generated/icon-64x64.png icon-source.svg
    inkscape --export-width=128 --export-height=128 --export-filename=generated/icon-128x128.png icon-source.svg
    inkscape --export-width=256 --export-height=256 --export-filename=generated/icon-256x256.png icon-source.svg
    inkscape --export-width=512 --export-height=512 --export-filename=generated/icon-512x512.png icon-source.svg
    
    echo PNG files generated in 'generated' folder
    echo.
    
    REM Copy main files
    copy generated\icon-256x256.png icon.png >nul 2>nul
    copy generated\icon-32x32.png tray-icon.png >nul 2>nul
    
    echo Created icon.png and tray-icon.png
    echo.
    echo You still need to:
    echo - Create icon.ico from the PNG files
    echo - Create icon.icns for macOS
    
) else (
    echo Inkscape not found in PATH
    echo Please install Inkscape or use manual conversion steps above
)

echo.
echo Icon generation script completed.
pause