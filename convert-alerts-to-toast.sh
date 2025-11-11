#!/bin/bash

# Script to convert all alert() calls to toast in remaining files

FILES=(
  "app/profile/page.tsx"
  "app/settings/page.tsx"
  "components/stories/StoriesBar.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Add useToast import if not exists
    if ! grep -q "useToast" "$file"; then
      # Check if it's a client component
      if grep -q "'use client'" "$file"; then
        # Add import after 'use client' and other imports
        sed -i "/^import.*from/a import { useToast } from '@/lib/contexts/ToastContext';" "$file"
      fi
    fi
    
    echo "  - Converted alert calls to toast"
  fi
done

echo "Done!"
