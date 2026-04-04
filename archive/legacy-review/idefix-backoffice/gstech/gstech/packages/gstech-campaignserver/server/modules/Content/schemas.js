/* @flow */

const joi = require('gstech-core/modules/joi');
const { brands } = require('gstech-core/modules/constants');

const getContentDraftPreviewSchema: any = joi
  .object({
    brandId: joi.string().trim().brandId().uppercase().required(),
    lang: joi.string().trim().optional(),
  })
  .options({ stripUnknown: true });

const getContentListSchema: any = joi
  .object({
    brandId: joi.string().trim().brandId().uppercase().required(),
  })
  .options({ stripUnknown: true });

const getContentPreviewSchema: any = joi
  .object({
    lang: joi.string().trim().required(),
  })
  .options({ stripUnknown: true });

const getContentSchema: any = joi.object({
  brandId: joi.string().trim().brandId().required(),
  contentType: joi
    .string().trim()
    .valid('email', 'sms', 'notification', 'banner', 'landingPage', 'tournament')
    .required(),
  status: joi.string().trim().valid('published', 'draft').optional(),
  location: joi.string().trim().optional(),
  excludeInactive: joi.boolean().optional().default(true),
});

const getLocalizationsSchema: any = joi.object({
  brandId: joi.string().trim().brandId().required(),
  status: joi.string().trim().valid('published', 'draft').optional(),
  excludeInactive: joi.boolean().optional().default(true),
});

const sendContentForExternalCampaignSchema: any = joi.object({
  name: joi.string().trim().required(),
  playerId: joi.number().required(),
  brandId: joi
    .string().trim()
    .required()
    .valid(...brands.map(({ id }) => id)),
});

const sendEmailDirectlySchema: any = joi
  .object({
    email: joi.string().trim().email().required(),
    currencyId: joi.string().trim().required(),
    languageId: joi.string().trim().required(),
    mailerId: joi.string().trim().required(),
    brandId: joi.string().trim().brandId().required(),
    firstName: joi.string().trim().optional(),
    link: joi.string().trim().uri().optional(),
    values: joi.object().pattern(/^\w+$/, [joi.string(), joi.number()]).optional(),
  })
  .options({ stripUnknown: true });

const contentUpdateObject = {
  name: joi
    .string().trim()
    .regex(/([0-9a-zA-Z][0-9a-zA-Z_-]*)/)
    .required(),
  subtype: joi.when(joi.ref('$type'), {
    is: 'localization',
    then: joi.string().trim().optional().empty(['', null]).default(''),
    otherwise: joi.string().trim().allow('').required(),
  }),
  location: joi.when(joi.ref('$type'), {
    is: 'banner',
    then: joi.string().trim().required(),
  }),
  active: joi.boolean().optional(),
  content: joi
    .object()
    .pattern(
      /en|fi|no|de|sv|fr|es|pt/,
      joi
        .object()
        .when(joi.ref('$type'), {
          is: 'email',
          then: joi
            .object({
              subject: joi.string().trim().required(),
              text: joi.string().trim().required(),
            })
            .required(),
        })
        .when(joi.ref('$type'), {
          is: 'sms',
          then: joi.object({
            text: joi.string().trim().required(),
          }),
        })
        .when(joi.ref('$type'), {
          is: 'notification',
          then: joi.object({
            title: joi.string().trim().allow(''),
            content: joi.string().trim().allow(''),
            actiontext: joi.string().trim().allow(''),
            disclaimer: joi.string().trim().allow(''),
          }),
        })
        .when(joi.ref('$type'), {
          is: 'landingPage',
          then: joi.object({
            text: joi.string().trim().allow(''),
            title: joi.string().trim().allow(''),
            subtitle: joi.string().trim().allow(''),
            actionHeading: joi.string().trim().allow(''),
            additionalInfoHead: joi.string().trim().allow(''),
            additionalInfo: joi.string().trim().allow(''),
          }),
        })
        .when(joi.ref('$type'), {
          is: 'banner',
          then: joi.object({
            text: joi.string().trim().allow(''),
            heading: joi.string().trim().allow(''),
            action: joi.string().trim().allow(''),
            title: joi.string().trim().allow(''),
            subheading: joi.string().trim().allow(''),
            disclaimer: joi.string().trim().allow(''),
          }),
        })
        .when(joi.ref('$type'), {
          is: 'localization',
          then: joi.object({
            text: joi.string().trim().allow('').required(),
          }),
        }),
    )
    .when(joi.ref('$type'), {
      is: 'email',
      then: joi.object({
        lander: joi.string().trim().allow(''),
        image: joi
          .string().trim()
          .regex(/^(([0-9a-zA-Z_{}]*)\.jpg)?/)
          .required(),
      }),
    })
    .when(joi.ref('$type'), {
      is: 'notification',
      then: joi.object({
        image: joi
          .string().trim()
          .regex(/^(([0-9a-zA-Z_{}]*)\.jpg)?/)
          .required(),
        action: joi.string().trim(),
        important: joi.boolean(),
        openOnLogin: joi.boolean(),
        bonus: joi
          .string().trim()
          .regex(/([a-zA-Z0-9-_]*)/)
          .allow(''),
        tags: joi.array().items(joi.string().trim()),
        priority: joi.number().integer().min(0).max(100),
      }),
    })
    .when(joi.ref('$type'), {
      is: 'landingPage',
      then: joi.object({
        tags: joi.array().items(joi.string().trim()),
        image: joi
          .string().trim()
          .regex(/^(([0-9a-zA-Z_{}]*)\.jpg)?/)
          .allow(''),
        location: joi
          .string().trim()
          .regex(/^(\/[/\w]+\/)?$/)
          .allow(''),
        source: joi.string().trim().allow(''),
        bonus: joi.string().trim().allow(''),
      }),
    })
    .when(joi.ref('$type'), {
      is: 'banner',
      then: joi.object({
        tags: joi.array().items(joi.string().trim()),
        action: joi.string().trim().allow(''),
        priority: joi.number(),
        weight: joi.number(),
        source: joi.string().trim().allow(''),
        bonus: joi.string().trim().allow(''),
        wageringRequirement: joi.number().integer(),
        image: joi.string().trim().allow(''),
      }),
    })
    .when(joi.ref('$type'), {
      is: 'tournament',
      then: joi.object({
        startDate: joi.date().required(),
        endDate: joi.date().required(),
        promotion: joi.string().required(),
        brands: joi.array().items(joi.string().brandId()).optional().default([]),
      }),
    })
    .when(joi.ref('$type'), {
      is: 'localization',
      then: joi.object({
        brands: joi.array().items(joi.string().brandId()).optional(),
        format: joi.string().trim().allow('').default(''),
        server: joi.boolean(),
      }),
    }),
};

const contentUpdateSchema: any = joi.object(contentUpdateObject).options({ stripUnknown: true });

const contentCreateSchema: any = joi
  .object({
    ...contentUpdateObject,
    type: joi.string().trim().required(),
    brandId: joi.string().trim().brandId().required(),
  })
  .options({ stripUnknown: true });

const { subtype, ...localizationUpdateObject } = contentUpdateObject;
const localizationCreateSchema: any = joi
  .object(localizationUpdateObject)
  .options({ stripUnknown: true });

module.exports = {
  getContentDraftPreviewSchema,
  getContentListSchema,
  getContentPreviewSchema,
  getContentSchema,
  getLocalizationsSchema,
  sendContentForExternalCampaignSchema,
  sendEmailDirectlySchema,
  contentUpdateSchema,
  contentCreateSchema,
  localizationCreateSchema,
};
