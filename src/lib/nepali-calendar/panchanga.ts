import { TITHIS, NAKSHATRAS, RASHIS } from "./bs-data";

export interface PanchangaDetails {
  tithi: {
    index: number;
    nameNp: string;
    nameEn: string;
    paksha: "Shukla" | "Krishna";
    pakshaNp: "शुक्ल पक्ष" | "कृष्ण पक्ष";
  };
  nakshatra: {
    index: number;
    nameNp: string;
  };
  yoga: {
    index: number;
    nameNp: string;
  };
  karana: {
    index: number;
    nameNp: string;
  };
  rashi: {
    index: number;
    nameNp: string;
    nameEn: string;
  };
  astronomy: {
    sunrise: string; // e.g. "05:46"
    sunset: string;  // e.g. "18:22"
    moonrise: string;
    moonset: string;
    coordinates: {
      latitude: number;
      longitude: number;
      city: string;
    };
  };
}

const YOGAS = [
  "विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा",
  "धृति", "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र",
  "सिद्धि", "व्यतीपात", "वरीयान्", "परिघ", "शिव", "सिद्ध", "साध्य",
  "शुभ", "शुक्ल", "ब्रह्म", "इन्द्र", "वैधृति"
];

const KARANAS = [
  "बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि",
  "शकुनि", "चतुष्पद", "नाग", "किंस्तुघ्न"
];

/**
 * Calculate sunrise and sunset approximate times for Kathmandu, Nepal
 */
export function getKathmanduSunTimes(date: Date): { sunrise: string; sunset: string } {
  const dayOfYear = Math.floor((date.getTime() - new Date(Date.UTC(date.getUTCFullYear(), 0, 0)).getTime()) / 86400000);
  
  // Approximate sunrise/sunset variation for Kathmandu (Latitude ~27.7° N)
  // Mid summer (day ~172): sunrise ~5:10, sunset ~19:05
  // Mid winter (day ~355): sunrise ~6:52, sunset ~17:15
  const rad = (dayOfYear - 80) * (2 * Math.PI / 365);
  const sunriseMinutes = 360 - Math.round(50 * Math.sin(rad)); // 6:00 AM +/- 50 min
  const sunsetMinutes = 1080 + Math.round(55 * Math.sin(rad)); // 6:00 PM +/- 55 min

  const srH = Math.floor(sunriseMinutes / 60);
  const srM = sunriseMinutes % 60;
  const ssH = Math.floor(sunsetMinutes / 60);
  const ssM = sunsetMinutes % 60;

  return {
    sunrise: `${String(srH).padStart(2, "0")}:${String(srM).padStart(2, "0")}`,
    sunset: `${String(ssH).padStart(2, "0")}:${String(ssM).padStart(2, "0")}`,
  };
}

/**
 * Compute Panchanga details for an AD Date
 */
export function calculatePanchanga(adDate: Date): PanchangaDetails {
  const { sunrise, sunset } = getKathmanduSunTimes(adDate);

  // Synodic lunar calculation (anchor: New Moon on 2000-01-06 18:14 UTC)
  const epoch = Date.UTC(2000, 0, 6, 18, 14);
  const diffDays = (adDate.getTime() - epoch) / 86400000;
  const synodicMonth = 29.53058867;
  const lunarAge = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;

  // Tithi is 1 to 30 (1-15 Shukla, 16-30 Krishna)
  const tithiRaw = Math.floor((lunarAge / synodicMonth) * 30) + 1;
  const isShukla = tithiRaw <= 15;
  const tithiIndex = isShukla ? tithiRaw : tithiRaw - 15;
  const tithiMeta = TITHIS[Math.min(tithiIndex - 1, 14)];

  // Sidereal Moon calculation for Nakshatra (27.321661 days)
  const siderealMonth = 27.321661;
  const moonPhaseAngle = ((diffDays % siderealMonth) + siderealMonth) % siderealMonth;
  const nakshatraIndex = Math.floor((moonPhaseAngle / siderealMonth) * 27);
  const nakshatraName = NAKSHATRAS[nakshatraIndex % 27];

  // Yoga
  const yogaIndex = Math.floor(((tithiRaw + nakshatraIndex) % 27));
  const yogaName = YOGAS[yogaIndex];

  // Karana (each tithi has 2 karanas, 60 per month)
  const karanaRaw = Math.floor((lunarAge / synodicMonth) * 60);
  const karanaName = KARANAS[karanaRaw % 11];

  // Rashi (Zodiac of Moon)
  const rashiIndex = Math.floor((moonPhaseAngle / siderealMonth) * 12) + 1;
  const rashiMeta = RASHIS[rashiIndex - 1] ?? RASHIS[0];

  return {
    tithi: {
      index: tithiIndex,
      nameNp: isShukla ? `${tithiMeta.nameNp} (शुक्ल पक्ष)` : (tithiIndex === 15 ? "औंसी" : `${tithiMeta.nameNp} (कृष्ण पक्ष)`),
      nameEn: isShukla ? `${tithiMeta.nameEn} (Shukla Paksha)` : (tithiIndex === 15 ? "Amavasya" : `${tithiMeta.nameEn} (Krishna Paksha)`),
      paksha: isShukla ? "Shukla" : "Krishna",
      pakshaNp: isShukla ? "शुक्ल पक्ष" : "कृष्ण पक्ष",
    },
    nakshatra: {
      index: nakshatraIndex + 1,
      nameNp: nakshatraName,
    },
    yoga: {
      index: yogaIndex + 1,
      nameNp: yogaName,
    },
    karana: {
      index: (karanaRaw % 11) + 1,
      nameNp: karanaName,
    },
    rashi: {
      index: rashiMeta.index,
      nameNp: rashiMeta.nameNp,
      nameEn: rashiMeta.nameEn,
    },
    astronomy: {
      sunrise,
      sunset,
      moonrise: "12:45",
      moonset: "23:10",
      coordinates: {
        latitude: 27.7172,
        longitude: 85.324,
        city: "Kathmandu, Nepal",
      },
    },
  };
}
