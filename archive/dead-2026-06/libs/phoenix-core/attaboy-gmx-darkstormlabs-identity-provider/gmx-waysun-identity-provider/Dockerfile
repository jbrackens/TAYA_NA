FROM quay.io/keycloak/keycloak:17.0.1 as builder

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_DB=postgres
ENV KC_HOSTNAME_PATH=/auth
ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_PORT=8080
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_HTTP_RELATIVE_PATH=/auth
ENV KC_PROXY=edge
ENV KC_LOG_FORMAT='%d{yyyy-MM-dd HH:mm:ss,SSS} %-5p [cid=%X{correlationId}] [%c] (%t) %s%e%n'
ENV KC_LOG_LEVEL=INFO

# Install custom providers
ARG JAR_FILE
COPY target/${JAR_FILE} /opt/keycloak/providers/stella-module.jar
COPY docker/libsodium.so /opt/libsodium.so
RUN /opt/keycloak/bin/kc.sh build 

FROM quay.io/keycloak/keycloak:17.0.1
COPY --from=builder /opt/ /opt/

WORKDIR /opt/keycloak

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start"]


