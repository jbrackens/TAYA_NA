import re

from aws_rest_default.urls import AWS_REST_DEFAULT_TEMPLATE
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework.renderers import JSONOpenAPIRenderer
from rest_framework.schemas import get_schema_view

from profiles.views.profile import CompanyListAPIView, SignSignatureAPIView
from project.schema import OidcSchemaGenerator

schema_view = get_schema_view(
    title="OIDC API",
    version="v0.0.1",
    description="OIDC docs",
    public=True,
    renderer_classes=[JSONOpenAPIRenderer],
    generator_class=OidcSchemaGenerator,
)


urlpatterns = [
    path(
        "oidc_docs/",
        TemplateView.as_view(
            template_name="aws_rest_default/swagger-ui.html", extra_context={"schema_url": "schema-json"}
        ),
        name="swagger-ui",
    ),
    path(
        "oidc_docs/redoc/",
        TemplateView.as_view(template_name="aws_rest_default/redoc.html", extra_context={"schema_url": "schema-json"}),
        name="redoc",
    ),
    path("oidc_docs/schema.json", schema_view, name="schema-json"),
    path("oidc_admin/", admin.site.urls),
    path("openid/", include("oidc_provider.urls", namespace="oidc_provider")),
    path("oidc/admin/profile/", include("profiles.admin_urls", namespace="admin_profiles")),
    path("oidc/admin/companies", CompanyListAPIView.as_view(), name="company_list"),
    path("oidc/sign/<str:kid>", SignSignatureAPIView.as_view(), name="sign_payload"),
    path("oidc/profile/", include("profiles.urls", namespace="profiles")),
    path("oidc/antstream/", include("antstream.urls", namespace="antstream")),
    path("oidc/", include("oidc.urls", namespace="oidc")),
    path("oidc/", TemplateView.as_view(template_name=AWS_REST_DEFAULT_TEMPLATE), name="home"),
    path(
        "",
        include(("aws_rest_default.urls", "aws_rest_default"), namespace="aws_rest_default"),
    ),
] + [
    re_path(
        r"^%s(?P<path>.*)$" % re.escape(settings.STATIC_URL.lstrip("/")),
        serve,
        kwargs=dict(document_root=settings.STATIC_ROOT),
    ),
]
