import os
import sys
from datetime import datetime
from typing import List, Union
from urllib.parse import urljoin
from uuid import uuid4

import w3lib.url
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from urlmatch import urlmatch

from common.kafka import KafkaService
from common.models import AbstractSimpleModel, AbstractUuidWithSubModel
from common.tools import SECRET_BOX


class ChinaMobilePaymentConfigurationModel(AbstractSimpleModel):
    HASH_PREFIX = "__HASH__"

    payment_configuration = models.OneToOneField(
        "PaymentConfigurationModel", on_delete=models.CASCADE, related_name="_cm_config"
    )
    success_url_text = models.TextField(help_text="Newline separated list of allowed redirections", blank=True)
    error_url_text = models.TextField(help_text="Newline separated list of allowed redirections", blank=True)
    cm_proxy_url = models.URLField(blank=True, help_text="China Mobile proxy used as a gateway to outside internet.")
    ext_cp_id = models.CharField(
        max_length=10, validators=[RegexValidator(r"^[0-9]+$")], help_text="CM Content Provider ID"
    )
    ext_back_url = models.URLField(max_length=2000, help_text="CM Notifications and back url")
    ext_payment_url = models.URLField(max_length=2000, help_text="CM Payment Gateway URL")
    ext_app_id = models.CharField(max_length=100, blank=True)
    _ext_app_secret = models.CharField(max_length=1000, blank=True)

    def convert_url_to_proxy(self, target_url):
        if self.cm_proxy_url:
            target_url = urljoin(self.cm_proxy_url, urljoin("/", target_url).lstrip("/"))
        return target_url

    @property
    def ext_app_secret(self):
        result = self._ext_app_secret
        if result.startswith(self.HASH_PREFIX):
            result = SECRET_BOX.decrypt(result[len(self.HASH_PREFIX) :])
        return result

    @property
    def success_urls(self) -> List[str]:
        return self.success_url_text.split("\n")

    @success_urls.setter
    def success_urls(self, value: List[str]):
        self.success_url_text = "\n".join(value)

    @property
    def error_urls(self) -> List[str]:
        return self.error_url_text.split("\n")

    @error_urls.setter
    def error_urls(self, value: List[str]):
        self.error_url_text = "\n".join(value)

    @staticmethod
    def clean_url(value):
        value = value.strip()
        step1 = w3lib.url.canonicalize_url(value, keep_blank_values=False, keep_fragments=False)
        step2 = w3lib.url.safe_url_string(step1)
        step3 = w3lib.url.url_query_cleaner(step2)
        return step3

    def save(self, *args, **kwargs):
        if not self._ext_app_secret.startswith(self.HASH_PREFIX):
            self._ext_app_secret = f"{self.HASH_PREFIX}{SECRET_BOX.encrypt(self._ext_app_secret)}"
        return super().save(*args, **kwargs)

    def clean(self):
        self.success_url_text = "\n".join(map(self.clean_url, self.success_url_text.strip().split("\n")))
        self.error_url_text = "\n".join(map(self.clean_url, self.error_url_text.strip().split("\n")))

    def check_success_url(self, url_to_check: str):
        was_error, url = self._get_redirect_url(url_to_check=url_to_check, url_list=self.success_urls)
        if was_error:
            raise ValidationError("wrong url")
        return url

    def check_error_url(self, url_to_check: str):
        was_error, url = self._get_redirect_url(url_to_check=url_to_check, url_list=self.error_urls)
        if was_error:
            raise ValidationError("wrong url")
        return url

    def _get_redirect_url(self, url_to_check: str, url_list: List[str]):
        if url_to_check is None:
            url_to_check = url_list[0]
            if "*" in url_to_check:  # wildcard support
                msg = f"Error when reading default url. First entry has wildcard! {url_to_check}"
                return True, msg
        cleaned = self.clean_url(url_to_check)
        for uri in url_list:
            if urlmatch(uri, cleaned):
                return False, cleaned
        return True, f"Error, {cleaned} not found on whitelist"


