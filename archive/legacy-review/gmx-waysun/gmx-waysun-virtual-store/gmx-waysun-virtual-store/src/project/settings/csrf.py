from decouple import config

CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_NAME = "virtual_store_csrf"
CSRF_COOKIE_PATH = "/virtual_store_admin/"
CSRF_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SECURE = config("DJANGO_SESSION_COOKIE_SECURE", default=True, cast=bool)
