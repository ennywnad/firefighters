# 🛠️ Development Workflow

This document outlines the development workflow and best practices for the Firefighter Adventures project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Git Workflow](#git-workflow)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Prerequisites

- Git installed on your system
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor or IDE of your choice
- Basic knowledge of HTML5, CSS3, and JavaScript ES6+

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/firefighters.git
   cd firefighters
   ```

2. **Set up Git hooks for local validation:**
   ```bash
   ./scripts/setup-git-hooks.sh
   ```

3. **Open the game:**
   Simply open `index.html` in your browser to start playing and testing.

## 🔄 Development Workflow

### Branch Strategy

We use **GitHub Flow** - a simple, branch-based workflow:

1. **main branch**: Always deployable, production-ready code
2. **feature branches**: For new features, bug fixes, and improvements
3. **hotfix branches**: For critical production fixes

### Workflow Steps

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/new-animation-system
   git checkout -b fix/level-progression-bug
   git checkout -b docs/update-readme
   ```

2. **Make your changes:**
   - Follow the [Code Standards](#code-standards)
   - Test your changes locally
   - Commit frequently with clear messages

3. **Push and create PR:**
   ```bash
   git push -u origin feat/new-animation-system
   ```
   Then create a Pull Request on GitHub.

4. **Code Review:**
   - All PRs require review before merging
   - Address feedback and update your branch
   - Ensure CI checks pass

5. **Merge:**
   - Use "Squash and merge" for clean history
   - Delete the feature branch after merging

## 📝 Code Standards

### JavaScript Guidelines

**ES6 Classes for Game Levels:**
```javascript
class NewLevel extends GameLevel {
    constructor() {
        super();
        this.title = "Level Title";
        this.description = "Level description";
    }

    init() {
        // Initialize level state
    }

    render(ctx) {
        // Render level graphics
    }

    handleClick(x, y) {
        // Handle user interactions
    }
}
```

**Naming Conventions:**
- Classes: `PascalCase` (e.g., `GameLevel`, `SoundManager`)
- Functions/Variables: `camelCase` (e.g., `handleClick`, `isLevelComplete`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_LEVEL_COUNT`)
- Files: `camelCase.js` (e.g., `animalRescue.js`, `soundManager.js`)

**Code Organization:**
- One class per file for game levels
- Group related utilities in modules
- Keep functions small and focused
- Use meaningful variable names

### HTML Guidelines

- Use semantic HTML5 elements
- Include proper `alt` attributes for images
- Maintain proper indentation (2 spaces)
- Validate HTML structure

### CSS Guidelines

- Use consistent indentation (2 spaces)
- Group related properties together
- Comment complex selectors
- Prefer classes over IDs for styling

### Documentation

- Document complex functions with JSDoc comments
- Keep README.md updated with new features
- Update CHANGELOG.md for releases
- Include inline comments for non-obvious code

## 🧪 Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test the following:

**Game Functionality:**
- [ ] All 5 levels load without errors
- [ ] Level progression works correctly
- [ ] Audio plays appropriately
- [ ] Animations run smoothly
- [ ] Hero's Report displays correctly

**Cross-Browser Testing:**
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS/Android)

**Device Testing:**
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Touch controls responsive
- [ ] Audio can be muted
- [ ] Text is readable at different sizes

### Automated Testing

Our CI pipeline automatically checks:
- JavaScript syntax validation
- HTML structure validation
- CSS syntax validation
- File structure integrity
- Basic accessibility compliance

## 🌿 Git Workflow

### Commit Message Format

Use conventional commit format for clear history:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(levels): add new rescue helicopter level
fix(audio): resolve sound overlap in level transitions
docs(readme): update installation instructions
style(css): improve responsive design for mobile
refactor(levels): convert remaining levels to ES6 classes
```

### Pre-commit Hooks

Our Git hooks automatically validate:
- JavaScript syntax
- HTML structure
- CSS formatting
- Game file completeness
- Commit message format

**To bypass hooks (emergency only):**
```bash
git commit --no-verify
```

### Branch Naming

Use descriptive branch names:
- `feat/level-underwater-rescue`
- `fix/animation-glitch-level-3`
- `docs/development-workflow`
- `refactor/sound-system-cleanup`

## 🚢 Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., `1.1.0`)
- **MAJOR**: Breaking changes or major new features
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Steps

1. **Create release branch:**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update version numbers:**
   - Update version badge in README.md
   - Update version history section
   - Create changelog entry

3. **Test thoroughly:**
   - Full manual testing across browsers
   - Validate all levels work correctly
   - Check documentation accuracy

4. **Create release PR:**
   - PR title: "Release v1.2.0"
   - Include changelog in description
   - Get thorough review

5. **Merge and tag:**
   ```bash
   git checkout main
   git merge release/v1.2.0
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin main --tags
   ```

6. **Create GitHub release:**
   - Use the tag created above
   - Include changelog and notable changes
   - Attach any relevant files

## 🔧 Troubleshooting

### Common Issues

**Game not loading:**
- Check browser console for JavaScript errors
- Verify all level files are present
- Ensure file paths are correct

**Audio not working:**
- Check if Tone.js is loaded correctly
- Verify browser audio permissions
- Test with different browsers

**Animations jerky/slow:**
- Check browser performance tools
- Verify CSS animations are optimized
- Test on different devices

**Level progression broken:**
- Verify localStorage is available
- Check level completion logic
- Test with browser dev tools

### Development Tools

**Recommended Browser Extensions:**
- Web Developer (Firefox/Chrome)
- Lighthouse (Chrome)
- React Developer Tools (if adding React later)

**Code Editors:**
- VS Code with extensions:
  - ESLint
  - Prettier
  - Live Server
  - HTML CSS Support

### Performance Optimization

**Best Practices:**
- Minimize DOM manipulations
- Use requestAnimationFrame for animations
- Optimize images and audio files
- Cache static resources
- Profile with browser dev tools

## 📞 Getting Help

**Documentation:**
- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [PROJECT_PLAN.md](PROJECT_PLAN.md) - Project roadmap

**Resources:**
- [HTML5 Canvas Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Tone.js Documentation](https://tonejs.github.io/)
- [ES6 Classes Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

**Community:**
- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Review existing issues before creating new ones

---

**Happy coding! 🚒👨‍🚒👩‍🚒**