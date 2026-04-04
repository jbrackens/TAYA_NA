from copy import deepcopy
from functools import lru_cache
from uuid import uuid4, UUID

from aws_rest_default.handlers import jwt_get_originator_from_payload_handler
from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.contrib.auth import get_user_model
from rest_framework import serializers, fields
from rest_framework.exceptions import ValidationError

from token_exchange.serializers import PaymentTokenValidationMixing
from wallet.signal_handlers import handle_missing_user
from . import models
from django.db import transaction, IntegrityError


class CurrentBalanceSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    id = serializers.UUIDField(read_only=True)
    current_balance = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)


class CreateWalletForUser(CurrentBalanceSerializer):
    username = serializers.RegexField(regex=r'^rmx_[0-9a-f]{32}$', write_only=True)
    originator = serializers.RegexField(regex=r'^[0-9a-f\-]{36}$', write_only=True)

    def create(self, validated_data):
        self.logger.info('Creating (maybe) for user: {}'.format(validated_data))
        handle_missing_user(**validated_data)
        return models.Wallet.objects.only('id', 'current_balance').get(_is_default=True,
                                                                       user__username=validated_data['username'])


class WalletLineSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    operation_type_display = fields.CharField(source='get_operation_type_display')
    partner = fields.CharField(source='partner.username')

    class Meta:
        model = models.WalletLine
        fields = (
            'operation_uuid',
            'operation_date',
            'operation_type',
            'operation_subtype',
            'amount',
            'balance_before',
            'balance_after',
            'partner',
            'src_transaction_id',
            'src_title',
            'operation_type_display',
        )
        read_only_fields = fields


class WalletSerializer(LoggingSerializerMixing, serializers.ModelSerializer):
    class Meta:
        model = models.Wallet
        fields = (
            'id',
            'name',
            'is_default',
            'current_balance'
        )
        read_only_fields = (
            'id',
            'current_balance',
        )


class IgnoreTransactionAlreadyExistsException(Exception):
    """
    Used to mark exception as potentially expected
    """
    pass


# noinspection PyAbstractClass
class CreateWalletLineBaseSerializer(LoggingSerializerMixing, serializers.Serializer):
    """
    Standard line for user activity
    """
    price = fields.DecimalField(max_digits=20, decimal_places=8, min_value=0.00000001, required=True)
    tier = fields.IntegerField(min_value=0, max_value=100, default=1, help_text='Field used in commissions')
    for_user = fields.CharField(max_length=64, required=True)
    title = fields.CharField(max_length=255, required=True)
    transaction_id = fields.CharField(max_length=100, required=True)

    ignore_on_duplicate = fields.BooleanField(write_only=True, default=False)

    operation_subtype = fields.ChoiceField(required=False, default=models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD,
                                           initial=models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD,
                                           choices=models.WalletLine.OPERATION_SUBTYPE_CHOICES.to_choices()
                                           )

    def _get_src_user(self, attrs):
        request = self.context.get('request', None)
        if request is None:
            msg = '{} serializer has not been initialized with context'.format(self.__class__)
            self.logger.error(msg)
            raise ValidationError(msg)

        auth = getattr(request, 'auth', None)

        if auth is None:
            msg = '{} serializer has not been initialized with context'.format(self.__class__)
            self.logger.error(msg)
            raise ValidationError(msg)

        originator = jwt_get_originator_from_payload_handler(auth)

        user = get_user_model().objects.filter(username=originator).only('id', 'username').first()

        if user is None:
            msg = 'User is None for username = {}'.format(originator)
            self.logger.error(msg)
            raise ValidationError(msg)
        return user


