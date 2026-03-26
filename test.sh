#!/bin/bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

usage() {
  cat <<EOF
Usage: $SCRIPT_NAME <webhook_url> <command> [options]

Commands:
  text [event] [channel] [emoji]                Send a text notification (default)
  photo <url> [event] [channel] [emoji]         Send a photo with template caption
  photo <url> --caption "custom caption"        Send a photo with custom caption
  document <url> [event] [channel] [emoji]      Send a document with template caption
  document <url> --caption "custom caption"     Send a document with custom caption
  raw <text>                                    Send raw HTML/MarkdownV2 text
  sticker <file_id_or_url>                      Send a sticker
  all                                           Run all tests

Options:
  --md             Use MarkdownV2 instead of HTML
  --silent         Send without notification sound
  --caption "..."  Custom caption for photo/document (overrides template)
  --meta k=v       Add metadata key-value pair (repeatable)

Examples:
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx text "Deploy Done" CI 🚀
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx text "Alert" --meta env=prod --meta region=us-east
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx photo "https://picsum.photos/400/300" "Screenshot" CI 📸
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx photo "https://picsum.photos/400/300" --caption "<b>Custom</b>"
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx document "https://example.com/report.pdf" "Report Ready" Analytics 📊
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx raw "<b>Hello</b> <i>world</i>"
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx all
  $SCRIPT_NAME https://poke.keyp.dev/t/xxx all --silent
EOF
  exit 1
}

URL="${1:-}"
CMD="${2:-text}"
[ -z "$URL" ] && usage

shift 2 2>/dev/null || shift 1 2>/dev/null || true

# Parse flags and positional args
PARSE_MODE="HTML"
NOTIFY=true
CAPTION=""
ARGS=()
META_PAIRS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --md) PARSE_MODE="MarkdownV2" ;;
    --silent) NOTIFY=false ;;
    --caption) shift; CAPTION="$1" ;;
    --meta) shift; META_PAIRS+=("$1") ;;
    *) ARGS+=("$1") ;;
  esac
  shift
done

# Build metadata JSON from --meta flags and auto fields
build_metadata() {
  local parts=()
  parts+=("\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"")
  parts+=("\"host\":\"$(hostname)\"")
  for pair in "${META_PAIRS[@]+"${META_PAIRS[@]}"}"; do
    local key="${pair%%=*}"
    local val="${pair#*=}"
    parts+=("\"$key\":\"$val\"")
  done
  echo "{$(IFS=,; echo "${parts[*]}")}"
}

# JSON-escape a string
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read().rstrip('\n')))" <<< "$1"
}

post() {
  local data="$1"
  local label="${2:-}"
  [ -n "$label" ] && printf "%-14s " "[$label]"
  local response
  response=$(curl -s --retry 2 --retry-connrefused -w "\n%{http_code}" -X POST "$URL" -H "Content-Type: application/json" -d "$data")
  local http_code="${response##*$'\n'}"
  local body="${response%$'\n'*}"
  if [ "$http_code" = "200" ]; then
    echo "$body" | python3 -m json.tool
  else
    echo "HTTP $http_code"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# Build template fields JSON fragment
template_fields() {
  local event="${1:-}"
  local channel="${2:-}"
  local emoji="${3:-}"
  local fields=""
  [ -n "$event" ] && fields="$fields,\"event\":$(json_escape "$event")"
  [ -n "$channel" ] && fields="$fields,\"channel\":$(json_escape "$channel")"
  [ -n "$emoji" ] && fields="$fields,\"emoji\":$(json_escape "$emoji")"
  fields="$fields,\"metadata\":$(build_metadata)"
  echo "$fields"
}

case "$CMD" in
  text)
    EVENT="${ARGS[0]:-Test Event}"
    CHANNEL="${ARGS[1]:-CLI}"
    EMOJI="${ARGS[2]:-🔔}"
    TMPL=$(template_fields "$EVENT" "$CHANNEL" "$EMOJI")
    post "{\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}"
    ;;

  photo)
    PHOTO="${ARGS[0]:?Missing photo URL}"
    if [ -n "$CAPTION" ]; then
      post "{\"type\":\"photo\",\"photo\":$(json_escape "$PHOTO"),\"caption\":$(json_escape "$CAPTION"),\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY}"
    else
      EVENT="${ARGS[1]:-Photo}"
      CHANNEL="${ARGS[2]:-}"
      EMOJI="${ARGS[3]:-📸}"
      TMPL=$(template_fields "$EVENT" "$CHANNEL" "$EMOJI")
      post "{\"type\":\"photo\",\"photo\":$(json_escape "$PHOTO"),\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}"
    fi
    ;;

  document)
    DOC="${ARGS[0]:?Missing document URL}"
    if [ -n "$CAPTION" ]; then
      post "{\"type\":\"document\",\"document\":$(json_escape "$DOC"),\"caption\":$(json_escape "$CAPTION"),\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY}"
    else
      EVENT="${ARGS[1]:-Document}"
      CHANNEL="${ARGS[2]:-}"
      EMOJI="${ARGS[3]:-📎}"
      TMPL=$(template_fields "$EVENT" "$CHANNEL" "$EMOJI")
      post "{\"type\":\"document\",\"document\":$(json_escape "$DOC"),\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}"
    fi
    ;;

  raw)
    TEXT="${ARGS[0]:?Missing text}"
    post "{\"type\":\"raw\",\"text\":$(json_escape "$TEXT"),\"notify\":$NOTIFY,\"parse_mode\":\"$PARSE_MODE\"}"
    ;;

  sticker)
    STICKER="${ARGS[0]:?Missing sticker file_id or URL}"
    post "{\"type\":\"sticker\",\"sticker\":$(json_escape "$STICKER"),\"notify\":$NOTIFY}"
    ;;

  all)
    echo "Running all tests..."
    echo ""

    # 1. text with metadata
    TMPL=$(template_fields "Text Notification" "Test" "📝")
    post "{\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}" "text"

    # 2. photo with template
    TMPL=$(template_fields "Photo with Template" "Test" "📸")
    post "{\"type\":\"photo\",\"photo\":\"https://picsum.photos/400/300\",\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}" "photo+tmpl"

    # 3. photo with custom caption
    post "{\"type\":\"photo\",\"photo\":\"https://picsum.photos/400/300\",\"caption\":\"<b>Custom Caption</b>\n\nThis uses caption instead of template.\",\"parse_mode\":\"HTML\",\"notify\":$NOTIFY}" "photo+caption"

    # 4. document with template
    TMPL=$(template_fields "Report Generated" "Analytics" "📊")
    post "{\"type\":\"document\",\"document\":\"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\",\"parse_mode\":\"$PARSE_MODE\",\"notify\":$NOTIFY$TMPL}" "doc+tmpl"

    # 5. document with custom caption
    post "{\"type\":\"document\",\"document\":\"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\",\"caption\":\"<b>Test PDF</b>\",\"parse_mode\":\"HTML\",\"notify\":$NOTIFY}" "doc+caption"

    # 6. raw HTML
    post "{\"type\":\"raw\",\"text\":\"<b>Raw HTML</b>\n\nDirect message with <i>formatting</i> and <code>code</code>.\",\"notify\":$NOTIFY,\"parse_mode\":\"HTML\"}" "raw"

    echo ""
    echo "All tests done (6/6)."
    ;;

  *)
    echo "Unknown command: $CMD"
    usage
    ;;
esac
