import logging.config
import os

import nacl.encoding
import pytz
import requests
import ujson as json
from decouple import config

MICROSERVICE_NAME = config("MICROSERVICE_NAME", default="gmx-waysun-user-context")
ENVIRONMENT_TYPE = config("ENVIRONMENT_TYPE", default="local")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEBUG = config("DEBUG", "FALSE", cast=lambda x: x.strip().upper() == "TRUE")

JWT_EXTRA_SECRET_KEY = nacl.encoding.HexEncoder.decode(config("JWT_EXTRA_SECRET_KEY"))
JWT_AUTO_DISCOVERY_URL = config("JWT_AUTO_DISCOVERY_URL")
API_MESSAGE_HEADER_NAME = config("API_MESSAGE_HEADER_NAME", default="X-FS-Api-Message-Id")

JWT_AUTO_DISCOVERY_DATA = requests.get(JWT_AUTO_DISCOVERY_URL)
JWT_ISSUER = JWT_AUTO_DISCOVERY_DATA.json().get("issuer")
JWT_JWKS_URL = JWT_AUTO_DISCOVERY_DATA.json().get("jwks_uri")

API_ENDPOINT_PATH_PREFIX = config("GMX_WAYSUN_API_ENDPOINT_PATH_PREFIX", default="/user_context")

CORS_ORIGINS = config("CORS_ORIGINS", default="*", cast=lambda x: [h.strip() for h in x.split("::")])
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost", cast=lambda x: [h.strip() for h in x.split("::")])

REDIS_CONNECTION_URL = config("REDIS_CONNECTION_URL", default="redis://localhost:6379/1")

DATABASE_USER = config("GMX_WAYSUN_DATABASE_USER", default="user_context")
DATABASE_PASSWORD = config("GMX_WAYSUN_DATABASE_PASSWORD", default="user_context")
DATABASE_HOST = config("GMX_WAYSUN_DATABASE_HOST", default="postgres")
DATABASE_PORT = config("GMX_WAYSUN_DATABASE_PORT", default="5432")
DATABASE_NAME = config("GMX_WAYSUN_DATABASE_NAME", default="user_context")
DATABASE_URL = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

DATABASE_POOL_SIZE = config("GMX_WAYSUN_DATABASE_POOL_SIZE", default=10, cast=int)
DATABASE_POOL_SIZE_OVERFLOW = config("GMX_WAYSUN_DATABASE_POOL_SIZE_OVERFLOW", default=10, cast=int)

REDIS_POOL_SIZE_MIN = config("GMX_WAYSUN_REDIS_POOL_SIZE_MIN", default=1, cast=int)
REDIS_POOL_SIZE_MAX = config("GMX_WAYSUN_REDIS_POOL_SIZE_MAX", default=2, cast=int)

DEFAULT_TIME_ZONE = pytz.timezone(config("TZ", default="UTC"))
DEFAULT_TIME_ZONE_STRING = DEFAULT_TIME_ZONE.zone

LOG_HANDLER = config("LOG_HANDLER", default="console")

LOGGING_CONFIG = None

logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": True,
        "formatters": {
            "console": {
                "()": "user_context.logstash.SimplyConsoleFormatter",
                "fmt": "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)s] %(message)s",
                "datefmt": "%H:%M:%S",
            },
            "logstash": {
                "()": "user_context.logstash.LogstashFormatterWithoutProcess",
                "fmt": json.dumps(
                    {
                        "source_host": "{}".format(MICROSERVICE_NAME),
                        "extra": {
                            "env": "{}".format(ENVIRONMENT_TYPE),
                            "app": "{}".format(MICROSERVICE_NAME),
                        },
                    }
                ),
            },
        },
        "handlers": {
            "logstash": {
                "level": "DEBUG",
                "class": "logging.StreamHandler",
                "formatter": "logstash",
            },
            "console": {
                "level": "DEBUG",
                "class": "logging.StreamHandler",
                "formatter": "console",
            },
        },
        "loggers": {
            "user_context": {
                "handlers": [LOG_HANDLER],
                "level": "DEBUG" if DEBUG else "INFO",
                "propagate": False,
            },
            "aioredlock.algorithm": {
                "handlers": [LOG_HANDLER],
                "level": "DEBUG",
                "propagate": False,
            },
            "aioredis": {
                "handlers": [LOG_HANDLER],
                "level": "DEBUG",
                "propagate": False,
            },
            "": {
                "handlers": [LOG_HANDLER],
                "level": "INFO",
                "propagate": False,
            },
        },
        "root": {
            "handlers": [LOG_HANDLER],
            "level": "INFO",
            "propagate": False,
        },
    }
)
