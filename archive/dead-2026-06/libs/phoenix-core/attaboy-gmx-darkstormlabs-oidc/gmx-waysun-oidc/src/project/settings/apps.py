INSTALLED_APPS = (
    ["inline_actions"]
    + [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "django.contrib.sites",
    ]
    + [
        "oidc_provider",
        "rest_framework",
        "aws_rest_default",
        "phonenumber_field",
    ]
    + [
        "antstream",
        "common",
        "profiles",
        "oidc",
    ]
)
