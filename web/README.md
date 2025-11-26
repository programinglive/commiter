# Commiter Website

This is the static website for the Commiter project. It can be deployed to any web server or hosting platform.

## 📁 Structure

```
web/
├── index.html          # Main landing page
├── css/
│   └── style.css      # Styles with modern dark theme
├── js/
│   └── script.js      # Interactive features
└── README.md          # This file
```

## 🚀 Deployment Options

### Option 1: Plesk / cPanel
1. Compress the `web` folder contents into a ZIP file
2. Upload to your Plesk/cPanel file manager
3. Extract in your public_html or desired directory
4. Access via your domain

### Option 2: Static Hosting (Netlify, Vercel, GitHub Pages)
1. Push the `web` folder to a Git repository
2. Connect to your hosting platform
3. Set the build directory to `web`
4. Deploy

### Option 3: Simple HTTP Server (Testing)
```bash
# Navigate to the web directory
cd web

# Python 3
python -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

## 🎨 Features

- **Modern Design**: Dark theme with glassmorphism effects
- **Fully Responsive**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Scroll animations and transitions
- **Interactive Elements**: Copy-to-clipboard, smooth scrolling
- **SEO Optimized**: Meta tags and semantic HTML
- **Fast Loading**: Optimized CSS and JavaScript

## 🛠️ Customization

### Colors
Edit CSS variables in `css/style.css`:
```css
:root {
    --primary: #6366f1;
    --secondary: #8b5cf6;
    --accent: #ec4899;
    /* ... more variables */
}
```

### Content
Edit `index.html` to update:
- Version numbers
- Release information
- Links and URLs
- Text content

## 📝 License

This website is part of the Commiter project and is released under the MIT License.
