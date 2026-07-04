import express from "express";
import { createHash } from "crypto";
import { AuthRequest } from "../middlewares/auth";
import { getActiveLinkedAccountByUserId } from "../db/linkedAccountModel";
import { decrypt } from "../helpers/encryption";
import {
  fetchEmailsIncrementally,
  fetchLatestEmailWithAttachment,
  isImapAuthError,
} from "../helpers/imap";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { parseCASText } from "../helpers/casParser";
import { ClassifyEmailResponse, ClassifyTransactionTypeResponse, EntityData, ExtractEntitiesResponse, TestResultEntry } from "../helpers/syncTransactions";
import { processEmailWithPython } from "../helpers/txnProcessing";
import { formatInvestmentPayload } from "./investments";

type SyncedTransaction = {
  clientTxnId: string;
  accountId: {
    _id: string;
    userId: string;
    title: string;
    currency: string;
    accountNumber?: string;
  };
  domainId: {
    _id: string;
    userId: string;
    accountId: string;
    fromEmail: string;
  };
  userId: string;
  originalDate: string;
  originalDescription: string;
  originalAmount: number;
  type: "credit" | "debit";
  typeConfidence?: number;
  isTransactionConfidence?: number;
  userType?: "credit" | "debit";
  nerModel?: string;
  entities: EntityData[];
  correctedEntities: null;
  refunded: boolean;
  emailBody: string;
  createdAt: string;
  updatedAt: string;
  categoryId?: {
    _id: string;
    name: string;
  };
  newDate?: string;
  newDescription?: string;
  newAmount?: number;
};

type SyncRequestDomain = {
  clientDomainId: string;
  fromEmail: string;
};

type SyncRequestAccount = {
  clientAccountId: string;
  title: string;
  currency: string;
  accountNumber?: string;
  domains: SyncRequestDomain[];
};

class MlUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MlUnavailableError";
  }
}

const createClientTxnId = (userId: string, accountId: string, domainId: string, uid: number) =>
  createHash("sha256")
    .update(`${userId}:${accountId}:${domainId}:${uid}`)
    .digest("hex")
    .slice(0, 40);

export const syncInvestments = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const inputPan = String(req.body?.pan || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(inputPan)) {
      return res.status(400).json({
        message: "Please provide a valid PAN number to sync investments.",
      });
    }

    // 2. Get active linked email account
    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res
        .status(400)
        .json({ message: "Please link an email account first" });
    }

    const appPassword = decrypt(linkedAccount.appPassword);
    const email = linkedAccount.email;
    const provider = linkedAccount.provider === "icloud" ? "icloud" : "gmail";

    // 3. Fetch latest CAS email from CDSL
    const { attachment, date, uid } = await fetchLatestEmailWithAttachment(
      provider,
      email,
      appPassword,
      "ecas@cdslstatement.com",
      ".pdf",
    );

    if (!attachment) {
      return res
        .status(404)
        .json({ message: "No CAS statement found in your emails." });
    }

    const clientLastSyncedEmailUid = Number(req.body?.lastSyncedEmailUid);
    if (
      Number.isFinite(clientLastSyncedEmailUid) &&
      clientLastSyncedEmailUid === uid
    ) {
      return res.status(200).json({
        message: "Your investment portfolio is already up to date.",
        lastSyncedAt: date || new Date(),
        lastSyncedEmailUid: uid,
        alreadySynced: true,
      });
    }

    // 4. Extract text and parse
    try {
      const data = new Uint8Array(attachment);
      const loadingTask = pdfjsLib.getDocument({
        data,
        password: inputPan,
        stopAtErrors: true,
      });

      const pdfDocument = await loadingTask.promise;

      console.log("Successfully unlocked PDF with PAN");

      let fullText = "";
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Group items by their vertical position (y-coordinate) to form lines
        const items = textContent.items as any[];
        const lines: { [key: number]: any[] } = {};

        items.forEach((item) => {
          const y = Math.round(item.transform[5]); // Round to handle small offsets
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        // Sort lines from top to bottom, and items within each line from left to right
        const sortedY = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a);
        const pageText = sortedY
          .map((y) => {
            return lines[y]
              .sort((a, b) => a.transform[4] - b.transform[4])
              .map((item) => item.str)
              .join(" ");
          })
          .join("\n");

        fullText += `\n--- Page ${i} ---\n${pageText}\n`;
      }

      // Use manual parser to analyze the text
      const parsedData = parseCASText(fullText);
      if (!parsedData) {
        return res
          .status(500)
          .json({ message: "Failed to parse statement content" });
      }

      const investment = formatInvestmentPayload({
        pan: inputPan,
        lastSyncedAt: date || new Date(),
        lastSyncedEmailUid: uid ?? undefined,
        casId: parsedData.casId,
        statementPeriod: parsedData.statementPeriod,
        summary: parsedData.summary,
        historicalValuation: parsedData.historicalValuation,
        mutualFunds: parsedData.mutualFunds,
        stocks: parsedData.stocks,
      });

      return res.status(200).json({
        message: "Statement synced and analyzed successfully",
        investment,
      });
    } catch (pdfError: any) {
      if (pdfError.name === "PasswordException") {
        return res.status(400).json({
          message: "Failed to unlock PDF. Please check if your PAN is correct.",
        });
      }
      console.error("PDF Processing Error:", pdfError);
      throw pdfError;
    }
  } catch (error) {
    console.error("Investment sync error:", error);
    if (isImapAuthError(error)) {
      return res.status(400).json({
        message: "Email authentication failed. Please update your app password in Settings.",
      });
    }
    return res
      .status(500)
      .json({ message: "Internal server error during investment sync" });
  }
};

