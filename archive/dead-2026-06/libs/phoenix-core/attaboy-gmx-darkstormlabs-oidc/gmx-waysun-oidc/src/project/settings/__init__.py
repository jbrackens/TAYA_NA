import os
import sys

import nacl.encoding
import nacl.secret
from decouple import config

from .common import BASE_DIR, MIGRATIONS_IN_PROGRESS, TESTS_IN_PROGRESS

# importing pre test
from .test_pre import *  # noqa

SECRET_KEY = config("DJANGO_SECRET_KEY", default="!tlv9$mwey=3i+hvy$=k-r4%dom6efh3v_v#uciqdg#!$n#j$9")

# 32 bytes and can be calculated via: `openssl rand -hex 32`
SECRET_BOX_KEY = config("DJANGO_SECRET_BOX_KEY", cast=lambda kh: nacl.encoding.HexEncoder().decode(kh))
assert len(SECRET_BOX_KEY) == nacl.secret.SecretBox.KEY_SIZE

DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="127.0.0.1", cast=lambda x: [h.strip() for h in x.split(",")])

ROOT_URLCONF = "project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "DIRS": [os.path.join(BASE_DIR, "templates")],
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

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]
AUTHENTICATION_BACKENDS = [
    "profiles.authentication_backends.ProfileUsernameModelBackend",
    "profiles.authentication_backends.ProfilePhoneNumberModelBackend",
    "profiles.authentication_backends.ProfileEmailModelBackend",
]

AUTH_USER_MODEL = "profiles.CustomUser"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework.authentication.TokenAuthentication",),
    "DEFAULT_SCHEMA_CLASS": "rest_framework.schemas.openapi.AutoSchema",
}

SITE_ID = 1

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = False

USE_L10N = False

USE_TZ = True

DJANGO_MICROSERVICE_NAME = config("DJANGO_MICROSERVICE_NAME", default="Django")
ANTSTREAM_TOKEN_EXPIRATION_MINUTES = config("ANTSTREAM_TOKEN_EXPIRATION_MINUTES", default=5, cast=lambda x: x * 60)

PAYMENT_CM_APP_ID = config("PAYMENT_CM_APP_ID", default="unknown")
PAYMENT_CM_APP_KEY = config("PAYMENT_CM_APP_KEY", default="unknown")
PAYMENT_TARGET_API = config("PAYMENT_TARGET_API", default="http://183.235.16.126:9004/pay/payment")
PAYMENT_FORCE_EXT_USER_OVERLOAD = config("PAYMENT_FORCE_EXT_USER_OVERLOAD", default=False, cast=bool)
PAYMENT_FORCE_EXT_USER_ID = config("PAYMENT_FORCE_EXT_USER_ID", default="")  # 59903434388

PHONE_NUMBERS_WHITELISTED_REGIONS = ("US", "CY")

from .apps import *  # noqa
from .caches import *  # noqa
from .cors import *  # noqa
from .csrf import *  # noqa
from .databases import *  # noqa
from .logging import *  # noqa
from .middleware import *  # noqa
from .oidc import *  # noqa
from .sanitizers import *  # noqa
from .sessions import *  # noqa
from .static_no_server import *  # noqa

if config("AWS_ENABLE_HEALTH_CHECK_FIX", False, cast=bool):
    # noinspection PyPackageRequirements
    import requests

    try:
        EC2_PRIVATE_IP = requests.get(
            config("AWS_EC2_PRIVATE_IP_URL", default="http://169.254.169.254/latest/meta-data/local-ipv4"), timeout=5
        ).text
        if EC2_PRIVATE_IP:
            ALLOWED_HOSTS.append(EC2_PRIVATE_IP)
    except requests.exceptions.RequestException:
        pass
