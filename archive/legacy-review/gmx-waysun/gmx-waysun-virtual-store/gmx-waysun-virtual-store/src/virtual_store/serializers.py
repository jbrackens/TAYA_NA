import logging
from typing import Optional

from aws_rest_default.serializers import LoggingSerializerMixing
from django.db import transaction
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from payment_gateway import models as payment_models

from . import models

logger = logging.getLogger(__name__)


class CustomUserSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.CustomUser
        fields = ["username", "first_name", "last_name", "date_joined", "is_active", "is_test_user", "is_deleted"]


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Currency
        fields = ["sub", "name", "symbol2", "symbol3"]


class SimpleAdminProductModelSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimpleProduct"
    product_type = serializers.ChoiceField(read_only=True, choices=models.Product.ProductType.choices)
    subscription_duration = serializers.IntegerField(read_only=True)
    subscription_duration_type = serializers.ChoiceField(
        choices=models.Product.SubscriptionDurationType.choices, read_only=True
    )
    subscription_level = serializers.IntegerField(read_only=True)
    available_from = serializers.DateTimeField(read_only=True)
    available_to = serializers.DateTimeField(read_only=True)

    class Meta:
        model = models.Product
        many = True
        exclude = [
            "id",
        ]


class AdminProductGetCreateSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    sub = serializers.UUIDField(read_only=True)
    title = serializers.CharField(max_length=60)
    description = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=0)
    currency = CurrencySerializer(read_only=True)
    currency__sub = serializers.UUIDField(write_only=True)

    product_type = serializers.ChoiceField(choices=models.Product.ProductType.choices)
    product_subtype = serializers.ChoiceField(choices=models.Product.ProductSubType.choices)
    provision_meta = serializers.JSONField()
    stock_quantity = serializers.IntegerField(min_value=1, required=False)
    index = serializers.IntegerField(min_value=0, required=False)
    subscription_duration = serializers.IntegerField(min_value=0, required=False)
    subscription_duration_type = serializers.ChoiceField(
        choices=models.Product.SubscriptionDurationType.choices, required=False
    )
    subscription_level = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = models.Product
        many = True
        fields = [
            "sub",
            "title",
            "description",
            "price",
            "currency",
            "currency__sub",
            "product_type",
            "product_subtype",
            "provision_type",
            "provision_meta",
            "stock_quantity",
            "sort_index",
            "max_quantity_per_user",
            "subscription_duration",
            "subscription_duration_type",
            "subscription_level",
            "available_from",
            "available_to",
            "is_public",
            "index",
            "photo_small",
            "photo_medium",
            "photo_large",
            "photo_thumbnail",
            "photo_purchased",
            "photo_not_available",
            "photo_index",
        ]

    def validate(self, attrs):
        available_from = attrs.get("available_from")
        available_to = attrs.get("available_to")
        product_type = attrs.get("product_type")

        if available_from and available_to and available_to <= available_from:
            raise serializers.ValidationError("Date time range is invalid", code="invalid")

        getattr(self, "_validate_%s" % product_type.lower())()

        currency__sub = attrs.pop("currency__sub")
        if currency := models.Currency.objects.filter(sub=currency__sub).first():
            attrs["currency"] = currency
        else:
            raise serializers.ValidationError({"currency__sub": "Wrong currency sub"})
        originator_company_sub = self.context.get("request").auth.get("extra").get("ops")
        originator_partner = models.Partner.objects.filter(sub=originator_company_sub).first()
        if not originator_partner:
            raise serializers.ValidationError("Wrong Partner token validation", code="invalid")
        attrs["partner"] = originator_partner
        return attrs

    def _validate_bp(self):
        """
        Validates a base product
        """
        if (
            self.initial_data.get("subscription_duration")
            or self.initial_data.get("subscription_duration_type")
            or self.initial_data.get("subscription_level")
        ):
            raise serializers.ValidationError("Base Product can't have subscription options fulfilled", code="invalid")

    def _validate_sp(self):
        """
        Validates a subscription product
        """
        if not (self.initial_data.get("subscription_duration") and self.initial_data.get("subscription_duration_type")):
            raise serializers.ValidationError(
                "Subscription Product must have subscription options fulfilled", code="invalid"
            )

    def update(self, instance, validated_data):  # noqa F841
        raise NotImplementedError("This is create serializer not update/patch")


class SimplePartnerSerializer(LoggingSerializerMixing, serializers.Serializer):
    name = serializers.CharField(read_only=True)
    sub = serializers.UUIDField(read_only=True)

    def create(self, validated_data):
        raise NotImplementedError()

    def update(self, instance, validated_data):
        raise NotImplementedError()


class ProductGetSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    currency = CurrencySerializer(read_only=True)
    partner = SimplePartnerSerializer(read_only=True)

    class Meta:
        model = models.Product
        fields = [
            "sub",
            "created_at",
            "updated_at",
            "partner",
            "provision_type",
            "auto_provision",
            "title",
            "description",
            "price",
            "currency",
            "product_type",
            "product_subtype",
            "provision_meta",
            "stock_quantity",
            "sort_index",
            "max_quantity_per_user",
            "subscription_duration",
            "subscription_duration_type",
            "subscription_level",
            "photo_small",
            "photo_medium",
            "photo_large",
            "photo_thumbnail",
            "photo_purchased",
            "photo_not_available",
            "photo_index",
        ]
        read_only_fields = [
            "sub",
            "created_at",
            "updated_at",
            "partner",
        ]


class OrderLineItemSerializer(serializers.ModelSerializer):
    sub = serializers.UUIDField(read_only=True)

    class Meta:
        model = models.OrderLineItem
        fields = ["sub", "position", "sub_provision_status"]
        read_only_fields = ["sub", "position", "sub_provision_status"]


class OrderLineSerializer(serializers.ModelSerializer):
    product = ProductGetSerializer(read_only=True)

    class Meta:
        model = models.OrderLine
        fields = ["sub", "provision_status", "quantity", "price", "line_sum", "created_at", "product"]
        read_only_fields = ["sub", "quantity", "price", "line_sum", "created_at", "product"]


class AdminOrderLineSerializer(OrderLineSerializer):
    order_line_items_set = OrderLineItemSerializer(read_only=True, many=True)

    class Meta(OrderLineSerializer.Meta):
        fields = OrderLineSerializer.Meta.fields + [
            "order_line_items_set",
        ]


class BaseOrderSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.Order
        fields = ["sub", "payment_status", "order_status", "order_sum", "created_at"]
        read_only_fields = ["sub", "order_sum", "created_at"]


class OrderGetSerializer(BaseOrderSerializer):
    class Meta(BaseOrderSerializer.Meta):
        pass


class AdminOrderGetSerializer(OrderGetSerializer):
    user = CustomUserSerializer(read_only=True)
    currency = CurrencySerializer(read_only=True)
    order_lines = AdminOrderLineSerializer(source="order_line_set", many=True, read_only=True)

    class Meta(OrderGetSerializer.Meta):
        fields = OrderGetSerializer.Meta.fields + ["updated_at", "user", "currency", "order_lines"]
        read_only_fields = OrderGetSerializer.Meta.read_only_fields + ["updated_at", "user", "currency", "order_lines"]


class BackPackItemSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    product = ProductGetSerializer(read_only=True)
    order = OrderGetSerializer(read_only=True)
    order_line = OrderLineSerializer(read_only=True)
    order_line_item = OrderLineItemSerializer(read_only=True)

    class Meta:
        model = models.BackpackItem
        fields = [
            "sub",
            "is_activated",
            "activated_at",
            "is_consumed",
            "consumed_at",
            "created_at",
            "product",
            "order",
            "order_line",
            "order_line_item",
        ]
        read_only_fields = [
            "sub",
            "is_activated",
            "activated_at",
            "consumed_at",
            "created_at",
            "product",
            "order",
            "order_line",
            "order_line_item",
        ]


class BackPackItemUserSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.BackpackItem
        fields = [
            "sub",
            "is_consumed",
            "consumed_at",
            "created_at",
            "product",
            "order",
            "order_line",
            "order_line_item",
        ]
        read_only_fields = [
            "sub",
            "is_consumed",
            "consumed_at",
            "created_at",
            "product",
            "order",
            "order_line",
            "order_line_item",
        ]


