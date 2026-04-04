# gmx-common-gunicorn
Gunicorn docker image for serving Python services

## envs used by GUNICORN

- `GUNICORN_CPU_COUNT` - Default value: `lscpu -b -p=Core,Socket | grep -v '^#' | sort -u | wc -l` - as a number of `vCPU` (i.e. `2`)
- `GUNICORN_TIMEOUT` - Default: `300`

## Prepare for building
Please edit your `~/.aws/credentials` file and add `flipsports` profile:
```
[flipsports]
aws_access_key_id = KEY
aws_secret_access_key = SECRET
region = eu-west-1
```

## `build.sh`
This file is used to build an image: `gmx-common/gunicorn:<AWS_REST_DEFAULT>-<GUNICORN_VERSION>` where:
- `AWS_REST_DEFAULT` is a version of installed `aws-rest-profile` from fury.io
- `GUNICORN_VERSION` is a version of installed `gunicorn`

## `push.sh`
This file is used to push created image to AWS ECR as `259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/gunicorn:<AWS_REST_DEFAULT>-<GUNICORN_VERSION>`.
