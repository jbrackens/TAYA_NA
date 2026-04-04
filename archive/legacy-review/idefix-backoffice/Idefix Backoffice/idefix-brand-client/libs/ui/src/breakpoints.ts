enum Breakpoints {
  mobile = "mobile",
  bigMobile = "bigMobile",
  tablet = "tablet",
  desktop = "desktop"
}

const keys = Object.keys(Breakpoints) as Breakpoints[];

const values: { [key in Breakpoints]: number } = {
  mobile: 0,
  bigMobile: 375,
  tablet: 480,
  desktop: 900
};

function up(key: Breakpoints) {
  const value = typeof values[key] === "number" ? values[key] : key;
  return `(min-width:${value}px)`;
}

function down(key: Breakpoints) {
  const endIndex = keys.indexOf(key) + 1;
  const upperBound = values[keys[endIndex]];

  if (endIndex === keys.length) {
    // last index applies to all sizes
    return up(keys[0]);
  }

  const value = typeof upperBound === "number" && endIndex > 0 ? upperBound : 0;
  return `(max-width:${value - 0.5}px)`;
}

function between(start: Breakpoints, end: Breakpoints) {
  const endIndex = keys.indexOf(end) + 1;

  if (endIndex === keys.length) {
    return up(start);
  }

  return (
    `(min-width:${values[start]}px) and ` +
    `(max-width:${values[keys[endIndex]] - 0.5}px)`
  );
}

function only(key: Breakpoints) {
  return between(key, key);
}

function width(key: Breakpoints) {
  return values[key];
}

const breakpoints = {
  keys,
  values,
  up,
  down,
  between,
  only,
  width
};

export { breakpoints, Breakpoints };
