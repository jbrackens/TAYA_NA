import abc
import logging
from asyncio import Future
from datetime import datetime
from json import JSONDecodeError
from threading import Lock
from typing import Optional, Union
from uuid import UUID, uuid4

import cachetools.func
from django.conf import settings
from django.utils.timezone import now
from requests import PreparedRequest, RequestException, Response
from requests_futures.sessions import FuturesSession

from virtual_store import models

from . import schema

logger = logging.getLogger(__name__)


class IngestorException(Exception):
    pass


class InitializationException(IngestorException):
    pass


class SendingException(IngestorException):
    def __init__(self, request: PreparedRequest):
        self.request = request

    def get_request_body(self) -> str:
        if isinstance(self.request.body, bytes):
            return self.request.body.decode()
        return self.request.body


class NoTokenException(SendingException):
    def __init__(self, data: str):
        self.data = data

    def get_request_body(self) -> str:
        return self.data


class IngestorClient:
    _HTTP_SESSION: FuturesSession
    _AUTODISCOVER_LOCK: Lock
    _AUTH_ENDPOINT_LOCK: Lock

    def __init__(self):
        logger.info("Initializing IngestorClient")
        self._HTTP_SESSION = FuturesSession(max_workers=settings.INGESTOR_CLIENT_MAX_WORKERS)
        self._AUTODISCOVER_LOCK = Lock()
        self._AUTH_ENDPOINT_LOCK = Lock()

    def _response_hook(self, resp: Response, *args, **kwargs):  # noqa
        try:
            resp.data = resp.json()
        except JSONDecodeError:
            resp.data = resp.content.decode()

    @cachetools.func.lru_cache(maxsize=1)
    def _get_default_params(self):
        return dict(
            hooks={
                "response": self._response_hook,
            },
            verify=True,
            allow_redirects=True,
            timeout=settings.INGESTOR_CLIENT_OIDC_TIMEOUT,
        )

    def _get(self, url: str) -> Future:
        result = self._HTTP_SESSION.get(url, **self._get_default_params())
        return result

    def _post(self, url: str, data: str, auth_token: str) -> Future:
        result = self._HTTP_SESSION.post(
            url, data=data, headers=dict(Authorization=f"Bearer {auth_token}"), **self._get_default_params()
        )
        return result

    @cachetools.func.lru_cache(maxsize=1)
    def _get_token_endpoint(self):
        with self._AUTODISCOVER_LOCK:
            logger.info(f"Getting well-know-config for OIDC under {settings.INGESTOR_CLIENT_OIDC_WELL_KNOWN_CONFIG}")
            future = self._get(settings.INGESTOR_CLIENT_OIDC_WELL_KNOWN_CONFIG)
            try:
                response = future.result()
                if response.status_code < 200 or response.status_code > 299:
                    logger.error(f"Wrong response from OIDC: {response.content}")
                    return
            except Exception as e:
                logger.exception(f"Catch exception during OIDC call: {e}")
                return
            return response.data.get("token_endpoint")

    @cachetools.func.ttl_cache(maxsize=1, ttl=settings.INGESTOR_CLIENT_OIDC_TOKEN_EXPIRATION)
    def get_authorization_token(self) -> Optional[str]:
        with self._AUTH_ENDPOINT_LOCK:
            token_endpoint = self._get_token_endpoint()
            if token_endpoint is None or not token_endpoint:
                self._get_token_endpoint.cache_clear()
                return
            auth_payload = dict(
                grant_type="password",
                username=settings.INGESTOR_CLIENT_OIDC_USERNAME,
                password=settings.INGESTOR_CLIENT_OIDC_PASSWORD,
                client_id=settings.INGESTOR_CLIENT_OIDC_CLIENT_ID,
                client_secret=settings.INGESTOR_CLIENT_OIDC_CLIENT_PASSWORD,
                scope="openid",
            )
            try:
                logger.info("Refreshing Bearer token")
                future: Future = self._HTTP_SESSION.post(
                    url=token_endpoint, data=auth_payload, **self._get_default_params()
                )
                result: Response = future.result()
                if result.status_code < 200 or result.status_code > 299:
                    logger.warning(f"wrong response: {result.content}")
                    return
                return result.data.get("id_token")  # noqa
            except Exception as e:
                logger.exception(f"Catch exception({e}")

    def send_raw(self, data: str) -> Future:
        token = self.get_authorization_token()
        if token is None or not token:
            self.get_authorization_token.cache_clear()
            raise NoTokenException(data)
        return self._post(url=settings.INGESTOR_CLIENT_URL, data=data, auth_token=token)

    def handle_result(self, future: Future, correlation_id=None):
        response: Response = future.result()
        if response.status_code < 200 or response.status_code > 299:
            raise SendingException(response.request)
        logger.info(f"Message for correlation_id={correlation_id} send.")

    def send(self, event: schema.IncomingAdminAnyEvent, correlation_id: str = None):
        if correlation_id is None:
            correlation_id = uuid4()
            logger.warning(f"Received empty correlation_id. Using a new one - {correlation_id}")
        logger.info(f"({correlation_id}) Sending {event.payload.get_message_type()}")
        data = event.to_json()
        if settings.INGESTOR_CLIENT_MOCK:
            logger.warning(f"({correlation_id}) Faking sending data: {data}")
        else:
            try:
                future = self.send_raw(data)
                self.handle_result(future, correlation_id)
            except (RequestException, SendingException) as e:
                self.handle_exception(correlation_id, e)

    def handle_exception(self, correlation_id: str, exc: Union[RequestException, SendingException]):
        if isinstance(exc, SendingException):
            data = exc.get_request_body()
        else:
            if isinstance(exc.request.body, bytes):
                data = exc.request.body.decode()
            else:
                data = exc.request.body
        obj_id = uuid4()
        utc_now = now()
        logger.exception(
            f"Exception({exc}) occurred. I will try to store it as {obj_id} to process later for correlation_id={correlation_id}"
        )
        from . import models

        models.StoredEventsModel.objects.create(
            object_id=obj_id,
            status=models.StoredEventsModel.StatusEnum.PENDING,
            send_at=utc_now,
            correlation_id=correlation_id,
            data=data,
        )


