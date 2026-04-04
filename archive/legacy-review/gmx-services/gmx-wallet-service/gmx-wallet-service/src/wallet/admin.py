from django.contrib import admin
from django.template.loader import render_to_string

from project.admin import complex_admin
from . import models


# Register your models here.
class WalletLinesInline(admin.TabularInline):
    model = models.WalletLine
    extra = 0
    fields = ('operation_type', 'src_transaction_id', 'src_title', 'partner', 'amount')

    def has_delete_permission(self, request, obj=None):
        return False


# noinspection PyAbstractClass
class InputFilter(admin.SimpleListFilter):
    template = 'admin/wallet/input_filter.html'

    def lookups(self, request, model_admin):
        # Dummy, required to show the filter.
        # noinspection PyRedundantParentheses
        return ((),)

    def choices(self, changelist):
        # Grab only the "all" option.
        all_choice = next(super().choices(changelist))
        all_choice['query_parts'] = (
            (k, v)
            for k, v in changelist.get_filters_params().items()
            if k != self.parameter_name
        )
        yield all_choice


class UsernameFilter(InputFilter):
    parameter_name = 'user_sub'
    title = 'User SUB'

    def queryset(self, request, queryset):
        if self.value() is not None:
            user_sub = self.value()
            return queryset.filter(
                user__username=user_sub
            )


class SrcTransactionIdFilter(InputFilter):
    parameter_name = 'src_transaction_id'
    title = 'Ext TRX_ID'

    def queryset(self, request, queryset):
        if self.value() is not None:
            src_transaction_id = self.value()
            return queryset.filter(
                wallet_lines__src_transaction_id=src_transaction_id
            )


class TrxTitleFilter(InputFilter):
    parameter_name = 'trx_title'
    title = 'Title contains'

    def queryset(self, request, queryset):
        if self.value() is not None:
            trx_title = self.value()
            return queryset.filter(
                wallet_lines__src_title__contains=trx_title
            )


class WalletAdmin(admin.ModelAdmin):
    fieldsets = (
        (None, {
            'fields': (
                'user',
                'name',
                '_is_default',
                'current_balance',
                'originator',
            )
        }),
        ('Wallet Line Types', {
            'classes': ('collapse',),
            'fields': ('table_wallet_lines_type',)
        }),
        ('Wallet Line SubTypes', {
            'classes': ('collapse',),
            'fields': ('table_wallet_lines_subtype',)
        }),
        ('Wallet Lines', {
            'classes': ('collapse',),
            'fields': ('table_wallet_lines',)
        }),
    )
    list_display = ('user', 'name', '_is_default', 'originator', 'current_balance')
    list_filter = (
        UsernameFilter,
        SrcTransactionIdFilter,
        TrxTitleFilter,
        'wallet_lines__operation_type',
        'wallet_lines__operation_subtype',
    )
    list_per_page = 20

    readonly_fields = ('current_balance', 'table_wallet_lines', 'table_wallet_lines_type', 'table_wallet_lines_subtype', 'originator', 'user')

    _table_wallet_lines_type = render_to_string(
        'admin/wallet/wallet_lines_type.html',
        {
            'line_types': [
                {'symbol': x[0], 'description': x[1]} for x in models.WalletLine.OPERATION_TYPE_CHOICES.to_choices()
            ]
        }
    )
    _table_wallet_lines_subtype = render_to_string(
        'admin/wallet/wallet_lines_type.html',
        {
            'line_types': [
                {'symbol': x[0], 'description': x[1]} for x in models.WalletLine.OPERATION_SUBTYPE_CHOICES.to_choices()
            ]
        }
    )

    # noinspection PyUnusedLocal
    def table_wallet_lines_type(self, item):
        return self._table_wallet_lines_type

    table_wallet_lines_type.short_description = 'Wallet Line Types'
    table_wallet_lines_type.allow_tags = True

    # noinspection PyUnusedLocal
    def table_wallet_lines_subtype(self, item):
        return self._table_wallet_lines_subtype

    table_wallet_lines_subtype.short_description = 'Wallet Line SubTypes'
    table_wallet_lines_subtype.allow_tags = True

    def table_wallet_lines(self, item):
        result = render_to_string(
            'admin/wallet/wallet_lines.html',
            {'lines': item.wallet_lines.values('operation_date', 'operation_type', 'operation_subtype', 'src_transaction_id', 'partner__username', 'src_title', 'amount', 'balance_before', 'balance_after').order_by('-operation_date')}
        )
        return result

    table_wallet_lines.short_description = 'Wallet lines'
    table_wallet_lines.allow_tags = True


class SilentChargeTokenChaneyPaymentsModelAdmin(admin.ModelAdmin):
    fields = (
        'created_at',
        'channel',
        'wallet_line',
        'external_user_id',
    )
    readonly_fields = (
        'created_at',
        'channel',
        'wallet_line',
        'external_user_id',
    )
    list_select_related = (
        'wallet_line',
        'wallet_line__wallet__user',
        'wallet_line__partner',
    )
    ordering = ('-created_at',)
    list_display = (
        'created_at',
        'wallet_line__wallet__user__username',
        'channel',
        'external_user_id',
        'wallet_line__partner__username',
        'wallet_line__operation_uuid',
        'wallet_line__src_transaction_id',
        'wallet_line__src_title',
        'wallet_line__amount',
    )
    search_fields = (
        'wallet_line__wallet__user__username',
        'channel',
        'external_user_id',
        'wallet_line__partner__username',
        'wallet_line__src_transaction_id',
        'wallet_line__src_title',
    )
    list_filter = (
        'created_at',
    )

    def wallet_line__wallet__user__username(self, obj): return obj.wallet_line.wallet.user.username

    wallet_line__wallet__user__username.admin_order_field = 'wallet_line__wallet__user__username'

    def wallet_line__partner__username(self, obj): return obj.wallet_line.partner.username

    wallet_line__partner__username.admin_order_field = 'wallet_line__partner__username'

    def wallet_line__operation_uuid(self, obj): return obj.wallet_line.operation_uuid

    wallet_line__operation_uuid.admin_order_field = 'wallet_line__operation_uuid'

    def wallet_line__src_transaction_id(self, obj): return obj.wallet_line.src_transaction_id

    wallet_line__src_transaction_id.admin_order_field = 'wallet_line__src_transaction_id'

    def wallet_line__src_title(self, obj): return obj.wallet_line.src_title

    wallet_line__src_title.admin_order_field = 'wallet_line__src_title'

    def wallet_line__amount(self, obj): return obj.wallet_line.amount

    wallet_line__amount.admin_order_field = 'wallet_line__amount'


class CommissionAdmin(admin.ModelAdmin):
    fields = ('user', 'tier', 'orig_commission', 'rm_commission')
    list_display = fields
    list_display_links = ('user',)


complex_admin.register(models.Wallet, WalletAdmin)
complex_admin.register(models.CommissionConfig, CommissionAdmin)
complex_admin.register(models.SilentChargeTokenChaneyPaymentsModel, SilentChargeTokenChaneyPaymentsModelAdmin)
