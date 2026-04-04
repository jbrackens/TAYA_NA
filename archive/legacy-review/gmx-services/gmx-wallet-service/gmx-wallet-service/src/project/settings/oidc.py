from decouple import config

DJANGO_SITE_URL = config('DJANGO_SITE_URL')
URL_CALLBCK = config('URL_CALLBCK', default='http://base.local.rewardsmatrix.com/openid/callback/')

JWT_ISSUER = config('JWT_ISSUER', '{}/openid'.format(DJANGO_SITE_URL))
JWT_EXTRA_SECRET_KEY = config('JWT_EXTRA_SECRET_KEY', default='5988c7dd21fed41a607bbbecee9c675fa3ec1eb47ce174a6939114cf3736323b')
LOCK_TIMEOUT = config('LOCK_TIMEOUT', default=60, cast=int)
