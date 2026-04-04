from decouple import config

CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', 'api.dev.gmx.flipsports.net')
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

CORS_ALLOW_METHODS = (
    'GET',
    'OPTIONS',
    'POST',
)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
