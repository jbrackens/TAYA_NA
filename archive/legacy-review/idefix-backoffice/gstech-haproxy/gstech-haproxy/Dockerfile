FROM haproxy:1.7.5-alpine

COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

COPY errors /usr/local/etc/haproxy
COPY 200.http /usr/local/etc/haproxy/200.http

CMD /bin/sh -c "/sbin/syslogd -O /proc/1/fd/1 && haproxy -f /usr/local/etc/haproxy/haproxy.cfg -db"


