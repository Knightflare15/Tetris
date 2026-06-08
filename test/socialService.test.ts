import { describe, expect, it } from "vitest";
import { calculateTerritoryElo } from "../src/server/socialService";

describe("territory elo", () => {
  it("moves equal-rated players by the standard K-factor split", () => {
    expect(calculateTerritoryElo(1200, 1200, "A")).toEqual({ nextA: 1216, nextB: 1184 });
    expect(calculateTerritoryElo(1200, 1200, "draw")).toEqual({ nextA: 1200, nextB: 1200 });
  });

  it("rewards an upset more than an expected win", () => {
    const upset = calculateTerritoryElo(1000, 1400, "A");
    const expected = calculateTerritoryElo(1400, 1000, "A");

    expect(upset.nextA - 1000).toBeGreaterThan(expected.nextA - 1400);
    expect(1400 - upset.nextB).toBeGreaterThan(1000 - expected.nextB);
  });
});
