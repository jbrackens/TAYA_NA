FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:3.7.6-6.1.2-20.0.4

ENV PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  PIPENV_HIDE_EMOJIS=true \
  PIPENV_COLORBLIND=true \
  PIPENV_NOSPIN=true

COPY src Pipfile Pipfile.lock /app/

RUN chmod +x /app/provision.sh \
 && pip install pipenv --index-url https://lena-srv01.flipsports.net:4566/repository/pypi-group/simple \
 && pipenv install --system --deploy --ignore-pipfile

WORKDIR /app
