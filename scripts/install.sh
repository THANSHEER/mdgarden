#!/bin/sh
# mdgarden installer — downloads the standalone binary (no Node required).
#
#   curl -fsSL https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh | sh
#
# Env overrides:
#   MDGARDEN_VERSION   tag to install (default: latest)
#   MDGARDEN_BIN_DIR   install dir (default: /usr/local/bin, fallback ~/.local/bin)
set -eu

REPO="THANSHEER/mdgarden"
VERSION="${MDGARDEN_VERSION:-latest}"

# Reject unexpected VERSION values before they are interpolated into a URL.
# Allows "latest" or release-style tags like v0.4.0 / 0.4.0-rc.1.
case "$VERSION" in
  latest) ;;
  v[0-9]*.[0-9]*.[0-9]*|[0-9]*.[0-9]*.[0-9]*)
    # Extra guard: only [A-Za-z0-9._-] so shell metacharacters never reach the URL.
    case "$VERSION" in
      *[!A-Za-z0-9._-]*)
        echo "mdgarden: invalid MDGARDEN_VERSION '$VERSION'" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "mdgarden: invalid MDGARDEN_VERSION '$VERSION'" >&2
    exit 1
    ;;
esac

# --- detect platform -------------------------------------------------------
os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Darwin) os="darwin" ;;
  Linux)  os="linux" ;;
  *) echo "mdgarden: unsupported OS '$os' — use npm: npm i -g mdgarden" >&2; exit 1 ;;
esac
case "$arch" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64)  arch="x64" ;;
  *) echo "mdgarden: unsupported arch '$arch' — use npm: npm i -g mdgarden" >&2; exit 1 ;;
esac

asset="mdgarden-${os}-${arch}.tar.gz"
# VERSION is validated above; assemble the URL without embedding untrusted shell.
if [ "$VERSION" = "latest" ]; then
  url='https://github.com/'"$REPO"'/releases/latest/download/'"$asset"
else
  url='https://github.com/'"$REPO"'/releases/download/'"$VERSION"'/'"$asset"
fi

# --- pick a writable install dir ------------------------------------------
bindir="${MDGARDEN_BIN_DIR:-/usr/local/bin}"
if [ ! -d "$bindir" ] || [ ! -w "$bindir" ]; then
  if [ "$bindir" = "/usr/local/bin" ]; then
    bindir="$HOME/.local/bin"
    mkdir -p "$bindir"
  else
    echo "mdgarden: install dir '$bindir' is not writable" >&2; exit 1
  fi
fi

# --- download + extract ----------------------------------------------------
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "mdgarden: downloading ${asset} (${VERSION})..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$url" -o "$tmp/m.tar.gz"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$tmp/m.tar.gz" "$url"
else
  echo "mdgarden: need curl or wget" >&2; exit 1
fi

tar -xzf "$tmp/m.tar.gz" -C "$tmp"
install -m 0755 "$tmp/mdgarden" "$bindir/mdgarden" 2>/dev/null || {
  mv "$tmp/mdgarden" "$bindir/mdgarden"; chmod 0755 "$bindir/mdgarden";
}

echo "mdgarden: installed to $bindir/mdgarden"
case ":$PATH:" in
  *":$bindir:"*) ;;
  *) echo "mdgarden: add $bindir to your PATH:  export PATH=\"$bindir:\$PATH\"" ;;
esac
"$bindir/mdgarden" --version || true
