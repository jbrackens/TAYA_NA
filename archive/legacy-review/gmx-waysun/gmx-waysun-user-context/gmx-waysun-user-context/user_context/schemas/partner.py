import logging
from typing import Optional
from uuid import UUID

from user_context.schemas.common import UserContextBaseSchema

logger = logging.getLogger(__name__)


class PartnerCreateSchema(UserContextBaseSchema):
    sub: UUID
    name: Optional[str]