export const syncAccountTransactions = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    // 1. Active linked email account
    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res
        .status(400)
        .json({ message: "Please link an email account first" });
    }

    const appPassword = decrypt(linkedAccount.appPassword);
    const email = linkedAccount.email;
    const provider = linkedAccount.provider === "icloud" ? "icloud" : "gmail";

    const accounts = Array.isArray(req.body?.accounts)
      ? (req.body.accounts as SyncRequestAccount[])
      : [];
    const incomingSyncState = req.body?.syncState as Record<string, number> | undefined;
    const syncState = incomingSyncState && typeof incomingSyncState === "object" ? incomingSyncState : {};
    const accountsWithDomains = accounts.filter(
      (acc) => Array.isArray(acc.domains) && acc.domains.length > 0,
    );

    if (accountsWithDomains.length === 0) {
      return res.status(400).json({
        message:
          "No bank accounts with transaction domains found. Please add an account first.",
      });
    }

    let totalSynced = 0;
    const syncedTransactions: SyncedTransaction[] = [];
    const syncStateUpdates: Record<string, number> = {};

    for (const account of accountsWithDomains) {
      for (const domain of account.domains) {
        if (!domain?.clientDomainId || !domain?.fromEmail?.trim()) continue;
        const lastUid = Number(syncState[domain.clientDomainId] || 0);

        let since: Date | undefined;

        if (lastUid === 0) {
          const now = new Date();

          // Move to first day of current month
          now.setDate(1);
          now.setHours(0, 0, 0, 0);

          since = now;

          console.log(
            `Initial sync for ${domain.fromEmail}, fetching since ${since.toISOString()}`,
          );
        }

          // 4. Fetch emails
        const { emails, lastUid: newLastUid } = await fetchEmailsIncrementally(
          provider,
          email,
          appPassword,
          domain.fromEmail.trim(),
          lastUid,
          undefined,
          since,
        );

        if (emails.length > 0) {
          console.log(
            `Processing ${emails.length} emails for ${domain.fromEmail}`,
          );

          for (const { content, date, uid } of emails) {
            console.log(`\n--- Processing Email (${date}) ---`);
            console.log(
              `RAW TEXT:\n${content.substring(0, 200)}...\n------------------`,
            );

            const result = await processEmailWithPython(content);

            if (result.status === "unavailable") {
              throw new MlUnavailableError(
                "Transaction sync is temporarily unavailable. Please try again in a few minutes.",
              );
            }

            if (result.status === "non_transaction") {
              console.log(
                `[${domain.fromEmail}] Skipped (not a transaction email)`,
              );
              continue;
            }

            const {
              txnType,
              typeConfidence,
              isTransactionConfidence,
              processedEntities,
              nerModelName,
              originalAmount,
              originalDescription,
            } = result.data;

            const now = new Date().toISOString();
            syncedTransactions.push({
              clientTxnId: createClientTxnId(
                userId,
                account.clientAccountId,
                domain.clientDomainId,
                uid,
              ),
              accountId: {
                _id: account.clientAccountId,
                userId,
                title: account.title,
                currency: account.currency,
                accountNumber: account.accountNumber || undefined,
              },
              domainId: {
                _id: domain.clientDomainId,
                userId,
                accountId: account.clientAccountId,
                fromEmail: domain.fromEmail.trim(),
              },
              userId,
              originalDate: new Date(date).toISOString(),
              originalDescription,
              originalAmount,
              type: txnType,
              typeConfidence,
              isTransactionConfidence,
              nerModel: nerModelName || undefined,
              entities: processedEntities,
              correctedEntities: null,
              refunded: false,
              emailBody: content,
              createdAt: now,
              updatedAt: now,
            });
            totalSynced++;
            console.log("Processed transaction in memory");
          }
        }

        syncStateUpdates[domain.clientDomainId] = newLastUid;
      }
    }

    return res.status(200).json({
      message: "Sync completed successfully",
      transactionsSynced: totalSynced,
      transactions: syncedTransactions,
      syncStateUpdates,
    });
  } catch (error) {
    if (error instanceof MlUnavailableError) {
      return res.status(503).json({
        message: error.message,
      });
    }
    console.error("Sync error:", error);
    if (isImapAuthError(error)) {
      return res.status(400).json({
        message: "Email authentication failed. Please update your app password in Settings.",
      });
    }
    return res.status(500).json({
      message: "Internal server error during sync",
    });
  }
};