class CreateWalletLineSerializer(CreateWalletLineBaseSerializer):

    def save(self, **kwargs):
        assert not hasattr(self, 'save_object'), (
                'Serializer `%s.%s` has old-style version 2 `.save_object()` '
                'that is no longer compatible with REST framework 3. '
                'Use the new-style `.create()` and `.update()` methods instead.' %
                (self.__class__.__module__, self.__class__.__name__)
        )

        assert hasattr(self, '_errors'), (
            'You must call `.is_valid()` before calling `.save()`.'
        )

        assert not self.errors, (
            'You cannot call `.save()` on a serializer with invalid data.'
        )

        # Guard against incorrect use of `serializer.save(commit=False)`
        assert 'commit' not in kwargs, (
            "'commit' is not a valid keyword argument to the 'save()' method. "
            "If you need to access data before committing to the database then "
            "inspect 'serializer.validated_data' instead. "
            "You can also pass additional keyword arguments to 'save()' if you "
            "need to set extra attributes on the saved model instance. "
            "For example: 'serializer.save(owner=request.user)'.'"
        )

        assert not hasattr(self, '_data'), (
            "You cannot call `.save()` after accessing `serializer.data`."
            "If you need to access data before committing to the database then "
            "inspect 'serializer.validated_data' instead. "
        )

        # noinspection PyTypeChecker
        validated_data = dict(
            list(self.validated_data.items()) + list(kwargs.items())
        )
        return self.create(validated_data)

    def update(self, instance, validated_data):
        pass

    def _get_wallet_for_user(self, for_user):
        wallet = models.Wallet.objects.filter(_is_default=True, user__username=for_user).only('id',
                                                                                              'originator').first()
        if wallet is None:
            msg = 'Unable to find user "%s" as for_user' % for_user
            self.logger.error(msg)
            raise ValidationError(msg)
        return wallet

    def _get_commission_config(self, attrs, user):
        tier = attrs['tier']

        try:
            commission_config = models.CommissionConfig.objects.get(user__username=user, tier=tier)
        except models.CommissionConfig.DoesNotExist:
            msg = 'Missing Commission Config for "%s" and "%s"' % (user, tier)
            self.logger.error(msg)
            raise ValidationError(msg)

        return commission_config

    def _validate_transaction_uniqness(self, attrs, partner_user, wallet_id):
        transaction_id = attrs.get('transaction_id')
        ignore_on_duplicate = attrs.get('ignore_on_duplicate', False)

        self.logger.info(
            'Validating Transaction uniqness:  wallet_id={}, src_transaction_id={}, partner={}, ignore_on_duplicate={}'.format(
                wallet_id, transaction_id, partner_user, ignore_on_duplicate))

        if models.WalletLine.objects.filter(wallet_id=wallet_id, src_transaction_id=transaction_id,
                                            partner__username=partner_user).exists():
            msg = 'Transaction already exists!  wallet_id={}, src_transaction_id={}, partner={}, ignore_on_duplicate={}'.format(
                wallet_id, transaction_id, partner_user, ignore_on_duplicate)
            if ignore_on_duplicate:
                self.logger.info('Rasing IgnoreTransactionAlreadyExistsException due "ignore_on_duplicate" = {}'.format(
                    ignore_on_duplicate))
                raise IgnoreTransactionAlreadyExistsException(msg)
            raise ValidationError(msg)

    def validate(self, attrs):
        src_user = self._get_src_user(attrs)
        wallet_src_user = self._get_wallet_for_user(src_user.username)

        wallet_for_user = self._get_wallet_for_user(attrs['for_user'])
        orig_user = wallet_for_user.originator

        self._validate_transaction_uniqness(attrs, src_user.username, wallet_for_user.id)

        wallet_orig_user = orig_user.wallets.only('id', 'originator').get(_is_default=True)
        wallet_fs_user = wallet_orig_user.originator.wallets.only('id', 'originator', 'user').get(_is_default=True)

        if wallet_fs_user.user != wallet_fs_user.originator:
            msg = 'Probably wallet FS is wrong. Check wallet_id = "%s"' % wallet_fs_user.id
            self.logger.error(msg)
            raise ValidationError('Wallet configuration is wrong!')

        commission_config = self._get_commission_config(attrs, src_user.username)
        orig_commission_config = self._get_commission_config(attrs, orig_user.username)

        attrs.update({
            'wallet_for_user_id': wallet_for_user.id,
            'wallet_src_user_id': wallet_src_user.id,
            'wallet_orig_user_id': wallet_orig_user.id,
            'wallet_fs_user_id': wallet_fs_user.id,
            'commission_config': commission_config,
            'orig_commission_config': orig_commission_config,
            'src_user': src_user,
        })
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            _ = models.Wallet.objects.select_for_update().filter(id__in=[
                validated_data['wallet_for_user_id'],
                validated_data['wallet_src_user_id'],
                validated_data['wallet_orig_user_id'],
                validated_data['wallet_fs_user_id'],
            ])
            src_user = validated_data['src_user']
            wallet_src_user_id = validated_data['wallet_src_user_id']
            wallet_fs_user_id = validated_data['wallet_fs_user_id']
            wallet_for_user_id = validated_data['wallet_for_user_id']

            self._validate_transaction_uniqness(validated_data, src_user.username,
                                                wallet_for_user_id)  # must double check after getting lock

            price = validated_data['price']
            transaction_id = validated_data['transaction_id']
            title = validated_data['title']
            commission_config = validated_data['commission_config']
            orig_commission_config = validated_data['orig_commission_config']
            wallet_orig_user_id = validated_data['wallet_orig_user_id']

            ino = models.WalletLine(
                wallet_id=wallet_orig_user_id,
                partner=src_user,
                operation_type=models.WalletLine.OPERATION_TYPE_CHOICES.INO,
                operation_subtype=validated_data.get('operation_subtype',
                                                     models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD),
                src_transaction_id=transaction_id,
                src_title=title,
                amount=commission_config.orig_commission * price
            )
            cmr = deepcopy(ino)
            cmr.operation_uuid = uuid4()
            cmr.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMR
            cmr.amount = price * commission_config.orig_commission * orig_commission_config.rm_commission * (-1)

            cmo = deepcopy(ino)
            cmo.operation_uuid = uuid4()
            cmo.wallet_id = wallet_src_user_id
            cmo.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMO
            cmo.amount = price * commission_config.orig_commission * (-1)

            cmc = deepcopy(cmo)
            cmc.operation_uuid = uuid4()
            cmc.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMC
            cmc.amount = price * (-1)

            inc = deepcopy(cmc)
            inc.operation_uuid = uuid4()
            inc.wallet_id = wallet_for_user_id
            inc.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.INC
            inc.amount = price

            inr = deepcopy(ino)
            inr.operation_uuid = uuid4()
            inr.wallet_id = wallet_fs_user_id
            inr.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.INR
            inr.amount = commission_config.orig_commission * price * orig_commission_config.rm_commission

            for l in [ino, cmr, cmo, cmc, inc, inr]:
                if abs(l.amount) >= models.WalletLine.PRECISION_PLACES:
                    l.save(wallet_already_locked=True)
                    self.logger.info('Line {} created'.format(l))
                else:
                    self.logger.info('Line {} skipped'.format(l))
        self._data = self.get_initial()
        self._data['wallet_transaction_id'] = inc.operation_uuid


