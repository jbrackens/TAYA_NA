from django.contrib import admin
from django.urls import reverse
from django.utils.safestring import mark_safe

from virtual_shop.models import (
    BaseProductAvailableFor,
    BaseProductTag,
    BonusConfiguration,
    BonusGroupConfiguration,
    Order,
    Package,
    Product,
    ProductType,
    PurchasedProductsModel,
    SbTechPartnerConfiguration,
    StockRecord,
    UserBonusGroup,
    UserPurchasedCount,
)

from . import models


class ReadOnlyMixing(object):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return True

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BaseProductAvailableFor)
class BaseProductAvailableForModelAdmin(admin.ModelAdmin):
    list_display = ("uid", "name", "mode", "created_at", "updated_at")
    search_fields = ("uid", "mode")
    readonly_fields = ("uid", "created_at", "updated_at")


@admin.register(BaseProductTag)
class BaseProductTagModelAdmin(admin.ModelAdmin):
    list_display = ("uid", "name", "created_at", "updated_at")
    search_fields = ("uid", "name")
    readonly_fields = ("uid", "created_at", "updated_at")


@admin.register(BonusConfiguration)
class BonusConfigurationModelAdmin(admin.ModelAdmin):
    list_display = ("name", "uid", "sbtech_bonus_id", "bonus_group")
    search_fields = ("name", "uid", "sbtech_bonus_id", "bonus_group")
    readonly_fields = ("uid", "created_at", "updated_at")


class BonusInLine(ReadOnlyMixing, admin.TabularInline):
    model = models.BonusConfiguration
    extra = 0
    fields = ["name", "uid", "sbtech_bonus_id", "bonus_group"]
    readonly_fields = ["name", "uid", "sbtech_bonus_id", "bonus_group"]
    verbose_name = "Bonuses"
    verbose_name_plural = "Bonuses Set"
    fk_name = "bonus_group"


@admin.register(BonusGroupConfiguration)
class BonusGroupConfigurationModelAdmin(admin.ModelAdmin):
    list_display = ("name", "uid", "size")
    search_fields = ("name", "uid", "size")
    readonly_fields = ("size", "uid", "created_at", "updated_at")
    inlines = [BonusInLine]


class OrderLinesInLine(ReadOnlyMixing, admin.TabularInline):
    list_filter = ("order__uid", "base_product", "price")
    fields = [
        "uid",
        "base_product_details",
        "quantity",
        "resolved_lines_array",
        "resolved_lines_str_array",
        "price",
        "created_at",
        "resolved",
    ]
    readonly_fields = [
        "uid",
        "base_product_details",
        "quantity",
        "resolved_lines_array",
        "resolved_lines_str_array",
        "price",
        "created_at",
        "resolved",
    ]
    model = models.OrderLines
    extra = 0

    def base_product_details(self, instance):
        if isinstance(instance.base_product, models.Package):
            admin_url = "admin:virtual_shop_package_change"
        else:
            admin_url = "admin:virtual_shop_product_change"
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse(admin_url, args=(instance.base_product.id,)), instance.base_product.title
            )
        )

    base_product_details.short_description = "Base Product"


class OrderHistoryInLine(ReadOnlyMixing, admin.TabularInline):
    model = models.OrderHistory
    extra = 0
    fields = ["raw_note"]
    readonly_fields = ["raw_note"]
    verbose_name = "Order history"
    verbose_name_plural = "Order history set"

    def raw_note(self, instance):
        return mark_safe("<pre>[{}] {}</pre>".format(instance.created_at, instance.note))  # nosec

    raw_note.short_description = ""


@admin.register(Order)
class OrderModelAdmin(ReadOnlyMixing, admin.ModelAdmin):
    list_display = (
        "uid",
        "process_id",
        "username",
        "external_user_id",
        "status",
        "status_message",
        "checkout_amount",
        "created_at",
    )
    search_fields = ("user__username", "uid", "status", "process_id", "checkout_amount", "external_user_id")
    fields = [
        "user_link",
        "status",
        "external_user_id",
        "status_message",
        "process_id",
        "checkout_amount",
        "uid",
        "created_at",
        "updated_at",
    ]
    readonly_fields = [
        "user_link",
        "status",
        "status_message",
        "process_id",
        "checkout_amount",
        "uid",
        "created_at",
        "updated_at",
    ]
    list_filter = ("status", "created_at")
    ordering = ["-created_at"]
    inlines = [OrderLinesInLine, OrderHistoryInLine]

    def user_link(self, instance):
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse("admin:auth_user_change", args=(instance.user.id,)), instance.user.username
            )
        )

    user_link.short_description = "User"

    @staticmethod
    def username(instance):
        return str(instance.user.username if instance.user else "None")


@admin.register(Package)
class PackageModelAdmin(admin.ModelAdmin):
    list_display = ("title", "package_product", "is_active", "is_visible", "quantity", "price")
    search_fields = ("title", "description", "package_product__title", "price", "quantity")
    list_filter = ("is_active", "is_visible", "package_product")
    readonly_fields = ("uid", "created_at", "updated_at")


@admin.register(ProductType)
class ProductTypeModelAdmin(admin.ModelAdmin):
    list_display = ("name", "partner_configuration", "subtype_validation")
    search_fields = ("name", "partner_configuration__name", "subtype_validation")
    list_filter = ("subtype_validation",)