/**
 * TEST ENDPOINT: Fetch sample emails from a domain and classify them using the Python ML backend.
 * Used to validate the classifier model is working correctly.
 */
export const testClassifier = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const { domainEmail, limit = 5 } = req.body;
    if (!domainEmail) {
      return res.status(400).json({ message: "domainEmail is required" });
    }

    // 1. Get linked email account
    const linkedAccount = await getActiveLinkedAccountByUserId(userId);
    if (!linkedAccount) {
      return res
        .status(400)
        .json({ message: "Please link an email account first" });
    }

    const appPassword = decrypt(linkedAccount.appPassword);
    const email = linkedAccount.email;
    const provider = linkedAccount.provider === "icloud" ? "icloud" : "gmail";

    // 2. Fetch sample emails from domain
    console.log(`Fetching sample emails from ${domainEmail}...`);
    const { emails } = await fetchEmailsIncrementally(
      provider,
      email,
      appPassword,
      domainEmail,
      0, // lastUid
      limit,
    );

    if (emails.length === 0) {
      return res.status(404).json({
        message: `No emails found from ${domainEmail}`,
        domain: domainEmail,
        samplesClassified: 0,
        results: [],
      });
    }

    // 3. Classify each email using Python ML backend
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const results: TestResultEntry[] = [];

    for (const { content, date } of emails) {
      try {
        // Step 1: Classify if email is a transaction or not
        const classifyEmailResponse = await fetch(
          `${pythonApiUrl}/ml/classify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_body: content }),
          },
        );

        if (!classifyEmailResponse.ok) {
          console.error(
            `Classification failed: ${classifyEmailResponse.statusText}`,
          );
          results.push({
            emailSnippet: content.substring(0, 100),
            date,
            error: "Email classification failed",
          });
          continue;
        }

        const classificationResult =
          (await classifyEmailResponse.json()) as ClassifyEmailResponse;
        const resultEntry: TestResultEntry = {
          emailSnippet: content.substring(0, 100),
          date,
          emailClassification: {
            label: classificationResult.label,
            isTransaction: classificationResult.is_transaction,
            confidence: classificationResult.confidence,
            probabilities: classificationResult.probabilities,
          },
        };

        console.log(
          `Email: ${classificationResult.is_transaction ? "TXN" : "NON-TXN"} (conf=${classificationResult.confidence.toFixed(3)})`,
        );

        // Step 2: If it's a transaction, classify the type (debit or credit)
        if (classificationResult.is_transaction) {
          try {
            const typeClassifyResponse = await fetch(
              `${pythonApiUrl}/ml/classify-txn-type`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_body: content }),
              },
            );

            if (typeClassifyResponse.ok) {
              const typeClassificationResult =
                (await typeClassifyResponse.json()) as ClassifyTransactionTypeResponse;
              resultEntry.typeClassification = {
                label: typeClassificationResult.label,
                type: typeClassificationResult.type,
                confidence: typeClassificationResult.confidence,
                probabilities: typeClassificationResult.probabilities,
              };
              console.log(
                `  Type: ${typeClassificationResult.type?.toUpperCase()} (conf=${typeClassificationResult.confidence.toFixed(3)})`,
              );
            } else {
              console.warn(
                `Type classification failed: ${typeClassifyResponse.statusText}`,
              );
              resultEntry.typeClassification = {
                error: "Type classification failed",
              };
            }
          } catch (typeErr: any) {
            console.error(
              `Error classifying transaction type: ${typeErr.message}`,
            );
            resultEntry.typeClassification = {
              error: typeErr.message,
            };
          }

          // Step 3: Extract entities (AMOUNT, MERCHANT) for transactions
          try {
            const extractEntitiesResponse = await fetch(
              `${pythonApiUrl}/ml/extract-entities`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_body: content }),
              },
            );

            if (extractEntitiesResponse.ok) {
              const extractEntitiesResult =
                (await extractEntitiesResponse.json()) as ExtractEntitiesResponse;
              resultEntry.entities = extractEntitiesResult.entities;
              console.log(
                `  Entities: ${extractEntitiesResult.entities.map((e: EntityData) => `${e.label}(${e.text})`).join(", ")}`,
              );
            } else {
              console.warn(
                `Entity extraction failed: ${extractEntitiesResponse.statusText}`,
              );
              resultEntry.entities = [];
            }
          } catch (entityErr: any) {
            console.error(`Error extracting entities: ${entityErr.message}`);
            resultEntry.entities = [];
          }
        }

        results.push(resultEntry);
      } catch (err: any) {
        console.error(`Error classifying email: ${err.message}`);
        results.push({
          emailSnippet: content.substring(0, 100),
          date,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      message: "Classifier test completed",
      domain: domainEmail,
      samplesClassified: results.length,
      results,
    });
  } catch (error) {
    console.error("Classifier test error:", error);
    return res.status(500).json({
      message: "Internal server error during classifier test",
    });
  }
};
