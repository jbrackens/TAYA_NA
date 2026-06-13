import logging.config
import os
from collections import namedtuple

import nacl.encoding
import requests
import ujson as json
from decouple import config

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AVRO_SCHEMA_BASE_DIR = os.path.join(BASE_DIR, "gmx-avro-schema", "nifi")
DEBUG = config("DEBUG", "FALSE", cast=lambda x: x.strip().upper() == "TRUE")

JWT_EXTRA_SECRET_KEY = nacl.encoding.HexEncoder.decode(config("JWT_EXTRA_SECRET_KEY"))
JWT_AUDIENCE = config("JWT_AUDIENCE", cast=lambda x: [h.strip() for h in x.split("::")])
JWT_AUTO_DISCOVERY_URL = config("JWT_AUTO_DISCOVERY_URL")
API_MESSAGE_HEADER_NAME = config("API_MESSAGE_HEADER_NAME", "FS-Api-Message-Id")

CORS_ORIGINS = config("CORS_ORIGINS", "*", cast=lambda x: [h.strip() for h in x.split("::")])
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="local.waysun", cast=lambda x: [h.strip() for h in x.split("::")])

REDIS_CONNECTION_URL = config("REDIS_CONNECTION_URL", default="redis://localhost:6379/1")
BASIC_JIRA_TOKEN = config("BASIC_JIRA_TOKEN")


class KAFKA:
    SERVERS = config("KAFKA_SERVERS", default="localhost", cast=lambda x: [h.strip() for h in x.split("::")])
    FRONT_END_TRIGGER = config("KAFKA_FRONT_END_TRIGGER", default="FRONT_END")
    GMX_TARGET = config("KAFKA_GMX_TARGET", default="GMX")
    SBTECH_TARGET = config("KAFKA_SBTECH_TARGET", default="SBTECH")
    ADD = config("KAFKA_MERCHANT_API_OPERATION_KIND_ADD", default="add")

    class TOPICS:
        TEST = config("KAFKA_TOPIC_COMMUNICATION_TEST", default="gmx-technical.nifi-rest-communication-test")
        VIRTUAL_SHOP_PAYMENT = config("KAFKA_TOPIC_VIRTUAL_SHOP_PAYMENT", default="gmx-messaging.virtual-shop-purchase")
        VIRTUAL_SHOP_ORDER_LINE_RESOLVE = config(
            "KAFKA_TOPIC_VIRTUAL_SHOP_ORDER_LINE_RESOLVE",
            default="gmx-messaging.virtual-shop-post-purchase-line-resolve",
        )
        WALLET_TOP_UP = config(
            "KAFKA_TOPIC_SPORT_NATION_WALLET_TOP_UP", default="gmx-messaging.sportnation-reward-points-topup"
        )
        TAG_MANAGER_CHANGE_STATE = config(
            "KAFKA_TOPIC_TAG_MANAGER_CHANGE_STATE_MAPPING", cast=lambda x: dict(zip(*[iter(x.lower().split("::"))] * 2))
        )

        CASINO_2AM_ACTION: dict = config(
            "KAFKA_TOPIC_CASINO_2AM_ACTION_MAPPING",
            "sport_nation::gmx-messaging.sportnation-customer-action::"
            "red_zone::gmx-messaging.redzone-customer-action::"
            "fans_bet::gmx-messaging.fansbetuk-customer-action",
            cast=lambda x: dict(zip(*[iter(x.lower().split("::"))] * 2)),
        )

        AUTODOC_VERIFY: dict = config(
            "KAFKA_TOPIC_AUTODOC_VERIFY_MAPPING",
            "sport_nation::gmx-technical.sportnation-system-notification",
            cast=lambda x: dict(zip(*[iter(x.lower().split("::"))] * 2)),
        )

    # noinspection PyPep8Naming
    class TOPICS_CONFIG:
        CHANGE_STATE_MARKETING_CAMPAIGN = config(
            "KAFKA_TOPIC_CONFIG_CHANGE_STATE_MARKETING_CAMPAIGN", default="MARKETING_CAMPAIGN"
        )
        CHANGE_STATE_OPERATION_TYPE_TAG = config("KAFKA_TOPIC_CONFIG_CHANGE_STATE_OPERATION_TYPE_TAG", default="TAG")
        CHANGE_STATE_OPERATION_TYPE_FLAG = config("KAFKA_TOPIC_CONFIG_CHANGE_STATE_OPERATION_TYPE_FLAG", default="FLAG")
        CHANGE_STATE_OPERATION_TYPE_STATUS = config(
            "KAFKA_TOPIC_CONFIG_CHANGE_STATE_OPERATION_TYPE_STATUS", default="STATUS"
        )
        CHANGE_STATE_OPERATION_TYPE_NOTE = config("KAFKA_TOPIC_CONFIG_CHANGE_STATE_OPERATION_TYPE_NOTE", default="NOTE")
        CHANGE_STATE_OPERATION_TYPE_JIRA = config("KAFKA_TOPIC_CONFIG_CHANGE_STATE_OPERATION_TYPE_JIRA", default="JIRA")


