import express from "express";
import { AuthRequest } from "../middlewares/auth";
import { NerTrainingModel } from "../db/nerTrainingModel";
import mongoose from "mongoose";

const pythonApiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";

export const saveNerFeedback = async (
  req: AuthRequest,
  res: express.Response,
) => {
  try {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);

    const {
      transactionId,
      emailText,
      modelEntities,
      correctedEntities,
      nerModelVersion,
    } = req.body;

    if (!transactionId || !emailText || !correctedEntities) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const trainingSample = await NerTrainingModel.findOneAndUpdate(
      { transactionId }, // unique key
      {
        userId,
        transactionId,
        emailText,
        modelEntities,
        correctedEntities,
        nerModelVersion,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json(trainingSample);
  } catch (error) {
    console.error("NER feedback save error:", error);
    return res.sendStatus(400);
  }
};

export const retrainNerModel = async (
  req: express.Request,
  res: express.Response,
) => {
  const session = await mongoose.startSession();
  try {
    // get the unused feedback samples from the nerTraining table.
    session.startTransaction();

    const unusedSamples = await NerTrainingModel.find({
      usedForTraining: false,
    }).session(session);

    if (!unusedSamples.length) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "No unused sample found.",
      });
    }

    // python needs in this format: {"text": "Dear Customer...HDFC Bank", "entities": [[18, 24, "AMOUNT"], [87, 94, "MERCHANT"]]}

    const payload = unusedSamples
      .map((sample) => {
        // prioritize user corrections
        const amount =
          sample.correctedEntities.find((e) => e.label === "AMOUNT") ||
          sample.modelEntities.find((e) => e.label === "AMOUNT");

        const merchant =
          sample.correctedEntities.find((e) => e.label === "MERCHANT") ||
          sample.modelEntities.find((e) => e.label === "MERCHANT");

        // 🚨 skip bad samples
        if (!amount || !merchant) {
          console.warn(`Skipping invalid sample ${sample._id}`);
          return null;
        }

        return {
          text: sample.emailText,
          entities: [
            [amount.start, amount.end, amount.label],
            [merchant.start, merchant.end, merchant.label],
          ],
        };
      })
      .filter(Boolean);

    const resp = await fetch(`${pythonApiUrl}/ml/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({samples: payload})
    })

    if (!resp.ok) {
      const errTxt = await resp.text()
      throw new Error(errTxt)
    }

    // mark samples as trained now so they are not used next time we train.
    const ids = unusedSamples.map((samp) => samp._id)
    await NerTrainingModel.updateMany(
      { _id: { $in: ids }},
      {
        usedForTraining: true,
        trainedAt: new Date(),
      },
      {session}
    )

    await session.commitTransaction()

    return res.status(200).json({
      status: 'success',
      samplesUsed: unusedSamples.length,
    })
  } catch (error:any) {
    await session.abortTransaction()
    console.error('Error while retraining: ', error )
    return res.status(500).json({
      error: error.message
    })
  } finally {
    session.endSession()
  }
};
