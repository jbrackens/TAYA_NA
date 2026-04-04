from datetime import timedelta
from typing import Dict, List

from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.timezone import now

from common.kafka import KafkaService
from common.models import AbstractUuidModel, AbstractUuidWithSubModel
from payment_gateway.models import ReceiptModel
from virtual_store.managers import CustomUserManager
from virtual_store.tools import get_member_upload_to


class Currency(AbstractUuidWithSubModel):
    name = models.CharField(max_length=50)
    symbol2 = models.CharField(max_length=2)
    symbol3 = models.CharField(max_length=3)
    partner = models.ForeignKey("Partner", related_name="partner_currency", on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.name} for partner: {self.partner}"


class Partner(AbstractUuidWithSubModel):
    class PartnerTypes(models.TextChoices):
        ANTSTREAM = "ANTSTREAM", "AntStream"
        DEFAULT_TYPE = "DEFAULT_TYPE", "Default Type"

    name = models.CharField(
        max_length=50, choices=PartnerTypes.choices, default=PartnerTypes.DEFAULT_TYPE, db_index=True
    )

    """
    AntStream fields are:
    * `default_product_sub`
    * `order_token_max_age`
    * `signing_kid`
    """
    partner_meta = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.get_name_display()}"


class CustomUser(AbstractUuidModel, AbstractUser):
    """
    GMX user model.

    Username is required. Other fields are optional.
    """

    def __str__(self):
        return f"User({self.username})"

    originator = models.ForeignKey(
        "Partner",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="introduced_partner",
    )
    is_test_user = models.BooleanField(default=False, help_text="User test flag")

    objects = CustomUserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    def natural_key(self) -> str:
        return self.get_username()


class Product(AbstractUuidWithSubModel):
    class ProductType(models.TextChoices):
        BASE_PRODUCT = "BP", "Base Product"
        SUBSCRIPTION_PRODUCT = "SP", "Subscription Product"
        CONSUMABLE_PRODUCT = "CP", "Consumable Product"

    class ProductSubType(models.TextChoices):
        NORMAL = "NR", "Normal"
        VIRTUAL = "VR", "Virtual"

    class ProvisionType(models.TextChoices):
        NONE = "NONE", "None"
        ANTSTREAM = "ANTSTREAM", "AntStream"

    class SubscriptionDurationType(models.TextChoices):
        MINUTE = "MINUTE", "Minute"
        HOUR = "HOUR", "Hour"
        DAY = "DAY", "Day"
        WEEK = "WEEK", "Week"
        MONTH = "MONTH", "Month"
        YEAR = "YEAR", "Year"

    def get_time_delta_for_subscription(self):
        if self.subscription_duration_type == self.SubscriptionDurationType.MINUTE:
            return timedelta(minutes=self.subscription_duration)
        elif self.subscription_duration_type == self.SubscriptionDurationType.HOUR:
            return timedelta(hours=self.subscription_duration)
        elif self.subscription_duration_type == self.SubscriptionDurationType.DAY:
            return timedelta(days=self.subscription_duration)
        elif self.subscription_duration_type == self.SubscriptionDurationType.WEEK:
            return timedelta(weeks=self.subscription_duration)
        elif self.subscription_duration_type == self.SubscriptionDurationType.MONTH:
            return relativedelta(months=self.subscription_duration)
        elif self.subscription_duration_type == self.SubscriptionDurationType.YEAR:
            return relativedelta(years=self.subscription_duration)
        return timedelta()

    title = models.CharField(max_length=60)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=20,
        decimal_places=2,
    )
    currency = models.ForeignKey("Currency", related_name="product_set", on_delete=models.PROTECT)
    product_type = models.CharField(
        max_length=2,
        choices=ProductType.choices,
        default=ProductType.BASE_PRODUCT,
    )
    product_subtype = models.CharField(
        max_length=2,
        choices=ProductSubType.choices,
        default=ProductSubType.VIRTUAL,
    )
    auto_provision = models.BooleanField(
        default=False, help_text="When TRUE, backpack item will be automatically activated"
    )
    provision_type = models.CharField(max_length=20, choices=ProvisionType.choices, default=ProvisionType.NONE)

    """
    For AntStream fields are:
    * `notification_url`
    
    """
    provision_meta = models.JSONField(default=dict, blank=True)
    partner = models.ForeignKey("Partner", related_name="product_set", on_delete=models.PROTECT)
    stock_quantity = models.PositiveIntegerField(null=True, blank=True)
    sort_index = models.PositiveIntegerField(default=0)
    max_quantity_per_user = models.PositiveIntegerField(
        null=True, blank=True, help_text="The number of times a single user can purchase this product"
    )
    subscription_duration = models.PositiveIntegerField(null=True, blank=True)
    subscription_duration_type = models.CharField(
        max_length=6, choices=SubscriptionDurationType.choices, blank=True, null=True
    )
    subscription_level = models.PositiveIntegerField(default=1, blank=True, null=True)
    available_from = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Product is active from the start date. Leave this empty if the product has no start date.",
    )
    available_to = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Product is active to the end date. Leave this empty if the product has no end date.",
    )
    is_public = models.BooleanField(
        "Is public", default=True, db_index=True, help_text="Show this product in search results."
    )
    photo_small = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_medium = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_large = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_thumbnail = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_purchased = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_not_available = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_index = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return f"{self.title}: for partner: {self.partner}"

    @property
    def is_active(self):
        current_date = now()
        if self.available_from is not None and current_date < self.available_from:
            return False
        if self.available_to is not None and current_date > self.available_to:
            return False
        return True

    def clean(self):
        """
        Validate a product.
        """
        errors = {}
        if self.available_from and self.available_to and self.available_to < self.available_from:
            errors["product"] = [ValidationError("Date time range is invalid", code="invalid")]
        if errors:
            raise ValidationError(errors)

        getattr(self, "_clean_%s" % self.product_type.lower())()
        return super().clean()

    def _clean_bp(self):
        """
        Validates a base product
        """
        errors = {}
        if self.subscription_duration or self.subscription_duration_type or self.subscription_level:
            errors["product"] = [
                ValidationError("Base Product can't have subscription options fulfilled", code="invalid")
            ]
        if errors:
            raise ValidationError(errors)

    def _clean_sp(self):
        """
        Validates a subscription product
        """
        errors = {}
        if not (self.subscription_duration and self.subscription_duration_type):
            errors["product"] = [
                ValidationError("Subscription Product must have subscription options fulfilled", code="invalid")
            ]
        if errors:
            raise ValidationError(errors)


