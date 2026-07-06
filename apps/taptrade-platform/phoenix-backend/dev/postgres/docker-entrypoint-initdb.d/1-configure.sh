#!/bin/sh

# Jack up the number of connections - otherwise it'll start crying when everything is running locally
sed -i 's/max_connections = 100.*$/max_connections = 1000/g' /var/lib/postgresql/data/postgresql.conf

# Allow user/pass auth locally
tee -a /var/lib/postgresql/data/pg_hba.conf <<'EOF'
host    backend                     backend                   0.0.0.0/0               md5
host    backend                     backend                   ::/0                    md5
EOF
