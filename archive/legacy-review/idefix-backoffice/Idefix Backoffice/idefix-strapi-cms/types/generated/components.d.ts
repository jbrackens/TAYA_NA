import type { Schema, Attribute } from '@strapi/strapi';

export interface ArticlesTextArticle extends Schema.Component {
  collectionName: 'components_articles_text_articles';
  info: {
    displayName: 'Text Article';
    icon: 'file';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    content: Attribute.RichText & Attribute.Required;
  };
}

export interface BannersActionBanner extends Schema.Component {
  collectionName: 'components_banners_action_banners';
  info: {
    displayName: 'Banner Group';
    icon: 'layout';
    description: '';
  };
  attributes: {
    banners: Attribute.Relation<
      'banners.action-banner',
      'oneToMany',
      'api::banner.banner'
    >;
    heading: Attribute.Component<'common.heading'>;
  };
}

export interface BannersFloatingBanner extends Schema.Component {
  collectionName: 'components_banners_floating_banners';
  info: {
    displayName: 'Floating Banner';
    icon: 'filter';
    description: '';
  };
  attributes: {
    banner: Attribute.Relation<
      'banners.floating-banner',
      'oneToOne',
      'api::banner.banner'
    >;
  };
}

export interface BannersFullwidthBanner extends Schema.Component {
  collectionName: 'components_banners_fullwidth_banners';
  info: {
    displayName: 'Fullwidth Banner';
    icon: 'expand';
    description: '';
  };
  attributes: {
    banner: Attribute.Relation<
      'banners.fullwidth-banner',
      'oneToOne',
      'api::banner.banner'
    >;
  };
}

export interface BannersHeroBanner extends Schema.Component {
  collectionName: 'components_banners_hero_banners';
  info: {
    displayName: 'Hero Banner';
    icon: 'arrowUp';
    description: '';
  };
  attributes: {
    banner: Attribute.Relation<
      'banners.hero-banner',
      'oneToOne',
      'api::banner.banner'
    >;
  };
}

export interface CommonActionButton extends Schema.Component {
  collectionName: 'components_common_action_buttons';
  info: {
    displayName: 'ActionButton';
    icon: 'play';
    description: '';
  };
  attributes: {
    label: Attribute.String &
      Attribute.Required &
      Attribute.DefaultTo<'Button label text'>;
    actionType: Attribute.Enumeration<
      [
        'toggle-registration-form',
        'toggle-login-form',
        'toggle-contact-support',
        'toggle-player-protection-page',
        'open-all-games-page',
        'set-game-category',
        'open-game'
      ]
    > &
      Attribute.Required;
  };
}

export interface CommonButtonLink extends Schema.Component {
  collectionName: 'components_common_button_links';
  info: {
    displayName: 'ButtonLink';
    icon: 'link';
  };
  attributes: {
    label: Attribute.String &
      Attribute.Required &
      Attribute.DefaultTo<'Button label text'>;
    url: Attribute.String &
      Attribute.Required &
      Attribute.DefaultTo<'/some/url/value'>;
  };
}

export interface CommonDivider extends Schema.Component {
  collectionName: 'components_common_dividers';
  info: {
    displayName: 'Divider';
    icon: 'oneToOne';
    description: '';
  };
  attributes: {};
}

export interface CommonFeatures extends Schema.Component {
  collectionName: 'components_common_features';
  info: {
    displayName: 'Casino Features';
    icon: 'grid';
    description: '';
  };
  attributes: {
    character: Attribute.Media<'images'>;
    features: Attribute.Relation<
      'common.features',
      'oneToMany',
      'api::feature.feature'
    >;
  };
}

export interface CommonGamblingProblems extends Schema.Component {
  collectionName: 'components_common_gambling_problems';
  info: {
    displayName: 'Gambling Problems';
    icon: 'layer';
    description: '';
  };
  attributes: {
    gambling_helps: Attribute.Relation<
      'common.gambling-problems',
      'oneToMany',
      'api::gambling-help.gambling-help'
    >;
    heading: Attribute.Component<'common.heading'>;
  };
}

