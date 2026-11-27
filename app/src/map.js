/* ════════════════════════════════════════════════════════════════
   3D 행성 지도
   - 사용자 스케치(2번째 그림)의 배치를 그대로 3D 평면에 옮긴다
   - 제 1 행성은 1번째 그림의 구도: 푸른 잿빛 행성을 보랏빛 결정이 꿰뚫고, 남색 균열과 파편
   - 노란 항성이 실제 광원
   - 세로 화면에서는 지도를 90° 돌려 긴 축을 세로로 쓴다
   ════════════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BODIES } from "./bodies.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── GLSL: 3D 심플렉스 노이즈 (Ashima Arts / Stefan Gustavson, MIT) ── */
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
`;

/* ── 행성 표면 셰이더 (모드별 표면) ── */
const PLANET_VS = /* glsl */`
uniform float uTime; uniform int uMode; uniform float uSeed;
varying vec3 vObj; varying vec3 vN; varying vec3 vW;
${NOISE}
void main(){
  vec3 pos=position;
  if(uMode==3){                       // 아메바 행성: 표면이 천천히 꿈틀거린다
    float d=fbm(normalize(position)*1.6+vec3(uSeed)+vec3(0.,uTime*.04,0.));
    pos+=normal*d*.22;
  }
  vObj=position;
  vec4 w=modelMatrix*vec4(pos,1.0); vW=w.xyz;
  vN=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
const PLANET_FS = /* glsl */`
uniform float uTime; uniform int uMode; uniform float uSeed;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uSun; uniform vec3 uRim;
uniform vec3 uCutN; uniform float uCutD; uniform float uHalf;
varying vec3 vObj; varying vec3 vN; varying vec3 vW;
${NOISE}
void main(){
  vec3 p=normalize(vObj);
  vec3 n=normalize(vN);
  float cut=0.;
  if(uHalf!=0.){                      // 제 1 행성: 결정이 박히며 잘린 구. 물결진 자른 면의 한쪽만 남긴다
    cut=dot(p,uCutN)-uCutD+snoise(p*3.3+uSeed)*.035;
    if(cut*uHalf<0.) discard;
    if(!gl_FrontFacing){              // 잘린 틈으로 보이는 안쪽 = 남색 단면
      float k=.72+.28*clamp(dot(p,uCutN)*uHalf,0.,1.);
      gl_FragColor=vec4(uC3*k+vec3(.32,.2,.6)*smoothstep(.09,.0,abs(cut))*.35,1.); return;
    }
  }
  if(uMode==3){                       // 꿈틀거리는 표면의 법선 근사
    float e=.02; vec3 q=p*1.6+vec3(uSeed)+vec3(0.,uTime*.04,0.);
    float f0=fbm(q); float fx=fbm(q+vec3(e,0,0)); float fy=fbm(q+vec3(0,e,0)); float fz=fbm(q+vec3(0,0,e));
    n=normalize(n-vec3(fx-f0,fy-f0,fz-f0)/e*.18);
  }
  vec3 L=normalize(uSun-vW); vec3 V=normalize(cameraPosition-vW);
  vec3 col=uC1; vec3 emis=vec3(0.);
  if(uMode==0){                       // 하늘빛 줄무늬 + 소용돌이 눈
    vec3 ax=normalize(vec3(.55,1.,.25));
    float turb=fbm(p*2.4+uSeed);
    float band=sin(dot(p,ax)*14.+turb*1.0);
    float bands=pow(max(0.,band*.5+.5),2.4);                   // 띠를 날카롭게 (cosmic-orb 방식)
    float lane=fbm(p*5.+vec3(uSeed*1.7));
    col=mix(uC1,uC2,bands);
    col=mix(col,uC1*.62,smoothstep(.15,.55,lane)*.3);           // 띠 사이의 옅은 먼지 결
    vec3 eye=normalize(vec3(.3,.15,.94)); vec3 e1=normalize(cross(eye,vec3(0.,1.,0.))); vec3 e2=cross(eye,e1);
    vec2 q=vec2(dot(p,e1),dot(p,e2)); float r=length(q); float a=atan(q.y,q.x);
    float spiral=.5+.5*sin(a*2.+r*30.-uTime*.5);
    float mask=smoothstep(.3,.08,r)*step(0.,dot(p,eye));
    col=mix(col,uC3,mask*(.35+.65*spiral));
    col=mix(col,uC2*1.15,smoothstep(.045,.0,r)*step(0.,dot(p,eye)));   // 눈동자
  } else if(uMode==1){                // 제 1 행성: 푸른 잿빛 바위 + 남색 균열
    float f=fbm(p*2.2+uSeed);                                   // 그림처럼 거의 단색, 아주 옅은 결만
    col=uC1*(.95+.08*f);
    emis+=vec3(.55,.36,.95)*smoothstep(.07,.0,abs(cut))*.45;     // 결정이 박힌 자른 면 가장자리의 보랏빛
  } else if(uMode==2){                // 노란 항성: 끓는 표면
    float mu=max(dot(n,V),0.);
    float big=fbm(p*3.+vec3(0.,uTime*.05,uTime*.03)+uSeed);
    float gran=snoise(p*22.+vec3(0.,uTime*.12,0.));               // 잘고 낮은 대비 (덩어리지지 않게)
    float limb=pow(mu,.9);
    col=mix(uC1*.85,mix(uC2,uC3,limb*limb),limb);                // 가장자리 주황 → 가운데 흰빛
    col*=.86+.14*big+.08*gran;
    gl_FragColor=vec4(col*.88,1.); return;
  } else if(uMode==3){                // 청록 아메바 + 초록 균열
    float f=fbm(p*2.4+uSeed);
    col=mix(uC1,uC2,smoothstep(-.4,.6,f));
    float c=abs(snoise(p*4.2+uSeed*3.));
    col=mix(col,uC3,smoothstep(.05,.0,c)*.9);
  } else if(uMode==4){                // 단색 바위 (위성·파편·남색 행성)
    float f=fbm(p*3.+uSeed);
    col=mix(uC1*.8,uC2,smoothstep(-.5,.6,f));
  } else if(uMode==5){                // 붉은 고리 행성 + 붉게 그어진 상처
    float f=fbm(p*2.8+uSeed);
    col=mix(uC1,uC2,smoothstep(-.4,.6,f));
    float s1=abs(dot(p,normalize(vec3(1.,.9,.35))));
    float s2=abs(dot(p,normalize(vec3(-1.,.85,.4))));
    float scar=max(smoothstep(.035,.0,s1),smoothstep(.035,.0,s2));
    col=mix(col,uC3,scar); emis+=uC3*scar*.9;
  }
  float diff=clamp((dot(n,L)+.18)/1.18,0.,1.);
  diff=smoothstep(0.,1.,diff);
  float rim=pow(1.-max(dot(n,V),0.),3.2);
  float amb=uMode==1?.34:.07;                                    // 제 1 행성은 그림처럼 고르게 밝게, 입체감은 남긴다
  vec3 lit=col*(amb+diff*(1.05-amb))+uRim*rim*(.25+.75*diff)+emis;
  gl_FragColor=vec4(lit,1.);
}`;

/* 대기광: 뒷면 구에 테두리만 빛나게 */
const ATMO_VS = /* glsl */`varying vec3 vN; varying vec3 vW;
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const ATMO_FS = /* glsl */`uniform vec3 uColor; uniform float uPow; uniform float uStr; varying vec3 vN; varying vec3 vW;
void main(){vec3 V=normalize(cameraPosition-vW);float i=pow(clamp(.72-dot(vN,V)*-1.,0.,1.),uPow)*uStr;gl_FragColor=vec4(uColor*i,i);}`;

/* 결정: 면이 꺾이는 보석, 가장자리가 빛나고 가운데에 빛 심지 */
const CRYSTAL_VS = /* glsl */`varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){vL=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const CRYSTAL_FS = /* glsl */`uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uSun; uniform float uTime; uniform float uLen; uniform vec2 uJ;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
void main(){
  vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW); vec3 L=normalize(uSun-vW);
  float fres=pow(1.-abs(dot(n,V)),2.2);
  float core=1.-clamp(length(vL.xy-uJ)/uLen,0.,1.);
  float flow=.5+.5*snoise(vec3(vL.y*1.6-uTime*.35,vL.x*3.,vL.z*3.));
  vec3 col=mix(uC1,uC2,clamp(core*.5+fres*.55+flow*.2,0.,1.));
  float diff=max(dot(n,L),0.);
  float spec=pow(max(dot(reflect(-L,n),V),0.),60.)*.55;            // 작고 약한 반사광 (얼룩처럼 보이지 않게)
  float veins=smoothstep(.72,.97,snoise(vec3(vL.y*1.2-uTime*.3,vL.x*2.5,vL.z*2.5)));   // 길쭉한 빛줄기 (점처럼 흩어지지 않게)
  float edge=pow(1.-abs(dot(n,V)),6.);                            // 실루엣 모서리의 가는 빛
  vec3 c=col*(.28+.62*diff)+vec3(1.,.95,1.)*spec+uC2*fres*.7+uC2*core*core*.45+vec3(1.,.9,1.)*veins*core*.15+vec3(.95,.85,1.)*edge*1.1;
  gl_FragColor=vec4(c,1.);
}`;

/* 고리 */
const RING_VS = /* glsl */`varying vec2 vUv; varying vec3 vP; void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const RING_FS = /* glsl */`uniform vec3 uC1; uniform vec3 uC2; uniform float uIn; uniform float uOut; uniform float uTime; uniform int uKind; uniform float uArc;
varying vec2 vUv; varying vec3 vP;
${NOISE}
void main(){
  float r=length(vP.xy); float t=(r-uIn)/(uOut-uIn);
  if(uKind==0){                                     // 행성 고리: 결이 있는 띠
    float n1=snoise(vec3(t*12.,1.3,0.))*.5+.5;
    float n2=snoise(vec3(t*34.,7.1,0.))*.5+.5;
    float dens=mix(.3,1.,n1)*(.8+.2*n2);
    dens*=1.-.92*smoothstep(.035,.0,abs(t-.63)-.012);             // 고리 사이의 틈
    float a=smoothstep(0.,.06,t)*smoothstep(1.,.88,t)*dens;
    gl_FragColor=vec4(mix(uC1,uC2,n1)*1.05,a*.62);
  } else {                                          // 강착원반: 안쪽이 뜨겁고 소용돌이친다
    float ang=atan(vP.y,vP.x);
    float sw=snoise(vec3(cos(ang)*2.,sin(ang)*2.,t*4.-uTime*.6)+vec3(t*6.,0.,0.));
    float heat=pow(1.-t,2.2);
    vec3 c=mix(uC2,uC1,heat)+vec3(1.,.95,.85)*pow(1.-t,10.)*.8;
    float a=smoothstep(0.,.04,t)*smoothstep(1.,.55,t)*(.6+.3*sw)*.8;
    float dop=.55+.9*(.5+.5*cos(ang+.6));                          // 다가오는 쪽이 더 밝다
    if(uArc>.5){ a*=smoothstep(0.,.6,sin(ang)); dop=1.; }           // 휘어진 빛의 호: 양 끝이 서서히 사라진다
    gl_FragColor=vec4(c*(.7+.35*sw)*dop,a);
  }
}`;

/* 별 */
const STAR_VS = /* glsl */`attribute float aSize; attribute float aPh; uniform float uTime; uniform float uPR; varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vA=.45+.55*sin(uTime*(.6+aPh*.4)+aPh*6.28);gl_PointSize=aSize*uPR;gl_Position=projectionMatrix*mv;}`;
const STAR_FS = /* glsl */`varying float vA; void main(){vec2 c=gl_PointCoord-.5;float d=length(c);float a=smoothstep(.5,.0,d);gl_FragColor=vec4(vec3(.92,.95,1.)*a*vA,a*vA);}`;

/* 혜성 꼬리 입자 */
const TAIL_VS = /* glsl */`attribute float aT; attribute vec3 aOff; uniform float uTime; uniform float uLen; uniform vec3 uDir; uniform float uPR; uniform float uSpeed;
varying float vA;
void main(){
  float t=fract(aT+uTime*uSpeed);
  vec3 side=aOff*(.05+t*t*1.4);
  vec3 p=position+uDir*t*uLen+side;
  vA=pow(1.-t,1.6);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_PointSize=mix(14.,2.,t)*uPR*(6./-mv.z);
  gl_Position=projectionMatrix*mv;
}`;
const TAIL_FS = /* glsl */`uniform vec3 uColor; varying float vA;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;gl_FragColor=vec4(mix(uColor,vec3(1.),a*.4)*a,a);}`;

/* 글리치: 가로 띠가 밀리고 색이 갈라진다. 화면 전체가 밝게 번쩍이지 않도록 밝기는 건드리지 않는다 */
const GlitchShader = {
  uniforms: { tDiffuse: { value: null }, uAmt: { value: 0 }, uSeed: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: /* glsl */`uniform sampler2D tDiffuse; uniform float uAmt; uniform float uSeed; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec2 uv=vUv;
    float rows=mix(18.,60.,h(vec2(uSeed,1.)));
    float row=floor(uv.y*rows);
    float r=h(vec2(row,uSeed));
    float shift=step(.58,r)*(h(vec2(row,uSeed+3.))-.5)*.22*uAmt;
    vec2 cell=floor(vUv*vec2(12.,8.));                                   // 12×8 격자 조각이 따로 밀린다 (HyperFrames glitch 참고)
    float ca=step(.83,h(cell+vec2(uSeed)))*uAmt;
    vec2 bd=(vec2(h(cell*2.1+uSeed),h(cell*3.7+uSeed))-.5)*.2*ca;
    uv=clamp(uv+vec2(shift,0.)+bd,0.,1.);
    float sp=.012*uAmt*(.5+r);
    vec4 c=texture2D(tDiffuse,uv);
    c.r=texture2D(tDiffuse,uv+vec2(sp,0.)).r;
    c.b=texture2D(tDiffuse,uv-vec2(sp,0.)).b;
    float scan=.92+.08*sin(vUv.y*900.);
    float levels=mix(256.,10.,uAmt*.6);                                  // 색 단계를 줄인다 (밝기는 내려가기만 한다)
    c.rgb=floor(c.rgb*levels)/levels;
    gl_FragColor=vec4(c.rgb*mix(1.,scan,uAmt),1.);
  }`
};

/* ── 작은 도구 ── */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const col = h => new THREE.Color(h);
function glowTexture(inner, outer) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(0.25, outer); r.addColorStop(1, outer.replace(/[\d.]+\)$/, "0)"));
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowSprite(inner, outer, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(inner, outer), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size); return s;
}
function shardGeometry(len, rad, sides, seed) {
  /* 길쭉한 두 뿔 결정. 면마다 법선이 꺾이도록 non-indexed */
  const g = new THREE.ConeGeometry(rad, len, sides, 1, true).toNonIndexed();
  const g2 = new THREE.ConeGeometry(rad, len * 0.35, sides, 1, true).toNonIndexed();
  g2.rotateX(Math.PI); g2.translate(0, -len * 0.675, 0);
  const pos = [...g.attributes.position.array, ...g2.attributes.position.array];
  const out = new THREE.BufferGeometry();
  const arr = new Float32Array(pos);
  let s = seed;
  for (let i = 0; i < arr.length; i += 3) {             // 결정 면을 조금씩 비튼다
    s = (s * 9301 + 49297) % 233280; const j = s / 233280;
    if (Math.abs(arr[i + 1]) < len * 0.49) { arr[i] *= 0.85 + j * 0.3; arr[i + 2] *= 0.85 + (1 - j) * 0.3; }
  }
  out.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  out.computeVertexNormals();
  return out;
}

/* ════════════════════════════════════════════════ */
export function createMap(container, hooks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  const root = new THREE.Group(); scene.add(root);
  const T = { value: 0 };                                // 모든 셰이더가 같이 쓰는 시간
  const SUN = new THREE.Vector3();                       // 노란 항성 = 광원 (월드 좌표)

  /* 배경 */
  /* 성운은 처음 한 번만 그림으로 굽고, 매 프레임에는 그 그림만 읽는다 (화면 전체 노이즈 계산을 없앤다) */
  const skyTex = (() => {
    const W = 1024, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#0e0f14"; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const blob = (u, v, r, rgb, a) => { for (const du of [-1, 0, 1]) {            // 가로로 이어 붙여 이음매가 없게
      const x = (u + du) * W, y = v * H, rg = g.createRadialGradient(x, y, 0, x, y, r * W);
      rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = rg; g.fillRect(0, 0, W, H); } };
    for (let i = 0; i < 26; i++) blob(0.82 + rnd() * 0.36, 0.25 + rnd() * 0.5, 0.04 + rnd() * 0.12, "76,201,255", 0.05 + rnd() * 0.08);   // 왼쪽: 하늘색
    for (let i = 0; i < 22; i++) blob(0.36 + rnd() * 0.3, 0.25 + rnd() * 0.5, 0.04 + rnd() * 0.11, "255,216,74", 0.035 + rnd() * 0.06);  // 오른쪽: 노랑
    for (let i = 0; i < 14; i++) blob(rnd(), 0.3 + rnd() * 0.4, 0.06 + rnd() * 0.12, "90,100,130", 0.05 + rnd() * 0.06);
    const t2 = document.createElement("canvas"); t2.width = W; t2.height = H;
    const g2 = t2.getContext("2d"); g2.filter = "blur(10px)"; g2.drawImage(c, 0, 0);
    const t = new THREE.CanvasTexture(t2); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
  })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uTex: { value: skyTex } },
    vertexShader: `varying vec3 vW; void main(){vW=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D uTex; varying vec3 vW;
      void main(){vec3 d=normalize(vW);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.1415927+.5);gl_FragColor=texture2D(uTex,uv);}`
  }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry(); {
    const N = 2400, p = new Float32Array(N * 3), s = new Float32Array(N), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {                        // 구면 위에 고르게 (뭉치지 않게)
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 120;
      const k = Math.sqrt(1 - u * u);
      p.set([Math.cos(a) * k * r, u * r, Math.sin(a) * k * r], i * 3);
      s[i] = 1 + Math.pow(Math.random(), 6) * 3.2; ph[i] = Math.random();
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(s, 1));
    starGeo.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  }
  const starMat = new THREE.ShaderMaterial({ uniforms: { uTime: T, uPR: { value: 1 } }, vertexShader: STAR_VS, fragmentShader: STAR_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(starGeo, starMat));

  /* 지도 바깥 경계: 스케치의 올리브색 끊긴 선 */
  {
    const curve = new THREE.EllipseCurve(0, 0.6, 10.9, 6.6, 0, Math.PI * 2);
    const pts = curve.getPoints(220).map(p => v3(p.x, -0.4, p.y));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0x9a915a, dashSize: 2.6, gapSize: 1.5, transparent: true, opacity: 0.55 }));
    line.computeLineDistances(); root.add(line);
  }

  /* ── 천체 만들기 ── */
  const pickables = [];                                  // 선택 판정용 (보이지 않는 넉넉한 구)
  const items = {};                                      // id → { body, group, pick, radius }
  const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  function planetMaterial(mode, c1, c2, c3, rim, seed) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: T, uMode: { value: mode }, uSeed: { value: seed || 0 }, uC1: { value: col(c1) }, uC2: { value: col(c2) },
        uC3: { value: col(c3) }, uRim: { value: col(rim) }, uSun: { value: SUN },
        uCutN: { value: new THREE.Vector3(0, 1, 0) }, uCutD: { value: 0 }, uHalf: { value: 0 } },   // 셰이더를 함께 쓰므로 모두 명시
      vertexShader: PLANET_VS, fragmentShader: PLANET_FS
    });
  }
  function atmosphere(radius, color, pow, str) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 20), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col(color) }, uPow: { value: pow || 3 }, uStr: { value: str || 1.2 } },
      vertexShader: ATMO_VS, fragmentShader: ATMO_FS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
  }
  function crystalMaterial(c1, c2, len) {
    return new THREE.ShaderMaterial({ uniforms: { uC1: { value: col(c1) }, uC2: { value: col(c2) }, uSun: { value: SUN }, uTime: T, uLen: { value: len }, uJ: { value: new THREE.Vector2(0, 0) } },
      vertexShader: CRYSTAL_VS, fragmentShader: CRYSTAL_FS });
  }
  function register(body, group, radius, pickRadius) {
    const pick = new THREE.Mesh(new THREE.SphereGeometry(pickRadius || Math.max(radius * 1.25, 0.6), 12, 8), pickMat);
    pick.userData.id = body.id; group.add(pick); pickables.push(pick);
    items[body.id] = { body, group, pick, radius };
  }
  const spin = [];                                       // 매 프레임 돌릴 것들
  const tick = [];                                       // 매 프레임 호출할 함수
  let moonOrbit = null, tails = [];

  for (const b of BODIES) {
    const g = new THREE.Group(); g.position.copy(b.pos); root.add(g);
    const r = b.radius;
    switch (b.look) {
      case "planet1": {
        /* 1번째 그림을 픽셀로 측정해 옮긴 구도 (단위: 행성 반지름)
           - 구가 비스듬한 물결 면으로 잘려, 위 조각이 왼쪽 위로 어긋나 있다 (-0.15, +0.25)
           - 어긋난 틈으로 남색 단면이 보인다. 자른 면은 오른쪽으로 갈수록 올라간다
           - 가지가 셋인 보랏빛 결정 하나가 틈 앞에 박혀 있고, 아랫가장자리가 녹아 흘러내린다
           - 둥근 파편 5개 */
        const face = new THREE.Group(); face.rotation.x = -0.89; g.add(face);      // 지도 카메라 쪽을 정면으로
        const N = new THREE.Vector3(-0.2, 0.75, 0.63).normalize(), D = 0.04;
        /* 잘린 면 위의 두 축: U = 오른쪽, W = 면을 따라 안쪽(위로) */
        const U = new THREE.Vector3(1, 0, 0).addScaledVector(N, -N.x).normalize();
        const W = new THREE.Vector3().crossVectors(N, U).normalize();
        const halfMat = half => { const m = planetMaterial(1, "#7480be", "#8f9ad0", "#192462", "#9aa8ff", 3.1);
          m.side = THREE.DoubleSide; m.uniforms.uCutN.value = N; m.uniforms.uCutD.value = D; m.uniforms.uHalf.value = half; return m; };
        const sphereGeo = new THREE.SphereGeometry(r, 96, 64);
        const bottom = new THREE.Mesh(sphereGeo, halfMat(-1)); face.add(bottom);
        const top = new THREE.Mesh(sphereGeo, halfMat(1)); top.position.copy(N).multiplyScalar(0.2 * r).addScaledVector(W, 0.5 * r).addScaledVector(U, -0.15 * r); face.add(top);   // 결정 두께만큼 들리고, 잘린 면을 따라 뒤쪽 위 · 왼쪽으로 미끄러진 위 조각
        const at = atmosphere(r * 1.1, "#8e9cff", 4.2, 0.7); at.position.set(-0.07 * r, 0.12 * r, 0); face.add(at);
        /* 잘린 단면: 속이 빈 그릇이 아니라 평평한 남색 면으로 덮는다 (구와 평면이 만나는 원) */
        const capR = Math.sqrt(1 - D * D) * r * 0.985;
        const capMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
          uniforms: { uC: { value: col("#192462") }, uSeed: { value: 3.1 }, uTime: T },
          vertexShader: `varying vec2 vP; void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform vec3 uC; uniform float uSeed; varying vec2 vP; ${NOISE}
            void main(){float r=length(vP)/${(Math.sqrt(1 - D * D) * r * 0.985).toFixed(4)};
              float grain=snoise(vec3(vP*3.,uSeed))*.5+.5;
              vec3 c=uC*(.78+.3*r)+uC*grain*.12+vec3(.45,.3,.8)*smoothstep(.82,1.,r)*.4;
              gl_FragColor=vec4(c,1.);}` });
        const capFor = (sign, offset) => {
          const cap = new THREE.Mesh(new THREE.CircleGeometry(capR, 96), capMat);
          cap.lookAt(N.clone().multiplyScalar(sign));                     // 원판의 앞면이 바깥(잘린 쪽)을 본다
          cap.position.copy(N).multiplyScalar(D * r).add(offset);
          face.add(cap);
        };
        /* 뚜껑은 물결진 가장자리와 어긋나 테두리가 생기므로 쓰지 않는다 (안쪽 면이 남색 단면 역할) */
        /* 결정: 측정한 윤곽(행성 반지름 단위)을 두께와 둥근 모서리가 있는 입체로 */
        const P = [[-1.63,-0.49],[-0.90,-0.32],[-0.75,-0.24],[-0.62,-0.17],[-0.53,-0.19],[-0.49,-0.03],[-0.31,0.09],[-0.18,0.05],[-0.02,0.08],[0.16,0.03],[0.32,0.12],[0.46,0.15],[0.63,0.09],[0.81,0.08],[1.65,0.54],[0.04,0.30],[-0.93,1.23],[-0.58,0.15]];
        const shape = new THREE.Shape();
        shape.moveTo(P[0][0] * r, P[0][1] * r);
        for (let k = 1; k < P.length; k++) {
          const [x0, y0] = P[k - 1], [x1, y1] = P[k];
          /* 긴 변은 살짝 오목하게 휘어 날 선 결정처럼, 짧은 변(흘러내린 자국)은 둥글게 */
          const len = Math.hypot(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          const bend = len > 0.5 ? -0.06 : 0.025;
          shape.quadraticCurveTo((mx - (y1 - y0) / len * bend) * r, (my + (x1 - x0) / len * bend) * r, x1 * r, y1 * r);
        }
        const depth = 0.24 * r;                                           // 가운데는 덩어리, 끝은 칼날처럼 (아래에서 끝으로 갈수록 얇게)
        const cg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.09 * r, bevelSize: 0.05 * r, bevelSegments: 5, curveSegments: 10 });
        cg.translate(0, 0, -depth / 2);
        { const pa = cg.attributes.position, J = new THREE.Vector2(-0.2 * r, 0.16 * r);   // 가운데는 두껍고 날 끝으로 갈수록 얇게
          for (let k = 0; k < pa.count; k++) {
            const d = Math.hypot(pa.getX(k) - J.x, pa.getY(k) - J.y) / (1.75 * r);
            pa.setZ(k, pa.getZ(k) * Math.max(0.18, 1 - d * d * 0.9));
          } }
        cg.scale(1, 1 / W.y, 1);                                          // 기울어진 면에 눕혀도 정면에서 그림 속 모양으로 보이게
        /* 위쪽 뿔은 잘린 면에서 꺾여 앞(카메라 쪽) 위로 솟는다 — 그림에서 뿔이 위 조각 앞을 가로지르므로 */
        { const pa = cg.attributes.position, y0 = 0.2 * r / W.y, ang = 1.05, cs = Math.cos(ang), sn = Math.sin(ang);
          for (let k = 0; k < pa.count; k++) {
            const y = pa.getY(k), x = pa.getX(k); if (y <= y0) continue;
            const wx = Math.min(1, Math.max(0, (0.12 * r - x) / (0.2 * r)));  // 뿔(왼쪽)만 접는다. 오른쪽 날은 그대로
            const t = Math.min(1, (y - y0) / (0.15 * r)) * wx, a = ang * t; // 접히는 선 근처는 부드럽게 휜다
            const dy = y - y0, z = pa.getZ(k);
            pa.setY(k, y0 + dy * Math.cos(a) - z * Math.sin(a)); pa.setZ(k, z * Math.cos(a) + dy * Math.sin(a));
          }
          cg.computeVertexNormals(); }
        const cm = crystalMaterial("#7038c8", "#b88cf2", 1.25 * r);   // 그림의 #8d52d4 쪽으로 채도를 살린다
        cm.uniforms.uJ.value.set(-0.2 * r, 0.16 * r / W.y);                   // 가지가 만나는 곳이 가장 밝다 (그림의 연보라 결)
        const crystal = new THREE.Mesh(cg, cm);
        crystal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(U, W, N));   // 잘린 면 안에 눕힌다
        crystal.position.copy(N).multiplyScalar((D + 0.09) * r).addScaledVector(W, -0.8 * r);   // 두 조각 사이에 끼워져 앞쪽으로 튀어나온다
        face.add(crystal);

        /* 둥근 파편 (측정 위치·크기) */
        const rockMat = planetMaterial(4, "#7480be", "#8f9ad0", "#000000", "#9aa8ff", 1.3);
        [[1.18,-0.03,0.08,0.35],[-0.83,-0.61,0.065,0.4],[-1.28,0.05,0.05,0.3],[-1.03,-0.57,0.03,0.45],[0.91,0.77,0.028,0.25]].forEach(([x, y, sz, z], i) => {
          const geo = new THREE.IcosahedronGeometry(sz * r * 1.4, 2), pa = geo.attributes.position, v = new THREE.Vector3();
          for (let k = 0; k < pa.count; k++) {                            // 조약돌처럼 둥글게 일그러뜨린다
            v.fromBufferAttribute(pa, k); const w = 1 + 0.22 * Math.sin(v.x * 9 + i) * Math.cos(v.y * 7 - i) + 0.12 * Math.sin(v.z * 11);
            v.multiplyScalar(w); v.y *= 0.8; pa.setXYZ(k, v.x, v.y, v.z);
          }
          geo.computeVertexNormals();
          const m = new THREE.Mesh(geo, rockMat); m.position.set(x * r, y * r, z * r); face.add(m);
          const sp = 0.15 + Math.random() * 0.3, base = m.position.clone(), ax = v3(Math.random(), Math.random(), Math.random()).normalize();
          tick.push(t => { m.rotateOnAxis(ax, 0.01 * sp); m.position.y = base.y + Math.sin(t * sp + i) * 0.03 * r; });
        });
        /* 노란 궤도 (2번째 그림) — 위성은 'moon'에서 이 궤도 위에 올린다 */
        const orbit = new THREE.Group(); orbit.rotation.set(0.32, 0.4, -0.18); g.add(orbit);
        const oc = new THREE.EllipseCurve(0, 0, r * 2.55, r * 1.75, 0, Math.PI * 2);
        orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(oc.getPoints(160).map(p => v3(p.x, 0, p.y))),
          new THREE.LineBasicMaterial({ color: 0xe0d25e, transparent: true, opacity: 0.75 })));
        moonOrbit = { orbit, curve: oc };
        break;
      }
      case "moon": {
        root.remove(g); moonOrbit.orbit.add(g); g.position.set(0, 0, 0);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), planetMaterial(4, "#8fd3f0", "#c9ecff", "#000000", "#bfe9ff", 8.2)));
        g.add(atmosphere(r * 1.25, "#9fe0ff", 3, 1.1));
        const curve = moonOrbit.curve;
        tick.push(t => { const p = curve.getPoint(((t * 0.018) + 0.18) % 1); g.position.set(p.x, 0, p.y); });
        break;
      }
      case "striped": {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), planetMaterial(0, "#2f7fb8", "#a6dcf5", "#123a63", "#9fe0ff", 5.5));
        m.rotation.z = 0.35; g.add(m); spin.push([m, 0.05]);
        g.add(atmosphere(r * 1.14, "#86d4ff", 3, 1.25));
        break;
      }
      case "ringed": {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), planetMaterial(5, "#6e1f1c", "#a8423a", "#ff3b3b", "#ff6a5a", 2.2));
        g.add(m); spin.push([m, 0.04]);
        g.add(atmosphere(r * 1.12, "#ff5a4a", 3.2, 1.1));
        const inR = r * 1.35, outR = r * 2.35;
        const ring = new THREE.Mesh(new THREE.RingGeometry(inR, outR, 120, 1), new THREE.ShaderMaterial({
          uniforms: { uC1: { value: col("#b8453c") }, uC2: { value: col("#e6a19a") }, uIn: { value: inR }, uOut: { value: outR }, uTime: T, uKind: { value: 0 }, uArc: { value: 0 } },
          vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
        ring.rotation.set(-Math.PI / 2 + 0.35, 0.25, 0); g.add(ring);
        break;
      }
      case "sun": {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), planetMaterial(2, "#e8640f", "#ffb52e", "#ffe08a", "#000000", 4.4));
        g.add(m); spin.push([m, 0.02]);
        g.add(glowSprite("rgba(255,236,160,.75)", "rgba(255,200,70,.22)", r * 4.2));
        g.add(glowSprite("rgba(255,240,200,.25)", "rgba(255,216,74,.05)", r * 8));
        break;
      }
      case "constellation": {
        const nodes = [v3(-1.2, 0.2, -0.9), v3(1.1, 0.35, -1.35), v3(1.0, 0.1, 0.45), v3(-1.55, -0.1, 0.65), v3(0, 0.15, -0.2)];
        const lineIdx = [[0, 1], [1, 2], [0, 3], [0, 4], [4, 2]];
        const pts = []; lineIdx.forEach(([a, c]) => pts.push(nodes[a], nodes[c]));
        g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x6fc8ff, transparent: true, opacity: 0.65 })));
        nodes.forEach((n, i) => {
          const s = glowSprite("rgba(230,245,255,1)", "rgba(90,190,255,.45)", i === 4 ? 0.9 : 0.55);
          s.position.copy(n); g.add(s);
          tick.push(t => { s.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.7 + i * 1.3); });
        });
        const navy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 40), planetMaterial(4, "#2a2f7c", "#4a50b0", "#000000", "#6f7cff", 6.6));
        navy.position.set(0, -0.2, 1.3); g.add(navy); spin.push([navy, 0.06]);
        const at = atmosphere(0.62, "#6f7cff", 3, 1.0); at.position.copy(navy.position); g.add(at);
        break;
      }
      case "crystal": {
        const cm = crystalMaterial("#1f2470", "#6a78ff", r * 1.4);
        const main = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), cm); main.scale.set(0.62, 1.55, 0.62); g.add(main);
        spin.push([main, 0.12]);
        /* 붉은 균열: 늘 앞쪽에서 보이도록 카메라 쪽을 본다 */
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.045, r * 1.05), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
        g.add(crack);
        const cg = glowSprite("rgba(255,120,110,.9)", "rgba(255,40,40,.35)", r * 1.4); g.add(cg);
        tick.push(t => { cg.material.opacity = 0.6 + 0.4 * Math.sin(t * 2.1); crack.lookAt(camera.position); crack.rotateZ(0.45); });
        [-1, 1].forEach(sd => {
          const s = new THREE.Mesh(new THREE.OctahedronGeometry(r * 0.3, 0), cm); s.scale.set(0.6, 1.5, 0.6);
          s.position.set(sd * r * 1.25, 0.1, 0); g.add(s); spin.push([s, -0.25 * sd]);
          tick.push(t => { s.position.y = 0.1 + Math.sin(t * 0.8 + sd) * 0.12; });
        });
        g.add(glowSprite("rgba(140,150,255,.35)", "rgba(70,80,220,.1)", r * 2.6));
        break;
      }
      case "amoeba": {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 5), planetMaterial(3, "#2f9f95", "#64d2c2", "#1d5a2c", "#7ff0dc", 9.1));
        g.add(m); spin.push([m, 0.05]);
        g.add(atmosphere(r * 1.25, "#5ff0d6", 3, 1.0));
        break;
      }
      case "blackhole": {
        g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
        const inR = r * 1.35, outR = r * 3.0;
        const disk = new THREE.Mesh(new THREE.RingGeometry(inR, outR, 120, 1), new THREE.ShaderMaterial({
          uniforms: { uC1: { value: col("#fff0b0") }, uC2: { value: col("#8a7a2a") }, uIn: { value: inR }, uOut: { value: outR }, uTime: T, uKind: { value: 1 }, uArc: { value: 0 } },
          vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        disk.rotation.set(-Math.PI / 2 + 0.28, 0.3, 0.2); g.add(disk);
        /* 광자 고리: 늘 카메라를 보는 가는 빛 고리 (휘어진 빛을 흉내) */
        const halo = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.075, 128, 1), new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        /* 원반 뒷면이 중력에 휘어 블랙홀 위로 넘어와 보이는 빛의 호 */
        const lens = new THREE.Mesh(new THREE.RingGeometry(r * 1.12, r * 2.1, 128, 1, 0, Math.PI), new THREE.ShaderMaterial({
          uniforms: { uC1: { value: col("#fff0b0") }, uC2: { value: col("#8a7a2a") }, uIn: { value: r * 1.12 }, uOut: { value: r * 2.1 }, uTime: T, uKind: { value: 1 }, uArc: { value: 1 } },
          vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        const bill = new THREE.Group(); bill.add(halo, lens); g.add(bill);
        tick.push(() => bill.lookAt(camera.position));
        break;
      }
      case "comet": {
        const dir = b.tail.clone().normalize();
        const head = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: col(b.color).multiplyScalar(1.4) }));
        g.add(head);
        g.add(glowSprite("rgba(255,255,255,.95)", b.glow, r * 4.5));
        g.add(glowSprite(b.glow.replace(/[\d.]+\)$/, ".3)"), b.glow.replace(/[\d.]+\)$/, ".06)"), r * 11));
        const N = 700, pos = new Float32Array(N * 3), at = new Float32Array(N), off = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          at[i] = Math.random();
          const o = v3(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5);
          o.sub(dir.clone().multiplyScalar(o.dot(dir)));      // 꼬리 방향과 수직으로만 퍼진다
          off.set([o.x, o.y, o.z], i * 3);
        }
        const tg = new THREE.BufferGeometry();
        tg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        tg.setAttribute("aT", new THREE.BufferAttribute(at, 1));
        tg.setAttribute("aOff", new THREE.BufferAttribute(off, 3));
        const tm = new THREE.ShaderMaterial({ uniforms: { uTime: T, uLen: { value: b.tail.length() }, uDir: { value: dir }, uPR: { value: 1 }, uSpeed: { value: REDUCED ? 0.03 : 0.09 }, uColor: { value: col(b.color) } },
          vertexShader: TAIL_VS, fragmentShader: TAIL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const pts = new THREE.Points(tg, tm); pts.frustumCulled = false; g.add(pts);
        tails.push(tm);
        /* 스케치처럼 길게 뻗는 가는 선 몇 가닥 */
        for (let k = 0; k < 5; k++) {
          const spread = v3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
          spread.sub(dir.clone().multiplyScalar(spread.dot(dir)));
          const end = dir.clone().multiplyScalar(b.tail.length() * (0.75 + Math.random() * 0.35)).add(spread);
          const lg = new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), end]);
          lg.setAttribute("color", new THREE.BufferAttribute(new Float32Array([...col(b.color).toArray(), 0, 0, 0]), 3));
          g.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
        }
        const base = b.pos.clone();
        tick.push(t => { g.position.copy(base).add(v3(Math.sin(t * 0.07) * 0.15, Math.sin(t * 0.11) * 0.08, Math.cos(t * 0.07) * 0.1)); });
        break;
      }
    }
    register(b, g, r, b.pick);
  }
  const sunItem = Object.values(items).find(i => i.body.look === "sun");

  /* 선택 표시: 천체를 둘러싸는 가는 금빛 고리 (늘 카메라를 본다) */
  const selRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.007, 160, 1), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0, depthWrite: false }));
  const hovRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.006, 160, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(selRing, hovRing);

  /* ── 후처리 ── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.8);
  composer.addPass(bloom);
  const glitch = new ShaderPass(GlitchShader); glitch.enabled = false; composer.addPass(glitch);
  composer.addPass(new OutputPass());

  /* ── 카메라 ── */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.minDistance = 2.2; controls.maxDistance = 60;
  controls.maxPolarAngle = 1.32; controls.minPolarAngle = 0.15;
  controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.8;
  controls.autoRotate = !REDUCED; controls.autoRotateSpeed = 0.12;
  const VIEW_DIR = v3(0, 0.78, 0.63).normalize();
  let home = { pos: v3(0, 14, 11), target: v3(0, 0, 0.5) };
  let portrait = null;

  /* 품질 단계 (30fps 밑으로 떨어지지 않게) */
  const TIERS = [{ pr: 0.45, bloom: false }, { pr: 0.6, bloom: false }, { pr: 0.85, bloom: true, bs: 0.35 }, { pr: 1, bloom: true, bs: 0.5 }, { pr: 2, bloom: true, bs: 0.5 }];
  let tier = 3;
  function applyTier() {
    const t = TIERS[tier], pr = Math.min(devicePixelRatio || 1, t.pr);
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
    bloom.enabled = t.bloom;
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    if (t.bloom) bloom.resolution.set(Math.round(w * t.bs), Math.round(h * t.bs));
    starMat.uniforms.uPR.value = pr;
    tails.forEach(m => { m.uniforms.uPR.value = pr; });
  }

  let selected = null, hovered = null, flight = null;
  function layout() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const nowPortrait = w / h < 0.95;
    if (nowPortrait !== portrait) { portrait = nowPortrait; root.rotation.y = portrait ? -Math.PI / 2 : 0; root.updateMatrixWorld(true); }
    /* 지도 전체가 화면에 들어오도록 거리 계산 */
    const hx = portrait ? 7.2 : 11.4, hz = portrait ? 11.6 : 7.4;
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    const dist = Math.max(hx / Math.tan(hf), (hz * VIEW_DIR.y) / Math.tan(vf)) * 1.02;
    home = { pos: VIEW_DIR.clone().multiplyScalar(dist).add(v3(0, 0, 0.5)), target: v3(0, 0, 0.5) };
    controls.maxDistance = dist * 1.4;
    if (!selected && !flight) { camera.position.copy(home.pos); controls.target.copy(home.target); }
    applyTier();
  }

  /* ── 선택 · 이동 ── */
  const worldPos = id => items[id].group.getWorldPosition(new THREE.Vector3());
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function flyTo(pos, target, ms) {
    flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms: REDUCED ? 1 : ms };
    controls.enabled = false;
  }
  function select(id) {
    if (!items[id]) return;
    selected = id;
    const it = items[id], wp = worldPos(id);
    /* 천체(와 주변 장식)가 화면 폭의 약 55% 안에 들어오도록 거리를 잡는다. 세로 화면은 가로 시야가 좁아 더 멀리 */
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const span = it.radius * (it.body.kind === "comet" ? 6 : (it.body.ring || 1.55) * 1.6);
    const dist = Math.max(3.2, it.radius * (it.body.kind === "comet" ? 9 : 5.2) + 1.6, span / (0.55 * 2 * Math.tan(hf)));
    const dir = camera.position.clone().sub(controls.target).normalize();
    dir.y = Math.max(dir.y, 0.35); dir.normalize();
    /* 정보 글이 놓일 자리를 비우도록 천체를 화면 오른쪽(세로 화면은 위쪽)으로 비켜 둔다 */
    const right = new THREE.Vector3().crossVectors(v3(0, 1, 0), dir).normalize();
    const shift = portrait ? v3(0, -dist * 0.24, 0) : right.multiplyScalar(-dist * 0.3);
    const tgt = wp.clone().add(shift);
    flyTo(wp.clone().add(dir.multiplyScalar(dist)).add(shift), tgt, 1100);
    controls.autoRotate = false;
    hooks.onSelect && hooks.onSelect(it.body);
  }
  function deselect() {
    if (!selected) return;
    selected = null; flyTo(home.pos.clone(), home.target.clone(), 1000);
    controls.autoRotate = !REDUCED;
    hooks.onDeselect && hooks.onDeselect();
  }
  const order = BODIES.map(b => b.id);
  function step(d) {
    const i = selected ? order.indexOf(selected) : -1;
    select(order[(i + d + order.length) % order.length]);
  }

  /* 탭과 드래그 구분: 6px 이하로 움직이고 0.5초 안에 떼면 '선택' */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  function hit(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, false)[0];
    return h ? h.object.userData.id : null;
  }
  renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 500) return;
    const id = hit(e);
    if (id) select(id); else deselect();
  });
  renderer.domElement.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    hovered = hit(e);
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  });
  renderer.domElement.addEventListener("pointerleave", () => { hovered = null; });

  /* ── 자물쇠 표시 (스케치처럼 잠긴 천체 위에) ── */
  const lockLayer = document.createElement("div"); lockLayer.className = "lock-layer"; lockLayer.setAttribute("aria-hidden", "true");
  container.appendChild(lockLayer);
  const LOCK_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5"/><rect x="5" y="10.5" width="14" height="10" rx="1.2"/><path d="M12 14.5v2.4"/></svg>';
  const locks = BODIES.filter(b => b.locked).map(b => {
    const el = document.createElement("div"); el.className = "lock"; el.innerHTML = LOCK_SVG; lockLayer.appendChild(el);
    return { id: b.id, el };
  });

  /* ── 글리치 전환 ── */
  let glitchRun = null;
  function runGlitch(ms, done) {
    if (glitchRun) return;                               // 진행 중이면 무시 (두 번 눌러도 한 번만 넘어간다)
    if (REDUCED) { done(); return; }
    glitch.enabled = true; glitchRun = { start: performance.now(), ms };
    /* 전환 시각은 프레임 속도와 상관없이 타이머로 정확히 맞춘다 */
    setTimeout(() => { glitchRun = null; glitch.enabled = false; glitch.uniforms.uAmt.value = 0; done(); }, ms);
  }

  /* ── 루프 ── */
  let raf = 0, last = performance.now(), running = false, acc = 0, frames = 0, good = 0;
  const tmp = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
    T.value += dt;
    acc += raw; frames++;                                // 품질 판단은 잘리지 않은 실제 시간으로

    if (acc > 1) {
      const fps = frames / acc; acc = 0; frames = 0;
      if (fps < 40 && tier > 0) { tier--; good = 0; applyTier(); }
      else if (fps > 57) { good += 1.5; if (good >= 6 && tier < TIERS.length - 1) { tier++; good = 0; applyTier(); } }
      else good = 0;
    }
    if (sunItem) sunItem.group.getWorldPosition(SUN);
    for (const [m, s] of spin) m.rotation.y += s * dt;
    for (const f of tick) f(T.value);
    if (flight) {
      const k = Math.min(1, (now - flight.start) / flight.ms), e = ease(k);
      camera.position.lerpVectors(flight.p0, flight.p1, e); controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (k >= 1) { flight = null; controls.enabled = true; }
    }
    controls.update();
    const place = (ring, id, op) => {
      if (!id) { ring.material.opacity += (0 - ring.material.opacity) * 0.2; return; }
      const it = items[id]; ring.position.copy(worldPos(id)); ring.lookAt(camera.position);
      const s = it.radius * (it.body.kind === "comet" ? 3.2 : it.body.ring || 1.55) * (1 + 0.03 * Math.sin(T.value * 2.4));
      ring.scale.setScalar(s); ring.material.opacity += (op - ring.material.opacity) * 0.2;
    };
    place(selRing, selected, 0.55); place(hovRing, hovered !== selected ? hovered : null, 0.3);
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    for (const L of locks) {
      const it = items[L.id]; tmp.copy(worldPos(L.id));
      const d = camera.position.distanceTo(tmp);
      tmp.project(camera);
      const vis = tmp.z < 1;
      const size = Math.max(18, Math.min(40, 260 / d * Math.max(0.6, it.radius)));
      L.el.style.opacity = vis ? (selected && selected !== L.id ? 0.35 : 0.9) : 0;
      L.el.style.transform = `translate(${((tmp.x + 1) / 2 * w - size / 2).toFixed(1)}px,${((1 - tmp.y) / 2 * h - size / 2).toFixed(1)}px)`;
      L.el.style.width = L.el.style.height = size + "px";
    }
    if (glitchRun) {
      const k = (now - glitchRun.start) / glitchRun.ms;
      glitch.uniforms.uAmt.value = k < 0.35 ? k / 0.35 : 1;
      glitch.uniforms.uSeed.value = Math.floor(now / 33);
    }
    composer.render();
  }

  addEventListener("resize", () => { if (running) layout(); });
  return {
    start() { if (running) return; running = true; layout(); last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    select, deselect, step, runGlitch,
    selectedId: () => selected,
    tier: () => tier,
    debug: { camera, items, renderer, controls, glitch: () => ({ enabled: glitch.enabled, amt: glitch.uniforms.uAmt.value, running: !!glitchRun }) }
  };
}
