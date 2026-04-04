from decouple import config

STATIC_URL = config("DJANGO_STATIC_URL", default="/static/")
STATIC_ROOT = "/tmp/static/virtual_shop"  # nosec
