from django.contrib import admin

from . import models


@admin.register(models.ExternalUserMappingModel)
class ExternalUserMappingModelAdmin(admin.ModelAdmin):
    fields = ('company', 'external_user_id', 'user')
    search_fields = (
        'company__name1', 'company__name2', 'company__id', 'user__sub', 'user__emails__email', 'external_user_id'
    )
    list_display = (
        'company', 'user', 'external_user_id'
    )
    list_filter = ('company',)
    raw_id_fields = ('user',)
