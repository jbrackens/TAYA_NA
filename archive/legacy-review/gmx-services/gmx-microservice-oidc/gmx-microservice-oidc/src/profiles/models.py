import uuid

import pytz
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
from phonenumber_field.validators import validate_international_phonenumber

from oidc.models import BaseTreeNode, PermissionNode
from profiles.managers import CustomUserManager
from . import utils


class AbstractUuidModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)

    class Meta:
        abstract = True


class AbstractIsPrimary(models.Model):
    is_primary = models.BooleanField(default=False)

    IS_PRIMARY_GROUPED_BY_FIELD = None

    def set_as_primary(self, **kwargs):
        """
        Set's model as Primary.
        :param auto_save: If `auto_save` is True (default) automatically turns off this flag on other models grouped by IS_PRIMARY_GROUPED_BY_FIELD field
        :return: None
        :rtype: None
        """
        with cache.lock(self.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            if not self.is_primary:
                self.is_primary = True
                try:
                    self.full_clean()
                except ValidationError as e:
                    self.is_primary = False
                    raise e
                self.__class__.objects.filter(**{self.IS_PRIMARY_GROUPED_BY_FIELD: getattr(self, self.IS_PRIMARY_GROUPED_BY_FIELD), 'is_primary': True}).update(is_primary=False)
                self.save(update_fields=['is_primary'], legal_update=True, **kwargs)

    def save(self, *args, **kwargs):
        """
        Method protects against edit for verified entity
        """
        if kwargs.pop('legal_update', False):
            return models.Model.save(self, *args, **kwargs)
        if getattr(self, 'is_verified', False):
            raise ValidationError('Unable to edit verified entity')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_primary:
            raise ValidationError('You can NOT remove primary object')
        return super().delete(*args, **kwargs)

    class Meta:
        abstract = True


class AbstractIsVerified(models.Model):
    is_verified = models.BooleanField(default=False)

    def set_verified(self):
        """
        Method used to set Model as verified.

        :param auto_save:  Perform Save action on this field when value has been changed?
        :return: None
        :rtype: None
        """
        with cache.lock(self.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            if not self.is_verified:
                self.is_verified = True
                try:
                    self.full_clean()
                except ValidationError as e:
                    self.is_verified = False
                    raise e
                self.save(update_fields=['is_verified'], legal_update=True)

    def save(self, *args, **kwargs):
        """
        Method protects against edit for verified entity
        """
        if kwargs.pop('legal_update', False):
            return models.Model.save(self, *args, **kwargs)
        if self.is_verified:
            raise ValidationError('Unable to edit verified entity')
        return super().save(*args, **kwargs)

    class Meta:
        abstract = True


class Email(AbstractUuidModel, AbstractIsPrimary, AbstractIsVerified):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='emails', on_delete=models.CASCADE)
    email = models.EmailField(unique=True)

    IS_PRIMARY_GROUPED_BY_FIELD = 'user'

    @staticmethod
    def get_arn(email):
        return 'oidc:profiles:email:{}'.format(email)

    @property
    def arn(self):
        return self.get_arn(self.email)

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors['is_primary'] = ValidationError('Can NOT set primary flag to unverified Email({})'.format(self.email), code='invalid')

        if errors:
            raise ValidationError(errors)

    class Meta:
        unique_together = (
            ('user', 'email'),
        )
        index_together = (
            ('user', 'email'),
            ('user', 'email', 'is_primary'),
        )

    def __str__(self):
        return '{} - {}'.format(self.user, self.email)


class Phone(AbstractUuidModel, AbstractIsPrimary, AbstractIsVerified):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='phones', on_delete=models.CASCADE)
    phone_number = PhoneNumberField(validators=[validate_international_phonenumber, ])

    IS_PRIMARY_GROUPED_BY_FIELD = 'user'

    @staticmethod
    def get_arn(user_sub, phone):
        return 'oidc:profiles:user:{}:phone:{}'.format(user_sub, phone)

    @property
    def arn(self):
        return self.get_arn(self.user.sub, self.phone_number)

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors['is_primary'] = ValidationError('Can NOT set primary flag to unverified Phone({})'.format(self.phone_number), code='invalid')

        if errors:
            raise ValidationError(errors)

    class Meta:
        unique_together = (
            ('user', 'phone_number'),
        )
        index_together = (
            ('user', 'phone_number'),
            ('user', 'phone_number', 'is_primary'),
        )

    def __str__(self):
        return '{} - {}'.format(self.user, self.phone_number)


class AbstractAddressModel(models.Model):
    COUNTRY_CHOICES = (
        ('uk', 'United Kingdom'),
    )

    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, default='uk')
    line_1 = models.CharField(max_length=100)
    line_2 = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=50)
    post_code = models.CharField(max_length=10)
    region = models.CharField(max_length=100, blank=True)

    class Meta:
        abstract = True


class Address(AbstractUuidModel, AbstractIsPrimary, AbstractIsVerified, AbstractAddressModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='addresses', on_delete=models.CASCADE)

    IS_PRIMARY_GROUPED_BY_FIELD = 'user'

    @staticmethod
    def get_arn(user_sub, pk):
        return 'oidc:profiles:user:{}:address:{}'.format(user_sub, pk)

    @property
    def arn(self):
        return self.get_arn(self.user.sub, self.pk)

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors['is_primary'] = ValidationError('Can NOT set primary flag to unverified Adress({})'.format(self), code='invalid')

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return '{} {}, {} {}, {} {}'.format(
            self.line_1,
            self.line_2,
            self.post_code, self.city,
            self.get_country_display(), self.region
        )

    class Meta:
        index_together = (
            ('user', 'is_primary'),
        )


