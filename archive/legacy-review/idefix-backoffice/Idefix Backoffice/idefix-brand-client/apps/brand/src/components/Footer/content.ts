export const links = {
  primary: [
    {
      locale: "navigation.bet-responsibly",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/responsible_gaming"
    },
    {
      locale: "navigation.terms-conditions",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/terms_and_conditions"
    },
    {
      locale: "navigation.bonusterms",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/bonusterms"
    }
  ],
  secondary: [
    {
      locale: "navigation.whyus",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/aboutus"
    },
    {
      locale: "navigation.privacy-security",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/payments_security"
    },
    {
      locale: "navigation.privacypolicy",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/privacypolicy"
    },
    {
      locale: "navigation.promotions",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/promotions"
    },
    {
      locale: "navigation.virtual-sport-rules",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/virtual-sport-rules"
    },
    {
      locale: "navigation.esports-betting-rules",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/esports-betting-rules"
    },
    {
      locale: "navigation.sports-betting-rules",
      href: "/loggedin/pages/[slug]",
      as: "/loggedin/pages/sports-betting-rules"
    }
  ]
};

export const getNonloggedinLinks = (language: string | undefined) => ({
  primary: [
    {
      locale: "navigation.bet-responsibly",
      href: `/${language}/pages/responsible_gaming/`,
      as: `/${language}/pages/responsible_gaming/`
    },
    {
      locale: "navigation.terms-conditions",
      href: `/${language}/pages/terms_and_conditions/`,
      as: `/${language}/pages/terms_and_conditions/`
    },
    {
      locale: "navigation.bonusterms",
      href: `/${language}/pages/bonusterms/`,
      as: `/${language}/pages/bonusterms/`
    }
  ],
  secondary: [
    {
      locale: "navigation.whyus",
      href: `/${language}/pages/aboutus`,
      as: `/${language}/pages/aboutus`
    },
    {
      locale: "navigation.privacy-security",
      href: `/${language}/pages/payments_security/`,
      as: `/${language}/pages/payments_security/`
    },

    {
      locale: "navigation.privacypolicy",
      href: `/${language}/pages/privacypolicy/`,
      as: `/${language}/pages/privacypolicy/`
    },
    {
      locale: "navigation.promotions",
      href: `/${language}/pages/promotions/`,
      as: `/${language}/pages/promotions/`
    },
    {
      locale: "navigation.virtual-sport-rules",
      href: `/${language}/pages/virtual-sport-rules/`,
      as: `/${language}/pages/virtual-sport-rules/`
    },
    {
      locale: "navigation.sports-betting-rules",
      href: `/${language}/pages/sports-betting-rules/`,
      as: `/${language}/pages/sports-betting-rules/`
    },
    {
      locale: "register.browse-games",
      href: `/games/?lang=${language}`,
      as: `/${language}/games/all`
    },
    {
      locale: "navigation.affiliates",
      href: "https://affmore.com",
      as: "https://affmore.com",
      target: "__blank"
    }
  ]
});
