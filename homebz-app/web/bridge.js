/* Native bridge for the Expo shell (no-op in a normal browser). */
(function(){
  var RN = window.ReactNativeWebView;
  function post(msg){ if(RN) RN.postMessage(JSON.stringify(msg)); }

  // External links (WhatsApp, Google Maps, tel:, mailto:) open in the right native app.
  var nativeOpen = window.open;
  window.open = function(url){
    if(RN && url){ post({type:'open', url:String(url)}); return null; }
    return nativeOpen.apply(window, arguments);
  };

  // Remember the chosen language between launches.
  try{
    var saved = localStorage.getItem('hb.lang');
    var orig = window.applyLang;
    if(typeof orig === 'function'){
      window.applyLang = function(lang){ try{ localStorage.setItem('hb.lang', lang); }catch(e){} return orig.apply(this, arguments); };
      if(saved && saved !== state.lang) orig(saved);
    }
  }catch(e){}

  // Light haptic tick on taps.
  var lastTap = 0;
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest && e.target.closest('button,[onclick],label,.lang-btn');
    var now = Date.now();
    if(el && now - lastTap > 60){ lastTap = now; post({type:'haptic', kind:'tap'}); }
  }, true);
  var origToast = window.toast;
  if(typeof origToast === 'function'){
    window.toast = function(){ post({type:'haptic', kind:'toast'}); return origToast.apply(this, arguments); };
  }

  // Report the colours behind the status bar and home indicator so the native safe areas match the screen.
  function colorAt(x, y, last){
    var el = document.elementFromPoint(x, y);
    while(el && el.nodeType === 1){
      var cs = getComputedStyle(el);
      var bg = cs.backgroundColor;
      if(bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg;
      var m = cs.backgroundImage && cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi);
      if(m) return last ? m[m.length-1] : m[0];
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || '#ffffff';
  }
  var lastTop = '', lastBottom = '';
  function sample(){
    var w = window.innerWidth, h = window.innerHeight;
    if(!w || !h) return;
    var top = colorAt(w/2, 1), bottom = colorAt(w/2, h-1, true);
    if(top !== lastTop || bottom !== lastBottom){ lastTop = top; lastBottom = bottom; post({type:'theme', top:top, bottom:bottom}); }
  }
  setInterval(sample, 250);
  document.addEventListener('click', function(){ setTimeout(sample, 30); setTimeout(sample, 350); }, true);

  // Android back button: close the top-most sheet / page, otherwise go home, otherwise leave the app.
  function visible(el){ return !!(el && el.offsetParent !== null && !el.classList.contains('hidden')); }
  function onTop(el){
    var r = el.getBoundingClientRect();
    if(r.width < 2 || r.height < 2) return false;
    var hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return !!hit && (hit === el || el.contains(hit));
  }
  function tap(el){ el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})); }
  window.__hbBack = function(){
    try{
      var viewer = document.getElementById('imgViewer');
      if(viewer && viewer.style.display !== 'none' && viewer.offsetParent !== null && typeof closeImgViewer === 'function'){ closeImgViewer(); return true; }
      var sheets = [].slice.call(document.querySelectorAll('.invoice-sheet:not(.hidden)')).filter(visible);
      if(sheets.length){
        var s = sheets[sheets.length-1];
        var c = s.querySelector('[onclick^="close"]');
        if(c) tap(c); else s.classList.add('hidden');
        return true;
      }
      if(visible(document.getElementById('reviewsOverlay')) && typeof closeReviews === 'function'){ closeReviews(); return true; }
      var backs = [].slice.call(document.querySelectorAll('.back-btn,.auth-back,.chat-back,.hbd-back,.search-close,.addr-back-link,[class*="-back"],[class^="back"],[onclick^="close"]')).filter(onTop);
      backs.sort(function(a,b){ return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
      if(backs.length){ tap(backs[0]); return true; }
      if(visible(document.getElementById('driveThruApp')) && typeof dtGoHome === 'function'){ dtGoHome(); return true; }
      var cv = document.getElementById('customerView');
      if(visible(cv) && typeof showTab === 'function'){
        var home = document.getElementById('tab-home');
        if(home && home.classList.contains('hidden')){ showTab('home'); return true; }
      }
    }catch(e){}
    return false;
  };

  post({type:'ready'});
})();