class Company(AbstractUuidModel, AbstractAddressModel):
    name1 = models.CharField(max_length=100)
    name2 = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return 'Company - {}'.format(self.name1)

    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    RMX user model.

    Username and password are required. Other fields are optional.
    """
    GENDER_CHOICES = (
        ('U', 'Unknown'),
        ('M', 'Male'),
        ('F', 'Female')
    )
    TIMEZONE_CHOICES = tuple(zip(pytz.common_timezones, pytz.common_timezones))

    username = models.CharField(
        max_length=150,
        unique=True,
        help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
        validators=[UnicodeUsernameValidator()],
        error_messages={
            'unique': 'A user with that username already exists.',
        },
    )

    display_name = models.CharField(max_length=100, default=utils.get_random_display_name, unique=True)
    sub = models.CharField(max_length=36, default=utils.generate_user_sub, unique=True, editable=False)

    first_name = models.CharField(max_length=30, blank=True)
    middle_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)

    @property
    def email(self):
        email_instance = self.emails.filter(is_primary=True).first()
        if email_instance:
            return email_instance.email
        return None

    # @email.setter
    # def email(self, email_str):
    #     email = self.emails.filter(email=email_str).first()
    #     if email:
    #         email.set_as_primary()
    #     else:
    #         raise ValueError('Unable to find verified email object {}'.format(email_str))

    date_of_birth = models.DateField(null=True, blank=True)
    date_of_birth_verified = models.BooleanField(default=False)

    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    timezone = models.CharField(max_length=100, choices=TIMEZONE_CHOICES, default='GMT')

    originator = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, limit_choices_to={'is_company': True}, on_delete=models.PROTECT, related_name='introduced_users')
    is_company = models.BooleanField(default=False)
    company = models.ForeignKey(Company, null=True, blank=True, related_name='+', on_delete=models.CASCADE)

    is_staff = models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.')
    is_active = models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.')
    is_limited = models.BooleanField(default=True, help_text='User must confirm email to become not limited')

    is_temporary = models.BooleanField(default=False, help_text='User created as temporary user. If user is temporary, it can NOT login and is limited!')

    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    @staticmethod
    def get_arn(username):
        return 'oidc:profiles:custom_user:{}'.format(username)

    @property
    def arn(self):
        return self.get_arn(self.username)

    is_superuser = models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.')

    oidc_permissions = models.ManyToManyField(BaseTreeNode, related_name='+', blank=True)

    def get_oidc_permissions(self):
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        result = list(set(x for y in self.oidc_permissions.all() for x in y.get_descendants(include_self=True).instance_of(PermissionNode)))
        return sorted(result, key=lambda x: x.name)

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def get_full_name(self):
        """
        Returns the first_name plus the last_name, with a space in between.
        """
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        "Returns the short name for the user."
        return self.sub

    def email_user(self, subject, message, from_email=None, **kwargs):
        """
        Sends an email to this User.
        """
        send_mail(subject, message, from_email, [self.email], **kwargs)

    def activate_user(self, auto_save=True):
        """
        Method used to mark user as active
        """
        self.is_limited = False
        self.is_active = True
        self.is_temporary = False
        if auto_save:
            self.save(update_fields=['is_limited', 'is_active', 'is_temporary'])

    def deactivate_user(self, auto_save=True):
        """
        Method used to mark user as not active
        """
        self.is_active = False
        if auto_save:
            self.save(update_fields=['is_active'])

    def change_email(self, new_email):
        """
        Method used to change User's email
        :param new_email: new email to set
        :type new_email: Email, str
        """
        if isinstance(new_email, str):
            new_email_obj = self.emails.filter(email=new_email).first()
        else:
            new_email_obj = self.emails.filter(email=new_email.email).first()

        if new_email_obj is None:
            raise ValidationError({'email': ValidationError('Unable to find email associated with user.', code='invalid')})

        new_email_obj.set_as_primary()

    def clean(self):
        """
        Method used to validate user instance. Yields Validation error on fields that not match cross-validation
        :raise ValidationError: on fields that not-match cross validation
        """
        errors = {}
        if self.is_company and self.company is None:
            errors['is_company'] = [
                ValidationError('Can not set "is_company" when no Company is attached', code='invalid')
            ]
        if not self.is_company and self.company is not None:
            errors['is_company'] = [
                ValidationError('Can not set "company" when "is_company" flag is not set', code='invalid')
            ]

        if self.originator is None and not self.is_company:
            errors['originator'] = [
                ValidationError('User must have originator if is not a Company!')
            ]

        if self.is_temporary and (not self.is_active or not self.is_limited):
            errors['is_temporary'] = [
                ValidationError('User flagged as temporary can NOT have Active flag on!')
            ]

        if errors:
            raise ValidationError(errors)

    def get_originator_company(self):
        return getattr(getattr(self, 'originator', None), 'company', None)

    def __str__(self):
        return '{} ({})'.format(self.username, self.sub) if not self.is_company else '{}'.format(self.company.name1)
