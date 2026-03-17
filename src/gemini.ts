import { generateText, Output, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { Env } from "./env";
import type { Question } from "./game.types";

const QuestionSchema = z.object({
  id: z.string().describe("Unique ID in format q1, q2, q3, etc."),
  text: z.string().describe("The question text without options"),
  correctAnswer: z
    .union([z.number(), z.string()])
    .describe(
      "For numeric: the number. For multiple choice: the FULL TEXT of the correct option."
    ),
  questionType: z.enum(["numeric", "multiple-choice"]),
  options: z
    .array(z.string())
    .optional()
    .describe("For multiple choice: all option texts in order"),
});

const QuestionsResponseSchema = z.array(QuestionSchema);

export type ParsedQuestion = z.infer<typeof QuestionSchema>;

const SYSTEM_PROMPT = `You are a precise question parser that extracts trivia questions and their correct answers from documents.
Your task is to parse questions and their answers exactly as they appear, without making assumptions or modifications.
For multiple choice questions:
1. The correct answer is ALWAYS indicated by "Correct answer: X" where X is the letter
2. You must map that letter to the FULL TEXT of the corresponding option
3. You must include ALL options in the options array
4. The options must be extracted exactly as written, preserving their order
5. The question text should NOT include the options - extract only the question itself

For numeric questions:
1. The answer should be converted to a number
2. No units should be included in the answer

Question IDs must be sequential: q1, q2, q3, etc.
Return a JSON array of question objects.`;

function preprocessDocument(doc: string): string {
  return doc
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validateMultipleChoiceAnswer(question: ParsedQuestion): void {
  if (question.questionType === "multiple-choice") {
    if (
      !Array.isArray(question.options) ||
      question.options.length === 0
    ) {
      throw new Error(
        `Question ${question.id}: Multiple choice question must have options array`
      );
    }
    if (!question.options.includes(String(question.correctAnswer))) {
      throw new Error(
        `Question ${question.id}: Correct answer "${question.correctAnswer}" must exactly match one of the options: ${question.options.join(", ")}`
      );
    }
  }
}

/**
 * Creates the language model to use for question parsing.
 */
export function createQuestionParserModel(env: Env): LanguageModel {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in Cloudflare: Workers & Pages → trivia-jam → Settings → Variables and Secrets."
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
  });

  return google("gemini-2.5-flash");
}

/**
 * Deterministic mock questions returned when USE_MOCK_LLM is set.
 * Used in E2E tests to avoid Gemini API dependency.
 */
const MOCK_QUESTIONS: Record<string, Question> = {
  q1: {
    id: "q1",
    text: "What is 2 + 2?",
    correctAnswer: 4,
    questionType: "numeric",
  },
  q2: {
    id: "q2",
    text: "What color is the sky on a clear day?",
    correctAnswer: "Blue",
    questionType: "multiple-choice",
    options: ["Red", "Blue", "Green", "Yellow"],
  },
};

/**
 * Parse a document of trivia questions into structured Question objects.
 *
 * When USE_MOCK_LLM env var is set, returns deterministic test questions
 * without calling any LLM. This enables E2E tests to run without Gemini.
 */
export async function parseQuestions(
  documentContent: string,
  env: Env,
  model?: LanguageModel
): Promise<Record<string, Question>> {
  if (env.USE_MOCK_LLM) {
    return MOCK_QUESTIONS;
  }

  const llm = model ?? createQuestionParserModel(env);
  const preprocessedContent = preprocessDocument(documentContent);

  const result = await generateText({
    model: llm,
    system: SYSTEM_PROMPT,
    prompt: `Parse the following document into structured trivia questions:\n\n${preprocessedContent}`,
    output: Output.object({ schema: QuestionsResponseSchema }),
  });

  const parsedQuestions = result.output;

  if (!parsedQuestions) {
    throw new Error("Failed to parse questions — no structured output returned");
  }

  // Validate sequential IDs and multiple choice answers
  parsedQuestions.forEach((q: ParsedQuestion, index: number) => {
    const expectedId = `q${index + 1}`;
    if (q.id !== expectedId) {
      throw new Error(
        `Question IDs must be sequential. Expected ${expectedId} but got ${q.id}`
      );
    }
    validateMultipleChoiceAnswer(q);
  });

  // Convert numeric answers from string to number
  const processedQuestions = parsedQuestions.map((q: ParsedQuestion) => {
    const num =
      q.questionType === "numeric" ? Number(q.correctAnswer) : NaN;
    return {
      ...q,
      correctAnswer: !isNaN(num) ? num : q.correctAnswer,
    };
  });

  // Convert array to record keyed by ID
  const questionsRecord: Record<string, Question> = {};
  for (const question of processedQuestions) {
    questionsRecord[question.id] = {
      id: question.id,
      text: question.text,
      correctAnswer: question.correctAnswer,
      questionType: question.questionType,
      ...(question.options ? { options: question.options } : {}),
    };
  }
  return questionsRecord;
}