class CreateWalletLineFromCompanySerializer(CreateWalletLineSerializer):
    company_id = serializers.RegexField(regex=r'[a-z0-9\-]{36}')

    def _get_src_user(self, attrs):
        src_user = attrs.get('company_id', None)
        if src_user is None:
            msg = 'CreateWalletLineFromCompanySerializer has not been initialized with company_id in data'
            self.logger.error(msg)
            raise ValidationError(msg)
        src_user = get_user_model().objects.get(username=src_user)
        return src_user

    def _get_wallet_src_user(self, src_user):
        wallet_src_user = src_user.wallets.only('id', 'originator').get(_is_default=True)
        return wallet_src_user


class CreateWalletLineFromCompanyWithoutCommissionSerializer(CreateWalletLineFromCompanySerializer):
    """
    Serializer used for INC operations, it only locks target wallet
    """

    def update(self, instance, validated_data):
        raise NotImplemented('This serializer does not allow update instance')

    def create(self, validated_data):
        price = validated_data.get('price')
        for_user = validated_data.get('for_user')
        title = validated_data.get('title')
        transaction_id = validated_data.get('transaction_id')
        ignore_on_duplicate = validated_data.get('ignore_on_duplicate')
        operation_subtype = validated_data.get('operation_subtype')
        partner_id = self._get_src_user(attrs=validated_data).id

        with transaction.atomic():
            target_wallet = models.Wallet.objects.select_for_update().filter(user__username=for_user).first()

            if target_wallet is None:
                raise ValidationError({'for_user': 'unknown'})
            try:
                wl = models.WalletLine(
                    wallet=target_wallet,
                    partner_id=partner_id,
                    operation_subtype=operation_subtype,
                    operation_type=models.WalletLine.OPERATION_TYPE_CHOICES.INC,
                    src_transaction_id=transaction_id,
                    src_title=title,
                    amount=price
                )
                wl.save(wallet_already_locked=True)
            except IntegrityError:
                if ignore_on_duplicate:
                    raise IgnoreTransactionAlreadyExistsException()
                raise ValidationError(
                    'Transaction already in wallet. Duplication? (wallet={}, src_trx={}, partner_id={}, type={}'.format(
                        target_wallet,
                        transaction_id,
                        partner_id,
                        models.WalletLine.OPERATION_TYPE_CHOICES.INC
                    ))
        return validated_data


