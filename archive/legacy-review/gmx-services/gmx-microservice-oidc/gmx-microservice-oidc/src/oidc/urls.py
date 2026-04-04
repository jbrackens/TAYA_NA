from django.conf.urls import url
from django.contrib.auth.views import LogoutView

from project.dictionary_view import DictionariesView
from . import views

urlpatterns = [
    url(r'^login/?$', views.CustomClientLoginView.as_view()),
    url(r'^logout/?$', LogoutView.as_view()),
    url(r'^dictionaries/?$', DictionariesView.as_view()),
]
