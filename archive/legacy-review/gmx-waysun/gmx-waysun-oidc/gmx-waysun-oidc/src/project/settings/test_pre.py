import os

from .common import BASE_DIR, TESTS_IN_PROGRESS

if TESTS_IN_PROGRESS:
    from functools import partial
    from pathlib import Path
    from unittest.mock import patch

    import fakeredis
    from dotenv import load_dotenv

    base_dir = os.path.dirname(BASE_DIR)

    env_path = Path(base_dir) / "local.env"
    load_dotenv(dotenv_path=env_path, override=True, verbose=True)

    _redis_server = fakeredis.FakeServer()

    redis_patcher = patch(
        "django_redis.pool.ConnectionFactory.get_connection", partial(fakeredis.FakeRedis, server=_redis_server)
    )
    redis_patcher.start()
