(function(){
let TODAY='';
const ROLES={matheus:'Matheus · Spraytec',diretoria:'Diretoria · Spraytec',cancha:'Cancha (equipe)',produtora:'Produtora de vídeo'};
const STATUS={
  pauta:{l:'Pauta',c:'--s-pauta'}, producao:{l:'Em produção',c:'--s-producao'}, aprovacao:{l:'Em aprovação',c:'--s-aprovacao'},
  validacao:{l:'Validação interna Spraytec',c:'--s-validacao'}, ajuste:{l:'Ajuste solicitado',c:'--s-ajuste'}, aprovado:{l:'Aprovado',c:'--s-aprovado'},
  agendado:{l:'Agendado',c:'--s-agendado'}, publicado:{l:'Publicado',c:'--s-publicado'}, espera:{l:'Em espera',c:'--s-espera'}
};
const ST_CURTO={pauta:'Pauta',producao:'Produção',aprovacao:'Aprovação',validacao:'Validação',ajuste:'Ajuste',aprovado:'Aprovado',agendado:'Agendado',publicado:'Feito',espera:'Em espera'};
const NET={ig:'IG',fb:'FB',yt:'YT',ads:'ADS',email:'E-MAIL',design:'DESIGN',video:'VÍDEO'};
const NETNAME={ig:'Instagram',fb:'Facebook',yt:'YouTube',ads:'Mídia paga',email:'E-mail marketing',design:'Design',video:'Vídeo'};
const FORMATO={carrossel:'Carrossel',post:'Post',story:'Story',reel:'Reel',video:'Vídeo',short:'Short',newsletter:'Newsletter',plano:'Plano de mídia',pecas:'Peça em 3 formatos',producao:'Produção de peças',gravacao:'Gravação',entrega:'Entrega do vídeo'};
const PILAR_HUE={Manejo:'#D7E6A3',Campo:'#BFD9C2',Produto:'#E9D7A8',Educação:'#C9DCEB',Institucional:'#E2D6E8',Relacionamento:'#F0CDBF',Eventos:'#F3E0B5'};
const HOLIDAYS={'2026-09-07':'Independência','2026-10-12':'N. Sra. Aparecida','2026-11-02':'Finados','2026-11-15':'Proclamação','2026-11-20':'Consc. Negra','2026-12-25':'Natal','2027-01-01':'Ano-novo','2027-02-08':'Carnaval','2027-02-09':'Carnaval','2027-03-26':'Sexta-feira Santa','2027-04-21':'Tiradentes','2027-05-01':'Dia do Trabalho','2027-05-27':'Corpus Christi','2027-09-07':'Independência','2027-10-12':'N. Sra. Aparecida','2027-11-02':'Finados','2027-11-15':'Proclamação','2027-11-20':'Consc. Negra','2027-12-25':'Natal'};
const PESO={carrossel:2,post:1,story:1,pecas:1};
const TIPOS=[['post','Posts'],['email','E-mail marketing'],['design','Design'],['video','Vídeo'],['demanda','Demandas']];

let posts=[];

const STAGES=[['pauta','Pauta'],['viabilidade','Viabilidade'],['roteiro','Roteiro'],['gravacao','Gravação e edição']];
let videos=[];

let MARCOS=[];
const MK_TIPO={safra:'Safra',comercial:'Foco comercial',evento:'Evento',recesso:'Recesso'};

let demandas=[];
const QUEM={cancha:'Cancha',spraytec:'Spraytec'};

// ===================== FONTE DE DADOS: EXEMPLO =====================
// Tudo o que depende das integrações (Drive, Meta, Google, Brevo) vem desta seção, com selo "Exemplo".
// Quando cada integração entrar, ela substitui o bloco correspondente sem mudar as telas.
const EX='<span class="exemplo" title="Dado de exemplo: a integração ainda não está conectada">Exemplo</span>';
const ACERVO_BASE=[
  ['Soja em V4, oeste do PR','foto','Soja','Linha foliar','Plantio','Time de campo','#D7E6A3'],
  ['Pulverização com drone','vídeo','Soja','—','Pós-emergência','Produtora','#BFD9C2'],
  ['Fábrica Maringá, linha 2','vídeo','—','—','Institucional','Produtora','#E2D6E8'],
  ['Milho safrinha, colheita','foto','Milho','Bioestimulante','Colheita','Time de campo','#E9D7A8'],
  ['Dia de campo Cascavel','foto','Soja','—','Eventos','Evento','#F3E0B5'],
  ['Embalagens linha foliar','foto','—','Linha foliar','Produto','Spraytec','#C9DCEB'],
  ['Depoimento produtor Toledo','vídeo','Soja','Linha foliar','Plantio','Produtora','#BFD9C2'],
  ['Trigo no PR, perfilhamento','foto','Trigo','Bioestimulante','Inverno','Time de campo','#D7E6A3'],
  ['Laboratório de qualidade','foto','—','—','Institucional','Spraytec','#E2D6E8'],
  ['Ensaio safra 25/26','vídeo','Soja','Bioestimulante','Florescimento','Produtora','#F0CDBF'],
  ['RTV com produtor','foto','Milho','—','Relacionamento','Time de campo','#F0CDBF'],
  ['Aplicação foliar ao amanhecer','foto','Soja','Linha foliar','Pós-emergência','Time de campo','#D7E6A3'],
];
const PASTAS=['Soja','Milho','Trigo','Institucional','Vídeos da produtora'];

function addDays(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dow(iso){return new Date(iso+'T12:00:00Z').getUTCDay()}
function isBiz(iso){const w=dow(iso);return w!==0&&w!==6&&!HOLIDAYS[iso]}

let acervo=[],stories=[],darkposts=[],STORIES_DESDE='';
function carregarFonteExemplo(){
  const f=iso=>iso.slice(8)+'/'+iso.slice(5,7);
  acervo=ACERVO_BASE.map((a,i)=>({id:'a'+i,titulo:a[0],tipo:a[1],cultura:a[2],produto:a[3],safra:a[4],origem:a[5],cor:a[6],
    pasta:a[5]==='Produtora'?'Vídeos da produtora':a[2]!=='—'?a[2]:'Institucional',
    arquivo:a[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')+(a[1]==='vídeo'?'.mp4':'.jpg'),
    mod:f(addDays(TODAY,-[4,6,10,17,19][i%5]))}));
  // stories capturados enquanto estão no ar (26 dias úteis para trás)
  const STORY_TEMAS=[['Lavoura de cliente em Toledo','Campo'],['Visita de RTV','Relacionamento'],['Pulverização ao amanhecer','Manejo'],['Dia de campo','Eventos'],['Embalagens na revenda','Produto'],['Equipe na fábrica','Institucional']];
  STORIES_DESDE=addDays(TODAY,-25);stories=[];
  {let d=TODAY,k=0;while(stories.length<26&&d>=STORIES_DESDE){if(isBiz(d)){const nq=d===TODAY?2:2+(k%3);for(let j=0;j<nq;j++){const tm=STORY_TEMAS[(k+j)%6];stories.push({date:d,hora:['09:12','10:40','11:15','15:02','16:30'][(j+k)%5],tipo:j===0&&k%4===1?'agendado':'repost',titulo:tm[0],pilar:tm[1],alcance:800+((k*7+j*13)%9)*140,respostas:(k+j)%6})}k++}d=addDays(d,-1)}}
  const m0=TODAY.slice(0,8),ult=new Date(Date.UTC(+TODAY.slice(0,4),+TODAY.slice(5,7),0)).getUTCDate();
  const pm=addDays(m0+'01',-1);
  darkposts=[
    {titulo:'Conheça a linha foliar Spraytec',campanha:'Meta · Remarketing de visitantes',periodo:'01/'+TODAY.slice(5,7)+' a '+ult+'/'+TODAY.slice(5,7),status:'Ativo',pilar:'Produto',impr:'182 mil',cliques:'2.140'},
    {titulo:'Seu pulverizador está jogando produto fora?',campanha:'Meta · Tráfego para o site',periodo:'03/'+TODAY.slice(5,7)+' a '+ult+'/'+TODAY.slice(5,7),status:'Ativo',pilar:'Manejo',impr:'96 mil',cliques:'1.310'},
    {titulo:'Bioestimulante no florescimento',campanha:'Meta · Contatos (teste A)',periodo:f(addDays(TODAY,-6))+' a '+f(addDays(TODAY,8)),status:'Ativo',pilar:'Produto',impr:'41 mil',cliques:'620'},
    {titulo:'Plantio forte começa no tratamento de sementes',campanha:'Meta · Alcance',periodo:'01/'+pm.slice(5,7)+' a '+f(pm),status:'Encerrado',pilar:'Manejo',impr:'240 mil',cliques:'1.980'},
  ];
}


// LIGAÇÕES entre itens: tudo conversa (post, design, vídeo, e-mail, demanda)
let LINKS=[];
function related(ref){return LINKS.filter(l=>l[0]===ref||l[1]===ref).map(l=>l[0]===ref?l[1]:l[0]).filter((x,i,a)=>a.indexOf(x)===i)}
function resolve(ref){const [k,id]=ref.split(':');
  if(k==='p'){const p=posts.find(x=>x.id===id);if(!p)return null;const tc=tipoCal(p);return {k,id,t:p.titulo,tipo:{post:NETNAME[p.rede],email:'E-mail',design:'Design',video:'Vídeo',midia:'Mídia paga'}[tc],kc:tc==='midia'?'--muted':'--k-'+tc,st:STATUS[p.status].l,date:p.date,attr:`data-open="${id}"`}}
  if(k==='d'){const d=demandas.find(x=>x.id===id);return d&&{k,id,t:d.t,tipo:'Demanda '+QUEM[d.quem],kc:'--k-'+d.quem,st:d.feito?'Concluída':'Em aberto',date:d.data,attr:`data-dem="${id}"`}}
  const v=videos.find(x=>x.id===id);return v&&{k,id,t:'Pauta: '+v.titulo,tipo:'Vídeo',kc:'--k-video',st:(STAGES.find(s=>s[0]===v.stage)||[0,'Entregue'])[1],date:null,attr:`data-video="${id}"`}}
function linksSection(ref){let r=related(ref).map(resolve).filter(Boolean);if(S.role==='produtora')r=r.filter(x=>x.k==='v');if(!r.length)return'';
  return `<div><div class="eyebrow" style="margin-bottom:6px">Ligado a · ${r.length}</div><div class="list">${r.map(x=>`<div class="row clickable" ${x.attr}><span class="kt" style="--kc:var(${x.kc});min-width:86px">${esc(x.tipo.toUpperCase())}</span><div class="grow t">${esc(x.t)}</div><span class="muted mono" style="font-size:12px">${x.date?fmt(x.date):''}</span><span class="muted" style="font-size:12px;white-space:nowrap">${x.st}</span></div>`).join('')}</div></div>`}

// CONVERSAS (tipo Slack, por tema)
let threads=[];
function unreadCount(){const me=isM()?'matheus':'cancha';return threads.reduce((a,t)=>a+t.unread[me],0)}
function chatSection(){
  const me=isM()?'matheus':'cancha';
  if(!threads.length)return `<section class="panel"><h2>Conversas com a Cancha</h2><p class="muted">Nenhuma conversa ainda.</p><button class="btn" data-act="novo-tema">Novo tema</button>${S.novoTema?`<div class="newt" style="margin-top:8px"><input type="text" id="nt" placeholder="Tema da conversa" aria-label="Tema da conversa"><button class="btn primary" data-act="criar-tema">Criar</button></div>`:''}</section>`;
  const th=threads.find(t=>t.id===S.thread)||threads[0];S.thread=th.id;
  if(th.unread[me]){th.unread[me]=0;acaoSilenciosa('conversa-lida',{id:th.id})}
  const r=th.ref&&resolve(th.ref);
  return `<section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Conversas com a Cancha</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Cada conversa tem um tema, e tudo fica registrado.</p></div></div>
  <div class="chat">
   <aside class="threads">${S.novoTema?`<div class="newt"><input type="text" id="nt" placeholder="Tema da conversa" aria-label="Tema da conversa"><button class="btn primary" data-act="criar-tema">Criar</button></div>`:`<button class="btn" data-act="novo-tema">Novo tema</button>`}
    ${threads.map(t=>{const last=t.msgs[t.msgs.length-1];const un=t.unread[me];return `<button class="thr" data-thread="${t.id}" aria-pressed="${t.id===th.id}"><span class="tt"><span># ${esc(t.tema)}</span>${un?`<span class="badge">${un}</span>`:''}</span><span class="ls">${last?esc(last.nome+': '+last.txt):'Sem mensagens ainda'}</span></button>`}).join('')}</aside>
   <div class="conv"><div class="convh"><b># ${esc(th.tema)}</b>${S.linkPick?`<span class="linkpick"><label for="ld" class="muted" style="font-size:12px">Demanda</label><select id="ld">${demandas.filter(x=>!x.feito||'d:'+x.id===th.ref).sort((a,b)=>a.data.localeCompare(b.data)).map(x=>`<option value="d:${x.id}" ${'d:'+x.id===th.ref?'selected':''}>${fmt(x.data)} · ${esc(x.t)} (${QUEM[x.quem]})</option>`).join('')}</select><button class="btn primary" data-act="ligar-salvar">Ligar</button>${th.ref?'<button class="btn" data-act="ligar-remover">Remover ligação</button>':''}<button class="btn" data-act="ligar-cancelar">Cancelar</button></span>`
      :r?`<button class="lnk" ${r.attr}>Ligado a <span class="kt" style="--kc:var(${r.kc})">${esc(r.tipo.toUpperCase())}</span> ${esc(r.t)}</button><button class="linkbtn" data-act="ligar-abrir">Trocar</button>`:`<button class="linkbtn" data-act="ligar-abrir">+ Ligar a uma demanda</button>`}</div>
    <div class="msgs" id="msgs">${th.msgs.map(m=>`<div class="msg"><span class="av2 ${m.de}">${m.nome[0]}</span><div style="min-width:0"><div class="mh"><b>${esc(m.nome)}</b><span class="muted mono" style="font-size:11px">${m.q}</span></div><div>${esc(m.txt)}</div></div></div>`).join('')||'<p class="muted">Comece a conversa.</p>'}</div>
    <div class="composer"><textarea id="cm" rows="2" placeholder="Escrever em # ${esc(th.tema)}" aria-label="Mensagem"></textarea><button class="btn primary" data-act="enviar-msg">Enviar</button></div></div>
  </div></section>`;
}
function demChip(d,drag){return `<div class="dm ${d.feito?'done':''} ${!d.feito&&d.data<TODAY?'late':''}" style="--kc:var(--k-${d.quem})" data-dem="${d.id}" ${drag&&!d.feito?`draggable="true" data-ddrag="${d.id}"`:''}><span class="who">${QUEM[d.quem].toUpperCase()}</span><span>${esc(d.t)}</span></div>`}

// PLANO DE MÍDIA ATUAL: uma estratégia unificada (jornada, temas, ritmo, fases). Editado por blocos pela Cancha; alterações vão para aprovação.
const clone=o=>JSON.parse(JSON.stringify(o));
const CH={social:'Social',trafego:'Tráfego pago',email:'E-mail',design:'Design',video:'Vídeo'};
const CH_COR={social:'--k-post',trafego:'--k-trafego',email:'--k-email',design:'--k-design',video:'--k-video'};
const PF_COR={'Meta Ads':'#2F6FA8','Google Ads':'#3E8E4E','YouTube Ads':'#C2492F'};
let plano=null,planoItem=null;
const PARTES=[['objetivo','Objetivo e metas'],['jornada','Jornada do produtor'],['temas','Temas do período'],['ritmo','Ritmo e investimento']];
const TPL={acao:{c:'social',t:''},etapa:{n:'',d:'',acoes:[{c:'social',t:''}]},tema:{n:'',prod:'',periodo:'',msg:'',acoes:[{c:'social',t:''}]},ritmo:{num:'',unid:'',c:'social'},verba:{k:'',v:0},fase:{n:'',d:''},crono:{d:'',t:''},str:''};
function getPath(o,p){return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o)}
function setPath(o,p,v){const ks=p.split('.');const last=ks.pop();const t=ks.reduce((a,k)=>a[k],o);t[last]=v}
function partOf(d,k){return k==='objetivo'?{o:d.objetivo,i:d.objItens,m:d.metas}:k==='ritmo'?{r:d.ritmo,v:d.verba}:k==='fases'?{f:d.fases,a:d.fase}:d[k]}
function changedParts(cur){return PARTES.filter(([k])=>JSON.stringify(partOf(cur,k))!==JSON.stringify(partOf(plano.dados,k))).map(p=>p[0])}
function curPlano(){return S.pdraft||(plano.pendente?plano.pendente.dados:plano.dados)}
function emph(t){return esc(t).replace(/(R\$\s?[\d.]+|(?<![\/\d])\d+(?:[.,]\d+)?(?![\/\d]))/g,'<b class="num">$1</b>')}
const brl=v=>'R$ '+n(v);
const totVerba=d=>d.verba.reduce((a,b)=>a+Number(b.v||0),0);
// diferença em relação à versão aprovada
function wasP(path,cur,f){const o=getPath(plano.dados,path);return o!==undefined&&String(o)!==String(cur)?`<span class="was">${f?f(o):esc(o)}</span>`:''}
function isNew(path){return getPath(plano.dados,path)===undefined}
function removed(path,len){const o=getPath(plano.dados,path)||[];return o.slice(len)}
const chip=c=>`<span class="ch" style="--kc:var(${CH_COR[c]||'--muted'})">${CH[c]||c}</span>`;
function acoesView(path,acoes){return `<ul class="acoes">${acoes.map((a,i)=>{const p=path+'.'+i;const nw=isNew(p),old=getPath(plano.dados,p);const ch=!nw&&(old.t!==a.t||old.c!==a.c);
  return `<li class="${nw?'dadd':''}">${chip(a.c)}<span>${esc(a.t)}${ch?`<span class="was">${esc(old.t)}</span>`:''}</span></li>`}).join('')}${removed(path,acoes.length).map(a=>`<li class="ddel">${chip(a.c)}<span>${esc(a.t)}</span></li>`).join('')}</ul>`}
function chgTag(k,ch){return ch.includes(k)?'<span class="tag chgtag">alterado</span>':''}
function editBtn(k){return isTeam()&&S.pedit!==k?`<button class="pedit" data-act="pe-edit" data-card="${k}" aria-label="Editar ${(PARTES.find(p=>p[0]===k)||[k,k])[1]}">Editar</button>`:''}

// campos de edição (ligados ao rascunho por caminho)
function fld(bind,val,attrs,label){const o=getPath(plano.dados,bind);return `<input data-bind="${bind}" value="${esc(val)}" data-orig="${esc(o===undefined?'':o)}" class="pe ${String(val)!==String(o===undefined?'':o)?'chgd':''}" aria-label="${esc(label||'')}" ${attrs||''}>`}
function chSel(bind,val){const o=getPath(plano.dados,bind);return `<select data-bind="${bind}" class="pe chsel" data-orig="${o||''}" aria-label="Frente">${Object.entries(CH).map(([k,l])=>`<option value="${k}" ${val===k?'selected':''}>${l}</option>`).join('')}</select>`}
function delBtn(path,i,label){return `<button class="iconbtn" data-act="pa-del" data-path="${path}" data-idx="${i}" aria-label="${label}">×</button>`}
function addBtn(path,tpl,label){return `<button class="linkbtn" data-act="pa-add" data-path="${path}" data-tpl="${tpl}">+ ${label}</button>`}
function acoesEdit(path,acoes){return `<div class="le">${acoes.map((a,i)=>`<div class="ler">${chSel(`${path}.${i}.c`,a.c)}${fld(`${path}.${i}.t`,a.t,'type="text" placeholder="O que essa frente faz aqui"','Ação')}${delBtn(path,i,'Remover ação')}</div>`).join('')}${addBtn(path,'acao','Adicionar ação')}</div>`}
function doneBtn(){return `<div class="actions"><button class="btn dark" data-act="pe-done">Concluir edição</button></div>`}

// ===== QUADRO DA ESTRATÉGIA (matriz jornada × frentes, com verba e resultado por momento) =====
const FRENTES_Q=[['social','Social'],['trafego','Tráfego pago'],['email','E-mail'],['design','Design'],['video','Vídeo']];
const IND={alcance:'Alcance',cliques:'Cliques',contatos:'Contatos',interacoes:'Interações'};
function indValor(k){const F=funilStats({de:TODAY.slice(0,8)+'01',ate:TODAY},true);const SC=socialStats({de:TODAY.slice(0,8)+'01',ate:TODAY});
  return {alcance:fk(F.impr+SC.alc),cliques:fk(F.clk),contatos:String(metaMes().cont),interacoes:fk(SC.inter)}[k]||'—'}
const edT=(k,attrs)=>isTeam()?`data-act="pop" data-pk="${k}" ${attrs||''} tabindex="0" role="button"`:'';
function cellTexts(d,i,f){return ((d.jornada[i]||{}).acoes||[]).filter(a=>a.c===f).map(a=>a.t)}
function planoVisual(){
  const cur=curPlano(),old=plano.dados,m=metaMes();
  const tot=totVerba(cur),totO=totVerba(old),stTot=cur.jornada.reduce((a,e)=>a+Number(e.v||0),0)||1;
  const chObj=JSON.stringify([cur.objetivo,cur.metas])!==JSON.stringify([old.objetivo,old.metas]);
  const F=funilStats({de:TODAY.slice(0,8)+'01',ate:TODAY},true);
  // 1. tese e metas ao vivo
  const hero=`<section class="qhero ${chObj?'qchg':''}" ${edT('tese')}>
    <div class="qtese"><span class="eyebrow">A aposta do período</span><h3>${esc(cur.objetivo)}</h3>${wasP('objetivo',cur.objetivo)}${cur.objItens.length?`<p class="muted">${cur.objItens.map(esc).join(' · ')}</p>`:''}</div>
    <div class="qmetas">
     <div class="qm"><span class="ql">Contatos no mês ${EX}</span><b>${m.cont}<small> / ${cur.metas.contatos}</small></b>${wasP('metas.contatos',cur.metas.contatos,v=>'meta '+v)}<div class="qbar"><i style="width:${Math.min(100,m.cont/cur.metas.contatos*100)}%"></i><u style="left:${Math.min(100,m.proj/Math.max(cur.metas.contatos,m.proj)*100)}%"></u></div><span class="ql">projeção ${m.proj} · ${m.proj>=cur.metas.contatos?'<em class="okt">no caminho</em>':'<em class="badt">abaixo</em>'}</span></div>
     <div class="qm"><span class="ql">Custo por contato ${EX}</span><b>R$ ${Math.round(m.cpl)}</b><span class="ql">meta até R$ ${cur.metas.cpl}${wasP('metas.cpl',cur.metas.cpl,v=>' (era R$ '+v+')')} · ${m.cpl<=cur.metas.cpl?'<em class="okt">dentro</em>':'<em class="badt">acima</em>'}</span></div>
     <div class="qm"><span class="ql">Retorno sobre a mídia ${EX}</span><b>${(F.rec/F.inv).toFixed(1).replace('.',',')}x</b><span class="ql">receita atribuída ${fk(F.rec)}</span></div>
    </div></section>`;
  // 2. matriz
  const cols=cur.jornada.length;
  const gridStyle=`grid-template-columns:132px repeat(${cols},minmax(150px,1fr))`;
  const head=`<div class="qc qcorner"><span class="eyebrow">Jornada do produtor →</span></div>${cur.jornada.map((e,i)=>{const o=old.jornada[i];const ch=!o||o.n!==e.n||o.d!==e.d;
    return `<div class="qc qhead ${ch?'qchg':''}" ${edT('etapa',`data-i="${i}"`)}><span class="qn">${i+1}</span><b>${esc(e.n)}</b>${o&&o.n!==e.n?`<span class="was">${esc(o.n)}</span>`:''}<span class="muted">${esc(e.d)}</span></div>`}).join('')}`;
  const rows=FRENTES_Q.map(([f,l])=>`<div class="qc qrow" style="--kc:var(${CH_COR[f]})"><i></i>${l}</div>${cur.jornada.map((e,i)=>{const tx=cellTexts(cur,i,f),ot=cellTexts(old,i,f);const ch=JSON.stringify(tx)!==JSON.stringify(ot);
    return `<div class="qc qcell ${tx.length?'':'empty'} ${ch?'qchg':''}" style="--kc:var(${CH_COR[f]})" ${edT('cell',`data-i="${i}" data-f="${f}"`)}>${tx.map(t=>`<span class="qa ${ot.includes(t)?'':'qnew'}">${esc(t)}</span>`).join('')}${ot.filter(t=>!tx.includes(t)).map(t=>`<span class="qa qdel">${esc(t)}</span>`).join('')}${!tx.length&&isTeam()?'<span class="qplus">+</span>':''}</div>`}).join('')}`).join('');
  const verba=`<div class="qc qrow qfoot"><i style="background:var(--ink)"></i>Verba</div>${cur.jornada.map((e,i)=>{const o=old.jornada[i];const pc=Math.round((e.v||0)/stTot*100);
    return `<div class="qc qfoot ${o&&o.v!==e.v?'qchg':''}" ${edT('etapa',`data-i="${i}"`)}><b>${brl(e.v||0)}</b>${o&&o.v!==e.v?`<span class="was">${brl(o.v||0)}</span>`:''}<div class="qvb"><i style="width:${pc}%"></i></div><span class="muted">${pc}% da verba</span></div>`}).join('')}`;
  const res=`<div class="qc qrow qfoot"><i style="background:var(--ok)"></i>Resultado ${EX}</div>${cur.jornada.map(e=>`<div class="qc qfoot"><b>${indValor(e.ind)}</b><span class="muted">${IND[e.ind]||'—'} no mês</span></div>`).join('')}`;
  const matriz=`<section class="qwrap"><div class="qhd"><div><h3>Como cada frente leva o produtor de um passo ao outro</h3><p class="muted">Leia por coluna para ver a jornada, ou por linha para ver o papel de cada frente.</p></div>
    <div class="qtot"><span class="ql">Investimento em mídia</span><b>${brl(tot)}<small>/mês</small></b>${tot!==totO?`<span class="was">${brl(totO)}</span>`:''}<span class="ql">${cur.verba.map(x=>esc(x.k.replace(/ Ads$/,''))+' '+fk(x.v)).join(' · ')}</span></div></div>
    <div class="qscroll"><div class="qgrid" style="${gridStyle}">${head}${rows}${verba}${res}</div></div></section>`;
  // 3. temas numa linha do tempo
  // períodos no formato "dd/mm a dd/mm"; o ano é o mais próximo de hoje
  const isoDM=(d,mo)=>{let y=+TODAY.slice(0,4);let s=y+'-'+mo+'-'+d;if(s<addDays(TODAY,-180))s=(y+1)+'-'+mo+'-'+d;else if(s>addDays(TODAY,180))s=(y-1)+'-'+mo+'-'+d;return s};
  const dts=t=>{const m2=String(t.periodo).match(/(\d{2})\/(\d{2})\s*a\s*(\d{2})\/(\d{2})/);if(!m2)return null;const a=isoDM(m2[1],m2[2]);let b=isoDM(m2[3],m2[4]);if(b<a)b=a;return [a,b]};
  const per=cur.temas.map(dts).filter(Boolean);const ini=per.length?per.map(x=>x[0]).sort()[0]:TODAY.slice(0,8)+'01';const fim=per.length?per.map(x=>x[1]).sort().slice(-1)[0]:addDays(ini,30);
  const span=Math.max(1,Math.round((Date.parse(fim)-Date.parse(ini))/864e5)+1);const pos=iso=>Math.round((Date.parse(iso)-Date.parse(ini))/864e5)/span*100;
  const temas=`<section class="qwrap"><div class="qhd"><div><h3>Temas do período</h3><p class="muted">A mensagem que todas as frentes levam ao mesmo tempo.</p></div>${isTeam()?'<button class="linkbtn" data-act="pop" data-pk="tema-novo">+ Tema</button>':''}</div>
    <div class="qtl"><div class="qscale">${[0,1,2,3,4].map(k=>{const d=addDays(ini,Math.round(k*(span-1)/4));return `<span style="left:${Math.min(92,pos(d))}%">${fmt(d)}</span>`}).join('')}</div>
    ${cur.temas.map((t,i)=>{const r=dts(t)||[ini,fim];const [a,b]=r;const o=old.temas[i];const ch=!o||JSON.stringify(o)!==JSON.stringify(t);const n2=posts.filter(p=>p.date&&p.date>=a&&p.date<=b).length;
      const L=Math.min(pos(a),80),W=Math.min(100-L,Math.max(18,(Math.round((Date.parse(b)-Date.parse(a))/864e5)+1)/span*100));
      return `<div class="qtrow"><div class="qtbar ${ch?'qchg':''}" style="left:${L}%;width:${W}%" ${edT('tema',`data-i="${i}"`)}><b>${esc(t.n)}</b><span>${esc(t.msg)}</span><em>${esc(t.prod)} · ${esc(t.periodo)} · ${n2} itens no calendário</em></div></div>`}).join('')}</div></section>`;
  // 4. ritmo
  const ritmo=`<section class="qrit" ${edT('ritmo')}><span class="eyebrow">Ritmo de entregas</span>${cur.ritmo.map((r,i)=>{const o=old.ritmo[i];const ch=!o||o.num!==r.num||o.unid!==r.unid;return `<span class="qr ${ch?'qchg':''}" style="--kc:var(${CH_COR[r.c]||'--ink'})"><b>${esc(r.num)}</b> ${esc(r.unid)}${o&&ch?`<span class="was">${esc(o.num+' '+o.unid)}</span>`:''}</span>`}).join('')}</section>`;
  return `<div class="pvis">${hero}${matriz}${temas}${ritmo}</div>`;
}
// ----- caixinha de edição no próprio quadro -----
function popHtml(){const P=S.pop;if(!P)return '';const d=curPlano();let t='',body='';
  const li=(arr,id)=>`<div class="le">${arr.map((x,j)=>`<div class="ler"><input type="text" class="pe" id="${id}${j}" value="${esc(x)}" placeholder="O que essa frente faz aqui" aria-label="Ação ${j+1}"><button class="iconbtn" data-act="pop-del" data-j="${j}" aria-label="Remover">×</button></div>`).join('')}<button class="linkbtn" data-act="pop-add">+ Adicionar</button></div>`;
  if(P.k==='cell'){const e=d.jornada[P.i];t=`${(FRENTES_Q.find(x=>x[0]===P.f)||[])[1]} em “${e.n}”`;body=li(P.list,'pp-l')}
  else if(P.k==='etapa'){const e=d.jornada[P.i];t='Momento '+(P.i+1);body=`<label for="pp-n">Nome</label><input id="pp-n" class="pe" value="${esc(e.n)}"><label for="pp-d">Quem está aqui</label><input id="pp-d" class="pe" value="${esc(e.d)}"><div class="ler"><div style="flex:1"><label for="pp-v">Verba (R$/mês)</label><input id="pp-v" type="number" step="500" min="0" class="pe" value="${e.v||0}"></div><div style="flex:1"><label for="pp-i">Resultado medido</label><select id="pp-i" class="pe">${Object.entries(IND).map(([k,l])=>`<option value="${k}" ${e.ind===k?'selected':''}>${l}</option>`).join('')}</select></div></div>${d.jornada.length>1?'<button class="linkbtn" data-act="pop-rmetapa" style="color:var(--bad)">Remover este momento</button>':''}`}
  else if(P.k==='tese'){t='Aposta e metas';body=`<label for="pp-o">A aposta do período</label><textarea id="pp-o" class="pe" rows="2">${esc(d.objetivo)}</textarea><div class="ler"><div style="flex:1"><label for="pp-c">Meta de contatos</label><input id="pp-c" type="number" class="pe" value="${d.metas.contatos}"></div><div style="flex:1"><label for="pp-p">Custo por contato (R$)</label><input id="pp-p" type="number" class="pe" value="${d.metas.cpl}"></div></div>`}
  else if(P.k==='tema'||P.k==='tema-novo'){const tm=P.k==='tema'?d.temas[P.i]:{n:'',prod:'',periodo:'',msg:''};t=P.k==='tema'?'Tema':'Novo tema';body=`<label for="pp-n">Nome</label><input id="pp-n" class="pe" value="${esc(tm.n)}"><label for="pp-m">Mensagem</label><input id="pp-m" class="pe" value="${esc(tm.msg)}"><div class="ler"><div style="flex:1"><label for="pp-pr">Produto</label><input id="pp-pr" class="pe" value="${esc(tm.prod)}"></div><div style="flex:1"><label for="pp-pe">Período</label><input id="pp-pe" class="pe" value="${esc(tm.periodo)}" placeholder="01/12 a 22/12"></div></div>${P.k==='tema'?'<button class="linkbtn" data-act="pop-rmtema" style="color:var(--bad)">Remover tema</button>':''}`}
  else if(P.k==='ritmo'){t='Ritmo de entregas';body=`<div class="le">${P.list.map((r,j)=>`<div class="ler"><input class="pe" id="pp-rn${j}" value="${esc(r.num)}" style="max-width:70px" aria-label="Número"><input class="pe" id="pp-ru${j}" value="${esc(r.unid)}" aria-label="Unidade"><button class="iconbtn" data-act="pop-del" data-j="${j}" aria-label="Remover">×</button></div>`).join('')}<button class="linkbtn" data-act="pop-add">+ Adicionar</button></div><span class="eyebrow" style="margin-top:6px">Verba por plataforma (R$/mês)</span><div class="le">${d.verba.map((x,j)=>`<div class="ler"><input class="pe" id="pp-vk${j}" value="${esc(x.k)}" aria-label="Plataforma"><input class="pe" type="number" step="500" id="pp-vv${j}" value="${x.v}" aria-label="Valor"></div>`).join('')}</div>`}
  return `<div class="popscrim" data-act="pop-close"></div><div class="pop" role="dialog" aria-label="${esc(t)}" style="left:${P.x}px;top:${P.y}px"><div class="pophd"><b>${esc(t)}</b><button class="iconbtn" data-act="pop-close" aria-label="Fechar">×</button></div><div class="popbd">${body}</div><div class="actions"><button class="btn primary" data-act="pop-ok">Aplicar</button><button class="btn" data-act="pop-close">Cancelar</button></div><p class="muted" style="font-size:11px;margin:0">Vai para o rascunho. A Spraytec aprova antes de valer.</p></div>`}
function popRead(){const P=S.pop;if(P&&(P.k==='cell'))P.list=P.list.map((_,j)=>{const e=$('#pp-l'+j);return e?e.value:''});if(P&&P.k==='ritmo')P.list=P.list.map((r,j)=>({...r,num:($('#pp-rn'+j)||{}).value||'',unid:($('#pp-ru'+j)||{}).value||''}))}
function popOpen(el){const r=el.getBoundingClientRect();const W=340,H=380;const x=Math.max(12,Math.min(window.innerWidth-W-12,r.left));let y=r.bottom+8;if(y+H>window.innerHeight)y=Math.max(12,r.top-H-8);
  const k=el.dataset.pk,i=el.dataset.i!=null?Number(el.dataset.i):null,f=el.dataset.f;if(!S.pdraft){S.pdraft=clone(plano.pendente?plano.pendente.dados:plano.dados);S.pnota=plano.pendente?plano.pendente.nota:''}
  const d=S.pdraft;S.pop={k,i,f,x,y,list:k==='cell'?cellTexts(d,i,f).concat(cellTexts(d,i,f).length?[]:['']):k==='ritmo'?clone(d.ritmo):null};renderPop();setTimeout(()=>{const e=document.querySelector('.pop input,.pop textarea');if(e)e.focus()},0)}
function renderPop(){let L=document.getElementById('poplayer');if(!L){L=document.createElement('div');L.id='poplayer';document.body.appendChild(L)}L.innerHTML=popHtml()}
function popApply(){popRead();const P=S.pop,d=S.pdraft;const v=id=>{const e=$('#'+id);return e?e.value.trim():''};
  if(P.k==='cell'){const e=d.jornada[P.i];e.acoes=e.acoes.filter(a=>a.c!==P.f).concat(P.list.map(x=>x.trim()).filter(Boolean).map(t=>({c:P.f,t})))}
  else if(P.k==='etapa'){const e=d.jornada[P.i];e.n=v('pp-n')||e.n;e.d=v('pp-d');e.v=Number(v('pp-v'))||0;e.ind=v('pp-i')}
  else if(P.k==='tese'){d.objetivo=v('pp-o')||d.objetivo;d.metas.contatos=Number(v('pp-c'))||0;d.metas.cpl=Number(v('pp-p'))||0}
  else if(P.k==='tema'||P.k==='tema-novo'){const tm={n:v('pp-n'),msg:v('pp-m'),prod:v('pp-pr'),periodo:v('pp-pe'),acoes:P.k==='tema'?d.temas[P.i].acoes:[]};if(!tm.n){toast('Dê um nome ao tema.');return false}if(P.k==='tema')d.temas[P.i]=tm;else d.temas.push(tm)}
  else if(P.k==='ritmo'){d.ritmo=P.list.filter(r=>(r.num+r.unid).trim());d.verba=d.verba.map((x,j)=>({k:v('pp-vk'+j)||x.k,v:Number(v('pp-vv'+j))||0}))}
  return true}

function planoSection(){
  if(!plano)return '<p class="muted">O plano de mídia ainda não foi cadastrado.</p>';
  const pd=plano.pendente,team=isTeam(),dr=S.pdraft,ch=dr?changedParts(dr):[];
  return `<section class="planosec"><div class="headrow" style="margin-bottom:4px"><div><p class="muted" style="margin:0;font-size:13px">Versão ${plano.versao}, aprovada em ${plano.aprovado}.${(h=>h&&h.antes?` <button class="linkbtn" data-act="ver-mud" data-id="${h.v}">O que mudou nesta versão</button>`:'')(plano.hist[plano.hist.length-1])}${team&&!dr?' Clique em qualquer parte do quadro para editar.':''}</p></div></div>
   ${pd&&!dr?`<div class="pchange"><span class="pdot"></span><b>${isM()?'Nova versão para aprovar':pd.ajuste?'Ajuste pedido':'Aguardando aprovação'}</b>
     <button class="linkbtn" data-act="ver-mud" data-id="pendente">Ver alterações</button>
     ${isM()&&!pd.ajuste?`<button class="btn primary sm" data-act="approve" data-id="${planoItem.id}">Aprovar</button><details class="padj"><summary class="linkbtn">Pedir ajuste</summary><div class="padjbox"><textarea id="padj" aria-label="O que precisa mudar" placeholder="O que precisa mudar?"></textarea><button class="btn danger sm" data-act="plano-ajuste">Enviar</button></div></details>`:''}
     ${pd.ajuste?`<span class="muted">“${esc(pd.ajuste.txt)}”</span>`:''}</div>`:''}
   ${planoVisual()}
   ${dr?`<div class="pdraft"><div><b>Rascunho da versão ${pd?pd.versao:plano.versao+1}</b> <span class="muted">· ${ch.length?ch.map(c=>PARTES.find(p=>p[0]===c)[1]).join(', '):'nada alterado ainda'}</span></div>
     <label for="pnota" class="muted" style="font-size:13px">O que mudou e por quê (a Spraytec lê antes de aprovar)</label><textarea id="pnota" rows="2">${esc(S.pnota||(pd?pd.nota:''))}</textarea>
     <div class="actions"><button class="btn primary" data-act="pe-send" ${ch.length?'':'disabled'}>Enviar para aprovação</button><button class="btn" data-act="ver-mud" data-id="rascunho" ${ch.length?'':'disabled'}>Ver alterações</button><button class="btn" data-act="pe-discard">Descartar rascunho</button></div></div>`:''}
   <details style="margin-top:12px"><summary class="muted" style="cursor:pointer;font-size:13px">Histórico de versões</summary><div class="hist" style="margin-top:6px">${plano.hist.slice().reverse().map(h=>`<div><span class="mono">v${h.v} · ${h.q}</span> · ${esc(h.t)}${h.antes?` <button class="linkbtn" data-act="ver-mud" data-id="${h.v}">Ver alterações</button>`:''}</div>`).join('')}</div></details></section>`;
}
function readPlanoForm(){const nt=$('#pnota');if(nt)S.pnota=nt.value;if(!S.pdraft||!S.pedit)return;
  document.querySelectorAll('.pcard.editing [data-bind]').forEach(el=>{const isNum=el.type==='number'||el.dataset.num;setPath(S.pdraft,el.dataset.bind,isNum?Number(el.value)||0:el.value)})}
function prune(d){d.objItens=d.objItens.map(t=>t.trim()).filter(Boolean);d.pedidos=d.pedidos.map(t=>t.trim()).filter(Boolean);
  const pa=l=>l.filter(a=>a.t&&a.t.trim());d.jornada=d.jornada.filter(e=>e.n.trim()).map(e=>({...e,acoes:pa(e.acoes)}));d.temas=d.temas.filter(t=>t.n.trim()).map(t=>({...t,acoes:pa(t.acoes)}));
  d.ritmo=d.ritmo.filter(r=>(r.num+r.unid).trim());d.verba=d.verba.filter(x=>x.k.trim());d.fases=d.fases.filter(f=>f.n.trim());d.fase=Math.min(Math.max(d.fase||1,1),Math.max(d.fases.length,1));
  d.crono=d.crono.filter(x=>x.d&&x.t.trim()).sort((a,b)=>a.d.localeCompare(b.d))}
// lista de alterações entre duas versões do plano
function changeList(a,b){const out=[];const add=(bloco,tipo,label,antes,agora)=>{let g=out.find(x=>x.bloco===bloco);if(!g){g={bloco,itens:[]};out.push(g)}g.itens.push({tipo,label,antes,agora})};
  const val=(bl,label,x,y)=>{if(String(x)!==String(y))add(bl,'mudou',label,x,y)};
  const set=(bl,label,A,B)=>{B.filter(t=>!A.includes(t)).forEach(t=>add(bl,'novo',label,'',t));A.filter(t=>!B.includes(t)).forEach(t=>add(bl,'removido',label,t,''))};
  const ac=l=>l.map(x=>CH[x.c]+': '+x.t);
  val('Objetivo e metas','Objetivo',a.objetivo,b.objetivo);set('Objetivo e metas','Outro objetivo',a.objItens,b.objItens);
  val('Objetivo e metas','Meta de contatos no mês',a.metas.contatos,b.metas.contatos);val('Objetivo e metas','Custo por contato máximo','R$ '+a.metas.cpl,'R$ '+b.metas.cpl);
  const groups=(bl,A,B,nome,campos)=>{const n=Math.max(A.length,B.length);for(let i=0;i<n;i++){const x=A[i],y=B[i];
    if(!x){add(bl,'novo',nome+' '+(i+1),'',y.n);set(bl,y.n,[],ac(y.acoes||[]));continue}
    if(!y){add(bl,'removido',nome+' '+(i+1),x.n,'');continue}
    const lab=y.n||x.n;val(bl,nome+' '+(i+1)+': nome',x.n,y.n);campos.forEach(([k,l])=>val(bl,lab+': '+l,x[k]||'',y[k]||''));set(bl,lab,ac(x.acoes||[]),ac(y.acoes||[]))}};
  groups('Jornada do produtor',a.jornada,b.jornada,'Momento',[['d','quem'],['v','verba (R$)']]);
  groups('Temas do período',a.temas,b.temas,'Tema',[['prod','produto'],['periodo','período'],['msg','mensagem']]);
  {const n=Math.max(a.ritmo.length,b.ritmo.length);for(let i=0;i<n;i++){const x=a.ritmo[i],y=b.ritmo[i];const tx=x&&x.num+' '+x.unid,ty=y&&y.num+' '+y.unid;if(!x)add('Ritmo e investimento','novo','Entrega · '+CH[y.c],'',ty);else if(!y)add('Ritmo e investimento','removido','Entrega · '+CH[x.c],tx,'');else if(tx!==ty)add('Ritmo e investimento','mudou','Entrega · '+CH[y.c],tx,ty)}}
  b.verba.forEach(x=>{const o=a.verba.find(y=>y.k===x.k);if(!o)add('Ritmo e investimento','novo',x.k,'',brl(x.v));else if(o.v!==x.v)add('Ritmo e investimento','mudou',x.k,brl(o.v),brl(x.v))});
  a.verba.filter(x=>!b.verba.some(y=>y.k===x.k)).forEach(x=>add('Ritmo e investimento','removido',x.k,brl(x.v),''));
  val('Ritmo e investimento','Investimento total por mês',brl(totVerba(a)),brl(totVerba(b)));
  return out}
function drawerMudancas(){const ref=S.drawer.id;let a,b,titulo,sub,nota;
  if(ref==='rascunho'){readPlanoForm();a=plano.dados;b=S.pdraft;titulo='Alterações do rascunho';sub='Comparado com a versão '+plano.versao+' aprovada';nota=S.pnota}
  else if(ref==='pendente'){const pd=plano.pendente;a=plano.dados;b=pd.dados;titulo='Alterações da versão '+pd.versao;sub=`Enviada por ${pd.por} em ${pd.em} · aguardando aprovação`;nota=pd.nota}
  else{const h=plano.hist.find(x=>String(x.v)===ref);a=h.antes;b=h.depois;titulo='Alterações da versão '+h.v;sub='Aprovada em '+h.q;nota=h.nota}
  const cl=changeList(a,b);const total=cl.reduce((s,g)=>s+g.itens.length,0);
  const TP={mudou:['Mudou','--warn'],novo:['Novo','--ok'],removido:['Removido','--bad']};
  return `<header><div><div class="eyebrow">Plano de mídia</div><h2>${titulo}</h2><div class="muted" style="font-size:13px;margin-top:2px">${esc(sub)} · ${total} ${total===1?'alteração':'alterações'}</div></div>${closeBtn()}</header>
  <div class="content">${nota?`<div class="caption"><b>Por que mudou:</b> ${esc(nota)}</div>`:''}
   ${cl.map(g=>`<section><div class="eyebrow" style="margin-bottom:6px">${g.bloco}</div><div class="list">${g.itens.map(x=>`<div class="mrow">${tagPill(TP[x.tipo][0],TP[x.tipo][1])}<div class="grow"><div class="muted" style="font-size:12px">${esc(x.label)}</div>${x.antes?`<div class="mantes">${esc(x.antes)}</div>`:''}${x.agora?`<div class="magora">${esc(x.agora)}</div>`:''}</div></div>`).join('')}</div></section>`).join('')||'<p class="muted">Nenhuma alteração.</p>'}
   ${ref==='pendente'&&isM()&&!plano.pendente.ajuste?`<div class="actions"><button class="btn primary" data-act="approve" data-id="${planoItem.id}">Aprovar alterações</button><button class="btn" data-act="close">Voltar ao plano</button></div>`:''}</div>`}

// ADICIONAR NO CALENDÁRIO
const NOVO_TIPOS=[['ig|post','Instagram'],['fb|post','Facebook · post'],['yt|video','YouTube · vídeo'],['yt|short','YouTube · Short'],['email|newsletter','E-mail marketing'],['design|producao','Produção de design'],['video|gravacao','Gravação de vídeo'],['video|entrega','Entrega de vídeo'],['demanda|cancha','Demanda da Cancha'],['demanda|spraytec','Demanda da Spraytec']];
function drawerNovo(){const date=S.drawer.id||TODAY;const tipo=S.novoTipo||(isM()?'demanda|spraytec':'ig|post');const isDem=tipo.startsWith('demanda'),isProd=/^(design|video)\|/.test(tipo);
  const perto=x=>x&&x>=addDays(date,-45)&&x<=addDays(date,45);const ligaveis=[...posts.filter(p=>perto(p.date)&&p.formato!=='plano').map(p=>['p:'+p.id,fmt(p.date)+' · '+NETNAME[p.rede]+' · '+p.titulo]),...demandas.filter(x=>!x.feito&&perto(x.data)).map(x=>['d:'+x.id,fmt(x.data)+' · Demanda · '+x.t])].sort((a,b)=>a[1].slice(3,5).localeCompare(b[1].slice(3,5))||a[1].localeCompare(b[1]));
  return `<header><div><div class="eyebrow">Calendário</div><h2>Adicionar em ${fmtLong(date)}</h2></div>${closeBtn()}</header>
  <div class="content">
   <label for="nt-tipo">O que é</label><select id="nt-tipo" data-act-change="novo-tipo">${NOVO_TIPOS.map(([k,l])=>`<option value="${k}" ${k===tipo?'selected':''}>${l}</option>`).join('')}</select>
   <label for="nt-titulo">${isDem?'O que precisa ser feito':'Título'}</label><input type="text" id="nt-titulo" placeholder="${isDem?'Ex.: Enviar fotos da feira':isProd?'Ex.: Peças da 1ª quinzena de janeiro':'Ex.: Manejo do florescimento em 5 passos'}">
   <div class="ler"><div style="flex:1"><label for="nt-data">Data</label><input type="date" id="nt-data" value="${date}" class="pe"></div>${!isDem&&!isProd?`<div style="flex:1"><label for="nt-hora">Horário</label><input type="time" id="nt-hora" value="11:30" class="pe"></div>`:''}</div>
   ${!isDem?`<div class="ler"><div style="flex:1"><label for="nt-pilar">Pilar</label><select id="nt-pilar">${Object.keys(PILAR_HUE).map(k=>`<option>${k}</option>`).join('')}</select></div><div style="flex:1"><label for="nt-prod">Produto</label><input type="text" id="nt-prod" placeholder="Opcional"></div></div>`:''}
   <label for="nt-texto">${isDem?'Detalhes':tipo.startsWith('email')?'Assunto e texto':isProd?'Descrição':'Legenda'}</label><textarea id="nt-texto" placeholder="Opcional, dá para escrever depois"></textarea>
   ${!isDem?`<label for="nt-drive">Material no Google Drive</label><input type="text" id="nt-drive" placeholder="https://drive.google.com/... (opcional)">`:''}
   <label for="nt-liga">Ligar a</label><select id="nt-liga"><option value="">Nada por enquanto</option>${ligaveis.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select>
   ${isM()&&!isDem?'<p class="muted" style="font-size:12px;margin:0">Entra como pauta sugerida por você. A Cancha produz e manda para sua aprovação.</p>':''}
   <div class="actions"><button class="btn primary" data-act="novo-salvar">Adicionar ao calendário</button></div></div>`}
function lerNovo(){const t=($('#nt-titulo').value||'').trim();if(!t){toast('Dê um título.');$('#nt-titulo').focus();return null}
  const v=id=>{const e=$('#'+id);return e?(e.value||'').trim():''};
  return {tipo:v('nt-tipo'),titulo:t,data:v('nt-data')||TODAY,hora:v('nt-hora')||null,pilar:v('nt-pilar'),produto:v('nt-prod'),texto:v('nt-texto'),drive:v('nt-drive'),liga:v('nt-liga')||null}}

const S={acat:{},aq:{},per:{preset:'30',de:'',ate:'',cmp:'prev',cde:null,cate:null},psort:'alc',pdraft:null,pedit:null,pnota:'',thread:null,novoTema:false,linkPick:false,role:'',view:'hoje',month:'',dmonth:'',tipos:{post:true,email:true,design:true,video:true,demanda:true},quem:'todas',atipo:'todos',psub:'funil',asub:'materiais',rede:'instagram',drawer:null,pasta:null,sel:{}};

// helpers
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=iso=>iso?iso.slice(8)+'/'+iso.slice(5,7):'sem data';
const WD=['dom','seg','ter','qua','qui','sex','sáb'];
const fmtLong=iso=>iso?WD[dow(iso)]+', '+fmt(iso):'sem data';
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const n=v=>v.toLocaleString('pt-BR');
const isTeam=()=>S.role==='cancha';
const isM=()=>S.role==='matheus';
function pill(st){const s=STATUS[st];return `<span class="pill" style="color:var(${s.c})"><i></i><span style="color:var(--ink)">${s.l}</span></span>`}
function tagPill(txt,c){return `<span class="pill" style="color:var(${c})"><i></i><span style="color:var(--ink)">${txt}</span></span>`}
function hiddenForClient(p){return isCliente()&&(p.status==='pauta'||p.status==='producao')&&!['video','design'].includes(p.rede)}
function toast(msg){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
function tipoCal(p){return {email:'email',design:'design',video:'video',ads:'midia'}[p.rede]||'post'}
function tipoAprov(p){if(p.rede==='email')return'E-mail marketing';if(p.formato==='plano')return'Plano de mídia';if(p.rede==='design')return'Peça de anúncio';if(p.formato==='story')return'Story';if(['reel','video','short'].includes(p.formato))return'Vídeo';return'Post'}
function pendingApprovals(){return posts.filter(p=>(p.status==='aprovacao'||p.status==='validacao')&&!p.faltaTexto)}
function roteirosPend(){return videos.filter(v=>v.stage==='roteiro')}
function badgeCount(){return pendingApprovals().length+roteirosPend().length}
function inWindow(p){return p.date&&p.date>=TODAY&&p.date<=addDays(TODAY,7)}
function prazoDe(p){return p.prazo||addDays(TODAY,2)}

// prévias
function preview(p){
  const bg=PILAR_HUE[p.pilar]||'#E3E4D3';
  if(hiddenForClient(p))return `<div class="pv"><div class="ph">Em preparação</div></div>`;
  const T=esc(p.titulo),first=esc((p.legenda||'').split('\n')[0]);
  if(p.rede==='video'||(p.rede==='design'&&p.formato==='producao'))return `<div class="pv prod" style="--kc:var(--k-${p.rede})"><span class="ptp">${p.rede==='video'?'Produção de vídeo':'Produção de design'}</span><b>${T}</b><span class="sm">${p.rede==='video'?(p.formato==='gravacao'?'Gravação com a produtora':'Entrega do vídeo final'):'Entrega das peças para aprovação'}</span></div>`;
  const hd=sub=>`<div class="hd"><span class="av">S</span><span style="min-width:0"><b>${p.rede==='ig'?'spraytec.brasil':'Spraytec Brasil'}</b>${sub?`<br><span class="sm">${sub}</span>`:''}</span></div>`;
  const vert=(top,bottom,extra)=>`<div class="pv vert" style="--bg:${bg}"><div class="full">${top}<div class="big">${T}</div>${bottom}</div>${extra||''}</div>`;
  if(p.rede==='ig'){
    if(p.formato==='story')return vert('<div class="bars3"><i></i><i></i><i></i></div><div class="hd lite"><span class="av">S</span><b>spraytec.brasil</b></div>','<div class="sm">Enviar mensagem</div>');
    if(p.formato==='reel')return vert('<div class="sm">Reels</div>','<div class="sm">spraytec.brasil · ♪ áudio original</div>','<div class="play">▶</div>');
    return `<div class="pv">${hd('')}<div class="img" style="--bg:${bg}">${p.formato==='carrossel'?'<span class="cnt">1/6</span>':''}<span>${T}</span></div><div class="ft"><div class="icons">♡ ○ ▷</div>${p.formato==='carrossel'?'<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>':''}<div class="cap"><b>spraytec.brasil</b> ${first}</div></div></div>`;
  }
  if(p.rede==='fb')return `<div class="pv">${hd('2 h · Público')}<div class="txt">${first}</div><div class="img wide" style="--bg:${bg}"><span>${T}</span></div><div class="ft row3"><span>Curtir</span><span>Comentar</span><span>Compartilhar</span></div></div>`;
  if(p.rede==='yt'){
    if(p.formato==='short')return vert('','<div class="sm">@spraytecbrasil</div>','<span class="short">Shorts</span><div class="play">▶</div>');
    return `<div class="pv"><div class="img v169" style="--bg:${bg}"><span>${T}</span><span class="dur">8:42</span></div><div class="hd"><span class="av">S</span><span style="min-width:0"><b>${T}</b><br><span class="sm">Spraytec Brasil</span></span></div></div>`;
  }
  if(p.rede==='email')return `<div class="pv"><div class="mailtop"><span class="sm">De: Spraytec Brasil</span><b>${T}</b></div><div class="mailbar">SPRAYTEC</div><div class="img wide" style="--bg:${bg}"></div><div class="lines"><i></i><i></i><i style="width:60%"></i></div><div class="cta">Ler no site</div></div>`;
  if(p.rede==='ads'){const vb=plano?(plano.pendente?plano.pendente.dados:plano.dados).verba:[];return `<div class="pv doc"><span class="sm">PLANO DE MÍDIA</span><b>${T}</b><div class="tbl">${vb.map(x=>`<span>${esc(x.k.replace(/ Ads$/,''))}</span><span>${brl(x.v)}</span>`).join('')}</div></div>`}
  return `<div class="pv art3"><div class="f sq" style="--bg:${bg}"></div><div class="f vt" style="--bg:${bg}"></div><div class="f wd" style="--bg:${bg}"></div><div class="cap3">${T}</div></div>`;
}
function adPreview(d){const bg=PILAR_HUE[d.pilar];return `<div class="pv"><div class="hd"><span class="av">S</span><span><b>Spraytec Brasil</b><br><span class="sm">Patrocinado</span></span></div><div class="img" style="--bg:${bg}"><span>${esc(d.titulo)}</span></div><div class="ctabar"><span class="sm">spraytec.com.br</span><b>Saiba mais ›</b></div></div>`}
function storyPreview(s){return `<div class="pv vert" style="--bg:${PILAR_HUE[s.pilar]}"><div class="full"><div class="bars3"><i></i><i></i><i></i></div><div class="sm">${s.tipo==='repost'?'Repost':'Story agendado'}</div><div class="big">${esc(s.titulo)}</div></div></div>`}

// navegação
const VIEWS=[
  ['hoje','Início',['matheus','cancha','diretoria']],
  ['plano','Estratégia',['matheus','cancha','diretoria']],
  ['aprovacao','Aprovação',['matheus','cancha']],
  ['calendario','Calendário',['matheus','cancha']],
  ['redes','Redes sociais',['matheus','cancha']],
  ['performance','Performance',['matheus','cancha','diretoria']],
  ['videos','Vídeos',['produtora']],
  ['acervo','Acervo',['matheus','cancha','produtora','diretoria']],
  ['atividade','Registro de atividades',['cancha']],
];
function renderRoles(){
  $('#roles').innerHTML=EU?`<span class="eu"><b>${esc(EU.nome)}</b><span class="muted">${esc(ROLES[EU.papel]||EU.papel)}</span></span>${DEMO?'<button class="iconbtn" data-act="trocar-pessoa">Trocar pessoa</button>':''}<button class="iconbtn" data-act="sair">Sair</button>`:'';
  const dm=$('#demo');if(dm){dm.hidden=!DEMO;dm.innerHTML='<b>Demonstração</b><span>Os dados são fictícios. Números de redes, mídia paga e e-mail aparecem como "Exemplo" até as integrações entrarem. Tudo o que você fizer aqui fica salvo de verdade.</span>'}}
function renderNav(){
  $('#nav').innerHTML=VIEWS.filter(v=>v[0]==='sep'?isTeam():v[2].includes(S.role)).map(v=>{
    if(v[0]==='sep')return '<div class="sep" role="separator"></div>';
    let c='';
    if(v[0]==='hoje'&&S.role!=='produtora'&&!isDir()){const k=unreadCount();if(k)c=`<span class="badge" aria-label="${k} mensagens novas">${k}</span>`}
    if(v[0]==='plano'&&plano&&plano.pendente)c='<span class="pdot" aria-label="Nova versão aguardando aprovação" style="margin:0"></span>';
    if(v[0]==='aprovacao'){const k=badgeCount();if(k)c=`<span class="badge" aria-label="${k} itens para aprovar">${k}</span>`}
    if(v[0]==='videos'){const k=videos.filter(x=>x.stage==='viabilidade'||x.stage==='gravacao').length;if(k)c=`<span class="badge">${k}</span>`}
    return `<button data-view="${v[0]}" ${S.view===v[0]?'aria-current="page"':''}>${v[1]}${c}</button>`}).join('');
}
function head(title,sub,right){return `<div class="headrow"><div><h1>${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div>${right||''}</div>`}
function subtabs(list,key,label){return `<div class="subtabs" role="tablist" aria-label="${label}">${list.map(([k,l])=>`<button role="tab" data-tab="${key}" data-val="${k}" aria-selected="${S[key]===k}">${l}</button>`).join('')}</div>`}

// INÍCIO
// ===================== NOVOS MÓDULOS =====================
const isDir=()=>S.role==='diretoria';
const isCliente=()=>S.role==='matheus'||S.role==='diretoria';

// ---------- ESTRATÉGIA: subabas ----------
// Ano safra: linha do tempo de 12 meses (culturas, janelas comerciais, eventos, campanhas e verba) + momentos da safra.
const FRENTES_E=[['social','Social'],['trafego','Tráfego'],['email','E-mail'],['video','Vídeo']];
let ANO=[];
const MOMENTOS=[['arranque','Plantio e arranque da soja'],['enchimento','Enchimento de grãos'],['colheita','Colheita e milho safrinha'],['inverno','Culturas de inverno'],['compra','Planejamento e compra antecipada'],['plantio','Plantio 27/28']];
// faixas: índice do mês inicial (0 = nov/26) e duração
let LANES=[];
const MESES_C=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mesLbl=m=>MESES_C[Number(m.slice(5))-1]+'/'+m.slice(2,4);
let CONC=[];
const SPRAY={nome:'Spraytec',cor:'var(--accent)',ads:9,novos:3,dur:31,fmt:[45,35,20],tr:[3,3,4,5,5,6,6,7,8,8,9,9],tem:{prod:2,foliar:3,bio:1,prova:1,preco:0,tec:2}};
const TEMAS_C=[['prod','Produtividade'],['foliar','Nutrição foliar'],['bio','Manejo de estresse'],['prova','Prova de campo e depoimento'],['preco','Preço e condição'],['tec','Conteúdo técnico com agrônomo']];
let CONC_ACOES=[];
function viewPlano(){
  const tabs=[['plano','Plano atual'],['ano','Ano safra'],['conc','Concorrência']];const sb=S.esub||'plano';
  const body=sb==='ano'?estAno():sb==='conc'?estConc():planoSection();
  return `${head('Estratégia','O plano de mídia, o ano safra e a leitura da concorrência.')}${subtabs(tabs,'esub','Estratégia')}${body}`}
function estAno(){
  if(!ANO.length)return '<p class="muted">O ano safra ainda não foi cadastrado.</p>';
  const ci=Math.max(0,ANO.findIndex(x=>x.m===TODAY.slice(0,7)));const cur=ANO[ci];
  const tp=ANO.reduce((a,x)=>a+x.p,0),te=ANO.reduce((a,x)=>a+(x.e||0),0);
  const dia=Number(TODAY.slice(8)),ndias=new Date(Date.UTC(+TODAY.slice(0,4),+TODAY.slice(5,7),0)).getUTCDate();
  const ritmo=cur&&cur.e!=null?cur.e/(cur.p*dia/ndias):1;const prox=ANO.slice(ci+1).find(x=>x.mo!==cur.mo);
  const mx=Math.max(...ANO.map(x=>x.p));
  const col=i=>`grid-column:${i+2}`;
  const cols=ANO.map((x,i)=>`<button class="tl-m ${i===ci?'cur':''}" style="${col(i)};grid-row:1" data-act="mes-edit" data-idx="${i}" aria-label="Ver ${mesLbl(x.m)}">${mesLbl(x.m)}</button>`).join('');
  const lanes=LANES.map((ln,r)=>`<div class="tl-l" style="grid-row:${r+2}">${ln.l}</div>${ln.it.map(([s,d,t])=>`<span class="tl-b b-${ln.k}" style="grid-column:${s+2}/span ${d};grid-row:${r+2}" title="${esc(t)}">${esc(t)}</span>`).join('')}`).join('');
  const rC=LANES.length+2,rV=LANES.length+3;
  const camp=`<div class="tl-l" style="grid-row:${rC}">Campanha</div>${ANO.map((x,i)=>`<button class="tl-c" style="${col(i)};grid-row:${rC}" data-act="mes-edit" data-idx="${i}">${esc(x.tema)}</button>`).join('')}`;
  const verba=`<div class="tl-l" style="grid-row:${rV}">Verba</div>${ANO.map((x,i)=>`<button class="tl-v" style="${col(i)};grid-row:${rV}" data-act="mes-edit" data-idx="${i}" aria-label="${mesLbl(x.m)}: ${brl(x.p)} planejados"><span class="bar"><i style="height:${x.p/mx*100}%"></i>${x.e!=null?`<b style="height:${Math.min(x.e,x.p)/mx*100}%"></b>`:''}</span><span class="mono">${Math.round(x.p/1000)}k</span></button>`).join('')}`;
  const today=`<span class="tl-today" style="grid-column:${ci+2};grid-row:1/${rV+1}"></span>`;
  const mom=MOMENTOS.map(([k,l])=>{const ms=ANO.filter(x=>x.mo===k);if(!ms.length)return '';const v=ms.reduce((a,x)=>a+x.p,0),ex=ms.reduce((a,x)=>a+(x.e||0),0);const fr=[...new Set(ms.flatMap(x=>x.fr))];const now=ms.includes(cur);
    return `<article class="pcard mom ${now?'cur':''}"><div class="eyebrow">${mesLbl(ms[0].m)}${ms.length>1?' a '+mesLbl(ms[ms.length-1].m):''}${now?' · agora':''}</div><b class="anot">${l}</b>
      <p class="momobj">${esc(ms[0].obj)}</p>
      <dl class="kv mk"><dt>Produtos</dt><dd>${esc([...new Set(ms.flatMap(x=>x.prods.split(' · ')))].join(' · '))}</dd><dt>Meta</dt><dd>${[...new Set(ms.map(x=>x.kpi))].map(esc).join(' · ')}</dd></dl>
      <div class="frch">${FRENTES_E.map(([f,fl])=>`<span class="${fr.includes(f)?'on':''}">${fl}</span>`).join('')}</div>
      <div class="anov"><span class="muted">${Math.round(v/tp*100)}% da verba do ano</span><b>${brl(v)}</b></div>${ex?`<div class="meter"><b class="ok" style="width:${ex/v*100}%"></b></div><span class="muted" style="font-size:12px">${brl(ex)} executados</span>`:''}</article>`}).join('');
  return `<div class="kpis">
    <div class="kpi"><div class="l">Agora</div><div class="v" style="font-size:18px">${esc(cur.fase)}</div><div class="l">Campanha: ${esc(cur.tema)}</div></div>
    <div class="kpi"><div class="l">Ritmo de verba em ${mesLbl(cur.m)} ${EX}</div><div class="v ${ritmo>1.1?'bad':''}">${Math.round(ritmo*100)}%</div><div class="l">${brl(cur.e)} de ${brl(cur.p)} · ${ritmo>1.1?'acima do ritmo':ritmo<.85?'abaixo do ritmo':'no ritmo'}</div></div>
    <div class="kpi"><div class="l">Próximo momento</div><div class="v" style="font-size:18px">${prox?esc(MOMENTOS.find(m=>m[0]===prox.mo)[1]):'—'}</div><div class="l">${prox?'a partir de '+mesLbl(prox.m)+' · preparar criativos 30 dias antes':''}</div></div>
    <div class="kpi"><div class="l">Verba no ano safra</div><div class="v">${brl(tp)}</div><div class="l">${brl(te)} executados até agora</div></div></div>
  <section class="panel"><div class="toolbar" style="margin-bottom:8px"><h2 style="margin:0">Linha do tempo · ${mesLbl(ANO[0].m)} a ${mesLbl(ANO[ANO.length-1].m)}</h2><span class="muted" style="font-size:12px">${isTeam()?'Clique em um mês para editar':'Clique em um mês para ver o detalhe'}</span></div>
    <div class="tlwrap"><div class="tl" lang="pt-BR" style="grid-template-rows:auto repeat(${LANES.length},26px) 52px 92px">${today}<div class="tl-l" style="grid-row:1"></div>${cols}${lanes}${camp}${verba}</div></div>
    <div class="mlegend" style="margin-top:10px;justify-content:flex-start"><span><i class="lg b-safra"></i>Culturas</span><span><i class="lg b-comercial"></i>Janela comercial</span><span><i class="lg b-evento"></i>Eventos</span><span><i class="lg" style="background:var(--line)"></i>Verba planejada</span><span><i class="lg" style="background:var(--accent-ink)"></i>Executada</span></div></section>
  <h2 style="font-size:18px">Momentos da safra</h2><div class="momgrid">${mom}</div>`}
function spark(tr,cor){const mx=Math.max(...tr),mn=Math.min(...tr),w=90,h=26;const pts=tr.map((v,i)=>`${(i/(tr.length-1)*w).toFixed(1)},${(h-2-(v-mn)/((mx-mn)||1)*(h-4)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round"/></svg>`}
function fmtMix(f){return `<span class="fmix" title="Vídeo ${f[0]}% · Carrossel ${f[1]}% · Imagem ${f[2]}%"><i style="width:${f[0]}%;background:var(--ink)"></i><i style="width:${f[1]}%;background:var(--muted)"></i><i style="width:${f[2]}%;background:var(--line)"></i></span>`}
function concAd(c){const bg=PILAR_HUE[c.pilar]||'#E2E8DC';return `<div class="pv"><div class="hd"><span class="av" style="background:${c.cor}">${esc(c.nome.slice(-1))}</span><span><b>${esc(c.nome)}</b><br><span class="sm">Patrocinado</span></span></div><div class="img" style="--bg:${bg}"><span>${esc(c.dest)}</span></div><div class="ctabar"><span class="sm">Saiba mais</span><b>›</b></div></div>`}
function estConc(){
  const all=[SPRAY,...CONC],tot=all.reduce((a,c)=>a+c.ads,0),sov=Math.round(SPRAY.ads/tot*100),nov=all.reduce((a,c)=>a+c.novos,0);
  const lider=[...CONC].sort((a,b)=>b.ads-a.ads)[0]||SPRAY;
  const sovBar=`<div class="sov">${all.map(c=>`<span style="width:${c.ads/tot*100}%;background:${c.cor}" title="${esc(c.nome)}: ${c.ads}"></span>`).join('')}</div><div class="mlegend" style="justify-content:flex-start">${all.map(c=>`<span><i class="lg" style="background:${c.cor}"></i>${esc(c.nome)} · ${Math.round(c.ads/tot*100)}%</span>`).join('')}</div>`;
  const amea={alta:['Alta','--bad'],media:['Média','--warn'],baixa:['Baixa','--ok']};
  const tbl=`<div class="ctbl" role="table"><div class="ctr ch" role="row"><span>Marca</span><span>Ativos</span><span>Novos 7d</span><span>Mais longo no ar</span><span>Formatos</span><span>12 semanas</span><span>Ameaça</span></div>
    ${all.map(c=>`<div class="ctr ${c===SPRAY?'me':'clickable'}" role="row" ${c===SPRAY?'':`data-act="conc-edit" data-id="${c.id}"`}><span class="cn"><i class="lg" style="background:${c.cor}"></i><b>${esc(c.nome)}</b></span><span class="mono">${c.ads}</span><span class="mono">+${c.novos}</span><span class="mono">${c.dur} dias</span><span>${fmtMix(c.fmt)}</span><span>${spark(c.tr,c.cor)}</span><span>${c===SPRAY?'<span class="muted">—</span>':ktag(amea[c.amea][0].toUpperCase(),amea[c.amea][1])}</span></div>`).join('')}</div>`;
  const heat=`<div class="heat" style="grid-template-columns:minmax(130px,1.3fr) repeat(${all.length},minmax(44px,1fr)) max-content"><span></span>${all.map(c=>`<span class="hh">${esc(c.nome.replace('Concorrente ','Conc. '))}</span>`).join('')}<span class="hh">Leitura</span>
    ${TEMAS_C.map(([k,l])=>{const mxc=Math.max(...CONC.map(c=>c.tem[k])),me=SPRAY.tem[k];const op=me===0&&mxc>=2?['Não disputamos','--muted']:mxc<=1&&me<=2?['Espaço livre','--ok']:mxc>me?['Perdendo','--bad']:me>mxc?['Liderando','--accent-ink']:['Empate','--muted'];
      return `<span class="hl">${l}</span>${all.map(c=>`<span class="hc" style="--n:${c.tem[k]*28}%" title="${['Não fala','Pouco','Frequente','Tema central'][c.tem[k]]}"></span>`).join('')}<span>${ktag(op[0].toUpperCase(),op[1])}</span>`}).join('')}</div><div class="mlegend" style="justify-content:flex-start;margin-top:10px">${['Não fala','Pouco','Frequente','Tema central'].map((t,n)=>`<span><i class="lg" style="background:color-mix(in srgb,var(--accent) ${n*28}%,var(--surface-2))"></i>${t}</span>`).join('')}<span><i class="lg" style="background:var(--ink)"></i>Vídeo</span><span><i class="lg" style="background:var(--muted)"></i>Carrossel</span><span><i class="lg" style="background:var(--line)"></i>Imagem</span></div>`;
  const gal=CONC.filter(c=>c.dest).sort((a,b)=>b.dur-a.dur).map(c=>`<article class="pcard cad clickable" data-act="conc-edit" data-id="${c.id}"><div class="concprev">${concAd(c)}</div><div class="cadm"><b>${esc(c.dest)}</b><span class="muted">${esc(c.nome)} · no ar há ${c.dur} dias</span><span class="muted" style="font-size:12px">${c.dur>45?'Anúncio que dura costuma ser anúncio que funciona.':'Rodando há pouco tempo.'}</span></div></article>`).join('');
  return `<div class="kpis">
    <div class="kpi"><div class="l">Share of voice da Spraytec ${EX}</div><div class="v">${sov}%</div><div class="l">${SPRAY.ads} de ${tot} anúncios ativos no grupo</div></div>
    <div class="kpi"><div class="l">Quem mais anuncia</div><div class="v" style="font-size:18px">${esc(lider.nome)}</div><div class="l">${lider.ads} anúncios · ${lider.novos} novos na semana</div></div>
    <div class="kpi"><div class="l">Anúncios novos na semana</div><div class="v">${nov}</div><div class="l">somando todas as marcas</div></div>
    <div class="kpi"><div class="l">Concorrentes monitorados</div><div class="v">${CONC.length}</div><div class="l">nomes de exemplo</div></div></div>
  <section class="panel"><div class="toolbar" style="margin-bottom:10px"><h2 style="margin:0">Presença em anúncios ${EX}</h2>${isTeam()?'<button class="btn" data-act="conc-novo">+ Concorrente</button>':''}</div>${sovBar}<div style="margin-top:14px">${tbl}</div></section>
  <div class="grid2" style="grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr)">
   <section class="panel"><h2>Mapa de temas</h2><p class="muted" style="font-size:13px;margin:0 0 10px">Quanto cada marca fala de cada tema nos anúncios ativos.</p>${heat}</section>
   <section class="panel" style="position:relative">${isTeam()?'<button class="pedit" data-act="cacoes-edit">Editar</button>':''}<h2>O que muda no nosso plano</h2><ol class="cacoes">${CONC_ACOES.map(a=>`<li><span>${esc(a.t)}</span><span class="muted" style="font-size:12px">${esc(a.ref)}</span></li>`).join('')}</ol><p class="muted" style="font-size:12px;margin:8px 0 0">Leitura da Cancha, revisada todo mês.</p></section></div>
  <section><h2 style="font-size:18px;margin-bottom:10px">Anúncios que estão durando</h2><div class="cadgrid">${gal}</div></section>`}
function drawerAcoes(){return `<header><div><div class="eyebrow">Concorrência</div><h2>O que muda no nosso plano</h2></div>${closeBtn()}</header>
  <div class="content"><label for="ca-t">Uma ação por linha. Depois de "|", onde ela entra (opcional).</label><textarea id="ca-t" class="pe" rows="8">${esc(CONC_ACOES.map(a=>a.t+(a.ref?' | '+a.ref:'')).join('\n'))}</textarea><div class="actions"><button class="btn primary" data-act="cacoes-salvar">Salvar</button></div></div>`}
function drawerMes(){const i=Number(S.drawer.id),x=ANO[i];const ro=!isTeam();
  const lanes=LANES.map(ln=>{const it=ln.it.filter(([s,d])=>i>=s&&i<s+d).map(t=>t[2]);return it.length?`<dt>${ln.l}</dt><dd>${esc(it.join(' · '))}</dd>`:''}).join('');
  const head=`<header><div><div class="eyebrow">Ano safra · ${esc(MOMENTOS.find(m=>m[0]===x.mo)[1])}</div><h2>${mesLbl(x.m)} · ${esc(x.tema)}</h2></div>${closeBtn()}</header>`;
  if(ro)return `${head}<div class="content"><dl class="kv"><dt>Fase</dt><dd>${esc(x.fase)}</dd>${lanes}<dt>Objetivo</dt><dd>${esc(x.obj)}</dd><dt>Produtos</dt><dd>${esc(x.prods)}</dd><dt>Meta</dt><dd>${esc(x.kpi)}</dd><dt>Frentes</dt><dd>${x.fr.map(f=>FRENTES_E.find(z=>z[0]===f)[1]).join(' · ')}</dd><dt>Verba</dt><dd>${brl(x.p)}${x.e!=null?' · '+brl(x.e)+' executados':''}</dd></dl></div>`;
  return `${head}<div class="content"><dl class="kv">${lanes}</dl>
  <label for="ms-f">Fase da safra</label><input type="text" id="ms-f" class="pe" value="${esc(x.fase)}">
  <label for="ms-t">Campanha</label><input type="text" id="ms-t" class="pe" value="${esc(x.tema)}">
  <label for="ms-o">Objetivo</label><textarea id="ms-o" class="pe">${esc(x.obj)}</textarea>
  <label for="ms-pr">Produtos em foco</label><input type="text" id="ms-pr" class="pe" value="${esc(x.prods)}">
  <label for="ms-k">Meta do mês</label><input type="text" id="ms-k" class="pe" value="${esc(x.kpi)}">
  <fieldset class="frset"><legend>Frentes</legend>${FRENTES_E.map(([f,l])=>`<label><input type="checkbox" class="ms-fr" value="${f}" ${x.fr.includes(f)?'checked':''}> ${l}</label>`).join('')}</fieldset>
  <label for="ms-p">Verba planejada (R$)</label><input type="number" id="ms-p" class="pe" min="0" step="500" value="${x.p}">
  <div class="actions"><button class="btn primary" data-act="mes-salvar">Salvar</button></div></div>`}
function drawerConc(){const id=S.drawer.id;const c=id?CONC.find(x=>x.id===id):{nome:'',ads:0,novos:0,dur:0,fmt:[34,33,33],tr:Array(12).fill(0),tem:{prod:0,foliar:0,bio:0,prova:0,preco:0,tec:0},amea:'media',pilar:'Produto',dest:'',leitura:'',cor:'#7A6F5A'};
  const info=id?`<div class="concprev" style="max-width:220px">${concAd(c)}</div><div class="mkpis"><div><b>${c.ads}</b><span>ativos</span></div><div><b>+${c.novos}</b><span>novos 7d</span></div><div><b>${c.dur}</b><span>dias no ar</span></div></div>`:'';
  if(!isTeam())return `<header><div><div class="eyebrow">Concorrência</div><h2>${esc(c.nome)}</h2></div>${closeBtn()}</header><div class="content">${info}<dl class="kv"><dt>Leitura da Cancha</dt><dd>${esc(c.leitura)}</dd><dt>Temas centrais</dt><dd>${TEMAS_C.filter(([k])=>c.tem[k]>=2).map(t=>t[1]).join(' · ')||'—'}</dd></dl></div>`;
  return `<header><div><div class="eyebrow">Concorrência</div><h2>${id?esc(c.nome):'Novo concorrente'}</h2></div>${closeBtn()}</header>
  <div class="content">${info}<label for="cc-n">Nome</label><input type="text" id="cc-n" class="pe" value="${esc(c.nome)}">
  <label for="cc-d">Anúncio em destaque</label><input type="text" id="cc-d" class="pe" value="${esc(c.dest)}">
  <label for="cc-a">Ameaça</label><select id="cc-a" class="pe">${[['alta','Alta'],['media','Média'],['baixa','Baixa']].map(([k,l])=>`<option value="${k}" ${c.amea===k?'selected':''}>${l}</option>`).join('')}</select>
  <fieldset class="frset"><legend>Quanto fala de cada tema</legend>${TEMAS_C.map(([k,l])=>`<label style="display:flex;justify-content:space-between;gap:8px;width:100%">${l}<select class="cc-tem" data-k="${k}">${['Não fala','Pouco','Frequente','Tema central'].map((t,n)=>`<option value="${n}" ${c.tem[k]===n?'selected':''}>${t}</option>`).join('')}</select></label>`).join('')}</fieldset>
  <label for="cc-l">Leitura da Cancha</label><textarea id="cc-l" class="pe">${esc(c.leitura)}</textarea>
  <p class="muted" style="font-size:12px;margin:0">Anúncios ativos, novos, tempo no ar, formatos e tendência vêm da Biblioteca de Anúncios da Meta.</p><div class="actions"><button class="btn primary" data-act="conc-salvar">Salvar</button>${id?'<button class="btn danger" data-act="conc-excluir">Remover</button>':''}</div></div>`}

// ---------- FUNIL E VENDAS + META COM PROJEÇÃO ----------
function funilStats(r,isCur){const f=daysOf(r)/30,a=isCur?1:r.ate<addDays(TODAY,-300)?.55:.82;return {inv:18200*f*(isCur?1:.95),impr:392000*f*a,clk:9420*f*a,cont:Math.round(214*f*a),opp:Math.round(71*f*a),vend:Math.round(19*f*a),rec:412000*f*a}}
const CAMP_RET=[['Remarketing · visitantes 60 dias','Meta',3820,58,7,152000],['Pesquisa · nutrição foliar','Google',6900,84,8,171000],['Prospecção · produtores de soja','Meta',2940,36,3,58000],['Florescimento (teste A/B)','Meta',3040,24,1,31000],['Vídeo · ensaio de campo','YouTube',1500,12,0,0]];
// exemplo: ritmo de ~7,6 contatos e ~R$ 606 de mídia por dia
function metaMes(){const diasPass=Number(TODAY.slice(8)),diasMes=new Date(Date.UTC(+TODAY.slice(0,4),+TODAY.slice(5,7),0)).getUTCDate(),cont=Math.max(1,Math.round(7.56*diasPass)),inv=Math.round(606*diasPass),mt=plano?plano.dados.metas:{contatos:220,cpl:90},metaC=mt.contatos,metaCpl=mt.cpl;const proj=Math.round(cont/diasPass*diasMes);const cpl=inv/cont;
  return {diasPass,diasMes,cont,proj,metaC,cpl,metaCpl,ok:proj>=metaC,ritmo:Math.round(metaC*diasPass/diasMes)}}
function metaBlock(compact){const m=metaMes();const w=v=>Math.min(100,v/Math.max(m.metaC,m.proj)*100);
  return `<div class="metab ${compact?'compact':''}"><div class="mhead"><b>Meta de contatos · ${MONTHS[+TODAY.slice(5,7)-1].toLowerCase()} ${EX}</b><span class="${m.ok?'okt':'badt'}">${m.ok?'No caminho':'Abaixo do ritmo'}</span></div>
   <div class="mbar"><span class="mfill" style="width:${w(m.cont)}%"></span><span class="mproj" style="width:${w(m.proj)}%"></span><i class="mmeta" style="left:${w(m.metaC)}%" title="Meta: ${m.metaC}"></i></div>
   <div class="mlegend"><span><b>${m.cont}</b> até hoje (dia ${m.diasPass} de ${m.diasMes})</span><span>projeção <b>${m.proj}</b></span><span>meta <b>${m.metaC}</b></span></div>
   ${compact?'':`<div class="mlegend"><span>Custo por contato no mês <b>R$ ${Math.round(m.cpl)}</b> · meta até R$ ${m.metaCpl}</span><span class="${m.cpl<=m.metaCpl?'okt':'badt'}">${m.cpl<=m.metaCpl?'dentro da meta':'acima da meta'}</span></div>`}</div>`}
function perfFunil(){
  const F=funilStats({de:S.per.de,ate:S.per.ate},true),cr=cmpRange(),P=cr?funilStats(cr,false):null;
  const steps=[['Impressões',F.impr,P&&P.impr],['Cliques',F.clk,P&&P.clk],['Contatos',F.cont,P&&P.cont],['Oportunidades',F.opp,P&&P.opp],['Vendas',F.vend,P&&P.vend]];
  const roas=F.rec/F.inv,roasP=P?P.rec/P.inv:null;
  return `<section class="panel">${metaBlock(false)}</section>
  ${kpisC([{l:'Investimento em mídia',v:brl(Math.round(F.inv)),cur:F.inv,prev:P&&P.inv,prevTxt:P&&brl(Math.round(P.inv))},{l:'Vendas atribuídas',v:F.vend,s:'informadas pelo comercial',cur:F.vend,prev:P&&P.vend,prevTxt:P&&String(P.vend)},{l:'Receita atribuída',v:brl(Math.round(F.rec)),cur:F.rec,prev:P&&P.rec,prevTxt:P&&brl(Math.round(P.rec))},{l:'Retorno sobre a mídia',v:roas.toFixed(1).replace('.',',')+'x',s:'receita ÷ investimento',cur:roas,prev:roasP,prevTxt:roasP&&roasP.toFixed(1).replace('.',',')+'x'},{l:'Custo por venda',v:F.vend?brl(Math.round(F.inv/F.vend)):'—',cur:F.vend?F.inv/F.vend:null,prev:P&&P.vend?P.inv/P.vend:null,prevTxt:P&&P.vend?brl(Math.round(P.inv/P.vend)):null,low:true}],cr)}
  <section class="panel"><h2>Do anúncio à venda</h2><div class="funil">${steps.map((s,i)=>{const w=Math.max(18,100-i*19);const conv=i?s[1]/steps[i-1][1]*100:null;
    return `<div class="fstep"><div class="fbar" style="width:${w}%"><span>${s[0]}</span><b>${fk(s[1])}</b></div><span class="fconv">${conv!=null?pct(conv)+' do passo anterior':''}</span></div>`}).join('')}</div>
   <p class="muted" style="font-size:12px;margin:8px 0 0">Impressões, cliques e contatos vêm das plataformas e do site. Oportunidades e vendas vêm do comercial da Spraytec.${isTeam()?' <button class="linkbtn" data-act="vendas-import">Importar planilha de vendas</button>':''}</p></section>
  <section class="panel"><h2>Retorno por campanha</h2><div class="tablewrap" style="border:0"><table class="ap" style="min-width:680px"><thead><tr><th>Campanha</th><th>Investimento</th><th>Contatos</th><th>Vendas</th><th>Receita</th><th>Retorno</th></tr></thead><tbody>
   ${CAMP_RET.map(c=>{const f=perF();const inv=c[2]*f,rec=c[5]*f;return `<tr><td><b>${c[0]}</b><div class="muted" style="font-size:12px">${c[1]}</div></td><td class="mono">${brl(Math.round(inv))}</td><td class="mono">${Math.round(c[3]*f)}</td><td class="mono">${Math.round(c[4]*f)}</td><td class="mono">${rec?brl(Math.round(rec)):'—'}</td><td class="mono"><b>${rec?(rec/inv).toFixed(1).replace('.',',')+'x':'—'}</b></td></tr>`}).join('')}</tbody></table></div>
   <p class="muted" style="font-size:12px;margin:0">Vídeo e alcance aparecem com pouca venda direta. Eles alimentam o remarketing, que fecha a venda depois.</p></section>`}

// ---------- DESDE A SUA ÚLTIMA VISITA ----------
function novidadesBlock(){
  const desde=ULTIMA_VISITA?ULTIMA_VISITA.slice(0,10):addDays(TODAY,-2);
  const pubs=posts.filter(p=>p.status==='publicado'&&p.date&&p.date>=desde&&p.date<=TODAY&&['ig','fb','yt'].includes(p.rede));
  const its=[];
  if(plano&&plano.pendente)its.push({tag:['ESTRATÉGIA','--k-trafego'],t:'Nova versão do plano de mídia '+(isM()?'para aprovar':'enviada'),a:'data-view="plano"'});
  const rx=RELATORIOS.find(r=>r.tipo==='Executivo semanal'&&r.status==='entregue');if(rx)its.push({tag:['RELATÓRIO','--k-email'],t:rx.t+' disponível',a:`data-act="rel-ver" data-id="${rx.id}"`});
  its.push({tag:['RESULTADO','--ok'],t:'Contatos no mês: '+metaMes().cont+', projeção de '+metaMes().proj+' para a meta de '+metaMes().metaC+' (exemplo)',a:'data-view="performance"'});
  if(!isDir()){if(pubs.length)its.push({tag:['POSTS','--k-post'],t:pubs.length+(pubs.length>1?' posts publicados':' post publicado')+' desde então',a:'data-view="calendario"'});const un=unreadCount();if(un)its.push({tag:['CONVERSA','--k-spraytec'],t:un+(un>1?' mensagens novas':' mensagem nova')+(isM()?' com a Cancha':' do Matheus'),a:'data-act="ir-chat"'});
    const late=demandas.filter(d=>!d.feito&&d.data<TODAY&&d.quem==='spraytec');if(late.length)its.push({tag:['DEMANDA','--bad'],t:late.length+(late.length>1?' demandas atrasadas':' demanda atrasada')+' com a Spraytec',a:`data-dem="${late[0].id}"`})}
  return `<section class="panel novid"><div class="mhead"><h2>Desde a sua última visita</h2><span class="muted" style="font-size:12px">${ULTIMA_VISITA?fmtVisita(ULTIMA_VISITA):'primeira visita'}</span></div><div class="list">${its.map(x=>`<button class="nrow" ${x.a}>${ktag(x.tag[0],x.tag[1])}<span>${esc(x.t)}</span><span class="muted">›</span></button>`).join('')}</div></section>`}

// ---------- RELATÓRIOS EXECUTIVO E GERENCIAL (gerados automaticamente) ----------
function relAuto(r){return r.tipo==='Executivo semanal'||r.tipo==='Gerencial semanal'}
function drawerRelView(){const r=RELATORIOS.find(x=>x.id===S.drawer.id);const ed=isTeam()&&r.status==='rascunho';const m=metaMes();
  const K=r.k||{cont:52,contP:44,cpl:82,cplP:91,alc:24100,alcP:19800,pub:4};
  const kp=`<div class="kpis">${[['Contatos na semana',K.cont,K.contP,0],['Custo por contato','R$ '+K.cpl,'R$ '+K.cplP,1],['Alcance nas redes',fk(K.alc),fk(K.alcP),0],['Projeção do mês',m.proj+' / '+m.metaC,null,0]].map(([l,v,pv,low])=>`<div class="kpi"><div class="l">${l} ${EX}</div><div class="v">${v}</div>${pv?`<div class="l">semana anterior: ${pv}</div>`:''}</div>`).join('')}</div>`;
  const ta=(id,label,val,rows)=>ed?`<label for="${id}" class="eyebrow">${label}</label><textarea id="${id}" class="pe" rows="${rows||3}">${esc(val)}</textarea>`:`<div><div class="eyebrow" style="margin-bottom:4px">${label}</div>${val.includes('\n')?`<ul style="margin:0;padding-left:18px">${val.split('\n').filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p style="margin:0">${esc(val)}</p>`}</div>`;
  let body='';
  if(r.tipo==='Executivo semanal')body=`${kp}${ta('rv-frase','Em uma frase',r.frase||'',2)}${ta('rv-dest','Destaques',(r.dest||[]).join('\n'),3)}${ta('rv-aten','Ponto de atenção',r.aten||'',2)}${ta('rv-prox','Próximos passos',r.prox||'',3)}`;
  else{const dAb=demandas.filter(d=>!d.feito&&d.quem==='spraytec'),dAt=dAb.filter(d=>d.data<TODAY);const vg=videos.filter(v=>v.stage==='gravacao').length;
   body=`${kp}<div class="gsec"><b>Social ${EX}</b><span>4 posts e 12 stories · alcance 24,1 mil · engajamento médio 5,6% · melhor post: Mitos e verdades sobre micronutrientes</span></div>
   <div class="gsec"><b>Mídia paga ${EX}</b><span>R$ 4.230 investidos · 52 contatos · custo por contato R$ 82 · melhor criativo: Conheça a linha foliar Spraytec</span></div>
   <div class="gsec"><b>Produção</b><span>${pendingApprovals().length} itens em aprovação · ${videos.filter(v=>v.stage==='roteiro').length} roteiros esperando a Spraytec · ${vg} ${vg===1?'vídeo':'vídeos'} em gravação</span></div>
   <div class="gsec"><b>Demandas</b><span>${dAb.length} abertas com a Spraytec${dAt.length?', '+dAt.length+' atrasada'+(dAt.length>1?'s':'')+' ('+esc(dAt[0].t)+')':''}</span></div>
   ${ta('rv-com','Comentário da Cancha',r.com||'',3)}`}
  return `<header><div><div class="eyebrow">${esc(r.tipo)} · ${r.status==='rascunho'?'rascunho':'publicado em '+fmt(r.entrega)}</div><h2>${esc(r.t)}</h2><div class="muted" style="font-size:13px">${esc(r.per)}</div></div>${closeBtn()}</header>
  <div class="content">${ed?'<div class="notice">Os números são de exemplo até as integrações entrarem. Revise os textos e valide para o cliente ver.</div>':''}${body}
   ${ed?`<div class="actions"><button class="btn primary" data-act="rv-publicar">Validar e publicar</button><button class="btn" data-act="rv-salvar">Salvar rascunho</button></div>`:`<div class="actions"><a class="btn" href="${esc(r.link||'https://drive.google.com/')}" target="_blank" rel="noopener" style="text-decoration:none">Baixar PDF</a></div>`}</div>`}
function lerRelView(){const g=id=>{const e=$('#'+id);return e?e.value.trim():''};
  return {frase:g('rv-frase'),dest:g('rv-dest').split('\n').map(x=>x.trim()).filter(Boolean),aten:g('rv-aten'),prox:g('rv-prox'),com:g('rv-com')}}

// ---------- APRENDIZADOS ----------
let APRENDIZADOS=[];
const FRENTES_A=[['social','Social'],['trafego','Tráfego pago'],['email','E-mail'],['design','Design'],['video','Vídeo']];
function acvAprendizados(){
  const cats=FRENTES_A.map(([k,l])=>[k,l,APRENDIZADOS.filter(a=>a.frente===k).length]);
  const vis=APRENDIZADOS.filter(a=>acvMatch('aprendizados',a.frente,a.t+' '+a.res+' '+a.dec));
  return `${acvToolbar('aprendizados',cats,isTeam()?'<button class="btn primary" data-act="apr-novo">+ Novo</button>':'')}${groupsHtml(FRENTES_A.map(([k,l])=>({t:l,items:vis.filter(a=>a.frente===k).sort((a,b)=>b.data.localeCompare(a.data)).map(a=>rowD(ktag(a.status==='teste'?'EM TESTE':'CONCLUÍDO',a.status==='teste'?'--warn':'--ok'),esc(a.t),esc(a.res),fmt(a.data),isTeam()?`<button class="linkbtn" data-act="apr-edit" data-id="${a.id}">Editar</button>`:'',`<dl class="kv" style="margin:0;flex:1"><dt>Hipótese</dt><dd>${esc(a.hip)}</dd><dt>Resultado</dt><dd>${esc(a.res)}</dd><dt>Decisão</dt><dd>${esc(a.dec||'—')}</dd></dl>`))})))}`}
function drawerApr(){const id=S.drawer.id;const a=id?APRENDIZADOS.find(x=>x.id===id):{frente:'trafego',t:'',hip:'',res:'',dec:'',data:TODAY,status:'teste'};
  return `<header><div><div class="eyebrow">Acervo · Aprendizados</div><h2>${id?'Editar aprendizado':'Novo aprendizado'}</h2></div>${closeBtn()}</header>
  <div class="content"><label for="ap-t">O que foi testado</label><input type="text" id="ap-t" class="pe" value="${esc(a.t)}" placeholder="Ex.: Carrossel × reel no remarketing">
  <div class="ler"><div style="flex:1"><label for="ap-f">Frente</label><select id="ap-f" class="pe">${FRENTES_A.map(([k,l])=>`<option value="${k}" ${a.frente===k?'selected':''}>${l}</option>`).join('')}</select></div><div style="flex:1"><label for="ap-s">Situação</label><select id="ap-s" class="pe"><option value="teste" ${a.status==='teste'?'selected':''}>Em teste</option><option value="concluido" ${a.status==='concluido'?'selected':''}>Concluído</option></select></div><div style="flex:1"><label for="ap-d">Data</label><input type="date" id="ap-d" class="pe" value="${a.data}"></div></div>
  <label for="ap-h">Hipótese</label><input type="text" id="ap-h" class="pe" value="${esc(a.hip)}"><label for="ap-r">Resultado</label><input type="text" id="ap-r" class="pe" value="${esc(a.res)}"><label for="ap-c">Decisão</label><input type="text" id="ap-c" class="pe" value="${esc(a.dec)}">
  <div class="actions"><button class="btn primary" data-act="apr-salvar">Salvar</button>${id?'<button class="btn danger" data-act="apr-excluir">Remover</button>':''}</div></div>`}

// ---------- GUIA DE MARCA ----------
let GUIA={tom:[],evitar:[],termos:[],produtos:[],hashtags:[]};
const GUIA_SEC=[['tom','Tom de voz'],['evitar','O que não dizer'],['termos','Termos (usar | evitar)'],['produtos','Produtos (nome | registro | o que podemos dizer)'],['hashtags','Hashtags padrão']];
function acvGuia(){
  const sp=x=>x.split('|').map(t=>t.trim());
  return `<div class="toolbar"><p class="sub" style="margin:0">A referência de quem produz conteúdo para a Spraytec. Logos, fontes e cores ficam na pasta Marca do Drive.</p><div class="actions"><a class="btn" href="https://drive.google.com/" target="_blank" rel="noopener" style="text-decoration:none">Pasta Marca no Drive</a>${isTeam()?'<button class="btn primary" data-act="guia-edit">Editar guia</button>':''}</div></div>
  <div class="guiagrid">
   <section class="pcard"><div class="eyebrow" style="margin-bottom:8px">Tom de voz</div><ul class="gl ok">${GUIA.tom.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
   <section class="pcard"><div class="eyebrow" style="margin-bottom:8px">O que não dizer</div><ul class="gl no">${GUIA.evitar.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
   <section class="pcard"><div class="eyebrow" style="margin-bottom:8px">Termos</div><div class="list">${GUIA.termos.map(x=>{const [u,e]=sp(x);return `<div class="row"><span class="grow"><b>${esc(u)}</b></span><span class="muted" style="text-decoration:line-through">${esc(e||'')}</span></div>`}).join('')}</div></section>
   <section class="pcard"><div class="eyebrow" style="margin-bottom:8px">Hashtags padrão</div><div class="pchips">${GUIA.hashtags.map(x=>`<span class="pchip" style="border-style:solid">${esc(x)}</span>`).join('')}</div></section>
  </div>
  <section class="pcard"><div class="eyebrow" style="margin-bottom:8px">Produtos</div><div class="tablewrap" style="border:0"><table class="ap" style="min-width:560px"><thead><tr><th>Produto</th><th>Registro</th><th>O que podemos dizer</th></tr></thead><tbody>${GUIA.produtos.map(x=>{const [p,r,c]=sp(x);return `<tr><td><b>${esc(p)}</b></td><td class="muted">${esc(r||'')}</td><td>${esc(c||'')}</td></tr>`}).join('')}</tbody></table></div><p class="muted" style="font-size:12px;margin:6px 0 0">Informações técnicas validadas pela agronomia da Spraytec (cláusula 3.3).</p></section>`}
function drawerGuia(){return `<header><div><div class="eyebrow">Acervo</div><h2>Editar guia de marca</h2></div>${closeBtn()}</header>
  <div class="content"><p class="muted" style="margin:0">Um item por linha.</p>${GUIA_SEC.map(([k,l])=>`<label for="gu-${k}">${l}</label><textarea id="gu-${k}" class="pe" rows="${GUIA[k].length+1}">${esc(GUIA[k].join('\n'))}</textarea>`).join('')}
  <div class="actions"><button class="btn primary" data-act="guia-salvar">Salvar guia</button></div></div>`}

// ---------- APROVAÇÃO RÁPIDA (um por um, pensada para o celular) ----------
function drawerRapida(){const fila=pendingApprovals();const i=Math.min(S.rapI||0,fila.length);
  if(!fila.length)return `<header><div><div class="eyebrow">Aprovação rápida</div><h2>Tudo aprovado</h2></div>${closeBtn()}</header><div class="content"><p>Não há mais nada esperando por você.</p><div class="actions"><button class="btn primary" data-act="close">Fechar</button></div></div>`;
  const p=fila[i%fila.length];
  return `<header><div><div class="eyebrow">Aprovação rápida · ${(i%fila.length)+1} de ${fila.length}</div><h2>${esc(p.titulo)}</h2><div class="muted" style="font-size:13px">${tipoAprov(p)} · ${NETNAME[p.rede]} · publicação ${fmtLong(p.date)}</div></div>${closeBtn()}</header>
  <div class="content"><div class="pv-lg">${p.formato==='plano'?'<div class="pv doc" style="--pvs:12px"><span class="sm">PLANO DE MÍDIA</span><b>'+esc(p.titulo)+'</b></div>':preview(p)}</div>
   ${p.formato==='plano'?'<button class="linkbtn" data-act="ver-mud" data-id="pendente">Ver alterações do plano</button>':`<div class="caption" style="max-height:120px;overflow:auto">${esc(p.legenda)}</div>`}
   <button class="btn primary big" data-act="rap-aprovar" data-id="${p.id}">Aprovar</button>
   <details class="padj2"><summary class="btn big" style="text-align:center;list-style:none">Pedir ajuste</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><textarea id="rap-adj" class="pe" placeholder="O que precisa mudar?"></textarea><button class="btn danger" data-act="rap-ajuste" data-id="${p.id}">Enviar ajuste</button></div></details>
   <button class="linkbtn" data-act="rap-pular" style="align-self:center">Pular por enquanto</button>
   <p class="muted" style="font-size:12px;margin:0;text-align:center">Pensado para o celular: aprove um item por vez.</p></div>`}
function relRowRasc(r){return `<details class="rrow"><summary>${ktag('RASCUNHO','--warn')}<span class="rt"><b>${esc(r.t)}</b><span class="muted">${esc(r.per)} · gerado automaticamente</span></span><span class="rd mono">${fmt(r.entrega)}</span><span class="ra"><button class="linkbtn" data-act="rel-ver" data-id="${r.id}">Revisar e validar</button></span></summary></details>`}

function mcard(title,go,goLabel,body){return `<section class="panel mcard"><div class="mhead"><h2>${title}</h2><button class="linkbtn" data-view="${go}">${goLabel} ›</button></div>${body}</section>`}
function viewHoje(){
  if(!plano)return `${head('Início')}<p class="muted">Ainda não há dados cadastrados.</p>`;
  const cur=plano.dados,pd=plano.pendente,tot=totVerba(pd?pd.dados:cur);
  const semana=posts.filter(p=>p.date&&p.date>=TODAY&&p.date<=addDays(TODAY,7)&&p.formato!=='plano').sort((a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99')));
  const late=demandas.filter(d=>!d.feito&&d.data<TODAY),prox=demandas.filter(d=>!d.feito&&d.data>=TODAY&&d.data<=addDays(TODAY,7)).sort((a,b)=>a.data.localeCompare(b.data));
  const hojeSt=stories.filter(s=>s.date===TODAY);
  const tc=p=>{const k=tipoCal(p);return `<span class="ch" style="--kc:var(--k-${k})">${k==='post'?NET[p.rede]:{email:'E-mail',design:'Design',video:'Vídeo'}[k]}</span>`};
  return `<div class="headrow hello"><div><div class="eyebrow">${isM()?'Spraytec Brasil · ':'Visão da Spraytec · '}${fmtLong(TODAY)}</div><h1>${isDir()?'Visão da diretoria':'Olá, '+esc(EU.nome.split(' ')[0])}</h1></div></div>
  ${(n=>{if(!n||isDir())return '';const pz=pendingApprovals().map(prazoDe).concat(roteirosPend().map(v=>v.prazo).filter(Boolean)).sort()[0];
    return `<section class="panel aprov-cta"><div><h2 style="margin:0;font-size:18px">${isM()?`Você tem ${n} ${n>1?'itens':'item'} para aprovar`:`${n} ${n>1?'itens':'item'} com o Matheus para aprovar`}</h2>${pz?`<p class="muted" style="margin:4px 0 0;font-size:13px">O prazo mais próximo ${pz<TODAY?'venceu':'vence'} ${fmtLong(pz)}.</p>`:''}</div><button class="btn primary" data-view="aprovacao">Ir para Aprovação</button></section>`})(badgeCount())}
  ${novidadesBlock()}
  <div class="macro">
   ${mcard('Estratégia','plano','Abrir estratégia',`<p class="mobj">${esc(cur.objetivo)}</p>
     <div class="mkpis"><div><b>${cur.metas.contatos}</b><span>contatos/mês</span></div><div><b>R$ ${cur.metas.cpl}</b><span>custo por contato</span></div><div><b>${brl(tot)}</b><span>em mídia/mês</span></div></div>
     <div class="muted" style="font-size:13px">Versão ${plano.versao}${pd?` · <span class="pdot"></span><b style="color:var(--ink)">nova versão ${isM()?'para aprovar':'aguardando aprovação'}</b> <button class="linkbtn" data-act="ver-mud" data-id="pendente">Ver alterações</button>`:' · em vigor'}</div>
     <div class="muted" style="font-size:13px">Tema agora: <b style="color:var(--ink)">${esc((cur.temas[0]||{}).n||'—')}</b></div>`)}
   ${isDir()?'':mcard('Próximos 7 dias','calendario','Abrir calendário',`<div class="list">${semana.slice(0,6).map(p=>`<div class="row clickable" data-open="${p.id}"><span class="mono muted" style="font-size:12px;min-width:44px">${fmt(p.date)}</span>${tc(p)}<div class="grow t">${hiddenForClient(p)?'Em preparação':esc(p.titulo)}</div><span class="muted" style="font-size:12px">${ST_CURTO[p.status]}</span></div>`).join('')||'<p class="muted">Nada nos próximos dias.</p>'}</div>${semana.length>6?`<p class="muted" style="font-size:12px;margin:6px 0 0">e mais ${semana.length-6}</p>`:''}`)}
   ${mcard('Retorno e meta '+EX,'performance','Ver funil',`${metaBlock(true)}<div class="mkpis g2"><div><b>${brl(Math.round(funilStats({de:TODAY.slice(0,8)+'01',ate:TODAY},true).rec))}</b><span>receita atribuída no mês</span></div><div><b>${(412000/18200).toFixed(1).replace('.',',')}x</b><span>retorno sobre a mídia</span></div></div>`)}
   ${isDir()?mcard('Resumo executivo','acervo','Ver relatórios',`${(r=>r?`<p class="mobj">${esc(r.frase||r.t)}</p><button class="linkbtn" data-act="rel-ver" data-id="${r.id}">Abrir ${esc(r.t)}</button>`:'<p class="muted">Ainda não há resumo publicado.</p>')(RELATORIOS.find(x=>x.tipo==='Executivo semanal'&&x.status==='entregue'))}`):mcard('Demandas','calendario','Ver no calendário',`<div class="mkpis"><div><b class="${late.length?'bad':''}">${late.length}</b><span>atrasadas</span></div><div><b>${prox.length}</b><span>nos próximos 7 dias</span></div></div>
     <div class="list">${[...late,...prox].slice(0,4).map(d=>`<div class="row clickable" data-dem="${d.id}"><span class="mono muted" style="font-size:12px;min-width:44px">${fmt(d.data)}</span><span class="ch" style="--kc:var(--k-${d.quem})">${QUEM[d.quem]}</span><div class="grow t">${esc(d.t)}</div></div>`).join('')}</div>`)}
   ${mcard('Redes sociais '+EX,'redes','Ver redes',`<div class="mkpis g2"><div><b>18,6 mil</b><span>seguidores no Instagram</span></div><div><b>${hojeSt.length}</b><span>stories no ar agora</span></div><div><b>${hojeSt.filter(s=>s.tipo==='repost').length}</b><span>reposts hoje</span></div><div><b>14</b><span>publicações no mês</span></div></div>`)}
  </div>
  ${isDir()?'':chatSection()}`;
}

// APROVAÇÃO
const ATIPOS=[['todos','Todos'],['Post','Posts'],['Story','Stories'],['Vídeo','Vídeos'],['E-mail marketing','E-mail marketing'],['Plano de mídia','Plano de mídia'],['Peça de anúncio','Peças de anúncio']];
function viewAprovacao(){
  const rows=[...posts.filter(p=>['aprovacao','validacao','ajuste'].includes(p.status)).sort((a,b)=>(a.date||'9').localeCompare(b.date||'9')).map(p=>({p,tipo:tipoAprov(p)})),...roteirosPend().map(v=>({v,tipo:'Vídeo'}))];
  const vis=rows.filter(r=>S.atipo==='todos'||r.tipo===S.atipo);
  const cnt=t=>rows.filter(r=>(t==='todos'||r.tipo===t)&&!(r.p&&r.p.status==='ajuste')).length;
  const keys=vis.filter(r=>!(r.p&&r.p.status==='ajuste')).map(r=>r.p?r.p.id:'v:'+r.v.id);S.selKeys=keys;const nSel=keys.filter(k=>S.sel[k]).length;const all=keys.length&&nSel===keys.length;
  return `${head('Aprovação',isM()?'Tudo o que espera por você numa tabela só. Marque e aprove de uma vez, ou abra o item para ver em tamanho real e pedir ajuste.':'Itens com o Matheus. Aprovação por WhatsApp ou e-mail é registrada dentro do item.')}
  <div class="toolbar"><div class="filters">${ATIPOS.filter(([k])=>k==='todos'||rows.some(r=>r.tipo===k)).map(([k,l])=>`<button class="chip" data-atipo="${k}" aria-pressed="${S.atipo===k}">${l} · ${cnt(k)}</button>`).join('')}</div>
   ${isM()?'<div class="actions"><button class="btn" data-act="rapida">Aprovar um por um</button><button class="btn primary" data-act="approve-sel">Aprovar selecionados'+(nSel?' ('+nSel+')':'')+'</button></div>':''}</div>
  <div class="tablewrap"><table class="ap"><thead><tr>${isM()?`<th><input type="checkbox" data-selall="1" aria-label="Selecionar todos" ${all?'checked':''} ${keys.length?'':'disabled'}></th>`:''}<th>Item</th><th>Tipo</th><th>Publicação</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>
  ${vis.map(r=>{
    if(r.v){const v=r.v;return `<tr>${isM()?`<td><input type="checkbox" data-selv="${v.id}" ${S.sel['v:'+v.id]?'checked':''} aria-label="Selecionar"></td>`:''}<td><div class="itemcell clickable" data-video="${v.id}"><div class="mini"><div class="pv doc"><span class="sm">ROTEIRO</span></div></div><div><div class="t">Roteiro: ${esc(v.titulo)}</div><div class="muted" style="font-size:12px">Para a produtora gravar</div></div></div></td><td>Vídeo</td><td class="due">gravação ${v.gravacao}</td><td class="due">${fmtLong(v.prazo)}</td><td>${tagPill('Roteiro em aprovação','--s-aprovacao')}</td><td>${isM()?`<button class="btn" data-act="v-next" data-id="${v.id}">Aprovar</button>`:''}</td></tr>`}
    const p=r.p,pz=prazoDe(p),hot=pz<=addDays(TODAY,1);
    return `<tr>${isM()?`<td>${p.status!=='ajuste'?`<input type="checkbox" data-sel="${p.id}" ${S.sel[p.id]?'checked':''} aria-label="Selecionar">`:''}</td>`:''}<td><div class="itemcell clickable" data-open="${p.id}"><div class="mini">${preview(p)}</div><div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="muted" style="font-size:12px">${NETNAME[p.rede]} · ${FORMATO[p.formato]}</div></div></div></td><td>${r.tipo}</td><td class="due">${fmtLong(p.date)}${p.time?' '+p.time:''}</td><td class="due ${hot&&p.status!=='ajuste'?'hot':''}">${p.status==='ajuste'?'com a Cancha':fmtLong(pz)}</td><td>${pill(p.status)}</td>
    <td>${isM()&&p.status!=='ajuste'?`<div class="actions" style="flex-wrap:nowrap"><button class="btn primary" data-act="approve" data-id="${p.id}">Aprovar</button><button class="btn" data-open="${p.id}">Ajuste</button></div>`:`<button class="btn" data-open="${p.id}">Abrir</button>`}</td></tr>`}).join('')||`<tr><td colspan="7" class="muted">Nada para aprovar.</td></tr>`}
  </tbody></table></div>`;
}

// CALENDÁRIO (grade de semanas com faixas contínuas)
function monthCells(month){const [y,m]=month.split('-').map(Number);const first=month+'-01';const start=addDays(first,-((dow(first)+6)%7));const cells=[];for(let d=start;;d=addDays(d,1)){cells.push(d);if(cells.length%7===0&&addDays(d,1).slice(0,7)>month)break;if(cells.length>42)break}return cells}
function calGrid(month,renderDay,bands,addAct){
  const cells=monthCells(month),weeks=[];for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  return `<div class="cal"><div class="dow">${['seg','ter','qua','qui','sex','sáb','dom'].map(x=>`<div>${x}</div>`).join('')}</div>${weeks.map(w=>{
    const segs=[];
    const inM=w.filter(d=>d.startsWith(month)),ws=inM[0],we=inM[inM.length-1];
    if(bands){const ms=MARCOS.filter(m=>m.ini<=we&&m.fim>=ws).sort((a,b)=>a.ini.localeCompare(b.ini)||b.fim.localeCompare(a.fim));const ends=[];
      ms.forEach(m=>{const s=w.indexOf(m.ini>ws?m.ini:ws),e=w.indexOf(m.fim<we?m.fim:we);let L=ends.findIndex(x=>x<s);if(L<0){L=ends.length;ends.push(e)}else ends[L]=e;segs.push({m,s,e,L,st:m.ini>=ws,en:m.fim<=we})})}
    const lanes=segs.length?Math.max(...segs.map(x=>x.L))+1:0;
    return `<div class="wk" style="grid-template-rows:26px ${lanes?`repeat(${lanes},22px) `:''}auto">${w.map((d,i)=>{const out=!d.startsWith(month);if(out)return `<div class="day out" style="grid-column:${i+1};grid-row:1 / -1" aria-hidden="true"></div>`;return `<div class="day ${d===TODAY?'today':''}" data-day="${d}" style="grid-column:${i+1};grid-row:1 / -1"><div class="dn"><span>${Number(d.slice(8))}</span>${HOLIDAYS[d]?`<span class="hol">${HOLIDAYS[d]}</span>`:''}${addAct?`<button class="addd" data-act="${addAct}" data-date="${d}" aria-label="Adicionar em ${fmt(d)}">+</button>`:''}</div>${lanes?`<div style="height:${lanes*22}px;flex:none"></div>`:''}${out?'':renderDay(d)}</div>`}).join('')}
      ${segs.map(x=>`<button class="band b-${x.m.tipo} ${x.st?'s':''} ${x.en?'e':''}" data-act="${isTeam()?'marcos':''}" style="grid-column:${x.s+1} / ${x.e+2};grid-row:${x.L+2}" title="${esc(MK_TIPO[x.m.tipo]+': '+x.m.nome+' · '+fmt(x.m.ini)+' a '+fmt(x.m.fim))}"><b>${MK_TIPO[x.m.tipo]}</b><span>${esc(x.m.nome)}</span></button>`).join('')}</div>`}).join('')}</div>`;
}
function monthNav(key){const [y,m]=S[key].split('-').map(Number);return `<div class="monthnav"><button class="iconbtn" data-month="-1" data-mk="${key}" aria-label="Mês anterior">‹</button><h2>${MONTHS[m-1]} ${y}</h2><button class="iconbtn" data-month="1" data-mk="${key}" aria-label="Próximo mês">›</button></div>`}
function calItem(p){
  const drag=isTeam()&&p.status!=='publicado';const k=tipoCal(p);
  return `<div class="it" style="--kc:var(--k-${k})" data-open="${p.id}" ${drag?`draggable="true" data-drag="${p.id}"`:''} title="${esc(p.titulo)}">
    <div class="lb"><span class="kt">${{post:NET[p.rede],email:'E-MAIL',design:'DESIGN',video:'VÍDEO'}[k]}</span><span class="mono">${p.time||FORMATO[p.formato]}</span>${(n=>n?`<span class="lk" title="Ligado a ${n} itens">↔${n}</span>`:'')(related('p:'+p.id).length)}<span class="st">${ST_CURTO[p.status]}</span></div>${preview(p)}</div>`;
}
function viewCalendario(){
  const vp=posts.filter(p=>tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]);
  const byTime=(a,b)=>(a.time||'99').localeCompare(b.time||'99');
  const [y,m]=S.month.split('-').map(Number);const days=new Date(Date.UTC(y,m,0)).getUTCDate();
  const list=Array.from({length:days},(_,i)=>S.month+'-'+String(i+1).padStart(2,'0')).filter(d=>vp.some(p=>p.date===d)).map(d=>`<section class="panel"><div class="eyebrow">${fmtLong(d)}</div><div class="items">${vp.filter(p=>p.date===d).sort(byTime).map(calItem).join('')}</div></section>`).join('');
  const mk=MARCOS.filter(x=>x.ini<=S.month+'-31'&&x.fim>=S.month+'-01');
  const espera=vp.filter(p=>p.status==='espera');
  const sw=`<div class="seg" role="group" aria-label="Visão"><button data-calv="mes" aria-pressed="${(S.calv||'mes')==='mes'}">Calendário</button>${isTeam()||isM()?`<button data-calv="kanban" aria-pressed="${S.calv==='kanban'}">Kanban</button>`:''}<button data-calv="video" aria-pressed="${S.calv==='video'}">Produção de vídeo</button></div>`;
  if(S.calv==='video')return `${head('Calendário','',sw)}${viewVideoKanban()}`;
  if(S.calv==='kanban'&&isTeam())return `${head('Calendário','',sw)}${viewStatusKanban()}`;
  if(S.calv==='kanban'&&isM())return `${head('Calendário','',sw)}${viewClientKanban()}`;
  return `${head('Calendário','Posts, e-mail, produção de design e vídeo e as demandas, tudo ligado. Clique num item para ver os detalhes e o que está ligado a ele.',sw)}
  <div class="toolbar">${monthNav('month')}
   <div class="filters" role="group" aria-label="Tipos">${TIPOS.map(([k,l])=>`<button class="chip kchip" style="--kc:var(--k-${k})" data-tipo="${k}" aria-pressed="${S.tipos[k]}"><i></i>${l}</button>`).join('')}</div>
   <div class="actions">${isTeam()?'<button class="btn" data-act="marcos">Editar safra e eventos</button>':''}<button class="btn primary" data-act="cal-add" data-date="">+ Adicionar</button></div></div>
  <div class="calwrap">
   ${calGrid(S.month,d=>vp.filter(p=>p.date===d).sort(byTime).map(calItem).join('')+(S.tipos.demanda?demandas.filter(x=>x.data===d).map(x=>demChip(x,!isDir())).join(''):''),true,'cal-add')}
   <div class="calist"><section class="panel"><div class="eyebrow" style="margin-bottom:6px">Safra, comercial e eventos</div><div class="mkchips">${mk.map(x=>`<button class="band b-${x.tipo}" data-act="${isTeam()?'marcos':''}"><b>${MK_TIPO[x.tipo]}</b><span>${esc(x.nome)} · ${fmt(x.ini)}–${fmt(x.fim)}</span></button>`).join('')}</div></section>${list||'<p class="muted">Nada neste mês.</p>'}</div>
   ${espera.length?`<section class="espera" data-day="espera"><div class="eyebrow">Em espera, sem data · ${espera.length}</div><div class="items">${espera.map(calItem).join('')}</div></section>`:''}
  </div>`;
}

// REDES SOCIAIS
const IG_EXTRA=[['Dia do agrônomo','Institucional'],['Colheita do trigo no PR','Campo'],['Como ler a bula foliar','Educação'],['Bastidores do laboratório','Institucional']];
function viewRedes(){
  const tabs=[['instagram','Instagram'],['facebook','Facebook'],['youtube','YouTube']];
  const conn=`<div class="connected">${EX}<span>Integração com ${S.rede==='youtube'?'a API do YouTube':'a Meta'} ainda não conectada. Seguidores, stories e números abaixo são de exemplo; os posts vêm do calendário do portal.</span></div>`;
  let body='';
  if(S.rede==='instagram'){
    const ig=posts.filter(p=>p.rede==='ig'&&['publicado'].includes(p.status)).sort((a,b)=>b.date.localeCompare(a.date));
    const hoje=stories.filter(s=>s.date===TODAY);
    const tiles=[...ig.map(p=>({t:p.titulo,c:PILAR_HUE[p.pilar],f:p.formato,id:p.id})),...IG_EXTRA.map(x=>({t:x[0],c:PILAR_HUE[x[1]]}))];
    body=`<div class="prof"><span class="avbig">S</span><div style="display:flex;flex-direction:column;gap:8px"><b style="font-size:18px">spraytec.brasil</b><div class="cnts"><span><b>412</b> publicações</span><span><b>18,6 mil</b> seguidores</span><span><b>210</b> seguindo</span></div><span class="muted" style="font-size:13px">Spraytec Brasil · Nutrição vegetal · Maringá/PR (bio de exemplo)</span></div></div>
     <section class="panel"><div class="headrow" style="margin-bottom:8px"><h2 style="margin:0">Stories no ar agora · ${hoje.length}</h2><span class="muted" style="font-size:12px">${EX} Com a integração, ficam guardados no Acervo › Stories depois de 24 h.</span></div>
      <div class="rings">${hoje.map(s=>`<div class="ring"><span style="--bg-ring:${PILAR_HUE[s.pilar]}"><i></i></span>${s.hora} · ${s.tipo==='repost'?'repost':'agendado'}</div>`).join('')}${['Produtos','Campo','Eventos','Fábrica'].map(h=>`<div class="ring hl"><span><i style="background:var(--surface-2)"></i></span>${h}</div>`).join('')}</div>
      <p style="margin:8px 0 0;font-size:13px">Repost diário: <b>${hoje.filter(s=>s.tipo==='repost').length} hoje</b>. Todos os dias úteis desde ${fmt(STORIES_DESDE)} com repost.</p></section>
     <div class="iggrid">${tiles.map(x=>`<div class="igt" style="background:${x.c}" ${x.id?`data-open="${x.id}"`:''}>${x.f==='carrossel'?'<small>1/6</small>':x.f==='reel'?'<small>▶ Reel</small>':''}${esc(x.t)}</div>`).join('')}</div>`;
  }else if(S.rede==='facebook'){
    const fb=posts.filter(p=>p.rede==='fb'&&['publicado','agendado'].includes(p.status)).sort((a,b)=>b.date.localeCompare(a.date));
    body=`<div class="cover"></div><div class="prof" style="margin-top:-40px;padding:0 16px"><span class="avbig" style="box-shadow:0 0 0 4px var(--surface)">S</span><div><b style="font-size:18px">Spraytec Brasil</b><div class="muted" style="font-size:13px">24 mil curtidas · 25 mil seguidores</div></div></div>
     <div class="fbfeed">${fb.map(p=>`<div data-open="${p.id}">${p.status==='agendado'?`<div class="muted" style="font-size:12px;margin-bottom:4px">Agendado para ${fmtLong(p.date)}</div>`:''}${preview(p)}</div>`).join('')}</div>`;
  }else{
    const yt=posts.filter(p=>p.rede==='yt').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const vids=[...yt.filter(p=>p.formato==='video').map(p=>({t:p.titulo,c:PILAR_HUE[p.pilar],id:p.id,st:p.status})),{t:'Manejo de pós-emergência na soja',c:PILAR_HUE.Manejo},{t:'Tour pela fábrica de Maringá',c:PILAR_HUE.Institucional},{t:'Micronutrientes: o que a planta precisa',c:PILAR_HUE['Educação']}];
    body=`<div class="cover" style="background:linear-gradient(120deg,#16331F,#235F3F 60%,#6FA83A)"></div><div class="prof" style="padding:0 4px"><span class="avbig" style="box-shadow:none">S</span><div><b style="font-size:18px">Spraytec Brasil</b><div class="muted" style="font-size:13px">@spraytecbrasil · 3,1 mil inscritos · 86 vídeos</div></div></div>
     <h2 style="font-size:16px">Vídeos</h2><div class="ytgrid">${vids.map(v=>`<div class="ytv" ${v.id?`data-open="${v.id}"`:''}><div class="th" style="background:${v.c}">${esc(v.t)}<small>${v.st&&v.st!=='publicado'?'em breve':'8:42'}</small></div><b style="font-size:13px">${esc(v.t)}</b><span class="muted" style="font-size:12px">Spraytec Brasil</span></div>`).join('')}</div>
     <h2 style="font-size:16px">Shorts</h2><div class="postgrid">${yt.filter(p=>p.formato==='short').map(p=>`<div data-open="${p.id}">${preview(p)}</div>`).join('')}</div>`;
  }
  return `${head('Redes sociais','As redes da Spraytec dentro do portal. Com a integração, os dados vêm direto da Meta e do YouTube.')}${subtabs(tabs,'rede','Redes')}${conn}<div class="social">${body}</div>`;
}

// PERFORMANCE
function kpis(arr){return `<div class="kpis">${arr.map(k=>`<div class="kpi"><div class="l">${k[0]}</div><div class="v">${k[1]}</div><div class="l">${k[2]||''}</div></div>`).join('')}</div>`}
function viewPerformance(){
  const tabs=[['funil','Funil e vendas'],['trafego','Tráfego'],['social','Social'],['email','E-mail']];
  const body={funil:perfFunil,trafego:perfTrafego,social:perfSocial,email:perfEmail}[S.psub]();
  return `${head('Performance',EX+' Todos os números desta tela são de exemplo. Quando Meta, Google Ads, GA4 e Brevo forem conectados, eles entram aqui sem mudar a tela.')}${periodBar()}${subtabs(tabs,'psub','Performance')}${body}`;
}
// CRIATIVOS ATIVOS E PÚBLICOS (Meta Marketing API e Google Ads API)
const ADSETS=[
  {id:'as1',nome:'Remarketing · visitantes 60 dias',plat:'Meta',loc:'PR, MT e MS',idade:'25 a 65+',genero:'Todos',publico:'Visitou o site nos últimos 60 dias ou interagiu com o Instagram em 90 dias',excl:'Quem já enviou contato',posic:'Feed e Stories do Instagram e Facebook',otim:'Contatos (formulário)',orc:'R$ 150/dia'},
  {id:'as2',nome:'Prospecção · produtores de soja',plat:'Meta',loc:'PR, MT e MS',idade:'25 a 60',genero:'Todos',publico:'Interesses: agricultura, soja, agronomia e máquinas agrícolas',excl:'Visitantes do site (já estão no remarketing)',posic:'Automático (Advantage+)',otim:'Cliques no link',orc:'R$ 120/dia'},
  {id:'as3',nome:'Pesquisa · nutrição foliar',plat:'Google',loc:'PR, MT, MS e GO',idade:'—',genero:'—',publico:'Palavras-chave: adubo foliar, nutrição foliar soja, bioestimulante soja e mais 38',excl:'Termos negativos: barato, caseiro, emprego',posic:'Rede de Pesquisa',otim:'Maximizar conversões',orc:'R$ 200/dia'},
  {id:'as4',nome:'Vídeo · ensaio de campo',plat:'YouTube',loc:'PR e MT',idade:'25 a 64',genero:'Todos',publico:'Segmento agricultura e pecuária; canais de agronomia',excl:'—',posic:'Antes de vídeos (pulável)',otim:'Visualizações',orc:'R$ 50/dia'},
];
const CRIATIVOS=[
  {id:'c1',t:'Conheça a linha foliar Spraytec',as:'as1',fmt:'Imagem',pilar:'Produto',inv:3820,impr:82400,clk:1610,cont:58},
  {id:'c2',t:'Seu pulverizador está jogando produto fora?',as:'as2',fmt:'Reel',pilar:'Manejo',inv:2940,impr:96100,clk:1310,cont:36},
  {id:'c3',t:'Bioestimulante no florescimento',sub:'Teste A',as:'as1',fmt:'Carrossel',pilar:'Produto',inv:1650,impr:31200,clk:540,cont:24},
  {id:'c4',t:'Bioestimulante no florescimento',sub:'Teste B',as:'as1',fmt:'Reel',pilar:'Campo',inv:1390,impr:29800,clk:760,cont:15},
  {id:'c5',t:'Nutrição foliar para soja | Spraytec',as:'as3',fmt:'Anúncio de texto',pilar:'Produto',inv:6900,impr:58000,clk:3960,cont:84,desc:'Aumente o potencial da sua lavoura com a linha foliar Spraytec. Fale com um RTV.'},
  {id:'c6',t:'Resultado de campo: ensaio safra 25/26',as:'as4',fmt:'Vídeo',pilar:'Campo',inv:1500,impr:120000,clk:480,cont:12,views:41200},
].map(c=>Object.assign(c,{ctr:c.clk/c.impr*100,cpc:c.inv/c.clk,cpl:c.cont?c.inv/c.cont:null}));
const META_CPL=90;
function adCreativePreview(c){const as=ADSETS.find(a=>a.id===c.as);const bg=PILAR_HUE[c.pilar];
  if(as.plat==='Google')return `<div class="pv gad"><span class="sm"><b>Patrocinado</b> · spraytec.com.br</span><b class="gh">${esc(c.t)}</b><span>${esc(c.desc||'')}</span></div>`;
  if(as.plat==='YouTube')return `<div class="pv"><div class="img v169" style="--bg:${bg}"><span>${esc(c.t)}</span><span class="dur">Anúncio · 0:30</span></div></div>`;
  if(c.fmt==='Reel')return `<div class="pv vert" style="--bg:${bg};width:56%"><div class="full"><div class="sm">Patrocinado</div><div class="big">${esc(c.t)}</div><div class="sm">Saiba mais ›</div></div><div class="play">▶</div></div>`;
  return `<div class="pv"><div class="hd"><span class="av">S</span><span><b>Spraytec Brasil</b><br><span class="sm">Patrocinado</span></span></div><div class="img" style="--bg:${bg}">${c.fmt==='Carrossel'?'<span class="cnt">1/5</span>':''}<span>${esc(c.t)}</span></div><div class="ctabar"><span class="sm">spraytec.com.br</span><b>Saiba mais ›</b></div></div>`}
const brl2=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function secCriativos(){
  const ord={cont:(a,b)=>b.cont-a.cont,cpl:(a,b)=>(a.cpl||1e9)-(b.cpl||1e9),ctr:(a,b)=>b.ctr-a.ctr,inv:(a,b)=>b.inv-a.inv}[S.cord||'cont'];
  const f=perF();const CR=CRIATIVOS.map(c=>{const x={...c,inv:Math.round(c.inv*f),impr:Math.round(c.impr*f),clk:Math.max(1,Math.round(c.clk*f)),cont:Math.round(c.cont*f)};x.ctr=x.clk/x.impr*100;x.cpc=x.inv/x.clk;x.cpl=x.cont?x.inv/x.cont:null;return x});
  const list=CR.slice().sort(ord);const best=CR.filter(c=>c.cpl).sort((a,b)=>a.cpl-b.cpl)[0];
  return `<section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Criativos ativos · ${CR.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">${EX} Com a integração, vêm do Gerenciador de Anúncios da Meta e do Google Ads. ${perLabel()}.</p></div>
   <div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['cont','Contatos'],['cpl','Custo por contato'],['ctr','Taxa de cliques'],['inv','Investimento']].map(([k,l])=>`<button class="chip" data-cord="${k}" aria-pressed="${(S.cord||'cont')===k}">${l}</button>`).join('')}</div></div>
   <div class="crgrid">${list.map(c=>{const as=ADSETS.find(a=>a.id===c.as);const flag=c===best?tagPill('Melhor custo por contato','--ok'):c.cpl>plano.dados.metas.cpl?tagPill('Acima da meta de R$ '+plano.dados.metas.cpl,'--bad'):'';
     return `<article class="crcard"><div class="crprev">${adCreativePreview(c)}</div><div class="crbody">
      <div><b>${esc(c.t)}</b>${c.sub?` <span class="tag">${c.sub}</span>`:''}<div class="muted" style="font-size:12px">${as.plat} · ${c.fmt} · ${esc(as.nome)}</div></div>
      ${flag?`<div>${flag}</div>`:''}
      <div class="crm"><div><span>Investido</span><b>${brl(c.inv)}</b></div><div><span>Impressões</span><b>${n(c.impr)}</b></div><div><span>Cliques</span><b>${n(c.clk)}</b></div><div><span>Taxa de cliques</span><b>${c.ctr.toFixed(1).replace('.',',')}%</b></div><div><span>Contatos</span><b>${c.cont}</b></div><div><span>Custo por contato</span><b class="${c.cpl>plano.dados.metas.cpl?'bad':''}">${c.cpl?brl(Math.round(c.cpl)):'—'}</b></div></div>
      <div class="aud"><span class="eyebrow">Público</span><div>${esc(as.publico)}</div><div class="muted" style="font-size:12px">${as.loc}${as.idade!=='—'?' · '+as.idade+' anos':''} · ${esc(as.posic)}</div></div>
     </div></article>`}).join('')}</div></section>
  <section class="panel"><h2>Públicos dos conjuntos de anúncios</h2><div class="tablewrap" style="border:0"><table class="ap" style="min-width:900px"><thead><tr><th>Conjunto</th><th>Onde</th><th>Idade</th><th>Quem</th><th>Fora do público</th><th>Posicionamento</th><th>Otimizado para</th><th>Orçamento</th></tr></thead><tbody>
   ${ADSETS.map(a=>`<tr><td><b>${esc(a.nome)}</b><div class="muted" style="font-size:12px">${a.plat}</div></td><td>${a.loc}</td><td>${a.idade}</td><td style="max-width:260px">${esc(a.publico)}</td><td style="max-width:200px">${esc(a.excl)}</td><td>${esc(a.posic)}</td><td>${a.otim}</td><td class="mono">${a.orc}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}

function perfTrafego(){
  const {base,T}=trafStats({de:S.per.de,ate:S.per.ate},true);const cr=cmpRange();const C=cr?trafStats(cr,false).T:null;
  const rs=v=>'R$ '+n(Math.round(v)),rs2=v=>'R$ '+v.toFixed(2).replace('.',',');
  const pl=base.map(x=>[x.k,rs(x.i),fk(x.im),fk(x.c),rs2(x.i/x.c),x.ct,x.ct?rs(x.i/x.ct):'—']);
  const tot=18200,exc=tot-15000;
  return `<section class="panel"><div class="headrow" style="margin-bottom:6px"><h2 style="margin:0">Site</h2>${tagPill('Google Analytics 4 · integração pendente','--warn')}</div>
   <p class="muted" style="margin:0 0 10px">Quando o GA4 for integrado, aparecem aqui: sessões, usuários, origem do tráfego (orgânico, social, mídia, e-mail) e contatos pelo site.</p>
   <div class="kpis" style="opacity:.45">${['Sessões','Usuários','Contatos pelo site','Taxa de conversão'].map(k=>`<div class="kpi"><div class="l">${k}</div><div class="v">—</div></div>`).join('')}</div></section>
  <h2 style="font-size:16px;margin:4px 0 0">Mídia paga</h2>
  ${kpisC([{l:'Investimento',v:rs(T.i),s:'3 plataformas',cur:T.i,prev:C&&C.i,prevTxt:C&&rs(C.i)},{l:'Impressões',v:fk(T.im),cur:T.im,prev:C&&C.im,prevTxt:C&&fk(C.im)},{l:'Cliques',v:fk(T.c),s:'CTR '+pct(T.c/T.im*100),cur:T.c,prev:C&&C.c,prevTxt:C&&fk(C.c)},{l:'Contatos',v:T.ct,s:'formulário e WhatsApp',cur:T.ct,prev:C&&C.ct,prevTxt:C&&String(C.ct)},{l:'Custo por contato',v:T.ct?rs(T.i/T.ct):'—',s:'meta: até R$ '+plano.dados.metas.cpl,cur:T.ct?T.i/T.ct:null,prev:C&&C.ct?C.i/C.ct:null,prevTxt:C&&C.ct?rs(C.i/C.ct):null,low:true}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Plataforma</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>Custo por clique</th><th>Contatos</th><th>Custo por contato</th></tr></thead><tbody>${pl.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${secCriativos()}
  <div class="grid2">
   <section class="panel"><h2>Otimizações da semana</h2><div class="list">
    <div class="row"><span class="mono muted" style="font-size:12px">${fmt(addDays(TODAY,-3))}</span><div class="grow">Pausados 3 termos com custo alto e sem clique</div></div>
    <div class="row"><span class="mono muted" style="font-size:12px">${fmt(addDays(TODAY,-3))}</span><div class="grow">Teste A/B no Meta: carrossel educativo × reel de campo</div></div>
    <div class="row"><span class="mono muted" style="font-size:12px">${fmt(addDays(TODAY,-10))}</span><div class="grow">Verba movida do Display para Pesquisa (+R$ 800)</div></div></div></section>
   <section class="panel"><h2>Rastreamento</h2><div class="list">${[['Pixel e API de Conversões da Meta',1],['GA4 e Tag Manager no site',1],['UTM padronizado nos links',1],['Cruzamento com vendas do comercial',0]].map(r=>`<div class="row">${tagPill(r[1]?'OK':'Pendente',r[1]?'--ok':'--warn')}<div class="grow">${r[0]}</div></div>`).join('')}</div></section>
  </div>`;
}
// COMPARAÇÃO DE PERÍODOS
const CMPS=[['none','Sem comparação'],['prev','Período anterior'],['yoy','Mesmo período do ano passado'],['custom','Outro período']];
function daysOf(r){return Math.round((new Date(r.ate+'T12:00:00Z')-new Date(r.de+'T12:00:00Z'))/864e5)+1}
function cmpRange(){const c=S.per.cmp;if(c==='none')return null;if(c==='prev'){const dd=perDays();return {de:addDays(S.per.de,-dd),ate:addDays(S.per.de,-1)}}
  if(c==='yoy')return {de:addDays(S.per.de,-364),ate:addDays(S.per.ate,-364)};return {de:S.per.cde||addDays(S.per.de,-perDays()),ate:S.per.cate||addDays(S.per.de,-1)}}
function rLabel(r){return fmt(r.de)+(r.de.slice(0,4)!==TODAY.slice(0,4)?'/'+r.de.slice(2,4):'')+' a '+fmt(r.ate)+(r.ate.slice(0,4)!==TODAY.slice(0,4)?'/'+r.ate.slice(2,4):'')}
function inR(r,d){return d&&d>=r.de&&d<=r.ate}
// tráfego simulado: o período atual é a referência; períodos anteriores rodaram com resultado menor
function trafStats(r,isCur){const f=daysOf(r)/30;const adj=isCur?{i:1,im:1,c:1,ct:1}:r.ate<addDays(TODAY,-300)?{i:.55,im:.6,c:.5,ct:.4}:{i:.95,im:.9,c:.86,ct:.8};
  const base=[['Meta Ads',9800,214000,4980,128],['Google Ads',6900,58000,3960,74],['YouTube Ads',1500,120000,480,12]].map(([k,i,im,c,ct])=>({k,i:i*f*adj.i,im:im*f*adj.im,c:c*f*adj.c,ct:Math.max(0,Math.round(ct*f*adj.ct))}));
  const T=base.reduce((a,x)=>({i:a.i+x.i,im:a.im+x.im,c:a.c+x.c,ct:a.ct+x.ct}),{i:0,im:0,c:0,ct:0});return {base,T}}
function socialStats(r){const pub=posts.filter(p=>['ig','fb','yt'].includes(p.rede)&&p.status==='publicado'&&inR(r,p.date));const st=stories.filter(s=>inR(r,s.date));
  const sum=k=>pub.reduce((a,p)=>a+metricsOf(p)[k],0);return {pub,st,alc:sum('alc'),inter:sum('curt')+sum('com')+sum('salv')+sum('comp'),eng:pub.length?pub.reduce((a,p)=>a+metricsOf(p).eng,0)/pub.length:null,stAlc:st.length?st.reduce((a,s)=>a+s.alcance,0)/st.length:null,seg:r.de>=addDays(TODAY,-120)?Math.round(612*daysOf(r)/30*(r.ate===S.per.ate?1:.8)):null}}
// exemplo: os e-mails publicados no calendário recebem números fictícios; antes deles, 3 envios de exemplo
function campsEmail(){const pub=posts.filter(p=>p.rede==='email'&&p.status==='publicado'&&p.date).sort((a,b)=>b.date.localeCompare(a.date)).map((p,i)=>[p.titulo,p.date,12410-i*230,33.4-i*1.5,4.6-i*.2,0.2]);
  const ini=pub.length?pub[pub.length-1][1]:TODAY;return pub.concat([['Newsletter: preparo do plantio',addDays(ini,-28),12180,30.1,4.2,0.3],['E-mail: convite para a feira regional',addDays(ini,-49),11950,28.7,3.9,0.3],['Newsletter: planejamento da safra',addDays(ini,-63),11800,27.9,3.6,0.4]])}
function emailStats(r){const camp=campsEmail().filter(c=>inR(r,c[1]));const avg=i=>camp.length?camp.reduce((a,c)=>a+c[i],0)/camp.length:null;return {camp,ab:avg(3),cl:avg(4),de:avg(5)}}
// cartão com variação
function delta(cur,prev,lowerBetter,pp){if(cur==null||prev==null)return '';if(prev===0&&cur===0)return '';
  if(pp){const d=cur-prev;const good=lowerBetter?d<0:d>0;return `<span class="dl ${Math.abs(d)<.05?'eq':good?'up':'down'}">${d>0?'▲':d<0?'▼':'='} ${Math.abs(d).toFixed(1).replace('.',',')} p.p.</span>`}
  if(prev===0)return '<span class="dl up">novo</span>';const d=(cur-prev)/prev*100;const good=lowerBetter?d<0:d>0;return `<span class="dl ${Math.abs(d)<.5?'eq':good?'up':'down'}">${d>0?'▲':d<0?'▼':'='} ${Math.abs(d).toFixed(0)}%</span>`}
function kpisC(arr,cr){return `<div class="kpis">${arr.map(k=>`<div class="kpi"><div class="l">${k.l}</div><div class="v">${k.v}</div>${cr?`<div class="cmpv">${delta(k.cur,k.prev,k.low,k.pp)}<span class="muted">${k.prevTxt!=null?k.prevTxt:'sem dados'}</span></div>`:`<div class="l">${k.s||''}</div>`}</div>`).join('')}</div>`}

// PERÍODO DE ANÁLISE (padrão: últimos 30 dias)
function perDays(){return Math.round((new Date(S.per.ate+'T12:00:00Z')-new Date(S.per.de+'T12:00:00Z'))/864e5)+1}
function perF(){return perDays()/30}
function perLabel(){return fmt(S.per.de)+(S.per.de.slice(0,4)!==S.per.ate.slice(0,4)?'/'+S.per.de.slice(2,4):'')+' a '+fmt(S.per.ate)+' · '+perDays()+' dias'}
function inPer(d){return d&&d>=S.per.de&&d<=S.per.ate}
const PRESETS=[['7','7 dias'],['30','30 dias'],['90','90 dias'],['mes','Este mês'],['mesant','Mês passado']];
function setPreset(k){S.per.preset=k;if(k==='mes'){S.per.de=TODAY.slice(0,8)+'01';S.per.ate=TODAY}else if(k==='mesant'){const d=new Date(TODAY.slice(0,8)+'01T12:00:00Z');d.setUTCDate(0);S.per.ate=d.toISOString().slice(0,10);S.per.de=S.per.ate.slice(0,8)+'01'}else{S.per.de=addDays(TODAY,-(Number(k)-1));S.per.ate=TODAY}}
function periodBar(){return `<div class="perbar"><span class="eyebrow">Período</span><div class="filters">${PRESETS.map(([k,l])=>`<button class="chip" data-per="${k}" aria-pressed="${S.per.preset===k}">${l}</button>`).join('')}</div>
  <div class="perdates"><label for="per-de" class="muted">De</label><input type="date" id="per-de" class="pe" value="${S.per.de}" max="${TODAY}"><label for="per-ate" class="muted">até</label><input type="date" id="per-ate" class="pe" value="${S.per.ate}" max="${TODAY}"></div>
  <span class="muted mono" style="font-size:12px">${perLabel()}</span>
  <div class="perdates"><label for="per-cmp" class="muted">Comparar com</label><select id="per-cmp" class="pe">${CMPS.map(([k,l])=>`<option value="${k}" ${S.per.cmp===k?'selected':''}>${l}</option>`).join('')}</select>
   ${S.per.cmp==='custom'?`<input type="date" id="per-cde" class="pe" aria-label="Início da comparação" value="${cmpRange().de}" max="${TODAY}"><span class="muted">até</span><input type="date" id="per-cate" class="pe" aria-label="Fim da comparação" value="${cmpRange().ate}" max="${TODAY}">`:''}
   ${cmpRange()?`<span class="muted mono" style="font-size:12px">${rLabel(cmpRange())}</span>`:''}</div></div>`}
const fk=v=>v>=10000?(Math.round(v/100)/10).toLocaleString('pt-BR')+' mil':n(Math.round(v));
const pct=v=>v.toFixed(1).replace('.',',')+'%';
function metricsOf(p){if(p._m)return p._m;let h=0;for(const ch of p.id+p.titulo)h=(h*31+ch.charCodeAt(0))>>>0;const b=p.metrics||{};const alc=b.alcance||(p.rede==='fb'?1200:2400)+h%7000;const eng=b.eng||(p.rede==='fb'?1.5:3)+(h%45)/10;const it=Math.round(alc*eng/100);
  p._m={alc,eng,curt:Math.round(it*.72),com:Math.round(it*.08),salv:Math.round(it*.12),comp:Math.round(it*.08),views:['reel','video','short'].includes(p.formato)?Math.round(alc*1.7):null};return p._m}
function perfSocial(){
  const SC=socialStats({de:S.per.de,ate:S.per.ate}),cr=cmpRange(),SP=cr?socialStats(cr):null;const pub=SC.pub,st=SC.st;
  const sum=k=>pub.reduce((a,p)=>a+metricsOf(p)[k],0);const alc=sum('alc'),inter=sum('curt')+sum('com')+sum('salv')+sum('comp');
  const engM=pub.length?pub.reduce((a,p)=>a+metricsOf(p).eng,0)/pub.length:0;
  const by=r=>pub.filter(p=>p.rede===r);
  const redes=[['ig','Instagram','18,6 mil',412],['fb','Facebook','25 mil',96],['yt','YouTube','3,1 mil',104]].map(([r,l,seg,nov])=>{const ps=by(r);const a=ps.reduce((x,p)=>x+metricsOf(p).alc,0);const e=ps.length?ps.reduce((x,p)=>x+metricsOf(p).eng,0)/ps.length:0;return [l,seg,'+'+Math.round(nov*perF()),fk(a),ps.length?pct(e):'—',ps.length+(r==='ig'?' · '+st.length+' stories':'')]});
  const ord={alc:(a,b)=>metricsOf(b).alc-metricsOf(a).alc,eng:(a,b)=>metricsOf(b).eng-metricsOf(a).eng,recent:(a,b)=>b.date.localeCompare(a.date)}[S.psort||'alc'];
  const list=pub.slice().sort(ord);const topA=pub.slice().sort((a,b)=>metricsOf(b).alc-metricsOf(a).alc)[0],topE=pub.slice().sort((a,b)=>metricsOf(b).eng-metricsOf(a).eng)[0];
  const has=SP&&(SP.pub.length||SP.st.length);
  return `${kpisC([{l:'Alcance',v:fk(alc),s:pub.length+' publicações',cur:alc,prev:has?SP.alc:null,prevTxt:has?fk(SP.alc):null},{l:'Interações',v:fk(inter),s:'curtidas, comentários, salvos e compartilhamentos',cur:inter,prev:has?SP.inter:null,prevTxt:has?fk(SP.inter):null},{l:'Engajamento médio',v:pct(engM),cur:engM,prev:has?SP.eng:null,prevTxt:has&&SP.eng!=null?pct(SP.eng):null,pp:true},{l:'Publicações',v:pub.length,s:'IG, FB e YT',cur:pub.length,prev:SP?SP.pub.length:null,prevTxt:SP?String(SP.pub.length):null},{l:'Stories',v:st.length,s:'alcance médio '+(SC.stAlc?fk(SC.stAlc):'—'),cur:st.length,prev:has&&cr.de>=STORIES_DESDE?SP.st.length:null,prevTxt:has&&cr.de>=STORIES_DESDE?String(SP.st.length):'sem dados'},{l:'Novos seguidores','v':'+'+SC.seg,s:'nas três redes',cur:SC.seg,prev:SP&&SP.seg,prevTxt:SP&&SP.seg!=null?'+'+SP.seg:null}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Rede</th><th>Seguidores</th><th>Novos</th><th>Alcance</th><th>Engajamento</th><th>Publicações</th></tr></thead><tbody>${redes.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Posts do período · ${pub.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Os posts vêm do calendário do portal; alcance e engajamento são de exemplo até a integração com a Meta e o YouTube.</p></div>
   <div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['alc','Alcance'],['eng','Engajamento'],['recent','Mais recentes']].map(([k,l])=>`<button class="chip" data-psort="${k}" aria-pressed="${(S.psort||'alc')===k}">${l}</button>`).join('')}</div></div>
   ${pub.length?`<div class="crgrid">${list.map(p=>{const m=metricsOf(p);const flag=p===topA?tagPill('Maior alcance do período','--ok'):p===topE?tagPill('Maior engajamento do período','--ok'):'';
     return `<article class="crcard clickable" data-open="${p.id}"><div class="crprev">${preview(p)}</div><div class="crbody"><div><b>${esc(p.titulo)}</b><div class="muted" style="font-size:12px">${NETNAME[p.rede]} · ${FORMATO[p.formato]} · ${fmtLong(p.date)}</div></div>${flag?`<div>${flag}</div>`:''}
      <div class="crm"><div><span>Alcance</span><b>${fk(m.alc)}</b></div><div><span>Engajamento</span><b>${pct(m.eng)}</b></div><div><span>${m.views?'Visualizações':'Curtidas'}</span><b>${fk(m.views||m.curt)}</b></div><div><span>Comentários</span><b>${n(m.com)}</b></div><div><span>Salvamentos</span><b>${n(m.salv)}</b></div><div><span>Compartilh.</span><b>${n(m.comp)}</b></div></div></div></article>`}).join('')}</div>`:'<p class="muted">Nenhum post publicado nesse período.</p>'}</section>`;
}
function perfEmail(){
  const E=emailStats({de:S.per.de,ate:S.per.ate}),cr=cmpRange(),EP=cr?emailStats(cr):null;const camp=E.camp;const okp=EP&&EP.camp.length;
  return `<div class="connected">${EX}<span>O Brevo da Spraytec ainda não está conectado. Os envios e números abaixo são de exemplo.</span></div>
  ${kpisC([{l:'Base ativa',v:'12.480',s:'contatos',cur:12480,prev:cr?12110:null,prevTxt:cr?'12.110':null},{l:'Envios no período',v:camp.length,cur:camp.length,prev:EP?EP.camp.length:null,prevTxt:EP?String(EP.camp.length):null},{l:'Abertura média',v:E.ab!=null?pct(E.ab):'—',cur:E.ab,prev:okp?EP.ab:null,prevTxt:okp?pct(EP.ab):null,pp:true},{l:'Cliques',v:E.cl!=null?pct(E.cl):'—',cur:E.cl,prev:okp?EP.cl:null,prevTxt:okp?pct(EP.cl):null,pp:true},{l:'Descadastros',v:E.de!=null?pct(E.de):'—',cur:E.de,prev:okp?EP.de:null,prevTxt:okp?pct(EP.de):null,pp:true,low:true}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Campanha</th><th>Envio</th><th>Entregues</th><th>Abertura</th><th>Cliques</th><th>Descadastros</th></tr></thead><tbody>${camp.map(c=>`<tr><td>${esc(c[0])}</td><td class="mono">${fmt(c[1])}</td><td class="mono">${n(c[2])}</td><td class="mono">${pct(c[3])}</td><td class="mono">${pct(c[4])}</td><td class="mono">${pct(c[5])}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">Nenhum envio nesse período.</td></tr>'}</tbody></table></div>`;
}


let RELATORIOS=[];
const REL_TIPOS=['Executivo semanal','Gerencial semanal','Relatório mensal','Campanha','Diagnóstico','Outro'];
const REL_GRUPO={'Executivo semanal':'Executivo semanal','Gerencial semanal':'Gerencial semanal','Relatório mensal':'Mensais','Campanha':'Campanhas','Diagnóstico':'Diagnósticos','Outro':'Outros'};
function drawerRel(){const id=S.drawer.id;const r=id?RELATORIOS.find(x=>x.id===id):{t:'',capa:'',tipo:'Relatório mensal',per:'',entrega:addDays(TODAY,7),status:'previsto',dest:[],nota:'',link:''};const dest=S.relDest||(r.dest||[]).slice();S.relDest=dest;
  return `<header><div><div class="eyebrow">Acervo · Relatórios</div><h2>${id?'Editar relatório':'Novo relatório'}</h2></div>${closeBtn()}</header>
  <div class="content">
   <label for="rl-t">Título</label><input type="text" id="rl-t" class="pe" value="${esc(r.t)}" placeholder="Ex.: Relatório de dezembro de 2026">
   <div class="ler"><div style="flex:1"><label for="rl-tipo">Tipo</label><select id="rl-tipo" class="pe">${REL_TIPOS.map(t=>`<option ${t===r.tipo?'selected':''}>${t}</option>`).join('')}</select></div><div style="flex:1"><label for="rl-capa">Texto da capa</label><input type="text" id="rl-capa" class="pe" value="${esc(r.capa)}" placeholder="Ex.: Dezembro 2026"></div></div>
   <label for="rl-per">Período ou assunto</label><input type="text" id="rl-per" class="pe" value="${esc(r.per)}" placeholder="Ex.: 01/12 a 31/12 · social, tráfego pago e e-mail">
   <div class="ler"><div style="flex:1"><label for="rl-st">Situação</label><select id="rl-st" class="pe"><option value="previsto" ${r.status==='previsto'?'selected':''}>Previsto</option><option value="entregue" ${r.status==='entregue'?'selected':''}>Entregue</option></select></div><div style="flex:1"><label for="rl-dt">Data de entrega</label><input type="date" id="rl-dt" class="pe" value="${r.entrega}"></div></div>
   <label for="rl-link">Link do PDF no Google Drive</label><input type="text" id="rl-link" class="pe" value="${esc(r.link||'')}" placeholder="https://drive.google.com/...">
   <span class="eyebrow" style="margin-top:4px">Destaques (aparecem no card)</span><div class="le">${dest.map((x,i)=>`<div class="ler"><input type="text" class="pe" id="rl-d${i}" value="${esc(x)}" aria-label="Destaque ${i+1}"><button class="iconbtn" data-act="rl-ddel" data-idx="${i}" aria-label="Remover destaque">×</button></div>`).join('')}<button class="linkbtn" data-act="rl-dadd">+ Adicionar destaque</button></div>
   <label for="rl-nota">Nota curta (aparece enquanto não foi entregue)</label><input type="text" id="rl-nota" class="pe" value="${esc(r.nota||'')}" placeholder="Ex.: Os números do mês são fechados no dia 1º.">
   <div class="actions"><button class="btn primary" data-act="rl-salvar">${id?'Salvar':'Adicionar relatório'}</button>${id?'<button class="btn danger" data-act="rl-excluir">Remover</button>':''}</div></div>`}
function readRelDest(){S.relDest=(S.relDest||[]).map((_,i)=>{const e=document.getElementById('rl-d'+i);return e?e.value:''})}
function lerRel(){readRelDest();const t=$('#rl-t').value.trim();if(!t){toast('Dê um título ao relatório.');$('#rl-t').focus();return null}
  return {t,tipo:$('#rl-tipo').value,capa:$('#rl-capa').value.trim()||t,per:$('#rl-per').value.trim(),status:$('#rl-st').value,entrega:$('#rl-dt').value||TODAY,link:$('#rl-link').value.trim(),dest:S.relDest.map(x=>x.trim()).filter(Boolean),nota:$('#rl-nota').value.trim()}}

// ACERVO: listas limpas por categoria (mesmo padrão dos relatórios)
function acvToolbar(sub,cats,extra){const sel=S.acat[sub]||'todos';const tot=cats.reduce((a,c)=>a+c[2],0);
  return `<div class="toolbar"><div class="filters"><button class="chip" data-acat="${sub}|todos" aria-pressed="${sel==='todos'}">Todos · ${tot}</button>${cats.filter(c=>c[2]).map(([k,l,c])=>`<button class="chip" data-acat="${sub}|${k}" aria-pressed="${sel===k}">${l} · ${c}</button>`).join('')}</div>
   <div class="actions" style="align-items:center"><input type="search" class="pe acq" id="acq-${sub}" data-sub="${sub}" placeholder="Buscar" value="${esc(S.aq[sub]||'')}" aria-label="Buscar" style="width:200px">${extra||''}</div></div>`}
function acvMatch(sub,cat,txt){const sel=S.acat[sub]||'todos';const q=(S.aq[sub]||'').toLowerCase().trim();return (sel==='todos'||sel===cat)&&(!q||txt.toLowerCase().includes(q))}
function rowD(tag,main,sub2,date,actions,more){return `<details class="rrow"><summary>${tag}<span class="rt"><b>${main}</b><span class="muted">${sub2}</span></span><span class="rd mono">${date}</span><span class="ra">${actions}</span></summary>${more?`<div class="rmore rflex">${more}</div>`:''}</details>`}
function groupsHtml(groups){return groups.filter(g=>g.items.length).map(g=>`<section class="rgroup"><h3>${g.t} <span class="muted">${g.items.length}</span></h3><div class="rlist">${g.items.join('')}</div></section>`).join('')||'<p class="muted">Nada encontrado.</p>'}
const ktag=(txt,c)=>`<span class="ktag" style="--kc:var(${c})">${txt}</span>`;
function gridGroups(groups,cls){return groups.filter(g=>g.items.length).map(g=>`<section class="rgroup"><h3>${g.t} <span class="muted">${g.items.length}</span></h3><div class="agrid ${cls||''}">${g.items.join('')}</div></section>`).join('')||'<p class="muted">Nada encontrado.</p>'}
function acard(thumb,tag,title,meta,date,attrs){return `<article class="acard" ${attrs||''}><div class="athumb">${thumb}</div><div class="ainfo"><div class="arow">${tag}<span class="mono muted">${date}</span></div><b>${title}</b><span class="muted">${meta}</span></div></article>`}
function acvMateriais(){
  const cats=PASTAS.map(f=>[f,f,acervo.filter(a=>a.pasta===f).length]);
  const vis=acervo.filter(a=>acvMatch('materiais',a.pasta,a.titulo+' '+a.arquivo+' '+a.safra+' '+a.produto+' '+a.cultura));
  const drive=`<a class="btn" href="https://drive.google.com/" target="_blank" rel="noopener" style="text-decoration:none">Abrir pasta no Drive</a>`;
  return `${acvToolbar('materiais',cats,drive)}${gridGroups(PASTAS.map(f=>({t:f,items:vis.filter(a=>a.pasta===f).map(a=>`<a class="acard" href="https://drive.google.com/" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="athumb"><div class="mthumb" style="background:${a.cor}">${a.tipo==='vídeo'?'<span class="mplay">▶</span>':''}<span>${esc(a.titulo)}</span></div></div><div class="ainfo"><div class="arow">${ktag(a.tipo==='vídeo'?'VÍDEO':'FOTO',a.tipo==='vídeo'?'--k-video':'--k-design')}<span class="mono muted">${a.mod}</span></div><b>${esc(a.arquivo)}</b><span class="muted">${esc(a.safra)}${a.produto!=='—'?' · '+esc(a.produto):''} · ${esc(a.origem)}</span></div></a>`)})))}
   <p class="muted" style="font-size:12px;margin:0">${EX} Os arquivos ficam no Google Drive da Spraytec. Com a integração com o Drive, esta lista é lida das pastas automaticamente; por enquanto, os links do Drive são colados em cada item do calendário.</p>`}
function acvPosts(){
  const RD=[['ig','Instagram'],['fb','Facebook'],['yt','YouTube'],['email','E-mail marketing']];
  const pub=posts.filter(p=>RD.some(r=>r[0]===p.rede)&&p.status==='publicado').sort((a,b)=>b.date.localeCompare(a.date));
  const cats=RD.map(([k,l])=>[k,l,pub.filter(p=>p.rede===k).length]);
  const vis=pub.filter(p=>acvMatch('posts',p.rede,p.titulo+' '+p.pilar+' '+p.produto));
  return `${acvToolbar('posts',cats)}${gridGroups(RD.map(([k,l])=>({t:l,items:vis.filter(p=>p.rede===k).map(p=>{const m=k!=='email'?metricsOf(p):null;
    return acard(preview(p),ktag(FORMATO[p.formato].toUpperCase(),'--k-'+(k==='email'?'email':'post')),esc(p.titulo),m?`alcance ${fk(m.alc)} · ${pct(m.eng)}`:esc(p.pilar),fmt(p.date),`data-open="${p.id}" tabindex="0" role="button"`)})})))}`}
function acvStories(){
  const old=stories.filter(s=>s.date<TODAY);const cats=[['repost','Reposts',old.filter(s=>s.tipo==='repost').length],['agendado','Agendados',old.filter(s=>s.tipo!=='repost').length]];
  const vis=old.filter(s=>acvMatch('stories',s.tipo==='repost'?'repost':'agendado',s.titulo+' '+s.pilar));const dates=[...new Set(vis.map(s=>s.date))];
  return `${acvToolbar('stories',cats)}${gridGroups(dates.map(d=>({t:fmtLong(d),items:vis.filter(s=>s.date===d).map(s=>acard(storyPreview(s),ktag(s.tipo==='repost'?'REPOST':'AGENDADO',s.tipo==='repost'?'--k-post':'--k-email'),esc(s.titulo),'alcance '+n(s.alcance)+' · '+s.respostas+' resp.',s.hora))})),'stories')}
   <p class="muted" style="font-size:12px;margin:0">${EX} Com a integração com a Meta, os stories são guardados aqui enquanto estão no ar, e as miniaturas vão para a pasta Stories do Drive.</p>`}
function acvDark(){
  const cats=[['Ativo','Ativos',darkposts.filter(d=>d.status==='Ativo').length],['Encerrado','Encerrados',darkposts.filter(d=>d.status!=='Ativo').length]];
  const vis=darkposts.filter(d=>acvMatch('dark',d.status,d.titulo+' '+d.campanha));const camps=[...new Set(vis.map(d=>d.campanha))];
  return `${acvToolbar('dark',cats)}${gridGroups(camps.map(c=>({t:c,items:vis.filter(d=>d.campanha===c).map(d=>acard(adPreview(d),ktag(d.status.toUpperCase(),d.status==='Ativo'?'--ok':'--muted'),esc(d.titulo),d.impr+' impressões · '+d.cliques+' cliques',d.periodo))})))}
   <p class="muted" style="font-size:12px;margin:0">${EX} Anúncios que rodam só como mídia paga. Com a integração, vêm do Gerenciador de Anúncios da Meta.</p>`}

// PRODUÇÃO DE VÍDEO (kanban para Cancha e Spraytec, dentro do Calendário)
const VCOLS=[['pauta','Pauta','Cancha'],['viabilidade','Viabilidade','Produtora'],['roteiro','Roteiro','Spraytec aprova'],['gravacao','Gravação e edição','Produtora'],['entregue','Entregue','Cancha publica']];
function vidStatusTxt(v){if(v.stage==='pauta')return v.viavel===false?'Voltou da produtora: inviável':'Cancha escrevendo a pauta';if(v.stage==='viabilidade')return 'Aguardando a produtora';if(v.stage==='roteiro')return 'Aguardando aprovação da Spraytec';if(v.stage==='gravacao')return v.gravacao&&v.gravacao!=='—'?'Gravação em '+v.gravacao:'Produtora agendando';const p=v.postId&&posts.find(x=>x.id===v.postId);return p?(p.faltaTexto?'Cancha escrevendo os textos':STATUS[p.status].l):'Pronto para publicar'}
function viewVideoKanban(){
  return `<div class="toolbar"><p class="sub" style="margin:0">Cada vídeo do pedido da pauta até a publicação, e com quem ele está agora. ${isTeam()?'Arraste para mudar a etapa.':''}</p>${isTeam()?'<button class="btn primary" data-act="vk-novo">+ Pauta</button>':''}</div>
  <div class="kanban vk">${VCOLS.map(([k,l,quem])=>{const it=videos.filter(v=>v.stage===k);return `<div class="col" data-vcol="${k}"><h3>${l}<span class="mono muted">${it.length}</span></h3><span class="vkq">com ${quem}</span>${it.map(v=>`<div class="card" data-video="${v.id}" ${isTeam()?`draggable="true" data-vdrag="${v.id}"`:''}><span class="t">${esc(v.titulo)}</span><div class="meta">${v.viavel===false?tagPill('Inviável','--bad'):''}<span>${esc(vidStatusTxt(v))}</span></div>${v.prazo&&k==='roteiro'?`<div class="meta"><span class="mono">aprovar até ${fmt(v.prazo)}</span></div>`:''}</div>`).join('')}</div>`}).join('')}</div>`}

// STATUS EDITÁVEL E KANBAN DE STATUS (visão de processo da Cancha)
const SKCOLS=['pauta','producao','aprovacao','validacao','ajuste','aprovado','agendado','publicado','espera'];
function statusEditor(p){if(p.formato==='plano')return '';const ok=['aprovado','agendado'].includes(p.status);
  return `<div class="stedit"><div class="ler" style="align-items:flex-end"><div style="flex:1"><label for="st-sel" class="muted" style="font-size:12px">Status</label><select id="st-sel" class="pe">${SKCOLS.map(k=>`<option value="${k}" ${p.status===k?'selected':''}>${STATUS[k].l}</option>`).join('')}</select></div><button class="btn" data-act="st-save" data-id="${p.id}">Salvar</button></div>
   ${ok?`<div class="ler"><input id="pub-link" class="pe" placeholder="Link do post publicado (opcional)" aria-label="Link do post publicado"><button class="btn primary" data-act="st-pub" data-id="${p.id}">Marcar como publicado</button></div>`:''}
   <span class="muted" style="font-size:12px">Toda mudança fica no histórico. Quando o Buffer for integrado, ele atualiza o status sozinho.</span></div>`}
function viewStatusKanban(){
  const vp=posts.filter(p=>tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]&&((p.date&&p.date.startsWith(S.month))||!p.date));
  return `<div class="toolbar">${monthNav('month')}<div class="filters" role="group" aria-label="Tipos">${TIPOS.filter(t=>t[0]!=='demanda').map(([k,l])=>`<button class="chip kchip" style="--kc:var(--k-${k})" data-tipo="${k}" aria-pressed="${S.tipos[k]}"><i></i>${l}</button>`).join('')}</div></div>
  <p class="muted" style="font-size:13px;margin:0">Arraste para mudar o status. Para "Aprovado", o portal pede o registro da aprovação do Matheus.</p>
  <div class="kanban sk">${SKCOLS.map(c=>{const it=vp.filter(p=>p.status===c);return `<div class="col" data-scol="${c}"><h3>${STATUS[c].l}<span class="mono muted">${it.length}</span></h3>${it.map(p=>{const k=tipoCal(p);return `<div class="card" data-open="${p.id}" draggable="true" data-sdrag="${p.id}" style="border-left:3px solid var(--k-${k})"><div class="meta"><span class="kt" style="--kc:var(--k-${k})">${{post:NET[p.rede],email:'E-MAIL',design:'DESIGN',video:'VÍDEO'}[k]}</span><span class="mono">${fmt(p.date)}</span>${c==='publicado'?`<span class="tag">${p.anterior?'agência anterior':'manual'}</span>`:''}</div><span class="t">${esc(p.titulo)}</span>${p.faltaTexto?'<span class="flag">Faltam textos</span>':''}</div>`}).join('')}</div>`}).join('')}</div>`}

// Kanban simplificado do Matheus: 5 colunas, sem arrastar; aprova direto na coluna "Com você".
const CKCOLS=[['plan','Planejado',['pauta']],['prod','Em produção',['producao','ajuste']],['voce','Com você',['aprovacao','validacao']],['pronto','Pronto',['aprovado','agendado']],['pub','Publicado',['publicado']]];
function viewClientKanban(){
  const vp=posts.filter(p=>p.formato!=='plano'&&tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]&&p.date&&p.date.startsWith(S.month));
  const tag={post:p=>NET[p.rede],email:()=>'E-MAIL',design:()=>'DESIGN',video:()=>'VÍDEO'};
  return `<div class="toolbar">${monthNav('month')}<div class="filters" role="group" aria-label="Tipos">${TIPOS.filter(t=>t[0]!=='demanda').map(([k,l])=>`<button class="chip kchip" style="--kc:var(--k-${k})" data-tipo="${k}" aria-pressed="${S.tipos[k]}"><i></i>${l}</button>`).join('')}</div></div>
  <div class="kanban ck">${CKCOLS.map(([c,l,sts])=>{const it=vp.filter(p=>sts.includes(p.status)).sort((a,b)=>a.date.localeCompare(b.date));
    return `<div class="col ${c==='voce'?'voce':''}"><h3>${l}<span class="mono muted">${it.length}</span></h3>${it.map(p=>{const k=tipoCal(p);const draft=hiddenForClient(p);
      return `<div class="card ${draft?'draft':''}" ${draft?'':`data-open="${p.id}"`} style="border-left:3px solid var(--k-${k})"><div class="meta"><span class="kt" style="--kc:var(--k-${k})">${tag[k](p)}</span><span class="mono">${fmt(p.date)}</span>${p.status==='validacao'?'<span class="tag">validação interna</span>':p.status==='ajuste'?'<span class="tag">ajustando</span>':p.status==='agendado'?'<span class="tag">agendado</span>':''}</div><span class="t">${esc(p.titulo)}</span>
      ${draft?'<span class="muted" style="font-size:12px">A Cancha está produzindo</span>':''}${c==='voce'&&p.status==='aprovacao'?`<button class="btn primary sm" data-act="approve" data-id="${p.id}">Aprovar</button>`:''}${c==='pub'&&p.pubLink?`<a class="linkbtn" href="${esc(p.pubLink)}" target="_blank" rel="noopener">Ver post</a>`:''}</div>`}).join('')||'<p class="muted" style="font-size:13px;margin:4px 0">Nada aqui.</p>'}</div>`}).join('')}</div>`}
// ACERVO
function viewAcervo(){
  const tabs=S.role==='produtora'?[['materiais','Materiais (Drive)']]:isDir()?[['relatorios','Relatórios'],['aprendizados','Aprendizados']]:[['materiais','Materiais (Drive)'],['posts','Posts'],['stories','Stories'],['dark','Dark posts'],['relatorios','Relatórios'],['aprendizados','Aprendizados'],['guia','Guia de marca']];
  if(S.role==='produtora')S.asub='materiais';if(isDir()&&!['relatorios','aprendizados'].includes(S.asub))S.asub='relatorios';
  let body='';
  if(S.asub==='materiais'){body=acvMateriais()}
  else if(S.asub==='posts'){body=acvPosts()}
  else if(S.asub==='aprendizados'){body=acvAprendizados()}
  else if(S.asub==='guia'){body=acvGuia()}
  else if(S.asub==='stories'){body=acvStories()
  }else if(S.asub==='relatorios'){
    const q=(S.relQ||'').toLowerCase().trim();const grupos=REL_TIPOS.filter(t=>RELATORIOS.some(r=>r.tipo===t));
    const vis=RELATORIOS.filter(r=>(isTeam()||r.status!=='rascunho')&&(S.relCat==='todos'||!S.relCat||r.tipo===S.relCat)&&(!q||(r.t+' '+r.per).toLowerCase().includes(q)));
    const row=r=>{if(r.status==='rascunho')return relRowRasc(r);const ok=r.status==='entregue';return `<details class="rrow"><summary>${ktag(ok?'ENTREGUE':'PREVISTO',ok?'--ok':'--muted')}<span class="rt"><b>${esc(r.t)}</b><span class="muted">${esc(r.per)}</span></span><span class="rd mono">${ok?fmt(r.entrega):'até '+fmt(r.entrega)}</span>
      <span class="ra">${relAuto(r)&&ok?`<button class="linkbtn" data-act="rel-ver" data-id="${r.id}">Ver</button>`:''}${ok?`<a class="linkbtn" href="${esc(r.link||'https://drive.google.com/')}" target="_blank" rel="noopener">PDF</a>`:isTeam()?`<button class="linkbtn" data-act="rl-entregue" data-id="${r.id}">Entregar</button>`:'<span class="muted" style="font-size:12px">previsto</span>'}${isTeam()?`<button class="linkbtn" data-act="rl-edit" data-id="${r.id}">Editar</button>`:''}</span></summary>
      ${r.dest&&r.dest.length||r.nota?`<div class="rmore">${r.dest&&r.dest.length?`<ul>${r.dest.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${!ok&&r.nota?`<span class="muted">${esc(r.nota)}</span>`:''}</div>`:''}</details>`};
    body=`<div class="toolbar"><div class="filters"><button class="chip" data-relcat="todos" aria-pressed="${!S.relCat||S.relCat==='todos'}">Todos · ${RELATORIOS.filter(r=>isTeam()||r.status!=='rascunho').length}</button>${grupos.map(t=>`<button class="chip" data-relcat="${t}" aria-pressed="${S.relCat===t}">${REL_GRUPO[t]} · ${RELATORIOS.filter(r=>r.tipo===t&&(isTeam()||r.status!=='rascunho')).length}</button>`).join('')}</div>
      <div class="actions" style="align-items:center"><input type="search" id="rel-q" class="pe" placeholder="Buscar relatório" value="${esc(S.relQ||'')}" aria-label="Buscar relatório" style="width:200px">${isTeam()?'<button class="btn primary" data-act="rl-novo">+ Novo</button>':''}</div></div>
     ${grupos.filter(t=>vis.some(r=>r.tipo===t)).map(t=>{const it=vis.filter(r=>r.tipo===t).sort((a,b)=>b.entrega.localeCompare(a.entrega));return `<section class="rgroup"><h3>${REL_GRUPO[t]} <span class="muted">${it.length}</span></h3><div class="rlist">${it.map(row).join('')}</div></section>`}).join('')||'<p class="muted">Nenhum relatório encontrado.</p>'}
     <p class="muted" style="font-size:12px;margin:0">Os relatórios executivo e gerencial saem toda segunda; a Cancha revisa e valida antes de a Spraytec ver. Os PDFs ficam na pasta Relatórios do Drive.</p>`;
  }else{body=acvDark()
  }
  return `${head('Acervo',S.role==='produtora'?'Entreguem os vídeos finais na pasta "Vídeos da produtora".':'Materiais no Google Drive e o histórico do que já foi ao ar. Nada fica guardado no portal.')}${subtabs(tabs,'asub','Acervo')}${body}`;
}

// DEMANDAS
function viewDemandas(){
  const vis=demandas.filter(d=>S.quem==='todas'||d.quem===S.quem);
  const late=vis.filter(d=>!d.feito&&d.data<TODAY).sort((a,b)=>a.data.localeCompare(b.data));
  const next=vis.filter(d=>!d.feito&&d.data>=TODAY&&d.data<=addDays(TODAY,7)).sort((a,b)=>a.data.localeCompare(b.data));
  const chip=d=>demChip(d,true);
  const row=d=>`<div class="row clickable" data-dem="${d.id}"><span class="mono muted" style="font-size:12px;min-width:44px">${fmt(d.data)}</span><div class="grow"><span class="who" style="font-family:var(--f-display);font-weight:700;font-size:10px;color:var(--k-${d.quem})">${QUEM[d.quem].toUpperCase()}</span> ${esc(d.t)}</div></div>`;
  return `${head('Demandas','O que a Cancha precisa entregar e o que a Spraytec precisa enviar ou aprovar, com data. Arraste para mudar a data.')}
  <div class="toolbar">${monthNav('dmonth')}
   <div class="filters">${[['todas','Todas'],['cancha','Cancha'],['spraytec','Spraytec · Matheus']].map(([k,l])=>`<button class="chip ${k!=='todas'?'kchip':''}" style="--kc:var(--k-${k})" data-quem="${k}" aria-pressed="${S.quem===k}">${k!=='todas'?'<i></i>':''}${l}</button>`).join('')}</div>
   <button class="btn primary" data-act="nova-dem">Nova demanda</button></div>
  <div class="dwrap">${calGrid(S.dmonth,d=>vis.filter(x=>x.data===d).map(chip).join(''),false,'nova-dem')}
   <aside class="dside">
    <section class="panel"><h2>Atrasadas · ${late.length}</h2><div class="list">${late.map(row).join('')||'<p class="muted" style="margin:0">Nada atrasado.</p>'}</div></section>
    <section class="panel"><h2>Próximos 7 dias</h2><div class="list">${next.map(row).join('')||'<p class="muted" style="margin:0">Nada nos próximos dias.</p>'}</div></section>
   </aside></div>`;
}

// VÍDEOS (produtora)
function viewVideos(){
  return `${head('Vídeos','Aqui aparecem só as pautas atribuídas a vocês. Diga se a pauta é viável e entregue o vídeo final na pasta do Drive.')}
  <div class="kanban">${STAGES.map(([k,l])=>{const it=videos.filter(v=>v.stage===k);return `<div class="col"><h3>${l}<span class="mono muted">${it.length}</span></h3>${it.map(v=>`<div class="card" data-video="${v.id}"><span class="t">${esc(v.titulo)}</span><div class="meta">${v.viavel===false?tagPill('Inviável','--bad'):v.viavel?tagPill('Viável','--ok'):tagPill('Aguardando vocês','--warn')}${v.gravacao!=='—'?'<span>gravação '+v.gravacao+'</span>':''}</div></div>`).join('')}</div>`}).join('')}</div>
  <div class="notice lock">Como produtora, vocês não veem posts, resultados nem comentários internos da Cancha.</div>`;
}

// GAVETAS
function closeBtn(){return '<button class="iconbtn" data-act="close" aria-label="Fechar">Fechar</button>'}
function drawerPost(p){
  const team=isTeam(),hid=hiddenForClient(p);
  const coms=p.comments.filter(c=>team||!c.interno);
  const peso=PESO[p.formato];
  let acts='';
  if(p.faltaTexto){acts=`<div class="notice">Vídeo entregue pela produtora. Faltam título, descrição e legenda.</div>${team?`<label for="tx-leg">Descrição e legenda</label><textarea id="tx-leg" placeholder="Texto que vai com o vídeo"></textarea><div class="actions"><button class="btn primary" data-act="textos" data-id="${p.id}">Adicionar textos e enviar para validação interna</button></div>`:''}`}
  else{
    if(isM()&&p.formato!=='plano'&&(p.status==='aprovacao'||p.status==='validacao'))acts=`<div class="actions"><button class="btn primary" data-act="approve" data-id="${p.id}">Aprovar</button>${p.status==='aprovacao'?`<button class="btn" data-act="validacao" data-id="${p.id}">Levar para validação interna</button>`:''}</div>
      <label for="adj">Pedir ajuste (comentário obrigatório)</label><textarea id="adj" placeholder="O que precisa mudar?"></textarea><div class="actions"><button class="btn danger" data-act="adjust" data-id="${p.id}">Pedir ajuste</button></div>`;
    if(team){const b=[];
      if(p.status==='pauta')b.push(`<button class="btn dark" data-act="to-prod" data-id="${p.id}">Mover para produção</button>`);
      if(p.status==='producao')b.push(`<button class="btn primary" data-act="send" data-id="${p.id}">${['video','design'].includes(p.rede)?'Marcar como concluído':'Enviar para aprovação'}</button>`);
      if(p.status==='ajuste')b.push(`<button class="btn primary" data-act="newver" data-id="${p.id}">Subir nova versão e reenviar</button>`);
      const ext=(p.status==='aprovacao'||p.status==='validacao')?`<details class="padj" ${S.needExt===p.id?'open':''}><summary class="btn ${S.needExt===p.id?'primary':''}">Registrar aprovação por WhatsApp/e-mail</summary><div class="extbox"><label class="muted" for="ext-canal">Por onde o Matheus aprovou</label><select id="ext-canal" class="pe"><option>WhatsApp</option><option>E-mail</option><option>Reunião</option></select><label class="muted" for="ext-link">Link do print ou do e-mail no Drive (recomendado)</label><input id="ext-link" class="pe" placeholder="https://drive.google.com/..."><button class="btn primary sm" data-act="external" data-id="${p.id}">Registrar aprovação</button><span class="muted" style="font-size:12px">Fica no histórico com o seu nome e o comprovante.</span></div></details>`:'';
      const edita=['pauta','producao','ajuste','espera'].includes(p.status)&&p.formato!=='plano'?`<details class="padj"><summary class="btn">Editar conteúdo</summary><div class="extbox"><label class="muted" for="pe-titulo">Título</label><input id="pe-titulo" class="pe" value="${esc(p.titulo)}"><label class="muted" for="pe-leg">${{email:'Assunto e texto',design:'Descrição',video:'Descrição'}[p.rede]||'Legenda'}</label><textarea id="pe-leg" class="pe" rows="5">${esc(p.legenda)}</textarea>${['video','design'].includes(p.rede)?'':`<label class="muted" for="pe-hora">Horário</label><input id="pe-hora" type="time" class="pe" value="${p.time||''}">`}<label class="muted" for="pe-drive">Link do material no Google Drive</label><input id="pe-drive" class="pe" value="${esc(p.drive||'')}" placeholder="https://drive.google.com/..."><button class="btn primary sm" data-act="post-editar" data-id="${p.id}">Salvar conteúdo</button></div></details>`:'';
      acts=`<div class="actions">${b.join('')}</div>${ext}${edita}${statusEditor(p)}`;}
  }
  const textoLabel={email:'Assunto e texto',ads:'Resumo',design:'Descrição',video:'Descrição'}[p.rede]||'Legenda';
  return `<header><div><div class="eyebrow">${NETNAME[p.rede]} · ${FORMATO[p.formato]}</div><h2>${hid?'Em preparação pela Cancha':esc(p.titulo)}</h2></div>${closeBtn()}</header>
  <div class="content">
   ${p.formato==='plano'?planoSection().replace('<section class="panel">','<div>').replace(/<\/section>$/,'</div>'):`<div class="pv-lg">${preview(p)}</div><p class="muted" style="font-size:12px;margin:-8px 0 0;text-align:center">Prévia aproximada. ${p.drive?`<a href="${esc(p.drive)}" target="_blank" rel="noopener">Abrir a arte no Google Drive</a>`:'A arte fica na pasta do Google Drive.'}</p>`}
   <dl class="kv" style="margin:0"><dt>Status</dt><dd>${pill(p.status)}</dd><dt>Data</dt><dd class="mono">${p.date?fmtLong(p.date)+(p.time?' '+p.time:''):'sem data'}</dd><dt>Pilar</dt><dd>${p.pilar}</dd><dt>Produto</dt><dd>${p.produto}</dd>${peso?`<dt>Cota de design</dt><dd>${peso} peça${peso>1?'s':''} · rodada ${p.rodada} de 2</dd>`:''}</dl>
   ${p.formato==='plano'?'':hid?'<div class="notice lock">O texto e a arte aparecem quando o item for enviado para aprovação.</div>':`<div><div class="eyebrow" style="margin-bottom:6px">${textoLabel}</div><div class="caption">${p.faltaTexto?'Ainda sem textos.':esc(p.legenda)}</div></div>`}
   ${acts}
   ${linksSection('p:'+p.id)}
   <div><div class="eyebrow" style="margin-bottom:6px">Comentários</div><div style="display:flex;flex-direction:column;gap:6px">${coms.map(c=>`<div class="comment ${c.interno?'internal':''}"><div class="who"><b>${esc(c.who)}</b>${c.quando}${c.interno?'<span class="tag">interno</span>':''}</div>${esc(c.text)}</div>`).join('')||'<p class="muted" style="margin:0">Sem comentários.</p>'}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px"><textarea id="newc" placeholder="Escrever comentário"></textarea>${team?'<label class="check"><input type="checkbox" id="newci" checked> Interno (o cliente não vê)</label>':''}<div class="actions"><button class="btn" data-act="comment" data-id="${p.id}">Comentar</button></div></div></div>
   <div><div class="eyebrow" style="margin-bottom:6px">Histórico</div><div class="hist">${histHtml(p.hist)}</div></div>
  </div>`;
}
function histHtml(h){return (h||[]).map(x=>`<div><span class="mono">${esc(x.q)}</span> · ${esc(x.t)}${x.por&&!String(x.t).includes(x.por)?` <span class="muted">(${esc(x.por)})</span>`:''}</div>`).join('')||'<span class="muted">Sem registros.</span>'}
function drawerVideo(v){
  const isP=S.role==='produtora',team=isTeam();let acts='';
  if(isP&&v.stage==='viabilidade')acts=`<label for="par">Parecer</label><textarea id="par" placeholder="Locação, equipamento, autorização..."></textarea><div class="actions"><button class="btn primary" data-act="viavel" data-id="${v.id}">Viável</button><button class="btn danger" data-act="inviavel" data-id="${v.id}">Inviável</button></div>`;
  if(v.stage==='gravacao'&&(isP||team))acts=`<div class="actions"><button class="btn primary" data-act="entrega" data-id="${v.id}">${isP?'Vídeo final entregue na pasta do Drive':'Registrar vídeo entregue'}</button></div>`;
  if(isM()&&v.stage==='roteiro')acts=`<div class="actions"><button class="btn primary" data-act="v-next" data-id="${v.id}">Aprovar roteiro</button></div>`;
  const st=STAGES.find(s=>s[0]===v.stage);
  return `<header><div><div class="eyebrow">Vídeo · ${st?st[1]:'Entregue'} · ${esc(vidStatusTxt(v))}</div>${team?`<input class="pe" id="vt-${v.id}" value="${esc(v.titulo)}" aria-label="Nome do vídeo" style="font-family:var(--f-display);font-weight:700;font-size:18px">`:`<h2>${esc(v.titulo)}</h2>`}</div>${closeBtn()}</header>
  <div class="content"><div class="actions">${STAGES.map(([k,l])=>`<span class="tag" style="${k===v.stage?'background:var(--ink);color:var(--surface)':''}">${l}</span>`).join('')}</div>
   <dl class="kv" style="margin:0"><dt>Viabilidade</dt><dd>${v.viavel===null?'aguardando produtora':v.viavel?'viável':'inviável'}</dd><dt>Gravação</dt><dd class="mono">${esc(v.gravacao)}</dd><dt>Parecer</dt><dd>${esc(v.parecer)||'—'}</dd></dl>
   <div><div class="eyebrow" style="margin-bottom:6px">Roteiro</div>${team&&['pauta','viabilidade','roteiro'].includes(v.stage)?`<textarea id="vr-${v.id}" class="pe" rows="5" placeholder="O roteiro é escrito depois da viabilidade.">${esc(v.roteiro)}</textarea>`:`<div class="caption">${esc(v.roteiro)||'O roteiro é escrito depois da viabilidade.'}</div>`}</div>
   ${team?`<div class="actions"><button class="btn" data-act="video-salvar" data-id="${v.id}">Salvar nome e roteiro</button></div>`:''}${acts}${linksSection('v:'+v.id)}
   ${(v.hist||[]).length?`<div><div class="eyebrow" style="margin-bottom:6px">Histórico</div><div class="hist">${histHtml(v.hist)}</div></div>`:''}</div>`;
}
function drawerMarcos(){
  return `<header><div><div class="eyebrow">Calendário</div><h2>Safra, foco comercial e eventos</h2></div>${closeBtn()}</header>
  <div class="content"><p class="muted" style="margin:0">Essas faixas aparecem no topo dos dias do calendário. Ajuste o nome e as datas de cada fase.</p>
  ${(S.marcosEd||MARCOS).map(m=>`<div class="panel" style="display:grid;gap:8px">
    <div style="display:grid;grid-template-columns:1fr 150px;gap:8px"><div><label for="mn-${m.id}" class="muted" style="font-size:12px">Nome</label><input type="text" id="mn-${m.id}" value="${esc(m.nome)}"></div><div><label for="mt-${m.id}" class="muted" style="font-size:12px">Tipo</label><select id="mt-${m.id}">${Object.entries(MK_TIPO).map(([k,l])=>`<option value="${k}" ${m.tipo===k?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end"><div><label for="mi-${m.id}" class="muted" style="font-size:12px">Início</label><input type="date" id="mi-${m.id}" value="${m.ini}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px;width:100%"></div><div><label for="mf-${m.id}" class="muted" style="font-size:12px">Fim</label><input type="date" id="mf-${m.id}" value="${m.fim}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px;width:100%"></div><button class="btn danger" data-act="marco-del" data-id="${m.id}">Remover</button></div></div>`).join('')}
  <div class="actions"><button class="btn" data-act="marco-add">Adicionar fase</button><button class="btn primary" data-act="marcos-salvar">Salvar</button></div></div>`;
}
function drawerDemanda(d){
  if(!d)return `<header><div><div class="eyebrow">Demandas</div><h2>Nova demanda</h2></div>${closeBtn()}</header>
  <div class="content"><label for="dt">O que precisa ser feito?</label><input type="text" id="dt" placeholder="Ex.: Enviar fotos da feira regional">
   <label for="dq">Com quem está</label><select id="dq"><option value="spraytec" ${isM()?'':'selected'}>Spraytec · Matheus</option><option value="cancha" ${isM()?'selected':''}>Cancha</option></select>
   <label for="dd">Data</label><input type="date" id="dd" value="${S.novaDemData||addDays(TODAY,3)}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px">
   <label for="dx">Detalhes</label><textarea id="dx" placeholder="Opcional"></textarea>
   <div class="actions"><button class="btn primary" data-act="dem-salvar">Criar demanda</button></div></div>`;
  return `<header><div><div class="eyebrow" style="color:var(--k-${d.quem})">${d.quem==='cancha'?'Com a Cancha':'Com a Spraytec'}</div><h2>${esc(d.t)}</h2></div>${closeBtn()}</header>
  <div class="content"><dl class="kv" style="margin:0"><dt>Data</dt><dd class="mono">${fmtLong(d.data)}</dd><dt>Situação</dt><dd>${d.feito?tagPill('Concluída','--ok'):d.data<TODAY?tagPill('Atrasada','--bad'):tagPill('Em aberto','--muted')}</dd></dl>
   ${d.det?`<div class="caption">${esc(d.det)}</div>`:''}
   <label for="dnd">Mudar a data</label><input type="date" id="dnd" value="${d.data}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px">
   <div class="actions"><button class="btn" data-act="dem-data" data-id="${d.id}">Salvar data</button><button class="btn primary" data-act="dem-feito" data-id="${d.id}">${d.feito?'Reabrir':'Marcar como concluída'}</button></div>${linksSection('d:'+d.id)}${(t=>t?`<button class="lnk" data-thread-go="${t.id}"># ${esc(t.tema)} · ver conversa</button>`:S.role==='produtora'?'':`<button class="btn" data-act="conversa-dem" data-id="${d.id}">Abrir conversa sobre esta demanda</button>`)(threads.find(t=>t.ref==='d:'+d.id))}</div>`;
}
function openDrawer(kind,id){S.drawer={kind,id};renderDrawer()}
function closeDrawer(){S.drawer=null;renderDrawer()}
function renderDrawer(){
  const L=$('#layer');if(!S.drawer){L.innerHTML='';return}
  const k=S.drawer.kind;let html='';
  if(k==='post'){const p=posts.find(x=>x.id===S.drawer.id);if(!p){L.innerHTML='';return}html=drawerPost(p)}
  else if(k==='video')html=drawerVideo(videos.find(x=>x.id===S.drawer.id));
  else if(k==='marcos')html=drawerMarcos();
  else if(k==='mud')html=drawerMudancas();
  else if(k==='novo')html=drawerNovo();
  else if(k==='rel')html=drawerRel();
  else if(k==='relview')html=drawerRelView();
  else if(k==='mes')html=drawerMes();
  else if(k==='conc')html=drawerConc();
  else if(k==='cacoes')html=drawerAcoes();
  else if(k==='apr')html=drawerApr();
  else if(k==='guia')html=drawerGuia();
  else if(k==='rapida')html=drawerRapida();
  else html=drawerDemanda(demandas.find(x=>x.id===S.drawer.id));
  L.innerHTML=`<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
}

function setTopH(){const t=document.querySelector('.top');if(t)document.documentElement.style.setProperty('--toph',t.offsetHeight+'px')}
window.addEventListener('resize',setTopH);
function render(){
  if(!EU)return;
  renderRoles();
  const allowed=VIEWS.find(v=>v[0]===S.view);if(!allowed||!allowed[2]||!allowed[2].includes(S.role))S.view=S.role==='produtora'?'videos':'hoje';
  renderNav();
  const V={hoje:viewHoje,plano:viewPlano,aprovacao:viewAprovacao,calendario:viewCalendario,redes:viewRedes,performance:viewPerformance,acervo:viewAcervo,demandas:viewDemandas,videos:viewVideos,atividade:viewAtividade}[S.view];
  $('#main').innerHTML=`<div class="wrap">${V()}</div>`;
  const ms=$('#msgs');if(ms)ms.scrollTop=ms.scrollHeight;
  renderDrawer();
  setTopH();
}
function readMarcos(){(S.marcosEd||[]).forEach(m=>{const g=k=>document.getElementById(k+'-'+m.id);if(!g('mn'))return;m.nome=g('mn').value.trim()||m.nome;m.tipo=g('mt').value;m.ini=g('mi').value||m.ini;m.fim=g('mf').value||m.fim;if(m.fim<m.ini)m.fim=m.ini})}
function irChat(foco){setTimeout(()=>{const c=document.querySelector('.chat');if(c&&c.scrollIntoView)c.scrollIntoView({block:'start',behavior:'smooth'});if(foco){const x=$('#cm');if(x)x.focus()}},0)}

// ===================== SERVIDOR =====================
// A tela só mostra; toda alteração vai para o servidor, que confere o papel, grava e devolve o estado novo.
let EU=null,DEMO=false,ULTIMA_VISITA=null,VERSAO=0,ocupado=false,ATIVIDADE=null;
function fmtVisita(iso){const p=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(iso));const g=t=>(p.find(x=>x.type===t)||{}).value||'';return `${g('weekday').replace('.','')}, ${g('day')}/${g('month')} às ${g('hour')}:${g('minute')}`}
function aplicar(j){
  const primeira=!EU,novoDia=TODAY!==j.hoje;
  EU=j.eu;DEMO=!!j.demo;VERSAO=j.versao;TODAY=j.hoje;if(j.ultimaVisita!==undefined)ULTIMA_VISITA=j.ultimaVisita;
  const d=j.dados||{};
  posts=d.posts||[];videos=d.videos||[];demandas=d.demandas||[];threads=d.threads||[];MARCOS=d.marcos||[];ANO=d.ano||[];CONC=d.conc||[];
  APRENDIZADOS=d.aprendizados||[];RELATORIOS=d.relatorios||[];plano=d.plano||null;GUIA=d.guia||GUIA;LANES=d.lanes||[];CONC_ACOES=d.concAcoes||[];LINKS=d.links||[];
  planoItem=posts.find(p=>p.formato==='plano')||null;
  S.role=EU.papel;
  if(primeira||novoDia){carregarFonteExemplo();if(!S.month){S.month=(Number(TODAY.slice(8))>=15?addDays(TODAY.slice(0,8)+'01',40):TODAY).slice(0,7);S.dmonth=TODAY.slice(0,7)}setPreset(S.per.preset&&S.per.preset!=='custom'?S.per.preset:'30')}
}
async function api(url,corpo){
  const r=await fetch(url,corpo===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(corpo)});
  let j={};try{j=await r.json()}catch(_){}
  if(r.status===401&&!url.startsWith('/api/entrar')){telaEntrar(EU?'Sua sessão terminou. Entre de novo.':undefined);const e=new Error('sem sessão');e.silencioso=true;throw e}
  if(!r.ok){const e=new Error(j.erro||'Não foi possível completar. Tente de novo.');e.codigo=j.codigo;throw e}
  return j}
async function acao(nome,dados,depois){
  if(ocupado)return null;ocupado=true;document.body.classList.add('salvando');
  try{const j=await api('/api/acao',Object.assign({acao:nome},dados||{}));aplicar(j);render();if(depois)depois(j);return j}
  catch(e){if(!e.silencioso){if(e.codigo==='precisa-registro'&&dados&&dados.id){S.needExt=dados.id;openDrawer('post',dados.id)}toast(e.message)}return null}
  finally{ocupado=false;document.body.classList.remove('salvando')}}
function acaoSilenciosa(nome,dados){api('/api/acao',Object.assign({acao:nome},dados||{})).then(j=>{VERSAO=j.versao}).catch(()=>{})}
async function iniciar(){
  try{const j=await api('/api/estado');document.body.classList.remove('entrando');EU=null;S.view=j.eu.papel==='produtora'?'videos':'hoje';S.drawer=null;S.sel={};S.pdraft=null;S.pop=null;S.thread=null;ATIVIDADE=null;aplicar(j);render();window.scrollTo(0,0)}catch(_){}}
// Atualiza sozinho quando outra pessoa muda algo (ex.: o Matheus aprova pelo celular), sem atrapalhar quem está editando.
setInterval(async()=>{
  if(!EU||document.hidden||ocupado)return;
  try{const j=await api('/api/versao');if(j.versao===VERSAO)return;
    const ae=document.activeElement;if(S.drawer||S.pdraft||S.pop||(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))return;
    const e=await api('/api/estado');if(S.view==='atividade')ATIVIDADE=null;aplicar(e);render()}catch(_){}},15000);

// ---------- entrada ----------
const DESC_PAPEL={matheus:'Aprova calendário, peças, roteiros e o plano de mídia.',diretoria:'Acompanha estratégia, resultados e relatórios.',cancha:'Produz, envia para aprovação e publica.',produtora:'Vê só as pautas de vídeo: viabilidade e entrega.'};
async function telaEntrar(msg){
  EU=null;S.drawer=null;$('#nav').innerHTML='';$('#roles').innerHTML='';$('#layer').innerHTML='';document.body.classList.add('entrando');
  let o={};try{o=await (await fetch('/api/entrar/opcoes',{credentials:'same-origin'})).json()}catch(_){}
  const dm=$('#demo');dm.hidden=!o.demo;if(o.demo)dm.innerHTML='<b>Demonstração</b><span>Ambiente com dados fictícios.</span>';
  let h=`<div class="entrar"><div><h1>Entrar no portal</h1><p class="sub">Portal de marketing da Spraytec Brasil, feito pela Cancha.</p></div>`;
  if(msg)h+=`<div class="notice">${esc(msg)}</div>`;
  if(o.demo&&!o.demoLiberado)h+=`<section class="panel"><h2>Demonstração</h2><p class="muted" style="margin-top:0">Digite o código de acesso da demonstração.</p><form class="ler" data-form="demo-codigo"><input type="password" id="dc" class="pe" autocomplete="off" aria-label="Código de acesso" placeholder="Código de acesso"><button class="btn primary">Continuar</button></form></section>`;
  if(o.demo&&o.demoLiberado)h+=`<section class="panel"><h2>Quem é você nesta demonstração?</h2><p class="muted" style="margin-top:0">Cada pessoa vê o portal de um jeito. Tudo o que fizer fica registrado com o nome dela.</p><div class="pessoas">${(o.pessoas||[]).map(p=>`<button class="pessoa" data-pessoa="${esc(p.id)}"><b>${esc(p.nome)}</b><span>${esc(ROLES[p.papel]||p.papel)}</span><small class="muted">${esc(DESC_PAPEL[p.papel]||'')}</small></button>`).join('')}</div></section>`;
  h+=`<section class="panel"><h2>Entrar com seu e-mail</h2><p class="muted" style="margin-top:0">Enviamos um link de acesso para o seu e-mail. Não precisa de senha.</p><form class="ler" data-form="email"><input type="email" id="em" class="pe" autocomplete="email" placeholder="seu@email.com.br" aria-label="E-mail"><button class="btn">Enviar link</button></form>${o.email?'':'<p class="muted" style="font-size:12px;margin:6px 0 0">O envio de e-mail ainda não está configurado.</p>'}</section></div>`;
  $('#main').innerHTML=`<div class="wrap">${h}</div>`;
  const f=$('#dc');if(f)f.focus();
}
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();
  try{if(f.dataset.form==='demo-codigo'){await api('/api/entrar/demo-codigo',{codigo:$('#dc').value});telaEntrar()}
    else if(f.dataset.form==='email'){const j=await api('/api/entrar/email',{email:$('#em').value});toast(j.msg||'Pedido enviado.')}}
  catch(err){toast(err.message)}});

// ---------- registro de atividades (equipe da Cancha) ----------
function viewAtividade(){
  if(!ATIVIDADE){api('/api/atividade').then(j=>{ATIVIDADE=j.itens;if(S.view==='atividade')render()}).catch(e=>{if(!e.silencioso)toast(e.message)});return `${head('Registro de atividades')}<p class="muted">Carregando…</p>`}
  return `${head('Registro de atividades','Cada ação feita no portal, com quem fez e quando. Este registro não pode ser alterado nem apagado.','<button class="btn" data-act="atividade-atualizar">Atualizar</button>')}
  <div class="tablewrap"><table class="ap" style="min-width:560px"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${ATIVIDADE.map(a=>`<tr><td class="mono" style="white-space:nowrap">${fmtVisita(a.em)}</td><td>${esc(a.usuario_nome||'—')}${a.papel?`<div class="muted" style="font-size:12px">${esc(ROLES[a.papel]||a.papel)}</div>`:''}</td><td>${esc(a.resumo||a.acao)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Nada registrado ainda.</td></tr>'}</tbody></table></div>
  ${DEMO?`<section class="panel"><h2>Dados de demonstração</h2><p class="muted" style="margin-top:0">Volta todos os itens fictícios ao estado inicial, com as datas ajustadas para hoje. O registro acima continua guardado.</p><button class="btn danger" data-act="demo-restaurar">Recarregar dados de demonstração</button></section>`:''}`}

// ---------- cliques ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-pessoa],[data-selall],[data-calv],[data-acat],[data-relcat],[data-per],[data-psort],[data-cord],[data-thread],[data-thread-go],[data-tab],[data-tipo],[data-atipo],[data-quem],[data-pasta],[data-view],[data-open],[data-video],[data-dem],[data-act],[data-month],[data-sel],[data-selv]');
  if(!t)return;
  const d=t.dataset;
  if(d.pessoa){api('/api/entrar/demo',{usuarioId:d.pessoa}).then(iniciar).catch(err=>toast(err.message));return}
  if(!EU)return;
  if(d.calv){S.calv=d.calv;render();return}
  if(d.acat){const [sb,k]=d.acat.split('|');S.acat[sb]=k;render();return}
  if(d.relcat){S.relCat=d.relcat;render();return}
  if(d.per){setPreset(d.per);render();return}
  if(d.psort){S.psort=d.psort;render();return}
  if(d.cord){S.cord=d.cord;render();return}
  if(d.thread){S.thread=d.thread;S.linkPick=false;render();return}
  if(d.threadGo){S.thread=d.threadGo;S.view='hoje';S.drawer=null;render();irChat();return}
  if(d.tab){S[d.tab]=d.val;render();return}
  if(d.tipo){S.tipos[d.tipo]=!S.tipos[d.tipo];render();return}
  if(d.atipo){S.atipo=d.atipo;render();return}
  if(d.quem){S.quem=d.quem;render();return}
  if(d.pasta!==undefined){S.pasta=d.pasta||null;render();return}
  if(d.view){S.view=d.view;S.drawer=null;if(d.view==='atividade')ATIVIDADE=null;render();window.scrollTo(0,0);return}
  if(d.selall){(S.selKeys||[]).forEach(k=>{S.sel[k]=t.checked});render();return}
  if(d.sel){S.sel[d.sel]=t.checked;render();return}
  if(d.selv){S.sel['v:'+d.selv]=t.checked;render();return}
  if(d.open!==undefined&&!d.act){if(d.open)openDrawer('post',d.open);return}
  if(d.video&&!d.act){openDrawer('video',d.video);return}
  if(d.dem&&!d.act){openDrawer('dem',d.dem);return}
  if(d.month){const key=d.mk;const [y,m]=S[key].split('-').map(Number);S[key]=new Date(Date.UTC(y,m-1+Number(d.month),1)).toISOString().slice(0,7);render();return}
  const a=d.act,id=d.id,p=id?posts.find(x=>x.id===id):null,dm=id?demandas.find(x=>x.id===id):null;
  const val=sel=>{const x=$(sel);return x?(x.value||'').trim():''};
  switch(a){
    case 'close':{const wasV=S.drawer&&S.drawer.kind==='video';S.needExt=null;S.marcosEd=null;closeDrawer();if(wasV)render();break}
    case 'sair':api(DEMO?'/api/sair-demo':'/api/sair',{}).catch(()=>{}).finally(()=>telaEntrar());break;
    case 'trocar-pessoa':api('/api/sair',{}).catch(()=>{}).finally(()=>telaEntrar());break;
    case 'atividade-atualizar':ATIVIDADE=null;render();break;
    case 'demo-restaurar':if(!confirm('Recarregar os dados de demonstração? Os itens fictícios voltam ao estado inicial.'))break;
      api('/api/demo/restaurar',{}).then(()=>api('/api/estado')).then(j=>{ATIVIDADE=null;S.pdraft=null;aplicar(j);render();toast('Dados de demonstração recarregados.')}).catch(err=>toast(err.message));break;
    case 'ligar-abrir':S.linkPick=true;render();break;
    case 'ligar-cancelar':S.linkPick=false;render();break;
    case 'ligar-salvar':{const ref=$('#ld').value;S.linkPick=false;acao('conversa-ligar',{id:S.thread,ref},()=>{const r=resolve(ref);toast('Conversa ligada à demanda "'+(r?r.t:'')+'".')});break}
    case 'ligar-remover':S.linkPick=false;acao('conversa-ligar',{id:S.thread,ref:null},()=>toast('Ligação removida.'));break;
    case 'conversa-dem':acao('conversa-nova',{tema:dm.t,ref:'d:'+dm.id},j=>{S.thread=j.criado;S.view='hoje';S.drawer=null;render();irChat(true)});break;
    case 'novo-tema':S.novoTema=true;render();setTimeout(()=>{const x=$('#nt');if(x)x.focus()},0);break;
    case 'criar-tema':{const tt=val('#nt');if(!tt){toast('Dê um tema para a conversa.');return}acao('conversa-nova',{tema:tt},j=>{S.thread=j.criado;S.novoTema=false;render();setTimeout(()=>{const x=$('#cm');if(x)x.focus()},0)});break}
    case 'enviar-msg':{const tx=val('#cm');if(!tx)return;acao('mensagem',{id:S.thread,txt:tx});break}
    case 'approve':{const isPl=p&&p.formato==='plano';if(S.drawer&&S.drawer.kind==='mud')S.drawer=null;acao('aprovar',{id},()=>toast(isPl?'Alterações do plano aprovadas. A versão '+plano.versao+' passa a valer.':'Aprovado.'));break}
    case 'pe-edit':readPlanoForm();if(S.pdraft)prune(S.pdraft);if(!S.pdraft){S.pdraft=clone(plano.pendente?plano.pendente.dados:plano.dados);S.pnota=plano.pendente?plano.pendente.nota:''}S.pedit=d.card;render();break;
    case 'pe-done':readPlanoForm();prune(S.pdraft);S.pedit=null;render();break;
    case 'pa-add':readPlanoForm();getPath(S.pdraft,d.path).push(clone(TPL[d.tpl]));render();break;
    case 'pa-del':readPlanoForm();getPath(S.pdraft,d.path).splice(Number(d.idx),1);render();break;
    case 'cal-add':S.novoTipo=null;openDrawer('novo',d.date||(S.month===TODAY.slice(0,7)?TODAY:S.month+'-01'));setTimeout(()=>{const x=$('#nt-titulo');if(x)x.focus()},0);break;
    case 'novo-salvar':{const dados=lerNovo();if(!dados)return;acao('calendario-novo',dados,()=>{S.month=dados.data.slice(0,7);S.novoTipo=null;closeDrawer();render();toast('Adicionado ao calendário em '+fmtLong(dados.data)+'.')});break}
    case 'rl-novo':S.relDest=null;openDrawer('rel',null);setTimeout(()=>{const x=$('#rl-t');if(x)x.focus()},0);break;
    case 'rl-edit':S.relDest=null;openDrawer('rel',id);break;
    case 'rl-dadd':{const keep=['rl-t','rl-tipo','rl-capa','rl-per','rl-st','rl-dt','rl-link','rl-nota'].map(i=>[i,$('#'+i).value]);readRelDest();S.relDest.push('');renderDrawer();keep.forEach(([i,v])=>{$('#'+i).value=v});const x=document.getElementById('rl-d'+(S.relDest.length-1));if(x)x.focus();break}
    case 'rl-ddel':{const keep=['rl-t','rl-tipo','rl-capa','rl-per','rl-st','rl-dt','rl-link','rl-nota'].map(i=>[i,$('#'+i).value]);readRelDest();S.relDest.splice(Number(d.idx),1);renderDrawer();keep.forEach(([i,v])=>{$('#'+i).value=v});break}
    case 'rl-salvar':{const dados=lerRel();if(!dados)return;acao('relatorio-salvar',{id:S.drawer.id||null,dados},()=>{S.relDest=null;closeDrawer();render();toast('Relatório salvo.')});break}
    case 'rl-excluir':if(!confirm('Remover este relatório?'))break;acao('relatorio-excluir',{id:S.drawer.id},()=>{S.relDest=null;closeDrawer();render();toast('Relatório removido.')});break;
    case 'rl-entregue':acao('relatorio-entregue',{id},()=>{S.relDest=null;openDrawer('rel',id);toast('Marcado como entregue. Cole o link do PDF e os destaques.');setTimeout(()=>{const x=$('#rl-link');if(x)x.focus()},0)});break;
    case 'rel-ver':openDrawer('relview',id);break;
    case 'rv-salvar':acao('relview-salvar',{id:S.drawer.id,campos:lerRelView()},()=>toast('Rascunho salvo.'));break;
    case 'rv-publicar':acao('relview-salvar',{id:S.drawer.id,campos:lerRelView(),publicar:true},()=>{closeDrawer();render();toast('Relatório validado. O cliente já pode ver.')});break;
    case 'mes-edit':openDrawer('mes',d.idx);break;
    case 'mes-salvar':{const x=ANO[Number(S.drawer.id)];acao('mes-salvar',{m:x.m,dados:{fase:val('#ms-f'),tema:val('#ms-t'),obj:val('#ms-o'),prods:val('#ms-pr'),kpi:val('#ms-k'),fr:[...document.querySelectorAll('.ms-fr:checked')].map(c=>c.value),p:Number(val('#ms-p'))||0}},()=>{closeDrawer();render();toast('Mês atualizado.')});break}
    case 'cacoes-edit':openDrawer('cacoes',null);break;
    case 'cacoes-salvar':{const acoes=$('#ca-t').value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [tt,r]=l.split('|');return {t:tt.trim(),ref:(r||'').trim()}});acao('conc-acoes',{acoes},()=>{closeDrawer();render();toast('Leitura atualizada.')});break}
    case 'conc-novo':openDrawer('conc',null);break;
    case 'conc-edit':openDrawer('conc',id);break;
    case 'conc-salvar':{const n2=val('#cc-n');if(!n2){toast('Dê um nome.');return}const tem={};document.querySelectorAll('.cc-tem').forEach(x=>tem[x.dataset.k]=Number(x.value));acao('conc-salvar',{id:S.drawer.id||null,dados:{nome:n2,dest:val('#cc-d'),amea:$('#cc-a').value,tem,leitura:val('#cc-l')}},()=>{closeDrawer();render();toast('Concorrente salvo.')});break}
    case 'conc-excluir':if(!confirm('Remover este concorrente?'))break;acao('conc-excluir',{id:S.drawer.id},()=>{closeDrawer();render();toast('Concorrente removido.')});break;
    case 'vendas-import':toast('Próxima etapa: enviar a planilha de vendas do comercial para atualizar o funil.');break;
    case 'ir-chat':irChat();break;
    case 'apr-novo':openDrawer('apr',null);break;
    case 'apr-edit':openDrawer('apr',id);break;
    case 'apr-salvar':{const t2=val('#ap-t');if(!t2){toast('Diga o que foi testado.');return}acao('aprendizado-salvar',{id:S.drawer.id||null,dados:{t:t2,frente:$('#ap-f').value,status:$('#ap-s').value,data:$('#ap-d').value||TODAY,hip:val('#ap-h'),res:val('#ap-r'),dec:val('#ap-c')}},()=>{closeDrawer();render();toast('Aprendizado salvo.')});break}
    case 'apr-excluir':if(!confirm('Remover este aprendizado?'))break;acao('aprendizado-excluir',{id:S.drawer.id},()=>{closeDrawer();render();toast('Aprendizado removido.')});break;
    case 'guia-edit':openDrawer('guia');break;
    case 'guia-salvar':{const guia={};GUIA_SEC.forEach(([k])=>{guia[k]=($('#gu-'+k).value||'').split('\n').map(x=>x.trim()).filter(Boolean)});acao('guia-salvar',{guia},()=>{closeDrawer();render();toast('Guia de marca atualizado.')});break}
    case 'rapida':S.rapI=0;openDrawer('rapida');break;
    case 'rap-aprovar':acao('aprovar',{id},()=>toast('Aprovado.'));break;
    case 'rap-ajuste':{const c=val('#rap-adj');if(!c){toast('Escreva o que precisa mudar.');return}acao('ajuste',{id,txt:c},()=>toast('Ajuste enviado.'));break}
    case 'rap-pular':S.rapI=(S.rapI||0)+1;renderDrawer();break;
    case 'pop':popOpen(t);break;
    case 'pop-close':S.pop=null;renderPop();break;
    case 'pop-add':popRead();S.pop.list.push(S.pop.k==='ritmo'?{num:'',unid:'',c:'social'}:'');renderPop();break;
    case 'pop-del':popRead();S.pop.list.splice(Number(d.j),1);renderPop();break;
    case 'pop-rmetapa':S.pdraft.jornada.splice(S.pop.i,1);S.pop=null;renderPop();render();break;
    case 'pop-rmtema':S.pdraft.temas.splice(S.pop.i,1);S.pop=null;renderPop();render();break;
    case 'pop-ok':if(popApply()){S.pop=null;renderPop();render();toast('Aplicado ao rascunho.')}break;
    case 'vk-novo':acao('video-novo',{},j=>{openDrawer('video',j.criado);toast('Pauta criada. Dê um nome e envie para a produtora.')});break;
    case 'video-salvar':{const r=$('#vr-'+id);acao('video-salvar',{id,titulo:val('#vt-'+id),roteiro:r?r.value:undefined},()=>toast('Vídeo salvo.'));break}
    case 'post-editar':acao('post-editar',{id,titulo:val('#pe-titulo'),legenda:$('#pe-leg').value,hora:val('#pe-hora')||null,drive:val('#pe-drive')},()=>toast('Conteúdo salvo.'));break;
    case 'st-save':{const ns=$('#st-sel').value;acao('status',{id,status:ns},()=>toast('Status: '+STATUS[ns].l+'.'));break}
    case 'st-pub':acao('publicar',{id,link:val('#pub-link')},()=>toast('Marcado como publicado.'));break;
    case 'ver-mud':openDrawer('mud',id);break;
    case 'pe-discard':S.pdraft=null;S.pedit=null;S.pnota='';render();toast('Rascunho descartado.');break;
    case 'pe-send':{readPlanoForm();prune(S.pdraft);const nota=(S.pnota||'').trim();if(!changedParts(S.pdraft).length){toast('Nada mudou em relação à versão aprovada.');return}if(!nota){toast('Explique o que mudou e por quê antes de enviar.');const x=$('#pnota');if(x)x.focus();return}
      acao('plano-enviar',{dados:S.pdraft,nota},()=>{S.pdraft=null;S.pedit=null;S.pnota='';render();toast('Alterações enviadas. A Spraytec vê o que mudou e precisa aprovar.')});break}
    case 'plano-ajuste':{const c=val('#padj');if(!c){toast('Escreva o que precisa mudar.');return}acao('plano-ajuste',{txt:c},()=>toast('Ajuste pedido. A Cancha foi avisada.'));break}
    case 'validacao':acao('validacao',{id},()=>toast('Enviado para validação interna. O prazo continua correndo.'));break;
    case 'adjust':{const c=val('#adj');if(!c){toast('Escreva o que precisa mudar para pedir ajuste.');return}acao('ajuste',{id,txt:c},()=>toast('Ajuste pedido. A Cancha foi avisada.'));break}
    case 'to-prod':acao('para-producao',{id},()=>toast('Movido para produção.'));break;
    case 'send':{const prod=p&&['video','design'].includes(p.rede);acao('enviar',{id},()=>toast(prod?'Marcado como concluído.':'Enviado para aprovação.'));break}
    case 'newver':acao('nova-versao',{id},()=>toast('Nova versão enviada para aprovação.'));break;
    case 'external':acao('aprovacao-externa',{id,canal:$('#ext-canal')?$('#ext-canal').value:'WhatsApp',evidencia:val('#ext-link')},()=>{S.needExt=null;render();toast('Aprovação externa registrada no histórico.')});break;
    case 'textos':acao('textos',{id,legenda:val('#tx-leg')},()=>toast('Textos adicionados. Foi para validação interna da Spraytec.'));break;
    case 'comment':{const c=val('#newc');if(!c)return;acao('comentar',{id,txt:c,interno:!!($('#newci')&&$('#newci').checked)});break}
    case 'approve-sel':{const ids=Object.keys(S.sel).filter(k=>S.sel[k]);if(!ids.length){toast('Marque pelo menos um item.');return}acao('aprovar-lote',{ids},()=>{S.sel={};render();toast(ids.length+(ids.length>1?' itens aprovados.':' item aprovado.'))});break}
    case 'marcos':S.marcosEd=clone(MARCOS);openDrawer('marcos');break;
    case 'marco-add':readMarcos();S.marcosEd.push({id:'m'+Date.now(),tipo:'evento',nome:'Nova fase',ini:S.month+'-10',fim:S.month+'-12'});renderDrawer();break;
    case 'marco-del':readMarcos();S.marcosEd=S.marcosEd.filter(m=>m.id!==id);renderDrawer();break;
    case 'marcos-salvar':readMarcos();acao('marcos-salvar',{marcos:S.marcosEd},()=>{S.marcosEd=null;closeDrawer();render();toast('Calendário de safra e eventos atualizado.')});break;
    case 'nova-dem':S.novaDemData=d.date||null;openDrawer('dem',null);break;
    case 'dem-salvar':{const tt=val('#dt');if(!tt){toast('Diga o que precisa ser feito.');return}const data=$('#dd').value||TODAY;acao('demanda-nova',{t:tt,quem:$('#dq').value,data,det:val('#dx')},()=>{S.dmonth=data.slice(0,7);closeDrawer();render();toast('Demanda criada.')});break}
    case 'dem-data':{const nd=$('#dnd').value;if(!nd)return;acao('demanda-data',{id,data:nd},()=>{S.dmonth=nd.slice(0,7);closeDrawer();render();toast('Data alterada.')});break}
    case 'dem-feito':{const was=dm&&dm.feito;acao('demanda-feito',{id},()=>{closeDrawer();render();toast(was?'Demanda reaberta.':'Demanda concluída.')});break}
    case 'viavel':case 'inviavel':{const ok=a==='viavel';acao('viabilidade',{id,viavel:ok,parecer:val('#par')},()=>{closeDrawer();render();toast(ok?'Marcado como viável. A Cancha escreve o roteiro.':'Marcado como inviável. A pauta voltou para a Cancha.')});break}
    case 'entrega':acao('video-entregue',{id},()=>{closeDrawer();render();toast('Vídeo entregue. Foi para Aprovação, esperando os textos da Cancha.')});break;
    case 'v-next':acao('roteiro-aprovar',{id},()=>{if(S.drawer&&S.drawer.kind==='video')closeDrawer();render();toast('Roteiro aprovado. A produtora foi avisada.')});break;
  }
});

// arrastar e soltar: posts no calendário e no kanban (equipe), vídeos (equipe) e demandas
let drag=null;
document.addEventListener('dragstart',e=>{const t=e.target.closest('[data-drag],[data-ddrag],[data-vdrag],[data-sdrag]');if(!t)return;drag=t.dataset.sdrag?{k:'st',id:t.dataset.sdrag}:t.dataset.vdrag?{k:'vid',id:t.dataset.vdrag}:t.dataset.drag?{k:'post',id:t.dataset.drag}:{k:'dem',id:t.dataset.ddrag};e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',drag.id)}catch(_){}});
document.addEventListener('dragover',e=>{const c=e.target.closest('[data-day],[data-vcol],[data-scol]');if(!c||!drag)return;e.preventDefault();document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));c.classList.add('over')});
document.addEventListener('drop',e=>{const c=e.target.closest('[data-day],[data-vcol],[data-scol]');if(!c||!drag)return;e.preventDefault();const g=drag;drag=null;document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
  if(g.k==='st'){const col=c.dataset.scol;if(col)acao('status',{id:g.id,status:col},()=>toast('Status: '+STATUS[col].l+'.'));return}
  if(g.k==='vid'){const col=c.dataset.vcol,v=videos.find(x=>x.id===g.id);if(col&&v&&v.stage!==col)acao('video-etapa',{id:g.id,etapa:col},()=>toast('Vídeo movido para '+VCOLS.find(x=>x[0]===col)[1]+'.'));return}
  const day=c.dataset.day;if(!day)return;
  if(g.k==='dem'){if(day!=='espera')acao('demanda-data',{id:g.id,data:day},()=>toast('Demanda movida para '+fmtLong(day)+'.'));return}
  if(day==='espera')acao('post-data',{id:g.id,data:null},()=>toast('Movido para em espera.'));
  else{const was=(posts.find(x=>x.id===g.id)||{}).status;acao('post-data',{id:g.id,data:day},()=>toast(was==='agendado'?'Data alterada e reagendado, sem duplicar.':'Data alterada para '+fmtLong(day)+'.'))}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.id==='per-cmp'){S.per.cmp=t.value;if(t.value==='custom'){const r={de:addDays(S.per.de,-perDays()),ate:addDays(S.per.de,-1)};S.per.cde=r.de;S.per.cate=r.ate}render();return}if(t&&(t.id==='per-cde'||t.id==='per-cate')&&t.value){S.per[t.id==='per-cde'?'cde':'cate']=t.value;if(S.per.cde>S.per.cate){const x=S.per.cde;S.per.cde=S.per.cate;S.per.cate=x}render();return}if(t&&(t.id==='per-de'||t.id==='per-ate')&&t.value){S.per.preset='custom';S.per[t.id==='per-de'?'de':'ate']=t.value;if(S.per.de>S.per.ate){const x=S.per.de;S.per.de=S.per.ate;S.per.ate=x}render();return}if(t&&t.id==='nt-tipo'){const keep={ti:$('#nt-titulo').value,da:$('#nt-data').value};S.novoTipo=t.value;S.drawer.id=keep.da;renderDrawer();$('#nt-titulo').value=keep.ti;$('#nt-tipo').focus()}});
document.addEventListener('input',e=>{if(e.target&&e.target.classList.contains('acq')){const sb=e.target.dataset.sub;S.aq[sb]=e.target.value;const pos=e.target.selectionStart;render();const x=document.getElementById('acq-'+sb);if(x){x.focus();try{x.setSelectionRange(pos,pos)}catch(_){}}return}if(e.target&&e.target.id==='rel-q'){S.relQ=e.target.value;const pos=e.target.selectionStart;render();const x=$('#rel-q');if(x){x.focus();try{x.setSelectionRange(pos,pos)}catch(_){}}return}const t=e.target;if(t.classList&&t.classList.contains('pe')&&t.dataset.orig!==undefined)t.classList.toggle('chgd',t.value!==t.dataset.orig)});
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.pop){S.pop=null;renderPop();return}if(e.key==='Enter'&&e.target&&e.target.dataset&&e.target.dataset.act==='pop'){e.preventDefault();e.target.click();return}if(e.key==='Escape'&&S.drawer){S.needExt=null;S.marcosEd=null;closeDrawer()}if(e.key==='Enter'&&!e.shiftKey&&e.target&&e.target.id==='cm'){e.preventDefault();const b=document.querySelector('[data-act="enviar-msg"]');if(b)b.click()}});

if(new URLSearchParams(location.search).get('link')==='invalido'){history.replaceState(null,'','/');telaEntrar('O link de acesso é inválido ou já foi usado. Peça um novo.')}
else iniciar();
})();
