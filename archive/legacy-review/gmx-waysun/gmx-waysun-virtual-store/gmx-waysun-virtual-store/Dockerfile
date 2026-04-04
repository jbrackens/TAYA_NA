FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:3.8.5-7.1.21-waysun-20.0.4

ENV PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  PIPENV_HIDE_EMOJIS=true \
  PIPENV_COLORBLIND=true \
  PIPENV_NOSPIN=true \
  PIPENV_VERBOSITY=-1

COPY src Pipfile Pipfile.lock /app/

RUN pipenv install --system --deploy --ignore-pipfile && \
    chmod +x /app/provision.sh

WORKDIR /app