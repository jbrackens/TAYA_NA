export default (string: string) => {
  const isNegative = string[0] === "-";
  const prefix = isNegative ? "-" : "";
  const [intPart] = string.split(".");
  const absIntPart = isNegative ? intPart.slice(1) : intPart;
  const absString = isNegative ? string.slice(1) : string;

  if (absIntPart.length === 1) {
    return string;
  }

  return prefix + absString.replace(/^0+(?!\.|$)/, "");
};
