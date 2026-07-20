(function(){
  var list=document.getElementById('list');
  var modal,modalBody,modalClose;

  function closeModal(){
    if(modal)modal.classList.remove('open');
    document.body.style.overflow=''
  }

  function openModal(n){
    if(!modal){
      modal=document.createElement('div');
      modal.className='news-modal-overlay';
      modal.innerHTML='<div class="news-modal-box"><button class="news-modal-close" id="newsModalClose"><i class="fa-solid fa-xmark"></i></button><div class="news-modal-body" id="newsModalBody"></div></div>';
      modal.addEventListener('click',function(e){if(e.target===modal)closeModal()});
      document.body.appendChild(modal);
      modalBody=document.getElementById('newsModalBody');
      document.getElementById('newsModalClose').addEventListener('click',closeModal);
      document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal()})
    }
    modalBody.innerHTML=''+
      (n.imagem?'<img class="news-modal-img" src="'+escapeAttr(n.imagem)+'" alt="">':'')+
      '<div class="news-modal-content"><div class="news-modal-data">'+formatDateBR(n.data)+'</div>'+
      '<h2 class="news-modal-titulo">'+escapeHtml(n.titulo)+'</h2>'+
      (n.conteudo?'<div class="news-modal-texto">'+escapeHtml(n.conteudo)+'</div>':'<p style="color:var(--text-dim);font-size:14px;">Conteúdo não disponível.</p>')+
      '</div>';
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    modalBody.scrollTop=0
  }

  fetch('../data/noticias.json?_='+Date.now()).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(data){
    var noticias=(data.noticias||[]).slice().sort(function(a,b){return(b.data||'').localeCompare(a.data||'')});
    if(noticias.length===0){list.innerHTML='<p class="empty">Nenhuma notícia publicada no momento.</p>';return}
    list.innerHTML=noticias.map(function(n,i){
      return '<div class="news-card" data-idx="'+i+'">'+
        (n.imagem?'<img src="'+escapeAttr(n.imagem)+'" alt="'+escapeAttr(n.titulo)+'" loading="lazy">':'')+
        '<div class="body"><div class="data">'+formatDateBR(n.data)+'</div>'+
        '<div class="titulo">'+escapeHtml(n.titulo)+'</div>'+
        '<div class="resumo">'+escapeHtml(n.resumo)+'</div></div></div>'
    }).join('');
    list.querySelectorAll('.news-card').forEach(function(card,i){
      card.addEventListener('click',function(){openModal(noticias[i])})
    })
  }).catch(function(){list.innerHTML='<p class="empty">Não foi possível carregar as notícias agora.</p>'})
})();
