import dataclasses
import logging
from datetime import datetime
from uuid import uuid4

from aws_rest_default.signals import MISSING_USER_SIGNAL
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models.signals import post_init, post_save
from django.dispatch import receiver
from django.utils import lru_cache
from rest_framework.exceptions import ValidationError

from common.common_tools import OrderLinesValues
from common.order_tools import (
    create_json_text_for_notification,
    get_company_id_from_order_line,
    update_bonus_multiple,
    updated_order_status_and_status_message,
)
from services.kafka_service import KafkaService
from virtual_shop import models

logger = logging.getLogger(__name__)


@receiver(post_init, sender=models.Order)
def creating_status(sender, instance, **kwargs):
    instance._status = instance.status
    instance._status_message = instance.status_message


@receiver(post_save, sender=models.Order)
def create_history_or_purchased(sender, instance, **kwargs):
    if instance._status == instance.status:
        return None

    note = "`Status` changed from:{} to:{}".format(instance._status, instance.status)
    models.OrderHistory.objects.create(order=instance, note=note)
    logger.info("Created OrderHistory for `status`")

    if instance.status == "SUCCESS":
        with transaction.atomic(savepoint=False):
            order_line_values = OrderLinesValues()
            order_lines = models.OrderLines.objects.filter(order=instance).values(
                list(dataclasses.asdict(order_line_values).values())
            )

            for order_line in order_lines:
                base_product = order_line.get(order_line_values.base_product)
                bonus_single = order_line.get(order_line_values.base_product__bonus_single__sbtech_bonus_id)
                bonus_multiple = order_line.get(order_line_values.base_product__bonus_multiple__uid)
                bonus_value = order_line.get(order_line_values.base_product__bonus_value)
                bonus_type = order_line.get(order_line_values.base_product__bonus_type)
                notification_type = order_line.get(order_line_values.base_product__notification_type)
                quantity = order_line.get(order_line_values.quantity)
                order_line_uid = order_line.get(order_line_values.uid)
                created_at = order_line.get(order_line_values.created_at)
                credit_all_points = order_line.get(order_line_values.base_product__credit_all_points)
                credit_all_points_price = order_line.get(order_line_values.price)
                bonus_multiple_send = []

                models.PurchasedProductsModel.objects.get_or_create(
                    user=instance.user, order=instance, base_product_id=base_product, quantity=quantity
                )
                data_key = KafkaService.Models.CustomerKey(externalUserId=instance.external_user_id)

                if settings.ALLOW_AUTO_CREDITING and bonus_type != "NONE":
                    company_id = get_company_id_from_order_line(order_line)

                    if credit_all_points:
                        bonus_value = credit_all_points_price / 1000

                    if bonus_multiple is not None:
                        bonus_multiple_send = update_bonus_multiple(instance, bonus_multiple, quantity)

                    data = KafkaService.Models.VirtualShopBonus(
                        company_id=company_id,
                        user_sub=str(instance.user),
                        external_user_id=instance.external_user_id,
                        bonus_single=bonus_single,
                        bonus_multiple=bonus_multiple_send,
                        bonus_value=str(bonus_value),
                        bonus_type=bonus_type,
                        amount=quantity,
                        process_id=instance.process_id,
                        order_line_uid=order_line_uid,
                        transaction_id=str(instance.uid),
                    )

                    KafkaService.virtual_shop_send_bonus(data=data, data_key=data_key)

                if notification_type == settings.SLACK_NOTIFICATION_METHOD:
                    notification_data = KafkaService.Models.Notification(
                        uuid=str(uuid4()),
                        createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
                        company_id=company_id,
                        externalUserId=instance.external_user_id,
                        action=settings.SLACK_NOTIFICATION_METHOD,
                        notificationTrigger=settings.DJANGO_MICROSERVICE_NAME,
                        Priority=settings.NOTIFICATION_PRIORITY_MEDIUM,
                        payload=KafkaService.Models.NotificationPayload(
                            value=create_json_text_for_notification(
                                instance.external_user_id, base_product, quantity, created_at
                            ),
                        ),
                        operationTarget=settings.SLACK_GMX_VIRTUAL_SHOP_NOTIFICATION_CHANNEL,
                    )
                    KafkaService.virtual_shop_send_notification(data=notification_data, data_key=data_key)

            logger.info("Created PurchasedProducts")

    instance._status = instance.status


