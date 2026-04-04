import logging

from django.contrib import admin
from django.db import transaction
from django.utils.timezone import now
from requests import RequestException

from . import models
from .client import SendingException

logger = logging.getLogger(__name__)


@admin.register(models.StoredEventsModel)
class StoredEventsModelAdmin(admin.ModelAdmin):
    list_display = ("object_id", "status", "send_at", "created_at", "updated_at")
    list_filter = ("status", "created_at")
    readonly_fields = list_display + ("data",)
    ordering = [
        "status",
        "created_at",
    ]

    def send_pending(self, request, queryset):  # noqa
        from .client import IngestorClient

        futures = list()
        with transaction.atomic():
            queryset = queryset.select_for_update()
            for item in queryset:
                assert isinstance(item, models.StoredEventsModel)
                logger.info(f"Processing event({item.object_id}) for correlation_id={item.correlation_id}")
                try:
                    future = IngestorClient.send_raw(data=item.data)
                    futures.append((future, item))
                except (RequestException, SendingException) as e:
                    logger.exception(
                        f"Processing event({item.object_id}) for correlation={item.correlation_id} thrown an error: {e}"
                    )
                    item.send_at = now()
                    item.save(update_fields=("send_at",))
            try:
                for future, item in futures:
                    with transaction.atomic():
                        try:
                            IngestorClient.handle_result(future)
                            logger.info(
                                f"Event({item.object_id}) for correlation={item.correlation_id} send successfully"
                            )
                            item.status = models.StoredEventsModel.StatusEnum.SEND
                            item.send_at = now()
                            item.save(update_fields=("status", "send_at"))
                        except Exception as e:
                            logger.exception(
                                f"Processing event({item.object_id}) for correlation={item.correlation_id} thrown an error: {e}"
                            )
                            item.send_at = now()
                            item.save(update_fields=("send_at",))
            except Exception as e:
                logger.exception(f"Fatal exception: {e} - some changes stored and status for some Events can be wrong!")

    actions = [send_pending]
