import logging

from user_context.schemas.common import UserContextBaseSchema

logger = logging.getLogger(__name__)


class UserContextCreateSchema(UserContextBaseSchema):
    context_id: str
    context: dict
    user_id: int
    partner_id: int


class UserContextUpdateSchema(UserContextBaseSchema):
    context: dict


class UserContextRequest(UserContextBaseSchema):
    context: dict


class UserContextResponse(UserContextBaseSchema):
    context: dict

    class Config:
        orm_mode = True
