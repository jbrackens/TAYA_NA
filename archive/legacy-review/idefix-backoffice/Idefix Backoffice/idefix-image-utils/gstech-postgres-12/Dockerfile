FROM postgres:12.13

ARG PG_PARTMAN_VERSION=4.7.1
ARG PG_DEV_VERSION=12
ARG PG_JOBMON_VERSION=1.4.1

RUN set -x \
	&& apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget unzip make gcc \
    liblldb-11 clang-11 lldb-11 lld-11 clangd-11 \
    postgresql-server-dev-$PG_DEV_VERSION \
    libc6-dev libssl-dev libkrb5-dev \
    postgresql-12-cron \
    && mkdir -p /tmp/pg_jobmon-$PG_JOBMON_VERSION \
    && wget -O /tmp/pg_jobmon.tar.gz "https://github.com/omniti-labs/pg_jobmon/archive/v$PG_JOBMON_VERSION.tar.gz" \
    && tar \
      --extract \
      --file /tmp/pg_jobmon.tar.gz \
      --directory /tmp/pg_jobmon-$PG_JOBMON_VERSION \
      --strip-components 1 \
    && cd /tmp/pg_jobmon-$PG_JOBMON_VERSION \
    && make \
    && make install \
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
    && rm -rf /var/lib/apt/lists/* && apt-get purge -y --auto-remove ca-certificates wget unzip make liblldb-11 clang-11 lldb-11 lld-11 clangd-11 postgresql-server-dev-$PG_DEV_VERSION gcc libc6-dev libssl-dev libkrb5-dev \
    && rm -rf /tmp/pg_*

COPY docker-entrypoint-initdb.d/* /docker-entrypoint-initdb.d/
COPY docker-entrypoint-after-initdb.sh /docker-entrypoint-initdb.d/02_docker-entrypoint-after-initdb.sh
