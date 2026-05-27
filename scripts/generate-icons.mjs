import { writeFileSync } from "fs";

function createSvgIcon(size) {
  const fontSize = Math.round(size * 0.45);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#f59e0b"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="white">食</text>
</svg>`;
}

writeFileSync("public/icon-192.svg", createSvgIcon(192));
writeFileSync("public/icon-512.svg", createSvgIcon(512));

// Also create simple PNG-compatible SVGs that browsers can use
console.log("SVG icons created. For production, convert to PNG.");
console.log("For now, update manifest.json to use .svg files.");
