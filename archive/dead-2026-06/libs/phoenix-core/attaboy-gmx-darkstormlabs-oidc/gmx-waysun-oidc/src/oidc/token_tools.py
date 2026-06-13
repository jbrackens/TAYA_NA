from time import time

from aws_rest_default import settings as jwt_settings
from aws_rest_default.tools import encrypt_b64
from django.conf import settings
from django.core.cache import cache

from oidc.models import OidcClientExtra

JWT_ORIGINATOR_PAYLOAD_KEY = jwt_settings.get("JWT_ORIGINATOR_PAYLOAD_KEY")
JWT_PERMISSIONS_PAYLOAD_KEY = jwt_settings.get("JWT_PERMISSIONS_PAYLOAD_KEY")
JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY = jwt_settings.get("JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY")
JWT_IS_TEST_PAYLOAD_KEY = jwt_settings.get("JWT_IS_TEST_PAYLOAD_KEY")


def sub_generator(user, **kwargs):
    """
    The function receives a user object and returns a unique string for the given user.

    :param user: CustomUser
    :type user: oidc.models.CustomUser
    :return: unique string for given user
    :rtype: str
    """
    return user.sub


def token_processing_hook_originator(id_token, user, **kwargs):
    """
    Id_token processing hook to inject user's originator sub

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: updated "extra" dict in payload token
    :rtype: dict
    """
    originator_sub = str(user.get_originator_company().sub)
    id_token.setdefault("extra", {})
    id_token["extra"][JWT_ORIGINATOR_PAYLOAD_KEY] = originator_sub
    return id_token


def token_processing_hook_nbf(id_token, **kwargs):  # noqa
    """
    Id_token processing hook to inject nbf
    """
    id_token["nbf"] = int(time())
    return id_token


def token_processing_hook_permissions(id_token, user, **kwargs):
    """
    Id_token processing hook to inject user's permissions list. If `forced_permissions` found in `extra` they will be used instead of calculating

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: updated "extra" dict in payload token
    :rtype: dict
    """
    id_token.setdefault("extra", {})
    permissions = id_token["extra"].pop("forced_permissions", [])
    if not permissions:
        audience = id_token["aud"]
        arn = "oidc:token_tools:hook:permissions:{}".format(audience)
        permissions = cache.get(arn)
        if permissions is None:
            with cache.lock(arn, settings.CACHE_LOCK_MAX_TIMEOUT):
                permissions = cache.get(arn)
                if permissions is None:
                    client_extra = OidcClientExtra.objects.filter(oidc_client__client_id=audience).first()
                    limited = tuple(p.name for p in client_extra.get_limited_permissions())
                    default = tuple(p.name for p in client_extra.get_default_permissions())
                    permissions = {"limited": limited, "default": default}
                    cache.set(arn, permissions)
        if user.is_limited:
            permissions = list(permissions["limited"])
        else:
            permissions = list(permissions["default"])
        permissions.extend(p.name for p in user.get_oidc_permissions())
        permissions = sorted(list(set(permissions)))
    id_token["extra"][JWT_PERMISSIONS_PAYLOAD_KEY] = permissions
    return id_token


def token_processing_hook_audience_user_sub(id_token, user, **kwargs):
    """
    Id_token processing hook to inject audience's user sub

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: updated "extra" dict in payload token
    :rtype: dict
    """
    audience = id_token["aud"]
    arn = "oidc:token_tools:hook:audience_sub:{}".format(audience)
    audience_sub = cache.get(arn)
    if audience_sub is None:
        with cache.lock(arn, settings.CACHE_LOCK_MAX_TIMEOUT):
            audience_sub = cache.get(arn)
            if audience_sub is None:
                client_extra = OidcClientExtra.objects.filter(oidc_client__client_id=audience).first()
                audience_sub = str(client_extra.user.company.sub)
                cache.set(arn, audience_sub)
    id_token.setdefault("extra", {})
    id_token["extra"][JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY] = audience_sub
    return id_token


def token_processing_hook_encode_extra(id_token, user, **kwargs):
    """
    Id_token processing hook to encode extra dict in id_token

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: encrypted "extra" dict in payload token
    :rtype: dict
    """
    extra = id_token.get("extra", {})
    id_token["extra"] = encrypt_b64(extra)
    return id_token


