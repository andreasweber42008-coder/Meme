"""Build comparison images.
usage: python3 tools/compare.py side <ours.png> <ref.jpg> <out.png>    side by side (ours left)
       python3 tools/compare.py blend <ours.png> <ref.png> <out.png> [alpha]  overlay
"""
import sys
from PIL import Image
mode, a, b, out = sys.argv[1:5]
A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
if mode == 'side':
    B = B.resize(A.size)
    im = Image.new('RGB', (A.width * 2 + 10, A.height), 'white')
    im.paste(A, (0, 0)); im.paste(B, (A.width + 10, 0)); im.save(out)
else:
    alpha = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    B = B.resize(A.size)
    Image.blend(A, B, alpha).save(out)
