const toMinorUnits = (amount, decimalPlaces = 2) => {
  if (typeof amount !== "string" || !/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error("Money must be a non-negative decimal string");
  }

  const [whole, fraction = ""] = amount.split(".");
  const normalizedFraction = fraction.padEnd(decimalPlaces, "0");
  return Number(whole) * 10 ** decimalPlaces + Number(normalizedFraction);
};

const assertMinorUnits = (value) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Money must be a non-negative integer in minor units");
  }
  return value;
};

module.exports = { toMinorUnits, assertMinorUnits };
