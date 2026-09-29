// Brand color helpers: pick readable text colors and derive the theme tokens
// the templates use (see templates/base/styles/global.css).

function parse(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function luminance(hex) {
  const [r, g, b] = parse(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function mix(a, b, amount) {
  const [x, y] = [parse(a), parse(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * amount));
}

// Black or white text, whichever reads better on `bg`.
export function textOn(bg) {
  return contrast(bg, '#0b0b0f') >= contrast(bg, '#ffffff') ? '#0b0b0f' : '#ffffff';
}

// Nudge `fg` toward black or white until it reaches `min` contrast on `bg`,
// so a client's light-yellow brand color still gives readable links.
export function ensureContrast(fg, bg, min = 4.5) {
  const target = luminance(bg) > 0.4 ? '#000000' : '#ffffff';
  for (let i = 0; i <= 20; i++) {
    const c = mix(fg, target, i / 20);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
}

const PALETTES = {
  light: { bg: '#ffffff', surface: '#f5f6f8', ink: '#0f172a', muted: '#475569', line: '#e2e8f0' },
  dark: { bg: '#0a0a0c', surface: '#141418', ink: '#f4f4f5', muted: '#a1a1aa', line: '#26262c' },
};

export function themeTokens({ primary, accent, theme }) {
  const p = PALETTES[theme];
  return {
    ...p,
    primary,
    'on-primary': textOn(primary),
    accent,
    'on-accent': textOn(accent),
    // Text-safe versions of the brand colors for links, prices and icons
    // (checked against the card color, the harder of the two backgrounds).
    link: ensureContrast(primary, p.surface),
    'accent-text': ensureContrast(accent, p.surface),
    // Keyboard focus ring: needs 3:1 against the page (WCAG 1.4.11).
    focus: ensureContrast(accent, p.bg, 3),
  };
}
