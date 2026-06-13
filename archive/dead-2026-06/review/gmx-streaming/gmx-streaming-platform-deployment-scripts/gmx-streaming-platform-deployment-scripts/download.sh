#!/bin/bash
VERSION=$1
NEXUS_SUBREPOSITORY="maven-releases"
if [[ ${VERSION} == *"SNAPSHOT"* ]]; then
  echo "Downloading from snapshot repository"
  NEXUS_SUBREPOSITORY="maven-snapshots"
fi
NEXUS_BASE="https://lena-srv01.flipsports.net:4566/repository/${NEXUS_SUBREPOSITORY}/"


source $2
GROUP_TO_PATH=$(echo ${GROUP_ID} | sed "s/\./\//g")
echo "Downloading artifact: ${GROUP_ID}:${ARTIFACT_ID}:${VERSION}"
curl -X GET "${NEXUS_BASE}${GROUP_TO_PATH}/${ARTIFACT_ID}_${SCALA_VERSION}/${VERSION}/${ARTIFACT_ID}_${SCALA_VERSION}-${VERSION}-assembly.jar" --output "${GROUP_ID}-${ARTIFACT_ID}-${VERSION}.jar"
