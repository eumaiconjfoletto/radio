(function(){
  var BASE=location.pathname.replace(/\/+$/,'')+'/';
  var loginView=document.getElementById('loginView');
  var panelView=document.getElementById('panelView');
  var loginForm=document.getElementById('loginForm');
  var loginMsg=document.getElementById('loginMsg');
  var logoutBtn=document.getElementById('logoutBtn');
  var csrfToken='';
  var userPermissoes=[];
  var programacaoData=[];
  var noticiasData=[];
  var usuariosData=[];
  function showMsg(el,text,type){el.textContent=text;el.className='msg'+(type?' '+type:'')}
  function showConfirm(msg){
    return new Promise(function(resolve){
      document.getElementById('confirmMessage').textContent=msg;
      document.getElementById('confirmModal').classList.remove('hidden');
      function cleanup(result){
        document.getElementById('confirmModal').classList.add('hidden');
        document.getElementById('confirmYes').removeEventListener('click',onYes);
        document.getElementById('confirmNo').removeEventListener('click',onNo);
        resolve(result)
      }
      function onYes(){cleanup(true)}
      function onNo(){cleanup(false)}
      document.getElementById('confirmYes').addEventListener('click',onYes);
      document.getElementById('confirmNo').addEventListener('click',onNo)
    })
  }
  function checkSession(){
    fetch(BASE+'session_check.php').then(function(r){
      if(r.ok)return r.json();else throw new Error('unauth');
    }).then(function(d){
      if(d.authenticated){csrfToken=d.csrf_token||'';userPermissoes=d.permissoes||[];filterTabs();showPanel()}else{showLogin()}
    }).catch(function(){showLogin()})
  }
  function filterTabs(){
    var firstVisible=null;
    document.querySelectorAll('.tab-btn').forEach(function(btn){
      btn.style.display=userPermissoes.indexOf(btn.dataset.tab)!==-1?'':'none';
      if(btn.style.display!=='none'&&!firstVisible)firstVisible=btn
    });
    document.querySelectorAll('.tab-btn, .panel').forEach(function(el){el.classList.remove('active')});
    if(firstVisible){firstVisible.classList.add('active');var panel=document.getElementById('panel-'+firstVisible.dataset.tab);if(panel)panel.classList.add('active')};
  }
  function showLogin(){loginView.classList.remove('hidden');panelView.classList.add('hidden')}
  function showPanel(){
    loginView.classList.add('hidden');panelView.classList.remove('hidden');
    var loads=[];
    if(userPermissoes.indexOf('streaming')!==-1)loads.push(loadStreaming());
    if(userPermissoes.indexOf('programacao')!==-1)loads.push(loadProgramacao());
    if(userPermissoes.indexOf('noticias')!==-1)loads.push(loadNoticias());
    if(userPermissoes.indexOf('banners')!==-1)loads.push(loadBanners());
    if(userPermissoes.indexOf('site')!==-1)loads.push(loadSite());
    if(userPermissoes.indexOf('tema')!==-1)loads.push(loadTema());
    if(userPermissoes.indexOf('usuarios')!==-1)loads.push(loadUsuarios());
    Promise.all(loads).catch(function(){})
  }
  loginForm.addEventListener('submit',function(e){
    e.preventDefault();showMsg(loginMsg,'Entrando...','');
    fetch(BASE+'login.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value.trim(),password:document.getElementById('password').value})}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(res){
      if(res.ok&&res.data.success){csrfToken=res.data.csrf_token||'';userPermissoes=res.data.permissoes||[];loginForm.reset();showMsg(loginMsg,'','');filterTabs();showPanel()}
      else{showMsg(loginMsg,res.data.message||'Usuário ou senha inválidos.','error')}
    }).catch(function(){showMsg(loginMsg,'Erro de conexão com o servidor.','error')})
  });
  logoutBtn.addEventListener('click',function(){fetch(BASE+'logout.php',{method:'POST'}).then(function(){showLogin()})});
  document.querySelectorAll('.tab-btn').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')});document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active')});btn.classList.add('active');document.getElementById('panel-'+btn.dataset.tab).classList.add('active')})});

  // ===== STREAMING =====
  function loadStreaming(){
    return fetch('../data/streaming.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      document.getElementById('s_url').value=d.stream_url||'';
      document.getElementById('s_titulo').value=d.titulo||'';
      document.getElementById('s_subtitulo').value=d.subtitulo||'';
      document.getElementById('s_capa').value=d.capa||'';
    }).catch(function(){showMsg(document.getElementById('msg-streaming'),'Não foi possível carregar.','error')})
  }
  document.getElementById('saveStreaming').addEventListener('click',function(){
    saveSection('streaming',{stream_url:document.getElementById('s_url').value.trim(),titulo:document.getElementById('s_titulo').value.trim(),subtitulo:document.getElementById('s_subtitulo').value.trim(),capa:document.getElementById('s_capa').value.trim()},document.getElementById('msg-streaming'))
  });

  // ===== PROGRAMAÇÃO — AGENDA SEMANAL =====
  var HOUR_H=48;

  function loadProgramacao(){
    return fetch('../data/programacao.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      programacaoData=(d.programas||[]).map(function(p){
        p.id=p.id||uid();
        if(!p.dias){p.dias=migrateDia(p.dia||'')}
        delete p.dia;
        p.cor=p.cor||'';
        return p
      });
      renderProgramacao();
      updateNowIndicator();
      if(window._progTimer)clearInterval(window._progTimer);
      window._progTimer=setInterval(updateNowIndicator,60000)
    }).catch(function(){showMsg(document.getElementById('msg-programacao'),'Não foi possível carregar.','error')})
  }

  function migrateDia(dia){
    if(!dia)return [1];
    var d=normalizeStr(dia);
    if(/todos os dias|diariamente|diario/.test(d))return [0,1,2,3,4,5,6];
    if(/segunda a sexta|seg a sex|dias uteis/.test(d))return [1,2,3,4,5];
    if(/fim de semana|sabado e domingo/.test(d))return [0,6];
    var full=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    for(var i=0;i<full.length;i++){if(d.includes(full[i]))return [i]}
    var abrv={dom:0,seg:1,ter:2,qua:3,qui:4,sex:5,sab:6};
    for(var k in abrv){if(d.includes(k))return [abrv[k]]}
    return [1]
  }

  function renderProgramacao(){
    var el=document.getElementById('programacaoList');
    el.className='';
    var dayNames=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var today=new Date().getDay();
    var lines='<div class="agenda-wrap"><div class="agenda-grid">';
    // Header row
    lines+='<div class="agenda-col"><div class="agenda-col-hdr">Hora</div><div class="agenda-col-body" style="height:'+(24*HOUR_H)+'px">';
    for(var h=0;h<24;h++){
      lines+='<div class="agenda-time-label" style="top:'+(h*HOUR_H)+'px">'+('0'+h).slice(-2)+':00</div>'
    }
    lines+='<div class="agenda-half-line" style="top:'+(23.5*HOUR_H)+'px"></div></div></div>';
    // Day columns
    for(var d=0;d<7;d++){
      lines+='<div class="agenda-col"><div class="agenda-col-hdr'+(d===today?' active-day':'')+'">'+dayNames[d]+'</div>';
      lines+='<div class="agenda-col-body" data-day="'+d+'" id="aday-'+d+'" style="height:'+(24*HOUR_H)+'px">';
      // Hourly separators
      for(var h=0;h<24;h++){
        lines+='<div class="agenda-hour-line" style="top:'+(h*HOUR_H)+'px"></div>'
      }
      // Events for this day
      programacaoData.forEach(function(p){
        if(!p.dias||p.dias.indexOf(d)===-1)return;
        var parsed=parseHorarioRange(p.horario);
        if(!parsed)return;
        var top=(parsed.start/60)*HOUR_H;
        var hgt=Math.max(((parsed.end-parsed.start)/60)*HOUR_H,18);
        var isNow=d===today&&isNowWithin(parsed);
        var evBg=p.cor?p.cor:'';
        lines+='<div class="agenda-event'+(isNow?' now-playing':'')+(hgt<36?' agenda-event-sm':'')+'" data-id="'+p.id+'" style="top:'+top+'px;height:'+hgt+'px'+(evBg?';background:'+evBg:'')+'">';
        lines+='<div class="ev-nome">'+escapeHtml(p.nome||'')+'</div>';
        if(p.apresentador&&hgt>30)lines+='<div class="ev-ap">'+escapeHtml(p.apresentador)+'</div>';
        if(hgt>24)lines+='<div class="ev-horario">'+escapeHtml(p.horario)+'</div>';
        lines+='<button class="agenda-event-del" data-id="'+p.id+'" title="Remover"><i class="fa-solid fa-xmark"></i></button>';
        lines+='</div>'
      });
      // Now line
      lines+='<div class="now-line" id="nowLine-'+d+'" style="display:none"></div>';
      lines+='</div></div>'
    }
    lines+='</div></div>';
    el.innerHTML=lines;
    // Event listeners — delegation on agenda-col-body
    document.querySelectorAll('.agenda-col-body').forEach(function(body){
      body.addEventListener('click',function(e){
        var ev=e.target.closest('.agenda-event');
        if(!ev)return;
        if(e.target.closest('.agenda-event-del')){
          deletePrograma(ev.dataset.id);
          return
        }
        var item=programacaoData.find(function(p){return p.id===ev.dataset.id});
        if(item)openProgramaModal(item)
      })
    })
  }

  function updateNowIndicator(){
    var now=new Date(),today=now.getDay(),m=now.getHours()*60+now.getMinutes(),top=(m/60)*HOUR_H;
    for(var d=0;d<7;d++){
      var line=document.getElementById('nowLine-'+d);
      if(!line)continue;
      line.style.display=d===today?'block':'none';
      if(d===today)line.style.top=top+'px'
    }
    document.querySelectorAll('.agenda-event').forEach(function(el){
      var p=programacaoData.find(function(x){return x.id===el.dataset.id});
      if(!p)return;
      var pr=parseHorarioRange(p.horario);
      if(!pr)return;
      var on=p.dias&&p.dias.indexOf(today)!==-1&&isNowWithin(pr);
      el.classList.toggle('now-playing',on)
    })
  }

  var editingProgramaId=null;

  function openProgramaModal(item){
    editingProgramaId=item?item.id:null;
    document.getElementById('programaModalTitle').textContent=item?'Editar programa':'Novo programa';
    document.getElementById('p-nome').value=item?item.nome:'';
    document.getElementById('p-apresentador').value=item?item.apresentador:'';
    document.getElementById('p-imagem').value=item?item.imagem||'':'';
    document.getElementById('p-descricao').value=item?item.descricao||'':'';
    document.getElementById('p-cor').value=item?item.cor||'#ff0033':'#ff0033';
    document.getElementById('p-cor-text').value=item?item.cor||'':'';
    var checks=document.querySelectorAll('#p-dias input[type="checkbox"]');
    checks.forEach(function(cb){cb.checked=false});
    if(item&&item.dias){
      item.dias.forEach(function(d){
        checks.forEach(function(cb){if(Number(cb.value)===d)cb.checked=true})
      })
    }
    if(item&&item.horario){
      var parts=item.horario.split('-');
      document.getElementById('p-horario-inicio').value=parts[0]?parts[0].trim():'';
      document.getElementById('p-horario-fim').value=parts[1]?parts[1].trim():''
    }else{
      document.getElementById('p-horario-inicio').value='';
      document.getElementById('p-horario-fim').value=''
    }
    document.getElementById('msg-programa-modal').textContent='';
    document.getElementById('programaModal').classList.remove('hidden')
  }

  document.getElementById('p-cor').addEventListener('input',function(){
    document.getElementById('p-cor-text').value=this.value
  });
  document.getElementById('p-cor-text').addEventListener('change',function(){
    var v=this.value.trim();
    if(/^#[0-9a-f]{6}$/i.test(v))document.getElementById('p-cor').value=v
  });
  document.getElementById('addPrograma').addEventListener('click',function(){openProgramaModal(null)});
  document.getElementById('programaModalCancel').addEventListener('click',function(){document.getElementById('programaModal').classList.add('hidden')});
  document.getElementById('programaModalSave').addEventListener('click',function(){
    var nome=document.getElementById('p-nome').value.trim();
    var ap=document.getElementById('p-apresentador').value.trim();
    var imagem=document.getElementById('p-imagem').value.trim();
    var descricao=document.getElementById('p-descricao').value.trim();
    var cor=document.getElementById('p-cor-text').value.trim()||document.getElementById('p-cor').value;
    var dias=[];
    document.querySelectorAll('#p-dias input[type="checkbox"]:checked').forEach(function(cb){dias.push(Number(cb.value))});
    var inicio=document.getElementById('p-horario-inicio').value;
    var fim=document.getElementById('p-horario-fim').value;
    var msgEl=document.getElementById('msg-programa-modal');
    if(!nome||dias.length===0||!inicio||!fim){showMsg(msgEl,'Preencha todos os campos.','error');return}
    var horario=inicio+' - '+fim;
    if(editingProgramaId){
      for(var i=0;i<programacaoData.length;i++){
        if(programacaoData[i].id===editingProgramaId){
          programacaoData[i].nome=nome;programacaoData[i].apresentador=ap;
          programacaoData[i].imagem=imagem;programacaoData[i].descricao=descricao;
          programacaoData[i].dias=dias;programacaoData[i].horario=horario;
          programacaoData[i].cor=cor;
          break
        }
      }
    }else{
      programacaoData.push({id:uid(),nome:nome,apresentador:ap,imagem:imagem,descricao:descricao,dias:dias,horario:horario,cor:cor})
    }
    document.getElementById('programaModal').classList.add('hidden');
    renderProgramacao();updateNowIndicator();autoSaveProgramacao()
  });

  async function deletePrograma(id){
    if(!(await showConfirm('Remover este programa da grade?')))return;
    programacaoData=programacaoData.filter(function(p){return p.id!==id});
    renderProgramacao();updateNowIndicator();autoSaveProgramacao()
  }

  function autoSaveProgramacao(){
    saveSection('programacao',{programas:programacaoData},document.getElementById('msg-programacao'))
  }
  document.getElementById('saveProgramacao').addEventListener('click',autoSaveProgramacao);

  // ===== NOTÍCIAS — LISTA + MODAL =====
  function loadNoticias(){
    return fetch('../data/noticias.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){noticiasData=(d.noticias||[]).map(function(n){n.id=n.id||uid();return n});renderNoticias()}).catch(function(){showMsg(document.getElementById('msg-noticias'),'Não foi possível carregar.','error')})
  }

  function renderNoticias(){
    var list=document.getElementById('noticiasList');list.innerHTML='';
    noticiasData.forEach(function(item){
      var row=document.createElement('div');row.className='noticia-row';
      var rshort=item.resumo&&item.resumo.length>55?item.resumo.slice(0,55)+'…':(item.resumo||'');
      row.innerHTML='<span class="nt-titulo">'+escapeHtml(item.titulo||'')+'</span><span class="nt-data">'+(item.data?formatDateBR(item.data):'')+'</span><span class="nt-resumo">'+escapeHtml(rshort)+'</span><span class="nt-acoes"><button class="edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="delete-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button></span>';
      row.querySelector('.edit-btn').addEventListener('click',function(){openNoticiaModal(item)});
      row.querySelector('.delete-btn').addEventListener('click',function(){deleteNoticia(item.id)});
      list.appendChild(row)
    })
  }

  var editingNoticiaId=null;

  function openNoticiaModal(item){
    editingNoticiaId=item?item.id:null;
    document.getElementById('noticiaModalTitle').textContent=item?'Editar notícia':'Nova notícia';
    document.getElementById('n-titulo').value=item?item.titulo:'';
    document.getElementById('n-resumo').value=item?item.resumo:'';
    document.getElementById('n-conteudo').value=item?item.conteudo:'';
    document.getElementById('n-data').value=item?item.data:new Date().toISOString().slice(0,10);
    document.getElementById('n-imagem').value=item?item.imagem:'';
    document.getElementById('msg-noticia-modal').textContent='';
    document.getElementById('noticiaModal').classList.remove('hidden')
  }

  document.getElementById('addNoticia').addEventListener('click',function(){openNoticiaModal(null)});
  document.getElementById('noticiaModalCancel').addEventListener('click',function(){document.getElementById('noticiaModal').classList.add('hidden')});
  document.getElementById('noticiaModalSave').addEventListener('click',function(){
    var titulo=document.getElementById('n-titulo').value.trim();
    var resumo=document.getElementById('n-resumo').value.trim();
    var conteudo=document.getElementById('n-conteudo').value.trim();
    var data=document.getElementById('n-data').value;
    var imagem=document.getElementById('n-imagem').value.trim();
    var msgEl=document.getElementById('msg-noticia-modal');
    if(!titulo||!conteudo){showMsg(msgEl,'Preencha título e conteúdo.','error');return}
    if(editingNoticiaId){
      for(var i=0;i<noticiasData.length;i++){
        if(noticiasData[i].id===editingNoticiaId){
          noticiasData[i].titulo=titulo;noticiasData[i].resumo=resumo;
          noticiasData[i].conteudo=conteudo;noticiasData[i].data=data;noticiasData[i].imagem=imagem;
          break
        }
      }
    }else{
      noticiasData.unshift({id:uid(),titulo:titulo,resumo:resumo,conteudo:conteudo,data:data,imagem:imagem})
    }
    document.getElementById('noticiaModal').classList.add('hidden');
    renderNoticias();autoSaveNoticias()
  });

  async function deleteNoticia(id){
    if(!(await showConfirm('Excluir esta notícia?')))return;
    noticiasData=noticiasData.filter(function(n){return n.id!==id});
    renderNoticias();autoSaveNoticias()
  }

  function autoSaveNoticias(){
    saveSection('noticias',{noticias:noticiasData},document.getElementById('msg-noticias'))
  }
  document.getElementById('saveNoticias').addEventListener('click',autoSaveNoticias);

  // ===== BANNERS =====
  var bannersData=[];
  var bannerTransicao='slide';
  function loadBanners(){
    return fetch('../data/banners.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      bannersData=(d.banners||[]).map(function(b){b.id=b.id||uid();return b});
      bannerTransicao=d.transicao||'slide';
      var sel=document.getElementById('bannerTransicao');
      if(sel)sel.value=bannerTransicao;
      renderBanners()
    }).catch(function(){showMsg(document.getElementById('msg-banners'),'Não foi possível carregar.','error')})
  }
  function renderBanners(){
    var list=document.getElementById('bannersList');list.innerHTML='';
    if(bannersData.length===0){
      list.innerHTML='<div style="text-align:center;padding:30px 0;color:var(--text-dim);font-size:13px">Nenhum banner cadastrado. O banner institucional padrão será exibido.</div>';return
    }
    bannersData.forEach(function(item){
      var card=document.createElement('div');card.className='banner-card';card.dataset.id=item.id;
      card.innerHTML='<div class="banner-preview"><img src="'+escapeAttr(item.imagem||'')+'" alt="" loading="lazy" onerror="this.style.display=\'none\'"></div><div class="banner-info"><div class="banner-info-titulo">'+escapeHtml(item.titulo||'Sem título')+'</div>'+(item.subtitulo?'<div class="banner-info-sub">'+escapeHtml(item.subtitulo)+'</div>':'')+'</div><div class="banner-actions"><label class="banner-toggle" title="Ativo/inativo"><input type="checkbox"'+(item.ativo!==false?' checked':'')+'><span></span></label><button class="banner-del" title="Excluir"><i class="fa-solid fa-trash"></i></button></div>';
      card.querySelector('.banner-toggle input').addEventListener('change',function(){item.ativo=this.checked});
      card.querySelector('.banner-del').addEventListener('click',function(){deleteBanner(item.id)});
      card.addEventListener('click',function(e){
        if(e.target.closest('.banner-del')||e.target.closest('.banner-toggle'))return;
        openBannerModal(item)
      });
      list.appendChild(card)
    })
  }
  var editingBannerId=null;
  function openBannerModal(item){
    editingBannerId=item?item.id:null;
    document.getElementById('bannerModalTitle').textContent=item?'Editar banner':'Novo banner';
    document.getElementById('b-imagem').value=item?item.imagem:'';
    document.getElementById('b-titulo').value=item?item.titulo:'';
    document.getElementById('b-subtitulo').value=item?item.subtitulo:'';
    document.getElementById('b-link').value=item?item.link:'';
    document.getElementById('b-ativo').checked=item?item.ativo!==false:true;
    document.getElementById('msg-banner-modal').textContent='';
    document.getElementById('bannerModal').classList.remove('hidden')
  }
  document.getElementById('addBanner').addEventListener('click',function(){openBannerModal(null)});
  document.getElementById('bannerModalCancel').addEventListener('click',function(){document.getElementById('bannerModal').classList.add('hidden')});
  document.getElementById('bannerModalSave').addEventListener('click',function(){
    var imagem=document.getElementById('b-imagem').value.trim();
    var titulo=document.getElementById('b-titulo').value.trim();
    var subtitulo=document.getElementById('b-subtitulo').value.trim();
    var link=document.getElementById('b-link').value.trim();
    var ativo=document.getElementById('b-ativo').checked;
    var msgEl=document.getElementById('msg-banner-modal');
    if(!imagem){showMsg(msgEl,'A URL da imagem é obrigatória.','error');return}
    if(editingBannerId){
      for(var i=0;i<bannersData.length;i++){
        if(bannersData[i].id===editingBannerId){
          bannersData[i].imagem=imagem;bannersData[i].titulo=titulo;
          bannersData[i].subtitulo=subtitulo;bannersData[i].link=link;bannersData[i].ativo=ativo;
          break
        }
      }
    }else{
      bannersData.push({id:uid(),imagem:imagem,titulo:titulo,subtitulo:subtitulo,link:link,ativo:ativo})
    }
    document.getElementById('bannerModal').classList.add('hidden');
    renderBanners();autoSaveBanners()
  });
  async function deleteBanner(id){
    if(!(await showConfirm('Excluir este banner?')))return;
    bannersData=bannersData.filter(function(b){return b.id!==id});
    renderBanners();autoSaveBanners()
  }
  function autoSaveBanners(){
    var sel=document.getElementById('bannerTransicao');
    if(sel)bannerTransicao=sel.value;
    saveSection('banners',{banners:bannersData,transicao:bannerTransicao},document.getElementById('msg-banners'))
  }
  document.getElementById('saveBanners').addEventListener('click',autoSaveBanners);

  // ===== GALERIA / IMAGE PICKER =====
  var imagePickerCallback=null;
  function openImagePicker(cb){
    imagePickerCallback=cb;
    loadGallery();
    document.getElementById('imagePickerModal').classList.remove('hidden')
  }
  function loadGallery(){
    var grid=document.getElementById('galleryGrid');
    fetch(BASE+'upload.php').then(function(r){return r.json()}).then(function(d){
      if(!d.success||!d.images||d.images.length===0){
        grid.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-dim)">Nenhuma imagem enviada. Clique em "Enviar imagem" para adicionar.</div>';return
      }
      grid.innerHTML='';
      d.images.forEach(function(name){
        var url='../uploads/'+name;
        var item=document.createElement('div');item.className='gallery-item';
        item.innerHTML='<img src="'+url+'" loading="lazy"><span>'+escapeHtml(name)+'</span>';
        item.addEventListener('click',function(){
          if(imagePickerCallback)imagePickerCallback(url);
          document.getElementById('imagePickerModal').classList.add('hidden')
        });
        grid.appendChild(item)
      })
    }).catch(function(){grid.innerHTML='<div style="text-align:center;padding:30px;color:var(--accent)">Erro ao carregar.</div>'})
  }
  document.getElementById('galleryFileInput').addEventListener('change',function(){
    var file=this.files[0];if(!file)return;
    var form=new FormData();form.append('image',file);
    var msgEl=document.getElementById('msg-gallery');
    showMsg(msgEl,'Enviando...','');
    fetch(BASE+'upload.php',{method:'POST',body:form}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(res){
      if(res.ok&&res.data.success){showMsg(msgEl,'','');loadGallery()}
      else{showMsg(msgEl,res.data.message||'Erro no upload.','error')}
    }).catch(function(){showMsg(msgEl,'Erro de conexão.','error')});
    this.value=''
  });
  document.getElementById('imagePickerCancel').addEventListener('click',function(){document.getElementById('imagePickerModal').classList.add('hidden')});
  // Picker buttons
  document.getElementById('bImagePickerBtn').addEventListener('click',function(){openImagePicker(function(url){document.getElementById('b-imagem').value=url})});
  document.getElementById('nImagePickerBtn').addEventListener('click',function(){openImagePicker(function(url){document.getElementById('n-imagem').value=url})});
  document.getElementById('pImagePickerBtn').addEventListener('click',function(){openImagePicker(function(url){document.getElementById('p-imagem').value=url})});

  // ===== USUÁRIOS =====
  var PERM_LABELS={streaming:'Streaming',programacao:'Programação',noticias:'Notícias',banners:'Banners',site:'Site',tema:'Tema',usuarios:'Usuários'};
  var editingUsuarioId=null;

  function loadUsuarios(){
    return fetch('../data/usuarios.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      usuariosData=(d.usuarios||[]).map(function(u){u.id=u.id||uid();return u});
      renderUsuarios()
    }).catch(function(){showMsg(document.getElementById('msg-usuarios'),'Não foi possível carregar.','error')})
  }

  function renderUsuarios(){
    var list=document.getElementById('usuariosList');
    if(usuariosData.length===0){list.innerHTML='<div class="empty">Nenhum usuário cadastrado.</div>';return}
    list.innerHTML=usuariosData.map(function(u){
      var perms=(u.permissoes||[]).map(function(p){return PERM_LABELS[p]||p}).join(', ');
      return '<div class="noticia-row"><span class="nt-titulo"><i class="fa-solid fa-user"></i> '+escapeHtml(u.username)+'</span><span class="nt-resumo" style="flex:1;flex-basis:auto">'+escapeHtml(perms||'Sem permissões')+'</span><span class="nt-acoes"><button class="edit-usuario-btn" data-id="'+escapeAttr(u.id)+'" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="delete-usuario-btn" data-id="'+escapeAttr(u.id)+'" title="Excluir"><i class="fa-solid fa-trash"></i></button></span></div>'
    }).join('')
  }

  function openUsuarioModal(item){
    editingUsuarioId=item?item.id:null;
    document.getElementById('usuarioModalTitle').textContent=item?'Editar usuário':'Novo usuário';
    document.getElementById('u-username').value=item?item.username:'';
    document.getElementById('u-username').readOnly=!!item;
    document.getElementById('u-password').value='';
    document.getElementById('u-password-hint').textContent=item?'(deixe em branco para manter a atual)':'(obrigatório)';
    var checks=document.querySelectorAll('#u-permissoes input[type="checkbox"]');
    checks.forEach(function(cb){cb.checked=false});
    if(item&&item.permissoes){
      item.permissoes.forEach(function(p){
        checks.forEach(function(cb){if(cb.value===p)cb.checked=true})
      })
    }
    document.getElementById('msg-usuario-modal').textContent='';
    document.getElementById('usuarioModal').classList.remove('hidden')
  }

  document.getElementById('usuariosList').addEventListener('click',function(e){
    var btn=e.target.closest('.edit-usuario-btn');
    if(btn){e.stopPropagation();var item=usuariosData.find(function(u){return u.id===btn.dataset.id});if(item)openUsuarioModal(item);return}
    var del=e.target.closest('.delete-usuario-btn');
    if(del){e.stopPropagation();deleteUsuario(del.dataset.id)}
  });
  document.getElementById('addUsuario').addEventListener('click',function(){openUsuarioModal(null)});
  document.getElementById('usuarioModalCancel').addEventListener('click',function(){document.getElementById('usuarioModal').classList.add('hidden')});
  document.getElementById('usuarioModalSave').addEventListener('click',function(){
    var username=document.getElementById('u-username').value.trim();
    var password=document.getElementById('u-password').value;
    var permissoes=[];
    document.querySelectorAll('#u-permissoes input[type="checkbox"]:checked').forEach(function(cb){permissoes.push(cb.value)});
    var msgEl=document.getElementById('msg-usuario-modal');
    if(!username){showMsg(msgEl,'Informe o nome de usuário.','error');return}
    if(editingUsuarioId){
      for(var i=0;i<usuariosData.length;i++){
        if(usuariosData[i].id===editingUsuarioId){
          usuariosData[i].username=username;
          usuariosData[i].permissoes=permissoes;
          if(password)usuariosData[i].password_plain=password;
          break
        }
      }
    }else{
      if(!password){showMsg(msgEl,'Informe uma senha para o novo usuário.','error');return}
      usuariosData.push({id:uid(),username:username,password_plain:password,permissoes:permissoes})
    }
    document.getElementById('usuarioModal').classList.add('hidden');
    renderUsuarios();autoSaveUsuarios()
  });

  async function deleteUsuario(id){
    if(!(await showConfirm('Excluir este usuário?')))return;
    usuariosData=usuariosData.filter(function(u){return u.id!==id});
    renderUsuarios();autoSaveUsuarios()
  }

  function autoSaveUsuarios(){
    saveSection('usuarios',{usuarios:usuariosData},document.getElementById('msg-usuarios'))
  }
  document.getElementById('saveUsuarios').addEventListener('click',autoSaveUsuarios);

  // ===== SITE =====
  function loadSite(){
    return fetch('../data/site.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      document.getElementById('site_sobre_titulo').value=d.sobre_titulo||'';
      document.getElementById('site_sobre_texto').value=d.sobre_texto||'';
      document.getElementById('site_whatsapp').value=d.whatsapp||'';
      document.getElementById('site_telefone').value=d.telefone||'';
      document.getElementById('site_email').value=d.email||'';
      document.getElementById('site_endereco').value=d.endereco||'';
      var r=d.redes_sociais||{};
      document.getElementById('site_instagram').value=r.instagram||'';
      document.getElementById('site_facebook').value=r.facebook||'';
      document.getElementById('site_youtube').value=r.youtube||'';
      document.getElementById('site_tiktok').value=r.tiktok||'';
    }).catch(function(){showMsg(document.getElementById('msg-site'),'Não foi possível carregar.','error')})
  }
  document.getElementById('saveSite').addEventListener('click',function(){
    saveSection('site',{sobre_titulo:document.getElementById('site_sobre_titulo').value.trim(),sobre_texto:document.getElementById('site_sobre_texto').value.trim(),whatsapp:document.getElementById('site_whatsapp').value.trim(),telefone:document.getElementById('site_telefone').value.trim(),email:document.getElementById('site_email').value.trim(),endereco:document.getElementById('site_endereco').value.trim(),redes_sociais:{instagram:document.getElementById('site_instagram').value.trim(),facebook:document.getElementById('site_facebook').value.trim(),youtube:document.getElementById('site_youtube').value.trim(),tiktok:document.getElementById('site_tiktok').value.trim()}},document.getElementById('msg-site'))
  });

  // ===== TEMA =====
  var THEME_PRESETS=[{key:'vermelho',label:'Vermelho',color:'#ff0033'},{key:'azul',label:'Azul',color:'#2979ff'},{key:'verde',label:'Verde',color:'#00c853'},{key:'amarelo',label:'Amarelo',color:'#ffc400'},{key:'dourado',label:'Dourado',color:'#d4af37'},{key:'roxo',label:'Roxo',color:'#9c27b0'},{key:'laranja',label:'Laranja',color:'#ff6d00'},{key:'rosa',label:'Rosa',color:'#ff2d78'}];
  var currentTheme={preset:'vermelho',custom_accent:''};
  function renderThemeGrid(){
    var grid=document.getElementById('themeGrid');
    grid.innerHTML=THEME_PRESETS.map(function(t){return'<button type="button" class="theme-swatch '+(currentTheme.preset===t.key&&!currentTheme.custom_accent?'selected':'')+'" data-preset="'+t.key+'" style="--swatch-color:'+t.color+'"><span class="dot"></span><span>'+t.label+'</span></button>'}).join('');
    grid.querySelectorAll('.theme-swatch').forEach(function(btn){btn.addEventListener('click',function(){currentTheme.preset=btn.dataset.preset;currentTheme.custom_accent='';document.getElementById('customColorText').value='';renderThemeGrid();applyThemePreview();persistTheme()})})
  }
  function applyThemePreview(){
    var root=document.documentElement;
    if(currentTheme.custom_accent){root.style.setProperty('--accent',currentTheme.custom_accent);root.style.setProperty('--accent-dim',currentTheme.custom_accent+'55')}
    else{root.removeAttribute('style');root.setAttribute('data-theme',currentTheme.preset)}
  }
  function loadTema(){
    return fetch('../data/theme.json?_='+Date.now()).then(function(r){return r.json()}).then(function(d){
      currentTheme={preset:d.preset||'vermelho',custom_accent:d.custom_accent||''};
      document.getElementById('customColorInput').value=currentTheme.custom_accent||'#ff0033';
      document.getElementById('customColorText').value=currentTheme.custom_accent||'';
      renderThemeGrid()
    }).catch(function(){renderThemeGrid();showMsg(document.getElementById('msg-tema'),'Não foi possível carregar.','error')})
  }
  document.getElementById('customColorInput').addEventListener('input',function(e){currentTheme.custom_accent=e.target.value;document.getElementById('customColorText').value=e.target.value;renderThemeGrid();applyThemePreview()});
  document.getElementById('customColorInput').addEventListener('change',function(){persistTheme()});
  document.getElementById('customColorText').addEventListener('change',function(e){var v=e.target.value.trim();if(/^#([0-9a-f]{6})$/i.test(v)){currentTheme.custom_accent=v;document.getElementById('customColorInput').value=v;renderThemeGrid();applyThemePreview();persistTheme()}});
  document.getElementById('clearCustomColor').addEventListener('click',function(){currentTheme.custom_accent='';document.getElementById('customColorText').value='';renderThemeGrid();applyThemePreview();persistTheme()});
  document.getElementById('saveTema').addEventListener('click',function(){persistTheme()});
  function persistTheme(){saveSection('tema',currentTheme,document.getElementById('msg-tema'))}

  // ===== SAVE =====
  function saveSection(section,payload,msgEl){
    showMsg(msgEl,'Salvando...','');
    fetch(BASE+'save.php?section='+section,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d,status:r.status}})}).then(function(res){
      if(res.ok&&res.data.success){showMsg(msgEl,'Salvo com sucesso.','success')}
      else if(res.status===401){showMsg(msgEl,'Sessão expirada. Faça login novamente.','error');showLogin()}
      else{showMsg(msgEl,res.data.message||'Erro ao salvar.','error')}
    }).catch(function(){showMsg(msgEl,'Erro de conexão com o servidor.','error')})
  }
  checkSession();
})();
