#!/usr/bin/env bash

if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

function git.get_latest_version_for_repo() {
  local repo_url="${1}"
  latest_tag="$(git ls-remote --tags --sort=version:refname ${repo_url} | tail -n1 | cut -d'/' -f3 | sed s/v//g)" || die
  echo "${latest_tag}"
}

function git.check_versions() {
  log.info "Checking tags and versions..."
  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
  version=$(git.get_latest_version_for_repo "${1}") || die
  log.info "Github tag: ${version}"
  log.info "Deploy tag: ${CFG_DEPLOY_TAG}"
  if [ "${CFG_DEPLOY_TAG}" != "${version}" ] ; then
    if [ "${FORCE_CFG_DEPLOY_TAG:-unknown}" != "${CFG_DEPLOY_TAG}" ] ; then
      log.error "You are deploying old version."
      log.error "Use FORCE_CFG_DEPLOY_TAG to bypass this check."
      exit 1
    fi
    log.warning "You are deploying old version - bypass FORCED"
  fi
}
