from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from mptt.forms import TreeNodeMultipleChoiceField
from nested_inline.admin import NestedTabularInline, NestedStackedInline, NestedModelAdmin
from oidc_provider.admin import ClientAdmin
from oidc_provider.models import Client
from polymorphic_tree.admin.childadmin import PolymorphicMPTTChildModelAdmin
from polymorphic_tree.admin.parentadmin import PolymorphicMPTTParentModelAdmin

from . import models


@admin.register(models.GroupNode)
class BaseChildAdmin(PolymorphicMPTTChildModelAdmin):
    GENERAL_FIELDSET = (None, {
        'fields': ('parent', 'name'),
    })

    base_model = models.BaseTreeNode
    base_fieldsets = (
        GENERAL_FIELDSET,
    )


@admin.register(models.PermissionNode)
class PermissionNodeAdmin(BaseChildAdmin):
    list_display = ('name', 'description')
    list_display_links = list_display
    ordering = ('name',)
    search_fields = list_display


@admin.register(models.BaseTreeNode)
class TreeNodeParentAdmin(PolymorphicMPTTParentModelAdmin):
    base_model = models.BaseTreeNode
    child_models = (
        models.GroupNode,
        models.PermissionNode,
    )

    list_display = ('name', 'actions_column',)

    class Media:
        css = {
            'all': ('admin/treenode/admin.css',)
        }


class SocialSecretsInLine(NestedTabularInline):
    model = models.SocialSecret
    extra = 0
    fk_name = 'oidc_client_extra'


class TreeNodeMultipleChoiceFieldModified(TreeNodeMultipleChoiceField):
    def _get_level_indicator(self, obj):
        level = getattr(obj, obj._mptt_meta.level_attr)
        if not level:
            return mark_safe('')
        return mark_safe('&#9474;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' * (level - 1) + self.level_indicator)


class OidcClientExtraInLine(NestedStackedInline):
    model = models.OidcClientExtra
    extra = 0
    max_num = 1
    min_num = 1
    fk_name = 'oidc_client'
    inlines = [SocialSecretsInLine]
    readonly_fields = ('ed25519_private_key_hex', 'ed25519_public_key_hex', 'get_default_permissions_admin', 'get_limited_permissions_admin')
    filter_horizontal = ('default_permissions', 'limited_permissions')
    fieldsets = (
        (None, {'fields': ('oidc_client', 'user', 'ed25519_private_key_hex', 'ed25519_public_key_hex')}),
        ('Permissions', {'fields': (
            ('default_permissions', 'get_default_permissions_admin'),
            ('limited_permissions', 'get_limited_permissions_admin'),
        )})
    )

    def get_default_permissions_admin(self, instance):
        return format_html('<table width="100%"><tr>{}</tr></table>'.format('</tr><tr>'.join(['<td><code>{}</code></td><td>{}<td>'.format(_.name, _.description) for _ in instance.get_default_permissions()])))

    get_default_permissions_admin.short_description = 'Default permissions'

    def get_limited_permissions_admin(self, instance):
        return format_html('<table width="100%"><tr>{}</tr></table>'.format('</tr><tr>'.join(['<td><code>{}</code></td><td>{}<td>'.format(_.name, _.description) for _ in instance.get_limited_permissions()])))

    get_limited_permissions_admin.short_description = 'Limited permissions'

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """
        Get a form Field for a ManyToManyField.
        """
        db = kwargs.get('using')

        kwargs['queryset'] = self.get_field_queryset(db, db_field, request)
        # kwargs['widget'] = FilteredSelectMultiple(
        #     db_field.verbose_name,
        #     db_field.name in self.filter_vertical
        # )
        kwargs['level_indicator'] = '&#9500;&#9472;'
        kwargs['required'] = False

        form_field = TreeNodeMultipleChoiceFieldModified(**kwargs)
        return form_field


class ExternalClientGrantTypeConfigurationInLine(admin.TabularInline):
    model = models.ExternalClientGrantTypeConfiguration
    extra = 0
    fk_name = 'source_client'
    inlines = []

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """
        Get a form Field for a ManyToManyField.
        """
        db = kwargs.get('using')

        kwargs['queryset'] = self.get_field_queryset(db, db_field, request)
        # kwargs['widget'] = FilteredSelectMultiple(
        #     db_field.verbose_name,
        #     db_field.name in self.filter_vertical
        # )
        kwargs['level_indicator'] = '&#9500;&#9472;'
        kwargs['required'] = False

        form_field = TreeNodeMultipleChoiceFieldModified(**kwargs)
        return form_field


class OidcClientAdmin(ClientAdmin, NestedModelAdmin):
    inlines = [OidcClientExtraInLine, ExternalClientGrantTypeConfigurationInLine]


admin.site.unregister(Client)
admin.site.register(Client, OidcClientAdmin)
