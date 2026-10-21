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

/** Top-down cup; roast 1..5 follows bean-morph's discrete palette. aroma toggles line animation. */
export function mount(container, options={}) {
  let opts={roast:3,aroma:true,...options},time=0;
  const rt=runtime(container,'Tu taza: vista superior y líneas de aroma. Color de tostión ilustrativo.');
  const caption=label(rt.root,'Tu taza · el siguiente tramo lo haces tú');
  const group=new THREE.Group();rt.scene.add(group);
  const saucer=new THREE.Mesh(new THREE.CircleGeometry(1.5,40),material(P.cream));saucer.rotation.x=-Math.PI/2;group.add(saucer);
  function circle(radius,y,color){const pts=[];for(let i=0;i<56;i++){const a=i/56*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius));}return line(pts,color,true);}
  group.add(circle(1.5,.008,P.coffee),circle(1.1,.02,P.coffee));
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.33,.09,6,20),material(P.coffee));handle.rotation.x=-Math.PI/2;handle.position.set(1.1,.15,0);group.add(handle);
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.3,40,1,true),material(P.cream));wall.position.y=.17;group.add(wall);
  const rim=new THREE.Mesh(new THREE.RingGeometry(.87,1,40),material(P.coffee));rim.rotation.x=-Math.PI/2;rim.position.y=.33;group.add(rim);
  const liquid=new THREE.Mesh(new THREE.CircleGeometry(.87,40),material(P.orange));liquid.rotation.x=-Math.PI/2;liquid.position.y=.30;group.add(liquid);
  const aromas=[];
  for(let k=0;k<3;k++){const points=[];for(let i=0;i<=24;i++){const t=i/24;points.push(new THREE.Vector3((k-1)*.36+Math.sin(t*Math.PI*2+k)*.11,.6,-.5+t));}
    const stroke=line(points,P.clay);group.add(stroke);aromas.push(stroke);
  }
  const roastColors=[P.light,P.clay,P.orange,P.coffee,P.coffee];
  rt.start(dt=>{
    if(!rt.reduced)time+=dt;
    const roast=clamp(Math.round(finite(opts.roast,3)),1,5);liquid.material.color.set(roastColors[roast-1]);
    aromas.forEach((s,i)=>{s.visible=!!opts.aroma;s.position.z=rt.reduced?0:Math.sin(time*.9+i)*.1;s.rotation.y=rt.reduced?0:Math.sin(time*.5+i)*.08;});
    const fit=Math.max(1,.9/rt.camera.aspect);rt.camera.position.set(0,5.7*fit,.01);rt.camera.up.set(0,0,-1);rt.camera.lookAt(0,0,0);
    caption.textContent=`Tu taza · nivel ${roast}/5 · color ilustrativo`;
  });
  return {update(next={}){opts={...opts,...next};rt.requestRender();},destroy(){rt.destroy();}};
}
