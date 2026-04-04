from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

from oidc.admin import TreeNodeMultipleChoiceFieldModified
from profiles.forms import CustomUserChangeForm, CustomUserCreationForm
from . import models


class AddressInLine(admin.StackedInline):
    model = models.Address
    fields = (
        ('country', 'region'), ('line_1', 'line_2'), ('city', 'post_code',), 'is_primary', 'is_verified'
    )
    readonly_fields = ('is_primary', 'is_verified')
    extra = 0


class EmailInLine(admin.TabularInline):
    model = models.Email
    fields = ('email', 'is_primary', 'is_verified')
    readonly_fields = ('is_primary', 'is_verified')
    extra = 0


class PhoneInLine(admin.TabularInline):
    model = models.Phone
    fields = ('phone_number', 'is_primary', 'is_verified')
    readonly_fields = ('is_primary', 'is_verified')
    extra = 0


@admin.register(models.CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'sub', 'display_name', 'email', 'first_name', 'last_name', 'originator', 'is_company', 'is_staff', 'is_superuser', 'is_limited', 'is_temporary', 'is_active')
    list_filter = ('originator', 'is_company', 'is_staff', 'is_superuser', 'is_limited', 'is_temporary', 'is_active')
    search_fields = ('username', 'sub', 'first_name', 'last_name', 'display_name', 'emails__email')
    readonly_fields = ('sub', 'last_login', 'date_joined', 'updated_at', 'get_oidc_permissions_admin', 'email',)
    fieldsets = (
        (None, {'fields': ('username', 'password', 'sub')}),
        ('Personal info', {'fields': ('first_name', 'middle_name', 'last_name', 'email', 'date_of_birth', 'date_of_birth_verified', 'gender', 'timezone')}),
        ('RMX', {'fields': ('originator', 'is_company', 'company')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_limited', 'is_temporary')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'updated_at')}),
        ('RMX Permissions', {'fields': (('oidc_permissions', 'get_oidc_permissions_admin'),)}),
    )
    inlines = (
        EmailInLine,
        AddressInLine,
        PhoneInLine
    )
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'originator', 'is_company', 'company', 'is_temporary'),
        }),
    )

    def get_oidc_permissions_admin(self, instance):
        return format_html('<table width="100%"><tr>{}</tr></table>'.format('</tr><tr>'.join(['<td><code>{}</code></td><td>{}<td>'.format(_.name, _.description) for _ in instance.get_oidc_permissions()])))

    get_oidc_permissions_admin.short_description = 'OIDC forced permissions'

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


@admin.register(models.Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name1', 'name2', 'website')
    search_fields = list_display
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('name1', 'name2', 'website')}),
        ('Address', {'fields': ('country', 'line_1', 'line_2', 'city', 'post_code', 'region')}),
        ('Important dates', {'fields': ('created_at', 'updated_at')})
    )
    ordering = ('name1',)
