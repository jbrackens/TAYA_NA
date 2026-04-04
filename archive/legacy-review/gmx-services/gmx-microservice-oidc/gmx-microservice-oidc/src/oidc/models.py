from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from polymorphic_tree.models import PolymorphicMPTTModel, PolymorphicTreeForeignKey

from . import utils


class BaseTreeNode(PolymorphicMPTTModel):
    parent = PolymorphicTreeForeignKey('self',
                                       blank=True,
                                       null=True,
                                       on_delete=models.PROTECT,
                                       related_name='children',
                                       verbose_name='parent')
    name = models.CharField(max_length=100, db_index=True)

    class Meta(PolymorphicMPTTModel.Meta):
        verbose_name = 'Permission/group node'
        verbose_name_plural = 'Permissions and groups tree'

    def __str__(self):
        return '{}'.format(self.name)


class GroupNode(BaseTreeNode):
    def clean(self):
        self.name = self.name.replace(' ', '_').upper()
        return super().clean()

    class Meta:
        verbose_name = 'Group node'
        verbose_name_plural = 'Group nodes'


class PermissionNode(BaseTreeNode):
    description = models.CharField(max_length=100, blank=True)
    can_have_children = False
    can_be_root = False

    def clean(self):
        self.name = self.name.lower()
        return super().clean()

    class Meta:
        verbose_name = 'Permission node'
        verbose_name_plural = 'Permission nodes'


class OidcClientExtra(models.Model):
    oidc_client = models.OneToOneField('oidc_provider.Client', related_name='extra', on_delete=models.PROTECT,)
    default_permissions = models.ManyToManyField(BaseTreeNode, related_name='+', blank=True)
    limited_permissions = models.ManyToManyField(BaseTreeNode, related_name='+', blank=True)
    ed25519_private_key_hex = models.CharField(max_length=64, editable=False, unique=True, default=utils.get_private_ed25519_sign_key_hex)
    ed25519_public_key_hex = models.CharField(max_length=64, editable=False, unique=True, default='unknown')
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             limit_choices_to={'is_company': True},
                             related_name='oidc_client_extra',
                             on_delete=models.PROTECT,)

    def clean(self):
        errors = {}
        if not self.user.is_company:
            errors['user'] = [ValidationError('Only Company users can be attached to OIDC Extra Profile.', code='invalid')]
        if errors:
            raise ValidationError(errors)
        self.ed25519_public_key_hex = utils.get_public_ed25519_sign_key_hex(self.ed25519_private_key_hex)
        return super().clean()

    @property
    def ed25519_private_key(self):
        return utils.get_private_ed25519_sign_key(self.ed25519_private_key_hex)

    @property
    def ed25519_public_key(self):
        return utils.get_public_ed25519_sign_key(self.ed25519_private_key_hex)

    def __str__(self):
        return 'OIDC Extra config for {}({})'.format(self.oidc_client.name, self.oidc_client.client_id)

    def get_default_permissions(self):
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        result = list(set(x for y in self.default_permissions.all() for x in y.get_descendants(include_self=True).instance_of(PermissionNode)))
        return sorted(result, key=lambda x: x.name)

    def get_limited_permissions(self):
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        result = list(set(x for y in self.limited_permissions.all() for x in y.get_descendants(include_self=True).instance_of(PermissionNode)))
        return sorted(result, key=lambda x: x.name)


class SocialSecret(models.Model):
    # noinspection PyPep8Naming
    class SOCIAL_TYPE_CHOICES(object):
        FACEBOOK = 'fb'
        TWITTER = 'tw'
        GOOGLE_PLUS = 'g+'

        @classmethod
        def to_choices(cls):
            return (
                (cls.FACEBOOK, 'FACEBOOK'),
                (cls.TWITTER, 'TWITTER'),
                (cls.GOOGLE_PLUS, 'GOOGLE PLUS'),
            )

    oidc_client_extra = models.ForeignKey(OidcClientExtra, related_name='social_secrets', on_delete=models.PROTECT,)
    social_type = models.CharField(max_length=2, choices=SOCIAL_TYPE_CHOICES.to_choices())
    client_id = models.CharField(max_length=200)
    client_secret = models.CharField(max_length=200)

    def __str__(self):
        return 'SocialSecret({}) - {}'.format(self.get_social_type_display(), self.oidc_client_extra)

    class Meta:
        unique_together = (
            ('oidc_client_extra', 'social_type')
        )


class ExternalClientGrantTypeConfiguration(models.Model):
    """
    Model is used to set up configuration

    @url: https://flipsports.atlassian.net/wiki/display/RDM/RMX+Payment+Gateway+Integration#RMXPaymentGatewayIntegration-Generateid_tokenforanotherpartner
    """
    source_client = models.ForeignKey('oidc_provider.Client',
                                      related_name='+',
                                      help_text='Source OIDC Client ID trying to generate token',
                                      on_delete=models.PROTECT,)
    for_client = models.ForeignKey('oidc_provider.Client',
                                   related_name='+',
                                   help_text='OIDC client for which it is allowed to generate token with limited functionality only',
                                   on_delete=models.PROTECT,)
    permissions = models.ManyToManyField(BaseTreeNode, related_name='+', blank=True)

    def get_permissions(self):
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        result = list(set(x for y in self.permissions.all() for x in y.get_descendants(include_self=True).instance_of(PermissionNode)))
        return sorted(result, key=lambda x: x.name)

    class Meta:
        unique_together = (
            ('source_client', 'for_client'),
        )
