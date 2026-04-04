from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base, declared_attr

from user_context import settings


class MinimalModel:
    _repr_columns = ("id",)

    # Generate __tablename__ automatically
    # noinspection PyMethodParameters,SpellCheckingInspection
    @declared_attr
    def __tablename__(cls):
        cls_name: str = cls.__name__
        if cls_name.endswith("Model"):
            cls_name = cls_name[:-5]
        return "".join(["_" + c.lower() if c.isupper() else c for c in cls_name]).lstrip("_")

    def _get_repr_columns(self):
        return self._repr_columns

    def __str__(self):
        return "{}({})".format(
            self.__class__.__name__,
            ", ".join(["{}={}".format(c_name, repr(getattr(self, c_name))) for c_name in self._get_repr_columns()]),
        )


MinimalBaseModel = declarative_base(cls=MinimalModel)


class BaseModel(MinimalBaseModel):
    __abstract__ = True
    _repr_columns = ("id",)
    id = sa.Column(sa.Integer, primary_key=True, index=True, unique=True, nullable=False)
    created_at = sa.Column(
        sa.DateTime(timezone=True),
        default=lambda: settings.DEFAULT_TIME_ZONE.localize(datetime.now()),
        index=True,
        nullable=False,
    )
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        default=lambda: settings.DEFAULT_TIME_ZONE.localize(datetime.now()),
        index=True,
        nullable=False,
    )
    is_deleted = sa.Column(sa.Boolean, default=False, index=True, nullable=False)
    deleted_at = sa.Column(sa.DateTime(timezone=True), nullable=True, index=True)

    def clean(self):
        pass
