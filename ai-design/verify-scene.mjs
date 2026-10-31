import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Computation and navigation checks. This is not a browser layout test.
const fragment=await readFile(new URL('./minimal-learning-scene.html',import.meta.url),'utf8');
const script=fragment.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script,{filename:fileURLToPath(new URL('./minimal-learning-scene.html',import.meta.url))});

function mount(width,hash='',program=script,motion=false) {
  class Element {
    constructor(tag) {this.tag=tag;this.children=[];this.attrs={};this.events={};this.style={};this._text='';this.hidden=false;this.disabled=false;}
    setAttribute(key,value) {this.attrs[key]=String(value);}
    getAttribute(key) {return this.attrs[key];}
    removeAttribute(key) {delete this.attrs[key];}
    appendChild(node) {this.children.push(node);return node;}
    replaceChildren(...nodes) {this.children=[];this._text='';nodes.forEach(node=>this.appendChild(node));}
    set textContent(value) {this._text=String(value);this.children=[];}
    get textContent() {return this._text+this.children.map(node=>node.textContent).join('');}
    querySelectorAll(selector) {
      const nodes=[],key=selector.slice(1,-1);
      const visit=node=>{if(key in node.attrs)nodes.push(node);node.children.forEach(visit);};
      this.children.forEach(visit);return nodes;
    }
    addEventListener(event,callback) {(this.events[event]??=[]).push(callback);}
    fire(event,values={}) {(this.events[event]??[]).forEach(callback=>callback({preventDefault(){},...values}));}
    getBoundingClientRect() {return {width,height:265};}
    setPointerCapture(id) {this.capture=id;}
    hasPointerCapture(id) {return this.capture===id;}
    releasePointerCapture() {this.capture=null;}
  }
  const root=new Element('div'),copy=new Element('section'),figure=new Element('div'),svg=new Element('svg'),handle=new Element('button'),back=new Element('button'),next=new Element('button'),automatic=new Element('button');
  const selectors={'[data-ma-copy]':copy,'[data-ma-figure]':figure,'[data-ma-svg]':svg,'[data-ma-handle]':handle,'[data-ma-back]':back,'[data-ma-next]':next,'[data-ma-auto]':automatic};
  root.querySelector=selector=>selectors[selector];
  const timers=new Map(),frames=new Map(),documentEvents={},pageEvents={},location={hash},evaluations=[],derivativeInputs=[];let timerId=0,frameId=0,frameTime=0,resizeCallback;
  const document={hidden:false,getElementById:id=>id==='minimal-ai-scene'?root:null,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),createTextNode:value=>Object.assign(new Element('#text'),{textContent:value}),addEventListener:(name,callback)=>{documentEvents[name]=callback;}};
  const motionPlatform=motion?{performance:{now:()=>frameTime},requestAnimationFrame:callback=>{frames.set(++frameId,callback);return frameId;},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>({matches:motion==='reduce'})}:{};
  let waveMath,bendMath,outputMath,relayMath,jointMath,pairMath,duoMath,onsetMath,netMath,meshMath,wholeMath,textMath,embMath,usageMath,probMath,lossMath;
  vm.runInNewContext(program,{document,ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}},Math,Number,String,location,__captureWaveMath:value=>{waveMath=value;},__captureBendMath:value=>{bendMath=value;},__captureOutputMath:value=>{outputMath=value;},__captureRelayMath:value=>{relayMath=value;},__captureJointMath:value=>{jointMath=value;},__capturePairMath:value=>{pairMath=value;},__captureDuoMath:value=>{duoMath=value;},__captureOnsetMath:value=>{onsetMath=value;},__captureNetMath:value=>{netMath=value;},__captureMeshMath:value=>{meshMath=value;},__captureWholeMath:value=>{wholeMath=value;},__captureTextMath:value=>{textMath=value;},__captureEmbMath:value=>{embMath=value;},__captureUsageMath:value=>{usageMath=value;},__captureProbMath:value=>{probMath=value;},__captureLossMath:value=>{lossMath=value;},__recordParameter:value=>evaluations.push(value),__recordDerivative:value=>derivativeInputs.push(value),setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(name,callback)=>{pageEvents[name]=callback;},...motionPlatform});
  return {root,copy,figure,svg,handle,back,next,automatic,timers,frames,evaluations,derivativeInputs,waveMath,bendMath,outputMath,relayMath,jointMath,pairMath,duoMath,onsetMath,netMath,meshMath,wholeMath,textMath,embMath,usageMath,probMath,lossMath,
    advance(){next.fire('click');},retreat(){back.fire('click');},key(key){handle.fire('keydown',{key});},
    documentPointer(type,event){documentEvents[type]?.({target:document,...event});},
    goToChapter(number){location.hash='#act-'+number;pageEvents.hashchange();},
    tick(){const [id,callback]=timers.entries().next().value;timers.delete(id);callback();},
    frame(milliseconds=210){frameTime+=milliseconds;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(frameTime));},
    hide(){document.hidden=true;documentEvents.visibilitychange();},show(){document.hidden=false;},leave(){pageEvents.pagehide();},resume(){pageEvents.pageshow();},resize(){resizeCallback();},goToSecond(){location.hash='#act-2';pageEvents.hashchange();},goToThird(){location.hash='#act-3';pageEvents.hashchange();},goToFourth(){location.hash='#act-4';pageEvents.hashchange();},goToFifth(){location.hash='#act-5';pageEvents.hashchange();}
  };
}

for(const width of [736,360,280]) {
  const app=mount(width);
  assert.equal(app.figure.hidden,true);
  assert.equal(app.back.disabled,true);
  assert.match(app.copy.textContent,/根据已有的记录，预测一个还不知道的结果/);
  app.advance();
  assert.equal(app.figure.hidden,false);
  assert.equal(app.handle.hidden,true);
  for(const [seconds,position] of [[0,20],[1,50],[2,80],[3,110]]) assert.ok(app.svg.textContent.includes(`${seconds}秒的记录是${position}厘米`));
  assert.ok(!app.svg.textContent.includes('模拟结果'));
  app.advance();assert.equal(app.figure.hidden,true);
  app.advance();assert.equal(app.handle.hidden,false);
  assert.match(app.svg.textContent,/1秒的预测是40厘米；2秒的预测是60厘米；3秒的预测是80厘米/);
  // Preserve an imperfect rule: checking a prediction must expose its error.
  app.advance();
  assert.match(app.copy.textContent,/预测是100厘米/);
  assert.ok(!app.svg.textContent.includes('模拟结果'));
  app.advance();
  assert.match(app.copy.textContent,/模拟结果是140厘米，预测是100厘米，相差40厘米/);
  assert.match(app.svg.textContent,/模拟结果是140厘米/);
  app.advance();
  assert.match(app.copy.textContent,/20 \+ 4 × 20 = 100 厘米/);
  const terms=app.copy.querySelectorAll('[data-ma-term]');
  for(const term of terms) {term.fire('click');assert.equal(term.getAttribute('aria-pressed'),'true');}
  app.advance();assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/电脑已经能计算预测/);
  app.advance();assert.match(app.copy.textContent,/第一幕里你的调整会保留/);
  app.retreat();app.retreat();app.retreat();app.retreat();
  // A drag changes one shared rule; every timestamp must use that rule.
  const scale=(width-50)/200;
  app.handle.fire('pointerdown',{pointerId:1,clientX:100,button:0});
  app.handle.fire('pointermove',{pointerId:1,clientX:100+3*10*scale});
  app.handle.fire('pointerup',{pointerId:1});
  assert.equal(Number(app.handle.getAttribute('aria-valuenow')),30);
  assert.match(app.svg.textContent,/1秒的预测是50厘米；2秒的预测是80厘米；3秒的预测是110厘米/);
  assert.match(app.copy.textContent,/三个预测都与记录对上/);
  app.advance();assert.match(app.copy.textContent,/预测是140厘米/);
  assert.ok(!app.copy.textContent.includes('还没有答案'));
  assert.ok(!app.svg.textContent.includes('模拟结果'));
  app.advance();assert.match(app.copy.textContent,/都为140厘米/);
  // Re-editing invalidates the old snapshot but preserves knowledge of the answer.
  app.retreat();app.key('ArrowLeft');
  assert.equal(Number(app.handle.getAttribute('aria-valuenow')),29);
  app.advance();assert.match(app.copy.textContent,/预测是136厘米/);
  assert.equal(app.next.textContent,'核对这次预测');
  assert.ok(!app.svg.textContent.includes('模拟结果'));
  app.advance();assert.match(app.copy.textContent,/相差4厘米/);
  app.retreat();app.key('Home');app.key('ArrowLeft');
  assert.equal(Number(app.handle.getAttribute('aria-valuenow')),5);
  app.advance();assert.match(app.copy.textContent,/预测是40厘米/);
  app.advance();assert.match(app.copy.textContent,/相差100厘米/);
  app.retreat();app.key('End');app.key('ArrowRight');
  assert.equal(Number(app.handle.getAttribute('aria-valuenow')),40);
  app.advance();assert.match(app.copy.textContent,/预测是180厘米/);
  app.advance();assert.match(app.copy.textContent,/相差40厘米/);
  assert.equal(app.svg.attrs.viewBox,`0 0 ${width} 265`);
  app.advance();app.advance();app.advance();
  assert.match(app.copy.textContent,/另开一个小实验/);
  app.retreat();app.retreat();app.retreat();app.retreat();
  assert.equal(Number(app.handle.getAttribute('aria-valuenow')),40);
  console.log(`PASS width=${width}: records, drag, keyboard, unseen prediction, verification, replay, formula, parameter bounds`);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-2');
  assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/改过之后，预测有没有更接近/);
  app.advance();assert.equal(app.figure.hidden,false);
  assert.match(app.svg.textContent,/横轴时间，单位秒；纵轴位置，单位厘米/);
  assert.match(app.svg.textContent,/平均差距20厘米/);
  app.advance();assert.match(app.copy.textContent,/两点之间差10厘米/);
  app.advance();assert.match(app.copy.textContent,/（10 \+ 20 \+ 30）÷ 3 = 20 厘米/);
  app.retreat();assert.match(app.copy.textContent,/先看一条记录/);
  app.advance();app.advance();
  assert.match(app.copy.textContent,/先改变一个数/);
  app.advance();assert.match(app.copy.textContent,/19厘米，平均差距变成22厘米/);
  assert.match(app.svg.textContent,/仍保留每秒20厘米/);
  app.advance();assert.match(app.copy.textContent,/21厘米，平均差距变成18厘米/);
  assert.match(app.svg.textContent,/仍保留每秒20厘米/);
  app.advance();assert.match(app.copy.textContent,/电脑保留每秒21厘米/);
  app.advance();assert.match(app.copy.textContent,/平均差距18厘米/);
  assert.equal(app.automatic.hidden,false);
  app.automatic.fire('click');assert.equal(app.timers.size,1);
  app.tick();assert.match(app.copy.textContent,/保留每秒22厘米，平均差距从18降到16厘米/);
  app.automatic.fire('click');assert.equal(app.timers.size,0);
  app.retreat();assert.match(app.copy.textContent,/现在保留的是每秒21厘米/);
  app.advance();assert.match(app.copy.textContent,/保留每秒22厘米，平均差距从18降到16厘米/);
  app.retreat();assert.match(app.svg.textContent,/当前规则每秒21厘米/);
  app.advance();assert.match(app.copy.textContent,/保留每秒22厘米/);
  app.automatic.fire('click');app.tick();app.hide();assert.equal(app.timers.size,0);
  assert.equal(app.automatic.textContent,'自动继续');app.show();
  app.automatic.fire('click');app.leave();assert.equal(app.timers.size,0);app.resume();
  assert.equal(app.automatic.textContent,'自动继续');
  app.automatic.fire('click');
  let ticks=0;
  while(app.timers.size>0&&ticks++<100) app.tick();
  assert.ok(ticks<100,'the actual search must terminate');
  assert.equal(app.timers.size,0);
  assert.match(app.copy.textContent,/每秒30厘米，平均差距是0厘米/);
  assert.match(app.svg.textContent,/当前规则每秒30厘米，三个预测的平均差距0厘米/);
  assert.equal(app.automatic.hidden,true);
  // Rollback restores one complete round, rather than revealing a trial state.
  app.retreat();assert.match(app.svg.textContent,/当前规则每秒30厘米/);
  assert.match(app.copy.textContent,/平均差距从2降到0厘米/);
  app.advance();assert.match(app.copy.textContent,/电脑停止调整/);
  app.advance();assert.match(app.copy.textContent,/第4秒没有参与比较/);
  assert.ok(!app.svg.textContent.includes('模拟结果140'));
  app.advance();assert.match(app.copy.textContent,/原规则预测100厘米，调整后预测140厘米，差距从40变成0厘米/);
  assert.match(app.svg.textContent,/模拟结果140厘米/);
  app.retreat();assert.ok(!app.svg.textContent.includes('模拟结果140'));
  app.advance();app.advance();assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/试算、比较，再保留差距更小的规则/);
  app.advance();assert.match(app.copy.textContent,/省去向两边分别试算/);
  app.retreat();app.retreat();app.retreat();app.retreat();
  assert.match(app.svg.textContent,/当前规则每秒30厘米/);
  assert.equal(app.svg.attrs.viewBox,`0 0 ${width} 310`);
  console.log(`PASS width=${width}: coordinate mapping, mean absolute error, independent candidates, acceptance, pause, single step, rollback, convergence, held-out check, chapter handoff`);
}
function assertPlotGeometry(app,width,expectedGaps=3) {
  const distance=Number(app.svg.getAttribute('data-ma-plot-distance'));
  const X=time=>54+time/4.4*(width-22-54),Y=position=>260-position/200*227;
  const close=(actual,expected)=>assert.ok(Math.abs(Number(actual)-expected)<1e-8,`${actual} != ${expected}`);
  const model=app.svg.querySelectorAll('[data-ma-prediction-line]');
  assert.equal(model.length,1,'only the current rule is drawn; no starting reference');
  close(model[0].getAttribute('y2'),Y(20+4.4*distance));
  const gaps=app.svg.querySelectorAll('[data-ma-gap-time]');
  assert.equal(gaps.length,expectedGaps);
  gaps.forEach(gap=>{
    const seconds=Number(gap.getAttribute('data-ma-gap-time'));
    close(gap.getAttribute('x1'),X(seconds));close(gap.getAttribute('y1'),Y(20+30*seconds));close(gap.getAttribute('y2'),Y(20+distance*seconds));
    assert.equal(gap.getAttribute('stroke'),'var(--ma-accent)');
    assert.ok(Number(gap.getAttribute('stroke-width'))>=3);
  });
  app.svg.querySelectorAll('[data-ma-prediction-time]').forEach(point=>{
    const seconds=Number(point.getAttribute('data-ma-prediction-time'));
    close(point.getAttribute('cx'),X(seconds));close(point.getAttribute('cy'),Y(20+distance*seconds));
  });
  return distance;
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-2',script,true);
  for(let i=0;i<8;i++)app.advance();
  assert.equal(assertPlotGeometry(app,width),21);
  app.advance();
  assert.match(app.copy.textContent,/保留每秒22厘米/);
  assert.equal(assertPlotGeometry(app,width),21);
  assert.equal(app.frames.size,1);
  app.frame();assert.equal(assertPlotGeometry(app,width),21.5);
  assert.match(app.svg.textContent,/图形过渡，当前绘制每秒21.5厘米/);
  app.frame();assert.equal(assertPlotGeometry(app,width),22);assert.equal(app.frames.size,0);
  // Reverse the same computed geometry when reviewing the previous round.
  app.retreat();app.frame();assert.equal(assertPlotGeometry(app,width),21.5);
  app.frame();assert.equal(assertPlotGeometry(app,width),21);
  // Pausing settles the displayed result and cancels both kinds of callback.
  app.automatic.fire('click');app.tick();app.frame();
  assert.equal(assertPlotGeometry(app,width),21.5);
  app.automatic.fire('click');assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);
  assert.equal(assertPlotGeometry(app,width),22);
  app.advance();app.advance();assert.match(app.copy.textContent,/保留每秒24厘米/);
  app.frame(420);assert.equal(assertPlotGeometry(app,width),24);
  app.advance();assert.equal(app.frames.size,1);app.hide();assert.equal(app.frames.size,0);
  assert.equal(assertPlotGeometry(app,width),25);app.show();
  app.advance();assert.equal(app.frames.size,1);app.goToSecond();assert.equal(app.frames.size,0);assert.equal(app.figure.hidden,true);
  console.log(`PASS width=${width}: one click per round, synchronized moving line/points/gaps, rollback, rapid clicks, pause, navigation cancellation, no reference line`);
}
const reduced=mount(360,'#act-2',script,'reduce');
for(let i=0;i<9;i++)reduced.advance();
assert.equal(assertPlotGeometry(reduced,360),22);assert.equal(reduced.frames.size,0);
console.log('PASS: reduced-motion preference applies the exact computed result without animation.');
const directLink=mount(360,'#act-2');
directLink.advance();directLink.advance();directLink.goToSecond();
assert.equal(directLink.figure.hidden,true);
assert.match(directLink.copy.textContent,/另开一个小实验/);
function assertDirectionGeometry(app,width,gaps=3) {
  const parameter=Number(app.svg.getAttribute('data-ma-direction-parameter'));
  assert.equal(assertPlotGeometry(app,width,gaps),parameter);
  const values=app.copy.querySelectorAll('[data-ma-direction-value]');
  assert.equal(values.length,1,'the adjustable parameter remains visible in the explanation');
  assert.equal(Number(values[0].textContent),Number(parameter.toFixed(1)));
  assert.match(app.svg.textContent,/横轴时间，单位秒；纵轴位置，单位厘米/);
  assert.equal(app.svg.querySelectorAll('[data-ma-probe-parameter]').length,0);
  assert.equal(app.svg.querySelectorAll('[data-ma-direction-path]').length,0);
  assert.ok(app.copy.children.length<=3);
  assert.equal(app.automatic.hidden,true);
  return parameter;
}
const close=(actual,expected)=>assert.ok(Math.abs(Number(actual)-expected)<1e-8,actual+' != '+expected);
function assertGapGeometry(app,width,parameter=22,before=21,progress=1) {
  assert.equal(app.figure.hidden,false);
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'gap-lengths');
  assert.equal(Number(app.svg.getAttribute('data-ma-direction-parameter')),parameter);
  close(app.svg.getAttribute('data-ma-layout-progress'),progress);
  const scale=(width-130)/30,left=66;
  const mix=(a,b)=>a+(b-a)*progress;
  const segments=app.svg.querySelectorAll('[data-ma-extracted-time]');
  assert.equal(segments.length,3);
  segments.forEach((segment,index)=>{
    const t=index+1,actual=20+30*t,prediction=20+parameter*t,gap=Math.abs(prediction-actual);
    const x=54+t/4.4*(width-76),y=64+index*80;
    assert.equal(Number(segment.getAttribute('data-ma-extracted-time')),t);
    close(segment.getAttribute('data-ma-gap-value'),gap);
    close(segment.getAttribute('x1'),mix(x,left));
    close(segment.getAttribute('y1'),mix(260-actual/200*227,y));
    close(segment.getAttribute('x2'),mix(x,left+gap*scale));
    close(segment.getAttribute('y2'),mix(260-prediction/200*227,y));
  });
  app.svg.querySelectorAll('[data-ma-removed-time]').forEach(piece=>{
    const t=Number(piece.getAttribute('data-ma-removed-time'));
    const amount=Math.abs((before-30)*t)-Math.abs((parameter-30)*t);
    close(piece.getAttribute('data-ma-reduction-value'),amount);
    close(Number(piece.getAttribute('x2'))-Number(piece.getAttribute('x1')),amount*scale);
  });
  const values=app.copy.querySelectorAll('[data-ma-direction-value]');
  assert.equal(values.length,1);close(values[0].textContent,Number(parameter.toFixed(1)));
  const means=app.copy.querySelectorAll('[data-ma-error-value]');
  if(means.length)close(means[0].textContent,Number((2*Math.abs(parameter-30)).toFixed(1)));
  assert.equal(app.svg.querySelectorAll('[data-ma-score-parameter]').length,0);
  assert.equal(app.automatic.hidden,true);assert.equal(app.timers.size,0);
}
function assertAverageGeometry(app,width,progress=1) {
  assert.equal(app.figure.hidden,false);
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'reduction-average');
  close(app.svg.getAttribute('data-ma-direction-parameter'),22);
  close(app.svg.getAttribute('data-ma-average-progress'),progress);
  close(app.svg.getAttribute('data-ma-total-reduction'),6);
  close(app.svg.getAttribute('data-ma-mean-reduction'),2);
  const unit=Math.min(50,(width-64)/8),left=(width-6*unit)/2,join=Math.min(progress,1),split=Math.max(0,progress-1),scale=(width-130)/30;
  const pieces=app.svg.querySelectorAll('[data-ma-reduction-piece]');
  assert.equal(pieces.length,3);
  let prefix=0,drawnLength=0;
  const shares=app.svg.querySelectorAll('[data-ma-average-share]');
  const boundaries=app.svg.querySelectorAll('[data-ma-average-boundary]');
  assert.equal(shares.length,3);assert.equal(boundaries.length,2);
  pieces.forEach((piece,index)=>{
    const original=index+1,portion=original+(2-original)*split;
    const sourceX=66+(index+1)*8*scale+7;
    const targetX=left+prefix*unit,sourceY=64+index*80;
    const x=sourceX+(targetX-sourceX)*join,cy=sourceY+(145-sourceY)*join;
    const length=original*scale*(1-join)+portion*unit*join;
    close(piece.getAttribute('data-ma-origin-reduction'),original);
    close(piece.getAttribute('data-ma-piece-value'),portion);
    close(piece.getAttribute('x1'),x);close(piece.getAttribute('y1'),cy);
    close(Number(piece.getAttribute('x2'))-Number(piece.getAttribute('x1')),length);
    close(shares[index].getAttribute('data-ma-share-value'),portion);
    close(shares[index].getAttribute('x'),x+length/2);
    close(shares[index].getAttribute('y'),cy-25);
    close(shares[index].getAttribute('opacity'),join);
    if(index<2)close(boundaries[index].getAttribute('x1'),x+length);
    drawnLength+=length;prefix+=portion;
  });
  close(prefix,6);
  close(drawnLength,6*(scale*(1-join)+unit*join));
  assert.equal(app.svg.querySelectorAll('[data-ma-score-parameter]').length,0);
  assert.equal(app.timers.size,0);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-3');
  assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/省去向两边分别试算/);
  app.advance();assert.equal(assertDirectionGeometry(app,width),21);
  assert.equal(app.next.textContent,'只把21改成22');
  app.advance();assert.equal(assertDirectionGeometry(app,width),22);
  const moves=app.svg.querySelectorAll('[data-ma-prediction-change]');
  assert.equal(moves.length,3);
  moves.forEach((mark,index)=>close(mark.getAttribute('data-ma-change-value'),index+1));
  assert.match(app.copy.textContent,/提取、转向并放大/);
  assert.equal(app.next.textContent,'展开这三条差距 →');
  app.advance();assertGapGeometry(app,width);
  assert.equal(app.svg.querySelectorAll('[data-ma-removed-time]').length,3);
  assert.deepEqual(app.svg.querySelectorAll('[data-ma-gap-label]').map(node=>node.textContent),['9 → 8','18 → 16','27 → 24']);
  assert.ok(!app.copy.textContent.includes('导数'));
  app.advance();assertAverageGeometry(app,width);
  assert.match(app.copy.textContent,/一共减少了6厘米/);
  assert.equal(app.next.textContent,'把6平均分成3份');
  app.advance();assertAverageGeometry(app,width,2);
  assert.match(app.copy.textContent,/并不是说三个预测各自都只改善了2厘米/);
  assert.ok(!app.copy.textContent.includes('导数'));
  app.retreat();assertAverageGeometry(app,width);
  app.advance();app.advance();assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/当前参数22时/);
  assert.match(app.copy.textContent,/（−1 −2 −3）÷ 3 = −2/);
  assert.match(app.copy.textContent,/平均差距对每秒距离参数的导数/);
  assert.match(app.copy.textContent,/从乘数和当前偏差算出/);
  app.advance();assertGapGeometry(app,width,22,22);
  assert.equal(app.svg.querySelectorAll('[data-ma-removed-time]').length,0);
  app.advance();assertGapGeometry(app,width,23,22);
  assert.equal(Number(app.copy.querySelectorAll('[data-ma-error-value]')[0].textContent),14);
  app.retreat();assertGapGeometry(app,width,22,22);
  app.retreat();assert.equal(app.figure.hidden,true);
  app.retreat();assertAverageGeometry(app,width,2);
  app.retreat();app.retreat();assertGapGeometry(app,width);
  app.retreat();assert.equal(assertDirectionGeometry(app,width),22,'layout changes never reset the model');
  for(let i=0;i<7;i++)app.advance();
  assert.equal(assertDirectionGeometry(app,width),35);
  assert.match(app.copy.textContent,/（\+1 \+2 \+3）÷ 3 = \+2/);
  app.advance();assert.equal(assertDirectionGeometry(app,width),34);
  close(app.copy.querySelectorAll('[data-ma-error-value]')[0].textContent,8);
  app.retreat();assert.equal(assertDirectionGeometry(app,width),35);
  app.advance();app.advance();assert.equal(app.figure.hidden,true);
  assert.match(app.copy.textContent,/一次应该改多少/);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一次只改一点/);
  app.retreat();assert.match(app.copy.textContent,/一次应该改多少/);
  app.goToThird();app.advance();assert.equal(assertDirectionGeometry(app,width),22,'entering the next act preserves the previous experiment');
  const uninterrupted=mount(width,'#act-3');
  for(let click=1;click<=11;click++)uninterrupted.advance();
  assert.equal(uninterrupted.figure.hidden,true);
  assert.match(uninterrupted.copy.textContent,/方向知道了/);
  console.log('PASS width='+width+': prediction changes → same gaps unfolded → reductions summed → divided by3 → derivative → actual updates; reversible navigation');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-3',script,true);
  app.advance();app.advance();
  app.frame();assert.equal(assertDirectionGeometry(app,width),21.5);
  app.svg.querySelectorAll('[data-ma-prediction-change]').forEach((mark,index)=>close(mark.getAttribute('data-ma-change-value'),(index+1)*0.5));
  app.frame();assert.equal(assertDirectionGeometry(app,width),22);
  app.advance();assertGapGeometry(app,width,22,21,0);
  app.frame(450);assertGapGeometry(app,width,22,21,0.5);
  app.frame(450);assertGapGeometry(app,width);assert.equal(app.frames.size,0);
  app.advance();assertAverageGeometry(app,width,0);
  app.frame(450);assertAverageGeometry(app,width,0.5);
  app.frame(450);assertAverageGeometry(app,width,1);
  app.advance();app.frame(450);assertAverageGeometry(app,width,1.5);
  app.frame(450);assertAverageGeometry(app,width,2);
  app.retreat();app.frame(450);assertAverageGeometry(app,width,1.5);
  app.hide();assert.equal(app.frames.size,0);assertAverageGeometry(app,width);app.show();
  app.advance();app.advance();assert.equal(app.frames.size,0);assert.equal(app.figure.hidden,true);
  app.advance();app.advance();
  app.frame();assertGapGeometry(app,width,22.5,22);
  app.frame();assertGapGeometry(app,width,23,22);
  app.retreat();app.frame();assertGapGeometry(app,width,22.5,22);
  app.hide();assertGapGeometry(app,width,22,22);assert.equal(app.frames.size,0);app.show();
  app.advance();app.advance();assert.equal(app.frames.size,0);assert.equal(assertDirectionGeometry(app,width),35);
  app.advance();app.frame();assert.equal(assertDirectionGeometry(app,width),34.5);
  app.frame();assert.equal(assertDirectionGeometry(app,width),34);
  app.retreat();app.frame();assert.equal(assertDirectionGeometry(app,width),34.5);
  app.hide();assert.equal(app.frames.size,0);assert.equal(assertDirectionGeometry(app,width),35);app.show();
  app.advance();app.goToSecond();assert.equal(app.frames.size,0);assert.equal(app.figure.hidden,true);
  const rapid=mount(width,'#act-3',script,true);
  for(let i=0;i<5;i++)rapid.advance();
  rapid.goToSecond();assert.equal(rapid.frames.size,0);assert.equal(rapid.figure.hidden,true);
  console.log('PASS width='+width+': real geometry during extraction, joining, equal division and parameter updates; interruption settles; navigation cancels');
}
const directionReduced=mount(360,'#act-3',script,'reduce');
for(let i=0;i<3;i++)directionReduced.advance();
assertGapGeometry(directionReduced,360);assert.equal(directionReduced.frames.size,0);
directionReduced.advance();assertAverageGeometry(directionReduced,360);
directionReduced.advance();assertAverageGeometry(directionReduced,360,2);
for(let i=0;i<3;i++)directionReduced.advance();
assertGapGeometry(directionReduced,360,23,22);assert.equal(directionReduced.frames.size,0);
// The analytic derivative reads the current predictions, not the historical comparison or new trial rules.
const monitoredScript=script.replace('const predict=(seconds,distance=state.distance)=>rule.start+seconds*distance;',
  'const predict=(seconds,distance=state.distance)=>{globalThis.__recordParameter(distance);return rule.start+seconds*distance;};');
