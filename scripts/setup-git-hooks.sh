#!/bin/bash

# Setup Git Hooks for Firefighter Game Repository
# Run this script once to configure git hooks for the repository

echo "🔧 Setting up Git hooks for firefighter game repository..."

# Set git hooks path
git config core.hooksPath .githooks

# Make hooks executable
chmod +x .githooks/*

# Create commit message template
cat > .gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
#
# Type should be one of the following:
# * feat: A new feature
# * fix: A bug fix
# * docs: Documentation only changes
# * style: Changes that do not affect the meaning of the code
# * refactor: A code change that neither fixes a bug nor adds a feature
# * test: Adding missing tests or correcting existing tests
# * chore: Changes to the build process or auxiliary tools
#
# Examples:
# feat: add animal rescue level
# fix(ui): correct button alignment in mobile view
# docs: update game installation instructions
# refactor(core): optimize animation cleanup system
EOF

# Set commit message template
git config commit.template .gitmessage

# Configure pull request template
mkdir -p .github/pull_request_template.md
cat > .github/pull_request_template.md << 'EOF'
## Summary
Brief description of the changes and their purpose.

## Changes Made
- [ ] Feature addition
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation update
- [ ] Performance improvement

## Technical Details
### Files Modified
- List key files and their changes

### New Dependencies
- Any new libraries or tools added

## Testing
- [ ] All game levels load and function correctly
- [ ] Level progression works as expected
- [ ] Responsive design tested on mobile
- [ ] Animation performance verified
- [ ] No console errors in browser
- [ ] Game state management between levels

## Screenshots/Videos
If applicable, add screenshots or videos demonstrating the changes.

## Breaking Changes
List any breaking changes and migration steps if needed.

## Additional Notes
Any additional context, concerns, or follow-up items.
EOF

echo "✅ Git hooks and templates configured successfully!"
echo "💡 To use commit template: git commit (without -m flag)"
echo "💡 Pre-commit hook will validate code before each commit"