class CreateBprWalletLineSerializer(CreateWalletLineSerializer):
    def create(self, validated_data):
        with transaction.atomic():
            models.Wallet.objects.select_for_update().filter(id__in=[
                validated_data['wallet_for_user_id'],
                validated_data['wallet_src_user_id'],
                validated_data['wallet_orig_user_id'],
                validated_data['wallet_fs_user_id'],
            ])
            price = validated_data['price']
            src_user = validated_data['src_user']
            transaction_id = validated_data['transaction_id']
            title = validated_data['title']
            commission_config = validated_data['commission_config']
            orig_commission_config = validated_data['orig_commission_config']
            wallet_src_user_id = validated_data['wallet_src_user_id']
            wallet_orig_user_id = validated_data['wallet_orig_user_id']
            wallet_fs_user_id = validated_data['wallet_fs_user_id']
            wallet_for_user_id = validated_data['wallet_for_user_id']

            self._validate_transaction_uniqness(validated_data, src_user,
                                                wallet_src_user_id)  # must double check after getting lock

            lines = []

            if not models.Wallet.objects.filter(id=wallet_for_user_id, current_balance__gte=price).exists():
                raise serializers.ValidationError({'price': 'Insufficient funds'})

            bpr = models.WalletLine(
                wallet_id=wallet_for_user_id,
                partner=src_user,
                operation_uuid=uuid4(),
                operation_type=models.WalletLine.OPERATION_TYPE_CHOICES.BPR,
                operation_subtype=validated_data.get('operation_subtype',
                                                     models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD),
                src_transaction_id=transaction_id,
                src_title=title,
                amount=-1 * price
            )
            lines.append(bpr)

            inc = deepcopy(bpr)
            inc.operation_uuid = uuid4()
            inc.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.INC
            inc.amount = price * commission_config.orig_commission
            lines.append(inc)

            ###################################################################

            spr = deepcopy(bpr)
            spr.wallet_id = wallet_src_user_id
            spr.operation_uuid = uuid4()
            spr.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.SPR
            spr.amount = price
            lines.append(spr)

            cmo = deepcopy(spr)
            cmo.operation_uuid = uuid4()
            cmo.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMO
            cmo.amount = -1 * price * commission_config.orig_commission
            lines.append(cmo)

            cmc = deepcopy(spr)
            cmc.operation_uuid = uuid4()
            cmc.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMC
            cmc.amount = -1 * price * commission_config.orig_commission
            lines.append(cmc)

            ####################################################################

            cmr = deepcopy(cmo)
            cmr.wallet_id = wallet_orig_user_id
            cmr.operation_uuid = uuid4()
            cmr.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.CMR
            cmr.amount = -1 * price * commission_config.rm_commission * orig_commission_config.rm_commission
            lines.append(cmr)

            ino = deepcopy(cmr)
            ino.wallet_id = wallet_orig_user_id
            ino.operation_uuid = uuid4()
            ino.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.INO
            ino.amount = price * commission_config.orig_commission
            lines.append(ino)

            ####################################################################

            inr = deepcopy(ino)
            inr.wallet_id = wallet_fs_user_id
            inr.operation_uuid = uuid4()
            inr.operation_type = models.WalletLine.OPERATION_TYPE_CHOICES.INR
            inr.amount = price * commission_config.orig_commission * orig_commission_config.rm_commission
            lines.append(inr)

            for l in lines:
                if abs(l.amount) >= models.WalletLine.PRECISION_PLACES:
                    l.save(wallet_already_locked=True)
                    self.logger.info('Line {} created'.format(l))
                else:
                    self.logger.info('Line {} skipped'.format(l))

            return lines


