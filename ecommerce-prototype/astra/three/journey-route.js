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

/** Coordinates use a local equirectangular projection. Routes are illustrative, NOT roads.
 * stage accepts 0..stops.length-1 (fractions also work for scroll).
 * onStop({index,stop}) fires once on each arrival, also when travelling backwards.
 * Extra options: stops:[{name,lat,lng}], speed (segments/sec), follow, onStop.
 */
export function mount(container, options={}) {
  const defaults=[{name:'Finca Palma Roja',lat:4.58,lng:-75.16},{name:'Trilla · Ibagué',lat:4.4389,lng:-75.2322},{name:'Tostión · Villavicencio',lat:4.142,lng:-73.627},{name:'Tu taza · Bogotá',lat:4.711,lng:-74.0721}];
  let opts={stage:0,speed:.65,follow:true,...options},stops=[],paths=[],current=0,target=0,lastArrival=-1;
  const rt=runtime(container,'El recorrido: finca, trilla, tostión y tu taza. Coordenadas y ruta de muestra.');
  const map=new THREE.Group(),route=new THREE.Group(),traveller=new THREE.Group();rt.scene.add(map,route,traveller);
  const caption=label(rt.root,'Ruta ilustrada · dato de muestra');
  const arrival=label(rt.root,'');arrival.style.top='auto';arrival.style.bottom='12px';
  const project=p=>new THREE.Vector3((p.lng+74.4)*111.32*Math.cos(4.4*Math.PI/180)*.026,0,-(p.lat-4.4)*111.32*.026);
  const outline=[{lat:6.2,lng:-75.7},{lat:6.1,lng:-74.3},{lat:5.7,lng:-73.0},{lat:4.8,lng:-72.3},{lat:3.6,lng:-72.6},{lat:2.5,lng:-73.5},{lat:1.4,lng:-75.6},{lat:2.3,lng:-76.4},{lat:3.5,lng:-76.2},{lat:4.7,lng:-76.1}].map(project);
  const shape=new THREE.Shape();outline.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const plate=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false,steps:1}),material(P.sprout));plate.rotation.x=-Math.PI/2;plate.position.y=-.28;map.add(plate);
  map.add(line(outline.map(p=>new THREE.Vector3(p.x,.005,p.z)),P.green,true));
  // Geographic cues are graphic strokes, not administrative boundaries.
  map.add(line([{lat:5.8,lng:-75.4},{lat:4.8,lng:-75.2},{lat:3.7,lng:-75.7},{lat:2.3,lng:-76}].map(p=>{const v=project(p);v.y=.025;return v;}),P.green));
  map.add(line([{lat:5.6,lng:-74.7},{lat:4.7,lng:-74.7},{lat:3.7,lng:-74.9},{lat:2.5,lng:-75.4}].map(p=>{const v=project(p);v.y=.026;return v;}),P.blue));
  const body=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),material(P.coffee));body.scale.set(.8,1.2,.65);traveller.add(body);
  traveller.add(line([new THREE.Vector3(0,-.15,.115),new THREE.Vector3(-.025,0,.13),new THREE.Vector3(0,.15,.115)],P.cream));
  let focus=new THREE.Vector3(),mapCenter=new THREE.Vector3(),distance=19;
  function rebuild(){
    empty(route);stops=(Array.isArray(opts.stops)&&opts.stops.length>=2?opts.stops:defaults).slice(0,12).map((p,i)=>({name:String(p.name||`Parada ${i+1}`),lat:clamp(finite(p.lat,4.142),-80,80),lng:clamp(finite(p.lng,-73.627),-180,180)}));
    const points=stops.map(project);paths=[];
    points.forEach((p,i)=>{
      const marker=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.14,12),material(i===2?P.orange:P.blue));marker.position.copy(p);marker.position.y=.09;route.add(marker);
      if(i===0)return;const a=points[i-1].clone(),b=p.clone();a.y=.3;b.y=.3;const mid=a.clone().lerp(b,.5);mid.y=.65;
      const curve=new THREE.CatmullRomCurve3([a,mid,b]);paths.push(curve);
      const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.032,5,false),material(P.orange));route.add(tube);
      // A cream dashed overlay suggests direction while remaining fully flat.
      const dashed=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),new THREE.LineDashedMaterial({color:P.cream,dashSize:.13,gapSize:.18}));dashed.position.y=.035;dashed.computeLineDistances();route.add(dashed);
    });
    const bounds=new THREE.Box3().setFromPoints([...outline,...points]);bounds.getCenter(mapCenter);const size=bounds.getSize(new THREE.Vector3());distance=Math.max(17,Math.max(size.x,size.z)*1.45);
    current=0;target=clamp(finite(opts.stage,0),0,stops.length-1);lastArrival=-1;focus.copy(mapCenter);
  }
  function pointAt(value){const i=Math.min(paths.length-1,Math.floor(value));return paths[i].getPointAt(clamp(value-i,0,1));}
  function announce(index){if(index===lastArrival)return;lastArrival=index;opts.onStop?.({index,stop:{...stops[index]}});}
  rebuild();
  rt.start(dt=>{
    const previous=current;
    if(lastArrival<0)announce(0);
    if(rt.reduced)current=target;else {const step=clamp(finite(opts.speed,.65),.05,4)*dt;current+=Math.sign(target-current)*Math.min(Math.abs(target-current),step);}
    if(current>previous){for(let i=Math.floor(previous)+1;i<=Math.floor(current);i++)announce(i);}
    else if(current<previous){for(let i=Math.ceil(previous)-1;i>=Math.ceil(current);i--)announce(i);}
    const p=pointAt(current);traveller.position.copy(p);traveller.position.y+=.19;
    const tangent=pointAt(Math.min(current+.01,stops.length-1)).sub(pointAt(Math.max(0,current-.01)));traveller.rotation.y=Math.atan2(tangent.x,tangent.z);traveller.rotation.z=.25;
    const desired=mapCenter.clone();if(opts.follow)desired.lerp(p,.25);
    if(rt.reduced||dt===0)focus.copy(desired);else focus.lerp(desired,1-Math.exp(-3*dt));
    const fit=distance*Math.max(1,.85/rt.camera.aspect);
    rt.camera.position.copy(focus).add(new THREE.Vector3(fit*.22,fit*.9,fit*.58));rt.camera.lookAt(focus);
    const near=Math.round(current);arrival.textContent=`${stops[near].name} · ${stops[near].lat.toFixed(4)}, ${stops[near].lng.toFixed(4)} · dato de muestra`;
    caption.textContent=`${Math.floor(current)+1}/${stops.length} · ruta ilustrada, no vial · dato de muestra`;
  });
  return {update(next={}){opts={...opts,...next};if('stops'in next)rebuild();target=clamp(finite(opts.stage,0),0,stops.length-1);rt.requestRender();},destroy(){rt.destroy();}};
}
