import {
  DEFAULT_CONTAINER,
  newItem,
  type FlexConfig,
  type FlexContainer,
  type FlexItem,
} from "./flexbox";

type ItemSeed = Partial<Omit<FlexItem, "id">>;

const make = (container: Partial<FlexContainer>, items: ItemSeed[]): FlexConfig => ({
  container: { ...DEFAULT_CONTAINER, ...container },
  items: items.map(newItem),
});

const repeat = (n: number, seed: ItemSeed): ItemSeed[] => Array.from({ length: n }, () => seed);

/** The gallery from the standalone playground, carried over as-is. */
export const presetLibrary: { name: string; hint: string; config: FlexConfig }[] = [
  {
    name: "Row wrap, space-between",
    hint: "Fixed-width cards that wrap into rows",
    config: make(
      {
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        alignContent: "flex-start",
      },
      [100, 120, 80, 150, 90, 110, 130].map((basis) => ({
        shrink: 0,
        basis: `${basis}px`,
      })),
    ),
  },
  {
    name: "Column centre, stretch",
    hint: "Stacked rows sharing height by ratio",
    config: make(
      {
        flexDirection: "column",
        flexWrap: "nowrap",
        justifyContent: "center",
        alignItems: "stretch",
      },
      [{ grow: 1 }, { grow: 2 }, { grow: 1 }],
    ),
  },
  {
    name: "Mixed grow / shrink",
    hint: "How grow and shrink fight over free space",
    config: make(
      { flexWrap: "wrap", justifyContent: "space-around", alignItems: "center", alignContent: "center" },
      [
        { grow: 1, shrink: 1, basis: "100px" },
        { grow: 0, shrink: 2, basis: "150px" },
        { grow: 3, shrink: 1, basis: "80px" },
        { grow: 1, shrink: 0, basis: "120px" },
      ],
    ),
  },
  {
    name: "Order & align-self",
    hint: "Visual order without touching the markup",
    config: make({ flexWrap: "nowrap" }, [
      { order: 2, shrink: 0, basis: "100px", alignSelf: "flex-end" },
      { order: 0, shrink: 0, basis: "100px", alignSelf: "center" },
      { order: 1, shrink: 0, basis: "100px", alignSelf: "flex-start" },
    ]),
  },
  {
    name: "Wrap-reverse, evenly",
    hint: "New lines stack upwards",
    config: make(
      {
        flexWrap: "wrap-reverse",
        justifyContent: "space-evenly",
        alignItems: "flex-end",
        alignContent: "space-between",
      },
      repeat(6, { grow: 1, basis: "100px" }),
    ),
  },
  {
    name: "Column-reverse, centred",
    hint: "Last item paints first",
    config: make(
      {
        flexDirection: "column-reverse",
        flexWrap: "nowrap",
        justifyContent: "center",
        alignItems: "center",
      },
      [{ shrink: 0, basis: "60px" }, { shrink: 0, basis: "80px" }, { shrink: 0, basis: "100px" }],
    ),
  },
  {
    name: "Baseline alignment",
    hint: "Text baselines line up, not the boxes",
    config: make({ flexWrap: "nowrap", alignItems: "baseline" }, repeat(3, { shrink: 0 })),
  },
  {
    name: "Grid-like rows",
    hint: "calc() basis for 2-up then 1/3 + 2/3",
    config: make(
      { flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-between" },
      [
        { grow: 1, basis: "calc(50% - 8px)" },
        { grow: 1, basis: "calc(50% - 8px)" },
        { grow: 1, basis: "calc(33.33% - 8px)" },
        { grow: 1, basis: "calc(66.66% - 8px)" },
      ],
    ),
  },
  {
    name: "Responsive cards",
    hint: "Grow from a 200px floor — the classic card grid",
    config: make(
      { flexWrap: "wrap", justifyContent: "center", alignItems: "center", alignContent: "center" },
      repeat(5, { grow: 1, basis: "200px" }),
    ),
  },
  {
    name: "Sidebar layout",
    hint: "Fixed rail plus a filling main column",
    config: make({ flexWrap: "nowrap", alignItems: "stretch" }, [
      { shrink: 0, basis: "150px" },
      { grow: 1 },
    ]),
  },
];
