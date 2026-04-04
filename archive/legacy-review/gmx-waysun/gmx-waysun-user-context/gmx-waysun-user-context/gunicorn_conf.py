import multiprocessing
from decouple import config as env_config
import ujson as json
from uvicorn.workers import UvicornWorker

workers_per_core = env_config("GUNICORN_WORKERS_PER_CORE_FLOAT", default=1, cast=float)
max_workers_str = env_config("GUNICORN_MAX_WORKERS_INT", default='', cast=str)
use_max_workers = None
if max_workers_str:
    use_max_workers = int(max_workers_str)
web_concurrency_str = env_config("GUNICORN_WEB_CONCURRENCY_INT", default='', cast=str)

host = env_config("GUNICORN_HOST", default="0.0.0.0", cast=str)
port = env_config("GUNICORN_PORT", default="8000", cast=str)
use_bind = f"{host}:{port}"

cores = multiprocessing.cpu_count()
print(f'Detected cores: {cores}')
default_web_concurrency = workers_per_core * cores
if web_concurrency_str:
    web_concurrency = int(web_concurrency_str)
    assert web_concurrency > 0
else:
    web_concurrency = max(int(default_web_concurrency), 2)
    if use_max_workers:
        web_concurrency = min(web_concurrency, use_max_workers)


# Gunicorn config variables
loglevel = env_config("GUNICORN_LOG_LEVEL", default="info", cast=str)
workers = web_concurrency
worker_connections = 1
bind = use_bind
errorlog = env_config("GUNICORN_ERROR_LOG", default="-", cast=str)
worker_tmp_dir = "/dev/shm"
accesslog = env_config("GUNICORN_ACCESS_LOG", default="-", cast=str)
graceful_timeout = env_config("GUNICORN_GRACEFUL_TIMEOUT", default=60, cast=int)
timeout = env_config("GUNICORN_TIMEOUT", default=30, cast=int)
keepalive = env_config("GUNICORN_KEEP_ALIVE", default=5, cast=int)

# For debugging and testing
log_data = {
    "loglevel": loglevel,
    "workers": workers,
    "bind": bind,
    "graceful_timeout": graceful_timeout,
    "timeout": timeout,
    "keepalive": keepalive,
    "errorlog": errorlog,
    "accesslog": accesslog,
    # Additional, non-gunicorn variables
    "workers_per_core": workers_per_core,
    "use_max_workers": use_max_workers,
    "host": host,
    "port": port,
}
print('Using this config:')
print(json.dumps(log_data))


class CustomUvicornWorker(UvicornWorker):
    def run(self):
        try:
            super().run()
        except Exception as e:
            print(e)
            raise
