import { describe, expect, it } from "vitest";
import { buildReadAloudText, pickVoice } from "./readAloud";

describe("buildReadAloudText", () => {
  it("reads just the question for a number question", () => {
    expect(buildReadAloudText({ text: "How many legs does a spider have?" })).toBe(
      "How many legs does a spider have?",
    );
  });

  it("reads each option with its letter, one sentence per option", () => {
    expect(
      buildReadAloudText({
        text: "Which animal is the biggest?",
        options: ["Elephant", "Blue whale", "Giraffe", "Hippo"],
      }),
    ).toBe("Which animal is the biggest? A, Elephant. B, Blue whale. C, Giraffe. D, Hippo.");
  });

  it("adds a question mark when the question has no end punctuation", () => {
    expect(buildReadAloudText({ text: "Name the biggest animal", options: ["Elephant"] })).toBe(
      "Name the biggest animal. A, Elephant.",
    );
  });

  it("ignores empty options", () => {
    expect(buildReadAloudText({ text: "Pick one?", options: [] })).toBe("Pick one?");
  });
});

describe("pickVoice", () => {
  const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });

  it("prefers a local English voice", () => {
    const voices = [v("Thomas", "fr-FR"), v("Remote", "en-US", false), v("Samantha", "en-US")];
    expect(pickVoice(voices)?.name).toBe("Samantha");
  });

  it("falls back to any English voice, then to nothing", () => {
    expect(pickVoice([v("Thomas", "fr-FR"), v("Remote", "en-GB", false)])?.name).toBe("Remote");
    expect(pickVoice([v("Thomas", "fr-FR")])).toBeUndefined();
    expect(pickVoice([])).toBeUndefined();
  });

  it("accepts underscore language tags", () => {
    expect(pickVoice([v("Daniel", "en_GB")])?.name).toBe("Daniel");
  });
});
