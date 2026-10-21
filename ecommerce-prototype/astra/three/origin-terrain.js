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

/** Procedural illustration, NOT an elevation model. onHover({altitude,x,z}) is in sample metres.
 * update({highlightFarm:true}) selects a physical accent ribbon (no glow).
 * Extra options: contourInterval (m), highlightFarm, onHover, onAltitudeHover(altitude, point).
 */
export function mount(container, options={}) {
  let opts={seed:17,farmAltitude:1750,minAlt:600,maxAlt:2500,lat:4.58,lng:-75.16,highlightFarm:true,contourInterval:200,...options};
  opts.colors={line:P.coffee,land:P.sprout,accent:P.orange,...options.colors};
  const rt=runtime(container,'Altimetría ilustrada. Terreno y altitudes de muestra. Arrastra para girar.');
  const relief=new THREE.Group(), contours=new THREE.Group(), selected=new THREE.Group(), pin=new THREE.Group();
  rt.scene.add(relief,contours,selected,pin);
  const caption=label(rt.root,'');
  const farmLabel=label(rt.root,'Finca · dato de muestra');farmLabel.style.top='auto';farmLabel.style.bottom='12px';
  let surface, field=[], min=600,max=2500,farm=1750,elapsed=0,azimuth=.7,elevation=.82,dragged=false;
  const N=36,SIZE=20, raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const height=a=>.25+(a-min)/(max-min)*5.2;
  function random(x,z,seed) {let h=Math.imul(x+seed,374761393)^Math.imul(z+11,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
  function noise(x,z,seed) {
    const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,a=u*u*(3-2*u),b=v*v*(3-2*v);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(random(ix,iz,seed),random(ix+1,iz,seed),a),THREE.MathUtils.lerp(random(ix,iz+1,seed),random(ix+1,iz+1,seed),a),b);
  }
  function sample(x,z,seed) {return .6*noise(x*.15+8,z*.15+8,seed)+.28*noise(x*.33+12,z*.33+12,seed+13)+.12*noise(x*.7+20,z*.7+20,seed+71);}
  const idx=(i,j)=>j*(N+1)+i;
  function segments(level) {
    const out=[];
    for(let j=0;j<N;j++)for(let i=0;i<N;i++) {
      const a=field[idx(i,j)],b=field[idx(i+1,j)],c=field[idx(i+1,j+1)],d=field[idx(i,j+1)];
      for(const tri of [[a,b,c],[a,c,d]]) {
        const hits=[];
        for(let k=0;k<3;k++) {const p=tri[k],q=tri[(k+1)%3];if((p.a<=level&&q.a>level)||(q.a<=level&&p.a>level)){const t=(level-p.a)/(q.a-p.a);hits.push(new THREE.Vector3(THREE.MathUtils.lerp(p.x,q.x,t),height(level)+.024,THREE.MathUtils.lerp(p.z,q.z,t)));}}
        if(hits.length===2)out.push(hits);
      }
    }return out;
  }
  function ribbon(segs,color) {
    const verts=[];
    for(const [a,b] of segs) {const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.00001)continue;
      const nx=-dz/len*.045,nz=dx/len*.045,y=a.y+.025;
      const A=[a.x+nx,y,a.z+nz],B=[a.x-nx,y,a.z-nz],C=[b.x+nx,y,b.z+nz],D=[b.x-nx,y,b.z-nz];verts.push(...A,...B,...C,...B,...D,...C);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));return new THREE.Mesh(g,material(color));
  }
  function rebuild() {
    [relief,contours,selected,pin].forEach(empty);
    min=finite(opts.minAlt,600);max=Math.max(min+100,finite(opts.maxAlt,2500));farm=clamp(finite(opts.farmAltitude,1750),min+1,max-1);
    const seed=Math.trunc(finite(opts.seed,17)),land=ink(opts.colors.land,P.sprout),accent=ink(opts.colors.accent,P.orange),baseLine=ink(opts.colors.line,P.coffee);
    field=[];const center=sample(0,0,seed),desired=(farm-min)/(max-min);
    for(let j=0;j<=N;j++)for(let i=0;i<=N;i++) {const x=(i/N-.5)*SIZE,z=(j/N-.5)*SIZE;
      const raw=sample(x,z,seed)+(desired-center)*Math.exp(-(x*x+z*z)/48);
      field.push({x,z,a:min+clamp(raw,0,1)*(max-min)});
    }
    const positions=[],colors=[],bands=[P.cream,land,P.green,P.coffee];
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const a=field[idx(i,j)],b=field[idx(i+1,j)],c=field[idx(i+1,j+1)],d=field[idx(i,j+1)];
      for(const tri of [[a,b,c],[a,c,d]]){
        const avg=tri.reduce((n,p)=>n+p.a,0)/3,col=new THREE.Color(bands[Math.min(3,Math.floor((avg-min)/(max-min)*4))]);
        for(const p of tri){positions.push(p.x,height(p.a),p.z);colors.push(col.r,col.g,col.b);}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    surface=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));relief.add(surface);
    const interval=Math.max((max-min)/60,finite(opts.contourInterval,200));
    const lineBands=[baseLine,P.green,P.blue,accent];
    for(let level=Math.ceil(min/interval)*interval;level<max;level+=interval){const points=segments(level).flat();if(!points.length)continue;
      const g=new THREE.BufferGeometry().setFromPoints(points),band=Math.min(3,Math.floor((level-min)/(max-min)*4));
      contours.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:lineBands[band]})));
    }
    selected.add(ribbon(segments(farm),accent));selected.visible=!!opts.highlightFarm;
    const y=height(farm),pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.6,6),material(baseLine));pole.position.set(0,y+.8,0);pin.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(.95,.55),material(accent));flag.position.set(.48,y+1.35,0);pin.add(flag);
    const dot=new THREE.Mesh(new THREE.OctahedronGeometry(.16),material(accent));dot.position.y=y+.15;pin.add(dot);
    caption.textContent=`Altimetría ilustrada · curvas cada ${Math.round(interval)} m`;
    farmLabel.textContent=`Finca ${Math.round(farm)} m s. n. m. · ${finite(opts.lat,4.58).toFixed(4)}, ${finite(opts.lng,-75.16).toFixed(4)} · dato de muestra`;
  }
  rebuild();
  dragging(rt,(dx,dy)=>{dragged=true;azimuth-=dx*.008;elevation=clamp(elevation+dy*.006,.26,1.36);});
  rt.on(rt.canvas,'pointermove',e=>{
    const box=rt.canvas.getBoundingClientRect();pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);
    rt.camera.updateMatrixWorld();surface.updateMatrixWorld();raycaster.setFromCamera(pointer,rt.camera);
    const hit=raycaster.intersectObject(surface,false)[0];
    if(hit){const altitude=Math.round(min+(hit.point.y-.25)/5.2*(max-min));const value={altitude,x:hit.point.x,z:hit.point.z};opts.onHover?.(value);opts.onAltitudeHover?.(altitude,value);}
    else opts.onHover?.(null);
  });
  rt.on(rt.canvas,'pointerleave',()=>opts.onHover?.(null));
  rt.start(dt=>{
    elapsed+=dt;const t=rt.reduced||dragged?1:clamp(elapsed/2.2,0,1),ease=t*t*(3-2*t);
    const radius=THREE.MathUtils.lerp(35,23,ease),elev=THREE.MathUtils.lerp(1.3,elevation,ease),targetY=height(farm)*.55;
    rt.camera.position.set(Math.sin(azimuth)*Math.cos(elev)*radius,targetY+Math.sin(elev)*radius,Math.cos(azimuth)*Math.cos(elev)*radius);
    rt.camera.lookAt(0,targetY,0);
  });
  return {update(next={}){opts={...opts,...next,colors:{...opts.colors,...next.colors}};const keys=Object.keys(next);if(keys.some(k=>!['onHover','onAltitudeHover','highlightFarm'].includes(k)))rebuild();else selected.visible=!!opts.highlightFarm;rt.requestRender();},destroy(){rt.destroy();}};
}