class AdminCreateBackpackItemForOrderLineSerializer(LoggingSerializerMixing, serializers.Serializer):
    order_line_sub = serializers.UUIDField(write_only=True)
    receipt_sub = serializers.UUIDField(write_only=True, required=False, default=None)
    backpack_items = BackPackItemSerializer(read_only=True, many=True)

    def get_order_line_for_sub(self, value) -> models.OrderLine:
        order_line = (
            models.OrderLine.objects.select_for_update(
                nowait=False,
            )
            .filter(sub=value)
            .select_related("order", "order__user", "product")
            .first()
        )
        if order_line is None or not order_line:
            raise serializers.ValidationError("not found")
        return order_line

    def update(self, instance, validated_data):
        raise NotImplementedError()

    def create(self, validated_data):
        order_line_sub = validated_data.pop("order_line_sub")
        receipt_sub = validated_data.pop("receipt_sub") if "receipt_sub" in validated_data else None
        receipt = self.get_receipt(receipt_sub)
        backpack_items = list()

        with transaction.atomic():
            order_line = self.get_and_lock_order_line(order_line_sub)
            self.validate_backpack_existence(order_line_sub)
            for order_line_item in order_line.order_line_items_set.all():
                backpack_item = models.BackpackItem.objects.create(
                    is_activated=False,
                    is_consumed=False,
                    user=order_line.order.user,
                    product=order_line.product,
                    order=order_line.order,
                    order_line=order_line,
                    order_line_item=order_line_item,
                    receipt=receipt,
                )
                backpack_items.append(backpack_item)
                self.logger.info(f"BackpackItem({backpack_item.sub}) created - ok")

        return dict(backpack_items=backpack_items)

    def validate_backpack_existence(self, order_line_sub):
        backpack = models.BackpackItem.objects.filter(order_line__sub=order_line_sub).first()
        if backpack is not None or backpack:
            msg = f"backpack item {backpack.sub} already exists for order line {order_line_sub}"
            self.logger.error(msg)
            raise serializers.ValidationError(msg)
        self.logger.info(f"backpack item does not exists - ok")

    def get_receipt(self, receipt_sub) -> Optional[payment_models.ReceiptModel]:
        if receipt_sub:
            return payment_models.ReceiptModel.objects.filter(sub=receipt_sub).first()

    def get_and_lock_order_line(self, order_line_sub):
        order_line = self.get_order_line_for_sub(order_line_sub)
        if order_line is None or not order_line:
            msg = f"order line {order_line_sub} not found"
            self.logger.error(msg)
            raise serializers.ValidationError(dict(order_line_sub=msg))
        self.logger.info(f"order line for sub {order_line_sub} found - ok")
        return order_line


class SubscriptionCreateFromBackpackItemSerializer(LoggingSerializerMixing, serializers.Serializer):
    backpack_item_sub = serializers.UUIDField(write_only=True)
    sub = serializers.UUIDField(read_only=True)

    def create(self, validated_data):
        backpack: models.BackpackItem = validated_data.pop("backpack_item_sub")
        start_date = now()
        end_date = start_date + backpack.product.get_time_delta_for_subscription()
        subscription = models.UserSubscriptions.objects.create(
            user=backpack.user,
            start_date=start_date,
            end_date=end_date,
            backpack_item=backpack,
        )
        return dict(sub=subscription.sub)

    def update(self, instance, validated_data):
        raise NotImplementedError()

    def validate_backpack_item_sub(self, value):
        backpack = models.BackpackItem.objects.filter(sub=value).select_related("user", "product").first()
        if backpack is None or not backpack:
            raise serializers.ValidationError("wrong value")
        return backpack


class SubscriptionAdminSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    backpack_item = BackPackItemSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = models.UserSubscriptions
        fields = [
            "sub",
            "start_date",
            "end_date",
            "created_at",
            "is_active",
            "backpack_item",
            "is_valid",
            "is_provisioned",
            "is_deprovisioned",
        ]
        read_only_fields = ["sub", "created_at", "is_active", "backpack_item", "is_valid"]


class SubscriptionWithUserAdminSerializer(SubscriptionAdminSerializer):
    user = CustomUserSerializer(read_only=True)

    class Meta(SubscriptionAdminSerializer.Meta):
        fields = SubscriptionAdminSerializer.Meta.fields + ["user"]
        read_only_fields = SubscriptionAdminSerializer.Meta.read_only_fields + ["user"]


class SubSerializer(serializers.Serializer):
    sub = serializers.UUIDField

    def create(self, validated_data):
        pass

    def update(self, instance, validated_data):
        pass


class SubscriptionGetSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    backpack_item = BackPackItemSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = models.UserSubscriptions
        fields = [
            "sub",
            "start_date",
            "end_date",
            "created_at",
            "is_active",
            "backpack_item",
            "is_valid",
            "is_provisioned",
            "is_deprovisioned",
            "is_send_for_deprovisioning",
        ]
        read_only_fields = fields


class ChinaMobileConfigSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    success_urls = serializers.SerializerMethodField()
    error_urls = serializers.SerializerMethodField()

    @staticmethod
    def get_success_urls(obj):
        return obj.first().config.success_urls

    @staticmethod
    def get_error_urls(obj):
        return obj.first().config.error_urls

    class Meta:
        model = payment_models.PaymentConfigurationModel
        fields = ["success_urls", "error_urls"]


