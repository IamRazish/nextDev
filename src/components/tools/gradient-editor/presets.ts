import { newStop, type GradientConfig, type GradientType } from "./gradient";

type StopSeed = [position: number, r: number, g: number, b: number, a: number];

/**
 * Carried over from the standalone editor. The card previews there were driven
 * by a hand-written CSS string that had drifted out of sync with the stops the
 * preset actually applied, so these are rebuilt from the stops alone.
 */
const preset = (name: string, type: GradientType, angle: number, seeds: StopSeed[]) => ({
  name,
  config: {
    type,
    angle,
    radialShape: "circle" as const,
    position: "center",
    stops: seeds.map(([position, r, g, b, a]) => newStop(position, { r, g, b, a })),
    adjustments: { hue: 0, saturation: 1 },
    legacyPrefixes: false,
  } satisfies GradientConfig,
});

export const presetLibrary = [
  preset("Warm Sunset", "linear", 135, [[0, 116, 124, 253, 1], [100, 251, 78, 60, 1]]),
  preset("Cool Sky", "linear", 45, [[0, 96, 165, 250, 1], [100, 59, 130, 246, 1]]),
  preset("Emerald Forest", "linear", 90, [[0, 16, 185, 129, 1], [100, 5, 150, 105, 1]]),
  preset("Royal Purple", "radial", 0, [[0, 124, 58, 237, 1], [100, 88, 28, 135, 1]]),
  preset("Candy Floss", "linear", 225, [[0, 244, 114, 182, 1], [100, 251, 113, 133, 1]]),
  preset("Ocean Depth", "linear", 180, [[0, 2, 6, 23, 1], [100, 30, 64, 175, 1]]),
  preset("Vibrant Magenta", "radial", 0, [[0, 236, 72, 153, 1], [100, 217, 70, 239, 1]]),
  preset("Steel Gray", "linear", 90, [[0, 107, 114, 128, 1], [100, 75, 85, 99, 1]]),
  preset("Mango Tango", "linear", 45, [[0, 251, 191, 36, 1], [100, 245, 158, 11, 1]]),
  preset("Soft Peach", "linear", 270, [[0, 255, 228, 225, 1], [100, 255, 247, 237, 1]]),
  preset("Deep Space", "radial", 0, [[0, 0, 0, 0, 1], [100, 51, 65, 85, 1]]),
  preset("Spring Garden", "linear", 135, [[0, 134, 239, 172, 1], [100, 52, 211, 153, 1]]),
  preset("Blazing Fire", "linear", 90, [[0, 239, 68, 68, 1], [50, 251, 146, 60, 1], [100, 253, 224, 71, 1]]),
  preset("Misty Morning", "linear", 225, [[0, 203, 213, 225, 1], [100, 148, 163, 184, 1]]),
  preset("Cyber Neon", "linear", 45, [[0, 124, 58, 237, 1], [50, 236, 72, 153, 1], [100, 59, 130, 246, 1]]),
  preset("Soft Rose", "radial", 0, [[0, 255, 205, 205, 1], [100, 255, 182, 193, 1]]),
  preset("Arctic Ice", "linear", 180, [[0, 59, 130, 246, 1], [100, 147, 197, 253, 1]]),
  preset("Forest Path", "linear", 90, [[0, 4, 120, 87, 1], [100, 16, 185, 129, 1]]),
  preset("Golden Hour", "linear", 45, [[0, 253, 230, 138, 1], [100, 250, 204, 21, 1]]),
  preset("Midnight Glow", "radial", 0, [[0, 129, 140, 248, 1], [100, 30, 27, 75, 1]]),
];
