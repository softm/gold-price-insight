#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
keystore_dir="${project_root}/keystore"
keystore_path="${keystore_dir}/gold-signal-upload.jks"
properties_path="${project_root}/signing.properties"

if [[ -f "${keystore_path}" || -f "${properties_path}" ]]; then
  echo "Upload key already exists; no files were changed."
  exit 0
fi

umask 077
mkdir -p "${keystore_dir}"
upload_password="$(openssl rand -hex 24)"
export GOLD_SIGNAL_UPLOAD_PASSWORD="${upload_password}"

keytool -genkeypair \
  -keystore "${keystore_path}" \
  -storetype JKS \
  -alias gold-signal-upload \
  -keyalg RSA \
  -keysize 4096 \
  -sigalg SHA256withRSA \
  -validity 9125 \
  -dname "CN=Gold Signal, OU=Mobile, O=softm, L=Seoul, ST=Seoul, C=KR" \
  -storepass:env GOLD_SIGNAL_UPLOAD_PASSWORD \
  -keypass:env GOLD_SIGNAL_UPLOAD_PASSWORD

{
  printf 'storeFile=keystore/gold-signal-upload.jks\n'
  printf 'storePassword=%s\n' "${upload_password}"
  printf 'keyAlias=gold-signal-upload\n'
  printf 'keyPassword=%s\n' "${upload_password}"
} > "${properties_path}"

unset GOLD_SIGNAL_UPLOAD_PASSWORD upload_password
chmod 600 "${properties_path}" "${keystore_path}"
echo "Created the local Google Play upload key and signing.properties."
