from django.contrib.auth.models import UserManager


class CustomUserManager(UserManager):
    def _create_user(self, username, email, password, email_is_verified=False, **extra_fields):
        """
        Creates and saves a User with the given username, email and password.
        """
        if not username:
            raise ValueError('The given username must be set')
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        user.emails.create(email=email, is_verified=email_is_verified, is_primary=True)
        return user
