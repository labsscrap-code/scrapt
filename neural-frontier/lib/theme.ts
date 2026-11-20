export type Accent = "blue" | "amber";

export interface AccentPalette {
  primary: string;
  mid: string;
  soft: string;
  rgb: [number, number, number];
  softRgb: [number, number, number];
}

/** Hex colours used by the HTML5 canvas (which cannot read Tailwind classes). */
export const ACCENT_HEX: Record<Accent, AccentPalette> = {
  blue: {
    primary: "#3B82F6",
    mid: "#38BDF8",
    soft: "#22D3EE",
    rgb: [59, 130, 246],
    softRgb: [34, 211, 238],
  },
  amber: {
    primary: "#F59E0B",
    mid: "#FBBF24",
    soft: "#FCD34D",
    rgb: [245, 158, 11],
    softRgb: [252, 211, 77],
  },
};
