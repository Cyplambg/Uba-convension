const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const LOGO = path.resolve("public/logo.jpg");
const RES_DIR = path.resolve("mobile/App/android/app/src/main/res");

const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const FOREGROUND_RATIO = 0.7;

async function main() {
  const logo = sharp(LOGO);
  const meta = await logo.metadata();
  const baseSize = Math.min(meta.width, meta.height);

  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = path.join(RES_DIR, dir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // ic_launcher.png – full size icon
    await logo
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(path.join(outDir, "ic_launcher.png"));

    // ic_launcher_round.png – same as launcher
    await logo
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(path.join(outDir, "ic_launcher_round.png"));

    // ic_launcher_foreground.png – visible content scaled to ~70% on transparent canvas
    const visibleSize = Math.round(size * FOREGROUND_RATIO);
    const fgImg = await logo
      .resize(visibleSize, visibleSize, { fit: "inside", position: "centre" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: fgImg, gravity: "centre" }])
      .png()
      .toFile(path.join(outDir, "ic_launcher_foreground.png"));

    console.log(`  ✓ ${dir} (${size}px)`);
  }

  // Update adaptive icon XML (ic_launcher.xml)
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

  for (const f of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    const p = path.join(RES_DIR, "mipmap-anydpi-v26", f);
    if (fs.existsSync(path.dirname(p))) {
      fs.writeFileSync(p, adaptiveXml);
      console.log(`  ✓ mipmap-anydpi-v26/${f}`);
    }
  }

  // Create/update colors.xml with background color
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#B3191F</color>
</resources>`;
  const valuesDir = path.resolve(RES_DIR + "/../values");
  if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(path.join(valuesDir, "colors.xml"), colorsXml);
  console.log("  ✓ values/colors.xml");

  console.log("\n✅ All icons generated!");
}

main().catch(console.error);