class AntstreamConfigurationSerializer(LoggingSerializerMixing, serializers.Serializer):
    name = serializers.CharField(read_only=True)

    default_product_sub = serializers.UUIDField()
    order_token_max_age = serializers.IntegerField(min_value=1)
    signing_kid = serializers.RegexField(r"^[a-f0-9]{32}$")

    notification_url = serializers.URLField()
    success_urls = serializers.ListField(child=serializers.URLField())
    error_urls = serializers.ListField(child=serializers.URLField())

    def _get_partner_sub(self):
        return self.context.get("partner_sub")

    def validate_default_product_sub(self, default_product_sub):
        if models.Product.objects.filter(sub=default_product_sub, partner__sub=self._get_partner_sub()).exists():
            return default_product_sub
        raise ValidationError("wrong value")

    def create(self, validated_data):
        raise NotImplementedError("Can't create new configuration.")

    def to_representation(self, instance: models.Partner):
        obj = instance.partner_payment_configuration_set.first().config
        return dict(
            name=instance.get_name_display(),
            default_product_sub=getattr(instance, "partner_meta", dict()).get("default_product_sub"),
            order_token_max_age=getattr(instance, "partner_meta", dict()).get("order_token_max_age"),
            signing_kid=getattr(instance, "partner_meta", dict()).get("signing_kid"),
            notification_url=getattr(
                models.Product.objects.filter(partner__sub=self._get_partner_sub()).first(), "provision_meta", dict()
            ).get("notification_url"),
            success_urls=obj.success_urls,
            error_urls=obj.error_urls,
        )

    def update(self, instance: models.Partner, validated_data):
        with transaction.atomic():
            instance: models.Partner = models.Partner.objects.filter(pk=instance.pk).select_for_update().first()
            instance.refresh_from_db()
            default_product_sub = validated_data.get("default_product_sub")
            order_token_max_age = validated_data.get("order_token_max_age")
            signing_kid = validated_data.get("signing_kid")

            notification_url = validated_data.get("notification_url")
            success_urls = validated_data.get("success_urls")
            error_urls = validated_data.get("error_urls")

            if default_product_sub or order_token_max_age or signing_kid:
                if instance.partner_meta is None or not instance.partner_meta:
                    instance.partner_meta = dict()
                if default_product_sub:
                    instance.partner_meta["default_product_sub"] = str(default_product_sub)
                if order_token_max_age:
                    instance.partner_meta["order_token_max_age"] = order_token_max_age
                if signing_kid:
                    instance.partner_meta["signing_kid"] = signing_kid
                instance.save()
            if success_urls or error_urls:
                obj = instance.partner_payment_configuration_set.first().config
                if success_urls:
                    obj.success_urls = success_urls
                if error_urls:
                    obj.error_urls = error_urls
                obj.clean()
                obj.save()
            if notification_url:
                products = models.Product.objects.filter(partner__sub=self._get_partner_sub()).select_for_update()
                for product in products:
                    if product.provision_meta is None or not product.provision_meta:
                        product.provision_meta = dict()
                    product.provision_meta["notification_url"] = notification_url
                    product.save(update_fields=("provision_meta",))
        return instance


class CreateLogEntrySerializer(LoggingSerializerMixing, serializers.Serializer):
    order_sub = serializers.UUIDField(write_only=True, required=False)
    order_line_sub = serializers.UUIDField(write_only=True, required=False)
    order_line_item_sub = serializers.UUIDField(write_only=True, required=False)
    backpack_item_sub = serializers.UUIDField(write_only=True, required=False)
    subscription_sub = serializers.UUIDField(write_only=True, required=False)
    message = serializers.CharField(required=True)
    created_at = serializers.DateTimeField(read_only=True)

    def update(self, instance, validated_data):
        raise NotImplementedError()

    def validate_order_sub(self, value):
        if value:
            return models.Order.objects.filter(sub=value).first()

    def validate_order_line_sub(self, value):
        if value:
            return models.OrderLine.objects.filter(sub=value).first()

    def validate_order_line_item_sub(self, value):
        if value:
            return models.OrderLineItem.objects.filter(sub=value).first()

    def validate_backpack_item_sub(self, value):
        if value:
            return models.BackpackItem.objects.filter(sub=value).first()

    def validate_subscription_sub(self, value):
        if value:
            return models.UserSubscriptions.objects.filter(sub=value).first()

    def validate(self, attrs):
        order = attrs.pop("order_sub", None)
        order_line = attrs.pop("order_line_sub", None)
        order_line_item = attrs.pop("order_line_item_sub", None)
        backpack_item = attrs.pop("backpack_item_sub", None)
        subscription = attrs.pop("subscription_sub", None)

        _list = list(filter(lambda x: x, [order, order_line, order_line_item, backpack_item, subscription]))

        if len(_list) != 1:
            raise serializers.ValidationError(f"Only one item can be referenced: got {len(_list)}")

        attrs["obj"] = _list[0]
        return attrs

    def create(self, validated_data):
        obj: models.StatusChangeMonitoringMixing = validated_data.pop("obj")
        message: str = validated_data.pop("message")
        return obj.create_log_entry(message)
