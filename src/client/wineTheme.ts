import type { TetrominoType } from "../shared/types";

export interface WineFamily {
  type: TetrominoType;
  value: number;
  name: string;
  notes: string;
  shortName: string;
  color: string;
  shadow: string;
}

export const WINE_FAMILIES: WineFamily[] = [
  {
    type: "I",
    value: 1,
    name: "Cyan",
    shortName: "Cyn",
    notes: "long stretch cat",
    color: "#48c7e8",
    shadow: "#1f7192",
  },
  {
    type: "O",
    value: 2,
    name: "Yellow",
    shortName: "Yel",
    notes: "curled nap cat",
    color: "#f3cd46",
    shadow: "#a97315",
  },
  {
    type: "T",
    value: 3,
    name: "Purple",
    shortName: "Purp",
    notes: "pounce pose cat",
    color: "#a16ce3",
    shadow: "#583085",
  },
  {
    type: "S",
    value: 4,
    name: "Green",
    shortName: "Grn",
    notes: "slinky step cat",
    color: "#6fc769",
    shadow: "#337a38",
  },
  {
    type: "Z",
    value: 5,
    name: "Red",
    shortName: "Red",
    notes: "zigzag zoom cat",
    color: "#e4565b",
    shadow: "#8a252e",
  },
  {
    type: "J",
    value: 6,
    name: "Blue",
    shortName: "Blue",
    notes: "hook tail cat",
    color: "#4d81df",
    shadow: "#284780",
  },
  {
    type: "L",
    value: 7,
    name: "Orange",
    shortName: "Org",
    notes: "corner loaf cat",
    color: "#f08a3d",
    shadow: "#9d4920",
  },
];

export function familyForValue(value: number): WineFamily {
  return WINE_FAMILIES.find((family) => family.value === value) ?? WINE_FAMILIES[0];
}

export function familyForType(type: TetrominoType): WineFamily {
  return WINE_FAMILIES.find((family) => family.type === type) ?? WINE_FAMILIES[0];
}
