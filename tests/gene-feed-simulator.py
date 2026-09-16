"""Loopback-only GENE console; no production writes or outbound requests."""
import copy
import json
import time
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / "public"
PORT = 8766


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'")
        super().end_headers()

    def send_content(self, body, content_type):
        data = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        mode = parse_qs(urlsplit(self.path).query).get("evidence", ["current"])[0]
        if mode not in ("current", "stale", "missing", "invalid", "unavailable", "failed"):
            mode = "current"
        if path in ("/", "/kilnwatch.html", "/kiln-watch-graph.html"):
            page = "kiln-watch-graph.html" if path == "/kiln-watch-graph.html" else "kilnwatch.html"
            html = (PUBLIC / page).read_text(encoding="utf-8")
            # Only redirect feed URLs in the served response. Console code and
            # production files stay unchanged; the shared parser is served as-is.
            for name in ("gene_state_latest.json", "kiln_watch_latest.json", "kiln_watch_latest.txt", "kiln_watch_latest.png"):
                html = html.replace("https://claycraze.com/gene/" + name, "/gene/" + name + "?evidence=" + mode)
            html = html.replace("<body class=", '<body class=', 1)
            options = "".join(f'<option value="{value}" {"selected" if value == mode else ""}>{label}</option>' for value, label in [("current", "LIVE / fresh"), ("stale", "STALE / 121 seconds"), ("missing", "UNAVAILABLE / missing"), ("invalid", "UNAVAILABLE / invalid"), ("unavailable", "UNAVAILABLE / source"), ("failed", "UNAVAILABLE / failed request")])
            marker = f'''<div style="background:#20272c;color:#e7ddc7;padding:10px;text-align:center;font:13px system-ui">LOCAL REVIEW ONLY &nbsp; <label>Evidence <select id="previewEvidence" style="font:inherit;padding:4px">{options}</select></label> &nbsp; <a style="color:#c0d5a2" href="/kilnwatch.html?evidence={mode}">Console</a> &nbsp; <a style="color:#c0d5a2" href="/kiln-watch-graph.html?evidence={mode}">Graph</a></div><script>document.getElementById('previewEvidence').onchange=function(){{location.search='?evidence='+this.value;}};</script>'''
            body_start = html.index(">", html.index("<body")) + 1
            html = html[:body_start] + marker + html[body_start:]
            self.send_content(html, "text/html; charset=utf-8")
        elif path == "/gene/kiln_watch_latest.json":
            payload = copy.deepcopy(json.loads((HERE / "gene-feed-fixture.json").read_text(encoding="utf-8")))
            if mode == "failed":
                self.send_error(503, "Simulated request failure")
                return
            stamp = (datetime.now(timezone.utc) - timedelta(seconds=121 if mode == "stale" else 0)).isoformat(timespec="milliseconds")
            if mode == "missing":
                payload["summaries"] = []
            elif mode == "invalid":
                payload["summaries"][0]["latest_temp"] = "invalid"
            elif mode == "unavailable":
                payload["source_status"] = "unavailable"
            for key in ("attempted_at", "generated_at", "evidence_generated_at", "last_success_at"):
                payload[key] = stamp
            self.send_content(json.dumps(payload), "application/json")
        elif path == "/gene/gene_state_latest.json":
            self.send_content(json.dumps({"generated_unix": time.time(), "arousal": 0.1, "bpm": 30}), "application/json")
        elif path == "/gene/kiln_watch_latest.txt":
            self.send_content("Local preview. Ramp 0 \u00B0F/hr.", "text/plain; charset=utf-8")
        elif path == "/gene/kiln_watch_latest.png":
            self.send_content('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650"><rect width="1200" height="650" fill="#101519"/><text x="600" y="325" text-anchor="middle" fill="#e7ddc7" font-size="26">Local preview: public graph feed not connected</text></svg>', "image/svg+xml")
        elif path.startswith(("/css/", "/js/", "/images/")):
            super().do_GET()
        else:
            self.send_error(404, "Local simulator route only")


if __name__ == "__main__":
    print(f"GENE local evidence review: http://127.0.0.1:{PORT}/kilnwatch.html", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
