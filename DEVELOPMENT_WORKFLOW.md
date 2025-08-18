# Development Workflow Guide

## Commit Strategy

### General Rules
- Each commit should represent a complete, logical unit of work
- Commits should be atomic (can be reverted safely)
- Follow conventional commit format: `type(scope): description`
- Maximum 500 lines changed per commit (use pre-commit hook validation)

### When to Squash vs Keep Commits

#### **Squash Merge** (Recommended for most cases)
- Feature branches with multiple work-in-progress commits
- Experimental or iterative development
- When commits don't represent logical units
- Bug fix branches with trial-and-error commits

#### **Keep Individual Commits** (For structured work)
- Each commit represents a distinct feature/fix
- Commits are well-documented and atomic
- Useful for debugging/bisecting issues
- Educational value in seeing development progression

## Pre-Commit Checklist

Before creating any commit:

### 1. File Completeness Check
```bash
# Verify all required game files are present
ls js/GameLevel.js js/InteractionHandler.js js/LayeredRenderer.js js/SoundManager.js js/VoiceGuide.js
```

### 2. Staging Verification
```bash
# Review what you're committing
git status
git diff --cached

# Check for missing dependencies
git ls-files --others --exclude-standard
```

### 3. Code Quality
```bash
# Syntax validation
find js -name "*.js" -exec node -c {} \;

# Check for debugging code
grep -r "console.log" js/ --exclude="testing.js" || echo "No console.log found"
```

### 4. Testing
- [ ] All game levels load without errors
- [ ] Level progression works correctly
- [ ] No browser console errors
- [ ] Responsive design maintained

## Pull Request Process

### 1. Branch Naming
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring

### 2. PR Creation
1. Use the PR template (auto-populated)
2. Include comprehensive testing checklist
3. Add screenshots for UI changes
4. Reference related issues with `Fixes #123`

### 3. Review Process
- All status checks must pass
- At least 1 approving review required
- Address all review comments before merge
- Ensure branch is up-to-date with main

### 4. Merge Strategy
- **Default**: Squash merge for cleaner history
- **Exception**: Keep commits only for educational/debugging value
- Delete branch after merge (automated)

## Release Management

### Version Numbering
- `v1.0.0` - Major releases (new game levels, major features)
- `v1.1.0` - Minor releases (feature enhancements, new mechanics)
- `v1.1.1` - Patch releases (bug fixes, small improvements)

### Release Process
1. Create release branch from main
2. Update version numbers and changelog
3. Test release candidate thoroughly
4. Create tagged release with release notes
5. Deploy to production environment

## Emergency Hotfixes

For critical production issues:
1. Create hotfix branch from main: `hotfix/critical-bug-fix`
2. Make minimal changes to address issue
3. Test thoroughly but expedite review
4. Merge directly to main (exception to normal PR rules)
5. Tag as patch release immediately
6. Backport to develop branch if needed

## File Organization Standards

### Required Core Files
All commits must include these critical files:
- `js/GameLevel.js` - Base game level class
- `js/InteractionHandler.js` - User interaction management
- `js/LayeredRenderer.js` - Rendering system
- `js/SoundManager.js` - Audio management
- `js/VoiceGuide.js` - Accessibility features
- `js/main.js` - Main game controller
- `index.html` - Entry point

### Optional Enhancement Files
- `js/FirefighterScoreboard.js` - Scoring system
- `js/animations/` - Animation utilities
- `.claude/` - Development agent configurations

### Deprecated Files
- `js/levels/fireRescue.js` - Replaced by fireRescue2.js
- Remove during cleanup commits