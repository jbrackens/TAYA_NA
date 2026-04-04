import json
import logging
import time
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.timezone import now
from polymorphic.managers import PolymorphicManager
from polymorphic.models import PolymorphicModel

from project.common import SecretBox
from virtual_shop.tools import get_member_upload_to

logger = logging.getLogger(__name__)


class ActivateProductsManager(PolymorphicManager):
    def get_queryset(self):
        now_dt = now()
        return (
            super()
            .get_queryset()
            .filter(Q(active_from__lte=now_dt, active_to__gte=now_dt) | Q(active_from=None, active_to=None))
        )


class DefaultModel(models.Model):
    uid = models.UUIDField(unique=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self):
        return "{}({})".format(self.__class__.__name__, self.uid)


class BaseProduct(DefaultModel, PolymorphicModel):
    class BonusTypeChoices:
        NONE = "NONE"
        WEB_HOOK = "WEB_HOOK"
        SB_TECH_BONUS_API = "SB_TECH_BONUS_API"

        @classmethod
        def to_choices(cls):
            return (
                (cls.NONE, "None"),
                (cls.WEB_HOOK, "Web Hook"),
                (cls.SB_TECH_BONUS_API, "Sb Tech Bonus Api"),
            )

    class NotificationTypeChoices:
        NONE = "NONE"
        SLACK = "SLACK"
        EMAIL = "EMAIL"

        @classmethod
        def to_choices(cls):
            return (
                (cls.NONE, "None"),
                (cls.SLACK, "Slack"),
                (cls.EMAIL, "Email"),
            )

    title = models.CharField(max_length=60)
    description = models.TextField()
    price = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    bonus_single = models.ForeignKey(
        "BonusConfiguration", on_delete=models.PROTECT, related_name="product_bonus", null=True, blank=True
    )
    bonus_multiple = models.ForeignKey(
        "BonusGroupConfiguration", on_delete=models.PROTECT, related_name="product_bonus_group", null=True, blank=True
    )
    bonus_value = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    bonus_type = models.CharField(max_length=17, choices=BonusTypeChoices.to_choices(), default=BonusTypeChoices.NONE)
    notification_type = models.CharField(
        max_length=5, choices=NotificationTypeChoices.to_choices(), default=NotificationTypeChoices.NONE
    )
    photo_thumbnail = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_large = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_medium = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    photo_small = models.FileField(null=True, blank=True, upload_to=get_member_upload_to)
    active_from = models.DateTimeField(null=True, blank=True)
    active_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=False)
    once_per_order = models.BooleanField(default=False)
    credit_all_points = models.BooleanField(default=False)
    index = models.PositiveIntegerField(null=True, blank=True)
    max_quantity_per_user = models.PositiveIntegerField(null=True, blank=True)
    track_stock = models.BooleanField(default=False)

    objects = ActivateProductsManager()
    all_objects = PolymorphicManager()

    class Meta(PolymorphicModel.Meta):
        index_together = [["active_from", "active_to", "max_quantity_per_user"]]
        base_manager_name = "all_objects"
        default_manager_name = "all_objects"

    def save(self, *args, **kwargs):
        if self.track_stock:
            if not StockRecord.objects.filter(product__uid=self.uid).exists():
                raise ValidationError({"error": 'For product with "track_stock", Stock must be created first!'})
        if all([self.bonus_single, self.bonus_multiple]):
            raise ValidationError(
                {
                    "error": 'Product can\'t have both "Bonus single" and "Bonus multiple" defined. '
                    "Please select one of them"
                }
            )
        if self.credit_all_points and not self.once_per_order:
            raise ValidationError({"error": '"credit_all_points" must be filled together with "once_per_order"'})
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class BaseProductAvailableFor(DefaultModel):
    class ModeChoices:
        EXCLUDE = "EXCLUDE"
        INCLUDE = "INCLUDE"

        @classmethod
        def to_choices(cls):
            return ((cls.EXCLUDE, "Exclude"), (cls.INCLUDE, "Include"))

    name = models.CharField(max_length=120)
    products_members = models.ManyToManyField("BaseProduct", related_name="produtcs_available_for")
    tag_member = models.ForeignKey(
        "BaseProductTag", on_delete=models.CASCADE, related_name="tag_available_for", null=True, blank=True
    )
    mode = models.CharField(max_length=7, db_index=True, choices=ModeChoices.to_choices(), default=ModeChoices.INCLUDE)

    class Meta:
        unique_together = ("tag_member", "mode")

    def __str__(self):
        return "{}  [{}]".format(self.name, self.mode[:1])


class BaseProductTag(DefaultModel):
    name = models.CharField(max_length=60, unique=True)

    def __str__(self):
        return self.name


