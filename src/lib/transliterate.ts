// Hebrew letter to phonetic English mapping
// This covers the standard Hebrew alphabet plus common niqqud (vowel marks)
const HEBREW_MAP: Record<string, string> = {
  // Consonants
  'א': "'",
  'ב': 'v',
  'בּ': 'b',
  'ג': 'g',
  'גּ': 'g',
  'ד': 'd',
  'דּ': 'd',
  'ה': 'h',
  'הּ': 'h',
  'ו': 'v',
  'וּ': 'u',
  'וֹ': 'o',
  'ז': 'z',
  'ח': 'ch',
  'ט': 't',
  'י': 'y',
  'כ': 'kh',
  'כּ': 'k',
  'ך': 'kh',
  'ל': 'l',
  'מ': 'm',
  'ם': 'm',
  'נ': 'n',
  'ן': 'n',
  'ס': 's',
  'ע': "'",
  'פ': 'f',
  'פּ': 'p',
  'ף': 'f',
  'צ': 'ts',
  'ץ': 'ts',
  'ק': 'k',
  'ר': 'r',
  'שׁ': 'sh',
  'שׂ': 's',
  'ש': 'sh',
  'ת': 't',
  'תּ': 't',
};

// Niqqud (vowel marks)
const VOWEL_MAP: Record<string, string> = {
  '\u05B0': 'e',   // Shva
  '\u05B1': 'e',   // Hataf Segol
  '\u05B2': 'a',   // Hataf Patah
  '\u05B3': 'o',   // Hataf Qamats
  '\u05B4': 'i',   // Hiriq
  '\u05B5': 'e',   // Tsere
  '\u05B6': 'e',   // Segol
  '\u05B7': 'a',   // Patah
  '\u05B8': 'a',   // Qamats
  '\u05B9': 'o',   // Holam
  '\u05BA': 'o',   // Holam Haser
  '\u05BB': 'u',   // Qubuts
  '\u05BC': '',    // Dagesh (modifies consonant, handled separately)
};

export function transliterateHebrew(text: string): string {
  // First try using the hebrew-transliteration library
  try {
    // Dynamic import would be ideal but for simplicity we'll use our own mapping
    return customTransliterate(text);
  } catch {
    return customTransliterate(text);
  }
}

function customTransliterate(text: string): string {
  let result = '';
  const chars = [...text]; // Handle multi-byte chars

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    // Check if it's a Hebrew consonant (0x05D0 - 0x05EA)
    if (code >= 0x05D0 && code <= 0x05EA) {
      // Check for dagesh in next char
      if (i + 1 < chars.length && chars[i + 1] === '\u05BC') {
        const withDagesh = char + '\u05BC';
        if (HEBREW_MAP[withDagesh]) {
          result += HEBREW_MAP[withDagesh];
          i++; // Skip dagesh
          continue;
        }
      }
      // Check combined forms with shin/sin dot
      if (char === 'ש' && i + 1 < chars.length) {
        if (chars[i + 1] === '\u05C1') { // Shin dot
          result += 'sh';
          i++;
          continue;
        } else if (chars[i + 1] === '\u05C2') { // Sin dot
          result += 's';
          i++;
          continue;
        }
      }
      result += HEBREW_MAP[char] || char;
    }
    // Check if it's a vowel mark (niqqud)
    else if (code >= 0x05B0 && code <= 0x05BC) {
      result += VOWEL_MAP[char] || '';
    }
    // Skip other combining marks
    else if (code >= 0x05BD && code <= 0x05C7) {
      continue;
    }
    // Pass through spaces, punctuation, etc.
    else if (char === ' ' || char === '\n' || char === '\t') {
      result += char;
    }
    // Pass through Latin chars and numbers
    else if (code < 0x0590 || code > 0x05FF) {
      result += char;
    }
  }

  return result.trim();
}

// Check if a string contains Hebrew characters
export function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}
