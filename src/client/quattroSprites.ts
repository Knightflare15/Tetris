import type { CellValue, TetrominoType } from "../shared/types";

export interface ShapeCell {
  x: number;
  y: number;
}

export interface SpriteLookup {
  blockCount: number;
  shapeKey: string;
  shapeAlias: string | null;
  colorName: SpriteColorName;
  path: string | null;
}

export interface PieceVisual {
  pieceId: string;
}

const SPRITE_ROOT = "/assets/quattro/sprites";
export const QUATTRO_SPRITE_LOAD_EVENT = "quattro-sprite-load";
export type SpriteColorName = "cyan" | "yellow" | "purple" | "green" | "red" | "blue" | "orange";

const VALUE_COLORS: Record<Exclude<CellValue, 0>, SpriteColorName> = {
  1: "cyan",
  2: "yellow",
  3: "purple",
  4: "green",
  5: "red",
  6: "blue",
  7: "orange",
};

export const TYPE_COLORS: Record<TetrominoType, SpriteColorName> = {
  I: "cyan",
  O: "yellow",
  T: "purple",
  S: "green",
  Z: "red",
  J: "blue",
  L: "orange",
};

const SHAPE_ALIASES: Record<string, string> = {
  "1": "I",

  "11": "I_horizontal",
  "1/1": "I_vertical",

  "111": "I_horizontal",
  "1/1/1": "I_vertical",
  "10/11": "J",
  "01/11": "L",
  "11/10": "L_reverse",
  "11/01": "J_reverse",

  "1111": "I_horizontal",
  "1/1/1/1": "I_vertical",
  "11/11": "O",
  "010/111": "T",
  "10/11/10": "T_right",
  "111/010": "T_down",
  "01/11/01": "T_left",
  "011/110": "S",
  "10/11/01": "S_vertical",
  "110/011": "Z",
  "01/11/10": "Z_vertical",
  "100/111": "J",
  "11/10/10": "J_right",
  "111/001": "J_down",
  "01/01/11": "J_left",
  "001/111": "L",
  "10/10/11": "L_right",
  "111/100": "L_down",
  "11/01/01": "L_left",
};

const imageCache = new Map<string, HTMLImageElement | null>();

export function connectedComponents(cells: ShapeCell[]): ShapeCell[][] {
  const remaining = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const components: ShapeCell[][] = [];

  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    if (!first) {
      break;
    }

    const component: ShapeCell[] = [];
    const queue = [first];
    remaining.delete(cellKey(first));

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      component.push(current);

      for (const neighbor of neighborsFor(current)) {
        const key = cellKey(neighbor);
        const next = remaining.get(key);
        if (next) {
          remaining.delete(key);
          queue.push(next);
        }
      }
    }

    components.push(component);
  }

  return components;
}

export function groupByPieceId<T extends { visual: PieceVisual }>(cells: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const cell of cells) {
    const group = groups.get(cell.visual.pieceId) ?? [];
    group.push(cell);
    groups.set(cell.visual.pieceId, group);
  }
  return [...groups.values()];
}

export function normalizeShapeKey(cells: ShapeCell[]): string {
  if (cells.length === 0) {
    return "";
  }

  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const normalized = cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
  const width = Math.max(...normalized.map((cell) => cell.x)) + 1;
  const height = Math.max(...normalized.map((cell) => cell.y)) + 1;
  const occupied = new Set(normalized.map(cellKey));

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (occupied.has(`${x}:${y}`) ? "1" : "0")).join(""),
  ).join("/");
}

export function spriteLookupForCells(cells: ShapeCell[], value: CellValue): SpriteLookup {
  return spriteLookupForCellsWithColor(cells, colorForValue(value));
}

export function spriteLookupForCellsWithColor(cells: ShapeCell[], colorName: SpriteColorName): SpriteLookup {
  const blockCount = cells.length;
  const shapeKey = normalizeShapeKey(cells);
  const shapeAlias = SHAPE_ALIASES[shapeKey] ?? null;
  return {
    blockCount,
    shapeKey,
    shapeAlias,
    colorName,
    path: shapeAlias ? `${SPRITE_ROOT}/${blockCount}Block/${shapeAlias}_block_${colorName}.png` : null,
  };
}

export function spriteLookupForType(cells: ShapeCell[], type: TetrominoType): SpriteLookup {
  const lookup = spriteLookupForCells(cells, 1);
  const colorName = TYPE_COLORS[type];
  return {
    ...lookup,
    colorName,
    path: lookup.shapeAlias ? `${SPRITE_ROOT}/${lookup.blockCount}Block/${lookup.shapeAlias}_block_${colorName}.png` : null,
  };
}

export function imageForSprite(path: string): HTMLImageElement | null {
  if (imageCache.has(path)) {
    return imageCache.get(path) ?? null;
  }

  const image = new Image();
  image.onload = () => {
    imageCache.set(path, image);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(QUATTRO_SPRITE_LOAD_EVENT));
    }
  };
  image.onerror = () => {
    imageCache.set(path, null);
  };
  image.src = path;
  imageCache.set(path, image);
  return image;
}

function colorForValue(value: CellValue): SpriteColorName {
  if (value === 0) {
    return "cyan";
  }
  return VALUE_COLORS[value];
}

function neighborsFor(cell: ShapeCell): ShapeCell[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];
}

function cellKey(cell: ShapeCell): string {
  return `${cell.x}:${cell.y}`;
}