class BonusConfiguration(DefaultModel):
    name = models.CharField(max_length=120)
    sbtech_bonus_id = models.PositiveIntegerField(unique=True)
    bonus_group = models.ForeignKey(
        "BonusGroupConfiguration", on_delete=models.PROTECT, related_name="bonuses", null=True, blank=True
    )

    def __str__(self):
        return "{} - {}".format(self.name, self.sbtech_bonus_id)


class BonusGroupConfiguration(DefaultModel):
    name = models.CharField(max_length=120)

    @property
    def size(self):
        return BonusGroupConfiguration.objects.get(uid=self.uid).bonuses.all().count()

    def __str__(self):
        return "Group: {}".format(self.name)


class BasePartnerConfiguration(DefaultModel, PolymorphicModel):
    name = models.CharField(max_length=120)
    objects = PolymorphicManager()

    def __str__(self):
        return "{}".format(self.name)


class Order(DefaultModel):
    """
    @post_init creating_status
    @post_save create_history_or_purchased
    @post_save create_history_for_status_message
    """

    class StatusChoices:
        NEW = "NEW"
        PROCESSING = "PROCESSING"
        ERROR = "ERROR"
        SUCCESS = "SUCCESS"
        RESOLVED = "RESOLVED"

        @classmethod
        def to_choices(cls):
            return (
                (cls.NEW, "New"),
                (cls.PROCESSING, "Processing"),
                (cls.ERROR, "Error"),
                (cls.SUCCESS, "Success"),
                (cls.RESOLVED, "Resolved"),
            )

    user = models.ForeignKey(get_user_model(), on_delete=True, null=True, related_name="orders")
    external_user_id = models.CharField(blank=True, max_length=25)
    status = models.CharField(
        max_length=11, db_index=True, choices=StatusChoices.to_choices(), default=StatusChoices.NEW
    )
    status_message = models.TextField(blank=True)
    process_id = models.CharField(max_length=40, blank=True, db_index=True)
    checkout_amount = models.DecimalField(max_digits=20, decimal_places=8, default=0)

    @property
    def status_token(self):

        status_token_data = {"e": int(time.time()) + 60, "u": self.user.username, "o": str(self.uid)}
        status_token_json = json.dumps(status_token_data)
        status_token = SecretBox.encrypt(status_token_json)

        return status_token

    def __str__(self):
        return "Order id:{} - User:{}".format(self.uid, self.user)


class OrderLines(DefaultModel):
    """
    @post_init create_orderline_resolved_lines_array
    @post_save check_if_orderline_is_resolved
    """

    order = models.ForeignKey("Order", related_name="order_lines", on_delete=models.CASCADE)
    base_product = models.ForeignKey("BaseProduct", related_name="base_product_order_line", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    resolved = models.BooleanField(default=False)
    resolved_lines_array = ArrayField(models.IntegerField(), blank=True, null=True)
    resolved_lines_str_array = ArrayField(models.CharField(max_length=10), blank=True, null=True)
    price = models.DecimalField(max_digits=20, decimal_places=8, default=0)

    class Meta:
        index_together = [["id", "resolved"]]

    @property
    def check_if_line_is_resolved(self) -> bool:
        if self.resolved_lines_array is None:
            return False
        if self.quantity == len(self.resolved_lines_array):
            return True
        elif self.quantity < len(self.resolved_lines_array):
            msg = "To many resolved lines in Array. Double points update prevented!"
            logger.exception(msg)
            raise ValidationError({"resolved lines array": msg})
        return False

    @property
    def check_if_line_resolved_lines_array_changed(self) -> bool:
        return set(self._resolved_lines_array or list()) != set(self.resolved_lines_array or list())

    def __str__(self):
        return "{}".format(self.uid)


class OrderHistory(DefaultModel):
    order = models.ForeignKey("Order", related_name="order_history_set", on_delete=models.CASCADE)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]


class ProductType(models.Model):
    class SubtypeValidation:
        INT = "INT"
        DECIMAL = "DECIMAL"
        CHAR = "CHAR"

        @classmethod
        def to_choices(cls):
            return (
                (cls.INT, "integer field"),
                (cls.DECIMAL, "decimal field"),
                (cls.CHAR, "char field"),
            )

    partner_configuration = models.ForeignKey(
        "BasePartnerConfiguration", on_delete=models.PROTECT, related_name="product_types"
    )
    subtype_validation = models.CharField(max_length=20, choices=SubtypeValidation.to_choices())
    name = models.CharField(max_length=20)

    class Meta:
        unique_together = ("partner_configuration", "name")

    def __str__(self):
        return "{}- subtype:{}".format(self.name, self.subtype_validation)


