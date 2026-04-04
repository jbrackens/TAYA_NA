export function trimLink(link: string) {
  let result = "";

  if (link.includes("?")) {
    result = link.substring(0, link.indexOf("?"));
  } else {
    result = link.endsWith("/") ? link.slice(0, -1) : link;
  }

  return result.endsWith("/") ? result.slice(0, -1) : result;
}
