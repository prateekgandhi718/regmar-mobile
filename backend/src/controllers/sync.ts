import express from "express";
import { AuthRequest } from "../middlewares/auth";
import { getActiveLinkedAccountByUserId } from "../db/linkedAccountModel";
import { getAccountsByUserId } from "../db/accountModel";
import { getSyncState, updateSyncState } from "../db/syncStateModel";
import {
  createTransaction,
  deleteTransactionById,
  getUnprocessedTransactionsByUserAndDomain,
  updateTransactionById,
} from "../db/transactionModel";
import { decrypt } from "../helpers/encryption";
import {
  fetchEmailsIncrementally,
  fetchLatestEmailWithAttachment,
  isImapAuthError,
} from "../helpers/imap";
import { getUserById } from "../db/userModel";
import {
  updateInvestmentByUserId,
  getInvestmentByUserId,
} from "../db/investmentModel";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { parseCASText } from "../helpers/casParser";
import { ClassifyEmailResponse, ClassifyTransactionTypeResponse, EntityData, ExtractEntitiesResponse, TestResultEntry } from "../helpers/syncTransactions";
import { processEmailWithPython } from "../helpers/txnProcessing";

export const syncInvestments = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    // 1. Get user and PAN
    const user = await getUserById(userId);
    if (!user || !user.pan) {
      return res
        .status(400)
        .json({ message: "PAN number not found. Please update your profile." });
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

    // 3.1 Check if this email has already been synced
    const currentInvestment = await getInvestmentByUserId(userId);
    if (currentInvestment && currentInvestment.lastSyncedEmailUid === uid) {
      return res.status(200).json({
        message: "Your investment portfolio is already up to date.",
        lastSyncedAt: currentInvestment.lastSyncedAt,
        summary: currentInvestment.summary,
        alreadySynced: true,
      });
    }

    // 4. Extract text and parse
    try {
      const data = new Uint8Array(attachment);
      const loadingTask = pdfjsLib.getDocument({
        data,
        password: user.pan.toUpperCase(),
        stopAtErrors: true,
      });

      const pdfDocument = await loadingTask.promise;

      console.log(`Successfully unlocked PDF with PAN: ${user.pan}`);

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

      // 5. Update investment record
      await updateInvestmentByUserId(userId, {
        pan: user.pan,
        lastSyncedAt: date || new Date(),
        lastSyncedEmailUid: uid,
        casId: parsedData.casId,
        statementPeriod: parsedData.statementPeriod,
        summary: parsedData.summary,
        historicalValuation: parsedData.historicalValuation,
        mutualFunds: parsedData.mutualFunds,
        stocks: parsedData.stocks,
      });

      return res.status(200).json({
        message: "Statement synced and analyzed successfully",
        lastSyncedAt: date || new Date(),
        summary: parsedData.summary,
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

    // 2. Accounts with domains
    const accounts = await getAccountsByUserId(userId);
    const accountsWithDomains = accounts.filter(
      (acc) => acc.domainIds && acc.domainIds.length > 0,
    );

    if (accountsWithDomains.length === 0) {
      return res.status(400).json({
        message:
          "No bank accounts with transaction domains found. Please add an account first.",
      });
    }

    let totalSynced = 0;

    for (const account of accountsWithDomains) {
      for (const domain of account.domainIds as any) {
        // 3. Sync state
        const syncState = await getSyncState(userId, domain._id.toString());
        const lastUid = syncState?.lastUid || 0;

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
          domain.fromEmail,
          lastUid,
          undefined,
          since,
        );

        if (emails.length > 0) {
          console.log(
            `Processing ${emails.length} emails for ${domain.fromEmail}`,
          );

          for (const { content, date } of emails) {
            console.log(`\n--- Processing Email (${date}) ---`);
            console.log(
              `RAW TEXT:\n${content.substring(0, 200)}...\n------------------`,
            );

            const result = await processEmailWithPython(content);

            if (result.status === "unavailable") {
              // Store raw email for later processing when Python is available
              try {
                await createTransaction({
                  accountId: account._id,
                  domainId: domain._id,
                  userId,
                  emailBody: content,
                  originalDate: date,
                  originalDescription: content.substring(0, 10),
                  originalAmount: 0,
                  type: "debit",
                  isProcessed: false,
                });
                console.log("Stored unprocessed transaction (Python unavailable)");
              } catch (err: any) {
                console.error(`Error saving unprocessed transaction: ${err.message}`);
              }
              continue;
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

            // 5. Persist transaction with model outputs
            try {
              await createTransaction({
                accountId: account._id,
                domainId: domain._id,
                userId,
                emailBody: content,
                originalDate: date,
                originalDescription,
                originalAmount,
                type: txnType,
                typeConfidence,
                isTransactionConfidence,
                entities: processedEntities,
                nerModel: nerModelName,
                isProcessed: true,
              });
              totalSynced++;
              console.log("Stored transaction with ML analysis");
            } catch (err: any) {
              console.error(`Error saving transaction: ${err.message}`);
            }
          }

          // 6. Update sync state
          await updateSyncState(userId, domain._id.toString(), newLastUid);
        }

        // 7. Process unprocessed transactions already stored for this domain
        const pendingTransactions =
          await getUnprocessedTransactionsByUserAndDomain(
            userId,
            domain._id.toString(),
          );

        if (pendingTransactions.length > 0) {
          console.log(
            `Reprocessing ${pendingTransactions.length} pending transactions for ${domain.fromEmail}`,
          );
        }

        for (const pending of pendingTransactions) {
          if (!pending.emailBody) {
            console.warn(
              `Pending transaction ${pending._id} has no email body; skipping`,
            );
            continue;
          }

          const result = await processEmailWithPython(pending.emailBody);

          if (result.status === "unavailable") {
            continue;
          }

          if (result.status === "non_transaction") {
            await deleteTransactionById(pending._id.toString());
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

          try {
            await updateTransactionById(pending._id.toString(), {
              originalDescription,
              originalAmount,
              type: txnType,
              typeConfidence,
              isTransactionConfidence,
              entities: processedEntities,
              nerModel: nerModelName,
              isProcessed: true,
            });
            totalSynced++;
          } catch (err: any) {
            console.error(
              `Error updating pending transaction ${pending._id}: ${err.message}`,
            );
          }
        }
      }
    }

    return res.status(200).json({
      message: "Sync completed successfully",
      transactionsSynced: totalSynced,
    });
  } catch (error) {
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
