FROM postgres:13.11

ARG PG_PARTMAN_VERSION=4.7.3
ARG PG_DEV_VERSION=13

RUN set -x \
  && apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget unzip make clang \
    postgresql-server-dev-$PG_DEV_VERSION \
    gcc libc6-dev libssl-dev libkrb5-dev \
    postgresql-13-cron locales \
    && localedef -i en_GB -c -f UTF-8 -A /usr/share/locale/locale.alias en_GB.UTF-8 \
    && mkdir -p /tmp/pg_partman-$PG_PARTMAN_VERSION \
    && wget -O /tmp/pg_partman.tar.gz "https://github.com/pgpartman/pg_partman/archive/v$PG_PARTMAN_VERSION.tar.gz" \
    && tar \
      --extract \
      --file /tmp/pg_partman.tar.gz \
      --directory /tmp/pg_partman-$PG_PARTMAN_VERSION \
      --strip-components 1 \
    && cd /tmp/pg_partman-$PG_PARTMAN_VERSION \
    && make \
    && make install \
    && rm -rf /var/lib/apt/lists/* && apt-get purge -y --auto-remove \
      ca-certificates wget unzip make clang \
      postgresql-server-dev-$PG_DEV_VERSION \
      gcc libc6-dev libssl-dev libkrb5-dev \
    && rm -rf /tmp/pg_*

ENV LANG en_GB.UTF-8
ENV LC_ALL en_GB.UTF-8

COPY docker-entrypoint-initdb.d/* /docker-entrypoint-initdb.d/
COPY docker-entrypoint-after-initdb.sh /docker-entrypoint-initdb.d/000_docker-entrypoint-after-initdb.sh
