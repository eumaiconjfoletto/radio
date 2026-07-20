function renderCarousel(banners,siteData,streamData){
  var wrap=document.getElementById('bannerCarousel');
  var transicao=(banners&&banners.transicao)||'slide';
  var items=(banners&&banners.banners||[]).filter(function(b){return b.ativo!==false});
  if(items.length===0){
    var nome=(streamData&&streamData.titulo)||'Rádio FM';
    var slogan=(siteData&&siteData.sobre_texto)||'Sua melhor companhia, 24 horas por dia.';
    var cor=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#ff0033';
    wrap.innerHTML='<div class="banner-slide"><div class="banner-default" style="background:linear-gradient(135deg,'+cor+',#0008)"><div class="banner-default-inner"><i class="fa-solid fa-radio"></i><h3>'+escapeHtml(nome)+'</h3><p>'+escapeHtml(slogan)+'</p></div></div></div>';
    wrap.classList.add('banner-single');return
  }
  wrap.classList.remove('banner-single');
  wrap.className='banner-carousel trans-'+transicao;

  var html='<div class="banner-track" id="bannerTrack">';
  var slidePct=transicao==='fade'?100:100/items.length;
  items.forEach(function(b,i){
    html+='<div class="banner-slide'+(i===0?' active':'')+'" style="width:'+slidePct+'%" data-idx="'+i+'">';
    html+='<img src="'+escapeAttr(b.imagem)+'" alt="'+(b.titulo?escapeAttr(b.titulo):'Banner')+'" loading="'+(i<2?'eager':'lazy')+'" onerror="this.parentElement.classList.add(\'banner-fallback\')">';
    if(b.titulo||b.subtitulo){
      html+='<div class="banner-overlay"><div class="banner-overlay-inner">';
      if(b.titulo)html+='<h3>'+escapeHtml(b.titulo)+'</h3>';
      if(b.subtitulo)html+='<p>'+escapeHtml(b.subtitulo)+'</p>';
      html+='</div></div>'
    }
    if(b.link)html+='<a class="banner-link" href="'+escapeAttr(b.link)+'" target="_blank" rel="noopener"></a>';
    html+='</div>'
  });
  html+='</div><div class="banner-dots" id="bannerDots">';
  for(var i=0;i<items.length;i++){
    html+='<button class="banner-dot'+(i===0?' active':'')+'" data-idx="'+i+'"></button>'
  }
  html+='</div>';
  wrap.innerHTML=html;
  var track=document.getElementById('bannerTrack');
  if(transicao!=='fade')track.style.width=(items.length*100)+'%';
  // Dots navigation
  var dots=wrap.querySelectorAll('.banner-dot');
  dots.forEach(function(dot){dot.addEventListener('click',function(){goBanner(Number(dot.dataset.idx))})});
  // Auto advance
  if(window._bannerTimer)clearInterval(window._bannerTimer);
  var current=0;
  window._bannerTimer=setInterval(function(){goBanner(current+1)},5000);
  function goBanner(idx){
    if(idx>=items.length)idx=0;
    if(idx<0)idx=items.length-1;
    if(idx===current)return;
    current=idx;
    var track=document.getElementById('bannerTrack');
    var slides=track.querySelectorAll('.banner-slide');
    slides.forEach(function(s,i){s.classList.toggle('active',i===idx)});
    dots.forEach(function(d,i){d.classList.toggle('active',i===idx)});
    if(transicao==='fade'){
      track.style.transform='none';
      slides.forEach(function(s,i){s.style.opacity=i===idx?'1':'0'})
    }else{
      var slideWidth=track.parentElement.offsetWidth;
      track.style.transform='translateX(-'+(idx*slideWidth)+'px)'
    }
  }
}
function renderOnAir(programas){
  var wrap=document.getElementById('onairWrap');
  var atual=null;
  for(var i=0;i<(programas||[]).length;i++){if(isProgramNow(programas[i])){atual=programas[i];break}}
  if(!atual)return;
  wrap.innerHTML='<div class="onair-card"><div class="onair-icon"><i class="fa-solid fa-broadcast-tower"></i></div><div class="onair-info"><div class="onair-label"><span class="live-dot"></span> No ar agora</div><div class="onair-nome">'+escapeHtml(atual.nome)+'</div><div class="onair-horario">'+escapeHtml(atual.horario)+(atual.apresentador?' · '+escapeHtml(atual.apresentador):'')+'</div></div><span class="onair-cta">AO VIVO</span></div>'
}
function renderNewsPreview(noticias){
  var section=document.getElementById('newsSection');
  var grid=document.getElementById('newsPreview');
  var items=(noticias||[]).slice().sort(function(a,b){return(b.data||'').localeCompare(a.data||'')}).slice(0,3);
  if(items.length===0)return;
  grid.innerHTML=items.map(function(n){return'<a class="news-mini" href="noticias.html" target="_top" onclick="event.preventDefault();parent.loadPage&&parent.loadPage(\'noticias.html\')">'+(n.imagem?'<img src="'+escapeAttr(n.imagem)+'" alt="">':'')+'<div><div class="data">'+formatDateBR(n.data)+'</div><div class="titulo">'+escapeHtml(n.titulo)+'</div><div class="news-mini-resumo">'+escapeHtml(n.resumo)+'</div></div></a>'}).join('');
  section.style.display=''
}
Promise.all([
  fetch('../data/site.json?_='+Date.now()).then(function(r){return r.ok?r.json():null}),
  fetch('../data/streaming.json?_='+Date.now()).then(function(r){return r.ok?r.json():null}),
  fetch('../data/banners.json?_='+Date.now()).then(function(r){return r.ok?r.json():null})
]).then(function(res){
  var siteData=res[0],streamData=res[1],bannerData=res[2];
  renderCarousel(bannerData?bannerData:null,siteData,streamData)
}).catch(function(){renderCarousel(null,null,null)});
fetch('../data/programacao.json?_='+Date.now()).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)renderOnAir(d.programas)}).catch(function(){});
fetch('../data/noticias.json?_='+Date.now()).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)renderNewsPreview(d.noticias)}).catch(function(){});
