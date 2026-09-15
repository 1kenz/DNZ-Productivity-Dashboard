/**
 * Curated AI Voice Engine & ChatGPT Voice Personas for DNZ Productivity OS
 * Optimized for natural, warm, human-like voice synthesis on macOS, iOS, Windows, Chrome.
 */

export interface VoicePreset {
  id: string;
  name: string;
  avatar: string;
  description: string;
  gender: 'female' | 'male';
  rate: number;
  pitch: number;
  openaiVoice: 'nova' | 'shimmer' | 'alloy' | 'echo' | 'onyx' | 'fable';
  googleVoice: {
    tr: string;
    en: string;
    de: string;
  };
  preferredVoices: {
    en: string[];
    tr: string[];
    de: string[];
  };
}

export const CHATGPT_VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'juniper',
    name: '🌿 Juniper (ChatGPT)',
    avatar: '🌸',
    description: 'Sıcak, samimi, akıcı ve enerjik kadın sesi (ChatGPT Juniper stili)',
    gender: 'female',
    rate: 1.05,
    pitch: 1.08,
    openaiVoice: 'nova',
    googleVoice: {
      tr: 'tr-TR-Wavenet-A',
      en: 'en-US-Neural2-F',
      de: 'de-DE-Neural2-F',
    },
    preferredVoices: {
      en: [
        'Samantha (Enhanced)',
        'Ava (Premium)',
        'Ava (Enhanced)',
        'Karen (Enhanced)',
        'Serena (Premium)',
        'Siri (Voice 4)',
        'Zoe (Enhanced)',
        'Google US English',
        'Microsoft Jenny Online (Natural)',
        'Microsoft Aria Online (Natural)',
        'Samantha',
      ],
      tr: [
        'Yelda (Gelişmiş)',
        'Yelda (Enhanced)',
        'İpek',
        'Microsoft Emel Online (Natural)',
        'Google Türkçe',
        'Yelda',
      ],
      de: [
        'Anna (Verbessert)',
        'Anna (Enhanced)',
        'Petra',
        'Microsoft Katja Online (Natural)',
        'Google Deutsch',
        'Anna',
      ],
    },
  },
  {
    id: 'breeze',
    name: '🌊 Breeze (ChatGPT)',
    avatar: '🍃',
    description: 'Sakin, dingin, berrak ve profesyonel kadın sesi',
    gender: 'female',
    rate: 0.98,
    pitch: 1.00,
    openaiVoice: 'shimmer',
    googleVoice: {
      tr: 'tr-TR-Wavenet-B',
      en: 'en-US-Neural2-C',
      de: 'de-DE-Neural2-A',
    },
    preferredVoices: {
      en: [
        'Ava (Premium)',
        'Serena (Premium)',
        'Karen (Enhanced)',
        'Microsoft Jenny Online (Natural)',
        'Google UK English Female',
        'Samantha',
      ],
      tr: [
        'Yelda (Gelişmiş)',
        'İpek',
        'Google Türkçe',
        'Yelda',
      ],
      de: [
        'Anna (Verbessert)',
        'Google Deutsch',
        'Anna',
      ],
    },
  },
  {
    id: 'cove',
    name: '🌲 Cove (ChatGPT)',
    avatar: '🏔️',
    description: 'Derin, kararlı, odaklı ve güven veren erkek sesi',
    gender: 'male',
    rate: 0.98,
    pitch: 0.88,
    openaiVoice: 'onyx',
    googleVoice: {
      tr: 'tr-TR-Wavenet-B',
      en: 'en-US-Neural2-D',
      de: 'de-DE-Neural2-D',
    },
    preferredVoices: {
      en: [
        'Daniel (Enhanced)',
        'Oliver (Enhanced)',
        'Arthur (Premium)',
        'Siri (Voice 2)',
        'Microsoft Ryan Online (Natural)',
        'Google UK English Male',
        'Alex',
      ],
      tr: [
        'Cem (Gelişmiş)',
        'Cem (Enhanced)',
        'Microsoft Ahmet Online (Natural)',
        'Cem',
        'Google Türkçe',
      ],
      de: [
        'Markus (Verbessert)',
        'Microsoft Stefan Online (Natural)',
        'Google Deutsch',
      ],
    },
  },
  {
    id: 'ember',
    name: '⚡ Ember (ChatGPT)',
    avatar: '🔥',
    description: 'Net, tempolu, dinamik ve kendinden emin ses tonu',
    gender: 'female',
    rate: 1.12,
    pitch: 1.05,
    openaiVoice: 'fable',
    googleVoice: {
      tr: 'tr-TR-Wavenet-C',
      en: 'en-US-Neural2-H',
      de: 'de-DE-Neural2-C',
    },
    preferredVoices: {
      en: [
        'Zoe (Enhanced)',
        'Samantha (Enhanced)',
        'Microsoft Aria Online (Natural)',
        'Google US English',
      ],
      tr: [
        'Yelda (Gelişmiş)',
        'Google Türkçe',
        'Yelda',
      ],
      de: [
        'Anna (Verbessert)',
        'Google Deutsch',
      ],
    },
  },
  {
    id: 'defne_tr',
    name: '🇹🇷 Defne & Yelda (Doğal Türkçe)',
    avatar: '🇹🇷',
    description: 'Özellikle Türkçe için optimize edilmiş akıcı ve berrak ton',
    gender: 'female',
    rate: 1.02,
    pitch: 1.04,
    openaiVoice: 'nova',
    googleVoice: {
      tr: 'tr-TR-Wavenet-E',
      en: 'en-US-Journey-F',
      de: 'de-DE-Neural2-F',
    },
    preferredVoices: {
      tr: [
        'Yelda (Gelişmiş)',
        'Yelda (Enhanced)',
        'İpek',
        'Microsoft Emel Online (Natural)',
        'Google Türkçe',
        'Yelda',
      ],
      en: [
        'Samantha (Enhanced)',
        'Google US English',
      ],
      de: [
        'Anna (Verbessert)',
      ],
    },
  },
];

