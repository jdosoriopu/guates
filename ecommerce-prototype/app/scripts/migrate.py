"""Compile the existing canvas, without redesigning it or requiring its editor runtime.
Only local, checked-in template expressions are compiled; no runtime eval is used.
"""
from pathlib import Path
from html.parser import HTMLParser
import re, json, hashlib
root=Path(__file__).resolve().parents[1]
source=root.parent/'canvas/project/Main.dc.html'
s=source.read_text()
script=re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>',s,re.S).group(1)
logic=script.replace('class Component extends DCLogic {','export class CanvasLogic extends React.Component {')
(root/'generated/logic.js').write_text('// Generated from Main.dc.html. Do not edit; extend in src/Store.jsx.\nimport React from "react";\n'+logic+'\nexport { C, PRODUCTS, PERSONA, BY, CITIES, FARMS, ROASTERY, SIZES, GRINDS, STAGE_MAP, MOODS, TASTES, priceOf, money };\n')
style=re.search(r'<style>(.*?)</style>',s,re.S).group(1)
# Use the canonical token declarations from the design system instead of duplicate canvas tokens.
style=re.sub(r':root\{[^}]*\}\s*\[data-theme="dark"\]\{[^}]*\}', '',style, count=1)
(root/'generated/canvas.css').write_text('/* Generated canvas styles. Canonical tokens come from the design system. */\n'+style)
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root={'tag':'fragment','attrs':{},'children':[]};self.stack=[self.root]
 def handle_starttag(self,t,a):
  n={'tag':t,'attrs':dict(a),'children':[]};self.stack[-1]['children'].append(n)
  if t not in ['input','link','meta','br','hr','img']:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==t:self.stack=self.stack[:i];return
 def handle_data(self,d):self.stack[-1]['children'].append(d)
p=Parser();p.feed(re.search(r'<x-dc>(.*?)</x-dc>',s,re.S).group(1))
# Launch edits on the parsed tree (the canvas file is never changed): drop prototype notices,
# put live values where the canvas has sample price labels and gate features that are off.
def own(n):return ''.join(c for c in n['children'] if isinstance(c,str)).strip()
def elems(n):return [c for c in n['children'] if not isinstance(c,str)]
def lead(n,*tags):
 for t in tags:
  k=elems(n)
  if not k or k[0]['tag']!=t:return None
  n=k[0]
 return own(n)
OMIT=[lambda n:own(n).startswith('Prototipo de tienda:'),lambda n:own(n)=='· dato de muestra',lambda n:own(n)=='Precios y envío de muestra.',lambda n:own(n).startswith('Esto es un prototipo:')]
TEXT={
 'Desde {{emo.price}} / 250 g':['{{emo.priceLine}}'],
 '250 g · precio de muestra':['{{emo.weight}}','{{c.weight}}'],
 'Precio: dato de muestra. Envío calculado en el carrito.':['Envío calculado en el carrito.'],
 'Productor, finca, variedad y proceso vienen de la etiqueta. Altitud, coordenadas, cosecha, notas y precio son datos de muestra.':['Productor, finca, variedad y proceso vienen de la etiqueta. Altitud, coordenadas, cosecha y notas son datos de muestra.'],
 'Confirmar pedido simulado · {{cart.total}}':['Confirmar pedido · {{cart.total}}'],
 'Pedido simulado {{order.no}}. Prototipo: no se generó ningún pedido real.':['Pedido {{order.no}}.'],
}
GATES=[('passport',lambda n:lead(n,'span')=='Tu pasaporte cafetero'),('passport',lambda n:lead(n,'div','h2')=='Tu pasaporte cafetero')]
# Extension slots inside the shop: compact tools in the filter bar, extra cards after the grid.
SLOTS=[('card',lambda n:any(isinstance(k,dict) and k['attrs'].get('on-click')=='{{c.quick}}' for k in n['children'])),('filters',lambda n:n['attrs'].get('aria-label')=='Ordenar'),('filters-after',lambda n:any(isinstance(k,dict) and k['attrs'].get('aria-label')=='Ordenar' for k in n['children'])),('catalog-end',lambda n:lead(n,'sc-for')=='' and elems(n)[0]['attrs'].get('list')=='{{cards}}')]
used={'omit':0,'gate':0,'slot':0}
def launch(n):
 kept=[]
 for c in n['children']:
  if isinstance(c,str):
   options=TEXT.get(c.strip())
   if options is not None:c=options.pop(0)
   kept.append(c);continue
  if any(f(c) for f in OMIT):used['omit']+=1;continue
  for feature,f in GATES:
   if f(c):c['gate']=feature;used['gate']+=1
  launch(c);kept.append(c)
  for placement,f in SLOTS:
   if f(c):kept.append({'tag':'x-slot','attrs':{'placement':placement,**({'item':'c'} if placement=='card' else {})},'children':[]});used['slot']+=1
 n['children']=kept
