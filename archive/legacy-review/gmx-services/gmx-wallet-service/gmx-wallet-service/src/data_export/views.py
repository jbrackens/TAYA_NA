from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from django_filters import rest_framework as filters
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from aws_rest_default.pagination import StandardPageNumberPagination
from data_export.raw_queries_fetch import fetch_user_bpr_inc_points_in_circulation, fetch_user_wallet_balance_status
from wallet.models import WalletLine
from . import serializers
from .filters import WalletLineFilter


class WalletLineListApiView(DefaultJsonRestViewMixing, ListAPIView):
    http_method_names = ['get', 'options']
    queryset = WalletLine.objects.all()
    required_scopes = ('wallet:data_export:wallet_line:read',)
    permission_classes = (TokenHasScope,)
    serializer_class = serializers.WalletLineSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = WalletLineFilter

    def get_queryset(self):
        query = super().get_queryset()
        query = query.values(
            'wallet__user__username',
            'partner__username',
            'operation_uuid',
            'operation_date',
            'operation_type',
            'operation_subtype',
            'src_transaction_id',
            'src_title',
            'amount',
            'balance_before',
            'balance_after'
        )
        return query


class WalletLinePaginatedListApiView(WalletLineListApiView):
    pagination_class = StandardPageNumberPagination


class ReportDataUserBprIncPointsInCirculationView(DefaultJsonRestViewMixing, ListAPIView):
    queryset = WalletLine.objects.all()
    required_scopes = ('wallet:data_export:bpr_inc_in_circulation:read',)
    permission_classes = (TokenHasScope,)
    serializer_class = serializers.ReportDataUserBprIncPointsInCirculationSerializer

    def list(self, request, *args, **kwargs):
        data = fetch_user_bpr_inc_points_in_circulation(kwargs.get('for_date'))
        serializer = self.get_serializer(data=data, many=True)
        serializer.is_valid(True)
        return Response(serializer.data)


class ReportUserWalletBalanceView(DefaultJsonRestViewMixing, ListAPIView):
    required_scopes = ('wallet:data_export:user_wallet_balance:read',)
    permission_classes = (TokenHasScope,)
    serializer_class = serializers.UserWalletBalanceReportSerializer

    def list(self, request, *args, **kwargs):
        data = fetch_user_wallet_balance_status()
        serializer = self.get_serializer(data=data, many=True)
        serializer.is_valid(True)
        return Response(serializer.data)
