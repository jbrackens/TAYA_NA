import Router from "next/router";

export const redirect = (context: any, target: string, as?: string) => {
  if (context && context.res) {
    context.res.writeHead(303, { Location: as ? as : target });
    context.res.end();
  } else {
    Router.replace(target, as);
  }
};
