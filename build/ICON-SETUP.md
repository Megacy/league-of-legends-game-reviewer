# Icon Setup Instructions

To add custom icons to your Electron app, you need to create the following files in the `build/` directory:

## Required Icon Files:

### 1. macOS Icon (`build/icon.icns`)
- **Format**: ICNS (Apple Icon Image format)
- **Contains multiple sizes**: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- **Tool to create**: Use `iconutil` (built into macOS) or online converters

### 2. Windows Icon (`build/icon.ico`) 
- **Format**: ICO (Windows Icon format)
- **Contains multiple sizes**: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512
- **Tool to create**: Online ICO converters or tools like GIMP

### 3. Linux Icon (`build/icon.png`)
- **Format**: PNG
- **Size**: 512x512 pixels
- **Quality**: High resolution, transparent background recommended

## How to Create Icons:

### Option 1: Start with a single high-res PNG (1024x1024)
1. Create or find a 1024x1024 PNG image
2. Use online converters:
   - **ICNS**: https://cloudconvert.com/png-to-icns
   - **ICO**: https://convertio.co/png-ico/

### Option 2: Use macOS built-in tools (for ICNS)
```bash
# Create iconset directory
mkdir icon.iconset

# Add different sizes (you'll need to create these)
cp icon-16x16.png icon.iconset/icon_16x16.png
cp icon-32x32.png icon.iconset/icon_32x32.png
# ... (repeat for all sizes)

# Convert to ICNS
iconutil -c icns icon.iconset
```

### Option 3: Use electron-icon-builder (Automated)
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon-source.png --output=./build --flatten
```

## Current Status:
- ✅ Directory created: `build/`
- ✅ Package.json configured to look for icons in `build/`
- ⏳ **Next step**: Add your icon files to the `build/` directory

## File Structure After Adding Icons:
```
build/
├── icon.icns    (macOS)
├── icon.ico     (Windows) 
└── icon.png     (Linux + fallback)
```

Once you add these files, electron-builder will automatically use them when building your app!
