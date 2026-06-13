from uuid import uuid4

from aws_rest_default.handlers import JWT_ORIGINATOR_PAYLOAD_KEY
from aws_rest_default.permissions import TokenHasResourceScope, TokenHasScope
from aws_rest_default.schema import DefaultGmxSchema, GmxSchemaGenerator
from aws_rest_default.views import DefaultJsonRestViewMixing
from rest_framework import generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import SAFE_METHODS

from oidc.authentication_backends import OidcJsonTokenAuth
from profiles import models
from profiles.serializers import admin_profile as serializers


class SocialAccountDetailListAPIView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    required_scopes = ("oidc:admin:profile:social_account",)
    serializer_class = serializers.CustomUserSocialAccountDetailsSerializer
    http_method_names = ["get", "post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    lookup_url_kwarg = "user_sub"

    schema = DefaultGmxSchema(
        tags=["admin - profile - social"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": [
                {
                    "object_id": str(uuid4()),
                    "social_account_type": models.SocialAccountDetails.SocialTypeChoices.WECHAT,
                    "social_account_id": "ex1234567",
                    "social_account_extra": {"email": "fancy_gremlin@example.com"},
                },
                {
                    "object_id": str(uuid4()),
                    "social_account_type": models.SocialAccountDetails.SocialTypeChoices.CHINA_MOBILE,
                    "social_account_id": uuid4().hex,
                    "social_account_extra": {"secondary": uuid4().hex},
                },
            ]
        },
    )

    def perform_create(self, serializer):
        audience = self.request.auth.get("aud")
        user = models.CustomUser.objects.filter(
            originator__oidc_client_extra__oidc_client__client_id=audience,
            sub=self.kwargs.get(self.lookup_url_kwarg),
        ).first()
        if user is None:
            raise NotFound({self.lookup_url_kwarg: "unable to find user"})
        serializer.save(user=user)

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        user_sub = self.kwargs.get(self.lookup_url_kwarg)

        user = models.CustomUser.objects.filter(
            originator__oidc_client_extra__oidc_client__client_id=audience,
            sub=user_sub,
        ).first()

        if user is None:
            raise NotFound({self.lookup_url_kwarg: "unable to find user"})

        qs = models.SocialAccountDetails.objects.filter(
            user__originator__oidc_client_extra__oidc_client__client_id=audience,
            user__sub=user_sub,
        )
        return qs

    def filter_queryset(self, queryset):
        return queryset


class SocialAccountDetailRUDAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:admin:profile:social_account",)
    serializer_class = serializers.CustomUserSocialAccountUpdateSerializer
    http_method_names = ["get", "patch", "delete", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    user_url_kwarg = "user_sub"
    social_account_type_url_kwarg = "social_account_type"

    schema = DefaultGmxSchema(
        tags=["admin - profile - social"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "social_account_type": models.SocialAccountDetails.SocialTypeChoices.WECHAT,
                "social_account_id": "ex1234567",
                "social_account_extra": {"email": "fancy_gremlin@example.com"},
            }
        },
    )

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())

        obj = generics.get_object_or_404(
            queryset, social_account_type=self.kwargs.get(self.social_account_type_url_kwarg)
        )
        return obj

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        qs = models.SocialAccountDetails.objects.filter(
            user__originator__oidc_client_extra__oidc_client__client_id=audience,
            user__sub=self.kwargs.get(self.user_url_kwarg),
        )
        return qs

    def filter_queryset(self, queryset):
        return queryset


class ChangePasswordByAdminApiView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    http_method_names = (
        "post",
        "options",
    )
    serializer_class = serializers.ChangePasswordByAdmin
    required_scopes = ("oidc:admin:profile:password:write",)
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasScope,)
    schema = DefaultGmxSchema(
        tags=["admin - profile - utils"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={"example-1": {"sub": f"gmx_{uuid4().hex}"}},
        example_requests={
            "example-1": {
                "login_type": "email",
                "login": "example@example.com",
                "new_password": "Sup3S3cretP4$$w0rd",
            }
        },
    )


class CustomProfileCreateListApiView(DefaultJsonRestViewMixing, generics.ListCreateAPIView):
    http_method_names = ("get", "post", "options")
    required_scopes = ("oidc:admin:profile",)
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["admin - profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": [
                {
                    "sub": "gmx_26d74f1156f645908c02b9b03fc16c96",
                    "username": "admin",
                    "email": "admin@example.com",
                    "phone_number": None,
                    "originator": {
                        "sub": "d5414fa8-9f62-45d4-9324-e2b56ae1f51f",
                        "name1": "Rewards Matrix",
                        "name2": "Flipsports Limited",
                        "website": "https://flipsports.com",
                    },
                    "company": None,
                    "date_joined": "2020-08-25T14:44:07.607167Z",
                    "is_limited": True,
                    "date_of_birth": None,
                    "date_of_birth_verified": False,
                    "display_name": "RemarkableCase2366543026",
                    "first_name": "",
                    "middle_name": "",
                    "last_name": "",
                    "gender": "U",
                    "timezone": "GMT",
                    "addresses": [],
                    "emails": [
                        {
                            "object_id": "971f1a48-58cd-45aa-84c5-746ea0b002d5",
                            "is_primary": True,
                            "is_verified": True,
                            "email": "admin@example.com",
                        }
                    ],
                    "phone_numbers": [],
                    "is_active": True,
                    "is_test_user": False,
                    "is_temporary": False,
                }
            ]
        },
    )

    def get_queryset(self):
        company_sub = self.request.auth.get("extra", dict()).get(JWT_ORIGINATOR_PAYLOAD_KEY)
        return models.CustomUser.objects.filter(is_company=False, originator__company__sub=company_sub)

    def get_serializer_class(self):
        if self.request and self.request.method not in SAFE_METHODS:
            return serializers.CreateAdminProfileSerializer
        return serializers.AdminProfileSerializer

    def perform_create(self, serializer):
        company_sub = self.request.auth.get("extra", dict()).get(JWT_ORIGINATOR_PAYLOAD_KEY)
        originator = models.CustomUser.objects.filter(is_company=True, company__sub=company_sub).first()
        serializer.save(originator=originator)


