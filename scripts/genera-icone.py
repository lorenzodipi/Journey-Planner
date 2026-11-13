# Rigenera le icone dell'app (SVG, PWA, iOS chiara/scura, Android legacy) da un unico disegno. Uso: python3 scripts/genera-icone.py
import os, sys
from playwright.sync_api import sync_playwright
R=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','')
ROPE='M51.5 83.9L55.6 100.0M76.5 83.9L72.4 100.0'
RING='M51.76 17.20a12.24 12.24 0 1 0 24.48 0a12.24 12.24 0 1 0 -24.48 0ZM60.08 17.20a3.92 3.92 0 1 0 7.83 0a3.92 3.92 0 1 0 -7.83 0Z'
C=[(86.51,28.04),(92.08,52.41),(76.5,71.95),(51.5,71.95),(35.92,52.41),(41.49,28.04)]
T={'light':dict(bg='#D3E8F9',rope='#064775',basket='#064775',ring='#F04C55',stroke='#064775',sw=2.4,cols=['#0084D2','#0A7BDA','#4A72DE','#6A69DB','#8460D2','#9B56C2']),
   'dark':dict(bg='#0D1118',rope='#D3E8F9',basket='#A8D1F1',ring='#FF6E70',stroke=None,sw=0,cols=['#26B0F7','#57A8FF','#78A0FF','#9398FF','#AC8FF8','#C487E8']),
   'blu':dict(bg='#0B64C4',rope='#FFFFFF',basket='#FFFFFF',ring='#FF6E70',stroke='#FFFFFF',sw=2.4,cols=['#38B6FF','#4DA3FF','#7C9BFF','#9B93FF','#B58BF5','#CD83E6'])}
def art(t):
    s=f' stroke="{t["stroke"]}" stroke-width="{t["sw"]}"' if t['stroke'] else ''
    o=f'<path d="{ROPE}" stroke="{t["rope"]}" stroke-width="2" stroke-linecap="round"></path><rect x="53.0" y="100.0" width="22.0" height="15.0" rx="4.5" fill="{t["basket"]}"></rect>'
    o+=f'<path d="{RING}" fill="{t["ring"]}" fill-rule="evenodd"{s}></path>'
    o+=''.join(f'<circle cx="{x}" cy="{y}" r="12.24" fill="{c}"{s}></circle>' for (x,y),c in zip(C,t['cols']))
    return o
def svg(theme, shape='rounded', scale=1.0, title=True):
    t=T[theme]; cid='y3'+theme[0]+'T'
    if shape=='rounded': bg=f'<rect width="128" height="128" rx="29" fill="{t["bg"]}"></rect>'; clip=f'<defs><clipPath id="{cid}"><rect width="128" height="128" rx="29"></rect></clipPath></defs>'; g=f'<g clip-path="url(#{cid})">'
    elif shape=='circle': bg=f'<circle cx="64" cy="64" r="64" fill="{t["bg"]}"></circle>'; clip=''; g='<g>'
    elif shape=='legacy': bg=f'<rect x="5.33" y="5.33" width="117.33" height="117.33" rx="3" fill="{t["bg"]}"></rect>'; clip=''; g='<g transform="translate(5.33 5.33) scale(0.9167)">'
    elif shape=='fg': bg=''; clip=''; g='<g>'
    else: bg=f'<rect width="128" height="128" fill="{t["bg"]}"></rect>'; clip=''; g='<g>'
    tr=f'<g transform="translate(64 64) scale({scale}) translate(-64 -64)">' if scale!=1 else '<g>'
    lab=f'Faraway, icona app {theme}'
    head=f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="{lab}"><title>{lab}</title>' if title else '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'
    return head+clip+bg+g+tr+art(t)+'</g></g></svg>'
# sorgenti SVG
for th in ['light','dark','blu']:
    open(R+f'src/assets/art/faraway-app-icon-anello-mongolfiera-{th}.svg','w').write(svg(th))
open(R+'public/favicon.svg','w').write(svg('light'))
jobs=[('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png','light','square',1,1024),
      ('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-dark.png','dark','square',1,1024),
      ('public/icon-512.png','light','rounded',1,512),('public/icon-192.png','light','rounded',1,192),('public/favicon-64.png','light','rounded',1,64),
      ('public/apple-touch-icon.png','light','square',1,180),('public/icon-512-maskable.png','light','square',0.72,512)]
for d,n in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    jobs.append((f'android/app/src/main/res/mipmap-{d}/ic_launcher.png','light','legacy',1,n))
    jobs.append((f'android/app/src/main/res/mipmap-{d}/ic_launcher_round.png','light','circle',1,n))

# icone alternative (scelta in Impostazioni, solo app nativa): iOS = un set per nome, Android = alias con le proprie risorse
ALT={'scura':('dark','IconaScura'),'blu':('blu','IconaBlu')}
for v,(th,nome) in ALT.items():
    jobs.append((f'ios/App/App/Assets.xcassets/{nome}.appiconset/{nome}.png',th,'square',1,1024))
    for d,n in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
        jobs.append((f'android/app/src/main/res/mipmap-{d}/ic_launcher_{v}.png',th,'legacy',1,n))
        jobs.append((f'android/app/src/main/res/mipmap-{d}/ic_launcher_{v}_round.png',th,'circle',1,n))
    for d,n in [('mdpi',108),('hdpi',162),('xhdpi',216),('xxhdpi',324),('xxxhdpi',432)]:
        jobs.append((f'android/app/src/main/res/mipmap-{d}/ic_launcher_{v}_foreground.png',th,'fg',0.696,n))
    os.makedirs(R+f'ios/App/App/Assets.xcassets/{nome}.appiconset',exist_ok=True)
    open(R+f'ios/App/App/Assets.xcassets/{nome}.appiconset/Contents.json','w').write('{\n  "images" : [\n    {\n      "filename" : "'+nome+'.png",\n      "idiom" : "universal",\n      "platform" : "ios",\n      "size" : "1024x1024"\n    }\n  ],\n  "info" : {\n    "author" : "xcode",\n    "version" : 1\n  }\n}\n')
with sync_playwright() as p:
    b=p.chromium.launch()
    for out,th,shape,sc,n in jobs:
        pg=b.new_page(viewport={'width':n,'height':n})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg(th,shape,sc,False).replace("<svg ",f"<svg width=\"{n}\" height=\"{n}\" ",1)}</body></html>')
        pg.screenshot(path=R+out,omit_background=(shape in ('rounded','circle','legacy','fg')),clip={'x':0,'y':0,'width':n,'height':n})
        pg.close()
    b.close()
print('ok',len(jobs))
