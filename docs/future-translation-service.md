# Future Translation Service

Static Player app UI localization should use frontend translation files only. A translation API must not be called during normal static UI rendering.

Dynamic content translation can be designed later for content that is not safe or practical to ship as static locale files.

## Possible Scope

```txt
translation-service
  POST /translate
  POST /translate/batch
  GET /translations/:entityType/:entityId
```

## Candidate Dynamic Content

- Market titles.
- Market descriptions.
- Creator-submitted market copy.
- Market rules and resolution details when created outside static UI.
- Chat messages.
- Notifications.
- CMS/admin content.
- Announcements.
- User-generated content.

## Design Requirements

- Asynchronous and cached.
- Glossary-aware.
- Does not block page render.
- Does not send wallet addresses, session data, trading activity, or other sensitive user data to a third-party translation provider unless explicitly approved by privacy and compliance review.
- Stores reviewed translations where possible so repeat views do not depend on a live machine translation call.

