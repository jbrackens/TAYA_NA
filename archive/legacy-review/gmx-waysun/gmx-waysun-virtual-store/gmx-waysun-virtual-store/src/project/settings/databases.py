import sys

from decouple import config

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": config("DJANGO_DB_NAME_SECRET", default="microservice"),
        "USER": config("DJANGO_DB_USER_SECRET", default="microservice"),
        "PASSWORD": config("DJANGO_DB_PASS_SECRET", default="microservice"),
        "HOST": config("DJANGO_DB_HOST_SECRET", default="postgres"),
        "PORT": config("DJANGO_DB_PORT_SECRET", default=5432, cast=int),
        "ATOMIC_REQUESTS": True,
        "CONN_MAX_AGE": 300,
    }
}
if "test" in sys.argv:
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "TEST",
        "ATOMIC_REQUESTS": True,
    }
    TEST_JWKS = config("TEST_JWKS")
