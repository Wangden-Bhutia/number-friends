
(function(){
"use strict";

/* ================= constants ================= */
var PALETTE=['#e8453c','#f28c1e','#f5c518','#5cb85c','#29a3e0','#3f51b5','#8e5bd0','#ec4a8f','#c2703d','#12a5a5'];
var NEUTRAL='#8fa3b8';   // used wherever colour could otherwise give the answer away
var WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
var PRAISE=['Yes!','Well done!','Great counting!','That is right!','Super!','You did it!','Brilliant!','Lovely!'];
var PERSIST=['You kept trying!','You worked it out!','Good thinking!','You did not give up!'];
var NUDGE=['Almost. Try again.','Count them again.','Have another look.','Nearly. Try once more.'];
var ROUNDS=5;
var KEY='nf3';

/* ================= utils ================= */
function $(id){return document.getElementById(id);}
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function colorOf(n){return PALETTE[(n-1)%10];}
var timers=[];
window.NF_DEBUG={};
function later(fn,ms){var id=setTimeout(fn,ms);timers.push(id);return id;}
function clearTimers(){
  timers.forEach(clearTimeout);
  timers=[];
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
}

/* ================= audio ================= */
var actx=null, muted=false, musicOn=true, musicPlay=false, curScreen='map';
function musicAllowed(){
  if(!musicOn) return false;
  if(curScreen==='play') return musicPlay;   // quiet while she is learning, unless switched on
  return true;
}
function syncMusic(){
  var want=musicAllowed();
  if(want){ if(!music.playing){ audio(); music.start(); } }
  else if(music.playing){ music.stop(); }
  var btn=$('musicBtn');
  if(btn) btn.classList.toggle('off',!want);
}
function audio(){
  if(muted) return null;
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    return actx;
  }catch(e){return null;}
}
function ctxAny(){
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    return actx;
  }catch(e){return null;}
}
function tone(freq,dur,type,vol,delay){
  var c=audio(); if(!c) return;
  try{
    var t0=c.currentTime+(delay||0);
    var o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';
    o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol||0.14,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+(dur||0.15));
    o.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+(dur||0.15)+0.03);
  }catch(e){}
}
function popSound(){tone(700,0.08,'triangle',0.10);}
function yesSound(){tone(523,0.13,'triangle',0.13,0);tone(659,0.13,'triangle',0.13,0.09);tone(784,0.2,'triangle',0.13,0.18);}
function noSound(){tone(300,0.15,'sine',0.10,0);tone(232,0.19,'sine',0.10,0.11);}
function whoosh(){
  var c=audio(); if(!c) return;
  try{
    var dur=0.22,t0=c.currentTime;
    var o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
    o.type='sine';
    o.frequency.setValueAtTime(700,t0);
    o.frequency.exponentialRampToValueAtTime(240,t0+dur);
    f.type='lowpass'; f.frequency.value=1400;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(0.13,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
    o.connect(f);f.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+dur+0.04);
  }catch(e){}
}
function starSound(){tone(900,0.09,'sine',0.10,0);tone(1200,0.14,'sine',0.09,0.07);}
function fanfare(){[523,659,784,1047].forEach(function(f,i){tone(f,0.24,'triangle',0.13,i*0.12);});}

/* ---------- background music ----------
   A gentle pentatonic loop: soft marimba melody, warm bass, a light shimmer.
   Everything is generated, so the file stays self-contained.            */
var music={
  master:null, timer:null, step:0, nextTime:0, playing:false, ducked:false,
  base:261.63,                        // C4
  pent:[0,2,4,7,9,12,14,16,19,21],    // C D E G A C D E G A
  melodyA:[5,3,4,2, 6,4,3,1, 4,2,3,0, 5,4,2,-1],
  melodyB:[4,2,5,3, 7,5,4,2, 5,3,2,1, 4,3,1,-1],
  bass:[0,0,3,3, 2,2,1,1],
  start:function(){
    var c=ctxAny(); if(!c||this.playing) return;
    this.playing=true; this.step=0; this.nextTime=c.currentTime+0.15;
    this.master=c.createGain();
    this.master.gain.setValueAtTime(0.0001,c.currentTime);
    this.master.gain.linearRampToValueAtTime(this.ducked?0.16:0.52,c.currentTime+1.2);
    this.master.connect(c.destination);
    var self=this;
    this.timer=setInterval(function(){self.tick();},120);
    this.tick();
  },
  stop:function(){
    if(this.timer) clearInterval(this.timer);
    this.timer=null;
    if(this.master){
      try{
        var m=this.master,c=actx;
        m.gain.cancelScheduledValues(c.currentTime);
        m.gain.setValueAtTime(m.gain.value,c.currentTime);
        m.gain.linearRampToValueAtTime(0.0001,c.currentTime+0.4);
        setTimeout(function(){try{m.disconnect();}catch(e){}},600);
      }catch(e){}
    }
    this.master=null; this.playing=false;
  },
  setDuck:function(on){
    this.ducked=on;
    if(!this.master||!actx) return;
    try{
      var t=actx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value,t);
      this.master.gain.linearRampToValueAtTime(on?0.16:0.52,t+0.25);
    }catch(e){}
  },
  note:function(freq,t,dur,vol,type){
    var c=actx; if(!c||!this.master) return;
    try{
      var o=c.createOscillator(),g=c.createGain();
      o.type=type||'sine';
      o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0006,t+dur);
      o.connect(g);g.connect(this.master);
      o.start(t);o.stop(t+dur+0.05);
    }catch(e){}
  },
  tick:function(){
    var c=actx; if(!c||!this.playing||!this.master) return;
    var beat=0.46;
    if(this.nextTime < c.currentTime) this.nextTime = c.currentTime + 0.06;
    while(this.nextTime<c.currentTime+0.5){
      var i=this.step, t=this.nextTime;
      var phrase=(Math.floor(i/16)%2===0)?this.melodyA:this.melodyB;
      var m=phrase[i%phrase.length];
      if(m>=0){
        var f=this.base*Math.pow(2,this.pent[m]/12);
        this.note(f,t,0.8,0.17,'triangle');
        this.note(f*2,t,0.55,0.05,'sine');
        if(i%4===0) this.note(f*1.5,t+0.02,0.9,0.035,'sine');
      }
      if(i%2===0){
        var b=this.bass[(i/2)%this.bass.length];
        this.note(this.base/2*Math.pow(2,this.pent[b]/12),t,1.2,0.12,'sine');
      }
      if(i%16===8){ this.note(this.base*4,t+0.23,0.9,0.035,'sine'); }
      this.nextTime+=beat;
      this.step++;
    }
  }
};

/* ================= speech =================
   A natural recorded voice (neural TTS clips in assets/audio, mapped by
   assets/audio/manifest.json). Sentences are matched whole when possible,
   otherwise stitched from the longest recorded pieces. Anything never
   recorded (a child's name) falls back to the best female device voice. */
var voices=[], chosenVoice=null, voiceMuted=false, useClips=true;
var CLIPS=null, clipBuf={}, clipLoading={}, vctx=null, curSrc=null;
var AUDIO_BASE='assets/audio/';
var FEMALE=/Samantha|Google UK English Female|Neerja|Aria|Jenny|Ava|Allison|Susan|Zira|Karen|Moira|Tessa|Serena|Fiona|Victoria|Veena|Kate|Libby|Sonia|Natasha|Female|Heera|Lekha|Salli|Joanna|Kendra|Kimberly|Ivy|Emma|Amy|Michelle/i;
var MALE=/Daniel|Alex\b|Fred|Rishi|David|Mark|George|Guy|Ryan|Male|Aaron|Arthur|Oliver|Thomas|Gordon|Lee\b|Ravi|Prabhat/i;
var GOOD=/Natural|Neural|Enhanced|Premium|Wavenet|Studio|Online/i;
function loadVoices(){
  if(!('speechSynthesis' in window)) return;
  try{
    voices=(window.speechSynthesis.getVoices()||[]).filter(function(v){return /^en/i.test(v.lang||'');});
    if(!voices.length) voices=window.speechSynthesis.getVoices()||[];
    var saved=null;
    try{saved=localStorage.getItem(KEY+'_voice');}catch(e){}
    useClips=!saved||saved==='natural';
    if(saved&&!useClips){ chosenVoice=voices.filter(function(v){return v.voiceURI===saved;})[0]||null; if(!chosenVoice) useClips=true; }
    if(!chosenVoice) chosenVoice=pickBestVoice();
    fillVoiceList();
  }catch(e){}
}
function scoreVoice(v){
  var s=0, lang=(v.lang||'').toLowerCase(), n=v.name||'';
  if(lang==='en-in'||lang==='en-gb'||lang==='en-us') s+=20; else if(/^en/.test(lang)) s+=12;
  if(FEMALE.test(n)) s+=50;
  if(MALE.test(n)) s-=60;
  if(GOOD.test(n)) s+=25;
  if(/Samantha|Neerja|Aria|Jenny|Google UK English Female/i.test(n)) s+=15;
  if(/compact|espeak|festival/i.test(n)) s-=40;
  return s;
}
function pickBestVoice(){
  if(!voices.length) return null;
  var best=voices[0],bs=-999;
  voices.forEach(function(v){var s=scoreVoice(v); if(s>bs){bs=s;best=v;}});
  return best;
}
function fillVoiceList(){
  var sel=$('voiceSel'); if(!sel) return;
  sel.innerHTML='';
  var o0=document.createElement('option'); o0.value='natural'; o0.textContent='Natural voice (recommended)';
  if(useClips) o0.selected=true;
  sel.appendChild(o0);
  voices.slice().sort(function(a,b){return scoreVoice(b)-scoreVoice(a);}).forEach(function(v){
    var o=document.createElement('option');
    o.value=v.voiceURI;
    o.textContent='Phone voice: '+v.name+' · '+(v.lang||'');
    if(!useClips&&chosenVoice&&v.voiceURI===chosenVoice.voiceURI) o.selected=true;
    sel.appendChild(o);
  });
}
if('speechSynthesis' in window){
  try{ window.speechSynthesis.onvoiceschanged=function(){loadVoices();}; }catch(e){}
}
var hasSpeech=('speechSynthesis' in window)&&(typeof SpeechSynthesisUtterance!=='undefined');
var sq=[],speaking=false,speechGen=0,duckState=false,unduckTimer=null,watchdog=null,idleCbs=[];

