import { describe, expect, it } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { parseQuestions, createQuestionParserModel } from "./gemini";
import type { Env } from "./env";

const baseEnv: Env = {
  GEMINI_API_KEY: "test-key",
  ACTOR_KIT_HOST: "localhost",
  ACTOR_KIT_SECRET: "secret",
  SESSION_JWT_SECRET: "jwt-secret",
};

function makeResult(text: string) {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 10, text: 10, reasoning: undefined },
    },
    rawCall: { rawPrompt: null, rawSettings: {} },
    warnings: [],
  };
}

function mockModel(output: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MockLanguageModelV3({
    doGenerate: makeResult(JSON.stringify(output)) as any,
  });
}

describe("parseQuestions", () => {
  describe("USE_MOCK_LLM bypass", () => {
    it("returns deterministic mock questions when USE_MOCK_LLM is set", async () => {
      const env = { ...baseEnv, USE_MOCK_LLM: "true" };
      const result = await parseQuestions("any content", env);

      expect(result).toHaveProperty("q1");
      expect(result).toHaveProperty("q2");
      expect(result.q1.correctAnswer).toBe(4);
      expect(result.q2.questionType).toBe("multiple-choice");
    });

    it("does not call the model when USE_MOCK_LLM is set", async () => {
      const env = { ...baseEnv, USE_MOCK_LLM: "1", GEMINI_API_KEY: "" };
      const result = await parseQuestions("anything", env);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it("returns q1 as numeric and q2 as multiple-choice", async () => {
      const env = { ...baseEnv, USE_MOCK_LLM: "true" };
      const result = await parseQuestions("ignored", env);

      expect(result.q1.questionType).toBe("numeric");
      expect(result.q1.text).toBe("What is 2 + 2?");
      expect(result.q2.options).toEqual(["Red", "Blue", "Green", "Yellow"]);
      expect(result.q2.correctAnswer).toBe("Blue");
    });
  });

  describe("numeric question parsing", () => {
    it("converts numeric correctAnswer from string to number", async () => {
      const model = mockModel([
        {
          id: "q1",
          text: "How many states in the US?",
          correctAnswer: "50",
          questionType: "numeric",
        },
      ]);

      const result = await parseQuestions("test doc", baseEnv, model);

      expect(result.q1.correctAnswer).toBe(50);
      expect(typeof result.q1.correctAnswer).toBe("number");
    });

    it("parses two numeric questions with sequential IDs", async () => {
      const model = mockModel([
        {
          id: "q1",
          text: "What is 2+2?",
          correctAnswer: "4",
          questionType: "numeric",
        },
        {
          id: "q2",
          text: "What is 3+3?",
          correctAnswer: "6",
          questionType: "numeric",
        },
      ]);

      const result = await parseQuestions("test", baseEnv, model);

      expect(Object.keys(result)).toEqual(["q1", "q2"]);
      expect(result.q1.correctAnswer).toBe(4);
      expect(result.q2.correctAnswer).toBe(6);
    });
  });

  describe("multiple choice question parsing", () => {
    it("keeps string correctAnswer for multiple choice", async () => {
      const model = mockModel([
        {
          id: "q1",
          text: "Capital of France?",
          correctAnswer: "Paris",
          questionType: "multiple-choice",
          options: ["London", "Paris", "Berlin", "Madrid"],
        },
      ]);

      const result = await parseQuestions("test", baseEnv, model);

      expect(result.q1.correctAnswer).toBe("Paris");
      expect(typeof result.q1.correctAnswer).toBe("string");
      expect(result.q1.options).toEqual([
        "London",
        "Paris",
        "Berlin",
        "Madrid",
      ]);
    });
  });

  describe("validation", () => {
    it("rejects non-sequential question IDs", async () => {
      const model = mockModel([
        {
          id: "q1",
          text: "Q1",
          correctAnswer: "1",
          questionType: "numeric",
        },
        {
          id: "q3",
          text: "Q3",
          correctAnswer: "3",
          questionType: "numeric",
        },
      ]);

      await expect(parseQuestions("test", baseEnv, model)).rejects.toThrow(
        "Question IDs must be sequential. Expected q2 but got q3"
      );
    });

    it("rejects MC question with correctAnswer not in options", async () => {
      const model = mockModel([
        {
          id: "q1",
          text: "Capital?",
          correctAnswer: "Tokyo",
          questionType: "multiple-choice",
          options: ["London", "Paris", "Berlin"],
        },
      ]);

      await expect(parseQuestions("test", baseEnv, model)).rejects.toThrow(
        'Correct answer "Tokyo" must exactly match one of the options'
      );
    });
  });

  describe("null output handling", () => {
    it("throws when model returns non-JSON output", async () => {
      const model = new MockLanguageModelV3({
        doGenerate: makeResult("not valid json") as any,
      });

      await expect(parseQuestions("test", baseEnv, model)).rejects.toThrow();
    });
  });
});

describe("createQuestionParserModel", () => {
  it("throws when GEMINI_API_KEY is missing", () => {
    const env = { ...baseEnv, GEMINI_API_KEY: "" };
    expect(() => createQuestionParserModel(env)).toThrow(
      "GEMINI_API_KEY is not configured"
    );
  });
});
