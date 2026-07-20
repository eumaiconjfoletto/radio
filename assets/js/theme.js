(function(){
  var el=document.currentScript;
  var src=(el&&el.dataset.src)||'data/theme.json';
  var root=document.documentElement;
  var KEY='radiofm-theme';
  function apply(t){
    if(!t)return;
    root.setAttribute('data-theme',t.preset||'vermelho');
    if(t.custom_accent){
      root.style.setProperty('--accent',t.custom_accent);
      root.style.setProperty('--accent-dim',t.custom_accent+'55');
      root.style.setProperty('--on-accent',contrast(t.custom_accent));
    }else{
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-dim');
      root.style.removeProperty('--on-accent');
    }
  }
  function contrast(h){var c=String(h).replace('#','');if(c.length!==6)return'#fff';var r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);return(0.299*r+0.587*g+0.114*b)/255>0.6?'#1a1a1a':'#fff'}
  try{var c=localStorage.getItem(KEY);if(c)apply(JSON.parse(c))}catch(e){}
  fetch(src+'?_='+Date.now()).then(function(r){return r.ok?r.json():null}).then(function(t){if(!t)return;apply(t);try{localStorage.setItem(KEY,JSON.stringify(t))}catch(e){}}).catch(function(){})
})();
