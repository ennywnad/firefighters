#!/bin/bash

# Configure Repository Settings for Firefighter Game
# This script sets up branch protection rules and repository settings

echo "🛡️  Configuring repository settings and branch protection..."

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required but not installed"
    echo "💡 Install from: https://cli.github.com/"
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "📂 Configuring repository: $REPO"

# Enable branch protection for main branch
echo "🔒 Setting up branch protection for main branch..."
gh api repos/$REPO/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["validate-pr"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false || echo "⚠️  Branch protection may already be configured"

# Configure repository settings
echo "⚙️  Configuring repository settings..."

# Enable vulnerability alerts
gh api repos/$REPO \
  --method PATCH \
  --field has_vulnerability_alerts=true || echo "⚠️  Vulnerability alerts may already be enabled"

# Enable automated security fixes
gh api repos/$REPO/automated-security-fixes \
  --method PUT || echo "⚠️  Automated security fixes may already be enabled"

# Enable dependency graph
gh api repos/$REPO \
  --method PATCH \
  --field has_dependency_graph=true || echo "⚠️  Dependency graph may already be enabled"

# Configure merge settings
gh api repos/$REPO \
  --method PATCH \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=false \
  --field delete_branch_on_merge=true || echo "⚠️  Merge settings may already be configured"

echo "✅ Repository configuration completed!"
echo ""
echo "📋 Branch Protection Rules Applied:"
echo "   • Require pull request reviews (1 approving review)"
echo "   • Require status checks to pass"
echo "   • Require branches to be up to date"
echo "   • Dismiss stale reviews when new commits are pushed"
echo "   • No force pushes or deletions allowed"
echo ""
echo "🔧 Repository Settings Configured:"
echo "   • Vulnerability alerts enabled"
echo "   • Automated security fixes enabled"
echo "   • Dependency graph enabled"
echo "   • Only squash merging allowed"
echo "   • Auto-delete branches after merge"