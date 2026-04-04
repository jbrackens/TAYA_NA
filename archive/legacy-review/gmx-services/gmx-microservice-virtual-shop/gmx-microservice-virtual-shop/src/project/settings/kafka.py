from typing import List

from decouple import config

KAFKA_BOOTSTRAP_SERVERS: List[str] = config(
    "KAFKA_BOOTSTRAP_SERVERS", default=["localhost"], cast=lambda x: x.split(",")
)
KAFKA_SERVICE_MOCK = config("KAFKA_SERVICE_MOCK", default=False, cast=bool)
KAFKA_MESSAGE_MAX_RETRIES = config("KAFKA_MESSAGE_MAX_RETRIES", default=1, cast=int)
KAFKA_TOPIC_NAME_VIRTUAL_SHOP_BONUS = config(
    "KAFKA_TOPIC_NAME_VIRTUAL_SHOP_BONUS", default="dev.gmx-messaging.virtual-shop-purchase"
)
KAFKA_TOPIC_NAME_NOTIFICATION_SERVICE = config(
    "KAFKA_TOPIC_NAME_NOTIFICATION_SERVICE", default="dev.virtual-shop.notifications"
)
KAFKA_CLIENT_ID = config("KAFKA_CLIENT_ID", default="gmx.virtual-shop")
KAFKA_POLL_TIMEOUT = config("KAFKA_POLL_TIMEOUT", default=1, cast=int)
KAFKA_FLUSH_TIMEOUT = config("KAFKA_FLUSH_TIMEOUT", default=1, cast=int)

SCHEMA_REGISTRY_URL = config("SCHEMA_REGISTRY_URL", default="http://localhost:8081")
SCHEMA_REGISTRY_VALUE = config("SCHEMA_REGISTRY_VALUE", default="value")
SCHEMA_REGISTRY_KEY = config("SCHEMA_REGISTRY_KEY", default="key")
