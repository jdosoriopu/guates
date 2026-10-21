import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const P = Object.freeze({orange:'#CD591C', coffee:'#624532', sun:'#F2D139', green:'#364831', blue:'#4E71F0', cherry:'#81164B', clay:'#D6855A', cream:'#F6F3ED', light:'#F5E380', sprout:'#91AD80', sky:'#9DB5EC', pink:'#DB92BA'});
const PALETTE = new Set(Object.values(P));
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const finite = (x,d) => Number.isFinite(Number(x)) ? Number(x) : d;
const ink = (x,d) => typeof x === 'string' && PALETTE.has(x.toUpperCase()) ? x.toUpperCase() : d;
const material = color => new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide});
function disposeTree(root) {
  const geometries=new Set(), materials=new Set();
  root.traverse(o => {if(o.geometry) geometries.add(o.geometry); if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
  geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
}
function empty(group) { disposeTree(group); group.clear(); }
function label(root, text) {
  const el=document.createElement('div'); el.textContent=text;
  Object.assign(el.style,{position:'absolute',left:'12px',top:'12px',maxWidth:'calc(100% - 24px)',padding:'6px 8px',background:P.cream,color:P.coffee,border:`1px solid ${P.coffee}`,font:'12px Roboto, sans-serif',pointerEvents:'none'});
  root.append(el); return el;
}
function runtime(container, name) {
  if(!container || container.nodeType!==1) throw new TypeError('mount necesita un elemento contenedor.');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(P.cream,0); renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping; renderer.shadowMap.enabled=false;
  const root=document.createElement('div');
  Object.assign(root.style,{position:'relative',width:'100%',height:'100%',overflow:'hidden'});
  const canvas=renderer.domElement; canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',name);
  Object.assign(canvas.style,{display:'block',width:'100%',height:'100%',touchAction:'none'});
  root.append(canvas); container.append(root);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(40,1,0.05,250);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, started=false, dead=false, raf=0, last=0, frame=()=>{};
  const cleanups=[];
  function on(target,event,fn,opts) {target.addEventListener(event,fn,opts);cleanups.push(()=>target.removeEventListener(event,fn,opts));}
  function draw() {if(!dead&&started&&visible&&!document.hidden){frame(0,true);renderer.render(scene,camera);}}
  function loop(now) {
    raf=0; if(dead||!started||!visible||document.hidden||motion.matches) return;
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    frame(dt,false);renderer.render(scene,camera);
    raf=requestAnimationFrame(loop);
  }
  function sync() {
    cancelAnimationFrame(raf);raf=0;last=0;
    if(dead||!started||!visible||document.hidden)return;
    draw();if(!motion.matches)raf=requestAnimationFrame(loop);
  }
  function resize() {
    if(dead)return;
    const box=container.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();draw();
  }
  const ro=new ResizeObserver(resize);ro.observe(container);
  const io=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0});io.observe(container);
  on(document,'visibilitychange',sync);on(motion,'change',sync);
  return {scene,camera,renderer,root,canvas,on,get reduced(){return motion.matches;},requestRender:draw,
    start(fn){frame=fn;started=true;resize();sync();},
    destroy(){if(dead)return;dead=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();cleanups.splice(0).forEach(f=>f());disposeTree(scene);scene.clear();renderer.dispose();renderer.forceContextLoss();root.remove();}
  };
}
function dragging(rt, move) {
  let active=false,id=null,x=0,y=0;
  rt.on(rt.canvas,'pointerdown',e=>{if(e.button!==0)return;active=true;id=e.pointerId;x=e.clientX;y=e.clientY;rt.canvas.setPointerCapture(id);});
  rt.on(rt.canvas,'pointermove',e=>{if(!active||e.pointerId!==id)return;move(e.clientX-x,e.clientY-y);x=e.clientX;y=e.clientY;rt.requestRender();});
  const end=e=>{if(e.pointerId!==id)return;active=false;if(rt.canvas.hasPointerCapture(id))rt.canvas.releasePointerCapture(id);id=null;};
  rt.on(rt.canvas,'pointerup',end);rt.on(rt.canvas,'pointercancel',end);rt.on(rt.canvas,'lostpointercapture',end);
}
function line(points,color,closed=false) {
  const g=new THREE.BufferGeometry().setFromPoints(points);
  return new (closed?THREE.LineLoop:THREE.Line)(g,new THREE.LineBasicMaterial({color}));
}

/** stage: 0 cherry, 1 parchment, 2 green, 3 roasted. roast: 1..5.
 * Palette-only roast ladder: light, clay, orange, coffee, coffee.
 * Levels 4 and 5 share coffee: the permitted palette has no near-black coffee.
 */
