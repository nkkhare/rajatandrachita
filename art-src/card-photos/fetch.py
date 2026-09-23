#!/usr/bin/env python3
"""Download the source photos for the card's Philadelphia band, and copy the crest in beside them.

The top band is cut from the couple's crest itself; the city band is built from these three landmarks.

    python3 art-src/card-photos/fetch.py

Saves 1920px copies into art-src/card-photos/src/ (git-ignored). The licenses and credits are listed in SOURCES and
repeated in README.md and on the page footer; keep all three in step if a photo changes.
"""
import json
import os
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
UA = 'rajatandrachita-savethedate/1.0 (personal wedding site; https://github.com/nkkhare/rajatandrachita)'

# (local name, Commons file title, credit, license)
SOURCES = [
    ('skyline.jpg', 'Philadelphia Skyline from the Camden Waterfront (cropped).jpg', 'Bronzeage10', 'CC BY 4.0'),
    ('cityhall.jpg', 'City Hall - Philadelphia (2642140481).jpg', 'Reading Tom', 'CC BY 2.0'),
    ('hall.jpg', 'Independence Hall Exterior Front.jpg', 'Andrew Rehbein', 'CC BY-SA 4.0'),
    ('bell.jpg', 'Originally cast to be the State House bell, this bell is known today as the Liberty Bell. '
                 'The Liberty Bell got its name from (357e4998-155d-451f-673e-9c6a041f71d2).jpg', 'NPS photo', 'Public domain'),
]


def get(url):
    for attempt in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read()
        except urllib.error.HTTPError as err:
            if err.code != 429:
                raise
            time.sleep(5 * (attempt + 1))
    raise SystemExit(f'rate limited: {url}')


def main():
    os.makedirs(os.path.join(HERE, 'src'), exist_ok=True)
    # The crest is the top band's source. Copy it in; never modify the original.
    shutil.copyfile(os.path.join(HERE, '..', '..', 'reference', 'wedding-crest.png'), os.path.join(HERE, 'src', 'crest.png'))
    print('crest.png: copied from reference/wedding-crest.png')
    for name, title, credit, license_name in SOURCES:
        dest = os.path.join(HERE, 'src', name)
        if os.path.exists(dest):
            print('have', name)
            continue
        query = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': 'File:' + title,
                                        'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 1920})
        page = next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?' + query))['query']['pages'].values()))
        with open(dest, 'wb') as fh:
            fh.write(get(page['imageinfo'][0]['thumburl']))
        print(f'{name}: {title} ({credit}, {license_name})')
        time.sleep(2)


if __name__ == '__main__':
    main()
