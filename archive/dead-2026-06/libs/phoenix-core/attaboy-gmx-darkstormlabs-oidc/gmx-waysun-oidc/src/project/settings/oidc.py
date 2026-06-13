import urllib.parse

from decouple import config

SITE_URL = config("DJANGO_SITE_URL")
OIDC_SKIP_CONSENT_ALWAYS = True

FRONTEND_SITE_URL = urllib.parse.urljoin(SITE_URL, "/oidc/site")
LOGIN_URL = urllib.parse.urljoin(SITE_URL, "/oidc/login")

LOGIN_REDIRECT_URL = FRONTEND_SITE_URL
OIDC_LOGIN_URL = LOGIN_URL

OIDC_CODE_EXPIRE = config("OIDC_CODE_EXPIRE", default=60, cast=int)
OIDC_IDTOKEN_EXPIRE = config("OIDC_IDTOKEN_EXPIRE", default=7200, cast=int)
OIDC_TOKEN_EXPIRE = OIDC_IDTOKEN_EXPIRE

OIDC_IDTOKEN_PROCESSING_HOOK = (
    "oidc.token_tools.token_processing_hook_originator",
    "oidc.token_tools.token_processing_hook_nbf",
    "oidc.token_tools.token_processing_hook_permissions",
    "oidc.token_tools.token_processing_hook_audience_user_sub",
    "oidc.token_tools.token_processing_hook_is_test",
    "oidc.token_tools.token_processing_hook_encode_extra",
    "oidc.token_tools.token_processing_hook_is_limited",
)

#  OIDC_POST_END_SESSION_HOOK = 'oidc_permissions.hooks.oidc_post_end_session_hook'

OIDC_USERINFO = "oidc.token_tools.user_info"
OIDC_IDTOKEN_SUB_GENERATOR = "oidc.token_tools.sub_generator"

# HEX encoded
JWT_EXTRA_SECRET_KEY = config("JWT_EXTRA_SECRET_KEY")
JWT_ISSUER = "{}/openid".format(SITE_URL)

REWARD_MATRIX_USER = config("REWARD_MATRIX_USER")
REWARD_MATRIX_PASS = config("REWARD_MATRIX_PASS")
REWARD_MATRIX_FULL_ACCESS_USER = config("REWARD_MATRIX_FULL_ACCESS_USER")
REWARD_MATRIX_FULL_ACCESS_PASS = config("REWARD_MATRIX_FULL_ACCESS_PASS")
OIDC_RMX_GUI_CLIENT_NAME = config("REWARD_MATRIX_FULL_ACCESS_USER")
OIDC_RMX_GUI_CLIENT_ID = config("OIDC_RMX_GUI_CLIENT_ID")
OIDC_RMX_GUI_CLIENT_PASS = config("OIDC_RMX_GUI_CLIENT_PASS")

OIDC_GRANT_TYPE_PASSWORD_ENABLE = True

OIDC_SESSION_MANAGEMENT_ENABLE = True
OIDC_UNAUTHENTICATED_SESSION_MANAGEMENT_KEY = config(
    "OIDC_UNAUTHENTICATED_SESSION_MANAGEMENT_KEY",
    default="QmVjJcxj3TyMGd3T4MmvSUq-H_rk3nov4gUILPfGmCR4Yb01iWZTu2dh8a4GQQPCeC",
)
