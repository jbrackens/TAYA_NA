import abc
import logging
from typing import Callable, Iterable, Optional
from uuid import uuid4

from aws_rest_default.authentication import META_MESSAGE_HEADER_NAME
from aws_rest_default.handlers import (
    JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY,
    JWT_IS_TEST_PAYLOAD_KEY,
    JWT_ORIGINATOR_PAYLOAD_KEY,
    JWT_PERMISSIONS_PAYLOAD_KEY,
)
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from profiles import models

logger = logging.getLogger(__name__)


class ProvisionRsaKeyMixing(abc.ABC, TestCase):
    @classmethod
    def setUpTestData(cls):
        cmd = "provision_rsa_keys"
        logger.info(f"Executing: {cmd}")
        call_command(cmd)
        super().setUpTestData()


class AbstractCommonTest(abc.ABC, TestCase):
    target_url_name: str = None
    target_view_class: APIView = None

    @classmethod
    def setUpTestData(cls):
        for cmd in (
            "provision_site",
            "provision_users",
            "provision_permissions",
            "provision_oidc_client",
        ):
            logger.info(f"Executing: {cmd}")
            call_command(cmd)

    class _ApiClient:
        _api_request_factory = APIRequestFactory()
        _view_class = None

        def __init__(self, parent_class_instance: "AbstractCommonTest"):
            self._view_class = parent_class_instance.target_view_class
            self._test_uid = parent_class_instance.test_uid
            self.logger = logging.getLogger(
                f"test.{parent_class_instance.__class__.__name__}.{parent_class_instance.test_uid}.api_client"
            )
            self.logger.info("api client configured")

        def _get_auth_context(
            self, user: models.CustomUser, oidc_client_id, permissions_required: Iterable[str] = None
        ):
            return dict(
                aud=oidc_client_id,
                sub=user.sub,
                extra={
                    JWT_ORIGINATOR_PAYLOAD_KEY: str(user.get_originator_company().sub),
                    JWT_PERMISSIONS_PAYLOAD_KEY: list(permissions_required) if permissions_required else None,
                    JWT_IS_TEST_PAYLOAD_KEY: user.is_test_user,
                    JWT_AUDIENCE_USER_SUB_PAYLOAD_KEY: str(user.get_originator_company().sub),
                },
                lim=user.is_limited,
            )

        def _make_call(
            self,
            factory_handler: Callable,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: Optional[dict] = None,
        ) -> Response:
            if kwargs is None:
                kwargs = {}
            self.logger.info(f"calling {factory_handler.__name__}")
            request = factory_handler(
                target_url,
                data=data or "",
                content_type="application/json",
                **{
                    META_MESSAGE_HEADER_NAME: self._test_uid,
                },
            )
            if user and oidc_client_id:
                force_authenticate(
                    request,
                    user=user,
                    token=self._get_auth_context(
                        user=user,
                        oidc_client_id=oidc_client_id,
                        permissions_required=permissions_required or list(),
                    ),
                )
            else:
                assert all(
                    (user, oidc_client_id)
                ), f"Both oidc_client_id({oidc_client_id} and user({user}) must be provided!"
            response: Response = self._view_class.as_view()(request, **kwargs)
            self.logger.info(f"received response({response.status_code})")
            response.render()
            return response

        def get(
            self,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: dict = None,
        ) -> Response:
            return self._make_call(
                self._api_request_factory.get,
                target_url=target_url,
                user=user,
                oidc_client_id=oidc_client_id,
                permissions_required=permissions_required,
                data=data,
                kwargs=kwargs,
            )

        def post(
            self,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: dict = None,
        ) -> Response:
            return self._make_call(
                self._api_request_factory.post,
                target_url=target_url,
                user=user,
                oidc_client_id=oidc_client_id,
                permissions_required=permissions_required,
                data=data,
                kwargs=kwargs,
            )

        def put(
            self,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: dict = None,
        ) -> Response:
            return self._make_call(
                self._api_request_factory.put,
                target_url=target_url,
                user=user,
                oidc_client_id=oidc_client_id,
                permissions_required=permissions_required,
                data=data,
                kwargs=kwargs,
            )

        def patch(
            self,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: dict = None,
        ) -> Response:
            return self._make_call(
                self._api_request_factory.patch,
                target_url=target_url,
                user=user,
                oidc_client_id=oidc_client_id,
                permissions_required=permissions_required,
                data=data,
                kwargs=kwargs,
            )

        def delete(
            self,
            target_url: str,
            user: models.CustomUser = None,
            oidc_client_id: str = None,
            permissions_required: Iterable[str] = None,
            data: dict = None,
            kwargs: dict = None,
        ) -> Response:
            return self._make_call(
                self._api_request_factory.delete,
                target_url=target_url,
                user=user,
                oidc_client_id=oidc_client_id,
                permissions_required=permissions_required,
                data=data,
                kwargs=kwargs,
            )

    def get_target_url(self, target_url_name=None, urlconf=None, args=None, kwargs=None, current_app=None):
        assert any((target_url_name, self.target_url_name)), "target_name of self.target_name should be defined"
        use_target = target_url_name if target_url_name else self.target_url_name
        return reverse(use_target, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app)

    def setUp(self) -> None:
        self.test_uid = uuid4().hex
        self.logger = logging.getLogger(f"test.{self.__class__.__name__}.{self.test_uid}")
        self.logger.info(f"Starting test with UID({self.test_uid}")

        self.api_client = self._ApiClient(self)
        self.addCleanup(lambda: self.logger.info(f"Finishing test with UID({self.test_uid}"))
