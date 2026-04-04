import re
from uuid import uuid4

from aws_rest_default.schema import GmxSchemaGenerator
from aws_rest_default.urls import AWS_REST_DEFAULT_TEMPLATE
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework.renderers import JSONOpenAPIRenderer
from rest_framework.schemas import get_schema_view

schema_view = get_schema_view(
    title="VIRTUAL STORE API",
    version="v0.0.1",
    description="VIRTUAL STORE docs",
    public=True,
    renderer_classes=[JSONOpenAPIRenderer],
    generator_class=GmxSchemaGenerator,
)

urlpatterns = [
    path(
        "virtual_store_docs/",
        TemplateView.as_view(
            template_name="aws_rest_default/swagger-ui.html", extra_context={"schema_url": "schema-json"}
        ),
        name="swagger-ui",
    ),
    path(
        "virtual_store_docs/redoc/",
        TemplateView.as_view(template_name="aws_rest_default/redoc.html", extra_context={"schema_url": "schema-json"}),
        name="redoc",
    ),
    path("virtual_store_docs/schema.json", schema_view, name="schema-json"),
    path("virtual_store_admin/", admin.site.urls),
    path("virtual_store/nested_admin/", include("nested_admin.urls")),
    path("virtual_store/", include("virtual_store.urls", namespace="virtual_store")),
    path("virtual_shop/antstream/", include("virtual_store.urls.antstream", namespace=uuid4().hex)),
    path("virtual_store/", TemplateView.as_view(template_name=AWS_REST_DEFAULT_TEMPLATE), name="home"),
    path("virtual_shop/", TemplateView.as_view(template_name=AWS_REST_DEFAULT_TEMPLATE), name="home_shop"),
    path("payment_gateway/", include("payment_gateway.urls", namespace="payment_gateway")),
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

admin.site.site_header = "[VIRTUAL STORE] Admin Panel"
admin.site.site_title = "[VIRTUAL STORE] Admin Panel"
