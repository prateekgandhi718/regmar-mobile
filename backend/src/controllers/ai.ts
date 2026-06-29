import express from 'express';
import { AuthRequest } from '../middlewares/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateRegexFromEmailInternal = async (emailBodies: string[], fromEmail: string) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const combinedEmails = emailBodies.map((body, i) => `Email Sample ${i + 1}:\n"""\n${body}\n"""`).join('\n\n');

    const prompt = `
You are a financial email analysis system that helps parse bank transaction emails.

Sender domain: "${fromEmail}"

You are given multiple email samples sent by a bank.
Some samples represent MONEY MOVEMENT transactions.
Some samples may be informational or balance-related.

Your job is NOT to be precise.
Your job is to maximize RECALL of legitimate transactions.

It is acceptable to include false positives.
It is NOT acceptable to miss real debit or credit transactions.

--------------------------------
DEFINITION OF A TRANSACTION
--------------------------------
An email represents a transaction if it indicates money being:
- debited
- credited
- paid
- received
- transferred
- refunded
- reversed

Emails that ONLY show balance, limit, due date, or statements
WITHOUT a money movement event are NOT transactions.

--------------------------------
IMPORTANT PRINCIPLES
--------------------------------
1. Detection and extraction are SEPARATE.
2. Regexes are BEST-EFFORT extractors, not strict validators.
3. Amount extraction is mandatory.
4. Merchant/description extraction is OPTIONAL.
5. Dates and account numbers are NOT required.
6. Regexes MUST be forgiving and tolerant of variation.

--------------------------------
EMAIL SAMPLES
--------------------------------
${combinedEmails}

--------------------------------
WHAT YOU MUST GENERATE
--------------------------------

Generate a SINGLE JSON object with the following structure:

{
  "transactionIndicators": {
    "creditKeywords": [],
    "debitKeywords": [],
    "currencyMarkers": []
  },
  "extractionPatterns": {
    "amountRegexes": [],
    "merchantRegexes": []
  }
}

--------------------------------
FIELD DEFINITIONS
--------------------------------

transactionIndicators.creditKeywords:
- Words or phrases that indicate money coming IN.
- Examples: credited, received, refund, deposited

transactionIndicators.debitKeywords:
- Words or phrases that indicate money going OUT.
- Examples: debited, paid, spent, used, withdrawn

transactionIndicators.currencyMarkers:
- Symbols or tokens that indicate money.
- Examples: INR, ₹, Rs

extractionPatterns.amountRegexes:
- JavaScript-compatible regex strings
- MUST capture the numeric amount in group 1
- MUST handle:
  - optional decimals (559, 559., 559.00)
  - commas (1,764.56)
  - currency symbols (INR, ₹)
- Prefer ONE or TWO very forgiving patterns

extractionPatterns.merchantRegexes:
- JavaScript-compatible regex strings
- Capture the merchant / recipient name in group 1
- These are OPTIONAL and best-effort
- Use common anchors such as:
  - "at"
  - "to"
  - "from"
  - "by"
  - UPI paths
- It is OK if merchant extraction sometimes fails

--------------------------------
STRICT RULES
--------------------------------
- Output MUST be valid JSON only.
- NO markdown, NO explanations.
- NO inline regex flags like (?i), (?m), (?s).
- Regexes MUST work with JavaScript RegExp constructor.
- Do NOT generate placeholders like "N/A" or "None".
- Do NOT assume fixed templates.
- Prefer OPTIONAL groups and non-greedy matching.
- Do NOT exclude samples just because format varies.

--------------------------------
GOAL REMINDER (MOST IMPORTANT)
--------------------------------
If a future email looks similar to ANY of the provided samples
and represents real money movement,
your indicators and regexes should still detect it.

Optimize for RECALL over PRECISION.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up response if it contains markdown code blocks
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI Regex Generation Error:', error);
    return null;
  }
};

export const generateRegexFromEmail = async (req: AuthRequest, res: express.Response) => {
  try {
    const { emailBodies, fromEmail } = req.body;

    if (!emailBodies || !Array.isArray(emailBodies) || !fromEmail) {
      return res.status(400).json({ message: 'Email bodies array and fromEmail are required' });
    }

    const regex = await generateRegexFromEmailInternal(emailBodies, fromEmail);
    if (!regex) {
      return res.status(500).json({ message: 'Failed to generate regex' });
    }

    return res.status(200).json(regex);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
};

