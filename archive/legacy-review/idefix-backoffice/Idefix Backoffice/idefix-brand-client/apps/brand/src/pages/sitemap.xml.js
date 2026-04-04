import React from "react";
const axios = require("axios");

const SITE_URL = process.env.NEXT_PUBLIC_BRAND_URL || "https://www.vie.bet";
const DATA_URL = `${SITE_URL}/api/init/nonloggedin?_lang=`;

const createSitemap = (games = []) => {
  const sitemap = [];

  const SUPPORTED_LANGUAGES =
    process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES.split("|");
  const lastMod = `<lastmod>${new Date().toISOString()}</lastmod>`;
  const PAGES = [
    "terms_and_conditions",
    "bonusterms",
    "privacypolicy",
    "sports/betby",
    "games/all",
    "subscriptions"
  ];

  SUPPORTED_LANGUAGES.forEach(lang => {
    sitemap.push(`
      <url>
        <loc>${SITE_URL}/${lang}/</loc>
        ${lastMod}
      </url>
    `);

    PAGES.forEach(page => {
      sitemap.push(`
        <url>
          <loc>${SITE_URL}/${lang}/${page}</loc>
          ${lastMod}
        </url>
      `);
    });
  });

  games.forEach(game => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      sitemap.push(`
        <url>
          <loc>${SITE_URL}/${lang}/game/${game.id}</loc>
          ${lastMod}
        </url>
      `);
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemap.map(item => item)}
    </urlset>
    `;
};

class Sitemap extends React.Component {
  static async getInitialProps({ res }) {
    const defaultLang = "en";

    const response = await axios.get(`${DATA_URL}${defaultLang}`);

    res.setHeader("Content-Type", "text/xml");
    res.write(createSitemap(response.data.games));
    res.end();
  }
}

export default Sitemap;
