import logging
from decimal import Decimal

from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers

from virtual_shop.exception_handling import PaymentExceptionHandlingMixing
from virtual_shop.tools import (
    common_member,
    get_message_id_from_request,
    get_or_create_user,
    pc_service_get_user_current_balance,
    pc_service_payment,
    pc_service_validate_token,
)

from . import models

logger = logging.getLogger(__name__)


class SimpleProductModelSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimpleProduct"
    id = serializers.CharField(source="uid")
    type = serializers.CharField(source="product_type.name")

    class Meta:
        model = models.Product
        fields = [
            "id",
            "title",
            "description",
            "price",
            "type",
            "subtype",
            "photo_small",
            "photo_medium",
            "photo_large",
            "photo_thumbnail",
            "index",
            "credit_all_points",
            "once_per_order",
            "max_quantity_per_user",
        ]


class CsAdminSimpleProductModelSerializer(SimpleProductModelSerializer):
    simple_name = "SimpleProduct"
    id = serializers.CharField(source="uid")
    type = serializers.CharField(source="product_type.name")

    class Meta:
        model = models.Product
        fields = [
            "id",
            "title",
            "description",
            "price",
            "type",
            "subtype",
            "photo_small",
            "photo_medium",
            "photo_large",
            "photo_thumbnail",
            "index",
            "max_quantity_per_user",
            "once_per_order",
            "created_at",
        ]


class SimplePackageModelSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimplePackage"
    id = serializers.CharField(source="uid")
    product = SimpleProductModelSerializer(source="package_product")

    class Meta:
        model = models.Package
        fields = [
            "id",
            "title",
            "description",
            "price",
            "quantity",
            "product",
            "photo_small",
            "photo_medium",
            "photo_large",
            "photo_thumbnail",
            "index",
            "credit_all_points",
            "once_per_order",
            "max_quantity_per_user",
        ]


class SimpleOrderHistorySerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimpleOrderHistory"

    class Meta:
        model = models.OrderHistory
        fields = ["created_at", "note"]


class BaseProductSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    ModelMappings = {models.Product: SimpleProductModelSerializer, models.Package: SimplePackageModelSerializer}

    def to_representation(self, instance):
        user_sub = self.context.get("user")
        serializer = self.ModelMappings.get(type(instance))
        data = serializer(instance, context=self.context).data
        once_per_order = data.get("once_per_order")
        max_quantity_per_user = data.get("max_quantity_per_user")
        index = data.get("index")

        result = {
            "type": serializer.simple_name,
            "definition": data,
            "available": True,
            "once_per_order": once_per_order,
            "index": index,
            "max_quantity_per_user": max_quantity_per_user,
        }

        if max_quantity_per_user and user_sub:
            user = get_or_create_user(user_sub)
            purchased_count = models.UserPurchasedCount.objects.filter(
                user=user, base_product__uid=data.get("id")
            ).first()

            if purchased_count and purchased_count.count >= max_quantity_per_user:
                result["available"] = False

        return result


class BaseProductOrderLineSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "BaseProductOrderLine"

    class Meta:
        model = models.BaseProduct
        fields = ["title", "bonus_type", "price"]


class BaseTagsAvailableForSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "BaseTagsAvailableFor"
    products = BaseProductOrderLineSerializer(read_only=True, many=True, source="products_members")

    class Meta:
        model = models.BaseProductAvailableFor
        fields = ["name", "mode", "uid", "products"]


class BaseProductTagSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "BaseTagsSerializer"
    tags_available_for = BaseTagsAvailableForSerializer(read_only=True, many=True, source="tag_available_for")

    class Meta:
        model = models.BaseProductTag
        fields = ["name", "uid", "created_at", "updated_at", "tags_available_for"]


class OrderLineSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    product = BaseProductOrderLineSerializer(source="base_product", read_only=True)

    class Meta:
        model = models.OrderLines
        fields = ["product", "quantity", "resolved_lines_str_array", "price", "resolved"]


class SimpleOrderPatchModelSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimpleOrder"
    order_id = serializers.CharField(source="uid")
    status_token = serializers.CharField(read_only=True)

    class Meta:
        model = models.Order
        fields = ["order_id", "status", "status_message", "status_token", "checkout_amount"]


class SimpleOrderLinePatchModelSerializer(LoggingSerializerMixing, serializers.Serializer):
    simple_name = "SimpleOrderLine"
    resolved_lines_array = serializers.ListField(
        write_only=True,
        allow_null=False,
        allow_empty=False,
        child=serializers.IntegerField(min_value=1, max_value=10 ** 6),
    )
    resolved_lines_str_array = serializers.ListField(
        write_only=True, required=False, child=serializers.CharField(max_length=20)
    )
    updated = serializers.CharField(max_length=40, read_only=True)

    def update(self, instance, validated_data):
        raise NotImplemented()

    def create(self, validated_data):
        with transaction.atomic():
            resolved_lines_array = validated_data.get("resolved_lines_array", list())
            resolved_lines_str_array = validated_data.get("resolved_lines_str_array", list())
            order_line_uid = self.context.get("order_line_uid")
            order_line = models.OrderLines.objects.filter(uid=order_line_uid).select_for_update().first()

            if (
                order_line.resolved_lines_array
                and resolved_lines_array
                and not common_member(order_line.resolved_lines_array, resolved_lines_array)
            ):
                updated_resolved_lines_array = order_line.resolved_lines_array + resolved_lines_array
                updated_resolved_lines_array.sort()
            else:
                updated_resolved_lines_array = resolved_lines_array

            if not resolved_lines_str_array:
                updated_resolved_lines_str_array = order_line.resolved_lines_str_array
            elif (
                order_line.resolved_lines_str_array
                and resolved_lines_str_array
                and not common_member(order_line.resolved_lines_str_array, resolved_lines_str_array)
            ):
                updated_resolved_lines_str_array = order_line.resolved_lines_str_array + resolved_lines_str_array
            else:
                updated_resolved_lines_str_array = resolved_lines_str_array

            self.update_order_line_model(order_line, updated_resolved_lines_array, updated_resolved_lines_str_array)
        validated_data = {"updated": True}
        return validated_data

    @staticmethod
    def update_order_line_model(order_line, updated_resolved_lines_array, updated_resolved_lines_str_array):
        order_line_for_update = order_line

        if order_line_for_update is None:
            msg = "Critical unknown error. Contact administrator."
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})

        order_line_for_update.resolved_lines_array = updated_resolved_lines_array
        order_line_for_update.resolved_lines_str_array = updated_resolved_lines_str_array
        try:
            order_line_for_update.save(update_fields=("resolved_lines_array", "resolved_lines_str_array"))
        except serializers.ValidationError as e:
            msg = "Unable to update OrderLines table: {}. Contact administrator.".format(e)
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})
        except Exception as e:
            msg = "Critical error: {}. Contact administrator.".format(e)
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})
        updated_order_line = order_line_for_update

        return updated_order_line


class SimpleOrdersModelSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    simple_name = "SimpleOrder"
    user_name = serializers.CharField(source="user.username")
    order_id = serializers.CharField(source="uid")
    status_token = serializers.CharField(read_only=True)
    order_lines_set = OrderLineSerializer(read_only=True, many=True, source="order_lines")
    order_history = SimpleOrderHistorySerializer(read_only=True, many=True, source="order_history_set")

    class Meta:
        model = models.Order
        fields = [
            "order_id",
            "external_user_id",
            "user_name",
            "created_at",
            "status",
            "status_message",
            "status_token",
            "checkout_amount",
            "order_lines_set",
            "order_history",
            "process_id",
        ]


class OrderDetailsSerializer(SimpleOrdersModelSerializer):
    order_lines = serializers.ListSerializer(child=OrderLineSerializer())

    class Meta(SimpleOrdersModelSerializer.Meta):
        fields = [
            "order_id",
            "status",
            "status_message",
            "status_token",
            "checkout_amount",
            "order_lines",
            "order_history",
        ]


class BonusesSingleConfigurationSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    sbtech_bonus_id = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    bonus_group = serializers.CharField(read_only=True)

    class Meta:
        model = models.BonusConfiguration
        fields = ["sbtech_bonus_id", "name", "bonus_group"]


class PurchasedProductSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    uid = serializers.UUIDField()
    title = serializers.CharField()
    type_name = serializers.CharField(source="product_type__name", required=False)
    subtype_type = serializers.CharField(source="product_type__subtype_validation", required=False)
    # subtype will be added in `to_representation`
    partner = serializers.CharField(source="product_type__partner_configuration__name")

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result["simple_name"] = models.Product.get_simple_name()
        if instance.get("product_type__subtype_validation"):
            result["subtype"] = models.Product.get_subtype(
                subtype_validation=instance.get("product_type__subtype_validation"),
                subtype_raw=instance.get("subtype_raw"),
            )
        return result


class PurchasedPackageSerializer(PurchasedProductSerializer):
    type_name = serializers.CharField(source="package_product__product_type__name", required=False)
    subtype_type = serializers.CharField(source="package_product__product_type__subtype_validation", required=False)
    # subtype will be added in `to_representation`
    partner = serializers.CharField(source="package_product__product_type__partner_configuration__name")

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result["simple_name"] = models.Package.get_simple_name()
        if instance.get("package_product__product_type__subtype_validation"):
            result["subtype"] = models.Product.get_subtype(
                subtype_validation=instance.get("package_product__product_type__subtype_validation"),
                subtype_raw=instance.get("package_product__subtype_raw"),
            )
        return result


class PurchasedSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    username = serializers.CharField(source="user__username")
    ext_user_id = serializers.CharField(source="order__external_user_id")
    purchased_date = serializers.DateTimeField(source="created_at")
    quantity = serializers.IntegerField(source="calculated_quantity")
    # purchased_item = serializers.JSONField(read_only=True)
    order_id = serializers.CharField(source="order__uid")

    def to_representation(self, instance):
        result = super().to_representation(instance)
        if instance.get("base_product__product__uid"):
            copy_of_instance = {k.replace("base_product__product__", ""): v for k, v in instance.items()}
            result["purchased_item"] = PurchasedProductSerializer(copy_of_instance).data
        else:
            copy_of_instance = {k.replace("base_product__package__", ""): v for k, v in instance.items()}
            result["purchased_item"] = PurchasedPackageSerializer(copy_of_instance).data
        return result


class SpecialProductSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    special_product = serializers.CharField(source="title")
    company_name = serializers.CharField(source="product_type__partner_configuration__name")
    price = serializers.CharField()
    active_from = serializers.CharField()
    active_to = serializers.CharField()
    ext_user_id = serializers.CharField(source="base_product_purchased__order__external_user_id")
    quantity = serializers.CharField(source="base_product_purchased__order__order_lines__quantity")
    order_line_uid = serializers.CharField(source="base_product_purchased__order__order_lines__uid")


class SpecialContinuousProductSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    charity_product = serializers.CharField(source="title")
    company_name = serializers.CharField(source="product_type__partner_configuration__name")
    price = serializers.CharField()
    ext_user_id = serializers.CharField(source="base_product_purchased__order__external_user_id")
    quantity = serializers.CharField(source="base_product_purchased__order__order_lines__quantity")
    order_line_uid = serializers.CharField(source="base_product_purchased__order__order_lines__uid")


class CharityProductSerializer(SpecialContinuousProductSerializer):
    pass


class OrderLineProductSerializer(serializers.Serializer):
    product_id = serializers.CharField(max_length=125, write_only=True)
    quantity = serializers.IntegerField(write_only=True, validators=[MinValueValidator(1), MaxValueValidator(100000)])


