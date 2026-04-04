FROM openjdk:8-jdk-alpine
VOLUME /tmp
ARG JAR_FILE
ARG APP_NAME

ADD ${JAR_FILE}.tar /opt/
RUN mv /opt/${JAR_FILE} /opt/app
RUN mv /opt/app/bin/${APP_NAME} /opt/app/bin/run

ENTRYPOINT ["/opt/app/bin/run"]