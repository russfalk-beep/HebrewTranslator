// NCSY / ArtScroll Prayer Book style transliteration
// The standard used in American Hebrew schools and synagogues
// Designed to be read naturally by English speakers

const CONSONANTS: Record<string, string> = {
  'א': '',       // Alef — silent, just carries the vowel
  'ב': 'v',      // Vet (no dagesh)
  'ג': 'g',      // Gimel
  'ד': 'd',      // Dalet
  'ה': 'h',      // Hey
  'ו': 'v',      // Vav (as consonant)
  'ז': 'z',      // Zayin
  'ח': 'ch',     // Chet — as in "Bach" (NCSY standard)
  'ט': 't',      // Tet
  'י': 'y',      // Yud
  'כ': 'ch',     // Chaf (no dagesh) — same sound as Chet
  'ך': 'ch',     // Final Chaf
  'ל': 'l',      // Lamed
  'מ': 'm',      // Mem
  'ם': 'm',      // Final Mem
  'נ': 'n',      // Nun
  'ן': 'n',      // Final Nun
  'ס': 's',      // Samech
  'ע': '',       // Ayin — silent in modern Hebrew
  'פ': 'f',      // Fey (no dagesh)
  'ף': 'f',      // Final Fey
  'צ': 'tz',     // Tzadi
  'ץ': 'tz',     // Final Tzadi
  'ק': 'k',      // Kuf
  'ר': 'r',      // Resh
  'ש': 'sh',     // Shin (default)
  'ת': 't',      // Tav
};

// With dagesh (dot inside letter) — changes some letters
const WITH_DAGESH: Record<string, string> = {
  'ב': 'b',      // Bet
  'כ': 'k',      // Kaf
  'פ': 'p',      // Pey
};

// Niqqud vowel marks → simple English vowels
const VOWELS: Record<string, string> = {
  '\u05B0': 'e',   // Shva — short "e" or silent
  '\u05B1': 'e',   // Chataf Segol
  '\u05B2': 'a',   // Chataf Patach
  '\u05B3': 'o',   // Chataf Kamatz
  '\u05B4': 'i',   // Chirik — "ee"
  '\u05B5': 'ei',  // Tzeirei — "ay" as in "they"
  '\u05B6': 'e',   // Segol — "e" as in "bed"
  '\u05B7': 'a',   // Patach — "a" as in "father"
  '\u05B8': 'a',   // Kamatz — "a" as in "father"
  '\u05B9': 'o',   // Cholam — "o" as in "go"
  '\u05BA': 'o',   // Cholam Chaser
  '\u05BB': 'u',   // Kubutz — "oo" as in "blue"
  '\u05BC': '',    // Dagesh — handled separately
};

export function transliterateHebrew(text: string): string {
  const chars = [...text];
  let result = '';

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    // Hebrew consonant (Alef through Tav)
    if (code >= 0x05D0 && code <= 0x05EA) {
      const nextIsDagesh = i + 1 < chars.length && chars[i + 1] === '\u05BC';

      // Shin/Sin distinction
      if (char === 'ש') {
        if (i + 1 < chars.length && chars[i + 1] === '\u05C2') {
          result += 's';  // Sin (dot on left)
          i++;
          continue;
        }
        if (i + 1 < chars.length && chars[i + 1] === '\u05C1') i++; // skip shin dot
        result += 'sh';
        continue;
      }

      // Vav as vowel (Shuruk or Cholam Male)
      if (char === 'ו') {
        if (nextIsDagesh) {
          result += 'u';  // Shuruk = "oo"
          i++;
          continue;
        }
        if (i + 1 < chars.length && chars[i + 1] === '\u05B9') {
          result += 'o';  // Cholam Male
          i++;
          continue;
        }
      }

      // Dagesh changes bet/kaf/pey
      if (nextIsDagesh && WITH_DAGESH[char]) {
        result += WITH_DAGESH[char];
        i++;
      } else {
        result += CONSONANTS[char] || '';
      }
    }
    // Vowel mark (niqqud)
    else if (code >= 0x05B0 && code <= 0x05BC) {
      result += VOWELS[char] || '';
    }
    // Skip other combining marks (shin/sin dots, etc.)
    else if (code >= 0x05BD && code <= 0x05C7) {
      continue;
    }
    // Hebrew maqaf (word-joining dash)
    else if (char === '\u05BE') {
      result += '-';
    }
    // Space
    else if (char === ' ') {
      result += ' ';
    }
    // Skip geresh/gershayim (Hebrew punctuation that looks like quotes)
    else if (char === '\u05F3' || char === '\u05F4' || char === '"' || char === "'") {
      continue;
    }
    // Pass through Latin chars and numbers
    else if (code < 0x0590 || code > 0x05FF) {
      result += char;
    }
  }

  let clean = result.trim()
    .replace(/-+/g, '-')      // collapse multiple dashes
    .replace(/^-|-$/g, '');   // remove leading/trailing dashes

  // For unpointed text (no niqqud), insert 'a' between consonant clusters
  // to make it pronounceable
  if (clean.length > 1 && !/[aeiou]/i.test(clean)) {
    let readable = '';
    for (let i = 0; i < clean.length; i++) {
      readable += clean[i];
      if (i < clean.length - 1 &&
          clean[i] !== ' ' && clean[i] !== '-' &&
          clean[i + 1] !== ' ' && clean[i + 1] !== '-' &&
          !/[aeiou]/i.test(clean[i]) &&
          !/[aeiou]/i.test(clean[i + 1])) {
        readable += 'a';
      }
    }
    clean = readable;
  }

  return clean;
}

export function isHebrew(text: string): boolean {
  return /[\u05D0-\u05EA]/.test(text);
}

// Strip Hebrew punctuation marks that cause display issues
export function cleanHebrewText(text: string): string {
  return text
    .replace(/[״׳"']/g, '')           // Remove geresh, gershayim, quotes
    .replace(/\u05BE/g, ' ')           // Replace maqaf with space
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .trim();
}