export interface CommonHeading extends Schema.Component {
  collectionName: 'components_common_headings';
  info: {
    displayName: 'Heading';
    icon: 'layer';
    description: '';
  };
  attributes: {
    text: Attribute.String & Attribute.Required;
    icon: Attribute.Media<'images'>;
    description: Attribute.Text;
  };
}

export interface CommonMarkdown extends Schema.Component {
  collectionName: 'components_common_markdowns';
  info: {
    displayName: 'Markdown';
    icon: 'file';
  };
  attributes: {
    text: Attribute.RichText & Attribute.Required;
  };
}

export interface CommonPresetMarkdown extends Schema.Component {
  collectionName: 'components_common_preset_markdowns';
  info: {
    displayName: 'Preset Markdown';
    icon: 'write';
  };
  attributes: {
    markdown: Attribute.Relation<
      'common.preset-markdown',
      'oneToOne',
      'api::markdown.markdown'
    >;
  };
}

export interface GamesCategoryGames extends Schema.Component {
  collectionName: 'components_games_category_games';
  info: {
    displayName: 'Category Games';
    icon: 'grid';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    category: Attribute.Relation<
      'games.category-games',
      'oneToOne',
      'api::games-category.games-category'
    >;
  };
}

export interface GamesLiveCasino extends Schema.Component {
  collectionName: 'components_games_live_casinos';
  info: {
    displayName: 'Live Casino';
    icon: 'slideshow';
    description: '';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    text: Attribute.Text & Attribute.Required;
    buttons: Attribute.Component<'common.action-button', true> &
      Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    video: Attribute.Media<'videos'> & Attribute.Required;
    heading: Attribute.Component<'common.heading'>;
  };
}

export interface GamesProvidersList extends Schema.Component {
  collectionName: 'components_games_providers_lists';
  info: {
    displayName: 'Providers List';
    icon: 'filter';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    providers: Attribute.Relation<
      'games.providers-list',
      'oneToMany',
      'api::games-provider.games-provider'
    >;
  };
}

export interface GamesRelatedGames extends Schema.Component {
  collectionName: 'components_games_related_games';
  info: {
    displayName: 'Related Games';
    icon: 'layout';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    games: Attribute.Relation<
      'games.related-games',
      'oneToMany',
      'api::game.game'
    >;
  };
}

export interface GamesThemesList extends Schema.Component {
  collectionName: 'components_games_themes_lists';
  info: {
    displayName: 'Themes List';
    icon: 'bulletList';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    themes: Attribute.Relation<
      'games.themes-list',
      'oneToMany',
      'api::games-theme.games-theme'
    >;
  };
}

export interface GamesTopGames extends Schema.Component {
  collectionName: 'components_games_top_games';
  info: {
    displayName: 'Top Games';
    icon: 'train';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    games: Attribute.Relation<'games.top-games', 'oneToMany', 'api::game.game'>;
  };
}

export interface JefeDepositStep extends Schema.Component {
  collectionName: 'components_jefe_deposit_steps';
  info: {
    displayName: 'Deposit Step';
    icon: 'oneWay';
    description: '';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    rewardType: Attribute.String;
    description: Attribute.Text;
    image: Attribute.Media<'images'>;
    benefits: Attribute.RichText & Attribute.Required;
    condition: Attribute.Text;
    bonusTitle: Attribute.String & Attribute.Required;
    bonusDescription: Attribute.Text & Attribute.Required;
    bonusPercentage: Attribute.String & Attribute.Required;
    bonusLimit: Attribute.String & Attribute.Required;
    bonusCondition: Attribute.Text & Attribute.Required;
  };
}

export interface JefeFeatures extends Schema.Component {
  collectionName: 'components_jefe_features';
  info: {
    displayName: 'Features';
    icon: 'command';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'> & Attribute.Required;
    features: Attribute.Relation<
      'jefe.features',
      'oneToMany',
      'api::feature.feature'
    >;
  };
}

