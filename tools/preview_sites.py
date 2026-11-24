"""Serve both site roots locally with production hostname links mapped to loopback."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
import re
import threading
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory, domains, **kwargs):
        self.domains = domains
        super().__init__(*args, directory=directory, **kwargs)

    def send_head(self):
        route = urlsplit(self.path).path
        path = Path(self.translate_path(route))
        if path.is_dir():
            path = path / "index.html"
        elif not path.suffix:
            path = path.with_suffix(".html")
        if path.suffix != ".html" or not path.is_file():
            return super().send_head()
        html = path.read_text(encoding="utf-8")
        for domain, local_url in self.domains.items():
            html = html.replace('href="' + domain, 'href="' + local_url)
        html = re.sub(r'<script[^>]+src="(?:https://www\.googletagmanager\.com/[^"]*|/scripts/analytics\.js)"[^>]*></script>', "", html)
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return BytesIO(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--production-port", type=int, default=4178)
    parser.add_argument("--store-port", type=int, default=4179)
    args = parser.parse_args()
    domains = {
        "https://thegridproduction.com": f"http://127.0.0.1:{args.production_port}",
        "https://beyondlights.net": f"http://127.0.0.1:{args.store_port}",
    }
    site = partial(Preview, directory=str(ROOT / "public"), domains=domains)
    store = partial(Preview, directory=str(ROOT / "beyondlights"), domains=domains)
    with ThreadingHTTPServer(("127.0.0.1", args.production_port), site) as primary:
        with ThreadingHTTPServer(("127.0.0.1", args.store_port), store) as secondary:
            threading.Thread(target=secondary.serve_forever, daemon=True).start()
            print(f'Promo: {domains["https://thegridproduction.com"]}/design', flush=True)
            print(f'Store: {domains["https://beyondlights.net"]}/', flush=True)
            try:
                primary.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                secondary.shutdown()


if __name__ == "__main__":
    main()