class CreateBprWalletLineFromCompanySerializer(CreateBprWalletLineSerializer):
    company_id = serializers.RegexField(regex=r'[a-z0-9\-]{36}')

    def _get_src_user(self, attrs):
        src_user = attrs.get('company_id', None)
        if src_user is None:
            msg = 'CreateWalletLineFromCompanySerializer has not been initialized with company_id in data'
            self.logger.error(msg)
            raise ValidationError(msg)
        src_user = get_user_model().objects.get(username=src_user)
        return src_user

    def _get_wallet_src_user(self, src_user):
        wallet_src_user = src_user.wallets.only('id', 'originator').get(_is_default=True)
        return wallet_src_user


class CreateBprWalletLineFromCompanyWithoutCommissionSerializer(LoggingSerializerMixing, serializers.Serializer):
    ignore_on_duplicate = fields.BooleanField(write_only=True, default=False)
    # tier = fields.IntegerField(min_value=0, max_value=100, default=1, help_text='Field used in commissions')
    price = fields.DecimalField(max_digits=20, decimal_places=8, min_value=0.00000001, required=True)
    for_user = fields.CharField(max_length=64, required=True)
    title = fields.CharField(max_length=255, required=True)
    transaction_id = fields.CharField(max_length=64, required=True)
    operation_subtype = fields.ChoiceField(
        required=False, default=models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD,
        initial=models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD,
        choices=models.WalletLine.OPERATION_SUBTYPE_CHOICES.to_choices()
    )
    company_id = serializers.RegexField(regex=r'[a-z0-9\-]{36}')

    def _validate_uuid(self, value) -> str:
        try:
            test = UUID(value)
        except ValueError:
            raise ValidationError('Wrong value')
        return str(test)

    def update(self, instance, validated_data):
        raise NotImplemented('Update not allowed!')

    @lru_cache()
    def _validate_company_id(self, value):
        self.logger.info('Getting LRU cache for {}'.format(value))
        return get_user_model().objects.filter(username=value).values_list('id', flat=True).first()

    def validate_company_id(self, value):
        test = self._validate_uuid(value)
        company_id = self._validate_company_id(test)
        if company_id is None:
            raise ValidationError('Unknown value')
        return company_id

    def validate_for_user(self, value: str):
        if value.startswith('rmx_'):
            return value
        raise ValidationError('Wrong value')

    def get_and_lock_wallet_for_user_sub_and_amount(self, sub, amount) -> models.Wallet:
        self.logger.info('Locking wallet for user: {}'.format(sub))
        wallet = models.Wallet.objects.select_for_update(
        ).filter(
            user__username=sub,
            current_balance__gte=amount
        ).only('id').first()
        return wallet

    def create(self, validated_data):
        self.logger.info('Creating BPR(without commission) line - START')
        sub = validated_data.get('for_user')
        amount = validated_data.get('price')
        title = validated_data.get('title')
        transaction_id = validated_data.get('transaction_id')
        partner_id = validated_data.get('company_id')
        operation_subtype = validated_data.get('operation_subtype', models.WalletLine.OPERATION_SUBTYPE_CHOICES.STD)

        with transaction.atomic():
            wallet = self.get_and_lock_wallet_for_user_sub_and_amount(sub, amount)
            if wallet is None:
                raise serializers.ValidationError({'price': 'Insufficient funds'})
            try:
                wl = models.WalletLine(
                    wallet_id=wallet.id,
                    partner_id=partner_id,
                    operation_type=models.WalletLine.OPERATION_TYPE_CHOICES.BPR,
                    operation_subtype=operation_subtype,
                    src_transaction_id=transaction_id,
                    src_title=title,
                    amount=(-amount)
                )
                self.logger.info('Saving Line - {}'.format(wl))
                wl.save(wallet_already_locked=True)
            except IntegrityError:
                self._handle_duplication(partner_id, transaction_id, validated_data, wallet)
        self.logger.info('WL({}) saved.'.format(wl))
        return validated_data

    def _handle_duplication(self, partner_id, transaction_id, validated_data, wallet):
        self.logger.exception('Possible duplication?')
        ignore_on_duplicate = validated_data.get('ignore_on_duplicate')
        msg = 'Transaction already exists!  wallet_id={}, src_transaction_id={}, partner={}, ignore_on_duplicate={}'.format(
            wallet.id,
            transaction_id,
            partner_id,
            ignore_on_duplicate)
        if ignore_on_duplicate:
            self.logger.info('Raising IgnoreTransactionAlreadyExistsException due "ignore_on_duplicate"')
            raise IgnoreTransactionAlreadyExistsException(msg)
        raise ValidationError(msg)


