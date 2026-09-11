#!/usr/bin/env bash
set -Eeuo pipefail

trap 'printf "Erro na linha %s; nenhuma etapa posterior foi executada.\n" "$LINENO" >&2' ERR

MODE="${1:---check}"
TARGET_USER="$(/usr/bin/id -un)"
TARGET_GROUP="staff"
TARGET_HOME="${HOME}"
USER_TSC="${TARGET_HOME}/.npm-global/bin/tsc"
SYSTEM_TSC_DIR="/usr/local/lib/node_modules/typescript"
BACKUP_DIR="${TARGET_HOME}/ai-maintenance/2026-09-10/backups"
TS_BACKUP="${BACKUP_DIR}/typescript-usr-local-5.8.3.tar"
PM2_DIR="${TARGET_HOME}/.npm-global/lib/node_modules/pm2"
PM2_LINKS=(
  "${TARGET_HOME}/.npm-global/bin/pm2"
  "${TARGET_HOME}/.npm-global/bin/pm2-dev"
  "${TARGET_HOME}/.npm-global/bin/pm2-docker"
  "${TARGET_HOME}/.npm-global/bin/pm2-runtime"
)

usage() {
  printf 'Uso: %s --check | --apply | --rollback-typescript\n' "$0"
}

resolve_login_tsc() {
  /usr/bin/env -i \
    HOME="${TARGET_HOME}" USER="${TARGET_USER}" LOGNAME="${TARGET_USER}" \
    SHELL=/bin/zsh PATH=/usr/bin:/bin:/usr/sbin:/sbin TERM=dumb \
    /bin/zsh -lc 'command -v tsc'
}

preflight() {
  [[ "${EUID}" -ne 0 ]] || {
    printf 'Execute como usuário normal; o script chama sudo apenas nas duas operações necessárias.\n' >&2
    return 1
  }
  [[ "${TARGET_USER}" == "felixrodrigues" ]] || {
    printf 'Este executor pertence ao Mac do Felix; usuário atual: %s.\n' "${TARGET_USER}" >&2
    return 1
  }
  [[ "${TARGET_HOME}" == "/Users/felixrodrigues" ]] || {
    printf 'HOME inesperado para o Mac do Felix: %s.\n' "${TARGET_HOME}" >&2
    return 1
  }
  [[ -x "${USER_TSC}" ]] || {
    printf 'TypeScript pessoal ausente em %s.\n' "${USER_TSC}" >&2
    return 1
  }

  local resolved_tsc
  resolved_tsc="$(resolve_login_tsc)"
  [[ "${resolved_tsc}" == "${USER_TSC}" ]] || {
    printf 'Shell de login ainda resolve tsc em %s; esperado %s.\n' "${resolved_tsc}" "${USER_TSC}" >&2
    return 1
  }

  printf 'Shell de login: %s (%s)\n' "${resolved_tsc}" "$("${USER_TSC}" --version)"

  if [[ -d "${SYSTEM_TSC_DIR}" ]]; then
    /usr/bin/diff -qr "${TARGET_HOME}/.npm-global/lib/node_modules/typescript" "${SYSTEM_TSC_DIR}" >/dev/null
    printf 'TypeScript /usr/local: duplicata byte a byte confirmada.\n'
  else
    printf 'TypeScript /usr/local: ausente.\n'
  fi

  if [[ -d "${PM2_DIR}" ]]; then
    local foreign_owner
    foreign_owner="$(/usr/bin/find "${PM2_DIR}" ! -user "${TARGET_USER}" -print -quit)"
    if [[ -n "${foreign_owner}" ]]; then
      printf 'PM2: ownership ainda precisa de reparo.\n'
    else
      printf 'PM2: ownership já pertence a %s.\n' "${TARGET_USER}"
    fi
  else
    printf 'PM2: pacote ausente; etapa de ownership será ignorada.\n'
  fi
}

apply_changes() {
  preflight
  /bin/mkdir -p -m 700 "${BACKUP_DIR}"

  if [[ -d "${SYSTEM_TSC_DIR}" && ! -f "${TS_BACKUP}" ]]; then
    /usr/bin/tar -cpf "${TS_BACKUP}" -C /usr/local \
      lib/node_modules/typescript bin/tsc bin/tsserver
    /bin/chmod 600 "${TS_BACKUP}"
    /usr/bin/shasum -a 256 "${TS_BACKUP}" > "${TS_BACKUP}.sha256"
    /bin/chmod 600 "${TS_BACKUP}.sha256"
    printf 'Backup TypeScript criado em %s.\n' "${TS_BACKUP}"
  fi

  if [[ -d "${SYSTEM_TSC_DIR}" ]]; then
    [[ -f "${TS_BACKUP}" && -f "${TS_BACKUP}.sha256" ]]
    /usr/bin/shasum -a 256 -c "${TS_BACKUP}.sha256" >/dev/null
  fi

  /usr/bin/sudo -v

  if [[ -d "${PM2_DIR}" ]]; then
    /usr/bin/sudo /usr/sbin/chown -R "${TARGET_USER}:${TARGET_GROUP}" "${PM2_DIR}"
    for link in "${PM2_LINKS[@]}"; do
      if [[ -L "${link}" ]]; then
        /usr/bin/sudo /usr/sbin/chown -h "${TARGET_USER}:${TARGET_GROUP}" "${link}"
        [[ "$(/usr/bin/stat -f '%Su' "${link}")" == "${TARGET_USER}" ]]
      fi
    done
    [[ -z "$(/usr/bin/find "${PM2_DIR}" ! -user "${TARGET_USER}" -print -quit)" ]]
    printf 'PM2: ownership reparado.\n'
  fi

  if [[ -d "${SYSTEM_TSC_DIR}" ]]; then
    /usr/bin/sudo /usr/bin/env -i \
      HOME=/var/root USER=root LOGNAME=root \
      PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
      NPM_CONFIG_PREFIX=/usr/local NPM_CONFIG_USERCONFIG=/dev/null \
      /usr/local/bin/npm uninstall -g typescript
  fi

  [[ ! -e /usr/local/bin/tsc && ! -d "${SYSTEM_TSC_DIR}" ]]
  [[ "$(resolve_login_tsc)" == "${USER_TSC}" ]]
  "${USER_TSC}" --version
  printf 'Aplicação concluída. Nenhum upgrade de versão foi executado.\n'
}

rollback_typescript() {
  [[ "${EUID}" -ne 0 ]] || {
    printf 'Execute como usuário normal.\n' >&2
    return 1
  }
  [[ -f "${TS_BACKUP}" ]] || {
    printf 'Backup ausente: %s\n' "${TS_BACKUP}" >&2
    return 1
  }
  [[ -f "${TS_BACKUP}.sha256" ]]
  /usr/bin/shasum -a 256 -c "${TS_BACKUP}.sha256" >/dev/null
  [[ ! -e /usr/local/bin/tsc && ! -d "${SYSTEM_TSC_DIR}" ]] || {
    printf 'TypeScript já existe em /usr/local; rollback recusado para evitar sobrescrita.\n' >&2
    return 1
  }
  /usr/bin/sudo /usr/bin/tar -xpf "${TS_BACKUP}" -C /usr/local
  /usr/local/bin/tsc --version
  printf 'TypeScript /usr/local restaurado a partir do backup.\n'
}

case "${MODE}" in
  --check) preflight ;;
  --apply) apply_changes ;;
  --rollback-typescript) rollback_typescript ;;
  *) usage; exit 2 ;;
esac
