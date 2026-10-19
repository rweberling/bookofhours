#!/bin/bash
# Readies a Claude Code cloud session for this repository:
#   1. brings main up to date, since several sessions push to it;
#   2. makes the no-sandbox Chrome wrapper build_sources.py needs, and sets CHROME;
#   3. installs the Python packages the scripts import (Pillow, fontTools), if missing.
# Never fails the session start: each step only warns.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 1. Latest main, but only on a clean main, and only a fast-forward.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$branch" = "main" ] && [ -z "$(git status --porcelain --untracked-files=no)" ]; then
  if git pull --ff-only --quiet origin main 2>/dev/null; then
    echo "main is up to date: $(git log -1 --format='%h %s')"
  else
    echo "Warning: couldn't fast-forward main; pull by hand before starting."
  fi
else
  echo "Note: on branch '$branch' or with local changes; not pulling."
fi

# 2. Chrome for build_sources.py (the container's Chromium needs --no-sandbox).
if [ -x /opt/pw-browsers/chromium ]; then
  wrapper="$HOME/.local/bin/chrome-nosandbox"
  mkdir -p "$(dirname "$wrapper")"
  printf '#!/bin/sh\nexec /opt/pw-browsers/chromium --no-sandbox "$@"\n' > "$wrapper"
  chmod +x "$wrapper"
  [ -n "${CLAUDE_ENV_FILE:-}" ] && echo "export CHROME=\"$wrapper\"" >> "$CLAUDE_ENV_FILE"
fi

# 3. Python packages the scripts use.
python3 -c 'import PIL, fontTools' 2>/dev/null \
  || pip install --quiet Pillow fonttools 2>/dev/null \
  || echo "Warning: couldn't install Pillow/fonttools."

exit 0
