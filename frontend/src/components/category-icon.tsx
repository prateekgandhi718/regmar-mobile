import { MaterialCommunityIcons } from "@expo/vector-icons";

type CategoryIconProps = {
  name?: string;
  size?: number;
  color?: string;
};

const pickIcon = (categoryName?: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const normalized = (categoryName || "").trim().toLowerCase();

  const exactMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    income: "cash-multiple",
    restaurants: "silverware-fork-knife",
    business: "office-building",
    "card repayment": "credit-card-refresh",
    electricity: "lightning-bolt",
    gifts: "gift-outline",
    gift: "gift-outline",
    atm: "cash",
    "transport & fuel": "car",
    taxes: "receipt-text",
    "food & grocery": "basket-outline",
    fitness: "dumbbell",
    insurance: "shield-check-outline",
    utility: "water-outline",
    "self transfer": "swap-horizontal",
    work: "briefcase-outline",
    loan: "hand-coin-outline",
    housing: "home-outline",
    personal: "account-outline",
    investment: "chart-line",
    travel: "airplane",
    "bank charges": "bank-outline",
    "internet & telecom": "wifi",
    education: "school-outline",
    medical: "stethoscope",
    entertainment: "movie-open-outline",
    shopping: "cart-outline",
    reimbursement: "cash-refund",
  };

  if (exactMap[normalized]) return exactMap[normalized];

  if (normalized.includes("restaurant") || normalized.includes("food")) return "silverware-fork-knife";
  if (normalized.includes("grocery")) return "basket-outline";
  if (normalized.includes("shop")) return "cart-outline";
  if (normalized.includes("travel") || normalized.includes("flight")) return "airplane";
  if (normalized.includes("transport") || normalized.includes("fuel")) return "car";
  if (normalized.includes("tax")) return "receipt-text";
  if (normalized.includes("bank")) return "bank-outline";
  if (normalized.includes("medical") || normalized.includes("health")) return "stethoscope";
  if (normalized.includes("gift")) return "gift-outline";

  return "tag-outline";
};

export function CategoryIcon({ name, size = 18, color = "#FF4D6D" }: CategoryIconProps) {
  return <MaterialCommunityIcons name={pickIcon(name)} size={size} color={color} />;
}
