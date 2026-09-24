# Deployment

The public game runs at **https://forma.cam/runpod/** as a static site. Publishing code to GitHub does not deploy it.

## Build for the correct path

```sh
npm ci
npm test
npm run build
```

Upload the contents of `dist/`. Vite prefixes production asset URLs with `/runpod/`, including the favicon and bundled fonts. To host elsewhere, change the build base in `vite.config.ts` and rebuild.

Use an HTTP server for local checks. Opening `dist/index.html` as a file does not reproduce subpath hosting. `npm run preview` serves the build at `http://127.0.0.1:5200/runpod/`.

## Nginx example

With the build installed under `/var/www/example/runpod/`, add these locations to the site's HTTPS server block:

```nginx
location = /runpod {
    return 301 /runpod/;
}

location ^~ /runpod/ {
    root /var/www/example;
    index index.html;
    try_files $uri $uri/ =404;
    add_header Cache-Control "no-cache";
}
```

Adapt the filesystem root to your server. This route can coexist with an application proxy at `/`. The game does not need a Node process on the server.

## Release procedure

1. Keep a copy of the active Nginx configuration and previous game release.
2. Upload the build to a new release directory and compare file checksums.
3. Point the game's public directory or symlink at that release.
4. If the server configuration changed, run `nginx -t` before reloading Nginx.
5. Verify `/runpod` redirects to `/runpod/`, the game returns HTTP 200, and a missing asset returns HTTP 404.
6. Open the public URL and play a run. Check scripts, fonts, controls, and browser errors. Verify any neighbouring application still loads.

To roll back, restore the previous game directory or symlink. If the release changed Nginx, restore its saved configuration, validate it, and reload. Keep server addresses, SSH keys, credentials, and private operational notes outside the repository.

A CDN can inject scripts into HTML. For the current Cloudflare-hosted deployment, compare binary assets byte-for-byte and distinguish known CDN HTML changes from build differences. Verify the rendered game as well as HTTP status codes.
