import uuid

from django.db import models


class CommonManager(models.Manager):
    def get_by_natural_key(self, object_id):
        return self.get(object_id=object_id)

    def super_filter(self, *args, **kwargs):
        return super().filter(*args, **kwargs)

    def filter(self, *args, **kwargs):
        if "is_deleted" in kwargs:
            return super().filter(*args, **kwargs)
        return super().filter(*args, is_deleted=False, **kwargs)

    def all(self):
        return super().all().filter(is_deleted=False)


class AbstractSimpleModel(models.Model):
    object_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def natural_key(self) -> str:
        return str(self.object_id)

    str_extra_fields = tuple()

    def __repr__(self) -> str:
        return self.__str__()

    def __str__(self):
        extra_dict = {field: getattr(self, field) for field in self.str_extra_fields}
        if hasattr(self, "sub"):
            extra_dict["sub"] = str(self.sub)
        extra_dict["object_id"] = str(self.object_id)
        extra_str = ", ".join([f"{field}={repr(value)}" for field, value in extra_dict.items()])
        return f"{self._meta.label}({extra_str})"

    @property
    def arn(self):
        return f"arn::virtual_store::model::{self._meta.label_lower}::{self.object_id}"

    class Meta:
        abstract = True


class AbstractUuidModel(AbstractSimpleModel):
    is_deleted = models.BooleanField(default=False, db_index=True)

    objects = CommonManager()
    all_objects = models.Manager()

    def real_delete(self, *args, **kwargs):
        return super().delete(*args, **kwargs)

    def delete(self, using=None, *args, **kwargs):
        self.is_deleted = True
        self.save(force_update=True, using=using, update_fields=["is_deleted"])

    class Meta:
        abstract = True


class AbstractUuidWithSubModel(AbstractUuidModel):
    sub = models.UUIDField(default=uuid.uuid4, db_index=True)

    class Meta:
        abstract = True
