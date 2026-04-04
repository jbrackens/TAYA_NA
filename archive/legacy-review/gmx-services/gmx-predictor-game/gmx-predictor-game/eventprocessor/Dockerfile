###########
# BUILDER #
###########
FROM alpine:latest AS builder

# ARGS & LABELS
ARG JAR_FILE
ARG APP_NAME
ARG VCS_REF

LABEL project=predictor-game
LABEL builder=true
LABEL vcs-ref=${VCS_REF}

# CMD
ADD ${JAR_FILE}.tar /opt/
RUN mv /opt/${JAR_FILE} /opt/app
RUN mv /opt/app/bin/${APP_NAME} /opt/app/bin/run

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
ENTRYPOINT ["/opt/app/bin/run"]