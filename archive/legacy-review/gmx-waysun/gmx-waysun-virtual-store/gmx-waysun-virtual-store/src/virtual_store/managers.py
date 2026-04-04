from django.contrib.auth.models import UserManager

from common.models import CommonManager


class CustomUserManager(CommonManager, UserManager):
    def filter_by_username(self, username, *filter_args, **filter_kwargs):
        return self.filter(*filter_args, username=username, **filter_kwargs)

    # def filter_by_sub(self, sub, *filter_args, **filter_kwargs):
    #     return self.filter(*filter_args, sub=sub, **filter_kwargs)

    def get_by_username(self, username):
        return self.filter_by_username(username=username).get()

    # def get_by_sub(self, sub):
    #     return self.filter_by_sub(sub=sub).get()

    def get_by_natural_key(self, username):
        return self.get(username=username)
