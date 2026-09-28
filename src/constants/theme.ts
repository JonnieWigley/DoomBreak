export type Palette = {
  background: string;
  card: string;
  border: string;
  text: string;
  subtext: string;
  accent: string; // filled buttons / badges
  onAccent: string;
  danger: string;
  warnBg: string;
  warnText: string;
};

export const light: Palette = {
  background: '#f2f2f5',
  card: '#ffffff',
  border: '#d8d8de',
  text: '#111111',
  subtext: '#666666',
  accent: '#111111',
  onAccent: '#ffffff',
  danger: '#b00020',
  warnBg: '#fff3cd',
  warnText: '#664d03',
};

export const dark: Palette = {
  background: '#0e0e10',
  card: '#1b1b1f',
  border: '#33333a',
  text: '#f2f2f5',
  subtext: '#a0a0aa',
  accent: '#f2f2f5',
  onAccent: '#111111',
  danger: '#ff6b81',
  warnBg: '#3a2f0b',
  warnText: '#ffda6a',
};
