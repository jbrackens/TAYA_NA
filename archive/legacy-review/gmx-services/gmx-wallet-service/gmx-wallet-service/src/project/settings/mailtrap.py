from decouple import config

EMAIL_HOST = config('EMAIL_HOST', 'mailtrap.io')
EMAIL_HOST_USER = config('EMAIL_HOST_USER', '49c03cad01537a')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', '10659756266e17')
EMAIL_PORT = config('EMAIL_PORT', '2525')
