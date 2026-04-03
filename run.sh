#!/bin/bash
# One-command Hermes CLI installer and runner
# Usage: curl -sL https://raw.githubusercontent.com/boofpackdev/bunny/main/run.sh | bash -s -- "Hello Hermes!"

set -e

INSTALL_DIR="${HOME}/.bunny"
BIN_DIR="${INSTALL_DIR}/bin"
SRC_DIR="${INSTALL_DIR}/src"

# Install bun if not present
if ! command -v bun &> /dev/null; then
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:$PATH"
fi

# Clone or update repo
if [ ! -d "$SRC_DIR" ]; then
  mkdir -p "$INSTALL_DIR"
  git clone --depth 1 https://github.com/boofpackdev/bunny "$SRC_DIR"
  cd "$SRC_DIR"
  bun install
else
  cd "$SRC_DIR"
  git pull --quiet
fi

# Run the CLI with any args
exec bun run "$SRC_DIR/src/index.ts" "$@"