class CustomProfileRUDAPIView(DefaultJsonRestViewMixing, generics.RetrieveUpdateDestroyAPIView):
    required_scopes = ("oidc:admin:profile",)
    serializer_class = serializers.AdminProfileSerializer
    http_method_names = ["get", "patch", "delete", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)

    user_url_kwarg = "user_sub"

    schema = DefaultGmxSchema(
        tags=["admin - profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "social_account_type": models.SocialAccountDetails.SocialTypeChoices.WECHAT,
                "social_account_id": "ex1234567",
                "social_account_extra": {"email": "fancy_gremlin@example.com"},
            }
        },
    )

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        obj = generics.get_object_or_404(queryset)
        return obj

    def get_queryset(self):
        audience = self.request.auth.get("aud")
        qs = models.CustomUser.objects.filter(
            originator__oidc_client_extra__oidc_client__client_id=audience,
            sub=self.kwargs.get(self.user_url_kwarg),
        )
        return qs

    def filter_queryset(self, queryset):
        return queryset


class UpdateUsersLastSeenView(DefaultJsonRestViewMixing, generics.CreateAPIView):
    required_scopes = ("oidc:admin:profile:last_seen:write",)
    serializer_class = serializers.UserLastSeenSerializer
    permission_classes = (TokenHasScope,)
    http_method_names = ["post", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    schema = DefaultGmxSchema(
        tags=["admin - profile - utils"],
        authentication_schema_types=(
            GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,
            GmxSchemaGenerator.SecuritySchemas.JWT_INTERNAL,
        ),
        example_requests={
            "example-1": {
                "sub": f"gmx_{uuid4().hex}",
            }
        },
        example_responses={
            "example-1": {"sub": f"gmx_{uuid4().hex}", "updated": True},
        },
    )


class AddressSetVerifiedAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:admin:profile:address",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.AddressVerifiedSerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["admin - profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_requests={"example-1": {"is_verified": True}},
        example_responses={
            "example-1": {
                "line_1": "Long Ming Lu 1897",
                "city": "ShangHai",
                "post_code": "201101",
                "region": "Shanghai",
                "object_id": str(uuid4()),
                "is_verified": True,
            }
        },
    )

    def get_queryset(self):
        company_sub = self.request.auth.get("extra", dict()).get(JWT_ORIGINATOR_PAYLOAD_KEY)
        return models.Address.objects.filter(user__originator__company__sub=company_sub).all()


class EmailSetVerifiedAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:admin:profile:email",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.EmailVerifiedSerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["admin - profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_requests={"example-1": {"is_verified": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "email": "fancy_gremlin@example.com",
            }
        },
    )

    def get_queryset(self):
        company_sub = self.request.auth.get("extra", dict()).get(JWT_ORIGINATOR_PAYLOAD_KEY)
        return models.Email.objects.filter(user__originator__company__sub=company_sub).all()


class PhoneSetVerifiedAPIView(DefaultJsonRestViewMixing, generics.UpdateAPIView):
    required_scopes = ("oidc:admin:profile:phone_number",)
    lookup_url_kwarg = "object_id"
    lookup_field = "object_id"
    serializer_class = serializers.PhoneVerifiedSerializer
    http_method_names = ["patch", "options"]
    authentication_classes = (OidcJsonTokenAuth,)
    permission_classes = (TokenHasResourceScope,)
    schema = DefaultGmxSchema(
        tags=["admin - profile"],
        authentication_schema_types=(GmxSchemaGenerator.SecuritySchemas.JWT_SERVICE,),
        example_requests={"example-1": {"is_verified": True}},
        example_responses={
            "example-1": {
                "object_id": str(uuid4()),
                "is_primary": True,
                "is_verified": True,
                "email": "fancy_gremlin@example.com",
            }
        },
    )

    def get_queryset(self):
        company_sub = self.request.auth.get("extra", dict()).get(JWT_ORIGINATOR_PAYLOAD_KEY)
        return models.Phone.objects.filter(user__originator__company__sub=company_sub).all()
