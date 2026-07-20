(function(){
  var frame=document.getElementById('contentFrame');
  var frameLoading=document.getElementById('frameLoading');
  var navButtons=document.querySelectorAll('.main-nav button');
  var menuToggle=document.getElementById('menuToggle');
  var mainNav=document.getElementById('mainNav');
  var validPages=[];
  navButtons.forEach(function(b){validPages.push(b.dataset.page)});
  function loadPage(page,pushState){
    if(pushState===undefined)pushState=true;
    if(validPages.indexOf(page)===-1)page='home.html';
    frameLoading.classList.add('show');
    frame.src='paginas/'+page;
    navButtons.forEach(function(b){b.classList.toggle('active',b.dataset.page===page)});
    mainNav.classList.remove('open');
    if(pushState){history.pushState({page:page},'','#'+page.replace('.html',''))}
  }
  frame.addEventListener('load',function(){frameLoading.classList.remove('show')});
  navButtons.forEach(function(btn){btn.addEventListener('click',function(){loadPage(btn.dataset.page)})});
  if(menuToggle){menuToggle.addEventListener('click',function(){mainNav.classList.toggle('open')})}
  window.addEventListener('popstate',function(e){loadPage((e.state&&e.state.page)||'home.html',false)});
  window.loadPage=loadPage;
  var hash=location.hash.replace('#','');
  if(hash&&validPages.indexOf(hash+'.html')!==-1){loadPage(hash+'.html',false)}
  var audio=document.getElementById('radio');
  var playBtn=document.getElementById('playBtn');
  var playIcon=playBtn.querySelector('i');
  var muteBtn=document.getElementById('muteBtn');
  var volumeSlider=document.getElementById('barVolume');
  var statusEl=document.getElementById('barStatus');
  var statusText=statusEl.querySelector('.text');
  var titleEl=document.getElementById('barTitle');
  var coverImg=document.getElementById('barCover');
  var brandName=document.getElementById('brandName');
  var sourceEl=audio.querySelector('source');
  var isPlaying=false;
  var lastNpTitle='';
  var lastNpStarted=0;
  var autoStarted=false;
  var pendingNext=false;
  var lastVolume=0.7;
  audio.volume=0.7;
  (function(){
    try{
      var r=new XMLHttpRequest();
      r.open('GET','data/streaming.json?_='+Date.now(),true);
      r.onreadystatechange=function(){
        if(r.readyState===4&&r.status===200){
          try{var c=JSON.parse(r.responseText);if(c.titulo){titleEl.textContent=c.titulo;brandName.textContent=c.titulo;document.title=c.titulo}if(c.capa){coverImg.src=c.capa}}catch(e){}
        }
      };
      r.send();
    }catch(e){}
  })();
  function syncFromNp(np){
    if(!np||!np.src)return;
    if(np.title)titleEl.textContent=np.title;
    statusText.textContent=np.artist||np.title||'Ao vivo';
    if(np.cover)coverImg.src=np.cover;
    var titleChanged=np.title&&np.title!==lastNpTitle;
    if(np.title)lastNpTitle=np.title;
    if(!titleChanged&&autoStarted)return;
    var elapsed=np.started_at?(Date.now()/1000-np.started_at):0;
    var dur=np.duration||0;
    if(dur>0&&elapsed>=dur){fetchCron('next');return}
    lastNpStarted=np.started_at||(Date.now()/1000);
    sourceEl.src=np.src;
    delete sourceEl.dataset.baseSrc;
    audio.load();
    if(elapsed>0&&elapsed<dur&&dur>0)audio.currentTime=elapsed;
    if(!autoStarted||isPlaying||pendingNext){
      autoStarted=true;pendingNext=false;
      audio.play().then(function(){if(!isPlaying){setPlayingUI(true);setStatus('Ao vivo agora')}}).catch(function(e){if(e.name!=='NotAllowedError'){setPlayingUI(false);setStatus('Erro ao reproduzir',true)}});
    }
  }
  function fetchCron(action){
    var sep=action?'&':'?';
    var x=new XMLHttpRequest();
    x.open('GET','automacao/cron.php'+(action?'?action='+action:'')+sep+'_='+Date.now(),true);
    x.onreadystatechange=function(){
      if(x.readyState===4&&x.status===200){
        try{var np=JSON.parse(x.responseText);syncFromNp(np)}catch(e){}
      }
    };
    x.send()
  }
  (function pollNowPlaying(){
    fetchCron();
    setTimeout(pollNowPlaying,10000)
  })();
  audio.addEventListener('ended',function(){pendingNext=true;fetchCron('next')});
  function setStatus(text,isError){statusText.textContent=text;if(isError){statusEl.classList.add('error')}else{statusEl.classList.remove('error')}}
  function setPlayingUI(playing){isPlaying=playing;playIcon.className=playing?'fa-solid fa-pause':'fa-solid fa-play';playBtn.setAttribute('aria-label',playing?'Pausar':'Reproduzir');playBtn.setAttribute('aria-pressed',String(playing))}
  function togglePlay(){
    if(isPlaying){audio.pause();setPlayingUI(false);setStatus('Pausado');return}
    playBtn.disabled=true;setStatus('Conectando...');
    var baseSrc=sourceEl.dataset.baseSrc||(sourceEl.dataset.baseSrc=sourceEl.src);
    if(!baseSrc){playBtn.disabled=false;setStatus('Nada agendado no momento',true);return}
    var sep=baseSrc.indexOf('?')!==-1?'&':'?';
    sourceEl.src=baseSrc+sep+'_='+Date.now();
    audio.load();
    var timeout=setTimeout(function(){if(!isPlaying){setPlayingUI(false);setStatus('Não foi possível conectar',true);playBtn.disabled=false}},12000);
    audio.play().then(function(){clearTimeout(timeout);setPlayingUI(true);setStatus('Ao vivo agora')}).catch(function(){clearTimeout(timeout);setPlayingUI(false);setStatus('Não foi possível conectar',true)}).finally(function(){playBtn.disabled=false})
  }
  playBtn.addEventListener('click',togglePlay);
  audio.addEventListener('waiting',function(){setStatus('Carregando...')});
  audio.addEventListener('playing',function(){setStatus('Ao vivo agora')});
  audio.addEventListener('error',function(){setPlayingUI(false);setStatus('Erro na transmissão',true)});
  volumeSlider.addEventListener('input',function(){var v=Number(volumeSlider.value)/100;audio.volume=v;audio.muted=v===0;muteBtn.querySelector('i').className=v===0?'fa-solid fa-volume-xmark':'fa-solid fa-volume-low';if(v>0)lastVolume=v});
  muteBtn.addEventListener('click',function(){
    if(audio.muted||audio.volume===0){audio.muted=false;audio.volume=lastVolume||0.7;volumeSlider.value=Math.round(audio.volume*100);muteBtn.querySelector('i').className='fa-solid fa-volume-low'}
    else{lastVolume=audio.volume;audio.muted=true;volumeSlider.value=0;muteBtn.querySelector('i').className='fa-solid fa-volume-xmark'}
  });
})();