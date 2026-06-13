from urllib.parse import urlparse

from decouple import config

SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_AGE = 60 * 60
SESSION_COOKIE_DOMAIN = urlparse(
    config("DJANGO_SITE_URL", default="base.local.rewardsmatrix.com", cast=lambda x: [h.strip() for h in x.split(",")])[
        0
    ]
).hostname
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = "oidc_session_id"
SESSION_COOKIE_PATH = "/"
SESSION_COOKIE_SAMESITE = "Strict"
SESSION_COOKIE_SECURE = config("DJANGO_SESSION_COOKIE_SECURE", default=True, cast=bool)
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
