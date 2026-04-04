#!/usr/bin/env bash

usage() {
    echo "Usage: $0 -k LICENSE_KEY"
    echo "  -k LICENSE_KEY  Your MaxMind license key."
    exit 1
}

OUTPUT="GeoLite2-Country.tar.gz"

while getopts 'k:' flag; do
    case "${flag}" in
        k) LICENSE_KEY="${OPTARG}" ;;
        *) usage ;;
    esac
done

if [ -z "$LICENSE_KEY" ]; then
    echo "License key is required."
    usage
fi

URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=$LICENSE_KEY&suffix=tar.gz"

echo "Downloading GeoLite2 Country database ..."
HTTP_STATUS=$(curl -o "$OUTPUT" -w "%{http_code}" -s "$URL")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Download successful!"
    tar -xzvf "$OUTPUT"
    cp GeoLite2-Country_*/GeoLite2-Country.mmdb packages/gstech-backend/server/modules/core/geoip/GeoLite2-Country.mmdb
else
    echo "Failed to download the database file. HTTP Status: $HTTP_STATUS"
    exit 1
fi
