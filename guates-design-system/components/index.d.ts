import type * as React from 'react';

/** Palette token names (brandbook HEX values). */
export type PaletteToken =
  | 'naranja-tostion' | 'cafe-de-origen' | 'sol-de-sabana' | 'verde-moriche' | 'azul-exploracion' | 'cereza-profunda'
  | 'atardecer-llanero' | 'crema-de-papel' | 'luz-de-manana' | 'verde-brote' | 'cielo-abierto' | 'rosa-floracion';
/** Any colour token: palette, single-ink logo colours, or themed semantic tokens. */
export type ColorToken = PaletteToken | 'negro' | 'blanco' | 'surface' | 'ink' | 'ink-body' | 'ink-muted' | 'accent' | 'on-accent' | 'focus';
export type IllustrationName = 'perezoso' | 'mono' | 'chiguiro' | 'colibri' | 'erizo' | 'garza' | 'nutria' | 'pajaro' | 'cafetera' | 'granos';
export type PatternName = 'cruces' | 'formas' | 'franjas';
export type ProductKey = 'regional' | 'lavado' | 'natural' | 'honey' | 'platea';

export interface LogoProps {
  version?: 'principal' | 'secundario' | 'alternativo';
  /** Ink token. Default `ink`. */
  color?: ColorToken;
  /** Background token; picks the first approved logo colour for it when `color` is absent. */
  on?: PaletteToken;
  /** Artwork height in px. Default 120 (principal, secundario) or 48 (alternativo). */
  height?: number;
  width?: number;
  /** Adds the ¼-G protection area on every side. */
  clearSpace?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): React.ReactElement;

export interface IllustrationProps {
  name?: IllustrationName;
  color?: ColorToken;
  /** Square size in px. Default 160. */
  size?: number;
  /** Token for a rounded die-cut blob behind the drawing. */
  sticker?: ColorToken;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Illustration(props: IllustrationProps): React.ReactElement;

export interface PatternProps {
  name?: PatternName;
  width?: number | string;
  height?: number | string;
  fit?: 'slice' | 'meet';
  className?: string;
  style?: React.CSSProperties;
}
export declare function Pattern(props: PatternProps): React.ReactElement;

export interface ColorBlockProps extends React.HTMLAttributes<HTMLElement> {
  tone?: PaletteToken;
  ink?: ColorToken;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}
export declare function ColorBlock(props: ColorBlockProps): React.ReactElement;

export interface VoiceTagProps {
  tone?: PaletteToken;
  ink?: ColorToken;
  /** Degrees. Default -2. */
  tilt?: number;
  /** `sm` (20px) needs 4.5:1 and falls back to `md` (24px) when the pair is lower. */
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function VoiceTag(props: VoiceTagProps): React.ReactElement;

export interface SectionMarkerProps {
  /** Strong colour of the star; numeral and title take its light partner. */
  family?: 'naranja-tostion' | 'cafe-de-origen' | 'sol-de-sabana' | 'verde-moriche' | 'azul-exploracion' | 'cereza-profunda';
  number?: string;
  title?: string;
  color?: ColorToken;
  /** Star height in px. Default 96. */
  size?: number;
  align?: 'end' | 'start';
  className?: string;
  style?: React.CSSProperties;
}
export declare function SectionMarker(props: SectionMarkerProps): React.ReactElement;

export interface OriginLabelProps {
  product?: ProductKey;
  name?: string;
  producer?: string;
  origin?: string;
  farm?: string;
  variety?: string;
  process?: string;
  /** 1-5. Omit to print all five beans; no rating is announced. */
  roast?: number;
  grind?: 'fina' | 'media' | 'gruesa';
  tone?: PaletteToken;
  ink?: ColorToken;
  titleColor?: ColorToken;
  illustration?: IllustrationName | null;
  illustrationColor?: ColorToken;
  seal?: boolean;
  /** `print` reproduces the physical label; `screen` puts the details in café on crema; `auto` (default) picks `screen` when the label's text pair is under 4.5:1. */
  variant?: 'auto' | 'print' | 'screen';
  /** px. Default 380. */
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}
export declare function OriginLabel(props: OriginLabelProps): React.ReactElement;

export interface RoastScaleProps {
  /** 0-5. Omit to show the printed row without announcing a rating. */
  level?: number;
  max?: number;
  size?: number;
  color?: ColorToken;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function RoastScale(props: RoastScaleProps): React.ReactElement;

export interface SealProps {
  size?: number;
  ring?: ColorToken;
  ink?: ColorToken;
  bean?: ColorToken;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Seal(props: SealProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  /** Renders an anchor styled as a button. */
  href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface PaletteEntry { key: PaletteToken; name: string; hex: string; rgb: string; cmyk: string; pantoneC: string | null; pantoneU: string | null }
export interface ProductPreset { name: string; producer: string; origin: string; farm: string; variety: string; process: string; label: PaletteToken; title: PaletteToken; ink: PaletteToken; art: IllustrationName; artInk: PaletteToken; bag: PaletteToken; bagArt: IllustrationName }

declare global {
  interface Window {
    Guates: {
      Logo: typeof Logo; Illustration: typeof Illustration; Pattern: typeof Pattern; ColorBlock: typeof ColorBlock;
      VoiceTag: typeof VoiceTag; SectionMarker: typeof SectionMarker; OriginLabel: typeof OriginLabel;
      RoastScale: typeof RoastScale; Seal: typeof Seal; Button: typeof Button;
      palette: PaletteEntry[];
      families: { strong: PaletteToken; light: PaletteToken }[];
      /** Brandbook-approved text inks per background, sorted by WCAG contrast. */
      textPairs: Record<PaletteToken, { ink: PaletteToken; ratio: number }[]>;
      /** Inks the brandbook shows as incorrect on each background. */
      textAvoid: Record<PaletteToken, PaletteToken[]>;
      /** Logo colours the brandbook shows on each background. */
      logoPairs: Record<PaletteToken, PaletteToken[]>;
      voice: { word: string; tone: PaletteToken; ink: PaletteToken }[];
      products: Record<ProductKey, ProductPreset>;
      illustrations: { name: IllustrationName; label: string }[];
      patterns: PatternName[];
      inkFor(background: PaletteToken, purpose?: 'text' | 'logo'): ColorToken;
      contrast(a: PaletteToken | string, b: PaletteToken | string): number;
    };
  }
}
