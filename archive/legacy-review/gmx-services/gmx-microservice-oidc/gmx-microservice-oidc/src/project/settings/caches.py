from decouple import config


CACHES = {
    'default': {
        'BACKEND': 'redis_lock.django_cache.RedisCache',
        'LOCATION': config('DJANGO_REDIS_LOCATION', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient'
        }
    }
}

CACHE_LOCK_MAX_TIMEOUT = 60