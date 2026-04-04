import datetime
import urllib.parse

from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from rest_framework import permissions, generics
from rest_framework.response import Response
from rest_framework.status import HTTP_409_CONFLICT, HTTP_400_BAD_REQUEST

from wallet.serializers import CreateBprWalletLineSerializer
from . import serializers, models, settings as ext_order_settings


class PartnerTransactionApiKeysView(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    serializer_class = serializers.PartnerTransactionApiKeysSerializer
    permission_classes = [TokenHasScope, ]
    required_scopes = ['wallet:transaction_keys:read']

    def get_object(self):
        return self.request.user.transaction_api_keys


class PartnerTransactionApiKeysRecreateView(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    serializer_class = serializers.PartnerTransactionApiKeysRecreateSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ['wallet:transaction_keys:recreate:read']

    def get_object(self):
        with transaction.atomic():
            self.request.user.transaction_api_keys.delete()
            return models.PartnerTransactionApiKeys.objects.create(partner=self.request.user)


class MakeRedirectResponseMixing(object):
    def make_redirect_response(self, redirect_to):
        return Response(
            status=302,
            headers={
                'location': redirect_to
            }
        )


class ValidateExternalOrder(MakeRedirectResponseMixing, DefaultJsonRestViewMixing, generics.CreateAPIView):
    serializer_class = serializers.ValidateExternalOrderSerializer
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)
    http_method_names = ('get',)

    def get_serializer_context(self):
        result = super().get_serializer_context()
        result.update({
            'public_key': self.kwargs['public_key']
        })
        return result

    def get(self, request, *args, **kwargs):
        return self.create(request=request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)

        if not serializer.is_valid(raise_exception=False):
            self.logger.info(serializer.errors)
            return self.make_redirect_response(
                redirect_to=request.query_params.get('cancel_url', request.META.get('HTTP_REFERER'))
            )

        with transaction.atomic():
            serializer.save()

        uid = serializer.instance.id
        url = settings.FRONTEND_REDIRECT_URL.format(uid)
        return self.make_redirect_response(redirect_to=url)


class GetExternalOrderDetails(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    permission_classes = (TokenHasScope,)
    required_scopes = ['wallet:ext_order:read']
    http_method_names = ('get', 'options')
    lookup_url_kwarg = 'key'
    lookup_field = 'id'

    def get_queryset(self):
        # RLS security and remember I can only see this order only once
        return models.ExternalOrder.objects.filter(user__isnull=True)

    def filter_queryset(self, queryset):
        filter_date = datetime.datetime.now() - datetime.timedelta(seconds=ext_order_settings.MAX_TIME_VALID_ORDER)
        return queryset.filter(created_at__gte=filter_date)

    def get_object(self):
        obj = super().get_object()

        with transaction.atomic():
            obj.user = self.request.user
            obj.save(update_fields=['user'])  # we need to store this information ASAP
        self.logger.info('GetExternalOrderDetails: Order: {} attached to {}'.format(obj.id, self.request.user.username))
        return obj

    def can_afford(self, instance):
        if instance.status == models.ExternalOrder.STATUS.REJECTED:
            self.logger.warning('GetExternalOrderDetails: Order: {} already has status REJECTED!'.format(instance.id))
            return False
        with transaction.atomic():
            wallet = self.request.user.wallets.filter(_is_default=True).first()
            if wallet.current_balance < instance.total_amount:
                self.logger.info('GetExternalOrderDetails: Order: {} setting status REJECTED! - to expensive'.format(instance.id))
                instance.status = models.ExternalOrder.STATUS.REJECTED
                instance.save()
                return False
        self.logger.info('GetExternalOrderDetails: Order: {} can_afford - True'.format(instance.id))
        return True

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != models.ExternalOrder.STATUS.PENDING:
            self.logger.warning('Instance {} has status {}'.format(instance.id, instance.get_status_display()))
            return Response(status=HTTP_409_CONFLICT, data={'status': instance.status_mapping})

        self.can_afford(instance)

        actions = []
        for action in instance.possible_actions:
            actions.append({'action': action})

        ext_order_dict = dict(serializers.ExternalOrderSerializer(instance=instance).data)

        data = {
            'order': ext_order_dict,
            'actions': actions
        }

        return Response(data)

class DummyDict(dict): pass

class FinalizeExternalOrder(GetExternalOrderDetails):
    ARN = 'arn:wallet:finalize_external_order:{}'

    def get_queryset(self):
        # RLS security and remember I can only see this order only once
        return models.ExternalOrder.objects.filter(user=self.request.user)

    def filter_queryset(self, queryset):
        return queryset.filter(user=self.request.user)

    def get_object(self):
        return generics.GenericAPIView.get_object(self)

    @staticmethod
    def calculate_return_url(instance, use_return_url=True):
        d = {
            'transaction_id': instance.external_transaction_id,
            'payment': instance.status_mapping,
            'signature': instance.status_signature
        }
        d = urllib.parse.urlencode(d)
        uri = instance.return_url if use_return_url else instance.cancel_url

        c = '&' if '?' in uri else '?'

        uri = '{}{}{}'.format(uri, c, d)
        return uri

    def make_redirect_response(self, redirect_to):
        return Response({'redirect_url': redirect_to})

    def validate_instance(self, instance):
        self.can_afford(instance)

        if instance.status == models.ExternalOrder.STATUS.REJECTED:
            self.logger.warning('1Instance {} has status {}'.format(instance.id, instance.get_status_display()))
            uri = self.calculate_return_url(instance)
            return self.make_redirect_response(redirect_to=uri)

        action = self.request.query_params.get('action', None)

        if action is None or instance.status not in (
                models.ExternalOrder.STATUS.PENDING, models.ExternalOrder.STATUS.ACCEPTED):
            self.logger.warning('2 Instance {} has status {}'.format(instance.id, instance.get_status_display()))
            return Response(status=HTTP_400_BAD_REQUEST)

        if instance.status == models.ExternalOrder.STATUS.PENDING:
            if action not in (models.ExternalOrder.ACTIONS.CANCEL, models.ExternalOrder.ACTIONS.CONFIRM):
                self.logger.warning('3 Instance {} has status {}'.format(instance.id, instance.get_status_display()))
                return Response(status=HTTP_400_BAD_REQUEST)
            if action == models.ExternalOrder.ACTIONS.CANCEL:
                self.logger.warning('Instance {} has status {}'.format(instance.id, instance.get_status_display()))
                with transaction.atomic():
                    instance.status = models.ExternalOrder.STATUS.ABORTED
                    instance.save(update_fields=['status'])
                self.logger.warning('Instance {} has status {}'.format(instance.id, instance.get_status_display()))

                uri = self.calculate_return_url(instance, use_return_url=False)
                self.logger.warning('Returning {}'.format(uri))
                return self.make_redirect_response(redirect_to=uri)

            if action != models.ExternalOrder.ACTIONS.CONFIRM:
                self.logger.warning('Instance {} has status {}'.format(instance.id, instance.get_status_display()))
                return Response(status=HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                instance.status = models.ExternalOrder.STATUS.ACCEPTED
                instance.save(update_fields=['status'])

    def process_instance(self, instance):

        request_copy = DummyDict()
        request_copy.user = instance.partner
        request_copy['user'] = instance.partner
        request_copy.META = self.request.META

        serializer = CreateBprWalletLineSerializer(
            data={
                'price': instance.total_amount,
                'tier': 1,
                'for_user': instance.user.username,
                'title': 'Purchase {}'.format(instance.external_transaction_id),
                'transaction_id': instance.external_transaction_id
            },
            context={
                'request': request_copy
            }
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            instance.status = models.ExternalOrder.STATUS.PROCESSING
            instance.save(update_fields=['status'])
        try:
            with transaction.atomic():
                serializer.save()
                instance.status = models.ExternalOrder.STATUS.COMPLETED
                instance.save(update_fields=['status'])
        except:
            with transaction.atomic():
                instance.status = models.ExternalOrder.STATUS.ACCEPTED
                instance.save(update_fields=['status'])
            raise

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        with cache.lock(self.ARN.format(instance.id), expire=ext_order_settings.LOCK_TIMEOUT):
            result = self.validate_instance(instance)

            if result:
                self.logger.warning(result)
                return result

            self.process_instance(instance)

        uri = self.calculate_return_url(instance)
        self.logger.info('Finalize {} and redirecting to {}'.format(instance.id, uri))
        return self.make_redirect_response(redirect_to=uri)
