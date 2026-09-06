import { BS_CALENDAR_DATA } from "./src/lib/nepcalendarscrape/bs-data";
let total = 0;
for(let y=2055; y<=2082; y++){
  total += BS_CALENDAR_DATA[y].reduce((a,b)=>a+b,0);
}
console.log("Total Nepali Days:", total);

let d1 = new Date(Date.UTC(1998, 3, 14)); // 1998 Apr 14
let d2 = new Date(Date.UTC(2026, 3, 14)); // 2026 Apr 14
console.log("Total Gregorian Days:", (d2.getTime() - d1.getTime()) / 86400000);