class UserPurchasedCount(AbstractUuidWithSubModel):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, null=True)
    product = models.ForeignKey("Product", related_name="product_purchased_count", on_delete=models.CASCADE)
    count = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return "UserPurchasedCount: {}, product:{}, count:{}".format(self.user, self.product, self.count)


class OrderLog(AbstractUuidModel):
    message = models.TextField()
    order = models.ForeignKey("Order", related_name="order_log_set", on_delete=models.PROTECT)
    order_log_content_type = models.ForeignKey(
        ContentType,
        blank=True,
        null=True,
        related_name="order_log_content_type_obj",
        on_delete=models.PROTECT,
        limit_choices_to=models.Q(
            app_label="virtual_store",
            model__in=("Order", "OrderLine", "OrderLineItem", "BackpackItem", "UserSubscriptions"),
        ),
    )
    order_log_object_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    order_log_object = GenericForeignKey("order_log_content_type", "order_log_object_id")


class CreateOrderLogMixing:
    def _get_order_for_monitoring(self):
        return self

    def create_log_entry(self, message: str) -> OrderLog:
        order = self._get_order_for_monitoring()
        return OrderLog.objects.create(
            message=message,
            order=order,
            order_log_object=self,
        )


class StatusChangeMonitoringMixing(CreateOrderLogMixing):
    fields_to_be_monitored: List[str]
    _monitored_fields_initial_value: Dict[str, str]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._monitored_fields_initial_value = dict()
        for f in self.fields_to_be_monitored:
            self._monitored_fields_initial_value[f] = getattr(self, f, None)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)  # noqa
        if self.id is None:  # noqa
            return
        for f in self.fields_to_be_monitored:
            new_value = getattr(self, f, None)
            if new_value and new_value != self._monitored_fields_initial_value.get(f):
                # noinspection PyUnresolvedReferences
                self.create_log_entry(
                    f"Status for '{f}' changed from '{self._monitored_fields_initial_value.get(f)}' to '{new_value}'"
                )


class Order(StatusChangeMonitoringMixing, AbstractUuidWithSubModel):
    fields_to_be_monitored = ["order_status", "payment_status"]

    def _get_order_for_monitoring(self):
        return self

    class OrderStatus(models.TextChoices):
        NEW = "NEW", "New"
        AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting for Payment"
        PAYMENT_RECEIVED = "PAYMENT_RECEIVED", "Payment Received"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment Failed"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    user = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    partner = models.ForeignKey("Partner", related_name="order_set", on_delete=models.PROTECT)
    currency = models.ForeignKey("Currency", related_name="order_currency_set", on_delete=models.PROTECT)
    payment_status = models.CharField(
        max_length=28,
        choices=ReceiptModel.PaymentStatus.choices,
        default=ReceiptModel.PaymentStatus.PENDING,
        db_index=True,
    )
    order_status = models.CharField(max_length=16, choices=OrderStatus.choices, default=OrderStatus.NEW, db_index=True)
    order_sum = models.DecimalField(max_digits=20, decimal_places=2)


