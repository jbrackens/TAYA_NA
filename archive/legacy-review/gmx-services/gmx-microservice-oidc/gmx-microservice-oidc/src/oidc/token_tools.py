from aws_rest_default import settings as jwt_settings
from aws_rest_default.tools import encrypt_b64
from django.core.cache import cache

from oidc.models import OidcClientExtra
from django.conf import settings

JWT_ORIGINATOR_PAYLOAD_KEY = jwt_settings.get('JWT_ORIGINATOR_PAYLOAD_KEY')
JWT_PERMISSIONS_PAYLOAD_KEY = jwt_settings.get('JWT_PERMISSIONS_PAYLOAD_KEY')
JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY = jwt_settings.get('JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY')


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
    originator_sub = str(user.get_originator_company().pk)
    id_token.setdefault('extra', {})
    id_token['extra'][JWT_ORIGINATOR_PAYLOAD_KEY] = originator_sub
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
    id_token.setdefault('extra', {})
    permissions = id_token['extra'].pop('forced_permissions', [])
    if not permissions:
        audience = id_token['aud']
        arn = 'oidc:token_tools:hook:permissions:{}'.format(audience)
        permissions = cache.get(arn)
        if permissions is None:
            with cache.lock(arn, settings.CACHE_LOCK_MAX_TIMEOUT):
                permissions = cache.get(arn)
                if permissions is None:
                    client_extra = OidcClientExtra.objects.filter(oidc_client__client_id=audience).only('limited_permissions', 'default_permissions').first()
                    limited = tuple(p.name for p in client_extra.get_limited_permissions())
                    default = tuple(p.name for p in client_extra.get_default_permissions())
                    permissions = {
                        'limited': limited,
                        'default': default
                    }
                    cache.set(arn, permissions)
        if user.is_limited:
            permissions = list(permissions['limited'])
        else:
            permissions = list(permissions['default'])
        permissions.extend(p.name for p in user.get_oidc_permissions())
        permissions = sorted(list(set(permissions)))
    id_token['extra'][JWT_PERMISSIONS_PAYLOAD_KEY] = permissions
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
    audience = id_token['aud']
    arn = 'oidc:token_tools:hook:audience_sub:{}'.format(audience)
    audience_sub = cache.get(arn)
    if audience_sub is None:
        with cache.lock(arn, settings.CACHE_LOCK_MAX_TIMEOUT):
            audience_sub = cache.get(arn)
            if audience_sub is None:
                client_extra = OidcClientExtra.objects.filter(oidc_client__client_id=audience).only('user__sub').first()
                audience_sub = client_extra.user.sub
                cache.set(arn, audience_sub)
    id_token.setdefault('extra', {})
    id_token['extra'][JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY] = audience_sub
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
    extra = id_token.get('extra', {})
    id_token['extra'] = encrypt_b64(extra)
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
    id_token['lim'] = getattr(user, 'is_limited', True)
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
    claims['name'] = user.get_full_name()
    claims['given_name'] = user.first_name
    claims['family_name'] = user.last_name
    claims['middle_name'] = user.middle_name
    claims['nickname'] = user.display_name
    claims['preferred_username'] = user.display_name
    claims['profile'] = user.sub
    # claims['picture'] =
    # claims['website'] = ''
    claims['gender'] = user.get_gender_display()
    claims['birthdate'] = user.date_of_birth
    claims['zoneinfo'] = user.get_timezone_display()
    claims['locale'] = 'en_GB'
    claims['updated_at'] = user.updated_at

    email = user.emails.filter(is_primary=True).first()
    if email:
        claims['email'] = email.email
        claims['email_verified'] = email.is_verified

    phone = user.phones.filter(is_primary=True).first()
    if phone:
        claims['phone_number'] = phone.phone_number
        claims['phone_number_verified'] = phone.is_verified

    address = user.addresses.filter(is_primary=True).first()
    if address:
        claim_address = {
            'formatted': '{}'.format(address),
            'street_address': address.line_1,
            'locality': address.line_2,
            'region': address.region,
            'postal_code': address.post_code,
            'country': address.get_country_display(),
        }
        claims['address'].update(claim_address)
    return claims