launch(p.root)
if used!={'omit':4,'gate':2,'slot':4} or any(TEXT.values()):raise SystemExit('Launch edits no longer match the canvas: '+json.dumps({**used,'text':TEXT},ensure_ascii=False))
renames={'class':'className','for':'htmlFor','tabindex':'tabIndex','patternunits':'patternUnits','viewbox':'viewBox','clippathunits':'clipPathUnits','preserveaspectratio':'preserveAspectRatio','pathlength':'pathLength','basefrequency':'baseFrequency','numoctaves':'numOctaves','xchannelselector':'xChannelSelector','ychannelselector':'yChannelSelector','stddeviation':'stdDeviation','filterunits':'filterUnits','color-interpolation-filters':'colorInterpolationFilters','autocomplete':'autoComplete','on-click':'onClick','onclick':'onClick','onchange':'onChange','onmouseenter':'onMouseEnter','onmouseleave':'onMouseLeave','onfocus':'onFocus','onblur':'onBlur','onkeydown':'onKeyDown','onpointerenter':'onPointerEnter','onpointerleave':'onPointerLeave'}
tags={'clippath':'clipPath','feturbulence':'feTurbulence','fedisplacementmap':'feDisplacementMap','fecolormatrix':'feColorMatrix','fecomposite':'feComposite'}
seq=0
counts={}
def expr(x,env):
 x=x.strip()
 if not re.fullmatch(r'[\w.]+',x):raise ValueError('Unsupported expression: '+x)
 if x in ['true','false']:return x
 first=x.split('.')[0]
 return (env.get(first,'v.'+first))+x[len(first):]
def value(x,env):
 if x is None:return 'true'
 m=re.fullmatch(r'{{([^{}]+)}}',x)
 if m:return expr(m.group(1),env)
 chunks=re.split(r'({{.*?}})',x)
 return ' + '.join(('String('+expr(c[2:-2],env)+' ?? "")') if c.startswith('{{') else json.dumps(c) for c in chunks if c) or '""'
def css(x,env):
 parts=[]
 for d in x.split(';'):
  if ':' not in d:continue
  k,vv=d.split(':',1);k=k.strip();vv=vv.strip()
  key=k if k.startswith('--') else re.sub(r'-([a-z])',lambda m:m[1].upper(),k)
  parts.append(json.dumps(key)+':'+value(vv,env))
 return '{'+','.join(parts)+'}'
def emit(n,env={}):
 global seq
 if isinstance(n,str):return value(n,env)
 tag=n['tag'];a=n['attrs'];counts[tag]=counts.get(tag,0)+1
 if tag=='helmet':return None
 if tag=='x-slot':return 'h(Extension,{controller,values:v,placement:'+json.dumps(a['placement'])+(',item:'+env[a['item']] if 'item' in a else '')+'})'
 if tag=='sc-if':return '('+value(a['value'],env)+' ? '+children(n,env)+' : null)'
 if tag=='sc-for':
  seq+=1;idx='i'+str(seq);alias='item'+str(seq);new={**env,a['as']:alias}
  return '('+value(a['list'],env)+' || []).map(('+alias+','+idx+') => h(React.Fragment,{key:'+idx+'},'+children(n,new)+'))'
 if tag=='fragment':return children(n,env)
 if tag=='x-import':component=a['component-from-global-scope'];counts[component]=counts.get(component,0)+1
 else:component=json.dumps(tags.get(tag,tag))
 props=[]
 for k,vv in a.items():
  if k.startswith('hint-') or k=='component-from-global-scope':continue
  key=renames.get(k,k)
  if '-' in key and not key.startswith(('aria-','data-','--')):key=re.sub(r'-([a-z])',lambda m:m[1].upper(),key)
  props.append(json.dumps(key)+':'+(css(vv,env) if k=='style' else value(vv,env)))
 obj='{'+','.join(props)+'}'
 child=[v for c in n['children'] if (v:=emit(c,env)) is not None]
 if tag in ['header','main','footer']:
  slot='h(Extension,{controller,values:v,placement:'+json.dumps(tag)+'})'
  if tag=='main':child.insert(0,slot)
  else:child.append(slot)
 out='h('+component+',controller.adaptProps('+json.dumps(tag)+','+obj+')'+(','+','.join(child) if child else '')+')'
 return '(controller.feature('+json.dumps(n['gate'])+') ? '+out+' : null)' if 'gate' in n else out
def children(n,env):return 'h(React.Fragment,null,'+','.join(v for c in n['children'] if (v:=emit(c,env)) is not None)+')'
code=emit(p.root)
(root/'generated/Template.jsx').write_text('// Generated from Main.dc.html. Do not edit.\nimport React from "react";\nimport {Extension} from "../src/Extensions.jsx";\nconst h=React.createElement;\nexport function Template({controller,v}){const Guates=window.Guates;return '+code+';}\n')
(root/'generated/provenance.json').write_text(json.dumps({'source':'../canvas/project/Main.dc.html','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'nodes':counts,'logic':'Original script; only base class/import/exports adapted.','styles':'Original styles minus duplicate design tokens.'},indent=2)+'\n')
print('Migrated Main: original template, controller, data and styles. Source untouched.')
