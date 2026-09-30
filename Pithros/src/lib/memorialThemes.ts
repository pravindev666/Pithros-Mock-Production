export type MemorialThemeId =
  | 'classic'
  | 'ivory'
  | 'midnight'
  | 'heritage'
  | 'garden'
  | 'monument';

export interface MemorialThemeDefinition {
  id: MemorialThemeId;
  name: string;
  tagline: string;
  isPremium: boolean;
  tierRequired: 'Free' | 'Memorial Care';
  previewColor: string;
  accentColor: string;
  bgDark: string;
  bgLight: string;
  cardBgDark: string;
  cardBgLight: string;
  borderDark: string;
  borderLight: string;
  textDark: string;
  textLight: string;
  subtextDark: string;
  subtextLight: string;
  accentDark: string;
  accentLight: string;
  glowColor: string;
  fontClass: string;
  dividerStyle: string;
}

export const MEMORIAL_THEMES: Record<MemorialThemeId, MemorialThemeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Classic Dignity',
    tagline: 'Timeless warm gold, obsidian, and dignified navy',
    isPremium: false,
    tierRequired: 'Free',
    previewColor: '#B99452',
    accentColor: '#B99452',
    bgDark: 'bg-[#111820]',
    bgLight: 'bg-[#F3EEE4]',
    cardBgDark: 'bg-[#182337]',
    cardBgLight: 'bg-[#FCFAF5]',
    borderDark: 'border-[#202C40]',
    borderLight: 'border-[#E5DED2]',
    textDark: 'text-[#F8F5EE]',
    textLight: 'text-[#20242A]',
    subtextDark: 'text-[#9EA3AA]',
    subtextLight: 'text-[#554F48]',
    accentDark: 'text-[#B99452]',
    accentLight: 'text-[#23324A]',
    glowColor: 'rgba(185, 148, 82, 0.15)',
    fontClass: 'font-serif',
    dividerStyle: 'border-t border-[#B99452]/20',
  },
  ivory: {
    id: 'ivory',
    name: 'Ivory & Parchment',
    tagline: 'Warm alabaster, cream parchment, and gilded bronze',
    isPremium: true,
    tierRequired: 'Memorial Care',
    previewColor: '#C5A880',
    accentColor: '#C5A880',
    bgDark: 'bg-[#15120E]',
    bgLight: 'bg-[#FAF6EE]',
    cardBgDark: 'bg-[#1E1914]',
    cardBgLight: 'bg-[#FFFFFF]',
    borderDark: 'border-[#332A20]',
    borderLight: 'border-[#E8DFD0]',
    textDark: 'text-[#FAF5EE]',
    textLight: 'text-[#2C241B]',
    subtextDark: 'text-[#B5A898]',
    subtextLight: 'text-[#6E6356]',
    accentDark: 'text-[#D6BA92]',
    accentLight: 'text-[#8E6C40]',
    glowColor: 'rgba(214, 186, 146, 0.18)',
    fontClass: 'font-serif',
    dividerStyle: 'border-t border-[#C5A880]/30',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Constellation',
    tagline: 'Deep cosmic obsidian with radiant starlight indigo',
    isPremium: true,
    tierRequired: 'Memorial Care',
    previewColor: '#60A5FA',
    accentColor: '#3B82F6',
    bgDark: 'bg-[#080B12]',
    bgLight: 'bg-[#EEF3F8]',
    cardBgDark: 'bg-[#0F1728]',
    cardBgLight: 'bg-[#FFFFFF]',
    borderDark: 'border-[#1E2E4A]',
    borderLight: 'border-[#D4E0EC]',
    textDark: 'text-[#F1F5F9]',
    textLight: 'text-[#0F172A]',
    subtextDark: 'text-[#94A3B8]',
    subtextLight: 'text-[#475569]',
    accentDark: 'text-[#60A5FA]',
    accentLight: 'text-[#2563EB]',
    glowColor: 'rgba(96, 165, 250, 0.18)',
    fontClass: 'font-sans',
    dividerStyle: 'border-t border-[#3B82F6]/30',
  },
  heritage: {
    id: 'heritage',
    name: 'Regal Heritage',
    tagline: 'Deep antique mahogany, imperial crimson, and warm brass',
    isPremium: true,
    tierRequired: 'Memorial Care',
    previewColor: '#C45143',
    accentColor: '#D4AF37',
    bgDark: 'bg-[#170E0C]',
    bgLight: 'bg-[#FAF2EE]',
    cardBgDark: 'bg-[#231513]',
    cardBgLight: 'bg-[#FFF9F6]',
    borderDark: 'border-[#3D221D]',
    borderLight: 'border-[#EADAD5]',
    textDark: 'text-[#FBF5F3]',
    textLight: 'text-[#2D1A17]',
    subtextDark: 'text-[#BCA39F]',
    subtextLight: 'text-[#70524E]',
    accentDark: 'text-[#E07A5F]',
    accentLight: 'text-[#9E2A2B]',
    glowColor: 'rgba(196, 81, 67, 0.16)',
    fontClass: 'font-serif',
    dividerStyle: 'border-t-2 border-[#D4AF37]/30',
  },
  garden: {
    id: 'garden',
    name: 'Eternal Garden',
    tagline: 'Quiet botanical sage, cypress, and peaceful sanctuary',
    isPremium: true,
    tierRequired: 'Memorial Care',
    previewColor: '#528E6E',
    accentColor: '#2D6A4F',
    bgDark: 'bg-[#0C1612]',
    bgLight: 'bg-[#F2F7F4]',
    cardBgDark: 'bg-[#13221C]',
    cardBgLight: 'bg-[#FFFFFF]',
    borderDark: 'border-[#1E352B]',
    borderLight: 'border-[#D3E3DA]',
    textDark: 'text-[#F0F6F2]',
    textLight: 'text-[#182B22]',
    subtextDark: 'text-[#96ACA0]',
    subtextLight: 'text-[#4D6558]',
    accentDark: 'text-[#74A88C]',
    accentLight: 'text-[#2D6A4F]',
    glowColor: 'rgba(82, 142, 110, 0.16)',
    fontClass: 'font-serif',
    dividerStyle: 'border-t border-[#528E6E]/30',
  },
  monument: {
    id: 'monument',
    name: 'Architectural Monument',
    tagline: 'Carved slate granite, timeless marble, and sterling silver',
    isPremium: true,
    tierRequired: 'Memorial Care',
    previewColor: '#94A3B8',
    accentColor: '#64748B',
    bgDark: 'bg-[#111418]',
    bgLight: 'bg-[#F1F4F7]',
    cardBgDark: 'bg-[#1A1F26]',
    cardBgLight: 'bg-[#FFFFFF]',
    borderDark: 'border-[#29323E]',
    borderLight: 'border-[#D9E1E8]',
    textDark: 'text-[#F8FAFC]',
    textLight: 'text-[#1E293B]',
    subtextDark: 'text-[#94A3B8]',
    subtextLight: 'text-[#475569]',
    accentDark: 'text-[#CBD5E1]',
    accentLight: 'text-[#475569]',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    fontClass: 'font-serif',
    dividerStyle: 'border-t border-[#94A3B8]/30',
  },
};

export const getThemeConfig = (themeId?: string): MemorialThemeDefinition => {
  if (themeId && themeId in MEMORIAL_THEMES) {
    return MEMORIAL_THEMES[themeId as MemorialThemeId];
  }
  return MEMORIAL_THEMES.classic;
};
