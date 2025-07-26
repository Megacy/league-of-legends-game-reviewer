# 🎨 Icon Generation Quick Guide

## **What You Need:**
- **1 high-quality PNG image** (1024x1024 pixels recommended)
- **Name it**: `icon-source.png`
- **Place it**: In the root directory (next to package.json)

## **Generate All Icons Automatically:**
```bash
npm run generate-icons
```

This will create:
- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows)  
- `build/icon.png` (Linux)

## **Icon Design Tips:**
- ✅ **Simple, recognizable design** 
- ✅ **Works well at small sizes** (16x16)
- ✅ **Transparent background**
- ✅ **High contrast colors**
- ✅ **League of Legends theme** (for your app)

## **Alternative: Manual Creation**
If you prefer manual control, create these files directly:

### macOS Icon (icon.icns)
- Use online converter: https://cloudconvert.com/png-to-icns
- Upload your PNG, download ICNS

### Windows Icon (icon.ico)  
- Use online converter: https://convertio.co/png-ico/
- Upload your PNG, download ICO

### Linux Icon (icon.png)
- Simply resize your source to 512x512
- Save as PNG with transparency

## **Current Status:**
- ⏳ **Waiting**: Add `icon-source.png` to root directory
- ⏳ **Then run**: `npm run generate-icons`
- ✅ **Ready**: electron-builder will use the icons automatically

Your app will look professional with custom icons! 🚀
