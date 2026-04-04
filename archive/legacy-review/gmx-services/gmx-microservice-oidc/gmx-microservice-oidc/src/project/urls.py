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
from django.conf.urls import url
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.decorators.csrf import csrf_exempt
from rest_framework.documentation import include_docs_urls

from oidc.views import TokenView
from .health_check import health_check

urlpatterns = [
    url(r'^health_check/?', health_check),
    path('oidc_admin/', admin.site.urls),
    url(r'^oidc_docs/', include_docs_urls(title='OIDC REST Docs', public=False)),
    # ------------------------------------------------------
    url(r'^oidc/', include(('oidc.urls', 'oidc'))),
    url(r'^oidc/', include(('oidc_temp_user.urls', 'oidc_temp_user'))),
    url(r'^oidc/rest/?', include(('oidc_rest.urls', 'oidc_rest'))),
    url(r'^oidc/social/', include(('oidc_social.urls', 'oidc_social'))),
    # ------------------------------------------------------
    url(r'^oidc/data_export/', include(('data_export.urls', 'data_export'))),
    # ------------------------------------------------------
    url(r'^openid/token/?$', csrf_exempt(TokenView.as_view())),
    url(r'^openid/', include(('oidc_provider.urls', 'oidc_provider'))),
    # ------------------------------------------------------
    url(r'oidc/', include(('project.frontend_urls', 'frontend'))),  # URL used on frontend
    # ------------------------------------------------------
    re_path(r'', include('aws_rest_default.urls')),

]

admin.site.site_header = '[GMX OIDC] Admin Panel'
admin.site.site_title = '[GMX OIDC] Admin Panel'
