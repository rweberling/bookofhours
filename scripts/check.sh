#!/bin/sh
# Every check, before a push (and on GitHub after one: .github/workflows/check.yml).
#
#   scripts/check.sh                  # everything: about two minutes
#   scripts/check.sh first-frost      # the browser check on these posts only
#
#   1. Is every built file up to date with the data?  (scripts/build.py --check)
#   2. Is the data whole and consistent?               (scripts/check_data.py)
#   3. Do the pages work in a browser?                 (scripts/check_pages.js)
#
# Exits 1 if any of them finds a problem, saying which.
cd "$(dirname "$0")/.." || exit 2
status=0

echo "== Built files"
python3 scripts/build.py --check || status=1

echo
echo "== Data"
python3 scripts/check_data.py > /tmp/check_data.$$ 2>&1 || status=1
# The gaps are a to-do list, not a failure; show only the verdict.
grep -E "error|^  [a-z]+-[0-9]|No errors|out of date|Run:" /tmp/check_data.$$ | grep -v "^  [a-z ]*: [0-9]*$"
rm -f /tmp/check_data.$$

echo
echo "== Pages in a browser"
LANG=C.UTF-8 node scripts/check_pages.js "$@" || status=1

echo
if [ $status -eq 0 ]; then echo "All checks passed."; else echo "Something needs attention (above)."; fi
exit $status
