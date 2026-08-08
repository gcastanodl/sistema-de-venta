const fs = require("fs");
const { createCanvas } = require("canvas");

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#F59E0B";
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SS", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`public/icons/${filename}`, buffer);
  console.log(`✓ ${filename} generado`);
}

generateIcon(192, "icon-192.png");
generateIcon(512, "icon-512.png");