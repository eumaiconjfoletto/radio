function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escapeAttr(v){return String(v??'').replace(/"/g,'&quot;')}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function formatDateBR(v){if(!v)return '';const d=new Date(v+'T00:00:00');return isNaN(d.getTime())?v:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}
function normalizeStr(v){return String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function parseHorarioRange(h){const m=String(h??'').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);if(!m)return null;return{start:Number(m[1])*60+Number(m[2]),end:Number(m[3])*60+Number(m[4])}}
function isNowWithin(r){if(!r)return false;const n=new Date();const m=n.getHours()*60+n.getMinutes();return r.end>=r.start?m>=r.start&&m<r.end:m>=r.start||m<r.end}
function isProgramNow(p){if(!p)return false;var today=new Date().getDay();if(p.dias){return p.dias.indexOf(today)!==-1&&isNowWithin(parseHorarioRange(p.horario))}return diaMatchesToday(p.dia)&&isNowWithin(parseHorarioRange(p.horario))}
function diaMatchesToday(diaRaw){const d=normalizeStr(diaRaw);const t=new Date().getDay();const w=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];if(/todos os dias|diariamente|diario/.test(d))return true;if(/segunda a sexta|seg a sex|dias uteis/.test(d))return t>=1&&t<=5;if(/fim de semana/.test(d)||(d.includes('sabado')&&d.includes('domingo')))return t===0||t===6;return d.includes(w[t])}
