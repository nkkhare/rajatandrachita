#!/usr/bin/env python3
"""Render the card's photo bands, paint them, and write them to dist/assets/art/ as WebP and JPEG.

    python3 art-src/card-photos/fetch.py   # once, to download the source photos
    python3 art-src/card-photos/bake.py

Each band is composed in its own HTML file, then turned into a watercolor by paint.js, so the scenes read like the
couple's crest rather than like photographs.

Needs Google Chrome (headless renders, paints and encodes) and macOS `sips` (writes the JPEG).
"""
import base64
import functools
import json
import http.server
import os
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.normpath(os.path.join(HERE, '..', '..', 'dist', 'assets', 'art'))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
# Painting settings per band: the city keeps more definition so its landmarks stay readable.
# The top band is cut straight from the crest, so it is already painted and skips the painting pass. The city is a
# photograph: its tones are mapped onto the crest's palette and it gets a watercolor pass, so both bands look like
# one hand.
# `paint` of None means the piece is already a painting (cut from the crest) and only gets re-encoded.
PIECES = {
    # The crest's own painting only needs its upscaling softened, so it takes the blur but no Kuwahara smoothing.
    'mountains': {'size': (1200, 680),
                  'paint': {'radius': 0, 'smooth': 1.1, 'edge': 0, 'wash': 0.04, 'grain': 0.012, 'lift': 0,
                            'saturate': 1.05, 'blur': 0.4}},
    'philadelphia': {'size': (1200, 680),
                     'paint': {'radius': 5, 'smooth': 1.3, 'edge': 0.75, 'saturate': 1.3, 'lift': 0.03, 'blur': 0.6,
                               'palette': {'strength': 0.25}}},
    'sprig': {'size': (440, 560), 'paint': None, 'transparent': True},
}
WEBP_QUALITY, JPEG_QUALITY = 0.8, 80

def chrome(*args):
    return subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                           '--virtual-time-budget=5000', *args], capture_output=True, text=True, check=True).stdout


def main():
    if not os.path.isdir(os.path.join(HERE, 'src')):
        raise SystemExit('Run fetch.py first.')
    work = tempfile.mkdtemp(dir=HERE, prefix='.bake-')
    try:
        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass
        handler = functools.partial(Quiet, directory=HERE)
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_address[1]}'
        rel = os.path.basename(work)
        os.makedirs(DIST, exist_ok=True)
        for band, piece in PIECES.items():
            options = piece['paint']
            width, height = piece['size']
            composed = os.path.join(work, band + '.png')
            shot = [f'--window-size={width},{height}', f'--screenshot={composed}']
            if piece.get('transparent'):
                shot.append('--default-background-color=00000000')
            chrome(*shot, f'{base}/{band}.html')
            # Paint it (or, for a band that is already a painting, just re-encode it), taking both encodings from
            # the same canvas.
            params = {'src': f'/{rel}/{band}.png', 'export': WEBP_QUALITY}
            settings = dict(options) if options else {}
            if not options:
                params['passthrough'] = 1
            params['options'] = json.dumps(settings)
            query = urllib.parse.urlencode(params)
            dom = chrome('--dump-dom', f'{base}/paint.html?{query}')
            out = {}
            for kind in ('png', 'webp'):
                data = re.search(rf'data:image/{kind};base64,([A-Za-z0-9+/=]+)', dom)
                if not data:
                    raise SystemExit(f'painting {band} produced no {kind}')
                out[kind] = os.path.join(work if kind == 'png' else DIST, band + '.' + kind)
                with open(out[kind], 'wb') as fh:
                    fh.write(base64.b64decode(data.group(1)))
            # A transparent piece keeps its PNG as the fallback; an opaque one gets a much smaller JPEG.
            if piece.get('transparent'):
                fallback = os.path.join(DIST, band + '.png')
                shutil.copyfile(out['png'], fallback)
            else:
                fallback = os.path.join(DIST, band + '.jpg')
                subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', str(JPEG_QUALITY), out['png'],
                                '--out', fallback], capture_output=True, check=True)
            print(f'{band}: {os.path.getsize(out["webp"]) // 1024} KB webp, '
                  f'{os.path.getsize(fallback) // 1024} KB {fallback.rsplit(".", 1)[1]}')
        server.shutdown()
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
