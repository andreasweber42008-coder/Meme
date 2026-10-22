"""Make a blinded A/B pair for a critic.
usage: python3 tools/pair.py <ours.png> <ref.png> <outdir> <keyfile> [x0,y0,x1,y1]
Both images are resized to ours' size, optionally cropped to the same box
(given in ours' pixel coordinates), and written as A.png / B.png in random
order. Which one is ours goes to <keyfile> only.
"""
import os, random, sys
from PIL import Image
ours, ref, outdir, keyfile = sys.argv[1:5]
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 else None
O = Image.open(ours).convert('RGB'); R = Image.open(ref).convert('RGB').resize(O.size, Image.LANCZOS)
if crop:
    O, R = O.crop(crop), R.crop(crop)
    if O.width < 700:  # upscale small crops so details are judgeable
        f = 700 / O.width
        O = O.resize((700, round(O.height * f)), Image.LANCZOS); R = R.resize(O.size, Image.LANCZOS)
os.makedirs(outdir, exist_ok=True)
ours_is = random.choice('AB')
(O if ours_is == 'A' else R).save(os.path.join(outdir, 'A.png'))
(R if ours_is == 'A' else O).save(os.path.join(outdir, 'B.png'))
os.makedirs(os.path.dirname(keyfile) or '.', exist_ok=True)
open(keyfile, 'w').write(ours_is)
print('pair written to', outdir)
