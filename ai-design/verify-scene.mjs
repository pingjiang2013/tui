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
  let waveMath,bendMath,outputMath,relayMath,jointMath;
  vm.runInNewContext(program,{document,ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}},Math,Number,String,location,__captureWaveMath:value=>{waveMath=value;},__captureBendMath:value=>{bendMath=value;},__captureOutputMath:value=>{outputMath=value;},__captureRelayMath:value=>{relayMath=value;},__captureJointMath:value=>{jointMath=value;},__recordParameter:value=>evaluations.push(value),__recordDerivative:value=>derivativeInputs.push(value),setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(name,callback)=>{pageEvents[name]=callback;},...motionPlatform});
  return {root,copy,figure,svg,handle,back,next,automatic,timers,frames,evaluations,derivativeInputs,waveMath,bendMath,outputMath,relayMath,jointMath,
    advance(){next.fire('click');},retreat(){back.fire('click');},key(key){handle.fire('keydown',{key});},
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
  app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/链式法则/);app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一起调整/);app.advance();assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'joint-trial');
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
for(const width of [736,360,280]) {
  const app=mount(width,'#act-15',jointProgram);
  assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/换一组起始值/);app.advance();assert.equal(app.figure.hidden,false);assert.equal(app.next.disabled,true);
  app.advance();assert.equal(app.svg.getAttribute('data-ma-joint-phase'),'0');
  jointButton(app,'weight').fire('click');jointClose(Number(jointButton(app,'weight').textContent),1.1);assert.equal(app.jointMath.cursor(),0);
  app.svg.querySelectorAll('[data-ma-joint-change-input]').forEach((node,i)=>jointClose(node.getAttribute('data-ma-joint-change'),0.1*(i+1)));
  app.advance();assert.equal(app.svg.getAttribute('data-ma-joint-phase'),'1');
  app.svg.querySelectorAll('[data-ma-joint-change-input]').forEach((node,i)=>jointClose(node.getAttribute('data-ma-joint-change'),[0,0.2,0.3][i]));
  app.advance();assert.equal(app.svg.getAttribute('data-ma-joint-phase'),'2');
  app.svg.querySelectorAll('[data-ma-joint-change-input]').forEach((node,i)=>jointClose(node.getAttribute('data-ma-joint-change'),[0,2.4,3.6][i]));
  jointButton(app,'bias').fire('click');assert.equal(app.svg.getAttribute('data-ma-joint-phase'),'0');jointClose(Number(jointButton(app,'weight').textContent),1);jointClose(Number(jointButton(app,'bias').textContent),-1.7);
  jointButton(app,'output').fire('click');assert.equal(app.svg.getAttribute('data-ma-joint-phase'),'2');jointClose(Number(jointButton(app,'output').textContent),13);jointClose(Number(jointButton(app,'bias').textContent),-1.8);
  assert.equal(app.jointMath.history().length,1);app.advance();assertJointTraining(app,width,initialJoint);assert.match(app.copy.textContent,/撤回刚才的试算/);assert.equal(app.automatic.hidden,true);
  for(const key of ['weight','bias','output']){jointButton(app,key).fire('click');assert.match(app.copy.textContent,/局部影响/);assert.equal(app.jointMath.cursor(),0);}
  app.advance();assertJointTraining(app,width,jointFirst);assert.equal(app.jointMath.cursor(),1);assert.equal(app.automatic.hidden,false);
  app.retreat();assertJointTraining(app,width,initialJoint);app.advance();assertJointTraining(app,width,jointFirst);assert.equal(app.jointMath.history().length,2);
  app.automatic.fire('click');app.tick();assert.equal(app.jointMath.cursor(),11);assert.equal(app.jointMath.history().length,12);app.automatic.fire('click');assert.equal(app.timers.size,0);
  app.retreat();assert.equal(app.jointMath.cursor(),10);assertJointTraining(app,width,app.jointMath.history()[10]);app.advance();assert.equal(app.jointMath.cursor(),11);
  app.automatic.fire('click');let ticks=0;while(app.timers.size&&ticks++<100)app.tick();assert.ok(ticks<100);assert.equal(app.jointMath.cursor(),630);const history=app.jointMath.history(),end=history.at(-1);
  for(let i=1;i<history.length;i++){for(const key of ['weight','bias','output'])jointClose(history[i][key],jointMath.step(history[i-1])[key]);assert.ok(jointMath.evaluate(history[i]).loss<=jointMath.evaluate(history[i-1]).loss);}
  assert.ok(jointMath.evaluate(end).loss>0&&jointMath.evaluate(end).loss<=0.001);assert.notEqual(end.weight,1);assert.notEqual(end.bias,-2);assert.notEqual(end.output,20);assertJointTraining(app,width,end);assert.equal(app.automatic.hidden,true);
  app.retreat();assert.ok(jointMath.evaluate(app.jointMath.history()[app.jointMath.cursor()]).loss>0.001);app.advance();app.advance();assert.equal(app.figure.hidden,true);assert.match(app.copy.textContent,/一个转折/);
  app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.equal(app.next.disabled,true);assert.equal(app.jointMath.cursor(),0);
  app.goToChapter('15-train');assertJointTraining(app,width,initialJoint);app.advance();app.automatic.fire('click');app.hide();assert.equal(app.timers.size,0);app.show();app.automatic.fire('click');app.goToChapter(14);assert.equal(app.timers.size,0);app.goToChapter('15-train');assertJointTraining(app,width,jointFirst);
  console.log('PASS joint width='+width+': explicit reset, real parameter probes, activation gate, simultaneous three-parameter updates, all-data gradients, fixed-area squares, per-round history, convergence, rollback and replay');
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-15',jointProgram,true);app.advance();jointButton(app,'weight').fire('click');app.frame(500);jointClose(Number(jointButton(app,'weight').textContent),1.05);assert.equal(app.jointMath.cursor(),0);app.resize();jointClose(Number(jointButton(app,'weight').textContent),1.1);
  app.advance();app.advance();app.advance();app.advance();app.frame(400);
  const middle={...initialJoint,...Object.fromEntries(['weight','bias','output'].map(key=>[key,(initialJoint[key]+jointFirst[key])/2]))};assertJointTraining(app,width,middle);assert.equal(app.jointMath.history().length,2);
  app.hide();assertJointTraining(app,width,jointFirst);assert.equal(app.frames.size,0);app.show();jointButton(app,'weight').fire('click');app.advance();app.frame(400);assert.ok(app.frames.size);app.leave();assert.equal(app.frames.size,0);app.resume();
  app.automatic.fire('click');app.tick();app.frame(400);app.resize();assertJointTraining(app,width,app.jointMath.history()[12]);assert.equal(app.jointMath.cursor(),12);app.goToChapter(13);assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);
}
const reducedJoint=mount(280,'#act-15-train',jointProgram,'reduce');reducedJoint.advance();assertJointTraining(reducedJoint,280,jointFirst);assert.equal(reducedJoint.frames.size,0);
console.log('PASS joint motion: synchronized intermediate parameters, curves, loss and squares; immutable training snapshots, interruption, narrow layouts and reduced motion');
