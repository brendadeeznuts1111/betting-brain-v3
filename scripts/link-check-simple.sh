#!/bin/bash
# Simple Link Checker - No dependencies required
# Checks all markdown links in the repository

echo "🔍 Checking all markdown links..."
echo ""

errors=0
total_links=0
files_checked=0

# Find all markdown files
for md_file in $(find . -name "*.md" -not -path "./node_modules/*" -not -path "./.wrangler/*" -not -path "./dist/*"); do
  ((files_checked++))
  
  # Extract links: [text](url)
  grep -o '\[.*\]([^)]*)' "$md_file" 2>/dev/null | while IFS= read -r link; do
    # Extract URL from [text](url)
    url=$(echo "$link" | sed 's/.*(\(.*\))/\1/')
    
    # Skip external URLs, anchors, and mailto
    if [[ $url =~ ^http ]] || [[ $url =~ ^# ]] || [[ $url =~ ^mailto ]]; then
      continue
    fi
    
    ((total_links++))
    
    # Get directory of current file
    dir=$(dirname "$md_file")
    
    # Resolve relative path
    if [[ $url =~ ^\.\. ]]; then
      # Go up one directory
      target="$dir/$url"
    elif [[ $url =~ ^\. ]]; then
      # Current directory
      target="$dir/$url"
    else
      # Relative to current directory
      target="$dir/$url"
    fi
    
    # Normalize path
    target=$(realpath -s "$target" 2>/dev/null || echo "$target")
    
    # Check if target exists
    if [ ! -e "$target" ] && [ ! -d "$target" ]; then
      echo "  ❌ BROKEN: $md_file"
      echo "     → [$url]"
      echo "     Resolved to: $target"
      echo ""
      ((errors++))
    fi
  done
done

echo "✅ Checked $total_links internal links in $files_checked files"
echo ""

if [ $errors -eq 0 ]; then
  echo "✅ All internal links are valid!"
  echo ""
  echo "📊 Summary:"
  echo "  - Files scanned: $files_checked"
  echo "  - Links checked: $total_links+"
  echo "  - Broken links: 0"
  echo "  - Status: PASS ✅"
  echo ""
  exit 0
else
  echo "❌ Found broken links"
  echo ""
  echo "📊 Summary:"
  echo "  - Files scanned: $files_checked"
  echo "  - Links checked: $total_links+"
  echo "  - Broken links: $errors"
  echo "  - Status: FAIL ❌"
  echo ""
  exit 1
fi
