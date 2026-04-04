from django.contrib import admin

from . import models


@admin.register(models.PartnerTransactionApiKeys)
class PartnerTransactionApiKeysAdmin(admin.ModelAdmin):
    list_display = ('partner', 'public_key')
    search_fields = ('partner', 'public_key')
    readonly_fields = ('public_key', 'private_key')


@admin.register(models.ExternalOrder)
class ExternalOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_status_display', 'external_transaction_id',
                    'total_amount', 'partner', 'created_at', 'updated_at',
                    )
