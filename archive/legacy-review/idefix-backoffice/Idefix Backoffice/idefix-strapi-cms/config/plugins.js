module.exports = ({ env }) => ({
  "content-versioning": {
    enabled: true,
  },
  upload: env("ENABLE_S3_UPLOAD", false)
    ? {
        config: {
          provider: "aws-s3",
          providerOptions: {
            accessKeyId: env("AWS_ACCESS_KEY_ID"),
            secretAccessKey: env("AWS_ACCESS_SECRET"),
            region: env("AWS_REGION"),
            params: {
              ACL: env("AWS_ACL", "public-read"),
              Bucket: env("AWS_BUCKET_NAME"),
            },
          },
          // These parameters could solve issues with ACL public-read access — see https://github.com/strapi/strapi/issues/5868 for details
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        },
      }
    : {},
  translate: {
    enabled: true,
    config: {
      // Add the name of your provider here (for example 'deepl' for strapi-provider-translate-deepl or the full package name)
      provider: "deepl",
      providerOptions: {
        // your API key - required and wil cause errors if not provided
        apiKey: "8d06ce2d-21f3-2a7e-2837-a82c2263ccef:fx",
        // use custom api url - optional
        apiUrl: "https://api-free.deepl.com",
      },
      // Which field types are translated (default string, text, richtext, components and dynamiczones)
      // Either string or object with type and format
      // Possible formats: plain, markdown, html (default plain)
      translatedFieldTypes: [
        "string",
        { type: "text", format: "plain" },
        { type: "richtext", format: "markdown" },
        "component",
        "dynamiczone",
      ],
      // If relations should be translated (default true)
      translateRelations: true,
    },
  },
});
