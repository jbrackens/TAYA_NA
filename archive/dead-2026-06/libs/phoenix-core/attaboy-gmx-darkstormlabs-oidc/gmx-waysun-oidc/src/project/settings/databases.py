import tempfile

from decouple import config

from project.settings import TESTS_IN_PROGRESS

if not TESTS_IN_PROGRESS:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql_psycopg2",
            "NAME": config("DJANGO_DB_NAME_SECRET", default="microservice"),
            "USER": config("DJANGO_DB_USER_SECRET", default="microservice"),
            "PASSWORD": config("DJANGO_DB_PASS_SECRET", default="microservice"),
            "HOST": config("DJANGO_DB_HOST_SECRET", default="postgres"),
            "PORT": config("DJANGO_DB_PORT_SECRET", default=5432, cast=int),
            "CONN_MAX_AGE": 300,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": tempfile.mkstemp(),
            "TEST_NAME": "TESTS_DB",
            # 'ATOMIC_REQUESTS': True,
        }
    }
