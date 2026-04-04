{{/* vim: set filetype=mustache: */}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "phoenix-backend.fullname" -}}
{{- if contains "phoenix-backend" .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-phoenix-backend" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "phoenix-backend.chart" -}}
{{- printf "phoenix-backend-%s" .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "phoenix-backend.labels" -}}
helm.sh/chart: {{ include "phoenix-backend.chart" . }}
{{ include "phoenix-backend.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "phoenix-backend.selectorLabels" -}}
app: phoenix-backend
app.kubernetes.io/name: phoenix-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "phoenix-backend.serviceAccountName" -}}
{{- include "phoenix-backend.fullname" . }}
{{- end }}
