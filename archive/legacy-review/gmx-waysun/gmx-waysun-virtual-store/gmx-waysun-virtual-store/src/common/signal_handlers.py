import logging
from secrets import token_urlsafe

from aws_rest_default.signals import MISSING_USER_SIGNAL
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.dispatch import receiver

from virtual_store.models import CustomUser, Partner

logger = logging.getLogger(__name__)


# noinspection PyUnusedLocal
def create_user(username: str, partner: Partner, is_test_user: bool = False) -> CustomUser:
    logger.info(f"Creating user for(username='{username}', partner='{partner.sub}' and test='{is_test_user}'")
    return CustomUser.objects.create_user(
        username=username,
        is_test_user=is_test_user,
        originator=partner,
        is_active=True,
        is_superuser=False,
        is_staff=False,
        password=token_urlsafe(64),
    )


def get_create_originator_if_needed(originator: str) -> Partner:
    originator = str(originator)
    arn = "arn:{microservice}:originator:{username}".format(
        microservice=settings.DJANGO_MICROSERVICE_NAME, username=originator
    )
    partner = Partner.objects.filter(sub=originator).first()
    if partner is None:
        with cache.lock(arn, expire=settings.LOCK_TIMEOUT):
            partner = Partner.objects.filter(sub=originator).first()
            if partner is None:
                with transaction.atomic():
                    logger.info(f"Creating partner for sub={originator}")
                    partner = Partner.objects.create(sub=originator, name=str(originator))
    return partner


@receiver(MISSING_USER_SIGNAL, dispatch_uid="handle_missing_user")
def handle_missing_user(
    username: str = None, originator: str = None, is_test_user: bool = False, **kwargs
) -> None:  # noqa: F841
    """
    Function used to set up default Wallet for new user
    :param username: ``username`` to create
    :param originator: ``originator`` to attach user
    :param is_test_user: True when user should be marked as test user
    :return:
    """
    if "sender" in kwargs:
        logger.info(f"Received MISSING_USER_SIGNAL from {kwargs.get('sender')}")
    if username is None:
        return
    if originator is None:
        logger.error("Originator is NONE for user: %s" % username)
        return

    logger.info(f"Starting handle_missing_user(username='{username}, originator='{originator}', test={is_test_user}'")

    user_arn = "arn:{microservice}:handle_missing_user:{username}".format(
        microservice=settings.DJANGO_MICROSERVICE_NAME, username=username
    )

    partner = get_create_originator_if_needed(originator=originator)

    with cache.lock(user_arn, expire=settings.LOCK_TIMEOUT):
        user = CustomUser.objects.filter_by_username(username=username).first()
        if user is None:
            with transaction.atomic():
                create_user(username=username, partner=partner, is_test_user=is_test_user)
