import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models, transaction

from . import managers

logger = logging.getLogger(__name__)


class CommissionConfig(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='commissions')
    tier = models.PositiveSmallIntegerField(default=1)
    orig_commission = models.DecimalField('Originator commission percent', max_digits=4, decimal_places=2, validators=[
        MinValueValidator(0, 'Minimal value is 0 percent.'),
        MaxValueValidator(99.99, 'Maximal value is 99.99 percent.')
    ])
    rm_commission = models.DecimalField('RewardMatrix commission percent', max_digits=4, decimal_places=2, validators=[
        MinValueValidator(0, 'Minimal value is 0 percent.'),
        MaxValueValidator(99.99, 'Maximal value is 99.99 percent.')
    ])

    class Meta:
        unique_together = [('user', 'tier')]

    objects = managers.CommissionConfigManager()

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        CommissionConfig.objects.invalidate_cache_for_user_and_tier(self.user, self.tier)


class SilentChargeTokenChaneyPaymentsModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    wallet_line = models.OneToOneField('WalletLine', related_name='+', on_delete=models.PROTECT)
    channel = models.CharField(max_length=36, null=True, default=None)
    external_user_id = models.CharField(max_length=250, null=True, default=None)


class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='wallets')
    name = models.CharField(max_length=30, blank=True, default="")
    _is_default = models.BooleanField(default=False)
    originator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='+')
    current_balance = models.DecimalField(default=0, max_digits=20, decimal_places=8)

    _is_default_changed = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._is_default_changed = False

    class Meta:
        index_together = ['user', '_is_default']

    @property
    def is_default(self):
        return self._is_default

    @is_default.setter
    def is_default(self, v):
        if v is None or not isinstance(v, bool) or not v:
            raise ValidationError("Only setting `is_default` to True is allowed and implemented")
        if self._is_default != v:
            self._is_default = v
            self._is_default_changed = True

    def save(self, *args, **kwargs):
        if self.is_default and self._is_default_changed:
            self.__class__.objects.filter(user=self.user).update(is_default=False)
        super().save(*args, **kwargs)


class WalletLine(models.Model):
    PRECISION_PLACES = Decimal('0.00000001')

    # noinspection PyPep8Naming
    class OPERATION_TYPE_CHOICES(object):
        INO = 'INO'
        INC = 'INC'
        INR = 'INR'
        INS = 'INS'

        INI = 'INI'

        CMO = 'CMO'
        CMC = 'CMC'
        CMR = 'CMR'
        CMX = 'CMX'

        BPR = 'BPR'
        SPR = 'SPR'

        MCR = 'MCR'

        @classmethod
        def to_choices(cls):
            return (
                (cls.INI, 'Wallet initialization'),
                (cls.INC, 'Reward Points'),
                (cls.INO, 'Reward Points - Origin'),
                (cls.INR, 'Reward Points - Origin Commission'),
                (cls.INS, 'Reward Points - Sell Commission'),
                (cls.CMC, 'Commission - Reward Points'),
                (cls.CMO, 'Commission - Origin'),
                (cls.CMR, 'Commission - Reward Matrix'),
                (cls.CMX, 'Commission - Reward Matrix - Sell'),
                (cls.BPR, 'Product - Buy'),
                (cls.SPR, 'Product - Sell'),
                (cls.MCR, 'Manual correction'),
            )

    # noinspection PyPep8Naming
    class OPERATION_SUBTYPE_CHOICES(object):
        STD = 'STD'
        BNS = 'BNS'
        BRP = 'BRP'
        BRC = 'BRC'
        BPG = 'BPG'
        SLN = 'SLN'
        MCR = 'MCR'
        VSP = 'VSP'

        @classmethod
        def to_choices(cls):
            return (
                (cls.STD, 'Standard Reward Points'),
                (cls.BRP, 'Bonus Referral Reward - Parent'),  # Added from referral bonus points - parrent
                (cls.BRC, 'Bonus Referral Reward - Child'),  # Added from referral bonus points - child
                (cls.BNS, 'Bonus Referral Reward - Obsolete'),  # Old type for referral bonus lines - obsolete
                (cls.BPG, 'Bonus Reward Points - General'),  # General bonus type
                (cls.SLN, 'Silent line'),  # Added from BPR Silent charge process
                (cls.VSP, 'VirtualShop payment'),    # Added from BPR for VirtualShop
                (cls.MCR, 'Manual correction'),    # Added by CS Admin
            )

    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name='wallet_lines')
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, related_name='+', null=True, on_delete=models.PROTECT)
    operation_uuid = models.UUIDField(editable=False, db_index=True, unique=True, default=uuid.uuid4)
    operation_date = models.DateTimeField(auto_now_add=True)
    operation_type = models.CharField(max_length=3, choices=OPERATION_TYPE_CHOICES.to_choices(), db_index=True)
    operation_subtype = models.CharField(max_length=3, choices=OPERATION_SUBTYPE_CHOICES.to_choices(), db_index=True, default=OPERATION_SUBTYPE_CHOICES.STD)

    src_transaction_id = models.CharField(max_length=100, db_index=True, blank=True)
    src_title = models.CharField(max_length=255, blank=True, db_index=True)

    amount = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=0
    )
    balance_before = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=0,
        editable=False
    )
    balance_after = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=0,
        editable=False
    )

    class Meta:
        unique_together = [
            ('wallet', 'partner', 'src_transaction_id', 'operation_type'),
        ]

    def __str__(self):
        return '%s - %s (%s) - %s' % (
            self.operation_uuid,
            self.operation_type,
            self.operation_subtype,
            self.amount.quantize(Decimal('0.00'))
        )

    def save(self, *args, wallet_already_locked=False, **kwargs):
        """
        Method prohibits UPDATE operation and set's ``balance_before`` and ``balance_after`` values.
        Method also set wallet current balance

        :param wallet_already_locked: When True operation `select_for_update` on wallet will not be performed, i.e. useful for multiple lines creation by serializers
        :return:
        """
        if self.id is not None:
            msg = "WalletLine doesn't support UPDATE operation! wallet_line_id = %d" % self.pk
            logger.error(msg)
            raise NotImplementedError(msg)

        kwargs['force_insert'] = True

        if not wallet_already_locked:
            with transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(pk=self.wallet_id)
                self._perform_save(wallet, *args, **kwargs)
        else:
            wallet = self.wallet
            self._perform_save(wallet, *args, **kwargs)

    def _perform_save(self, wallet, *args, **kwargs):
        self.balance_before = wallet.current_balance
        self.balance_after = self.balance_before + self.amount
        wallet.current_balance = self.balance_after

        super().save(*args, **kwargs)
        wallet.save(force_update=True, update_fields=['current_balance'])
