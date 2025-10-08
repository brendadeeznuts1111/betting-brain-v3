#!/bin/bash

# A script to automate the version bump, commit, and tag process for .cursorrules.
# Usage: ./scripts/bump-version.sh <major|minor|patch> "Your commit message"

set -e # Exit immediately if a command exits with a non-zero status.

# 1. Define variables
VERSION_TYPE=$1
COMMIT_MESSAGE=$2
RULES_FILE=".cursorrules"

if [ -z "$VERSION_TYPE" ] || [ -z "$COMMIT_MESSAGE" ]; then
  echo "❌ Error: Missing arguments."
  echo "Usage: $0 <major|minor|patch> \"Your commit message\""
  exit 1
fi

# 2. Get the current version from the file
CURRENT_VERSION=$(grep '^version:' $RULES_FILE | awk '{print $2}')
if [ -z "$CURRENT_VERSION" ]; then
  echo "❌ Error: Could not find version in $RULES_FILE."
  exit 1
fi

# 3. Calculate the new version
IFS='.' read -r -a V_PARTS <<< "$CURRENT_VERSION"
MAJOR=${V_PARTS[0]}
MINOR=${V_PARTS[1]}
PATCH=${V_PARTS[2]}

case "$VERSION_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "❌ Error: Invalid version type '$VERSION_TYPE'. Use 'major', 'minor', or 'patch'."
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Current version: $CURRENT_VERSION"
echo "New version:     $NEW_VERSION"

# 4. Update the version in the .cursorrules file
# The sed command works on both macOS and Linux
sed -i.bak "s/^version: $CURRENT_VERSION/version: $NEW_VERSION/" $RULES_FILE
rm "${RULES_FILE}.bak"

# 5. Commit and Tag
git add $RULES_FILE
git commit -m "$COMMIT_MESSAGE"
git tag "v$NEW_VERSION"

echo "✅ Successfully bumped version to $NEW_VERSION and tagged as v$NEW_VERSION."
echo "➡️  Now run 'git push origin main --tags' to push your changes."
