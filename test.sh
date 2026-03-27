#!/bin/bash
# Usage: ./test.sh <webhook_url> [event] [channel] [emoji]
# Example: ./test.sh https://poke.keyp.dev/t/xxx "Deploy Done" CI 🚀

URL="${1:?Usage: ./test.sh <webhook_url> [event] [channel] [emoji]}"
EVENT="${2:-Test Event}"
CHANNEL="${3:-CLI}"
EMOJI="${4:-🔔}"

curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "event": "$EVENT",
  "channel": "$CHANNEL",
  "emoji": "$EMOJI",
  "metadata": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "host": "$(hostname)"
  },
  "notify": true
}
EOF
)" | python3 -m json.tool
