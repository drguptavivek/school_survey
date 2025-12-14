# Calls Claude API to evaluate which skills match

EVAL_PROMPT=$(cat <<EOF
Return ONLY a JSON array of skill names that match this request.

Request: ${USER_PROMPT}

Skills:
${AVAILABLE_SKILLS}
Format: ["skill-name"] or []
EOF
)

RESPONSE=$(curl -s https://api.anthropic.com/v1/messages 
  -H "content-type: application/json" 
  -H "x-api-key: $ANTHROPIC_API_KEY" 
  -d "{
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 200,
    "messages": [{
      "role": "user",
      "content": $(echo "$EVAL_PROMPT" | jq -Rs .)
    }]
  }")

# Extract skills and instruct Claude to activate them