import hashlib
import random
import string
import uuid

from django.conf import settings
from django.db import models

from . import managers


def make_random_key(extended=False):
    if not extended:
        length = 16
        dictionary = string.digits + string.ascii_lowercase
    else:
        length = 128
        dictionary = string.ascii_letters + string.digits + '_[]()-=*,.'
    return ''.join(random.SystemRandom().choice(dictionary) for _ in range(length))


def make_public_key():
    return make_random_key(False)


def make_private_key():
    return make_random_key(True)


class PartnerTransactionApiKeys(models.Model):
    partner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                   related_name='transaction_api_keys')
    public_key = models.CharField(max_length=16, default=make_public_key, unique=True, editable=False)
    private_key = models.CharField(max_length=128, default=make_private_key, editable=False)

    objects = managers.PartnerTransactionApiKeysManager()

    def delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)
        PartnerTransactionApiKeys.objects.invalidate_cache(self.public_key)


class ExternalOrder(models.Model):
    class STATUS(object):
        PENDING = 'P'
        PROCESSING = 'W'
        REJECTED = 'R'
        ABORTED = 'A'
        ACCEPTED = 'O'
        COMPLETED = 'C'

        @classmethod
        def to_choices(cls):
            return (
                (cls.PENDING, 'Pending'),
                (cls.PROCESSING, 'Processing'),
                (cls.REJECTED, 'Rejected'),
                (cls.ABORTED, 'Aborted'),
                (cls.ACCEPTED, 'Accepted'),
                (cls.COMPLETED, 'Completed'),
            )

    class ACTIONS(object):
        CONFIRM_REJECTED = 'confirm_rejected'
        CANCEL = 'cancel'
        CONFIRM = 'confirm'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='external_orders',
                             null=True, blank=True)
    status = models.CharField(max_length=1, db_index=True, choices=STATUS.to_choices())
    external_transaction_id = models.CharField(max_length=40, db_index=True)
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                related_name='external_orders_as_partner')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    return_url = models.URLField()
    cancel_url = models.URLField()
    nonce = models.CharField(max_length=32)
    total_amount = models.PositiveIntegerField()

    @property
    def verification_signature(self):
        return hashlib.sha1(
            ';'.join([
                str(int(self.total_amount)),
                self.external_transaction_id,
                self.nonce,
                self.partner.transaction_api_keys.private_key
            ]).encode()
        ).hexdigest()

    @property
    def status_mapping(self):
        return {
            self.STATUS.COMPLETED: 'success',
            self.STATUS.ABORTED: 'aborted',
            self.STATUS.PENDING: 'pending',
            self.STATUS.PROCESSING: 'processing',
            self.STATUS.REJECTED: 'rejected',
        }[self.status]

    @property
    def possible_actions(self):
        d = {
            self.STATUS.REJECTED: [
                self.ACTIONS.CONFIRM_REJECTED
            ],
            self.STATUS.PENDING: [
                self.ACTIONS.CONFIRM,
                self.ACTIONS.CANCEL
            ]
        }
        if self.status in d:
            return d[self.status]
        return None

    @property
    def status_signature(self):
        return hashlib.sha1(
            ';'.join([
                str(int(self.total_amount)),
                self.external_transaction_id,
                self.nonce,
                self.partner.transaction_api_keys.private_key,
                self.status_mapping
            ]).encode()
        ).hexdigest()

    class Meta:
        unique_together = (
            ('partner', 'nonce'),
            ('partner', 'external_transaction_id'),
        )
        index_together = (
            ('user', 'created_at'),
            ('user', 'partner'),
            ('user', 'external_transaction_id'),
            ('user', 'status')
        )