IngestorClient = IngestorClient()


class IngestorClientMixing(abc.ABC):
    def _send(self, correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id):
        event = schema.IncomingAdminAnyEvent(
            payload=item, on_behalf_of_company_id=on_behalf_of_company_id, on_behalf_of_user_id=on_behalf_of_user_id
        )
        IngestorClient.send(event=event, correlation_id=correlation_id)


class UserBackpackIngestorClient(IngestorClientMixing):
    def send_product_added(
        self,
        product_id: UUID,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductAddedToBackpackEvent(product_id=product_id)
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)

    def send_product_activated(
        self,
        product_id: UUID,
        active_to: datetime = None,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductActivatedInBackpackEvent(product_id=product_id, active_to=active_to)
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)

    def send_product_deactivated(
        self,
        product_id: UUID,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductDeactivatedInBackpackEvent(product_id=product_id)
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)

    def send_product_detached(
        self,
        product_id: UUID,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductDetachedFromBackpackEvent(product_id=product_id)
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)


class ProductIngestorClient(IngestorClientMixing):
    def _convert_product(self, product: models.Product) -> schema.ProductSchema:
        subscription_meta = None
        if product.product_type == models.Product.ProductType.BASE_PRODUCT:
            product_type = schema.ProductSchema.ProductTypesEnum.BASE
        elif product.product_type == models.Product.ProductType.CONSUMABLE_PRODUCT:
            product_type = schema.ProductSchema.ProductTypesEnum.CONSUMABLE
        elif product.product_type == models.Product.ProductType.SUBSCRIPTION_PRODUCT:
            product_type = schema.ProductSchema.ProductTypesEnum.SUBSCRIPTION
            if product.subscription_duration_type == models.Product.SubscriptionDurationType.YEAR:
                subscription_duration_type = schema.SubscriptionMetaSchema.SubscriptionTypesEnum.YEAR
            elif product.subscription_duration_type == models.Product.SubscriptionDurationType.MONTH:
                subscription_duration_type = schema.SubscriptionMetaSchema.SubscriptionTypesEnum.MONTH
            elif product.subscription_duration_type == models.Product.SubscriptionDurationType.DAY:
                subscription_duration_type = schema.SubscriptionMetaSchema.SubscriptionTypesEnum.DAY
            elif product.subscription_duration_type == models.Product.SubscriptionDurationType.HOUR:
                subscription_duration_type = schema.SubscriptionMetaSchema.SubscriptionTypesEnum.HOUR
            elif product.subscription_duration_type == models.Product.SubscriptionDurationType.MINUTE:
                subscription_duration_type = schema.SubscriptionMetaSchema.SubscriptionTypesEnum.MINUTE
            else:
                raise ValueError(f"Unknown subscription duration {product.subscription_duration_type}")
            subscription_meta = schema.SubscriptionMetaSchema(
                duration=product.subscription_duration,
                level=product.subscription_level,
                subscription_type=subscription_duration_type,
            )
        else:
            raise ValueError(f"Unknown product type: {product.product_type}")

        if product.product_subtype == models.Product.ProductSubType.VIRTUAL:
            sub_type = schema.ProductSchema.ProductSubTypesEnum.VIRTUAL
        elif product.product_subtype == models.Product.ProductSubType.NORMAL:
            sub_type = schema.ProductSchema.ProductSubTypesEnum.NORMAL
        else:
            raise ValueError(f"Unknown sub_product type: {product.product_subtype}")

        if product.provision_type == models.Product.ProvisionType.NONE:
            provision_type = schema.ProductSchema.ProvisionTypesEnum.NONE
        elif product.provision_type == models.Product.ProvisionType.ANTSTREAM:
            provision_type = schema.ProductSchema.ProvisionTypesEnum.ANTSTREAM
        else:
            raise ValueError(f"Unknown provision_type type: {product.provision_type}")

        return schema.ProductSchema(
            product_id=product.sub,
            product_type=product_type,
            sub_type=sub_type,
            provision_type=provision_type,
            title=product.title,
            price=float(product.price),
            currency_id=product.currency.sub,
            company_id=product.partner.sub,
            is_public=product.is_public,
            commercially_available_from=product.available_from,
            commercially_available_to=product.available_to,
            subscription_meta=subscription_meta,
        )

    def send_product_created(
        self,
        product: models.Product,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductCreatedEvent(product=self._convert_product(product=product))
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)

    def send_product_updated(
        self,
        product: models.Product,
        *,
        correlation_id: str = None,
        on_behalf_of_company_id: UUID = None,
        on_behalf_of_user_id: str = None,
    ):
        item = schema.ProductUpdatedEvent(product=self._convert_product(product=product))
        self._send(correlation_id, item, on_behalf_of_company_id, on_behalf_of_user_id)


UserBackpackIngestorClient = UserBackpackIngestorClient()
ProductIngestorClient = ProductIngestorClient()
