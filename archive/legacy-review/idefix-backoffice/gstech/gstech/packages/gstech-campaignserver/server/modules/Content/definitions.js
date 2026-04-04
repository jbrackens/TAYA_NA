/* @flow */

const { BANNER_LOCATIONS } = require('../../constants');

type Field = {
  property: string,
  title: string,
  type: 'number' | 'string' | 'money' | 'boolean' | 'array',
  required: boolean,
  limit?: number,
  values?: any,
  preview?: string,
  pattern?: string,
};
const contentDefinitions: {
  [key: 'email' | 'sms' | 'notification' | 'landingPage' | 'banner' | 'tournament' | 'localization']: {
    localizedFields: Field[],
    fields: Field[],
  },
} = {
  email: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: ['campaign', 'transactional', 'responder', 'new_game', 'best_offer', 'new_and_best'],
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.image',
        title: 'Image',
        type: 'string',
        required: true,
        pattern: '^(([0-9a-zA-Z_\\{\\}]*)\\.jpg)?',
      },
      {
        property: 'content.lander',
        title: 'Lander',
        type: 'string',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'subject',
        title: 'Subject',
        type: 'string',
        required: true,
        limit: 255,
      },
      {
        property: 'text',
        title: 'Text',
        type: 'string',
        required: true,
      },
    ],
  },
  sms: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: ['campaign', 'transactional', 'responder', 'new_game', 'best_offer', 'new_and_best'],
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'text',
        title: 'Text',
        type: 'string',
        required: true,
      },
    ],
  },
  notification: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: ['campaign', 'transactional', 'responder', 'new_game', 'best_offer', 'new_and_best'],
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.image',
        title: 'Image',
        type: 'string',
        required: true,
        pattern: '^(([0-9a-zA-Z_\\{\\}]*)\\.jpg)?',
      },
      {
        property: 'content.action',
        title: 'Action',
        type: 'string',
        required: false,
        limit: 255,
      },
      {
        property: 'content.important',
        title: 'Important',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.openOnLogin',
        title: 'Open on login',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.bonus',
        title: 'Bonus',
        type: 'string',
        required: false,
        pattern: '([a-zA-Z0-9-_]*)',
        limit: 255,
      },
      {
        property: 'content.rules.tags',
        title: 'Tags',
        type: 'array',
        required: false,
      },
      {
        property: 'content.rules.priority',
        title: 'Priority',
        type: 'number',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'title',
        title: 'Title',
        type: 'string',
        required: true,
        limit: 255,
      },
      {
        property: 'content',
        title: 'Content',
        type: 'string',
        required: true,
      },
      {
        property: 'actiontext',
        title: 'Action text',
        type: 'string',
        required: false,
        limit: 255,
      },
      {
        property: 'disclaimer',
        title: 'Disclaimer',
        type: 'string',
        required: false,
      },
    ],
  },
  landingPage: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: ['cms', 'login', 'register', 'register-fullscreen'],
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.tags',
        title: 'Tags',
        type: 'array',
        required: false,
        pattern: '((\\!)?[0-9a-zA-Z][0-9a-zA-Z_\\-|,]*)?',
      },
      {
        property: 'content.image',
        title: 'Image',
        type: 'string',
        required: false,
        pattern: '^(([0-9a-zA-Z_\\{\\}]*)\\.jpg)?',
      },
      {
        property: 'content.location',
        title: 'Location',
        type: 'string',
        required: false,
        pattern: '^(\\/[\\/\\w]+\\/)?$',
      },
      {
        property: 'content.bonus',
        title: 'Bonus',
        type: 'string',
        required: false,
      },
      {
        property: 'content.source',
        title: 'Source',
        type: 'string',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'title',
        title: 'Title',
        type: 'string',
        required: false,
        limit: 255,
      },
      {
        property: 'subtitle',
        title: 'Subtitle',
        type: 'string',
        required: false,
        limit: 255,
      },
      {
        property: 'text',
        title: 'Text',
        type: 'string',
        required: false,
      },
      {
        property: 'actionHeading',
        title: 'Action heading',
        type: 'string',
        required: false,
      },
      {
        property: 'additionalInfoHead',
        title: 'Additional info head',
        type: 'string',
        required: false,
      },
      {
        property: 'additionalInfo',
        title: 'Additional info',
        type: 'string',
        required: false,
      },
    ],
  },
  banner: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: ['cms', 'internal'],
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.tags',
        title: 'Tags',
        type: 'array',
        required: false,
      },
      {
        property: 'location',
        title: 'Location',
        type: 'string',
        required: true,
        values: BANNER_LOCATIONS,
      },
      {
        property: 'content.promotion',
        title: 'Promotion',
        type: 'string',
        required: false,
      },
      {
        property: 'content.priority',
        title: 'Priority',
        type: 'number',
        required: false,
      },
      {
        property: 'content.weight',
        title: 'Weight',
        type: 'number',
        required: false,
      },
      {
        property: 'content.action',
        title: 'Action',
        type: 'string',
        required: false,
      },
      {
        property: 'content.source',
        title: 'Source',
        type: 'string',
        required: false,
      },
      {
        property: 'content.bonus',
        title: 'Bonus',
        type: 'string',
        required: false,
      },
      {
        property: 'content.wageringRequirement',
        title: 'Wagering requirement',
        type: 'number',
        required: false,
      },
      {
        property: 'content.image',
        title: 'Image',
        type: 'string',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'heading',
        title: 'Heading',
        type: 'string',
        required: false,
      },
      {
        property: 'text',
        title: 'Text',
        type: 'string',
        required: false,
      },
      {
        property: 'action',
        title: 'Action',
        type: 'string',
        required: false,
      },
      {
        property: 'title',
        title: 'Title',
        type: 'string',
        required: false,
      },
      {
        property: 'subheading',
        title: 'Subheading',
        type: 'string',
        required: false,
      },
      {
        property: 'disclaimer',
        title: 'Disclaimer',
        type: 'string',
        required: false,
      },
    ],
  },
  tournament: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_-]*)',
        limit: 255,
      },
      {
        property: 'subtype',
        title: 'Type',
        type: 'string',
        required: true,
        values: []
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.startDate',
        title: 'Start date',
        type: 'string',
        required: true,
      },
      {
        property: 'content.endDate',
        title: 'End date',
        type: 'string',
        required: true,
      },
      {
        property: 'content.promotion',
        title: 'Promotion',
        type: 'string',
        required: true,
      },
      {
        property: 'content.brands',
        title: 'Brands',
        type: 'array',
        required: false,
        values: ['LD', 'KK', 'CJ', 'OS'],
      },
    ],
    localizedFields: [],
  },
  localization: {
    fields: [
      {
        property: 'name',
        title: 'ID',
        type: 'string',
        required: true,
        pattern: '([0-9a-zA-Z][0-9a-zA-Z_\\-\\.]*)',
        limit: 255,
      },
      {
        property: 'active',
        title: 'Active',
        type: 'boolean',
        required: false,
      },
      {
        property: 'content.brands',
        title: 'Brands',
        type: 'array',
        required: false,
        values: ['LD', 'KK', 'CJ', 'OS'],
      },
      {
        property: 'content.format',
        title: 'Format',
        type: 'string',
        required: false,
      },
      {
        property: 'content.server',
        title: 'Server',
        type: 'boolean',
        required: false,
      },
    ],
    localizedFields: [
      {
        property: 'text',
        title: 'Text',
        type: 'string',
        required: true,
      },
    ],
  }
};

module.exports = {
  contentDefinitions,
};
