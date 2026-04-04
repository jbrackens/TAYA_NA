const proxy = require("http-proxy-middleware");

module.exports = function (app) {
  if (process.env.NODE_ENV === "development") {
    app.use(
      "/api/v1",
      proxy({
        target: process.env.CAMPAIGNSERVER_URL || "https://admin-luckydino.dev.eeg.viegg.net",
        changeOrigin: true
      })
    );
  }
};
