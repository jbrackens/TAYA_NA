FROM haproxy:2.2-alpine

EXPOSE 3000/tcp

COPY packages/gstech-reverseproxy/*.txt /
COPY packages/gstech-reverseproxy/config.d /usr/local/etc/haproxy/config.d
COPY packages/gstech-reverseproxy/errors /usr/local/etc/haproxy
COPY packages/gstech-reverseproxy/200.http /usr/local/etc/haproxy/200.http
RUN wget -qO- https://www.cloudflare.com/ips-v4 > /cloudflare_ips.txt
RUN echo "" >> /cloudflare_ips.txt
RUN wget -qO- https://www.cloudflare.com/ips-v6 >> /cloudflare_ips.txt

CMD /bin/sh -c "/sbin/syslogd -O /proc/1/fd/1 && haproxy -f /usr/local/etc/haproxy/config.d -db"
