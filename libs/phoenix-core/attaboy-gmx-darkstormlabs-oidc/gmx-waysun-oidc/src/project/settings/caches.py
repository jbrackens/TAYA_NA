from decouple import config

CACHES = {
    "default": {
        "BACKEND": "redis_lock.django_cache.RedisCache",
        "LOCATION": config("DJANGO_REDIS_LOCATION", default="redis://127.0.0.1:6379/1"),
        "OPTIONS": {
            # "PASSWORD": config("DJANGO_REDIS_PASSWORD", default="redis"),
            "CLIENT_CLASS": "django_redis.client.DefaultClient"
        },
    }
}

CACHE_LOCK_MAX_TIMEOUT = config("DJANGO_CACHE_LOCK_MAX_TIMEOUT", default=60, cast=int)
CACHE_LONG_TTL = config("DJANGO_CACHE_LONG_TTL", default=24 * 3600, cast=int)
