const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export function bnDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Indian/Bangladeshi digit grouping: 2500000 -> 25,00,000 */
export function groupLakh(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  if (s.length <= 3) return (neg ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "-" : "") + rest + "," + last3;
}

export function taka(n: number, locale = "en"): string {
  const v = `৳${groupLakh(n)}`;
  return locale === "bn" ? bnDigits(v) : v;
}

/** Compact: 450000 -> ৳4.5L, 12000000 -> ৳1.2Cr, 85000 -> ৳85k */
export function takaShort(n: number, locale = "en"): string {
  let v: string;
  const a = Math.abs(n);
  if (a >= 1_00_00_000) v = `৳${trim(n / 1_00_00_000)}Cr`;
  else if (a >= 1_00_000) v = `৳${trim(n / 1_00_000)}L`;
  else if (a >= 1000) v = `৳${trim(n / 1000)}k`;
  else v = `৳${n}`;
  return locale === "bn" ? bnDigits(v) : v;
}
function trim(x: number) {
  return (Math.round(x * 10) / 10).toString();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_BN = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function fmtDate(d: Date, locale = "en"): string {
  if (locale === "bn") return `${bnDigits(d.getUTCDate())} ${MONTHS_BN[d.getUTCMonth()]}, ${bnDigits(d.getUTCFullYear())}`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtShort(d: Date): string {
  return `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
}
export function fmtDay(d: Date): string {
  return DAYS[d.getUTCDay()];
}
export function monthShort(d: Date): string {
  return MONTHS[d.getUTCMonth()].slice(0, 3).toUpperCase();
}

/** 24h "18:30" -> "6:30 PM" */
export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

// Bengali calendar (Bangladesh revised, 2019): Boishakh 1 = 14 April.
// Months 1–6 have 31 days, 7–11 have 30, Falgun has 29 (30 in Gregorian leap years), Chaitra 30.
const BN_MONTHS = ["বৈশাখ","জ্যৈষ্ঠ","আষাঢ়","শ্রাবণ","ভাদ্র","আশ্বিন","কার্তিক","অগ্রহায়ণ","পৌষ","মাঘ","ফাল্গুন","চৈত্র"];
export function bengaliDate(d: Date): string {
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 3, 14);
  const t = Date.UTC(y, d.getUTCMonth(), d.getUTCDate());
  const baseY = t >= start ? y : y - 1;
  let day = Math.round((t - Date.UTC(baseY, 3, 14)) / 86_400_000);
  const leap = ((baseY + 1) % 4 === 0 && (baseY + 1) % 100 !== 0) || (baseY + 1) % 400 === 0;
  const lens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap ? 30 : 29, 30];
  let m = 0;
  while (m < 11 && day >= lens[m]) { day -= lens[m]; m++; }
  return `${bnDigits(day + 1)} ${BN_MONTHS[m]} ${bnDigits(baseY - 593)}`;
}

/** Bangladesh mobile: 01XXXXXXXXX or +8801XXXXXXXXX (operator digit 3–9). Returns normalised +880… or null. */
export function normalizeBdPhone(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "");
  const m = s.match(/^(?:\+?880|0)?(1[3-9]\d{8})$/);
  return m ? `+880${m[1]}` : null;
}
export function fmtPhone(p: string): string {
  const m = p.match(/^\+880(\d{4})(\d{6})$/);
  return m ? `+880 ${m[1]} ${m[2]}` : p;
}

export function initials(name: string): string {
  return name.split(/\s+|&/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Clock time in Bangladesh (UTC+6): "18:05" */
export function fmtClock(d: Date): string {
  const t = new Date(d.getTime() + 6 * 3600_000);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}
