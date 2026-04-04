import os

from alembic.command import upgrade
from alembic.config import Config

from user_context import settings


def run_sql_migrations():
    # retrieves the directory that *this* file is in
    migrations_dir = os.path.dirname(os.path.realpath(__file__))
    # this assumes the alembic.ini is also contained in this same directory
    config_file = os.path.join(migrations_dir, "..", "alembic.ini")

    config = Config(file_=config_file)
    config.set_main_option("script_location", migrations_dir)
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    # config.set_main_option("sqlalchemy.url", env_config("DATABASE_URL"))

    # upgrade the database to the latest revision
    upgrade(config, "head")


if __name__ == "__main__":
    run_sql_migrations()
