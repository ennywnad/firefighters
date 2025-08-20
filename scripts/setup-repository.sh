#!/bin/bash

# Repository Setup Script for Firefighter Adventures
# This script helps new contributors get started quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${RED}"
cat << "EOF"
🚒 FIREFIGHTER ADVENTURES 🚒
   Development Setup Script
EOF
echo -e "${NC}"

echo "Welcome to Firefighter Adventures development setup!"
echo "This script will help you get started with contributing to the project."
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This doesn't appear to be a git repository. Please run this script from the repository root."
    exit 1
fi

# Check Git
if command_exists git; then
    print_success "Git is installed"
    git_version=$(git --version)
    echo "  Version: $git_version"
else
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check Node.js (optional, for future use)
if command_exists node; then
    print_success "Node.js is installed"
    node_version=$(node --version)
    echo "  Version: $node_version"
else
    print_warning "Node.js is not installed. This is optional for now but may be needed for future development tools."
fi

# Check Python (for validation scripts)
if command_exists python3; then
    print_success "Python3 is installed"
    python_version=$(python3 --version)
    echo "  Version: $python_version"
else
    print_warning "Python3 is not installed. Some validation scripts may not work."
fi

echo ""

# Verify repository structure
print_status "Verifying repository structure..."

required_files=(
    "index.html"
    "README.md"
    "css/style.css"
    "js/main.js"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found $file"
    else
        print_error "Missing required file: $file"
        missing_files+=("$file")
    fi
done

# Check level files
level_files=(
    "js/levels/stationMorning.js"
    "js/levels/fireRescue.js"
    "js/levels/animalRescue.js"
    "js/levels/truckBuilding.js"
    "js/levels/emergencyResponse.js"
)

print_status "Checking game level files..."
for file in "${level_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found $file"
    else
        print_warning "Missing level file: $file (may be under development)"
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Some required files are missing. Please check your repository clone."
    exit 1
fi

echo ""

# Set up Git hooks
print_status "Setting up Git hooks..."
if [ -f "scripts/setup-git-hooks.sh" ]; then
    chmod +x scripts/setup-git-hooks.sh
    ./scripts/setup-git-hooks.sh
    print_success "Git hooks installed successfully"
else
    print_warning "Git hooks setup script not found. You may need to set up hooks manually."
fi

echo ""

# Git configuration recommendations
print_status "Checking Git configuration..."

git_name=$(git config user.name 2>/dev/null || echo "")
git_email=$(git config user.email 2>/dev/null || echo "")

if [ -z "$git_name" ] || [ -z "$git_email" ]; then
    print_warning "Git user information not configured."
    echo "Please configure your Git identity:"
    echo "  git config --global user.name \"Your Name\""
    echo "  git config --global user.email \"your.email@example.com\""
else
    print_success "Git user configured as: $git_name <$git_email>"
fi

echo ""

# Test the game
print_status "Testing game functionality..."

# Basic file syntax check
if command_exists node; then
    echo "Checking JavaScript syntax..."
    syntax_errors=0
    
    for js_file in js/*.js js/*/*.js; do
        if [ -f "$js_file" ]; then
            if node -c "$js_file" 2>/dev/null; then
                echo "  ✓ $js_file"
            else
                echo "  ✗ $js_file (syntax error)"
                syntax_errors=$((syntax_errors + 1))
            fi
        fi
    done
    
    if [ $syntax_errors -eq 0 ]; then
        print_success "All JavaScript files have valid syntax"
    else
        print_warning "$syntax_errors JavaScript files have syntax errors"
    fi
else
    print_warning "Cannot validate JavaScript syntax (Node.js not available)"
fi

echo ""

# Browser recommendations
print_status "Browser recommendations for development:"
echo "  Primary: Chrome or Edge (best DevTools support)"
echo "  Testing: Firefox, Safari, and mobile browsers"
echo "  Extensions: Web Developer, Lighthouse (for performance)"

echo ""

# Development workflow overview
print_status "Quick development workflow overview:"
echo "  1. Create feature branch: git checkout -b feat/your-feature"
echo "  2. Make changes and test locally (open index.html in browser)"
echo "  3. Commit with descriptive messages: git commit -m 'feat: add new feature'"
echo "  4. Push and create PR: git push -u origin feat/your-feature"
echo "  5. Get code review and merge"

echo ""

# Documentation links
print_status "Important documentation:"
echo "  📖 README.md - Project overview and features"
echo "  🛠️ DEVELOPMENT.md - Detailed development workflow"
echo "  🤝 CONTRIBUTING.md - Contribution guidelines"
echo "  📋 PROJECT_PLAN.md - Project roadmap and planning"

echo ""

# Final setup verification
print_status "Running final verification..."

# Check if we can open the game (basic HTML validation)
if command_exists python3; then
    if python3 -c "
import sys
import re
try:
    with open('index.html', 'r') as f:
        content = f.read()
    # Basic check for essential elements
    if '<canvas' in content and '</html>' in content:
        print('✓ index.html appears to be valid')
    else:
        print('⚠ index.html may be incomplete')
except Exception as e:
    print(f'✗ Error reading index.html: {e}')
    sys.exit(1)
"; then
        print_success "Game HTML structure looks good"
    else
        print_warning "Game HTML structure may have issues"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Open index.html in your browser to test the game"
echo "  2. Read DEVELOPMENT.md for detailed workflow information"
echo "  3. Check existing issues on GitHub for contribution opportunities"
echo "  4. Create a feature branch and start coding!"
echo ""
echo "Need help? Check the documentation or open an issue on GitHub."
echo ""
echo -e "${BLUE}Happy coding! 🚒👨‍🚒👩‍🚒${NC}"