assert.notEqual(monitoredScript,script);
const monitored=mount(360,'#act-3',monitoredScript);
for(let i=0;i<5;i++)monitored.advance();
monitored.evaluations.length=0;monitored.advance();
assert.deepEqual([...new Set(monitored.evaluations)],[22]);
assert.match(monitored.copy.textContent,/（−1 −2 −3）÷ 3 = −2/);
monitored.advance();monitored.advance();
monitored.evaluations.length=0;monitored.advance();
assert.deepEqual([...new Set(monitored.evaluations)],[35]);
assert.equal(monitored.svg.getAttribute('data-ma-direction-derivative'),'2');
monitored.evaluations.length=0;monitored.advance();
assert.ok(monitored.evaluations.includes(34));assert.ok(!monitored.evaluations.includes(36));
console.log('PASS: derivative follows current computations; no finite-difference or hidden candidate search.');
function assertStepSummary(app,parameter,actual=30) {
  const format=value=>Math.abs(value)<1e-9?'0':Number(value.toPrecision(6)).toString();
  assert.equal(app.copy.querySelectorAll('[data-ma-step-value]')[0].textContent,format(parameter));
  assert.equal(app.copy.querySelectorAll('[data-ma-step-error]')[0].textContent,format(2*Math.abs(parameter-actual)));
  assert.ok(app.copy.children.length<=3);
}
function assertStepWindows(app,width,parameter,progress=1,actual=30) {
  assert.equal(app.figure.hidden,false);
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'local-positions');
  close(app.svg.getAttribute('data-ma-step-parameter'),parameter);
  close(app.svg.getAttribute('data-ma-local-progress'),progress);
  const center=(width+40)/2,scale=(width-80)/14,mix=(a,b)=>a+(b-a)*progress;
  close(app.svg.getAttribute('data-ma-local-scale'),scale);
  const records=app.svg.querySelectorAll('[data-ma-local-record]'),points=app.svg.querySelectorAll('[data-ma-local-prediction]'),gaps=app.svg.querySelectorAll('[data-ma-local-gap]');
  assert.equal(records.length,3);assert.equal(points.length,3);assert.equal(gaps.length,3);
  points.forEach((point,index)=>{
    const t=index+1,answer=20+actual*t,prediction=20+parameter*t,residual=prediction-answer,y=64+80*index,sourceX=54+t/4.4*(width-76);
    close(point.getAttribute('cx'),mix(sourceX,center+residual*scale));
    close(point.getAttribute('cy'),mix(260-prediction/200*227,y));
    close(point.getAttribute('data-ma-local-value'),prediction);
    close(records[index].getAttribute('cx'),mix(sourceX,center));
    close(records[index].getAttribute('cy'),mix(260-answer/200*227,y));
    close(gaps[index].getAttribute('data-ma-local-residual'),residual);
    if(progress===1) {
      assert.ok(Number(point.getAttribute('cx'))>=60&&Number(point.getAttribute('cx'))<=width-20,'the fixed local scale contains every prediction');
      close(Number(point.getAttribute('cx'))-Number(records[index].getAttribute('cx')),residual*scale);
    }
  });
  assertStepSummary(app,parameter,actual);
}
function assertStepArrow(app,width,alpha) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'parameter-step');
  close(app.svg.getAttribute('data-ma-step-alpha'),alpha);
  const target=29+2*alpha;
  close(app.svg.getAttribute('data-ma-step-target'),target);
  const arrow=app.svg.querySelectorAll('[data-ma-parameter-arrow]')[0];
  close(arrow.getAttribute('data-ma-parameter-delta'),2*alpha);
  close(Number(arrow.getAttribute('x2'))-Number(arrow.getAttribute('x1')),2*alpha/4*(width-56));
  close(app.copy.querySelectorAll('[data-ma-step-alpha]')[0].textContent,alpha);
  close(app.copy.querySelectorAll('[data-ma-step-target]')[0].textContent,target);
}
function chooseRate(app,alpha) {
  const button=app.copy.querySelectorAll('[data-ma-rate-choice]').find(node=>Number(node.getAttribute('data-ma-rate-choice'))===alpha);
  assert.ok(button);button.fire('click');
}
function reachStepPractice(app) {for(let i=0;i<9;i++)app.advance();}
function expandRate(app) {
  const button=app.copy.querySelectorAll('[data-ma-rate-expand]')[0];
  assert.ok(button,'free input opens after observing both explained results');button.fire('click');
}
function enterRate(app,value) {
  const input=app.copy.querySelectorAll('[data-ma-rate-input]')[0];assert.ok(input);
  input.value=value;input.fire('change');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-4');
  assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一次只改一点/);
  app.retreat();assert.match(app.copy.textContent,/一次应该改多少/);
  app.advance();app.advance();assert.equal(assertPlotGeometry(app,width),29);assertStepSummary(app,29);
  assert.match(app.copy.textContent,/放大、转向/);
  app.advance();assertStepWindows(app,width,29);
  app.advance();assertStepWindows(app,width,29.5);assert.match(app.copy.textContent,/仍停在左侧/);
  app.advance();assertStepWindows(app,width,29);assert.match(app.copy.textContent,/回到同一起点29/);
  app.advance();assertStepWindows(app,width,31);assert.match(app.copy.textContent,/电脑本轮只决定采用31/);
  app.advance();assertStepWindows(app,width,29);assert.match(app.copy.textContent,/重复状态/);
  app.advance();assertStepArrow(app,width,1);
  app.advance();assertStepArrow(app,width,0.25);assert.match(app.copy.textContent,/学习率/);
  app.retreat();assertStepArrow(app,width,1);
  app.advance();app.advance();assertStepWindows(app,width,29);
  assert.equal(app.copy.querySelectorAll('[data-ma-rate-input]').length,0);
  assert.equal(app.copy.querySelectorAll('[data-ma-rate-expand]').length,0);
  assert.equal(app.automatic.hidden,false);
  app.advance();assertStepWindows(app,width,29.5);
  app.advance();assertStepWindows(app,width,30);assert.equal(app.automatic.hidden,true);
  assert.match(app.copy.textContent,/对齐/);
  app.retreat();assertStepWindows(app,width,29.5);
  app.advance();assertStepWindows(app,width,30);
  chooseRate(app,1);assertStepWindows(app,width,29);
  app.advance();assertStepWindows(app,width,31);
  app.advance();assertStepWindows(app,width,29);assert.match(app.copy.textContent,/已经出现过的参数/);
  assert.equal(app.automatic.hidden,true);
  expandRate(app);enterRate(app,'0.3');assertStepWindows(app,width,29);
  app.advance();assertStepWindows(app,width,29.6);
  app.advance();assertStepWindows(app,width,30.2);assert.equal(app.next.textContent,'更新一次','crossing may still improve the error');
  app.advance();assertStepWindows(app,width,29.6);assert.match(app.copy.textContent,/已经出现过的参数/);
  assert.equal(app.automatic.hidden,true);
  for(const invalid of ['', '0', '1.51', 'NaN', 'Infinity']) {
    enterRate(app,invalid);
    assert.equal(app.copy.querySelectorAll('[data-ma-rate-input]')[0].getAttribute('aria-invalid'),'true');
    assert.match(app.copy.textContent,/尚未应用/);
    assert.equal(app.next.textContent,'请先修正学习率');
    app.advance();assertStepWindows(app,width,29.6);
  }
  enterRate(app,'1.5');assertStepWindows(app,width,29);
  app.advance();assertStepWindows(app,width,32);
  app.advance();assertStepWindows(app,width,29);
  enterRate(app,'0.1');
  for(let i=0;i<5;i++)app.advance();
  assert.match(app.copy.textContent,/对齐/);assert.equal(app.automatic.hidden,true);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一维梯度下降/);
  app.advance();assert.equal(app.figure.hidden,false);assert.match(app.copy.textContent,/这次不知道起始位置/);
  app.retreat();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一维梯度下降/);
  console.log('PASS width='+width+': fourth-act handoff, zoom, overshoot, same-start comparison, scaled update, real convergence/cycles, custom validation and reset');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-4',script,true);
  app.advance();app.advance();assertStepWindows(app,width,29,0);
  app.frame(450);assertStepWindows(app,width,29,0.5);
  app.frame(450);assertStepWindows(app,width,29);
  app.advance();app.frame(450);assertStepWindows(app,width,29.25);
  app.frame(450);assertStepWindows(app,width,29.5);
  app.advance();app.frame(900);assertStepWindows(app,width,29);
  app.advance();app.frame(450);assertStepWindows(app,width,30);
  assert.ok(!app.copy.textContent.includes('训练完成'),'crossing during presentation is not an extra training step');
  app.frame(450);assertStepWindows(app,width,31);
  app.advance();app.frame(450);assertStepWindows(app,width,30);
  app.frame(450);assertStepWindows(app,width,29);
  app.advance();app.advance();app.frame(450);assertStepArrow(app,width,0.625);
  app.frame(450);assertStepArrow(app,width,0.25);
  app.retreat();app.frame(450);assertStepArrow(app,width,0.625);
  app.resize();assert.equal(app.frames.size,0);assertStepArrow(app,width,1);
  app.advance();app.advance();assertStepWindows(app,width,29);assert.equal(app.frames.size,0);
  app.automatic.fire('click');assert.equal(app.timers.size,1);
  app.tick();app.frame(450);assertStepWindows(app,width,29.25);
  app.automatic.fire('click');assertStepWindows(app,width,29.5);assert.equal(app.timers.size,0);assert.equal(app.frames.size,0);
  app.automatic.fire('click');app.tick();assert.equal(app.timers.size,0);
  app.frame(450);assertStepWindows(app,width,29.75);
  app.frame(450);assertStepWindows(app,width,30);
  chooseRate(app,1);app.frame(900);
  app.advance();app.frame(450);assertStepWindows(app,width,30);
  assert.equal(app.next.textContent,'更新一次','the zero-error midpoint must not stop the adopted31 state');
  app.frame(450);assertStepWindows(app,width,31);
  app.advance();app.hide();assertStepWindows(app,width,29);assert.equal(app.timers.size,0);assert.equal(app.frames.size,0);app.show();
  chooseRate(app,0.25);app.automatic.fire('click');app.tick();app.frame(450);
  app.leave();assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);app.resume();
  assertStepWindows(app,width,29.5);assert.equal(app.automatic.textContent,'自动继续');
  app.advance();app.goToThird();assert.equal(app.frames.size,0);assert.equal(app.figure.hidden,true);
  app.goToFourth();assert.match(app.copy.textContent,/一次只改一点/);
  console.log('PASS width='+width+': magnification frames, real zero crossing, proportional arrow, live formula, resize, pause, visibility and navigation');
}
const fourthReduced=mount(360,'#act-4',script,'reduce');
reachStepPractice(fourthReduced);fourthReduced.advance();fourthReduced.advance();
assertStepWindows(fourthReduced,360,30);assert.equal(fourthReduced.frames.size,0);
// The chosen target depends on the records. It does not head towards a hard-coded30.
for(const [actual,sequence] of [[27.5,[28.5,28,27.5]],[29.8,[29.5,30,29.5]]]) {
  const alternate=script.replace('positionAt:seconds=>20+30*seconds','positionAt:seconds=>20+'+actual+'*seconds');
  const app=mount(360,'#act-4',alternate);reachStepPractice(app);
  sequence.forEach(parameter=>{app.advance();assertStepWindows(app,360,parameter,1,actual);});
  assert.equal(app.automatic.hidden,true);
  assert.match(app.copy.textContent,actual===27.5?/对齐/:/已经出现过/);
}
const derivativeMonitored=script.replace('function errorDerivative(distance) {','function errorDerivative(distance) { globalThis.__recordDerivative(distance);');
assert.notEqual(derivativeMonitored,script);
const stopAtZero=mount(360,'#act-4',derivativeMonitored);reachStepPractice(stopAtZero);
stopAtZero.derivativeInputs.length=0;stopAtZero.advance();stopAtZero.advance();
assert.ok(stopAtZero.derivativeInputs.includes(29)&&stopAtZero.derivativeInputs.includes(29.5));
assert.ok(!stopAtZero.derivativeInputs.includes(30),'stop on zero error before requesting a derivative at the absolute-value corner');
const automaticCycle=mount(360,'#act-4');reachStepPractice(automaticCycle);chooseRate(automaticCycle,1);
automaticCycle.automatic.fire('click');let stepTicks=0;
while(automaticCycle.timers.size&&stepTicks++<10)automaticCycle.tick();
assert.equal(stepTicks,2);assert.equal(automaticCycle.timers.size,0);assert.match(automaticCycle.copy.textContent,/已经出现过/);
console.log('PASS fourth act: alternate-data updates, no fabricated zero derivative, reduced motion, automatic repeat detection');
function assertBiasGeometry(app,width,offset=20,slope=30) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'time-position-bias');
  close(app.svg.getAttribute('data-ma-bias-offset'),offset);close(app.svg.getAttribute('data-ma-bias-slope'),slope);
  const X=t=>54+t/4.4*(width-76),Y=p=>260-p/200*227;
  const actual=[80,110,140],values=actual.map((_,index)=>offset+(index+1)*slope);
  const records=app.svg.querySelectorAll('[data-ma-bias-record]'),points=app.svg.querySelectorAll('[data-ma-bias-prediction]'),gaps=app.svg.querySelectorAll('[data-ma-bias-gap]');
  assert.equal(records.length,3,'the starting position is not an observed record');
  points.forEach((point,index)=>{
    close(point.getAttribute('cx'),X(index+1));close(point.getAttribute('cy'),Y(values[index]));
    close(point.getAttribute('data-ma-bias-value'),values[index]);
    close(records[index].getAttribute('cy'),Y(actual[index]));
    close(gaps[index].getAttribute('y1'),Y(actual[index]));close(gaps[index].getAttribute('y2'),Y(values[index]));
  });
  const model=app.svg.querySelectorAll('[data-ma-bias-line]')[0];
  close(model.getAttribute('y1'),Y(offset));close(model.getAttribute('y2'),Y(offset+4.4*slope));
  close(app.copy.querySelectorAll('[data-ma-bias-offset]')[0].textContent,Number(offset.toFixed(1)));
  close(app.copy.querySelectorAll('[data-ma-bias-slope]')[0].textContent,Number(slope.toFixed(1)));
  const error=actual.reduce((sum,value,index)=>sum+Math.abs(values[index]-value),0)/3;
  close(app.copy.querySelectorAll('[data-ma-bias-error]')[0].textContent,Number(error.toFixed(1)));
  assert.ok(app.copy.children.length<=3);assert.equal(app.automatic.hidden,true);
  return values;
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-5');
  assertBiasGeometry(app,width);assert.match(app.copy.textContent,/这次不知道起始位置/);assert.equal(app.handle.hidden,true);
  app.advance();assertBiasGeometry(app,width,20,40);
  app.advance();assertBiasGeometry(app,width,20,45);
  app.retreat();assertBiasGeometry(app,width,20,40);
  app.advance();app.advance();const before=assertBiasGeometry(app,width);
  assert.equal(app.handle.hidden,false);assert.equal(app.handle.getAttribute('aria-orientation'),'vertical');
  const scale=227/200;
  // Drag the line itself; the existing native handle owns pointer capture.
  app.svg.querySelectorAll('[data-ma-bias-drag]')[0].fire('pointerdown',{pointerId:5,clientY:200,button:0});
  app.handle.fire('pointermove',{pointerId:5,clientY:200-30*scale});
  app.handle.fire('pointerup',{pointerId:5});
  const after=assertBiasGeometry(app,width,50,30);
  assert.deepEqual(after.map((value,index)=>value-before[index]),[30,30,30]);
  assert.match(app.copy.textContent,/三个预测同时对齐/);
  app.key('ArrowUp');assertBiasGeometry(app,width,51);assert.match(app.copy.textContent,/偏高/);
  app.key('ArrowDown');assertBiasGeometry(app,width,50);
  app.key('Home');assertBiasGeometry(app,width,0);
  app.key('End');assertBiasGeometry(app,width,80);
  app.key('PageDown');assertBiasGeometry(app,width,75);
  // Every prediction point supports the same whole-model drag, not only the handle.
  app.svg.querySelectorAll('[data-ma-bias-prediction]')[0].fire('pointerdown',{pointerId:6,clientY:100,button:0});
  app.handle.fire('pointermove',{pointerId:6,clientY:100+25*scale});
  app.handle.fire('pointercancel',{pointerId:6});assertBiasGeometry(app,width,50);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/两个可调整的数/);
  app.retreat();assertBiasGeometry(app,width,50);
  app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/两个数各自该改多少/);
  app.retreat();app.retreat();assertBiasGeometry(app,width,50);
  const short=mount(width,'#act-5');for(let i=0;i<4;i++)short.advance();
  assert.equal(short.figure.hidden,true,'four advances reach the short ending without extra text-only steps');
  console.log('PASS width='+width+': short fifth act, real alignment attempts, parallel shift, line/point dragging, keyboard, boundaries, revisit and replay');
}
const biasMotion=mount(360,'#act-5',script,true);
biasMotion.advance();biasMotion.frame(350);assertBiasGeometry(biasMotion,360,20,35);
biasMotion.frame(350);assertBiasGeometry(biasMotion,360,20,40);
biasMotion.advance();biasMotion.frame(350);assertBiasGeometry(biasMotion,360,20,42.5);
biasMotion.hide();assertBiasGeometry(biasMotion,360,20,45);assert.equal(biasMotion.frames.size,0);biasMotion.show();
biasMotion.retreat();biasMotion.goToFourth();assert.equal(biasMotion.frames.size,0);
biasMotion.goToFifth();biasMotion.advance();biasMotion.advance();assertBiasGeometry(biasMotion,360,20,30);
biasMotion.handle.fire('pointerdown',{pointerId:7,clientY:100,button:0});
biasMotion.goToFourth();biasMotion.handle.fire('pointermove',{pointerId:7,clientY:20});
biasMotion.goToFifth();biasMotion.advance();assertBiasGeometry(biasMotion,360,20,30);
biasMotion.handle.fire('pointerdown',{pointerId:8,clientY:100,button:0});biasMotion.hide();biasMotion.show();
biasMotion.handle.fire('pointermove',{pointerId:8,clientY:50});assertBiasGeometry(biasMotion,360,20,30);
biasMotion.goToSecond();for(let i=0;i<4;i++)biasMotion.retreat();
assert.equal(biasMotion.handle.getAttribute('aria-orientation'),'horizontal');assert.equal(biasMotion.handle.getAttribute('aria-valuemax'),'40');
const biasReduced=mount(360,'#act-5',script,'reduce');biasReduced.advance();assertBiasGeometry(biasReduced,360,20,40);
assert.equal(biasReduced.frames.size,0);
console.log('PASS fifth act: actual animated trial values, hidden-page settling, cancelled drag/navigation, reduced motion');
const capturedWave=script.replace('    const waveChapter=', '    globalThis.__captureWaveMath({compute:waveCompute,step:waveStep,history:waveHistoryParams});\n    const waveChapter=');
assert.notEqual(capturedWave,script);
const math=mount(360,'#act-6',capturedWave).waveMath;
const waveData=[1,2,3].map(seconds=>({seconds,position:50+30*seconds}));
for(const loss of ['mae','mse']) {
  const params={a:29,b:21},actual=math.compute(waveData,params,loss);
  for(const key of ['a','b']) {
    const h=1e-4,plus={...params,[key]:params[key]+h},minus={...params,[key]:params[key]-h};
    const numeric=(math.compute(waveData,plus,loss).value-math.compute(waveData,minus,loss).value)/(2*h);
    assert.ok(Math.abs(numeric-actual.gradient[key])<1e-6);
  }
}
close(math.compute(waveData,{a:30,b:50}).gradient.a,0);
assert.equal(math.compute(waveData,{a:30,b:50},'mae').gradient.a,null);
assert.throws(()=>math.step(waveData,{a:30,b:50},0.25,'mae'));
const simultaneous=math.step(waveData,{a:30,b:20},0.05);
close(simultaneous.a,36);close(simultaneous.b,23);close(math.compute(waveData,simultaneous).value,249);
console.log('PASS new math: analytic gradients match independent finite differences; both updates use the same old parameters; absolute-value corners remain undefined');
function waveModel(app,width,data=waveData,max=200) {
  const params={a:Number(app.svg.getAttribute('data-ma-wave-a')),b:Number(app.svg.getAttribute('data-ma-wave-b'))};
  const loss=app.svg.getAttribute('data-ma-wave-score'),score=math.compute(data,params,loss).value,Y=p=>260-p/max*227;
  close(app.svg.getAttribute('data-ma-wave-loss'),score);
  for(const key of ['a','b'])close(app.copy.querySelectorAll('[data-ma-wave-'+key+']')[0].textContent,Number(params[key].toFixed(4)));
  close(app.copy.querySelectorAll('[data-ma-wave-loss]')[0].textContent,Number(score.toFixed(4)));
  app.svg.querySelectorAll('[data-ma-bias-prediction]').forEach((point,i)=>{
    close(point.getAttribute('cy'),Y(params.b+params.a*data[i].seconds));
    close(point.getAttribute('cx'),54+data[i].seconds/4.4*(width-76));
  });
  assert.equal(app.handle.hidden,true);assert.ok(app.copy.children.length<=3);
  return params;
}
function clickWaveNumber(app,key) {
  const button=app.copy.querySelectorAll('[data-ma-wave-term]').find(node=>node.getAttribute('data-ma-wave-term')===key);
  assert.ok(button);button.fire('click');
}
function assertProbeGeometry(app,expected,loss='mae') {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'parameter-experiment');
  const params={a:Number(app.svg.getAttribute('data-ma-probe-a')),b:Number(app.svg.getAttribute('data-ma-probe-b'))};
  if(expected)for(const key of ['a','b'])close(params[key],expected[key]);
  const evaluation=math.compute(waveData,params,loss),unit=Number(app.svg.getAttribute('data-ma-probe-unit')),origin=Number(app.svg.getAttribute('data-ma-probe-origin'));
  close(app.svg.getAttribute('data-ma-probe-loss'),evaluation.value);
  app.copy.querySelectorAll('[data-ma-wave-term]').forEach(button=>close(button.textContent,Number(params[button.getAttribute('data-ma-wave-term')].toFixed(1))));
  app.svg.querySelectorAll('[data-ma-probe-prediction]').forEach((point,i)=>{
    close(point.getAttribute('cx'),origin+evaluation.rows[i].residual*unit);
    close(point.getAttribute('data-ma-probe-value'),evaluation.rows[i].prediction);
  });
  app.svg.querySelectorAll('[data-ma-probe-gap]').forEach((gap,i)=>{
    close(gap.getAttribute('x1'),origin);close(gap.getAttribute('x2'),origin+evaluation.rows[i].residual*unit);
  });
  app.svg.querySelectorAll('[data-ma-probe-gap-value]').forEach((label,i)=>close(label.textContent,Number(evaluation.rows[i].gap.toFixed(1))));
  assert.equal(app.svg.querySelectorAll('[data-ma-effect-trace]').length,0);
  assert.ok(app.copy.children.length<=3);return evaluation;
}
function assertCancellationGeometry(app,width,progress) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'prediction-cancellation');
  close(app.svg.getAttribute('data-ma-cancel-progress'),progress);
  const a=Number(app.svg.getAttribute('data-ma-cancel-a')),b=Number(app.svg.getAttribute('data-ma-cancel-b')),unit=Number(app.svg.getAttribute('data-ma-cancel-unit'));
  close(app.copy.querySelectorAll('[data-ma-interval-a]')[0].textContent,Number(a.toFixed(4)));
  close(app.copy.querySelectorAll('[data-ma-interval-b]')[0].textContent,Number(b.toFixed(4)));
  const meeting=Math.min(1,progress/0.6),fading=Math.max(0,Math.min(1,(progress-0.6)/0.22)),remaining=Math.max(0,Math.min(1,(progress-0.82)/0.18));
  const pairs=app.svg.querySelectorAll('[data-ma-cancel-pair]');assert.equal(pairs.length,2);
  pairs.forEach((pair,index)=>{
    const i=index+1,top=28+index*140,bottom=78+index*140,middle=(top+bottom)/2;
    close(pair.getAttribute('data-ma-cancel-before'),b+i*a);close(pair.getAttribute('data-ma-cancel-after'),b+(i+1)*a);
    close(pair.getAttribute('data-ma-increment-value'),a);close(pair.getAttribute('data-ma-actual-increment'),index===0?30:50);
    const shared=pair.querySelectorAll('[data-ma-shared-block]');assert.equal(shared.length,2*(i+1));
    for(const row of ['later','earlier']) {
      const terms=shared.filter(node=>node.getAttribute('data-ma-shared-row')===row);
      close(terms.reduce((sum,node)=>sum+Number(node.getAttribute('data-ma-shared-value')),0),b+i*a);
    }
    shared.forEach(block=>{
      const term=Number(block.getAttribute('data-ma-shared-index')),value=term===0?b:a,row=block.getAttribute('data-ma-shared-row'),y=row==='later'?top:bottom;
      close(block.getAttribute('opacity'),1-fading);
      const rect=block.querySelectorAll('[data-ma-shared-rectangle]')[0];
      close(rect.getAttribute('width'),value*unit);close(rect.getAttribute('y'),y+(middle-y)*meeting);
      const match=shared.find(other=>other.getAttribute('data-ma-shared-index')===String(term)&&other.getAttribute('data-ma-shared-row')!==row);
      close(rect.getAttribute('x'),match.querySelectorAll('[data-ma-shared-rectangle]')[0].getAttribute('x'));
    });
    const survivor=pair.querySelectorAll('[data-ma-surviving-block]')[0],initialX=60+b*unit+i*a*unit+(i+1)*3;
    close(survivor.getAttribute('width'),a*unit);close(survivor.getAttribute('data-ma-surviving-value'),a);
    close(survivor.getAttribute('x'),initialX+(60-initialX)*remaining);close(survivor.getAttribute('y'),top+(middle-top)*remaining);
    assert.ok(Number(survivor.getAttribute('x'))+a*unit<=width-20+1e-8);
  });
  assert.ok(app.copy.children.length<=3);
}
function assertBalanceGeometry(app,width,progress) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'balancing-line');
  close(app.svg.getAttribute('data-ma-balance-progress'),progress);
  const params=waveModel(app,width);close(params.a,15+15*progress);close(params.b,65-30*progress);
  close(app.svg.getAttribute('data-ma-wave-loss'),15);
  assert.equal(app.svg.querySelectorAll('[data-ma-bias-line]').length,1);
  return params;
}
function assertScoreGeometry(app,width,phase) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'score-areas');
  close(app.svg.getAttribute('data-ma-score-phase'),phase);
  const layout=Math.min(1,phase),unfold=Math.max(0,Math.min(1,phase-1)),comparison=phase>3?Math.max(0,4-phase):Math.max(0,phase-2);
  const params={a:30-15*comparison,b:35+30*comparison},evaluation=math.compute(waveData,params);
  close(app.svg.getAttribute('data-ma-score-a'),params.a);close(app.svg.getAttribute('data-ma-score-b'),params.b);
  close(app.svg.getAttribute('data-ma-score-mse'),evaluation.value);
  close(app.svg.getAttribute('data-ma-wave-a'),params.a);close(app.svg.getAttribute('data-ma-wave-b'),params.b);
  close(app.svg.getAttribute('data-ma-wave-loss'),math.compute(waveData,params,app.svg.getAttribute('data-ma-wave-score')).value);
  const cell=(width-48)/3,unit=Math.min(4,(cell-12)/30),mix=(a,b)=>a+(b-a)*layout;
  const gaps=app.svg.querySelectorAll('[data-ma-score-gap]');assert.equal(gaps.length,3);
  gaps.forEach((gap,i)=>{
    const row=evaluation.rows[i],targetX=24+(i+0.5)*cell-30*unit/2,sourceX=54+row.seconds/4.4*(width-76);
    close(gap.getAttribute('x1'),mix(sourceX,targetX));close(gap.getAttribute('x2'),mix(sourceX,targetX));
    close(gap.getAttribute('y1'),mix(260-row.position/200*227,232-row.gap*unit));
    close(gap.getAttribute('y2'),mix(260-row.prediction/200*227,232));
  });
  app.svg.querySelectorAll('[data-ma-score-cell]').forEach(rect=>{
    const side=Number(rect.getAttribute('data-ma-score-side'));
    close(rect.getAttribute('width'),side*unit*unfold);close(rect.getAttribute('height'),side*unit);
    close(Number(rect.getAttribute('width'))*Number(rect.getAttribute('height'))/unit**2,Number(rect.getAttribute('data-ma-score-term'))*unfold);
  });
  const loss=app.copy.querySelectorAll('[data-ma-wave-loss]')[0];
  if(phase>1&&phase<2)assert.equal(loss.textContent,'展开中');
  else if(phase>=2)close(loss.textContent,Number(evaluation.value.toFixed(4)));
  else if(phase<1)close(loss.textContent,15);
  assert.ok(app.copy.children.length<=3);return evaluation;
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-6');assert.equal(app.figure.hidden,true);app.advance();
  assertProbeGeometry(app,{a:30,b:20});assert.equal(app.next.disabled,true);
  app.advance();assertProbeGeometry(app,{a:30,b:20});
  clickWaveNumber(app,'a');const slopeProbe=assertProbeGeometry(app,{a:31,b:20});
  assert.deepEqual(slopeProbe.rows.map(row=>row.prediction),[51,82,113]);close(slopeProbe.value,28);
  assert.equal(app.next.disabled,true);
  clickWaveNumber(app,'b');const biasProbe=assertProbeGeometry(app,{a:31,b:21});close(biasProbe.value,27);
  assert.equal(app.next.disabled,false);
  clickWaveNumber(app,'a');assertProbeGeometry(app,{a:32,b:21});app.retreat();assertProbeGeometry(app,{a:31,b:21});
  app.advance();
  waveModel(app,width);app.advance();const joint=waveModel(app,width);close(joint.a,30.5);close(joint.b,20.25);
  app.retreat();close(waveModel(app,width).a,30);app.advance();app.advance();
  assertBalanceGeometry(app,width,0);app.advance();assertBalanceGeometry(app,width,1);
  app.retreat();assertBalanceGeometry(app,width,0);app.advance();app.advance();
  assertScoreGeometry(app,width,1);app.advance();close(assertScoreGeometry(app,width,2).value,225);
  app.advance();close(assertScoreGeometry(app,width,3).value,375);
  app.retreat();close(assertScoreGeometry(app,width,2).value,225);app.advance();
  app.advance();close(assertScoreGeometry(app,width,4).value,225);
  app.advance();app.advance();
  const strips=app.svg.querySelectorAll('[data-ma-strip-part]');
  for(const d of [3,6]) {
    const areas=strips.filter(n=>n.getAttribute('data-ma-strip-part').startsWith(d+'-')).map(n=>Number(n.getAttribute('data-ma-strip-area')));
    close(areas[0]+areas[1],d*d-(d-0.5)**2);
  }
  app.advance();app.advance();close(app.svg.getAttribute('data-ma-normalized-width'),0.1);
  app.svg.querySelectorAll('[data-ma-normalized-result]').forEach(n=>close(n.getAttribute('data-ma-normalized-value'),2*Number(n.getAttribute('data-ma-normalized-result'))-0.1));
  app.advance();assertProbeGeometry(app,{a:30,b:20},'mse');
  clickWaveNumber(app,'a');assertProbeGeometry(app,{a:31,b:20},'mse');
  clickWaveNumber(app,'b');assertProbeGeometry(app,{a:31,b:21},'mse');app.advance();
  app.advance();close(waveModel(app,width,waveData,250).a,36);app.advance();const roundTwo=waveModel(app,width,waveData,250);
  app.retreat();close(waveModel(app,width,waveData,250).a,36);app.advance();close(waveModel(app,width,waveData,250).a,roundTwo.a);
  app.automatic.fire('click');app.tick();app.automatic.fire('click');assert.equal(app.timers.size,0);
  app.automatic.fire('click');let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);
  assert.ok(Number(app.svg.getAttribute('data-ma-wave-loss'))<=0.01);assert.equal(app.automatic.hidden,true);
  const rates=app.copy.querySelectorAll('[data-ma-wave-rate]');rates.find(n=>n.getAttribute('data-ma-wave-rate')==='0.25').fire('click');
  app.advance();const overshoot=waveModel(app,width,waveData,250);close(overshoot.a,60);close(overshoot.b,35);close(app.svg.getAttribute('data-ma-wave-loss'),2625);
  assert.match(app.copy.textContent,/先暂停/);assert.equal(app.automatic.hidden,true);
  app.advance();app.advance();const shapeData=[70,100,150].map((position,index)=>({seconds:index+1,position}));
  const fitted=waveModel(app,width,shapeData);assert.ok(Math.abs(fitted.a-40)<1e-5);assert.ok(Math.abs(fitted.b-80/3)<1e-5);
  assert.ok(Math.abs(Number(app.svg.getAttribute('data-ma-wave-loss'))-200/9)<1e-8);
  app.advance();assertCancellationGeometry(app,width,0);app.advance();assertCancellationGeometry(app,width,1);
  app.retreat();assertCancellationGeometry(app,width,0);app.advance();assertCancellationGeometry(app,width,1);
  app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.match(app.copy.textContent,/保留已经正确的预测/);
  console.log('PASS width='+width+': direct parameter increments, real line comparison at constant MAE, extracted gaps and square scoring, simultaneous updates, real training and linear-model limitation');
}
const movingWave=mount(360,'#act-6',script,true);
movingWave.advance();clickWaveNumber(movingWave,'a');movingWave.frame(400);assertProbeGeometry(movingWave,{a:30.5,b:20});
movingWave.frame(400);clickWaveNumber(movingWave,'b');movingWave.frame(400);assertProbeGeometry(movingWave,{a:31,b:20.5});
movingWave.frame(400);movingWave.retreat();movingWave.frame(400);assertProbeGeometry(movingWave,{a:31,b:20.5});
movingWave.hide();assertProbeGeometry(movingWave,{a:31,b:20});movingWave.show();clickWaveNumber(movingWave,'b');movingWave.frame(800);
movingWave.advance();movingWave.advance();movingWave.frame(400);
const jointHalf=waveModel(movingWave,360);close(jointHalf.a,30.25);close(jointHalf.b,20.125);
movingWave.hide();close(waveModel(movingWave,360).a,30.5);assert.equal(movingWave.frames.size,0);movingWave.show();
const movingTrain=mount(360,'#act-8',script,true);
for(let i=0;i<4;i++)movingTrain.advance();
clickWaveNumber(movingTrain,'a');clickWaveNumber(movingTrain,'b');movingTrain.advance();
assert.equal(movingTrain.svg.getAttribute('data-ma-chart-kind'),'wave-model');
movingTrain.advance();movingTrain.frame(400);close(waveModel(movingTrain,360,waveData,250).a,33);
movingTrain.frame(400);movingTrain.advance();movingTrain.frame(800);
movingTrain.automatic.fire('click');movingTrain.tick();movingTrain.frame(400);
const interpolated=waveModel(movingTrain,360,waveData,250);let expected={a:30,b:20};for(let i=0;i<12;i++)expected=math.step(waveData,expected,0.05);
close(interpolated.a,expected.a);close(interpolated.b,expected.b);
movingTrain.automatic.fire('click');assert.equal(movingTrain.frames.size,0);assert.equal(movingTrain.timers.size,0);
movingTrain.automatic.fire('click');movingTrain.goToSecond();assert.equal(movingTrain.timers.size,0);assert.equal(movingTrain.frames.size,0);
const reducedWave=mount(280,'#act-9',script,'reduce');reducedWave.advance();assert.equal(reducedWave.frames.size,0);
reducedWave.advance();assertCancellationGeometry(reducedWave,280,0);reducedWave.advance();assertCancellationGeometry(reducedWave,280,1);
assert.equal(reducedWave.frames.size,0);
for(const width of [736,360,280]) {
  const cancellation=mount(width,'#act-9',script,true);cancellation.advance();cancellation.advance();
  assertCancellationGeometry(cancellation,width,0);cancellation.advance();cancellation.frame(600);assertCancellationGeometry(cancellation,width,0.5);
  cancellation.frame(240);assertCancellationGeometry(cancellation,width,0.784);
  cancellation.frame(240);assertCancellationGeometry(cancellation,width,0.972);
  cancellation.frame(120);assertCancellationGeometry(cancellation,width,1);assert.equal(cancellation.frames.size,0);
  cancellation.retreat();cancellation.frame(600);assertCancellationGeometry(cancellation,width,0.5);
  cancellation.hide();assertCancellationGeometry(cancellation,width,0);assert.equal(cancellation.frames.size,0);cancellation.show();
  cancellation.advance();cancellation.frame(600);cancellation.resize();assertCancellationGeometry(cancellation,width,1);assert.equal(cancellation.frames.size,0);
  cancellation.retreat();cancellation.goToSecond();assert.equal(cancellation.frames.size,0);
}
for(const width of [736,360,280]) {
  const movingScore=mount(width,'#act-7',script,true);
  assertBalanceGeometry(movingScore,width,0);movingScore.advance();movingScore.frame(550);assertBalanceGeometry(movingScore,width,0.5);
  movingScore.frame(550);assertBalanceGeometry(movingScore,width,1);movingScore.advance();assertScoreGeometry(movingScore,width,0);
  movingScore.frame(500);assertScoreGeometry(movingScore,width,0.5);movingScore.frame(500);assertScoreGeometry(movingScore,width,1);
  movingScore.advance();movingScore.frame(500);assertScoreGeometry(movingScore,width,1.5);movingScore.frame(500);assertScoreGeometry(movingScore,width,2);
  movingScore.advance();movingScore.frame(500);close(assertScoreGeometry(movingScore,width,2.5).value,262.5);
  movingScore.hide();assertScoreGeometry(movingScore,width,3);assert.equal(movingScore.frames.size,0);movingScore.show();
  movingScore.advance();movingScore.frame(500);close(assertScoreGeometry(movingScore,width,3.5).value,262.5);
  movingScore.frame(500);assertScoreGeometry(movingScore,width,4);movingScore.retreat();movingScore.frame(1000);assertScoreGeometry(movingScore,width,3);
  movingScore.retreat();movingScore.frame(500);assertScoreGeometry(movingScore,width,2.5);movingScore.frame(500);assertScoreGeometry(movingScore,width,2);
  movingScore.retreat();movingScore.frame(1000);assertScoreGeometry(movingScore,width,1);movingScore.retreat();assertBalanceGeometry(movingScore,width,1);
  movingScore.retreat();movingScore.frame(550);assertBalanceGeometry(movingScore,width,0.5);movingScore.goToSecond();assert.equal(movingScore.frames.size,0);
}
const reducedScore=mount(280,'#act-7',script,'reduce');reducedScore.advance();assertBalanceGeometry(reducedScore,280,1);
reducedScore.advance();assertScoreGeometry(reducedScore,280,1);reducedScore.advance();assertScoreGeometry(reducedScore,280,2);
reducedScore.advance();assertScoreGeometry(reducedScore,280,3);assert.equal(reducedScore.frames.size,0);
reducedScore.advance();assertScoreGeometry(reducedScore,280,4);assert.equal(reducedScore.frames.size,0);
const reducedProbe=mount(280,'#act-6',script,'reduce');reducedProbe.advance();clickWaveNumber(reducedProbe,'a');assertProbeGeometry(reducedProbe,{a:31,b:20});assert.equal(reducedProbe.frames.size,0);
const crossingProbe=mount(280,'#act-6');crossingProbe.advance();for(let i=0;i<12;i++)clickWaveNumber(crossingProbe,'a');
assertProbeGeometry(crossingProbe,{a:42,b:20});assert.match(crossingProbe.copy.textContent,/越过记录/);
crossingProbe.retreat();clickWaveNumber(crossingProbe,'b');assertProbeGeometry(crossingProbe,{a:41,b:21});
console.log('PASS new motion: computed intermediate model geometry, actual per-round history, pause/navigation cancellation, reduced motion');
assert.ok(!fragment.includes('完成题数'));
assert.ok(!fragment.includes('教学样本'));
assert.ok(!fragment.includes('<pre'));
// Change the simulation itself in an isolated test: the search must derive
// its direction and stopping point from records, rather than head for 30.
for(const [actualDistance,expectedDistance,expectedError] of [[16,16,0],[27.5,27,1]]) {
  const modified=script.replace('positionAt:seconds=>20+30*seconds',`positionAt:seconds=>20+${actualDistance}*seconds`);
  const app=mount(360,'#act-2',modified);
  for(let i=0;i<8;i++) app.advance();
  app.automatic.fire('click');let ticks=0;
  while(app.timers.size>0&&ticks++<100)app.tick();
  assert.ok(ticks<100);
  assert.ok(app.copy.textContent.includes(`每秒${expectedDistance}厘米，平均差距是${expectedError}厘米`));
  console.log(`PASS alternate data: actual=${actualDistance}, learned=${expectedDistance}, mean gap=${expectedError}`);
}
console.log('PASS: approved example and narrative replace the old lesson; no code screen.');
const capturedBend=script.replace('    const waveChapter=', '    globalThis.__captureBendMath({compute:bendCompute});\n    const waveChapter=');
assert.notEqual(capturedBend,script);
const bendMath=mount(360,'#act-10',capturedBend).bendMath;
for(const input of [-1,0,1,2,2.5,3,4]) {
  close(bendMath.compute(input,0,0).prediction,40+30*input);
  close(bendMath.compute(input,1,0).prediction,50*input);
  close(bendMath.compute(input).prediction,input<=2?40+30*input:50*input);
}
const newInput=bendMath.compute(2.5);close(newInput.shifted,0.5);close(newInput.activated,0.5);close(newInput.base,115);close(newInput.extra,10);close(newInput.prediction,125);
const alternateNeuron={base:10,slope:2,weight:2,bias:-3,output:4};
close(bendMath.compute(1,1,1,alternateNeuron).prediction,12);close(bendMath.compute(2,1,1,alternateNeuron).prediction,18);
console.log('PASS neuron math: affine-only composition remains linear, ReLU gives the exact piecewise rule, unseen-input computation and alternate parameters');
function assertBendPlot(app,width,amount,gate,selected=null) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'bent-prediction');
  close(app.svg.getAttribute('data-ma-bend-amount'),amount);close(app.svg.getAttribute('data-ma-bend-gate'),gate);
  const X=t=>54+t/3.5*(width-76),Y=p=>260-p/200*227;
  const records=app.svg.querySelectorAll('[data-ma-bend-record]'),predictions=app.svg.querySelectorAll('[data-ma-bend-prediction]'),gaps=app.svg.querySelectorAll('[data-ma-bend-gap]');
  assert.equal(records.length,3);assert.equal(predictions.length,3);assert.equal(gaps.length,3);
  predictions.forEach((point,index)=>{
    const t=index+1,r=bendMath.compute(t,amount,gate),actual=[70,100,150][index];
    close(point.getAttribute('data-ma-bend-value'),r.prediction);close(point.getAttribute('cx'),X(t));close(point.getAttribute('cy'),Y(r.prediction));
    close(records[index].getAttribute('cy'),Y(actual));close(gaps[index].getAttribute('y1'),Y(actual));close(gaps[index].getAttribute('y2'),Y(r.prediction));
  });
  const curve=app.svg.querySelectorAll('[data-ma-bend-curve]');assert.equal(curve.length,1);
  const vertices=curve[0].getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  [0,2,3.5].forEach((input,index)=>{close(vertices[index*2],X(input));close(vertices[index*2+1],Y(bendMath.compute(input,amount,gate).prediction));});
  app.copy.querySelectorAll('[data-ma-bend-output-weight]').forEach(node=>close(node.textContent,Number((20*amount).toFixed(1))));
  if(selected!==null) {
    const r=bendMath.compute(selected),point=app.svg.querySelectorAll('[data-ma-bend-selected]')[0],contribution=app.svg.querySelectorAll('[data-ma-bend-contribution]')[0];
    close(point.getAttribute('cx'),X(selected));close(point.getAttribute('cy'),Y(r.prediction));close(point.getAttribute('data-ma-bend-selected-value'),r.prediction);
    close(contribution.getAttribute('data-ma-bend-extra'),r.extra);close(contribution.getAttribute('y1'),Y(r.base));close(contribution.getAttribute('y2'),Y(r.prediction));
    assert.equal(app.svg.getAttribute('data-ma-bend-selected-known'),String([1,2,3].includes(selected)));
    assert.ok(!records.some(point=>Number(point.getAttribute('data-ma-bend-record'))===2.5),'never invent a record for the new input');
  }
  assert.ok(app.copy.children.length<=3);assert.equal(app.automatic.hidden,true);assert.equal(app.handle.hidden,true);
}
function points(node) {const values=node.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);return Array.from({length:values.length/2},(_,i)=>values.slice(i*2,i*2+2));}
function assertFunction(app,width,weight,bias,gate=0,activation=false) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),activation?'activation-functions':'affine-parameters');
  close(app.svg.getAttribute('data-ma-function-weight'),weight);close(app.svg.getAttribute('data-ma-function-bias'),bias);close(app.svg.getAttribute('data-ma-function-gate'),gate);
  const X=t=>54+t/3.5*(width-76),Y=v=>260-(v+3)/9*227,knot=-bias/weight;
  const zero=app.svg.querySelectorAll('[data-ma-zero-function]')[0];close(zero.getAttribute('y1'),Y(0));close(zero.getAttribute('y2'),Y(0));
  assert.equal(app.svg.querySelectorAll('[data-ma-raw-function]').length,activation?1:0);
  const vertices=[0,knot,3.5],curve=points(app.svg.querySelectorAll('[data-ma-active-function]')[0]);
  assert.equal(curve.length,3);curve.forEach(([x,y],i)=>{const t=vertices[i],raw=weight*t+bias;close(x,X(t));close(y,Y(raw+(Math.max(0,raw)-raw)*(activation?gate:0)));});
  const root=app.svg.querySelectorAll('[data-ma-function-zero]')[0];close(root.getAttribute('cx'),X(knot));close(root.getAttribute('cy'),Y(0));
  assert.equal(app.handle.hidden,true);assert.ok(app.copy.children.length<=3);
}
function assertComposition(app,width,progress,weight=1,bias=-2,selected=null) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'function-composition');close(app.svg.getAttribute('data-ma-stack-progress'),progress);
  close(app.svg.getAttribute('data-ma-composition-weight'),weight);close(app.svg.getAttribute('data-ma-composition-bias'),bias);
  const X=t=>54+t/3.5*(width-76),Y=v=>260-v/260*227,vertices=[0,-bias/weight,3.5],extra=t=>20*Math.max(0,weight*t+bias);
  for(const [attr,value] of [['data-ma-original-function',t=>40+30*t],['data-ma-composed-function',t=>progress*(40+30*t)+extra(t)]]) {
    const curve=points(app.svg.querySelectorAll('['+attr+']')[0]);assert.equal(curve.length,3);curve.forEach(([x,y],i)=>{close(x,X(vertices[i]));close(y,Y(value(vertices[i])));});
  }
  const band=points(app.svg.querySelectorAll('[data-ma-contribution-band]')[0]);
  const area=Math.abs(band.reduce((sum,p,i)=>{const q=band[(i+1)%band.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  close(area,0.5*(3.5+bias/weight)*extra(3.5)*(width-76)/3.5*227/260);
  assert.equal(app.svg.querySelectorAll('[data-ma-composition-record]').length,3);
  app.svg.querySelectorAll('[data-ma-composition-input]').forEach(node=>{const t=Number(node.getAttribute('data-ma-composition-input')),base=40+30*t;close(node.getAttribute('data-ma-composition-prediction'),base+extra(t));close(node.getAttribute('data-ma-composition-extra'),extra(t));close(node.getAttribute('cx'),X(t));close(node.getAttribute('cy'),Y(progress*base+extra(t)));});
  if(selected!==null) {const node=app.svg.querySelectorAll('[data-ma-bend-selected]')[0];close(node.getAttribute('cx'),X(selected));close(node.getAttribute('cy'),Y(40+30*selected+extra(selected)));assert.equal(app.svg.getAttribute('data-ma-bend-selected-known'),String([1,2,3].includes(selected)));}
}
function parameter(app,key) {const button=app.copy.querySelectorAll('[data-ma-bend-parameter]').find(node=>node.getAttribute('data-ma-bend-parameter')===key);assert.ok(button);assert.equal(button.disabled,false);button.fire('click');}
function chooseBendInput(app,input) {const button=app.copy.querySelectorAll('[data-ma-bend-input]').find(node=>Number(node.getAttribute('data-ma-bend-input'))===input);assert.ok(button);button.fire('click');}
for(const width of [736,360,280]) {
 const app=mount(width,'#act-10');assert.equal(app.figure.hidden,true);app.advance();assertBendPlot(app,width,0,0);app.advance();assertBendPlot(app,width,1,0);
 app.advance();assertFunction(app,width,1,-2,0,true);app.advance();assertFunction(app,width,1,-2,1,true);app.retreat();assertFunction(app,width,1,-2,0,true);app.advance();app.advance();
 assertComposition(app,width,0);app.advance();assertComposition(app,width,1);app.retreat();assertComposition(app,width,0);app.advance();app.advance();
 assertFunction(app,width,1,-2);assert.equal(app.next.disabled,true);app.advance();assertFunction(app,width,1,-2);
 parameter(app,'weight');assertFunction(app,width,2,-2);app.retreat();assertFunction(app,width,1,-2);parameter(app,'weight');app.advance();assertComposition(app,width,1,2,-2);
 app.retreat();assertFunction(app,width,2,-2);app.advance();app.advance();assertFunction(app,width,1,-2);
 parameter(app,'bias');assertFunction(app,width,1,-1);app.advance();assertComposition(app,width,1,1,-1);app.retreat();assertFunction(app,width,1,-1);app.retreat();assertFunction(app,width,1,-2);
 parameter(app,'bias');app.advance();app.advance();assertComposition(app,width,1,1,-2,1);
 chooseBendInput(app,3);assertComposition(app,width,1,1,-2,3);chooseBendInput(app,2.5);assertComposition(app,width,1,1,-2,2.5);assert.match(app.copy.textContent,/125/);assert.match(app.copy.textContent,/尚未核对/);
 app.retreat();assertComposition(app,width,1,1,-1);app.retreat();assertFunction(app,width,1,-1);app.retreat();assertFunction(app,width,1,-2);app.retreat();assertComposition(app,width,1,2,-2);app.retreat();assertFunction(app,width,2,-2);app.retreat();assertFunction(app,width,1,-2);
 parameter(app,'weight');app.advance();app.advance();parameter(app,'bias');app.advance();app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/手动/);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/另开一次实验/);app.advance();assert.equal(Number(app.svg.getAttribute('data-ma-output-current')),10);
 app.goToChapter(11);assertFunction(app,width,1,-2,1,true);app.goToChapter(12);assertComposition(app,width,1,1,-2,2.5);
 console.log('PASS width='+width+': whole-function max, pointwise composition, contribution area, weight/bias interventions, explicit resets, rollback and unseen prediction');
}
for(const width of [736,360,280]) {
 const app=mount(width,'#act-11',script,true);app.advance();app.frame(500);assertFunction(app,width,1,-2,0.5,true);app.resize();assertFunction(app,width,1,-2,1,true);
 app.advance();assertComposition(app,width,0);app.advance();app.frame(600);assertComposition(app,width,0.5);app.hide();assertComposition(app,width,1);app.show();
 app.advance();parameter(app,'weight');app.frame(500);assertFunction(app,width,1.5,-2);app.advance();assertComposition(app,width,1,2,-2);assert.equal(app.frames.size,0);
 app.advance();parameter(app,'bias');app.frame(500);assertFunction(app,width,1,-1.5);app.hide();assertFunction(app,width,1,-1);app.show();app.goToChapter(11);assert.equal(app.frames.size,0);assertFunction(app,width,1,-2,1,true);
}
const reducedFunctions=mount(280,'#act-11',script,'reduce');reducedFunctions.advance();assertFunction(reducedFunctions,280,1,-2,1,true);reducedFunctions.advance();reducedFunctions.advance();assertComposition(reducedFunctions,280,1);reducedFunctions.advance();parameter(reducedFunctions,'weight');assertFunction(reducedFunctions,280,2,-2);reducedFunctions.advance();reducedFunctions.advance();parameter(reducedFunctions,'bias');assertFunction(reducedFunctions,280,1,-1);assert.equal(reducedFunctions.frames.size,0);
console.log('PASS function motion: actual intermediate values, area preservation, reduced motion, interruption and navigation cancellation');

const outputProgram=script.replace('    const waveChapter=','    globalThis.__captureOutputMath({evaluate:outputEvaluate,step:outputStep});\n    const waveChapter=');
const outputMath=mount(360,'#act-13',outputProgram).outputMath;
for(const value of [10,11,17,20,24]) {
  const result=outputMath.evaluate(value);close(result.loss,(value-20)**2/3);close(result.gradient,2*(value-20)/3);
  close(outputMath.step(value),value-0.5*result.gradient);
  const h=1e-4,numerical=(outputMath.evaluate(value+h).loss-outputMath.evaluate(value-h).loss)/(2*h);
  assert.ok(Math.abs(numerical-result.gradient)<1e-7);
}
const outputAlternative=[{seconds:1,position:1},{seconds:1.5,position:4},{seconds:3.5,position:8}],outputParams={base:-2,slope:2,weight:0.5,bias:-0.3};
const alternativeResult=outputMath.evaluate(1.7,outputAlternative,outputParams),delta=1e-4;
const numericalOutput=(outputMath.evaluate(1.7+delta,outputAlternative,outputParams).loss-outputMath.evaluate(1.7-delta,outputAlternative,outputParams).loss)/(2*delta);
assert.ok(Math.abs(alternativeResult.gradient-numericalOutput)<1e-7);
close(outputMath.step(1.7,0.07,outputAlternative,outputParams),1.7-0.07*alternativeResult.gradient);
console.log('PASS output math: analytic gradient, independent finite difference, alternate records/branch parameters, no fixed-target training');

function assertOutputGraph(app,width,value,training=false) {
  close(app.svg.getAttribute('data-ma-output-current'),value);close(app.svg.getAttribute('data-ma-composition-output'),value);
  const result=outputMath.evaluate(value),X=t=>54+t/3.5*(width-76),Y=v=>260-v/260*227;
  const curve=points(app.svg.querySelectorAll('[data-ma-composed-function]')[0]);
  [0,2,3.5].forEach((t,i)=>{close(curve[i][0],X(t));close(curve[i][1],Y(40+30*t+value*Math.max(0,t-2)));});
  app.svg.querySelectorAll('[data-ma-composition-input]').forEach((node,i)=>{
    close(node.getAttribute('data-ma-composition-prediction'),result.rows[i].prediction);close(node.getAttribute('cy'),Y(result.rows[i].prediction));
  });
  const gap=app.svg.querySelectorAll('[data-ma-output-gap]')[0],right=width-22;
  close(gap.getAttribute('data-ma-output-gap-value'),Math.abs(result.rows[2].error));close(gap.getAttribute('x1'),right+result.rows[2].error*(width-76)/10);close(gap.getAttribute('x2'),right);
  const originalGap=app.svg.querySelectorAll('[data-ma-output-original-gap]')[0];close(originalGap.getAttribute('y1'),Y(result.rows[2].prediction));close(originalGap.getAttribute('y2'),Y(150));
  const displayed=Number(app.copy.querySelectorAll('[data-ma-output-weight]')[0].textContent);assert.ok(Math.abs(displayed-value)<0.000051);
  if(training)for(const [attr,expected] of [['data-ma-output-loss',result.loss],['data-ma-output-error',result.rows[2].error],['data-ma-output-gradient',result.gradient]])assert.ok(Math.abs(Number(app.copy.querySelectorAll('['+attr+']')[0].textContent)-expected)<0.000051);
  assert.ok(app.copy.children.length<=3);assert.equal(app.handle.hidden,true);
}
function outputProbe(app) {const button=app.copy.querySelectorAll('[data-ma-output-weight]')[0];assert.equal(button.disabled,false);button.fire('click');}
function enterOutputTrain(app,width) {
  assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/另开一次实验/);app.advance();assertOutputGraph(app,width,10);
  assert.equal(app.next.disabled,true);app.advance();assertOutputGraph(app,width,10);outputProbe(app);assertOutputGraph(app,width,11);app.advance();assertOutputGraph(app,width,11,true);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-13');enterOutputTrain(app,width);assert.equal(app.automatic.hidden,true);
  app.advance();assertOutputGraph(app,width,14,true);assert.equal(app.automatic.hidden,false);
  app.retreat();assertOutputGraph(app,width,11,true);app.retreat();assertOutputGraph(app,width,11);app.retreat();assertOutputGraph(app,width,10);
  outputProbe(app);app.advance();app.advance();assertOutputGraph(app,width,14,true);
  app.automatic.fire('click');assert.equal(app.timers.size,1);app.tick();assertOutputGraph(app,width,16,true);
  app.automatic.fire('click');assert.equal(app.timers.size,0);app.retreat();assertOutputGraph(app,width,14,true);app.advance();assertOutputGraph(app,width,16,true);
  app.automatic.fire('click');let count=0;while(app.timers.size&&count++<100)app.tick();assert.ok(count<100);assert.equal(app.timers.size,0);
  const final=Number(app.svg.getAttribute('data-ma-output-current'));assert.ok(final<20&&final>19.9);assert.ok(outputMath.evaluate(final).loss<=0.001);assert.ok(outputMath.evaluate(final).loss>0);assertOutputGraph(app,width,final,true);assert.equal(app.automatic.hidden,true);
  app.retreat();assert.ok(outputMath.evaluate(Number(app.svg.getAttribute('data-ma-output-current'))).loss>0.001);app.advance();assertOutputGraph(app,width,final,true);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/穿过ReLU/);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/只调整ReLU前面的偏置/);app.retreat();assert.equal(app.figure.hidden,true);app.retreat();assertOutputGraph(app,width,final,true);
  app.goToChapter(11);assertFunction(app,width,1,-2,0,true);app.goToChapter(13);assert.equal(app.figure.hidden,true);
  console.log('PASS output width='+width+': explicit reset, real +1, scaled residual, single-step/auto training, pause, per-round rollback, tolerance stop without snapping and isolated replay');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-13',script,true);app.advance();outputProbe(app);app.frame(400);assertOutputGraph(app,width,10.5);app.resize();assertOutputGraph(app,width,11);assert.equal(app.frames.size,0);
  app.advance();app.advance();app.frame(400);assertOutputGraph(app,width,12.5,true);app.hide();assertOutputGraph(app,width,14,true);assert.equal(app.frames.size,0);app.show();
  app.automatic.fire('click');app.tick();app.frame(400);assertOutputGraph(app,width,15,true);app.automatic.fire('click');assertOutputGraph(app,width,16,true);assert.equal(app.timers.size,0);assert.equal(app.frames.size,0);
  app.retreat();app.frame(400);assertOutputGraph(app,width,15,true);app.goToChapter(12);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);assertFunction(app,width,1,-2);
  app.goToChapter(13);app.advance();assertOutputGraph(app,width,11);app.advance();assertOutputGraph(app,width,14,true);app.automatic.fire('click');app.leave();assert.equal(app.timers.size,0);app.resume();assert.equal(app.timers.size,0);
}
const reducedOutput=mount(280,'#act-13',script,'reduce');enterOutputTrain(reducedOutput,280);reducedOutput.advance();assertOutputGraph(reducedOutput,280,14,true);assert.equal(reducedOutput.frames.size,0);
console.log('PASS output motion: one parameter drives all curves, residual and live numbers; interruption, resize, visibility, navigation and reduced motion');