class SilentChargeSerializer(LoggingSerializerMixing, PaymentTokenValidationMixing, ReadOnlySerializer):
    payment_token = serializers.CharField(write_only=True)
    order_id = serializers.CharField(max_length=60)
    tier = serializers.IntegerField(min_value=1, max_value=100, default=1)
    amount = serializers.DecimalField(min_value=0, decimal_places=8, max_digits=20)
    description = serializers.CharField(required=False, default='Default description')
    tags = serializers.CharField(required=False)

    def validate(self, attrs):
        val = attrs.get('payment_token')
        user_sub = val.get('u', None)
        channel = val.get('c', None)
        external_user_id = val.get('x', None)
        amount = attrs.get('amount', -1)
        tags = attrs.get('tags')
        description = attrs.get('description')

        if tags:
            self.logger.warning(
                'TAGS for order "{}" are not supported right now. "{}"'.format(attrs.get('order_id'), tags))
        balance = models.Wallet.objects.filter(_is_default=True, user__username=user_sub).values_list('current_balance',
                                                                                                      flat=True).first()
        if amount < 0 or amount > balance:
            raise serializers.ValidationError('Wrong amount')
        return {
            'price': amount,
            'tier': attrs.get('tier'),
            'for_user': user_sub,
            'title': description,
            'transaction_id': attrs.get('order_id'),
            'channel': channel,
            'external_user_id': external_user_id,
            'operation_subtype': models.WalletLine.OPERATION_SUBTYPE_CHOICES.SLN
        }

    def create_bpr_lines(self, validated_data):
        serializer = CreateBprWalletLineSerializer(data=validated_data, context=self.context)
        if not serializer.is_valid(raise_exception=False):
            self.logger.error('Serializer BPR errors: {}'.format(serializer.errors))
            raise serializer.ValidationError(serializer.errors)
        self.logger.info('Creating payment lines')
        # noinspection PyNoneFunctionAssignment
        result = serializer.save()
        return result

    def create_response(self, lines):
        self.logger.info('Creating response')
        return {
            'status': 'accepted',
            'transaction_id': lines[0].operation_uuid,
            'order_id': lines[0].src_transaction_id
        }

    def create_channel_bpr_line(self, bpr_line, channel, external_user_id):
        if not channel:
            return
        self.logger.info('Creating Channel BPR line for {}({}) (wallet line: {})'.format(channel, external_user_id,
                                                                                         bpr_line.operation_uuid))
        models.SilentChargeTokenChaneyPaymentsModel.objects.create(
            wallet_line_id=bpr_line.pk,
            channel=channel,
            external_user_id=external_user_id
        )

    def create(self, validated_data):
        self.logger.info('Creating BPR serializer')
        channel = validated_data.pop('channel', None)
        external_user_id = validated_data.pop('external_user_id', None)
        with transaction.atomic():
            # noinspection PyNoneFunctionAssignment
            lines = self.create_bpr_lines(validated_data)
            self.create_channel_bpr_line(lines[0], channel, external_user_id)
        # noinspection PyTypeChecker
        result = self.create_response(lines)
        return result


class SilentChargeResponseSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    status = serializers.CharField(max_length=30)
    errors = serializers.JSONField(required=False)
    transaction_id = serializers.UUIDField(required=False)
    order_id = serializers.CharField(max_length=60, required=False)


class SilentChargeTokenChanelPaymentsSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    created_at = serializers.DateTimeField()
    username = serializers.CharField(source='wallet_line__wallet__user__username')
    external_user_id = serializers.CharField(allow_null=True, required=False)
    channel = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    partner = serializers.CharField(source='wallet_line__partner__username')
    operation_uuid = serializers.UUIDField(source='wallet_line__operation_uuid')
    src_transaction_id = serializers.CharField(source='wallet_line__src_transaction_id', allow_blank=True)
    src_title = serializers.CharField(source='wallet_line__src_title', allow_blank=True)
    amount = serializers.DecimalField(source='wallet_line__amount', decimal_places=8, max_digits=20)
