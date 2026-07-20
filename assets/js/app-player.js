(function(){
  var audio=document.getElementById('radio');
  var playBtn=document.getElementById('play');
  var playIcon=playBtn.querySelector('i');
  var volumeSlider=document.getElementById('volume');
  var muteBtn=document.getElementById('muteBtn');
  var maxVolBtn=document.getElementById('maxVolBtn');
  var equalizer=document.getElementById('equalizer');
  var statusEl=document.getElementById('status');
  var musicEl=document.getElementById('music');
  var artistEl=document.getElementById('artist');
  var coverImg=document.querySelector('.cover img');
  var logoSpan=document.querySelector('.logo span');
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
          try{var c=JSON.parse(r.responseText);if(c.titulo){musicEl.textContent=c.titulo;logoSpan.textContent=c.titulo;document.title='Player • '+c.titulo}if(c.subtitulo)artistEl.textContent=c.subtitulo;if(c.capa)coverImg.src=c.capa}catch(e){}
        }
      };
      r.send();
    }catch(e){}
  })();
  function setStatus(text,isError){statusEl.textContent=text;if(isError){statusEl.classList.add('error')}else{statusEl.classList.remove('error')}}
  function setPlayingUI(playing){isPlaying=playing;playIcon.className=playing?'fa-solid fa-pause':'fa-solid fa-play';playBtn.setAttribute('aria-label',playing?'Pausar':'Reproduzir');playBtn.setAttribute('aria-pressed',String(playing));equalizer.classList.toggle('active',playing)}
  function togglePlay(){
    if(isPlaying){audio.pause();setPlayingUI(false);setStatus('Pausado');return}
    playBtn.disabled=true;setStatus('Conectando...');
    var baseSrc=sourceEl.dataset.baseSrc||(sourceEl.dataset.baseSrc=sourceEl.src);
    if(!baseSrc){playBtn.disabled=false;setStatus('Nada agendado no momento',true);return}
    var sep=baseSrc.indexOf('?')!==-1?'&':'?';
    sourceEl.src=baseSrc+sep+'_='+Date.now();
    audio.load();
    var timeout=setTimeout(function(){if(!isPlaying){setPlayingUI(false);setStatus('Não foi possível conectar ao stream',true);playBtn.disabled=false}},12000);
    audio.play().then(function(){clearTimeout(timeout);setPlayingUI(true);setStatus('Ao vivo agora')}).catch(function(){clearTimeout(timeout);setPlayingUI(false);setStatus('Não foi possível conectar ao stream',true)}).finally(function(){playBtn.disabled=false})
  }
  playBtn.addEventListener('click',togglePlay);
  audio.addEventListener('waiting',function(){setStatus('Carregando...')});
  audio.addEventListener('playing',function(){setStatus('Ao vivo agora')});
  audio.addEventListener('error',function(){setPlayingUI(false);setStatus('Erro na transmissão. Tente novamente.',true)});
  volumeSlider.addEventListener('input',function(){var v=Number(volumeSlider.value)/100;audio.volume=v;audio.muted=v===0;muteBtn.setAttribute('aria-pressed',String(v===0));muteBtn.querySelector('i').className=v===0?'fa-solid fa-volume-xmark':'fa-solid fa-volume-low';if(v>0)lastVolume=v});
  muteBtn.addEventListener('click',function(){
    if(audio.muted||audio.volume===0){audio.muted=false;audio.volume=lastVolume||0.7;volumeSlider.value=Math.round(audio.volume*100);muteBtn.setAttribute('aria-pressed','false');muteBtn.querySelector('i').className='fa-solid fa-volume-low'}
    else{lastVolume=audio.volume;audio.muted=true;volumeSlider.value=0;muteBtn.setAttribute('aria-pressed','true');muteBtn.querySelector('i').className='fa-solid fa-volume-xmark'}
  });
  maxVolBtn.addEventListener('click',function(){audio.muted=false;audio.volume=1;volumeSlider.value=100;lastVolume=1;muteBtn.setAttribute('aria-pressed','false');muteBtn.querySelector('i').className='fa-solid fa-volume-low'});
  function syncFromNp(np){
    if(!np||!np.src)return;
    if(np.title)musicEl.textContent=np.title;
    if(np.artist||np.title)artistEl.textContent=np.artist||np.title;
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
})();
