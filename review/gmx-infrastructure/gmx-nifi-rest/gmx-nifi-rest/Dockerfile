FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python:3.7.6-6.1.2

ENV PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  PIPENV_HIDE_EMOJIS=true \
  PIPENV_COLORBLIND=true \
  PIPENV_NOSPIN=true \
  TINI_VERSION=v0.18.0

COPY gmx_nifi_rest /app/gmx_nifi_rest
COPY start.sh Pipfile Pipfile.lock  /app/

WORKDIR /app

RUN apt-get -y update \
 && apt-get -y upgrade \
 && apt-get -y dist-upgrade \
 && apt-get -y install apt-file \
 && apt-file update \
 && apt-get -y install netcat \
 && chmod +x /app/start.sh \
 && pip install pipenv --index-url https://lena-srv01.flipsports.net:4566/repository/pypi-group/simple \
 && pipenv install --system --deploy --ignore-pipfile

ENTRYPOINT ["/usr/bin/tini", "--"]

VOLUME ["/app"]

EXPOSE 8000

CMD ["./start.sh"]
