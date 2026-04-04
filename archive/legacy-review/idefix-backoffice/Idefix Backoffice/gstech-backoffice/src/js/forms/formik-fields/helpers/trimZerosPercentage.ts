export default (string: string) => {
  let newString = string;

  if (string[0] === "-") {
    newString = string.slice(1);
  }

  return newString.replace(/^0+(?!\.|$)/, "");
};
