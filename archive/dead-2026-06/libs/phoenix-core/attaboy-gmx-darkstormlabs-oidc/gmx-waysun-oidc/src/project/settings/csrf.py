from decouple import config

CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_NAME = "oidc_admin_csrf"
CSRF_COOKIE_PATH = "/oidc_admin/"
CSRF_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SECURE = config("DJANGO_SESSION_COOKIE_SECURE", default=True, cast=bool)
