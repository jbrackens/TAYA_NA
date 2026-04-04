INSTALLED_APPS = (
    ["inline_actions", "rest_framework"]
    + [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
    ]
    + ["aws_rest_default", "django_filters", "nested_admin"]
    + ["common", "virtual_store", "payment_gateway", "events"]
)
