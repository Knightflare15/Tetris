const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(__dirname, "..", "dist", "public");
const staticDirectories = [
  ["sounds", "sounds"],
  [path.join("src", "assets", "quattro"), path.join("assets", "quattro")],
];

for (const [sourceRelative, destinationRelative] of staticDirectories) {
  const source = path.resolve(__dirname, "..", sourceRelative);
  const destination = path.join(publicDir, destinationRelative);

  if (!fs.existsSync(source)) {
    throw new Error(`Static asset directory is missing: ${source}`);
  }

  fs.cpSync(source, destination, { recursive: true });
}