class PackageInLine(ReadOnlyMixing, admin.TabularInline):
    model = models.Package
    extra = 0
    fields = ["title", "package_product", "is_active", "is_visible", "quantity", "price"]
    readonly_fields = ["title", "package_product", "is_active", "is_visible", "quantity", "price"]
    verbose_name = "Package"
    verbose_name_plural = "Package Set"
    fk_name = "package_product"


class StockRecordInLine(ReadOnlyMixing, admin.TabularInline):
    model = models.StockRecord
    extra = 0
    fields = ["product", "partner_sku", "num_in_stock", "low_stock_threshold"]
    readonly_fields = ["product", "partner_sku", "num_in_stock", "low_stock_threshold"]
    verbose_name = "Stock Record"
    verbose_name_plural = "Stock Records"


class ProductsMembershipInline(ReadOnlyMixing, admin.TabularInline):
    model = models.BaseProductAvailableFor.products_members.through
    verbose_name = "Base Product Available For"
    verbose_name_plural = "Base Product Available For"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "product_type",
        "subtype_raw",
        "is_active",
        "is_visible",
        "product_availability",
        "max_quantity_per_user",
        "credit_all_points",
        "once_per_order",
        "price",
    )
    search_fields = ("title", "description", "price")
    list_filter = (
        "is_active",
        "is_visible",
        "max_quantity_per_user",
        "once_per_order",
        "credit_all_points",
        "product_type",
    )
    readonly_fields = ("uid", "created_at", "updated_at")
    inlines = [ProductsMembershipInline, StockRecordInLine, PackageInLine]

    def get_ordering(self, request):
        ordering = ("-is_active", "-product_type", "price")
        return ordering

    def get_queryset(self, request):
        qs = self.model.all_objects.get_queryset()
        ordering = self.get_ordering(request)
        if ordering:
            qs = qs.order_by(*ordering)
        return qs

    def product_availability(self, obj):
        return [p for p in obj.produtcs_available_for.all()]


@admin.register(PurchasedProductsModel)
class PurchasedProductsModelAdmin(ReadOnlyMixing, admin.ModelAdmin):
    list_display = (
        "purchased_details",
        "order_uid",
        "user",
        "external_user_id",
        "base_product",
        "quantity",
        "created_at",
        "updated_at",
    )
    fields = [
        "user_link",
        "external_user_id",
        "order_uid",
        "base_product_details",
        "quantity",
        "uid",
        "created_at",
        "updated_at",
    ]
    search_fields = (
        "user__username",
        "order__external_user_id",
        "order__uid",
        "base_product__uid",
        "base_product__title",
        "quantity",
        "created_at",
        "updated_at",
    )
    list_filter = ("created_at", "base_product")
    ordering = ["-created_at", "user__username", "order__uid"]
    read_only_fields = (
        "user_link",
        "external_user_id",
        "order_uid",
        "base_product_details",
        "quantity",
        "uid",
        "created_at",
        "updated_at",
    )

    def order_uid(self, instance):
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse("admin:virtual_shop_order_change", args=(instance.order.id,)), instance.order.uid
            )
        )

    order_uid.short_description = "Order UID"

    def external_user_id(self, instance):
        return instance.order.external_user_id

    external_user_id.short_description = "EXT USER ID"

    def user_link(self, instance):
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse("admin:auth_user_change", args=(instance.user.id,)), instance.user.username
            )
        )

    user_link.short_description = "User"

    def base_product_details(self, instance):
        if isinstance(instance.base_product, models.Package):
            admin_url = "admin:virtual_shop_package_change"
        else:
            admin_url = "admin:virtual_shop_product_change"
        return mark_safe(  # nosec
            '<a href="{}">{}</a>'.format(
                reverse(admin_url, args=(instance.base_product.id,)), instance.base_product.title
            )
        )

    base_product_details.short_description = "Base Product"

    @staticmethod
    def purchased_details(instance):
        return "View"


@admin.register(SbTechPartnerConfiguration)
class SbTechPartnerConfigurationModelAdmin(admin.ModelAdmin):
    list_display = ("name", "uid", "token_prefix", "pc_endpoint")
    search_fields = ("name", "uid", "token_prefix", "pc_endpoint")
    list_filter = ("name", "uid", "token_prefix")
    readonly_fields = ("uid", "created_at", "updated_at")
    ordering = ["name"]


@admin.register(StockRecord)
class StockRecordModelAdmin(admin.ModelAdmin):
    list_display = ("uid", "product", "num_in_stock")
    search_fields = ("uid", "product", "num_in_stock")


@admin.register(UserBonusGroup)
class UserBonusGroupModelAdmin(ReadOnlyMixing, admin.ModelAdmin):
    list_display = ("user", "uid", "user_bonus_group", "sbtech_bonus_ids", "sbtech_bonus_ids_send")
    search_fields = ("user", "uid", "user_bonus_group", "sbtech_bonus_ids", "sbtech_bonus_ids_send")
    readonly_fields = (
        "user",
        "user_bonus_group",
        "sbtech_bonus_ids",
        "sbtech_bonus_ids_send",
        "uid",
        "created_at",
        "updated_at",
    )


@admin.register(UserPurchasedCount)
class UserPurchasedCountModelAdmin(admin.ModelAdmin):
    list_display = ("user", "uid", "base_product", "count")
    search_fields = ("user", "uid", "base_product", "count")
    readonly_fields = ("user", "uid", "base_product", "count", "uid", "created_at", "updated_at")
    ordering = ["user"]