def token_processing_hook_is_limited(id_token, user, **kwargs):
    """
    Id_token processing hook to inject if user is limited

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: injected "lim" keyword in dict
    :rtype: dict
    """
    id_token["lim"] = getattr(user, "is_limited", True)
    return id_token


def token_processing_hook_is_test(id_token, user, **kwargs):
    """
    Id_token processing hook to inject if user is test

    :param id_token: JWT token dict
    :type id_token: dict
    :param user: User being authenticated
    :type user: profiles.models.CustomUser
    :return: injected "lim" keyword in dict
    :rtype: dict
    """
    id_token.setdefault("extra", {})
    id_token["extra"][JWT_IS_TEST_PAYLOAD_KEY] = user.is_test_user
    return id_token


def user_info(claims, user, **kwargs):
    """
    Function used to prepare OpenId Connect standard claims.
    http://django-oidc-provider.readthedocs.io/en/v0.4.x/sections/scopesclaims.html#scopesclaims

    :param claims: dict of claims
    :type claims: dict
    :param user: User for which generating data
    :type user: oidc.models.CustomUser
    :return: claims dict
    :rtype: dict
    """
    claims["name"] = user.get_full_name()
    claims["given_name"] = user.first_name
    claims["family_name"] = user.last_name
    claims["middle_name"] = user.middle_name
    claims["nickname"] = user.display_name
    claims["preferred_username"] = user.display_name
    claims["profile"] = user.sub
    # claims['picture'] =
    # claims['website'] = ''
    claims["gender"] = user.get_gender_display()
    claims["birthdate"] = user.date_of_birth
    claims["zoneinfo"] = user.get_timezone_display()
    claims["locale"] = "en_GB"
    claims["updated_at"] = user.updated_at

    email = user.emails.filter(is_primary=True).first()
    if email:
        claims["email"] = email.email
        claims["email_verified"] = email.is_verified

    phone = user.phone_numbers.filter(is_primary=True).first()
    if phone:
        claims["phone_number"] = phone.phone_number
        claims["phone_number_verified"] = phone.is_verified

    address = user.addresses.filter(is_primary=True).first()
    if address:
        claim_address = {
            "formatted": "{}".format(address),
            "street_address": address.line_1,
            "locality": address.line_2,
            "region": address.region,
            "postal_code": address.post_code,
            "country": address.get_country_display(),
        }
        claims["address"].update(claim_address)
    return claims


