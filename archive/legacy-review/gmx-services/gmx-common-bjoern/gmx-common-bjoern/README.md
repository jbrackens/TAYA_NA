# gmx-common-bjoern
Bjoern docker image for serving Python services

## Prepare for building
Please edit your `~/.aws/credentials` file and add `flipsports` profile:
```
[flipsports]
aws_access_key_id = KEY
aws_secret_access_key = SECRET
region = eu-west-1
```

## `build.sh`
This file is used to build an image: `gmx-common/bjoern:<AWS_REST_DEFAULT>-<BJOERN_VERSION>` where:
- `AWS_REST_DEFAULT` is a version of installed `aws-rest-profile` from fury.io
- `BJOERN_VERSION` is a version of installed `bjoern`

## `push.sh`
This file is used to push created image to AWS ECR as `259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/bjoern:<AWS_REST_DEFAULT>-<BJOERN_VERSION>`.
