from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm, UsernameField
from django.utils.safestring import mark_safe
from html_sanitizer.django import get_sanitizer
from inline_actions.admin import InlineActionsMixin, InlineActionsModelAdminMixin

from common.admin import CommonModelAdmin, CommonModelTabularAdmin

from . import models


class SetPrimaryAndVerifiedActionsMixing:
    def get_inline_actions(self, request, obj=None):
        actions = list()
        if obj and not obj.is_deleted:
            if not obj.is_verified:
                actions.append("set_as_verified")
            elif not obj.is_primary:
                actions.append("set_as_primary")
        return actions + list(super().get_inline_actions(request, obj=obj))

    def set_as_primary(self, request, obj, parent_obj=None):
        if parent_obj:
            obj.set_as_primary()
            messages.info(request, f"{obj} set as primary")
        else:
            messages.warning(request, f"Parent object for {obj} not found!")

    def set_as_verified(self, request, obj, parent_obj=None):
        if parent_obj:
            obj.set_verified()
            messages.info(request, f"{obj} set as verified")
        else:
            messages.warning(request, f"Parent object for {obj} not found!")


class DeleteInLineActionsMixing:
    def get_inline_actions(self, request, obj=None):
        actions = list()
        if obj and not obj.is_deleted:
            actions.append("perform_delete_action")
        return actions + list(super().get_inline_actions(request, obj=obj))

    def perform_delete_action(self, request, obj, parent_obj=None):
        if parent_obj:
            obj.delete(legal_update=True)
            messages.info(request, f"{obj} marked as deleted")
        else:
            messages.warning(request, f"Parent object for {obj} not found!")

    perform_delete_action.short_description = "delete"


class AddressMixing:
    fields = (
        ("country", "region"),
        ("line_1", "line_2"),
        (
            "city",
            "post_code",
        ),
        "is_primary",
        "is_verified",
    )
    readonly_fields = ("is_primary", "is_verified")


class AddressInLine(
    AddressMixing,
    DeleteInLineActionsMixing,
    SetPrimaryAndVerifiedActionsMixing,
    InlineActionsMixin,
    CommonModelTabularAdmin,
):
    model = models.Address

    def get_max_num(self, request, obj: models.CustomUser = None, **kwargs):
        if obj and obj.originator_id:
            counter = obj.addresses.super_filter(is_deleted=True).count()
            return counter + obj.originator.company.max_addresses
        return super().get_max_num(request, obj=obj)


@admin.register(models.Address)
class AddressAdmin(AddressMixing, CommonModelAdmin):
    list_max_show_all = 1
    list_per_page = 1

    def has_module_permission(self, request):
        return False


class EmailMixing:
    fields = ("email", "is_primary", "is_verified")
    readonly_fields = ("is_primary", "is_verified")


class EmailInLine(
    EmailMixing,
    DeleteInLineActionsMixing,
    SetPrimaryAndVerifiedActionsMixing,
    InlineActionsMixin,
    CommonModelTabularAdmin,
):
    model = models.Email

    def get_max_num(self, request, obj: models.CustomUser = None, **kwargs):
        if obj and obj.originator_id:
            counter = obj.emails.super_filter(is_deleted=True).count()
            return counter + obj.originator.company.max_emails
        return super().get_max_num(request, obj=obj)


@admin.register(models.Email)
class EmailAdmin(EmailMixing, CommonModelAdmin):
    list_max_show_all = 1
    list_per_page = 1


class PhoneMixing:
    fields = ("phone_number", "is_primary", "is_verified")
    readonly_fields = ("is_primary", "is_verified")


class PhoneInLine(
    PhoneMixing,
    DeleteInLineActionsMixing,
    SetPrimaryAndVerifiedActionsMixing,
    InlineActionsMixin,
    CommonModelTabularAdmin,
):
    model = models.Phone

    def get_max_num(self, request, obj: models.CustomUser = None, **kwargs):
        if obj and obj.originator_id:
            counter = obj.phone_numbers.super_filter(is_deleted=True).count()
            return counter + obj.originator.company.max_phone_numbers
        return super().get_max_num(request, obj=obj)


