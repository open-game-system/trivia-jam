/**
 * Static analysis tests for selector render-count hygiene.
 *
 * These complement selector-granularity.test.ts by verifying:
 * - Score-displaying components do not also select timer/question fields
 * - Timer-related components do not also select player list fields
 * - No single component selects more than 5 fields (sign of doing too much)
 * - Each useSelector call targets a specific leaf field, not a whole sub-object
 *   (e.g. `state.public.settings.answerTimeWindow` is fine;
 *    `state.public.settings` is a broad sub-object selector)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_DIR = join(__dirname);

/** Read a component file and return its source text */
function readComponent(filename: string): string {
  return readFileSync(join(COMPONENTS_DIR, filename), "utf-8");
}

/**
 * Extract all useSelector calls from a source string, grouped by the
 * nearest enclosing named block (const/function declaration above the call).
 *
 * Returns a map of { componentName -> [extracted field paths] }.
 * A field path is the portion after `state.public.` (or `state.public`
 * itself if nothing follows).
 */
function extractSelectorsByComponent(
  source: string
): Map<string, string[]> {
  const lines = source.split("\n");
  const result = new Map<string, string[]>();

  // Track the current component/function/hook name by scanning for
  // `const Foo = ` or `function Foo(` or `export const Foo` or `const useFoo = ` declarations.
  // Includes both PascalCase (components) and camelCase hooks (useXxx).
  const componentDeclPattern =
    /^(?:export\s+)?(?:const|function)\s+([A-Za-z][A-Za-z0-9_]*)/;

  let currentComponent = "<module>";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Update current component when we hit a top-level declaration that
    // starts with an uppercase letter (React component convention).
    const declMatch = line.match(componentDeclPattern);
    if (declMatch) {
      currentComponent = declMatch[1];
    }

    // Match useSelector on this line.
    // Handles both single-line and multi-line selectors by looking at this
    // line and the next (multi-line selectors typically have the field access
    // on the following line when the arrow spans two lines).
    const selectorMatch = line.match(/useSelector\(/);
    if (!selectorMatch) continue;

    // Collect the rest of the selector expression (up to 3 lines ahead) to
    // handle multi-line cases like:
    //   GameContext.useSelector((state) => {
    //     const results = state.public.questionResults;
    //     return results[results.length - 1];
    //   });
    const window = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");

    // Extract what comes after `state.public.` — could be a chained path
    // like `settings.answerTimeWindow` or just a top-level key like `players`.
    const fieldMatches = [
      ...window.matchAll(/state\.public\.([A-Za-z][A-Za-z0-9_.]*)/g),
    ];

    // If no field path is found but `state.public` is referenced, record it
    // as a bare sub-object selector.
    const fields: string[] =
      fieldMatches.length > 0
        ? fieldMatches.map((m) => m[1])
        : window.includes("state.public")
        ? ["<public>"]
        : ["<session>"];

    if (!result.has(currentComponent)) {
      result.set(currentComponent, []);
    }
    result.get(currentComponent)!.push(...fields);
  }

  return result;
}

/**
 * Count distinct top-level `state.public.*` fields selected inside a
 * component.  `settings.answerTimeWindow` and `settings.maxPlayers` both
 * count as one field ("settings").  This gives a realistic measure of how
 * much of the public context a component depends on.
 */
