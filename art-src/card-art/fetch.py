#!/usr/bin/env python3
"""Copy the couple's paintings in, ready for bake.py to cut the card's art from them.

    python3 art-src/card-art/fetch.py

Both bands are crops of these two, so nothing is downloaded and nothing third-party ships.
The originals in reference/ are never modified; this only copies them into src/ (git-ignored).
"""
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.normpath(os.path.join(HERE, '..', '..', 'reference'))

# (source in reference/, name under src/)
PAINTINGS = [
    ('wedding-crest.png', 'crest.png'),
    ('philadelphia-medallion.png', 'philadelphia.png'),
]


def main():
    os.makedirs(os.path.join(HERE, 'src'), exist_ok=True)
    for source, name in PAINTINGS:
        shutil.copyfile(os.path.join(REFERENCE, source), os.path.join(HERE, 'src', name))
        print(f'{name}: copied from reference/{source}')


if __name__ == '__main__':
    main()
