###########
# BUILDER #
###########
FROM alpine:latest AS builder

# ARGS & LABELS
ARG JAR_FILE
ARG VCS_REF

LABEL project=predictor-game
LABEL builder=true
LABEL vcs-ref=${VCS_REF}

# CMD
ADD ${JAR_FILE}.tar /opt/
RUN mv /opt/playBinary /opt/app

##########
# RUNNER #
##########
FROM openjdk:8-jdk-alpine

# ARGS & LABELS
ARG APP_NAME
ARG VCS_REF

LABEL project=predictor-game
LABEL module=${APP_NAME}
LABEL vcs-ref=${VCS_REF}

# CMD
COPY --from=builder /opt/app /opt/app
ENTRYPOINT ["/opt/app/bin/playBinary"]