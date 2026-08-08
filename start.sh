#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backend_directory="$repo_root/backend"
frontend_directory="$repo_root/frontend"
backend_environment="$backend_directory/.env"
backend_output="$(mktemp "${TMPDIR:-/tmp}/kai-pool-backend.XXXXXX")"
backend_pid=""

cleanup() {
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
  rm -f "$backend_output"
}

show_backend_logs() {
  if [[ -f "$backend_output" ]]; then
    tail -n 30 "$backend_output"
  fi
}

import_dotenv() {
  local path="$1"
  local line name value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *"="* ]] || continue

    name="${line%%=*}"
    value="${line#*=}"
    name="${name//[[:space:]]/}"

    [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    if [[ ${#value} -ge 2 ]]; then
      if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] ||
        [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi

    export "$name=$value"
  done < "$path"
}

get_local_ipv4_address() {
  local interface address

  if [[ "$(uname -s)" == "Darwin" ]]; then
    interface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
    if [[ -n "$interface" ]]; then
      address="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
      if [[ -n "$address" ]]; then
        printf '%s\n' "$address"
        return
      fi
    fi
  fi

  if command -v ip >/dev/null 2>&1; then
    address="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')"
    if [[ -n "$address" ]]; then
      printf '%s\n' "$address"
      return
    fi
  fi

  address="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [[ -n "$address" ]]; then
    printf '%s\n' "$address"
    return
  fi

  return 1
}

trap cleanup EXIT INT TERM

if [[ ! -f "$backend_environment" ]]; then
  echo "backend/.env is missing. Complete the one-time Supabase and AI setup first." >&2
  exit 1
fi

import_dotenv "$backend_environment"

for variable in DB_URL DB_USERNAME DB_PASSWORD JWT_SECRET GEMINI_API_KEY; do
  value="${!variable:-}"
  if [[ -z "$value" || "$value" =~ YOUR_|PROJECT_REFERENCE|replace-with ]]; then
    echo "$variable is missing from backend/.env." >&2
    exit 1
  fi
done

for command in java node npm curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is not installed or is not available in PATH." >&2
    exit 1
  fi
done

if [[ ! -d "$frontend_directory/node_modules" ]]; then
  echo "Installing frontend packages..."
  (cd "$frontend_directory" && npm install)
fi

echo "Starting Kai Pool backend..."
(cd "$backend_directory" && ./gradlew --no-daemon bootRun) >"$backend_output" 2>&1 &
backend_pid=$!

backend_ready=false
for _ in $(seq 1 60); do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    break
  fi
  if curl --silent --fail --max-time 1 "http://127.0.0.1:8080/api/health" >/dev/null; then
    backend_ready=true
    break
  fi
  sleep 1
done

if [[ "$backend_ready" != true ]]; then
  show_backend_logs
  echo "The backend did not start. Check the messages above." >&2
  exit 1
fi

local_address="$(get_local_ipv4_address || true)"
if [[ -z "$local_address" ]]; then
  echo "Could not find this computer's local IP address." >&2
  exit 1
fi

export EXPO_PUBLIC_API_URL="http://${local_address}:8080"
lan_health_url="$EXPO_PUBLIC_API_URL/api/health"

if ! curl --silent --fail --max-time 3 "$lan_health_url" >/dev/null; then
  show_backend_logs
  echo "The backend works locally but is not listening on the LAN address $local_address." >&2
  exit 1
fi

echo
echo "Backend ready for phones at $EXPO_PUBLIC_API_URL"
echo "Phone connection test: $lan_health_url"
echo
echo "Every phone must be on the same Wi-Fi as this computer."
echo "Public or guest Wi-Fi may block devices from talking to each other."
echo "iPhone: scan the QR code with Camera or Expo Go."
echo "Android: open Expo Go and tap Scan QR code."
echo "If another phone cannot open the connection test URL in its browser,"
echo "allow incoming connections for Java and Node.js in the system firewall."
echo
echo "Starting Expo..."
echo "Keep this terminal open. Press Ctrl+C when finished."

cd "$frontend_directory"
npx expo start --lan --go