export interface JefeJefeCategoryGames extends Schema.Component {
  collectionName: 'components_jefe_jefe_category_games';
  info: {
    displayName: 'Category Games';
    icon: 'expand';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'> & Attribute.Required;
    category: Attribute.Relation<
      'jefe.jefe-category-games',
      'oneToOne',
      'api::games-category.games-category'
    >;
  };
}

export interface JefeWelcomeOffer extends Schema.Component {
  collectionName: 'components_jefe_welcome_offers';
  info: {
    displayName: 'Welcome Offer';
    icon: 'chartBubble';
    description: '';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    description: Attribute.Text & Attribute.Required;
    character: Attribute.Media<'images'>;
    buttons: Attribute.Component<'common.action-button'> & Attribute.Required;
    games: Attribute.Relation<
      'jefe.welcome-offer',
      'oneToMany',
      'api::game.game'
    >;
  };
}

export interface JefeWelcomePackage extends Schema.Component {
  collectionName: 'components_jefe_welcome_packages';
  info: {
    displayName: 'Welcome Package';
    icon: 'television';
    description: '';
  };
  attributes: {
    steps: Attribute.Component<'jefe.deposit-step', true> &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
          max: 3;
        },
        number
      >;
  };
}

export interface OffersWelcomeOffer extends Schema.Component {
  collectionName: 'components_offers_welcome_offers';
  info: {
    displayName: 'Welcome Offer';
    icon: 'puzzle';
    description: '';
  };
  attributes: {
    title: Attribute.String;
    text: Attribute.Text;
    description: Attribute.Text;
    character: Attribute.Media<'images'>;
    backgroundImage: Attribute.Media<'images'>;
    buttons: Attribute.Component<'common.action-button', true> &
      Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    payAndPlay: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
  };
}

export interface OlaspillFeatures extends Schema.Component {
  collectionName: 'components_olaspill_features';
  info: {
    displayName: 'Features';
    icon: 'dashboard';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    features: Attribute.Relation<
      'olaspill.features',
      'oneToMany',
      'api::feature.feature'
    >;
  };
}

export interface PayAndPlayDepositForm extends Schema.Component {
  collectionName: 'components_pay_and_play_deposit_forms';
  info: {
    displayName: 'Deposit Form';
    icon: 'server';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
  };
}

export interface PaymentsPaymentMethodsList extends Schema.Component {
  collectionName: 'components_payments_payment_methods_lists';
  info: {
    displayName: 'Payment Methods List';
    icon: 'bulletList';
    description: '';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    methods: Attribute.Relation<
      'payments.payment-methods-list',
      'oneToMany',
      'api::payment-method.payment-method'
    >;
    paymentType: Attribute.Enumeration<['withdrawal', 'deposit']> &
      Attribute.Required;
    fallbackCurrency: Attribute.Enumeration<
      [
        'EUR',
        'USD',
        'NOK',
        'CLP',
        'CAD',
        'NZD',
        'BRL',
        'GBP',
        'PEN',
        'SEK',
        'INR'
      ]
    >;
  };
}

export interface PromotionsPromotionsGrid extends Schema.Component {
  collectionName: 'components_promotions_promotions_grids';
  info: {
    displayName: 'Promotions Grid';
    icon: 'apps';
  };
  attributes: {
    promotions: Attribute.Relation<
      'promotions.promotions-grid',
      'oneToMany',
      'api::promotion.promotion'
    >;
  };
}

export interface PromotionsPromotionsList extends Schema.Component {
  collectionName: 'components_promotions_promotions_lists';
  info: {
    displayName: 'Promotions List';
    icon: 'bulletList';
    description: '';
  };
  attributes: {
    promotions: Attribute.Relation<
      'promotions.promotions-list',
      'oneToMany',
      'api::promotion.promotion'
    >;
  };
}

export interface SharedInfoBlock extends Schema.Component {
  collectionName: 'components_shared_info_blocks';
  info: {
    displayName: 'Info Block';
    icon: 'filter';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    description: Attribute.RichText & Attribute.Required;
    icon: Attribute.Media<'images'>;
  };
}