const relayProgram=script.replace('    const waveChapter=','    globalThis.__captureRelayMath({evaluate:relayEvaluate,step:relayStep,chainTrace,history:()=>relayLesson.history.slice(),cursor:()=>relayLesson.cursor});\n    const waveChapter=');
const relayMath=mount(360,'#act-14',relayProgram).relayMath;
for(const bias of [-3.4,-2.8,-2.4,-2.1,-1.8,-0.4,0.2]) {
  const result=relayMath.evaluate(bias),h=1e-5;
  const numerical=(relayMath.evaluate(bias+h).loss-relayMath.evaluate(bias-h).loss)/(2*h);
  assert.ok(Math.abs(numerical-result.gradient)<1e-6);
  close(relayMath.step(bias),bias-0.00125*result.gradient);
  result.rows.forEach(row=>close(row.effect,20*(row.shifted>0?1:0)));
}
const relayAlternative=[{seconds:0.5,position:5},{seconds:1.5,position:10},{seconds:4,position:8}],relayParams={base:3,slope:2,weight:0.5,output:7};
const relayAlt=relayMath.evaluate(-0.4,relayAlternative,relayParams),relayH=1e-5;
const relayNumerical=(relayMath.evaluate(-0.4+relayH,relayAlternative,relayParams).loss-relayMath.evaluate(-0.4-relayH,relayAlternative,relayParams).loss)/(2*relayH);
assert.ok(Math.abs(relayNumerical-relayAlt.gradient)<1e-6);close(relayMath.step(-0.4,0.003,relayAlternative,relayParams),-0.4-0.003*relayAlt.gradient);
assert.equal(relayMath.evaluate(-2).gradient,null);assert.equal(relayMath.step(-2),null);assert.equal(relayMath.evaluate(-4).gradient,0);close(relayMath.step(-4),-4);
close(relayMath.evaluate(-2.5).rows[2].activated,0.5);close(relayMath.evaluate(-2.4).rows[2].activated,0.6);close(relayMath.evaluate(-2.4).rows[2].prediction,142);
console.log('PASS relay math: local activation slopes, chain product, independent finite differences, alternate parameters, undefined corner and inactive branch');

function assertRelayBand(app,width,bias,gate,composition=false) {
  const vertices=[...new Set([0,-bias,2.5,3.5])].sort((a,b)=>a-b),X=t=>54+t/3.5*(width-76),Y=composition?v=>260-v/260*227:v=>260-(v+2.6)/3.8*227;
  const value=(t,b)=>{const raw=t+b,branch=raw+(Math.max(0,raw)-raw)*gate;return composition?40+30*t+20*branch:branch;};
  const expected=[...vertices.map(t=>[X(t),Y(value(t,-2.5))]),...vertices.slice().reverse().map(t=>[X(t),Y(value(t,bias))])];
  const band=points(app.svg.querySelectorAll('[data-ma-relay-change-band]')[0]);assert.equal(band.length,expected.length);band.forEach((p,i)=>p.forEach((v,j)=>close(v,expected[i][j])));
  const area=Math.abs(band.reduce((sum,p,i)=>{const q=band[(i+1)%band.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  const rawArea=3.5*(bias+2.5),activatedArea=((3.5+bias)**2-1)/2;
  close(area,((1-gate)*rawArea+gate*activatedArea)*(width-76)/3.5*(composition?20*227/260:227/3.8));
}
function assertRelayFunction(app,width,bias,gate=0,activation=false) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),activation?'activation-functions':'affine-parameters');close(app.svg.getAttribute('data-ma-relay-current'),bias);
  const vertices=[0,-bias,3.5],X=t=>54+t/3.5*(width-76),Y=v=>260-(v+2.6)/3.8*227;
  const curve=points(app.svg.querySelectorAll('[data-ma-active-function]')[0]);curve.forEach(([x,y],i)=>{const t=vertices[i],raw=t+bias;close(x,X(t));close(y,Y(raw+(Math.max(0,raw)-raw)*gate));});
  const root=app.svg.querySelectorAll('[data-ma-function-zero]')[0];close(root.getAttribute('cx'),X(-bias));close(root.getAttribute('cy'),Y(0));
  assertRelayBand(app,width,bias,gate);const biasNode=app.copy.querySelectorAll('[data-ma-relay-bias]')[0];if(biasNode)assert.ok(Math.abs(Number(biasNode.textContent)-bias)<0.000051);else assert.match(app.copy.textContent,/局部影响/);
  assert.ok(app.copy.children.length<=3);assert.equal(app.handle.hidden,true);
}
function assertRelayPrediction(app,width,bias,compare=false,training=false) {
  close(app.svg.getAttribute('data-ma-relay-current'),bias);close(app.svg.getAttribute('data-ma-composition-bias'),bias);close(app.svg.getAttribute('data-ma-composition-output'),20);
  const result=relayMath.evaluate(bias),X=t=>54+t/3.5*(width-76),Y=v=>260-v/260*227,curve=points(app.svg.querySelectorAll('[data-ma-composed-function]')[0]);
  [0,-bias,3.5].forEach((t,i)=>{close(curve[i][0],X(t));close(curve[i][1],Y(40+30*t+20*Math.max(0,t+bias)));});
  app.svg.querySelectorAll('[data-ma-composition-input]').forEach((node,i)=>{close(node.getAttribute('data-ma-composition-prediction'),result.rows[i].prediction);close(node.getAttribute('cy'),Y(result.rows[i].prediction));});
  const gap=app.svg.querySelectorAll('[data-ma-relay-gap]')[0];close(gap.getAttribute('x1'),width-22+result.rows[2].error*(width-76)/10);close(gap.getAttribute('data-ma-relay-gap-value'),Math.abs(result.rows[2].error));
  assert.equal(app.svg.querySelectorAll('[data-ma-relay-change-band]').length,compare?1:0);if(compare)assertRelayBand(app,width,bias,1,true);
  const biasNode=app.copy.querySelectorAll('[data-ma-relay-bias]')[0];if(biasNode)assert.ok(Math.abs(Number(biasNode.textContent)-bias)<0.000051);else assert.match(app.copy.textContent,/局部影响/);
  if(training)for(const [attr,expected] of [['data-ma-relay-loss',result.loss],['data-ma-relay-error',result.rows[2].error],['data-ma-relay-gradient',result.gradient]])assert.ok(Math.abs(Number(app.copy.querySelectorAll('['+attr+']')[0].textContent)-expected)<0.000051);
  assert.ok(app.copy.children.length<=3);
}
function finishChain(app) {let n=0;while(!app.copy.querySelectorAll('[data-ma-relay-gradient]').length){assert.ok(n++<20);app.advance();}}
function relayProbe(app) {const button=app.copy.querySelectorAll('[data-ma-relay-bias]')[0];assert.equal(button.disabled,false);button.fire('click');}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-14');assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/另开一次实验/);app.advance();assertRelayFunction(app,width,-2.5);
  assert.equal(app.next.disabled,true);app.advance();assertRelayFunction(app,width,-2.5);relayProbe(app);assertRelayFunction(app,width,-2.4);
  app.retreat();assertRelayFunction(app,width,-2.5);relayProbe(app);app.advance();assertRelayFunction(app,width,-2.4,1,true);app.advance();assertRelayPrediction(app,width,-2.4,true);
  app.retreat();assertRelayFunction(app,width,-2.4,1,true);app.advance();app.advance();finishChain(app);assertRelayPrediction(app,width,-2.4,false,true);assert.match(app.copy.textContent,/0.00125/);assert.equal(app.automatic.hidden,true);
  const first=relayMath.step(-2.4);app.advance();assertRelayPrediction(app,width,first,false,true);assert.equal(app.automatic.hidden,false);app.retreat();assertRelayPrediction(app,width,-2.4,false,true);
  app.retreat();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'chain-functions');app.advance();app.advance();app.automatic.fire('click');app.tick();const second=relayMath.step(first);assertRelayPrediction(app,width,second,false,true);
  app.automatic.fire('click');assert.equal(app.timers.size,0);app.retreat();assertRelayPrediction(app,width,first,false,true);app.advance();assertRelayPrediction(app,width,second,false,true);
  app.automatic.fire('click');let rounds=0;while(app.timers.size&&rounds++<100)app.tick();assert.ok(rounds<100);
  const final=Number(app.svg.getAttribute('data-ma-relay-current'));assert.ok(final<-2&&final>-2.01);assert.ok(relayMath.evaluate(final).loss>0&&relayMath.evaluate(final).loss<=0.001);assertRelayPrediction(app,width,final,false,true);assert.equal(app.automatic.hidden,true);
  app.retreat();assert.ok(relayMath.evaluate(Number(app.svg.getAttribute('data-ma-relay-current'))).loss>0.001);app.advance();assertRelayPrediction(app,width,final,false,true);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/链式法则/);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一起训练/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'weight-roles');
  app.goToChapter(13);assert.equal(app.figure.hidden,true);app.advance();assertOutputGraph(app,width,10);app.goToChapter(14);app.advance();assertRelayFunction(app,width,-2.4);
  console.log('PASS relay width='+width+': explicit experiment, +0.1, blocked/preserved function differences, 20-fold contribution, true bias training, rollback, tolerance and isolated replay');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-14',script,true);app.advance();relayProbe(app);app.frame(500);assertRelayFunction(app,width,-2.45);app.resize();assertRelayFunction(app,width,-2.4);
  app.advance();app.frame(550);assertRelayFunction(app,width,-2.4,0.5,true);app.hide();assertRelayFunction(app,width,-2.4,1,true);app.show();
  app.advance();assertRelayPrediction(app,width,-2.5,true);app.frame(550);assertRelayPrediction(app,width,-2.45,true);app.advance();finishChain(app);assertRelayPrediction(app,width,-2.4,false,true);assert.equal(app.frames.size,0);
  const first=relayMath.step(-2.4);app.advance();app.frame(400);assertRelayPrediction(app,width,(-2.4+first)/2,false,true);app.automatic.fire('click');assertRelayPrediction(app,width,first,false,true);
  app.tick();app.frame(400);assertRelayPrediction(app,width,(first+relayMath.step(first))/2,false,true);app.goToChapter(13);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);
  app.goToChapter(14);app.advance();assertRelayFunction(app,width,-2.4);app.advance();assertRelayFunction(app,width,-2.4,1,true);app.advance();assertRelayPrediction(app,width,-2.4,true);app.advance();finishChain(app);assertRelayPrediction(app,width,relayMath.step(first),false,true);
  app.automatic.fire('click');app.leave();assert.equal(app.timers.size,0);app.resume();assert.equal(app.timers.size,0);
}
const reducedRelay=mount(280,'#act-14',script,'reduce');reducedRelay.advance();relayProbe(reducedRelay);reducedRelay.advance();assertRelayFunction(reducedRelay,280,-2.4,1,true);reducedRelay.advance();assertRelayPrediction(reducedRelay,280,-2.4,true);reducedRelay.advance();finishChain(reducedRelay);reducedRelay.advance();assertRelayPrediction(reducedRelay,280,relayMath.step(-2.4),false,true);assert.equal(reducedRelay.frames.size,0);
console.log('PASS relay motion: computed difference polygons and local gates, fixed magnification, live gradient, interruption, navigation and reduced motion');

