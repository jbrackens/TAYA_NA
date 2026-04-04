FROM gmx-common/python-36-alpine:3.9-6.0.1
WORKDIR /app

COPY bjoern-requirements.txt /tmp/bjoern-requirements.txt
RUN apk add --no-cache --virtual .build-deps make gcc python3-dev linux-headers musl-dev libev-dev
RUN pip install \
          --upgrade \
          --no-cache-dir \
          --no-color \
          -r /tmp/bjoern-requirements.txt

RUN rm /tmp/bjoern-requirements.txt && apk del .build-deps
RUN apk add --no-cache libev musl
COPY src /app
COPY start_bjoern.py /tmp/
COPY start_bjoern.sh /usr/bin
RUN chmod +x /usr/bin/start_bjoern.sh
ENTRYPOINT ["/sbin/tini", "--"]

VOLUME ["/app"]

EXPOSE 8080
CMD ["start_bjoern.sh"]