export interface SharedMetaSocial extends Schema.Component {
  collectionName: 'components_shared_meta_socials';
  info: {
    displayName: 'MetaSocial';
    icon: 'project-diagram';
    description: '';
  };
  attributes: {
    socialNetwork: Attribute.Enumeration<['Facebook', 'Twitter']> &
      Attribute.Required;
    title: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    description: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 65;
      }>;
    image: Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedSeo extends Schema.Component {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'Seo';
    icon: 'search';
    description: '';
  };
  attributes: {
    metaTitle: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    metaDescription: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 50;
        maxLength: 160;
      }>;
    metaImage: Attribute.Media<'images' | 'files' | 'videos'>;
    metaSocial: Attribute.Component<'shared.meta-social', true>;
    keywords: Attribute.Text;
    metaRobots: Attribute.String;
    structuredData: Attribute.JSON;
    metaViewport: Attribute.String;
    canonicalURL: Attribute.String;
  };
}

export interface VieFeatures extends Schema.Component {
  collectionName: 'components_vie_features';
  info: {
    displayName: 'Features';
    icon: 'server';
  };
  attributes: {
    heading: Attribute.Component<'common.heading'>;
    features: Attribute.Relation<
      'vie.features',
      'oneToMany',
      'api::feature.feature'
    >;
  };
}

export interface VieOffer extends Schema.Component {
  collectionName: 'components_vie_offers';
  info: {
    displayName: 'Offer';
    icon: 'crown';
    description: '';
  };
  attributes: {
    label: Attribute.String & Attribute.Required;
    title: Attribute.Text & Attribute.Required;
    buttons: Attribute.Component<'common.action-button', true> &
      Attribute.SetMinMax<
        {
          max: 2;
        },
        number
      >;
    backgroundImage: Attribute.Media<'images'>;
    subtitle: Attribute.Text;
    payAndPlay: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
  };
}

export interface VieWelcomePackage extends Schema.Component {
  collectionName: 'components_vie_welcome_packages';
  info: {
    displayName: 'Welcome Package';
    icon: 'stack';
  };
  attributes: {
    offers: Attribute.Component<'vie.offer', true>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'articles.text-article': ArticlesTextArticle;
      'banners.action-banner': BannersActionBanner;
      'banners.floating-banner': BannersFloatingBanner;
      'banners.fullwidth-banner': BannersFullwidthBanner;
      'banners.hero-banner': BannersHeroBanner;
      'common.action-button': CommonActionButton;
      'common.button-link': CommonButtonLink;
      'common.divider': CommonDivider;
      'common.features': CommonFeatures;
      'common.gambling-problems': CommonGamblingProblems;
      'common.heading': CommonHeading;
      'common.markdown': CommonMarkdown;
      'common.preset-markdown': CommonPresetMarkdown;
      'games.category-games': GamesCategoryGames;
      'games.live-casino': GamesLiveCasino;
      'games.providers-list': GamesProvidersList;
      'games.related-games': GamesRelatedGames;
      'games.themes-list': GamesThemesList;
      'games.top-games': GamesTopGames;
      'jefe.deposit-step': JefeDepositStep;
      'jefe.features': JefeFeatures;
      'jefe.jefe-category-games': JefeJefeCategoryGames;
      'jefe.welcome-offer': JefeWelcomeOffer;
      'jefe.welcome-package': JefeWelcomePackage;
      'offers.welcome-offer': OffersWelcomeOffer;
      'olaspill.features': OlaspillFeatures;
      'pay-and-play.deposit-form': PayAndPlayDepositForm;
      'payments.payment-methods-list': PaymentsPaymentMethodsList;
      'promotions.promotions-grid': PromotionsPromotionsGrid;
      'promotions.promotions-list': PromotionsPromotionsList;
      'shared.info-block': SharedInfoBlock;
      'shared.meta-social': SharedMetaSocial;
      'shared.seo': SharedSeo;
      'vie.features': VieFeatures;
      'vie.offer': VieOffer;
      'vie.welcome-package': VieWelcomePackage;
    }
  }
}