@receiver(post_save, sender=models.Order)
def create_history_for_status_message(sender, instance, **kwargs):
    if instance._status_message == instance.status_message:
        return None
    else:
        note = "`Status Message` changed from:{} to:{}".format(instance._status_message, instance.status_message)
        models.OrderHistory.objects.create(order=instance, note=note)
        logger.info("Created OrderHistory for `status_message`")
        instance._status_message = instance.status_message


@receiver(post_init, sender=models.OrderLines)
def create_orderline_resolved_lines_array(sender, instance, **kwargs):
    sender._resolved_lines_array = instance.resolved_lines_array


@receiver(post_save, sender=models.OrderLines)
def check_if_orderline_is_resolved(sender, instance, **kwargs):
    if instance.resolved:
        return
    if not instance.check_if_line_resolved_lines_array_changed:
        return
    if not instance.check_if_line_is_resolved:
        return

    with transaction.atomic(savepoint=False):
        order = instance.order.uid
        order_for_update = models.Order.objects.filter(uid=order).select_for_update().first()
        instance = models.OrderLines.objects.filter(uid=instance.uid).select_for_update().first()
        if instance is None:
            msg = "Critical unknown error. Contact administrator."
            logger.exception(msg)
            raise ValidationError({"error": msg})
        instance._resolved_lines_array = instance.resolved_lines_array
        instance.resolved = True
        try:
            instance.save(update_fields=["resolved"])
        except ValidationError as e:
            msg = "Unable to update OrderLine table: {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise ValidationError({"error": msg})
        except Exception as e:
            msg = "Critical unknown error: {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise ValidationError({"error": msg})

        order_lines_resolved = order_for_update.order_lines.values("resolved")
        order_lines_str_array = order_for_update.order_lines.all().values("resolved_lines_str_array")

        updated_order_status_and_status_message(order_lines_str_array, order_lines_resolved, order_for_update)


@lru_cache.lru_cache()
def get_cached_user_model():
    return get_user_model()


# noinspection PyUnusedLocal
def create_user(username: str, originator: str):
    get_user_model().objects.create(username=username)


def create_originator_if_needed(originator: str):
    model = get_cached_user_model()
    arn = "arn:{microservice}:originator:{username}:exists".format(
        microservice=settings.DJANGO_MICROSERVICE_NAME, username=originator
    )
    if arn not in cache and not model.objects.filter(username=originator).exists():
        with cache.lock(arn, expire=settings.LOCK_TIMEOUT):
            if arn not in cache:
                if not model.objects.filter(username=originator).exists():
                    logger.info("Creating originator  {}".format(originator))
                    with transaction.atomic():
                        create_user(username=originator, originator=originator)
            cache.set(arn, True)


@receiver(MISSING_USER_SIGNAL, dispatch_uid="handle_missing_user")
def handle_missing_user(username: str = None, originator: str = None, **kwargs) -> None:
    """
    Function used to set up default Wallet for new user
    :param username: ``username`` to create
    :param originator: ``originator`` to attach user
    :return:
    """
    if username is None:
        return
    if originator is None:
        logger.error("Originator is NONE for user: %s" % username)
        return

    logger.info('Starting handle_missing_user(username="{}", originator="{}")'.format(username, originator))

    user_arn = "arn:{microservice}:handle_missing_user:{username}".format(
        microservice=settings.DJANGO_MICROSERVICE_NAME, username=username
    )

    create_originator_if_needed(originator)

    model = get_cached_user_model()
    with cache.lock(user_arn, expire=settings.LOCK_TIMEOUT):
        with transaction.atomic():
            if not model.objects.filter(username=username).exists():  # double check preventing dog pile effect
                create_user(username=username, originator=originator)
            else:
                logger.warning("User {} creation skipped. Massive error prevented!".format(username))
