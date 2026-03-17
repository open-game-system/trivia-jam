import { describe, expect, it } from "vitest";
import { parseQuestions } from "./gemini";
import type { Env } from "./env";

const baseEnv: Env = {
  GEMINI_API_KEY: "test-key",
  ACTOR_KIT_HOST: "localhost",
  ACTOR_KIT_SECRET: "secret",
  SESSION_JWT_SECRET: "jwt-secret",
};

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

    it("does not require GEMINI_API_KEY when USE_MOCK_LLM is set", async () => {
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

  describe("error handling", () => {
    it("throws when GEMINI_API_KEY is missing and USE_MOCK_LLM is not set", async () => {
      const env = { ...baseEnv, GEMINI_API_KEY: "" };
      await expect(parseQuestions("test", env)).rejects.toThrow(
        "GEMINI_API_KEY is not configured"
      );
    });
  });
});
