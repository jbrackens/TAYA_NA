import os
from decouple import config

DJANGO_MICROSERVICE_NAME = config('DJANGO_MICROSERVICE_NAME', default='Django')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SECRET_KEY = config('DJANGO_SECRET_KEY', default='!tlv9$mwey=3i+hvy$=k-r4%dom6efh3v_v#uciqdg#!$n#j$9')

DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='base.local.rewardsmatrix.com', cast=lambda x: [h.strip() for h in x.split(',')])

ROOT_URLCONF = 'project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'project.wsgi.application'

AUTH_PASSWORD_VALIDATORS = []

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

SITE_URL = config('DJANGO_SITE_URL')
# TODO
FRONTEND_REDIRECT_URL = config("", "https://api.dev.gmx.flipsports.net/ext_order?uid={}")

CONN_MAX_AGE = 60

# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = False

USE_L10N = False

USE_TZ = True

from .apps import *
from .caches import *
from .cors import *
from .databases import *
from .logging import *
from .mailtrap import *
from .middleware import *
from .oidc import *
from .services import *
from .sessions import *
from .static import *

if config('AWS_ENABLE_HEALTH_CHECK_FIX', False, cast=bool):
    import requests
    try:
        EC2_PRIVATE_IP = requests.get(
            config('AWS_EC2_PRIVATE_IP_URL', default='http://169.254.169.254/latest/meta-data/local-ipv4'),
            timeout=5).text
        if EC2_PRIVATE_IP:
            ALLOWED_HOSTS.append(EC2_PRIVATE_IP)
    except requests.exceptions.RequestException:
        pass