class PaymentConfigurationModel(AbstractUuidWithSubModel):
    class PaymentType(models.TextChoices):
        CHINA_MOBILE = "CM", "China Mobile - IFrame type"

    payment_type = models.CharField(
        max_length=12, choices=PaymentType.choices, default=PaymentType.CHINA_MOBILE, db_index=True
    )
    partner = models.ForeignKey(
        "virtual_store.Partner", related_name="partner_payment_configuration_set", on_delete=models.PROTECT
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._orig_payment_type = self.payment_type

    @property
    def config(self) -> Union["ChinaMobilePaymentConfigurationModel"]:
        return getattr(self, f"_{self.payment_type.lower()}_config")

    def clean(self):
        if self.id and self._orig_payment_type != self.payment_type:
            raise ValidationError("payment_type change not supported")

    def save(self, *args, **kwargs):
        if self.id is None:
            create = True
        else:
            create = False
        super().save(*args, **kwargs)
        if create:
            if self.payment_type == self.PaymentType.CHINA_MOBILE:
                ChinaMobilePaymentConfigurationModel.objects.create(payment_configuration=self)


class ChinaMobileProductPaymentModel(AbstractUuidWithSubModel):
    ext_product_id = models.CharField(max_length=30)
    ext_product_name = models.CharField(max_length=150, blank=True)
    ext_amount = models.CharField(max_length=20, blank=True)
    ext_description = models.CharField(max_length=150, blank=True)
    _ext_content_id = models.CharField(max_length=30, blank=True)
    randomize_ext_content_id = models.BooleanField(default=False)
    ext_content_name = models.CharField(max_length=150, blank=True)
    ext_order_type = models.CharField(max_length=1)
    ext_commit = models.CharField(max_length=200)
    ext_auto_sub = models.CharField(max_length=1)
    payment_config = models.ForeignKey("PaymentConfigurationModel", related_name="+", on_delete=models.PROTECT)
    product = models.ForeignKey("virtual_store.Product", related_name="+", on_delete=models.PROTECT)
    partner = models.ForeignKey("virtual_store.Partner", related_name="+", on_delete=models.PROTECT)

    @property
    def ext_content_id(self):
        return uuid4().hex if self.randomize_ext_content_id else self._ext_content_id

    def clean(self):
        if self.payment_config and self.payment_config.partner_id != self.partner_id:
            raise ValidationError(
                f"Own Partner({self.partner_id}) differs from payment config Partner({self.payment_config.partner_id}"
            )
        if self.product and self.product.partner_id != self.partner_id:
            raise ValidationError(
                f"Own Partner({self.partner_id}) differs from product Partner({self.payment_config.partner_id}"
            )


class ReceiptLogModel(AbstractSimpleModel):
    receipt = models.ForeignKey("ReceiptModel", on_delete=models.PROTECT)
    message = models.TextField(blank=True)


def _generate_payment_id(force_prefix: str = None) -> str:
    force_prefix = force_prefix or ""
    _start_timestamp = 1602712800 * 10000  # 2020-10-15T00:00:00
    ending = (int.from_bytes(os.urandom(4), sys.byteorder) % 90000) + 10000
    beginning = int(datetime.utcnow().timestamp() * 10000) - _start_timestamp
    return f"{force_prefix}" + f"{beginning}{ending}".zfill(32 - len(force_prefix))


class ReceiptModel(AbstractUuidWithSubModel):
    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting Payment"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        DECLINED = "DECLINED", "Declined"
        MANUAL_VERIFICATION_REQUIRED = "MANUAL_VERIFICATION_REQUIRED", "Manual Verification Required"

    @staticmethod
    def generate_payment_id(force_prefix: str = None) -> str:
        return _generate_payment_id(force_prefix)

    user = models.ForeignKey("virtual_store.CustomUser", on_delete=models.PROTECT, related_name="receipts_set")
    order = models.ForeignKey("virtual_store.Order", on_delete=models.PROTECT, related_name="receipts_set")
    payment_id = models.CharField(
        max_length=32,
        default=_generate_payment_id,
        help_text="external ID used to communicate with payment provider",
        db_index=True,
    )
    payment_status = models.CharField(max_length=28, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    redirect_on_callback = models.BooleanField(default=False)
    redirect_success_url = models.URLField(blank=True)
    redirect_failure_url = models.URLField(blank=True)

    """
    metadata for CM Payment Gateway:
    * `ext_user_id` - CM User id
    * `valid_time` - start date for subscription
    * `expire_time` - end date for subscription
    """
    receipt_metadata = models.JSONField(blank=True, default=dict)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._payment_status = self.payment_status

    def add_log(self, message: str):
        return ReceiptLogModel.objects.create(
            receipt=self,
            message=message,
        )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.payment_status != self._payment_status:
            self.add_log(f"Changed 'payment_status' from '{self._payment_status}' to '{self.payment_status}'")

    def get_process_engine_payload(self):
        return dict(
            payment_id=self.payment_id,
            payment_status=self.payment_status,
            order_sub=str(self.order.sub),
            receipt_sub=str(self.sub),
        )

    def process_payment_result(self, result: bool, correlation_id: str = None):
        if correlation_id is None:
            correlation_id = f"MANUAL({uuid4()})"
        self.payment_status = self.PaymentStatus.COMPLETED if result else self.PaymentStatus.CANCELLED
        payload = self.get_process_engine_payload()
        self.add_log(f"Sending payload to Kafka with correlation_id = {correlation_id}")
        KafkaService.get_instance().cm_send_payment_notification(
            key=self.order.partner.sub, payload=payload, correlation_id=correlation_id
        )
        self.add_log(f"Receipt status changing to {self.payment_status}")
        self.save()
