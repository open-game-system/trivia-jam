import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";
import type { Env } from "./env";
import type { Question } from "./game.types";

const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  correctAnswer: z.union([z.number(), z.string()]),
  questionType: z.enum(["numeric", "multiple-choice"]),
  options: z.array(z.string()).optional(),
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
  env: Env
): Promise<Record<string, Question>> {
  if (env.USE_MOCK_LLM) {
    return MOCK_QUESTIONS;
  }

  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in Cloudflare: Workers & Pages → trivia-jam → Settings → Variables and Secrets."
    );
  }

  const preprocessedContent = preprocessDocument(documentContent);
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            text: { type: SchemaType.STRING },
            correctAnswer: { type: SchemaType.STRING },
            questionType: { type: SchemaType.STRING, format: "enum", enum: ["numeric", "multiple-choice"] },
            options: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ["id", "text", "correctAnswer", "questionType"],
        },
      },
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Parse the following document into structured trivia questions:\n\n${preprocessedContent}`
  );

  const responseText = result.response.text();
  const rawQuestions = JSON.parse(responseText);
  const parsedQuestions = QuestionsResponseSchema.parse(rawQuestions);

  // Validate sequential IDs and multiple choice answers
  parsedQuestions.forEach((q, index) => {
    const expectedId = `q${index + 1}`;
    if (q.id !== expectedId) {
      throw new Error(
        `Question IDs must be sequential. Expected ${expectedId} but got ${q.id}`
      );
    }
    validateMultipleChoiceAnswer(q);
  });

  // Convert numeric answers from string to number
  const processedQuestions = parsedQuestions.map((q) => {
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
    questionsRecord[question.id] = question as Question;
  }
  return questionsRecord;
}
