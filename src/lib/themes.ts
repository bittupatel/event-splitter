export const THEMES = {
  lantern: { label: 'Lantern Night', blurb: 'Glowing skies and late-night chats' },
  colorburst: { label: 'Color Burst', blurb: 'Powder clouds and loud laughter' },
  twirl: { label: 'Twirl Circle', blurb: 'Dance rings and drum beats' },
  fair: { label: 'Fairground', blurb: 'Big wheels, bunting and snacks' },
  kites: { label: 'Kite Sky', blurb: 'Rooftop winds and tangled strings' },
  marigold: { label: 'Marigold Gala', blurb: 'Garlands, gold and green' },
} as const;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const asTheme = (t: string | null | undefined): ThemeKey =>
  t && t in THEMES ? (t as ThemeKey) : 'lantern';
