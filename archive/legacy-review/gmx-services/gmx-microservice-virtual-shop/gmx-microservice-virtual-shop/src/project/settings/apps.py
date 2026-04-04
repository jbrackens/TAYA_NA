INSTALLED_APPS = (
    [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
    ]
    + [
        "common",
        "corsheaders",
        "rest_framework",
        "mptt",
        "aws_rest_default",
        "polymorphic",
        "django_filters",
        "storages",
    ]
    + [
        "services",
        "virtual_shop",
    ]
)
