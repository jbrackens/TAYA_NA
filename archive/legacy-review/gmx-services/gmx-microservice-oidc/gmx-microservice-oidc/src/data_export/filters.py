import django_filters

from oidc_temp_user import models
from django import forms
import uuid

from profiles.models import CustomUser


class UUIDFormFieldAsAllValidStrings(forms.CharField):
    def prepare_value(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value

    def to_python(self, value):
        value = super().to_python(value)
        if value in self.empty_values:
            return None
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except ValueError:
                value = uuid.uuid4()  # change for random ID if string is in wrong format
        return value


class UUIDFilterAsAllValidStrings(django_filters.UUIDFilter):
    field_class = UUIDFormFieldAsAllValidStrings


class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class ExternalUserMappingModelFilter(django_filters.FilterSet):
    company_id = UUIDFilterAsAllValidStrings(field_name='company_id', lookup_expr='exact')
    company_name1 = django_filters.CharFilter(field_name='company__name1', lookup_expr='icontains')
    company_name2 = django_filters.CharFilter(field_name='company__name2', lookup_expr='icontains')
    external_user_id = django_filters.CharFilter(field_name='external_user_id', lookup_expr='icontains')
    username = django_filters.CharFilter(field_name='user__sub', lookup_expr='istartswith')
    usernames = CharInFilter(field_name='user__sub', lookup_expr='in')

    class Meta:
        model = models.ExternalUserMappingModel
        fields = [
            'company_id',
            'company_name1',
            'company_name2',
            'external_user_id',
            'username',
            'usernames',
        ]


class CustomUserModelFilter(django_filters.FilterSet):
    sub = django_filters.CharFilter(field_name='sub', lookup_expr='exact')
    subs = CharInFilter(field_name='sub', lookup_expr='in')
    originator = UUIDFilterAsAllValidStrings(field_name='originator__company__pk', lookup_expr='exact')
    email = django_filters.CharFilter(field_name='emails', method='email_is_verified')

    def email_is_verified(self, queryset, name, value):
        filters = {
            '{}__email__exact'.format(name): value,
            '{}__is_verified': True
        }
        return queryset.filter(**filters)

    class Meta:
        model = CustomUser
        fields = [
            'sub',
            'subs',
            'originator',
            'email',
        ]