export function mount(container, options={}) {
  let opts={stage:0,roast:3,...options},progress=clamp(finite(options.stage,0),0,3),turn=0,tilt=.12;
  const rt=runtime(container,'De cereza a taza: cereza, pergamino, verde y tostado. Arrastra para girar.');
  const model=new THREE.Group(),shell=new THREE.Group(),bean=new THREE.Group(),parchment=new THREE.Group();model.add(bean,parchment,shell);rt.scene.add(model);
  const caption=label(rt.root,'');
  // Two separated ellipsoid lobes make a physical central crease, not a painted texture.
  const beanMat=material(P.light);
  [-1,1].forEach(sign=>{const half=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),beanMat);half.scale.set(.36,.78,.35);half.position.x=sign*.25;half.rotation.z=-sign*.055;bean.add(half);});
  const creasePoints=[];for(let i=0;i<=24;i++){const t=i/24;creasePoints.push(new THREE.Vector3(.045*Math.sin(t*Math.PI*2),-.66+t*1.32,.25+.11*Math.sin(t*Math.PI)));}
  bean.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(creasePoints),24,.018,5,false),material(P.coffee)));
  const parchmentHalves=[];
  [-1,1].forEach(sign=>{const g=new THREE.SphereGeometry(1,16,12,sign<0?Math.PI/2:-Math.PI/2,Math.PI);const mesh=new THREE.Mesh(g,material(P.light));mesh.scale.set(.7,.88,.44);parchment.add(mesh);parchmentHalves.push({mesh,sign});});
  const cherryHalves=[];
  [-1,1].forEach(sign=>{const g=new THREE.SphereGeometry(1,20,14,sign<0?Math.PI/2:-Math.PI/2,Math.PI);const mesh=new THREE.Mesh(g,material(P.cherry));mesh.scale.set(.88,1,.78);shell.add(mesh);cherryHalves.push({mesh,sign});});
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.055,.32,6),material(P.green));stem.position.y=1.08;model.add(stem);
  const leaf=new THREE.Mesh(new THREE.CircleGeometry(.18,5),material(P.green));leaf.scale.set(1.8,.6,1);leaf.position.set(.19,1.15,0);leaf.rotation.z=.3;model.add(leaf);
  // Sparse drawn silhouette rings keep the solid forms legible without lighting or shadows.
  function oval(rx,ry,z,color){const points=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*rx,Math.sin(a)*ry,z));}return line(points,color,true);}
  const cherryOutline=oval(.89,1.01,0,P.coffee);shell.add(cherryOutline);
  const beanOutline=oval(.62,.8,0,P.coffee);bean.add(beanOutline);
  dragging(rt,(dx,dy)=>{turn+=dx*.009;tilt=clamp(tilt+dy*.008,-1.1,1.1);});
  rt.start(dt=>{
    const target=clamp(finite(opts.stage,0),0,3);
    if(rt.reduced)progress=target;else progress+=Math.sign(target-progress)*Math.min(Math.abs(target-progress),dt*1.5);
    const peel=clamp(progress,0,1),husk=clamp(progress-1,0,1),roast=clamp(Math.round(finite(opts.roast,3)),1,5);
    const roastColors=[P.light,P.clay,P.orange,P.coffee,P.coffee];
    beanMat.color.set(progress<1.5?P.light:progress<2.5?P.sprout:roastColors[roast-1]);
    cherryHalves.forEach(({mesh,sign})=>{mesh.position.set(sign*peel*1.35,peel*-.4,0);mesh.rotation.z=sign*peel*-.8;mesh.scale.set(.88*(1-.75*peel),1*(1-.75*peel),.78*(1-.75*peel));});
    shell.visible=progress<.99;cherryOutline.visible=progress<.05;stem.visible=leaf.visible=progress<.2;
    parchmentHalves.forEach(({mesh,sign})=>{mesh.position.set(sign*husk*1.15,-husk*.2,0);mesh.rotation.z=sign*husk*-.65;mesh.scale.set(.7*(1-.8*husk),.88*(1-.8*husk),.44*(1-.8*husk));});
    parchment.visible=progress>=.6&&progress<1.99;bean.visible=progress>.15;
    if(!rt.reduced)turn+=dt*.16;
    model.rotation.set(tilt,turn,0);const fit=Math.max(1,.9/rt.camera.aspect);rt.camera.position.set(0,.2,5.8*fit);rt.camera.lookAt(0,.1,0);
    const names=['Cereza · la fruta que lo guarda','Pergamino · su capa seca protectora','Verde · listo para tostar','Tostado · el calor transforma el grano'];
    caption.textContent=names[Math.round(progress)]+(Math.round(progress)===3?` · nivel ${roast}/5`:'');
  });
  return {update(next={}){opts={...opts,...next};rt.requestRender();},destroy(){rt.destroy();}};
}
