from decouple import config

# ---------------------- KAFKA SERVICE ----------------------- #
KAFKA_BOOTSTRAP_SERVERS = config('KAFKA_BOOTSTRAP_SERVERS')
KAFKA_TOPIC = config('KAFKA_TOPIC')

ALLOW_POST_SAVE_WALLET_KAFKA = config('ALLOW_POST_SAVE_WALLET_KAFKA', default=False, cast=bool)
