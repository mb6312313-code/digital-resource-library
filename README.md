# Digital Resource Library

Premium protected resource library built with HTML5, CSS3, vanilla JavaScript, and Vercel-compatible serverless password verification.

## Dataset

- Source ZIP: `D:\pdf data\New folder.zip`
- PDFs scanned: 7
- Raw URL hits: 2,153
- Unique URLs: 1,592
- Display resources after cleanup: 1,566
- Unsafe/abusive entries excluded from display.

## Password setup on Vercel

Create one environment variable:

```text
SITE_PASSWORD=your-private-password
```

The password is verified in `/api/login.js`, then Vercel middleware checks the signed HTTP-only cookie before allowing access to `index.html` and `assets/resources.js`.

## Files

- `index.html` protected library experience
- `login.html` password screen
- `style.css` premium dark glass UI
- `script.js` search, filters, sorting, counters, login/logout behavior
- `assets/resources.js` cleaned resource dataset
- `middleware.js` Vercel protection
- `api/login.js` password verification
- `api/logout.js` logout
- `404.html`, `robots.txt`, `sitemap.xml`