for(const delta of [0,0.05,-0.05,0.01,-0.01]) {
  const v=relayMath.chainTrace(delta);close(v.original[2],142);close(v.original[3],64/3);close(v.changes[2],20*delta);close(v.changes[3],((-8+20*delta)**2-64)/3);close(v.rates[0]*v.rates[1],v.rates[2]);
  if(delta)close(v.rates[2],v.changes[3]/delta);else{close(v.rates[0],20);close(v.rates[1],-16/3);close(v.rates[2],v.gradient);}
}
function functionLayout(width) {const wide=width>=600,S=wide?Math.min(210,(width-150)/2):Math.min(150,width-96);return {S,first:{left:wide?58:(width-S)/2,top:40},second:{left:wide?width-36-S:(width-S)/2,top:wide?40:40+S+76}};}
function assertFunctions(app,width,progress,delta=0.05,focus=null) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'chain-functions');close(app.svg.getAttribute('data-ma-chain-progress'),progress);assert.equal(app.svg.getAttribute('data-ma-chain-focus'),focus===null?'all':String(focus));
  const effective=delta*Math.max(0,Math.min(1,progress))*(1-Math.max(0,Math.min(1,progress-4))),v=relayMath.chainTrace(effective),layout=functionLayout(width),S=layout.S;
  close(app.svg.getAttribute('data-ma-chain-delta'),effective);
  const plots=app.svg.querySelectorAll('[data-ma-chain-plot]');assert.equal(plots.length,2);assert.equal(plots[0].getAttribute('data-ma-chain-y-unit'),plots[1].getAttribute('data-ma-chain-x-unit'));assert.equal(plots[0].getAttribute('data-ma-chain-x-unit'),'bias');assert.equal(plots[1].getAttribute('data-ma-chain-y-unit'),'cm2');
  const transforms={prediction:{X:x=>layout.first.left+(x+2.5)/0.3*S,Y:y=>layout.first.top+S-(y-140)/6*S,domain:[-2.5,-2.2]},score:{X:x=>layout.second.left+(x-140)/6*S,Y:y=>layout.second.top+S-y/36*S,domain:[140,146]}};
  for(const kind of ['prediction','score']) {
    const t=transforms[kind],curve=points(app.svg.querySelectorAll('[data-ma-chain-curve]').find(node=>node.getAttribute('data-ma-chain-curve')===kind));assert.equal(curve.length,41);
    curve.forEach(([x,y],i)=>{const input=t.domain[0]+(t.domain[1]-t.domain[0])*i/40;close(x,t.X(input));const expected=kind==='prediction'?relayMath.evaluate(input).rows[2].prediction:relayMath.evaluate((input-190)/20).loss;close(y,t.Y(expected));});
    const before=app.svg.querySelectorAll('[data-ma-chain-original]').find(node=>node.getAttribute('data-ma-chain-original')===kind),after=app.svg.querySelectorAll('[data-ma-chain-trial]').find(node=>node.getAttribute('data-ma-chain-trial')===kind),i=kind==='prediction'?0:2,j=kind==='prediction'?2:3;
    close(before.getAttribute('cx'),t.X(v.original[i]));close(before.getAttribute('cy'),t.Y(v.original[j]));close(after.getAttribute('cx'),t.X(v.trial[i]));close(after.getAttribute('cy'),t.Y(v.trial[j]));
    if(progress>=4) {
      const line=app.svg.querySelectorAll('[data-ma-chain-slope]').find(node=>node.getAttribute('data-ma-chain-slope')===kind);close(line.getAttribute('data-ma-chain-slope-value'),v.rates[kind==='prediction'?0:1]);assert.equal(line.getAttribute('data-ma-chain-slope-kind'),Math.abs(effective)<1e-10?'tangent':'secant');
    }
  }
  const rulerNodes=app.svg.querySelectorAll('[data-ma-chain-ruler]'),L=v.changes[2]*S/6;
  if(Math.abs(L)<1e-8)assert.equal(rulerNodes.length,0);
  else {
    const turn=Math.max(0,Math.min(1,progress-1)),source={x:layout.first.left,y:transforms.prediction.Y(v.original[2])},target={x:transforms.score.X(v.original[2]),y:layout.second.top+S};
    for(const node of rulerNodes) {assert.equal(node.getAttribute('data-ma-chain-ruler-unit'),'cm');close(Math.hypot(Number(node.getAttribute('x2'))-Number(node.getAttribute('x1')),Number(node.getAttribute('y2'))-Number(node.getAttribute('y1'))),Math.abs(L));}
    const moving=rulerNodes.find(node=>node.getAttribute('data-ma-chain-ruler')==='moving'),x=source.x+(target.x-source.x)*turn,y=source.y+(target.y-source.y)*turn,angle=-Math.PI/2+Math.PI/2*turn;
    assert.ok(moving);close(moving.getAttribute('x1'),x);close(moving.getAttribute('y1'),y);close(moving.getAttribute('x2'),x+L*Math.cos(angle));close(moving.getAttribute('y2'),y+L*Math.sin(angle));close(moving.getAttribute('data-ma-chain-position-from'),v.original[2]);close(moving.getAttribute('data-ma-chain-position-to'),v.trial[2]);
  }
  const slopes=app.copy.querySelectorAll('[data-ma-chain-factor]');if(slopes.length){slopes.forEach((node,i)=>assert.ok(Math.abs(Number(node.textContent)-v.rates[i])<0.000051));assert.ok(Math.abs(Number(app.copy.querySelectorAll('[data-ma-chain-gradient]')[0].textContent)-v.rates[0]*v.rates[1])<0.000051);}
  app.copy.querySelectorAll('[data-ma-chain-finite-total]').forEach(node=>assert.ok(Math.abs(Number(node.textContent)-v.rates[2])<0.000051));
  app.copy.querySelectorAll('[data-ma-chain-fraction-value]').forEach(node=>{const key=node.getAttribute('data-ma-chain-fraction-value'),value=key==='score'?v.changes[3]:key==='position'?v.changes[2]:v.changes[0];assert.ok(Math.abs(Number(node.textContent.split(' ')[0])-value)<0.000051);});
  assert.ok(app.copy.children.length<=3);assert.equal(app.handle.hidden,true);assert.equal(app.timers.size,0);
}
function assertFunctionsUntouched(app) {assert.equal(app.relayMath.history().join(','),'-2.4');assert.equal(app.relayMath.cursor(),0);assert.equal(app.automatic.hidden,true);}
function reverseFunctionTrial(app) {const button=app.copy.querySelectorAll('[data-ma-chain-reverse]')[0];assert.ok(button);button.fire('click');}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-14-chain',relayProgram);assertFunctions(app,width,0);assert.match(app.copy.textContent,/各有自己的坐标和单位/);
  app.advance();assertFunctions(app,width,1);app.advance();assertFunctions(app,width,2);assertFunctionsUntouched(app);app.advance();assertFunctions(app,width,3);reverseFunctionTrial(app);assertFunctions(app,width,3,-0.05);
  app.advance();assertFunctions(app,width,4,-0.05);assert.match(app.copy.textContent,/有限试算的精确变化比/);app.copy.querySelectorAll('[data-ma-chain-shared]')[0].fire('click');assertFunctions(app,width,4,-0.05,2);assertFunctionsUntouched(app);
  app.advance();assertFunctions(app,width,5,-0.05);assert.match(app.copy.textContent,/负号告诉电脑/);assert.match(app.copy.querySelectorAll('[data-ma-chain-rate-kind]')[0].textContent,/当前位置导数/);
  for(const index of [0,1]) {app.copy.querySelectorAll('[data-ma-chain-factor]')[index].fire('click');assertFunctions(app,width,5,-0.05,index);assertFunctionsUntouched(app);}
  app.retreat();assertFunctions(app,width,4,-0.05);reverseFunctionTrial(app);assertFunctions(app,width,4,0.05);app.advance();assertFunctions(app,width,5);assertFunctionsUntouched(app);
  app.advance();assertRelayPrediction(app,width,-2.4,false,true);app.advance();assertRelayPrediction(app,width,relayMath.step(-2.4),false,true);app.goToChapter('14-chain');assertFunctions(app,width,5);assert.equal(app.relayMath.cursor(),1);
  console.log('PASS function composition width='+width+': actual curves, proper units, shared position ruler, exact finite quotient product, analytic local slopes, focus and trial isolation');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-14-chain',relayProgram,true);app.advance();app.frame(600);assertFunctions(app,width,0.5);app.hide();assertFunctions(app,width,1);app.show();
  app.advance();app.frame(600);assertFunctions(app,width,1.5);assertFunctionsUntouched(app);app.resize();assertFunctions(app,width,2);app.advance();app.frame(600);assertFunctions(app,width,2.5);app.hide();assertFunctions(app,width,3);app.show();
  app.advance();app.frame(600);assertFunctions(app,width,3.5);app.advance();assertFunctions(app,width,4);app.frame(600);assertFunctions(app,width,4.5);app.hide();assertFunctions(app,width,5);app.show();
  app.retreat();app.frame(600);assertFunctions(app,width,4.5);app.resize();assertFunctions(app,width,4);reverseFunctionTrial(app);assertFunctions(app,width,4,-0.05);app.advance();app.frame(600);assertFunctions(app,width,4.5,-0.05);
  app.copy.querySelectorAll('[data-ma-chain-factor]')[0].fire('click');assertFunctions(app,width,5,-0.05,0);assert.equal(app.frames.size,0);assertFunctionsUntouched(app);app.goToChapter(13);assert.equal(app.frames.size,0);app.goToChapter('14-chain');assertFunctions(app,width,5,-0.05,0);
}
const reducedFunctionsChain=mount(280,'#act-14-chain',relayProgram,'reduce');finishChain(reducedFunctionsChain);assertRelayPrediction(reducedFunctionsChain,280,-2.4,false,true);assert.equal(reducedFunctionsChain.frames.size,0);assert.equal(reducedFunctionsChain.relayMath.cursor(),0);
console.log('PASS shared ruler motion: invariant cm length during rotation/translation, live secant-to-tangent math, zero extra training, reduced motion and interrupted navigation');
// Whole-neuron learning: numerical derivatives, simultaneous updates, and shared visuals.
const jointClose=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(Number(actual)-expected)<tolerance,actual+' != '+expected);
const jointProgram=script.replace('    const waveChapter=', '    globalThis.__captureJointMath({evaluate:jointEvaluate,step:jointStep,initial:jointInitial,history:()=>jointLesson.history.map(p=>({...p})),cursor:()=>jointLesson.cursor});\n    const waveChapter=');
const jointMath=mount(736,'#act-15',jointProgram).jointMath;
const initialJoint={...jointMath.initial};
for(const params of [initialJoint,{...initialJoint,weight:0.8,bias:-1.5,output:15},{...initialJoint,weight:1.2,bias:-2.1,output:8}]) {
  const result=jointMath.evaluate(params),epsilon=1e-6;
  for(const key of ['weight','bias','output']) {
    const plus={...params,[key]:params[key]+epsilon},minus={...params,[key]:params[key]-epsilon};
    jointClose(result.gradient[key],(jointMath.evaluate(plus).loss-jointMath.evaluate(minus).loss)/(2*epsilon),1e-5);
    jointClose(jointMath.step(params)[key],params[key]-0.001*result.gradient[key]);
  }
}
jointClose(jointMath.evaluate(initialJoint).loss,12.373333333333333);
const jointFirst=jointMath.step(initialJoint);
jointClose(jointFirst.weight,1.096);jointClose(jointFirst.bias,-1.7744);jointClose(jointFirst.output,12.00416);
assert.ok(jointMath.evaluate(jointFirst).loss<jointMath.evaluate(initialJoint).loss);
assert.ok(jointMath.evaluate(jointFirst).rows[1].error>jointMath.evaluate(initialJoint).rows[1].error);
assert.equal(jointMath.evaluate({...initialJoint,bias:-2}).gradient.weight,null);
assert.equal(jointMath.step({...initialJoint,bias:-2}),null);
const alternativeJointData=[{seconds:1,position:72},{seconds:2,position:104},{seconds:3,position:155}];
for(const key of ['weight','bias','output']) {
  const plus={...initialJoint,[key]:initialJoint[key]+1e-6},minus={...initialJoint,[key]:initialJoint[key]-1e-6};
  jointClose(jointMath.evaluate(initialJoint,alternativeJointData).gradient[key],(jointMath.evaluate(plus,alternativeJointData).loss-jointMath.evaluate(minus,alternativeJointData).loss)/2e-6,1e-5);
}
function jointButton(app,key){return app.copy.querySelectorAll('[data-ma-joint-param]').find(n=>n.getAttribute('data-ma-joint-param')===key);}
function assertJointTraining(app,width,params) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'joint-training');
  const result=jointMath.evaluate(params),X=t=>54+t/3.5*(width-76),Y=v=>260-v/260*227;
  for(const key of ['weight','bias','output']) {jointClose(app.svg.getAttribute('data-ma-joint-'+key),params[key]);jointClose(Number(jointButton(app,key).textContent),params[key],0.000051);}
  jointClose(app.svg.getAttribute('data-ma-joint-loss'),result.loss);jointClose(Number(app.copy.querySelectorAll('[data-ma-joint-loss]')[0].textContent),result.loss,0.000051);
  app.svg.querySelectorAll('[data-ma-joint-prediction]').forEach((node,i)=>{jointClose(node.getAttribute('data-ma-joint-prediction'),result.rows[i].prediction);jointClose(node.getAttribute('cx'),X(result.rows[i].input));jointClose(node.getAttribute('cy'),Y(result.rows[i].prediction));});
  app.svg.querySelectorAll('[data-ma-joint-square]').forEach((node,i)=>{jointClose(Number(node.getAttribute('width'))**2,64*result.rows[i].error**2);jointClose(node.getAttribute('data-ma-joint-square-value'),result.rows[i].error**2);assert.ok(Number(node.getAttribute('y'))>=310);assert.ok(Number(node.getAttribute('x'))>=54);assert.ok(Number(node.getAttribute('x'))+Number(node.getAttribute('width'))<=width-22);});
  const path=points(app.svg.querySelectorAll('[data-ma-joint-function]')[0]);assert.equal(path.length,3);
  const knot=-params.bias/params.weight;jointClose(path[1][0],X(knot));jointClose(path[1][1],Y(40+30*knot));
  assert.ok(app.copy.children.length<=4);
}
function roleNumber(app){return app.copy.querySelectorAll('[data-ma-role-number]')[0];}
function assertRoles(app,width,step,amount=0) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'weight-roles');assert.equal(app.svg.getAttribute('data-ma-role-step'),String(step));
  const gray=app.svg.querySelectorAll('[data-ma-role-curve]').find(n=>n.getAttribute('data-ma-role-curve')==='gray'),orange=app.svg.querySelectorAll('[data-ma-role-curve]').find(n=>n.getAttribute('data-ma-role-curve')==='orange');
  const current=step===0?{w:1+0.5*amount,b:-1.8,c:12}:{w:1,b:-1.8,c:12+6*amount};
  for(const [node,p] of [[gray,step===2?current:{w:1,b:-1.8,c:12}],[orange,step===2?{w:1.5,b:-1.8,c:12}:current]]) {
    jointClose(node.getAttribute('data-ma-role-root'),-p.b/p.w);jointClose(node.getAttribute('data-ma-role-slope'),p.w*p.c);
    const values=points(node);assert.equal(values.length,3);jointClose(values[1][0],54+(-p.b/p.w)/3.5*(width-76));jointClose(values[1][1],250);jointClose(values[2][1],250-p.c*Math.max(0,p.w*3.5+p.b)/48*217);
  }
  assert.equal(app.jointMath.cursor(),0);assert.equal(app.jointMath.history().length,1);assert.ok(app.copy.children.length<=3);
}
// Positive homogeneity: scaling both preactivation parameters and compensating the
// output weight preserves this one-branch model, rather than proving two are essential.
for(let t=0;t<=3.5;t+=0.125) {
  const first=12*Math.max(0,t-1.8),equivalent=8*Math.max(0,1.5*t-2.7);jointClose(first,equivalent);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-15',jointProgram);
  assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/换一组起始值/);assert.match(app.copy.textContent,/输入权重是之前所说的内部权重/);
  app.advance();assertRoles(app,width,0);assert.equal(app.next.disabled,true);app.advance();assertRoles(app,width,0);
  roleNumber(app).fire('click');assertRoles(app,width,0,1);jointClose(Number(roleNumber(app).textContent),1.5);roleNumber(app).fire('click');assertRoles(app,width,0,1);
  app.advance();assertRoles(app,width,1);assert.equal(app.next.disabled,true);roleNumber(app).fire('click');assertRoles(app,width,1,1);jointClose(Number(roleNumber(app).textContent),18);
  app.advance();assertRoles(app,width,2,1);assert.match(app.copy.textContent,/并非必须用两个权重/);assert.match(app.copy.textContent,/曲线会完全不变/);
  app.retreat();assertRoles(app,width,1,1);app.advance();app.advance();assertJointTraining(app,width,initialJoint);assert.match(app.copy.textContent,/不需要反复点击/);assert.equal(app.automatic.textContent,'单步调整');
  for(const key of ['weight','bias','output']){jointButton(app,key).fire('click');assert.match(app.copy.textContent,/局部影响/);assert.equal(app.jointMath.cursor(),0);}
  app.advance();assertJointTraining(app,width,jointFirst);assert.equal(app.jointMath.cursor(),1);assert.equal(app.next.textContent,'让电脑继续训练');
  app.advance();assert.equal(app.next.textContent,'暂停训练');assert.equal(app.timers.size,1);app.tick();assert.equal(app.jointMath.cursor(),11);assert.equal(app.jointMath.history().length,12);
  app.advance();assert.equal(app.timers.size,0);assert.equal(app.jointMath.cursor(),11);assert.equal(app.next.textContent,'让电脑继续训练');
  app.retreat();assert.equal(app.jointMath.cursor(),10);assertJointTraining(app,width,app.jointMath.history()[10]);app.automatic.fire('click');assert.equal(app.jointMath.cursor(),11);assert.equal(app.timers.size,0);
  app.advance();app.tick();app.automatic.fire('click');assert.equal(app.jointMath.cursor(),22);assert.equal(app.timers.size,0);
  app.advance();let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);assert.equal(app.jointMath.cursor(),630);const history=app.jointMath.history(),end=history.at(-1);
  for(let i=1;i<history.length;i++){for(const key of ['weight','bias','output'])jointClose(history[i][key],jointMath.step(history[i-1])[key]);assert.ok(jointMath.evaluate(history[i]).loss<=jointMath.evaluate(history[i-1]).loss);}
  assert.ok(jointMath.evaluate(end).loss>0&&jointMath.evaluate(end).loss<=0.001);assertJointTraining(app,width,end);assert.equal(app.automatic.hidden,true);
  app.retreat();assert.ok(jointMath.evaluate(app.jointMath.history()[app.jointMath.cursor()]).loss>0.001);app.advance();app.tick();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一个转折/);
  app.advance();assert.equal(app.figure.hidden,false);assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'pair-observe');assert.equal(app.jointMath.cursor(),630);app.retreat();assert.equal(app.figure.hidden,true);
  app.goToChapter('15-train');assertJointTraining(app,width,end);const paused=mount(width,'#act-15-train',jointProgram);paused.advance();paused.advance();paused.hide();assert.equal(paused.timers.size,0);paused.show();paused.advance();paused.goToChapter(14);assert.equal(paused.timers.size,0);paused.goToChapter('15-train');assertJointTraining(paused,width,jointFirst);
  // The default path needs exactly one observation click and one continuous-run click.
  const direct=mount(width,'#act-15-train',jointProgram);direct.advance();direct.advance();let count=0;while(direct.timers.size&&count++<100)direct.tick();assert.equal(direct.jointMath.cursor(),630);assert.equal(direct.next.textContent,'这次学会了什么？ →');assert.equal(direct.timers.size,0);
  console.log('PASS joint width='+width+': two weight roles, equal slopes with different roots, explicit reset, two-click default completion, pause/single-step/rollback, all 630 actual snapshots and convergence');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-15',jointProgram,true);app.advance();roleNumber(app).fire('click');app.frame(450);assertRoles(app,width,0,0.5);app.resize();assertRoles(app,width,0,1);
  app.advance();roleNumber(app).fire('click');app.frame(450);assertRoles(app,width,1,0.5);app.hide();assertRoles(app,width,1,1);app.show();app.advance();app.advance();app.advance();app.frame(400);
  const middle={...initialJoint,...Object.fromEntries(['weight','bias','output'].map(key=>[key,(initialJoint[key]+jointFirst[key])/2]))};assertJointTraining(app,width,middle);assert.equal(app.jointMath.history().length,2);
  app.hide();assertJointTraining(app,width,jointFirst);assert.equal(app.frames.size,0);app.show();app.automatic.fire('click');app.frame(400);assert.ok(app.frames.size);app.leave();assert.equal(app.frames.size,0);app.resume();
  app.advance();app.tick();app.frame(50);app.resize();assertJointTraining(app,width,app.jointMath.history()[12]);assert.equal(app.jointMath.cursor(),12);app.goToChapter(13);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);
}
const reducedJoint=mount(280,'#act-15-train',jointProgram,'reduce');reducedJoint.advance();assertJointTraining(reducedJoint,280,jointFirst);assert.equal(reducedJoint.frames.size,0);
console.log('PASS joint motion: computed role curves, synchronized training numbers/curves/squares, pause/navigation cancellation and reduced motion');
// Chapter sixteen keeps the trained model for the new observation, then explicitly
// switches to a hand-constructed two-branch example, with no new optimizer steps.
const pairProgram=jointProgram.replace('    const waveChapter=', '    globalThis.__capturePairMath({compute:pairCompute,snapshot:()=>({...pairLesson.snapshot}),rebuilt:()=>pairLesson.rebuilt,rounds:()=>pairLesson.rounds,jointExists:()=>!!jointLesson});\n    const waveChapter=');
const pairMath=mount(736,'#act-16',pairProgram).pairMath;
for(const amount of [0,0.25,0.5,0.75,1]) {
  for(let t=0;t<=4.5;t+=0.125) {
    const r=pairMath.compute(t,amount),original=40+30*t+20*Math.max(0,t-2),negative=-20*amount*Math.max(0,t-3);
    jointClose(r.base,original);jointClose(r.extra,negative);jointClose(r.prediction,original+negative);jointClose(r.activation,Math.max(0,t-3));assert.ok(r.activation>=0);
    if(t<=3)jointClose(r.prediction,original);
  }
  jointClose(pairMath.compute(4,amount).prediction,200-20*amount);
}
function pairXY(width){return {X:t=>54+t/4.5*(width-76),Y:v=>300-(v+40)/280*267};}
function assertPairObserved(app,width) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'pair-observe');const params=app.pairMath.snapshot(),result=jointMath.evaluate(params),{X,Y}=pairXY(width);
  assert.ok(result.loss<=0.001&&result.loss>0);assert.notEqual(params.output,20);
  app.svg.querySelectorAll('[data-ma-pair-input]').forEach((node,i)=>{const t=i+1,z=params.weight*t+params.bias,p=40+30*t+params.output*Math.max(0,z);jointClose(node.getAttribute('data-ma-pair-prediction'),p);jointClose(node.getAttribute('cx'),X(t));jointClose(node.getAttribute('cy'),Y(p));});
  assert.equal(app.svg.querySelectorAll('[data-ma-pair-record]').length,4);assert.ok(Number(app.svg.querySelectorAll('[data-ma-pair-gap]')[0].getAttribute('data-ma-pair-gap'))>19);
}
function assertPairAddition(app,width,amount) {
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'pair-add');const {X,Y}=pairXY(width);jointClose(app.svg.getAttribute('data-ma-pair-amount'),amount);
  app.svg.querySelectorAll('[data-ma-pair-input]').forEach((node,i)=>{const t=i+1,r=pairMath.compute(t,amount);jointClose(node.getAttribute('data-ma-pair-prediction'),r.prediction);jointClose(node.getAttribute('cx'),X(t));jointClose(node.getAttribute('cy'),Y(r.prediction));});
  const prediction=points(app.svg.querySelectorAll('[data-ma-pair-function]')[0]),branch=points(app.svg.querySelectorAll('[data-ma-pair-new-branch]')[0]),before=points(app.svg.querySelectorAll('[data-ma-pair-before]')[0]),band=points(app.svg.querySelectorAll('[data-ma-pair-subtracted-band]')[0]);
  const inputs=[0,2,3,4.5];assert.equal(prediction.length,4);assert.equal(branch.length,4);assert.equal(band.length,8);
  inputs.forEach((t,i)=>{const r=pairMath.compute(t,amount);jointClose(prediction[i][0],X(t));jointClose(prediction[i][1],Y(r.prediction));jointClose(branch[i][1],Y(r.extra));jointClose(before[i][1],Y(r.base));jointClose(band[i][1],Y(r.base));jointClose(band[7-i][1],Y(r.prediction));});
  jointClose(app.svg.querySelectorAll('[data-ma-pair-gap]')[0].getAttribute('data-ma-pair-gap'),20*(1-amount));
  for(const [key,value] of [['data-ma-pair-output',-20*amount],['data-ma-pair-fourth',200-20*amount]]){const node=app.copy.querySelectorAll('['+key+']')[0];if(node)jointClose(Number(node.textContent),value,0.000051);}
  assert.ok(app.copy.children.length<=3);assert.equal(app.timers.size,0);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-16',pairProgram);assertPairObserved(app,width);assert.equal(app.pairMath.rebuilt(),true);assert.equal(app.pairMath.rounds(),630);assert.match(app.copy.textContent,/实时完成训练/);assert.equal(app.pairMath.jointExists(),false);
  app.advance();for(let i=0;i<3;i++) {
    assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'pair-shape');const increment=app.svg.querySelectorAll('[data-ma-pair-increment]')[0];assert.equal(Number(increment.getAttribute('data-ma-pair-increment')),[30,50,30][i]);
    const intervals=app.svg.querySelectorAll('[data-ma-pair-observed-interval]');assert.equal(intervals.length,3);assert.equal(intervals.filter(n=>n.getAttribute('stroke-width')==='4').length,1);assert.equal(intervals[i].getAttribute('opacity'),'1');assert.match(app.copy.textContent,/不是额外测得|仅用于比较/);
    if(i<2)app.advance();
  }
  app.retreat();assert.equal(Number(app.svg.querySelectorAll('[data-ma-pair-increment]')[0].getAttribute('data-ma-pair-increment')),50);app.advance();app.advance();assertPairAddition(app,width,0);assert.match(app.copy.textContent,/还没有训练新参数/);assert.equal(app.copy.querySelectorAll('[data-ma-pair-output]').length,0);
  app.advance();assertPairAddition(app,width,1);assert.match(app.copy.textContent,/输出权重为负/);assert.match(app.copy.textContent,/ReLU的结果仍不小于0/);
  app.retreat();assertPairAddition(app,width,0);app.advance();assertPairAddition(app,width,1);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/手动选定/);app.retreat();assertPairAddition(app,width,1);app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/不告诉电脑负号/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'duo-training');app.goToChapter(16);assertPairObserved(app,width);
  const trained=mount(width,'#act-15-train',pairProgram);trained.advance();trained.advance();let n=0;while(trained.timers.size&&n++<100)trained.tick();const history=JSON.stringify(trained.jointMath.history()),params=trained.jointMath.history().at(-1);trained.advance();trained.advance();assertPairObserved(trained,width);assert.equal(trained.pairMath.rebuilt(),false);assert.equal(trained.pairMath.rounds(),0);assert.equal(JSON.stringify(trained.pairMath.snapshot()),JSON.stringify(params));
  trained.goToChapter('16-add');trained.advance();assertPairAddition(trained,width,1);assert.equal(JSON.stringify(trained.jointMath.history()),history);assert.equal(trained.jointMath.cursor(),630);trained.goToChapter('15-train');assertJointTraining(trained,width,params);
  console.log('PASS second branch width='+width+': actual trained snapshot retained, new fourth observation, 30/50/30 shape, explicit canonical switch, exact negative contribution and pointwise addition, no extra training, rollback and replay');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-16-add',pairProgram,true);assertPairAddition(app,width,0);app.advance();app.frame(700);assertPairAddition(app,width,0.5);app.hide();assertPairAddition(app,width,1);assert.equal(app.frames.size,0);app.show();app.retreat();app.frame(700);assertPairAddition(app,width,0.5);app.resize();assertPairAddition(app,width,0);
  app.advance();app.frame(700);app.goToChapter(13);assert.equal(app.frames.size,0);app.goToChapter('16-add');assertPairAddition(app,width,1);app.retreat();app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.equal(app.frames.size,0);
}
const reducedPair=mount(280,'#act-16-add',pairProgram,'reduce');reducedPair.advance();assertPairAddition(reducedPair,280,1);assert.equal(reducedPair.frames.size,0);
console.log('PASS second-branch motion: same computed curves, signed contribution, subtraction area and live numbers at intermediate frames; navigation/visibility/resize cancellation, reduced motion');
// Two fixed ReLU responses, with output weights learned from all four observations.
const duoProgram=pairProgram.replace('    const waveChapter=', '    globalThis.__captureDuoMath({compute:duoCompute,evaluate:duoEvaluate,step:duoStep,history:()=>duoLesson.history.map(p=>({...p})),cursor:()=>duoLesson.cursor});\n    const waveChapter=');
const duoMath=mount(736,'#act-17',duoProgram).duoMath;
const duoStart={first:10,second:0},duoOne=duoMath.step(duoStart),duoTwo=duoMath.step(duoOne);
jointClose(duoOne.first,12);jointClose(duoOne.second,0);jointClose(duoTwo.first,12);jointClose(duoTwo.second,-0.8);
jointClose(duoMath.evaluate(duoStart).loss,25);jointClose(duoMath.evaluate(duoOne).loss,20);jointClose(duoMath.evaluate(duoTwo).loss,18.56);
for(const p of [duoStart,duoOne,duoTwo,{first:3.3,second:7}])for(const key of ['first','second']){
  const epsilon=1e-6,plus={...p,[key]:p[key]+epsilon},minus={...p,[key]:p[key]-epsilon};jointClose(duoMath.evaluate(p).gradient[key],(duoMath.evaluate(plus).loss-duoMath.evaluate(minus).loss)/(2*epsilon),1e-5);jointClose(duoMath.step(p)[key],p[key]-0.4*duoMath.evaluate(p).gradient[key]);
}
const alternateDuoConfig={base:13,slope:7,branches:[{weight:1.2,bias:-1},{weight:0.5,bias:-1.3}]},alternateDuoRecords=[{seconds:1,position:25},{seconds:2,position:29},{seconds:3,position:38},{seconds:4,position:51}];
for(const key of ['first','second']){const plus={...duoStart,[key]:duoStart[key]+1e-6},minus={...duoStart,[key]:duoStart[key]-1e-6};jointClose(duoMath.evaluate(duoStart,alternateDuoRecords,alternateDuoConfig).gradient[key],(duoMath.evaluate(plus,alternateDuoRecords,alternateDuoConfig).loss-duoMath.evaluate(minus,alternateDuoRecords,alternateDuoConfig).loss)/2e-6,1e-5);}
function duoButton(app,key){return app.copy.querySelectorAll('[data-ma-duo-weight]').find(n=>n.getAttribute('data-ma-duo-weight')===key);}
function assertDuo(app,width,params,previous=duoStart,focus=null){
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'duo-training');const r=duoMath.evaluate(params),{X,Y}=pairXY(width);
  for(const key of ['first','second']){jointClose(app.svg.getAttribute('data-ma-duo-'+key),params[key]);jointClose(Number(duoButton(app,key).textContent),params[key],0.000051);}
  jointClose(app.svg.getAttribute('data-ma-duo-loss'),r.loss);jointClose(Number(app.copy.querySelectorAll('[data-ma-duo-loss]')[0].textContent),r.loss,0.000051);
  app.svg.querySelectorAll('[data-ma-duo-input]').forEach((node,i)=>{jointClose(node.getAttribute('data-ma-duo-prediction'),r.rows[i].prediction);jointClose(node.getAttribute('cx'),X(i+1));jointClose(node.getAttribute('cy'),Y(r.rows[i].prediction));});
  const curve=points(app.svg.querySelectorAll('[data-ma-duo-function]')[0]),old=points(app.svg.querySelectorAll('[data-ma-duo-before]')[0]),band=points(app.svg.querySelectorAll('[data-ma-duo-change-band]')[0]),inputs=[0,2,3,4.5];assert.equal(curve.length,4);assert.equal(band.length,8);
  inputs.forEach((t,i)=>{const value=duoMath.compute(t,params),before=duoMath.compute(t,previous);jointClose(curve[i][0],X(t));jointClose(curve[i][1],Y(value.prediction));jointClose(old[i][1],Y(before.prediction));jointClose(band[i][1],Y(before.prediction));jointClose(band[7-i][1],Y(value.prediction));});
  const scale=(width-100)/22,zero=76+14*scale;
  app.svg.querySelectorAll('[data-ma-duo-error-strip]').forEach((node,i)=>{const error=r.rows[i+2].error;jointClose(node.getAttribute('x1'),zero);jointClose(node.getAttribute('x2'),zero+error*scale);jointClose(node.getAttribute('data-ma-duo-strip-value'),error);});
  const contributions=app.svg.querySelectorAll('[data-ma-duo-contribution]');assert.equal(contributions.length,focus===null?0:1);
  if(focus!==null){const path=points(contributions[0]);inputs.forEach((t,i)=>jointClose(path[i][1],Y(duoMath.compute(t,params)[focus==='first'?'firstExtra':'secondExtra'])));assert.match(app.copy.querySelectorAll('[data-ma-duo-detail]')[0].textContent,/评分的局部影响/);assert.equal(duoButton(app,focus).getAttribute('aria-pressed'),'true');}
  assert.ok(app.copy.children.length<=4);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-17',duoProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/输入权重和偏置固定/);app.advance();assertDuo(app,width,duoStart);assert.equal(app.duoMath.cursor(),0);assert.equal(app.next.textContent,'调整一次，看哪里变了');
  app.advance();assertDuo(app,width,duoOne,duoStart);assert.match(app.copy.textContent,/总体平均平方误差仍从25降到20/);app.advance();assertDuo(app,width,duoTwo,duoOne);assert.match(app.copy.textContent,/0减小到−0.8/);assert.equal(app.next.textContent,'让电脑继续训练');
  for(const key of ['first','second']){duoButton(app,key).fire('click');assertDuo(app,width,duoTwo,duoOne,key);assert.equal(app.duoMath.history().length,3);}
  duoButton(app,'second').fire('click');assertDuo(app,width,duoTwo,duoOne);app.retreat();assertDuo(app,width,duoOne);app.automatic.fire('click');assertDuo(app,width,duoTwo,duoOne);assert.equal(app.timers.size,0);
  app.advance();assert.equal(app.next.textContent,'暂停训练');app.tick();assert.equal(app.duoMath.cursor(),7);app.advance();assert.equal(app.timers.size,0);assert.equal(app.duoMath.cursor(),7);app.automatic.fire('click');assert.equal(app.duoMath.cursor(),8);app.advance();app.hide();assert.equal(app.timers.size,0);app.show();app.advance();
  let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);assert.equal(app.duoMath.cursor(),143);const history=app.duoMath.history(),end=history.at(-1);assertDuo(app,width,end,history.at(-2));assert.ok(duoMath.evaluate(end).loss>0&&duoMath.evaluate(end).loss<=0.001);assert.notEqual(end.first,20);assert.notEqual(end.second,-20);
  for(let i=1;i<history.length;i++){for(const key of ['first','second'])jointClose(history[i][key],duoMath.step(history[i-1])[key]);assert.ok(duoMath.evaluate(history[i]).loss<=duoMath.evaluate(history[i-1]).loss);}
  app.retreat();assert.equal(app.duoMath.cursor(),142);app.advance();app.tick();assert.equal(app.duoMath.cursor(),143);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/没有收到/);app.retreat();assertDuo(app,width,end,history.at(-2));app.advance();app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'onset-training');assert.equal(app.duoMath.cursor(),143);app.goToChapter('17-train');assertDuo(app,width,end,history.at(-2));
  const direct=mount(width,'#act-17-train',duoProgram);direct.advance();direct.advance();direct.advance();let n=0;while(direct.timers.size&&n++<100)direct.tick();assert.equal(direct.duoMath.cursor(),143);assert.equal(direct.timers.size,0);
  const saved=mount(width,'#act-16-add',duoProgram);saved.advance();const snapshot=JSON.stringify(saved.pairMath.snapshot());saved.advance();saved.advance();saved.advance();assertDuo(saved,width,duoStart);saved.advance();saved.advance();saved.advance();while(saved.timers.size)saved.tick();saved.goToChapter('16-add');assertPairAddition(saved,width,1);assert.equal(JSON.stringify(saved.pairMath.snapshot()),snapshot);
  console.log('PASS two-branch training width='+width+': actual first two rounds, independent gradients, learned negative sign, simultaneous updates, three-click default completion, 143 real snapshots, pause/rollback/replay and isolated prior lessons');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-17-train',duoProgram,true);app.advance();app.frame(550);assertDuo(app,width,{first:11,second:0});assert.equal(app.duoMath.cursor(),1);assert.equal(app.duoMath.history().length,2);app.hide();assertDuo(app,width,duoOne);app.show();app.advance();app.frame(550);assertDuo(app,width,{first:12,second:-0.4},duoOne);app.resize();assertDuo(app,width,duoTwo,duoOne);
  duoButton(app,'second').fire('click');app.advance();app.tick();app.frame(60);assert.ok(app.frames.size);app.goToChapter(16);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);app.goToChapter('17-train');const history=app.duoMath.history();assertDuo(app,width,history[7],history[6],'second');app.leave();app.resume();assert.equal(app.timers.size,0);
}
const reducedDuo=mount(280,'#act-17-train',duoProgram,'reduce');reducedDuo.advance();assertDuo(reducedDuo,280,duoOne);assert.equal(reducedDuo.frames.size,0);
console.log('PASS two-branch motion: synchronized parameters, scoring, contribution areas and same-scale signed error strips; no hidden training during display, navigation/resize/visibility cancellation and reduced motion');
// Frozen learned output weights, with both biases updated from the same old snapshot.
const onsetProgram=duoProgram.replace('    const waveChapter=', '    globalThis.__captureOnsetMath({compute:onsetCompute,evaluate:onsetEvaluate,step:onsetStep,outputs:()=>({...onsetLesson.outputs}),history:()=>onsetLesson.history.map(p=>({...p})),cursor:()=>onsetLesson.cursor,info:()=>({rebuilt:onsetLesson.rebuilt,rounds:onsetLesson.rebuildRounds,priorExists:!!duoLesson})});\n    const waveChapter=');
const onsetMath=mount(736,'#act-18',onsetProgram).onsetMath,onsetOutputs=onsetMath.outputs(),onsetStart={first:-1.6,second:-3.4},onsetOne=onsetMath.step(onsetStart,onsetOutputs);
assert.ok(onsetOutputs.first>0&&onsetOutputs.second<0);assert.notEqual(onsetOutputs.first,20);assert.notEqual(onsetOutputs.second,-20);
assert.ok(-onsetOne.first>1.6);assert.ok(-onsetOne.second<3.4);assert.ok(onsetMath.evaluate(onsetOne,onsetOutputs).loss<onsetMath.evaluate(onsetStart,onsetOutputs).loss);
for(const params of [onsetStart,onsetOne,{first:-1.3,second:-2.7}])for(const key of ['first','second']){
  const plus={...params,[key]:params[key]+1e-6},minus={...params,[key]:params[key]-1e-6},r=onsetMath.evaluate(params,onsetOutputs);jointClose(r.gradient[key],(onsetMath.evaluate(plus,onsetOutputs).loss-onsetMath.evaluate(minus,onsetOutputs).loss)/2e-6,1e-5);jointClose(onsetMath.step(params,onsetOutputs)[key],params[key]-0.001*r.gradient[key]);
}
const onsetAltConfig={base:13,slope:7,branches:[{weight:1.2,bias:0},{weight:0.8,bias:0}]},onsetAltBias={first:-1.3,second:-2.7};
for(const key of ['first','second']){const plus={...onsetAltBias,[key]:onsetAltBias[key]+1e-6},minus={...onsetAltBias,[key]:onsetAltBias[key]-1e-6};jointClose(onsetMath.evaluate(onsetAltBias,onsetOutputs,alternateDuoRecords,onsetAltConfig).gradient[key],(onsetMath.evaluate(plus,onsetOutputs,alternateDuoRecords,onsetAltConfig).loss-onsetMath.evaluate(minus,onsetOutputs,alternateDuoRecords,onsetAltConfig).loss)/2e-6,1e-5);}
assert.equal(onsetMath.evaluate({first:-2,second:-3.4},onsetOutputs).gradient.first,null);assert.equal(onsetMath.step({first:-2,second:-3.4},onsetOutputs),null);
const inactiveOnset=onsetMath.evaluate({first:-5,second:-6},onsetOutputs);jointClose(inactiveOnset.gradient.first,0);jointClose(inactiveOnset.gradient.second,0);assert.ok(inactiveOnset.loss>0.001);
function onsetButton(app,key){return app.copy.querySelectorAll('[data-ma-onset-position]').find(n=>n.getAttribute('data-ma-onset-position')===key);}
function assertOnset(app,width,biases,previous=onsetStart,focus='first',detail=false){
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'onset-training');const outputs=app.onsetMath.outputs(),r=onsetMath.evaluate(biases,outputs),{X,Y}=pairXY(width);
  for(const key of ['first','second']){jointClose(app.svg.getAttribute('data-ma-onset-bias-'+key),biases[key]);jointClose(app.svg.getAttribute('data-ma-onset-output-'+key),outputs[key]);jointClose(Number(onsetButton(app,key).textContent),-biases[key],0.000051);}
  jointClose(app.svg.getAttribute('data-ma-onset-loss'),r.loss);jointClose(Number(app.copy.querySelectorAll('[data-ma-onset-loss]')[0].textContent),r.loss,0.000051);
  app.svg.querySelectorAll('[data-ma-onset-input]').forEach((node,i)=>{jointClose(node.getAttribute('data-ma-onset-prediction'),r.rows[i].prediction);jointClose(node.getAttribute('cx'),X(i+1));jointClose(node.getAttribute('cy'),Y(r.rows[i].prediction));});
  const inputs=[...new Set([0,4.5,-biases.first,-biases.second,-previous.first,-previous.second])].sort((a,b)=>a-b),curve=points(app.svg.querySelectorAll('[data-ma-onset-function]')[0]),band=points(app.svg.querySelectorAll('[data-ma-onset-change-band]')[0]),old=points(app.svg.querySelectorAll('[data-ma-onset-before]')[0]),contribution=points(app.svg.querySelectorAll('[data-ma-onset-contribution]')[0]);assert.equal(curve.length,inputs.length);assert.equal(band.length,inputs.length*2);
  const extra=row=>focus==='first'?row.firstExtra:row.secondExtra;
  inputs.forEach((t,i)=>{const now=onsetMath.compute(t,biases,outputs),before=onsetMath.compute(t,previous,outputs);jointClose(curve[i][0],X(t));jointClose(curve[i][1],Y(now.prediction));jointClose(contribution[i][1],Y(extra(now)));jointClose(old[i][1],Y(extra(before)));jointClose(band[i][1],Y(extra(before)));jointClose(band[band.length-1-i][1],Y(extra(now)));});
  const markers=app.svg.querySelectorAll('[data-ma-onset-marker]');assert.equal(markers.length,2);for(const node of markers){const key=node.getAttribute('data-ma-onset-marker'),start=-biases[key];jointClose(node.getAttribute('data-ma-onset-start'),start);jointClose(node.getAttribute('cx'),X(start));jointClose(node.getAttribute('cy'),300);assert.equal(node.getAttribute('role'),'button');}
  assert.equal(app.copy.querySelectorAll('[data-ma-onset-detail]').length,detail?1:0);if(detail){assert.match(app.copy.textContent,/启动位置 = −偏置/);assert.ok(app.copy.textContent.includes(Number(biases[focus].toFixed(4)).toString()));}assert.ok(app.copy.children.length<=4);
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-18',onsetProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/只学习两个偏置/);assert.equal(app.onsetMath.info().rebuilt,true);assert.equal(app.onsetMath.info().rounds,143);assert.equal(app.onsetMath.info().priorExists,false);
  app.advance();assertOnset(app,width,onsetStart);onsetButton(app,'second').fire('click');assertOnset(app,width,onsetStart,onsetStart,'second',true);assert.equal(app.onsetMath.cursor(),0);app.advance();assertOnset(app,width,onsetOne,onsetStart,'second',true);assert.match(app.copy.textContent,/沿相反方向移动/);
  app.svg.querySelectorAll('[data-ma-onset-marker]').find(n=>n.getAttribute('data-ma-onset-marker')==='first').fire('keydown',{key:'Enter'});assertOnset(app,width,onsetOne,onsetStart,'first',true);onsetButton(app,'first').fire('click');assertOnset(app,width,onsetOne);
  app.retreat();assertOnset(app,width,onsetStart);app.advance();assertOnset(app,width,onsetOne);app.advance();assert.equal(app.next.textContent,'暂停训练');app.tick();assert.equal(app.onsetMath.cursor(),3);app.advance();assert.equal(app.timers.size,0);app.automatic.fire('click');assert.equal(app.onsetMath.cursor(),4);app.retreat();assert.equal(app.onsetMath.cursor(),3);app.automatic.fire('click');assert.equal(app.onsetMath.history().length,5);
  app.advance();let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);assert.equal(app.onsetMath.cursor(),47);const history=app.onsetMath.history(),end=history.at(-1);assertOnset(app,width,end,history.at(-2));assert.ok(onsetMath.evaluate(end,onsetOutputs).loss>0&&onsetMath.evaluate(end,onsetOutputs).loss<=0.001);assert.notEqual(end.first,-2);assert.notEqual(end.second,-3);
  for(let i=1;i<history.length;i++){const next=onsetMath.step(history[i-1],onsetOutputs);for(const key of ['first','second'])jointClose(history[i][key],next[key]);assert.ok(onsetMath.evaluate(history[i],onsetOutputs).loss<=onsetMath.evaluate(history[i-1],onsetOutputs).loss);}
  app.retreat();assert.ok(onsetMath.evaluate(app.onsetMath.history()[46],onsetOutputs).loss>0.001);app.advance();app.tick();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/唯一正确/);app.retreat();assertOnset(app,width,end,history.at(-2));app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/重放上一幕/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-forward-functions');app.goToChapter('18-train');assertOnset(app,width,end,history.at(-2));
  const direct=mount(width,'#act-18-train',onsetProgram);direct.advance();direct.advance();while(direct.timers.size)direct.tick();assert.equal(direct.onsetMath.cursor(),47);
  const saved=mount(width,'#act-17-train',onsetProgram);saved.advance();saved.advance();saved.advance();while(saved.timers.size)saved.tick();const prior=JSON.stringify(saved.duoMath.history()),last=saved.duoMath.history().at(-1);saved.advance();saved.advance();assert.equal(saved.onsetMath.info().rebuilt,false);assert.equal(saved.onsetMath.info().rounds,0);assert.equal(JSON.stringify(saved.onsetMath.outputs()),JSON.stringify(last));saved.advance();saved.advance();assertOnset(saved,width,onsetOne);assert.equal(JSON.stringify(saved.duoMath.history()),prior);saved.goToChapter('17-train');assertDuo(saved,width,last,saved.duoMath.history().at(-2));
  console.log('PASS onset width='+width+': frozen actual output snapshot, independent bias derivatives, opposite root movements, true contribution regions, keyboard/native selection, two-click completion, 47 real rounds, rollback/replay and prior-history isolation');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-18-train',onsetProgram,true);app.advance();app.frame(700);const half={first:(onsetStart.first+onsetOne.first)/2,second:(onsetStart.second+onsetOne.second)/2};assertOnset(app,width,half);assert.equal(app.onsetMath.history().length,2);app.hide();assertOnset(app,width,onsetOne);assert.equal(app.frames.size,0);app.show();onsetButton(app,'second').fire('click');app.retreat();app.frame(700);assertOnset(app,width,half,onsetStart,'second',true);app.resize();assertOnset(app,width,onsetStart,onsetStart,'second',true);
  app.advance();app.advance();app.tick();app.frame(60);assert.ok(app.frames.size);app.goToChapter(17);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);app.goToChapter('18-train');const h=app.onsetMath.history();assertOnset(app,width,h[3],h[2],'second',true);app.advance();app.leave();assert.equal(app.timers.size,0);app.resume();
}
const reducedOnset=mount(280,'#act-18-train',onsetProgram,'reduce');reducedOnset.advance();assertOnset(reducedOnset,280,onsetOne);assert.equal(reducedOnset.frames.size,0);
console.log('PASS onset motion: real zero points, whole prediction, signed contribution regions, bias detail and loss remain synchronized; interruption/resize/navigation/reduced motion');
// End-to-end forward/reverse trace and genuine six-parameter learning.
const netProgram=onsetProgram.replace('    const waveChapter=', '    globalThis.__captureNetMath({renderProbe:drawNetProbe,probeParams:netProbeParams,probeFacts:netProbeFacts,probeState:()=>({...netLesson.probe}),renderProbe:drawNetProbe,probeParams:netProbeParams,probeFacts:netProbeFacts,probeState:()=>({...netLesson.probe}),renderForward:drawNetForwardVisual,renderError:drawNetErrorVisual,trace:netTrace,evaluate:netEvaluate,step:netStep,vertices:netVertices,initial:()=>({...netLesson.initial}),history:()=>netLesson.history.map(p=>({...p})),cursor:()=>netLesson.cursor,state:()=>({forward:netLesson.forward,backward:netLesson.backward,batch:netLesson.batch,key:netLesson.key,rebuilt:netLesson.rebuilt,rounds:netLesson.rebuildRounds})});\n    const waveChapter=');
const netMath=mount(736,'#act-19',netProgram).netMath,netInitial=netMath.initial(),netOne=netMath.step(netInitial),allNetKeys=['w1','b1','c1','w2','b2','c2'];
function netExpected(input,actual,p){const z1=p.w1*input+p.b1,z2=p.w2*input+p.b2,h1=Math.max(0,z1),h2=Math.max(0,z2),prediction=40+30*input+p.c1*h1+p.c2*h2,e=prediction-actual,d=2*e;return {prediction,e,loss:e*e,d,h1,h2,g:{w1:d*p.c1*(z1>0?1:0)*input,b1:d*p.c1*(z1>0?1:0),c1:d*h1,w2:d*p.c2*(z2>0?1:0)*input,b2:d*p.c2*(z2>0?1:0),c2:d*h2}};}
for(const p of [netInitial,netOne,{w1:0.8,b1:-1.3,c1:12,w2:0.9,b2:-2.65,c2:-7}]){
  for(const key of allNetKeys){const plus={...p,[key]:p[key]+1e-6},minus={...p,[key]:p[key]-1e-6};jointClose(netMath.evaluate(p).gradient[key],(netMath.evaluate(plus).loss-netMath.evaluate(minus).loss)/2e-6,0.0001);jointClose(netMath.step(p)[key],p[key]-0.0001*netMath.evaluate(p).gradient[key]);}
  for(const [input,actual] of [[1,70],[2,100],[3,150],[4,180]]){const expected=netExpected(input,actual,p),trace=netMath.trace(input,actual,p);jointClose(trace.prediction,expected.prediction);jointClose(trace.loss,expected.loss);jointClose(trace.upstream,expected.d);for(const key of allNetKeys)jointClose(trace.gradient[key],expected.g[key]);}
}
for(const key of allNetKeys){const plus={...netInitial,[key]:netInitial[key]+1e-6},minus={...netInitial,[key]:netInitial[key]-1e-6};jointClose(netMath.evaluate(netInitial,alternateDuoRecords).gradient[key],(netMath.evaluate(plus,alternateDuoRecords).loss-netMath.evaluate(minus,alternateDuoRecords).loss)/2e-6,0.0001);}
assert.equal(netMath.step({...netInitial,b1:-2}),null);assert.equal(netMath.evaluate({...netInitial,b1:-2}).gradient.b1,null);
const netFourth=netMath.trace(4,180,netInitial);jointClose(netFourth.branches[0].toExtra,netFourth.branches[1].toExtra);assert.ok(netFourth.branches[0].toZ>0&&netFourth.branches[1].toZ<0);jointClose(netFourth.gradient.w1,4*netFourth.gradient.b1);jointClose(netFourth.gradient.w2,4*netFourth.gradient.b2);assert.ok(netMath.evaluate(netOne).loss<netMath.evaluate(netInitial).loss);for(const key of allNetKeys)assert.notEqual(netOne[key],netInitial[key]);
function netButton(app,key){return app.copy.querySelectorAll('[data-ma-net-parameter]').find(n=>n.getAttribute('data-ma-net-parameter')===key);}
function assertNetTrace(app,mode,step,input=4){const isProbe=mode!=='forward'&&step>0,shown=isProbe?Object.fromEntries(allNetKeys.map(k=>[k,Number(app.svg.getAttribute('data-ma-net-probe-'+k))])):netInitial,row=netMath.trace(input,[70,100,150,180][input-1],shown);assert.equal(app.svg.getAttribute('data-ma-chart-kind'),mode==='forward'?(step===5?'net-error-continuity':'net-forward-functions'):(step===0?'net-error-continuity':'net-probe'));assert.equal(app.svg.getAttribute('data-ma-net-trace-mode'),mode);assert.equal(Number(app.svg.getAttribute('data-ma-net-trace-step')),step);assert.equal(Number(app.svg.getAttribute('data-ma-net-trace-input')),input);jointClose(app.svg.getAttribute('data-ma-net-single-loss'),row.loss);jointClose(app.svg.getAttribute('data-ma-net-upstream'),row.upstream);if(mode!=='forward')jointClose(app.svg.getAttribute('data-ma-net-single-gradient'),row.gradient[app.netMath.state().key]);assert.equal(app.netMath.cursor(),0);assert.equal(app.netMath.history().length,1);}
function assertNetAverage(app,width){const key=app.netMath.state().key,r=netMath.evaluate(netInitial),max=Math.max(1,...r.rows.map(row=>Math.abs(row.gradient[key]))),zero=(58+width-32)/2,scale=(width-90)/2/max;assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-average');app.svg.querySelectorAll('[data-ma-net-sample-gradient]').forEach((node,i)=>{jointClose(node.getAttribute('data-ma-net-sample-gradient'),r.rows[i].gradient[key]);jointClose(node.getAttribute('x1'),zero);jointClose(node.getAttribute('x2'),zero+r.rows[i].gradient[key]*scale);});jointClose(app.svg.querySelectorAll('[data-ma-net-average]')[0].getAttribute('data-ma-net-average'),r.gradient[key]);assert.equal(app.netMath.cursor(),0);}
function assertNetTraining(app,width,params,previous=netInitial){const {X,Y}=pairXY(width),r=netMath.evaluate(params);assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-training');for(const key of allNetKeys){jointClose(app.svg.getAttribute('data-ma-net-'+key),params[key]);jointClose(Number(netButton(app,key).textContent),params[key],0.000051);}jointClose(app.svg.getAttribute('data-ma-net-loss'),r.loss);jointClose(Number(app.copy.querySelectorAll('[data-ma-net-loss]')[0].textContent),r.loss,0.000051);app.svg.querySelectorAll('[data-ma-net-input]').forEach((node,i)=>{jointClose(node.getAttribute('data-ma-net-prediction'),r.rows[i].prediction);jointClose(node.getAttribute('cx'),X(i+1));jointClose(node.getAttribute('cy'),Y(r.rows[i].prediction));});const inputs=[...new Set([...netMath.vertices(params),...netMath.vertices(previous)])].sort((a,b)=>a-b),path=points(app.svg.querySelectorAll('[data-ma-net-function]')[0]),band=points(app.svg.querySelectorAll('[data-ma-net-change-band]')[0]);assert.equal(path.length,inputs.length);assert.equal(band.length,inputs.length*2);inputs.forEach((t,i)=>{jointClose(path[i][0],X(t));jointClose(path[i][1],Y(netMath.trace(t,0,params).prediction));jointClose(band[i][1],Y(netMath.trace(t,0,previous).prediction));jointClose(band[band.length-1-i][1],Y(netMath.trace(t,0,params).prediction));});assert.ok(app.copy.children.length<=4);}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19',netProgram);assert.equal(app.figure.hidden,true);assert.equal(app.netMath.state().rebuilt,true);assert.equal(app.netMath.state().rounds,143);app.advance();assertNetTrace(app,'forward',0);assert.ok(!app.svg.textContent.includes('贡献 '+Number(netFourth.branches[0].extra.toFixed(4))));
  for(let step=1;step<=5;step++){app.advance();assertNetTrace(app,'forward',step);}assert.match(app.copy.textContent,/前向计算/);app.retreat();assertNetTrace(app,'forward',4);app.advance();app.advance();assertNetTrace(app,'backward',0);assert.match(app.copy.textContent,/不是把误差值/);app.advance();assertNetTrace(app,'backward',1);app.advance();assertNetTrace(app,'backward',2);
  for(const key of allNetKeys){netButton(app,key).fire('click');assert.equal(app.netMath.state().key,key);assertNetTrace(app,'backward',1);app.advance();assertNetTrace(app,'backward',2);}
  app.advance();assertNetTrace(app,'backward',2,1);app.advance();assert.equal(app.timers.size,1);app.tick();assertNetTrace(app,'backward',2,2);app.advance();assert.equal(app.timers.size,0);app.automatic.fire('click');assertNetTrace(app,'backward',2,3);app.advance();while(app.timers.size)app.tick();assertNetAverage(app,width);
  for(const key of allNetKeys){netButton(app,key).fire('click');assertNetAverage(app,width);}app.retreat();assertNetTrace(app,'backward',2,4);app.automatic.fire('click');assertNetAverage(app,width);app.advance();assertNetTraining(app,width,netInitial);app.advance();assertNetTraining(app,width,netOne);app.retreat();assertNetTraining(app,width,netInitial);app.advance();assertNetTraining(app,width,netOne);
  app.advance();assert.equal(app.next.textContent,'暂停训练');app.tick();assert.equal(app.netMath.cursor(),51);app.advance();assert.equal(app.timers.size,0);app.automatic.fire('click');assert.equal(app.netMath.cursor(),52);app.advance();let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);assert.equal(app.netMath.cursor(),2595);const history=app.netMath.history(),end=history.at(-1);assertNetTraining(app,width,end,history.at(-2));assert.ok(netMath.evaluate(end).loss>0&&netMath.evaluate(end).loss<=0.001);
  for(let i=1;i<history.length;i++){const next=netMath.step(history[i-1]);for(const key of allNetKeys)jointClose(history[i][key],next[key]);assert.ok(netMath.evaluate(history[i]).loss<=netMath.evaluate(history[i-1]).loss);}
  app.retreat();assert.ok(netMath.evaluate(history[2594]).loss>0.001);app.advance();app.tick();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/文字/);app.retreat();assertNetTraining(app,width,end,history.at(-2));app.advance();app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'deep-limits');assert.equal(app.netMath.cursor(),2595);
  const direct=mount(width,'#act-19-train',netProgram);direct.advance();direct.advance();while(direct.timers.size)direct.tick();assert.equal(direct.netMath.cursor(),2595);
  const saved=mount(width,'#act-18-train',netProgram);saved.advance();saved.advance();while(saved.timers.size)saved.tick();const previousHistory=JSON.stringify(saved.onsetMath.history()),outputs=saved.onsetMath.outputs();saved.advance();saved.advance();assert.equal(saved.netMath.state().rebuilt,false);jointClose(saved.netMath.initial().c1,outputs.first);jointClose(saved.netMath.initial().c2,outputs.second);jointClose(saved.netMath.initial().b1,-1.6);saved.goToChapter('19-train');saved.advance();assert.equal(JSON.stringify(saved.onsetMath.history()),previousHistory);saved.goToChapter('18-train');assertOnset(saved,width,saved.onsetMath.history().at(-1),saved.onsetMath.history().at(-2));
  console.log('PASS full network width='+width+': progressively revealed forward/reverse arithmetic, all six independent derivatives, single-sample vs mean distinction, batch pause/selection, true simultaneous updates, 2595 snapshots, convergence, rollback and prior isolation');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19-train',netProgram,true);app.advance();app.frame(550);const half=Object.fromEntries(allNetKeys.map(key=>[key,(netInitial[key]+netOne[key])/2]));assertNetTraining(app,width,half);assert.equal(app.netMath.history().length,2);app.hide();assertNetTraining(app,width,netOne);app.show();netButton(app,'w2').fire('click');app.retreat();app.frame(550);assertNetTraining(app,width,half);app.resize();assertNetTraining(app,width,netInitial);app.advance();app.advance();app.tick();app.frame(35);assert.ok(app.frames.size);app.goToChapter(18);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);app.goToChapter('19-train');const h=app.netMath.history();assertNetTraining(app,width,h[51],h[50]);app.goToChapter('19-batch');app.advance();app.tick();app.hide();assert.equal(app.timers.size,0);app.show();app.advance();app.leave();assert.equal(app.timers.size,0);app.resume();
}
const reducedNet=mount(280,'#act-19-train',netProgram,'reduce');reducedNet.advance();assertNetTraining(reducedNet,280,netOne);assert.equal(reducedNet.frames.size,0);
console.log('PASS full-network motion: six synchronized parameters, actual functions/kinks/areas/loss, immutable updates during display, batch and training cancellation, reduced motion');
// Forward computation is geometry: shared input -> actual function intersection ->
// fixed-thickness contribution -> the same error side -> its square -> reverse trace.
function assertNetForwardGeometry(app,width,p){
  app.netMath.renderForward(width,p);const initial=app.netMath.initial(),row=netMath.trace(4,180,initial),opening=Math.max(0,Math.min(1,p)),top=40+260*opening,bottom=300+220*opening,X=t=>54+t/4.5*(width-76),Y=v=>bottom-(v+40)/280*(bottom-top),index=p>2?1:0,gate=p<=2?opening:Math.max(0,Math.min(1,p-2)),applied=p>=4?2:p>=2?1:0;
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-forward-functions');const point=app.svg.querySelectorAll('[data-ma-net-partial-prediction]')[0],partial=(r,n)=>r.base+r.branches.slice(0,n).reduce((s,b)=>s+b.extra,0);jointClose(point.getAttribute('data-ma-net-partial-prediction'),partial(row,applied));jointClose(point.getAttribute('cx'),X(4));jointClose(point.getAttribute('cy'),Y(partial(row,applied)));
  if(p>0){const value=app.svg.querySelectorAll('[data-ma-net-activation-value]')[0],b=row.branches[index],i=index+1,root=-initial['b'+i]/initial['w'+i],inputs=[0,root,4.5],pointsZ=points(app.svg.querySelectorAll('[data-ma-net-activated]')[0]);jointClose(value.getAttribute('data-ma-net-activation-value'),b.h);jointClose(value.getAttribute('cx'),X(4));jointClose(value.getAttribute('cy'),190-(b.h+4)/8*160);inputs.forEach((t,j)=>{const z=initial['w'+i]*t+initial['b'+i],v=z+(Math.max(0,z)-z)*gate;jointClose(pointsZ[j][0],X(t));jointClose(pointsZ[j][1],190-(v+4)/8*160);});}
  const moving=p>1&&p<=2||p>3,bands=app.svg.querySelectorAll('[data-ma-net-moving-band]');assert.equal(bands.length,moving?1:0);
  if(moving){const lift=Math.max(0,Math.min(1,(p-(index===0?1:3)-0.3)/0.7)),bracket=app.svg.querySelectorAll('[data-ma-net-contribution-bracket]')[0],lower=lift*partial(row,index),extra=row.branches[index].extra,vertices=netMath.vertices(initial),band=points(bands[0]);jointClose(bracket.getAttribute('data-ma-net-bracket-from'),lower);jointClose(bracket.getAttribute('data-ma-net-bracket-to'),lower+extra);jointClose(Number(bracket.getAttribute('y2'))-Number(bracket.getAttribute('y1')),-extra/280*(bottom-top));assert.equal(band.length,vertices.length*2);vertices.forEach((t,j)=>{const r=netMath.trace(t,0,initial),from=lift*partial(r,index),to=from+r.branches[index].extra;jointClose(band[j][0],X(t));jointClose(band[j][1],Y(from));jointClose(band[band.length-1-j][1],Y(to));});}
  assert.equal(app.netMath.history().length,1);assert.equal(app.netMath.cursor(),0);
}
function assertNetErrorGeometry(app,width,q,backward=false){
  app.netMath.renderError(width,q,backward);const row=netMath.trace(4,180,app.netMath.initial()),shift=Math.max(0,Math.min(1,q/0.35)),move=Math.max(0,Math.min(1,(q-0.35)/0.35)),expand=Math.max(0,Math.min(1,(q-0.7)/0.3)),X=t=>54+t/4.5*(width-76),top=300-267*shift,bottom=520-267*shift,Y=v=>bottom-(v+40)/280*(bottom-top),L=Math.abs(row.error)*4,sx=30,sy=369;
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-error-continuity');jointClose(app.svg.querySelectorAll('[data-ma-net-source-error]')[0].getAttribute('data-ma-net-source-error'),row.error);const side=app.svg.querySelectorAll('[data-ma-net-extracted-error]')[0];jointClose(side.getAttribute('x1'),X(4)+(sx+L-X(4))*move);jointClose(side.getAttribute('y1'),Y(row.prediction)+(sy-Y(row.prediction))*move);jointClose(side.getAttribute('y2'),Y(row.actual)+(sy+L-Y(row.actual))*move);
  const squares=app.svg.querySelectorAll('[data-ma-net-error-square]');assert.equal(squares.length,expand>0?1:0);if(expand>0){jointClose(squares[0].getAttribute('width'),L*expand);jointClose(squares[0].getAttribute('height'),L);jointClose(squares[0].getAttribute('data-ma-net-squared-error'),row.loss);if(expand===1)jointClose(Number(squares[0].getAttribute('width'))*Number(squares[0].getAttribute('height')),row.loss*16);}
  assert.equal(app.svg.querySelectorAll('[data-ma-net-changing-edge]').length,backward&&expand===1?2:0);assert.equal(app.netMath.history().length,1);
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19',netProgram);
  for(const p of [0,0.25,0.5,1,1.15,1.3,1.65,2,2.5,3,3.15,3.3,3.65,4])assertNetForwardGeometry(app,width,p);
  for(const q of [0,0.175,0.35,0.525,0.7,0.85,1])assertNetErrorGeometry(app,width,q);
  assertNetErrorGeometry(app,width,1,true);const square=app.svg.querySelectorAll('[data-ma-net-error-square]')[0],saved=['x','y','width','height','data-ma-net-squared-error'].map(k=>square.getAttribute(k));app.goToChapter('19-back');app.advance();const carried=app.svg.querySelectorAll('[data-ma-net-probe-reference-square]')[0];for(const [k,j] of [['x',0],['width',2],['height',3],['data-ma-net-reference-loss',4]])jointClose(carried.getAttribute(k),Number(saved[j]));assert.notEqual(Number(app.svg.querySelectorAll('[data-ma-net-error-square]')[0].getAttribute('width')),Number(saved[2]));
  console.log('PASS forward geometry width='+width+': actual affine/ReLU intersections, shared t=4, signed fixed-thickness contribution stacking, actual partial sums, extracted same error side, squared area and unchanged square carried into reverse branches');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19',netProgram,true);app.advance();app.advance();app.frame(900);jointClose(app.svg.getAttribute('data-ma-net-forward-progress'),0.5);app.hide();jointClose(app.svg.getAttribute('data-ma-net-forward-progress'),1);app.show();app.advance();app.frame(900);jointClose(app.svg.querySelectorAll('[data-ma-net-moving-band]')[0].getAttribute('data-ma-net-band-lift'),(0.5-0.3)/0.7);app.resize();jointClose(app.svg.querySelectorAll('[data-ma-net-moving-band]')[0].getAttribute('data-ma-net-band-lift'),1);
  app.advance();app.advance();app.frame(900);assert.equal(app.netMath.history().length,1);app.hide();app.show();app.advance();app.frame(900);jointClose(app.svg.getAttribute('data-ma-net-error-progress'),0.5);app.hide();jointClose(app.svg.getAttribute('data-ma-net-error-progress'),1);const square=app.svg.querySelectorAll('[data-ma-net-error-square]')[0],size=Number(square.getAttribute('width'));app.show();app.advance();jointClose(app.svg.querySelectorAll('[data-ma-net-error-square]')[0].getAttribute('width'),size);app.advance();jointClose(app.svg.querySelectorAll('[data-ma-net-probe-reference-square]')[0].getAttribute('width'),size);assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-probe');app.goToChapter('19-train');assert.equal(app.frames.size,0);assert.equal(app.netMath.cursor(),0);
}
const reducedForward=mount(280,'#act-19',netProgram,'reduce');reducedForward.advance();for(let i=0;i<5;i++)reducedForward.advance();assert.equal(reducedForward.frames.size,0);assert.equal(reducedForward.svg.getAttribute('data-ma-chart-kind'),'net-error-continuity');jointClose(reducedForward.svg.getAttribute('data-ma-net-error-expansion'),1);
console.log('PASS forward motion: computed clipping and area translation, real error extraction and unfolding, identical reverse square, visibility/resize/navigation settlement and reduced motion without optimizer steps');
// A parameter click must change the real function, contribution, prediction and
// squared error, with the original optimizer state left untouched.
function assertNetProbe(app,width,fraction,local,input=4){
  const key=app.netMath.state().key,direction=app.netMath.probeState().direction,steps={w:0.1,b:0.3,c:5},p={...netInitial,[key]:netInitial[key]+steps[key[0]]*direction*fraction},actual=[70,100,150,180][input-1],before=netMath.trace(input,actual,netInitial),now=netMath.trace(input,actual,p),i=Number(key.slice(-1)),X=t=>54+t/4.5*(width-76),U=v=>140-(v+4)/8*112,Y=v=>370-(v+40)/280*130;
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'net-probe');assert.equal(app.svg.getAttribute('data-ma-net-probe-phase'),local?'local':'trial');
  for(const k of allNetKeys){jointClose(app.svg.getAttribute('data-ma-net-probe-'+k),p[k]);jointClose(Number(netButton(app,k).textContent),p[k],0.000051);}
  const affine=points(app.svg.querySelectorAll('[data-ma-net-probe-current-affine]')[0]),activated=points(app.svg.querySelectorAll('[data-ma-net-probe-activation-function]')[0]),roots=[0,4.5,-netInitial['b'+i]/netInitial['w'+i],-p['b'+i]/p['w'+i]].sort((a,b)=>a-b);assert.equal(affine.length,roots.length);
  roots.forEach((t,j)=>{jointClose(affine[j][0],X(t));jointClose(affine[j][1],U(p['w'+i]*t+p['b'+i]));jointClose(activated[j][1],U(Math.max(0,p['w'+i]*t+p['b'+i])));});
  jointClose(app.svg.querySelectorAll('[data-ma-net-probe-activation]')[0].getAttribute('cy'),U(now.branches[i-1].h));
  const inputs=[...new Set([...netMath.vertices(netInitial),...netMath.vertices(p)])].sort((a,b)=>a-b),curve=points(app.svg.querySelectorAll('[data-ma-net-probe-function]')[0]),band=points(app.svg.querySelectorAll('[data-ma-net-probe-prediction-band]')[0]);assert.equal(curve.length,inputs.length);assert.equal(band.length,inputs.length*2);
  inputs.forEach((t,j)=>{const old=netMath.trace(t,0,netInitial),r=netMath.trace(t,0,p);jointClose(curve[j][0],X(t));jointClose(curve[j][1],Y(r.prediction));jointClose(band[j][1],Y(old.prediction));jointClose(band[band.length-1-j][1],Y(r.prediction));jointClose(r.prediction-old.prediction,r.branches[i-1].extra-old.branches[i-1].extra);});
  jointClose(app.svg.querySelectorAll('[data-ma-net-probe-prediction]')[0].getAttribute('cy'),Y(now.prediction));jointClose(app.svg.getAttribute('data-ma-net-single-loss'),now.loss);jointClose(app.svg.getAttribute('data-ma-net-single-gradient'),now.gradient[key]);
  const square=app.svg.querySelectorAll('[data-ma-net-error-square]')[0],reference=app.svg.querySelectorAll('[data-ma-net-probe-reference-square]')[0];jointClose(square.getAttribute('width'),Math.abs(now.error)*4);jointClose(Number(square.getAttribute('width'))*Number(square.getAttribute('height')),now.loss*16);jointClose(reference.getAttribute('width'),Math.abs(before.error)*4);jointClose(reference.getAttribute('data-ma-net-reference-loss'),before.loss);
  assert.equal(app.svg.querySelectorAll('[data-ma-net-changing-edge]').length,local?2:0);assert.equal(app.netMath.history().length,1);assert.equal(app.netMath.cursor(),0);assert.equal(JSON.stringify(app.netMath.initial()),JSON.stringify(netInitial));assert.ok(app.copy.children.length<=3);
  return {params:p,before,now};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19-back',netProgram);app.advance();assertNetProbe(app,width,1,false);assert.ok(app.svg.querySelectorAll('[data-ma-net-probe-readout]').length===0); // readout lives in the teaching copy
  for(const key of allNetKeys){
    netButton(app,key).fire('click');const first=assertNetProbe(app,width,1,false),firstDirection=app.netMath.probeState().direction,firstPath=app.svg.querySelectorAll('[data-ma-net-probe-function]')[0].getAttribute('d');assert.notEqual(first.now.prediction,first.before.prediction);assert.notEqual(first.now.loss,first.before.loss);
    if(key[0]==='c')jointClose(first.now.branches[Number(key[1])-1].h,first.before.branches[Number(key[1])-1].h);
    if(key[0]==='b')for(const t of [0,1,4])jointClose((first.params['w'+key[1]]*t+first.params[key])-(netInitial['w'+key[1]]*t+netInitial[key]),first.params[key]-netInitial[key]);
    if(key[0]==='w')jointClose(first.params['b'+key[1]],netInitial['b'+key[1]]);
    netButton(app,key).fire('click');assert.equal(app.netMath.probeState().direction,-firstDirection);const second=assertNetProbe(app,width,1,false);assert.notEqual(app.svg.querySelectorAll('[data-ma-net-probe-function]')[0].getAttribute('d'),firstPath);assert.ok((first.now.prediction-first.before.prediction)*(second.now.prediction-second.before.prediction)<0);
    app.advance();assertNetProbe(app,width,0,true);assert.equal(app.netMath.state().backward,2);jointClose(Number(app.svg.getAttribute('data-ma-net-single-gradient')),netMath.trace(4,180,netInitial).gradient[key]);assert.match(app.copy.textContent,/解析导数/);
  }
  netButton(app,'c1').fire('click');const trial=assertNetProbe(app,width,1,false),quotient=(trial.now.loss-trial.before.loss)/(trial.params.c1-netInitial.c1);assert.ok(Math.abs(quotient-trial.before.gradient.c1)>1);app.advance();assertNetProbe(app,width,0,true);assert.notEqual(Number(app.svg.getAttribute('data-ma-net-single-gradient')),quotient);
  app.advance();assertNetProbe(app,width,0,true,1);for(const input of [1,2,3,4]){if(input>1)app.automatic.fire('click');for(const key of allNetKeys){netButton(app,key).fire('click');const f=assertNetProbe(app,width,1,false,input);if(input<4&&key.endsWith('2')){jointClose(f.now.prediction,f.before.prediction);jointClose(f.now.branches[1].h,0);}}}
  app.automatic.fire('click');assertNetAverage(app,width);app.advance();assertNetTraining(app,width,netInitial);app.advance();assertNetTraining(app,width,netOne);assert.equal(app.netMath.history().length,2);
  console.log('PASS interactive reverse width='+width+': every one of six clicks changes actual functions and error area, repeated click reverses the trial, signed weights transmit correctly, inactive inputs remain unchanged, analytic derivative is not a finite quotient, and formal optimizer history is isolated');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-19-back',netProgram,true);app.advance();app.frame(600);assertNetProbe(app,width,0.5,false);app.hide();assertNetProbe(app,width,1,false);app.show();netButton(app,'w2').fire('click');app.frame(600);assertNetProbe(app,width,0.5,false);app.resize();assertNetProbe(app,width,1,false);
  netButton(app,'w2').fire('click');app.frame(600);assertNetProbe(app,width,0,false);app.hide();assertNetProbe(app,width,1,false);app.show();app.advance();app.frame(600);assertNetProbe(app,width,0.5,true);app.hide();assertNetProbe(app,width,0,true);app.show();app.goToChapter('19-train');assert.equal(app.frames.size,0);assertNetTraining(app,width,netInitial);
}
const reducedNetParameterProbe=mount(280,'#act-19-back',netProgram,'reduce');reducedNetParameterProbe.advance();assertNetProbe(reducedNetParameterProbe,280,1,false);netButton(reducedNetParameterProbe,'c2').fire('click');assertNetProbe(reducedNetParameterProbe,280,1,false);assert.equal(reducedNetParameterProbe.frames.size,0);reducedNetParameterProbe.advance();assertNetProbe(reducedNetParameterProbe,280,0,true);
console.log('PASS trial motion: visible parameter interpolation and square growth/shrinkage, accurate derivative during the local limit, direction reversal, visibility/resize/navigation settlement and reduced motion');

