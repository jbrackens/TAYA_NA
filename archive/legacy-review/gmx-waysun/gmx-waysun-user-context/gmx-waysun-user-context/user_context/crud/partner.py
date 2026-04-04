from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from user_context.models.user_context import PartnerModel
from user_context.schemas.partner import PartnerCreateSchema

from .base import CRUDBase


# noinspection PyMethodMayBeStatic
class CRUDPartner(CRUDBase[PartnerModel, PartnerCreateSchema, PartnerCreateSchema]):
    def is_exists_by_name(self, db_session: Session, *, name: str) -> bool:
        return self.is_exists_query(
            db_session=db_session, query=self.get_query(db_session).filter(PartnerModel.name == name)
        )

    def is_exists_by_sub(self, db_session: Session, *, sub: UUID) -> bool:
        return self.is_exists_query(
            db_session=db_session, query=self.get_query(db_session).filter(PartnerModel.sub == sub)
        )

    def get_by_name(self, db_session: Session, name: str) -> Optional[PartnerModel]:
        return self.get_query(db_session=db_session).filter(PartnerModel.name == name).first()

    def get_by_sub(self, db_session: Session, sub: UUID) -> Optional[PartnerModel]:
        return self.get_query(db_session).filter(PartnerModel.sub == sub).first()


# noinspection PyTypeChecker
crud_partner = CRUDPartner(PartnerModel)
