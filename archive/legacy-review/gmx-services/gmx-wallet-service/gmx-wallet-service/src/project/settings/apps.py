INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
] + [
    'aws_rest_default',
    'rest_framework',
    'django_filters',
    'mptt',
] + [
    'data_export',
    'services',
    'token_exchange',
    'wallet',

]
