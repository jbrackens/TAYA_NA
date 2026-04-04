from rest_framework import serializers
from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from wallet.models import WalletLine


class WalletLineSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    username = serializers.CharField(source='wallet__user__username')
    company_id = serializers.CharField(source='partner__username')
    operation_uuid = serializers.UUIDField()
    operation_date = serializers.DateTimeField()
    operation_type = serializers.ChoiceField(choices=WalletLine.OPERATION_TYPE_CHOICES.to_choices())
    operation_subtype = serializers.ChoiceField(choices=WalletLine.OPERATION_SUBTYPE_CHOICES.to_choices())
    src_transaction_id = serializers.CharField(allow_blank=True)
    src_title = serializers.CharField(allow_blank=True)
    amount = serializers.DecimalField(max_digits=20, decimal_places=8)
    balance_before = serializers.DecimalField(max_digits=20, decimal_places=8)
    balance_after = serializers.DecimalField(max_digits=20, decimal_places=8)


class ReportDataUserBprIncPointsInCirculationSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    for_date = serializers.DateField()
    count_username = serializers.IntegerField()
    sum_amount_bpr = serializers.DecimalField(max_digits=20, decimal_places=8)
    sum_amount_inc = serializers.DecimalField(max_digits=20, decimal_places=8)
    sum_difference = serializers.DecimalField(max_digits=20, decimal_places=8)


class UserWalletBalanceReportSerializer(ReadOnlySerializer, LoggingSerializerMixing):
    username = serializers.CharField()
    balance = serializers.DecimalField(max_digits=20, decimal_places=8)
    last_redeemed_at = serializers.DateTimeField(allow_null=True)
    last_redeemed_amount = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_lifetime = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_current_month = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_yesterday = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_last_30_days = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_last_7_days = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)
    points_earned_current_week = serializers.DecimalField(max_digits=20, decimal_places=8, allow_null=True)