class PaymentRequestSerializer(PaymentExceptionHandlingMixing, LoggingSerializerMixing, serializers.Serializer):
    simple_name = "PaymentRequestSerializer"

    sb_token = serializers.CharField(max_length=1000, write_only=True)
    order_lines = OrderLineProductSerializer(many=True, write_only=True)

    order_id = serializers.CharField(max_length=60, read_only=True, allow_null=True)
    status = serializers.CharField(max_length=11, read_only=True)
    status_message = serializers.CharField(max_length=255, read_only=True, allow_null=True)
    status_token = serializers.CharField(max_length=1000, read_only=True)

    def update(self, instance, validated_data):
        raise NotImplemented()

    def validate(self, attrs):
        """
        Method to validate data from SB_Tech request.
        :param attrs:
        :return: result
        """
        sb_token = attrs.get("sb_token")
        order_lines = attrs.get("order_lines")
        sb_token_prefix = sb_token[:3]
        partner_configuration = models.SbTechPartnerConfiguration.get_partner_data(sb_token_prefix)
        pc_endpoint = partner_configuration.get("pc_endpoint")

        request = self.context.get("request")
        api_request = get_message_id_from_request(request)

        user_sub = pc_service_validate_token(sb_token=sb_token, api_request=api_request)

        if partner_configuration is None:
            raise serializers.ValidationError({"sb_token": ["Wrong value"]})

        base_products = models.BaseProduct.objects.filter(
            (
                Q(Product___product_type__partner_configuration__uid=partner_configuration.get("uid"))
                | Q(
                    Package___package_product__product_type__partner_configuration__uid=partner_configuration.get("uid")
                )
            )
            & Q(is_active=True)
            & Q(is_visible=True)
        )
        self.check_products_exist(order_lines, base_products)

        return {
            "sb_token": sb_token,
            "user_sub": user_sub,
            "base_products": base_products,
            "order_lines": order_lines,
            "pc_endpoint": pc_endpoint,
            "api_request": api_request,
        }

    def create(self, validated_data):
        with transaction.atomic():
            sb_token = validated_data.get("sb_token")
            user_sub = validated_data.get("user_sub")
            base_products = validated_data.get("base_products")
            order_lines = validated_data.get("order_lines")
            pc_endpoint = validated_data.get("pc_endpoint")
            api_request = validated_data.get("api_request")

            checkout_amount = 0
            current_balance = 0
            max_quantity_per_user = {}
            bonus_group_products = {}
            order = models.Order.objects.create()
            user = get_or_create_user(user_sub)

            credit_all_points = self.check_credit_all_points(order_lines, base_products)
            if credit_all_points:
                current_balance = pc_service_get_user_current_balance(sb_token=sb_token, api_request=api_request)
                current_balance = Decimal(current_balance) - Decimal(current_balance % 10)

            for line in order_lines:
                base_product = base_products.filter(uid=line.get("product_id")).first()
                bonus_group_products, max_quantity_per_user, checkout_amount = self.create_order_line(
                    line,
                    base_product,
                    bonus_group_products,
                    max_quantity_per_user,
                    checkout_amount,
                    order,
                    current_balance,
                )
                self.update_stock_records(line, base_product)

            if checkout_amount <= 0:
                msg = "Your Order TOTAL RWP is less or equal to 0. Please check your Order."
                raise serializers.ValidationError({"error": msg})

            if max_quantity_per_user:
                self.check_user_purchase_quantity(max_quantity_per_user, user, base_products)
            if bonus_group_products:
                self.handle_bonus_group_products(bonus_group_products, user)

            title = "Payment for order:{} with price:{:.2f}".format(order.uid, checkout_amount)

            process_id, external_user_id = pc_service_payment(
                sb_token=sb_token[3:],
                price=checkout_amount,
                title=title,
                order_uid=str(order.uid),
                pc_endpoint=pc_endpoint,
                api_request=api_request,
            )

            updated_order = self.update_order_model(order, user, external_user_id, process_id, checkout_amount)
            status_token = updated_order.status_token

            validated_data = {
                "order_id": updated_order.uid,
                "status": updated_order.status,
                "status_message": updated_order.status_message,
                "status_token": status_token,
            }

            return validated_data

    @staticmethod
    def check_products_exist(order_lines, base_products):
        order_lines_uid_set = {item.get("product_id") for item in order_lines}
        base_products_uid_set = {str(item.get("uid")) for item in base_products.values("uid")}

        if not order_lines_uid_set.issubset(base_products_uid_set):
            raise serializers.ValidationError("Unknown product found! Please check your order.")

    @staticmethod
    def check_credit_all_points(order_lines, base_products):
        base_products_credit_all = [
            str(item.get("uid"))
            for item in base_products.values("uid", "credit_all_points")
            if item.get("credit_all_points") is True
        ]
        order_lines_credit_all_points = [
            item for item in order_lines if item.get("product_id") in base_products_credit_all
        ]

        if order_lines_credit_all_points and len(order_lines) != 1:
            raise serializers.ValidationError("This product type can't be purchased with other products!")
        return order_lines_credit_all_points

    @staticmethod
    def create_order_line(
        line, base_product, bonus_group_products, max_quantity_per_user, checkout_amount, order, current_balance=None
    ):
        quantity = line.get("quantity")
        amount = Decimal(quantity) * Decimal(base_product.price)
        errors = []

        if base_product.once_per_order and quantity != 1:
            errors.append("Quantity of {} product must be one.".format(base_product.title))
        if base_product.max_quantity_per_user:
            if quantity > base_product.max_quantity_per_user:
                errors.append(
                    "Max quantity for {} is {}.".format(base_product.title, base_product.max_quantity_per_user)
                )
            try:
                if max_quantity_per_user[base_product.uid]:
                    max_quantity_per_user[base_product.uid] += quantity
            except KeyError:
                max_quantity_per_user[base_product.uid] = quantity
        if errors:
            logger.error(errors)
            raise serializers.ValidationError({"error": errors})

        if base_product.credit_all_points:
            amount = current_balance

        if base_product.bonus_multiple:
            try:
                if bonus_group_products[base_product.bonus_multiple.uid]:
                    bonus_group_products[base_product.bonus_multiple.uid] += quantity
            except KeyError:
                bonus_group_products[base_product.bonus_multiple.uid] = quantity

        models.OrderLines.objects.create(order=order, base_product=base_product, quantity=quantity, price=amount)
        checkout_amount += amount

        return bonus_group_products, max_quantity_per_user, checkout_amount

    @staticmethod
    def update_stock_records(line, base_product):
        """
        Update any relevant stock records for this order line
        """
        # TODO For this moment only one Stock possible per Product
        if base_product.track_stock:
            stock = models.StockRecord.objects.filter(product=base_product).select_for_update().first()
            quantity = line.get("quantity")
            errors = []

            if stock is None:
                msg = "Wrong Product configuration. Please contact Customer Service"
                logger.error(msg)
                raise serializers.ValidationError({"error": msg})

            if stock.num_in_stock <= 0:
                errors.append("Product: {} is out of Stock!".format(base_product.title))
            if stock.num_in_stock < quantity:
                errors.append(
                    "Quantity of product {} exceeds available amount in stock! There are {} products left".format(
                        base_product.title, stock.num_in_stock
                    )
                )

            if errors:
                logger.error(errors)
                raise serializers.ValidationError({"error": errors})

            stock.num_in_stock = int(stock.num_in_stock) - int(quantity)

            try:
                stock.save(update_fields=(["num_in_stock"]))
            except serializers.ValidationError as e:
                msg = "Unable to update Stock {}. Contact administrator.".format(e)
                logger.error(msg)
                raise serializers.ValidationError({"error": msg})
            except Exception as e:
                msg = "Critical unknown error {}. Contact administrator.".format(e)
                logger.error(msg)
                raise serializers.ValidationError({"error": msg})

    @staticmethod
    def update_order_model(order, user, external_user_id, process_id, checkout_amount):
        order_for_update = models.Order.objects.filter(uid=order.uid).select_for_update().first()

        if order_for_update is None:
            msg = "Critical unknown error. Contact administrator."
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})

        order_for_update.user = user
        order_for_update.external_user_id = external_user_id
        order_for_update.process_id = process_id
        order_for_update.checkout_amount = checkout_amount

        try:
            order_for_update.save(update_fields=("user", "external_user_id", "process_id", "checkout_amount"))
        except serializers.ValidationError as e:
            msg = "Unable to update Order table {}. Contact administrator.".format(e)
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})
        except Exception as e:
            msg = "Critical unknown error {}. Contact administrator.".format(e)
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})
        updated_order = order_for_update

        return updated_order

    @staticmethod
    def check_user_purchase_quantity(max_quantity_per_user, user, base_products):
        logger.info("Checking for product availability")
        for uid, quantity in max_quantity_per_user.items():
            base_product = base_products.filter(uid=uid).first()
            user_purchased_count, created = models.UserPurchasedCount.objects.get_or_create(
                user=user, base_product=base_product, defaults=dict(count=quantity)
            )
            if created:
                continue
            if base_product.max_quantity_per_user >= user_purchased_count.count + quantity:
                try:
                    user_purchased_count.count = user_purchased_count.count + quantity
                    user_purchased_count.save(update_fields=["count"])
                    continue
                except serializers.ValidationError as e:
                    msg = "Unable to update UserPurchased table {}. Contact administrator.".format(e)
                    logger.error(msg)
                    raise serializers.ValidationError({"error": msg})
                except Exception as e:
                    msg = "Critical unknown error {}. Contact administrator.".format(e)
                    logger.error(msg)
                    raise serializers.ValidationError({"error": msg})
            msg = "Your order exceeds the number of available {}! There are {} products available for you.".format(
                base_product, (base_product.max_quantity_per_user - user_purchased_count.count)
            )
            logger.error(msg)
            raise serializers.ValidationError({"error": msg})

    @staticmethod
    def handle_bonus_group_products(bonus_group_products, user):
        logger.info("Checking for bonus availability")
        for uid, quantity in bonus_group_products.items():
            bonus_group = models.BonusGroupConfiguration.objects.get(uid=uid)
            sbtech_bonus_ids = list(bonus_group.bonuses.all().values_list("sbtech_bonus_id", flat=True))
            size = bonus_group.size
            unique_sbtech_bonus_ids = sbtech_bonus_ids[:quantity]

            if quantity > size:
                msg = "Your order exceeds the number of available bonuses! There are {} bonuses available.".format(size)
                logger.error(msg)
                raise serializers.ValidationError({"error": msg})

            update_user_bonus_group, created = models.UserBonusGroup.objects.get_or_create(
                user=user, user_bonus_group=bonus_group, defaults=dict(sbtech_bonus_ids=unique_sbtech_bonus_ids)
            )
            if created:
                continue

            existing_sbtech_bonus_ids = update_user_bonus_group.sbtech_bonus_ids
            if (len(existing_sbtech_bonus_ids) + quantity) <= size:
                try:
                    unique_sbtech_bonus_ids = list(set(sbtech_bonus_ids) - set(existing_sbtech_bonus_ids))[:quantity]
                    update_user_bonus_group.sbtech_bonus_ids = existing_sbtech_bonus_ids + unique_sbtech_bonus_ids
                    update_user_bonus_group.save(update_fields=["sbtech_bonus_ids"])
                    continue
                except serializers.ValidationError as e:
                    msg = "Unable to update UserBonusGroup table {}. Contact administrator.".format(e)
                    logger.error(msg)
                    raise serializers.ValidationError({"error": msg})
                except Exception as e:
                    msg = "Critical unknown error {}. Contact administrator.".format(e)
                    logger.error(msg)
                    raise serializers.ValidationError({"error": msg})
            else:
                msg = "Your order exceeds the number of available bonuses! There are {} bonuses available for you.".format(
                    size - len(existing_sbtech_bonus_ids)
                )
                logger.error(msg)
                raise serializers.ValidationError({"error": msg})
