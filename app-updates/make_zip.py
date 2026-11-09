"""Zip a Capacitor web build for the in-app updater.

PowerShell 5.1's Compress-Archive writes backslashes into zip entry names,
which Android cannot unpack. This writes forward slashes, with index.html
at the root of the archive, which is what the updater expects.
usage: python make_zip.py <dist_dir> <out.zip>
"""
import os, sys, zipfile

src, out = sys.argv[1], sys.argv[2]
if not os.path.isfile(os.path.join(src, "index.html")):
    sys.exit(f"{src} has no index.html - build first")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, _, files in os.walk(src):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, src).replace(os.sep, "/")
            z.write(full, arc)
print(out, os.path.getsize(out), "bytes")
