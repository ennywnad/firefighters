# 🚀 Deployment Guide

This document explains how the Firefighter Adventures game is deployed and how to set up your own deployment.

## 🌐 GitHub Pages (Current Deployment)

The game is automatically deployed to GitHub Pages and accessible at:
**https://ennywnad.github.io/firefighters/**

### How It Works

GitHub Pages serves the static files directly from the `main` branch root directory:
- `index.html` - Main game entry point
- `js/` - JavaScript game logic
- `css/` - Stylesheets
- External dependencies loaded via CDN (Tailwind CSS, Tone.js, Google Fonts)

### GitHub Pages Setup

1. **Go to Repository Settings:**
   - Navigate to your repo on GitHub
   - Click "Settings" → "Pages"

2. **Configure Source:**
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
   - Click **Save**

3. **Wait for Deployment:**
   - GitHub Actions will automatically build and deploy
   - Check the "Actions" tab to see deployment status
   - Typically takes 1-2 minutes

4. **Access Your Game:**
   - Visit `https://[username].github.io/[repository-name]/`
   - For this repo: `https://ennywnad.github.io/firefighters/`

### Deployment Status

You can check deployment status:
- **Actions Tab:** See current and past deployments
- **Environments:** View deployment history under "Environments"
- **Badge:** Add deployment badge to README (optional)

## 🔄 Automatic Deployments

Every push to the `main` branch triggers an automatic redeployment:

1. Push changes to `main`
2. GitHub Actions builds the site
3. New version goes live in ~2 minutes
4. No manual intervention needed!

## 🌍 Alternative Deployment Options

### Netlify

1. Sign up at [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/`
5. Deploy!

**Advantages:**
- Custom domain support
- Instant rollbacks
- Deploy previews for PRs
- Better analytics

### Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Framework preset: **Other**
4. Build settings:
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
5. Deploy!

**Advantages:**
- Lightning-fast CDN
- Automatic HTTPS
- Easy custom domains
- Edge network optimization

### Static Web Hosting

You can also deploy to any static web host:
- AWS S3 + CloudFront
- Google Cloud Storage
- Firebase Hosting
- Azure Static Web Apps

Simply upload all files to your hosting provider.

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All files are committed to `main` branch
- [ ] `index.html` is in the root directory
- [ ] All asset paths are relative (not absolute)
- [ ] External CDN links are working
- [ ] Game has been tested locally
- [ ] README.md is updated with correct URLs
- [ ] LICENSE file is present

## 🧪 Testing Your Deployment

After deployment:

1. **Functional Testing:**
   - [ ] Game loads without errors
   - [ ] Fire truck animation plays
   - [ ] Hose connections work
   - [ ] Water spray functions properly
   - [ ] Fires can be extinguished
   - [ ] Scoreboard displays correctly
   - [ ] Options menu works
   - [ ] All customizations apply

2. **Browser Testing:**
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari
   - [ ] Mobile browsers (iOS/Android)

3. **Performance Testing:**
   - [ ] Check loading times
   - [ ] Verify CDN resources load
   - [ ] Test on slow connections
   - [ ] Monitor console for errors

## 🔧 Troubleshooting

### Game Not Loading

**Check:**
- Browser console for errors
- Network tab for failed requests
- CDN availability (Tailwind, Tone.js, Google Fonts)

**Solutions:**
- Clear browser cache
- Check CDN URLs are correct
- Verify all paths are relative

### Assets Not Found (404 Errors)

**Check:**
- File paths in HTML/CSS/JS are correct
- Files exist in repository
- Capitalization matches exactly (case-sensitive on Linux)

**Solutions:**
- Use relative paths (e.g., `./js/main.js` not `/js/main.js`)
- Check GitHub Pages base URL
- Verify file names match exactly

### Deployment Failed

**Check:**
- GitHub Actions workflow status
- Repository permissions
- GitHub Pages source settings

**Solutions:**
- Re-run the workflow in Actions tab
- Check Settings → Pages is enabled
- Ensure `main` branch has latest changes

## 📊 Monitoring

Track your deployment:
- **Visitors:** Use Google Analytics or Plausible
- **Errors:** Browser console monitoring
- **Performance:** Chrome DevTools Lighthouse
- **Uptime:** UptimeRobot or similar service

## 🔐 Security Considerations

- ✅ No sensitive data in repository
- ✅ No API keys or secrets
- ✅ License file present (CC BY-NC-SA 4.0)
- ✅ HTTPS automatically enabled on GitHub Pages
- ✅ No server-side code (pure client-side)

## 📝 Custom Domain (Optional)

To use a custom domain with GitHub Pages:

1. **Buy a domain** (e.g., from Namecheap, Google Domains)

2. **Configure DNS:**
   - Add CNAME record pointing to `[username].github.io`
   - Example: `www.firefighter-game.com` → `ennywnad.github.io`

3. **Update GitHub Settings:**
   - Go to Settings → Pages
   - Enter custom domain
   - Enable "Enforce HTTPS"

4. **Wait for DNS propagation** (up to 24 hours)

## 🎉 You're Live!

Your game is now accessible to the world! Share the link:
- On social media
- With family and friends
- In relevant communities
- On educational forums

Happy firefighting! 🚒💨🔥
