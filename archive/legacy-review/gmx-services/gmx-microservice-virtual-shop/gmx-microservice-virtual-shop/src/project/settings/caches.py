import sys

from decouple import config

REDIS_CONNECTION_URL = config("DJANGO_REDIS_LOCATION")

CACHES = {
    "default": {
        "BACKEND": "redis_lock.django_cache.RedisCache",
        "LOCATION": config("DJANGO_REDIS_LOCATION", default="redis://127.0.0.1:6379/1"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CACHE_TTL = 60
CACHE_LOCK_MAX_TIMEOUT = 60

if "test" in sys.argv:
    import fakeredis
    from django_redis.pool import ConnectionFactory

    class FakeRedisConnectionFactory(ConnectionFactory):
        def get_connection(self, params):  # noqa: F841
            return fakeredis.FakeStrictRedis()

        def connect(self, url):
            return self.get_connection(dict())

    CACHES["default"] = {
        "BACKEND": "redis_lock.django_cache.RedisCache",
        "LOCATION": "FakeConnection<db=0>",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "REDIS_CLIENT_CLASS": "fakeredis.FakeStrictRedis",
        },
    }
    DJANGO_REDIS_CONNECTION_FACTORY = "project.settings.caches.FakeRedisConnectionFactory"
