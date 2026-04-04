from django.db import models

from common.models import AbstractSimpleModel


class StoredEventsModel(AbstractSimpleModel):
    class StatusEnum(models.TextChoices):
        PENDING = "P"
        SEND = "S"

    status = models.CharField(max_length=1, choices=StatusEnum.choices, default=StatusEnum.PENDING)
    correlation_id = models.CharField(max_length=200, db_index=True, blank=True, default="")
    send_at = models.DateTimeField(db_index=True)
    data = models.TextField()
