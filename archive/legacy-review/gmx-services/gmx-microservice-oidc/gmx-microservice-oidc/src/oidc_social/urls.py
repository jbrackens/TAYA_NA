from django.conf.urls import url

from oidc_social.social.facebook import FaceBookLoginRedirectView
from oidc_social.social.google import GoogleLoginRedirectView
from oidc_social.social.twitter import TwitterLoginRedirectView
from . import views

urlpatterns = [
    url(r'^fb/(?P<key>[a-zA-Z0-9_\-]+)/?$', FaceBookLoginRedirectView.as_view(), name='fb'),
    url(r'^gp/(?P<key>[a-zA-Z0-9_\-]+)/?$', GoogleLoginRedirectView.as_view(), name='g+'),
    url(r'^tw/(?P<key>[a-zA-Z0-9_\-]+)/?$', TwitterLoginRedirectView.as_view(), name='tw'),

    url(r'^response/?$', views.RedirectUriResponseView.as_view(), name='oauth_response'),
    url(r'^response/tw/?$', views.OAuth1RedirectUriResponseView.as_view(), name='oauth_response_tw'),

    url(r'^token/?$', views.SocialTokenView.as_view(), name='token'),
]
