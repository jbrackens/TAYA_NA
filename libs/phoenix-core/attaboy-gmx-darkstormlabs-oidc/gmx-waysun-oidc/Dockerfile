FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:3.8.5-7.1.21-darkstormlabs-20.0.4
WORKDIR /app

ENV PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=on \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=5000 \
  PIPENV_COLORBLIND=true \
  PIPENV_NOSPI=true

COPY src Pipfile Pipfile.lock /app/

RUN pipenv install --system --deploy --ignore-pipfile && \
    chmod +x /app/provision.sh
