#!/usr/bin/env python3
"""Append ?v=<content-hash> to every local asset reference in index.html.

The vhost serves css/js/images with `Cache-Control: public, immutable` for 30
days and Cloudflare caches them at the edge, so a changed file served under an
unchanged URL is invisible to visitors for a month. Versioned URLs are what make
that caching policy safe. The hash changes only when the file's bytes change, so
running this repeatedly is a no-op until something actually changes.

Run from the project root, before every deploy.
"""
import hashlib
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")

REF = re.compile(
    r'(?<=["\'])'
    r'((?:assets/[a-z]+|css|js)/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|svg|webp|css|js|mp4|webm))'
    r'(?:\?v=[0-9a-f]+)?'
    r'(?=["\'])'
)


def digest(path):
    with open(path, "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()[:8]


def main():
    html = io.open(PAGE, encoding="utf-8").read()
    hashes, missing = {}, []

    def repl(m):
        rel = m.group(1)
        full = os.path.join(ROOT, rel)
        if not os.path.isfile(full):
            missing.append(rel)
            return m.group(0)
        if rel not in hashes:
            hashes[rel] = digest(full)
        return rel + "?v=" + hashes[rel]

    out, count = REF.subn(repl, html)

    if missing:
        for rel in sorted(set(missing)):
            print("  WARNING: referenced but not on disk: %s" % rel, file=sys.stderr)

    if out == html:
        print("no change (%d references already current)" % count)
        return 0

    io.open(PAGE, "w", encoding="utf-8").write(out)
    print("versioned %d references across %d files" % (count, len(hashes)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
