from decouple import config

CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_REPLACE_HTTPS_REFERER = True
CORS_ALLOW_HEADERS = (
    'http_x_show_redirects',
    'x-requested-with',
    'content-type',
    'accept',
    'origin',
    'authorization',
    'x-csrftoken',
    'user-agent',
    'accept-encoding',
    'x-xsrf-token',
)

CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', 'api.local.rewardsmatrix.com')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
