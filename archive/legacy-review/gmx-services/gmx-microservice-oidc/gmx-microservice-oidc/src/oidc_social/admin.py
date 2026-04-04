from django.contrib import admin

from . import models


@admin.register(models.SocialUserProfile)
class SocialUserProfileAdmin(admin.ModelAdmin):
    pass


@admin.register(models.SocialTokens)
class SocialTokensAdmin(admin.ModelAdmin):
    fields = ('user', 'social_type', 'social_token', 'oidc_client', 'created_at')
    readonly_fields = ('created_at',)
    list_display = ('user', 'get_social_type_display', 'oidc_client')
    list_filter = ('oidc_client', 'social_type')
    search_fields = ('user.sub', 'user.username', 'user.display_name')
