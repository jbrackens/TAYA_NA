#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./signals.sh
source "$LAUNCHER_DIR/signals.sh"

function patch_gstech {
	local patch="${1-"DEBUG-REQUIREMENTS"}"
	patch=${patch%.patch}
	patch=${patch##*patches/}
	cd "$BACKEND_DIR"
	local patch_cmd=("git" "apply" "$PATCHES_DIR/$patch.patch")
	local check_cmd=("${patch_cmd[@]}")
	check_cmd+=("--check")
	if ! "${check_cmd[@]}" 2>/dev/null; then
		echo "Patch $patch does not apply cleanly."
		return 1
	else
		"${patch_cmd[@]}"
	fi
}

function unpatch_gstech {
	local patch="${1-"DEBUG-REQUIREMENTS"}"
	patch=${patch%.patch}
	patch=${patch##*patches/}
	cd "$BACKEND_DIR"
	git apply -R "$PATCHES_DIR/$patch.patch"
}

function bootstrap_gstech {
	cd "$BACKEND_DIR"
	fnm exec yarn bootstrap
}

function env_gstech {
	local seq net wait
	local envs=()
	while [ $# -gt 0 ]; do
		case "$1" in
		"kafka")
			envs+=("env:kafka")
			;;
		"minio")
			envs+=("env:minio")
			;;
		"redis")
			envs+=("env:redis")
			;;
		"pgaff")
			envs+=("env:pg-affmore")
			;;
		"pgidf")
			envs+=("env:pg-idefix")
			;;
		"pg" | "postgres")
			envs+=("env:pg-affmore" "env:pg-idefix")
			;;
		"-s")
			seq="Y"
			;;
		"-w")
			wait="Y"
			;;
		esac
		shift
	done
	local env_cmd=("fnm" "exec" "yarn")
	read -ra envs_ded < <(dedupe_array "${envs[@]}")
	if [[ ${#envs_ded[@]} -eq 0 ]]; then
		net="Y"
		envs_ded=("env:kafka" "env:minio" "env:redis" "env:pg-affmore" "env:pg-idefix")
	fi
	if [[ "$wait" == "Y" ]]; then
		for ((idx = 0; idx < ${#envs_ded[@]}; idx++)); do
			if [[ "${envs_ded[idx]}" == "env:pg-affmore" || "${envs_ded[idx]}" == "env:pg-idefix" ]]; then
				envs_ded[idx]+=" -- --wait"
			fi
		done
	fi
	cd "$BACKEND_DIR"
	if [[ "$net" == "Y" ]]; then # only when no envs are specified - ie. all
		"${env_cmd[@]}" 'env:network'
	fi
	if [[ "$seq" == "Y" ]]; then
		log1 "Running sequentially: ${envs_ded[*]}"
		"${env_cmd[@]}" run-s "${envs_ded[@]}"
	else
		log1 "Running parallel: ${envs_ded[*]}"
		"${env_cmd[@]}" run-p "${envs_ded[@]}"
	fi
}

function migrate_gstech {
	local scope=()
	local needs_aff_fix
	export LOGGER_FORMAT="nice"
	cd "$BACKEND_DIR"
	local aff_env_fix="$BACKEND_DIR/packages/affmore-backend/.env.local"
	if [[ "${#@}" -eq 0 ]]; then needs_aff_fix="1"; fi
	for arg in "$@"; do
		case "$arg" in
		"backend")
			scope+=("gstech-backend")
			;;
		"reward")
			scope+=("gstech-rewardserver")
			;;
		"campaign")
			scope+=("gstech-campaignserver")
			;;
		"lotto")
			scope+=("lotto-backend")
			;;
		"affmore")
			scope+=("affmore-backend")
			needs_aff_fix="1"
			;;
		*)
			needs_aff_fix="1"
			;;
		esac
	done
	if [[ -n "$needs_aff_fix" ]]; then echo "POSTGRES_PORT=5433" >"$aff_env_fix"; fi
	if [ "${#scope[@]}" -eq 1 ]; then
		fnm exec yarn migrate --scope="${scope[0]}"
	elif [ "${#scope[@]}" -gt 1 ]; then
		fnm exec yarn migrate --scope="{$(echo "${scope[@]}" | tr ' ' ',')}"
	else
		fnm exec yarn migrate
	fi
	if [[ -f "$aff_env_fix" ]]; then rm -f "$aff_env_fix"; fi
}

