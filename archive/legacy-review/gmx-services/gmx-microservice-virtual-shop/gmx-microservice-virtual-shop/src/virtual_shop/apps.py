import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class VirtualShopConfig(AppConfig):
    name = "virtual_shop"
