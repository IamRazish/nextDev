import {
  Lato,
  Montserrat,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
  Open_Sans,
  Poppins,
  Roboto,
  Scheherazade_New,
} from "next/font/google";

/**
 * The families the text/watermark composer offers. Loaded through next/font so
 * they are self-hosted and available to the canvas renderer, which needs a real
 * family name rather than a CSS class.
 */

const openSans = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700"] });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"] });
const scheherazade = Scheherazade_New({ subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export type FontScript = "latin" | "arabic";

export type FontOption = {
  /** what the user picks in the dropdown */
  label: string;
  /** the CSS font-family list next/font generated */
  family: string;
  className: string;
  script: FontScript;
  weights: number[];
};

export const FONT_OPTIONS: FontOption[] = [
  {
    label: "Open Sans",
    family: openSans.style.fontFamily,
    className: openSans.className,
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    label: "Roboto",
    family: roboto.style.fontFamily,
    className: roboto.className,
    script: "latin",
    weights: [300, 400, 500, 700],
  },
  {
    label: "Poppins",
    family: poppins.style.fontFamily,
    className: poppins.className,
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    label: "Lato",
    family: lato.style.fontFamily,
    className: lato.className,
    script: "latin",
    weights: [300, 400, 700],
  },
  {
    label: "Montserrat",
    family: montserrat.style.fontFamily,
    className: montserrat.className,
    script: "latin",
    weights: [300, 400, 500, 600, 700],
  },
  {
    label: "Noto Nastaliq Urdu",
    family: nastaliq.style.fontFamily,
    className: nastaliq.className,
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    label: "Noto Naskh Arabic",
    family: naskh.style.fontFamily,
    className: naskh.className,
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
  {
    label: "Scheherazade New",
    family: scheherazade.style.fontFamily,
    className: scheherazade.className,
    script: "arabic",
    weights: [400, 500, 600, 700],
  },
];

export const fontsForScript = (script: FontScript) =>
  FONT_OPTIONS.filter((f) => f.script === script);

export const findFont = (label: string) =>
  FONT_OPTIONS.find((f) => f.label === label) ?? FONT_OPTIONS[0];

/** Every className, so the page that renders it pulls in all eight faces. */
export const allFontClassNames = FONT_OPTIONS.map((f) => f.className).join(" ");
