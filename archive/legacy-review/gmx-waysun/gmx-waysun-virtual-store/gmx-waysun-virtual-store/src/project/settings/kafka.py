from typing import List

from decouple import config

KAFKA_BOOTSTRAP_SERVERS: List[str] = config(
    "KAFKA_BOOTSTRAP_SERVERS", default=["localhost"], cast=lambda x: x.split(",")
)
KAFKA_SERVICE_MOCK = config("KAFKA_SERVICE_MOCK", default=False, cast=bool)
KAFKA_MESSAGE_MAX_RETRIES = config("KAFKA_MESSAGE_MAX_RETRIES", default=1, cast=int)
KAFKA_TOPIC_NAME = config("KAFKA_TOPIC_NAME", default="dev.virtual-shop.notifications")
KAFKA_CLIENT_ID = config("KAFKA_CLIENT_ID", default="waysun.virtual-shop")
KAFKA_POLL_TIMEOUT = config("KAFKA_POLL_TIMEOUT", default=1, cast=int)
KAFKA_FLUSH_TIMEOUT = config("KAFKA_FLUSH_TIMEOUT", default=1, cast=int)
