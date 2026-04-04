from django.contrib import admin
from django.db import transaction
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe

from common.admin import CommonModelAdmin

from . import models


@admin.register(models.ChinaMobileProductPaymentModel)
class ChinaMobileProductPaymentModelAdmin(CommonModelAdmin):
    raw_id_fields = ["product", "payment_config"]
    list_filter = [
        "partner",
    ]
    search_fields = ["ext_product_id"]


class ChinaMobilePaymentConfigurationModelInLine(admin.StackedInline):
    model = models.ChinaMobilePaymentConfigurationModel
    fields = [
        "ext_cp_id",
        "success_url_text",
        "error_url_text",
        "cm_proxy_url",
        "ext_back_url",
        "ext_payment_url",
        "ext_app_id",
        "_ext_app_secret",
    ]
    extra = 0
    max_num = 0
    show_change_link = True

    def has_add_permission(self, request, obj):
        return False


@admin.register(models.PaymentConfigurationModel)
class PaymentConfigurationModelAdmin(CommonModelAdmin):
    list_display = ["payment_type"]
    list_filter = ["partner"]
    inlines = [
        ChinaMobilePaymentConfigurationModelInLine,
    ]


class ReceiptLogModelInLine(admin.TabularInline):
    extra = 0
    model = models.ReceiptLogModel

    fields = ("pre_created_at", "pre_message")
    readonly_fields = fields
    ordering = ("-created_at",)

    def pre_created_at(self, obj):
        return mark_safe(f"<code>{obj.created_at.strftime('%Y.%m.%d %H:%M:%S.%f')}</code>")  # nosec

    pre_created_at.short_description = "Created at"

    def pre_message(self, obj):
        return mark_safe(f"<code>{strip_tags(obj.message)}</code>")  # nosec

    pre_message.short_description = "Message"

    def has_add_permission(self, request, obj):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(models.ReceiptModel)
class ReceiptModelAdmin(CommonModelAdmin):
    inlines = [
        ReceiptLogModelInLine,
    ]
    raw_id_fields = ["user", "order"]
    list_display = [
        "payment_id",
        "get_payment_status_display",
        "_get_user_username",
        "_get_order_sub",
    ]

    def force_confirmation(cls, request, queryset):
        cls._force_action(queryset, True)

    force_confirmation.short_description = "Force confirmation"

    def force_cancellation(cls, request, queryset):
        cls._force_action(queryset, False)

    force_cancellation.short_description = "Force cancellation"

    @classmethod
    def _force_action(cls, queryset, result: bool):
        with transaction.atomic():
            queryset = (
                queryset.select_related(
                    "user",
                    "order",
                    "order__partner",
                    "order__currency",
                    "order__user",
                )
                .prefetch_related(
                    "order__order_line_set",
                    "order__order_line_set__order_line_items_set",
                )
                .select_for_update(of=("self", "order"))
            )
            for receipt in queryset:
                receipt.add_log(f"Result({result}) forced!")
                receipt.process_payment_result(result=result)

    actions = [force_confirmation, force_cancellation]

    search_fields = ["payment_id", "order__sub", "user__username"]

    list_filter = [
        "payment_status",
    ]

    def _get_user_username(self, obj):
        return obj.user.username

    _get_user_username.short_description = "User"

    def _get_order_sub(self, obj):
        return obj.order.sub

    _get_order_sub.short_description = "Order"

    class Media:
        css = {"all": ("payment_gateway/css/custom_admin.css",)}  # Include extra css

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