/* ---- clip library ---- */
function loadClips(){
  if(!window.fetch) return;
  fetch(AUDIO_BASE+'manifest.json').then(function(r){return r.json();}).then(function(m){
    CLIPS=m;
    // warm up the numbers so counting is instant
    for(var i=0;i<=20;i++) if(CLIPS[WORDS[i]]) getClip(CLIPS[WORDS[i]]);
  }).catch(function(){});
}
function voiceCtx(){
  try{
    if(!vctx) vctx=new (window.AudioContext||window.webkitAudioContext)();
    if(vctx.state==='suspended') vctx.resume();
  }catch(e){ vctx=null; }
  return vctx;
}
function unlockVoice(){
  var c=voiceCtx(); if(!c) return;
  try{ var b=c.createBuffer(1,1,22050),s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); }catch(e){}
}
function getClip(file){
  if(clipBuf[file]) return Promise.resolve(clipBuf[file]);
  if(clipLoading[file]) return clipLoading[file];
  var c=voiceCtx();
  var p=fetch(AUDIO_BASE+file).then(function(r){ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(function(ab){
    if(!c) throw 0;
    return new Promise(function(res,rej){ c.decodeAudioData(ab,res,rej); });
  }).then(function(buf){ clipBuf[file]=buf; delete clipLoading[file]; return buf; },
          function(e){ delete clipLoading[file]; throw e; });
  clipLoading[file]=p;
  return p;
}
var ONES_W=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
var TENS_W=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWords(n){
  if(n<20) return ONES_W[n];
  if(n<100) return TENS_W[Math.floor(n/10)]+(n%10?' '+ONES_W[n%10]:'');
  if(n<1000) return ONES_W[Math.floor(n/100)]+' hundred'+(n%100?' and '+numWords(n%100):'');
  return String(n);
}
function normKey(s){
  s=String(s).toLowerCase().replace(/[’']/g,'');
  s=s.replace(/\d+/g,function(d){return ' '+numWords(parseInt(d,10))+' ';});
  return s.replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim();
}
function planSpeech(text){
  var out=[], re=/[^.!?,…—]+[.!?,…—]*/g, m;
  while((m=re.exec(text))){
    var seg=m[0], punct=(seg.match(/[.!?,…—]+\s*$/)||[''])[0];
    var gap=/[.!?…]/.test(punct)?230:(punct?110:60);
    var k=normKey(seg); if(!k) continue;
    if(CLIPS[k]){ out.push({clip:CLIPS[k],gap:gap}); continue; }
    var w=k.split(' '), i=0, pend=[];
    while(i<w.length){
      var found=0;
      for(var j=Math.min(w.length,i+12);j>i;j--){ if(CLIPS[w.slice(i,j).join(' ')]){found=j;break;} }
      if(found){
        if(pend.length){ out.push({text:pend.join(' '),gap:40}); pend=[]; }
        out.push({clip:CLIPS[w.slice(i,found).join(' ')],gap:15});
        i=found;
      }else{ pend.push(w[i]); i++; }
    }
    if(pend.length) out.push({text:pend.join(' '),gap:40});
    if(out.length) out[out.length-1].gap=gap;
  }
  return out;
}
window.NF_DEBUG.plan=function(t){ return CLIPS?planSpeech(t):null; };

function estimateMs(text,rate){
  var words=String(text).split(/\s+/).length;
  return (340+words*400)/(rate||1);
}
function fireIdleCbs(){
  if(speaking||sq.length) return;
  var cbs=idleCbs; idleCbs=[];
  cbs.forEach(function(fn){ try{ fn(); }catch(e){} });
}
function onSpeechIdle(fn){
  var gen=speechGen;
  setTimeout(function(){
    if(gen!==speechGen) return;
    if(!speaking&&!sq.length) fn();
    else idleCbs.push(fn);
  },0);
}
function updateDuck(){
  if(speaking||sq.length){
    if(unduckTimer){clearTimeout(unduckTimer);unduckTimer=null;}
    if(!duckState){duckState=true;music.setDuck(true);}
  }else{
    fireIdleCbs();
    if(duckState&&!unduckTimer){
      unduckTimer=setTimeout(function(){
        unduckTimer=null;
        if(!speaking&&!sq.length&&duckState){duckState=false;music.setDuck(false);}
      },300);
    }
  }
}
function stopCurrent(){
  if(curSrc){ try{ curSrc.onended=null; curSrc.stop(); }catch(e){} curSrc=null; }
  try{ if(hasSpeech) window.speechSynthesis.cancel(); }catch(e){}
}
function clearSpeech(){
  sq.length=0;
  speechGen++;
  speaking=false;
  idleCbs=[];
  if(watchdog){clearTimeout(watchdog);watchdog=null;}
  stopCurrent();
  updateDuck();
}
function ttsSay(text,rate,pitch,done){
  if(!hasSpeech){ setTimeout(done,0); return; }
  try{
    var u=new SpeechSynthesisUtterance(text);
    if(chosenVoice) u.voice=chosenVoice;
    u.rate=rate; u.pitch=pitch; u.volume=1;
    var fired=false; function f(){ if(fired) return; fired=true; done(); }
    u.onend=f; u.onerror=f;
    window.speechSynthesis.speak(u);
    setTimeout(f,estimateMs(text,rate)+2500);
  }catch(e){ setTimeout(done,0); }
}
function playBuf(buf,speed,done){
  var c=voiceCtx(); if(!c){ done(); return; }
  try{
    var s=c.createBufferSource(), g=c.createGain();
    s.buffer=buf; s.playbackRate.value=speed; g.gain.value=1.0;
    s.connect(g); g.connect(c.destination);
    var fired=false; function f(){ if(fired) return; fired=true; if(curSrc===s) curSrc=null; done(); }
    s.onended=f; curSrc=s; s.start(0);
    setTimeout(f,buf.duration*1000/speed+600);
  }catch(e){ done(); }
}
function pump(){
  if(speaking||!sq.length) return;
  var item=sq.shift();
  var myGen=speechGen;
  var rate=item.opts.rate||0.9;
  var fast=sq.length>=2;
  if(fast) rate=Math.min(1.75,rate*1.35);   // catch up when she taps fast
  speaking=true;

  function finish(){
    if(myGen!==speechGen) return;
    if(watchdog){clearTimeout(watchdog);watchdog=null;}
    speaking=false;
    pump();
    updateDuck();
  }
  var parts=(useClips&&CLIPS&&voiceCtx())?planSpeech(item.text):[{text:item.text,gap:0}];
  if(!hasSpeech) parts=parts.filter(function(p){return p.clip;});
  parts.forEach(function(p){ if(p.clip) getClip(p.clip).catch(function(){}); });   // fetch everything at once
  var idx=0;
  function next(){
    if(myGen!==speechGen) return;
    if(idx>=parts.length){ finish(); return; }
    var p=parts[idx++];
    var after=function(){ if(myGen!==speechGen) return; setTimeout(next,fast?p.gap*0.4:p.gap); };
    if(p.clip){
      getClip(p.clip).then(function(buf){
        if(myGen!==speechGen) return;
        playBuf(buf,fast?1.22:1,after);
      },function(){
        if(myGen!==speechGen) return;
        var k=null; for(var key in CLIPS) if(CLIPS[key]===p.clip){k=key;break;}
        ttsSay(k||'',useClips?0.92:rate,1.12,after);
      });
    }else{
      ttsSay(p.text,useClips?Math.min(rate+0.04,1.1):rate,useClips?1.12:1.08,after);
    }
  }
  next();

  watchdog=setTimeout(function(){
    watchdog=null;
    if(myGen!==speechGen||!speaking) return;
    speaking=false;
    pump();
    updateDuck();
  },estimateMs(item.text,rate)*1.6+4000);

  updateDuck();
}
function speak(text,opts){
  if(voiceMuted||!text) return;
  if(!hasSpeech&&!(window.AudioContext||window.webkitAudioContext)) return;
  sq.push({text:String(text),opts:opts||{}});
  updateDuck();
  pump();
}

/* ================= progress ================= */
var progress={stars:{},rounds:0};
function loadProgress(){
  try{var raw=localStorage.getItem(KEY+'_p'); if(raw) progress=JSON.parse(raw)||{stars:{},rounds:0};}catch(e){}
  if(!progress.stars) progress.stars={};
  if(typeof progress.points!=='number'){
    var sum=0; for(var k in progress.stars) sum+=progress.stars[k]||0;
    progress.points=sum;              // carry an old save's stars into the running counter
  }
  // anything before an unlocked stage is unlocked too, so the map has no locked holes
  if(progress.unlocked){
    STAGES.forEach(function(st,i){
      if(progress.unlocked[st.id]){
        for(var j=0;j<i;j++) progress.unlocked[STAGES[j].id]=true;
      }
    });
  }
  // one-time migration: stages unlocked under the old any-star rule stay unlocked
  if(!progress.unlocked){
    progress.unlocked={};
    STAGES.forEach(function(st,i){
      if(i>0&&(progress.stars[STAGES[i-1].id]||0)>=1) progress.unlocked[st.id]=true;
    });
    saveProgress();
  }
}
function saveProgress(){try{localStorage.setItem(KEY+'_p',JSON.stringify(progress));}catch(e){}}

/* ---- every answer is kept, so the game can lean on what she finds hard ---- */
var answerLog=[];
function loadLog(){
  try{ var r=localStorage.getItem(KEY+'_log'); if(r) answerLog=JSON.parse(r)||[]; }catch(e){ answerLog=[]; }
  if(!Array.isArray(answerLog)) answerLog=[];
}
function saveLog(){ try{ localStorage.setItem(KEY+'_log',JSON.stringify(answerLog.slice(-400))); }catch(e){} }
function logAnswer(nums,ok){
  if(!nums||!nums.length) return;
  answerLog.push({s:round.stage?round.stage.id:'',n:nums.slice(0,4),ok:ok?1:0,t:Date.now()});
  saveLog();
}
/* ---- how long she has actually been playing ---- */
var lastTick=Date.now();
function dayKey(d){
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function addPlayTime(){
  var now=Date.now(), gap=Math.min(45000,now-lastTick);
  lastTick=now;
  if(gap<1500) return;
  progress.time=progress.time||{};
  var k=dayKey(new Date());
  progress.time[k]=(progress.time[k]||0)+Math.round(gap/1000);
  var keys=Object.keys(progress.time).sort();
  while(keys.length>14){ delete progress.time[keys.shift()]; }
  saveProgress();
}
/* ---- which numbers deserve another go ---- */
function weakNumbers(lo,hi){
  var score={};
  answerLog.slice(-40).forEach(function(e){
    (e.n||[]).forEach(function(n){
      if(n<lo||n>hi) return;
      score[n]=(score[n]||0)+(e.ok?-0.6:1);
    });
  });
  return Object.keys(score).map(Number)
    .filter(function(n){ return score[n]>0.4; })
    .sort(function(a,b){ return score[b]-score[a]; });
}
function totalStars(){var s=0;for(var k in progress.stars) s+=progress.stars[k]||0;return s;}
/* ---------------- the star jar ---------------- */
var jarSeq=0;
function jarSVG(pct,size){
  pct=Math.max(0,Math.min(1,pct||0));
  var id='jar'+(++jarSeq);
  var h=34*pct;
  return '<svg class="jar" width="'+size+'" height="'+Math.round(size*1.2)+'" viewBox="0 0 40 48" aria-hidden="true">'+
    '<defs><clipPath id="'+id+'"><rect x="9" y="7" width="22" height="36" rx="7"/></clipPath></defs>'+
    '<rect x="9" y="7" width="22" height="36" rx="7" fill="#eaf4ff"/>'+
    '<g clip-path="url(#'+id+')"><rect x="9" y="'+(43-h).toFixed(1)+'" width="22" height="'+h.toFixed(1)+'" fill="#f7b731"/>'+
    (pct>0.05?'<circle cx="15.5" cy="'+(40-h*0.55).toFixed(1)+'" r="1.5" fill="#fff" opacity=".55"/>':'')+
    '</g>'+
    '<rect x="13" y="2" width="14" height="6" rx="3" fill="#20304a"/>'+
    '<rect x="9" y="7" width="22" height="36" rx="7" fill="none" stroke="#20304a" stroke-width="2.4"/>'+
    '</svg>';
}
function jarParts(){
  var pts=progress.points||0;
  return {full:Math.floor(pts/10), part:(pts%10)/10, total:pts};
}
function showStars(){
  var el=$('jarTop');
  if(el) el.innerHTML=jarSVG(jarParts().part,26);
  renderMapJar();
}
function renderMapJar(){
  var el=$('mapJar');
  if(!el) return;
  var j=jarParts();
  var html='<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'+jarSVG(j.part,54)+'</div>';
  if(j.full>0){
    var n=Math.min(j.full,6), shelf='';
    for(var i=0;i<n;i++) shelf+=jarSVG(1,16);
    if(j.full>6) shelf+='<span style="font-weight:800;color:#8a5a00;font-size:12px;align-self:center">+'+(j.full-6)+'</span>';
    html+='<div class="shelf">'+shelf+'</div>';
  }
  el.innerHTML=html;
}
function jarFull(){
  confetti(30);
  toast('Your jar is full!');
  speak('Your jar is full! Well done!',{rate:0.9});
  var box=$('jarTop');
  if(box&&box.animate) box.animate([{transform:'scale(1)'},{transform:'scale(1.45) rotate(6deg)'},{transform:'scale(1)'}],
    {duration:750,easing:'ease-out'});
}

/* ================= blocks ================= */
function block(k,opts){
  opts=opts||{};
  var d=document.createElement('div');
  d.className='blk'+(opts.pop?' pop':'');
  var col=opts.color;
  d.style.setProperty('--c',typeof col==='string'?col:colorOf(col||k));
  d.innerHTML='<i class="eye l"></i><i class="eye r"></i><i class="smile"></i><b class="badge"></b>';
  if(progress&&progress.outfit&&ACC_SVG[progress.outfit]){
    var sp=document.createElement('span');
    sp.className='acc';
    sp.innerHTML='<svg viewBox="0 0 24 24">'+ACC_SVG[progress.outfit]+'</svg>';
    d.appendChild(sp);
  }
  if(opts.delay) d.style.animationDelay=opts.delay+'ms';
  return d;
}
function ghostBlock(){
  var d=document.createElement('div');
  d.className='blk ghost';
  return d;
}
function tower(n,opts){
  opts=opts||{};
  var t=document.createElement('div');
  t.className='tower';
  for(var k=1;k<=n;k++){
    var b=block(k,{pop:!!opts.pop,delay:opts.stagger?(k-1)*opts.stagger:0,color:opts.color||n});
    if(opts.tapable){b.classList.add('tapable');b.dataset.k=k;}
    t.appendChild(b);
  }
  return t;
}

/* ---------- the other ways of showing a quantity ---------- */
var DICE={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],
  4:[[0,0],[0,2],[2,0],[2,2]],5:[[0,0],[0,2],[1,1],[2,0],[2,2]],
  6:[[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]]};

function arrRow(n,opts){
  opts=opts||{};
  var d=document.createElement('div');
  d.className='arr arr-row';
  if(n>5){
    d.classList.add('wrap5');
    d.style.width='calc(var(--bs) * 5.26)';
  }
  for(var i=0;i<n;i++){
    var b=block(i+1,{color:opts.color||n,pop:!!opts.pop});
    if(opts.tapable){b.classList.add('tapable');b.dataset.k=i+1;}
    d.appendChild(b);
  }
  return d;
}
function arrScatter(n,opts){
  opts=opts||{};
  var d=document.createElement('div');
  d.className='arr arr-scatter';
  var cols=n<=6?2:3, rows=Math.ceil(n/cols);
  d.style.width='calc(var(--bs) * '+(cols*1.24).toFixed(2)+')';
  d.style.height='calc(var(--bs) * '+(rows*1.24).toFixed(2)+')';
  var cells=[];
  for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) cells.push([r,c]);
  shuffle(cells);
  for(var i=0;i<n;i++){
    var b=block(i+1,{color:opts.color||n,pop:!!opts.pop});
    b.style.left='calc(var(--bs) * '+(cells[i][1]*1.24+0.07).toFixed(2)+')';
    b.style.top='calc(var(--bs) * '+(cells[i][0]*1.24+0.07).toFixed(2)+')';
    if(opts.tapable){b.classList.add('tapable');b.dataset.k=i+1;}
    d.appendChild(b);
  }
  return d;
}
function arrDice(n,color){
  var d=document.createElement('div');
  d.className='arr arr-dice';
  d.style.width='calc(var(--bs) * 3.5)';
  d.style.height='calc(var(--bs) * 3.5)';
  var pts=DICE[n]||DICE[5];
  pts.forEach(function(p){
    var dot=document.createElement('i');
    dot.className='dot';
    dot.style.background=color||colorOf(n);
    dot.style.left='calc(var(--bs) * '+(0.33+p[1]*1.03).toFixed(2)+')';
    dot.style.top='calc(var(--bs) * '+(0.33+p[0]*1.03).toFixed(2)+')';
    dot.style.width='calc(var(--bs) * .58)';
    dot.style.height='calc(var(--bs) * .58)';
    d.appendChild(dot);
  });
  return d;
}
function arrTen(n,fill,color){
  var d=document.createElement('div');
  d.className='arr arr-ten';
  d.style.width='calc(var(--bs) * 5.5)';
  for(var i=0;i<10;i++){
    var cell=document.createElement('div');
    cell.className='cell';
    if(i<(fill===undefined?n:fill)){
      var dot=document.createElement('i');
      dot.className='dot';
      dot.style.background=color||colorOf(n);
      cell.appendChild(dot);
    }
    d.appendChild(cell);
  }
  return d;
}
function arrTeen(n,color){
  var d=document.createElement('div');
  d.className='arr teens-wrap';
  d.appendChild(arrTen(n,10,color));
  var rest=n-10;
  if(rest>0) d.appendChild(arrTen(n,rest,color));
  return d;
}
function svgObj(kind,color){
  var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('class','obj');
  var html;
  if(kind==='mango'){
    html='<path d="M12 3.2c4.4 0 7.8 3.5 7.8 8.2 0 5.4-3.5 9.4-7.8 9.4S4.2 16.8 4.2 11.4C4.2 6.7 7.6 3.2 12 3.2z" fill="'+color+'"/>'+
         '<path d="M12 3.2c-.7-1.3 0-2.6 1.4-3" stroke="#4f9c3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'+
         '<ellipse cx="9.2" cy="8.6" rx="1.5" ry="1" fill="rgba(255,255,255,.45)" transform="rotate(-25 9.2 8.6)"/>';
  }else if(kind==='ball'){
    html='<circle cx="12" cy="12.5" r="8.8" fill="'+color+'"/>'+
         '<circle cx="9" cy="9.5" r="2.4" fill="rgba(255,255,255,.5)"/>';
  }else if(kind==='bird'){
    html='<ellipse cx="12" cy="15" rx="8.5" ry="6.5" fill="'+color+'"/>'+
         '<circle cx="18" cy="8.6" r="5" fill="'+color+'"/>'+
         '<path d="M22.6 8.6l4.4 2.2-4.4 2.2z" fill="#f5c518"/>'+
         '<circle cx="19.4" cy="7.4" r="1.2" fill="#20304a"/>'+
         '<path d="M8 12.5q4 2.6 7.5 0" stroke="rgba(255,255,255,.55)" stroke-width="1.6" fill="none"/>'+
         '<path d="M4 16l-3.4 2.4 3.4 2.2z" fill="'+color+'"/>';
  }else{
    html='<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" fill="'+color+'"/>';
  }
  s.innerHTML=html;
  return s;
}
function arrObjects(n,kind,color){
  var d=document.createElement('div');
  d.className='arr arr-objects';
  var cols=Math.min(n,objCols(n));
  d.style.width='calc(var(--bs) * '+(cols*1.14).toFixed(2)+')';
  for(var i=0;i<n;i++) d.appendChild(svgObj(kind,color||colorOf(n)));
  return d;
}
function objCols(n){ return n<=6?2:4; }
function makeArr(kind,n,opts){
  opts=opts||{};
  var col=opts.color;
  if(kind==='row') return arrRow(n,opts);
  if(kind==='scatter') return arrScatter(n,opts);
  if(kind==='dice') return arrDice(n,col);
  if(kind==='ten') return arrTen(n,undefined,col);
  if(kind==='objects') return arrObjects(n,opts.object||'mango',col);
  return tower(n,opts);
}
/* turn a whole group the colour of its number, whatever it is made of */
function recolourGroup(el,num){
  var c=colorOf(num);
  [].slice.call(el.querySelectorAll('.blk')).forEach(function(b){ b.style.setProperty('--c',c); });
  [].slice.call(el.querySelectorAll('.dot')).forEach(function(d){ d.style.background=c; });
  [].slice.call(el.querySelectorAll('.obj path,.obj circle')).forEach(function(o){ o.setAttribute('fill',c); });
}
function signEl(ch){
  var s=document.createElement('div');s.className='sign';s.textContent=ch;return s;
}
function qcard(filled,val){
  var q=document.createElement('div');
  q.className='qcard'+(filled?' filled':'');
  q.textContent=(val===undefined?'?':val);
  return q;
}
function floorEl(){var f=document.createElement('div');f.className='floor';return f;}

function fitStage(el,maxN,cols,reserve){
  if(!el) return;
  var h=el.clientHeight-22-(reserve||0), w=el.clientWidth-16;
  var byH=h/Math.max(1,maxN)/1.08;
  var byW=w/Math.max(1,cols)/1.12;
  var bs=Math.floor(Math.min(byH,byW,128));
  bs=Math.max(bs,14);
  el.style.setProperty('--bs',bs+'px');
}
function countAloudRange(from,to,delay,cb){
  for(var k=from;k<=to;k++){
    (function(num){ later(function(){ popSound(); speak(WORDS[num],{rate:0.82}); },
      (delay||0)+(num-from)*420); })(k);
  }
  if(cb) later(cb,(delay||0)+(to-from+1)*420+140);
}
function countTower(blocks,startDelay,cb,from){
  var d=startDelay||0, base=from||0;
  blocks.forEach(function(bl,i){
    later(function(){
      bl.classList.add('counted','bump');
      bl.querySelector('.badge').textContent=base+i+1;
      popSound();
      speak(WORDS[base+i+1],{rate:0.82});
      later(function(){bl.classList.remove('bump');},300);
    },d+i*420);
  });
  later(function(){if(cb)cb();},d+blocks.length*420+420);
}

/* ================= stage definitions ================= */
var STAGES=[
  {id:'count5',   title:'Count to 5',       short:'Count to 5',   sub:'Tap and count',        make:function(){return mkCount(5);},     cols:1,   maxN:5},
  {id:'quick5',   title:'Quick look',       short:'Quick look',   sub:'How many did you see?',make:function(){return mkQuick(5);},     cols:1,   maxN:5},
  {id:'match5',   title:'Find the number',  short:'Find it',      sub:'Match the number',     make:function(){return mkMatch(5);},     cols:4.3, maxN:5},
  {id:'compare5', title:'More or fewer',    short:'More or fewer',sub:'Which one has more?',  make:function(){return mkCompare(5);},   cols:2.7, maxN:5},
  {id:'count10',  title:'Count to 10',      short:'Count to 10',  sub:'Bigger groups',        make:function(){return mkCount(10);},    cols:1,   maxN:10},
  {id:'track',    title:'Number track',     short:'Track',        sub:'Spin and count on',    make:function(){return mkTrack();},      cols:1,   maxN:2},
  {id:'build10',  title:'Build the number', short:'Build it',     sub:'Stop at the right one',make:function(){return mkBuild(10);},    cols:2.6, maxN:10},
  {id:'bonds5',   title:'Make 5',           short:'Make 5',       sub:'How many more?',       make:function(){return mkBonds(5);},     cols:1.4, maxN:5},
  {id:'make10',   title:'Make 10',          short:'Make 10',      sub:'Fill the ten-frame',   make:function(){return mkMake10();},     cols:1,   maxN:10},
  {id:'add5',     title:'Adding up',        short:'Adding up',    sub:'Put them together',    make:function(){return mkAdd(5);},       cols:4.4, maxN:5},
  {id:'doubles',  title:'Doubles',          short:'Doubles',      sub:'Two equal groups',     make:function(){return mkDoubles(5);},   cols:4.4, maxN:5},
  {id:'sub10',    title:'Take away',        short:'Take away',    sub:'How many are left?',   make:function(){return mkSub(10);},      cols:4.8, maxN:10},
  {id:'story',    title:'Story time',       short:'Story time',   sub:'Little number stories', make:function(){return mkStory();},      cols:2.6, maxN:10},
  {id:'next10',   title:'What comes next?', short:'What comes next?',sub:'Number order',     make:function(){return mkNext(10);},     cols:4.6, maxN:10},
  {id:'patterns', title:'Patterns',         short:'Patterns',     sub:'What comes next?',     make:function(){return mkPatternsStage();}, cols:1, maxN:2},
  {id:'neighbours10',title:'Number neighbours',short:'Neighbours',sub:'Before, after, between',make:function(){return mkNeighbours(10);},cols:1,maxN:2},
  {id:'bignum10', title:'Bigger number',    short:'Bigger number',sub:'Numbers, no blocks',   make:function(){return mkBigNum(9);},    cols:2.6, maxN:9},
  {id:'teens',    title:'Teen numbers',     short:'Teens',        sub:'Ten and some more',    make:function(){return mkTeens();},      cols:1,   maxN:10},
  {id:'mix10',    title:'Big mix',          short:'Big mix',      sub:'A little of everything',make:function(){return mkMix();},       cols:3.2, maxN:10}
];
function stageById(id){for(var i=0;i<STAGES.length;i++) if(STAGES[i].id===id) return STAGES[i]; return null;}
function stageIndex(id){for(var i=0;i<STAGES.length;i++) if(STAGES[i].id===id) return i; return 0;}
function isUnlocked(i){return i===0 || !!(progress.unlocked&&progress.unlocked[STAGES[i].id]);}

/* ================= question helpers ================= */
function makeChoices(ans,lo,hi){
  lo=(lo===undefined)?0:lo; hi=(hi===undefined)?12:hi;
  var out=[ans];
  var pool=shuffle([ans-1,ans+1,ans+2,ans-2,ans+3,ans-3]);
  for(var i=0;i<pool.length&&out.length<3;i++){
    var v=pool[i];
    if(v>=lo&&v<=hi&&out.indexOf(v)===-1) out.push(v);
  }
  return shuffle(out);
}
function showSameButton(onPick){
  var wrap=$('choices');
  wrap.innerHTML='';
  var b=document.createElement('button');
  b.className='samebtn';
  b.setAttribute('aria-label','Same');
  b.innerHTML='<svg viewBox="0 0 32 24"><rect x="2" y="6" width="12" height="12" rx="3" fill="#29a3e0"/>'+
              '<rect x="18" y="6" width="12" height="12" rx="3" fill="#29a3e0"/></svg><span>Same</span>';
  b.addEventListener('click',function(){ onPick(b); });
  wrap.appendChild(b);
}
function askNumber(ans,lo,hi,onRight){
  round.answer=ans;
  showChoices(makeChoices(ans,lo,hi),function(v,btn){
    if(v===ans){btn.classList.add('right');onRight();}
    else wrongNow(btn);
  });
}
function pulseChoice(){
  var ans=round.answer;
  if(ans===null||ans===undefined) return;
  var btns=document.querySelectorAll('.choice');
  for(var i=0;i<btns.length;i++){
    if(parseInt(btns[i].textContent,10)===ans) btns[i].classList.add('hint');
  }
}
function rangeArr(lo,hi){var a=[];for(var i=lo;i<=hi;i++)a.push(i);return a;}
/* numbers come out of a shuffled bag, so nothing repeats until the bag is empty */
function drawNumber(lo,hi){
  var key=lo+':'+hi;
  round.bags=round.bags||{};
  var bag=round.bags[key];
  if(!bag){ bag=round.bags[key]={list:shuffle(rangeArr(lo,hi)),i:0}; }
  if(bag.i>=bag.list.length){ bag.list=shuffle(rangeArr(lo,hi)); bag.i=0; }
  // about four questions in ten come back to a number she has been getting wrong
  if(Math.random()<0.4){
    var weak=weakNumbers(lo,hi).filter(function(n){ return n!==round.lastNumber; });
    if(weak.length){
      var pickWeak=weak[randInt(0,Math.min(weak.length,3)-1)];
      round.lastNumber=pickWeak;
      return pickWeak;
    }
  }
  var v=bag.list[bag.i++];
  round.lastNumber=v;
  return v;
}
function uniqueCounts(n,k,max){
  var out=[n], cands=[];
  for(var d=2;d<=max;d++){
    if(n+d<=max) cands.push(n+d);
    if(n-d>=1) cands.push(n-d);
  }
  shuffle(cands);
  for(var i=0;i<cands.length&&out.length<k;i++) out.push(cands[i]);
  for(var v=1;v<=max&&out.length<k;v++) if(out.indexOf(v)===-1) out.push(v);
  return shuffle(out);
}

/* ---------- how hard this stage is running for her right now ---------- */
function lvl(){
  if(!round.stage) return 0;
  return (progress.levels&&progress.levels[round.stage.id])||0;
}

/* ---------- sizing the arrangements ---------- */
function sizeFor(kind,n,iw,ih){
  var v;
  switch(kind){
    case 'row': var cols=Math.min(n,5), rows=Math.ceil(n/cols);
                v=Math.min(iw/(cols*1.08),ih/(rows*1.08)); break;
    case 'scatter': var c1=n<=6?2:3, r1=Math.ceil(n/c1);
                v=Math.min(iw/(c1*1.26),ih/(r1*1.26)); break;
    case 'dice': v=Math.min(iw/3.6,ih/3.6); break;
    case 'ten': v=Math.min(iw/5.7,ih/2.45); break;
    case 'teen': v=Math.min(iw/5.7,ih/4.75); break;
    case 'objects': var c2=Math.min(n,objCols(n)), r2=Math.ceil(n/c2);
                v=Math.min(iw/(c2*1.2),ih/(r2*1.2),92); break;
    default: v=Math.min(iw*0.95,ih/(n*1.08));
  }
  return v;
}
/* Work out the block size for side-by-side, stacked and (with three groups)
   two-on-top, then keep whichever layout gives the biggest blocks.        */
function fitArrs(stage,items,cardH){
  var r=stage.getBoundingClientRect();
  var W=Math.max(120,r.width-16), H=Math.max(120,r.height-(cardH||0)-24);
  var n=items.length;
  var GAP=10, PADX=18, PADY=20;
  var best={bs:0,mode:'row',boxes:null};

  function evalLayout(mode,boxes){
    var bs=Infinity;
    for(var i=0;i<items.length;i++){
      var b=boxes[i];
      var v=sizeFor(items[i].kind,items[i].n,Math.max(24,b.w-PADX),Math.max(24,b.h-PADY));
      if(v<bs) bs=v;
    }
    if(bs>best.bs) best={bs:bs,mode:mode,boxes:boxes};
  }

  var wRow=(W-(n-1)*GAP)/n;
  evalLayout('row',items.map(function(){ return {w:wRow,h:H}; }));
  var hCol=(H-(n-1)*GAP)/n;
  evalLayout('col',items.map(function(){ return {w:W,h:hCol}; }));
  if(n===3){
    var hh=(H-GAP)/2;
    evalLayout('grid',[{w:(W-GAP)/2,h:hh},{w:(W-GAP)/2,h:hh},{w:W,h:hh}]);
  }

  var cap=(n>1?120:130);
  best.bs=Math.max(11,Math.floor(Math.min(best.bs,cap)));

  var cont=stage.querySelector('.groups');
  if(cont){
    cont.className='groups '+best.mode;
    items.forEach(function(it,i){
      if(!it.wrap) return;
      it.wrap.style.width=Math.round(best.boxes[i].w)+'px';
      it.wrap.style.alignSelf=(best.mode==='row'&&it.kind!=='tower')?'center':'';
    });
  }
  items.forEach(function(it){
    it.el.style.setProperty('--bs',best.bs+'px');
    if(items.length===1&&it.kind!=='tower') it.el.style.alignSelf='center';
  });
}
function safeKind(k,n){
  if(k==='dice'&&n>6) return 'scatter';
  if(k==='ten'&&n>10) return 'scatter';
  return k;
}
function pick(a){ return a[randInt(0,a.length-1)]; }

/* ---------- 1. count ---------- */
function mkCount(max){
  if(lvl()>0) max=Math.min(20,max+2);
  if(lvl()<0) max=Math.min(max,4);
  var n=drawNumber(2,max);
  var useArr=lvl()>0||round.index>=2;
  var kind=useArr?pick(['tower','row','scatter']):'tower';
  var fadeBadges=round.index>=3;      // rounds four and five hide the numbers she tapped
  var q={
    sig:'count:'+kind+':'+n, nums:[n], maxN:n, cols:1,
    promptHTML:'Tap each one and count!',
    promptSpeech:'Tap each one and count with me.',
    build:function(el){
      var arr=makeArr(kind,n,{tapable:true,pop:true});
      el.appendChild(arr);
      q.fit=function(){ fitArrs(el,[{el:arr,n:n,kind:kind}],0); };
      q.fit();
      var blocks=[].slice.call(arr.querySelectorAll('.blk'));
      q.blocks=blocks;
      var tapped=0;
      function askHow(){
        setPrompt('How many?','How many altogether?');
        askNumber(n,1,12,function(){correctNow();});
      }
      blocks.forEach(function(b){
        b.addEventListener('click',function(){
          if(b.classList.contains('counted')) return;
          tapped++;
          b.classList.add('counted','bump');
          b.querySelector('.badge').textContent=tapped;
          popSound();
          speak(WORDS[tapped],{rate:0.82});
          later(function(){b.classList.remove('bump');},310);
          if(tapped===n){
            later(function(){
              if(fadeBadges){
                blocks.forEach(function(x){ x.querySelector('.badge').classList.add('fade'); });
                later(askHow,900);
              }else askHow();
            },650);
          }
        });
      });
    },
    afterCorrect:function(done){
      speak(WORDS[n]+'!',{rate:0.85});
      done();
    },
    help:function(){
      q.blocks.forEach(function(b){ b.querySelector('.badge').classList.remove('fade'); });
      countTower(q.blocks,0,function(){
        speak('That is '+WORDS[n]+'.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- 2. match numeral to quantity ---------- */
function mkMatch(max){
  var n=drawNumber(2,max);
  var opts=uniqueCounts(n,3,max);
  var sharedKind=safeKind(lvl()<0?'tower'
                         :lvl()>0?pick(['dice','scatter','objects'])
                         :pick(['tower','dice','scatter','objects']),Math.max.apply(null,opts));
  var kinds=opts.map(function(){ return sharedKind; });
  var objKind=pick(['mango','ball','star']);
  var q={
    sig:'match:'+n+':'+kinds.join(''), nums:[n], maxN:max, cols:3.4,
    promptHTML:'Which one has <span class="num">'+n+'</span>?',
    promptSpeech:'Which one has '+WORDS[n]+'?',
    build:function(el){
      el.classList.add('col');
      el.style.justifyContent='center';
      var card=document.createElement('div');
      card.className='numcard';
      card.textContent=n;
      card.style.color='#20304a';           // neutral until she answers
      card.style.position='static';
      card.style.transform='none';
      el.appendChild(card);

      var row=document.createElement('div');
      row.className='groups';
      el.appendChild(row);
      q.wraps=[];
      var items=[];
      opts.forEach(function(v,i){
        var w=document.createElement('div');
        w.className='tapwrap';
        w.dataset.v=v;
        var arr=makeArr(kinds[i],v,{object:objKind,color:NEUTRAL});
        w.appendChild(arr);
        items.push({el:arr,n:v,kind:kinds[i],wrap:w});
        w.addEventListener('click',function(){
          if(round.locked||w.classList.contains('dead')) return;
          if(v===n){
            w.classList.add('right');
            card.style.color=colorOf(n);
            recolourGroup(w,n);
            correctNow();
          }
          else{
            w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
            wrongNow(null);
            later(function(){ w.classList.add('dead'); },420);
          }
        });
        row.appendChild(w);
        q.wraps.push(w);
      });
      q.fit=function(){ fitArrs(el,items,card.offsetHeight+16); };
      q.fit();
    },
    afterCorrect:function(done){
      speak('Yes, '+WORDS[n]+'.',{rate:0.85});
      done();
    },
    help:function(){
      q.wraps.forEach(function(w){
        if(parseInt(w.dataset.v,10)===n){
          w.style.background='rgba(255,224,102,.55)';
          w.animate?w.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:700,iterations:2}):null;
          var blks=[].slice.call(w.querySelectorAll('.blk'));
          if(blks.length){
            countTower(blks,200,function(){ speak('This one has '+WORDS[n]+'.',{rate:0.85}); });
          }else{
            speak('This one has '+WORDS[n]+'.',{rate:0.85});
          }
        }
      });
    }
  };
  return q;
}

/* ---------- 3. compare ---------- */
function mkCompare(max){
  var equal=Math.random()<0.2;      // about one question in five has two equal groups
  var a,b,guard=0;
  if(equal){
    a=randInt(2,max); b=a;
  }else{
    a=randInt(2,max); b=randInt(2,max);
    var minGap=lvl()<0?3:2;
    while(Math.abs(a-b)<minGap&&guard++<60){
      if(lvl()<0){
        var cands=[a+minGap,a-minGap].filter(function(v){return v>=1&&v<=max;});
        if(cands.length){ b=cands[randInt(0,cands.length-1)]; break; }
        a=randInt(2,max);
      }
      b=randInt(2,max);
    }
    if(Math.abs(a-b)<1) b=a>1?a-1:a+1;
  }
  var askMore=Math.random()<0.6;
  var big=Math.max(a,b), small=Math.min(a,b);
  var target=equal?'same':(askMore?big:small);
  var lookBig,lookSmall;
  if(equal){                             // two equal groups, deliberately different shapes
    var pool=['tower','row','scatter','dice'];
    lookBig=pick(pool);
    lookSmall=pick(pool.filter(function(k){ return k!==lookBig; }));
  }else if(lvl()>0){
    lookBig=pick(['row','scatter','dice']);
    lookSmall=pick(['tower','row']);
  }else if(Math.random()<0.5){
    lookBig=pick(['row','scatter','dice']);
    lookSmall='tower';
  }else{
    lookBig=pick(['tower','row','scatter']);
    lookSmall=pick(['tower','row','scatter','dice']);
  }
  lookBig=safeKind(lookBig,big);
  lookSmall=safeKind(lookSmall,small);
  if(equal&&lookSmall===lookBig){
    var alts=['tower','row','scatter','dice'];
    for(var k2=0;k2<alts.length;k2++){
      var cand2=safeKind(alts[k2],small);
      if(cand2!==lookBig){ lookSmall=cand2; break; }
    }
  }
  var objKind=pick(['mango','ball','star']);
  var sides=equal
    ? [{v:a,kind:lookBig},{v:b,kind:lookSmall}]
    : [{v:a,kind:a===big?lookBig:lookSmall},{v:b,kind:b===big?lookBig:lookSmall}];
  var q={
    sig:'compare:'+(equal?'eq':a+'-'+b)+'-'+(askMore?1:0), nums:[a,b], maxN:Math.max(a,b), cols:2.7,
    promptHTML:equal?'Which has more? Or are they the same?':(askMore?'Which one has more?':'Which one has fewer?'),
    promptSpeech:equal?'Which has more? Or are they the same?':(askMore?'Which one has more? Tap it.':'Which one has fewer? Tap it.'),
    build:function(el){
      q.wraps=[];
      var items=[];
      var cont=document.createElement('div');
      cont.className='groups';
      el.appendChild(cont);
      sides.forEach(function(side){
        var v=side.v, kind=side.kind;
        var w=document.createElement('div');
        w.className='tapwrap';
        w.dataset.v=v;
        var arr=makeArr(kind,v,{object:objKind,color:NEUTRAL});
        w.appendChild(arr);
        items.push({el:arr,n:v,kind:kind,wrap:w});
        w.addEventListener('click',function(){
          if(round.locked||w.classList.contains('dead')) return;
          if(!equal&&v===target){
            w.classList.add('right');
            q.wraps.forEach(function(x){ recolourGroup(x,parseInt(x.dataset.v,10)); });
            correctNow();
          }else{
            w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
            wrongNow(null,equal?'Count both groups. Are they the same?':null);
            later(function(){ w.classList.add('dead'); },420);
          }
        });
        cont.appendChild(w);
        q.wraps.push(w);
      });
      q.fit=function(){ fitArrs(el,items,0); };
      q.fit();
      if(equal){
        showSameButton(function(btn){
          if(round.locked) return;
          btn.classList.add('right');
          correctNow();
        });
      }
    },
    afterCorrect:function(done){
      speak(equal?'They are the same.':(askMore?'That one has more.':'That one has fewer.'),{rate:0.85});
      done();
    },
    help:function(){
      if(equal){
        var sb=document.querySelector('.samebtn');
        if(sb) sb.classList.add('hint');
        var first=q.wraps[0];
        var blks=[].slice.call(first.querySelectorAll('.blk'));
        if(blks.length){
          countTower(blks,150,function(){ speak('Both have '+WORDS[a]+'. They are the same.',{rate:0.85}); });
        }else{
          speak('Both have '+WORDS[a]+'. They are the same.',{rate:0.85});
        }
        return;
      }
      q.wraps.forEach(function(w){
        if(parseInt(w.dataset.v,10)===target){
          w.style.background='rgba(255,224,102,.55)';
          w.animate?w.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:700,iterations:2}):null;
          var blks2=[].slice.call(w.querySelectorAll('.blk'));
          if(blks2.length) countTower(blks2,200,function(){ speak('This one has '+WORDS[target]+'. That is '+(askMore?'more':'fewer')+'.',{rate:0.85}); });
          else speak('This one has '+WORDS[target]+'. That is '+(askMore?'more':'fewer')+'.',{rate:0.85});
        }
      });
    }
  };
  return q;
}

/* ---------- 4. build ---------- */
function mkBuild(max){
  if(lvl()>0) max=Math.min(20,max+2);
  if(lvl()<0) max=Math.min(max,6);
  var n=drawNumber(2,max);
  var cap=n+3;                     // she may overshoot by up to three blocks
  var q={
    sig:'build:'+n, nums:[n], maxN:n, cols:3.1,
    promptHTML:'Build a tower of <span class="num">'+n+'</span>',
    promptSpeech:'Build a tower of '+WORDS[n]+' blocks. Tap add, then tap done.',
    build:function(el){
      el.classList.add('col');
      var card=document.createElement('div');
      card.className='targetcard';
      card.innerHTML='<div class="tnum" style="color:#20304a">'+n+'</div><div class="tlab">blocks</div>';
      el.appendChild(card);

      var row=document.createElement('div');
      row.className='buildrow';
      el.appendChild(row);

      var t=document.createElement('div');
      t.className='tower';
      t.style.minWidth='calc(var(--bs) * 1.05)';
      row.appendChild(t);
      q.towerEl=t;

      var bcol=document.createElement('div');
      bcol.className='buildbtns';
      row.appendChild(bcol);

      var add=document.createElement('button');
      add.className='addbtn';
      add.setAttribute('aria-label','Add one block');
      add.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span class="lbl">ADD</span>';
      bcol.appendChild(add);

      var take=document.createElement('button');
      take.className='addbtn minus';
      take.setAttribute('aria-label','Take one block off');
      take.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M5 12h14"/></svg><span class="lbl">OFF</span>';
      bcol.appendChild(take);

      var doneBtn=document.createElement('button');
      doneBtn.className='donebtn';
      doneBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>DONE';
      $('choices').appendChild(doneBtn);

      var built=0;
      // size the blocks for what is actually standing, never smaller than the target,
      // and never letting the tower run up behind the number card
      function resize(){
        q.maxN=Math.max(n,built,1);
        fitStage(el,q.maxN,3.1,card.offsetHeight+16);
      }
      q.fit=resize;
      resize();
      function sayCount(){
        if(built>0) speak(WORDS[built],{rate:0.82});
      }
      q.recolour=function(){
        var c=colorOf(n);
        [].slice.call(t.children).forEach(function(b){ b.style.setProperty('--c',c); });
      };
      add.addEventListener('click',function(){
        if(round.locked||built>=cap) return;
        built++;
        t.appendChild(block(built,{pop:true,color:NEUTRAL}));
        popSound(); sayCount(); resize();
      });
      take.addEventListener('click',function(){
        if(round.locked||built<=0) return;
        var last=t.lastElementChild;
        if(last){ last.remove(); built--; }
        popSound();
        if(built>0) speak(WORDS[built],{rate:0.82});
        resize();
      });
      doneBtn.addEventListener('click',function(){
        if(round.locked) return;
        if(built===n){ q.recolour(); correctNow(); }
        else{
          wrongNow(null,built>n?'That is too many. Count your tower.':'Count your tower. Tap done when it is right.');
        }
      });
      q.built=function(){return built;};
    },
    afterCorrect:function(done){
      speak('You built '+WORDS[n]+'!',{rate:0.85});
      done();
    },
    help:function(){
      var blocks=[].slice.call(q.towerEl.children);
      if(!blocks.length){
        speak('Your tower is empty. You need '+WORDS[n]+' blocks.',{rate:0.85});
        return;
      }
      countTower(blocks,0,function(){
        speak('That is '+WORDS[blocks.length]+'. You need '+WORDS[n]+'.',{rate:0.85});
      });
    }
  };
  return q;
}

/* ---------- 5. bonds: how many more to make T ---------- */
function mkBonds(target){
  var given=drawNumber(1,target-1);
  var ans=target-given;
  // once Make 5 is well known, the last two rounds ask it with numerals only
  var quick=!!(round.stage&&round.stage.id==='bonds5'&&round.index>=3&&
               (progress.stars['bonds5']||0)>=3);
  var q={
    sig:'bonds:'+given+(quick?'q':''), nums:[given,target], maxN:target, cols:1.4,
    promptHTML:quick
      ? '<span class="num">'+given+'</span> and <span class="num">?</span> make <span class="num">'+target+'</span>'
      : '<span class="num">'+given+'</span> and how many more make <span class="num">'+target+'</span>?',
    promptSpeech:quick
      ? (WORDS[given]+' and what make '+WORDS[target]+'?')
      : (given+' and how many more make '+target+'?'),
    build:function(el){
      q.el=el;
      q.given=given;
      if(quick){
        el.style.alignItems='center';
        var row=document.createElement('div');
        row.className='numrow';
        row.style.alignSelf='center';
        function card(txt,cls,col){
          var c=document.createElement('div');
          c.className='numcard'+(cls?' '+cls:'');
          c.textContent=txt;
          if(col) c.style.color=col;
          return c;
        }
        row.appendChild(card(String(given),'',colorOf(given)));
        var plus=document.createElement('div'); plus.className='arrow'; plus.textContent='+';
        row.appendChild(plus);
        q.qc=card('?','qmark','#9fb4cc');
        q.qc.style.borderStyle='dashed';
        row.appendChild(q.qc);
        var eq=document.createElement('div'); eq.className='arrow'; eq.textContent='=';
        row.appendChild(eq);
        row.appendChild(card(String(target),'',colorOf(target)));
        el.appendChild(row);
        q.row=row;
      }else{
        showBlocks();
      }
      askNumber(ans,1,Math.min(10,target),function(){correctNow();});
    },
    afterCorrect:function(done){
      if(q.qc&&q.qc.classList.contains('qmark')){
        q.qc.textContent=ans;
        q.qc.style.color=colorOf(ans);
        q.qc.style.borderStyle='solid';
      }
      if(!q.towerEl){
        speak(given+' and '+ans+' make '+target+'.',{rate:0.85});
        done();
        return;
      }
      fillGhosts(80,function(){
        speak(given+' and '+ans+' make '+target+'.',{rate:0.85});
        done();
      });
    },
    help:function(){
      if(q.qc&&q.qc.classList.contains('qmark')){
        q.qc.textContent=ans;
        q.qc.style.color=colorOf(ans);
        q.qc.style.borderStyle='solid';
      }
      if(!q.towerEl){ showBlocks(); }
      fillGhosts(80,function(){
        speak(given+' and '+ans+' make '+target+'.',{rate:0.85});
        pulseChoice();
      });
    },
    onWrong:function(n){
      // one mistake in the numerals-only rounds and the blocks come back as help
      if(n===1&&quick&&!q.towerEl){
        showBlocks();
        speak('Here are the blocks. Count the empty spaces.',{rate:0.9});
      }
    }
  };
  function showBlocks(){
    if(q.row){ q.row.remove(); q.row=null; }
    var t=tower(given,{pop:true,stagger:70});
    for(var i=0;i<ans;i++) t.appendChild(ghostBlock());
    q.el.appendChild(t);
    q.towerEl=t;
    if(q.el.style.alignItems==='center') q.el.style.alignItems='';
  }
  function fillGhosts(delay,cb){
    var ghosts=[].slice.call(q.towerEl.querySelectorAll('.blk.ghost'));
    if(!ghosts.length){ if(cb) cb(); return; }
    ghosts.forEach(function(g,i){
      later(function(){
        var real=block(given+i+1,{pop:true});
        g.parentNode.replaceChild(real,g);
        popSound();
        speak(WORDS[given+i+1],{rate:0.82});
      },(delay||0)+i*420);
    });
    later(function(){ if(cb) cb(); },(delay||0)+ghosts.length*420+320);
  }
  return q;
}

/* ---------- make ten: a ten-frame with some dots filled ---------- */
function fillTenFrame(arr,from,to,delay,cb){
  var cells=[].slice.call(arr.querySelectorAll('.cell'));
  var k=0;
  for(var i=from;i<to;i++){
    (function(idx){
      later(function(){
        var cell=cells[idx];
        if(cell&&!cell.querySelector('.dot')){
          var dot=document.createElement('i');
          dot.className='dot';
          dot.style.background=colorOf(10);
          cell.appendChild(dot);
          popSound();
        }
        speak(WORDS[idx+1],{rate:0.82});
      },(delay||0)+k*420);
    })(i);
    k++;
  }
  later(function(){ if(cb)cb(); },(delay||0)+k*420+320);
}
function mkMake10(){
  var g=drawNumber(1,9);
  var ans=10-g;
  var q={
    sig:'make10:'+g, nums:[g,10], maxN:10, cols:1,
    promptHTML:'<span class="num">'+g+'</span> and how many more make 10?',
    promptSpeech:g+' and how many more make ten?',
    build:function(el){
      var arr=arrTen(10,g,colorOf(10));
      el.appendChild(arr);
      q.arr=arr;
      q.fit=function(){ fitArrs(el,[{el:arr,n:10,kind:'ten'}],0); };
      q.fit();
      askNumber(ans,1,10,function(){correctNow();});
    },
    afterCorrect:function(done){
      fillTenFrame(q.arr,g,10,80,function(){
        speak(g+' and '+ans+' make ten!',{rate:0.85});
        done();
      });
    },
    help:function(){
      fillTenFrame(q.arr,g,10,80,function(){
        speak(g+' and '+ans+' make ten.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- doubles: two equal groups ---------- */
function mkDoubles(max){
  var cap=lvl()>0?6:5;
  var n=drawNumber(1,Math.min(cap,max||5));
  var ans=n*2;
  var q={
    sig:'double:'+n, nums:[n,n], maxN:n, cols:4.4,
    promptHTML:'Double <span class="num">'+n+'</span> — how many altogether?',
    promptSpeech:'Double '+WORDS[n]+'. '+WORDS[n]+' and '+WORDS[n]+'. How many altogether?',
    build:function(el){
      q.towerA=tower(n,{pop:true,stagger:60});
      el.appendChild(q.towerA);
      el.appendChild(signEl('+'));
      q.towerB=tower(n,{pop:true,stagger:60});
      el.appendChild(q.towerB);
      el.appendChild(signEl('='));
      q.qc=qcard(false);
      el.appendChild(q.qc);
      askNumber(ans,1,14,function(){correctNow();});
    },
    afterCorrect:function(done){
      q.qc.textContent=ans;
      q.qc.classList.add('answered');
      mergeAndCount(n,n,false,function(){
        speak(WORDS[ans]+' altogether!',{rate:0.85});
        done();
      });
    },
    help:function(){
      var all=[].slice.call(q.towerA.children).concat([].slice.call(q.towerB.children));
      countTower(all,0,function(){
        speak(n+' and '+n+' make '+WORDS[ans]+'.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- 6. add ---------- */
function mkAdd(max){
  if(lvl()>0) max=max+1;
  var cap=Math.max(2,max-1);
  var a=randInt(1,cap), b=randInt(1,Math.min(cap,max-a));
  var ans=a+b;
  var countOn=round.index>=2;          // later rounds: the first group is a numeral
  var q={
    sig:'add:'+a+'+'+b+(countOn?'c':''), nums:[a,b], maxN:Math.max(a,b), cols:4.4,
    promptHTML:countOn
      ? 'Start at <span class="num">'+a+'</span>, count on '+b
      : '<span class="num">'+a+'</span> and <span class="num">'+b+'</span> — how many altogether?',
    promptSpeech:countOn
      ? 'Start at '+WORDS[a]+'. Count on '+WORDS[b]+'. How many altogether?'
      : a+' and '+b+'. How many altogether?',
    build:function(el){
      if(countOn){
        var nc=document.createElement('div');
        nc.className='numcard';
        nc.textContent=a;
        nc.style.color=colorOf(a);
        nc.style.fontSize='calc(var(--bs)*.95)';
        nc.style.padding='10px 14px';
        nc.style.alignSelf='flex-end';
        nc.style.marginBottom='2px';
        el.appendChild(nc);
        q.numA=nc;
      }else{
        q.towerA=tower(a,{pop:true,stagger:60});
        el.appendChild(q.towerA);
      }
      el.appendChild(signEl('+'));
      q.towerB=tower(b,{pop:true,stagger:60});
      el.appendChild(q.towerB);
      el.appendChild(signEl('='));
      q.qc=qcard(false);
      el.appendChild(q.qc);
      askNumber(ans,1,12,function(){correctNow();});
    },
    afterCorrect:function(done){
      q.qc.textContent=ans;
      q.qc.classList.add('answered');
      mergeAndCount(a,b,countOn,function(){
        speak(WORDS[ans]+' altogether!',{rate:0.85});
        done();
      });
    },
    help:function(){
      if(countOn){
        countTower([].slice.call(q.towerB.children),0,function(){
          speak(a+' and '+b+' make '+WORDS[ans]+'.',{rate:0.85});
          pulseChoice();
        },a);
        return;
      }
      var all=[].slice.call(q.towerB.children);
      if(q.towerA) all=[].slice.call(q.towerA.children).concat(all);
      countTower(all,0,function(){
        speak(a+' and '+b+' make '+WORDS[ans]+'.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

function mergeAndCount(a,b,countOn,done){
  var stage=$('stage');
  var total=a+b;
  speak(countOn?(WORDS[a]+'…'):(a+' plus '+b+' is '+total),{rate:0.85});
  later(function(){
    stage.innerHTML='';
    stage.appendChild(floorEl());
    fitStage(stage,total,1.6);
    var t=tower(total,{pop:true,stagger:80});
    stage.appendChild(t);
    var blocks=[].slice.call(t.children);
    blocks.forEach(function(bl,i){
      later(function(){
        bl.classList.add('counted','bump');
        bl.querySelector('.badge').textContent=i+1;
        if(!countOn||i>=a){ popSound(); speak(WORDS[i+1],{rate:0.82}); }
        later(function(){ bl.classList.remove('bump'); },320);
      },420+i*430);
    });
    later(done,420+total*430+320);
  },700);
}

/* ---------- 7. subtract ---------- */
function mkSub(max){
  var t0=randInt(3,Math.max(4,max));
  var r;
  if(!round.zeroUsed&&Math.random()<0.45){
    r=t0; round.zeroUsed=true;          // "3 take away 3" — once per stage at most
  }else{
    r=randInt(1,Math.min(4,t0-1));
  }
  var ans=t0-r;
  var q={
    sig:'sub:'+t0+'-'+r, nums:[t0,r], maxN:t0, cols:4.8,
    promptHTML:'<span class="num">'+t0+'</span> take away <span class="op">'+r+'</span> — how many are left?',
    promptSpeech:t0+' take away '+r+'. How many are left?',
    build:function(el){
      var t=tower(t0,{pop:true,stagger:60});
      var blocks=[].slice.call(t.children);
      blocks.slice(t0-r).forEach(function(bl){bl.classList.add('leaving');});
      el.appendChild(t);
      el.appendChild(signEl('−'));
      el.appendChild(qcard(true,r));
      el.appendChild(signEl('='));
      q.qc=qcard(false);
      el.appendChild(q.qc);
      q.blocks=blocks;
      askNumber(ans,0,10,function(){correctNow();});
    },
    afterCorrect:function(done){
      var t0b=q.blocks.length, r2=t0b-ans;
      var leaving=q.blocks.slice(t0b-r2), remaining=q.blocks.slice(0,t0b-r2);
      q.qc.textContent=ans;
      q.qc.classList.add('answered');
      leaving.forEach(function(bl,i){
        later(function(){bl.classList.add('flyaway');whoosh();},i*160);
        later(function(){bl.style.display='none';},i*160+700);
      });
      later(function(){
        if(!remaining.length){
          speak('None left! Zero.',{rate:0.85});
          done();
          return;
        }
        remaining.forEach(function(bl){bl.classList.remove('counted');});
        countTower(remaining,120,function(){
          speak(WORDS[ans]+' left!',{rate:0.85});
          done();
        });
      },r2*160+760);
    },
    help:function(){
      var remaining=q.blocks.slice(0,t0-r);
      if(!remaining.length){
        speak('Nothing is left. Zero.',{rate:0.85});
        pulseChoice();
        return;
      }
      countTower(remaining,0,function(){
        speak(WORDS[ans]+' are left.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- story time: little spoken problems ---------- */
function nw(n,one,many){ return WORDS[n]+' '+(n===1?one:many); }
function capFirst(t){ return t.charAt(0).toUpperCase()+t.slice(1); }
var STORY_SCENES=[
  {obj:'bird',color:'#3f51b5',many:'birds',
   add:function(a,b){
     return capFirst(nw(a,'bird','birds'))+(a===1?' sits':' sit')+' on a branch. '+
            capFirst(WORDS[b])+' more '+(b===1?'flies':'fly')+
            ' in. How many birds now?';
   },
   sub:function(t,r){
     return capFirst(nw(t,'bird','birds'))+(t===1?' sits':' sit')+' on a branch. '+
            capFirst(nw(r,'bird','birds'))+' '+(r===1?'flies':'fly')+
            ' away. How many birds are left?';
   },
   short:function(a,b){ return a+(a===1?' bird, ':' birds, ')+b+(b===1?' flies in':' fly in'); },
   shortSub:function(t,r){ return t+(t===1?' bird, ':' birds, ')+r+(r===1?' flies away':' fly away'); }
  },
  {obj:'mango',color:'#f2a33c',many:'mangoes',
   add:function(a,b){
     return (a===1?'There is one mango':'There are '+WORDS[a]+' mangoes')+' in a basket. '+
            capFirst(WORDS[b])+' more '+(b===1?'goes':'go')+
            ' in. How many mangoes now?';
   },
   sub:function(t,r){
     return (t===1?'There is one mango':'There are '+WORDS[t]+' mangoes')+' in a basket. '+
            capFirst(WORDS[r])+' '+(r===1?'is':'are')+' eaten'+
            '. How many mangoes are left?';
   },
   short:function(a,b){ return a+(a===1?' mango, ':' mangoes, ')+b+' more'; },
   shortSub:function(t,r){ return t+(t===1?' mango, ':' mangoes, ')+r+' eaten'; }
  },
  {obj:'ball',color:'#e8453c',many:'balls',
   add:function(a,b){
     return (a===1?'There is one ball':'There are '+WORDS[a]+' balls')+' in a box. '+
            capFirst(WORDS[b])+' more '+(b===1?'goes':'go')+
            ' in. How many balls now?';
   },
   sub:function(t,r){
     return (t===1?'There is one ball':'There are '+WORDS[t]+' balls')+' in a box. '+
            capFirst(WORDS[r])+' '+(r===1?'is':'are')+' taken out'+
            '. How many balls are left?';
   },
   short:function(a,b){ return a+(a===1?' ball, ':' balls, ')+b+' more'; },
   shortSub:function(t,r){ return t+(t===1?' ball, ':' balls, ')+r+' taken out'; }
  }
];
function storyText(tpl,vals){
  var out=tpl;
  for(var k in vals) out=out.split('{'+k+'}').join(vals[k]);
  return out;
}
function mkStory(){
  var scene=pick(STORY_SCENES);
  var add=Math.random()<0.5;
  var first,change,ans,vals;
  if(add){
    first=randInt(1,6);
    change=randInt(1,Math.min(4,10-first));
    ans=first+change;
    vals={a:WORDS[first],b:WORDS[change]};
  }else{
    first=randInt(3,10);
    change=randInt(1,Math.min(4,first-1));
    ans=first-change;
    vals={t:WORDS[first],r:WORDS[change]};
  }
  var story=add?scene.add(first,change):scene.sub(first,change);
  var q={
    sig:'story:'+scene.obj+':'+(add?'a':'s')+first+'-'+change, nums:[first,change], maxN:Math.max(first,ans), cols:2.6,
    promptHTML:add?scene.short(first,change):scene.shortSub(first,change),
    promptSpeech:story,
    replay:story,
    build:function(el){
      el.classList.add('col');
      el.style.justifyContent='center';
      var pic=document.createElement('div');
      pic.className='storypic';
      el.appendChild(pic);
      if(add){
        var g1=arrObjects(first,scene.obj,scene.color);
        var g2=arrObjects(change,scene.obj,scene.color);
        pic.appendChild(g1);
        pic.appendChild(signEl('+'));
        pic.appendChild(g2);
        q.fit=function(){ fitArrs(el,[{el:g1,n:first,kind:'objects'},{el:g2,n:change,kind:'objects'}],0); };
      }else{
        var g=arrObjects(first,scene.obj,scene.color);
        var kids=[].slice.call(g.children);
        kids.slice(first-change).forEach(function(x){ x.style.opacity='.28'; });
        pic.appendChild(g);
        q.fit=function(){ fitArrs(el,[{el:g,n:first,kind:'objects'}],0); };
      }
      q.fit();
      askNumber(ans,1,10,function(){correctNow();});
    },
    afterCorrect:function(done){
      speak(WORDS[ans]+' '+scene.plural+(add?' altogether!':' left!'),{rate:0.85});
      done();
    },
    help:function(){
      countAloudRange(1,ans,150,function(){
        speak(WORDS[ans]+' '+scene.plural+(add?' altogether.':' left.'),{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- 8. what comes next ---------- */
function mkNext(max){
  var asc=Math.random()<0.65;
  var len=3;
  var start,end;
  if(asc){ start=randInt(1,Math.max(2,max-len)); end=start+len; }
  else { start=randInt(len+1,max); end=start-len; }
  var seq=[],v=start;
  for(var i=0;i<len;i++){ seq.push(v); v+= asc?1:-1; }
  var ans=end;
  var q={
    sig:'next:'+seq.join(',')+'>'+ans, nums:[ans], maxN:2, cols:1,
    promptHTML:'What comes next?',
    promptSpeech:'What number comes next?',
    build:function(el){
      var row=document.createElement('div');
      row.className='numrow';
      seq.forEach(function(num,i){
        if(i){
          var ar=document.createElement('div');
          ar.className='arrow';
          ar.textContent='›';
          row.appendChild(ar);
        }
        var c=document.createElement('div');
        c.className='numcard';
        c.style.color=colorOf(num);
        c.textContent=num;
        row.appendChild(c);
      });
      var ar2=document.createElement('div');
      ar2.className='arrow';
      ar2.textContent='›';
      row.appendChild(ar2);
      var qc=document.createElement('div');
      qc.className='numcard';
      qc.style.color='#9fb4cc';
      qc.textContent='?';
      row.appendChild(qc);
      el.appendChild(row);
      q.qc=qc;
      askNumber(ans,1,Math.min(12,max+1),function(){correctNow();});
    },
    afterCorrect:function(done){
      q.qc.textContent=ans;
      q.qc.style.color=colorOf(ans);
      speak(asc?('It goes up by one. '+WORDS[ans]+'.'):('It goes down by one. '+WORDS[ans]+'.'),{rate:0.85});
      done();
    },
    help:function(){
      var all=seq.concat([ans]);
      all.forEach(function(num,i){
        later(function(){speak(WORDS[num],{rate:0.85});},i*520);
      });
      later(function(){
        q.qc.textContent=ans;
        q.qc.style.color=colorOf(ans);
        speak(asc?'It goes up by one.':'It goes down by one.',{rate:0.85});
        pulseChoice();
      },all.length*520+120);
    }
  };
  return q;
}

/* ---------- number track ---------- */
function mkTrack(){
  var hi=lvl()>0;
  var L=hi?20:10;
  var cols=hi?5:4;
  var startPos=Math.min(round.trackPos||1,L);
  var q={
    sig:'track:'+round.index, nums:[startPos], maxN:2, cols:1,
    promptHTML:'Tap the spinner',
    promptSpeech:'Tap the spinner to see how many steps.',
    build:function(el){
      el.classList.add('col');
      el.style.justifyContent='center';

      var wrap=document.createElement('div');
      wrap.className='trackwrap';
      el.appendChild(wrap);
      var track=document.createElement('div');
      track.className='track';
      track.style.gridTemplateColumns='repeat('+cols+',var(--cell))';
      wrap.appendChild(track);

      var cells=[];
      for(var i=0;i<L;i++){
        var c=document.createElement('div');
        c.className='tcell';
        var row=Math.floor(i/cols), off=i%cols;
        c.style.gridRow=String(row+1);
        c.style.gridColumn=String((row%2===0?off:cols-1-off)+1);
        c.textContent=String(i+1);
        track.appendChild(c);
        cells.push(c);
      }

      var piece=document.createElement('div');
      piece.className='piece';
      piece.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#f7b731"/>'+
        '<circle cx="8.6" cy="10" r="2.1" fill="#fff"/><circle cx="15.4" cy="10" r="2.1" fill="#fff"/>'+
        '<circle cx="9" cy="10.5" r=".95" fill="#25314a"/><circle cx="15.8" cy="10.5" r=".95" fill="#25314a"/>'+
        '<path d="M8.6 14.6q3.4 2.6 6.8 0" stroke="#7a4a10" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>';

      var pos=startPos, steps=0, phase='spin';
      var hasMore=(round.index%2===1);        // second and fourth turn get the extra question

      function place(){
        cells.forEach(function(c){ c.classList.remove('here'); });
        cells[pos-1].classList.add('here');
        cells[pos-1].appendChild(piece);
        q.nums=[pos];
        round.trackPos=pos;
      }
      place();

      function sizeTrack(){
        var st=$('stage');
        var W=st.clientWidth-16;
        var rows=Math.ceil(L/cols);
        var cw=(W-(cols-1)*6)/cols;
        var ch=(st.clientHeight-110-(rows-1)*6)/rows;
        var cell=Math.max(32,Math.min(cw,ch,88));
        track.style.setProperty('--cell',Math.floor(cell)+'px');
      }
      sizeTrack();

      var spin=document.createElement('button');
      spin.className='spinner';
      spin.setAttribute('aria-label','Spin for steps');
      spin.innerHTML='<span>?</span>';
      el.appendChild(spin);

      function askHere(){
        setPrompt('Which number are you on?','Which number are you on?');
        askNumber(pos,1,L,function(){
          if(hasMore&&pos+1<=L){
            setPrompt('Which number is one more?','Which number is one more than '+WORDS[pos]+'?');
            askNumber(pos+1,1,L+1,function(){ correctNow(); });
          }else{
            correctNow();
          }
        });
      }

      function reachedEnd(){
        confetti();
        speak('You reached the end!',{rate:0.9});
        if(round.wins===round.index) round.wins=4;   // all correct so far: a three-star finish
        round.index=ROUNDS-1;            // this round closes the stage
        correctNow();
      }

      spin.addEventListener('click',function(){
        if(round.locked||phase!=='spin') return;
        phase='spinning';
        spin.disabled=true;
        var n=randInt(1,3), t=0;
        var iv=setInterval(function(){
          t++;
          spin.querySelector('span').textContent=String(1+(t%3));
          tone(520+t*35,0.05,'square',0.05);
          if(t>8){
            clearInterval(iv);
            steps=n;
            spin.querySelector('span').textContent=String(n);
            spin.classList.add('landed');
            popSound();
            speak(WORDS[n]+' steps!',{rate:0.9});
            phase='move';
            setPrompt('Tap your piece '+n+' times','Tap your piece once for each step.');
            piece.classList.add('pulse');
          }
        },80);
      });

      piece.addEventListener('click',function(){
        if(round.locked||phase!=='move'||steps<=0) return;
        steps--;
        pos=Math.min(L,pos+1);
        place();
        popSound();
        speak(WORDS[pos],{rate:0.85});
        if(pos>=L){
          steps=0;
          piece.classList.remove('pulse');
          phase='done';
          later(reachedEnd,700);
          return;
        }
        if(steps<=0){
          piece.classList.remove('pulse');
          phase='ask';
          later(askHere,450);
        }
      });
    },
    afterCorrect:function(done){
      speak('Well done!',{rate:0.9});
      done();
    },
    help:function(){
      pulseChoice();
      speak('You are on '+WORDS[q.nums[0]]+'.',{rate:0.85});
    }
  };
  return q;
}

/* ---------- quick look: subitising ---------- */
function mkQuick(max){
  var n=drawNumber(1,Math.min(5,max));
  var kind=Math.random()<0.6?'dice':'ten';
  var q={
    sig:'quick:'+kind+':'+n, nums:[n], maxN:5, cols:1,
    promptHTML:'Ready?',
    promptSpeech:'Get ready. Look carefully, then tell me how many.',
    build:function(el){
      var holder=document.createElement('div');
      holder.className='flash';
      el.appendChild(holder);
      q.holder=holder;
      q.fit=function(){ if(q.arr) fitArrs(el,[{el:q.arr,n:n,kind:kind}],0); };
      q.show=function(){
        holder.innerHTML='';
        q.arr=makeArr(kind,n);
        holder.appendChild(q.arr);
        q.fit();
      };
      // a gentle pulse while the voice says "get ready"
      var pulse=document.createElement('div');
      pulse.className='ready-pulse';
      holder.appendChild(pulse);
      // the dots only appear once the prompt has finished speaking
      onSpeechIdle(function(){
        later(function(){
          q.show();
          later(function(){
            holder.innerHTML='';
            var qc=document.createElement('div');
            qc.className='qcard filled';
            qc.textContent='?';
            holder.appendChild(qc);
            setPrompt('How many did you see?','How many did you see?');
            askNumber(n,1,10,function(){correctNow();});
          },1600);
        },350);
      });
    },
    afterCorrect:function(done){
      q.show();
      speak(WORDS[n]+'!',{rate:0.85});
      done();
    },
    help:function(){
      q.show();
      countAloudRange(1,n,150,function(){
        speak('That is '+WORDS[n]+'.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- number neighbours ---------- */
function mkNeighbours(max){
  var mode=pick(['before','after','between']);
  var n,ans,cards;
  if(mode==='before'){ n=drawNumber(2,max); ans=n-1; cards=[null,n]; }
  else if(mode==='after'){ n=drawNumber(1,max-1); ans=n+1; cards=[n,null]; }
  else { n=drawNumber(2,max-1); ans=n; cards=[n-1,null,n+1]; }
  var say=mode==='before'?('What comes before '+WORDS[n]+'?')
        :mode==='after'?('What comes after '+WORDS[n]+'?')
        :('What is between '+WORDS[n-1]+' and '+WORDS[n+1]+'?');
  var q={
    sig:'nb:'+mode+':'+n, nums:[ans], maxN:2, cols:1,
    promptHTML:say.replace('?','?'),
    promptSpeech:say,
    build:function(el){
      var row=document.createElement('div');
      row.className='numrow';
      cards.forEach(function(v){
        var c=document.createElement('div');
        c.className='numcard';
        if(v===null){ c.textContent='?'; c.style.color='#9fb4cc'; c.style.borderStyle='dashed'; }
        else { c.textContent=v; c.style.color=colorOf(v); }
        row.appendChild(c);
      });
      el.appendChild(row);
      q.qc=row.querySelector('.numcard');
      askNumber(ans,0,Math.min(20,max+1),function(){correctNow();});
    },
    afterCorrect:function(done){
      [].slice.call(document.querySelectorAll('.numrow .numcard')).forEach(function(c){
        if(c.textContent==='?'){ c.textContent=ans; c.style.color=colorOf(ans); c.style.borderStyle='solid'; }
      });
      speak(WORDS[ans]+'.',{rate:0.85});
      done();
    },
    help:function(){
      [].slice.call(document.querySelectorAll('.numrow .numcard')).forEach(function(c){
        if(c.textContent==='?'){ c.textContent=ans; c.style.color=colorOf(ans); c.style.borderStyle='solid'; }
      });
      speak(mode==='between'?('It is '+WORDS[ans]+'.'):(WORDS[ans]+'.'),{rate:0.85});
      pulseChoice();
    }
  };
  return q;
}

/* ---------- bigger number: numerals only, then blocks to check ---------- */
function mkBigNum(max){
  var same=Math.random()<1/6;             // about one in six shows the same number twice
  var a,b,guard=0;
  if(same){ a=drawNumber(2,max); b=a; }
  else{
    a=drawNumber(2,max); b=drawNumber(2,max);
    while(a===b&&guard++<20) b=drawNumber(2,max);
  }
  var askSmaller=!same&&Math.random()<0.4;
  var target=same?'same':(askSmaller?Math.min(a,b):Math.max(a,b));
  var prompt=same?'Which is bigger? Or are they the same?'
                 :(askSmaller?'Which number is smaller?':'Which number is bigger?');
  var q={
    sig:'big:'+(same?'eq':a+'-'+b)+'-'+(askSmaller?1:0), nums:[a,b], maxN:Math.max(a,b), cols:2.6,
    promptHTML:prompt,
    promptSpeech:prompt+' Tap it.',
    build:function(el){
      el.style.alignItems='center';
      q.wraps=[]; q.holders=[]; q.cards=[];
      [a,b].forEach(function(v,i){
        var w=document.createElement('div');
        w.className='tapwrap';
        w.dataset.v=v;
        var c=document.createElement('div');
        c.className='bignum-card';
        c.textContent=v;
        c.style.color=colorOf(v);
        w.appendChild(c);
        var holder=document.createElement('div');
        holder.className='reveal';
        w.appendChild(holder);
        w.addEventListener('click',function(){
          if(round.locked||w.classList.contains('dead')) return;
          if(!same&&v===target){ w.classList.add('right'); reveal(); correctNow(); }
          else{
            w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
            wrongNow(null,same?'Look again. Are they the same?':null);
            later(function(){ w.classList.add('dead'); },420);
          }
        });
        el.appendChild(w);
        q.wraps.push(w); q.holders.push(holder); q.cards.push(c);
      });
      if(same){
        showSameButton(function(btn){
          if(round.locked) return;
          btn.classList.add('right');
          reveal();
          correctNow();
        });
      }
    },
    afterCorrect:function(done){
      speak(same?'They are the same.':(askSmaller?WORDS[target]+' is smaller.':WORDS[target]+' is bigger.'),{rate:0.85});
      done();
    },
    help:function(){
      if(same){
        var sb=document.querySelector('.samebtn');
        if(sb) sb.classList.add('hint');
        speak('Both are '+WORDS[a]+'. They are the same.',{rate:0.85});
        return;
      }
      q.wraps.forEach(function(w){
        if(parseInt(w.dataset.v,10)===target){
          w.style.background='rgba(255,224,102,.55)';
          w.animate?w.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:700,iterations:2}):null;
        }
      });
      speak(WORDS[target]+' is '+(askSmaller?'smaller':'bigger')+'.',{rate:0.85});
    }
  };
  function reveal(){
    [a,b].forEach(function(v,i){
      var t=tower(v,{pop:true,stagger:40});
      q.cards[i].style.display='none';
      q.holders[i].appendChild(t);
    });
    var el=document.getElementById('stage');
    fitArrs(el,[{el:q.holders[0].firstChild,n:a,kind:'tower'},
                {el:q.holders[1].firstChild,n:b,kind:'tower'}],0);
    countTower([].slice.call(q.holders[0].querySelectorAll('.blk')),200,null);
  }
  return q;
}

/* ---------- teen numbers ---------- */
function mkTeens(){
  var n=drawNumber(11,20);
  var q={
    sig:'teens:'+n, nums:[n], maxN:10, cols:1,
    promptHTML:'How many?',
    promptSpeech:'Ten and some more. How many?',
    build:function(el){
      var arr=arrTeen(n);
      el.appendChild(arr);
      q.fit=function(){ fitArrs(el,[{el:arr,n:n,kind:'teen'}],0); };
      q.fit();
      askNumber(n,10,20,function(){correctNow();});
    },
    afterCorrect:function(done){
      speak(WORDS[n]+'!',{rate:0.85});
      done();
    },
    help:function(){
      countAloudRange(10,n,150,function(){
        speak('That is '+WORDS[n]+'.',{rate:0.85});
        pulseChoice();
      });
    }
  };
  return q;
}

/* ---------- 9. mix ---------- */
function mkMix(){
  var pickers=[
    function(){return mkCount(10);},
    function(){return mkMatch(9);},
    function(){return mkCompare(9);},
    function(){return mkAdd(5);},
    function(){return mkSub(9);},
    function(){return mkBonds(5);},
    function(){return mkNext(9);},
    function(){return mkQuick(5);},
    function(){return mkNeighbours(10);},
    function(){return mkBigNum(9);},
    function(){return mkTeens();}
  ];
  return pickers[randInt(0,pickers.length-1)]();
}

/* ================= idle replay ================= */
var idleTimer=null;
function armIdle(){
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
  idleTimer=setTimeout(function(){
    idleTimer=null;
    if(round.locked||round.idleReplayed) return;
    round.idleReplayed=true;
    if(round.promptSpeech) speak(round.promptSpeech,{rate:0.9});
  },8000);
}

/* ================= rewards ================= */
var lastReward=-1;
function nextRewardIdx(){
  var i,g=0;
  do{ i=randInt(0,3); g++; }while(i===lastReward&&g<10);
  lastReward=i; return i;
}
function addPoint(amount){
  amount=(amount===undefined)?1:amount;
  var before=progress.points||0;
  progress.points=before+amount;
  saveProgress();
  showStars();
  starSound();
  var box=$('jarTop');
  if(box&&box.animate) box.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],
    {duration:420,easing:'ease-out'});
  if(Math.floor(progress.points/10)>Math.floor(before/10)) jarFull();
}
/* a correct answer after a mistake: half a star and a smaller sparkle */
function effortReward(){
  confetti(9);
  tone(880,0.1,'sine',0.09);
  tone(1180,0.16,'sine',0.07,0.08);
  addPoint(0.5);
}
function danceBlocks(){
  var blks=document.querySelectorAll('#stage .blk');
  for(var i=0;i<blks.length;i++){
    (function(b,k){ b.style.animationDelay=(k*45)+'ms'; b.classList.add('dance');
      later(function(){ b.classList.remove('dance'); b.style.animationDelay=''; },1300+k*45); })(blks[i],i);
  }
}
function jumpTower(){
  var blks=document.querySelectorAll('#stage .blk');
  for(var i=0;i<blks.length;i++){
    (function(b,k){ b.style.animationDelay=(k*40)+'ms'; b.classList.add('jump');
      later(function(){ b.classList.remove('jump'); b.style.animationDelay=''; },900+k*40); })(blks[i],i);
  }
}
function flyStar(done){
  var box=$('jarTop').getBoundingClientRect();
  var stage=$('stage').getBoundingClientRect();
  var x0=stage.left+stage.width/2-19, y0=stage.top+stage.height/2-19;
  var el=document.createElement('div');
  el.className='flystar';
  el.style.left=x0+'px'; el.style.top=y0+'px';
  el.innerHTML='<svg viewBox="0 0 24 24" fill="#f7b731"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z"/></svg>';
  document.body.appendChild(el);
  tone(880,0.12,'sine',0.12);
  requestAnimationFrame(function(){
    var dx=box.left+box.width/2-19-x0, dy=box.top+box.height/2-19-y0;
    el.style.transform='translate('+dx+'px,'+dy+'px) scale(.5)';
    el.style.opacity='.85';
  });
  later(function(){ el.remove(); if(done) done(); },780);
}
var praiseCount=0;
/* her name, but never more than one line in four */
function withName(line){
  praiseCount++;
  var nm=(progress.name||'').trim();
  if(!nm||praiseCount%4!==0) return line;
  return line.replace(/!+$/,'')+', '+nm+'!';
}
function playReward(){
  var i=nextRewardIdx();
  if(i===0){ confetti(); addPoint(1); }
  else if(i===1){ danceBlocks(); addPoint(1); }
  else if(i===2){ flyStar(function(){ addPoint(1); }); }
  else { jumpTower(); addPoint(1); }
}

/* ================= round engine ================= */
var round={stage:null,index:0,locked:true,wins:0,mistakes:0,firstTry:true,q:null,answer:null,zeroUsed:false};

function startStage(id,fromIndex,stageObj){
  clearTimers();
  clearSpeech();
  var st=stageObj||stageById(id);
  if(!st) return;
  var carry=(fromIndex&&progress.carry)?(progress.carry[id]||null):null;
  round={stage:st,index:fromIndex||0,total:st.total||ROUNDS,locked:true,
         wins:carry?(carry.wins||0):0,
         mistakes:0,firstTry:true,q:null,answer:null,
         zeroUsed:carry?!!carry.zeroUsed:false,
         idleReplayed:false,lastSig:null,bags:null};
  $('topTitle').textContent=st.short||st.title;
  setScreen('play');
  buildDots();
  nextRound();
}
function buildDots(){
  var d=$('dots');
  d.innerHTML='';
  var total=round.total||ROUNDS;
  for(var i=0;i<total;i++){
    var s=document.createElement('div');
    s.className='dot'+(i<round.index?' on':'');
    d.appendChild(s);
  }
}
function updateDots(){
  var ds=$('dots').children;
  for(var i=0;i<ds.length;i++) ds[i].classList.toggle('on',i<round.index);
}

function nextRound(){
  clearTimers();
  clearSpeech();
  if(round.index>=ROUNDS){ finishStage(); return; }
  round.locked=false; round.mistakes=0; round.firstTry=true; round.answer=null;
  round.idleReplayed=false;
  updateDots();

  var stage=$('stage');
  stage.className='stage';
  stage.innerHTML='';
  stage.appendChild(floorEl());
  $('choices').innerHTML='';

  var q=round.stage.make(), tries=0;
  while(q.sig&&q.sig===round.lastSig&&tries++<5) q=round.stage.make();
  round.lastSig=q.sig;
  round.q=q;
  fitStage(stage,q.maxN||10,q.cols||2);
  q.build(stage);
  setPrompt(q.promptHTML,q.promptSpeech);
  armIdle();
}

function setPrompt(html,speechText){
  $('qText').innerHTML=html;
  round.promptSpeech=speechText||'';
  if(speechText) speak(speechText);
}

function correctNow(){
  if(round.locked) return;
  round.locked=true;
  var firstTry=round.firstTry;
  if(firstTry) round.wins++;
  round.index++;
  updateDots();
  progress.rounds=(progress.rounds||0)+1;
  if(round.index<(round.total||ROUNDS)&&round.stage.id!=='warmup'){
    progress.carry=progress.carry||{};
    progress.carry[round.stage.id]={index:round.index,wins:round.wins,zeroUsed:round.zeroUsed};
  }
  saveProgress();
  addPlayTime();
  logAnswer(round.q&&round.q.nums,true);

  yesSound();
  // once in a while, a counting answer is followed by tracing the numeral
  if(round.stage&&(round.stage.id==='count5'||round.stage.id==='count10')&&Math.random()<1/3){
    round.traceNext=true;
  }
  var praise;
  if(firstTry){
    playReward();
    praise=PRAISE[randInt(0,PRAISE.length-1)];
  }else{
    effortReward();
    praise=PERSIST[randInt(0,PERSIST.length-1)];
  }
  praise=withName(praise);
  setPrompt(praise,praise);

  var q=round.q;
  later(function(){
    if(q&&q.afterCorrect) q.afterCorrect(finishRound);
    else finishRound();
  },420);
}

function finishRound(){
  var total=round.total||ROUNDS;
  if(round.index>=total){ finishStage(); return; }
  var label=round.index>=total-1?'Finish':'Next';
  if(round.traceNext){
    round.traceNext=false;
    var num=(round.q&&round.q.nums&&round.q.nums[0])||0;
    showTrace(num,function(){ showNext(label,nextRound); });
    return;
  }
  showNext(label,nextRound);
}

function wrongNow(btn,msg){
  if(round.locked) return;
  round.firstTry=false;
  round.mistakes++;
  addPlayTime();
  logAnswer(round.q&&round.q.nums,false);
  noSound();
  if(btn&&!btn.disabled){
    btn.classList.add('wrong');
    btn.disabled=true;            // a wrong answer stays out of reach for this question
  }
  speak(msg||NUDGE[randInt(0,NUDGE.length-1)],{rate:0.92});
  if(round.q&&round.q.onWrong) round.q.onWrong(round.mistakes);
  if(round.mistakes===2&&round.q.help) later(function(){round.q.help();},500);
}

function showChoices(list,onPick){
  var wrap=$('choices');
  wrap.innerHTML='';
  list.forEach(function(v){
    var b=document.createElement('button');
    b.className='choice';
    b.textContent=v;
    b.setAttribute('aria-label',WORDS[v]||String(v));
    b.addEventListener('click',function(){
      if(round.locked) return;
      onPick(v,b);
    });
    wrap.appendChild(b);
  });
}
function showNext(label,fn){
  var wrap=$('choices');
  wrap.innerHTML='';
  var b=document.createElement('button');
  b.className='nextbtn';
  b.innerHTML=(label||'Next')+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  b.addEventListener('click',function(){popSound();fn();});
  wrap.appendChild(b);
}

/* ================= stage complete ================= */
function finishStage(){
  clearTimers();
  var st=round.stage;
  if(st.id==='warmup'){ finishWarmup(); return; }
  progress.lastSeen=Date.now();
  progress.recent=(progress.recent||[]).filter(function(id){ return id!==st.id; });
  progress.recent.unshift(st.id);
  progress.recent=progress.recent.slice(0,4);
  var stars=round.wins>=4?3:(round.wins>=2?2:1);
  if(progress.carry) delete progress.carry[st.id];
  progress.stickers=progress.stickers||{};
  var prevSticker=progress.stickers[st.id]||0;
  var newSticker=Math.max(prevSticker,stars===3?2:1);
  progress.stickers[st.id]=newSticker;
  var isNewSticker=newSticker>prevSticker;
  var prev=progress.stars[st.id]||0;
  if(stars>prev) progress.stars[st.id]=stars;
  if(stars===3){
    progress.threeStarDays=progress.threeStarDays||{};
    var days=progress.threeStarDays[st.id]=progress.threeStarDays[st.id]||[];
    var today=dayKey(new Date());
    if(days.indexOf(today)===-1) days.push(today);
  }
  var idx0=stageIndex(st.id);
  if(stars>=2&&STAGES[idx0+1]){
    progress.unlocked=progress.unlocked||{};
    progress.unlocked[STAGES[idx0+1].id]=true;   // two stars or more opens the next stage
  }
  // two threes in a row steps this stage up; two ones steps it back down
  progress.hist=progress.hist||{};
  var hist=progress.hist[st.id]=progress.hist[st.id]||[];
  hist.push(stars);
  if(hist.length>4) hist.shift();
  if(hist.length>=2){
    var p1=hist[hist.length-2], p2=hist[hist.length-1];
    progress.levels=progress.levels||{};
    var L=progress.levels[st.id]||0;
    if(p1===3&&p2===3) progress.levels[st.id]=Math.min(1,L+1);
    else if(p1===1&&p2===1) progress.levels[st.id]=Math.max(-1,L-1);
  }
  saveProgress();
  showStars();
  setScreen('done');

  var svgs=$('doneStars').children;
  for(var i=0;i<svgs.length;i++) svgs[i].classList.remove('lit');
  for(var j=0;j<stars;j++){
    (function(k){ later(function(){ svgs[k].classList.add('lit'); starSound(); },450+k*330); })(j);
  }
  later(function(){ confetti(); fanfare(); },300);

  var idx=stageIndex(st.id);
  var nextStage=STAGES[idx+1];
  var canNext=!!nextStage&&isUnlocked(idx+1);
  if(isNewSticker){
    $('doneStickerArt').innerHTML=stickerSVG(st.id);
    $('doneSticker').classList.add('show');
    $('doneSticker').classList.toggle('shiny',newSticker===2);
  }else{
    $('doneSticker').classList.remove('show','shiny');
  }
  $('doneTitle').textContent=stars===3?'Brilliant!':(stars===2?'Well done!':'Good try!');
  $('doneTxt').textContent=stars===3
    ? 'You got three stars!'
    : (stars===2?'You got two stars. One more go for three!':'You got one star. Play again?');
  if(canNext){
    $('nextStageBtn').textContent='Next: '+nextStage.title;
    $('nextStageBtn').onclick=function(){ popSound(); startStage(nextStage.id); };
    $('againBtn').textContent='Play this stage again';
    $('againBtn').onclick=function(){ popSound(); startStage(st.id); };
  }else{
    $('nextStageBtn').textContent='Play again';
    $('nextStageBtn').onclick=function(){ popSound(); startStage(st.id); };
    $('againBtn').textContent='Back to the map';
    $('againBtn').onclick=function(){ popSound(); goMap(); };
  }

  var msg=stars===3?'You got three stars! Brilliant!':(stars===2?'You got two stars! Well done!':'You got one star! Good try!');
  if(isNewSticker) later(function(){ speak('New sticker!',{rate:0.95}); },420);
  later(function(){ speak(msg,{rate:0.9}); },isNewSticker?1500:500);

  // three stages in one sitting and the game says goodbye
  sessionStages.push(st.id);
  if(sessionStages.length===3&&!goodbyeDone){
    goodbyeDone=true;
    scheduleGoodbye();
  }
}

/* ================= goodbye summary ================= */
var sessionStages=[],goodbyeDone=false;
var STAGE_PHRASE={
  count5:'counted to five', quick5:'did a quick look', match5:'found the numbers',
  compare5:'compared more and fewer', count10:'counted to ten', build10:'built towers',
  bonds5:'made five', add5:'added up', sub10:'took away', next10:'found what comes next',
  neighbours10:'found number neighbours', bignum10:'found the bigger number',
  teens:'counted the teens', mix10:'did a bit of everything'
};
function listOf(a){
  if(!a.length) return '';
  if(a.length===1) return a[0];
  return a.slice(0,-1).join(', ')+' and '+a[a.length-1];
}
function jarText(){
  var pts=progress.points||0, whole=Math.floor(pts);
  return (WORDS[whole]||String(whole))+(pts%1?' and a half':'');
}
function speechBusy(){ return speaking||sq.length>0; }
/* Say the summary once the finish screen has finished talking. If she has
   already moved on, say it anyway — it must always be heard after stage three. */
function scheduleGoodbye(){
  var started=false, t0=Date.now();
  (function waitTurn(){
    if(started) return;
    var left=curScreen!=='done';
    if(left||!speechBusy()||Date.now()-t0>15000){
      started=true;
      sayGoodbye();
      return;
    }
    setTimeout(waitTurn,200);
  })();
}
function sayGoodbye(){
  var nm=(progress.name||'').trim();
  var phrases=sessionStages.slice(-3).map(function(id){ return STAGE_PHRASE[id]||'played'; });
  speak((nm?'Well done, '+nm+'! ':'')+'Today you '+listOf(phrases)+'. Your jar has '+jarText()+' stars!',{rate:0.88});
  speak('Time for a little break. See you tomorrow!',{rate:0.88});
  onSpeechIdle(function(){
    if(curScreen==='done') setTimeout(function(){ if(curScreen==='done') goMap(); },700);
  });
}

/* ================= screens ================= */
function setScreen(name){
  var _sc=$('s-'+name); if(_sc){ _sc.classList.remove('enter'); void _sc.offsetWidth; _sc.classList.add('enter'); }
  clearTimers();
  clearSpeech();
  curScreen=name;
  ['map','play','done','grown','stickers'].forEach(function(s){
    $('s-'+s).classList.toggle('active',s===name);
  });
  document.body.dataset.screen=name;
  $('backBtn').classList.toggle('hidden',name==='map');
  if(name==='map'){ $('topTitle').textContent=''; renderHome(); }
  if(name==='grown'){
    renderDash();
    if($('nameInput')) $('nameInput').value=progress.name||'';
  }
  if(name==='stickers') renderStickers();
  if(name==='grown') renderCourse();
  syncMusic();
}
function goMap(){ setScreen('map'); }

/* ================= map ================= */
function starSvg(lit){
  return '<svg viewBox="0 0 24 24" fill="'+(lit?'#f7b731':'#dbe6f0')+'"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z"/></svg>';
}
function currentStage(){
  for(var i=0;i<STAGES.length;i++){
    if(!isUnlocked(i)) continue;
    if((progress.stars[STAGES[i].id]||0)<3) return {i:i,st:STAGES[i]};
  }
  return {i:STAGES.length-1,st:STAGES[STAGES.length-1]};
}
function firstLockedStage(){
  for(var i=0;i<STAGES.length;i++){ if(!isUnlocked(i)) return {i:i,st:STAGES[i]}; }
  return null;
}
function openStage(st){
  popSound();
  var c=progress.carry&&progress.carry[st.id];
  if(c&&c.index>0&&c.index<ROUNDS){ showCarry(st,c.index); }
  else startStage(st.id);
}
var lastStoneId=null,lastStoneTime=0;
function renderHome(){
  showStars();
  var cur=currentStage();
  $('playBtn').innerHTML=stickerSVG(cur.st.id);
  $('playBtn').setAttribute('aria-label','Play '+cur.st.title);

  var nl=firstLockedStage();
  var nextId=nl?nl.st.id:null;
  var flipId=null;
  if(progress.teasedId&&progress.teasedId!==nextId){
    var ti=stageIndex(progress.teasedId);
    if(ti>=0&&isUnlocked(ti)) flipId=progress.teasedId;
  }
  progress.teasedId=nextId;
  saveProgress();

  var stones=[];
  var recent=(progress.recent||[]).filter(function(id){ return id!==cur.st.id; }).slice(0,2);
  recent.reverse();
  recent.forEach(function(id){ var st=stageById(id); if(st) stones.push({st:st,kind:'past'}); });
  stones.push({st:cur.st,kind:'now'});
  if(flipId){ var fs=stageById(flipId); if(fs) stones.push({st:fs,kind:'flip'}); }
  if(nl) stones.push({st:nl.st,kind:'locked'});
  stones=stones.slice(-4);

  var trail=$('trail');
  trail.innerHTML='';
  stones.forEach(function(item,i){
    var b=document.createElement('button');
    var cls='stone '+(i%2?'down':'up');
    if(item.kind==='now') cls+=' now';
    if(item.kind==='locked') cls+=' q';
    if(item.kind==='flip') cls+=' flip';
    b.className=cls;
    b.setAttribute('aria-label',item.st.title);
    if(item.kind==='locked') b.textContent='?';
    else{
      var stars=progress.stars[item.st.id]||0;
      b.innerHTML=stickerSVG(item.st.id)+
        '<span class="stars">'+starSvg(stars>0)+starSvg(stars>1)+starSvg(stars>2)+'</span>';
    }
    b.addEventListener('click',function(){
      if(item.kind==='locked'){ speak('That one is next!',{rate:0.95}); return; }
      var now=Date.now();
      if(lastStoneId===item.st.id&&now-lastStoneTime<2600){
        lastStoneId=null;
        openStage(item.st);
        return;
      }
      lastStoneId=item.st.id;
      lastStoneTime=now;
      speak(item.st.title,{rate:0.95});
    });
    trail.appendChild(b);
  });

  if(flipId){
    setTimeout(function(){ confetti(18); fanfare(); },350);
    setTimeout(renderHome,1600);
  }
}
function renderCourse(){
  var el=$('course');
  if(!el) return;
  el.innerHTML='';
  STAGES.forEach(function(st,i){
    var stars=progress.stars[st.id]||0;
    var unlocked=isUnlocked(i);
    var row=document.createElement('div');
    row.className='crow'+(unlocked?'':' locked')+(isMastered(st.id)?' mastered':'');
    var line=document.createElement('div');
    line.className='cline';
    line.innerHTML='<span class="cnum">'+(i+1)+'</span>'+
      '<span class="clk">'+(unlocked?'':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>')+'</span>'+
      '<span class="cart">'+stickerSVG(st.id)+'</span>'+
      '<span class="cname">'+st.title+'</span>'+
      '<span class="cstars">'+starSvg(stars>0)+starSvg(stars>1)+starSvg(stars>2)+'</span>';
    row.appendChild(line);
    var btns=document.createElement('div');
    btns.className='cbtns';
    var play=document.createElement('button');
    play.className='minibtn';
    play.textContent='Play now';
    play.addEventListener('click',function(){ openStage(st); });
    var unlock=document.createElement('button');
    unlock.className='minibtn';
    unlock.textContent=unlocked?'Unlocked':'Unlock';
    unlock.disabled=unlocked;
    unlock.addEventListener('click',function(){
      progress.unlocked=progress.unlocked||{};
      progress.unlocked[st.id]=true;
      saveProgress();
      popSound();
      renderCourse();
      renderHome();
    });
    btns.appendChild(play);
    btns.appendChild(unlock);
    row.appendChild(btns);
    el.appendChild(row);
  });
}
function shapeSVG(key){
  var p=PAT_SHAPES[key];
  var inner=p.s==='circle'?'<circle cx="12" cy="12" r="10" fill="'+p.c+'"/>'
    :p.s==='square'?'<rect x="2" y="2" width="20" height="20" rx="5" fill="'+p.c+'"/>'
    :'<path d="M12 2.5L22 20.5H2z" fill="'+p.c+'"/>';
  return '<svg viewBox="0 0 24 24">'+inner+'</svg>';
}
function mkPattern(){
  var type=pick(['AB','AAB','ABC']);
  var unit=type==='AB'?['A','B']:(type==='AAB'?['A','A','B']:['A','B','C']);
  var len=5;
  var ans=unit[len%unit.length];
  var q={
    sig:'pattern:'+type, nums:[], maxN:2, cols:1,
    promptHTML:'What comes next?',
    promptSpeech:'Look at the pattern. What comes next?',
    build:function(el){
      el.classList.add('col');
      el.style.justifyContent='center';
      var row=document.createElement('div');
      row.className='pat-row';
      el.appendChild(row);
      var tiles=[];
      for(var i=0;i<len;i++){
        var t=document.createElement('div');
        t.className='pat-tile';
        t.innerHTML=shapeSVG(unit[i%unit.length]);
        row.appendChild(t);
        tiles.push(t);
      }
      var qs=document.createElement('div');
      qs.className='pat-tile q';
      qs.textContent='?';
      row.appendChild(qs);
      q.qs=qs;
      var W=el.clientWidth-20;
      var tile=Math.max(26,Math.min(46,Math.floor((W-(len)*6)/ (len+1))));
      row.style.setProperty('--tile',tile+'px');
      askNumberShape(ans,function(){correctNow();});
    },
    afterCorrect:function(done){
      q.qs.innerHTML=shapeSVG(ans);
      q.qs.classList.remove('q');
      q.qs.classList.add('pop');
      speak('Yes! The pattern goes on.',{rate:0.88});
      done();
    },
    help:function(){
      pulseChoice();
      speak('Look at the pattern again.',{rate:0.9});
    }
  };
  return q;
}
/* choices made of shapes rather than numbers */
function askNumberShape(ans,onRight){
  var wrap=$('choices');
  wrap.innerHTML='';
  round.answer=null;
  var keys=shuffle(['A','B','C']);
  keys.forEach(function(k){
    var b=document.createElement('button');
    b.className='choice shapechoice';
    b.dataset.key=k;
    b.innerHTML=shapeSVG(k);
    b.addEventListener('click',function(){
      if(round.locked||b.disabled) return;
      if(k===ans){ b.classList.add('right'); onRight(); }
      else{ b.classList.add('wrong'); b.disabled=true; wrongNow(null); }
    });
    wrap.appendChild(b);
  });
}
function mkSort(){
  var kinds=pick([['mango','ball'],['bird','mango'],['ball','star']]);
  var colors={mango:'#f2a33c',ball:'#e8453c',bird:'#3f51b5',star:'#f5c518'};
  var names={mango:'mangoes',ball:'balls',bird:'birds',star:'stars'};
  var ka=kinds[0], kb=kinds[1];
  var na=randInt(2,5), nb=randInt(1,4);
  var pileList=[];
  for(var i=0;i<na;i++) pileList.push(ka);
  for(var j=0;j<nb;j++) pileList.push(kb);
  pileList=shuffle(pileList);
  var q={
    sig:'sort:'+ka+'-'+kb+':'+na+'-'+nb, nums:[na,nb], maxN:5, cols:2,
    promptHTML:'Sort them into the baskets',
    promptSpeech:'Put each one in its basket. Then we will count them.',
    build:function(el){
      el.classList.add('col');
      el.style.justifyContent='center';
      var pile=document.createElement('div');
      pile.className='pile';
      el.appendChild(pile);
      var bwrap=document.createElement('div');
      bwrap.className='baskets';
      el.appendChild(bwrap);
      var baskets={};
      [ka,kb].forEach(function(k){
        var b=document.createElement('div');
        b.className='basket';
        b.dataset.kind=k;
        var head=document.createElement('div');
        head.className='bhead';
        head.appendChild(svgObj(k,colors[k]));
        var items=document.createElement('div');
        items.className='bitems';
        b.appendChild(head);
        b.appendChild(items);
        bwrap.appendChild(b);
        baskets[k]=b;
      });
      var picked=null;
      pileList.forEach(function(k){
        var o=document.createElement('div');
        o.className='objwrap';
        o.dataset.kind=k;
        o.appendChild(svgObj(k,colors[k]));
        o.addEventListener('click',function(){
          if(round.locked) return;
          if(picked===o){ o.classList.remove('picked'); picked=null; return; }
          if(picked) picked.classList.remove('picked');
          picked=o;
          o.classList.add('picked');
          popSound();
          speak(k===ka?names[ka].replace(/s$/,''):names[kb].replace(/s$/,''),{rate:0.9});
        });
        pile.appendChild(o);
      });
      [ka,kb].forEach(function(k){
        baskets[k].addEventListener('click',function(){
          if(round.locked||!picked) return;
          if(picked.dataset.kind===k){
            var target=baskets[k].querySelector('.bitems');
            picked.classList.remove('picked');
            target.appendChild(picked);
            picked=null;
            popSound();
            if(!pile.querySelector('.objwrap')) later(askCounts,400);
          }else{
            picked.animate?picked.animate([{transform:'translateY(-12px)'},{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'translateY(-12px)'}],{duration:320}):null;
            tone(300,0.14,'sine',0.09);
            speak('That goes in the other basket.',{rate:0.92});
          }
        });
      });
      function askCounts(){
        setPrompt('How many '+names[ka]+'?','How many '+names[ka]+'?');
        askNumber(na,1,10,function(){
          setPrompt('How many '+names[kb]+'?','How many '+names[kb]+'?');
          askNumber(nb,1,10,function(){ correctNow(); });
        });
      }
    },
    afterCorrect:function(done){
      speak(WORDS[na]+' '+names[ka]+' and '+WORDS[nb]+' '+names[kb]+'. Well done!',{rate:0.85});
      done();
    },
    help:function(){
      pulseChoice();
      speak('Count them in the basket.',{rate:0.9});
    }
  };
  return q;
}
function mkPatternsStage(){
  return round.index>=3?mkSort():mkPattern();
}

/* ================= trace the numeral ================= */
var TRACE_PATHS={
  0:['M50 18 C26 18 16 44 16 70 C16 98 26 122 50 122 C74 122 84 98 84 70 C84 44 74 18 50 18 Z'],
  1:['M34 40 L52 18 L52 122'],
  2:['M20 44 C20 20 80 18 80 48 C80 72 24 104 20 122 L84 122'],
  3:['M24 24 C44 10 82 18 82 44 C82 62 62 68 50 68 C64 68 84 74 84 96 C84 122 46 132 24 116'],
  4:['M64 122 L64 18 L20 90 L86 90'],
  5:['M80 20 L32 20 L28 66 C42 56 80 56 82 88 C84 118 46 130 24 114'],
  6:['M76 20 C44 24 24 58 24 88 C24 114 42 128 58 128 C74 128 84 114 84 100 C84 84 70 74 56 76 C40 78 30 92 34 106'],
  7:['M20 20 L82 20 L44 124'],
  8:['M50 70 C30 70 22 58 22 44 C22 26 36 18 50 18 C64 18 78 26 78 44 C78 58 70 70 50 70 C28 70 20 84 20 100 C20 116 34 126 50 126 C66 126 80 116 80 100 C80 84 72 70 50 70'],
  9:['M78 58 C78 34 66 20 50 20 C34 20 24 32 24 48 C24 64 34 74 50 74 C68 74 78 60 78 44 L78 88 C78 110 64 126 46 126'],
  10:['M26 42 L38 26 L38 122','M72 26 C58 26 52 44 52 72 C52 100 58 122 72 122 C86 122 92 100 92 72 C92 44 86 26 72 26 Z']
};
function showTrace(num,done){
  var stage=$('stage');
  stage.className='stage';
  stage.innerHTML='';
  var wrap=document.createElement('div');
  wrap.className='tracewrap';
  stage.appendChild(wrap);

  var NS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 100 140');
  svg.setAttribute('class','trace-svg');
  wrap.appendChild(svg);

  var guides=[];
  (TRACE_PATHS[num]||TRACE_PATHS[1]).forEach(function(d){
    var p=document.createElementNS(NS,'path');
    p.setAttribute('d',d);
    p.setAttribute('class','guide');
    svg.appendChild(p);
    guides.push(p);
  });
  var trail=document.createElementNS(NS,'polyline');
  trail.setAttribute('class','trail');
  trail.setAttribute('points','');
  svg.appendChild(trail);

  // sample the path so we can tell when she has covered it
  var samples=[];
  guides.forEach(function(p){
    var L=p.getTotalLength();
    var steps=Math.max(24,Math.round(L/6));
    for(var i=0;i<=steps;i++) samples.push(p.getPointAtLength(L*i/steps));
  });
  // ordered checkpoints: she must pass them in order along the path
  var next=0, cps=[];
  samples.forEach(function(q,i){
    var c=document.createElementNS(NS,'circle');
    c.setAttribute('class','cp'); c.setAttribute('r','2.6');
    c.setAttribute('cx',q.x); c.setAttribute('cy',q.y);
    svg.appendChild(c); cps.push(c);
  });
  function markNext(){
    cps.forEach(function(c,i){ c.setAttribute('class', i<next?'cp hit':(i===next?'cp nextcp':'cp')); });
  }

  var dot=document.createElementNS(NS,'circle');
  dot.setAttribute('class','startdot pulse');
  dot.setAttribute('r','7');
  dot.setAttribute('cx',samples[0].x);
  dot.setAttribute('cy',samples[0].y);
  svg.appendChild(dot);
  markNext();

  setPrompt('Trace the '+num,'Trace the number '+WORDS[num]+'. Start at the dot.');
  speak('Trace the number '+WORDS[num]+'. Start at the yellow dot.',{rate:0.9});

  var choices=$('choices');
  choices.innerHTML='';
  var skip=document.createElement('button');
  skip.className='skipbtn';
  skip.textContent='Skip';
  skip.addEventListener('click',function(){ finish(false); });
  choices.appendChild(skip);

  var finished=false, drawing=false, pts=[];
  function toSvg(e){
    var pt=svg.createSVGPoint();
    pt.x=e.clientX; pt.y=e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function onMove(e){
    if(finished) return;
    var p=toSvg(e);
    pts.push(Math.round(p.x)+','+Math.round(p.y));
    trail.setAttribute('points',pts.join(' '));
    var R=12, LOOK=3, adv=true;
    while(adv && next<samples.length){
      adv=false;
      for(var j=next;j<Math.min(samples.length,next+LOOK+1);j++){
        var dx=samples[j].x-p.x, dy=samples[j].y-p.y;
        if(dx*dx+dy*dy<R*R){ next=j+1; adv=true; break; }
      }
    }
    markNext();
    if(next>=samples.length) finish(true);
  }
  function onDown(e){
    if(finished) return;
    drawing=true;
    pts=[];
    dot.classList.remove('pulse');
    try{ svg.setPointerCapture(e.pointerId); }catch(err){}
    onMove(e);
    e.preventDefault();
  }
  function onUp(){ drawing=false; }
  svg.addEventListener('pointerdown',onDown);
  svg.addEventListener('pointermove',function(e){ if(drawing) onMove(e); });
  svg.addEventListener('pointerup',onUp);
  svg.addEventListener('pointercancel',onUp);
  svg.addEventListener('pointerleave',onUp);

  function finish(ok){
    if(finished) return;
    finished=true;
    svg.classList.add('done');
    if(ok){
      confetti(14);
      speak('Well done!',{rate:0.92});
      setTimeout(function(){ done(); },900);
    }else{
      done();
    }
  }
}

/* ================= warm-up, mastery, weekly tip ================= */
function isMastered(id){
  return !!(progress.threeStarDays&&progress.threeStarDays[id]&&progress.threeStarDays[id].length>=2);
}
var pendingWarmup=false,pendingStageId=null;
function startWarmup(){
  var played=STAGES.filter(function(st){ return (progress.stars[st.id]||0)>0; });
  if(!played.length) return false;
  var picks=shuffle(played.slice()).slice(0,3);
  var i=0;
  var stage={id:'warmup',title:'Warm-up',short:'Warm-up',sub:'',total:3,maxN:10,cols:2,
    make:function(){
      var st=picks[Math.min(i,picks.length-1)];
      i++;
      return st.make();
    }};
  startStage(stage.id,0,stage);
  return true;
}
function finishWarmup(){
  clearTimers();
  progress.points=(progress.points||0)+0.5;
  saveProgress();
  showStars();
  speak('Nice warm-up! You still remember.',{rate:0.9});
  if(pendingStageId){
    var id=pendingStageId;
    pendingStageId=null;
    setTimeout(function(){ startStage(id); },600);
    return;
  }
  setScreen('map');
}
function weekIndex(){
  var now=new Date();
  var jan1=new Date(now.getFullYear(),0,1);
  return Math.floor(((now-jan1)/86400000+jan1.getDay())/7);
}
var HOME_TIPS=[
  'Count out {n} things together — spoons, steps, claps, stairs.',
  'Put {n} grapes on a plate, then add one more. How many now?',
  'Line up {n} toys and count them, then count them backwards.',
  'Ask her to fetch {n} of something — socks, blocks, biscuits.',
  'Make {n} with two plates: how many on each?',
  'Show {n} fingers, hide some behind your back. How many are hiding?'
];
function weakNumber(){
  var stats={};
  answerLog.forEach(function(e){
    (e.n||[]).forEach(function(n){
      if(n<1||n>20) return;
      stats[n]=stats[n]||{t:0,ok:0};
      stats[n].t++; if(e.ok) stats[n].ok++;
    });
  });
  var worst=null,acc=1.01;
  Object.keys(stats).forEach(function(k){
    if(stats[k].t<2) return;
    var a=stats[k].ok/stats[k].t;
    if(a<acc){ acc=a; worst=parseInt(k,10); }
  });
  return worst;
}
function homeTip(){
  var w=weekIndex();
  var tip=HOME_TIPS[w%HOME_TIPS.length];
  var n=weakNumber();
  if(!n) n=Math.round((progress.points||0)%9)+2;
  n=Math.max(2,Math.min(10,Math.round(n)));
  return tip.replace('{n}',n);
}

/* ================= stickers ================= */
var STICKERS={
  count5:'<rect x="14" y="26" width="36" height="34" rx="9" fill="#e8453c"/>'+
    '<circle cx="26" cy="40" r="4.2" fill="#fff"/><circle cx="38" cy="40" r="4.2" fill="#fff"/>'+
    '<circle cx="27" cy="41" r="1.9" fill="#25314a"/><circle cx="39" cy="41" r="1.9" fill="#25314a"/>'+
    '<path d="M26 49q6 5 12 0" stroke="#7a1f18" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
    '<path d="M32 4l9 20H23z" fill="#ec4a8f"/><circle cx="32" cy="4" r="3.4" fill="#ffd93d"/>',
  quick5:'<path d="M32 6L37 21 52 26 37 31 32 46 27 31 12 26 27 21Z" fill="#f7b731"/>'+
    '<circle cx="14" cy="12" r="3" fill="#ffe066"/><circle cx="50" cy="50" r="2.6" fill="#ffe066"/>'+
    '<circle cx="52" cy="14" r="2" fill="#ffe066"/>',
  match5:'<circle cx="28" cy="28" r="16" fill="#eaf4ff" stroke="#3f51b5" stroke-width="5"/>'+
    '<circle cx="28" cy="28" r="9" fill="#bfe6ff"/>'+
    '<rect x="38" y="40" width="18" height="8" rx="4" transform="rotate(45 47 44)" fill="#3f51b5"/>',
  compare5:'<rect x="30" y="12" width="4" height="38" rx="2" fill="#8d6e63"/>'+
    '<rect x="14" y="16" width="36" height="4" rx="2" fill="#8d6e63"/>'+
    '<path d="M14 20l-6 11h12z" fill="#29a3e0"/><path d="M50 20l-6 11h12z" fill="#ec4a8f"/>'+
    '<rect x="20" y="50" width="24" height="4" rx="2" fill="#8d6e63"/>',
  count10:'<rect x="20" y="42" width="24" height="15" rx="5" fill="#e8453c"/>'+
    '<rect x="20" y="26" width="24" height="15" rx="5" fill="#f5c518"/>'+
    '<rect x="20" y="10" width="24" height="15" rx="5" fill="#29a3e0"/>'+
    '<circle cx="28" cy="17" r="2.4" fill="#fff"/><circle cx="36" cy="17" r="2.4" fill="#fff"/>'+
    '<circle cx="28.6" cy="17.6" r="1.1" fill="#25314a"/><circle cx="36.6" cy="17.6" r="1.1" fill="#25314a"/>',
  build10:'<rect x="10" y="10" width="30" height="14" rx="4" fill="#8fa3b8"/>'+
    '<rect x="24" y="24" width="7" height="30" rx="3.5" fill="#c2703d"/>'+
    '<rect x="44" y="26" width="10" height="10" rx="2" fill="#f5c518"/>'+
    '<rect x="47" y="36" width="10" height="10" rx="2" fill="#5cb85c"/>',
  bonds5:'<path d="M32 56C10 42 8 24 19 18c6-3.5 11 0 13 5 2-5 7-8.5 13-5 11 6 9 24-13 38z" fill="#ec4a8f"/>'+
    '<path d="M32 12v38" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 4" opacity=".8"/>',
  add5:'<rect x="12" y="12" width="40" height="40" rx="11" fill="#5cb85c"/>'+
    '<path d="M32 22v20M22 32h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  sub10:'<rect x="12" y="12" width="40" height="40" rx="11" fill="#29a3e0"/>'+
    '<path d="M22 32h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  next10:'<path d="M32 4c8 8 12 18 12 28l-12 8-12-8c0-10 4-20 12-28z" fill="#e8453c"/>'+
    '<circle cx="32" cy="26" r="5.2" fill="#bfe6ff"/>'+
    '<path d="M20 34l-6 13 10-4zM44 34l6 13-10-4z" fill="#f5c518"/>'+
    '<path d="M28 44h8l-4 14z" fill="#f7b731"/>',
  neighbours10:'<path d="M12 30L32 12l20 18v22H12z" fill="#f5c518"/>'+
    '<rect x="26" y="38" width="12" height="14" rx="2" fill="#c2703d"/>'+
    '<rect x="16" y="30" width="9" height="9" rx="2" fill="#bfe6ff"/>'+
    '<rect x="39" y="30" width="9" height="9" rx="2" fill="#bfe6ff"/>',
  bignum10:'<ellipse cx="30" cy="36" rx="20" ry="15" fill="#8fa3b8"/>'+
    '<circle cx="46" cy="30" r="10" fill="#8fa3b8"/>'+
    '<path d="M50 34q6 7 2 15" stroke="#8fa3b8" stroke-width="6" fill="none" stroke-linecap="round"/>'+
    '<circle cx="49" cy="27" r="2.4" fill="#20304a"/>'+
    '<rect x="17" y="46" width="7" height="11" rx="3" fill="#7b8ea6"/>'+
    '<rect x="30" y="46" width="7" height="11" rx="3" fill="#7b8ea6"/>'+
    '<path d="M12 30q-7-2-7 6" stroke="#7b8ea6" stroke-width="4" fill="none" stroke-linecap="round"/>',
  teens:'<circle cx="32" cy="32" r="13" fill="#f7b731"/>'+
    '<g stroke="#f7b731" stroke-width="4" stroke-linecap="round">'+
    '<path d="M32 6v7M32 51v7M6 32h7M51 32h7M14 14l5 5M45 45l5 5M50 14l-5 5M19 45l-5 5"/></g>'+
    '<circle cx="27" cy="30" r="1.9" fill="#8a5a00"/><circle cx="37" cy="30" r="1.9" fill="#8a5a00"/>'+
    '<path d="M27 37q5 4 10 0" stroke="#8a5a00" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  track:'<path d="M12 52V32a7 7 0 0 1 7-7h14a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H20" '+
    'stroke="#8fa3b8" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="12" cy="52" r="6.5" fill="#f7b731"/>'+
    '<path d="M40 16V4l11 4.5L40 13z" fill="#e8453c"/>'+
    '<rect x="37.6" y="3" width="2.8" height="16" rx="1.4" fill="#8d6e63"/>',
  patterns:'<circle cx="14" cy="20" r="9" fill="#e8453c"/><rect x="27" y="11" width="18" height="18" rx="5" fill="#29a3e0"/>'+
    '<path d="M46 29l9-16 9 16z" fill="#f5c518"/><circle cx="16" cy="45" r="7" fill="#e8453c"/>'+
    '<rect x="28" y="38" width="14" height="14" rx="4" fill="#29a3e0"/>',
  story:'<path d="M9 10h46a7 7 0 0 1 7 7v20a7 7 0 0 1-7 7H33l-12 10V44H9a7 7 0 0 1-7-7V17a7 7 0 0 1 7-7z" '+
    'fill="#fff" stroke="#20304a" stroke-width="2.6" stroke-linejoin="round"/>'+
    '<ellipse cx="28" cy="28" rx="9" ry="7" fill="#3f51b5"/><circle cx="35" cy="21" r="5" fill="#3f51b5"/>'+
    '<path d="M39.6 21l4.4 2.2-4.4 2.2z" fill="#f5c518"/><circle cx="36.4" cy="19.8" r="1.2" fill="#20304a"/>',
  make10:'<rect x="6" y="13" width="52" height="38" rx="7" fill="#fff" stroke="#20304a" stroke-width="2.4"/>'+
    '<g fill="#12a5a5"><circle cx="14" cy="22" r="3.4"/><circle cx="23" cy="22" r="3.4"/><circle cx="32" cy="22" r="3.4"/>'+
    '<circle cx="41" cy="22" r="3.4"/><circle cx="50" cy="22" r="3.4"/><circle cx="14" cy="40" r="3.4"/></g>'+
    '<g fill="none" stroke="#c9d8e6" stroke-width="1.8"><circle cx="23" cy="40" r="3.4"/><circle cx="32" cy="40" r="3.4"/>'+
    '<circle cx="41" cy="40" r="3.4"/><circle cx="50" cy="40" r="3.4"/></g>',
  doubles:'<g fill="#8e5bd0"><circle cx="18" cy="20" r="5"/><circle cx="18" cy="32" r="5"/><circle cx="18" cy="44" r="5"/></g>'+
    '<g fill="#f5c518"><circle cx="46" cy="20" r="5"/><circle cx="46" cy="32" r="5"/><circle cx="46" cy="44" r="5"/></g>'+
    '<path d="M32 22v20M26 32h12" stroke="#20304a" stroke-width="4" stroke-linecap="round"/>',
  mix10:'<path d="M32 10c14 0 24 10 24 24S46 56 32 56 8 46 8 34 18 10 32 10z" fill="#f2a33c"/>'+
    '<path d="M32 10c-2-4 0-7 4-8" stroke="#4f9c3a" stroke-width="3" fill="none" stroke-linecap="round"/>'+
    '<ellipse cx="24" cy="24" rx="5" ry="3" fill="#fff" opacity=".45" transform="rotate(-25 24 24)"/>'+
    '<circle cx="26" cy="34" r="2" fill="#7a4a10"/><circle cx="38" cy="34" r="2" fill="#7a4a10"/>'+
    '<path d="M27 41q5 4 10 0" stroke="#7a4a10" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
};
function stickerSVG(id,size){
  return '<svg viewBox="0 0 64 64" width="'+(size||'100%')+'" height="'+(size||'100%')+'">'+(STICKERS[id]||'')+'</svg>';
}
function renderStickers(){
  var grid=$('stickerGrid');
  if(!grid) return;
  grid.innerHTML='';
  STAGES.forEach(function(st){
    var lv=progress.stickers?progress.stickers[st.id]||0:0;
    var d=document.createElement('div');
    d.className='sticker'+(lv?'':' locked')+(lv===2?' shiny':'');
    d.innerHTML=stickerSVG(st.id);
    grid.appendChild(d);
  });
  renderDress();
}

/* ================= dress-up ================= */
var DRESS=[
  {id:'hat',    name:'Party hat'},
  {id:'crown',  name:'Crown'},
  {id:'cap',    name:'Cap'},
  {id:'glasses',name:'Glasses'},
  {id:'bow',    name:'Bow tie'},
  {id:'scarf',  name:'Scarf'},
  {id:'flower', name:'Flower'}
];
var ACC_SVG={
  hat:'<path d="M12 0.6L17.6 7.4H6.4z" fill="#ec4a8f"/><circle cx="12" cy="1" r="1.4" fill="#ffd93d"/>',
  crown:'<path d="M6 7.2L7.6 2.2 12 5.5 16.4 2.2 18 7.2z" fill="#ffd93d" stroke="#d99b00" stroke-width=".5"/>',
  cap:'<path d="M6.2 6.8a5.8 5.8 0 0 1 11.6 0z" fill="#29a3e0"/><rect x="5" y="6.6" width="14" height="1.7" rx=".85" fill="#1b7fb5"/>',
  glasses:'<circle cx="6.9" cy="9.6" r="3" fill="none" stroke="#20304a" stroke-width=".9"/>'+
          '<circle cx="17.1" cy="9.6" r="3" fill="none" stroke="#20304a" stroke-width=".9"/>'+
          '<path d="M9.9 9.6h4.2" stroke="#20304a" stroke-width=".9"/>',
  bow:'<path d="M12 18.4l-3.5-2.2v4.4z" fill="#ec4a8f"/><path d="M12 18.4l3.5-2.2v4.4z" fill="#ec4a8f"/>'+
      '<circle cx="12" cy="18.4" r="1.1" fill="#c02a6b"/>',
  scarf:'<path d="M4.4 15.1q7.6 3.2 15.2 0v3.3q-7.6 3.2-15.2 0z" fill="#e8453c"/>',
  flower:'<g><circle cx="12" cy="3.6" r="2" fill="#ec4a8f"/><circle cx="9.3" cy="4.9" r="2" fill="#ec4a8f"/>'+
         '<circle cx="14.7" cy="4.9" r="2" fill="#ec4a8f"/><circle cx="10.2" cy="1.7" r="1.6" fill="#ec4a8f"/>'+
         '<circle cx="13.8" cy="1.7" r="1.6" fill="#ec4a8f"/><circle cx="12" cy="3.6" r="1.4" fill="#ffd93d"/></g>'
};
function unlockedDress(){
  return Math.min(DRESS.length,Math.floor((progress.points||0)/10));
}
function dressPreview(id){
  return '<svg viewBox="0 0 24 24">'+
    '<rect x="2" y="2" width="20" height="20" rx="5" fill="#29a3e0"/>'+
    '<circle cx="8.6" cy="9.6" r="1.9" fill="#fff"/><circle cx="15.4" cy="9.6" r="1.9" fill="#fff"/>'+
    '<circle cx="9" cy="10.1" r=".9" fill="#25314a"/><circle cx="15.8" cy="10.1" r=".9" fill="#25314a"/>'+
    '<path d="M9 14.2q3 2.4 6 0" stroke="#1b5f86" stroke-width="1.3" fill="none" stroke-linecap="round"/>'+
    (id&&ACC_SVG[id]?ACC_SVG[id]:'')+'</svg>';
}
function applyOutfit(){
  var acc=progress.outfit;
  [].slice.call(document.querySelectorAll('.blk')).forEach(function(b){
    var old=b.querySelector('.acc');
    if(old) old.remove();
    if(acc&&ACC_SVG[acc]){
      var sp=document.createElement('span');
      sp.className='acc';
      sp.innerHTML='<svg viewBox="0 0 24 24">'+ACC_SVG[acc]+'</svg>';
      b.appendChild(sp);
    }
  });
}
function renderDress(){
  var row=$('dressRow');
  if(!row) return;
  row.innerHTML='';
  var unlocked=unlockedDress();
  var items=[{id:'',name:'Plain'}].concat(DRESS);
  items.forEach(function(it,idx){
    var open=idx===0||idx<=unlocked;
    var b=document.createElement('button');
    b.className='dress'+(open?'':' locked')+((progress.outfit||'')===it.id?' on':'');
    b.setAttribute('aria-label',it.name);
    b.innerHTML=dressPreview(it.id);
    if(!open){
      b.innerHTML+='<svg class="lockmini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>';
    }
    b.addEventListener('click',function(){
      if(!open) return;
      progress.outfit=it.id;
      saveProgress();
      renderDress();
      applyOutfit();
      popSound();
      speak(it.id?'There you go!':'Plain again.',{rate:0.9});
    });
    row.appendChild(b);
  });
}

/* ================= parent dashboard ================= */
function renderDash(){
  var wrap=$('dashStars');
  if(!wrap) return;
  wrap.innerHTML='';
  STAGES.forEach(function(st){
    var n=progress.stars[st.id]||0;
    var row=document.createElement('div');
    row.className='dash-row';
    row.innerHTML='<span class="nm">'+st.title+'</span><span>'+starSvg(n>0)+starSvg(n>1)+starSvg(n>2)+'</span>';
    wrap.appendChild(row);
  });

  var stats={};
  answerLog.forEach(function(e){
    (e.n||[]).forEach(function(num){
      if(num<0||num>20) return;
      stats[num]=stats[num]||{t:0,ok:0};
      stats[num].t++;
      if(e.ok) stats[num].ok++;
    });
  });

  var grid=$('dashNums');
  grid.innerHTML='';
  for(var i=0;i<=20;i++){
    var cell=document.createElement('div');
    cell.className='dash-cell';
    cell.textContent=i;
    var st2=stats[i];
    if(!st2){ cell.classList.add('none'); }
    else{
      var acc=st2.ok/st2.t;
      cell.style.background=acc>=0.8?'#5cb85c':(acc>=0.5?'#f0a500':'#e8453c');
      cell.title=st2.ok+' right of '+st2.t;
    }
    grid.appendChild(cell);
  }

  var worst=null,worstAcc=2;
  Object.keys(stats).forEach(function(k){
    var st3=stats[k];
    if(st3.t<2) return;
    var acc=st3.ok/st3.t;
    if(acc<worstAcc){ worstAcc=acc; worst=k; }
  });
  var pts=progress.points||0;
  var fullJars=Math.floor(pts/10), inJar=Math.round((pts-fullJars*10)*10)/10;
  $('dashJars').textContent='Stars: '+(Math.round(pts*10)/10)+'  ·  '+
    fullJars+(fullJars===1?' full jar':' full jars')+' and '+inJar+' in this one.';

  var mastered=STAGES.filter(function(st){ return isMastered(st.id); }).map(function(st){ return st.title; });
  $('dashMastered').textContent=mastered.length
    ? 'Mastered (three stars on two different days): '+mastered.join(', ')+'.'
    : 'No stage mastered yet — that needs three stars on two different days.';
  if($('dashHome')) $('dashHome').textContent=homeTip();

  $('dashWorking').textContent=worst!==null
    ? 'Working on: '+worst+' — right '+Math.round(worstAcc*100)+'% of the time. It will come round more often.'
    : 'Working on: not enough answers yet. Play a stage or two.';

  var today=(progress.time&&progress.time[dayKey(new Date())])||0;
  var week=0, now=new Date();
  for(var d=0;d<7;d++){
    var dt=new Date(now.getTime()-d*86400000);
    week+=(progress.time&&progress.time[dayKey(dt)])||0;
  }
  function span(sec){
    if(sec<60) return Math.round(sec)+' sec';
    if(sec<3600) return Math.round(sec/60)+' min';
    return (sec/3600).toFixed(1)+' hr';
  }
  $('dashTime').textContent='Played today: '+span(today)+'  ·  this week: '+span(week)+'.';
}

/* ================= stars / confetti ================= */
function confetti(count){
  var layer=$('confetti');
  for(var i=0;i<(count||26);i++){
    var b=document.createElement('i');
    b.className='confetti-bit';
    b.style.left=(6+Math.random()*88)+'%';
    b.style.background=PALETTE[i%PALETTE.length];
    b.style.setProperty('--dx',(Math.random()*150-75).toFixed(0)+'px');
    b.style.animationDelay=(Math.random()*0.2).toFixed(2)+'s';
    layer.appendChild(b);
    (function(el){setTimeout(function(){el.remove();},1800);})(b);
  }
}

/* ================= press and hold (parent gate) ================= */
function holdToActivate(el,action){
  if(!el) return;
  var timer=null,fired=false;
  function cancelHold(){
    if(timer){clearTimeout(timer);timer=null;}
    el.classList.remove('holding');
  }
  el.addEventListener('pointerdown',function(){
    if(fired) return;
    el.classList.add('holding');
    timer=setTimeout(function(){
      timer=null;
      el.classList.remove('holding');
      fired=true;
      action();
      setTimeout(function(){fired=false;},700);
    },2000);
  });
  el.addEventListener('pointerup',cancelHold);
  el.addEventListener('pointerleave',cancelHold);
  el.addEventListener('pointercancel',cancelHold);
  el.addEventListener('contextmenu',function(e){e.preventDefault();});
}

/* ================= carry on dialog ================= */
function showCarry(st,index){
  $('carrySub').textContent='You stopped at question '+(index+1)+' of '+ROUNDS+'.';
  $('carryModal').classList.add('show');
  $('carryYes').onclick=function(){
    $('carryModal').classList.remove('show');
    popSound();
    startStage(st.id,index);
  };
  $('carryNo').onclick=function(){
    $('carryModal').classList.remove('show');
    popSound();
    if(progress.carry) delete progress.carry[st.id];
    saveProgress();
    startStage(st.id);
  };
  speak('Do you want to carry on where you stopped?');
}

/* ================= full screen ================= */
function fullEl(){ return document.fullscreenElement||document.webkitFullscreenElement||null; }
function fsSupported(){
  var el=document.documentElement;
  return !!(el.requestFullscreen||el.webkitRequestFullscreen);
}
function standalone(){
  return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
         window.navigator.standalone===true;
}
function updateFsIcon(){
  var on=!!fullEl();
  $('fsOn').classList.toggle('hidden',on);
  $('fsOff').classList.toggle('hidden',!on);
}
function toggleFull(){
  var el=document.documentElement;
  try{
    if(fullEl()){
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      return;
    }
    if(el.requestFullscreen){ el.requestFullscreen().catch(showFullHint); }
    else if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); }
    else { showFullHint(); }
  }catch(e){ showFullHint(); }
}
function showFullHint(){
  toast('To play full screen, tap Share then “Add to Home Screen”.');
  speak('To play full screen, add the game to your home screen.');
}
document.addEventListener('fullscreenchange',updateFsIcon);
document.addEventListener('webkitfullscreenchange',updateFsIcon);

var toastTimer=null;
window.nfToast=function(m){toast(m);};
window.nfSpeak=function(t){speak(t);};
function toast(msg){
  var t=$('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('show');},4200);
}

/* ================= wiring ================= */
holdToActivate($('grownBtn'),function(){ setScreen('grown'); });
holdToActivate($('backBtn'),function(){ goMap(); });
$('backBtn').addEventListener('click',function(){
  if(curScreen==='play') return;   // during play a plain tap does nothing
  goMap();
});
$('sayBtn').addEventListener('click',function(){
  if(round.q&&round.q.replay){ speak(round.q.replay,{rate:0.9}); return; }
  if(round.promptSpeech) speak(round.promptSpeech);
});

function applyVoiceIcon(){
  $('sndOn').classList.toggle('hidden',voiceMuted);
  $('sndOff').classList.toggle('hidden',!voiceMuted);
  $('muteBtn').classList.toggle('off',voiceMuted);
}
$('muteBtn').addEventListener('click',function(){
  voiceMuted=!voiceMuted;
  applyVoiceIcon();
  try{localStorage.setItem(KEY+'_voiceon',voiceMuted?'0':'1');}catch(e){}
  if(voiceMuted){ clearSpeech(); }
  else { tone(700,0.1,'triangle',0.12); speak('Voice is on.'); }
});

$('musicBtn').addEventListener('click',function(){
  if(musicAllowed()){
    musicOn=false;                       // off everywhere from now on
    toast('Music off');
  }else{
    musicOn=true;
    if(curScreen==='play') musicPlay=true;   // asking for music while playing means keep it
    toast('Music on');
  }
  try{
    localStorage.setItem(KEY+'_music',musicOn?'1':'0');
    localStorage.setItem(KEY+'_musicplay',musicPlay?'1':'0');
  }catch(e){}
  syncMusic();
});

$('fsBtn').addEventListener('click',toggleFull);

$('playBtn').addEventListener('click',function(){
  var cur=currentStage();
  if(pendingWarmup){
    pendingWarmup=false;
    pendingStageId=cur.st.id;
    startWarmup();
    return;
  }
  openStage(cur.st);
});
$('stickersBtn').addEventListener('click',function(){
  popSound();
  setScreen('stickers');
});
$('nameSave').addEventListener('click',function(){
  var v=($('nameInput').value||'').trim().slice(0,14);
  progress.name=v;
  saveProgress();
  popSound();
  toast(v?('Hello, '+v+'!'):'Name cleared');
  if(v) speak('Hello, '+v+'!',{rate:0.95});
});

$('s-play').addEventListener('pointerdown',function(){
  if(curScreen==='play'&&!round.locked) armIdle();
});

$('voiceSel').addEventListener('change',function(e){
  var uri=e.target.value;
  useClips=(uri==='natural');
  chosenVoice=useClips?pickBestVoice():(voices.filter(function(v){return v.voiceURI===uri;})[0]||null);
  try{localStorage.setItem(KEY+'_voice',uri);}catch(e){}
  speak('Hello! Let us count together.',{rate:0.9});
});
$('testVoice').addEventListener('click',function(){ speak('One, two, three. Let us count the blocks.',{rate:0.9}); });
$('resetBtn').addEventListener('click',function(){
  if(!window.confirm('Reset all stars and open only the first stage?\n\nHer name is kept.')) return;
  var keepName=progress.name||'';
  var keepStickers=progress.stickers||{};
  var keepOutfit=progress.outfit||'';
  var dropExtras=window.confirm('Delete the stickers and the dress-up as well?\n\nOK = delete them\nCancel = keep them');
  progress={stars:{},rounds:0,points:0};
  if(keepName) progress.name=keepName;
  if(!dropExtras){
    progress.stickers=keepStickers;
    progress.outfit=keepOutfit;
  }
  answerLog=[];
  try{ localStorage.removeItem(KEY+'_log'); }catch(e){}
  saveProgress(); showStars(); renderHome(); renderDash();
  speak('All reset. Have fun!');
});

window.addEventListener('resize',function(){
  if($('s-play').classList.contains('active')&&round.q){
    if(round.q.fit) round.q.fit();
    else fitStage($('stage'),round.q.maxN||10,round.q.cols||2);
  }
  if($('s-map').classList.contains('active')) renderHome();
});

/* unlock audio + start music on the first touch */
function startAudioOnce(){
  ctxAny(); unlockVoice();
  syncMusic();
}
document.addEventListener('pointerdown',startAudioOnce,{once:true});
document.addEventListener('touchstart',startAudioOnce,{once:true,passive:true});
document.addEventListener('click',startAudioOnce,{once:true});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    music.stop();
    clearSpeech();
  }else{
    if(actx&&actx.state==='suspended'){ try{actx.resume();}catch(e){} }
    syncMusic();
  }
});

/* ================= boot ================= */

loadProgress();
loadLog();
loadVoices();
setTimeout(loadVoices,300);
try{
  var m=localStorage.getItem(KEY+'_music');
  if(m==='0') musicOn=false;
  var mp=localStorage.getItem(KEY+'_musicplay');
  if(mp==='1') musicPlay=true;
  var vo=localStorage.getItem(KEY+'_voiceon');
  if(vo==='0') voiceMuted=true;
}catch(e){}
applyVoiceIcon();
loadClips();
if(!hasSpeech&&!window.fetch) $('noVoice').classList.remove('hidden');
try{ if(localStorage.getItem(KEY+'_sfx')==='0'){ muted=true; $('sfxChk').checked=false; } }catch(e){}
$('sfxChk').addEventListener('change',function(){ muted=!this.checked; try{localStorage.setItem(KEY+'_sfx',muted?'0':'1');}catch(e){} if(!muted) popSound(); });
setScreen('map');
showStars();
if(standalone()) $('fsBtn').classList.add('hidden');
// after a gap of four hours or more, three quick questions from what she already knows
try{
  var last=progress.lastSeen||0;
  var gap=Date.now()-last;
  progress.lastSeen=Date.now();
  saveProgress();
  if(last&&gap>4*3600*1000&&(progress.points||0)>0) pendingWarmup=true;
}catch(e){}
updateFsIcon();

window.__nfShowTrace=showTrace;
})();