function topLevelFields(fields: string[]): string[] {
  const seen = new Set<string>();
  for (const f of fields) {
    seen.add(f.split(".")[0]);
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// Score-displaying components
// ---------------------------------------------------------------------------

const SCORE_DISPLAY_COMPONENTS = [
  // player-view: GameFinishedDisplay shows sorted player scores
  { file: "player-view.tsx", component: "GameFinishedDisplay" },
  // spectator-view: GameFinishedDisplay shows final scores
  { file: "spectator-view.tsx", component: "GameFinishedDisplay" },
  // Standalone scoreboard
  { file: "scoreboard.tsx", component: "Scoreboard" },
];

describe("score-displaying components selector isolation", () => {
  const TIMER_FIELDS = ["currentQuestion", "settings", "questionNumber"];

  for (const { file, component } of SCORE_DISPLAY_COMPONENTS) {
    it(`${file} / ${component} does not select timer or active-question fields`, () => {
      const source = readComponent(file);
      const byComponent = extractSelectorsByComponent(source);
      const fields = byComponent.get(component) ?? [];
      const topLevel = topLevelFields(fields);

      const violations = topLevel.filter((f) => TIMER_FIELDS.includes(f));
      expect(
        violations,
        `${component} in ${file} selects timer/question fields (${violations.join(", ")}) — ` +
          `score displays should only need 'players' and related score data`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Timer-related components
// ---------------------------------------------------------------------------

describe("timer-related components selector isolation", () => {
  it("spectator-view / GameplayDisplay does not select the full players list", () => {
    const source = readComponent("spectator-view.tsx");
    const byComponent = extractSelectorsByComponent(source);
    const fields = byComponent.get("GameplayDisplay") ?? [];
    const topLevel = topLevelFields(fields);

    // GameplayDisplay receives players as a prop; it should only need
    // `settings.answerTimeWindow` from the context.
    expect(
      topLevel.includes("players"),
      `GameplayDisplay in spectator-view.tsx selects 'players' directly — ` +
        `it should receive players as a prop to avoid re-rendering on every answer`
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sub-object selector detection
// ---------------------------------------------------------------------------

describe("sub-object selector detection", () => {
  /**
   * Some fields on `state.public` are *nested objects* (settings, hostConfig)
   * rather than simple values or arrays.  Selecting the whole nested object
   * (`state.public.settings`) causes the component to re-render on every
   * settings change, even ones it doesn't use.  Components should drill into
   * specific leaf properties instead
   * (e.g. `state.public.settings.answerTimeWindow`).
   *
   * Top-level array fields (players, questions, questionResults) are the
   * canonical data units; selecting them is intentionally fine.  Only
   * config/options objects need to be drilled into.
   */
  const NESTED_OBJECT_KEYS = ["settings", "hostConfig"];

  const FILES_TO_CHECK = [
    "host-view.tsx",
    "player-view.tsx",
    "spectator-view.tsx",
  ];

  for (const file of FILES_TO_CHECK) {
    it(`${file} — useSelector calls targeting settings/config objects drill into a specific leaf field`, () => {
      const source = readComponent(file);
      // Find lines that select a known nested config key without a following `.field`
      // Pattern: state.public.SUBKEY followed by end of expression (not a `.`)
      const violations: Array<{ line: number; text: string }> = [];

      const lines = source.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes("useSelector")) continue;

        // Check whether the selector returns the whole nested config object.
        // We look for `state.public.KEY` where KEY is a config/options object
        // and the very next character is NOT `.` (i.e. not further chained).
        for (const key of NESTED_OBJECT_KEYS) {
          // Regex: state.public.KEY not followed by a dot
          const pattern = new RegExp(`state\\.public\\.${key}(?!\\.)`, "g");
          if (pattern.test(line)) {
            violations.push({ line: i + 1, text: line.trim() });
            break;
          }
        }
      }

      expect(
        violations,
        `${file} has useSelector calls returning whole config sub-objects.\n` +
          `Drill into specific leaf fields instead (e.g. state.public.settings.answerTimeWindow).\n` +
          `Violations:\n${violations.map((v) => `  L${v.line}: ${v.text}`).join("\n")}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Component field-count limit
// ---------------------------------------------------------------------------

describe("component selector field count", () => {
  const MAX_FIELDS = 5;

  const FILES_TO_CHECK = [
    "host-view.tsx",
    "player-view.tsx",
    "spectator-view.tsx",
  ];

  for (const file of FILES_TO_CHECK) {
    it(`${file} — no component selects more than ${MAX_FIELDS} top-level fields`, () => {
      const source = readComponent(file);
      const byComponent = extractSelectorsByComponent(source);

      const violations: Array<{ component: string; count: number; fields: string[] }> = [];

      for (const [component, fields] of byComponent) {
        // Only check components with at least one selector
        if (fields.length === 0) continue;

        const top = topLevelFields(fields);
        if (top.length > MAX_FIELDS) {
          violations.push({ component, count: top.length, fields: top });
        }
      }

      expect(
        violations,
        `${file} has components selecting more than ${MAX_FIELDS} top-level fields ` +
          `(sign of doing too much — split into smaller components):\n` +
          violations
            .map((v) => `  ${v.component} (${v.count}): ${v.fields.join(", ")}`)
            .join("\n")
      ).toHaveLength(0);
    });
  }
});