// Composition uses the previous layer's entire output function as its input.
function assertDeepGeometry(app,width){
  const p={b1:Number(app.svg.getAttribute('data-ma-deep-b1')),b2:Number(app.svg.getAttribute('data-ma-deep-b2'))},progress=Number(app.svg.getAttribute('data-ma-deep-progress')),a=Number(app.svg.getAttribute('data-ma-deep-a')),b=Number(app.svg.getAttribute('data-ma-deep-b')),gate=Number(app.svg.getAttribute('data-ma-deep-gate')),xs=[...new Set([0,5,-p.b1,p.b2-p.b1])].filter(x=>x>=0&&x<=5).sort((x,y)=>x-y),X=x=>44+x/5*(width-66),Y=(v,top)=>top+170-(v+3.5)/8*170,h=x=>Math.max(0,x+p.b1),top=28+Math.min(1,progress/0.45)*260;
  const first=points(app.svg.querySelectorAll('[data-ma-deep-first-function]')[0]);const firstXs=[0,-p.b1,5].filter(x=>x>=0&&x<=5).sort((a,b)=>a-b);assert.equal(first.length,firstXs.length);firstXs.forEach((x,i)=>{jointClose(first[i][0],X(x));jointClose(first[i][1],Y(h(x),28));});
  jointClose(app.svg.getAttribute('data-ma-deep-first'),h(3));jointClose(app.svg.getAttribute('data-ma-deep-second'),Math.max(0,p.b2-h(3)));jointClose(app.svg.querySelectorAll('[data-ma-deep-transfer]')[0].getAttribute('data-ma-deep-transfer'),h(3));
  if(progress>0){const raw=points(app.svg.querySelectorAll('[data-ma-deep-second-raw]')[0]),out=points(app.svg.querySelectorAll('[data-ma-deep-second-function]')[0]);xs.forEach((x,i)=>{const z=a*h(x)+b,v=z+(Math.max(0,z)-z)*gate;jointClose(raw[i][0],X(x));jointClose(raw[i][1],Y(z,top));jointClose(out[i][0],X(x));jointClose(out[i][1],Y(v,top));});jointClose(app.svg.querySelectorAll('[data-ma-deep-second-output]')[0].getAttribute('cy'),Y((a*h(3)+b)+(Math.max(0,a*h(3)+b)-(a*h(3)+b))*gate,top));}
  for(const node of app.copy.querySelectorAll('[data-ma-deep-parameter]'))jointClose(Number(node.textContent),p[node.getAttribute('data-ma-deep-parameter')],0.000051);
  assert.ok(app.copy.children.length<=2);assert.equal(app.timers.size,0);return {p,progress,first:app.svg.querySelectorAll('[data-ma-deep-first-function]')[0].getAttribute('d'),second:app.svg.querySelectorAll('[data-ma-deep-second-function]')[0]?.getAttribute('d')};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-20',netProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/评分方法/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'deep-limits');assert.equal(app.svg.querySelectorAll('[data-ma-deep-record]').length,4);assert.equal(app.svg.querySelectorAll('[data-ma-deep-unseen-function]').length,1);assert.match(app.copy.textContent,/未补做训练/);assert.equal(app.netMath.history().length,1);
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/另开一个小实验/);app.advance();let g=assertDeepGeometry(app,width);assert.equal(g.progress,0);app.advance();g=assertDeepGeometry(app,width);assert.equal(g.progress,1);app.advance();g=assertDeepGeometry(app,width);assert.equal(g.progress,2);
  const snapshot=JSON.stringify(app.netMath.history());const click=key=>app.copy.querySelectorAll('[data-ma-deep-parameter]').find(n=>n.getAttribute('data-ma-deep-parameter')===key).fire('click');
  click('b1');const front=assertDeepGeometry(app,width);assert.equal(front.p.b1,-1);assert.notEqual(front.first,g.first);assert.notEqual(front.second,g.second);click('b2');const back=assertDeepGeometry(app,width);assert.equal(back.p.b2,1);assert.equal(back.first,front.first);assert.notEqual(back.second,front.second);click('b1');click('b2');assert.deepEqual(assertDeepGeometry(app,width).p,{b1:-2,b2:2});assert.equal(JSON.stringify(app.netMath.history()),snapshot);
  app.retreat();assert.equal(assertDeepGeometry(app,width).progress,1);app.advance();assert.equal(assertDeepGeometry(app,width).progress,2);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/多层/);app.advance();assert.match(app.copy.textContent,/这样的计算就组成了一张网络/);assert.equal(app.figure.hidden,true);app.goToChapter(23);assert.match(app.copy.textContent,/目标依然是预测/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'text-pairs');app.goToChapter('19-train');assert.equal(JSON.stringify(app.netMath.history()),snapshot);
  console.log('PASS depth width='+width+': preserved real predictor snapshot, no invented observations, whole-function composition, causal parameter changes, reset, backward navigation and text prediction handoff');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-20-compose',netProgram,true);assertDeepGeometry(app,width);app.advance();app.frame(700);let g=assertDeepGeometry(app,width);assert.ok(g.progress>0&&g.progress<0.45);jointClose(app.svg.getAttribute('data-ma-deep-a'),1);jointClose(app.svg.getAttribute('data-ma-deep-b'),0);app.frame(600);g=assertDeepGeometry(app,width);assert.ok(g.progress>0.45&&g.progress<0.7525);jointClose(app.svg.getAttribute('data-ma-deep-b'),0);app.frame(400);g=assertDeepGeometry(app,width);jointClose(app.svg.getAttribute('data-ma-deep-a'),-1);assert.ok(Number(app.svg.getAttribute('data-ma-deep-b'))>0);app.hide();assert.equal(assertDeepGeometry(app,width).progress,1);app.show();app.advance();app.frame(500);jointClose(assertDeepGeometry(app,width).progress,1.5);app.resize();assert.equal(assertDeepGeometry(app,width).progress,2);
  app.copy.querySelectorAll('[data-ma-deep-parameter]')[0].fire('click');app.frame(500);jointClose(assertDeepGeometry(app,width).p.b1,-1.5);app.hide();assert.equal(assertDeepGeometry(app,width).p.b1,-1);app.show();app.copy.querySelectorAll('[data-ma-deep-parameter]')[1].fire('click');app.frame(500);jointClose(assertDeepGeometry(app,width).p.b2,1.5);app.goToChapter('19-train');assert.equal(app.frames.size,0);assert.equal(app.netMath.cursor(),0);app.goToChapter('20-compose');assert.equal(assertDeepGeometry(app,width).p.b2,1);
}
const reducedDepth=mount(280,'#act-20-compose',netProgram,'reduce');reducedDepth.advance();reducedDepth.advance();assert.equal(assertDeepGeometry(reducedDepth,280).progress,2);assert.equal(reducedDepth.frames.size,0);
console.log('PASS depth motion: actual curve copy, affine transform, ReLU clipping, synchronized intermediate parameters, visibility/resize/navigation cancellation and reduced motion');

