from django.db.models import Q
from django.utils.timezone import now
from django_filters import BooleanFilter, UUIDFilter
from django_filters.rest_framework import FilterSet

from virtual_store import models


class SubscriptionIsActiveFilter(FilterSet):
    is_active = BooleanFilter(method="filter_is_active")
    is_valid = BooleanFilter(method="filter_is_valid")
    backpack_item_sub = UUIDFilter(method="filter_by_backpack_sub")

    class Meta:
        model = models.UserSubscriptions
        fields = ("is_active", "is_valid")

    def filter_by_backpack_sub(self, queryset, name, value):
        if value:
            queryset = queryset.filter(backpack_item__sub=value)
        return queryset

    def filter_is_valid(self, queryset, name, value):
        current_date = now()
        if value:
            return queryset.filter(start_date__lte=current_date, end_date__gte=current_date)
        return queryset.filter(Q(start_date__gte=current_date) | Q(end_date__lte=current_date))

    def filter_is_active(self, queryset, name, value):
        queryset = self.filter_is_valid(queryset, name, value)
        if value:
            return queryset.filter(is_provisioned=True, is_deprovisioned=False)
        return queryset.filter(Q(is_provisioned=False) | Q(is_deprovisioned=True))
