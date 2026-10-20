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
  let waveMath;
  vm.runInNewContext(program,{document,ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}},Math,Number,String,location,__captureWaveMath:value=>{waveMath=value;},__recordParameter:value=>evaluations.push(value),__recordDerivative:value=>derivativeInputs.push(value),setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(name,callback)=>{pageEvents[name]=callback;},...motionPlatform});
  return {root,copy,figure,svg,handle,back,next,automatic,timers,frames,evaluations,derivativeInputs,waveMath,
    advance(){next.fire('click');},retreat(){back.fire('click');},key(key){handle.fire('keydown',{key});},
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
function assertParameterTrace(app,key) {
  const traces=app.svg.querySelectorAll('[data-ma-effect-trace]');
  assert.equal(traces.length,3);
  const changes=traces.map(trace=>{
    const t=Number(trace.getAttribute('data-ma-effect-trace')),record=Number(trace.getAttribute('data-ma-trace-record'));
    const before=Number(trace.getAttribute('data-ma-trace-prediction-before')),after=Number(trace.getAttribute('data-ma-trace-prediction-after'));
    close(before,20+30*t);close(after,before+(key==='a'?t:1));
    close(trace.getAttribute('data-ma-trace-gap-before'),Math.abs(before-record));
    close(trace.getAttribute('data-ma-trace-gap-after'),Math.abs(after-record));
    return Math.abs(after-record)-Math.abs(before-record);
  });
  close(app.svg.getAttribute('data-ma-effect-mean'),changes.reduce((sum,value)=>sum+value,0)/3);
}
for(const width of [736,360,280]) {
  const app=mount(width,'#act-6');assert.equal(app.figure.hidden,true);app.advance();
  assertParameterTrace(app,'a');
  close(app.svg.getAttribute('data-ma-effect-mean'),-2);
  assert.deepEqual(app.svg.querySelectorAll('[data-ma-effect-value]').map(n=>Number(n.getAttribute('data-ma-effect-value'))),[-1,-2,-3]);
  app.advance();close(app.svg.getAttribute('data-ma-effect-mean'),-1);assertParameterTrace(app,'b');app.advance();
  waveModel(app,width);app.advance();const joint=waveModel(app,width);close(joint.a,30.5);close(joint.b,20.25);
  app.retreat();close(waveModel(app,width).a,30);app.advance();app.advance();app.advance();
  assert.equal(app.svg.getAttribute('data-ma-chart-kind'),'score-areas');app.advance();
  app.svg.querySelectorAll('[data-ma-score-cell]').forEach(rect=>{
    const side=Number(rect.getAttribute('data-ma-score-side')),unit=Number(rect.getAttribute('data-ma-score-unit'));
    close(rect.getAttribute('width'),side*unit);close(rect.getAttribute('height'),side*unit);
    close(Number(rect.getAttribute('width'))*Number(rect.getAttribute('height'))/unit**2,rect.getAttribute('data-ma-score-term'));
  });
  assert.equal(app.copy.querySelectorAll('[data-ma-rating-a]')[0].textContent,'15');
  app.advance();app.advance();
  const strips=app.svg.querySelectorAll('[data-ma-strip-part]');
  for(const d of [3,6]) {
    const areas=strips.filter(n=>n.getAttribute('data-ma-strip-part').startsWith(d+'-')).map(n=>Number(n.getAttribute('data-ma-strip-area')));
    close(areas[0]+areas[1],d*d-(d-0.5)**2);
  }
  app.advance();app.advance();close(app.svg.getAttribute('data-ma-normalized-width'),0.1);
  app.svg.querySelectorAll('[data-ma-normalized-result]').forEach(n=>close(n.getAttribute('data-ma-normalized-value'),2*Number(n.getAttribute('data-ma-normalized-result'))-0.1));
  app.advance();close(app.svg.getAttribute('data-ma-effect-mean'),-120);app.advance();close(app.svg.getAttribute('data-ma-effect-mean'),-60);app.advance();
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
  app.advance();assert.deepEqual(app.svg.querySelectorAll('[data-ma-actual-increment]').map(n=>Number(n.getAttribute('data-ma-increment-value'))),[30,50]);
  app.svg.querySelectorAll('[data-ma-model-increment]').forEach(n=>assert.ok(Math.abs(Number(n.getAttribute('data-ma-increment-value'))-40)<1e-5));
  app.advance();assert.equal(app.figure.hidden,true);app.advance();assert.match(app.copy.textContent,/两个数各自该改多少/);
  console.log('PASS width='+width+': four-unit navigation, simultaneous updates, proportional square areas, nonoverlapping strips, normalized limit, real training/rollback/overshoot, and linear-model limitation');
}
const movingWave=mount(360,'#act-6',script,true);
movingWave.advance();movingWave.advance();movingWave.advance();movingWave.advance();movingWave.frame(400);
const jointHalf=waveModel(movingWave,360);close(jointHalf.a,30.25);close(jointHalf.b,20.125);
movingWave.hide();close(waveModel(movingWave,360).a,30.5);assert.equal(movingWave.frames.size,0);movingWave.show();
const movingTrain=mount(360,'#act-8',script,true);
for(let i=0;i<6;i++)movingTrain.advance();
assert.equal(movingTrain.svg.getAttribute('data-ma-chart-kind'),'wave-model');
movingTrain.advance();movingTrain.frame(400);close(waveModel(movingTrain,360,waveData,250).a,33);
movingTrain.frame(400);movingTrain.advance();movingTrain.frame(800);
movingTrain.automatic.fire('click');movingTrain.tick();movingTrain.frame(400);
const interpolated=waveModel(movingTrain,360,waveData,250);let expected={a:30,b:20};for(let i=0;i<12;i++)expected=math.step(waveData,expected,0.05);
close(interpolated.a,expected.a);close(interpolated.b,expected.b);
movingTrain.automatic.fire('click');assert.equal(movingTrain.frames.size,0);assert.equal(movingTrain.timers.size,0);
movingTrain.automatic.fire('click');movingTrain.goToSecond();assert.equal(movingTrain.timers.size,0);assert.equal(movingTrain.frames.size,0);
const reducedWave=mount(280,'#act-9',script,'reduce');reducedWave.advance();assert.equal(reducedWave.frames.size,0);
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
