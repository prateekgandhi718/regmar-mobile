import { NeedModel } from "../db/needModel";

const defaultNeeds = [
  {
    key: "protection",
    label: "High Urgency External",
    lineA: "High Urgency",
    lineB: "External",
    layers: ["#D84236", "#FF7A45", "#FF4F67"],
    words: ["Shelter", "Security", "Emergency", "Stability", "Preparedness", "Assurance", "Care", "Reliability"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
    sortOrder: 1,
    isActive: true,
  },
  {
    key: "fuel",
    label: "High Urgency Internal",
    lineA: "High Urgency",
    lineB: "Internal",
    layers: ["#D0AF45", "#ECD86A", "#FBC12F"],
    words: ["Nourishment", "Energy", "Healing", "Recovery", "Hydration", "Strength", "Vitality", "Restoration"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
    sortOrder: 2,
    isActive: true,
  },
  {
    key: "connection",
    label: "Low Urgency External",
    lineA: "Low Urgency",
    lineB: "External",
    layers: ["#6D86D4", "#89B7E9", "#789CF3"],
    words: ["Belonging", "Status", "Kindness", "Recognition", "Love", "Friendship", "Celebration", "Support"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
    sortOrder: 3,
    isActive: true,
  },
  {
    key: "freedom",
    label: "Low Urgency Internal",
    lineA: "Low Urgency",
    lineB: "Internal",
    layers: ["#46BC88", "#7EE2AB", "#5EDAAF"],
    words: ["Time", "Organized", "Unwinding", "Calm", "Simplicity", "Choice", "Ease", "Autonomy"],
    withOptions: ["By myself", "Friends", "Family", "Co-workers", "Date", "Pets"],
    whereOptions: ["Home", "Outside", "Commuting", "Work", "School"],
    sortOrder: 4,
    isActive: true,
  },
];

export const seedNeeds = async () => {
  try {
    for (const need of defaultNeeds) {
      await NeedModel.findOneAndUpdate({ key: need.key }, need, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    }
    console.log("Default needs synced successfully");
  } catch (error) {
    console.error("Error seeding needs:", error);
  }
};
