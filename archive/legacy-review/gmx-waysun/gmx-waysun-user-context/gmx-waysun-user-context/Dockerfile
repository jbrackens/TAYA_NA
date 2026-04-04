FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python:3.8.5-7.1.21-waysun

WORKDIR /app

ENV PYTHONFAULTHANDLER="1" \
  PYTHONUNBUFFERED="1" \
  PYTHONHASHSEED="random" \
  PIP_NO_CACHE_DIR="on" \
  PIP_DISABLE_PIP_VERSION_CHECK="on" \
  PIP_DEFAULT_TIMEOUT=5000 \
  PIPENV_COLORBLIND="true" \
  PIPENV_NOSPI="true" \
  DEBUG="TRUE" \
  ALLOWED_HOSTS="local.waysun" \
  CORS_ORIGINS="*" \
  JWT_EXTRA_SECRET_KEY="ea87def016584b3c84e5cdbea4dcc868ea87def016584b3c84e5cdbea4dcc868" \
  JWT_AUTO_DISCOVERY_URL="http://local.waysun:8000/openid/.well-known/openid-configuration" \
  REDIS_CONNECTION_URL="redis://redis:6379/6" \
  GMX_WAYSUN_API_ENDPOINT_PATH_PREFIX="/user_context" \
  GMX_WAYSUN_DATABASE_USER="user_context" \
  GMX_WAYSUN_DATABASE_PASSWORD="user_context" \
  GMX_WAYSUN_DATABASE_HOST="postgres" \
  GMX_WAYSUN_DATABASE_PORT="5432" \
  GMX_WAYSUN_DATABASE_NAME="user_context" \
  GMX_WAYSUN_DATABASE_POOL_SIZE="1" \
  GMX_WAYSUN_DATABASE_POOL_SIZE_OVERFLOW="1" \
  GMX_WAYSUN_REDIS_POOL_SIZE_MIN="1" \
  GMX_WAYSUN_REDIS_POOL_SIZE_MAX="1" \
  API_MESSAGE_HEADER_NAME="X-FS-Api-Message-Id" \
  MICROSERVICE_NAME="gmx-waysun-user-context" \
  ENVIRONMENT_TYPE="local" \
  LOG_HANDLER="console" \
  GUNICORN_WORKERS_PER_CORE_FLOAT="1" \
  GUNICORN_MAX_WORKERS_INT="" \
  GUNICORN_WEB_CONCURRENCY_INT="" \
  GUNICORN_HOST="0.0.0.0" \
  GUNICORN_PORT="8000" \
  GUNICORN_LOG_LEVEL="info" \
  GUNICORN_ACCESS_LOG="-" \
  GUNICORN_ERROR_LOG="-" \
  GUNICORN_GRACEFUL_TIMEOUT="60" \
  GUNICORN_TIMEOUT="30" \
  GUNICORN_KEEP_ALIVE="5" \
  GUNICORN_WORKER_CLASS="uvicorn.workers.UvicornWorker" \
  GUNICORN_APP_MODULE="user_context.main:app" \
  GUNICORN_CONF="/app/gunicorn_conf.py"




COPY prestart.sh start.sh Pipfile Pipfile.lock gunicorn_conf.py /app/

RUN apt-get -y update \
 && apt-get -y upgrade \
 && apt-get -y dist-upgrade \
 && chmod +x /app/start.sh

COPY user_context /app/user_context
RUN pipenv install --system --deploy --ignore-pipfile

VOLUME ["/app"]

CMD ["./start.sh"]
