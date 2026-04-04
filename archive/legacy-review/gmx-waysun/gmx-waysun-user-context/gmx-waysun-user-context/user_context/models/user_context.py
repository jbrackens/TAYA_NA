from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import backref, relationship

from .base_class import BaseModel


class PartnerModel(BaseModel):
    _repr_columns = "sub"

    sub = sa.Column(UUID(as_uuid=True), sa.ColumnDefault(uuid4), unique=True, nullable=False)
    name = sa.Column(sa.Unicode(200), nullable=True)


class UserModel(BaseModel):
    _repr_columns = ("id", "sub")

    sub = sa.Column(sa.Unicode(36), unique=True, index=True, nullable=False)


class UserContextModel(BaseModel):
    _repr_columns = ("context_id",)

    context_id = sa.Column(UUID(as_uuid=True), sa.ColumnDefault(uuid4), unique=True, nullable=False)
    context = sa.Column(MutableDict.as_mutable(sa.JSON))

    user_id = sa.Column(
        sa.Integer, sa.ForeignKey(UserModel.id, ondelete="RESTRICT"), unique=True, index=True, nullable=False
    )
    user = relationship(
        UserModel, backref=backref("user_context", uselist=False), lazy="select", uselist=False, innerjoin=True
    )

    partner_id = sa.Column(sa.Integer, sa.ForeignKey(PartnerModel.id, ondelete="RESTRICT"), index=True, nullable=False)
    partner = relationship(
        PartnerModel, backref=backref("user_context", uselist=False), lazy="select", uselist=False, innerjoin=True
    )
