import logging
from contextlib import closing
from typing import Optional, Type

import sqlalchemy.orm
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from user_context import settings

from . import BaseService


class DatabaseService(BaseService):
    _session_class: Optional[Type[sqlalchemy.orm.Session]] = None
    _engine = None
    _db_session = None

    @classmethod
    async def initialize(cls):
        assert cls._engine is None, cls._engine
        assert cls._session_class is None
        logging.getLogger(__name__).info("Creating DB Engine - Timezone: {}".format(settings.DEFAULT_TIME_ZONE_STRING))
        cls._engine = sqlalchemy.create_engine(
            settings.DATABASE_URL,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_POOL_SIZE_OVERFLOW,
            pool_pre_ping=True,
            connect_args={"options": "-c timezone={}".format(settings.DEFAULT_TIME_ZONE_STRING)},
        )
        logging.getLogger(__name__).info("Creating Session class")
        # noinspection PyTypeChecker
        cls._db_session = sessionmaker(bind=cls._engine, autocommit=False, autoflush=False)

        # noinspection PyTypeChecker
        cls._session_class = sessionmaker(autocommit=False, autoflush=False, bind=cls._engine)

        logging.getLogger(__name__).info("Checking connection with database")
        _ = None
        try:
            _ = cls.get_session()()
            _.execute("SELECT 1")
        finally:
            logging.getLogger(__name__).info("Removing temporary session")
            # noinspection PyUnresolvedReferences
            if _ is not None:
                _.close()

    @classmethod
    async def deinitialize(cls):
        assert cls._engine is not None
        logging.getLogger(__name__).info("Closing all sessions")
        sqlalchemy.orm.close_all_sessions()
        logging.getLogger(__name__).info("Shutting down database")
        cls._engine.dispose()
        cls._engine = None
        cls._session_class = None

    @classmethod
    def get_session(cls) -> Type[sqlalchemy.orm.Session]:
        assert cls._session_class is not None
        return cls._session_class

    @classmethod
    def get_engine(cls):
        return cls._engine

    @staticmethod
    def get_db(request: Request) -> sqlalchemy.orm.Session:
        if request.state.db is ...:
            request.state.db = DatabaseService.get_session()()
        return request.state.db

    @staticmethod
    async def test_me_async(request: Request) -> str:
        db_data: str = ""
        with closing(DatabaseService.get_db(request)) as db:
            try:
                db_data = db.execute("select to_char(current_timestamp, 'YYYY.MM.DD HH24:MI:SS.MS')").fetchone()[0]
            except Exception as e:
                logging.getLogger(__name__).exception("Error during DB Health Check: {}".format(e))
        return db_data
