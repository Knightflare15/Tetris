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
    color: "#f2c84b",
    shadow: "#9d6d08",
  },
  {
    type: "O",
    value: 2,
    name: "Tree Fruit",
    shortName: "Tree",
    notes: "apple, pear, quince",
    color: "#8f9f3f",
    shadow: "#4d5d21",
  },
  {
    type: "T",
    value: 3,
    name: "Stone Fruit",
    shortName: "Stone",
    notes: "peach, apricot, nectarine",
    color: "#e78346",
    shadow: "#994314",
  },
  {
    type: "S",
    value: 4,
    name: "Tropical",
    shortName: "Trop",
    notes: "mango, melon, passionfruit",
    color: "#d99928",
    shadow: "#7d4d0a",
  },
  {
    type: "Z",
    value: 5,
    name: "Red Fruit",
    shortName: "Red",
    notes: "cherry, raspberry, pomegranate",
    color: "#c7354d",
    shadow: "#781929",
  },
  {
    type: "J",
    value: 6,
    name: "Blue Fruit",
    shortName: "Blue",
    notes: "blueberry, plum, boysenberry",
    color: "#6f4aaa",
    shadow: "#392064",
  },
  {
    type: "L",
    value: 7,
    name: "Black Fruit",
    shortName: "Black",
    notes: "blackberry, prune, blackcurrant",
    color: "#4f2144",
    shadow: "#240d20",
  },
];

export function familyForValue(value: number): WineFamily {
  return WINE_FAMILIES.find((family) => family.value === value) ?? WINE_FAMILIES[0];
}

export function familyForType(type: TetrominoType): WineFamily {
  return WINE_FAMILIES.find((family) => family.type === type) ?? WINE_FAMILIES[0];
}
