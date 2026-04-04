import logging

from aws_rest_default.logger import RequestLogAdapter
from django.contrib.sites.models import Site
from django.dispatch import receiver
from django.urls import reverse
from django.utils.lru_cache import lru_cache

from oidc_rest.views.validate_email import VerifyEmailApiView
from oidc_signals import signals
from oidc_signals.connector import send_signal_to_process_controller
from profiles.models import CustomUser


@lru_cache(maxsize=100)
def _format_url(url):
    return 'https://{}{}'.format(
        Site.objects.get_current().domain,
        url
    )


def _get_logger_for(handler_name, msg_id='UNKNOWN'):
    logger = logging.getLogger('{}.{}'.format(__name__, handler_name))
    return RequestLogAdapter(logger=logger, msg_id=msg_id)


@receiver(signals.UserRegisteredSignal, dispatch_uid='send_welcome_letter')
def send_welcome_letter_handler(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    logger = _get_logger_for('send_welcome_letter_handler', msg_id)

    if user is None:
        logger.error('Missing user for UserRegisteredSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    key = kwargs.pop('key', None)
    if key is None:
        logger.error('Missing KEY!')
        return

    expiration_date = kwargs.pop('expiration_date', None)
    if expiration_date is None:
        logger.error('Missing expiration_date!')
        return

    email = kwargs.pop('email', None)
    if email is None:
        logger.error('Email not set!')
        return

    originator_id = user.originator.company.id
    slug = '{}__welcome_letter'.format(originator_id)

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
        'expiration_date': expiration_date,
        'key': key,
        'url': _format_url(reverse('frontend:profile__email_verify'))
    }

    logger.info('Prepared data for sending welcome email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_welcome_letter',
        kwargs=mail_data
    )


@receiver(signals.UserAddEmailSignal, dispatch_uid='send_email_with_verification_key')
def send_email_with_verification_key(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    logger = _get_logger_for('send_email_with_verification_key', msg_id)

    if user is None:
        logger.error('Missing user for UserRegisteredSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    key = kwargs.pop('key', None)
    if key is None:
        logger.error('Missing KEY!')
        return

    expiration_date = kwargs.pop('expiration_date', None)
    if expiration_date is None:
        logger.error('Missing expiration_date!')
        return

    email = kwargs.pop('email', None)
    if email is None:
        logger.error('Email not set!')
        return

    slug = 'add_email_letter'

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
        'expiration_date': expiration_date,
        'key': key,
        'url': _format_url(reverse('frontend:profile__email_verify'))
    }

    logger.info('Prepared data for sending add_email email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_with_verification_key',
        kwargs=mail_data
    )


@receiver(signals.UserEmailVerifiedSignal, sender=VerifyEmailApiView, dispatch_uid='send_email_after_verification')
def send_email_after_verification(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    email = kwargs.pop('email')
    logger = _get_logger_for('send_email_after_verification', msg_id)

    if user is None:
        logger.error('Missing user for UserEmailVerifiedSignal handler!')
        return
    if email is None:
        logger.error('Missing email for UserEmailVerifiedSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    slug = 'added_email_letter'

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
    }

    logger.info('Prepared data for sending added_email email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_after_verification',
        kwargs=mail_data
    )


@receiver(signals.UserPasswordResetRequestSignal, dispatch_uid='send_email_with_password_reset_key')
def send_email_with_password_reset_key(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    logger = _get_logger_for('send_email_with_password_reset_key', msg_id)

    if user is None:
        logger.error('Missing user for UserPasswordResetRequestSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    key = kwargs.pop('key', None)
    if key is None:
        logger.error('Missing KEY!')
        return

    expiration_date = kwargs.pop('expiration_date', None)
    if expiration_date is None:
        logger.error('Missing expiration_date!')
        return

    email = kwargs.pop('email', None)
    if email is None:
        logger.error('Email not set!')
        return

    slug = 'reset_password_request_letter'

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
        'expiration_date': expiration_date,
        'key': key,
        'url': _format_url(reverse('frontend:profile__password_reset'))
    }

    logger.info('Prepared data for sending password_reset_request email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_with_password_reset_key',
        kwargs=mail_data
    )


@receiver(signals.UserPasswordChangedKeySignal, dispatch_uid='send_email_after_password_change_key')
def send_email_after_password_change_key(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    email = kwargs.pop('email')
    logger = _get_logger_for('send_email_after_password_change_key', msg_id)

    if user is None:
        logger.error('Missing user for UserPasswordChangedKeySignal handler!')
        return
    if email is None:
        logger.error('Missing email for UserPasswordChangedKeySignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    slug = 'after_password_change_key_letter'

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
    }

    logger.info('Prepared data for sending after_password_change_key email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_after_password_change_key',
        kwargs=mail_data
    )


@receiver(signals.UserPasswordChangedApiSignal, dispatch_uid='send_email_after_password_change_api')
def send_email_after_password_change_api(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    email = kwargs.pop('email')
    logger = _get_logger_for('send_email_after_password_change_api', msg_id)

    if user is None:
        logger.error('Missing user for UserPasswordChangedApiSignal handler!')
        return
    if email is None:
        logger.error('Missing email for UserPasswordChangedApiSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    slug = 'after_password_change_api_letter'

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
    }

    logger.info('Prepared data for sending after_password_change_api email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_after_password_change_api',
        kwargs=mail_data
    )


@receiver(signals.TrustedUserRegisteredSignal, dispatch_uid='send_email_after_trusted_registration')
def send_email_after_trusted_registration(**kwargs):
    user = kwargs.pop('user', None)
    msg_id = kwargs.pop('msg_id', 'UNKNOWN')
    email = user.email
    logger = _get_logger_for('send_email_after_trusted_registration', msg_id)

    if user is None:
        logger.error('Missing user for TrustedUserRegisteredSignal handler!')
        return
    if email is None:
        logger.error('Missing email for TrustedUserRegisteredSignal handler!')
        return
    if not isinstance(user, CustomUser):
        logger.error('Wrong user type object passed into handler!')
        return

    originator_id = user.originator.company.id
    slug = '{}__trusted_user_welcome_letter'.format(originator_id)

    mail_data = {
        'slug': slug,
        'display_name': user.display_name,
        'email': email,
    }

    logger.info('Prepared data for sending after_trusted_registration email: {}'.format(mail_data))
    send_signal_to_process_controller(
        signal_name='send_email_after_trusted_registration',
        kwargs=mail_data
    )
