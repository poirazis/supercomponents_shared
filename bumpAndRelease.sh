#!/bin/bash
# Bump version and create PR for shared library

echo "Processing shared library"

if [ -d ".git" ]; then
  # Bump patch version
  npm version patch --no-git-tag-version
  # Stage and commit
  git add .
  VERSION=$(node -p "require('./package.json').version")
  git commit -m "Bump version to $VERSION"
  git push origin develop
  # Create PR to merge develop into main and auto-merge
  PR_URL=$(gh pr create --base main --head develop --title "Release: Bump version to $VERSION" --body "Automated version bump" --assignee @me 2>/dev/null)
  if [ $? -eq 0 ] && [ ! -z "$PR_URL" ]; then
    # Auto-merge the PR (squash option)
    gh pr merge --auto --squash "$PR_URL" || true
    echo "PR queued for auto-merge: $PR_URL"
  fi
else
  echo "Skipping - not a git repository"
fi
