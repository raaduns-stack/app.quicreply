export type WorkspaceCurrency = {
  code: string;
  symbol: string;
};

const currencySymbols: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
};

const countryCurrencyMap: Record<string, string> = {
  ng: "NGN",
  nigeria: "NGN",
  us: "USD",
  "united states": "USD",
  usa: "USD",
  in: "INR",
  india: "INR",
  gb: "GBP",
  "united kingdom": "GBP",
  uk: "GBP",
  ca: "CAD",
  canada: "CAD",
  au: "AUD",
  australia: "AUD",
};

function formatFallbackName(value?: string | null) {
  const cleaned = value
    ?.split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readSettingsRecord(settings: unknown) {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {};
}

export function getWorkspaceCurrency(
  settings: unknown,
  country?: string | null,
): WorkspaceCurrency {
  const settingsRecord = readSettingsRecord(settings);
  const rawCurrency =
    typeof settingsRecord.currency === "string"
      ? settingsRecord.currency
      : typeof settingsRecord.currencyCode === "string"
        ? settingsRecord.currencyCode
        : null;
  const normalizedCurrency = rawCurrency?.trim().toUpperCase();
  const countryCurrency = country
    ? countryCurrencyMap[country.trim().toLowerCase()]
    : null;
  const code = normalizedCurrency || countryCurrency || "NGN";

  return {
    code,
    symbol: currencySymbols[code] ?? code,
  };
}

export function getStaffDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const username = user.username?.trim();
  const safeUsername = username && !username.includes("@") ? username : null;
  const fallbackName =
    formatFallbackName(safeUsername) || formatFallbackName(user.email);

  return fullName || fallbackName || "Team Member";
}
