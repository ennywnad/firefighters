#!/bin/bash

# Setup Git Hooks for Firefighter Adventures
# This script installs pre-commit hooks for local validation

set -e

echo "🚒 Setting up Git hooks for Firefighter Adventures..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running pre-commit validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Flag to track if any checks fail
CHECKS_FAILED=0

# Function to report success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to report warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to report error
error() {
    echo -e "${RED}✗${NC} $1"
    CHECKS_FAILED=1
}

echo "Validating files to be committed..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
    warning "No files staged for commit"
    exit 0
fi

# Check JavaScript files
echo "🔍 Checking JavaScript files..."
for file in $STAGED_FILES; do
    if [[ $file == *.js ]]; then
        if [ -f "$file" ]; then
            # Check syntax
            if ! node -c "$file" 2>/dev/null; then
                error "JavaScript syntax error in $file"
            else
                success "JavaScript syntax OK: $file"
            fi
            
            # Check for debugging statements
            if grep -q "console\.log\|debugger\|alert(" "$file"; then
                warning "Debug statements found in $file - consider removing before commit"
            fi
            
            # Check for ES6 class structure in level files
            if [[ $file == js/levels/*.js ]]; then
                if ! grep -q "class.*extends\|class.*Level" "$file"; then
                    warning "$file may not follow ES6 class structure"
                fi
            fi
        fi
    fi
done

# Check HTML files
echo "🔍 Checking HTML files..."
for file in $STAGED_FILES; do
    if [[ $file == *.html ]]; then
        if [ -f "$file" ]; then
            # Basic HTML validation using Python (available on most systems)
            if command -v python3 >/dev/null 2>&1; then
                if ! python3 -c "
import sys
import re
try:
    content = open('$file').read()
    # Remove comments and script/style content
    content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)
    # Basic tag matching
    tags = re.findall(r'<(/?)(\w+)', content)
    stack = []
    for closing, tag in tags:
        if not closing and tag.lower() not in ['img', 'br', 'hr', 'input', 'meta', 'link']:
            stack.append(tag.lower())
        elif closing and stack and stack[-1] == tag.lower():
            stack.pop()
    if stack:
        print(f'Unclosed tags: {stack}')
        sys.exit(1)
except Exception as e:
    print(f'Error validating HTML: {e}')
    sys.exit(1)
" 2>/dev/null; then
                    error "HTML validation failed for $file"
                else
                    success "HTML syntax OK: $file"
                fi
            else
                warning "Python3 not available - skipping HTML validation"
            fi
        fi
    fi
done

# Check CSS files
echo "🔍 Checking CSS files..."
for file in $STAGED_FILES; do
    if [[ $file == *.css ]]; then
        if [ -f "$file" ]; then
            # Basic CSS brace matching
            if command -v python3 >/dev/null 2>&1; then
                if ! python3 -c "
import re
try:
    content = open('$file').read()
    # Remove comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Count braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces != close_braces:
        print(f'Unmatched braces: {open_braces} open, {close_braces} close')
        exit(1)
except Exception as e:
    print(f'Error validating CSS: {e}')
    exit(1)
" 2>/dev/null; then
                    error "CSS validation failed for $file"
                else
                    success "CSS syntax OK: $file"
                fi
            fi
        fi
    fi
done

# Check for required game files if core files are being modified
echo "🔍 Checking game file structure..."
if echo "$STAGED_FILES" | grep -q "js/\|index\.html"; then
    required_files=("index.html" "js/main.js" "css/style.css")
    for req_file in "${required_files[@]}"; do
        if [ ! -f "$req_file" ]; then
            error "Required file missing: $req_file"
        fi
    done
    
    # Check level files
    level_files=("js/levels/fireRescue2.js")
    for level_file in "${level_files[@]}"; do
        if [ ! -f "$level_file" ]; then
            error "Required level file missing: $level_file"
        fi
    done
fi

# Check commit message for conventional commits (if available)
if [ -f ".git/COMMIT_EDITMSG" ]; then
    echo "🔍 Checking commit message format..."
    commit_msg=$(head -n1 .git/COMMIT_EDITMSG 2>/dev/null || echo "")
    if [[ ! $commit_msg =~ ^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: ]]; then
        warning "Consider using conventional commit format: type(scope): description"
        warning "Examples: feat: add new level, fix: resolve animation bug, docs: update README"
    fi
fi

# Final check
if [ $CHECKS_FAILED -eq 1 ]; then
    echo -e "\n${RED}❌ Pre-commit checks failed. Please fix the errors above.${NC}"
    echo "If you need to commit anyway, use: git commit --no-verify"
    exit 1
else
    echo -e "\n${GREEN}✅ All pre-commit checks passed!${NC}"
    exit 0
fi
EOF

# Make the pre-commit hook executable
chmod +x .git/hooks/pre-commit

# Create pre-push hook for additional validation
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

echo "🚀 Running pre-push validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pushing to main branch
while read local_ref local_sha remote_ref remote_sha; do
    if [[ $remote_ref == *"main"* ]]; then
        echo -e "${YELLOW}⚠${NC} Pushing to main branch - running additional checks..."
        
        # Ensure required level files are present
        level_files=("js/levels/fireRescue2.js")
        for level_file in "${level_files[@]}"; do
            if [ ! -f "$level_file" ]; then
                echo -e "${RED}❌ Critical level file missing: $level_file${NC}"
                exit 1
            fi
        done
        
        # Check that index.html exists and is not empty
        if [ ! -s "index.html" ]; then
            echo -e "${RED}❌ index.html is missing or empty${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Pre-push validation passed for main branch${NC}"
    fi
done

exit 0
EOF

# Make the pre-push hook executable
chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed successfully!"
echo ""
echo "The following hooks are now active:"
echo "  • pre-commit: Validates JavaScript, HTML, CSS syntax and game structure"
echo "  • pre-push: Additional validation when pushing to main branch"
echo ""
echo "To bypass hooks (if needed): git commit --no-verify"
echo "To test hooks: git commit (with staged changes)"