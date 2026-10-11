const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** 49900 -> "₹499.00" */
export const formatMinor = (minor: number) => inr.format(minor / 100);

/** "499.5" -> 49950 (same rules as the backend's toMinorUnits) */
export const toMinorUnits = (amount: string): number => {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error("Invalid amount");
  const [whole, fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};
