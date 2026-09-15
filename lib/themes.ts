import { GlassTheme } from '@/types';

export interface ThemeOption {
  id: GlassTheme;
  name: string;
  badge: { en: string; tr: string; de: string };
  desc: { en: string; tr: string; de: string };
  previewBg: string;
  previewBorder: string;
}

export const GLASS_THEMES: ThemeOption[] = [
  {
    id: 'sonoma',
    name: 'macOS Sonoma Glass',
    badge: { en: 'Apple Default', tr: 'Apple Varsayılan', de: 'Apple Standard' },
    desc: {
      en: 'Soft translucent frosted glass with vibrant reflections and balanced contrast.',
      tr: 'Yumuşak yarı-saydam cam dokusu, canlı yansımalar ve dengeli kontrast.',
      de: 'Sanftes, mattes Milchglas mit lebendigen Reflexionen und ausgewogenem Kontrast.',
    },
    previewBg: 'rgba(255, 255, 255, 0.06)',
    previewBorder: 'rgba(255, 255, 255, 0.12)',
  },
  {
    id: 'carbon',
    name: 'Apple Pro Carbon',
    badge: { en: 'High Contrast', tr: 'Yüksek Kontrast', de: 'Hoher Kontrast' },
    desc: {
      en: 'Dark space gray with matte carbon texture and crisp detail accents.',
      tr: 'Koyu uzay grisi, mat karbon hissi ve belirgin detay çizgileri.',
      de: 'Dunkles Space Grau mit matter Carbon-Textur und scharfen Detail-Akzenten.',
    },
    previewBg: '#121214',
    previewBorder: 'rgba(255, 255, 255, 0.16)',
  },
  {
    id: 'obsidian',
    name: 'Cupertino Obsidian',
    badge: { en: 'Pure Dark', tr: 'Saf Karanlık', de: 'Reines Schwarz' },
    desc: {
      en: 'Pure OLED true black background, ultra-fine micro borders and zero eye strain.',
      tr: 'Simsiyah OLED arka plan, ultra ince mikro kenarlıklar ve sıfır göz yorgunluğu.',
      de: 'Reiner OLED-Schwarz-Hintergrund, ultrafeine Mikroränder und ermüdungsfreies Arbeiten.',
    },
    previewBg: '#050507',
    previewBorder: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'cyber',
    name: 'Cyber Glow Glass',
    badge: { en: 'Neon Glow', tr: 'Neon Işık', de: 'Neon-Leuchten' },
    desc: {
      en: 'Cybersecurity & dev-focused neon cyan & purple edge ambient lighting.',
      tr: 'Siber güvenlik ve geliştirici odaklı neon cyan & mor kenar ışıkları.',
      de: 'Cybersecurity- und Entwickler-Fokus mit Neon-Cyan- und Lila-Randbeleuchtung.',
    },
    previewBg: 'rgba(15, 23, 42, 0.75)',
    previewBorder: 'rgba(6, 182, 212, 0.3)',
  },
  {
    id: 'nordic',
    name: 'Nordic Titanium',
    badge: { en: 'Titanium & Amber', tr: 'Titanyum & Amber', de: 'Titan & Bernstein' },
    desc: {
      en: 'Natural titanium gray with warm amber accents and minimalist Scandinavian aesthetics.',
      tr: 'Doğal titanyum grisi ve sıcak amber vurgularla minimalist İskandinav estetiği.',
      de: 'Natürliches Titangrau mit warmen Bernstein-Akzenten und minimalistischer nordischer Ästhetik.',
    },
    previewBg: 'rgba(30, 41, 59, 0.7)',
    previewBorder: 'rgba(245, 158, 11, 0.25)',
  },
];