// Robotic/low-quality synthesizer voice blacklist to filter out bad voices
const LOW_QUALITY_VOICES = new Set([
  'Bad News',
  'Bahh',
  'Bells',
  'Boing',
  'Bubbles',
  'Cellos',
  'Deranged',
  'Good News',
  'Hysterical',
  'Pipe Organ',
  'Trinoids',
  'Whisper',
  'Zarvox',
  'Albert',
  'Junior',
  'Kathy',
  'Ralph',
  'Princess',
  'Fred',
]);

/**
 * Filter available browser voices to return only high quality / natural ones
 */
export function filterHighQualityVoices(
  allVoices: SpeechSynthesisVoice[],
  lang = 'tr-TR'
): SpeechSynthesisVoice[] {
  const langPrefix = lang.split('-')[0].toLowerCase();

  return allVoices
    .filter((v) => !LOW_QUALITY_VOICES.has(v.name))
    .sort((a, b) => {
      // Prioritize current language
      const aMatch = a.lang.toLowerCase().startsWith(langPrefix) ? 1 : 0;
      const bMatch = b.lang.toLowerCase().startsWith(langPrefix) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;

      // Prioritize Enhanced / Premium / Natural / Siri
      const isHighA = /enhanced|premium|natural|online|siri|google/i.test(a.name) ? 1 : 0;
      const isHighB = /enhanced|premium|natural|online|siri|google/i.test(b.name) ? 1 : 0;
      if (isHighA !== isHighB) return isHighB - isHighA;

      return a.name.localeCompare(b.name);
    });
}

/**
 * Find best voice matching preset & language
 */
export function resolvePresetVoice(
  presetId: string,
  availableVoices: SpeechSynthesisVoice[],
  lang = 'tr-TR'
): { voice: SpeechSynthesisVoice | undefined; rate: number; pitch: number } {
  const preset = CHATGPT_VOICE_PRESETS.find((p) => p.id === presetId) || CHATGPT_VOICE_PRESETS[0];
  const langCode = lang.startsWith('tr') ? 'tr' : lang.startsWith('de') ? 'de' : 'en';

  const preferredList = preset.preferredVoices[langCode] || preset.preferredVoices.en;

  let matchedVoice: SpeechSynthesisVoice | undefined;

  for (const nameCandidate of preferredList) {
    const found = availableVoices.find(
      (v) =>
        v.name.toLowerCase() === nameCandidate.toLowerCase() ||
        v.name.toLowerCase().includes(nameCandidate.toLowerCase())
    );
    if (found) {
      matchedVoice = found;
      break;
    }
  }

  // Fallback to highest quality voice in target language
  if (!matchedVoice) {
    const langPrefix = lang.split('-')[0].toLowerCase();
    const langVoices = availableVoices.filter((v) =>
      v.lang.toLowerCase().startsWith(langPrefix) && !LOW_QUALITY_VOICES.has(v.name)
    );
    matchedVoice =
      langVoices.find((v) => /enhanced|premium|natural|online|google/i.test(v.name)) ||
      langVoices[0];
  }

  return {
    voice: matchedVoice,
    rate: preset.rate,
    pitch: preset.pitch,
  };
}
