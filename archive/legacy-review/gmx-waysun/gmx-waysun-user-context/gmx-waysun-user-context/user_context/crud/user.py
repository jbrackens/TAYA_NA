from typing import Optional

from sqlalchemy.orm import Session

from user_context.crud.base import CRUDBase
from user_context.models.user_context import UserModel
from user_context.schemas.user import UserCreateSchema


# noinspection PyMethodMayBeStatic
class CRUDUser(CRUDBase[UserModel, UserCreateSchema, UserCreateSchema]):
    def get_by_user_sub(self, db_session: Session, user_sub: str) -> Optional[UserModel]:
        return self.get_query(db_session).filter(UserModel.sub == user_sub).first()

    def lock_by(self, db_session: Session, *and_statement) -> Optional[UserModel]:
        return self.get_query(db_session).filter(*and_statement).with_for_update().one_or_none()


# noinspection PyTypeChecker
crud_user = CRUDUser(UserModel)