const meshProgram=netProgram.replace('    const waveChapter=','    globalThis.__captureMeshMath({run:meshRun,vertices:meshVertices,parameters:meshParameters,facts:meshFacts,state:()=>({...meshLesson})});\n    const waveChapter=');
function meshExpected(x,off=null){const a=off==='a'?0:x,b=off==='b'?0:Math.max(0,x-1.5),c=off==='c'?0:Math.max(0,x-3),d=off==='d'?0:Math.max(0,0.8*a-1.2*b+0.4*c-0.2),e=off==='e'?0:Math.max(0,-0.3*a+1.3*b-1.1*c+1);return {x,a,b,c,d,e,y:0.6*d+0.9*e+0.2};}
function meshNode(app,id){return app.svg.querySelectorAll('[data-ma-mesh-node]').find(n=>n.getAttribute('data-ma-mesh-node')===id);}
function assertMesh(app,width){
  const x=Number(app.svg.getAttribute('data-ma-mesh-input')),off=app.svg.getAttribute('data-ma-mesh-muted')||null,values=meshExpected(x,off),reference=meshExpected(x),X=x=>44+x/5*(width-64),Y=y=>435-y/4.5*170;
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'mesh-network');assert.equal(app.svg.getAttribute('role'),'group');jointClose(app.svg.getAttribute('data-ma-mesh-output'),values.y);assert.equal(app.svg.querySelectorAll('[data-ma-mesh-node]').length,6);assert.equal(app.svg.querySelectorAll('[data-ma-mesh-edge]').length,11);
  for(const bar of app.svg.querySelectorAll('[data-ma-mesh-bar]')){const id=bar.getAttribute('data-ma-mesh-bar');jointClose(bar.getAttribute('data-ma-mesh-value'),values[id]);jointClose(bar.getAttribute('width'),26*values[id]/5);assert.ok(Number(bar.getAttribute('width'))>=0&&Number(bar.getAttribute('width'))<=26);}
  for(const edge of app.svg.querySelectorAll('[data-ma-mesh-edge]')){const from=edge.getAttribute('data-ma-mesh-edge').split('-')[0];jointClose(edge.getAttribute('data-ma-mesh-contribution'),values[from]*Number(edge.getAttribute('data-ma-mesh-weight')));assert.equal(edge.getAttribute('stroke-width'),'1.5');}
  const curve=points(app.svg.querySelectorAll('[data-ma-mesh-function]')[0]),xs=app.meshMath.vertices(off);assert.equal(curve.length,xs.length);xs.forEach((t,i)=>{jointClose(curve[i][0],X(t));jointClose(curve[i][1],Y(meshExpected(t,off).y));if(i>0){const mid=(t+xs[i-1])/2;jointClose(meshExpected(mid,off).y,(meshExpected(t,off).y+meshExpected(xs[i-1],off).y)/2);}});
  const p=app.svg.querySelectorAll('[data-ma-mesh-point]')[0];jointClose(p.getAttribute('cx'),X(x));jointClose(p.getAttribute('cy'),Y(values.y));jointClose(parseFloat(app.handle.style.left),X(x));jointClose(parseFloat(app.handle.style.top),Y(values.y));assert.equal(app.handle.hidden,false);assert.equal(app.handle.getAttribute('aria-valuenow'),String(x));
  assert.equal(app.svg.querySelectorAll('[data-ma-mesh-reference-function]').length,off?1:0);if(off){const old=points(app.svg.querySelectorAll('[data-ma-mesh-reference-function]')[0]),oldXs=app.meshMath.vertices();oldXs.forEach((t,i)=>jointClose(old[i][1],Y(meshExpected(t).y)));jointClose(app.svg.querySelectorAll('[data-ma-mesh-reference-point]')[0].getAttribute('cy'),Y(reference.y));}
  assert.ok(app.copy.children.length<=2);assert.equal(app.timers.size,0);return {values,reference,off,path:app.svg.querySelectorAll('[data-ma-mesh-function]')[0].getAttribute('d')};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-21',meshProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/手工设定/);app.advance();assertMesh(app,width);assert.equal(app.meshMath.state().input,2.5);
  for(const [x,y] of [[0,1.1],[1.5,1.295],[2.5,1.955],[3,2.285],[5,2.105]]){const row=app.meshMath.run(x);jointClose(row.values.y,y);}
  const whole=assertMesh(app,width).path;for(const key of ['a','b','c','d','e']){meshNode(app,key).fire('keydown',{key:'Enter'});assert.equal(app.svg.getAttribute('data-ma-mesh-selected'),key);assert.equal(assertMesh(app,width).path,whole);}
  app.key('Home');jointClose(assertMesh(app,width).values.x,0);app.key('ArrowRight');jointClose(assertMesh(app,width).values.x,0.1);app.key('PageUp');jointClose(assertMesh(app,width).values.x,1.1);app.key('End');jointClose(assertMesh(app,width).values.x,5);app.key('ArrowRight');jointClose(assertMesh(app,width).values.x,5);
  app.handle.fire('pointerdown',{pointerId:33,clientX:100,button:0});app.handle.fire('pointermove',{pointerId:33,clientX:100-(width-64)/2});app.handle.fire('pointerup',{pointerId:33});jointClose(assertMesh(app,width).values.x,2.5);assert.equal(assertMesh(app,width).path,whole);
  app.advance();assert.equal(app.meshMath.state().selected,'e');for(const key of ['a','b','c','d','e']){meshNode(app,key).fire('click');const baseline=assertMesh(app,width);app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');const muted=assertMesh(app,width);assert.equal(muted.off,key);assert.notEqual(muted.path,baseline.path);jointClose(muted.values[key],0);if(['d','e'].includes(key))for(const id of ['a','b','c'])jointClose(muted.values[id],baseline.values[id]);if(key==='c'){jointClose(muted.values.y,baseline.values.y);assert.equal(app.svg.querySelectorAll('[data-ma-mesh-zero-note]').length,1);app.key('End');assert.notEqual(assertMesh(app,width).values.y,meshExpected(5).y);app.key('Home');app.key('PageUp');app.key('PageUp');for(let i=0;i<5;i++)app.key('ArrowRight');}app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');assert.equal(assertMesh(app,width).path,whole);}
  app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');meshNode(app,'a').fire('click');assert.equal(assertMesh(app,width).off,null);app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');app.resize();assert.equal(assertMesh(app,width).off,'a');app.retreat();assert.equal(assertMesh(app,width).off,null);app.advance();app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.match(app.copy.textContent,/整张网络为了同一个预测目标/);app.goToChapter(23);assert.match(app.copy.textContent,/目标依然是预测/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'text-pairs');
  app.goToChapter('19-train');assert.equal(app.netMath.cursor(),0);assert.equal(app.svg.getAttribute('role'),'img');app.goToChapter('21-network');assertMesh(app,width);assert.equal(app.netMath.history().length,1);app.goToChapter('21-remove');assertMesh(app,width);app.hide();app.show();app.leave();app.resume();assert.equal(app.timers.size,0);
  console.log('PASS network width='+width+': true signed weighted sums, all 11 connections, five node inspections, exact piecewise functions, drag/keyboard input, each reversible zero-output intervention, inactive local effect, causal scope and navigation isolation');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-21-remove',meshProgram);app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');assert.equal(assertMesh(app,width).off,'b');meshNode(app,'b').fire('click');assert.equal(assertMesh(app,width).off,'b');
  app.handle.fire('pointerdown',{pointerId:51,clientX:100,button:0});app.documentPointer('pointermove',{pointerId:51,clientX:100+(width-64)/5});jointClose(assertMesh(app,width).values.x,3.5);app.documentPointer('pointerup',{pointerId:51});app.documentPointer('pointermove',{pointerId:51,clientX:300});jointClose(assertMesh(app,width).values.x,3.5);
  app.handle.fire('pointerdown',{pointerId:52,clientX:100,button:0});app.documentPointer('pointercancel',{pointerId:52});app.documentPointer('pointermove',{pointerId:52,clientX:300});jointClose(assertMesh(app,width).values.x,3.5);app.handle.fire('pointerdown',{pointerId:53,clientX:100,button:0});app.hide();app.documentPointer('pointermove',{pointerId:53,clientX:300});jointClose(assertMesh(app,width).values.x,3.5);
}
console.log('PASS network drag lifecycle: document fallback, release/cancel/hide cleanup and selecting the same muted node preserves its state');

function assertMeshDetail(app,width,progress){
  const key=app.svg.getAttribute('data-ma-mesh-detail-key'),input=Number(app.svg.getAttribute('data-ma-mesh-input')),edit=app.svg.getAttribute('data-ma-mesh-edit'),params=edit==='weight'?{weights:{'a-d':1.2}}:edit==='bias'?{biases:{d:-1}}:{},values=meshExpected(input),d=edit==='weight'?Math.max(0,1.2*values.a-1.2*values.b+0.4*values.c-0.2):edit==='bias'?Math.max(0,0.8*values.a-1.2*values.b+0.4*values.c-1):values.d;
  values.d=d;values.y=0.6*d+0.9*values.e+0.2;const edges={a:[['x',1]],b:[['x',1]],c:[['x',1]],d:[['a',edit==='weight'?1.2:0.8],['b',-1.2],['c',0.4]],e:[['a',-0.3],['b',1.3],['c',-1.1]],y:[['d',0.6],['e',0.9]]},biases={a:0,b:-1.5,c:-3,d:edit==='bias'?-1:-0.2,e:1,y:0.2};
  let sum=0;const rows=edges[key].map(([from,weight])=>{const product=values[from]*weight,start=sum;sum+=product;return {from,weight,input:values[from],product,start};}),raw=sum+biases[key],output=key==='y'?raw:Math.max(0,raw),min=Number(app.svg.getAttribute('data-ma-mesh-detail-min')),max=Number(app.svg.getAttribute('data-ma-mesh-detail-max')),X=value=>40+(value-min)/(max-min)*(width-65),multiply=Math.max(0,Math.min(1,(progress-0.35)/0.65)),merge=Math.max(0,Math.min(1,progress-1));
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'mesh-detail');jointClose(app.svg.getAttribute('data-ma-mesh-detail-progress'),progress);jointClose(app.svg.getAttribute('data-ma-mesh-detail-sum'),sum);jointClose(app.svg.getAttribute('data-ma-mesh-detail-bias'),biases[key]);jointClose(app.svg.getAttribute('data-ma-mesh-detail-raw'),raw);jointClose(app.svg.getAttribute('data-ma-mesh-detail-output'),output);jointClose(app.svg.getAttribute('data-ma-mesh-output'),values.y);assert.equal(app.handle.hidden,true);
  const inputs=app.svg.querySelectorAll('[data-ma-mesh-detail-input-bar]'),arrows=app.svg.querySelectorAll('[data-ma-mesh-detail-contribution]');if(progress>=0.35){assert.equal(arrows.length,rows.length);rows.forEach((row,i)=>{const display=row.input*(1+(row.weight-1)*multiply);jointClose(inputs[i].getAttribute('width'),X(row.input)-X(0));jointClose(arrows[i].getAttribute('data-ma-mesh-detail-value'),row.product);jointClose(arrows[i].getAttribute('data-ma-mesh-detail-start'),row.start*merge);jointClose(arrows[i].getAttribute('data-ma-mesh-detail-end'),row.start*merge+display);});}
  if(progress>=2){const p=app.svg.querySelectorAll('[data-ma-mesh-detail-output-point]')[0],bp=Math.max(0,Math.min(1,progress-2)),gp=Math.max(0,Math.min(1,progress-3)),r=sum+biases[key]*bp,v=key==='y'?r:r+(Math.max(0,r)-r)*gp;jointClose(p.getAttribute('cx'),X(v));assert.equal(app.svg.querySelectorAll('[data-ma-mesh-detail-negative]').length,key!=='y'&&progress>3?1:0);}
  for(const bar of app.svg.querySelectorAll('[data-ma-mesh-bar]'))jointClose(bar.getAttribute('data-ma-mesh-value'),values[bar.getAttribute('data-ma-mesh-bar')]);assert.ok(app.copy.children.length<=2);return {key,raw,output,sum,values,min,max};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-21-node',meshProgram);let f=assertMeshDetail(app,width,1);assert.equal(f.key,'d');jointClose(f.sum,0.8);jointClose(f.raw,0.6);jointClose(f.output,0.6);for(let i=2;i<=4;i++){app.advance();assertMeshDetail(app,width,i);}
  const bounds=[f.min,f.max];app.copy.querySelectorAll('[data-ma-mesh-edit-choice]')[0].fire('click');f=assertMeshDetail(app,width,4);jointClose(f.sum,1.8);jointClose(f.raw,1.6);jointClose(f.values.y,2.555);assert.deepEqual([f.min,f.max],bounds);
  app.copy.querySelectorAll('[data-ma-mesh-edit-choice]')[1].fire('click');f=assertMeshDetail(app,width,4);jointClose(f.sum,0.8);jointClose(f.raw,-0.2);jointClose(f.output,0);jointClose(f.values.y,1.595);assert.equal(app.svg.querySelectorAll('[data-ma-mesh-detail-raw-point]').length,1);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'mesh-network');assert.equal(app.svg.querySelectorAll('[data-ma-mesh-reference-function]').length,1);app.copy.querySelectorAll('[data-ma-mesh-reset]')[0].fire('click');assertMesh(app,width);
  for(const key of ['a','b','c','d','e','y']){meshNode(app,key).fire('click');app.copy.querySelectorAll('[data-ma-mesh-open]')[0].fire('click');for(let p=1;p<=4;p++){if(p>1)app.advance();assertMeshDetail(app,width,p);}if(key==='y')assert.match(app.copy.textContent,/没有在这里加ReLU/);app.advance();assertMesh(app,width);}
  app.goToChapter('21-node');app.retreat();assertMesh(app,width);app.goToChapter('21-node');app.advance();assertMeshDetail(app,width,2);app.retreat();assertMeshDetail(app,width,1);meshNode(app,'e').fire('keydown',{key:'Enter'});assert.equal(assertMeshDetail(app,width,1).key,'e');app.goToChapter('19-train');assert.equal(app.netMath.cursor(),0);app.goToChapter('21-network');assertMesh(app,width);
  console.log('PASS node internals width='+width+': all six nodes, signed contribution scaling, head-to-tail addition, one bias shift, actual ReLU vs linear output, single-parameter trials, fixed local scale, downstream values and return to actual full function');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-21-node',meshProgram,true);app.frame(450);assertMeshDetail(app,width,0.216);app.frame(450);assertMeshDetail(app,width,0.648);app.hide();assertMeshDetail(app,width,1);app.show();app.advance();app.frame(750);assertMeshDetail(app,width,1.5);app.resize();assertMeshDetail(app,width,2);app.advance();app.frame(750);assertMeshDetail(app,width,2.5);app.hide();app.show();app.advance();app.frame(750);assertMeshDetail(app,width,3.5);app.hide();app.show();assertMeshDetail(app,width,4);app.goToChapter('21-network');assert.equal(app.frames.size,0);assertMesh(app,width);
}
const reducedMeshDetail=mount(280,'#act-21-node',meshProgram,'reduce');assertMeshDetail(reducedMeshDetail,280,1);assert.equal(reducedMeshDetail.frames.size,0);
console.log('PASS node detail motion: real input extraction, signed scaling, preserved contribution length during addition, bias application, activation, interruption settlement and reduced motion');
for(const width of [736,360,280])for(const mode of ['weight','bias']){
  const app=mount(width,'#act-21-node',meshProgram);for(let i=0;i<3;i++)app.advance();app.copy.querySelectorAll('[data-ma-mesh-edit-choice]').find(n=>n.getAttribute('data-ma-mesh-edit-choice')===mode).fire('click');app.advance();
  const params=mode==='weight'?{weights:{'a-d':1.2}}:{biases:{d:-1}},xs=app.meshMath.vertices(null,params),curve=points(app.svg.querySelectorAll('[data-ma-mesh-function]')[0]),expected=x=>{const r=meshExpected(x),d=Math.max(0,(mode==='weight'?1.2:0.8)*r.a-1.2*r.b+0.4*r.c+(mode==='bias'?-1:-0.2));return 0.6*d+0.9*r.e+0.2;};
  assert.equal(curve.length,xs.length);xs.forEach((x,i)=>{jointClose(curve[i][0],44+x/5*(width-64));jointClose(curve[i][1],435-expected(x)/4.5*170);if(i>0)jointClose(expected((x+xs[i-1])/2),(expected(x)+expected(xs[i-1]))/2);});
  app.key('End');jointClose(app.svg.getAttribute('data-ma-mesh-output'),expected(5));app.copy.querySelectorAll('[data-ma-mesh-reset]')[0].fire('click');assertMesh(app,width);app.advance();meshNode(app,'y').fire('click');app.copy.querySelectorAll('[data-ma-mesh-toggle]')[0].fire('click');jointClose(app.svg.getAttribute('data-ma-mesh-output'),0);
}
console.log('PASS parameter-to-function integration: exact changed breakpoints and downstream function after each trial, input changes under edited parameters, restoration and output-node zeroing');

