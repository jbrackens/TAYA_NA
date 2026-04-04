import random
import string

from aws_rest_default.serializers import LoggingSerializerMixing, ReadOnlySerializer
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models.query_utils import Q
from rest_framework import serializers

from oidc import models as oidc_models
from oidc_rest.serializers.registration import RegistrationSerializer
from django.conf import settings
from . import models
import logging

logger = logging.getLogger(__name__)


class ExternalUserMappingModelSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    company_id = serializers.CharField(max_length=64, write_only=True)
    external_user_id = serializers.CharField(max_length=120, write_only=True)
    email = serializers.EmailField(write_only=True, required=False)

    user_sub = serializers.CharField(read_only=True)
    originator_id = serializers.CharField(read_only=True)
    created = serializers.BooleanField(read_only=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_company_id(self, val):
        if not oidc_models.OidcClientExtra.objects.filter(
                user__is_company=True,
                user__company__id=val
        ).exists():
            raise serializers.ValidationError('Wrong Company or not associated OIDC client')
        return val

    def update(self, instance, validated_data):
        msg = 'Called UPDATE method on ExternalUserMappingModelSerializer'
        self.logger.error(msg)
        raise NotImplemented(msg)

    def create(self, validated_data):
        company_id = validated_data.get('company_id', None)
        external_user_id = validated_data.get('external_user_id', None)
        email = validated_data.get('email', None)

        email_given = bool(email)

        arn = models.ExternalUserMappingModel.get_arn(company=company_id, external_user_id=external_user_id)

        user_data = self.get_user_mapping_from_cache(arn)
        user_sub = user_data.get('user_sub')
        originator_id = user_data.get('originator_id') or company_id
        if user_sub is not None:
            return self.prepare_result(user_sub, originator_id)

        created = False
        with cache.lock(arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            user_data = self.get_user_mapping_from_cache(arn)
            user_sub = user_data.get('user_sub')
            originator_id = user_data.get('originator_id') or company_id
            if user_sub is not None:
                return self.prepare_result(user_sub, originator_id)

            user_sub, originator_id = self.get_for_external_id(external_user_id, company_id)

            if email_given and not user_sub:
                with cache.lock('oidc:temp_user:creating:{}'.format(email), expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                    user_sub, originator_id = self.get_for_external_id(external_user_id, company_id)
                    if not user_sub:
                        with transaction.atomic():
                            user = self.get_user_for_verified_email(email)
                            if user is None:
                                self.logger.info('not exists must create new one')
                                user = self.create_new_temp_user(company_id, email)
                                self.logger.info('Created new temporary user: {}'.format(user_sub))
                                created = True
                            user_sub = user.sub
                            originator_id = company_id
                            self.create_user_mapping(company_id, external_user_id, user.pk)
            if user_sub:
                cache.set(arn, {'user_sub': user_sub, 'originator_id': originator_id})
                return self.prepare_result(user_sub, originator_id, created)
        raise serializers.ValidationError({'email': 'Unable to find user {}. Please provide email to create one.'.format(external_user_id)})

    def create_new_temp_user(self, company, email):
        originators_client_id = oidc_models.OidcClientExtra.objects.filter(
            user__is_company=True,
            user__company__id=company
        ).values_list('oidc_client__client_id').first()
        if originators_client_id is None:
            self.logger.error('Unable to find company with id {}'.format(company))
            raise serializers.ValidationError({'company_id': 'Unknown Company!'})
        originators_client_id, = originators_client_id

        ser = RegistrationSerializer(data={
            'originators_client_id': originators_client_id,
            'email': email,
            'password': ''.join([random.choice(string.printable) for _ in range(100)])
        })
        ser.is_valid(raise_exception=True)
        ser.save(skip_signal_sending=True, is_temporary=True)
        return ser.instance

    def create_user_mapping(self, company_id, external_user_id, user_id):
        self.logger.info('Creating user mapping for "{}" and id "{}" = {}'.format(company_id, external_user_id, user_id))
        models.ExternalUserMappingModel.objects.create(
            company_id=company_id,
            external_user_id=external_user_id,
            user_id=user_id
        )

    def get_for_external_id(self, external_user_id, company_id):
        self.logger.info('Trying to locate user for extenal_id: {} for company: {}'.format(external_user_id, company_id))
        user_sub, originator_id = get_user_model().objects.filter(
            external_user_mapping_set__company_id=company_id,
            external_user_mapping_set__external_user_id=external_user_id
        ).values_list('sub', 'originator__company__id').first() or (None, None)
        return user_sub, originator_id

    def get_user_for_verified_email(self, email):
        """
        The first main condition gets the user already with a confirmed email,
        but this confirmed email does not have to be the main one.
        The second one, checks whether this email is the main for limited and temporary users,
        because they do not have a verified email, but they have it set as primary.

        :param email:
        :return:
        """
        self.logger.info('Trying to locate user for verified email: {}'.format(email))
        email = models.profile_models.Email.objects.filter(
            (
                Q(email=email) & Q(is_verified=True)
            ) | (
                Q(email=email) & Q(is_verified=False) & Q(is_primary=True) & (
                    Q(user__is_limited=True) | Q(user__is_temporary=True)
                )
            )
        ).select_related('user').first()
        if email is None:
            self.logger.info('Unable to find user with verified email: {}'.format(email))
            return None
        user = email.user
        self.logger.info('Found user with verified email or temporary user: {} for {}'.format(user.sub, email))
        return user

    def prepare_result(self, user_sub, originator_id, created=False):
        return {
            'user_sub': user_sub,
            'created': created,
            'originator_id': originator_id,
        }

    def get_user_mapping_from_cache(self, arn):
        return cache.get(arn, dict())


class ExternalUserMappingForBulkSerializer(ExternalUserMappingModelSerializer):
    company_id = serializers.CharField(max_length=64, required=False)
    external_user_id = serializers.CharField(max_length=120, required=False)
    email = serializers.CharField(max_length=255, required=False)

    user_sub = serializers.CharField(read_only=True, required=False)
    created = serializers.BooleanField(read_only=True, required=False)
    errors = serializers.JSONField(read_only=True, required=False)

    def validate_company_id(self, a):
        return a


class ExternalUserMappingModelBulkSerializer(LoggingSerializerMixing, ReadOnlySerializer):
    """
    This serializer is used to bulk create mapping between external users and company. Any record without email, ext_id or company will be rejected.
    If mapping found in mapping table, this record will be `skipped`.
    If any validations fails, record will be placed in `rejected`.
    If everything is OK, record will be passed to ExternalUserMappingModelSerializer to create mapping and, if required, user too.
    If user is created, then the record is processed, field `created` will be set up to True, despite to False if only mapping was created.
    """
    data = ExternalUserMappingForBulkSerializer(many=True, write_only=True)

    rejected = ExternalUserMappingForBulkSerializer(many=True, read_only=True, required=False)
    processed = ExternalUserMappingForBulkSerializer(many=True, read_only=True, required=False)
    skipped = ExternalUserMappingForBulkSerializer(many=True, read_only=True, required=False)

    def validate(self, attrs):
        rejected = []
        to_be_skipped = []
        to_be_created = []
        data = attrs.get('data', [])

        companies_to_check = [item.get('company_id') for item in data if item.get('company_id')]

        if companies_to_check:
            companies_exists = oidc_models.OidcClientExtra.objects.filter(
                user__is_company=True,
                user__company__id__in=companies_to_check
            ).values_list('user__company__id', flat=True)
            companies_exists = list(str(x) for x in companies_exists.iterator())
            self.logger.info('Companies exists: {}'.format(companies_exists))
            if not companies_exists:
                raise serializers.ValidationError({'data': 'All Companies provided does NOT exist in system as OIDC client'})
        else:
            raise serializers.ValidationError({'data': 'No companies detected!'})

        tuple_of_tuples = tuple(
            (item.get('company_id'), item.get('external_user_id'))
            for item in data
            if item.get('external_user_id') and item.get('company_id') in companies_exists
        )

        if tuple_of_tuples:
            result = dict({
                (str(x[0]), x[1]): x[2]
                for x in models.ExternalUserMappingModel.objects.all().
                values_list('company_id', 'external_user_id', 'user__sub').
                extra(
                        where=['({}.company_id, external_user_id) in %s'.format(models.ExternalUserMappingModel._meta.db_table)],
                        params=[tuple_of_tuples]
                )
            })
        else:
            result = dict()

        for item in data:
            i = dict(**item)
            company_id = item.get('company_id', None)
            if not company_id or company_id not in companies_exists:
                i['errors'] = [{'company_id': 'bad value or no OIDC assosieted with company'}]
                self.logger.info('Company_id = "{}" not in "{}"'.format(company_id, companies_exists))
                rejected.append(i)
                continue

            external_user_id = item.get('external_user_id', None)
            if not external_user_id:
                i['errors'] = [{'external_user_id': 'Field required'}]
                rejected.append(i)
                continue

            if (company_id, external_user_id) in result:
                i['user_sub'] = result.get((company_id, external_user_id))
                to_be_skipped.append(i)
                continue

            email = item.get('email', None)
            if not email:
                i['errors'] = [{'email': 'value required'}]
                rejected.append(i)
                continue
            try:
                validate_email(email)
            except ValidationError as e:
                i['errors'] = [{'email': e.message}]
                rejected.append(i)
                continue
            to_be_created.append(i)

        attrs = {
            'rejected': rejected,
            'to_be_skipped': to_be_skipped,
            'to_be_created': to_be_created
        }
        return attrs

    def create(self, validated_data):
        rejected = validated_data.get('rejected', [])
        to_be_skipped = validated_data.get('to_be_skipped', [])
        to_be_created = validated_data.get('to_be_created', [])
        created = []

        # No time for more
        for item in to_be_created:
            serializer = ExternalUserMappingModelSerializer(data=item, context=self.context)
            if not serializer.is_valid(raise_exception=False):
                i = dict(**item)
                i['errors'] = serializer.errors
                rejected.append(i)
                continue
            try:
                serializer.save()
            except Exception as e:
                i = dict(**item)
                i['errors'] = str(e)
                rejected.append(i)
                continue

            result = serializer.instance
            result.update(item)
            created.append(result)

        return {
            'rejected': rejected,
            'processed': created,
            'skipped': to_be_skipped
        }