class OrderLine(StatusChangeMonitoringMixing, AbstractUuidWithSubModel):
    fields_to_be_monitored = ["provision_status"]

    def _get_order_for_monitoring(self):
        return self.order

    class ProvisionStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        DELIVERED = "DELIVERED", "Delivered"
        PARTIAL_DELIVERED = "PARTIAL_DELIVERED", "Partial Delivered"

    provision_status = models.CharField(max_length=17, choices=ProvisionStatus.choices, default=ProvisionStatus.PENDING)
    order = models.ForeignKey("Order", related_name="order_line_set", on_delete=models.PROTECT)
    product = models.ForeignKey("Product", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=20, decimal_places=2)
    line_sum = models.DecimalField(max_digits=20, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.line_sum = self.quantity * self.price
        super().save(*args, **kwargs)


class OrderLineItem(StatusChangeMonitoringMixing, AbstractUuidWithSubModel):
    class SubProvisionStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        DELIVERED = "DELIVERED", "Delivered"

    position = models.PositiveIntegerField()
    sub_provision_status = models.CharField(
        max_length=9, choices=SubProvisionStatus.choices, default=SubProvisionStatus.PENDING
    )
    order_line = models.ForeignKey("OrderLine", related_name="order_line_items_set", on_delete=models.PROTECT)

    fields_to_be_monitored = ["sub_provision_status"]

    def _get_order_for_monitoring(self):
        return self.order_line.order

    @classmethod
    def _st_deliver(cls, pk, force=False):
        # By default, select_for_update() locks all rows that are selected by the query. For example, rows of related objects specified in select_related() are locked in addition to rows of the queryset’s model
        item = cls.objects.filter(pk=pk).select_related("order_line", "order_line__order").select_for_update().first()
        OrderLine.objects.filter(order=item.order_line.order).select_for_update()
        cls.objects.filter(order_line=item.order_line).select_for_update()

        if not force and item.sub_provision_status == cls.SubProvisionStatus.DELIVERED:
            raise ValidationError("Already delivered")

        order_line = item.order_line

        item.sub_provision_status = cls.SubProvisionStatus.DELIVERED
        item.save(update_fields=("sub_provision_status",))

        if not cls.objects.filter(
            Q(order_line=item.order_line) & ~Q(pk=item.pk) & ~Q(sub_provision_status=cls.SubProvisionStatus.DELIVERED)
        ).exists():
            order_line.provision_status = OrderLine.ProvisionStatus.DELIVERED
        else:
            order_line.provision_status = OrderLine.ProvisionStatus.PARTIAL_DELIVERED
        order_line.save(update_fields=("provision_status",))

        if not OrderLine.objects.filter(
            Q(order=item.order_line.order)
            & ~Q(pk=item.order_line.pk)
            & ~Q(provision_status=OrderLine.ProvisionStatus.DELIVERED)
        ).exists():
            order_line.order.order_status = Order.OrderStatus.COMPLETED
        order_line.order.save(update_fields=("order_status",))

    def deliver(self, force=False):
        if not force and self.sub_provision_status == self.SubProvisionStatus.DELIVERED:
            raise ValidationError("Already delivered")
        self._st_deliver(self.pk, force)


class BackpackItem(CreateOrderLogMixing, AbstractUuidWithSubModel):
    is_activated = models.BooleanField(default=False)
    is_consumed = models.BooleanField(default=False)
    activated_at = models.DateTimeField(blank=True, null=True)
    consumed_at = models.DateTimeField(blank=True, null=True)
    user = models.ForeignKey(CustomUser, related_name="user_backpack_items_set", on_delete=models.PROTECT)
    product = models.ForeignKey("Product", related_name="product_backpack_items_set", on_delete=models.PROTECT)
    order = models.ForeignKey("Order", related_name="order_backpack_items_set", on_delete=models.PROTECT)
    receipt = models.ForeignKey("payment_gateway.ReceiptModel", on_delete=models.PROTECT, related_name="+", null=True)
    order_line = models.ForeignKey("OrderLine", related_name="order_line_backpack_items_set", on_delete=models.PROTECT)
    order_line_item = models.ForeignKey(
        "OrderLineItem", related_name="order_line_items_backpack_items_set", on_delete=models.PROTECT
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._is_consumed = self.is_consumed
        self._is_activated = self.is_activated

    def save(self, *args, **kwargs):
        if self._is_consumed != self.is_consumed and self.is_consumed:
            self.consumed_at = now()
            self._is_consumed = self.is_consumed
        if self._is_activated != self.is_activated and self.is_activated:
            self.activated_at = now()
            self._is_activated = self.is_activated
        super().save(*args, **kwargs)

    def _get_order_for_monitoring(self):
        return self.order

    def activate(self, force: bool = False, correlation_id=None):
        if not force and self.is_activated:
            raise ValidationError(f"Backpack item {self.sub} already activated.")

        if self.product.product_type in (
            Product.ProductType.CONSUMABLE_PRODUCT,
            Product.ProductType.SUBSCRIPTION_PRODUCT,
        ):
            if not force and self.is_consumed:
                raise ValidationError(f"Backpack item {self.sub} already consumed.")
            self.is_consumed = True

        payload = dict(
            backpack_item_sub=self.sub,
            user_sub=self.user.username,
            product_sub=self.product.sub,
            product_type=self.product.product_type,
            product_subtype=self.product.product_subtype,
            provision_type=self.product.provision_type,
            provision_meta=self.product.provision_meta,
            order_sub=self.order.sub,
            order_line_sub=self.order_line.sub,
            order_line_item_sub=self.order_line_item.sub,
            order_line_item_position=self.order_line_item.position,
            receipt_sub=self.receipt.sub,
        )
        if self.product.provision_type == self.product.ProvisionType.ANTSTREAM:
            KafkaService.antstream_send_backpack_activation(
                key=self.product.partner.sub, payload=payload, correlation_id=correlation_id
            )
        else:
            KafkaService.send_backpack_activation(
                key=self.product.partner.sub, payload=payload, correlation_id=correlation_id
            )

        self.is_activated = True
        self.create_log_entry(
            f"BackpackItem(${self.sub}) for OrderLineItem(${self.order_line_item.sub}) send for activation"
        )
        self.save()

    def deactivate(self, force: bool = False):
        # Only `Base Product` can be deactivated
        if self.product.product_type != Product.ProductType.BASE_PRODUCT:
            raise ValidationError(f"Wrong BackpackItem[{self.sub}] - only BASE PRODUCT can be deactivated.")
        if not force and not self.is_activated:
            raise ValidationError(f"BackpackItem[{self.sub}] already deactivated.")

        self.is_activated = False
        self.save()

    def detach(self, force: bool = False):
        # `Base Product` and `Consumable` products can be detached from Backpack
        if self.product.product_type == Product.ProductType.SUBSCRIPTION_PRODUCT:
            raise ValidationError(f"Wrong BackpackItem[{self.sub}] - SUBSCRIPTION product can not be detached.")
        if self.is_activated and self.product.product_type == Product.ProductType.BASE_PRODUCT:
            raise ValidationError(f"Wrong BackpackItem[{self.sub}] - BASE PRODUCT can be detached only when inactive.")
        if not force and not self.is_deleted:
            raise ValidationError(f"BackpackItem[{self.sub}] already detached.")

        self.is_deleted = True
        self.save()


class UserSubscriptions(CreateOrderLogMixing, AbstractUuidWithSubModel):
    user = models.ForeignKey("CustomUser", on_delete=models.PROTECT)
    start_date = models.DateTimeField(db_index=True)
    end_date = models.DateTimeField(db_index=True)
    backpack_item = models.ForeignKey("BackpackItem", related_name="user_subscription_set", on_delete=models.PROTECT)
    is_provisioned = models.BooleanField(db_index=True, default=False)
    is_deprovisioned = models.BooleanField(db_index=True, default=False)
    is_send_for_deprovisioning = models.BooleanField(db_index=True, default=False)

    def _get_order_for_monitoring(self):
        return self.backpack_item.order

    @property
    def is_active(self):
        return self.is_provisioned and not self.is_deprovisioned and self.is_valid

    @property
    def is_valid(self):
        return self.start_date <= now() <= self.end_date

    def send_for_deprovisioning(self, correlation_id=None):
        KafkaService.send_subscription_deactivation(
            key=self.backpack_item.product.partner.sub,
            payload=dict(subscription_sub=self.sub, correlation_id=correlation_id),
        )
        self.is_send_for_deprovisioning = True
        self.save(update_fields=("is_send_for_deprovisioning",))
        self.create_log_entry("It has been send for deprovisioning.")

    def save(self, *args, **kwargs):
        assert self.user_id == self.backpack_item.user_id
        return super().save(*args, **kwargs)

    @classmethod
    def get_and_send_for_deprovisioning(cls, correlation_id=None):
        now_dt = now()
        items = (
            cls.objects.filter(
                end_date__lte=now_dt, is_provisioned=True, is_deprovisioned=False, is_send_for_deprovisioning=False
            )
            .select_related(
                "backpack_item__product__partner",
                "backpack_item",
                "backpack_item__order",
            )
            .select_for_update(of=("self",))
        )
        for item in items:
            item.send_for_deprovisioning(correlation_id=correlation_id)
        return items
