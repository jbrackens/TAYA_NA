# CORS_ORIGIN_WHITELIST = [
#     '*',
#     '{}'.format(config('SN_HOST')),
#     '{}'.format(config('RZ_HOST')),
#     '{}'.format(config('DJANGO_SITE_URL')),
# ]
CORS_ORIGIN_ALLOW_ALL = True

CORS_ALLOW_METHODS = [
    "GET",
    "OPTIONS",
    "POST",
]
