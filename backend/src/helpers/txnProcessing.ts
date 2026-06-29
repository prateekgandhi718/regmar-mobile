import {
  ClassifyEmailResponse,
  ClassifyTransactionTypeResponse,
  EntityData,
  ExtractEntitiesResponse,
} from "./syncTransactions";

type ProcessEmailResult =
  | { status: "unavailable"; error?: string }
  | { status: "non_transaction" }
  | {
      status: "ok";
      data: {
        txnType: "debit" | "credit";
        typeConfidence?: number;
        isTransactionConfidence?: number;
        processedEntities: EntityData[];
        nerModelName?: string;
        originalAmount: number;
        originalDescription: string;
      };
    };

const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";

export const processEmailWithPython = async (
  content: string,
): Promise<ProcessEmailResult> => {
  // 1. Classify whether this is a transaction email
  let classificationResult: ClassifyEmailResponse | null = null;
  try {
    const resp = await fetch(`${pythonApiUrl}/ml/classify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_body: content }),
    });
    if (resp.ok) {
      classificationResult = (await resp.json()) as ClassifyEmailResponse;
    } else {
      console.warn(`Email classification failed: ${resp.statusText}`);
      return { status: "unavailable" };
    }
  } catch (err: any) {
    console.error(`Error calling classify-email: ${err.message}`);
    return { status: "unavailable", error: err.message };
  }

  if (!classificationResult?.is_transaction) {
    return { status: "non_transaction" };
  }

  // 2. Classify transaction type (debit/credit)
  let txnType: "debit" | "credit" = "debit";
  let typeConfidence: number | undefined = undefined;
  try {
    const resp = await fetch(`${pythonApiUrl}/ml/classify-txn-type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_body: content }),
    });
    if (resp.ok) {
      const tr = (await resp.json()) as ClassifyTransactionTypeResponse;
      if (tr?.type) txnType = tr.type;
      if (typeof tr?.confidence === "number") typeConfidence = tr.confidence;
      console.log(`Type classification: ${txnType} (conf=${typeConfidence})`);
    } else {
      console.warn(`Type classification failed: ${resp.statusText}`);
    }
  } catch (err: any) {
    console.error(`Error calling classify-txn-type: ${err.message}`);
  }

  // 3. Extract entities via NER
  let processedEntities: EntityData[] = [];
  let nerModelName: string | undefined = undefined;
  try {
    const resp = await fetch(`${pythonApiUrl}/ml/extract-entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_body: content }),
    });
    if (resp.ok) {
      const ner = (await resp.json()) as ExtractEntitiesResponse;
      processedEntities = Array.isArray(ner.entities) ? ner.entities : [];
      nerModelName = ner.model_version;
    } else {
      console.warn(`Entity extraction failed: ${resp.statusText}`);
    }
  } catch (err: any) {
    console.error(`Error calling extract-entities: ${err.message}`);
  }

  // 4. Derive amount and description from NER entities
  let originalAmount = 0;
  let originalDescription = content.substring(0, 10);
  try {
    // NER labels from Python are 'AMOUNT' and 'MERCHANT'
    const amtEntity = processedEntities.find((e) =>
      /AMOUNT/i.test(e.label || ""),
    ) as EntityData | undefined;
    if (amtEntity?.text) {
      const raw = amtEntity.text;

      let cleaned = raw
        .replace(/(rs\.?|inr|\$)/gi, "") // remove currency tokens
        .replace(/,/g, "") // remove thousand separators
        .trim();

      const match = cleaned.match(/-?\d+(\.\d+)?/);

      if (match) {
        const parsed = parseFloat(match[0]);
        if (!Number.isNaN(parsed)) originalAmount = parsed;
      }
    }

    const merchantEntity = processedEntities.find((e) =>
      /MERCHANT/i.test(e.label || ""),
    ) as EntityData | undefined;
    if (merchantEntity && merchantEntity.text)
      originalDescription = merchantEntity.text;
  } catch (err) {
    // keep defaults on errors
  }

  return {
    status: "ok",
    data: {
      txnType,
      typeConfidence,
      isTransactionConfidence: classificationResult?.confidence,
      processedEntities,
      nerModelName,
      originalAmount,
      originalDescription,
    },
  };
};
