from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from inline_actions.admin import InlineActionsMixin
from nested_admin.nested import NestedModelAdmin, NestedTabularInline
from rest_framework.reverse import reverse

from common.admin import CommonModelAdmin, ReadOnlyMixing
from virtual_store import models


@admin.register(models.Currency)
class CurrencyModelAdmin(CommonModelAdmin):
    list_display = ("name", "symbol2", "symbol3")
    search_fields = ("name", "symbol2", "symbol3")


@admin.register(models.Partner)
class PartnerModelAdmin(CommonModelAdmin):
    list_display = ("name", "sub")
    search_fields = ("object_id", "name", "sub")


@admin.register(models.Product)
class ProductModelAdmin(CommonModelAdmin):
    list_display = ("sub", "title", "product_type", "product_subtype", "price", "currency", "is_public")
    list_filter = ("sub", "partner", "currency__name", "product_type", "product_subtype", "is_public")
    search_fields = ("sub", "title", "product_type", "product_subtype", "price", "currency")

    def get_ordering(self, request):
        ordering = ("-is_public", "-product_type", "-product_subtype", "price")
        return ordering

    def get_queryset(self, request):
        qs = self.model.all_objects.get_queryset()
        ordering = self.get_ordering(request)
        if ordering:
            qs = qs.order_by(*ordering)
        return qs


class OrderLogInLine(NestedTabularInline):
    extra = 0
    model = models.OrderLog
    fields = ("pre_created_at", "pre_object", "pre_message")
    readonly_fields = fields
    ordering = ("-created_at",)
    is_sortable = False
    sortable_field_name = None
    sortable_by = None

    def pre_created_at(self, obj):
        return mark_safe(f"<code>{obj.created_at.strftime('%Y.%m.%d %H:%M:%S.%f')}</code>")  # nosec

    pre_created_at.short_description = "Created at"

    def pre_object(self, obj):
        return mark_safe(f"<code>{obj.order_log_object.__class__.__name__}({obj.order_log_object.sub})</code>")  # nosec

    pre_object.short_description = "Object"

    def pre_message(self, obj):
        return mark_safe(f"<code>{strip_tags(obj.message)}</code>")  # nosec

    pre_message.short_description = "Message"

    def has_add_permission(self, request, obj):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class OrderLineItemInLine(NestedTabularInline):
    fields = ("sub", "position", "sub_provision_status", "order_line")
    readonly_fields = fields
    model = models.OrderLineItem
    is_sortable = False
    sortable_field_name = None
    sortable_by = None

    def has_add_permission(self, request, obj):
        return False


class OrderLineInLine(NestedTabularInline):
    model = models.OrderLine
    fields = ("sub", "provision_status", "order", "product", "quantity", "price", "line_sum")
    readonly_fields = fields
    inlines = [OrderLineItemInLine]
    is_sortable = False
    sortable_field_name = None
    sortable_by = None

    def has_add_permission(self, request, obj):
        return False


@admin.register(models.Order)
class OrderModelAdmin(NestedModelAdmin):
    list_display = ("sub", "user", "partner", "currency", "payment_status", "order_status", "order_sum", "created_at")
    list_filter = ("partner", "currency", "payment_status", "order_status")
    search_fields = ("user", "partner", "currency", "payment_status", "order_status", "order_sum")
    ordering = ["-created_at"]
    inlines = [OrderLineInLine, OrderLogInLine]
    raw_id_fields = [
        "user",
    ]
    list_select_related = ("user", "currency", "partner")

    def has_change_permission(self, request, obj=None):
        return False

    class Media:
        css = {"all": ("payment_gateway/css/custom_admin.css",)}  # Include extra css


@admin.register(models.UserPurchasedCount)
class UserPurchasedCountModelAdmin(ReadOnlyMixing, CommonModelAdmin):
    list_display = ("user", "product", "count")
    search_fields = ("object_id", "user", "product")


class UserSubscriptionsItemsMixing:
    fields = (
        "sub",
        "start_date",
        "end_date",
        "backpack_item",
        "is_active",
        "is_valid",
        "is_provisioned",
        "is_deprovisioned",
        "is_send_for_deprovisioning",
        "created_at",
    )
    readonly_fields = fields

    def is_active(self, instance):
        return instance.is_active

    is_active.boolean = True

    def is_valid(self, instance):
        return instance.is_valid

    is_valid.boolean = True


class UserSubscriptionsInLine(
    UserSubscriptionsItemsMixing,
    InlineActionsMixin,
    NestedTabularInline,
):
    model = models.UserSubscriptions
    is_sortable = False
    sortable_field_name = None
    sortable_by = None
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj):
        return False


@admin.register(models.UserSubscriptions)
class UserSubscriptionsAdmin(UserSubscriptionsItemsMixing, admin.ModelAdmin):
    list_display = UserSubscriptionsItemsMixing.fields


class BackpackItemsMixing:
    fields = (
        "is_activated",
        "activated_at",
        "is_consumed",
        "consumed_at",
        "user",
        "product",
        "order_ref",
        "order_line",
        "order_line_item",
    )
    readonly_fields = (
        "is_activated",
        "activated_at",
        "is_consumed",
        "consumed_at",
        "user",
        "product",
        "order_ref",
        "order_line",
        "order_line_item",
    )

    def product_ref(self, instance):
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse("admin:virtual_store_product_change", args=(instance.prodcut.id,)), instance.prodcut
            )
        )

    product_ref.short_description = "product"

    def order_ref(self, instance):
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse("admin:virtual_store_order_change", args=(instance.order.id,)), instance.order
            )
        )

    order_ref.short_description = "order"


class BackpackItemInLine(
    BackpackItemsMixing,
    NestedTabularInline,
):
    model = models.BackpackItem
    is_sortable = False
    sortable_field_name = None
    sortable_by = None
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj):
        return False


@admin.register(models.BackpackItem)
class BackpackItemAdmin(BackpackItemsMixing, admin.ModelAdmin):
    list_max_show_all = 1
    list_per_page = 1


@admin.register(models.CustomUser)
class CustomUserModelAdmin(NestedModelAdmin, UserAdmin):
    list_display = ("username", "originator")
    search_fields = ("username",)
    readonly_fields = ("originator",)
    inlines = [UserSubscriptionsInLine, BackpackItemInLine]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email", "originator")}),
        (
            _("Permissions"),
            {
                "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
