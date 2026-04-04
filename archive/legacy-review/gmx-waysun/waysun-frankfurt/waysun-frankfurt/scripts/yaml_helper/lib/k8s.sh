#!/usr/bin/env bash

if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

function k8s.compile_to_file() {
  local tpl_file="${1}"
  local result_file="${2}"
  if [ ! -f "${tpl_file}" ]; then
    log.error "Wrong parameters for 'k8s.compile_to_file()'."
    log.error " tpl_file = '${tpl_file}'"
    log.error "Is not a regular file!"
    exit "${ERR_TEMPLATE_FILE_NOT_FOUND}"
  fi
  log.info "Compiling '${tpl_file}'"
  # compiling simple template - do not change line indentation
  # replacing all "§" with "$" characters
  envsubst < "${tpl_file}" | sed 's/§/$/g' > "${result_file}"
  log.info "Done."
}

function k8s.exec_kubectl() {
  local tmp_file=
  local was_error=0
  tmp_file="$(common.get_tmp_file)" || die
  kubectl ${*} > "${tmp_file}" 2>&1 || was_error=${?}
  if [ ${was_error} -ne 0 ] ; then
    while IFS= read -r line; do
      log.error "${line}"
    done < "${tmp_file}"
    cp "${compiled}" /tmp/a
    log.error "YAML can be found at /tmp/a"
    exit "${ERR_K8S_KUBECTL_ERROR}"
  fi
  while IFS= read -r line; do
    log.info "${line}"
  done < "${tmp_file}"
}

function k8s.load_yaml_to_k8s() {
  local tpl_file="${1}"
  local namespace="${2:-${CFG_K8S_NAMESPACE:-undefined}}"
  local compiled=
  compiled=$(common.get_tmp_file) || die

  if [ "${namespace}" == "undefined" ] ; then
    log.error "Wrong parameters for 'k8s.load_yaml_to_k8s()'."
    log.error " namespace = '${namespace}'"
    exit "${ERR_UNKNOWN_NAMESPACE}"
  fi
  k8s.compile_to_file "${tpl_file}" "${compiled}"
  log.info "Loading file: '${tpl_file}'"
  k8s.exec_kubectl apply -n "${namespace}" -f "${compiled}"

  log.info "Done."
  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
}



function k8s.combine_and_load_yaml_to_k8s() {
  local tpl_file=
  tpl_file=$(common.get_tmp_file) || die
  local compiled=
  compiled=$(common.get_tmp_file) || die
  log.info "Combine files to create one YAML:"
  for file_name in ${*}; do
    log.info "  ${file_name}"
    cat "${file_name}" >> "${tpl_file}" # {${file_name};${tpl_file}}
    {
      echo
      echo '---'
    } >> "${tpl_file}"
#    echo >> "${tpl_file}"
#    echo "---" >> "${tpl_file}"
#    echo >> "${tpl_file}"
  done
  k8s.load_yaml_to_k8s "${tpl_file}"
}

__K8S_NAMESPACES=
function k8s.create_namespace_if_not_exists() {
  local namespace="${1:-${CFG_K8S_NAMESPACE:-undefined}}"

  if [ "${namespace}" == "undefined" ] ; then
    log.error "Wrong parameters for 'load_yaml_to_k8s()'."
    log.error " namespace = '${namespace}'"
    exit "${ERR_UNKNOWN_NAMESPACE}"
  fi

  if [ "${__K8S_NAMESPACES}" == "" ] ; then
    log.info "Fetching K8S namespaces to cache"
    __K8S_NAMESPACES="$(kubectl get namespaces | grep Active | cut -d' ' -f1)" || die
    log.info "Done"
  fi
  while IFS= read -r ns; do
    if [ "${ns}" == "${namespace}" ] ; then
      log.info "Skipping namespace - '${namespace}' creation. Detected active one"
      log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
      return
    fi
  done <<< "${__K8S_NAMESPACES}"
  local tpl=
  tpl="$(common.get_tmp_file)" || die
  cat <<EOL > "${tpl}"
kind: Namespace
apiVersion: v1
metadata:
  name: ${namespace}
  labels:
    name: ${namespace}
EOL
  k8s.exec_kubectl apply -f  "${tpl}"
  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
}
