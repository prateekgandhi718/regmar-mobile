import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

export const GEMINI_BATCH_LIMIT = 10;
const GEMINI_MODEL = "gemini-3.5-flash-lite";
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
  category: string;
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

const buildStrictResponseSchema = () => ({
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
}) as any;

const buildPrompt = (emailBodies: string[]) => {
  const emailEntries = emailBodies
    .map(
      (body, index) => `Email ${index + 1}:\n"""\n${body}\n"""`,
    )
    .join("\n\n");

  return `You are a financial email parsing engine.

Return ONLY a JSON array with exactly one object per email, in the same order.

Valid category names you must choose from exactly:
${APP_CATEGORIES.join(", ")}

Each object must match this schema exactly:
{
  "is_transaction": true,
  "type": "debit",
  "amount": 1234.56,
  "merchant": "Uber",
  "category": "Travel"
}

Rules:
- Use "is_transaction": false only for non-transaction emails such as balance, statement, due date, limit, OTP, or informational messages.
- For real money movement emails, set "is_transaction": true.
- "type" must be either "credit" or "debit" for transaction emails.
- "amount" must be a number, not a string.
- "merchant" should be the cleanest merchant/payee name available, trimmed and concise.
- "category" must be one of the valid category names above. Infer it from the merchant and context. Example: Uber, Ola, Air India, IndiGo, MakeMyTrip => Travel; Zomato, Swiggy, Blinkit => Food & Grocery or Restaurants depending on merchant; Google, Amazon => Shopping; Netflix, Spotify => Entertainment; electricity provider => Electricity; doctor, hospital, pharmacy => Medical.
- If the email is not a transaction, return:
  {
    "is_transaction": false,
    "type": "unknown",
    "amount": 0,
    "merchant": "",
    "category": "Personal"
  }
- Do not add extra keys.
- Do not wrap the output in markdown or code fences.
- Return valid JSON only.

Input emails:
${emailEntries}`;
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
      responseSchema: buildStrictResponseSchema(),
    },
  });

  const prompt = buildPrompt(emailBodies);

  let lastError: unknown;
  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`));
          }, GEMINI_TIMEOUT_MS);
        }),
      ]);

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
