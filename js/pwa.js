/* Install button, iOS hint, service worker */
(function(){
  "use strict";
  var deferred=null;
  var ua=navigator.userAgent||'';
  var isIOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function standalone(){
    return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
  }
  var b1=document.getElementById('installBtn'), b2=document.getElementById('installBtn2');
  var done=document.getElementById('installDone'), modal=document.getElementById('iosModal');
  function refresh(){
    var inst=standalone();
    var can=!inst&&(deferred||isIOS);
    b1.classList.toggle('hidden',!can);
    b2.classList.toggle('hidden',inst);
    done.classList.toggle('hidden',!inst);
  }
  window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); deferred=e; refresh(); });
  window.addEventListener('appinstalled',function(){ deferred=null; refresh(); if(window.nfToast) window.nfToast('Installed! Find Number Friends on your home screen.'); });
  function install(){
    if(deferred){
      deferred.prompt();
      deferred.userChoice.then(function(){ deferred=null; refresh(); });
    }else if(isIOS){
      modal.classList.add('show');
    }else if(window.nfToast){
      window.nfToast('Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.');
    }
  }
  b1.addEventListener('click',install);
  b2.addEventListener('click',install);
  document.getElementById('iosOk').addEventListener('click',function(){ modal.classList.remove('show'); });
  refresh();
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
    window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }
  /* no pinch / double-tap zoom, no rubber-band scroll outside scrollable panels */
  document.addEventListener('gesturestart',function(e){ e.preventDefault(); });
  document.addEventListener('dblclick',function(e){ e.preventDefault(); },{passive:false});
  /* tap ripple + sparkle on every button */
  document.addEventListener('pointerdown',function(e){
    var t=e.target.closest&&e.target.closest('.choice,.bigbtn,.pillbtn,.minibtn,.installbtn,.playbtn');
    if(!t||t.disabled) return;
    var r=t.getBoundingClientRect();
    var s=document.createElement('span'); s.className='ripple';
    var d=Math.max(r.width,r.height)*1.2;
    s.style.width=s.style.height=d+'px';
    s.style.left=(e.clientX-r.left-d/2)+'px'; s.style.top=(e.clientY-r.top-d/2)+'px';
    if(getComputedStyle(t).position==='static') t.style.position='relative';
    t.appendChild(s);
    setTimeout(function(){ s.remove(); },600);
  },true);
  /* sparkles when a choice turns right */
  var mo=new MutationObserver(function(list){
    list.forEach(function(m){
      var el=m.target;
      if(el.classList&&el.classList.contains('right')&&!el._sparkled){
        el._sparkled=true;
        var r=el.getBoundingClientRect();
        for(var i=0;i<10;i++){
          var p=document.createElement('span'); p.className='spark';
          var a=Math.PI*2*i/10, dist=50+Math.random()*40;
          p.style.left=(r.left+r.width/2)+'px'; p.style.top=(r.top+r.height/2)+'px';
          p.style.setProperty('--dx',Math.cos(a)*dist+'px'); p.style.setProperty('--dy',Math.sin(a)*dist+'px');
          p.style.background=['#ffd34d','#ff7aa8','#6fd3ff','#8be36b','#ffffff'][i%5];
          document.body.appendChild(p);
          setTimeout((function(q){return function(){q.remove();};})(p),900);
        }
      }
    });
  });
  mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();
