import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

dotenv.config();

export const GEMINI_BATCH_LIMIT = 10;
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_MAX_RETRIES = 3;
const GEMINI_TIMEOUT_MS = 20000;
const APP_CATEGORIES = [
  "Investment",
  "Income",
  "Personal",
  "Work",
  "Business",
  "Restaurants",
  "Housing",
  "Electricity",
  "Transport & Fuel",
  "Food & Grocery",
  "Medical",
  "Travel",
  "Fitness",
  "Insurance",
  "Entertainment",
  "Internet & Telecom",
  "Gift",
  "Taxes",
  "Utility",
  "Shopping",
  "Card Repayment",
  "ATM",
  "Bank Charges",
  "Reimbursement",
  "Self Transfer",
  "Loan",
  "Education",
] as const;

export type ParsedEmailTransaction = {
  is_transaction: boolean;
  type: "debit" | "credit" | "unknown";
  amount: number;
  merchant: string;
  category: (typeof APP_CATEGORIES)[number];
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeParsedTransaction = (item: any): ParsedEmailTransaction => {
  const parsedType =
    item?.type === "debit" || item?.type === "credit" ? item.type : "unknown";
  const rawCategory = typeof item?.category === "string" ? item.category.trim() : "";

  return {
    is_transaction: Boolean(item?.is_transaction),
    type: parsedType,
    amount: normalizeNumber(item?.amount, 0),
    merchant:
      typeof item?.merchant === "string" ? item.merchant.trim() : "",
    category:
      APP_CATEGORIES.includes(rawCategory as (typeof APP_CATEGORIES)[number])
        ? rawCategory
        : "Personal",
  };
};

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      is_transaction: { type: "BOOLEAN" },
      type: {
        type: "STRING",
        enum: ["debit", "credit", "unknown"],
      },
      amount: { type: "NUMBER" },
      merchant: { type: "STRING" },
      category: {
        type: "STRING",
        enum: [...APP_CATEGORIES],
      },
    },
    required: ["is_transaction", "type", "amount", "merchant", "category"],
  },
} as any;

const PROMPT_CANDIDATES = [
  resolve(process.cwd(), "src/prompts/gemini-transaction-parser.md"),
  resolve(process.cwd(), "backend/src/prompts/gemini-transaction-parser.md"),
  resolve(__dirname, "../prompts/gemini-transaction-parser.md"),
];

const loadPromptTemplate = () => {
  const promptPath = PROMPT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!promptPath) {
    throw new Error("Gemini transaction parser prompt file is missing");
  }
  return readFileSync(promptPath, "utf8");
};

const buildPrompt = (emailBodies: string[]) => {
  const emailEntries = emailBodies
    .map(
      (body, index) => `Email ${index + 1}:\n"""\n${body}\n"""`,
    )
    .join("\n\n");

  const template = loadPromptTemplate();
  return template
    .replace("{{CATEGORIES}}", APP_CATEGORIES.join(", "))
    .replace("{{EMAILS}}", emailEntries);
};

const parseGeminiJsonArray = (rawText: string): any[] => {
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini returned a non-array JSON payload");
  }
  return parsed;
};

export const processEmailsWithGemini = async (
  emailBodies: string[],
): Promise<ParsedEmailTransaction[]> => {
  if (emailBodies.length === 0) {
    return [];
  }

  if (emailBodies.length > GEMINI_BATCH_LIMIT) {
    const batchedResults: ParsedEmailTransaction[] = [];

    for (let i = 0; i < emailBodies.length; i += GEMINI_BATCH_LIMIT) {
      const batch = emailBodies.slice(i, i + GEMINI_BATCH_LIMIT);
      const parsedBatch = await processEmailsWithGemini(batch);
      batchedResults.push(...parsedBatch);
    }

    return batchedResults;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const prompt = buildPrompt(emailBodies);

  let lastError: unknown;
  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      let timeout: NodeJS.Timeout | undefined;
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS);
        }),
      ]).finally(() => timeout && clearTimeout(timeout));

      const text = result.response.text();
      const parsed = parseGeminiJsonArray(text);

      if (parsed.length !== emailBodies.length) {
        throw new Error(
          `Gemini response length mismatch: expected ${emailBodies.length}, got ${parsed.length}`,
        );
      }

      return parsed.map((item) => normalizeParsedTransaction(item));
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === GEMINI_MAX_RETRIES;
      if (!isLastAttempt) {
        console.warn(
          `Gemini batch parse failed (attempt ${attempt}/${GEMINI_MAX_RETRIES}). Retrying...`,
          error,
        );
        await wait(attempt * 1500);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini batch parsing failed after retries");
};
