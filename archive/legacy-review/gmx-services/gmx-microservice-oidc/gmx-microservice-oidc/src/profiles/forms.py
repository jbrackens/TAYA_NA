from django.contrib.auth.forms import UserChangeForm, UsernameField, UserCreationForm

from . import models


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = models.CustomUser
        fields = '__all__'
        field_classes = {'username': UsernameField}


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = models.CustomUser
        fields = ("username", 'originator', 'is_company', 'company', 'is_temporary')
        field_classes = {'username': UsernameField}