const wholeProgram=meshProgram.replace('    const waveChapter=','    globalThis.__captureWholeMath({base:wholeBase,trace:wholeTrace,evaluate:wholeEvaluate,step:wholeStep,keys:wholeKeys,records:wholeRecords,at:wholeAt,view:wholeViewParameters,status:wholeStatus,advance:wholeAdvance,state:()=>({...wholeLesson}),history:()=>wholeLesson.history,mesh:()=>meshLesson});\n    const waveChapter=');
const wholeMath=mount(736,'#act-22-train',wholeProgram).wholeMath,wholeInitial=wholeMath.base(),wholeRecords=wholeMath.records,wholeOne=wholeMath.step(wholeInitial);
jointClose(wholeMath.evaluate(wholeInitial).loss,0.417475);jointClose(wholeMath.evaluate(wholeOne).loss,0.35543838163608765);jointClose(wholeOne.weights['x-a'],0.99717004);jointClose(wholeOne.weights['x-c'],1.0162186);jointClose(wholeOne.biases.a,-0.0007014);assert.equal(wholeMath.keys.length,17);
for(const key of wholeMath.keys){const [kind,name]=key.split(':'),field=kind==='w'?'weights':'biases',plus={weights:{...wholeInitial.weights},biases:{...wholeInitial.biases}},minus={weights:{...wholeInitial.weights},biases:{...wholeInitial.biases}};plus[field][name]+=1e-5;minus[field][name]-=1e-5;const numeric=(wholeMath.evaluate(plus).loss-wholeMath.evaluate(minus).loss)/2e-5;jointClose(wholeMath.evaluate(wholeInitial).gradient[key],numeric,1e-7);jointClose(wholeOne[field][name],wholeInitial[field][name]-0.01*wholeMath.evaluate(wholeInitial).gradient[key]);}
const pathTrace=wholeMath.trace(wholeRecords[2],wholeInitial);jointClose(pathTrace.paths.a.find(p=>p.via==='d').value,-0.87456);jointClose(pathTrace.paths.a.find(p=>p.via==='e').value,0.49194);jointClose(pathTrace.influence.a,-0.38262);jointClose(pathTrace.gradient['b:a'],-0.38262);
for(const key of wholeMath.keys)jointClose(wholeMath.evaluate(wholeInitial).gradient[key],wholeRecords.reduce((sum,row)=>sum+wholeMath.trace(row,wholeInitial).gradient[key],0)/5);
const corner=wholeMath.base();corner.biases.b=-0.4;assert.equal(wholeMath.step(corner),null);const altered=wholeRecords.map((r,i)=>({...r,actual:r.actual+(i===2?1:0)}));assert.notEqual(wholeMath.evaluate(wholeInitial,altered).loss,wholeMath.evaluate(wholeInitial).loss);assert.notEqual(wholeMath.evaluate(wholeInitial,altered).gradient['b:y'],wholeMath.evaluate(wholeInitial).gradient['b:y']);
function wholeParametersFromSVG(app){return {weights:Object.fromEntries(wholeMath.keys.filter(k=>k.startsWith('w:')).map(k=>[k.slice(2),Number(app.svg.getAttribute('data-ma-whole-'+k.replace(':','-')))])),biases:Object.fromEntries(wholeMath.keys.filter(k=>k.startsWith('b:')).map(k=>[k.slice(2),Number(app.svg.getAttribute('data-ma-whole-'+k.replace(':','-')))]))};}
function assertWholePrediction(app,width,expected){
  const params=wholeParametersFromSVG(app);for(const k of wholeMath.keys){const [kind,name]=k.split(':'),field=kind==='w'?'weights':'biases';jointClose(params[field][name],expected[field][name]);}
  const result=wholeMath.evaluate(expected),input=Number(app.svg.getAttribute('data-ma-mesh-input')),now=app.meshMath.run(input,null,expected),X=x=>44+x/5*(width-64),Y=y=>435-y/4.5*170,curve=points(app.svg.querySelectorAll('[data-ma-mesh-function]')[0]),xs=app.meshMath.vertices(null,expected);jointClose(app.svg.getAttribute('data-ma-whole-loss'),result.loss);jointClose(app.svg.getAttribute('data-ma-mesh-output'),now.values.y);assert.equal(curve.length,xs.length);xs.forEach((x,i)=>{jointClose(curve[i][0],X(x));jointClose(curve[i][1],Y(app.meshMath.run(x,null,expected).values.y));if(i)jointClose(app.meshMath.run((x+xs[i-1])/2,null,expected).values.y,(app.meshMath.run(x,null,expected).values.y+app.meshMath.run(xs[i-1],null,expected).values.y)/2);});
  assert.equal(app.svg.querySelectorAll('[data-ma-whole-target]').length,5);app.svg.querySelectorAll('[data-ma-whole-gap]').forEach((n,i)=>{jointClose(n.getAttribute('data-ma-whole-gap'),result.rows[i].error);jointClose(n.getAttribute('y1'),Y(wholeRecords[i].actual));jointClose(n.getAttribute('y2'),Y(result.rows[i].values.y));});for(const n of app.svg.querySelectorAll('[data-ma-mesh-bar]')){jointClose(n.getAttribute('width'),26*now.values[n.getAttribute('data-ma-mesh-bar')]/6);assert.ok(Number(n.getAttribute('width'))<=26);}return result;
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-22',wholeProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/17|11个连接权重/);app.advance();assertWholePrediction(app,width,wholeInitial);app.advance();assertWholePrediction(app,width,wholeOne);assert.equal(app.wholeMath.history().length,2);app.advance();assert.equal(app.timers.size,1);assertWholePrediction(app,width,wholeInitial);app.tick();assert.equal(app.wholeMath.state().sample,1);app.advance();assert.equal(app.timers.size,0);app.automatic.fire('click');assert.equal(app.wholeMath.state().sample,2);app.advance();while(app.timers.size)app.tick();assert.equal(app.svg.querySelectorAll('[data-ma-whole-record-loss]').length,5);assert.equal(app.wholeMath.history().length,2);
  app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'whole-paths');jointClose(app.svg.getAttribute('data-ma-whole-path-sum'),-0.38262);const paths=app.svg.querySelectorAll('[data-ma-whole-path]');jointClose(paths[1].getAttribute('data-ma-whole-path-start'),-0.87456);jointClose(paths[1].getAttribute('data-ma-whole-path-end'),-0.38262);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'whole-average');jointClose(app.svg.querySelectorAll('[data-ma-whole-mean-gradient]')[0].getAttribute('data-ma-whole-mean-gradient'),0.07014);app.advance();assertWholePrediction(app,width,wholeOne);assert.equal(app.wholeMath.state().cursor,1);
  app.advance();app.tick();assert.equal(app.wholeMath.state().cursor,7);app.advance();assert.equal(app.timers.size,0);app.automatic.fire('click');assert.equal(app.wholeMath.state().cursor,8);app.advance();let ticks=0;while(app.timers.size&&ticks++<200)app.tick();assert.ok(ticks<200);assert.equal(app.wholeMath.state().cursor,564);const history=app.wholeMath.history(),end=history.at(-1);assertWholePrediction(app,width,end);assert.equal(app.wholeMath.status(),'done');assert.ok(app.wholeMath.evaluate(end).loss>0&&app.wholeMath.evaluate(end).loss<=0.001);let increases=0;
  for(let i=1;i<history.length;i++){const predicted=app.wholeMath.step(history[i-1]);for(const key of wholeMath.keys){const [kind,name]=key.split(':'),field=kind==='w'?'weights':'biases';jointClose(history[i][field][name],predicted[field][name]);}if(app.wholeMath.evaluate(history[i]).loss>app.wholeMath.evaluate(history[i-1]).loss+1e-10)increases++;}
  assert.ok(increases>0);app.retreat();assert.equal(app.wholeMath.state().cursor,563);app.automatic.fire('click');assert.equal(app.wholeMath.state().cursor,564);assertWholePrediction(app,width,end);const savedHistory=JSON.stringify(app.wholeMath.history()),savedRecords=JSON.stringify(wholeRecords);app.key('End');assertWholePrediction(app,width,end);assert.equal(JSON.stringify(app.wholeMath.history()),savedHistory);assert.equal(JSON.stringify(wholeRecords),savedRecords);
  meshNode(app,'d').fire('click');app.copy.querySelectorAll('[data-ma-mesh-open]')[0].fire('click');assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'mesh-detail');assert.equal(app.copy.querySelectorAll('[data-ma-mesh-edit-choice]').length,0);for(let i=0;i<3;i++)app.advance();const detail=app.meshMath.facts('d',end);jointClose(app.svg.getAttribute('data-ma-mesh-detail-output'),detail.output);app.advance();assertWholePrediction(app,width,end);app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.match(app.copy.textContent,/目标依然是预测/);app.goToChapter('21-network');assert.equal(app.meshMath.state().input,2.5);assertMesh(app,width);app.goToChapter('22-train');assertWholePrediction(app,width,end);assert.equal(JSON.stringify(app.wholeMath.history()),savedHistory);
  console.log('PASS whole-network width='+width+': 17 exact gradients, immutable records, first real simultaneous update, replay of old parameters, two-path summation, one batch mean, 564 true rounds with real fluctuations, all history, current-parameter inspection and prior-lesson isolation');
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-22-train',wholeProgram,true);app.advance();app.frame(600);assertWholePrediction(app,width,app.wholeMath.at(0.5));app.hide();assertWholePrediction(app,width,wholeOne);app.show();app.advance();app.tick();app.frame(40);assertWholePrediction(app,width,app.wholeMath.at(4));app.goToChapter('21-network');assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);app.goToChapter('22-train');assertWholePrediction(app,width,app.wholeMath.history()[7]);app.advance();app.tick();app.hide();assert.equal(app.timers.size,0);
}
const reducedWhole=mount(280,'#act-22-train',wholeProgram,'reduce');reducedWhole.advance();assertWholePrediction(reducedWhole,280,wholeOne);assert.equal(reducedWhole.frames.size,0);
console.log('PASS whole-network motion: actual neighboring snapshots, synchronized outputs/functions/loss, no invented rounds, pause/visibility/navigation and reduced motion');
for(const width of [736,360,280]){
  const app=mount(width,'#act-22-train',wholeProgram);app.advance();app.advance();app.tick();const saved=JSON.stringify(app.wholeMath.history()),records=JSON.stringify(wholeRecords),cursor=app.wholeMath.state().cursor,scale=(width-64)/5;
  app.handle.fire('pointerdown',{pointerId:91,clientX:100,button:0});assert.equal(app.timers.size,0);assert.ok(!app.copy.textContent.includes('正在真实更新'));app.documentPointer('pointermove',{pointerId:91,clientX:100+scale});jointClose(Number(app.svg.getAttribute('data-ma-mesh-input')),3.4);app.documentPointer('pointermove',{pointerId:91,clientX:100+2*scale});jointClose(Number(app.svg.getAttribute('data-ma-mesh-input')),4.4);app.documentPointer('pointerup',{pointerId:91});assert.equal(app.wholeMath.state().cursor,cursor);assert.equal(JSON.stringify(app.wholeMath.history()),saved);assert.equal(JSON.stringify(wholeRecords),records);
  app.advance();app.tick();app.hide();assert.equal(app.timers.size,0);assert.ok(!app.copy.textContent.includes('正在真实更新'));app.show();app.resume();assert.ok(!app.copy.textContent.includes('正在真实更新'));
  while(app.wholeMath.status()==='ready')app.wholeMath.advance();app.resize();const shown=app.copy.querySelectorAll('[data-ma-whole-loss]')[0].textContent;assert.ok(Number(shown)<0.001);assert.ok(Math.abs(Number(shown)-0.000995992709506332)<0.0000005);
}
console.log('PASS training observation lifecycle: multi-move pointer drag only changes the viewed input, pause text stays accurate, records/history stay fixed and stopping score is displayed below its threshold');

const textProgram=wholeProgram.replace('    const waveChapter=','    globalThis.__captureTextMath({codec:textCodec,record:textRecord,units:textUnits,vocabulary:textVocabulary,sentence:textSentence,state:()=>({...textLesson})});\n    const waveChapter=');
function textControl(app,key){return app.copy.querySelectorAll('[data-ma-text-'+key+']')[0];}
function textToken(app,index){return app.svg.querySelectorAll('[data-ma-text-token]').find(n=>Number(n.getAttribute('data-ma-text-token'))===index);}
function assertTextRecord(app,width){
  const cut=Number(app.svg.getAttribute('data-ma-text-cut')),scheme=Number(app.svg.getAttribute('data-ma-text-scheme')),units=Array.from('小猫看小鸟，小鸟看小猫。'),base=[0,1,2,0,3,4,0,3,2,0,1,5],other=[4,0,5,4,1,3,4,1,5,4,0,2],ids=scheme?other:base,role=app.svg.getAttribute('data-ma-chart-kind'),shownIds=role!=='text-pairs',record=app.textMath.record(cut,scheme),columns=width>=660?12:6,gap=columns===12?8:6,cell=Math.min(44,(width-20-(columns-1)*gap)/columns),left=(width-columns*cell-(columns-1)*gap)/2;
  assert.ok(cut>=1&&cut<units.length);assert.equal(record.input,units.slice(0,cut).join(''));assert.equal(record.target,units[cut]);assert.equal(record.decodedInput,record.input);assert.equal(record.decodedTarget,record.target);assert.equal(app.svg.getAttribute('data-ma-text-input'),record.input);assert.equal(app.svg.getAttribute('data-ma-text-target'),units[cut]);assert.equal(app.svg.getAttribute('data-ma-text-decoded'),units.join(''));assert.deepEqual(JSON.parse(app.svg.getAttribute('data-ma-text-input-ids')),ids.slice(0,cut));assert.equal(Number(app.svg.getAttribute('data-ma-text-target-id')),ids[cut]);assert.equal(app.svg.querySelectorAll('[data-ma-text-boundary]').length,1);
  const cells=app.svg.querySelectorAll('[data-ma-text-cell]'),glyphs=app.svg.querySelectorAll('[data-ma-text-glyph]');assert.equal(cells.length,12);assert.equal(glyphs.length,12);cells.forEach((n,i)=>{assert.equal(n.getAttribute('data-ma-text-role'),i<cut?'input':i===cut?'target':'future');jointClose(n.getAttribute('x'),left+(i%columns)*(cell+gap));jointClose(n.getAttribute('y'),72+Math.floor(i/columns)*124);jointClose(n.getAttribute('height'),shownIds?78:46);assert.equal(glyphs[i].textContent,units[i]);jointClose(glyphs[i].getAttribute('x'),left+(i%columns)*(cell+gap)+cell/2);jointClose(glyphs[i].getAttribute('y'),102+Math.floor(i/columns)*124);});
  const codes=app.svg.querySelectorAll('[data-ma-text-id]');assert.equal(codes.length,shownIds?12:0);codes.forEach((n,i)=>{assert.equal(Number(n.textContent),ids[i]);assert.equal(Number(n.getAttribute('data-ma-text-id-value')),ids[i]);});assert.equal(app.handle.hidden,true);assert.equal(app.timers.size,0);assert.equal(app.frames.size,0);assert.ok(app.copy.children.length<=2);return {cut,scheme,record,ids,glyphs:glyphs.map(n=>[n.getAttribute('x'),n.getAttribute('y')])};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-23',textProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/前面的文字/);assert.match(app.copy.textContent,/配成记录/);app.advance();let state=assertTextRecord(app,width);assert.equal(state.record.input,'小猫看');assert.equal(state.record.target,'小');assert.match(app.copy.textContent,/没有运行模型预测/);textControl(app,'right').fire('click');state=assertTextRecord(app,width);assert.equal(state.record.input,'小猫看小');assert.equal(state.record.target,'鸟');
  for(let i=0;i<20;i++)textControl(app,'right').fire('click');assert.equal(assertTextRecord(app,width).cut,11);assert.equal(textControl(app,'right').disabled,true);assert.equal(app.svg.getAttribute('data-ma-text-target'),'。');for(let i=0;i<20;i++)textControl(app,'left').fire('click');assert.equal(assertTextRecord(app,width).cut,1);assert.equal(textControl(app,'left').disabled,true);textControl(app,'right').fire('click');textControl(app,'right').fire('click');const positions=assertTextRecord(app,width).glyphs;app.advance();state=assertTextRecord(app,width);assert.deepEqual(state.glyphs,positions);assert.equal(app.svg.getAttribute('role'),'group');
  textToken(app,0).fire('click');assertTextRecord(app,width);assert.deepEqual(app.svg.querySelectorAll('[data-ma-text-match]').map(n=>Number(n.getAttribute('data-ma-text-match'))),[0,3,6,9]);assert.equal(app.svg.querySelectorAll('[data-ma-text-cell]')[9].getAttribute('data-ma-text-role'),'future');textToken(app,6).fire('keydown',{key:'Enter'});assert.equal(app.svg.querySelectorAll('[data-ma-text-match]').length,0);textToken(app,7).fire('keydown',{key:' '});assert.deepEqual(app.svg.querySelectorAll('[data-ma-text-match]').map(n=>Number(n.getAttribute('data-ma-text-match'))),[4,7]);
  app.advance();const before=assertTextRecord(app,width);assert.match(app.copy.textContent,/Token/);assert.equal(app.copy.querySelectorAll('[data-ma-text-left]').length,0);textControl(app,'renumber').fire('click');const renamed=assertTextRecord(app,width);assert.equal(renamed.scheme,1);assert.equal(renamed.cut,before.cut);assert.equal(renamed.record.input,before.record.input);assert.equal(renamed.record.target,before.record.target);assert.deepEqual(renamed.glyphs,before.glyphs);assert.notDeepEqual(renamed.ids,before.ids);assert.match(app.svg.querySelectorAll('[data-ma-text-feedback]')[0].textContent,/编号都是1/);textControl(app,'renumber').fire('click');assert.deepEqual(assertTextRecord(app,width).ids,before.ids);app.retreat();assertTextRecord(app,width);app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/编号只是标签/);assert.match(app.copy.textContent,/没有运行文字模型预测/);app.advance();assert.equal(app.textMath.state().cut,3);assert.equal(app.textMath.state().scheme,0);assert.equal(app.textMath.state().selected,'鸟');assert.match(app.copy.textContent,/帮助预测/);
  for(const scheme of [0,1]){const codec=app.textMath.codec(scheme);assert.equal(codec.decode(codec.encode(app.textMath.sentence)),app.textMath.sentence);assert.equal(new Set(codec.encode(app.textMath.sentence)).size,6);assert.throws(()=>codec.encode('Z'));assert.throws(()=>codec.decode([99]));for(let cut=1;cut<12;cut++){const r=app.textMath.record(cut,scheme);assert.equal(r.inputIds.length,cut);assert.equal(r.decodedInput+r.decodedTarget,Array.from(app.textMath.sentence).slice(0,cut+1).join(''));}}
  app.goToChapter('23-pairs');assertTextRecord(app,width);app.goToChapter('23-ids');assertTextRecord(app,width);app.goToChapter('23-renumber');assertTextRecord(app,width);app.resize();assertTextRecord(app,width);app.hide();app.show();app.leave();app.resume();assertTextRecord(app,width);
  console.log('PASS text width='+width+': exact prefix/next-character pairs, no future leakage, final punctuation and boundary limits, same glyph positions across ID reveal, same-character identity highlight, real reversible bijection, decoding, touch-sized controls, navigation and replay');
}
const preservedText=mount(280,'#act-22-train',textProgram);preservedText.advance();const preservedHistory=JSON.stringify(preservedText.wholeMath.history()),preservedRecords=JSON.stringify(preservedText.wholeMath.records);preservedText.goToChapter('23-pairs');textControl(preservedText,'right').fire('click');preservedText.advance();textToken(preservedText,0).fire('click');preservedText.advance();textControl(preservedText,'renumber').fire('click');assert.equal(JSON.stringify(preservedText.wholeMath.history()),preservedHistory);assert.equal(JSON.stringify(preservedText.wholeMath.records),preservedRecords);preservedText.goToChapter('22-train');assertWholePrediction(preservedText,280,wholeOne);preservedText.goToChapter('23-renumber');assert.equal(assertTextRecord(preservedText,280).scheme,1);
console.log('PASS text preparation is isolated from all previous real training and never claims to predict or train a text model');

const embProgram=textProgram.replace('    const waveChapter=','    globalThis.__captureEmbMath({entry:embEntry,compute:embCompute,initial:embInitial,weights:embWeights,bias:embBias,state:()=>embLesson,set:embSet});\n    const waveChapter=');
function embToken(app,index){return app.svg.querySelectorAll('[data-ma-emb-token]').find(n=>Number(n.getAttribute('data-ma-emb-token'))===index);}
function assertEmb(app,width){
  const state=app.embMath.state(),entry=state.rows[state.scheme?[4,0,5][state.selected]:[0,1,2][state.selected]],values=entry.values,raw=0.8*values[0]-1.2*values[1]-0.2,out=Math.max(0,raw),kind=app.svg.getAttribute('data-ma-chart-kind');assert.equal(app.svg.getAttribute('data-ma-emb-glyph'),entry.glyph);assert.equal(Number(app.svg.getAttribute('data-ma-emb-id')),entry.id);jointClose(app.svg.getAttribute('data-ma-emb-first'),values[0]);jointClose(app.svg.getAttribute('data-ma-emb-second'),values[1]);jointClose(app.svg.getAttribute('data-ma-emb-raw'),raw);jointClose(app.svg.getAttribute('data-ma-emb-output'),out);assert.equal(app.svg.querySelectorAll('[data-ma-emb-token]').length,3);assert.equal(app.svg.querySelectorAll('[data-ma-emb-role]')[3].getAttribute('data-ma-emb-role'),'target');assert.equal(app.svg.querySelectorAll('[data-ma-emb-role]')[8].getAttribute('data-ma-emb-role'),'future');
  if(kind==='emb-lookup'){const slots=app.svg.querySelectorAll('[data-ma-emb-slot]');assert.equal(slots.length,6);slots.forEach((n,i)=>{assert.equal(Number(n.getAttribute('data-ma-emb-slot')),i);assert.equal(n.getAttribute('data-ma-emb-slot-glyph'),state.rows[i].glyph);assert.equal(n.getAttribute('data-ma-emb-slot-values'),JSON.stringify(state.rows[i].values));});assert.equal(app.svg.querySelectorAll('[data-ma-emb-lookup-value]').length,2);app.svg.querySelectorAll('[data-ma-emb-lookup-value]').forEach((n,i)=>jointClose(Number(n.textContent),values[i]));assert.equal(Number(app.svg.querySelectorAll('[data-ma-emb-lookup-connection]')[0].getAttribute('data-ma-emb-lookup-connection')),entry.id);assert.equal(app.handle.hidden,true);}
  else{
    app.svg.querySelectorAll('[data-ma-emb-component]').forEach((n,i)=>jointClose(Number(n.textContent),values[i]));const wordBottom=width>=660?74:150,top=wordBottom+120;
    if(!state.inspect){const size=Math.min(180,width-76),left=(width-size)/2,X=v=>left+(v+1.5)/3*size,Y=v=>top+(1.5-v)/3*size,point=app.svg.querySelectorAll('[data-ma-emb-point]')[0];jointClose(point.getAttribute('cx'),X(values[0]));jointClose(point.getAttribute('cy'),Y(values[1]));jointClose(parseFloat(app.handle.style.left),X(values[0]));jointClose(parseFloat(app.handle.style.top),Y(values[1]));const first=app.svg.querySelectorAll('[data-ma-emb-first-leg]')[0],second=app.svg.querySelectorAll('[data-ma-emb-second-leg]')[0];jointClose(first.getAttribute('x1'),X(0));jointClose(first.getAttribute('x2'),X(values[0]));jointClose(second.getAttribute('y1'),Y(0));jointClose(second.getAttribute('y2'),Y(values[1]));assert.equal(app.handle.hidden,false);assert.equal(app.handle.getAttribute('role'),'group');assert.equal(app.handle.getAttribute('aria-valuenow'),undefined);if(kind==='emb-compute')jointClose(Number(app.svg.querySelectorAll('[data-ma-emb-node-output]')[0].textContent),out,0.000051);}
    else {const X=v=>30+(v+3.5)/7*(width-60),arrows=app.svg.querySelectorAll('[data-ma-emb-contribution]'),products=[0.8*values[0],-1.2*values[1]];assert.equal(arrows.length,2);jointClose(arrows[0].getAttribute('data-ma-emb-start'),0);jointClose(arrows[0].getAttribute('data-ma-emb-end'),products[0]);jointClose(arrows[1].getAttribute('data-ma-emb-start'),products[0]);jointClose(arrows[1].getAttribute('data-ma-emb-end'),products[0]+products[1]);products.forEach((v,i)=>jointClose(arrows[i].getAttribute('data-ma-emb-product'),v));jointClose(app.svg.querySelectorAll('[data-ma-emb-after-relu]')[0].getAttribute('cx'),X(out));assert.equal(app.svg.querySelectorAll('[data-ma-emb-before-relu]').length,raw<0?1:0);assert.equal(app.handle.hidden,true);}
  }
  assert.deepEqual(Array.from(app.embMath.weights),[0.8,-1.2]);jointClose(app.embMath.bias,-0.2);assert.equal(app.timers.size,0);assert.equal(app.frames.size,0);assert.ok(app.copy.children.length<=2);return {entry,raw,out,values:[...values]};
}
for(const width of [736,360,280]){
  const app=mount(width,'#act-24-lab',embProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/手工初值/);app.advance();let f=assertEmb(app,width);assert.equal(f.entry.glyph,'看');assert.equal(f.entry.id,2);assert.deepEqual(f.values,[1,-0.5]);jointClose(f.out,1.2);embToken(app,0).fire('click');assertEmb(app,width);assert.equal(app.svg.querySelectorAll('[data-ma-emb-shared]').length,4);embToken(app,2).fire('keydown',{key:'Enter'});app.advance();assertEmb(app,width);app.key('ArrowRight');app.key('ArrowUp');f=assertEmb(app,width);assert.deepEqual(f.values,[1.1,-0.4]);embToken(app,1).fire('click');app.key('ArrowDown');assert.deepEqual(assertEmb(app,width).values,[-0.6,0.4]);embToken(app,2).fire('click');assert.deepEqual(assertEmb(app,width).values,[1.1,-0.4]);assert.equal(app.embMath.entry(8),app.embMath.entry(2));app.copy.querySelectorAll('[data-ma-emb-reset]')[0].fire('click');assert.deepEqual(assertEmb(app,width).values,[1,-0.5]);assert.deepEqual(Array.from(app.embMath.entry(1).values),[-0.6,0.4]);
  const scale=Math.min(180,width-76)/3;app.handle.fire('pointerdown',{pointerId:61,clientX:100,clientY:100,button:0});app.documentPointer('pointermove',{pointerId:61,clientX:100+scale*0.5,clientY:100-scale*1.5});assert.deepEqual(assertEmb(app,width).values,[1.5,1]);app.documentPointer('pointermove',{pointerId:61,clientX:100-scale*3,clientY:100+scale*3});assert.deepEqual(assertEmb(app,width).values,[-1.5,-1.5]);app.documentPointer('pointerup',{pointerId:61});const saved=JSON.stringify(app.embMath.state().rows);app.documentPointer('pointermove',{pointerId:61,clientX:400,clientY:400});assert.equal(JSON.stringify(app.embMath.state().rows),saved);app.copy.querySelectorAll('[data-ma-emb-reset]')[0].fire('click');app.advance();assertEmb(app,width);app.copy.querySelectorAll('[data-ma-emb-inspect]')[0].fire('click');assertEmb(app,width);app.copy.querySelectorAll('[data-ma-emb-inspect]')[0].fire('click');app.embMath.set([1.5,1.5]);jointClose(assertEmb(app,width).out,0);app.copy.querySelectorAll('[data-ma-emb-inspect]')[0].fire('click');assertEmb(app,width);app.copy.querySelectorAll('[data-ma-emb-reset]')[0].fire('click');jointClose(assertEmb(app,width).out,1.2);app.copy.querySelectorAll('[data-ma-emb-inspect]')[0].fire('click');app.resize();assertEmb(app,width);
  app.handle.fire('pointerdown',{pointerId:62,clientX:100,clientY:100,button:0});app.documentPointer('pointercancel',{pointerId:62});app.documentPointer('pointermove',{pointerId:62,clientX:0,clientY:0});assert.deepEqual(assertEmb(app,width).values,[1,-0.5]);app.handle.fire('pointerdown',{pointerId:63,clientX:100,clientY:100,button:0});app.hide();app.documentPointer('pointermove',{pointerId:63,clientX:0,clientY:0});assert.deepEqual(assertEmb(app,width).values,[1,-0.5]);app.show();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/Embedding/);assert.match(app.copy.textContent,/没有学到字义/);app.advance();assert.equal(app.embMath.state().selected,2);assert.deepEqual(Array.from(app.embMath.entry().values),[1,-0.5]);app.goToChapter('24-lookup');assertEmb(app,width);app.goToChapter('24-vector');assertEmb(app,width);app.goToChapter('24-compute');assertEmb(app,width);app.goToChapter('21-network');assert.equal(app.handle.getAttribute('role'),'slider');
  console.log('PASS embedding width='+width+': actual ID-indexed lookup, only input tokens selectable, shared representation, persistent per-token edits, real 2D mouse/keyboard values, clamping, signed node computation, fixed weights/bias, reset and drag lifecycle');
}
const independentEmb=mount(280,'#act-22-train',embProgram);independentEmb.advance();const embHistory=JSON.stringify(independentEmb.wholeMath.history());independentEmb.goToChapter('23-renumber');textControl(independentEmb,'renumber').fire('click');const oldText=JSON.stringify(independentEmb.textMath.state());independentEmb.goToChapter('24-vector');assert.equal(assertEmb(independentEmb,280).entry.id,5);independentEmb.key('ArrowLeft');assert.deepEqual(assertEmb(independentEmb,280).values,[0.9,-0.5]);assert.equal(JSON.stringify(independentEmb.textMath.state()),oldText);assert.equal(JSON.stringify(independentEmb.wholeMath.history()),embHistory);independentEmb.goToChapter('23-renumber');textControl(independentEmb,'renumber').fire('click');independentEmb.goToChapter('24-vector');assert.equal(assertEmb(independentEmb,280).entry.id,2);assert.deepEqual(assertEmb(independentEmb,280).values,[0.9,-0.5]);independentEmb.goToChapter('22-train');assertWholePrediction(independentEmb,280,wholeOne);
console.log('PASS embedding remaps lookup rows when IDs change while preserving each glyph representation and every previous training snapshot');


