#!/bin/bash

# Vercel Token
TOKEN="Q9DPtzsXWuDKtj33XNDmZZpt"

# Get project ID from Vercel
echo "Fetching project information..."
PROJECT_INFO=$(curl -s "https://api.vercel.com/v9/projects" \
  -H "Authorization: Bearer $TOKEN")

echo "Available projects:"
echo "$PROJECT_INFO" | jq -r '.projects[] | "\(.id) - \(.name)"'

# Read project ID
echo ""
read -p "Enter your project ID from above: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  exit 1
fi

# Function to add environment variable
add_env() {
  local key=$1
  local value=$2
  
  echo "Adding $key..."
  
  curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$key\",
      \"value\": \"$value\",
      \"type\": \"encrypted\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }" 2>/dev/null | jq -r '.created // .error.message // "Added"'
}

# Add LiveKit environment variables
echo ""
echo "Adding LiveKit environment variables..."
echo ""

add_env "LIVEKIT_API_KEY" "APIdNFrk9BNoMdQ"
add_env "LIVEKIT_API_SECRET" "IgbzWXkeFtJuafogTLgTdpgpqLIe9LbhauvQ5ZDLeieH"
add_env "NEXT_PUBLIC_LIVEKIT_URL" "wss://light-web-4bn0nvjb.livekit.cloud"

echo ""
echo "✅ LiveKit environment variables added successfully!"
echo ""
echo "Now trigger a new deployment on Vercel to apply the changes:"
echo "1. Go to your Vercel dashboard"
echo "2. Select your project"
echo "3. Go to Deployments tab"
echo "4. Click 'Redeploy' on the latest deployment"
echo ""
echo "Or push a new commit to GitHub to trigger automatic deployment."
