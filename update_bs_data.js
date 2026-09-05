const fs = require('fs');

const Calendar = require("/tmp/node_modules/nepali-date-converter").default;
const config = require("/tmp/node_modules/nepali-date-converter").dateConfigMap;

const monthNames = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

let bsDataStr = "export const BS_CALENDAR_DATA: Record<number, number[]> = {\n";

for (let year = 2000; year <= 2090; year++) {
  if (config[year]) {
    const monthLengths = monthNames.map(m => config[year][m]);
    bsDataStr += `  ${year}: [${monthLengths.join(", ")}],\n`;
  }
}
bsDataStr += "};\n";

let bsDataFile = fs.readFileSync("src/lib/nepali-calendar/bs-data.ts", "utf8");
bsDataFile = bsDataFile.replace(/export const BS_CALENDAR_DATA: Record<number, number\[\]> = {[\s\S]*?};/, bsDataStr);
fs.writeFileSync("src/lib/nepali-calendar/bs-data.ts", bsDataFile);


let anchorStr = "export const BS_YEAR_ANCHORS: Record<number, string> = {\n";
for (let year = 2000; year <= 2090; year++) {
  if (config[year]) {
    try {
      const bsDate = new Calendar(year, 0, 1);
      const adDate = bsDate.toJsDate();
      const adYear = adDate.getFullYear();
      const adMonth = String(adDate.getMonth() + 1).padStart(2, '0');
      const adDay = String(adDate.getDate()).padStart(2, '0');
      anchorStr += `  ${year}: "${adYear}-${adMonth}-${adDay}",\n`;
    } catch(e) { }
  }
}
anchorStr += "};\n";

let converterFile = fs.readFileSync("src/lib/nepali-calendar/converter.ts", "utf8");
converterFile = converterFile.replace(/export const BS_YEAR_ANCHORS: Record<number, string> = {[\s\S]*?};/, anchorStr);
fs.writeFileSync("src/lib/nepali-calendar/converter.ts", converterFile);

console.log("Updated both files successfully.");
