FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python:3.7.6-6.1.2
WORKDIR /app
COPY gunicorn-requirements.txt /tmp/gunicorn-requirements.txt
COPY src /app
COPY start_gunicorn.sh /usr/bin

RUN python3 -m venv .build-deps \
 && apt-get -y install netcat \
 && pip install \
          --upgrade \
          --no-cache-dir \
          --no-color \
          -r /tmp/gunicorn-requirements.txt \
 && rm /tmp/gunicorn-requirements.txt && rm -rf .build-deps \
 && chmod +x /usr/bin/start_gunicorn.sh

ENTRYPOINT ["/usr/bin/tini", "--"]
VOLUME ["/app"]
EXPOSE 8080
CMD ["start_gunicorn.sh"]
