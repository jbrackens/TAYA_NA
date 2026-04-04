import logging

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from services.kafka_service import KafkaService
from .models import Wallet, WalletLine
from django.conf import settings

logger = logging.getLogger(__name__)


def __create_user__(username):
    model = get_user_model()
    user = model.objects.create_user(username=username)
    logger.info('Created user: %s' % username)
    return user


def __create_wallet__(user, originator):
    # noinspection PyPep8Naming
    User = get_user_model()
    try:
        if user.username == originator:
            orig_user = user
        else:
            orig_user = User.objects.get(username=originator)
    except User.DoesNotExist:
        logger.error('Originator user instance not found for: "%s"' % originator)
        raise
    wallet = Wallet.objects.create(user=user, _is_default=True, originator=orig_user)
    logger.info('Created default wallet for: %s' % user.username)
    return wallet


def __create_wallet_line__(wallet):
    line = WalletLine.objects.create(
        wallet=wallet,
        operation_type=WalletLine.OPERATION_TYPE_CHOICES.INI,
        amount=0
    )
    logger.info('Created line: %s' % line.operation_uuid)


def handle_missing_user(**kwargs):
    """
    Function used to set up default Wallet for new user
    :param kwargs: ``username`` to create
    :return:
    """
    username = kwargs.get('username', None)
    originator = kwargs.get('originator', None)
    if username is None:
        return
    if originator is None:
        logger.error('Originator is NONE for user: %s' % username)
        return

    lock = 'arn:wallet:handle_missing_user:{username}:lock'.format(username=username)
    model = get_user_model()
    with cache.lock(lock, expire=settings.LOCK_TIMEOUT):
        with transaction.atomic():
            if not model.objects.filter(username=originator).exists():
                logger.info('Creating user - {}'.format(originator))
                user = __create_user__(username=originator)
                logger.info('Creating wallet for user - {} and originator: {}'.format(originator, originator))
                wallet = __create_wallet__(user, originator)
                logger.info('Creating first line for user {} and wallet {}'.format(originator, wallet))
                __create_wallet_line__(wallet)
            if not model.objects.filter(username=username).exists():
                logger.info('Creating user - {}'.format(username))
                user = __create_user__(username=username)
                logger.info('Creating wallet for user - {} and originator: {}'.format(username, originator))
                wallet = __create_wallet__(user, originator)
                logger.info('Creating first line for user {} and wallet {}'.format(username, wallet))
                __create_wallet_line__(wallet)
            else:
                logger.warning('User creation skipped. Massive error prevented!')


def wallet_line_kafka_post_save(sender, instance, created, raw, **kwargs):
    if raw or not created:
        logger.warning('Skipping due raw({}) or created({})'.format(raw, not created))
        return
    if not isinstance(instance, WalletLine) or sender is not WalletLine:
        logger.warning('{} Is not instance of {}'.format(instance, sender))
        return

    from data_export.serializers import WalletLineSerializer
    if instance.partner is None:
        logger.warning('No partner information - Wallet  initialization?')
        return
    if instance.wallet.user is None:
        error_message = 'No wallet for user information - Wallet  initialization?'
        logger.error(error_message)
        raise ValueError(error_message)
    instance.wallet__user__username = instance.wallet.user.username
    instance.partner__username = instance.partner.username

    KafkaService.send_event(
        user_sub=instance.wallet.user.username,
        originator=instance.wallet.originator.username,
        event_data=WalletLineSerializer(instance).data
    )



