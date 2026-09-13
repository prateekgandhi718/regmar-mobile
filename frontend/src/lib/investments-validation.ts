export const sanitizePan = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

export const isValidPan = (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