SCHEMA_REGISTRY_URL = config("SCHEMA_REGISTRY_URL", default="http://localhost:8081")
SCHEMA_REGISTRY_VALUE = config("SCHEMA_REGISTRY_VALUE", default="value")
SCHEMA_REGISTRY_KEY = config("SCHEMA_REGISTRY_KEY", default="key")
SchemaVersion = namedtuple("SchemaVersion", "subject schema_id version")

GMX_API_GATEWAY = config("GMX_INTERNAL_GATEWAY")  # on production it should be internal ALB address
JIRA_API_GATEWAY = config("JIRA_API_GATEWAY")

JIRA_TRANSITION_TO_DO = config("JIRA_TRANSITION_TO_DO", default="11")
JIRA_TRANSITION_IN_PROGRESS = config("JIRA_TRANSITION_IN_PROGRESS", default="21")
JIRA_TRANSITION_IN_REVIEW = config("JIRA_TRANSITION_IN_REVIEW", default="31")
JIRA_TRANSITION_DONE = config("JIRA_TRANSITION_DONE", default="41")

JWT_AUTO_DISCOVERY_DATA = requests.get(JWT_AUTO_DISCOVERY_URL).json()
JWT_ISSUER = JWT_AUTO_DISCOVERY_DATA.get("issuer")
JWT_JWKS_URL = JWT_AUTO_DISCOVERY_DATA.get("jwks_uri")

SB_TECH_CONFIGURATION: dict = config(
    "SB_TECH_CONFIGURATION",
    "sport_nation::https://www.sportnation.bet/pagemethods.aspx/ExtAPIValidateToken::"
    "red_zone::https://www.redzonesports.bet/pagemethods.aspx/ExtAPIValidateToken::"
    "fans_bet::https://uk.fansbet.com/pagemethods.aspx/ExtAPIValidateToken",
    cast=lambda x: dict(zip(*[iter(x.split("::"))] * 2)),
)
SB_TECH_TOKEN_PREFIX_MAPPING: dict = config(
    "SB_TECH_TOKEN_PREFIX_MAPPING",
    "SN_::sport_nation::RZ_::red_zone::FB_::fans_bet",
    cast=lambda x: dict(zip(*[iter(x.lower().split("::"))] * 2)),
)
SB_TECH_COMPANY_MAPPING: dict = config(
    "SB_TECH_COMPANY_MAPPING",
    "sport_nation::UUID1::red_zone::UUID2::fans_bet::UUID3",
    cast=lambda x: dict(zip(*[iter(x.lower().split("::"))] * 2)),
)

MICROSERVICE_NAME = config("MICROSERVICE_NAME", default="gmx-nifi-rest")
ENVIRONMENT_TYPE = config("ENVIRONMENT_TYPE", default="local")
LOG_HANDLER = config("LOG_HANDLER", default="console")

LOGGING_CONFIG = None

logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": True,
        "formatters": {
            "console": {
                "()": "gmx_nifi_rest.logstash.SimplyConsoleFormatter",
                "fmt": "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)s] %(message)s",
                "datefmt": "%H:%M:%S",
            },
            "logstash": {
                "()": "gmx_nifi_rest.logstash.LogstashFormatterWithoutProcess",
                "fmt": json.dumps(
                    {
                        "source_host": "{}".format(MICROSERVICE_NAME),
                        "extra": {
                            "environment": "{}".format(ENVIRONMENT_TYPE),
                            "microservice": "{}".format(MICROSERVICE_NAME),
                        },
                    }
                ),
            },
        },
        "handlers": {
            "logstash": {"level": "DEBUG", "class": "logging.StreamHandler", "formatter": "logstash",},
            "console": {"level": "DEBUG", "class": "logging.StreamHandler", "formatter": "console",},
        },
        "loggers": {
            "gmx_nifi_rest": {"handlers": [LOG_HANDLER], "level": "DEBUG" if DEBUG else "INFO", "propagate": False,},
            "aioredlock.algorithm": {"handlers": [LOG_HANDLER], "level": "DEBUG", "propagate": False,},
            "aioredis": {"handlers": [LOG_HANDLER], "level": "DEBUG", "propagate": False,},
            "aiokafka.conn": {"handlers": [LOG_HANDLER], "level": "INFO", "propagate": False,},
            "aiokafka": {"handlers": [LOG_HANDLER], "level": "DEBUG", "propagate": False,},
            "": {"handlers": [LOG_HANDLER], "level": "INFO", "propagate": False,},
        },
    }
)

if config("AWS_ENABLE_HEALTH_CHECK_FIX", "FALSE", cast=lambda x: x.strip().upper() == "TRUE"):
    try:
        EC2_PRIVATE_IP = requests.get(
            config("AWS_EC2_PRIVATE_IP_URL", default="http://169.254.169.254/latest/meta-data/local-ipv4"), timeout=1
        ).text
        if EC2_PRIVATE_IP:
            ALLOWED_HOSTS.append(EC2_PRIVATE_IP)
    except requests.exceptions.RequestException:
        pass
