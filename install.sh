#!/bin/sh
set -eu

REPO="${CTOUR_REPO:-Alice088/cognitive-tours-forge}"
BRANCH="${CTOUR_BRANCH:-main}"
FORCE_SOURCE="${CTOUR_FORCE_SOURCE:-}"
TARBALL_URL="${CTOUR_TARBALL_URL:-}"
PREFIX=""
TEMP=""

say() { printf '%s\n' "$*"; }
fail() {
  printf 'install: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [ -n "$TEMP" ] && [ -d "$TEMP" ]; then
    rm -rf "$TEMP"
  fi
}
trap cleanup EXIT INT TERM

usage() {
  cat <<'TEXT'
Install the ctour command on this machine.

  curl -fsSL https://raw.githubusercontent.com/Alice088/cognitive-tours-forge/main/install.sh | sh

Options (pass them after sh -s --):

  --prefix DIR   install into DIR instead of the machine-wide npm prefix
  --help         print this text
  --version      print the installer version

Environment:

  CTOUR_REPO         GitHub repository, owner/name        (default Alice088/cognitive-tours-forge)
  CTOUR_BRANCH       branch to read the sources from      (default main)
  CTOUR_TARBALL_URL   a packed ctour-<version>.tgz to use instead of building
  CTOUR_FORCE_SOURCE  build from $CTOUR_BRANCH even when a packed release exists
  CTOUR_PREFIX        same as --prefix

The installer needs Node.js 20 or newer and npm. It never writes inside your
projects: it installs a command, and the command writes there when you run it.
TEXT
}

while [ $# -gt 0 ]; do
  case "$1" in
    --help | -h)
      usage
      exit 0
      ;;
    --version)
      say "install.sh 0.1.0"
      exit 0
      ;;
    --prefix)
      [ $# -ge 2 ] || fail "--prefix needs a directory"
      PREFIX="$2"
      shift 2
      ;;
    --prefix=*)
      PREFIX="${1#--prefix=}"
      shift
      ;;
    *)
      fail "unknown option $1 (try --help)"
      ;;
  esac
done

[ -n "$PREFIX" ] || PREFIX="${CTOUR_PREFIX:-}"

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node.js 20 or newer, then run this again."
command -v npm >/dev/null 2>&1 || fail "npm is not installed. It ships with Node.js; install Node.js 20 or newer."

MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$MAJOR" -ge 20 ] 2>/dev/null || fail "Node.js $MAJOR is too old. This needs Node.js 20 or newer."

HERE="$(cd "$(dirname "$0")" 2>/dev/null && pwd || printf '')"

usable_source() {
  [ -n "$HERE" ] && [ -f "$HERE/package.json" ] && [ -f "$HERE/dist/cli.mjs" ] && [ -f "$HERE/.next/standalone/server.js" ]
}

TEMP="$(mktemp -d "${TMPDIR:-/tmp}/ctour-install.XXXXXX")"

pack_from_folder() {
  folder="$1"
  say "Packing the command from $folder"
  (cd "$folder" && npm pack --ignore-scripts --silent >/dev/null) || fail "npm pack failed in $folder"
  TARBALL="$(find "$folder" -maxdepth 1 -name 'ctour-*.tgz' -print | head -n 1)"
  [ -n "${TARBALL:-}" ] || fail "npm pack produced no tarball in $folder"
}

download_tarball() {
  url="$1"
  say "Downloading $url"
  mkdir -p "$TEMP/download"
  curl -fsSL "$url" -o "$TEMP/download/ctour.tgz" || fail "cannot download $url"
  TARBALL="$TEMP/download/ctour.tgz"
}

read_json_field() {
  node -e 'let text="";process.stdin.on("data",(chunk)=>text+=chunk).on("end",()=>{try{const value='"$1"';process.stdout.write(String(value ?? ""))}catch{}})' 2>/dev/null || printf ''
}

branch_version() {
  curl -fsSL --max-time 10 "https://raw.githubusercontent.com/$REPO/$BRANCH/package.json" 2>/dev/null |
    read_json_field 'JSON.parse(text).version'
}

tarball_field() {
  tar -xzOf "$1" package/dist/build.json 2>/dev/null |
    read_json_field "$2"
}

