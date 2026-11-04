#!/usr/bin/env python3
"""Local dev server for Raseed.

Serves the site and forwards /platform-api/* to the real server, so the
browser sees one origin (the server sends no CORS headers). On the real server
the site is served next to /platform-api and needs none of this.

    python3 dev-server.py          # http://localhost:5179
"""
import http.client
import http.server
import socketserver
import sys
import threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5179
UPSTREAM_HOST = '162-35-27-249.sslip.io'
UPSTREAM = f'https://{UPSTREAM_HOST}'
# Accept-Encoding goes through so the server's gzip reaches the browser as-is
# (the big collections are ~8x smaller compressed).
FORWARD_HEADERS = ('Authorization', 'Content-Type', 'Accept-Encoding')
PASS_BACK = ('Content-Type', 'Content-Encoding')

# One kept-alive HTTPS connection per server thread: no new TLS handshake per request.
_local = threading.local()


def upstream(fresh=False):
    conn = getattr(_local, 'conn', None)
    if fresh or conn is None:
        if conn is not None:
            conn.close()
        conn = _local.conn = http.client.HTTPSConnection(UPSTREAM_HOST, timeout=90)
    return conn


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _proxy(self):
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length else None
        headers = {name: self.headers[name] for name in FORWARD_HEADERS if self.headers.get(name)}
        status, data, back = 502, b'upstream unavailable', {'Content-Type': 'text/plain'}
        for attempt in range(2):  # a kept-alive connection may have been closed by the server
            try:
                conn = upstream(fresh=attempt > 0)
                conn.request(self.command, self.path, body=body, headers=headers)
                resp = conn.getresponse()
                status, data = resp.status, resp.read()
                back = {name: resp.getheader(name) for name in PASS_BACK if resp.getheader(name)}
                break
            except Exception as err:  # upstream down: let the client retry
                status, data, back = 502, str(err).encode(), {'Content-Type': 'text/plain'}
        self.send_response(status)
        for name, value in back.items():
            self.send_header(name, value)
        if 'Content-Type' not in back:
            self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith('/platform-api/'):
            return self._proxy()
        return super().do_GET()

    def do_POST(self):
        return self._proxy() if self.path.startswith('/platform-api/') else self.send_error(405)

    def do_PUT(self):
        return self._proxy() if self.path.startswith('/platform-api/') else self.send_error(405)

    def end_headers(self):
        if not self.path.startswith('/platform-api/'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '/platform-api/' not in (args[0] if args else ''):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    print(f'Raseed dev server: http://localhost:{PORT}  (API -> {UPSTREAM})')
    Server(('', PORT), Handler).serve_forever()
