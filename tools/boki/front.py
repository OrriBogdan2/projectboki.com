import sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
SITE=__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..'))
def front(key, src=None):
    im=Image.open(src or f'{SITE}/assets/img/boki2d/{key}-2400.webp').convert('RGB')
    a=np.asarray(im).astype(int); h,w,_=a.shape
    border=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]); bg=np.median(border,axis=0)
    d=np.abs(a-bg).sum(2)
    strong=d>90
    cols=ndimage.binary_closing(strong.sum(0)>3, iterations=6)
    lab,n=ndimage.label(cols)
    runs=[(np.where(lab==i)[0][0], np.where(lab==i)[0][-1]) for i in range(1,n+1)]
    runs=[r for r in runs if r[1]-r[0]>w*0.04]
    x0,x1=runs[0]
    if w/h < 1.3:   # a single portrait, not a sheet: keep it whole, its own dark backdrop matches the cards
        s=max(w,h); sq=Image.new('RGBA',(s,s),(0,0,0,0)); p=im.convert('RGBA')
        yy,xx=np.mgrid[0:h,0:w]; r=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2)
        p.putalpha(Image.fromarray((np.clip((1.0-r)/0.22,0,1)*255).astype(np.uint8)))   # soft edges so its backdrop melts into the card
        sq.paste(p,((s-w)//2,(s-h)//2)); return sq
    touching = x1-x0 > w*0.45
    if touching:   # figures touching: cut at the emptiest column between the first and second figure
        cs=(d>40).sum(0).astype(float); lo,hi=x0+int(w*0.12), x0+int(w*0.34)
        x1 = lo + int(np.argmin(cs[lo:hi]))
    sub=d[:, x0:x1]>40
    rows=np.where(sub.sum(1)>2)[0]; y0,y1=rows[0],rows[-1]
    # background -> alpha: flood from the edges over pixels close to bg
    near=d<34
    lab2,_=ndimage.label(near)
    edge=set(np.unique(np.concatenate([lab2[0],lab2[-1],lab2[:,0],lab2[:,-1]])))-{0}
    bgmask=np.isin(lab2,list(edge))
    alpha=np.where(bgmask,0,255).astype(np.uint8)
    alpha=np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2)))
    rgba=np.dstack([np.asarray(im),alpha]).astype(np.uint8)
    fg=alpha>40
    if touching: fg = ndimage.binary_opening(fg, structure=np.ones((7,1)))
    lab3,n3=ndimage.label(fg)
    keep=np.zeros_like(fg)
    sl=ndimage.find_objects(lab3)
    for i,s_ in enumerate(sl, start=1):
        ys,xs=s_
        cx=(xs.start+xs.stop)/2; hh=ys.stop-ys.start; ww=xs.stop-xs.start
        if not (x0-w*0.01 <= cx <= x1+w*0.01) and not (touching and xs.start < x1): continue
        if hh < h*0.012 and ww > w*0.05: continue   # a ground line
        keep[s_] |= (lab3[s_]==i)
    keep[:, min(w, x1+int(w*0.01)):] = False      # never anything from the next figure
    keep[:, :max(0, x0-int(w*0.01))] = False
    # two creatures side by side in the first view (a pair pose): keep the left one
    lab4,n4=ndimage.label(keep)
    if n4>1:
        sizes=ndimage.sum(keep,lab4,range(1,n4+1)); big=[i+1 for i,z in enumerate(sizes) if z>0.3*sizes.max()]
        if len(big)>1:
            boxes=sorted([(ndimage.find_objects(lab4)[i-1][1].start, i) for i in big])
            first=ndimage.find_objects(lab4)[boxes[0][1]-1][1]; second=ndimage.find_objects(lab4)[boxes[1][1]-1][1]
            if second.start > first.stop - 4: keep[:, second.start-2:] = False
    alpha=np.where(keep, alpha, 0).astype(np.uint8)
    ys,xs=np.where(keep); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    rgba=np.dstack([np.asarray(im),alpha]).astype(np.uint8)
    pad=int(max(x1-x0,y1-y0)*0.08)
    X0,X1,Y0,Y1=max(0,x0-pad),min(w,x1+pad),max(0,y0-pad),min(h,y1+pad)
    crop=Image.fromarray(rgba[Y0:Y1,X0:X1],'RGBA')
    s=max(crop.size); sq=Image.new('RGBA',(s,s),(0,0,0,0)); sq.paste(crop,((s-crop.width)//2, s-crop.height-int(s*0.04)))
    return sq
if __name__ == "__main__":
    for k in sys.argv[1:]:
        front(k).resize((480,480),Image.LANCZOS).save(f'/tmp/crop/out/{k}.webp','WEBP',quality=84,method=6,alpha_quality=90)
