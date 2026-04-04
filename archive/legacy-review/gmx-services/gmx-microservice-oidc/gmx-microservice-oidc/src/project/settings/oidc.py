from decouple import config

SITE_URL = config('DJANGO_SITE_URL')
OIDC_SKIP_CONSENT_ALWAYS = True

FRONTEND_SITE_URL = config('DJANGO_FRONTEND_SITE_URL', default='http://www.local.rewardsmatrix.com:10000/')
LOGIN_URL = SITE_URL + '/oidc/login/'

LOGIN_REDIRECT_URL = FRONTEND_SITE_URL
OIDC_LOGIN_URL = LOGIN_URL

OIDC_CODE_EXPIRE = config('OIDC_CODE_EXPIRE', default=60, cast=int)
OIDC_IDTOKEN_EXPIRE = config('OIDC_IDTOKEN_EXPIRE', default=7200, cast=int)
OIDC_TOKEN_EXPIRE = OIDC_IDTOKEN_EXPIRE

OIDC_IDTOKEN_PROCESSING_HOOK = (
    'oidc.token_tools.token_processing_hook_originator',
    'oidc.token_tools.token_processing_hook_permissions',
    'oidc.token_tools.token_processing_hook_audience_user_sub',
    'oidc.token_tools.token_processing_hook_encode_extra',
    'oidc.token_tools.token_processing_hook_is_limited',
)

#  OIDC_POST_END_SESSION_HOOK = 'oidc_permissions.hooks.oidc_post_end_session_hook'

OIDC_USERINFO = 'oidc.token_tools.user_info'
OIDC_IDTOKEN_SUB_GENERATOR = 'oidc.token_tools.sub_generator'

# HEX encoded
JWT_EXTRA_SECRET_KEY = config('JWT_EXTRA_SECRET_KEY', default='5988c7dd21fed41a607bbbecee9c675fa3ec1eb47ce174a6939114cf3736323b')
JWT_ISSUER = '{}/openid'.format(SITE_URL)

REWARD_MATRIX_USER = 'reward_matrix'
REWARD_MATRIX_FULL_ACCESS_USER = 'flipadmin'
OIDC_RMX_GUI_CLIENT_NAME = 'RMX Client'
OIDC_RMX_GUI_CLIENT_ID = '917948'

OIDC_GRANT_TYPE_PASSWORD_ENABLE = True

OIDC_SESSION_MANAGEMENT_ENABLE = True
OIDC_UNAUTHENTICATED_SESSION_MANAGEMENT_KEY = config('OIDC_UNAUTHENTICATED_SESSION_MANAGEMENT_KEY', default='QmVjJcxj3TyMGd3T4MmvSUq-H_rk3nov4gUILPfGmCR4Yb01iWZTu2dh8a4GQQPCeCBCB8DCEeuH9a5n1PzOefSkVBzZJK9CyI42KjumKuhEfiYiZxQbESjU-G63_1LoXEgqDfKrqiEdQgwodleOVroE_J9')
