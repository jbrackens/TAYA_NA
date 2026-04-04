FROM python:3.7.6-buster
COPY wait-for.sh /usr/bin

ENV PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=on \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=5000 \
  PIPENV_COLORBLIND=true \
  PIPENV_NOSPIN=true \
  TINI_VERSION=v0.18.0

RUN chmod +x /usr/bin/wait-for.sh && ln -sf /usr/bin/wait-for.sh /usr/bin/wait-for \
 && apt-get -y update \
 && apt-get -y upgrade \
 && apt-get install -y --no-install-recommends make gcc python3-dev musl-dev libffi-dev libpq-dev netcat libc6 musl \
 && pip install --upgrade --no-cache-dir --no-color --index-url https://lena-srv01.flipsports.net:4566/repository/pypi-group/simple pip pipenv \
 && wget -O /usr/bin/tini https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini \
 && wget -O /tmp/tini.asc https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini.asc \
 && mkdir -p /root/.gnupg \
 && echo disable-ipv6 > /root/.gnupg/dirmngr.conf \
 && echo nameserver 8.8.8.8 > /etc/resolv.conf \
 && chmod 700 /root/.gnupg \
 && chmod 600 /root/.gnupg/dirmngr.conf \
 && ( gpg --batch --keyserver keys.gnupg.net --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 \
   || gpg --batch --keyserver ipv4.pool.sks-keyservers.net --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 \
   || gpg --batch --keyserver pgp.mit.edu --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 \
   || gpg --batch --keyserver keyserver.pgp.com --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 ) \
 && gpg --batch --verify /tmp/tini.asc /usr/bin/tini \
 && chmod +x /usr/bin/tini \
 && pip install \
          --upgrade \
          --no-cache-dir \
          --no-color \
          --index-url https://lena-srv01.flipsports.net:4566/repository/pypi-group/simple \
          aws-rest-default==6.1.2 \
 && apt-get clean autoclean \
 && apt-get autoremove --yes \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /var/cache/apt/archives \
 && rm -rf /usr/share/doc/ \
 && rm -rf /usr/share/man/ \
 && rm -rf /usr/share/locale/

WORKDIR /app
ENTRYPOINT ["/usr/bin/tini", "--"]
