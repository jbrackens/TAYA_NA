import logging

from django_filters import rest_framework as filters

from virtual_shop.models import BaseProduct, Order

logger = logging.getLogger(__name__)


class BaseProductsFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title")
    uid = filters.UUIDFilter(field_name="uid")

    class Meta:
        model = BaseProduct
        fields = ["title", "uid"]


class OrdersFilter(filters.FilterSet):
    uid = filters.UUIDFilter(field_name="uid")
    status = filters.CharFilter(field_name="status")

    class Meta:
        model = Order
        fields = ["uid", "status"]
