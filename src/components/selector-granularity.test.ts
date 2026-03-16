/**
 * Static analysis tests that enforce granular useSelector patterns.
 *
 * These tests grep component source files to ensure no broad selectors
 * (state.public or state) are used, which cause unnecessary re-renders.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_DIR = join(__dirname);

/** Read a component file and return its lines */
function readComponent(filename: string): string[] {
  return readFileSync(join(COMPONENTS_DIR, filename), "utf-8").split("\n");
}

/**
 * Find lines with broad useSelector patterns.
 * Catches any parameter name (state, s, st, etc.) returning the whole
 * public context or entire state, e.g.:
 *   useSelector((state) => state.public)
 *   useSelector((s) => s.public)
 *   useSelector(s => s)
 */
function findBroadSelectors(lines: string[]): Array<{ line: number; text: string }> {
  const broadPatterns = [
    // Matches: useSelector((anyName) => anyName.public) — with no further property access
    /useSelector\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\.public\s*[),]/,
    // Matches: useSelector((anyName) => anyName) — returning whole state
    /useSelector\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\s*[),]/,
  ];

  return lines.reduce<Array<{ line: number; text: string }>>((acc, text, i) => {
    if (broadPatterns.some((p) => p.test(text))) {
      acc.push({ line: i + 1, text: text.trim() });
    }
    return acc;
  }, []);
}

describe("selector granularity", () => {
  const files = [
    "host-view.tsx",
    "player-view.tsx",
    "spectator-view.tsx",
    "player-join.tsx",
    "scoreboard.tsx",
    "player-results.tsx",
  ];

  for (const file of files) {
    it(`${file} has no broad useSelector calls`, () => {
      const lines = readComponent(file);
      const violations = findBroadSelectors(lines);
      expect(violations, `Broad selectors found in ${file}:\n${violations.map((v) => `  L${v.line}: ${v.text}`).join("\n")}`).toHaveLength(0);
    });
  }
});