PERMISSIONS_LIST = (
    ("payment_gateway:admin:china_mobile:read", "to read China Mobile payment gateway configuration"),
    ("payment_gateway:admin:china_mobile:write", "to write China Mobile payment gateway configuration"),
    ("oidc:admin:company:read", "to read Company data"),
    ("oidc:admin:clear_oidc:write", "Used to execute cyclic action - OIDC clear old tokens"),
    ("oidc:admin:profile:read", "to read user profile details"),
    ("oidc:admin:profile:write", "to write user profile details"),
    ("oidc:admin:profile:last_seen:write", "to write last user seen"),
    ("oidc:admin:profile:password:write", "to write Users password by Partner"),
    ("oidc:admin:profile:social_account:read", "to read user social account details"),
    ("oidc:admin:profile:social_account:write", "to write user social account details"),
    ("oidc:admin:profile:address:read", "to write read profile address"),
    ("oidc:admin:profile:address:write", "to write profile address"),
    ("oidc:admin:profile:email:read", "to write read profile email"),
    ("oidc:admin:profile:email:write", "to write profile email"),
    ("oidc:admin:profile:phone_number:read", "to write read profile phone"),
    ("oidc:admin:profile:phone_number:write", "to write profile phone"),
    ("oidc:admin:openid:read", "to read openid extra details"),
    ("oidc:admin:openid:write", "to write openid extra details"),
    ("oidc:profile:read", "to read Profile data"),
    ("oidc:profile:write", "to write Profile data"),
    ("oidc:email:read", "to read User's Emails"),
    ("oidc:email:write", "to write User's Emails"),
    ("oidc:address:read", "to read User's Addresses"),
    ("oidc:address:write", "to write User's Addresses"),
    ("oidc:phone_number:read", "to read User's Phone numbers"),
    ("oidc:phone_number:write", "to write User's Phone numbers"),
    ("oidc:password:write", "to change password"),
    ("oidc:register:write", "to register user where originator will be auth user"),
    ("oidc:social:token:read", "To read token used during login"),
    ("oidc:admin:external_user_mapping:write", "to create temporary user or get mapping for customer"),
    ("virtual_store:admin:any:subscription:read", "to read ADMIN ANY subscription"),
    ("virtual_store:admin:any:subscription:write", "to write ADMIN ANY subscription"),
    ("virtual_store:admin:any:order:backpack:create", "to create ADMIN ANY backpack items from order"),
    ("virtual_store:admin:any:order:deliver", "to mark ADMIN ANY order as delivered"),
    ("virtual_store:admin:any:order:read", "to read ADMIN ANY order"),
    ("virtual_store:admin:any:order:write", "to write ADMIN ANY order"),
    ("virtual_store:admin:any:order:log:write", "to write ADMIN ANY order's log"),
    ("virtual_store:admin:any:backpack_item:read", "to read ADMIN ANY backpack item"),
    ("virtual_store:admin:any:backpack_item:write", "to write ADMIN ANY backpack item"),
    ("virtual_store:admin:any:backpack_item:activate", "to activate ADMIN ANY  backpack item"),
    ("virtual_store:admin:any:backpack_item:deactivate", "to deactivate ADMIN ANY  backpack item"),
    ("virtual_store:admin:any:backpack_item:detach", "to detach ADMIN ANY  backpack item"),
    ("virtual_store:admin:any:product:read", "to read ADMIN ANY product"),
    ("virtual_store:admin:any:product:write", "to write ADMIN ANY product"),
    (
        "virtual_store:admin:any:cyclic:subscriptions:deactivate",
        "to send ADMIN ANY subscriptions which needs to be expired",
    ),
    ("virtual_store:admin:antstream:configuration:read", "to read ADMIN antstream config"),
    ("virtual_store:admin:antstream:configuration:write", "to write ADMIN antstream config"),
    ("virtual_store:admin:subscription:read", "to read ADMIN subscription"),
    ("virtual_store:admin:subscription:write", "to write ADMIN subscription"),
    ("virtual_store:admin:order:read", "to read ADMIN order"),
    ("virtual_store:admin:order:write", "to write ADMIN order"),
    ("virtual_store:admin:order:log:write", "to write ADMIN order's log"),
    ("virtual_store:admin:backpack_item:write", "to write ADMIN backpack item"),
    ("virtual_store:admin:backpack_item:read", "to read ADMIN backpack item"),
    ("virtual_store:admin:backpack_item:activate", "to activate ADMIN backpack item"),
    ("virtual_store:admin:backpack_item:deactivate", "to deactivateADMIN backpack item"),
    ("virtual_store:admin:backpack_item:detach", "to detach ADMIN backpack item"),
    ("virtual_store:admin:product:read", "to read ADMIN product"),
    ("virtual_store:admin:product:write", "to write ADMIN product"),
    ("virtual_store:antstream:configuration:read", "to read antstream configuration"),
    ("virtual_store:antstream:configuration:write", "to write antstream configuration"),
    ("virtual_store:product:read", "to read product"),
    ("virtual_store:subscription:read", "to read subscription"),
    ("virtual_store:order:read", "to read order"),
    ("user_context:admin:context:read", "to read Partner's user's context"),
    ("user_context:admin:context:write", "to write Partner's user's context"),
    ("event_ingestor:event:write", "to write event to Event Ingestor"),
    ("event_ingestor:admin:any:event:write", "to write ANY event to Event Ingestor"),
    ("rule_configurator:event:write", "to write Event Configuration"),
    ("rule_configurator:event:read", "to read Event Configuration"),
    ("rule_configurator:aggregation:write", "to write Aggregation Configuration"),
    ("rule_configurator:aggregation:read", "to read Aggregation Configuration"),
)
