import { describe, expect, it } from "vitest";
import {
  connectedComponents,
  groupByPieceId,
  normalizeShapeKey,
  spriteLookupForCells,
  spriteLookupForCellsWithColor,
} from "../src/client/quattroSprites";

describe("Quattro sprite shape helpers", () => {
  it("normalizes connected fragments into stable shape keys", () => {
    expect(normalizeShapeKey([{ x: 8, y: 20 }])).toBe("1");
    expect(normalizeShapeKey([{ x: 8, y: 20 }, { x: 9, y: 20 }])).toBe("11");
    expect(normalizeShapeKey([{ x: 8, y: 20 }, { x: 8, y: 21 }])).toBe("1/1");
    expect(normalizeShapeKey([{ x: 5, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 5 }])).toBe("11/01");
  });

  it("resolves sprite aliases and color-specific runtime paths", () => {
    expect(spriteLookupForCells([{ x: 0, y: 0 }], 1)).toMatchObject({
      blockCount: 1,
      shapeAlias: "I",
      colorName: "cyan",
      path: "/assets/quattro/sprites/1Block/I_block_cyan.png",
    });

    expect(spriteLookupForCells(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      5,
    )).toMatchObject({
      blockCount: 4,
      shapeAlias: "Z",
      colorName: "red",
      path: "/assets/quattro/sprites/4Block/Z_block_red.png",
    });

    expect(spriteLookupForCellsWithColor([{ x: 4, y: 8 }], "orange")).toMatchObject({
      colorName: "orange",
      path: "/assets/quattro/sprites/1Block/I_block_orange.png",
    });
  });

  it("splits disconnected survivor fragments", () => {
    const components = connectedComponents([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 3, y: 0 },
    ]);

    expect(components.map((component) => component.length).sort()).toEqual([1, 2]);
  });

  it("keeps adjacent fragments from different locked pieces separate", () => {
    const groups = groupByPieceId([
      { x: 0, y: 0, visual: { pieceId: "first" } },
      { x: 1, y: 0, visual: { pieceId: "second" } },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group[0].visual.pieceId).sort()).toEqual(["first", "second"]);
  });
});