class Product(BaseProduct):
    product_type = models.ForeignKey("ProductType", on_delete=models.PROTECT, related_name="products")
    subtype_raw = models.CharField(max_length=60)

    @staticmethod
    def get_simple_name():
        return "product"

    @staticmethod
    def get_subtype(subtype_validation, subtype_raw):
        if subtype_validation == ProductType.SubtypeValidation.INT:
            return int(subtype_raw)
        elif subtype_validation == ProductType.SubtypeValidation.DECIMAL:
            return Decimal(subtype_raw)
        elif subtype_validation == ProductType.SubtypeValidation.CHAR:
            return str(subtype_raw)
        raise ValueError("Wrong subtype")

    @property
    def subtype(self):
        return self.get_subtype(self.product_type.subtype_validation, self.subtype_raw)

    def clean(self):
        if self.product_type.subtype_validation == ProductType.SubtypeValidation.INT:
            int(self.subtype_raw)
        elif self.product_type.subtype_validation == ProductType.SubtypeValidation.DECIMAL:
            try:
                Decimal(self.subtype_raw)
            except InvalidOperation:
                raise ValidationError("Wrong subtype")
        elif self.product_type.subtype_validation == ProductType.SubtypeValidation.CHAR:
            str(self.subtype_raw)
        else:
            raise ValidationError("Wrong subtype")


class Package(BaseProduct):
    package_product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="+")
    quantity = models.PositiveIntegerField()

    @staticmethod
    def get_simple_name():
        return "package"


class PurchasedProductsModel(DefaultModel):
    user = models.ForeignKey(get_user_model(), on_delete=True, null=True, related_name="user_purchased_products")
    order = models.ForeignKey("Order", related_name="order_purchased_products", on_delete=models.CASCADE)
    base_product = models.ForeignKey("BaseProduct", related_name="base_product_purchased", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    class Meta:
        verbose_name_plural = "Purchased products"
        verbose_name = "Purchased product"


class SbTechPartnerConfiguration(BasePartnerConfiguration):
    token_prefix = models.CharField(max_length=3, unique=True)
    pc_endpoint = models.CharField(max_length=255)

    class Meta:
        verbose_name_plural = "SbTech partner configuration"
        verbose_name = "SbTech partner configuration"

    def save(self, *args, **kwargs):
        self.token_prefix = self.token_prefix.lower().strip()
        return super().save(*args, **kwargs)

    @staticmethod
    def get_arn_for_token_prefix(sb_token_prefix):
        return "virtual_shop:partner_configuration:sb_tech:prefix:{}".format(sb_token_prefix)

    @classmethod
    def get_partner_data(cls, sb_token_prefix):
        """
        Method checking if cache with specified name exist.
        If name of this cache is not specified, we get data from database.

        :param sb_token_prefix: [:class: 'str'] sb_tech token first 3 chars.
        :return: result: [:class: 'dict'] all user credentials
        """
        arn = cls.get_arn_for_token_prefix(sb_token_prefix)
        result = cache.get(arn)
        if result is None:
            with cache.lock(arn, expire=settings.LOCK_TIMEOUT):
                result = cache.get(arn)
                if result is None:
                    result = (
                        cls.objects.filter(token_prefix=sb_token_prefix.lower())
                        .values("uid", "name", "token_prefix", "pc_endpoint")
                        .first()
                    )

                    if result is None:
                        return None
                    logger.info("Creating new cache for prefix:{}".format(sb_token_prefix))
                    cache.set(arn, result, 7200)
        return result


class StockRecord(DefaultModel):
    product = models.OneToOneField("BaseProduct", on_delete=models.CASCADE, related_name="base_product_stockrecords")
    partner_sku = models.CharField(max_length=128, blank=True)
    #: Number of items in stock
    num_in_stock = models.PositiveIntegerField(blank=True, null=True)
    low_stock_threshold = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        verbose_name = "Stock record"
        verbose_name_plural = "Stock records"


class UserBonusGroup(DefaultModel):
    user = models.ForeignKey(get_user_model(), on_delete=True, null=True)
    user_bonus_group = models.ForeignKey(
        "BonusGroupConfiguration", on_delete=models.PROTECT, related_name="user_group", null=True, blank=True
    )
    sbtech_bonus_ids = ArrayField(models.IntegerField(), blank=True, null=True)
    sbtech_bonus_ids_send = ArrayField(models.IntegerField(), blank=True, null=True, default=list)

    def __str__(self):
        return "UserBonusGroup: {} {}".format(self.user, self.user_bonus_group)


class UserPurchasedCount(DefaultModel):
    user = models.ForeignKey(get_user_model(), on_delete=True, null=True)
    base_product = models.ForeignKey(
        "BaseProduct", related_name="base_product_purchased_count", on_delete=models.CASCADE
    )
    count = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return "UserPurchasedCount: {}, product:{}, count:{}".format(self.user, self.base_product, self.count)
