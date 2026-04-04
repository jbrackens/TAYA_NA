from aws_rest_default import settings as rest_settings
from django.conf.urls import url
from django.views.generic.base import TemplateView

AWS_REST_DEFAULT_TEMPLATE = rest_settings.get('AWS_REST_DEFAULT_TEMPLATE')

urlpatterns = [
    url(r'^password-reset$', TemplateView.as_view(template_name=AWS_REST_DEFAULT_TEMPLATE), name='profile__password_reset'),
    url(r'^email-validation$', TemplateView.as_view(template_name=AWS_REST_DEFAULT_TEMPLATE), name='profile__email_verify'),
]
