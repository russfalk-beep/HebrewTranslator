let hebrewVoice: SpeechSynthesisVoice | null = null;

function findHebrewVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  // Look for Hebrew voice
  const hebrew = voices.find(v => v.lang.startsWith('he'));
  if (hebrew) return hebrew;
  // Fallback - some systems use 'iw' for Hebrew
  const fallback = voices.find(v => v.lang.startsWith('iw'));
  return fallback || null;
}

export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    hebrewVoice = findHebrewVoice();
    if (hebrewVoice) {
      resolve();
      return;
    }
    // Voices may load asynchronously
    speechSynthesis.onvoiceschanged = () => {
      hebrewVoice = findHebrewVoice();
      resolve();
    };
    // Timeout fallback
    setTimeout(resolve, 2000);
  });
}

export function speakHebrew(text: string, rate: number = 0.8): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    if (hebrewVoice) {
      utterance.voice = hebrewVoice;
    }
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      // Don't reject on cancel
      if (e.error === 'canceled') resolve();
      else reject(e);
    };
    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined') {
    speechSynthesis.cancel();
  }
}
