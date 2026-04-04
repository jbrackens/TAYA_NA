FROM 259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:3.7.6-6.1.2-20.0.4
COPY src /app
WORKDIR '/app'
RUN chmod +x /app/provision.sh \
 && pip install --no-color --no-cache-dir --no-use-pep517 -Ur requirements.txt

ENV PYTHONUNBUFFERED=1