branch_commit() {
  curl -fsSL --max-time 10 "https://api.github.com/repos/$REPO/commits/$BRANCH" 2>/dev/null |
    read_json_field 'JSON.parse(text).sha'
}

release_matches_branch() {
  built="$(tarball_field "$TARBALL" 'JSON.parse(text).commit')"
  dirty="$(tarball_field "$TARBALL" 'JSON.parse(text).dirty')"
  if [ -z "$built" ]; then
    say "The packed release carries no build information; using it"
    return 0
  fi
  if [ "$dirty" = "true" ]; then
    say "The packed release was built from a working tree with uncommitted changes; building from source"
    return 1
  fi
  head="$(branch_commit)"
  if [ -z "$head" ]; then
    say "Cannot reach GitHub to compare the release with $BRANCH; using the release"
    return 0
  fi
  if [ "$built" != "$head" ]; then
    say "The packed release was built from $built, while $BRANCH is at $head; building from source"
    return 1
  fi
  return 0
}

release_tarball() {
  version="$(branch_version)"
  [ -n "$version" ] || return 1
  candidate="https://github.com/$REPO/releases/download/v$version/ctour-$version.tgz"
  curl -fsSL --max-time 10 --head "$candidate" >/dev/null 2>&1 || return 1
  download_tarball "$candidate"
  release_matches_branch
}

build_from_source() {
  say "Fetching the sources of $REPO ($BRANCH)"
  mkdir -p "$TEMP/source"
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TEMP/source/source.tar.gz" ||
    fail "cannot download the sources of $REPO"
  tar -xzf "$TEMP/source/source.tar.gz" -C "$TEMP/source" || fail "cannot unpack the sources"
  ROOT="$(find "$TEMP/source" -maxdepth 1 -mindepth 1 -type d -print | head -n 1)"
  [ -n "${ROOT:-}" ] || fail "the downloaded archive is empty"
  say "Installing build dependencies, this takes a couple of minutes"
  (cd "$ROOT" && npm install --no-audit --no-fund --loglevel=error) || fail "npm install failed"
  say "Building the interface and the command"
  (cd "$ROOT" && npm run build:all --silent) || fail "the build failed"
  pack_from_folder "$ROOT"
}

TARBALL=""
WANTED=""

if [ -n "$TARBALL_URL" ]; then
  download_tarball "$TARBALL_URL"
elif [ -n "$FORCE_SOURCE" ] && [ -z "$HERE" ]; then
  WANTED="$(branch_version)"
  build_from_source
elif usable_source; then
  pack_from_folder "$HERE"
elif release_tarball; then
  WANTED="$(branch_version)"
  say "Using the packed release of $REPO ($WANTED)"
else
  WANTED="$(branch_version)"
  build_from_source
fi

say "Installing ctour"
if [ -n "$PREFIX" ]; then
  npm install -g "$TARBALL" --ignore-scripts --prefix "$PREFIX" --loglevel=error >/dev/null ||
    fail "npm install failed into $PREFIX"
  BIN="$PREFIX/bin/ctour"
else
  if ! npm install -g "$TARBALL" --ignore-scripts --loglevel=error >/dev/null 2>&1; then
    say "The machine-wide npm prefix is not writable; installing into $HOME/.local instead"
    npm install -g "$TARBALL" --ignore-scripts --prefix "$HOME/.local" --loglevel=error >/dev/null ||
      fail "npm install failed into $HOME/.local"
    BIN="$HOME/.local/bin/ctour"
    case ":${PATH:-}:" in
      *":$HOME/.local/bin:"*) ;;
      *) say "Add $HOME/.local/bin to your PATH: echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.profile" ;;
    esac
  else
    BIN="$(command -v ctour || true)"
  fi
fi

[ -n "${BIN:-}" ] && [ -x "$BIN" ] || fail "the command was installed but is not on PATH"
"$BIN" --version || fail "the installed command does not run"

INSTALLED="$("$BIN" --version | awk '{print $2}')"
if [ -n "$WANTED" ] && [ "$INSTALLED" != "$WANTED" ]; then
  say "Warning: installed $INSTALLED while $BRANCH is at $WANTED"
fi

say ""
say "Done. Next:"
say "  cd ~/code/your-project"
say "  ctour init"
say "  ctour serve        # later, to open the interface again"
