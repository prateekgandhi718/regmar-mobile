import mongoose from "mongoose";

const NeedSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    lineA: { type: String, required: true },
    lineB: { type: String, required: true },
    layers: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length === 3,
        message: "layers must contain exactly 3 colors",
      },
    },
    words: { type: [String], default: [] },
    withOptions: { type: [String], default: [] },
    whereOptions: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const NeedModel = mongoose.model("Need", NeedSchema);

export const getNeeds = () =>
  NeedModel.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select("key label lineA lineB layers words withOptions whereOptions sortOrder");
