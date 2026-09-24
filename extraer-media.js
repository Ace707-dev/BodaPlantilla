const fs = require("fs");

const html = fs.readFileSync("styles.css", "utf8");
const regex = /data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/g;

fs.mkdirSync("media", { recursive: true });

let match;
let index = 1;

while ((match = regex.exec(html))) {
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const output = `media/imagen-${index}.${extension}`;

  fs.writeFileSync(output, Buffer.from(match[2], "base64"));
  console.log(`Creada: ${output}`);
  index++;
}