function run_mprocs {
	local base_job_file="$JOBSPEC_DIR/base.yml"
	local brands_job_file="$JOBSPEC_DIR/brands.yml"
	local interceptor_job_file="$JOBSPEC_DIR/interceptor.yml"
	local tasks_job_file="$JOBSPEC_DIR/tasks.yml"
	local run_job_file="$JOBS_DIR/_run.yml"
	cp "$base_job_file" "$run_job_file"
	shift
	local runner_args
	local intercepts=()
	local brands=()
	local brand_keys=()
	while [ $# -gt 0 ]; do
		local b
		local i
		case "$1" in
		+B*)
			b="${1#+B}"
			if [[ -n "$b" ]]; then
				brands+=("$(brand_codes "$b")")
			fi
			;;
		+I*)
			i="${1#+I}"
			if [[ -n "$i" ]]; then
				intercepts+=("$i")
			fi
			runner_args+=("$1")
			;;
		*)
			runner_args+=("$1")
			;;
		esac
		shift
	done
	if [[ "${#brands[@]}" -eq 0 ]]; then brands=("ld"); fi
	read -ra brands_sorted < <(arr_sort "${brands[@]}")
	local pos=5
	local yq_proc
	for brand in "${brands_sorted[@]}"; do
		IFS="," read -ra brand_keys <<<"$(yq e 'keys | .[] | @sh' "$brands_job_file" | grep "^$brand-" | tr '\n' ',')"
		for key in "${brand_keys[@]}"; do
			local ins_pos
			if [[ "$key" == "$brand-backend"* ]]; then
				ins_pos=$pos
			else
				ins_pos=$((pos + 4))
			fi
			yq_proc="$(
				cat <<-EOM
					(.procs | to_entries | .[0:$ins_pos]) as \$pre
					| (.procs | to_entries | .[$ins_pos:]) as \$post
					| \$pre + ({"$key": (load("$brands_job_file")."$key")} | to_entries) + \$post as \$p
					| { "procs": (\$p | from_entries) }
				EOM
			)"
			yq e -i "$yq_proc" "$run_job_file"
		done
		pos=$((pos + 1))
	done
	if [[ "${#intercepts[@]}" -gt 0 ]]; then
		yq_proc="$(
			cat <<-EOM
				(.procs | to_entries) as \$pre
				| \$pre + (load("$interceptor_job_file") | to_entries) as \$p
				| { "procs": (\$p | from_entries) }
			EOM
		)"
		yq e -i "$yq_proc" "$run_job_file"
	fi
	yq_proc="$(
		cat <<-EOM
			(.procs | to_entries) as \$pre
			| \$pre + (load("$tasks_job_file") | to_entries) as \$p
			| { "procs": (\$p | from_entries) }
		EOM
	)"
	yq e -i "$yq_proc" "$run_job_file"
	export RUNNER_ARGS="${runner_args[*]}"
	IFS="," read -ra proc_ids <<<"$(yq e '.procs[].shell | sub("./start.sh ";"") | sub(" ";".")' "$run_job_file" | tr '\n' ',')"
	# shellcheck disable=SC2048 disable=SC2068
	emit_signal_foreach "launched" ${proc_ids[@]}
	mprocs --config "$run_job_file"
}

function import_localizations {
	export LOGGER_FORMAT="nice"
	cd "$BACKEND_DIR"
	fnm exec yarn workspace brandserver-backend import:localizations
}
