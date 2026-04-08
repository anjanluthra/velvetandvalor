#!/usr/bin/env python3
"""
Local dev server that replicates Vercel routing behaviour:
  - cleanUrls: serves .html files without the extension
  - trailingSlash: false (redirects trailing slashes away)
  - rewrites: /products/:slug -> /product.html
  - proxies /api/* requests to the live site
"""

import http.server
import json
import os
import re
import urllib.parse
import urllib.request

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
LIVE_ORIGIN = "https://www.velvet-valor.com"


class VercelHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _proxy_to_live(self, method="GET"):
        """Forward /api/* requests to the live Vercel site."""
        url = LIVE_ORIGIN + self.path
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len else None

        req = urllib.request.Request(url, data=body, method=method)
        # Forward relevant headers
        for header in ("Content-Type", "Accept"):
            val = self.headers.get(header)
            if val:
                req.add_header(header, val)

        try:
            with urllib.request.urlopen(req) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(key, val)
                # Allow local origin
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            return self._proxy_to_live("POST")
        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight for API proxy."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 0. Proxy /api/* to live site
        if path.startswith("/api/"):
            return self._proxy_to_live("GET")

        # 1. Strip trailing slash (except root)
        if path != "/" and path.endswith("/"):
            # Check if it's a directory with an index.html
            dir_path = os.path.join(ROOT, path.lstrip("/"))
            index_path = os.path.join(dir_path, "index.html")
            if os.path.isfile(index_path):
                # Redirect to version without trailing slash
                new_url = path.rstrip("/")
                if parsed.query:
                    new_url += "?" + parsed.query
                self.send_response(301)
                self.send_header("Location", new_url)
                self.end_headers()
                return
            else:
                new_url = path.rstrip("/")
                if parsed.query:
                    new_url += "?" + parsed.query
                self.send_response(301)
                self.send_header("Location", new_url)
                self.end_headers()
                return

        # 2. Rewrites (match Vercel config)
        rewrites = [
            (r"^/products/([^/]+)$", "/product.html"),
            (r"^/blog/category/([^/]+)$", "/blog/category.html"),
            (r"^/blog/author/([^/]+)$", "/blog/author.html"),
            (r"^/blog/([^/]+)$", "/blog/post.html"),
        ]
        for pattern, dest in rewrites:
            if re.match(pattern, path):
                self.path = dest
                if parsed.query:
                    self.path += "?" + parsed.query
                return super().do_GET()

        # 3. Clean URLs — Vercel priority: .html file wins over directory/index.html
        file_path = os.path.join(ROOT, path.lstrip("/"))

        # If exact file exists (e.g. /css/style.css), serve it
        if os.path.isfile(file_path):
            return super().do_GET()

        # Try .html extension FIRST (Vercel cleanUrls behaviour)
        html_path = file_path + ".html"
        if os.path.isfile(html_path):
            self.path = path + ".html"
            if parsed.query:
                self.path += "?" + parsed.query
            return super().do_GET()

        # Fall back to directory with index.html
        index_path = os.path.join(file_path, "index.html")
        if os.path.isdir(file_path) and os.path.isfile(index_path):
            self.path = path.rstrip("/") + "/index.html"
            if parsed.query:
                self.path += "?" + parsed.query
            return super().do_GET()

        # Fallback
        return super().do_GET()

    def log_message(self, format, *args):
        # Cleaner log output
        print(f"[local] {args[0]}")


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), VercelHandler) as server:
        print(f"Local Vercel-like server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
