# gmx-common-python
Base image with python 3.7 and aws-rest-default common package

## Prepare for building
Please edit your `~/.aws/credentials` file and add `flipsports` profile:
```
[flipsports]
aws_access_key_id = KEY
aws_secret_access_key = SECRET
region = eu-west-1
```

## `build.sh`
This file is used to build an image: `gmx-common/python-36-alpine:<AWS_REST_DEFAULT>` where `AWS_REST_DEFAULT` is a version of installed `aws-rest-profile` from fury.io.

## `push.sh`
This file is used to push created image to AWS ECR as `259420793117.dkr.ecr.eu-west-1.amazonaws.com/gmx-common/python-36-alpine:<AWS_REST_DEFAULT>`
