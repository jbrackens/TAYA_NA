import logging

from user_context.schemas.common import UserContextBaseSchema

logger = logging.getLogger(__name__)


class UserCreateSchema(UserContextBaseSchema):
    sub: str
