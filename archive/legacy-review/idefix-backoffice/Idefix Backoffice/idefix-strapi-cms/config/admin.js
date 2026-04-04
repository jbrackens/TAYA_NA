const AzureAdOAuth2Strategy = require("passport-azure-ad-oauth2");
const jwt = require("jsonwebtoken");

module.exports = ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
    // The Azure auth provided should be only used on a production setting.
    providers: env("ENABLE_AZUREAD", false)
      ? [
          {
            uid: "azure_ad_oauth2",
            displayName: "Microsoft",
            icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/320px-Microsoft_logo_%282012%29.svg.png",
            createStrategy: (strapi) =>
              new AzureAdOAuth2Strategy(
                {
                  clientID: env("MICROSOFT_CLIENT_ID", ""),
                  clientSecret: env("MICROSOFT_CLIENT_SECRET", ""),
                  scope: ["user:email"],
                  tenant: env("MICROSOFT_TENANT_ID", ""),
                  callbackURL:
                    strapi.admin.services.passport.getStrategyCallbackURL(
                      "azure_ad_oauth2"
                    ),
                },
                (accessToken, refreshToken, params, profile, done) => {
                  let waadProfile = jwt.decode(params.id_token, "", true);
                  done(null, {
                    email: waadProfile.email,
                    username: waadProfile.email,
                    firstname: waadProfile.given_name, // optional if email and username exist
                    lastname: waadProfile.family_name, // optional if email and username exist
                  });
                }
              ),
          },
        ]
      : [],
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("API_TOKEN_SALT"),
    },
  },
});
