import logging

from fastapi import Depends, Path
from sqlalchemy.orm import Session

from user_context.crud.user import crud_user
from user_context.models.user_context import UserModel
from user_context.schemas.user import UserCreateSchema
from user_context.services.database_service import DatabaseService

logger = logging.getLogger(__name__)


async def get_or_create_user(
    user_sub: str = Path(..., max_length=36), db_session: Session = Depends(DatabaseService.get_db)
) -> UserModel:
    current_user = crud_user.get_by_user_sub(db_session=db_session, user_sub=user_sub)
    if not current_user:
        data_to_store = UserCreateSchema(
            sub=user_sub,
        )
        logger.info(f"Creating user, with user_sub:{user_sub}")
        current_user = crud_user.create(db_session=db_session, obj_in=data_to_store)
    return current_user
