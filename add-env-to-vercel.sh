#!/bin/bash

# Vercel Token
TOKEN="2gyijkYv3YZFOofdIj63Bprl"

# Get project ID from Vercel
echo "Fetching project information..."
PROJECT_INFO=$(curl -s "https://api.vercel.com/v9/projects" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROJECT_INFO" | jq -r '.projects[] | select(.name | contains("light")) | .id, .name'

# Read project ID
read -p "Enter your project ID from above: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  exit 1
fi

# Function to add environment variable
add_env() {
  local key=$1
  local value=$2
  local target=${3:-"production,preview,development"}
  
  echo "Adding $key..."
  
  curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"$key\",
      \"value\": \"$value\",
      \"type\": \"encrypted\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }" 2>/dev/null | jq -r '.created // .error.message'
}

# Add all environment variables from .env.example
echo ""
echo "Adding environment variables..."
echo ""

add_env "DATABASE_URL" "postgresql://neondb_owner:npg_Hf73CljbDXzF@ep-fancy-forest-aedpagn2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
add_env "CLOUDINARY_CLOUD_NAME" "dju50upuw"
add_env "CLOUDINARY_API_KEY" "865927968512142"
add_env "CLOUDINARY_API_SECRET" "SdfoH8iC4xi_2joit-mcP0c1DBQ"
add_env "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" "dju50upuw"
add_env "PUSHER_APP_ID" "2061314"
add_env "PUSHER_KEY" "b0f5756f20e894c0c2e7"
add_env "PUSHER_SECRET" "0af888670cc72dbbf5ab"
add_env "PUSHER_CLUSTER" "us2"
add_env "NEXT_PUBLIC_PUSHER_APP_KEY" "b0f5756f20e894c0c2e7"
add_env "NEXT_PUBLIC_PUSHER_CLUSTER" "us2"
add_env "EMAIL_USER" "noreplylightoflife@gmail.com"
add_env "EMAIL_PASS" "cabjjzptfsxnzxlr"
add_env "JWT_SECRET" "40ade169e4af9a22a65ee4c1c776cd9ecb6c98ef5a43d94ea818f8ec3401af72aa76442d047f38a8e99b568535d9a33aaeb25c768568b790c477f09dbf27bfd9"
add_env "NEXT_PUBLIC_APP_URL" "https://light-web-project-3xz0dhfao-anwar-kouns-projects.vercel.app"

echo ""
echo "✅ All environment variables added successfully!"
echo ""
echo "Now redeploy your project on Vercel to apply the changes."