const usageProgram=embProgram.replace('    const waveChapter=','    globalThis.__captureUsageMath({model:usageModel,rotate:usageRotate,pairs:usagePairs,base:usageBase,state:()=>usageLesson,set:usageSet,select:usageSelect});\n    const waveChapter=');
function usageControl(app,key){return app.copy.querySelectorAll('[data-ma-usage-'+key+']')[0];}
function assertUsage(app,width){
 const kind=app.svg.getAttribute('data-ma-chart-kind');
 if(kind==='usage-observe'){assert.equal(app.svg.querySelectorAll('[data-ma-usage-sentence]').length,5);const pairs=app.usageMath.pairs(),links=app.svg.querySelectorAll('[data-ma-usage-link]');assert.equal(links.length,5);links.forEach((l,i)=>{assert.equal(l.getAttribute('data-ma-usage-word'),pairs[i].word);assert.equal(l.getAttribute('data-ma-usage-context'),pairs[i].context);});assert.equal(app.handle.hidden,true);return;}
 const vectors=JSON.parse(app.svg.getAttribute('data-ma-usage-vectors')),directions=JSON.parse(app.svg.getAttribute('data-ma-usage-directions')),scores=JSON.parse(app.svg.getAttribute('data-ma-usage-scores')),angle=Number(app.svg.getAttribute('data-ma-usage-angle')),open=Number(app.svg.getAttribute('data-ma-usage-open')),state=app.usageMath.state(),plane=kind!=='usage-dimensions',c=Math.cos(angle),s=Math.sin(angle);
 state.rows.forEach((v,i)=>{const y=plane?v[1]*open:0;jointClose(vectors[i][0],c*v[0]-s*y);jointClose(vectors[i][1],s*v[0]+c*y);directions.forEach((d,j)=>jointClose(scores[i][j],vectors[i][0]*d[0]+vectors[i][1]*d[1]));jointClose(scores[i][0],v[0]);jointClose(scores[i][1],plane?v[1]*open*open:0);});
 const wide=width>=600,cx=wide?width*.23:width/2,cy=wide?174:142,scale=wide?Math.min(112,width*.23-40):Math.min(90,(width-64)/(2*Math.SQRT2));
 app.svg.querySelectorAll('[data-ma-usage-point-dot]').forEach((p,i)=>{jointClose(p.getAttribute('cx'),cx+scale*vectors[i][0]);jointClose(p.getAttribute('cy'),cy-scale*vectors[i][1]);});
 app.svg.querySelectorAll('[data-ma-usage-score-bar]').forEach(b=>{const [j,i]=b.getAttribute('data-ma-usage-score-bar').split(':').map(Number),score=scores[i][j],sw=wide?width*.48-16:width-32,unit=(sw-70)/2,zero=(wide?width*.52:16)+31+unit;jointClose(b.getAttribute('data-ma-usage-score'),score);jointClose(b.getAttribute('width'),Math.abs(score)*unit);jointClose(b.getAttribute('x'),zero+Math.min(0,score)*unit);});
 assert.equal(app.svg.querySelectorAll('[data-ma-usage-score-bar]').length,6);assert.equal(app.handle.hidden,false);assert.equal(app.handle.getAttribute('role'),'group');jointClose(parseFloat(app.handle.style.left),cx+scale*vectors[state.selected][0]);jointClose(parseFloat(app.handle.style.top),cy-scale*vectors[state.selected][1]);assert.equal(app.timers.size,0);assert.ok(app.copy.children.length<=2);return scores;
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-24',usageProgram);assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/帮助预测/);app.advance();assertUsage(app,width);assert.equal(app.copy.querySelectorAll('[data-ma-usage-word]').length,0);app.advance();let scores=assertUsage(app,width);assert.equal(scores.every(v=>v[1]===0),true);app.key('ArrowRight');jointClose(assertUsage(app,width)[2][0],-.5);app.key('ArrowUp');jointClose(assertUsage(app,width)[2][1],0);app.advance();assertUsage(app,width);app.key('ArrowUp');scores=assertUsage(app,width);jointClose(scores[2][0],-.5);jointClose(scores[2][1],.1);assert.deepEqual(scores.slice(0,2),[[.65,0],[.25,0]]);
 app.usageMath.select(0);app.key('ArrowDown');scores=assertUsage(app,width);jointClose(scores[0][0],.65);jointClose(scores[0][1],-.1);app.usageMath.select(2);const before=JSON.stringify(app.usageMath.state().rows);app.retreat();assertUsage(app,width);assert.equal(JSON.stringify(app.usageMath.state().rows),before);app.advance();assertUsage(app,width);jointClose(assertUsage(app,width)[2][1],.1);
 app.advance();const unrotated=assertUsage(app,width);usageControl(app,'rotate').fire('click');const rotated=assertUsage(app,width);unrotated.forEach((row,i)=>row.forEach((v,j)=>jointClose(rotated[i][j],v)));assert.ok(Number(app.svg.getAttribute('data-ma-usage-angle'))>0);usageControl(app,'rotate').fire('click');assertUsage(app,width);
 const scale=width>=600?Math.min(112,width*.23-40):Math.min(90,(width-64)/(2*Math.SQRT2));app.handle.fire('pointerdown',{pointerId:90,clientX:100,clientY:100,button:0});app.documentPointer('pointermove',{pointerId:90,clientX:100+scale*.2,clientY:100-scale*.4});scores=assertUsage(app,width);jointClose(scores[2][0],-.3);jointClose(scores[2][1],.5);app.documentPointer('pointerup',{pointerId:90});const ended=JSON.stringify(app.usageMath.state().rows);app.documentPointer('pointermove',{pointerId:90,clientX:999,clientY:999});assert.equal(JSON.stringify(app.usageMath.state().rows),ended);
 app.usageMath.set([9,-9]);scores=assertUsage(app,width);jointClose(scores[2][0],1);jointClose(scores[2][1],-1);app.handle.fire('pointerdown',{pointerId:91,clientX:100,clientY:100,button:0});app.hide();app.documentPointer('pointermove',{pointerId:91,clientX:0,clientY:0});assertUsage(app,width);jointClose(assertUsage(app,width)[2][0],1);app.show();app.resize();assertUsage(app,width);
 app.advance();assertUsage(app,width);assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'usage-lookup');const reads=app.svg.querySelectorAll('[data-ma-usage-shared-read]');assert.equal(reads.length,2);reads.forEach(r=>assert.equal(Number(r.getAttribute('data-ma-usage-read-id')),2));const storage=app.svg.querySelectorAll('[data-ma-usage-storage-id]')[0];assert.equal(Number(storage.getAttribute('data-ma-usage-storage-id')),2);assert.deepEqual(JSON.parse(storage.getAttribute('data-ma-usage-storage-values')),[1,-1]);app.usageMath.select(0);app.key('ArrowUp');assertUsage(app,width);app.svg.querySelectorAll('[data-ma-usage-occurrence-id]').forEach(n=>assert.equal(Number(n.getAttribute('data-ma-usage-occurrence-id')),0));app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/尚未从文字训练/);assert.equal(app.copy.querySelectorAll('[data-ma-usage-lab]').length,0);const keptRows=JSON.stringify(app.usageMath.state().rows);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'prob-observe');assert.equal(JSON.stringify(app.usageMath.state().rows),keptRows);app.retreat();
 for(const alias of ['24-usage','24-dimensions','24-data','24-capacity','24-shared']){app.goToChapter(alias);assertUsage(app,width);}console.log('PASS representation width='+width+': all corpus links, shared vectors, both computed score panels, 1D/2D independence, persistent edits, mouse/keyboard, clamping, shared lookup, replay and detached archive');
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-24-dimensions',usageProgram,true);assertUsage(app,width);app.advance();app.frame(400);jointClose(app.svg.getAttribute('data-ma-usage-open'),.5);assertUsage(app,width);app.hide();jointClose(app.svg.getAttribute('data-ma-usage-open'),1);app.show();app.usageMath.set([.4,.8]);app.advance();const expected=assertUsage(app,width);usageControl(app,'rotate').fire('click');app.frame(500);jointClose(app.svg.getAttribute('data-ma-usage-angle'),Math.PI/8);const half=assertUsage(app,width);expected.forEach((row,i)=>row.forEach((v,j)=>jointClose(half[i][j],v)));app.resize();jointClose(app.svg.getAttribute('data-ma-usage-angle'),Math.PI/4);assertUsage(app,width);
 app.handle.fire('pointerdown',{pointerId:92,clientX:0,clientY:0,button:0});const scale=width>=600?Math.min(112,width*.23-40):Math.min(90,(width-64)/(2*Math.SQRT2));app.documentPointer('pointermove',{pointerId:92,clientX:scale*.1,clientY:0});assertUsage(app,width);jointClose(app.usageMath.state().rows[2][0],.47);jointClose(app.usageMath.state().rows[2][1],.73);app.documentPointer('pointercancel',{pointerId:92});usageControl(app,'rotate').fire('click');app.frame(300);app.goToChapter('21-network');assert.equal(app.frames.size,0);assert.equal(app.handle.getAttribute('role'),'slider');
}
const isolatedUsage=mount(280,'#act-22-train',usageProgram);isolatedUsage.advance();const savedWhole=JSON.stringify(isolatedUsage.wholeMath.history());isolatedUsage.goToChapter('24-vector');isolatedUsage.key('ArrowLeft');const savedLab=JSON.stringify(isolatedUsage.embMath.state());isolatedUsage.goToChapter('24-data');isolatedUsage.usageMath.set([.4,.8]);assertUsage(isolatedUsage,280);assert.equal(JSON.stringify(isolatedUsage.wholeMath.history()),savedWhole);assert.equal(JSON.stringify(isolatedUsage.embMath.state()),savedLab);
console.log('PASS representation opening and orthogonal rotation preserve exact computations, interrupted animations settle, rotated drag works and all previous training stays isolated');

for(const width of [736,360,280]){
 const app=mount(width,'#act-24-capacity',usageProgram);app.usageMath.set([.4,.8]);usageControl(app,'rotate').fire('click');const before=JSON.stringify(assertUsage(app,width)),rows=JSON.stringify(app.usageMath.state().rows);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'usage-lookup');assert.equal(JSON.stringify(assertUsage(app,width)),before);assert.equal(JSON.stringify(app.usageMath.state().rows),rows);const model=app.usageMath.model(true,Math.PI/4);model.ids.forEach((id,i)=>assert.equal(model.vectors[i],model.table[id]));const stored=JSON.parse(app.svg.querySelectorAll('[data-ma-usage-storage-id]')[0].getAttribute('data-ma-usage-storage-values'));model.vectors[2].forEach((v,i)=>jointClose(stored[i],v));for(let i=0;i<3;i++){app.usageMath.select(i);assertUsage(app,width);app.svg.querySelectorAll('[data-ma-usage-shared-read]').forEach(r=>assert.equal(Number(r.getAttribute('data-ma-usage-read-id')),i));app.svg.querySelectorAll('[data-ma-usage-occurrence-id]').forEach(r=>assert.equal(Number(r.getAttribute('data-ma-usage-occurrence-id')),i));}app.retreat();assertUsage(app,width);app.advance();assertUsage(app,width);app.resize();assertUsage(app,width);app.advance();assert.equal(app.copy.querySelectorAll('[data-ma-usage-lab]').length,0);app.goToChapter('24-lab');assert.match(app.copy.textContent,/手工初值/);app.advance();assertEmb(app,width);app.advance();assertEmb(app,width);app.advance();jointClose(assertEmb(app,width).out,1.2);app.copy.querySelectorAll('[data-ma-emb-inspect]')[0].fire('click');assertEmb(app,width);assert.equal(app.svg.querySelectorAll('[data-ma-emb-contribution]').length,2);
}
console.log('PASS shared lookup keeps edited rotated values and all six scores; both contexts read the same ID-indexed row; the archived weighted/ReLU lab remains directly accessible without a mainline link');

const probProgram=usageProgram.replace('    const waveChapter=','    globalThis.__captureProbMath({softmax:probSoftmax,data:probData,state:()=>probLesson});\n    const waveChapter=');
function assertProb(app,width){
 const d=app.probMath.data(),scores=JSON.parse(app.svg.getAttribute('data-ma-prob-scores')),weights=JSON.parse(app.svg.getAttribute('data-ma-prob-weights')),ps=JSON.parse(app.svg.getAttribute('data-ma-prob-probabilities'));assert.equal(app.svg.getAttribute('data-ma-prob-source'),'小鸟在飞翔。');assert.equal(Number(app.svg.getAttribute('data-ma-prob-target')),2);
 let sum=0;for(let i=0;i<3;i++){jointClose(scores[i],app.usageMath.state().rows[i][1]);jointClose(weights[i],Math.exp(scores[i]));sum+=weights[i];}jointClose(app.svg.getAttribute('data-ma-prob-total'),sum);ps.forEach((p,i)=>{jointClose(p,weights[i]/sum);assert.ok(p>0&&p<1);});jointClose(ps.reduce((a,b)=>a+b,0),1);
 const kind=app.svg.getAttribute('data-ma-chart-kind');
 if(['prob-observe','prob-distribution'].includes(kind)){assert.equal(app.svg.querySelectorAll('[data-ma-usage-score-bar]').length,3);assert.equal(app.handle.hidden,false);const vs=JSON.parse(app.svg.getAttribute('data-ma-usage-vectors')),ds=JSON.parse(app.svg.getAttribute('data-ma-usage-directions'));vs.forEach((v,i)=>jointClose(scores[i],v[0]*ds[1][0]+v[1]*ds[1][1]));}
 if(kind==='prob-distribution'){const wide=width>=600,sw=wide?width*.48-16:width-32,x=wide?width*.52:16;let prefix=0;app.svg.querySelectorAll('[data-ma-prob-segment]').forEach((b,i)=>{jointClose(b.getAttribute('x'),x+prefix*sw);jointClose(b.getAttribute('width'),ps[i]*sw);prefix+=ps[i];});assert.equal(app.svg.querySelectorAll('[data-ma-prob-segment]').length,3);}
 if(kind==='prob-convert'){app.svg.querySelectorAll('[data-ma-prob-positive-bar]').forEach((b,i)=>{jointClose(b.getAttribute('width'),weights[i]*(width-112)/(3*Math.E));jointClose(b.getAttribute('data-ma-prob-positive'),weights[i]);});app.svg.querySelectorAll('[data-ma-prob-curve-point]').forEach(p=>{const s=Number(p.getAttribute('data-ma-prob-curve-score'));jointClose(p.getAttribute('data-ma-prob-curve-weight'),Math.exp(s));jointClose(p.getAttribute('cx'),48+(s+1)/2*(width-80));jointClose(p.getAttribute('cy'),222-Math.exp(s)/3*187);});assert.equal(app.handle.hidden,true);}
 if(kind==='prob-normalize'){const p=Number(app.svg.getAttribute('data-ma-prob-normalize-progress')),join=Math.max(0,Math.min(1,p)),u=(width-112)/(3*Math.E),f=1+((width-112)/(sum*u)-1)*Math.max(0,Math.min(1,p-1));let prefix=0;app.svg.querySelectorAll('[data-ma-prob-normalized-bar]').forEach((b,i)=>{jointClose(b.getAttribute('width'),weights[i]*u*f);jointClose(b.getAttribute('x'),94+prefix*u*join*f);jointClose(b.getAttribute('y'),(295+i*54)*(1-join)+158*join);jointClose(Number(b.getAttribute('width'))/(sum*u*f),ps[i]);prefix+=weights[i];});assert.equal(app.handle.hidden,true);}
 assert.equal(app.copy.children.length<=2,true);assert.equal(app.timers.size,0);return {scores,weights,ps};
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-25',probProgram);let p=assertProb(app,width);assert.deepEqual(p.scores,[0,0,0]);p.ps.forEach(v=>jointClose(v,1/3));assert.match(app.copy.textContent,/分数相同/);app.advance();const before=assertProb(app,width);app.key('ArrowUp');const after=assertProb(app,width);assert.ok(after.ps[2]>before.ps[2]);assert.ok(after.ps[0]<before.ps[0]);assert.ok(after.ps[1]<before.ps[1]);jointClose(after.scores[2],.1);
 app.usageMath.set([.4,.8]);app.advance();assertProb(app,width);const curveBars=app.svg.querySelectorAll('[data-ma-prob-positive-bar]').map(b=>({x:b.getAttribute('x'),y:b.getAttribute('y'),width:b.getAttribute('width')}));
 app.advance();assertProb(app,width);assert.equal(Number(app.svg.getAttribute('data-ma-prob-normalize-progress')),2);app.copy.querySelectorAll('[data-ma-prob-formula]')[0].fire('click');assertProb(app,width);assert.match(app.copy.textContent,/未舍入值/);app.retreat();assertProb(app,width);app.advance();assertProb(app,width);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/猫和狗/);const kept=JSON.stringify(app.usageMath.state().rows);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'loss-observe');assert.equal(JSON.stringify(app.usageMath.state().rows),kept);
 app.retreat();assert.match(app.copy.textContent,/尚未训练/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'loss-observe');
 for(const alias of ['25-distribution','25-convert','25-normalize']){app.goToChapter(alias);assertProb(app,width);app.resize();assertProb(app,width);}console.log('PASS Softmax width='+width+': preserved shared vectors, exact logits/exponentials/probabilities, competing shares, curve mapping, positive lengths, normalization geometry, formula and replay');
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-25-convert',probProgram,true);app.usageMath.state().rows[0][1]=-1;app.usageMath.state().rows[1][1]=0;app.usageMath.state().rows[2][1]=1;app.resize();const original=app.svg.querySelectorAll('[data-ma-prob-positive-bar]').map(b=>[b.getAttribute('x'),b.getAttribute('y'),b.getAttribute('width')]);app.advance();assertProb(app,width);assert.deepEqual(app.svg.querySelectorAll('[data-ma-prob-normalized-bar]').map(b=>[b.getAttribute('x'),b.getAttribute('y'),b.getAttribute('width')]),original);app.frame(600);jointClose(app.svg.getAttribute('data-ma-prob-normalize-progress'),.3125);assertProb(app,width);app.frame(600);jointClose(app.svg.getAttribute('data-ma-prob-normalize-progress'),1);assertProb(app,width);app.frame(600);jointClose(app.svg.getAttribute('data-ma-prob-normalize-progress'),1.6875);assertProb(app,width);app.hide();jointClose(app.svg.getAttribute('data-ma-prob-normalize-progress'),2);assertProb(app,width);app.show();app.copy.querySelectorAll('[data-ma-prob-replay]')[0].fire('click');assertProb(app,width);jointClose(app.svg.getAttribute('data-ma-prob-normalize-progress'),0);app.frame(400);app.goToChapter('21-network');assert.equal(app.frames.size,0);assert.equal(app.handle.getAttribute('role'),'slider');
}
const inherited=mount(280,'#act-22-train',probProgram);inherited.advance();const training=JSON.stringify(inherited.wholeMath.history());inherited.goToChapter('24-vector');inherited.key('ArrowLeft');const lab=JSON.stringify(inherited.embMath.state());inherited.goToChapter('24-capacity');inherited.usageMath.set([.6,.9]);usageControl(inherited,'rotate').fire('click');const rows=JSON.stringify(inherited.usageMath.state().rows);inherited.advance();inherited.advance();inherited.advance();const inheritedProb=assertProb(inherited,280);jointClose(inheritedProb.scores[2],.9);assert.match(inherited.copy.textContent,/已经有了/);assert.equal(JSON.stringify(inherited.usageMath.state().rows),rows);assert.equal(JSON.stringify(inherited.wholeMath.history()),training);assert.equal(JSON.stringify(inherited.embMath.state()),lab);
const stable=inherited.probMath.softmax([-1000,0,1000]);jointClose(stable[2],1);assert.equal(stable.every(Number.isFinite),true);const baseSoft=inherited.probMath.softmax([-.7,.2,.9]),shifted=inherited.probMath.softmax([9.3,10.2,10.9]);baseSoft.forEach((v,i)=>jointClose(v,shifted[i]));
console.log('PASS Softmax animation preserves the exact incoming segments and all ratios; stable normalization, common-shift invariance, interruption/reduced motion and all earlier training stay isolated');

for(const width of [736,360,280]){const app=mount(width,'#act-25-convert',probProgram);assertProb(app,width);assert.equal(app.svg.querySelectorAll('[data-ma-prob-curve-point]').length,1);assert.equal(app.svg.querySelectorAll('[data-ma-prob-curve-point]')[0].getAttribute('data-ma-prob-curve-point'),'0,1,2');const reduced=mount(width,'#act-25-normalize',probProgram,'reduce');assertProb(reduced,width);assert.equal(Number(reduced.svg.getAttribute('data-ma-prob-normalize-progress')),2);assert.equal(reduced.frames.size,0);reduced.copy.querySelectorAll('[data-ma-prob-replay]')[0].fire('click');assertProb(reduced,width);assert.equal(reduced.frames.size,0);}
console.log('PASS identical scores share one actual curve point; reduced-motion normalization and replay render the correct final distribution without frames');



const lossProgram=probProgram.replace('    const waveChapter=','    globalThis.__captureLossMath({data:lossData,pair:lossPair,cost:lossCost,state:()=>lossLesson,setProbability:lossSetProbability});\n    const waveChapter=');
function assertLoss(app,width){
 const d=app.lossMath.data(),ps=app.probMath.softmax(d.d.model.scores.map(v=>v[0])),p=Number(app.svg.getAttribute('data-ma-loss-probability')),cost=Number(app.svg.getAttribute('data-ma-loss-value')),kind=app.svg.getAttribute('data-ma-chart-kind'),pair=app.lossMath.pair();jointClose(p,ps[0]);jointClose(cost,-Math.log(p));assert.equal(d.records[0].sentence,'小猫在睡觉。');assert.equal(d.records[1].sentence,'小狗在睡觉。');jointClose(pair.a,ps[0]);jointClose(pair.b,ps[1]);jointClose(pair.product,ps[0]*ps[1]);jointClose(pair.total,-Math.log(pair.product));jointClose(app.svg.getAttribute('data-ma-loss-joint-probability'),pair.product);jointClose(app.svg.getAttribute('data-ma-loss-total'),pair.total);assert.equal(app.copy.querySelectorAll('[data-ma-loss-formula]').length,0);assert.ok(app.copy.children.length<=2);assert.equal(app.timers.size,0);
 if(kind==='loss-observe'){assert.equal(app.svg.querySelectorAll('[data-ma-loss-original]').length,2);assert.equal(app.svg.querySelectorAll('[data-ma-usage-score-bar]').length,3);assert.ok(!app.copy.textContent.includes('损失'));assert.ok(!app.svg.textContent.includes('损失'));app.svg.querySelectorAll('[data-ma-prob-segment]').forEach((b,i)=>jointClose(b.getAttribute('data-ma-prob-share'),ps[i]));assert.equal(app.handle.hidden,false);}
 if(kind==='loss-records'){assert.ok(!app.copy.textContent.includes('损失'));const size=Math.min(280,width-104),left=(width-size)/2+12,top=126,cells=app.svg.querySelectorAll('[data-ma-loss-outcome]');assert.equal(cells.length,9);let total=0;cells.forEach(c=>{const [i,j]=c.getAttribute('data-ma-loss-outcome').split(':').map(Number),row=ps.slice(0,i).reduce((a,b)=>a+b,0),col=ps.slice(0,j).reduce((a,b)=>a+b,0);jointClose(c.getAttribute('x'),left+col*size);jointClose(c.getAttribute('y'),top+row*size);jointClose(c.getAttribute('width'),ps[j]*size);jointClose(c.getAttribute('height'),ps[i]*size);jointClose(c.getAttribute('data-ma-loss-outcome-mass'),ps[i]*ps[j]);total+=Number(c.getAttribute('width'))*Number(c.getAttribute('height'));});jointClose(total,size*size);jointClose(cells[1].getAttribute('data-ma-loss-outcome-mass'),pair.product);assert.equal(app.handle.hidden,true);}
 if(kind==='loss-inverse'){const phase=Number(app.svg.getAttribute('data-ma-loss-inverse-progress')),size=Math.min(250,width-80),cx=width/2,cy=55+size/2,c=Math.cos(phase*Math.PI/2),s=Math.sin(phase*Math.PI/2),shrink=1/(c+s);app.svg.querySelectorAll('[data-ma-loss-inverse-record]').forEach((node,i)=>{const prob=d.records[i].p,x=size/2+Math.log(prob)/4.3*size,y=size/2-prob*size;jointClose(node.getAttribute('cx'),cx+(x*c-y*s)*shrink);jointClose(node.getAttribute('cy'),cy+(x*s+y*c)*shrink);});assert.equal(app.svg.querySelectorAll('[data-ma-loss-inverse-record]').length,2);app.svg.querySelectorAll('[data-ma-loss-inverse-distance]').forEach((b,i)=>jointClose(Math.hypot(Number(b.getAttribute('x2'))-Number(b.getAttribute('x1')),Number(b.getAttribute('y2'))-Number(b.getAttribute('y1'))),-Math.log(d.records[i].p)/4.3*size*shrink));assert.equal(app.handle.hidden,true);}
 if(kind==='loss-ruler'){const phase=Number(app.svg.getAttribute('data-ma-loss-ruler-progress')),u=(width-64)/(Math.max(Math.log(8),pair.total)*1.15),arrows=app.svg.querySelectorAll('[data-ma-loss-arrow]');jointClose(arrows[0].getAttribute('x2'),32+pair.first*u);jointClose(arrows[1].getAttribute('x1'),32+pair.first*phase*u);jointClose(arrows[1].getAttribute('x2'),32+(pair.first*phase+pair.second)*u);jointClose(Number(arrows[1].getAttribute('x2'))-Number(arrows[1].getAttribute('x1')),pair.second*u);assert.equal(app.svg.querySelectorAll('[data-ma-loss-record-formula]').length,2);assert.equal(app.handle.hidden,true);}
 if(kind==='loss-curve'){const point=app.svg.querySelectorAll('[data-ma-loss-curve-point]')[0];jointClose(point.getAttribute('cx'),48+p*(width-76));jointClose(point.getAttribute('cy'),300-cost*215/4);jointClose(parseFloat(app.handle.style.left),48+p*(width-76));jointClose(parseFloat(app.handle.style.top),300-cost*215/4);assert.ok(app.svg.textContent.includes('−ln(p)'));const bars=app.svg.querySelectorAll('[data-ma-loss-contribution]');assert.equal(bars.length,2);jointClose(bars[0].getAttribute('width'),pair.first*(width-48)/6);jointClose(bars[1].getAttribute('width'),pair.second*(width-48)/6);jointClose(bars[1].getAttribute('x'),24+pair.first*(width-48)/6);assert.equal(app.handle.hidden,false);}
 return {p,cost,pair};
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-26',lossProgram);let before=assertLoss(app,width);app.key('ArrowRight');let after=assertLoss(app,width);assert.ok(after.p>before.p);assert.ok(after.pair.b<before.pair.b);assert.ok(after.pair.product<before.pair.product);assert.ok(after.pair.total>before.pair.total);const rows=JSON.stringify(app.usageMath.state().rows);
 app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'loss-records');assertLoss(app,width);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'loss-inverse');assertLoss(app,width);app.advance();assertLoss(app,width);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'loss-ruler');assertLoss(app,width);app.advance();assertLoss(app,width);assert.equal(JSON.stringify(app.usageMath.state().rows),rows);app.advance();before=assertLoss(app,width);app.key('ArrowRight');after=assertLoss(app,width);assert.ok(after.p>before.p);assert.ok(after.pair.b<before.pair.b);assert.ok(after.cost<before.cost);jointClose(app.usageMath.state().rows[0][1],0);
 const scale=width-76;app.handle.fire('pointerdown',{pointerId:161,clientX:100,button:0});app.documentPointer('pointermove',{pointerId:161,clientX:100-scale*.08});after=assertLoss(app,width);assert.ok(after.p<before.p);app.documentPointer('pointermove',{pointerId:161,clientX:100+scale*9});assertLoss(app,width);jointClose(app.usageMath.state().rows[0][0],1);app.documentPointer('pointerup',{pointerId:161});const saved=JSON.stringify(app.usageMath.state().rows);app.documentPointer('pointermove',{pointerId:161,clientX:0});assert.equal(JSON.stringify(app.usageMath.state().rows),saved);app.lossMath.setProbability(.000001);assertLoss(app,width);jointClose(app.usageMath.state().rows[0][0],-1);
 app.handle.fire('pointerdown',{pointerId:162,clientX:100,button:0});app.hide();app.documentPointer('pointermove',{pointerId:162,clientX:900});assertLoss(app,width);jointClose(app.usageMath.state().rows[0][0],-1);app.show();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/没有执行训练/);const kept=JSON.stringify(app.usageMath.state().rows);app.advance();assertLoss(app,width);assert.equal(JSON.stringify(app.usageMath.state().rows),kept);
 for(const alias of ['26-records','26-inverse','26-ruler','26-curve']){app.goToChapter(alias);assertLoss(app,width);app.resize();assertLoss(app,width);}assert.equal(app.lossMath.cost(0),Infinity);jointClose(app.lossMath.cost(1),0);console.log('PASS shared context '+width+': genuine cat/dog conflict, one common distribution, all nine outcome areas sum to one, correct observed cell, both exp conversions and actual joint probability/total loss');
}
for(const width of [736,360,280]){
 const app=mount(width,'#act-26-inverse',lossProgram,true),rows=JSON.stringify(app.usageMath.state().rows);app.advance();app.frame(750);jointClose(app.svg.getAttribute('data-ma-loss-inverse-progress'),.5);assertLoss(app,width);assert.equal(JSON.stringify(app.usageMath.state().rows),rows);app.hide();app.show();app.advance();app.advance();app.frame(625);jointClose(app.svg.getAttribute('data-ma-loss-ruler-progress'),.5);assertLoss(app,width);app.resize();assertLoss(app,width);app.goToChapter('21-network');assert.equal(app.frames.size,0);assert.equal(app.handle.getAttribute('role'),'slider');for(const alias of ['26-inverse','26-ruler']){const r=mount(width,'#act-'+alias,lossProgram,'reduce');r.advance();assertLoss(r,width);assert.equal(r.frames.size,0);}
}
const independentLoss=mount(280,'#act-22-train',lossProgram);independentLoss.advance();const lossHistory=JSON.stringify(independentLoss.wholeMath.history());independentLoss.goToChapter('24-vector');independentLoss.key('ArrowLeft');const lossLab=JSON.stringify(independentLoss.embMath.state());independentLoss.goToChapter('24-capacity');independentLoss.usageMath.set([.4,.8]);usageControl(independentLoss,'rotate').fire('click');const lossRows=JSON.stringify(independentLoss.usageMath.state().rows),lossScores=JSON.stringify(independentLoss.usageMath.model(true,Math.PI/4).scores);independentLoss.goToChapter('26');assertLoss(independentLoss,280);assert.equal(JSON.stringify(independentLoss.usageMath.state().rows),lossRows);assert.equal(JSON.stringify(independentLoss.lossMath.data().d.model.scores),lossScores);independentLoss.goToChapter('26-curve');independentLoss.key('ArrowLeft');assertLoss(independentLoss,280);jointClose(independentLoss.usageMath.state().rows[0][0],.55);jointClose(independentLoss.usageMath.state().rows[2][0],.4);assert.equal(JSON.stringify(independentLoss.wholeMath.history()),lossHistory);assert.equal(JSON.stringify(independentLoss.embMath.state()),lossLab);
console.log('PASS live edits affect the shared sleep distribution, both contribution bars and whole-record likelihood; teaching animation is read-only, lifecycle/reduced motion and old training/archives remain correct');

for(const width of [736,360,280]){const app=mount(width,'#act-26-records',lossProgram);for(const values of [[-1,-1,1],[1,1,-1],[1,-1,1],[-1,1,-1],[1,1,1]]){values.forEach((v,i)=>app.usageMath.state().rows[i][0]=v);app.resize();assertLoss(app,width);}app.usageMath.state().rows[0][0]=.2;app.usageMath.state().rows[1][0]=.2;app.goToChapter('26-inverse');assertLoss(app,width);const coincident=app.svg.querySelectorAll('[data-ma-loss-inverse-record]');jointClose(coincident[0].getAttribute('cx'),Number(coincident[1].getAttribute('cx')));jointClose(coincident[0].getAttribute('cy'),Number(coincident[1].getAttribute('cy')));app.usageMath.state().rows[1][0]=.25;app.usageMath.state().rows[2][0]=-.6;const ranking=[];for(const v of [-1,-.5,0,.5,1]){app.usageMath.state().rows[0][0]=v;app.goToChapter('26-curve');assertLoss(app,width);ranking.push(app.lossMath.pair());}ranking.sort((a,b)=>b.product-a.product);for(let i=1;i<ranking.length;i++)assert.ok(ranking[i].total>=ranking[i-1].total-1e-12);}
console.log('PASS outcome table extremes, coincident cat/dog probabilities and whole-model probability versus total-loss ranking are consistent across view widths');
