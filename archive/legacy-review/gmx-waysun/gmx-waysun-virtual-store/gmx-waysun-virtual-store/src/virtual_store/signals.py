import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from events.client import ProductIngestorClient, UserBackpackIngestorClient

from . import models

logger = logging.getLogger(__name__)


@receiver(post_save, sender=models.BackpackItem)
def send_user_added_item_to_backpack_signal(instance: models.BackpackItem, created: bool, raw: bool, **kwargs):
    if raw:
        logger.warning(f"Skipping signals.send_user_added_item_to_backpack_signal because RAW={raw} (expected False)")
        return
    if not created:
        logger.info(
            f"Skipping signals.send_user_added_item_to_backpack_signal because created = {created} (expected True)"
        )
        return

    logger.info("Sending UserBackpackIngestorClient.send_product_added")
    UserBackpackIngestorClient.send_product_added(product_id=instance.order_line.product.sub)


@receiver(post_save, sender=models.Product)
def send_product_post_save_notification(instance: models.Product, created: bool, raw: bool, **kwargs):
    if raw:
        logger.warning(f"Skipping signals.send_product_post_save_notification because RAW={raw} (expected False)")
        return

    logger.info("Sending UserBackpackIngestorClient.send_product_added")
    if created:
        ProductIngestorClient.send_product_created(instance)
    else:
        ProductIngestorClient.send_product_updated(instance)
