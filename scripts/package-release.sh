#!/usr/bin/env bash
set -euo pipefail

target_env="${1:-${RELEASE_ENV:-development}}"
input_version="${2:-${PACKAGE_VERSION:-}}"

case "$target_env" in
  development | dev)
    release_env="development"
    dist_tag="dev"
    prerelease="true"
    ;;
  staging | stage)
    release_env="staging"
    dist_tag="next"
    prerelease="true"
    ;;
  production | prod)
    release_env="production"
    dist_tag="latest"
    prerelease="false"
    ;;
  *)
    echo "Unsupported release env: $target_env" >&2
    echo "Use one of: development, staging, production" >&2
    exit 1
    ;;
esac

package_name="$(node -p "require('./package.json').name")"
package_version="${input_version:-$(node -p "require('./package.json').version")}"
package_version="${package_version#v}"
safe_name="$(printf '%s' "$package_name" | tr '/@' '--')"
short_sha="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"
short_sha="${short_sha:0:12}"
run_number="${GITHUB_RUN_NUMBER:-local}"

case "$release_env" in
  production)
    tag_name="v${package_version}"
    version_label="${package_version}"
    ;;
  staging)
    tag_name="v${package_version}-staging.${run_number}"
    version_label="${package_version}-staging.${run_number}"
    ;;
  development)
    tag_name="v${package_version}-dev.${short_sha}"
    version_label="${package_version}-dev.${short_sha}"
    ;;
esac

release_root=".release"
package_dir="${release_root}/${safe_name}-${release_env}-${version_label}"
archive_path="${release_root}/${safe_name}-${release_env}-${version_label}.tar.gz"

rm -rf "$package_dir" "$archive_path"
mkdir -p "$package_dir"

if [[ ! -d dist ]]; then
  echo "Missing dist directory. Run 'bun run build' before packaging." >&2
  exit 1
fi

cp -R dist "$package_dir/dist"
cp package.json "$package_dir/package.json"
cp bun.lock "$package_dir/bun.lock"
cp README.md "$package_dir/README.md"

if [[ -f .env.sample ]]; then
  cp .env.sample "$package_dir/.env.sample"
fi

cat > "$package_dir/release-metadata.json" <<JSON
{
  "name": "$package_name",
  "version": "$package_version",
  "releaseEnv": "$release_env",
  "distTag": "$dist_tag",
  "tagName": "$tag_name",
  "commit": "$short_sha"
}
JSON

tar -czf "$archive_path" -C "$release_root" "$(basename "$package_dir")"

cat > "${release_root}/package.env" <<ENV
PACKAGE_NAME=$package_name
PACKAGE_VERSION=$package_version
RELEASE_ENV=$release_env
DIST_TAG=$dist_tag
PRERELEASE=$prerelease
TAG_NAME=$tag_name
VERSION_LABEL=$version_label
ARCHIVE_PATH=$archive_path
ENV

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "package_name=$package_name"
    echo "package_slug=$safe_name"
    echo "package_version=$package_version"
    echo "release_env=$release_env"
    echo "dist_tag=$dist_tag"
    echo "prerelease=$prerelease"
    echo "tag_name=$tag_name"
    echo "version_label=$version_label"
    echo "archive_path=$archive_path"
  } >> "$GITHUB_OUTPUT"
fi

echo "Packaged ${package_name}@${version_label} for ${release_env}"
echo "Archive: ${archive_path}"
