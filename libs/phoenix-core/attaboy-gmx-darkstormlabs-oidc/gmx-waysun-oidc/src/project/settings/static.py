from urllib.parse import urlparse

from decouple import config

STATIC_URL = config("DJANGO_STATIC_URL", default="/static/")
STATIC_ROOT = config("DJANGO_STATIC_ROOT", default="/static/")

DEFAULT_FILE_STORAGE = config("DJANGO_DEFAULT_FILE_STORAGE", default="aws_rest_default.static.SFTPStorage")

STATICFILES_STORAGE = DEFAULT_FILE_STORAGE

USE_BOTO_S3_AS_STORAGE = "storages.backends.s3boto3.S3Boto3Storage" == DEFAULT_FILE_STORAGE

if USE_BOTO_S3_AS_STORAGE:
    S3_USE_SIGV4 = config("DJANGO_S3_USE_SIGV4", default=True, cast=bool)
    AWS_S3_ENDPOINT_URL = config("DJANGO_AWS_S3_HOST", default="s3.amazonaws.com")
    AWS_ACCESS_KEY_ID = config("DJANGO_AWS_ACCESS_KEY_ID", default="s3.amazonaws.com")
    AWS_SECRET_ACCESS_KEY = config("DJANGO_AWS_SECRET_ACCESS_KEY", default="s3.amazonaws.com")
    AWS_STORAGE_BUCKET_NAME = config("DJANGO_AWS_STORAGE_BUCKET_NAME", default="static")
    AWS_S3_CUSTOM_DOMAIN = urlparse(STATIC_URL).hostname
    AWS_LOCATION = STATIC_ROOT.lstrip("/")
else:
    SFTP_STORAGE_HOST = config("DJANGO_SFTP_STORAGE_HOST", default="sftp_server")
    SFTP_STORAGE_ROOT = config("DJANGO_SFTP_STORAGE_ROOT", default="/home/microservice/static/")
    SFTP_STORAGE_PARAMS = {
        "username": config("DJANGO_SFTP_STORAGE_USERNAME", default="microservice"),
        "password": config("DJANGO_SFTP_STORAGE_PASSWORD", default="microservice"),
    }
