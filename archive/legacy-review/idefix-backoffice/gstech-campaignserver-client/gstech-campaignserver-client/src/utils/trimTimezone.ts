export default function (date: string | null) {
  if (!date) return;

  if (!Date.parse(date)) {
    throw new Error("Unable to parse date string. Invalid date format");
  }

  if (date.includes("Z")) {
    return date.slice(0, -1);
  }

  if (date.includes("+")) {
    const index = date.indexOf("+");
    return date.slice(0, index);
  }

  if (date.includes("-")) {
    const index = date.lastIndexOf("-");
    return date.slice(0, index);
  }
}
