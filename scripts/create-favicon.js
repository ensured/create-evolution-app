const sharp = require("sharp");
const path = require("path");

// Define image size and radius
const width = 64;
const radius = width / 2;

// Create SVG circle mask
const circleSvg = Buffer.from(`
  <svg width="${width}" height="${width}">
    <circle cx="${radius}" cy="${radius}" r="${radius}" />
  </svg>
`);

// Process the image: resize and apply circular mask
sharp(path.join(__dirname, "../public/og-image-transparent.png"))
  .resize(width, width, {
    fit: "cover",
    position: "center",
  })
  .composite([{ input: circleSvg, blend: "dest-in" }]) // Apply circular clip
  .png({ quality: 100, compressionLevel: 0 })
  .toFile(path.join(__dirname, "../src/app/icon.png"))
  .then(() => {
    console.log("✅ Circular favicon created: src/app/icon.png");
  })
  .catch((err) => {
    console.error("❌ Error creating circular image:", err);
  });
