"""Rasterize exact Arabic source text with HarfBuzz/FriBidi (Pillow RAQM)."""
from PIL import Image, ImageDraw, ImageFont, features
from pathlib import Path
import json,sys
assert features.check_feature('raqm'), 'Arabic shaping (RAQM) is required'
d=json.load(sys.stdin)
font_path=Path(__file__).parent/'fonts/NotoNaskhArabic-Regular.ttf'
BG='#091c2d'; PANEL='#13374f'; BORDER='#52748e'; GOLD='#f1cd86'; WHITE='#ffffff'
def font(size): return ImageFont.truetype(str(font_path),size)
def render(layout,w,h):
 im=Image.new('RGB',(w,h),BG); draw=ImageDraw.Draw(im)
 def box(rect): draw.rounded_rectangle(rect,20,fill=PANEL,outline=BORDER,width=2)
 def text_block(text,rect,size,color=WHITE,maximum=None):
  x,y,x2,y2=rect
  while size>=18:
   f=font(size);lines=[];line=''
   for word in text.split():
    trial=(line+' '+word).strip()
    if draw.textlength(trial,font=f,direction='rtl')>x2-x and line: lines.append(line);line=word
    else: line=trial
   if line:lines.append(line)
   ascent,descent=f.getmetrics();line_h=int((ascent+descent)*1.02)
   if len(lines)*line_h <= y2-y: break
   size-=1
  assert len(lines)*line_h<=y2-y, text
  top=y+(y2-y-len(lines)*line_h)/2
  for i,line in enumerate(lines): draw.text(((x+x2)/2,top+i*line_h),line,font=f,fill=color,anchor='mt',direction='rtl',language='ar')
  print(layout, 'font',size,'lines',len(lines),file=sys.stderr)
 title=d['title'];count=lambda n:''.join('٠١٢٣٤٥٦٧٨٩'[int(c)] for c in str(n))
 text_block(title,(40,20,w-40,130),66,GOLD)
 if layout=='landscape':
  kursi=(40,155,925,815);opening=(945,155,1880,440);second=(945,460,1880,815);tas_y=835;tas_h=92;comp_y=945
 else:
  opening=(32,150,1048,465);second=(32,485,1048,875);kursi=(32,895,1048,1525);tas_y=1545;tas_h=130;comp_y=1690
 for b in [kursi,opening,second]:box(b)
 x,y,x2,y2=opening
 text_block(d['forgiveness']['arabic']+'  ×  '+count(3),(x+20,y+12,x2-20,y+90),52,GOLD)
 text_block(d['peace'],(x+24,y+96,x2-24,y2-20),50)
 x,y,x2,y2=second;mid=(y+y2)/2
 text_block(d['tawhid'],(x+24,y+12,x2-24,mid),48)
 text_block(d['generosity'],(x+24,mid,x2-24,y2-14),46)
 x,y,x2,y2=kursi
 text_block(d['kursi']['label'],(x+24,y+12,x2-24,y+80),42,GOLD)
 text_block(d['kursi']['arabic'],(x+24,y+84,x2-24,y2-18),47 if layout=='landscape' else 48)
 gap=16;side=32;cw=(w-2*side-2*gap)/3
 for i,item in enumerate(d['tasbih']):
  x=w-side-(i+1)*cw-i*gap;rect=(x,tas_y,x+cw,tas_y+tas_h);box(rect)
  text_block(item['arabic']+'  ×  '+count(item['count']),(x+12,tas_y+10,x+cw-12,tas_y+tas_h-10),45,GOLD)
 text_block(d['completion']['label']+'  ×  ١',(32,comp_y,w-32,comp_y+52),32,GOLD)
 text_block(d['completion']['arabic'],(40,comp_y+55,w-40,h-25),40)
 im.save(Path('public/tv')/f'after-salah-{layout}.png',optimize=True)
for args in [('landscape',1920,1080),('portrait',1080,1920)]:render(*args)
