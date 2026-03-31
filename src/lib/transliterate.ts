// Simple, readable Hebrew-to-English phonetic transliteration
// Designed for parents helping kids learn — NOT academic notation

const CONSONANTS: Record<string, string> = {
  'א': '',      // silent
  'ב': 'v',
  'ג': 'g',
  'ד': 'd',
  'ה': 'h',
  'ו': 'v',
  'ז': 'z',
  'ח': 'kh',
  'ט': 't',
  'י': 'y',
  'כ': 'kh',
  'ך': 'kh',
  'ל': 'l',
  'מ': 'm',
  'ם': 'm',
  'נ': 'n',
  'ן': 'n',
  'ס': 's',
  'ע': '',      // silent
  'פ': 'f',
  'ף': 'f',
  'צ': 'tz',
  'ץ': 'tz',
  'ק': 'k',
  'ר': 'r',
  'ש': 'sh',
  'ת': 't',
};

// With dagesh (dot inside) - changes pronunciation
const WITH_DAGESH: Record<string, string> = {
  'ב': 'b',
  'כ': 'k',
  'פ': 'p',
  'ת': 't',
  'ג': 'g',
  'ד': 'd',
};

const VOWELS: Record<string, string> = {
  '\u05B0': 'e',   // Shva (short e or silent)
  '\u05B1': 'e',   // Hataf Segol
  '\u05B2': 'a',   // Hataf Patah
  '\u05B3': 'o',   // Hataf Qamats
  '\u05B4': 'i',   // Hiriq
  '\u05B5': 'ei',  // Tsere
  '\u05B6': 'e',   // Segol
  '\u05B7': 'a',   // Patah
  '\u05B8': 'a',   // Qamats
  '\u05B9': 'o',   // Holam
  '\u05BA': 'o',   // Holam Haser
  '\u05BB': 'u',   // Qubuts
  '\u05BC': '',    // Dagesh
};

export function transliterateHebrew(text: string): string {
  const chars = [...text];
  let result = '';
  let lastWasVowel = false;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    // Hebrew consonant
    if (code >= 0x05D0 && code <= 0x05EA) {
      // Check for dagesh in next char
      const nextIsDagesh = i + 1 < chars.length && chars[i + 1] === '\u05BC';

      // Shin/Sin dots
      if (char === 'ש') {
        if (i + 1 < chars.length && chars[i + 1] === '\u05C2') {
          result += 's';  // Sin
          i++;
          lastWasVowel = false;
          continue;
        }
        // Shin dot or default
        if (i + 1 < chars.length && chars[i + 1] === '\u05C1') i++;
        result += 'sh';
        lastWasVowel = false;
        continue;
      }

      // Vav with vowel marks = vowel, not consonant
      if (char === 'ו') {
        if (nextIsDagesh) {
          result += 'u';  // Shuruk
          i++;
          lastWasVowel = true;
          continue;
        }
        if (i + 1 < chars.length && chars[i + 1] === '\u05B9') {
          result += 'o';  // Holam male
          i++;
          lastWasVowel = true;
          continue;
        }
      }

      if (nextIsDagesh && WITH_DAGESH[char]) {
        result += WITH_DAGESH[char];
        i++; // skip dagesh
      } else {
        result += CONSONANTS[char] || '';
      }
      lastWasVowel = false;
    }
    // Vowel mark (niqqud)
    else if (code >= 0x05B0 && code <= 0x05BC) {
      const vowel = VOWELS[char] || '';
      if (vowel) {
        // Avoid double vowels
        if (!lastWasVowel || vowel !== result[result.length - 1]) {
          result += vowel;
        }
        lastWasVowel = true;
      }
    }
    // Skip other combining marks
    else if (code >= 0x05BD && code <= 0x05C7) {
      continue;
    }
    // Dash/maqaf between words
    else if (char === '\u05BE' || char === '-') {
      result += '-';
      lastWasVowel = false;
    }
    // Space
    else if (char === ' ') {
      result += ' ';
      lastWasVowel = false;
    }
    // Pass through Latin chars, numbers, punctuation
    else if (code < 0x0590 || code > 0x05FF) {
      result += char;
      lastWasVowel = false;
    }
  }

  // Clean up: remove leading/trailing dashes, collapse double consonants
  let clean = result.trim()
    .replace(/^-+|-+$/g, '')
    .replace(/([^aeiou])\1+/g, '$1')  // remove doubled consonants like "ll" -> "l"
    .replace(/'/g, '');                 // remove stray apostrophes

  // If no vowels were found (unpointed text), insert default 'a' between consonants
  if (clean.length > 0 && !/[aeiou]/i.test(clean)) {
    let withVowels = '';
    for (let i = 0; i < clean.length; i++) {
      withVowels += clean[i];
      // Add 'a' between consonants (not at end, not before space/dash)
      if (i < clean.length - 1 &&
          !/[aeiou \-]/.test(clean[i]) &&
          !/[aeiou \-]/.test(clean[i + 1])) {
        withVowels += 'a';
      }
    }
    clean = withVowels;
  }

  return clean;
}

export function isHebrew(text: string): boolean {
  return /[\u05D0-\u05EA]/.test(text);
}
