// ═══════════════════════════════════════════════════════════════
// FLOOR 2: THE OBSERVATORY — 2400×1600
// A zen space. Massive glass dome, deep space, planets, aurora,
// viewing pods, telescope, hot chocolate, photo wall.
// ═══════════════════════════════════════════════════════════════
function renderFloor2(){
  const FW=2400, FH=1600;
  const t=S.time;

  // === FLOOR: Dark observatory deck — polished stone tiles ===
  ctx.fillStyle='#0c0c18';ctx.fillRect(0,0,FW,FH);
  const seed=(x,y)=>((x*2654435761)^(y*2246822519))>>>0;
  for(let py=900;py<FH;py+=48)for(let px=0;px<FW;px+=48){
    const s=seed(px,py);const shade=s%8;
    ctx.fillStyle=`rgb(${18+shade},${16+shade},${28+shade})`;ctx.fillRect(px,py,48,48);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px,py,48,1);ctx.fillRect(px,py,1,48);
    if(s%7===0){ctx.fillStyle='rgba(80,60,120,.04)';ctx.fillRect(px+4,py+4,40,40)}
  }

  // === GLASS DOME BACKGROUND (y:0-900) — deep space ===
  ctx.fillStyle='#010208';ctx.fillRect(0,0,FW,900);

  // Dome curve (glass frame)
  ctx.save();
  ctx.strokeStyle='rgba(100,140,180,.12)';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(FW/2,-600,1500,0.15,Math.PI-0.15);ctx.stroke();
  ctx.strokeStyle='rgba(100,140,180,.06)';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(FW/2,-600,1520,0.15,Math.PI-0.15);ctx.stroke();
  // Dome ribs
  for(let i=0;i<12;i++){
    const a=0.15+i*(Math.PI-0.3)/11;
    const cx=FW/2+Math.cos(a)*1500,cy=-600+Math.sin(a)*1500;
    ctx.strokeStyle='rgba(100,140,180,.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(FW/2,-600);ctx.lineTo(cx,cy);ctx.stroke();
  }
  ctx.restore();

  // === STAR FIELD — 5 brightness layers, 250+ stars ===
  // Layer 1: faintest background dust (80 stars)
  for(let i=0;i<80;i++){
    const sx=(i*137+23)%FW,sy=(i*89+11)%880;
    const a=.04+Math.sin(t*.3+i*.7)*.02;
    ctx.fillStyle=`rgba(180,180,220,${a})`;ctx.fillRect(sx,sy,1,1);
  }
  // Layer 2: dim stars (60 stars)
  for(let i=0;i<60;i++){
    const sx=(i*211+47)%FW,sy=(i*127+31)%860;
    const a=.12+Math.sin(t*.6+i*.5)*.06;
    ctx.fillStyle=`rgba(200,200,240,${a})`;ctx.fillRect(sx,sy,1,1);
  }
  // Layer 3: medium stars (50 stars)
  for(let i=0;i<50;i++){
    const sx=(i*173+67)%FW,sy=(i*97+19)%840;
    const a=.25+Math.sin(t*1.0+i*.8)*.12;
    ctx.fillStyle=`rgba(220,220,255,${a})`;ctx.fillRect(sx,sy,1,1);
  }
  // Layer 4: bright stars (30 stars, some 2px)
  for(let i=0;i<30;i++){
    const sx=(i*251+83)%FW,sy=(i*149+7)%800;
    const a=.45+Math.sin(t*1.5+i*1.1)*.2;
    const sz=i%7===0?2:1;
    ctx.fillStyle=`rgba(240,240,255,${a})`;ctx.fillRect(sx,sy,sz,sz);
  }
  // Layer 5: brilliant stars with twinkle (15 stars, cross-shaped)
  for(let i=0;i<15;i++){
    const sx=(i*307+41)%FW,sy=(i*181+53)%750;
    const a=.7+Math.sin(t*2.5+i*1.3)*.25;
    ctx.fillStyle=`rgba(255,255,255,${a})`;
    ctx.fillRect(sx,sy,2,2);
    // Cross twinkle
    const ta=Math.sin(t*3+i*2)*.5;
    if(ta>0){
      ctx.fillStyle=`rgba(255,255,255,${ta*.4})`;
      ctx.fillRect(sx-1,sy+0.5,4,1);ctx.fillRect(sx+0.5,sy-1,1,4);
    }
  }

  // === NEBULAE — 3 radial gradient clouds ===
  // Nebula 1: purple-violet (large, left)
  const n1x=500+Math.sin(t*.02)*40,n1y=350+Math.cos(t*.015)*25;
  const ng1=ctx.createRadialGradient(n1x,n1y,0,n1x,n1y,250);
  ng1.addColorStop(0,'rgba(120,40,180,.1)');ng1.addColorStop(0.3,'rgba(80,20,140,.06)');
  ng1.addColorStop(0.7,'rgba(40,10,100,.03)');ng1.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng1;ctx.fillRect(0,0,FW,900);

  // Nebula 2: blue-cyan (center-right)
  const n2x=1600+Math.sin(t*.025+1)*35,n2y=300+Math.cos(t*.018+2)*20;
  const ng2=ctx.createRadialGradient(n2x,n2y,0,n2x,n2y,200);
  ng2.addColorStop(0,'rgba(30,80,180,.08)');ng2.addColorStop(0.4,'rgba(20,60,150,.04)');
  ng2.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng2;ctx.fillRect(0,0,FW,900);

  // Nebula 3: rose-pink (upper right, smaller)
  const n3x=2000+Math.sin(t*.03+3)*30,n3y=200+Math.cos(t*.02+1)*15;
  const ng3=ctx.createRadialGradient(n3x,n3y,0,n3x,n3y,140);
  ng3.addColorStop(0,'rgba(180,60,100,.06)');ng3.addColorStop(0.5,'rgba(120,30,70,.03)');
  ng3.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ng3;ctx.fillRect(0,0,FW,900);

  // === PLANETS ===
  // Jupiter — large, banded, Great Red Spot
  const jx=400,jy=250,jr=35;
  ctx.save();ctx.beginPath();ctx.arc(jx,jy,jr,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#c4a060';ctx.fillRect(jx-jr,jy-jr,jr*2,jr*2);
  const jBands=['#d4b070','#b89050','#c8a460','#a88040','#d0a858','#b49048','#c09850'];
  for(let i=0;i<7;i++){ctx.fillStyle=jBands[i];ctx.fillRect(jx-jr,jy-jr+i*10,jr*2,10)}
  // Great Red Spot
  ctx.fillStyle='#c05030';ctx.beginPath();ctx.ellipse(jx+8+Math.sin(t*.01)*3,jy+5,8,5,0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d06040';ctx.beginPath();ctx.ellipse(jx+8+Math.sin(t*.01)*3,jy+5,5,3,0.1,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // Jupiter atmosphere glow
  const jGlow=ctx.createRadialGradient(jx,jy,jr-2,jx,jy,jr+10);
  jGlow.addColorStop(0,'rgba(200,160,80,0)');jGlow.addColorStop(0.8,'rgba(200,160,80,.05)');jGlow.addColorStop(1,'rgba(200,160,80,0)');
  ctx.fillStyle=jGlow;ctx.beginPath();ctx.arc(jx,jy,jr+10,0,Math.PI*2);ctx.fill();

  // Saturn — with detailed rings
  const sx=1900,sy=180,sr=28;
  ctx.save();ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#d4b870';ctx.fillRect(sx-sr,sy-sr,sr*2,sr*2);
  for(let i=0;i<5;i++){ctx.fillStyle=i%2===0?'#c8aa60':'#dcc480';ctx.fillRect(sx-sr,sy-sr+i*11,sr*2,11)}
  ctx.restore();
  // Saturn shadow on planet
  const satShade=ctx.createLinearGradient(sx-sr,sy,sx+sr,sy);
  satShade.addColorStop(0,'rgba(0,0,0,0)');satShade.addColorStop(0.7,'rgba(0,0,0,0)');satShade.addColorStop(1,'rgba(0,0,0,.25)');
  ctx.fillStyle=satShade;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
  // Rings (3 layers)
  ctx.strokeStyle='rgba(210,190,150,.45)';ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(sx,sy,sr+16,7,0.12,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='rgba(190,170,130,.3)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(sx,sy,sr+24,9,0.12,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='rgba(170,150,110,.2)';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(sx,sy,sr+30,11,0.12,0,Math.PI*2);ctx.stroke();

  // Mars — small, red
  const mx=1100,my=150,mr=14;
  ctx.save();ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#b85030';ctx.fillRect(mx-mr,my-mr,mr*2,mr*2);
  // Dark patches
  ctx.fillStyle='#903820';ctx.beginPath();ctx.ellipse(mx-4,my-3,6,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a04828';ctx.beginPath();ctx.ellipse(mx+5,my+4,4,3,0.5,0,Math.PI*2);ctx.fill();
  // Polar ice cap
  ctx.fillStyle='rgba(220,230,240,.4)';ctx.beginPath();ctx.arc(mx,my-mr+4,5,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // Earth — medium, blue-green
  const ex=800,ey=400,er=22;
  const eAtmo=ctx.createRadialGradient(ex,ey,er-2,ex,ey,er+14);
  eAtmo.addColorStop(0,'rgba(80,160,255,0)');eAtmo.addColorStop(0.6,'rgba(80,160,255,.1)');eAtmo.addColorStop(1,'rgba(80,160,255,0)');
  ctx.fillStyle=eAtmo;ctx.beginPath();ctx.arc(ex,ey,er+14,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#1a5a9a';ctx.fillRect(ex-er,ey-er,er*2,er*2);
  const eDrift=Math.sin(t*.02)*4;
  ctx.fillStyle='#2a7a3a';
  ctx.beginPath();ctx.ellipse(ex-3+eDrift,ey-5,8,10,0.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex+14+eDrift,ey-3,5,12,-0.1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex-14+eDrift,ey-8,9,6,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(ex-16+eDrift,ey+10,5,3,0.2,0,Math.PI*2);ctx.fill();
  // Clouds
  ctx.fillStyle='rgba(220,240,255,.25)';
  for(let i=0;i<6;i++){const ca=t*.015+i*1.0,cr=10+i*3;
    ctx.beginPath();ctx.arc(ex+Math.cos(ca)*cr*.5,ey+Math.sin(ca)*cr*.3,3,0,Math.PI*2);ctx.fill()}
  // Terminator
  const eTerm=ctx.createLinearGradient(ex-er+Math.sin(t*.008)*8,ey,ex+er,ey);
  eTerm.addColorStop(0,'rgba(0,0,0,0)');eTerm.addColorStop(0.5,'rgba(0,0,0,0)');
  eTerm.addColorStop(0.7,'rgba(0,0,20,.3)');eTerm.addColorStop(1,'rgba(0,0,20,.5)');
  ctx.fillStyle=eTerm;ctx.fillRect(ex-er-2,ey-er-2,er*2+4,er*2+4);
  ctx.restore();

  // Venus — small, pale yellow
  const vx=1500,vy=500,vr=10;
  ctx.fillStyle='#ddd0a0';ctx.beginPath();ctx.arc(vx,vy,vr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ccc090';ctx.beginPath();ctx.ellipse(vx-2,vy+1,5,3,0.3,0,Math.PI*2);ctx.fill();
  const vGlow=ctx.createRadialGradient(vx,vy,vr-1,vx,vy,vr+6);
  vGlow.addColorStop(0,'rgba(220,210,160,0)');vGlow.addColorStop(0.7,'rgba(220,210,160,.06)');vGlow.addColorStop(1,'rgba(220,210,160,0)');
  ctx.fillStyle=vGlow;ctx.beginPath();ctx.arc(vx,vy,vr+6,0,Math.PI*2);ctx.fill();

  // === CONSTELLATIONS — faint connected lines ===
  const constellations=[
    // Orion-like
    {stars:[[200,100],[230,130],[260,100],[230,170],[200,210],[230,210],[260,210],[220,260],[240,260]],
     lines:[[0,1],[1,2],[1,3],[3,4],[3,5],[3,6],[4,7],[6,8]]},
    // Big Dipper-like
    {stars:[[1300,120],[1340,110],[1380,120],[1410,140],[1420,170],[1400,200],[1370,190]],
     lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
    // Cassiopeia-like
    {stars:[[700,80],[740,60],[780,90],[820,50],[860,80]],
     lines:[[0,1],[1,2],[2,3],[3,4]]}
  ];
  constellations.forEach(c=>{
    const ca=.12+Math.sin(t*.5)*.04;
    ctx.strokeStyle=`rgba(150,170,220,${ca})`;ctx.lineWidth=1;
    c.lines.forEach(l=>{
      ctx.beginPath();ctx.moveTo(c.stars[l[0]][0],c.stars[l[0]][1]);
      ctx.lineTo(c.stars[l[1]][0],c.stars[l[1]][1]);ctx.stroke();
    });
    c.stars.forEach(s=>{
      ctx.fillStyle=`rgba(200,210,255,${ca+.15})`;ctx.fillRect(s[0]-1,s[1]-1,2,2);
    });
  });

  // === AURORA BOREALIS — dancing curtains ===
  const auroraColors=['rgba(0,255,100,','rgba(80,200,255,','rgba(160,50,255,','rgba(255,80,180,'];
  for(let i=0;i<40;i++){
    const ax=50+i*58+Math.sin(t*1.5+i*.4)*20;
    const ay=30+Math.sin(t*.8+i*.25)*35;
    const ah=80+Math.sin(t*.6+i*.3)*30;
    const ci=i%4;
    const alpha=.04+Math.sin(t*2+i*.7)*.025;
    ctx.fillStyle=auroraColors[ci]+alpha+')';
    ctx.fillRect(ax,ay,12,ah);
    // Secondary shimmer band
    ctx.fillStyle=auroraColors[(ci+1)%4]+(alpha*.5)+')';
    ctx.fillRect(ax+4,ay+10,6,ah-20);
  }

  // === SHOOTING STAR (every ~25 seconds) ===
  const shootPhase=(t%1500)/1500;
  if(shootPhase<0.02){
    const sp=shootPhase/0.02;
    const ssx=200+sp*1800,ssy=50+sp*200;
    ctx.strokeStyle=`rgba(255,255,255,${1-sp})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(ssx,ssy);ctx.lineTo(ssx-50,ssy-15);ctx.stroke();
    ctx.fillStyle=`rgba(255,255,255,${1-sp})`;ctx.beginPath();ctx.arc(ssx,ssy,2,0,Math.PI*2);ctx.fill();
    // Sparkle trail
    for(let i=1;i<5;i++){
      ctx.fillStyle=`rgba(200,220,255,${(1-sp)*(1-i*.2)})`;
      ctx.fillRect(ssx-i*12,ssy-i*3,2,1);
    }
  }

  // === DOME / DECK TRANSITION (y~900) — railing ===
  // Deck floor gradient
  const deckGrad=ctx.createLinearGradient(0,880,0,920);
  deckGrad.addColorStop(0,'rgba(20,18,35,.5)');deckGrad.addColorStop(0.5,'rgba(40,35,60,.8)');
  deckGrad.addColorStop(1,'rgba(20,18,35,0)');
  ctx.fillStyle=deckGrad;ctx.fillRect(0,880,FW,40);
  // Railing
  ctx.fillStyle='#3a3550';ctx.fillRect(0,895,FW,4);
  ctx.fillStyle='#4a4565';ctx.fillRect(0,895,FW,2);
  for(let rx=60;rx<FW;rx+=60){
    ctx.fillStyle='#3a3550';ctx.fillRect(rx,880,3,18);
    ctx.fillStyle='#4a4565';ctx.fillRect(rx,880,2,18);
  }

  // === VIEWING PODS (circular, scattered in middle zone) ===
  for(let i=1;i<=6;i++){
    const pod=getObjects().find(o=>o.id==='viewing_pod_'+i);if(!pod)continue;
    const pcx=pod.x+pod.w/2,pcy=pod.y+pod.h/2,pr=Math.min(pod.w,pod.h)/2;
    // Pod base
    ctx.fillStyle='#1a1830';ctx.beginPath();ctx.arc(pcx,pcy,pr+4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2a2545';ctx.beginPath();ctx.arc(pcx,pcy,pr,0,Math.PI*2);ctx.fill();
    // Cushion
    ctx.fillStyle='#3a2a5a';ctx.beginPath();ctx.arc(pcx,pcy,pr-4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4a3a6a';ctx.beginPath();ctx.arc(pcx,pcy,pr-8,0,Math.PI*2);ctx.fill();
    // Subtle glow underneath
    const podGlow=ctx.createRadialGradient(pcx,pcy,0,pcx,pcy,pr+10);
    podGlow.addColorStop(0,'rgba(80,60,140,.05)');podGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=podGlow;ctx.beginPath();ctx.arc(pcx,pcy,pr+10,0,Math.PI*2);ctx.fill();
  }

  // === TELESCOPE MAIN — large platform ===
  const tel=getObjects().find(o=>o.id==='telescope_main');
  if(tel){
    const tcx=tel.x+tel.w/2,tcy=tel.y+tel.h/2;
    // Circular platform
    ctx.fillStyle='#2a2540';ctx.beginPath();ctx.arc(tcx,tcy+20,50,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1a1530';ctx.beginPath();ctx.arc(tcx,tcy+20,46,0,Math.PI*2);ctx.fill();
    // Tripod legs
    ctx.fillStyle='#555';ctx.save();ctx.translate(tcx,tcy+20);
    for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*Math.PI*2/3-Math.PI/6);
      ctx.fillRect(-2,0,4,35);ctx.restore();}
    ctx.restore();
    // Telescope tube (tilted up toward dome)
    ctx.save();ctx.translate(tcx,tcy);ctx.rotate(-0.4);
    ctx.fillStyle='#777';ctx.fillRect(-4,-50,8,50);// main tube
    ctx.fillStyle='#999';ctx.fillRect(-6,-52,12,6);// lens housing
    ctx.fillStyle='#aabbcc';ctx.fillRect(-5,-54,10,3);// lens
    ctx.fillStyle='#666';ctx.fillRect(-3,-2,6,8);// eyepiece housing
    ctx.fillStyle='#888';ctx.fillRect(-2,4,4,6);// eyepiece
    ctx.restore();
    // Finder scope
    ctx.save();ctx.translate(tcx+6,tcy);ctx.rotate(-0.4);
    ctx.fillStyle='#666';ctx.fillRect(0,-30,3,20);
    ctx.restore();
  }

  // === SMALL TELESCOPES ===
  ['telescope_small_1','telescope_small_2'].forEach(id=>{
    const st=getObjects().find(o=>o.id===id);if(!st)return;
    const scx=st.x+st.w/2,scy=st.y+st.h/2;
    // Small tripod
    ctx.fillStyle='#555';
    ctx.fillRect(scx-1,scy,2,20);ctx.fillRect(scx-8,scy+18,6,2);ctx.fillRect(scx+3,scy+18,6,2);
    // Small tube
    ctx.save();ctx.translate(scx,scy);ctx.rotate(-0.5);
    ctx.fillStyle='#777';ctx.fillRect(-2,-25,4,25);
    ctx.fillStyle='#999';ctx.fillRect(-3,-27,6,3);
    ctx.restore();
  });

  // === PLANETARIUM PROJECTOR — center ===
  const proj=getObjects().find(o=>o.id==='planetarium_projector');
  if(proj){
    const pcx=proj.x+proj.w/2,pcy=proj.y+proj.h/2;
    // Base cylinder
    ctx.fillStyle='#333';ctx.fillRect(pcx-15,pcy+5,30,20);
    ctx.fillStyle='#3a3a4a';ctx.fillRect(pcx-12,pcy+8,24,14);
    // Projector sphere
    ctx.fillStyle='#444';ctx.beginPath();ctx.arc(pcx,pcy-5,18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#555';ctx.beginPath();ctx.arc(pcx,pcy-5,14,0,Math.PI*2);ctx.fill();
    // Lens dots around sphere
    for(let i=0;i<8;i++){
      const la=i*Math.PI/4+t*.3;
      const lx=pcx+Math.cos(la)*12,ly=pcy-5+Math.sin(la)*12;
      const lAlpha=.3+Math.sin(t*2+i)*.2;
      ctx.fillStyle=`rgba(150,200,255,${lAlpha})`;
      ctx.beginPath();ctx.arc(lx,ly,2,0,Math.PI*2);ctx.fill();
    }
    // Projected beams
    for(let i=0;i<6;i++){
      const ba=i*Math.PI/3+t*.1;
      ctx.strokeStyle=`rgba(100,150,220,.04)`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pcx,pcy-5);
      ctx.lineTo(pcx+Math.cos(ba)*200,pcy-5+Math.sin(ba)*200);ctx.stroke();
    }
  }

  // === STAR MAP TABLE ===
  const smt=getObjects().find(o=>o.id==='star_map_table');
  if(smt){
    // Table frame
    ctx.fillStyle='#1a1a30';ctx.fillRect(smt.x,smt.y,smt.w,smt.h);
    ctx.strokeStyle='#334';ctx.lineWidth=2;ctx.strokeRect(smt.x,smt.y,smt.w,smt.h);
    // Table surface — dark with holographic star map
    ctx.fillStyle='#0a0a18';ctx.fillRect(smt.x+4,smt.y+4,smt.w-8,smt.h-8);
    // Concentric orbit lines
    const smcx=smt.x+smt.w/2,smcy=smt.y+smt.h/2;
    for(let i=1;i<=6;i++){
      ctx.strokeStyle=`rgba(60,80,120,.15)`;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(smcx,smcy,i*20,i*12,0,0,Math.PI*2);ctx.stroke();
    }
    // Tiny orbit dots (planets on map)
    for(let i=0;i<5;i++){
      const oa=t*.05*(i+1),or=20+i*20;
      const ox=smcx+Math.cos(oa)*or,oy=smcy+Math.sin(oa)*or*.6;
      ctx.fillStyle=['#ddd0a0','#1a8aaa','#b85030','#c8a060','#8a7050'][i];
      ctx.fillRect(ox-1,oy-1,3,3);
    }
    // Label
    ctx.fillStyle='rgba(100,140,200,.5)';ctx.font='8px monospace';
    ctx.fillText('STELLAR CARTOGRAPHY',smt.x+smt.w/2-60,smt.y-6);
    // Table legs
    ctx.fillStyle='#2a2a3a';
    ctx.fillRect(smt.x+10,smt.y+smt.h,4,15);
    ctx.fillRect(smt.x+smt.w-14,smt.y+smt.h,4,15);
  }

  // === HOT CHOCOLATE BAR ===
  const hcb=getObjects().find(o=>o.id==='hotchoc_bar');
  if(hcb){
    // Counter
    ctx.fillStyle='#3a2a1a';ctx.fillRect(hcb.x,hcb.y,hcb.w,hcb.h);
    ctx.fillStyle='#4a3a2a';ctx.fillRect(hcb.x,hcb.y,hcb.w,6);
    ctx.fillStyle='#2a1a0a';ctx.fillRect(hcb.x+4,hcb.y+8,hcb.w-8,hcb.h-12);
    // Cups (4 mugs with steam)
    for(let i=0;i<4;i++){
      const cx=hcb.x+30+i*55,cy=hcb.y+20;
      // Mug body
      ctx.fillStyle='#6a3a1a';ctx.fillRect(cx,cy,16,18);
      ctx.fillStyle='#7a4a2a';ctx.fillRect(cx+2,cy+2,12,14);
      // Hot chocolate inside
      ctx.fillStyle='#4a2810';ctx.fillRect(cx+3,cy+3,10,8);
      // Handle
      ctx.strokeStyle='#6a3a1a';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx+17,cy+9,4,Math.PI*1.5,Math.PI*.5);ctx.stroke();
      // Steam wisps
      for(let s=0;s<3;s++){
        const sy2=cy-4-s*6-Math.sin(t*2+i+s)*3;
        const sx2=cx+6+Math.sin(t*1.5+i*2+s*2)*4;
        const sa=.15-s*.04;
        ctx.fillStyle=`rgba(200,200,220,${sa})`;
        ctx.beginPath();ctx.arc(sx2,sy2,2+Math.sin(t+s)*.5,0,Math.PI*2);ctx.fill();
      }
    }
    // Sign
    ctx.fillStyle='rgba(200,180,140,.6)';ctx.font='bold 10px monospace';
    ctx.fillText('HOT CHOCOLATE',hcb.x+40,hcb.y-8);
    // Marshmallow bowl
    ctx.fillStyle='#3a3040';ctx.beginPath();ctx.ellipse(hcb.x+hcb.w-30,hcb.y+30,14,8,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<5;i++){
      ctx.fillStyle='#eee8dd';
      ctx.beginPath();ctx.arc(hcb.x+hcb.w-35+i*6,hcb.y+28+Math.sin(i)*2,3,0,Math.PI*2);ctx.fill();
    }
  }

  // === PHOTO WALL — procedural "space photos" ===
  const pwl=getObjects().find(o=>o.id==='photo_wall');
  if(pwl){
    ctx.fillStyle='#1a1a2a';ctx.fillRect(pwl.x,pwl.y,pwl.w,pwl.h);
    // Grid of photos
    const photoData=[
      {label:'Andromeda',bg:'#1a1a3a',accent:'#6644aa'},
      {label:'Pillars',bg:'#0a1a1a',accent:'#2a8866'},
      {label:'Ring Nebula',bg:'#1a0a1a',accent:'#aa4488'},
      {label:'Crab Nebula',bg:'#1a1a0a',accent:'#aa8844'},
      {label:'Eagle',bg:'#0a0a1a',accent:'#4466aa'},
      {label:'Horsehead',bg:'#1a0a0a',accent:'#884422'},
      {label:'Saturn V',bg:'#0a0a14',accent:'#c8a050'},
      {label:'Blue Marble',bg:'#0a1a2a',accent:'#2a6aaa'},
      {label:'Lunar Rise',bg:'#141414',accent:'#aaaaaa'},
    ];
    for(let i=0;i<9;i++){
      const col=i%3,row=Math.floor(i/3);
      const px=pwl.x+12+col*92,py=pwl.y+12+row*190;
      const pd=photoData[i];
      // Photo frame
      ctx.fillStyle='#333';ctx.fillRect(px-2,py-2,84,164);
      ctx.fillStyle=pd.bg;ctx.fillRect(px,py,80,150);
      // Mini procedural space image
      ctx.save();ctx.beginPath();ctx.rect(px,py,80,150);ctx.clip();
      // Stars in photo
      for(let s=0;s<15;s++){
        ctx.fillStyle=`rgba(255,255,255,${.2+Math.sin(s*3)*.15})`;
        ctx.fillRect(px+(s*23+7)%78,py+(s*17+3)%148,1,1);
      }
      // Accent nebula/feature
      const ng=ctx.createRadialGradient(px+40,py+70,0,px+40,py+70,35);
      ng.addColorStop(0,pd.accent+'aa');ng.addColorStop(0.5,pd.accent+'44');ng.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ng;ctx.fillRect(px,py,80,150);
      ctx.restore();
      // Label
      ctx.fillStyle='rgba(180,180,200,.5)';ctx.font='6px monospace';
      ctx.fillText(pd.label,px+4,py+160);
    }
  }

  // === MEDITATION ALCOVE ===
  const med=getObjects().find(o=>o.id==='meditation_alcove');
  if(med){
    // Alcove recess
    ctx.fillStyle='#0a0818';ctx.fillRect(med.x,med.y,med.w,med.h);
    ctx.fillStyle='#12101e';ctx.fillRect(med.x+6,med.y+6,med.w-12,med.h-12);
    // Cushions (3 meditation pillows)
    const cushColors=['#3a2050','#2a3060','#402a50'];
    for(let i=0;i<3;i++){
      const cx=med.x+30+i*55,cy=med.y+med.h/2+10;
      ctx.fillStyle=cushColors[i];ctx.beginPath();ctx.ellipse(cx,cy,18,10,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=cushColors[i].replace(/[2-4]/g,c=>String(+c+1));
      ctx.beginPath();ctx.ellipse(cx,cy-3,14,7,0,0,Math.PI*2);ctx.fill();
    }
    // Candle
    ctx.fillStyle='#ddd0a0';ctx.fillRect(med.x+med.w/2-2,med.y+30,4,14);
    const candleFlicker=.5+Math.sin(t*6)*.3+Math.sin(t*11)*.15;
    ctx.fillStyle=`rgba(255,200,100,${candleFlicker})`;
    ctx.beginPath();ctx.arc(med.x+med.w/2,med.y+28,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(255,200,100,${candleFlicker*.3})`;
    ctx.beginPath();ctx.arc(med.x+med.w/2,med.y+28,10,0,Math.PI*2);ctx.fill();
    // "quiet zone" text
    ctx.fillStyle='rgba(100,80,130,.4)';ctx.font='7px monospace';
    ctx.fillText('quiet zone',med.x+med.w/2-22,med.y-6);
  }

  // === ELEVATOR ===
  const elev=getObjects().find(o=>o.id==='elevator');
  if(elev){
    ctx.fillStyle='#2a2a3a';ctx.fillRect(elev.x,elev.y,elev.w||60,elev.h||80);
    ctx.fillStyle='#3a3a4a';ctx.fillRect(elev.x+4,elev.y+4,(elev.w||60)-8,(elev.h||80)-8);
    ctx.strokeStyle='#555';ctx.lineWidth=2;
    ctx.strokeRect(elev.x+2,elev.y+2,(elev.w||60)-4,(elev.h||80)-4);
    // Arrow indicators
    ctx.fillStyle='rgba(0,255,200,.4)';
    ctx.beginPath();ctx.moveTo(elev.x+30,elev.y-8);ctx.lineTo(elev.x+24,elev.y-2);ctx.lineTo(elev.x+36,elev.y-2);ctx.fill();
  }

  // === GENTLE PARTICLE DRIFT ===
  for(let i=0;i<20;i++){
    const px=((t*.15+i*123)%FW);
    const py=((t*.08+i*197)%FH);
    const pa=.03+Math.sin(t*.5+i*2)*.02;
    ctx.fillStyle=`rgba(150,130,200,${pa})`;
    ctx.beginPath();ctx.arc(px,py,1.5,0,Math.PI*2);ctx.fill();
  }

  // === AMBIENT — cool blue/purple glow ===
  const amb1=ctx.createRadialGradient(FW/2,400,0,FW/2,400,600);
  amb1.addColorStop(0,'rgba(40,20,80,.04)');amb1.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=amb1;ctx.fillRect(0,0,FW,FH);

  const amb2=ctx.createRadialGradient(1200,1000,0,1200,1000,500);
  amb2.addColorStop(0,'rgba(20,10,50,.03)');amb2.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=amb2;ctx.fillRect(0,0,FW,FH);

  // === WALLS ===
  ctx.fillStyle='#0c0c18';ctx.fillRect(0,0,FW,10);ctx.fillRect(0,FH-10,FW,10);
  ctx.fillRect(0,0,10,FH);ctx.fillRect(FW-10,0,10,FH);

  FloorDepth.renderShadows(ctx,2);FloorDepth.renderLightRays(ctx,2);
}

// ═══════════════════════════════════════════════════════════════
// FLOOR 3: THE ARCADE — 2400×1400
// Japanese game center. Neon everywhere. Dark carpet. Glowing
// cabinets, token machine, prize shelf, duel arena, jukebox.
// ═══════════════════════════════════════════════════════════════
function renderFloor3(){
  const FW=2400, FH=1400;
  const t=S.time;
  const seed=(x,y)=>((x*2654435761)^(y*2246822519))>>>0;

  // === CARPET FLOOR — dark checkerboard with diamond pattern ===
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,FW,FH);
  for(let py=0;py<FH;py+=24)for(let px=0;px<FW;px+=24){
    const s=seed(px,py);const shade=s%4;
    const checker=((px/24+py/24)%2===0);
    ctx.fillStyle=checker?`rgb(${14+shade},${12+shade},${22+shade})`:`rgb(${18+shade},${16+shade},${26+shade})`;
    ctx.fillRect(px,py,24,24);
  }
  // Diamond pattern overlay
  for(let py=0;py<FH;py+=48)for(let px=0;px<FW;px+=48){
    const s=seed(px+1,py+1);
    const dc=['rgba(255,0,100,.03)','rgba(0,200,255,.03)','rgba(255,200,0,.03)','rgba(0,255,100,.03)'][s%4];
    ctx.fillStyle=dc;ctx.save();ctx.translate(px+24,py+24);ctx.rotate(Math.PI/4);
    ctx.fillRect(-8,-8,16,16);ctx.restore();
  }

  // === WALLS — dark with neon trim ===
  ctx.fillStyle='#08080e';ctx.fillRect(0,0,FW,50);// ceiling
  ctx.fillStyle='#08080e';ctx.fillRect(0,FH-16,FW,16);// base
  ctx.fillStyle='#08080e';ctx.fillRect(0,0,16,FH);// left
  ctx.fillStyle='#08080e';ctx.fillRect(FW-16,0,16,FH);// right

  // === NEON STRIP LIGHTING — ceiling and floor edges ===
  const neonCycle=t*3;
  for(let i=0;i<FW;i+=6){
    const hue=(neonCycle+i*.5)%360;
    const r=Math.floor(128+127*Math.sin(hue*Math.PI/180));
    const g=Math.floor(128+127*Math.sin((hue+120)*Math.PI/180));
    const b=Math.floor(128+127*Math.sin((hue+240)*Math.PI/180));
    const a=.15+Math.sin(t*5+i*.02)*.05;
    ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
    ctx.fillRect(16+i,48,6,3);// ceiling strip
    ctx.fillRect(16+i,FH-18,6,3);// floor strip
  }
  // Side neon strips
  for(let i=0;i<FH;i+=6){
    const hue=(neonCycle+i*.5+180)%360;
    const r=Math.floor(128+127*Math.sin(hue*Math.PI/180));
    const g=Math.floor(128+127*Math.sin((hue+120)*Math.PI/180));
    const b=Math.floor(128+127*Math.sin((hue+240)*Math.PI/180));
    ctx.fillStyle=`rgba(${r},${g},${b},.1)`;
    ctx.fillRect(14,i,3,6);ctx.fillRect(FW-17,i,3,6);
  }

  // === NEON SIGNS — 6+ pulsing signs ===
  const neonSigns=[
    {text:'GAME ON',x:300,y:35,color:'#00ff88',size:16},
    {text:'HIGH SCORE',x:700,y:35,color:'#ffd700',size:14},
    {text:'INSERT COIN',x:1100,y:35,color:'#ff6ec7',size:14},
    {text:'PLAYER 1',x:1500,y:35,color:'#00ccff',size:14},
    {text:'FIGHT!',x:1900,y:35,color:'#ff4444',size:18},
    {text:'ARCADE',x:2200,y:35,color:'#aa44ff',size:16},
  ];
  neonSigns.forEach((n,i)=>{
    const glow=.6+Math.sin(t*2.5+i*1.2)*.35;
    const flicker=Math.sin(t*17+i*7)>.95?.3:0;// occasional flicker
    ctx.save();
    ctx.fillStyle=n.color;ctx.globalAlpha=glow+flicker;
    ctx.shadowColor=n.color;ctx.shadowBlur=20;
    ctx.font=`bold ${n.size}px monospace`;ctx.textAlign='center';
    ctx.fillText(n.text,n.x,n.y);
    // Double-draw for glow intensity
    ctx.shadowBlur=8;ctx.fillText(n.text,n.x,n.y);
    ctx.restore();
  });

  // === HELPER: Draw arcade cabinet ===
  function drawCabinet(o,screenColor,screenArt,label){
    if(!o)return;
    const cx=o.x,cy=o.y,cw=o.w||80,ch=o.h||100;
    // Cabinet body
    ctx.fillStyle='#1a1030';ctx.fillRect(cx,cy,cw,ch);
    ctx.fillStyle='#2a1a44';ctx.fillRect(cx+2,cy+2,cw-4,ch-4);
    // Top marquee
    ctx.fillStyle=screenColor;ctx.globalAlpha=.8;ctx.fillRect(cx+4,cy+4,cw-8,14);
    ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.font='bold 8px monospace';
    ctx.textAlign='center';ctx.fillText(label,cx+cw/2,cy+14);ctx.textAlign='left';
    // Screen area
    ctx.fillStyle='#0a0a0a';ctx.fillRect(cx+6,cy+22,cw-12,ch-50);
    // Screen glow
    const sg=ctx.createRadialGradient(cx+cw/2,cy+22+(ch-50)/2,0,cx+cw/2,cy+22+(ch-50)/2,cw/2);
    sg.addColorStop(0,screenColor+'44');sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg;ctx.fillRect(cx+6,cy+22,cw-12,ch-50);
    // Screen art (pixel drawings)
    ctx.save();ctx.beginPath();ctx.rect(cx+8,cy+24,cw-16,ch-54);ctx.clip();
    screenArt(cx+8,cy+24,cw-16,ch-54);
    ctx.restore();
    // CRT scanlines
    for(let ly=cy+22;ly<cy+ch-28;ly+=3){
      ctx.fillStyle='rgba(0,0,0,.1)';ctx.fillRect(cx+6,ly,cw-12,1);
    }
    // Screen flicker
    if(Math.sin(t*13+o.x)>.97){ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(cx+6,cy+22,cw-12,ch-50)}
    // Control panel
    ctx.fillStyle='#1a1a2a';ctx.fillRect(cx+4,cy+ch-26,cw-8,22);
    // Joystick
    ctx.fillStyle='#333';ctx.fillRect(cx+cw/2-4,cy+ch-22,8,2);
    ctx.fillStyle='#555';ctx.beginPath();ctx.arc(cx+cw/2,cy+ch-18,4,0,Math.PI*2);ctx.fill();
    // Buttons
    ctx.fillStyle='#cc2244';ctx.beginPath();ctx.arc(cx+cw/2+16,cy+ch-16,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2244cc';ctx.beginPath();ctx.arc(cx+cw/2+28,cy+ch-14,4,0,Math.PI*2);ctx.fill();
    // Cabinet glow on floor
    const fg=ctx.createRadialGradient(cx+cw/2,cy+ch+5,0,cx+cw/2,cy+ch+5,cw);
    fg.addColorStop(0,screenColor+'11');fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fg;ctx.fillRect(cx-cw/2,cy+ch,cw*2,cw);
  }

  // === ARCADE CABINETS ===
  // Snake
  drawCabinet(getObjects().find(o=>o.id==='arcade_snake'),'#00ff88',function(sx,sy,sw,sh){
    ctx.fillStyle='#00ff88';
    const snakeLen=8;for(let i=0;i<snakeLen;i++){
      const bx=sx+20+i*6+Math.sin(t*.5+i)*.5;
      const by=sy+sh/2+Math.sin(i*.8)*4;
      ctx.fillRect(bx,by,5,5);
    }
    // Apple
    ctx.fillStyle='#ff4444';ctx.fillRect(sx+sw-20,sy+sh/2-8,5,5);
  },'SNAKE');

  // Breakout
  drawCabinet(getObjects().find(o=>o.id==='arcade_breakout'),'#ff6ec7',function(sx,sy,sw,sh){
    // Brick rows
    const brickColors=['#ff4444','#ffaa00','#ffff00','#00ff88','#4488ff'];
    for(let row=0;row<5;row++)for(let col=0;col<6;col++){
      if(Math.sin(t*.1+row*3+col*7)>.2){
        ctx.fillStyle=brickColors[row];ctx.fillRect(sx+4+col*(sw-8)/6,sy+4+row*8,((sw-8)/6)-2,6);
      }
    }
    // Paddle
    ctx.fillStyle='#fff';ctx.fillRect(sx+sw/2-10+Math.sin(t)*8,sy+sh-10,20,4);
    // Ball
    ctx.fillStyle='#fff';ctx.fillRect(sx+sw/2+Math.sin(t*2)*12,sy+sh-20+Math.cos(t*3)*5,3,3);
  },'BREAKOUT');

  // Space Invaders
  drawCabinet(getObjects().find(o=>o.id==='arcade_invaders'),'#4488ff',function(sx,sy,sw,sh){
    // Invader grid (pixel art invaders)
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){
      const ix=sx+8+col*12+Math.sin(t*.8)*3,iy=sy+8+row*14;
      ctx.fillStyle='#4488ff';
      // Simple invader shape
      ctx.fillRect(ix+2,iy,4,2);ctx.fillRect(ix,iy+2,8,2);
      ctx.fillRect(ix+1,iy+4,2,2);ctx.fillRect(ix+5,iy+4,2,2);
    }
    // Player ship
    ctx.fillStyle='#00ff88';ctx.fillRect(sx+sw/2-3,sy+sh-8,6,4);
    ctx.fillRect(sx+sw/2-1,sy+sh-10,2,2);
  },'INVADERS');

  // Racing
  const raceCab=getObjects().find(o=>o.id==='arcade_racing');
  drawCabinet(raceCab,'#ff8800',function(sx,sy,sw,sh){
    // Road perspective
    ctx.fillStyle='#333';ctx.fillRect(sx,sy+sh/3,sw,sh*2/3);
    // Road lines scrolling
    for(let i=0;i<6;i++){
      const ly=sy+sh/3+i*10+(t*2)%10;
      const lw=2+i*.4;
      if(ly<sy+sh)ctx.fillStyle='#fff',ctx.fillRect(sx+sw/2-lw/2,ly,lw,4);
    }
    // Car
    ctx.fillStyle='#ff4444';ctx.fillRect(sx+sw/2-4+Math.sin(t)*3,sy+sh-16,8,12);
    // Speed lines
    ctx.fillStyle='rgba(255,255,255,.2)';
    ctx.fillRect(sx+10,sy+sh-6-(t*3)%sh,1,8);
    ctx.fillRect(sx+sw-10,sy+sh-6-(t*3+20)%sh,1,8);
  },'RACING');

  // Rhythm
  const rhythmCab=getObjects().find(o=>o.id==='arcade_rhythm');
  drawCabinet(rhythmCab,'#ff44ff',function(sx,sy,sw,sh){
    // DDR arrows falling
    const arrows=['←','↓','↑','→'];
    const cols=[sx+6,sx+sw/4+2,sx+sw/2-2,sx+sw*3/4-6];
    const arrowColors=['#ff4444','#44ff44','#4444ff','#ffff44'];
    for(let c=0;c<4;c++){
      // Target zone
      ctx.fillStyle=`rgba(${c===0?255:c===3?255:100},${c===1?255:c===3?255:100},${c===2?255:100},.15)`;
      ctx.fillRect(cols[c],sy+sh-14,sw/4-4,10);
      // Falling arrows
      for(let a=0;a<3;a++){
        const ay=sy+((t*2+c*13+a*30)%sh);
        ctx.fillStyle=arrowColors[c];ctx.font='8px monospace';
        ctx.fillText(arrows[c],cols[c]+2,ay);
      }
    }
  },'RHYTHM');

  // Fighting
  const fightCab=getObjects().find(o=>o.id==='arcade_fighting');
  drawCabinet(fightCab,'#ff4444',function(sx,sy,sw,sh){
    // Two fighters
    const f1x=sx+sw/4,f2x=sx+sw*3/4;
    const fy=sy+sh-20;
    // Fighter 1 (blue)
    ctx.fillStyle='#4488ff';ctx.fillRect(f1x-4,fy-12,8,12);ctx.fillRect(f1x-3,fy-16,6,4);
    // Fighter 2 (red)
    ctx.fillStyle='#ff4444';ctx.fillRect(f2x-4,fy-12,8,12);ctx.fillRect(f2x-3,fy-16,6,4);
    // Health bars
    ctx.fillStyle='#ff4444';ctx.fillRect(sx+4,sy+4,sw/2-6,4);
    ctx.fillStyle='#4488ff';ctx.fillRect(sx+sw/2+2,sy+4,sw/2-6,4);
    // Hit effect
    if(Math.sin(t*4)>.7){
      ctx.fillStyle='rgba(255,255,0,.3)';ctx.font='12px monospace';
      ctx.fillText('POW!',sx+sw/2-12,sy+sh/2);
    }
  },'FIGHTER');

  // === TOKEN MACHINE ===
  const tok=getObjects().find(o=>o.id==='token_machine');
  if(tok){
    ctx.fillStyle='#2a2a3a';ctx.fillRect(tok.x,tok.y,tok.w,tok.h);
    ctx.fillStyle='#3a3a4a';ctx.fillRect(tok.x+4,tok.y+4,tok.w-8,tok.h-8);
    // Coin slot
    ctx.fillStyle='#111';ctx.fillRect(tok.x+tok.w/2-6,tok.y+15,12,4);
    ctx.fillStyle='#ffd700';ctx.fillRect(tok.x+tok.w/2-4,tok.y+15,8,3);
    // Token output tray
    ctx.fillStyle='#1a1a2a';ctx.fillRect(tok.x+8,tok.y+tok.h-25,tok.w-16,15);
    // Animated coin dropping
    const coinPhase=(t%60)/60;
    if(coinPhase<0.1){
      const coinY=tok.y+20+coinPhase*10*(tok.h-45);
      ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(tok.x+tok.w/2,coinY,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ccaa00';ctx.beginPath();ctx.arc(tok.x+tok.w/2,coinY,2,0,Math.PI*2);ctx.fill();
    }
    // Tokens in tray
    for(let i=0;i<4;i++){
      ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(tok.x+14+i*10,tok.y+tok.h-18,4,0,Math.PI*2);ctx.fill();
    }
    // Label
    ctx.fillStyle='#ffd700';ctx.font='bold 7px monospace';ctx.textAlign='center';
    ctx.fillText('TOKENS',tok.x+tok.w/2,tok.y-4);ctx.textAlign='left';
    // Neon trim
    const tokGlow=.4+Math.sin(t*3)*.2;
    ctx.strokeStyle=`rgba(255,215,0,${tokGlow})`;ctx.lineWidth=1;
    ctx.strokeRect(tok.x+1,tok.y+1,tok.w-2,tok.h-2);
  }

  // === PRIZE SHELF — actual pixel art prizes ===
  const prize=getObjects().find(o=>o.id==='prize_shelf');
  if(prize){
    // Shelf structure
    ctx.fillStyle='#2a1a0a';ctx.fillRect(prize.x,prize.y,prize.w,prize.h);
    ctx.fillStyle='#3a2a1a';ctx.fillRect(prize.x+4,prize.y+4,prize.w-8,prize.h-8);
    // 4 shelf rows
    for(let row=0;row<4;row++){
      const sy=prize.y+20+row*70;
      ctx.fillStyle='#4a3a2a';ctx.fillRect(prize.x+6,sy+50,prize.w-12,4);// shelf board
    }
    // Prizes — pixel art
    const prizeItems=[
      // Row 0: Teddy bears
      function(px,py){
        ctx.fillStyle='#aa7744';ctx.fillRect(px,py+6,12,14);// body
        ctx.beginPath();ctx.arc(px+6,py+4,6,0,Math.PI*2);ctx.fill();// head
        ctx.fillStyle='#886633';ctx.beginPath();ctx.arc(px,py+2,3,0,Math.PI*2);ctx.fill();// ear
        ctx.beginPath();ctx.arc(px+12,py+2,3,0,Math.PI*2);ctx.fill();// ear
        ctx.fillStyle='#222';ctx.fillRect(px+3,py+2,2,2);ctx.fillRect(px+7,py+2,2,2);// eyes
        ctx.fillStyle='#553322';ctx.fillRect(px+5,py+5,2,1);// nose
      },
      function(px,py){// pink bear
        ctx.fillStyle='#dd88aa';ctx.fillRect(px,py+6,12,14);
        ctx.beginPath();ctx.arc(px+6,py+4,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#cc7799';ctx.beginPath();ctx.arc(px,py+2,3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(px+12,py+2,3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#222';ctx.fillRect(px+3,py+2,2,2);ctx.fillRect(px+7,py+2,2,2);
      },
      // Row 1: Figures / action figures
      function(px,py){// robot figure
        ctx.fillStyle='#888';ctx.fillRect(px+2,py+8,8,12);// body
        ctx.fillStyle='#aaa';ctx.fillRect(px+3,py+2,6,6);// head
        ctx.fillStyle='#f00';ctx.fillRect(px+5,py+3,2,2);// eye
        ctx.fillStyle='#666';ctx.fillRect(px,py+10,3,8);ctx.fillRect(px+9,py+10,3,8);// arms
        ctx.fillRect(px+3,py+20,3,4);ctx.fillRect(px+7,py+20,3,4);// legs
      },
      function(px,py){// cat figure
        ctx.fillStyle='#ffaa44';ctx.fillRect(px+2,py+8,8,10);
        ctx.beginPath();ctx.arc(px+6,py+6,5,0,Math.PI*2);ctx.fillStyle='#ffaa44';ctx.fill();
        // Ears (triangles)
        ctx.fillStyle='#ffaa44';ctx.beginPath();ctx.moveTo(px+2,py+2);ctx.lineTo(px,py-2);ctx.lineTo(px+4,py+2);ctx.fill();
        ctx.beginPath();ctx.moveTo(px+8,py+2);ctx.lineTo(px+12,py-2);ctx.lineTo(px+10,py+2);ctx.fill();
        ctx.fillStyle='#222';ctx.fillRect(px+4,py+4,1,2);ctx.fillRect(px+7,py+4,1,2);
        ctx.fillStyle='#ff6688';ctx.fillRect(px+5,py+6,2,1);
      },
      // Row 2: Keychains
      function(px,py){// star keychain
        ctx.fillStyle='#ffd700';
        ctx.beginPath();
        for(let i=0;i<5;i++){
          const a=i*Math.PI*2/5-Math.PI/2;
          const r1=8,r2=3;
          ctx.lineTo(px+6+Math.cos(a)*r1,py+10+Math.sin(a)*r1);
          const a2=a+Math.PI/5;
          ctx.lineTo(px+6+Math.cos(a2)*r2,py+10+Math.sin(a2)*r2);
        }ctx.fill();
        ctx.fillStyle='#aaa';ctx.fillRect(px+5,py,2,4);// ring
      },
      function(px,py){// heart keychain
        ctx.fillStyle='#ff4466';
        ctx.beginPath();ctx.arc(px+4,py+8,4,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(px+10,py+8,4,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(px,py+10);ctx.lineTo(px+7,py+18);ctx.lineTo(px+14,py+10);ctx.fill();
        ctx.fillStyle='#aaa';ctx.fillRect(px+6,py,2,4);
      },
    ];
    // Place prizes on shelves
    for(let row=0;row<4;row++){
      const sy=prize.y+22+row*70;
      for(let col=0;col<3;col++){
        const px=prize.x+20+col*60;
        const pi=(row*3+col)%prizeItems.length;
        prizeItems[pi](px,sy+8);
      }
    }
    // "PRIZES" neon sign
    ctx.save();ctx.fillStyle='#ff6ec7';
    ctx.shadowColor='#ff6ec7';ctx.shadowBlur=12;
    ctx.font='bold 12px monospace';ctx.textAlign='center';
    ctx.fillText('PRIZES',prize.x+prize.w/2,prize.y-8);
    ctx.restore();
  }

  // === DUEL ARENA — huge glowing circle ===
  const arena=getObjects().find(o=>o.id==='duel_arena');
  if(arena){
    const acx=arena.x+arena.w/2,acy=arena.y+arena.h/2,ar=150;
    const glowPulse=.5+Math.sin(t*1.5)*.3;

    // Arena dark floor
    ctx.fillStyle='#0a0a1a';ctx.beginPath();ctx.arc(acx,acy,ar+10,0,Math.PI*2);ctx.fill();

    // Outer glow ring
    ctx.strokeStyle=`rgba(0,255,200,${glowPulse*.4})`;ctx.lineWidth=6;
    ctx.beginPath();ctx.arc(acx,acy,ar,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(0,255,200,${glowPulse*.2})`;ctx.lineWidth=12;
    ctx.beginPath();ctx.arc(acx,acy,ar+6,0,Math.PI*2);ctx.stroke();

    // Inner ring
    ctx.strokeStyle=`rgba(255,60,200,${glowPulse*.5})`;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(acx,acy,ar-15,0,Math.PI*2);ctx.stroke();

    // Cross pattern inside
    ctx.strokeStyle=`rgba(100,150,255,${glowPulse*.2})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(acx-ar+20,acy);ctx.lineTo(acx+ar-20,acy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(acx,acy-ar+20);ctx.lineTo(acx,acy+ar-20);ctx.stroke();

    // Energy bolts (rotating)
    for(let i=0;i<8;i++){
      const ba=t*2+i*Math.PI/4;
      const br1=ar-25,br2=ar-5;
      const x1=acx+Math.cos(ba)*br1,y1=acy+Math.sin(ba)*br1;
      const x2=acx+Math.cos(ba)*br2,y2=acy+Math.sin(ba)*br2;
      ctx.strokeStyle=`rgba(150,200,255,${.3+Math.sin(t*5+i)*.2})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x1,y1);
      // Zigzag bolt
      const mx=(x1+x2)/2+Math.sin(t*7+i)*5,my=(y1+y2)/2+Math.cos(t*7+i)*5;
      ctx.lineTo(mx,my);ctx.lineTo(x2,y2);ctx.stroke();
    }

    // Arena glow on surroundings
    const arGlow=ctx.createRadialGradient(acx,acy,ar-20,acx,acy,ar+80);
    arGlow.addColorStop(0,'rgba(0,255,200,.03)');arGlow.addColorStop(0.5,'rgba(100,50,200,.02)');
    arGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=arGlow;ctx.beginPath();ctx.arc(acx,acy,ar+80,0,Math.PI*2);ctx.fill();

    // Spectator seats (bleachers around arena)
    for(let i=0;i<16;i++){
      const sa=i*Math.PI*2/16;
      const sdist=ar+30+Math.floor(i%3)*20;
      const bx=acx+Math.cos(sa)*sdist,by=acy+Math.sin(sa)*sdist;
      ctx.fillStyle='#2a2040';ctx.fillRect(bx-8,by-5,16,10);
      ctx.fillStyle='#3a3050';ctx.fillRect(bx-6,by-3,12,6);
    }

    // ARENA neon sign
    ctx.save();
    ctx.fillStyle=`rgba(255,60,200,${glowPulse+.2})`;
    ctx.shadowColor='#ff3cc8';ctx.shadowBlur=25;
    ctx.font='bold 22px monospace';ctx.textAlign='center';
    ctx.fillText('ARENA',acx,arena.y-20);
    ctx.restore();
  }

  // === DUEL LEADERBOARD ===
  const dlb=getObjects().find(o=>o.id==='duel_leaderboard');
  if(dlb){
    ctx.fillStyle='#1a0a2a';ctx.fillRect(dlb.x,dlb.y,dlb.w,dlb.h);
    ctx.strokeStyle='#ff6ec7';ctx.lineWidth=2;ctx.strokeRect(dlb.x,dlb.y,dlb.w,dlb.h);
    // Header
    ctx.fillStyle='#ff6ec7';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('CHAMPIONS',dlb.x+dlb.w/2,dlb.y+16);
    // Rank lines
    ctx.font='7px monospace';ctx.textAlign='left';
    const ranks=['1st Champion','2nd Warrior','3rd Fighter','4th Rookie','5th Novice'];
    ranks.forEach((r,i)=>{
      ctx.fillStyle=i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'#888';
      ctx.fillText(r,dlb.x+8,dlb.y+34+i*16);
    });
    ctx.textAlign='left';
    // Pulsing border
    const lbGlow=.3+Math.sin(t*2)*.15;
    ctx.strokeStyle=`rgba(255,110,199,${lbGlow})`;ctx.lineWidth=1;
    ctx.strokeRect(dlb.x-1,dlb.y-1,dlb.w+2,dlb.h+2);
  }

  // === POPCORN MACHINE ===
  const pop=getObjects().find(o=>o.id==='popcorn_machine');
  if(pop){
    // Machine body
    ctx.fillStyle='#cc2222';ctx.fillRect(pop.x,pop.y,pop.w,pop.h);
    ctx.fillStyle='#dd3333';ctx.fillRect(pop.x+4,pop.y+4,pop.w-8,pop.h/2);
    // Glass window
    ctx.fillStyle='rgba(255,240,200,.15)';ctx.fillRect(pop.x+6,pop.y+6,pop.w-12,pop.h/2-4);
    // Popcorn inside
    for(let i=0;i<8;i++){
      ctx.fillStyle='#fff8cc';
      ctx.beginPath();ctx.arc(pop.x+10+Math.sin(i*5)*8,pop.y+12+i*3,3,0,Math.PI*2);ctx.fill();
    }
    // Popping kernel particles
    for(let i=0;i<4;i++){
      const kPhase=(t*2+i*15)%60;
      if(kPhase<20){
        const ky=pop.y+10-kPhase*.8;
        const kx=pop.x+pop.w/2+Math.sin(t*3+i*4)*8;
        ctx.fillStyle=`rgba(255,248,200,${1-kPhase/20})`;
        ctx.beginPath();ctx.arc(kx,ky,2,0,Math.PI*2);ctx.fill();
      }
    }
    // Label stripe
    ctx.fillStyle='#ffcc00';ctx.fillRect(pop.x,pop.y+pop.h/2,pop.w,4);
    ctx.fillStyle='#fff';ctx.font='5px monospace';ctx.textAlign='center';
    ctx.fillText('POP',pop.x+pop.w/2,pop.y+pop.h-6);ctx.textAlign='left';
  }

  // === JUKEBOX ===
  const juke=getObjects().find(o=>o.id==='jukebox');
  if(juke){
    // Body
    ctx.fillStyle='#6a2a2a';ctx.fillRect(juke.x,juke.y,juke.w,juke.h);
    ctx.fillStyle='#8a3a3a';ctx.fillRect(juke.x+4,juke.y+4,juke.w-8,juke.h-8);
    // Top dome
    ctx.fillStyle='#aa4a4a';
    ctx.beginPath();ctx.arc(juke.x+juke.w/2,juke.y+4,juke.w/2-2,Math.PI,0);ctx.fill();
    // Colorful display
    const jGlow=.5+Math.sin(t*2)*.3;
    ctx.fillStyle=`rgba(255,220,100,${jGlow})`;ctx.fillRect(juke.x+8,juke.y+12,juke.w-16,18);
    // Record slot lines
    for(let i=0;i<3;i++){
      ctx.fillStyle='#333';ctx.fillRect(juke.x+10,juke.y+35+i*10,juke.w-20,6);
      ctx.fillStyle='#555';ctx.fillRect(juke.x+12,juke.y+36+i*10,juke.w-24,4);
    }
    // Music notes floating
    for(let i=0;i<3;i++){
      const nx=juke.x+juke.w/2+Math.sin(t+i*2)*15;
      const ny=juke.y-10-i*8-Math.sin(t*.5+i)*5;
      const na=.4-i*.12;
      ctx.fillStyle=`rgba(255,200,100,${na})`;ctx.font='10px serif';
      ctx.fillText(['♪','♫','♪'][i],nx,ny);
    }
    // Speaker grill
    ctx.fillStyle='#4a2020';
    for(let gy=juke.y+juke.h-20;gy<juke.y+juke.h-4;gy+=3){
      ctx.fillRect(juke.x+8,gy,juke.w-16,1);
    }
  }

  // === PINBALL BUMPER LIGHTS on floor edges ===
  for(let i=0;i<20;i++){
    const bx=80+i*115,by=FH-30;
    const on=Math.sin(t*4+i*1.3)>.3;
    ctx.fillStyle=on?`rgba(255,60,120,.6)`:'rgba(60,20,30,.3)';
    ctx.beginPath();ctx.arc(bx,by,4,0,Math.PI*2);ctx.fill();
    if(on){
      ctx.fillStyle='rgba(255,60,120,.15)';
      ctx.beginPath();ctx.arc(bx,by,10,0,Math.PI*2);ctx.fill();
    }
  }

  // === ELEVATOR ===
  const elev=getObjects().find(o=>o.id==='elevator');
  if(elev){
    ctx.fillStyle='#2a2a3a';ctx.fillRect(elev.x,elev.y,elev.w||60,elev.h||80);
    ctx.fillStyle='#3a3a4a';ctx.fillRect(elev.x+4,elev.y+4,(elev.w||60)-8,(elev.h||80)-8);
    ctx.strokeStyle='#555';ctx.lineWidth=2;
    ctx.strokeRect(elev.x+2,elev.y+2,(elev.w||60)-4,(elev.h||80)-4);
    ctx.fillStyle='rgba(0,255,200,.4)';
    ctx.beginPath();ctx.moveTo(elev.x+30,elev.y-8);ctx.lineTo(elev.x+24,elev.y-2);ctx.lineTo(elev.x+36,elev.y-2);ctx.fill();
  }

  // === AMBIENT — dark room lit by screens and neon ===
  // Screen glow pools
  ['arcade_snake','arcade_breakout','arcade_invaders','arcade_racing','arcade_rhythm','arcade_fighting'].forEach(id=>{
    const cab=getObjects().find(o=>o.id===id);if(!cab)return;
    const gx=cab.x+(cab.w||80)/2,gy=cab.y+(cab.h||100)/2;
    const gc=['#00ff88','#ff6ec7','#4488ff','#ff8800','#ff44ff','#ff4444'][
      ['arcade_snake','arcade_breakout','arcade_invaders','arcade_racing','arcade_rhythm','arcade_fighting'].indexOf(id)];
    const ag=ctx.createRadialGradient(gx,gy,0,gx,gy,120);
    ag.addColorStop(0,gc+'0a');ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ag;ctx.fillRect(gx-120,gy-120,240,240);
  });

  // Render arena spectators if available
  if(typeof ArenaSpectator!=='undefined')ArenaSpectator.render(ctx);

  FloorDepth.renderShadows(ctx,3);FloorDepth.renderLightRays(ctx,3);
}

// ═══════════════════════════════════════════════════════════════
// FLOOR 4: GARDEN BIODOME — 2000×1400
// Alien botanical garden. Glass dome, layered vegetation, waterfall,
// bioluminescent mushrooms, koi pond, butterflies, fireflies.
// ═══════════════════════════════════════════════════════════════
function renderFloor4(){
  const FW=2000, FH=1400;
  const t=S.time;
  const seed=(x,y)=>((x*2654435761)^(y*2246822519))>>>0;

  // === GROUND — rich organic earth ===
  for(let py=300;py<FH;py+=8)for(let px=0;px<FW;px+=8){
    const s=seed(px,py);const r=35+(s%20),g=42+(s%16),b=22+(s%10);
    ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(px,py,8,8);
    if(s%11===0){ctx.fillStyle='rgba(60,50,30,.3)';ctx.fillRect(px+s%5,py+s%4,3,2)}
    if(s%17===0){ctx.fillStyle='rgba(40,55,25,.3)';ctx.fillRect(px+s%6,py+s%5,1,4)}
  }
  // Grass texture overlay
  for(let px=0;px<FW;px+=12){
    const gh=3+seed(px,1)%4;
    const gx=px+seed(px,2)%8;
    ctx.fillStyle='rgba(50,80,40,.2)';ctx.fillRect(gx,300-gh,2,gh);
  }

  // === GLASS DOME (top 300px) — star field + dome curve ===
  ctx.fillStyle='#020410';ctx.fillRect(0,0,FW,300);
  // Stars through dome
  for(let i=0;i<60;i++){
    const sx=(i*173+23)%FW,sy=(i*97+11)%290;
    const a=.15+Math.sin(t*.7+i*1.1)*.1;
    ctx.fillStyle=`rgba(200,210,240,${a})`;ctx.fillRect(sx,sy,1,1);
  }
  for(let i=0;i<20;i++){
    const sx=(i*251+47)%FW,sy=(i*131+29)%280;
    const a=.35+Math.sin(t*1.2+i*.9)*.2;
    ctx.fillStyle=`rgba(240,240,255,${a})`;ctx.fillRect(sx,sy,i%5===0?2:1,i%5===0?2:1);
  }
  // Dome glass curve
  ctx.strokeStyle='rgba(160,200,220,.12)';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(FW/2,-700,1050,0.2,Math.PI-0.2);ctx.stroke();
  ctx.strokeStyle='rgba(160,200,220,.06)';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(FW/2,-700,1065,0.2,Math.PI-0.2);ctx.stroke();
  // Dome ribs
  for(let i=0;i<8;i++){
    const a=0.2+i*(Math.PI-0.4)/7;
    ctx.strokeStyle='rgba(160,200,220,.05)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(FW/2,-700);
    ctx.lineTo(FW/2+Math.cos(a)*1050,-700+Math.sin(a)*1050);ctx.stroke();
  }
  // Rain on glass (occasional)
  const rainPhase=(t%3000)/3000;
  if(rainPhase<0.3){
    for(let i=0;i<15;i++){
      const rx=(i*157+t*.3)%FW;
      const ry=(t*1.5+i*90)%300;
      ctx.fillStyle=`rgba(150,180,220,${.08+Math.sin(t+i)*.04})`;
      ctx.fillRect(rx,ry,1,4);
    }
  }
  // Transition: dome bottom edge foliage silhouette
  for(let px=0;px<FW;px+=30){
    const h=15+seed(px,999)%20;
    ctx.fillStyle='rgba(20,40,15,.6)';
    ctx.beginPath();ctx.arc(px+15,300,h,Math.PI,0);ctx.fill();
  }

  // === TROPICAL ZONE (left area) — palm trees, vines, flowers ===
  const trop=getObjects().find(o=>o.id==='tropical_zone');
  if(trop){
    // Dense undergrowth
    for(let i=0;i<20;i++){
      const bx=trop.x+seed(i*77,0)%trop.w,by=trop.y+trop.h-20-seed(i*33,1)%60;
      ctx.fillStyle=`rgba(${30+seed(i,5)%30},${60+seed(i,6)%40},${25+seed(i,7)%20},.5)`;
      ctx.beginPath();ctx.ellipse(bx,by,8+seed(i,8)%10,5+seed(i,9)%6,0,0,Math.PI*2);ctx.fill();
    }
    // Palm trees (5 trees with trunks + layered fronds)
    const palms=[
      {x:trop.x+80,y:trop.y+trop.h-20,h:180},
      {x:trop.x+200,y:trop.y+trop.h-30,h:200},
      {x:trop.x+350,y:trop.y+trop.h-10,h:160},
      {x:trop.x+480,y:trop.y+trop.h-25,h:190},
      {x:trop.x+150,y:trop.y+trop.h-5,h:140},
    ];
    palms.forEach((p,pi)=>{
      // Trunk (slightly curved)
      const sway=Math.sin(t*.3+pi)*3;
      ctx.strokeStyle='#5a4030';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(p.x,p.y);
      ctx.quadraticCurveTo(p.x+sway*2,p.y-p.h/2,p.x+sway*4,p.y-p.h);ctx.stroke();
      ctx.strokeStyle='#6a5040';ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(p.x,p.y);
      ctx.quadraticCurveTo(p.x+sway*2,p.y-p.h/2,p.x+sway*4,p.y-p.h);ctx.stroke();
      // Trunk texture (horizontal bands)
      for(let j=0;j<p.h;j+=12){
        const tx=p.x+sway*4*(j/p.h);
        ctx.fillStyle='rgba(80,60,40,.2)';ctx.fillRect(tx-3,p.y-j,6,2);
      }
      // Fronds (8 per tree, radiating)
      const topX=p.x+sway*4,topY=p.y-p.h;
      for(let f=0;f<8;f++){
        const fa=f*Math.PI/4+Math.sin(t*.4+pi+f)*.15;
        const fLen=40+seed(pi*8+f,3)%30;
        ctx.strokeStyle='#2a6a2a';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(topX,topY);
        const fx=topX+Math.cos(fa)*fLen,fy=topY+Math.sin(fa)*fLen+Math.abs(Math.sin(fa))*15;
        ctx.quadraticCurveTo(topX+Math.cos(fa)*fLen*.6,topY+Math.sin(fa)*fLen*.4,fx,fy);
        ctx.stroke();
        // Leaf segments along frond
        for(let l=0;l<5;l++){
          const lt=l/5;
          const lx=topX+(fx-topX)*lt,ly=topY+(fy-topY)*lt;
          ctx.fillStyle=l<3?'#3a8a3a':'#2a7a2a';
          ctx.save();ctx.translate(lx,ly);ctx.rotate(fa+Math.PI/3);
          ctx.beginPath();ctx.ellipse(0,0,8-l,3,0,0,Math.PI*2);ctx.fill();
          ctx.restore();
          ctx.save();ctx.translate(lx,ly);ctx.rotate(fa-Math.PI/3);
          ctx.beginPath();ctx.ellipse(0,0,8-l,3,0,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
      }
      // Coconuts
      if(pi<3){
        ctx.fillStyle='#5a3a1a';
        ctx.beginPath();ctx.arc(topX+3,topY+5,4,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(topX-4,topY+6,3,0,Math.PI*2);ctx.fill();
      }
    });
    // Hanging vines from dome edge
    for(let i=0;i<10;i++){
      const vx=trop.x+30+i*60+Math.sin(i*5)*15;
      const vLen=60+seed(i,100)%50;
      ctx.strokeStyle='#2a5a2a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(vx,trop.y);
      for(let j=0;j<vLen;j+=6){
        ctx.lineTo(vx+Math.sin(t*.4+i+j*.08)*4,trop.y+j);
      }ctx.stroke();
      // Vine leaves
      for(let j=10;j<vLen;j+=15){
        ctx.fillStyle='#3a7a3a';
        ctx.beginPath();ctx.ellipse(vx+Math.sin(t*.4+i+j*.08)*4,trop.y+j,4,2,Math.sin(j)*.5,0,Math.PI*2);ctx.fill();
      }
    }
    // Large tropical flowers
    const flowerPositions=[{x:trop.x+120,y:trop.y+trop.h-40},{x:trop.x+300,y:trop.y+trop.h-50},{x:trop.x+450,y:trop.y+trop.h-35}];
    flowerPositions.forEach((fp,fi)=>{
      const fc=['#ff4488','#ff8844','#ff44ff'][fi];
      // Stem
      ctx.strokeStyle='#2a6a2a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(fp.x,fp.y+20);ctx.lineTo(fp.x,fp.y);ctx.stroke();
      // Petals
      for(let p=0;p<6;p++){
        const pa=p*Math.PI/3+Math.sin(t*.5+fi)*.1;
        ctx.fillStyle=fc;
        ctx.beginPath();ctx.ellipse(fp.x+Math.cos(pa)*8,fp.y+Math.sin(pa)*8,6,3,pa,0,Math.PI*2);ctx.fill();
      }
      // Center
      ctx.fillStyle='#ffdd44';ctx.beginPath();ctx.arc(fp.x,fp.y,3,0,Math.PI*2);ctx.fill();
    });
  }

  // === WATERFALL (tall, animated) ===
  const wf=getObjects().find(o=>o.id==='waterfall');
  if(wf){
    // Rock face behind waterfall
    ctx.fillStyle='#3a3a3a';ctx.fillRect(wf.x-10,wf.y,wf.w+20,wf.h);
    ctx.fillStyle='#4a4a4a';
    for(let ry=wf.y;ry<wf.y+wf.h;ry+=20){
      ctx.fillRect(wf.x-8+seed(ry,50)%12,ry,8+seed(ry,51)%10,18);
    }
    // Moss on rocks
    for(let i=0;i<6;i++){
      ctx.fillStyle='rgba(40,80,30,.4)';
      ctx.fillRect(wf.x-10+seed(i,60)%20,wf.y+seed(i,61)%wf.h,10+seed(i,62)%8,5);
    }
    // Water streams (animated sine wave strips)
    for(let stream=0;stream<4;stream++){
      const sx=wf.x+15+stream*20;
      ctx.strokeStyle=`rgba(120,180,240,${.15+stream*.03})`;ctx.lineWidth=3+stream;
      ctx.beginPath();
      for(let wy=wf.y;wy<wf.y+wf.h;wy+=4){
        const wx=sx+Math.sin(wy*.05+t*3+stream)*6;
        if(wy===wf.y)ctx.moveTo(wx,wy);else ctx.lineTo(wx,wy);
      }ctx.stroke();
    }
    // Water highlights
    for(let i=0;i<10;i++){
      const hy=wf.y+((t*60+i*40)%wf.h);
      const hx=wf.x+20+Math.sin(hy*.05+t*3)*6+seed(i,70)%30;
      ctx.fillStyle=`rgba(200,230,255,${.2+Math.sin(t*2+i)*.1})`;
      ctx.fillRect(hx,hy,3,2);
    }
    // Splash pool at base
    const poolY=wf.y+wf.h;
    ctx.fillStyle='rgba(60,120,180,.25)';
    ctx.beginPath();ctx.ellipse(wf.x+wf.w/2,poolY+10,wf.w+20,15,0,0,Math.PI*2);ctx.fill();
    // Splash particles
    for(let i=0;i<8;i++){
      const sPhase=(t*3+i*10)%40;
      if(sPhase<20){
        const spx=wf.x+wf.w/2+Math.sin(t+i*3)*20;
        const spy=poolY-sPhase*1.5;
        ctx.fillStyle=`rgba(180,220,255,${.3-sPhase/20*.3})`;
        ctx.beginPath();ctx.arc(spx,spy,2,0,Math.PI*2);ctx.fill();
      }
    }
    // Mist particles at base
    for(let i=0;i<12;i++){
      const mx=wf.x+wf.w/2-30+((t*.2+i*20)%80);
      const my=poolY+5+Math.sin(t*.5+i)*8;
      ctx.fillStyle=`rgba(200,220,240,${.04+Math.sin(t*.3+i*2)*.02})`;
      ctx.beginPath();ctx.arc(mx,my,8+Math.sin(i)*3,0,Math.PI*2);ctx.fill();
    }
    // Rainbow in mist
    const rainbowColors=['#ff000015','#ff880015','#ffff0015','#00ff0015','#0088ff15','#4400ff15','#880088ff15'];
    for(let i=0;i<7;i++){
      ctx.strokeStyle=rainbowColors[i]||`rgba(${[255,255,255,0,0,60,130][i]},${[0,130,255,255,130,0,0][i]},${[0,0,0,0,255,255,130][i]},.06)`;
      ctx.lineWidth=2;ctx.beginPath();
      ctx.arc(wf.x+wf.w/2,poolY,30+i*4,Math.PI,0);ctx.stroke();
    }
  }

  // === MUSHROOM FOREST — bioluminescent ===
  const mush=getObjects().find(o=>o.id==='mushroom_forest');
  if(mush){
    // Dark forest floor
    ctx.fillStyle='rgba(10,15,20,.4)';ctx.fillRect(mush.x,mush.y,mush.w,mush.h);
    // 18 mushrooms of various sizes
    const mushrooms=[];
    for(let i=0;i<18;i++){
      mushrooms.push({
        x:mush.x+20+seed(i,200)%((mush.w)-40),
        y:mush.y+mush.h-20-seed(i,201)%(mush.h-80),
        size:8+seed(i,202)%20,
        hue:seed(i,203)%2===0?170:280,// teal or purple
        glow:seed(i,204)%3*.1+.3,
      });
    }
    // Sort by y for depth
    mushrooms.sort((a,b)=>a.y-b.y);
    mushrooms.forEach((m,i)=>{
      const glowPulse=m.glow+Math.sin(t*1.2+i*1.5)*.15;
      const isTeal=m.hue<200;
      const gc=isTeal?`rgba(60,220,190,${glowPulse})`:`rgba(160,80,220,${glowPulse})`;
      const sc=isTeal?`rgba(60,220,190,${glowPulse*.25})`:`rgba(160,80,220,${glowPulse*.25})`;
      // Stem
      ctx.fillStyle='#4a4040';ctx.fillRect(m.x-2,m.y,4,m.size*.6);
      ctx.fillStyle='#5a5050';ctx.fillRect(m.x-1,m.y+2,2,m.size*.6-2);
      // Cap
      ctx.fillStyle=gc;
      ctx.beginPath();ctx.arc(m.x,m.y,m.size/2,Math.PI,0);ctx.fill();
      // Cap spots
      ctx.fillStyle=isTeal?'rgba(100,255,230,.3)':'rgba(200,120,255,.3)';
      ctx.beginPath();ctx.arc(m.x-m.size/6,m.y-m.size/6,2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(m.x+m.size/5,m.y-m.size/5,1.5,0,Math.PI*2);ctx.fill();
      // Glow halo
      const gHalo=ctx.createRadialGradient(m.x,m.y-m.size/4,0,m.x,m.y-m.size/4,m.size*1.5);
      gHalo.addColorStop(0,sc);gHalo.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=gHalo;ctx.beginPath();ctx.arc(m.x,m.y-m.size/4,m.size*1.5,0,Math.PI*2);ctx.fill();
    });
    // Spore particles floating up
    for(let i=0;i<15;i++){
      const spx=mush.x+30+((t*.1+i*27)%(mush.w-60));
      const spy=mush.y+mush.h-((t*.3+i*45)%mush.h);
      const spa=.15+Math.sin(t+i*3)*.08;
      const isTeal=i%2===0;
      ctx.fillStyle=isTeal?`rgba(60,220,190,${spa})`:`rgba(160,80,220,${spa})`;
      ctx.beginPath();ctx.arc(spx+Math.sin(t*.5+i)*3,spy,1.5,0,Math.PI*2);ctx.fill();
    }
  }

  // === FLOWER MEADOW — 50+ colorful flowers ===
  const meadow=getObjects().find(o=>o.id==='flower_meadow');
  if(meadow){
    const flowerColors=['#ff4488','#ff8844','#ffdd44','#44aaff','#ff44ff','#44ffaa','#ff6666','#aaaaff','#ffaacc','#88ddff'];
    for(let i=0;i<55;i++){
      const fx=meadow.x+seed(i,300)%meadow.w;
      const fy=meadow.y+seed(i,301)%meadow.h;
      const fc=flowerColors[seed(i,302)%flowerColors.length];
      const fSize=3+seed(i,303)%4;
      const sway=Math.sin(t*.8+i*.7)*2;
      // Stem
      ctx.strokeStyle='#3a7a3a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(fx,fy+fSize+4);ctx.lineTo(fx+sway,fy);ctx.stroke();
      // Petals (4-6 per flower)
      const petals=4+seed(i,304)%3;
      for(let p=0;p<petals;p++){
        const pa=p*Math.PI*2/petals+Math.sin(t*.5+i)*.1;
        ctx.fillStyle=fc;
        ctx.beginPath();ctx.ellipse(fx+sway+Math.cos(pa)*fSize*.6,fy+Math.sin(pa)*fSize*.6,fSize*.4,fSize*.2,pa,0,Math.PI*2);ctx.fill();
      }
      // Center
      ctx.fillStyle='#ffee44';ctx.beginPath();ctx.arc(fx+sway,fy,fSize*.2,0,Math.PI*2);ctx.fill();
    }
  }

  // === KOI POND — dark water, swimming fish, lily pads ===
  const pond=getObjects().find(o=>o.id==='koi_pond');
  if(pond){
    // Pond shape (elliptical)
    const pcx=pond.x+pond.w/2,pcy=pond.y+pond.h/2;
    // Dark water base
    ctx.fillStyle='rgba(20,40,60,.7)';
    ctx.beginPath();ctx.ellipse(pcx,pcy,pond.w/2,pond.h/2,0,0,Math.PI*2);ctx.fill();
    // Water depth gradient
    const waterGrad=ctx.createRadialGradient(pcx,pcy,0,pcx,pcy,pond.w/2);
    waterGrad.addColorStop(0,'rgba(15,30,50,.3)');waterGrad.addColorStop(0.7,'rgba(30,60,80,.2)');waterGrad.addColorStop(1,'rgba(40,70,90,0)');
    ctx.fillStyle=waterGrad;ctx.beginPath();ctx.ellipse(pcx,pcy,pond.w/2,pond.h/2,0,0,Math.PI*2);ctx.fill();
    // Water ripples
    for(let r=0;r<4;r++){
      const rr=((t*1.2+r*25)%80)/80*(pond.w/2);
      ctx.strokeStyle=`rgba(100,160,200,${.15-rr/(pond.w/2)*.15})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(pcx,pcy,rr,rr*.6,0,0,Math.PI*2);ctx.stroke();
    }
    // Koi fish (5 swimming on paths)
    ctx.save();ctx.beginPath();ctx.ellipse(pcx,pcy,pond.w/2-5,pond.h/2-5,0,0,Math.PI*2);ctx.clip();
    const koiColors=['#ff6622','#ffaaaa','#ffffff','#ffcc00','#ff4444'];
    for(let i=0;i<5;i++){
      const kAngle=t*.3*(i%2===0?1:-1)+i*Math.PI*2/5;
      const kRx=(pond.w/2-30)*(0.5+Math.sin(t*.1+i)*.3);
      const kRy=(pond.h/2-20)*(0.5+Math.cos(t*.12+i)*.3);
      const kx=pcx+Math.cos(kAngle)*kRx;
      const ky=pcy+Math.sin(kAngle)*kRy;
      const kAngle2=Math.atan2(Math.cos(kAngle)*kRy,-Math.sin(kAngle)*kRx);
      ctx.save();ctx.translate(kx,ky);ctx.rotate(kAngle2+Math.PI);
      // Fish body
      ctx.fillStyle=koiColors[i];
      ctx.beginPath();ctx.ellipse(0,0,8,3,0,0,Math.PI*2);ctx.fill();
      // Tail
      ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-13,-3);ctx.lineTo(-13,3);ctx.fill();
      // White patches for some koi
      if(i<3){ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.ellipse(2,0,3,2,0,0,Math.PI*2);ctx.fill()}
      // Eye
      ctx.fillStyle='#111';ctx.fillRect(5,-1,1,1);
      ctx.restore();
    }
    ctx.restore();
    // Lily pads
    for(let i=0;i<6;i++){
      const lAngle=i*Math.PI/3+.5;
      const lDist=(pond.w/2-25)*(0.4+seed(i,400)%40/100);
      const lx=pcx+Math.cos(lAngle)*lDist;
      const ly=pcy+Math.sin(lAngle)*lDist*.6;
      ctx.fillStyle='#2a7a3a';
      ctx.beginPath();ctx.arc(lx,ly+Math.sin(t*.5+i)*2,7,0.15,Math.PI*2-0.15);ctx.fill();
      // Lily flower on some pads
      if(i%3===0){
        ctx.fillStyle='#ffaacc';
        for(let p=0;p<5;p++){
          const pa=p*Math.PI*2/5;
          ctx.beginPath();ctx.ellipse(lx+Math.cos(pa)*3,ly+Math.sin(pa)*3+Math.sin(t*.5+i)*2,2.5,1.5,pa,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle='#ffee44';ctx.beginPath();ctx.arc(lx,ly+Math.sin(t*.5+i)*2,1.5,0,Math.PI*2);ctx.fill();
      }
    }
    // Pond border (stones)
    for(let i=0;i<20;i++){
      const sa=i*Math.PI*2/20;
      const sbx=pcx+Math.cos(sa)*(pond.w/2+3),sby=pcy+Math.sin(sa)*(pond.h/2+3);
      ctx.fillStyle=`rgb(${70+seed(i,410)%20},${65+seed(i,411)%15},${60+seed(i,412)%15})`;
      ctx.beginPath();ctx.arc(sbx,sby,4+seed(i,413)%3,0,Math.PI*2);ctx.fill();
    }
  }

  // === FOUNTAIN — central, large ===
  const fnt=getObjects().find(o=>o.id==='fountain');
  if(fnt){
    const fcx=fnt.x+fnt.w/2,fcy=fnt.y+fnt.h/2;
    // Stone base
    ctx.fillStyle='#5a5a5a';ctx.beginPath();ctx.ellipse(fcx,fcy+10,fnt.w/2+5,fnt.h/2-5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6a6a6a';ctx.beginPath();ctx.ellipse(fcx,fcy+8,fnt.w/2,fnt.h/2-8,0,0,Math.PI*2);ctx.fill();
    // Water basin
    ctx.fillStyle='rgba(60,120,180,.35)';ctx.beginPath();ctx.ellipse(fcx,fcy+5,fnt.w/2-5,fnt.h/2-12,0,0,Math.PI*2);ctx.fill();
    // Center pillar
    ctx.fillStyle='#7a7a7a';ctx.fillRect(fcx-4,fcy-25,8,35);
    ctx.fillStyle='#8a8a8a';ctx.fillRect(fcx-6,fcy-27,12,4);
    // Water spouts
    for(let i=0;i<4;i++){
      const sa=i*Math.PI/2+t*.5;
      ctx.strokeStyle='rgba(120,180,240,.25)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(fcx,fcy-25);
      const ex=fcx+Math.cos(sa)*25,ey=fcy+Math.sin(sa)*5+5;
      ctx.quadraticCurveTo(fcx+Math.cos(sa)*12,fcy-30,ex,ey);ctx.stroke();
    }
    // Water droplets
    for(let i=0;i<6;i++){
      const dPhase=(t*2+i*12)%40;
      const da=i*Math.PI/3;
      const dx=fcx+Math.cos(da)*(5+dPhase*.5);
      const dy=fcy-25+dPhase*1.2;
      if(dPhase<30){
        ctx.fillStyle=`rgba(150,200,255,${.3-dPhase/30*.3})`;
        ctx.beginPath();ctx.arc(dx,dy,1.5,0,Math.PI*2);ctx.fill();
      }
    }
    // Ripples in basin
    for(let r=0;r<3;r++){
      const rr=((t*1.5+r*15)%40)/40*(fnt.w/2-8);
      ctx.strokeStyle=`rgba(150,200,255,${.12-rr/(fnt.w/2)*.12})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(fcx,fcy+5,rr,rr*.5,0,0,Math.PI*2);ctx.stroke();
    }
  }

  // === GREENHOUSE — glass structure ===
  const gh=getObjects().find(o=>o.id==='greenhouse');
  if(gh){
    // Glass walls
    ctx.fillStyle='rgba(180,220,200,.06)';ctx.fillRect(gh.x,gh.y,gh.w,gh.h);
    ctx.strokeStyle='rgba(180,220,200,.15)';ctx.lineWidth=2;ctx.strokeRect(gh.x,gh.y,gh.w,gh.h);
    // Glass panes
    for(let gx=gh.x;gx<gh.x+gh.w;gx+=50){
      ctx.strokeStyle='rgba(180,220,200,.08)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(gx,gh.y);ctx.lineTo(gx,gh.y+gh.h);ctx.stroke();
    }
    for(let gy=gh.y;gy<gh.y+gh.h;gy+=40){
      ctx.beginPath();ctx.moveTo(gh.x,gy);ctx.lineTo(gh.x+gh.w,gy);ctx.stroke();
    }
    // Roof (triangular glass)
    ctx.strokeStyle='rgba(180,220,200,.12)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(gh.x,gh.y);ctx.lineTo(gh.x+gh.w/2,gh.y-30);ctx.lineTo(gh.x+gh.w,gh.y);ctx.stroke();
    // Plants inside greenhouse
    for(let i=0;i<6;i++){
      const px=gh.x+20+i*45,py=gh.y+gh.h-20;
      // Pot
      ctx.fillStyle='#7a4a2a';ctx.fillRect(px-5,py,14,10);
      ctx.fillStyle='#5a3a1a';ctx.fillRect(px-3,py-2,10,4);
      // Plant
      ctx.fillStyle='#3a8a3a';
      const ph=15+seed(i,500)%15;
      ctx.fillRect(px+1,py-ph,4,ph);
      for(let l=0;l<3;l++){
        ctx.beginPath();ctx.ellipse(px+2+((l%2)*4-2)*2,py-ph+l*5,5,2,l%2===0?.3:-.3,0,Math.PI*2);ctx.fill();
      }
    }
    // Interior warm light
    const ghGlow=ctx.createRadialGradient(gh.x+gh.w/2,gh.y+gh.h/2,0,gh.x+gh.w/2,gh.y+gh.h/2,gh.w/2);
    ghGlow.addColorStop(0,'rgba(255,240,200,.03)');ghGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ghGlow;ctx.fillRect(gh.x,gh.y,gh.w,gh.h);
  }

  // === GROW PLOTS ===
  for(let i=1;i<=8;i++){
    const plot=getObjects().find(o=>o.id==='grow_plot_'+i);if(!plot)continue;
    ctx.fillStyle='#3a2a1a';ctx.fillRect(plot.x,plot.y,plot.w,plot.h);
    ctx.fillStyle='#2a1a0a';ctx.fillRect(plot.x+3,plot.y+3,plot.w-6,plot.h-6);
    // Soil furrows
    for(let fy=plot.y+5;fy<plot.y+plot.h-3;fy+=6){
      ctx.fillStyle='rgba(50,35,20,.3)';ctx.fillRect(plot.x+5,fy,plot.w-10,1);
    }
    // If garden state exists, render plants
    if(S.garden&&S.garden[i-1]){
      const p=S.garden[i-1];
      const pcx=plot.x+plot.w/2,pcy=plot.y+plot.h/2;
      if(p.stage>=1){ctx.fillStyle='#3a8a3a';ctx.fillRect(pcx-2,pcy-p.stage*4,4,p.stage*4+8)}
      if(p.stage>=3){
        ctx.fillStyle='#4aaa4a';
        ctx.beginPath();ctx.ellipse(pcx-6,pcy-p.stage*3,5,2,.3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(pcx+6,pcy-p.stage*3-2,5,2,-.3,0,Math.PI*2);ctx.fill();
      }
      if(p.stage>=4&&PLANT_TYPES&&PLANT_TYPES[i-1]){
        ctx.fillStyle=PLANT_TYPES[i-1].flowerColor||'#ff88aa';
        ctx.beginPath();ctx.arc(pcx,pcy-p.stage*4-2,4,0,Math.PI*2);ctx.fill();
      }
      if(p.wilting){ctx.fillStyle='rgba(255,200,50,.6)';ctx.font='8px sans-serif';ctx.fillText('💧',plot.x+plot.w/2-4,plot.y-2)}
    }
  }

  // === BENCHES ===
  ['bench_1','bench_2'].forEach(id=>{
    const bn=getObjects().find(o=>o.id===id);if(!bn)return;
    // Seat
    ctx.fillStyle='#5a4030';ctx.fillRect(bn.x,bn.y,bn.w,bn.h);
    ctx.fillStyle='#6a5040';ctx.fillRect(bn.x+2,bn.y+2,bn.w-4,bn.h-4);
    // Back rest
    ctx.fillStyle='#5a4030';ctx.fillRect(bn.x,bn.y-6,bn.w,6);
    // Legs
    ctx.fillStyle='#4a3020';
    ctx.fillRect(bn.x+3,bn.y+bn.h,3,8);ctx.fillRect(bn.x+bn.w-6,bn.y+bn.h,3,8);
  });

  // === WATERING STATION ===
  const ws=getObjects().find(o=>o.id==='watering_station');
  if(ws){
    ctx.fillStyle='#4a4a5a';ctx.fillRect(ws.x,ws.y,ws.w,ws.h);
    ctx.fillStyle='#5a5a6a';ctx.fillRect(ws.x+4,ws.y+4,ws.w-8,ws.h-8);
    // Watering can shape
    ctx.fillStyle='#6a8a6a';ctx.fillRect(ws.x+10,ws.y+15,20,25);
    ctx.fillStyle='#5a7a5a';ctx.fillRect(ws.x+28,ws.y+12,12,4);// spout
    // Water droplet
    const dropPhase=(t%90)/90;
    if(dropPhase<0.2){
      ctx.fillStyle='rgba(100,180,255,.5)';
      ctx.beginPath();ctx.arc(ws.x+40,ws.y+18+dropPhase*40,2,0,Math.PI*2);ctx.fill();
    }
  }

  // === BUTTERFLY GARDEN area + BUTTERFLIES (12+) ===
  const bfg=getObjects().find(o=>o.id==='butterfly_garden');
  if(bfg){
    // Extra flowers in butterfly garden area
    for(let i=0;i<12;i++){
      const fx=bfg.x+seed(i,600)%bfg.w,fy=bfg.y+bfg.h-10-seed(i,601)%30;
      ctx.strokeStyle='#2a6a2a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(fx,fy+8);ctx.lineTo(fx,fy);ctx.stroke();
      const fc=['#ff66aa','#ffaa66','#66aaff','#ff66ff','#66ffaa'][seed(i,602)%5];
      ctx.fillStyle=fc;ctx.beginPath();ctx.arc(fx,fy,3,0,Math.PI*2);ctx.fill();
    }
  }
  // Butterflies — 14 with wing-flap, 6 colors, curved paths
  const bfColors=['#ff66aa','#ffaa44','#66ccff','#aa88ff','#ff6666','#66ffaa'];
  for(let i=0;i<14;i++){
    const pathSpeed=.3+i*.05;
    const pathRx=150+seed(i,700)%200,pathRy=80+seed(i,701)%100;
    const pathCx=300+seed(i,702)%1400,pathCy=400+seed(i,703)%600;
    const bx=pathCx+Math.sin(t*pathSpeed+i*2.1)*pathRx;
    const by=pathCy+Math.cos(t*pathSpeed*.7+i*1.7)*pathRy;
    const wingFlap=Math.abs(Math.sin(t*6+i*3));
    const bc=bfColors[i%6];
    // Wings (two triangular shapes that flap)
    ctx.fillStyle=bc;
    ctx.save();ctx.translate(bx,by);
    // Upper wings
    ctx.beginPath();ctx.ellipse(-3*wingFlap,-1,3*wingFlap+1,4,.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(3*wingFlap,-1,3*wingFlap+1,4,-.3,0,Math.PI*2);ctx.fill();
    // Lower wings (smaller)
    ctx.beginPath();ctx.ellipse(-2*wingFlap,2,2*wingFlap+.5,3,.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(2*wingFlap,2,2*wingFlap+.5,3,-.5,0,Math.PI*2);ctx.fill();
    // Body
    ctx.fillStyle='#333';ctx.fillRect(-1,-2,2,5);
    ctx.restore();
  }

  // === FIREFLIES — 25 tiny glowing dots ===
  for(let i=0;i<25;i++){
    const ffx=100+seed(i,800)%1800+Math.sin(t*.3+i*1.7)*40;
    const ffy=400+seed(i,801)%800+Math.cos(t*.25+i*2.3)*30;
    const ffGlow=.15+Math.sin(t*1.5+i*2.5)*.12;
    // Outer glow
    ctx.fillStyle=`rgba(255,240,100,${ffGlow*.4})`;
    ctx.beginPath();ctx.arc(ffx,ffy,5,0,Math.PI*2);ctx.fill();
    // Core
    ctx.fillStyle=`rgba(255,250,150,${ffGlow+.1})`;
    ctx.beginPath();ctx.arc(ffx,ffy,1.5,0,Math.PI*2);ctx.fill();
  }

  // === GROUND FOG — low-lying mist ===
  for(let i=0;i<15;i++){
    const mx=((t*.15+i*130)%FW);
    const my=FH-60+Math.sin(t*.3+i*1.5)*20;
    const mAlpha=.035+Math.sin(t*.4+i*2)*.015;
    ctx.fillStyle=`rgba(180,200,180,${mAlpha})`;
    ctx.beginPath();ctx.ellipse(mx,my,30+seed(i,900)%20,8+seed(i,901)%5,0,0,Math.PI*2);ctx.fill();
  }

  // === ELEVATOR ===
  const elev=getObjects().find(o=>o.id==='elevator');
  if(elev){
    ctx.fillStyle='#2a2a3a';ctx.fillRect(elev.x,elev.y,elev.w||60,elev.h||80);
    ctx.fillStyle='#3a3a4a';ctx.fillRect(elev.x+4,elev.y+4,(elev.w||60)-8,(elev.h||80)-8);
    ctx.strokeStyle='#555';ctx.lineWidth=2;
    ctx.strokeRect(elev.x+2,elev.y+2,(elev.w||60)-4,(elev.h||80)-4);
    ctx.fillStyle='rgba(0,255,200,.4)';
    ctx.beginPath();ctx.moveTo(elev.x+30,elev.y-8);ctx.lineTo(elev.x+24,elev.y-2);ctx.lineTo(elev.x+36,elev.y-2);ctx.fill();
  }

  // === AMBIENT — green tinted warm light ===
  const greenAmb=ctx.createRadialGradient(FW/2,FH/2,0,FW/2,FH/2,700);
  greenAmb.addColorStop(0,'rgba(40,80,30,.03)');greenAmb.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=greenAmb;ctx.fillRect(0,0,FW,FH);

  // Warm sunlight pools
  const sunX=FW/2+Math.sin(t*.01)*200,sunY=200;
  const sunGlow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,400);
  sunGlow.addColorStop(0,'rgba(255,240,200,.02)');sunGlow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sunGlow;ctx.fillRect(0,0,FW,FH);

  // === WALLS ===
  ctx.fillStyle='#1a2a1a';ctx.fillRect(0,0,FW,10);ctx.fillRect(0,FH-10,FW,10);
  ctx.fillRect(0,0,10,FH);ctx.fillRect(FW-10,0,10,FH);

  // Garden puzzle plots
  if(typeof PuzzleSystems!=='undefined'&&PuzzleSystems.renderGardenPlots)PuzzleSystems.renderGardenPlots();

  FloorDepth.renderShadows(ctx,4);FloorDepth.renderLightRays(ctx,4);
}