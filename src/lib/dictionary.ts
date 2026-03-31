// Full dictionary loaded from JSON file (25,000+ entries)
let fullDict: Record<string, string> | null = null;
let dictLoading = false;
let dictLoaded = false;

// Load the full dictionary from the public folder
export async function loadDictionary(): Promise<void> {
  if (dictLoaded || dictLoading) return;
  dictLoading = true;

  try {
    // Detect basePath for GitHub Pages vs local dev
    const basePath = window.location.pathname.includes('/HebrewTranslator')
      ? '/HebrewTranslator'
      : '';
    const res = await fetch(`${basePath}/dict-he-en.json`);
    if (res.ok) {
      fullDict = await res.json();
      dictLoaded = true;
    }
  } catch {
    // Dictionary load failed — will use built-in fallback
  }
  dictLoading = false;
}

// Common words built-in for instant access (no network needed)
const BUILTIN: Record<string, string> = {
  'שלום': 'hello/peace', 'תודה': 'thank you', 'בבקשה': 'please',
  'כן': 'yes', 'לא': 'no', 'טוב': 'good', 'יפה': 'beautiful',
  'גדול': 'big', 'קטן': 'small', 'חדש': 'new',
  'אני': 'I', 'אתה': 'you (m)', 'את': 'you (f)',
  'הוא': 'he', 'היא': 'she', 'אנחנו': 'we', 'הם': 'they',
  'זה': 'this', 'מה': 'what', 'מי': 'who', 'איפה': 'where',
  'למה': 'why', 'איך': 'how', 'מתי': 'when',
  'אבא': 'father', 'אמא': 'mother', 'אח': 'brother', 'אחות': 'sister',
  'בן': 'son', 'בת': 'daughter', 'ילד': 'child', 'ילדה': 'girl',
  'משפחה': 'family', 'בית': 'house', 'ספר': 'book', 'מים': 'water',
  'לחם': 'bread', 'שמש': 'sun', 'ירח': 'moon', 'ארץ': 'earth',
  'יום': 'day', 'לילה': 'night', 'שנה': 'year',
  'אחד': 'one', 'שניים': 'two', 'שלושה': 'three',
  'אדום': 'red', 'כחול': 'blue', 'ירוק': 'green',
  'של': 'of', 'על': 'on', 'עם': 'with', 'אל': 'to', 'כי': 'because',
  'גם': 'also', 'רק': 'only', 'כל': 'all', 'עוד': 'more',
  'אבל': 'but', 'או': 'or',
  'אוהב': 'love', 'רוצה': 'want', 'יודע': 'know',
  'הולך': 'go', 'בא': 'come', 'רואה': 'see',
  'שומע': 'hear', 'עושה': 'do/make', 'קורא': 'read',
  'כותב': 'write', 'לומד': 'learn',
  'ה': 'the', 'ב': 'in', 'ל': 'to/for', 'מ': 'from',
  'ו': 'and', 'ש': 'that', 'יש': 'there is', 'אין': 'there isn\'t',
  'אלוהים': 'God', 'תורה': 'Torah', 'ברכה': 'blessing',
  'ברוך': 'blessed', 'קדוש': 'holy', 'מלך': 'king', 'עולם': 'world',
  'אור': 'light', 'חיים': 'life', 'שמחה': 'joy', 'אמת': 'truth',
  'שבת': 'Shabbat', 'ישראל': 'Israel', 'ירושלים': 'Jerusalem',
};

// Strip niqqud (vowel marks) for lookup
function stripNiqqud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

// Look up a Hebrew word — tries full dictionary first, then built-in
export function translateWord(hebrew: string): string | null {
  const clean = stripNiqqud(hebrew.trim());
  if (!clean) return null;

  // Try full dictionary
  if (fullDict) {
    if (fullDict[clean]) return fullDict[clean];

    // Try removing common prefixes
    const prefixes = ['ה', 'ב', 'ל', 'מ', 'ו', 'כ', 'ש', 'וה', 'בה', 'לה', 'מה', 'שה', 'וב', 'ול', 'ומ'];
    for (const prefix of prefixes) {
      if (clean.startsWith(prefix) && clean.length > prefix.length + 1) {
        const root = clean.slice(prefix.length);
        if (fullDict[root]) {
          return fullDict[root];
        }
      }
    }
  }

  // Fallback to built-in dictionary
  if (BUILTIN[clean]) return BUILTIN[clean];

  // Try prefix removal on built-in
  const prefixes = ['ה', 'ב', 'ל', 'מ', 'ו', 'כ', 'ש'];
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix) && clean.length > prefix.length + 1) {
      const root = clean.slice(prefix.length);
      if (BUILTIN[root]) return BUILTIN[root];
    }
  }

  return null;
}
