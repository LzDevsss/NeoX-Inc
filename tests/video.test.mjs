import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('o observador carrega as fontes adiadas e mantém a reprodução',()=>{
  const app=fs.readFileSync(new URL('../assets/js/site.js',import.meta.url),'utf8');
  const start=app.indexOf("  (() => {\n    const videos = $$('video.loop-video');");
  const end=app.indexOf('  /* ---------------- Faixas infinitas',start);
  assert.ok(start>=0&&end>start);
  let loads=0,plays=0,fallbacks=0;const observers=[],events={};
  const classes={add(){},remove(){},contains(){return false;}};
  const source={dataset:{src:'assets/video.mp4'},handlers:{},addEventListener(name,callback){this.handlers[name]=callback;},cloneNode(){return {...this,dataset:{...this.dataset}};}};
  const video={dataset:{},classList:classes,style:{},networkState:0,setAttribute(){},addEventListener(name,fn){events[name]=fn;},load(){loads++;},play(){plays++;return Promise.resolve();},pause(){},getBoundingClientRect(){return {top:0,bottom:50};},closest(){return {classList:classes};}};
  vm.runInNewContext(app.slice(start,end),{
    $$:(selector)=>selector==='video.loop-video'?[video]:[source],$(){return null;},
    navigator:{connection:{saveData:false}},document:{hidden:false,addEventListener(){}},window:{IntersectionObserver:true,innerHeight:700,innerWidth:390,addEventListener(){}},
    IntersectionObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}unobserve(){}},
    setTimeout:()=>1,clearTimeout(){},showMediaPlaceholder(){},showVideoFallback(){},tryAltSource(){fallbacks++;}
  });
  assert.equal(loads,0);
  source.handlers.error();events.error();assert.equal(fallbacks,0);
  observers[0].callback([{isIntersecting:true,target:video}]);
  assert.equal(source.src,'assets/video.mp4');assert.equal(loads,1);
  events.loadeddata();assert.equal(plays,1);
});
