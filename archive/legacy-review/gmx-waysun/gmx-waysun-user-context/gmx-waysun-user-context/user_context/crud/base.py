from datetime import datetime
from logging import Logger
from typing import Generic, Optional, Type, TypeVar

from fastapi.encoders import jsonable_encoder
from sqlalchemy import false
from sqlalchemy.orm import Query, Session

from user_context import settings
from user_context.models.base_class import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


# noinspection PyMethodMayBeStatic
class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get_query(self, db_session: Session) -> Query:
        return db_session.query(self.model).filter(
            self.model.is_deleted == false(),
        )

    # noinspection PyMethodMayBeStatic
    def is_exists_query(self, db_session: Session, query: Query) -> bool:
        return db_session.query(query.exists()).first()[0]

    def get(self, db_session: Session, model_id: int) -> Optional[ModelType]:
        return self.get_query(db_session).filter(self.model.id == model_id).first()

    def paginate_query(self, query: Query, *, skip=0, limit=100) -> Query:
        return query.offset(skip).limit(limit)

    def create(self, db_session: Session, *, obj_in: CreateSchemaType, auto_commit=True) -> ModelType:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        return self.create_model(db_session=db_session, db_obj=db_obj, auto_commit=auto_commit)

    def create_model(self, db_session: Session, db_obj: ModelType, auto_commit=True):
        db_obj.created_at = settings.DEFAULT_TIME_ZONE.localize(datetime.now())
        return self.update_model(db_session=db_session, db_obj=db_obj, auto_commit=auto_commit, create_mode=True)

    def update(
        self, db_session: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType, auto_commit=True, create_mode=False
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            if field in obj_data:
                setattr(db_obj, field, update_data.get(field))
        db_obj = self.update_model(db_session=db_session, db_obj=db_obj, auto_commit=auto_commit)
        return db_obj

    # noinspection PyMethodMayBeStatic
    def update_model(self, db_session: Session, db_obj: ModelType, auto_commit: bool = True, create_mode=False):
        db_obj.updated_at = settings.DEFAULT_TIME_ZONE.localize(datetime.now())
        db_session.add(db_obj)
        if auto_commit:
            db_session.commit()
            if not create_mode:
                db_session.refresh(db_obj)
        return db_obj

    def remove(self, db_session: Session, model_id: int, logger: Logger) -> ModelType:
        obj = self.get(db_session=db_session, model_id=model_id)
        logger.info("Marking object as deleted: {}".format(obj.id))
        obj.is_deleted = True
        obj.deleted_at = settings.DEFAULT_TIME_ZONE.localize(datetime.now())
        db_session.add(obj)
        db_session.commit()
        db_session.refresh(obj)
        return obj

    def remove_for_real(self, db_session: Session, model_id: int, logger: Logger) -> None:
        logger.info("Removing object: {}({})".format(self.model.__name__, model_id))
        db_session.query(self.model).filter(self.model.id == model_id).delete()
        db_session.commit()

    def lock_by(self, db_session: Session, *and_statement) -> ModelType:
        return self.get_query(db_session).filter(*and_statement).with_for_update().one_or_none()
