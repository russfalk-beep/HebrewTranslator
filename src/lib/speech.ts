let hebrewVoice: SpeechSynthesisVoice | null = null;
let allVoices: SpeechSynthesisVoice[] = [];

// Rank Hebrew voices by quality — prefer Google/Microsoft neural voices
function findBestHebrewVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  allVoices = voices;

  const hebrewVoices = voices.filter(
    v => v.lang.startsWith('he') || v.lang.startsWith('iw')
  );

  if (hebrewVoices.length === 0) return null;
  if (hebrewVoices.length === 1) return hebrewVoices[0];

  // Prefer Google voices (much more natural on Chrome)
  const google = hebrewVoices.find(v => v.name.toLowerCase().includes('google'));
  if (google) return google;

  // Prefer Microsoft voices (natural on Edge)
  const microsoft = hebrewVoices.find(v => v.name.toLowerCase().includes('microsoft'));
  if (microsoft) return microsoft;

  // Prefer non-local voices (usually higher quality network voices)
  const remote = hebrewVoices.find(v => !v.localService);
  if (remote) return remote;

  // Prefer female voice (often clearer for language learning)
  const female = hebrewVoices.find(v =>
    v.name.toLowerCase().includes('female') ||
    v.name.toLowerCase().includes('carmit') ||  // Apple Hebrew female voice
    v.name.toLowerCase().includes('yael')
  );
  if (female) return female;

  return hebrewVoices[0];
}

export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    hebrewVoice = findBestHebrewVoice();
    if (hebrewVoice) {
      resolve();
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      hebrewVoice = findBestHebrewVoice();
      resolve();
    };
    setTimeout(() => {
      // Try one more time after timeout
      if (!hebrewVoice) hebrewVoice = findBestHebrewVoice();
      resolve();
    }, 2000);
  });
}

export function getVoiceInfo(): string {
  if (!hebrewVoice) return 'No Hebrew voice found';
  return `${hebrewVoice.name} (${hebrewVoice.lang})`;
}

export function getAvailableHebrewVoices(): SpeechSynthesisVoice[] {
  return allVoices.filter(v => v.lang.startsWith('he') || v.lang.startsWith('iw'));
}

export function setVoice(voice: SpeechSynthesisVoice): void {
  hebrewVoice = voice;
}

// Primary TTS: Web Speech API with best available voice
export function speakHebrew(text: string, rate: number = 0.8): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    if (hebrewVoice) {
      utterance.voice = hebrewVoice;
    }
    utterance.rate = rate;
    utterance.pitch = 1;

    // Safety timeout — don't let it hang forever
    const timeout = setTimeout(() => resolve(), 5000);

    utterance.onend = () => {
      clearTimeout(timeout);
      resolve();
    };
    utterance.onerror = (e) => {
      clearTimeout(timeout);
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
