from django_filters import rest_framework as filters
from wallet import models


class WalletLineFilter(filters.FilterSet):
    username = filters.CharFilter(field_name='wallet__user__username', lookup_expr='exact')
    company_id = filters.CharFilter(field_name='partner__username', lookup_expr='exact')
    operation_uuid = filters.CharFilter(field_name='operation_uuid', lookup_expr='exact')

    operation_date__gte = filters.DateTimeFilter(field_name='operation_date', lookup_expr='gte')
    operation_date__lte = filters.DateTimeFilter(field_name='operation_date', lookup_expr='lte')

    operation_type = filters.ChoiceFilter(field_name='operation_type', choices=models.WalletLine.OPERATION_TYPE_CHOICES.to_choices())
    src_transaction_id = filters.CharFilter(field_name='src_transaction_id', lookup_expr='icontains')
    src_title = filters.CharFilter(field_name='src_title', lookup_expr='icontains')
    amount = filters.NumberFilter(field_name='amount', lookup_expr='exact')
    amount__gte = filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount__lte = filters.NumberFilter(field_name='amount', lookup_expr='lte')

    ordering = filters.OrderingFilter(
        fields=(
            ('operation_date', 'operation_date'),
            ('amount', 'amount'),
        )
    )

    class Meta:
        model = models.WalletLine
        fields = [
            'username',
            'company_id',
            'operation_uuid',
            'operation_date',
            'operation_type',
            'src_transaction_id',
            'src_title',
            'amount'
        ]

