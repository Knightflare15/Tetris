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
    name: "Citrus",
    shortName: "Cit",
    notes: "lemon, lime, grapefruit",
    color: "#ffd15a",
    shadow: "#9f6a11",
  },
  {
    type: "O",
    value: 2,
    name: "Tree Fruit",
    shortName: "Tree",
    notes: "apple, pear, quince",
    color: "#9cbe5a",
    shadow: "#475f2a",
  },
  {
    type: "T",
    value: 3,
    name: "Stone Fruit",
    shortName: "Stone",
    notes: "peach, apricot, nectarine",
    color: "#f18a52",
    shadow: "#8c3a24",
  },
  {
    type: "S",
    value: 4,
    name: "Tropical",
    shortName: "Trop",
    notes: "mango, melon, passionfruit",
    color: "#dfb63f",
    shadow: "#7a5318",
  },
  {
    type: "Z",
    value: 5,
    name: "Red Fruit",
    shortName: "Red",
    notes: "cherry, raspberry, pomegranate",
    color: "#e44b68",
    shadow: "#7e1c39",
  },
  {
    type: "J",
    value: 6,
    name: "Blue Fruit",
    shortName: "Blue",
    notes: "blueberry, plum, boysenberry",
    color: "#7f6ad8",
    shadow: "#39296f",
  },
  {
    type: "L",
    value: 7,
    name: "Black Fruit",
    shortName: "Black",
    notes: "blackberry, prune, blackcurrant",
    color: "#6b315f",
    shadow: "#251025",
  },
];

export function familyForValue(value: number): WineFamily {
  return WINE_FAMILIES.find((family) => family.value === value) ?? WINE_FAMILIES[0];
}

export function familyForType(type: TetrominoType): WineFamily {
  return WINE_FAMILIES.find((family) => family.type === type) ?? WINE_FAMILIES[0];
}
