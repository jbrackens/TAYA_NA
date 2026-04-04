"""project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import re

from django.conf import settings
from django.conf.urls import url
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from rest_framework.documentation import include_docs_urls

urlpatterns = [
    path("virtual_shop_admin/", admin.site.urls),
    url(r"^virtual_shop_docs/", include_docs_urls(title="[VIRTUAL SHOP] REST Docs")),
    url(r"^virtual_shop/", include(("virtual_shop.urls", "virtual_shop"))),
    re_path(r"", include("aws_rest_default.urls")),
] + [
    re_path(
        r"^%s(?P<path>.*)$" % re.escape(settings.STATIC_URL.lstrip("/")),
        serve,
        kwargs=dict(document_root=settings.STATIC_ROOT),
    ),
]

admin.site.site_header = "[VIRTUAL SHOP] Admin Panel"
admin.site.site_title = "[VIRTUAL SHOP] Admin Panel"
