import Router from "next/router";

function pushRoute(target: string) {
  if (target) {
    const isLoggedin = target.includes("/loggedin/");

    if (isLoggedin) {
      const [, , page, tab, id] = target.split("/");

      if (!page) {
        return Router.push("/loggedin");
      }

      if (page === "myaccount" && tab === "inbox") {
        return Router.push(
          "/loggedin/inbox/[notificationId]",
          `/loggedin/inbox/${id}`
        );
      }

      if (page === "myaccount" && id) {
        return Router.push(`/loggedin/myaccount/${tab}?id=${id}`, target);
      }

      if (page === "myaccount" && !id) {
        return Router.push(target);
      }

      if (page === "game") {
        return Router.push("/loggedin/game/[gameId]", `/loggedin/game/${tab}`);
      }

      if (page === "pages") {
        return Router.push(`/loggedin/pages/[slug]`, target);
      }

      if (page === "dialogs") {
        return Router.push(`/loggedin?campaignDialog=true&page=${tab}`, target);
      }

      if (page === "wheel") {
        return Router.push("/loggedin/wheel", target);
      }
    }

    return Router.push(target);
  }

  return Router.push("/loggedin");
}

export { pushRoute };
