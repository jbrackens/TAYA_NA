from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from user_context.crud.base import CRUDBase
from user_context.models.user_context import PartnerModel, UserContextModel, UserModel
from user_context.schemas.user_context import UserContextCreateSchema


# noinspection PyMethodMayBeStatic
class CRUDUserContext(CRUDBase[UserContextModel, UserContextCreateSchema, UserContextCreateSchema]):
    def get_by_user_sub_and_partner_sub(
        self, db_session: Session, user_sub: str, partner_sub: UUID
    ) -> Optional[UserContextModel]:
        return (
            self.get_query(db_session)
            .join(PartnerModel)
            .join(UserModel)
            .filter(UserModel.sub == user_sub)
            .filter(PartnerModel.sub == partner_sub)
            .with_for_update()
            .first()
        )

    def lock_by(self, db_session: Session, *and_statement) -> Optional[UserContextModel]:
        return self.get_query(db_session).filter(*and_statement).with_for_update().one_or_none()


# noinspection PyTypeChecker
crud_user_context = CRUDUserContext(UserContextModel)
