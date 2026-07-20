fetch('../data/site.json?_='+Date.now()).then(function(r){return r.ok?r.json():Promise.reject()}).then(function(data){
  document.querySelector('.wrap h1').innerHTML='<i class="fa-solid fa-circle-info"></i>'+(data.sobre_titulo||'Sobre a Rádio');
  document.getElementById('texto').textContent=data.sobre_texto||''
}).catch(function(){document.getElementById('texto').textContent='Não foi possível carregar essas informações agora.'});
