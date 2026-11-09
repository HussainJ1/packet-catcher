#!/usr/bin/env bash
# Runs tests.html in a headless browser and prints the results.
# Exits 0 if every test passes, 1 if any fail, 2 if no browser was found.
set -u
cd "$(dirname "$0")"

find_browser() {
  for b in chromium chromium-browser google-chrome google-chrome-stable microsoft-edge; do
    command -v "$b" >/dev/null 2>&1 && { echo "$b"; return; }
  done
  for b in "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
           "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"; do
    [ -x "$b" ] && { echo "$b"; return; }
  done
}

BROWSER=$(find_browser)
if [ -z "$BROWSER" ]; then
  echo "No Chrome, Chromium or Edge found. Open tests.html in a browser instead." >&2
  exit 2
fi

# Windows browsers under WSL need a Windows-style file URL.
if [[ "$BROWSER" == /mnt/* ]]; then
  URL="file:$(wslpath -w "$PWD/tests.html" | sed 's#\\#/#g')"
else
  URL="file://$PWD/tests.html"
fi

DOM=$("$BROWSER" --headless --disable-gpu --allow-file-access-from-files --dump-dom "$URL" 2>/dev/null)

echo "$DOM" | sed 's#</li>#</li>\n#g' \
  | sed -n 's/.*<li class="[a-z]*">\([^<]*\)\(<pre>\([^<]*\)<\/pre>\)\?<\/li>.*/\1  \3/p'
SUMMARY=$(echo "$DOM" | sed -n 's/.*<div id="summary"[^>]*>\([^<]*\)<.*/\1/p')
echo
echo "${SUMMARY:-No results: the test page did not finish loading}"

[[ "$SUMMARY" == "ALL PASSED"* ]]
