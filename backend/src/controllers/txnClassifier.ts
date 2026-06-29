import express from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/auth";
import {
  TxnClassificationTrainingModel,
  createTxnClassificationTraining,
} from "../db/txnClassificationTrainingModel";
import { deleteTransactionById, updateTransactionById } from "../db/transactionModel";

const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";

export const saveTxnClassifierFeedback = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const {
      transactionId,
      emailText,
      sourceDomain,
      isTransaction,
      txnType,
      modelConfidence,
      typeConfidence,
      classifierModelVersion,
      typeModelVersion,
    } = req.body;

    if (!emailText || typeof isTransaction !== "boolean") {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (isTransaction && !["credit", "debit"].includes(txnType)) {
      return res
        .status(400)
        .json({ error: "txnType must be credit or debit" });
    }

    const isTransactionLabel = isTransaction ? 1 : 0;

    const payload = {
      userId,
      transactionId,
      emailText,
      sourceDomain,
      isTransactionLabel,
      txnTypeLabel: isTransaction ? txnType : undefined,
      isTransactionConfidence: modelConfidence,
      typeConfidence,
      classifierModelVersion,
      typeModelVersion,
    };

    let trainingSample;
    if (transactionId) {
      trainingSample = await TxnClassificationTrainingModel.findOneAndUpdate(
        { userId, transactionId },
        payload,
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } else {
      trainingSample = await createTxnClassificationTraining(payload);
    }

    if (isTransaction && transactionId && txnType) {
      await updateTransactionById(transactionId, { userType: txnType });
    }

    if (!isTransaction && transactionId) {
      await deleteTransactionById(transactionId);
    }

    return res.status(200).json(trainingSample);
  } catch (error) {
    console.error("Txn classifier feedback save error:", error);
    return res.sendStatus(400);
  }
};

export const retrainTxnClassifier = async (
  req: express.Request,
  res: express.Response,
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const unusedSamples = await TxnClassificationTrainingModel.find({
      usedForTraining: false,
    }).session(session);

    if (!unusedSamples.length) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "No unused sample found.",
      });
    }

    const classifierSamples = unusedSamples.map((sample) => ({
      text: sample.emailText,
      label: sample.isTransactionLabel,
      source_domain: sample.sourceDomain || "unknown",
    }));

    const typeSamples = unusedSamples
      .filter((sample) => sample.isTransactionLabel === 1 && sample.txnTypeLabel)
      .map((sample) => ({
        text: sample.emailText,
        label: sample.txnTypeLabel === "debit" ? 1 : 0,
        source_domain: sample.sourceDomain || "unknown",
        type: sample.txnTypeLabel,
      }));

    if (classifierSamples.length) {
      const resp = await fetch(`${pythonApiUrl}/ml/retrain-classifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: classifierSamples }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text();
        throw new Error(errTxt);
      }
    }

    if (typeSamples.length) {
      const resp = await fetch(`${pythonApiUrl}/ml/retrain-txn-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: typeSamples }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text();
        throw new Error(errTxt);
      }
    }

    const ids = unusedSamples.map((samp) => samp._id);
    await TxnClassificationTrainingModel.updateMany(
      { _id: { $in: ids } },
      {
        usedForTraining: true,
        trainedAt: new Date(),
      },
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      status: "success",
      samplesUsed: unusedSamples.length,
      typeSamplesUsed: typeSamples.length,
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error while retraining txn classifier: ", error);
    return res.status(500).json({
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
