import { newStripe, type StripeConfig } from "./stripes";

const preset = (angle: number, stripes: [string, number][]): StripeConfig => ({
  angle,
  stripes: stripes.map(([color, width]) => newStripe(color, width)),
});

/** Carried over from the standalone tool, plus a few extra classics. */
export const presetLibrary: { name: string; config: StripeConfig }[] = [
  { name: "Candy", config: preset(45, [["#e66465", 20], ["#9198e5", 20]]) },
  { name: "Warning", config: preset(45, [["#111827", 18], ["#facc15", 18]]) },
  { name: "Awning", config: preset(90, [["#4caf50", 25], ["#ffffff", 25]]) },
  { name: "Barber", config: preset(60, [["#ff9800", 15], ["#ffffff", 15], ["#ff9800", 15]]) },
  { name: "Ink", config: preset(135, [["#000000", 10], ["#f0f0f0", 10]]) },
  { name: "Mint", config: preset(25, [["#00bcd4", 12], ["#eeeeee", 8]]) },
  { name: "Cocoa", config: preset(75, [["#795548", 18], ["#ffeb3b", 12]]) },
  { name: "Hairline", config: preset(0, [["#1f2937", 1], ["transparent", 7]]) },
  { name: "Sunset", config: preset(160, [["#f97316", 14], ["#db2777", 14], ["#7c3aed", 14]]) },
  { name: "Blueprint", config: preset(90, [["#1d4ed8", 2], ["#dbeafe", 22]]) },
];
