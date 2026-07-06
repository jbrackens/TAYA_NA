# TapTrade Player App i18n Implementation Notes

## Scope

This work applies to the Player app in:

`apps/taptrade-platform/phoenix-frontend-brand-viegg`

The goal is to localize static product UI copy while leaving dynamic market, user, CMS, chat, notification, and creator-submitted content in its source language.

## Codebase Findings

- Frontend framework: Next.js `11.1.3` with React `17.0.2`.
- Routing model: Next.js Pages Router under `packages/app/pages`.
- Rendering model: hybrid Next app using page `getInitialProps`, `namespacesRequired`, and client-side interactions.
- Existing i18n library: `next-i18next` `6.0.2`.
- Existing i18n setup: `packages/app/i18n.js` wraps the app through `appWithTranslation` in `packages/app/pages/_app.js`.
- Existing locale generation: `packages/app/scripts/translations/generate.js` merges translation source files from brand and app-core packages into `packages/app/public/static/locales`.
- Existing translation source convention: CommonJS modules in `translations/{locale}/{namespace}.js`, not raw JSON files.
- Header/top navigation component: `packages/app-core/components/layout/header/index.tsx`.
- Existing desktop language selector: `packages/app-core/components/layout/header/language-selector/index.tsx`.
- Existing mobile navigation: sportsbook mobile drawer uses `packages/app-core/components/layout/sidebar/SidebarMenu/index.tsx`; prediction mobile navigation uses `packages/app-core/components/redesign/prediction-layout/mobile-chrome.tsx`.
- User profile/preferences: account profile data is fetched through `useProfile`; client preferences such as timezone, odds format, and favorite sports currently use local/session storage helpers from `@taptrade-ui/utils`.
- Existing persistence conventions: local storage and session storage are already used for client preferences. Locale should use `hula_locale` and be structured so profile sync can be added later.
- Existing config conventions: runtime config is exposed through `publicRuntimeConfig` in `packages/app/next.config.js`; feature toggles are string env values such as `PREDICTION_MARKETS_ENABLED`.
- Feature flag pattern: lightweight environment/runtime config, not a dedicated flag service.
- Analytics pattern: Google Tag Manager via `react-gtm-module`; client-side events can be pushed to `window.dataLayer` if present.
- UI library/design system: Ant Design `4.16.12`, styled-components, and local wrappers such as `CoreSelect`.
- Validation/error/toast pattern: Ant Design `message`, local modals, and translated API error namespaces.

## Library Decision

Use the existing `next-i18next` implementation. Do not add `next-intl`, `i18next`, or a translation service in this PR.

The app already has:

- `next-i18next` dependency.
- `appWithTranslation`.
- namespace-based translation loading.
- a locale generation script.
- existing translation namespaces for header, auth, wallet/cashier, account, sportsbook, and footer UI.

The safe retrofit is to expand the supported locales and improve the existing selector/persistence rather than replacing the localization system.

## Supported Locales

Use these locale codes consistently:

- `en`
- `zh-Hans`
- `zh-Hant`
- `tl`
- `ms`
- `id`

English is the default and fallback locale.

## Translation Tone

Translations should use natural, conversational product language commonly seen on ecommerce, fintech, and news websites. Avoid literal or machine-like wording. Regulatory and responsible-gaming copy can be more formal, but ordinary navigation, buttons, empty states, and product helper text should feel clear and familiar.

## High-Priority Static UI Areas

Initial migration should prioritize:

- Header and quick navigation labels.
- Existing desktop language selector.
- Mobile sidebar and prediction mobile navigation.
- Account language/timezone settings.
- Prediction home, market list, market detail, activity, and trade ticket UI.
- Auth modal labels.
- Wallet/cashier labels.
- Portfolio/account/transaction labels.
- Toasts, empty states, form labels, validation messages, and modals.

## Dynamic Content Out of Scope

Do not translate in this PR:

- Market titles.
- Market descriptions and summaries.
- Market creator copy.
- Market rules when sourced as market content.
- Chat messages.
- CMS/admin announcements.
- User-generated content.
- Notification bodies generated outside static UI translation files.

Dynamic translation should be designed as a separate cached, asynchronous service later.

## Adding New Translation Keys

1. Add the English source key in the relevant namespace under `packages/app-core/translations/en`.
2. Add natural, conversational translations for high-priority UI in:
   - `packages/app-core/translations/zh-Hans`
   - `packages/app-core/translations/zh-Hant`
   - `packages/app-core/translations/tl`
   - `packages/app-core/translations/ms`
   - `packages/app-core/translations/id`
3. If a namespace is not ready for full translation, keep a target-locale file that falls back to English with `module.exports = require("../en/<namespace>.js");`.
4. Use existing namespace patterns in components:
   - `const { t } = useTranslation(["prediction"]);`
   - `t("KEY_NAME")`
   - `t("KEY_WITH_VALUE", { value })`
5. Add the namespace to `namespacesRequired` on any page that does not already load it.
6. Run locale generation after dependencies are bootstrapped:

```sh
yarn --cwd apps/taptrade-platform/phoenix-frontend-brand-viegg/packages/app bootstrap:locales
```

7. Run the relevant tests after dependencies are bootstrapped:

```sh
yarn --cwd apps/taptrade-platform/phoenix-frontend-brand-viegg/packages/app-core test lib/i18n/__tests__/locales.test.ts --runInBand
```

## Implementation Shape

1. Add shared locale config and validation helpers.
2. Expand `next-i18next` supported languages.
3. Persist selected locale with `hula_locale`.
4. Refactor the language selector to render all supported locales.
5. Add mobile access to the selector.
6. Add locale source files following the existing `translations/{locale}/{namespace}.js` convention.
7. Replace high-priority hardcoded static UI strings with translation keys.
8. Add focused tests for locale validation, persistence, selector rendering, and fallback behavior.
