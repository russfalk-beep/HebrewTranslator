// NCSY / ArtScroll Prayer Book style transliteration
// With syllable dashes for easy reading: "Ba-ruch A-tah A-do-nai"
// Designed for English-speaking parents helping kids with Hebrew homework

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
// These are the VOWELS that define syllable boundaries
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

// Is this character a shva (often silent at end of syllable)?
const SHVA = '\u05B0';

// Build raw transliteration tokens: [{type: 'C'|'V', text: '...'}]
interface Token { type: 'C' | 'V' | 'S' | 'X'; text: string; }

function tokenize(text: string): Token[] {
  const chars = [...text];
  const tokens: Token[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    // Hebrew consonant
    if (code >= 0x05D0 && code <= 0x05EA) {
      const nextIsDagesh = i + 1 < chars.length && chars[i + 1] === '\u05BC';

      // Shin/Sin
      if (char === 'ש') {
        if (i + 1 < chars.length && chars[i + 1] === '\u05C2') {
          tokens.push({ type: 'C', text: 's' });
          i++;
          continue;
        }
        if (i + 1 < chars.length && chars[i + 1] === '\u05C1') i++;
        tokens.push({ type: 'C', text: 'sh' });
        continue;
      }

      // Vav as vowel
      if (char === 'ו') {
        if (nextIsDagesh) {
          tokens.push({ type: 'V', text: 'u' });
          i++;
          continue;
        }
        if (i + 1 < chars.length && chars[i + 1] === '\u05B9') {
          tokens.push({ type: 'V', text: 'o' });
          i++;
          continue;
        }
      }

      // Dagesh changes bet/kaf/pey
      if (nextIsDagesh && WITH_DAGESH[char]) {
        tokens.push({ type: 'C', text: WITH_DAGESH[char] });
        i++;
      } else {
        const c = CONSONANTS[char] || '';
        if (c) tokens.push({ type: 'C', text: c });
      }
    }
    // Vowel mark
    else if (code >= 0x05B0 && code <= 0x05BC) {
      if (char === SHVA) {
        // Shva: mark as special — may be silent or a schwa
        tokens.push({ type: 'S', text: 'e' });
      } else {
        const v = VOWELS[char] || '';
        if (v) tokens.push({ type: 'V', text: v });
      }
    }
    // Skip combining marks
    else if (code >= 0x05BD && code <= 0x05C7) {
      continue;
    }
    // Maqaf
    else if (char === '\u05BE') {
      tokens.push({ type: 'X', text: '-' });
    }
    // Space
    else if (char === ' ') {
      tokens.push({ type: 'X', text: ' ' });
    }
    // Skip geresh/gershayim/quotes
    else if (char === '\u05F3' || char === '\u05F4' || char === '"' || char === "'") {
      continue;
    }
    // Latin chars, numbers
    else if (code < 0x0590 || code > 0x05FF) {
      tokens.push({ type: 'X', text: char });
    }
  }

  return tokens;
}

// Convert tokens to syllable-dashed string
function syllabify(tokens: Token[]): string {
  // Build syllables: a syllable = consonant(s) + vowel
  // Insert dash between syllables
  const syllables: string[] = [];
  let current = '';
  let hasVowel = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.type === 'X') {
      // Space or maqaf — flush current syllable
      if (current) {
        syllables.push(current);
        current = '';
        hasVowel = false;
      }
      syllables.push(tok.text);
      continue;
    }

    if (tok.type === 'C') {
      // Consonant: if we already have a vowel, this starts a new syllable
      if (hasVowel) {
        syllables.push(current);
        current = tok.text;
        hasVowel = false;
      } else {
        current += tok.text;
      }
    }
    else if (tok.type === 'V') {
      // Full vowel
      current += tok.text;
      hasVowel = true;
    }
    else if (tok.type === 'S') {
      // Shva — tricky:
      // At the beginning of a word or after another shva = pronounced (schwa)
      // At end of word or before another consonant+vowel = usually silent
      const nextTok = tokens[i + 1];
      const prevTok = tokens[i - 1];

      // If this is mid-word and next is a consonant, treat as syllable break
      if (current && hasVowel) {
        syllables.push(current);
        current = '';
        hasVowel = false;
        // Only add 'e' if next consonant has a vowel after it (not silent shva)
        if (nextTok && nextTok.type === 'C') {
          // Check if there's a vowel after the next consonant
          const afterNext = tokens[i + 2];
          if (afterNext && (afterNext.type === 'V' || afterNext.type === 'S')) {
            // Silent shva — don't add anything
          } else {
            // Might be pronounced — add soft 'e'
          }
        }
      } else if (!prevTok || prevTok.type === 'X') {
        // Start of word — shva is pronounced
        current += 'e';
        hasVowel = true;
      }
      // Otherwise skip (silent shva at end)
    }
  }

  // Flush remaining
  if (current) syllables.push(current);

  // Join with dashes between syllables, preserve spaces
  let result = '';
  for (let i = 0; i < syllables.length; i++) {
    const syl = syllables[i];
    if (syl === ' ' || syl === '-') {
      result += syl;
    } else {
      // Add dash before this syllable if previous was also a syllable (not space/dash)
      if (result.length > 0) {
        const lastChar = result[result.length - 1];
        if (lastChar !== ' ' && lastChar !== '-') {
          result += '-';
        }
      }
      result += syl;
    }
  }

  return result;
}

export function transliterateHebrew(text: string): string {
  const tokens = tokenize(text);

  // Check if text has niqqud (vowel points)
  const hasNiqqud = tokens.some(t => t.type === 'V' || t.type === 'S');

  if (hasNiqqud) {
    // Pointed text: use proper syllabification
    let result = syllabify(tokens);
    return cleanResult(result);
  } else {
    // Unpointed text: just output consonants with inserted 'a' vowels
    let raw = tokens.map(t => t.text).join('');
    raw = raw.trim().replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (raw.length > 1 && !/[aeiou]/i.test(raw)) {
      let readable = '';
      for (let i = 0; i < raw.length; i++) {
        readable += raw[i];
        if (i < raw.length - 1 &&
            !/[aeiou \-]/i.test(raw[i]) &&
            !/[aeiou \-]/i.test(raw[i + 1])) {
          readable += 'a';
        }
      }
      raw = readable;
    }

    // Add syllable dashes for unpointed text too
    return addDashesToUnpointed(raw);
  }
}

// Add dashes to unpointed transliteration (simple CV pattern)
function addDashesToUnpointed(text: string): string {
  // Split on spaces, process each word
  return text.split(' ').map(word => {
    if (word.length <= 2) return word;
    // Find CV boundaries: consonant(s) + vowel = syllable
    let result = '';
    let syllableStart = 0;
    let inVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = /[aeiou]/i.test(word[i]);

      if (isVowel) {
        inVowel = true;
      } else if (inVowel) {
        // Consonant after vowel = new syllable
        inVowel = false;
        const syllable = word.slice(syllableStart, i);
        if (result.length > 0) result += '-';
        result += syllable;
        syllableStart = i;
      }
    }
    // Add remaining
    const remaining = word.slice(syllableStart);
    if (remaining) {
      if (result.length > 0) result += '-';
      result += remaining;
    }
    return result;
  }).join(' ');
}

function cleanResult(text: string): string {
  return text
    .replace(/--+/g, '-')     // no double dashes
    .replace(/^-|-$/g, '')     // no leading/trailing dashes
    .replace(/ -|- /g, ' ')   // no dashes next to spaces
    .replace(/\s+/g, ' ')     // collapse spaces
    .trim();
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
