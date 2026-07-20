(function(){
  var list=document.getElementById('list');
  var dayNames=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var modal,modalBody,modalClose;

  function closeModal(){
    if(modal)modal.classList.remove('open');
    document.body.style.overflow=''
  }

  function openProgramModal(p){
    if(!modal){
      modal=document.createElement('div');
      modal.className='prog-modal-overlay';
      modal.innerHTML='<div class="prog-modal-box"><button class="prog-modal-close" id="progModalClose"><i class="fa-solid fa-xmark"></i></button><div class="prog-modal-body" id="progModalBody"></div></div>';
      modal.addEventListener('click',function(e){if(e.target===modal)closeModal()});
      document.body.appendChild(modal);
      modalBody=document.getElementById('progModalBody');
      document.getElementById('progModalClose').addEventListener('click',closeModal);
      document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal()})
    }
    var diasStr=(p.dias||[]).map(function(d){return dayNames[d]}).join(', ');
    modalBody.innerHTML=''+
      (p.imagem?'<img class="prog-modal-img" src="'+escapeAttr(p.imagem)+'" alt="">':'')+
      '<div class="prog-modal-content">'+
      '<div class="prog-modal-horario"><i class="fa-solid fa-clock"></i> '+escapeHtml(p.horario)+'</div>'+
      '<h2 class="prog-modal-titulo">'+escapeHtml(p.nome)+'</h2>'+
      (p.apresentador?'<div class="prog-modal-ap"><i class="fa-solid fa-microphone"></i> '+escapeHtml(p.apresentador)+'</div>':'')+
      (diasStr?'<div class="prog-modal-dias"><i class="fa-solid fa-calendar-days"></i> '+escapeHtml(diasStr)+'</div>':'')+
      (p.descricao?'<div class="prog-modal-desc">'+escapeHtml(p.descricao)+'</div>':'')+
      '</div>';
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    modalBody.scrollTop=0
  }

  fetch('../data/programacao.json?_='+Date.now()).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(data){
    var programas=data.programas||[];
    if(programas.length===0){list.className='';list.innerHTML='<p class="empty">Nenhum programa cadastrado no momento.</p>';return}
    var groups=[];
    for(var d=0;d<7;d++){
      var dayPrograms=[];
      programas.forEach(function(p){if(p.dias&&p.dias.indexOf(d)!==-1)dayPrograms.push(p)});
      if(dayPrograms.length>0)groups.push({day:d,itens:dayPrograms})
    }
    if(groups.length===0){list.className='';list.innerHTML='<p class="empty">Nenhum programa cadastrado no momento.</p>';return}
    list.className='prog-accordion';
    var today=new Date().getDay();
    list.innerHTML=groups.map(function(g){
      return '<div class="prog-accordion-day'+(g.day===today?' open':'')+'" data-day="'+g.day+'">'+
        '<div class="prog-accordion-header'+(g.day===today?' active-day':'')+'">'+
        '<i class="fa-solid fa-chevron-down"></i> '+escapeHtml(dayNames[g.day])+'</div>'+
        '<div class="prog-accordion-body"><div class="prog-grid">'+
        g.itens.map(function(p){
          return '<div class="prog-card'+(isProgramNow(p)?' is-now':'')+'" data-id="'+escapeAttr(p.id)+'">'+
            '<span class="horario"><i class="fa-solid fa-clock"></i> '+escapeHtml(p.horario)+'</span>'+
            '<div class="nome">'+escapeHtml(p.nome)+'</div>'+
            (p.apresentador?'<div class="apresentador">com '+escapeHtml(p.apresentador)+'</div>':'')+
            '</div>'
        }).join('')+'</div></div></div>'
    }).join('');
    list.querySelectorAll('.prog-accordion-header').forEach(function(hdr){
      hdr.addEventListener('click',function(){
        var day=hdr.parentElement;
        var isOpen=day.classList.contains('open');
        list.querySelectorAll('.prog-accordion-day.open').forEach(function(d){d.classList.remove('open')});
        if(!isOpen)day.classList.add('open')
      })
    });
    list.querySelectorAll('.prog-card').forEach(function(card){
      card.addEventListener('click',function(e){e.stopPropagation();
        var id=card.dataset.id;
        for(var i=0;i<programas.length;i++){if(programas[i].id===id){openProgramModal(programas[i]);break}}
      })
    })
  }).catch(function(){list.className='';list.innerHTML='<p class="empty">Não foi possível carregar a programação agora.</p>'})
})();
