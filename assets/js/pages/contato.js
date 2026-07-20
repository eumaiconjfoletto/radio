fetch('../data/site.json?_='+Date.now()).then(function(r){return r.ok?r.json():Promise.reject()}).then(renderContact).catch(function(){document.getElementById('contactList').innerHTML='<p style="color:var(--text-dim);font-size:13px;">Não foi possível carregar essas informações agora.</p>'});
function renderContact(data){
  var items=[];
  if(data.whatsapp){var d=data.whatsapp.replace(/\D/g,'');items.push({icon:'fa-brands fa-whatsapp',label:'WhatsApp',value:data.telefone||data.whatsapp,href:'https://wa.me/'+d})}
  if(data.telefone&&!data.whatsapp){items.push({icon:'fa-solid fa-phone',label:'Telefone',value:data.telefone})}
  if(data.email){items.push({icon:'fa-solid fa-envelope',label:'E-mail',value:data.email,href:'mailto:'+data.email})}
  if(data.endereco){items.push({icon:'fa-solid fa-location-dot',label:'Endereço',value:data.endereco})}
  document.getElementById('contactList').innerHTML=items.map(function(i){return'<'+(i.href?'a href="'+escapeAttr(i.href)+'" target="_blank" rel="noopener"':'div')+' class="contact-item"><i class="'+i.icon+'"></i><div><div class="label">'+escapeHtml(i.label)+'</div><div class="value">'+escapeHtml(i.value)+'</div></div></'+(i.href?'a':'div')+'>'}).join('');
  var redes=data.redes_sociais||{};
  var icons={instagram:'fa-brands fa-instagram',facebook:'fa-brands fa-facebook-f',youtube:'fa-brands fa-youtube',tiktok:'fa-brands fa-tiktok'};
  var html='';
  for(var key in redes){if(redes.hasOwnProperty(key)&&redes[key]){html+='<a class="social-btn" href="'+escapeAttr(redes[key])+'" target="_blank" rel="noopener" aria-label="'+escapeAttr(key)+'"><i class="'+(icons[key]||'fa-solid fa-link')+'"></i></a>'}}
  document.getElementById('socialList').innerHTML=html
}
