// A small, deterministic 2D rigid-body simulation in reference-image pixels.
// Shared zigzag edges partition the original board; it breaks only on contact.
export const FLOOR=748;
const GRAVITY=1700,STEP=1/120;
export const SHAPES=[
  [[0,0],[89,0],[96,14],[86,24],[98,38],[90,48],[95,60],[0,60]],
  [[89,0],[181,0],[174,12],[187,27],[176,42],[185,52],[179,60],[95,60],[90,48],[98,38],[86,24],[96,14]],
  [[181,0],[280,0],[280,60],[179,60],[185,52],[176,42],[187,27],[174,12]],
];
function body(points,x,y,angle=0){
  let area=0,cx=0,cy=0;
  points.forEach(([ax,ay],i)=>{const [bx,by]=points[(i+1)%points.length],s=ax*by-bx*ay;area+=s;cx+=(ax+bx)*s;cy+=(ay+by)*s;});
  cx/=3*area;cy/=3*area;
  const mass=Math.abs(area)/2000;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
  return {points,cx,cy,minX:Math.min(...xs),minY:Math.min(...ys),width:w,height:h,x,y,angle,vx:0,vy:0,omega:0,mass,inertia:mass*(w*w+h*h)/12,sleep:0,asleep:false,contacts:0};
}
export function vertices(b){
  const c=Math.cos(b.angle),s=Math.sin(b.angle);
  return b.points.map(([x,y])=>({x:b.x+(x-b.cx)*c-(y-b.cy)*s,y:b.y+(x-b.cx)*s+(y-b.cy)*c}));
}
function bottom(b){return Math.max(...vertices(b).map(p=>p.y));}
function stepBody(b,dt){
  if(b.asleep)return;
  b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.omega*dt;
  const penetration=bottom(b)-FLOOR;
  if(penetration>=0){
    b.y-=penetration;b.contacts++;
    // Sequential normal and Coulomb-friction impulses at the supporting corners.
    for(let pass=0;pass<5;pass++){
      const contacts=vertices(b).filter(p=>p.y>FLOOR-.8);
      for(const p of contacts){
        const rx=p.x-b.x,ry=p.y-b.y,normalSpeed=b.vy+b.omega*rx;
        if(normalSpeed<=0)continue;
        const restitution=pass===0&&normalSpeed>95?.24:0;
        const impulse=(1+restitution)*normalSpeed/(1/b.mass+rx*rx/b.inertia);
        b.vy-=impulse/b.mass;b.omega-=rx*impulse/b.inertia;
        const tangentSpeed=b.vx-b.omega*ry;
        const friction=Math.max(-.55*impulse,Math.min(.55*impulse,-tangentSpeed/(1/b.mass+ry*ry/b.inertia)));
        b.vx+=friction/b.mass;b.omega-=ry*friction/b.inertia;
      }
    }
    b.vx*=Math.exp(-3*dt);b.omega*=Math.exp(-2.5*dt);
  }
  b.omega*=Math.exp(-.12*dt);
  if(bottom(b)>FLOOR-1.2&&Math.abs(b.vx)<5&&Math.abs(b.vy)<12&&Math.abs(b.omega)<.09)b.sleep+=dt;
  else b.sleep=0;
  if(b.sleep>.38){b.asleep=true;b.vx=b.vy=b.omega=0;}
}

export function createPlaqueSimulation(start){
  const whole=body([[0,0],[280,0],[280,60],[0,60]],start.x,start.y,start.angle);
  whole.vx=-58;whole.omega=.44;
  const state={whole,shards:[],elapsed:0,impact:null,settled:false};
  let accumulated=0;
  function fracture(){
    const c=Math.cos(whole.angle),s=Math.sin(whole.angle);
    const point=vertices(whole).reduce((a,b)=>b.y>a.y?b:a);
    state.impact={x:point.x,y:FLOOR,speed:whole.vy,time:state.elapsed};
    state.shards=SHAPES.map((shape,i)=>{
      const shard=body(shape,0,0,whole.angle);
      const dx=shard.cx-whole.cx,dy=shard.cy-whole.cy;
      const rx=dx*c-dy*s,ry=dx*s+dy*c;
      shard.x=whole.x+rx;shard.y=whole.y+ry;
      // Most impact energy is lost to fracture. The smaller remainder creates
      // different rebound/slide/spin velocities instead of an explosive scatter.
      shard.vx=whole.vx-whole.omega*ry+[-150,10,185][i];
      shard.vy=-Math.min(225,whole.vy*.17)*[.8,.55,1][i];
      shard.omega=[-1.9,.9,2.2][i];
      return shard;
    });
  }
  return {
    state,
    advance(seconds){
      accumulated+=seconds;
      while(accumulated>=STEP&&!state.settled){
        accumulated-=STEP;state.elapsed+=STEP;
        if(!state.shards.length){
          whole.vy+=GRAVITY*STEP;whole.x+=whole.vx*STEP;whole.y+=whole.vy*STEP;whole.angle+=whole.omega*STEP;
          const penetration=bottom(whole)-FLOOR;
          if(penetration>=0){whole.y-=penetration;fracture();}
        }else{
          state.shards.forEach(b=>stepBody(b,STEP));
          state.settled=state.shards.every(b=>b.asleep);
        }
      }
      return state;
    },
  };
}
