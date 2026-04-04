#!/usr/bin/env bash
set -eauo pipefail
ENV_CURRENT_DIR=$(pwd)
ENV_SCRIPT_DIR=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
ENV_SCRIPT_TYPE=$(basename "${ENV_SCRIPT_DIR}")
ENV_ROOT_DIR=$(realpath ${ENV_SCRIPT_DIR}/..)  # <- this must pointing to directory where `.lib` is located

ENV_TYPE=${1:-'develop'}
shift || true

cd "${ENV_SCRIPT_DIR}"
source ${ENV_ROOT_DIR}/.lib/common.sh
## ---------------
#bitwarden.login
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"
## ---------------
log.info 'Loading Parameters from secure vault'
for param in QCLOUD_CERT_ID ; do
  log.info "  ${param}"
  _t="CFG_${param}"
  declare $param=$(common.get_and_encode_secret "${!_t}")
done
log.info "Done."
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
k8s.load_yaml_to_k8s "./ytpl/00_secret_certificate.ytpl"
log.info "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
## -----

## -----
## Let's create a ingress https annotation
## -------
tmp_k8s_services="$(common.get_tmp_file)" || die
tmp_ingress_annotation_file="$(common.get_tmp_file)" || die
log.info "Loading services for Ingress"
kubectl -n "${CFG_K8S_NAMESPACE}" get services -o=json > "${tmp_k8s_services}" || kubectl -n "${CFG_K8S_NAMESPACE}" get services -o=json > "${tmp_k8s_services}" || die
## -------
log.info "Creating HTTPS rules"
cat "${tmp_k8s_services}" | \
  # Monochrome Raw and Compact
  jq -Mrc \
     --arg CFG_INGRESS_HOST_NAME "${CFG_INGRESS_HOST_NAME}" \
     '[
       .items[].metadata.annotations |
       select (."eeg-ingress/enabled" == "true") |
       {
         "host": $CFG_INGRESS_HOST_NAME,
         "path": ."eeg-ingress/path",
         "backend": {
           "serviceName": ."eeg-ingress/service-name",
           "servicePort": ."eeg-ingress/service-port"
         }
       }
     ]' > "${tmp_ingress_annotation_file}" || die
TMP_HTTPS_RULES="$(cat ${tmp_ingress_annotation_file})" || die
## -------
log.info "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
tmp_ingress_file="$(common.get_tmp_file)" || die
tmp_ingress_spec_rules="$(common.get_tmp_file)" || die
tmp_file="$(common.get_tmp_file)" || die

k8s.compile_to_file "./ytpl/10_ingress.ytpl" "${tmp_ingress_file}"

function _jq() {
   echo "${1}" | base64 --decode | jq -r "${2}"
}

cat "${tmp_k8s_services}" | \
  jq -r '
  .items[].metadata.annotations |
  select (."eeg-ingress/enabled" == "true") |
  {
    "service_path": ."eeg-ingress/path",
    "service_name": ."eeg-ingress/service-name",
    "service_port": ."eeg-ingress/service-port"
  } |
  @base64' > "${tmp_file}"

while IFS= read -r line;
do
   TMP_SERVICE_NAME=$(_jq "${line}" '.service_name')
   TMP_SERVICE_PORT=$(_jq "${line}" '.service_port')
   TMP_SERVICE_PATH=$(_jq "${line}" '.service_path')
   log.info "Processing ${TMP_SERVICE_NAME}:${TMP_SERVICE_PORT}${TMP_SERVICE_PATH}"
   k8s.compile_to_file "./etc/spec_rules.ytpl" "${tmp_ingress_spec_rules}"
   cat "${tmp_ingress_spec_rules}" >> "${tmp_ingress_file}"
done < "${tmp_file}"
log.info "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
k8s.load_yaml_to_k8s "${tmp_ingress_file}"