@admin.register(models.Phone)
class PhoneAdmin(PhoneMixing, CommonModelAdmin):
    list_max_show_all = 1
    list_per_page = 1


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = models.CustomUser
        fields = ("username", "originator", "is_company", "company", "is_temporary", "is_limited", "is_test_user")
        field_classes = {"username": UsernameField}


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = models.CustomUser
        fields = "__all__"
        field_classes = {"username": UsernameField}


class CustomProfileSocialAccountsMixing:
    fields = (
        "social_account_type",
        "social_account_id",
        "social_account_extra",
    )


class CustomProfileSocialAccountsInLine(
    CustomProfileSocialAccountsMixing, DeleteInLineActionsMixing, InlineActionsMixin, CommonModelTabularAdmin
):
    model = models.SocialAccountDetails


@admin.register(models.SocialAccountDetails)
class SocialAccountDetailsAdmin(CustomProfileSocialAccountsMixing, CommonModelAdmin):
    list_max_show_all = 1
    list_per_page = 1


@admin.register(models.CustomUser)
class CustomUserAdmin(InlineActionsModelAdminMixin, UserAdmin):
    list_display = (
        "username",
        "sub",
        "first_name",
        "last_name",
        "email",
        "get_originators_company",
        "is_company",
        "is_staff",
        "is_superuser",
        "is_limited",
        "is_temporary",
        "is_active",
    )
    list_filter = ("originator", "is_company", "is_staff", "is_superuser", "is_limited", "is_temporary", "is_active")
    search_fields = (
        "username",
        "sub",
        "first_name",
        "last_name",
        "display_name",
        "emails__email",
        "phone_numbers__phone_number",
    )
    readonly_fields = (
        "sub",
        "last_login",
        "date_joined",
        "updated_at",
        "get_oidc_permissions_admin",
        "email",
        "phone_number",
    )
    raw_id_fields = ["originator"]
    fieldsets = (
        (None, {"fields": ("username", "password", "sub")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "middle_name",
                    "last_name",
                    ("email", "phone_number"),
                    (
                        "date_of_birth",
                        "date_of_birth_verified",
                    ),
                    "gender",
                    "timezone",
                )
            },
        ),
        ("GMX", {"fields": ("originator", "is_company", "company")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "is_limited", "is_temporary")}),
        ("GMX Permissions", {"fields": (("oidc_default_permissions_set", "get_oidc_permissions_admin"),)}),
        ("Admin Permissions", {"fields": ("groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined", "updated_at")}),
    )
    inlines = (EmailInLine, AddressInLine, PhoneInLine, CustomProfileSocialAccountsInLine)
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_select_related = (
        "company",
        "originator",
        "originator__company",
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2", "originator", "is_company", "company", "is_temporary"),
            },
        ),
    )

    def get_oidc_permissions_admin(self, instance: models.CustomUser):
        sanitizer = get_sanitizer("strict")
        msg = '<table width="100%"><tr>{}</tr></table>'.format(
            "</tr><tr>".join(
                [
                    "<td><code>{}</code></td><td>{}<td>".format(
                        sanitizer.sanitize(_.name), sanitizer.sanitize(_.description)
                    )
                    for _ in list(instance.oidc_permissions)
                ]
            )
        )
        return mark_safe(msg)  # nosec

    get_oidc_permissions_admin.short_description = "OIDC forced permissions"

    def get_originators_company(self, instance: models.CustomUser):
        sanitizer = get_sanitizer("strict")
        if instance and instance.originator and instance.originator.company:
            msg = sanitizer.sanitize(str(instance.originator.company.sub))
            return mark_safe(msg)  # nosec

    get_originators_company.short_description = "Originator"


@admin.register(models.Company)
class CompanyAdmin(CommonModelAdmin):
    list_display = ("sub", "name1", "name2", "website")
    search_fields = list_display
    fieldsets = (
        (None, {"fields": ("sub", ("name1", "name2", "website"))}),
        ("Address", {"fields": ("country", "line_1", "line_2", "city", "post_code", "region")}),
        ("Limitations", {"fields": ("max_phone_numbers", "max_emails", "max_addresses")}),
        ("Important dates", {"fields": ("created_at", "updated_at")}),
    )
    ordering = ("name1",)

    def get_readonly_fields(self, request, obj=None):
        s = list(super().get_readonly_fields(request, obj=obj))
        if obj is not None:
            s.append("sub")
        return s
