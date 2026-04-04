import os

import nacl.encoding
import nacl.secret
from decouple import config

DJANGO_MICROSERVICE_NAME = config("DJANGO_MICROSERVICE_NAME", default="Django")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SECRET_KEY = config("DJANGO_SECRET_KEY", default="!tlv9$mwey=3i+hvy$=k-r4%dom6efh3v_v#uciqdg#!$n#j$9")

# 32 bytes and can be calculated via: `openssl rand -hex 32`
SECRET_BOX_KEY = config("DJANGO_SECRET_BOX_KEY", cast=lambda kh: nacl.encoding.HexEncoder().decode(kh))
assert len(SECRET_BOX_KEY) == nacl.secret.SecretBox.KEY_SIZE

DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config(
    "DJANGO_ALLOWED_HOSTS", default="base.local.rewardsmatrix.com", cast=lambda x: [h.strip() for h in x.split(",")]
)

X_FRAME_OPTIONS = config("X_FRAME_OPTIONS", default="DENY")

ROOT_URLCONF = "project.urls"

AUTH_USER_MODEL = "virtual_store.CustomUser"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "project.wsgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework.authentication.TokenAuthentication",)}

ANTSTREAM_TOKEN_EXPIRATION_MINUTES = config("ANTSTREAM_TOKEN_EXPIRATION_MINUTES", default=5, cast=lambda x: x * 60)

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = False

USE_L10N = False

USE_TZ = True

from .apps import *  # noqa
from .caches import *  # noqa
from .cors import *  # noqa
from .csrf import *  # noqa
from .databases import *  # noqa
from .ingestor import *  # noqa
from .kafka import *  # noqa
from .logging import *  # noqa
from .middleware import *  # noqa
from .oidc import *  # noqa
from .sessions import *  # noqa
from .static_no_server import *  # noqa

if config("AWS_ENABLE_HEALTH_CHECK_FIX", False, cast=bool):
    import requests

    try:
        EC2_PRIVATE_IP = requests.get(
            config("AWS_EC2_PRIVATE_IP_URL", default="http://169.254.169.254/latest/meta-data/local-ipv4"), timeout=5
        ).text
        if EC2_PRIVATE_IP:
            ALLOWED_HOSTS.append(EC2_PRIVATE_IP)
    except requests.exceptions.RequestException:
        pass
