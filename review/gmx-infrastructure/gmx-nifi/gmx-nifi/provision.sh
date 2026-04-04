#!/usr/bin/env bash
WORK_DIR=$(pwd)


if [[ ! -d ${WORK_DIR}/persistence/git-bare ]] ; then
  echo Creating GIT Bare repo for Registry
  mkdir -p ${WORK_DIR}/persistence/git-bare
  cd ${WORK_DIR}/persistence/git-bare
  git init --bare
  cd ${WORK_DIR}
fi

if [[ ! -d ${WORK_DIR}/persistence/registry ]] ; then
  echo Cloning BARE repo for Registry
  cd ${WORK_DIR}/persistence
  git clone ./git-bare registry
  cd registry
  git remote set-url origin /opt/nifi-registry/nifi-registry-0.3.0/git-bare
  cd ${WORK_DIR}/
fi

mkdir -p ${WORK_DIR}/persistence/nifi/conf/archive
touch ${WORK_DIR}/persistence/nifi/conf/flow.xml.gz
