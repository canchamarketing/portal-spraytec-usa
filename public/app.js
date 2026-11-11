(function(){
let TODAY='';
const ROLES={operacao:'Operação Spraytec',diretoria:'Diretoria Spraytec',cancha:'Cancha',produtora:'Produtora de vídeo',leitor:'Leitor'};
const STATUS={
  pauta:{l:'Pauta em produção',c:'--s-pauta'}, pauta_aprovacao:{l:'Pauta em aprovação',c:'--s-validacao'}, producao:{l:'Em produção',c:'--s-producao'}, texto_aprovacao:{l:'Textos em aprovação',c:'--s-validacao'}, aprovacao:{l:'Em aprovação',c:'--s-aprovacao'},
  ajuste:{l:'Ajuste',c:'--s-ajuste'}, aprovado:{l:'Aprovado',c:'--s-aprovado'},
  agendado:{l:'Agendado',c:'--s-agendado'}, publicado:{l:'Publicado',c:'--s-publicado'}, espera:{l:'Em espera',c:'--s-espera'}
};
const ST_CURTO={pauta:'Pauta em produção',pauta_aprovacao:'Pauta p/ aprovar',texto_aprovacao:'Textos p/ aprovar',producao:'Produção',copy:'Copy em produção',arte:'Arte em criação',aprovacao:'Aprovação',ajuste:'Ajuste',aprovado:'Aprovado',agendado:'Agendado',publicado:'Feito',espera:'Em espera'};
const NET={ig:'IG',fb:'FB',yt:'YT',ads:'ADS',email:'E-MAIL',design:'DESIGN',video:'VÍDEO'};
const NETNAME={ig:'Instagram',fb:'Facebook',yt:'YouTube',ads:'Mídia paga',email:'E-mail marketing',design:'Design',video:'Vídeo'};
const FORMATO={carrossel:'Carrossel',post:'Post',story:'Story',reel:'Reel',video:'Vídeo',short:'Short',newsletter:'Newsletter',plano:'Plano de mídia',pecas:'Peça em 3 formatos',producao:'Produção de peças',gravacao:'Gravação',entrega:'Entrega do vídeo'};
const PILAR_HUE={Manejo:'#D7E6A3',Campo:'#BFD9C2',Produto:'#E9D7A8',Educação:'#C9DCEB',Institucional:'#E2D6E8',Relacionamento:'#F0CDBF',Eventos:'#F3E0B5'};
// Feriados nacionais de qualquer ano (os móveis saem da Páscoa) + feriados e recessos cadastrados no calendário.
function pascoa(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),x=h+l-7*m+114;return y+'-'+String(Math.floor(x/31)).padStart(2,'0')+'-'+String(x%31+1).padStart(2,'0')}
const _fer={};
function feriadosAno(y){if(_fer[y])return _fer[y];const o={},p=pascoa(y);[['01-01','Ano-novo'],['04-21','Tiradentes'],['05-01','Dia do Trabalho'],['09-07','Independência'],['10-12','N. Sra. Aparecida'],['11-02','Finados'],['11-15','Proclamação'],['11-20','Consc. Negra'],['12-25','Natal']].forEach(([d,n])=>o[y+'-'+d]=n);
  [[-48,'Carnaval'],[-47,'Carnaval'],[-2,'Sexta-feira Santa'],[60,'Corpus Christi']].forEach(([k,n])=>o[addDays(p,k)]=n);return _fer[y]=o}
function feriado(iso){if(!iso)return '';const n=feriadosAno(+iso.slice(0,4))[iso];if(n)return n;const m=MARCOS.find(x=>(x.tipo==='feriado'||x.tipo==='recesso')&&x.ini<=iso&&x.fim>=iso);return m?m.nome||MK_TIPO[m.tipo]:''}
const PESO={carrossel:2,post:1,story:1,pecas:1};
const TIPOS=[['post','Posts'],['email','E-mail marketing'],['design','Design'],['video','Vídeo'],['demanda','Demandas']];

let posts=[];

const STAGES=[['pauta','Pauta'],['viabilidade','Viabilidade'],['roteiro','Roteiro'],['gravacao','Gravação e edição'],['entregue','Entregue']];
let videos=[];

let MARCOS=[];
const MK_TIPO={safra:'Safra',comercial:'Foco comercial',evento:'Evento',recesso:'Recesso',feriado:'Feriado'};

let demandas=[];
const QUEM={cancha:'Cancha',spraytec:'Spraytec'};

// ===================== FONTE DE DADOS: EXEMPLO =====================
// Tudo o que depende das integrações (Drive, Meta, Google, Brevo) vem desta seção, com selo "Exemplo".
// Quando cada integração entrar, ela substitui o bloco correspondente sem mudar as telas.
// Selo "Exemplo": desligado para a apresentação (combinado com a Cancha). Para voltar, troque por true.
const MOSTRAR_EXEMPLO=true;
const exLinha=t=>MOSTRAR_EXEMPLO?`<p class="exlinha">${EX}<span>${t}</span></p>`:'';
const EX=MOSTRAR_EXEMPLO?'<span class="exemplo" title="Dado de exemplo: a integração ainda não está conectada">Exemplo</span>':'';
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
function isBiz(iso){const w=dow(iso);return w!==0&&w!==6&&!feriado(iso)}
function proxUtil(iso){let d=iso;while(!isBiz(d))d=addDays(d,1);return d}
function antUtil(iso){let d=iso;while(!isBiz(d))d=addDays(d,-1);return d}

let acervo=[],stories=[],darkposts=[],STORIES_DESDE='';
function carregarFonteExemplo(){
  const f=iso=>iso.slice(8)+'/'+iso.slice(5,7);
  acervo=ACERVO_BASE.map((a,i)=>({id:'a'+i,titulo:a[0],tipo:a[1],cultura:a[2],produto:a[3],safra:a[4],origem:a[5],cor:a[6],
    pasta:a[5]==='Produtora'?'Vídeos da produtora':a[2]!=='—'?a[2]:'Institucional',
    arquivo:a[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')+(a[1]==='vídeo'?'.mp4':'.jpg'),
    mod:f(addDays(TODAY,-[4,6,10,17,19][i%5]))}));
  // stories capturados enquanto estão no ar (26 dias úteis para trás)
  const STORY_TEMAS=[['Lavoura de cliente em Toledo','Campo','Linha foliar'],['Visita de RTV','Relacionamento','—'],['Pulverização ao amanhecer','Manejo','Bioestimulante'],['Dia de campo','Eventos','—'],['Embalagens na revenda','Produto','Linha foliar'],['Equipe na fábrica','Institucional','—']];
  STORIES_DESDE=addDays(TODAY,-25);stories=[];
  {let d=TODAY,k=0;while(stories.length<26&&d>=STORIES_DESDE){if(isBiz(d)){const nq=d===TODAY?2:2+(k%3);for(let j=0;j<nq;j++){const tm=STORY_TEMAS[(k+j)%6];stories.push({date:d,hora:['09:12','10:40','11:15','15:02','16:30'][(j+k)%5],tipo:j===0&&k%4===1?'agendado':'repost',titulo:tm[0],pilar:tm[1],produto:tm[2],alcance:800+((k*7+j*13)%9)*140,respostas:(k+j)%6})}k++}d=addDays(d,-1)}}
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
// DADOS DO META (Instagram, Página e anúncios), coletados pelo servidor. Enquanto uma fonte não tem
// coleta boa, as telas dela continuam com o exemplo. undefined = carregando; null = indisponível.
let META;
const FONTE_NOME={ig:'Instagram',fb:'Facebook',ads:'Anúncios do Meta',ga4:'Google Analytics',yt:'YouTube',gads:'Google Ads'};
const metaTem=f=>!!(META&&META.situacao[f]&&META.situacao[f].ultimoOk);
const igUser=()=>esc((META&&META.ig.perfil&&META.ig.perfil.username)||'spraytecbr');
const imgTag=(u,cls)=>u?`<img class="${cls||''}" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-falha>`:'';
const orgImg=link=>{const nl=normLink(link);const x=nl&&META?META.posts.find(p=>p.nl===nl):null;return x?x.img:''};
const logoSpraytec=()=>META&&((META.ig.perfil&&META.ig.perfil.profile_picture_url)||(META.fb.perfil&&META.fb.perfil.picture&&META.fb.perfil.picture.data&&META.fb.perfil.picture.data.url))||'';
const avS=()=>{const u=logoSpraytec();return `<span class="av">S${u?`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" data-falha>`:''}</span>`};
const metaSocial=()=>metaTem('ig')||metaTem('fb');
function normLink(u){u=String(u||'').trim();if(!u)return '';const ig=u.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);if(ig)return 'ig:'+ig[1];
  return u.replace(/[?#].*$/,'').replace(/\/+$/,'').replace(/^https?:\/\/(www\.|m\.)?/,'').toLowerCase()}
// post do calendário publicado com este link (o "link do post" que a Cancha cola ao publicar)
let _pubMap=null,_pubRef=null;
function calDe(x){if(_pubRef!==posts){_pubRef=posts;_pubMap=new Map(posts.filter(p=>p.pubLink).map(p=>[normLink(p.pubLink),p]))}return x.nl?_pubMap.get(x.nl)||null:null}
function prepMeta(j){
  const dia=ts=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(ts));
  const hora=ts=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(ts));
  const tsN=t=>String(t||'').replace(/([+-]\d\d)(\d\d)$/,'$1:$2');
  const tit=t=>{const l=String(t||'').split('\n').map(x=>x.trim()).find(Boolean)||'';return l.length>90?l.slice(0,88)+'…':l};
  const P=[];
  (j.ig.posts||[]).forEach(x=>{const m=x.metricas||{},ts=tsN(x.timestamp);const curt=m.likes??x.like_count??0,com=m.comments??x.comments_count??0,salv=m.saved||0,comp=m.shares||0;
    const inter=m.total_interactions??(curt+com+salv+comp),alc=m.reach??null;
    P.push({rede:'ig',id:x.id,link:x.permalink,nl:normLink(x.permalink),ts,date:dia(ts),hora:hora(ts),
      formato:x.media_product_type==='REELS'?'reel':x.media_type==='CAROUSEL_ALBUM'?'carrossel':x.media_type==='VIDEO'?'video':'post',
      titulo:tit(x.caption)||'(sem legenda)',legenda:x.caption||'',img:x.media_type==='VIDEO'?x.thumbnail_url:x.media_url,alc,views:m.views??null,curt,com,salv,comp,inter,eng:alc?inter/alc*100:null})});
  (j.fb.posts||[]).forEach(x=>{const m=x.metricas||{},ts=tsN(x.created_time);const curt=x.reacoes||0,com=x.comentarios||0,comp=x.compartilhamentos||0,inter=curt+com+comp,alc=m.post_impressions_unique??null;
    P.push({rede:'fb',id:x.id,link:x.permalink_url,nl:normLink(x.permalink_url),ts,date:dia(ts),hora:hora(ts),formato:/video/.test(x.status_type||'')?'video':'post',
      titulo:tit(x.message)||'(sem texto)',legenda:x.message||'',img:x.full_picture,alc,views:null,curt,com,salv:0,comp,inter,eng:alc?inter/alc*100:null,cliques:m.post_clicks??null})});
  const ST=(j.ig.stories||[]).map(s=>{const m=s.metricas||{},ts=tsN(s.timestamp);return {id:s.id,ts,date:dia(ts),hora:hora(ts),tipo:s.media_type,drive:s.drive,driveTipo:s.drive_tipo,img:s.drive_capa?miniUrl(s.drive_capa,600):s.drive&&/^image\//.test(s.drive_tipo||'')?miniUrl(s.drive,600):s.thumbnail_url||(s.media_type!=='VIDEO'&&s.media_url)||(s.drive?miniUrl(s.drive,600):''),alc:m.reach??null,views:m.views??null,resp:m.replies||0,inter:m.total_interactions||0}});
  return {conectado:j.conectado,situacao:j.situacao||{},ig:{perfil:j.ig.perfil,dias:j.ig.dias||[]},fb:{perfil:j.fb.perfil,dias:j.fb.dias||[]},posts:P,stories:ST,
    ads:{anuncios:new Map((j.ads.anuncios||[]).map(a=>[a.id,a])),dias:j.ads.dias||[]},ga4:Object.assign({dias:[],canais:[],paginas:[],eventos:[]},j.ga4||{}),
    gads:{campanhas:new Map((j.gads&&j.gads.campanhas||[]).map(c=>[c.id,c])),dias:j.gads&&j.gads.dias||[],anuncios:new Map((j.gads&&j.gads.anuncios||[]).map(a=>[a.id,a])),adDias:j.gads&&j.gads.adDias||[]},
    yt:{perfil:j.yt&&j.yt.perfil||null,dias:j.yt&&j.yt.dias||[],videos:(j.yt&&j.yt.videos||[]).map(v=>({id:v.id,titulo:v.titulo||'(sem título)',ts:v.publicado||'',date:v.publicado?dia(v.publicado):'',img:v.thumb,duracao:v.duracao||0,formato:v.formato||'video',publico:v.privacidade==='public',views:v.views||0,curt:v.curtidas||0,com:v.comentarios||0,minutos:v.minutos??null,pctVisto:v.pctVisto??null}))}}}
async function carregarMeta(){const antes=META;let m=null;try{m=prepMeta(await api('/api/metricas'))}catch(_){}META=m;
  if(!EU||S.drawer||S.pop)return;const ae=document.activeElement;if(antes!==undefined&&ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))return;
  if(['redes','performance','acervo','hoje','plano'].includes(S.view))render()}
function metaCarregando(t,sub){return `${head(t,sub)}<p class="muted">Carregando os dados do Meta…</p>`}
// Aviso de integração parada: sem coleta boa há mais de 24 h (para todos) ou última tentativa com erro (só a Cancha).
function metaRodape(fontes,origem='Meta'){if(!META||!fontes.length)return '';const sit=META.situacao,agora=Date.now();
  const velho=f=>{const s=sit[f];return !s||!s.ultimoOk||agora-Date.parse(s.ultimoOk)>864e5};
  const atencao=fontes.filter(f=>velho(f)||(isTeam()&&sit[f].erro));
  const btn='';
  const oks=fontes.map(f=>sit[f]&&sit[f].ultimoOk).filter(Boolean).sort();
  if(!atencao.length)return `<p class="muted metaok">Dados ${origem==='Meta'?'do Meta':'do '+origem}, atualizados ${fmtVisita(oks[0])}. Atualização automática a cada hora.</p>`;
  const li=atencao.map(f=>{const s=sit[f]||{};return `<li><b>${FONTE_NOME[f]}</b>: ${!s.ultimoOk?'ainda sem dados':velho(f)?'sem dados novos desde '+fmtVisita(s.ultimoOk)+'. Os números abaixo podem estar desatualizados.':'a última coleta falhou; os números são de '+fmtVisita(s.ultimoOk)+'.'}${s.erro&&isTeam()?`<div class="muted" style="font-size:12px">${esc(s.erro)}</div>`:''}</li>`}).join('');
  return `<section class="panel metaaviso" role="status"><b>Integração com o ${origem==='Meta'?'Meta':origem} precisa de atenção</b><ul>${li}</ul>${btn}</section>`}

// Redes sociais com os dados reais
// Topo do perfil (Instagram, Página do Facebook e canal do YouTube) no mesmo formato.
function perfilTopo(o){const img=o.logo?`<img src="${esc(o.logo)}" alt="" referrerpolicy="no-referrer" data-falha>`:'';
  return `<section class="ptopo ${o.cls||''}">${o.capa!==undefined?`<div class="ptcapa">${o.capa?`<img src="${esc(o.capa)}" alt="" referrerpolicy="no-referrer" data-falha>`:''}</div>`:''}
  <div class="ptlinha ${o.capa!==undefined?'comcapa':''}"><span class="ptlogo">S${img}</span><div class="ptinfo"><b class="ptnome">${o.nome}</b>${o.sub?`<span class="muted ptsub">${o.sub}</span>`:''}<div class="ptstats">${o.stats.map(([v,l])=>`<span><b>${v}</b> ${l}</span>`).join('')}</div>${o.bio?`<p class="ptbio">${o.bio}</p>`:''}</div>${o.link?`<a class="btn sm" href="${esc(o.link)}" target="_blank" rel="noopener">${o.linkTxt} ›</a>`:''}</div></section>`}
function redesIG(){const P=META.ig.perfil||{};const ps=META.posts.filter(x=>x.rede==='ig').sort((a,b)=>b.ts.localeCompare(a.ts));
  const noAr=META.stories.filter(s=>Date.parse(s.ts)>Date.now()-864e5).sort((a,b)=>a.ts.localeCompare(b.ts));
  const desde=META.stories.reduce((a,s)=>s.date<a?s.date:a,'9999');const bio=(P.biography||'').split('\n')[0];
  const lg=P.profile_picture_url;
  return `${perfilTopo({cls:'ig',logo:lg,nome:esc(P.username||''),sub:esc(P.name||''),stats:[[n(P.media_count||0),'publicações'],[fk(P.followers_count||0),'seguidores'],[n(P.follows_count||0),'seguindo']],bio:bio?esc(bio):'',link:P.username?'https://www.instagram.com/'+encodeURIComponent(P.username)+'/':'',linkTxt:'Abrir no Instagram'})}
   <section class="panel"><div class="headrow" style="margin-bottom:8px"><h2 style="margin:0">Stories no ar agora · ${noAr.length}</h2><span class="muted" style="font-size:12px">Embaixo de cada um, a hora e o alcance. Depois de 24 h, ficam guardados no Acervo › Stories.</span></div>
    ${noAr.length?`<div class="rings">${noAr.map(s=>`<div class="ring" ${s.drive?`data-arq="${esc(s.drive)}" role="button" tabindex="0" title="Ver o story"`:''}><span><i>${imgTag(s.img,'ringimg')}</i></span><b class="rh">${s.hora}</b><small class="ra">${s.alc!=null?fk(s.alc)+' alcance':'sem números'}</small></div>`).join('')}</div>`:'<p class="muted" style="margin:0">Nenhum story no ar.</p>'}
    ${META.stories.length?`<p style="margin:8px 0 0;font-size:13px">${META.stories.length} stories guardados pelo portal desde ${fmt(desde)}.</p>`:''}</section>
   <div class="iggrid">${ps.slice(0,30).map(x=>{const c=calDe(x);const tag=c?'div':'a';const at=c?`data-open="${c.id}"`:`href="${esc(x.link)}" target="_blank" rel="noopener"`;
     return `<${tag} class="igt" style="background:${PILAR_HUE[c&&c.pilar]||'#E3E4D3'}" ${at} title="${esc(x.titulo)}">${imgTag(x.img,'igimg')}${x.formato==='carrossel'?'<small>Carrossel</small>':x.formato==='reel'?'<small>▶ Reel</small>':x.formato==='video'?'<small>▶ Vídeo</small>':''}<span class="igcap">${esc(x.titulo.slice(0,70))}</span></${tag}>`}).join('')}</div>
   ${ps.length>30?'<p class="muted" style="font-size:12px">Os 30 posts mais recentes. O histórico completo, com os números, está em Performance › Social.</p>':''}`}
function redesFB(){const P=META.fb.perfil||{};const ps=META.posts.filter(x=>x.rede==='fb').sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,30);
  const lg=P.picture&&P.picture.data&&P.picture.data.url,capa=P.cover&&P.cover.source;const nome=esc(P.name||'Spraytec Brasil');
  const card=x=>{const c=calDe(x);const t=x.legenda||'';const curto=t.length>320?t.slice(0,t.lastIndexOf(' ',300)>200?t.lastIndexOf(' ',300):300):t;
    return `<article class="fbpost"><div class="fbh">${avS()}<div><b>${nome}</b><span class="muted">${fmtLong(x.date)} · ${x.hora}</span></div></div>
    ${t?`<div class="fbtxt">${esc(curto)}${curto.length<t.length?`<details class="fbmais"><summary>ver mais</summary>${esc(t.slice(curto.length))}</details>`:''}</div>`:''}
    ${x.img?`<div class="fbmid" ${c?`data-open="${c.id}"`:''}>${imgTag(x.img,'fbimg2')}${x.formato==='video'?'<small>▶ Vídeo</small>':''}</div>`:''}
    <div class="fbft"><span><b>${n(x.curt)}</b> reações</span><span><b>${n(x.com)}</b> comentários</span><span><b>${n(x.comp)}</b> compart.</span>${x.alc!=null?`<span><b>${fk(x.alc)}</b> alcance</span>`:''}</div>
    <div class="fbacts">${c?`<button class="linkbtn" data-open="${c.id}">Abrir no calendário</button>`:''}<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Ver no Facebook ›</a></div></article>`};
  return `${perfilTopo({capa:capa||'',logo:lg,nome,stats:[[n(P.followers_count||0),'seguidores'],[n(P.fan_count||0),'curtidas']],link:P.id?'https://www.facebook.com/'+encodeURIComponent(P.id):'',linkTxt:'Abrir no Facebook'})}
   ${ps.length?`<div class="fbfeed2">${ps.map(card).join('')}</div>`:'<p class="muted">Nenhum post na Página.</p>'}${META.posts.filter(x=>x.rede==='fb').length>30?'<p class="muted" style="font-size:12px">Os 30 posts mais recentes. O histórico completo, com os números, está em Performance › Social.</p>':''}`}

// Performance › Social com os dados reais
function segEm(f,d){const L=META[f].dias.filter(x=>x.d<=d);return L.length?L[L.length-1].seguidores:null}
function novosSeg(fs,r){let t=null;fs.forEach(f=>{const fim=segEm(f,r.ate),ini=segEm(f,addDays(r.de,-1));if(fim==null||ini==null)return;t=(t||0)+fim-ini});return t}
function socialStatsReal(r){const pub=META.posts.filter(x=>inR(r,x.date)&&prodOk(calDe(x)?calDe(x).produto:''));const st=META.stories.filter(s=>inR(r,s.date)&&prodOk(''));
  const ce=pub.filter(x=>x.eng!=null);
  return {pub,st,alc:pub.reduce((a,x)=>a+(x.alc||0),0),inter:pub.reduce((a,x)=>a+x.inter,0),eng:ce.length?ce.reduce((a,x)=>a+x.eng,0)/ce.length:null,
    stAlc:st.length?st.reduce((a,s)=>a+(s.alc||0),0)/st.length:null,seg:novosSeg(['ig','fb'],r)}}
function cardReal(x,flag){const c=calDe(x);
  const pv=preview(c||{rede:x.rede,formato:x.formato==='video'?(x.rede==='ig'?'reel':'post'):x.formato,titulo:x.titulo,legenda:x.legenda.split('\n').filter(l=>l.trim()).slice(1).join(' '),pilar:''});
  const c3=x.views!=null?['Visualizações',fk(x.views)]:[x.rede==='fb'?'Reações':'Curtidas',fk(x.curt)],c5=x.rede==='fb'?['Cliques',x.cliques!=null?n(x.cliques):'—']:['Salvamentos',n(x.salv)];
  return `<article class="crcard${c?' clickable':''}" ${c?`data-open="${c.id}"`:''}><div class="crprev"><div class="pvwrap">${pv}${imgTag(x.img,'pvimg')}</div></div><div class="crbody"><div><b>${esc(c?c.titulo:x.titulo)}</b><div class="muted" style="font-size:12px">${NETNAME[x.rede]} · ${FORMATO[x.formato]||'Post'} · ${fmtLong(x.date)}${c&&!semProd(c.produto)?' · '+esc(c.produto):''}</div></div>${flag?`<div>${flag}</div>`:''}
    <div class="crm"><div><span>Alcance</span><b>${x.alc!=null?fk(x.alc):'—'}</b></div><div><span>Engajamento</span><b>${x.eng!=null?pct(x.eng):'—'}</b></div><div><span>${c3[0]}</span><b>${c3[1]}</b></div><div><span>Comentários</span><b>${n(x.com)}</b></div><div><span>${c5[0]}</span><b>${c5[1]}</b></div><div><span>Compartilh.</span><b>${n(x.comp)}</b></div></div>
    ${c?'':`<a class="linkbtn" href="${esc(x.link)}" target="_blank" rel="noopener">Ver no ${x.rede==='ig'?'Instagram':'Facebook'} ›</a>`}</div></article>`}
function perfSocialReal(){const r={de:S.per.de,ate:S.per.ate},cr=cmpRange();const SC=socialStatsReal(r),SP=cr?socialStatsReal(cr):null;const pub=SC.pub,st=SC.st;
  const has=SP&&(SP.pub.length||SP.st.length);const capt=META.stories.reduce((a,s)=>s.date<a?s.date:a,'9999');const stOk=has&&cr.de>=capt;
  const segTxt=v=>v==null?'—':(v>=0?'+':'')+n(v);const desdeSeg=[...META.ig.dias,...META.fb.dias].map(x=>x.d).sort()[0];
  const linha=(f,l)=>{const ps=pub.filter(x=>x.rede===f),P=META[f].perfil||{},a=ps.reduce((s,x)=>s+(x.alc||0),0),ce=ps.filter(x=>x.eng!=null),e=ce.length?ce.reduce((s,x)=>s+x.eng,0)/ce.length:null;
    return [l,P.followers_count!=null?fk(P.followers_count):'—',segTxt(novosSeg([f],r)),a?fk(a):'—',e!=null?pct(e):'—',ps.length+(f==='ig'?' · '+st.length+' stories':'')]};
  const redes=[linha('ig','Instagram'),linha('fb','Facebook'),metaTem('yt')?(()=>{const Y=ytStats(r),P=META.yt.perfil||{};return ['YouTube',P.inscritos!=null?fk(P.inscritos):'—',segTxt(Y.ins),fk(Y.v)+' visualiz.','—',String(Y.pub)]})():['YouTube','—','—','—','—','integração pendente']];
  const eg=x=>x.eng??-1;const ord={alc:(a,b)=>(b.alc??b.views??0)-(a.alc??a.views??0),eng:(a,b)=>eg(b)-eg(a),recent:(a,b)=>b.ts.localeCompare(a.ts)}[S.psort||'alc'];
  const ytp=metaTem('yt')?META.yt.videos.filter(v=>v.publico&&inR(r,v.date)).map(v=>({...v,rede:'yt',alc:null})):[];
  const RDF=[['todas','Todas'],['ig','Instagram'],['fb','Facebook'],['yt','YouTube']],rf=S.prede||'todas';
  const todos=[...pub,...ytp].filter(x=>rf==='todas'||x.rede===rf);
  const list=todos.slice().sort(ord),MAX=60;const topA=pub.filter(x=>x.alc).sort((a,b)=>b.alc-a.alc)[0],topE=pub.filter(x=>x.eng!=null&&x.alc>=100).sort((a,b)=>b.eng-a.eng)[0];
  return `<div class="actions" style="align-items:center"><span class="eyebrow">Produto</span>${prodFiltro()}</div>${kpisC([
    {l:'Alcance',v:fk(SC.alc),s:pub.length+' publicações (soma por post)',cur:SC.alc,prev:has?SP.alc:null,prevTxt:has?fk(SP.alc):null},
    {l:'Interações',v:fk(SC.inter),s:'curtidas, comentários, salvos e compartilhamentos',cur:SC.inter,prev:has?SP.inter:null,prevTxt:has?fk(SP.inter):null},
    {l:'Engajamento médio',v:SC.eng!=null?pct(SC.eng):'—',s:'interações ÷ alcance, por post',cur:SC.eng,prev:has?SP.eng:null,prevTxt:has&&SP.eng!=null?pct(SP.eng):null,pp:true},
    {l:'Publicações',v:pub.length,s:'Instagram e Facebook',cur:pub.length,prev:SP?SP.pub.length:null,prevTxt:SP?String(SP.pub.length):null},
    {l:'Stories',v:st.length,s:'alcance médio '+(SC.stAlc?fk(SC.stAlc):'—')+(capt>r.de?' · guardados desde '+fmt(capt):''),cur:st.length,prev:stOk?SP.st.length:null,prevTxt:stOk?String(SP.st.length):'sem dados'},
    {l:'Novos seguidores',v:segTxt(SC.seg),s:SC.seg==null?'histórico começa em '+(desdeSeg?fmt(desdeSeg):fmt(TODAY)):'Instagram e Facebook',cur:SC.seg,prev:SP&&SP.seg,prevTxt:SP&&SP.seg!=null?segTxt(SP.seg):null}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Rede</th><th>Seguidores</th><th>Novos</th><th>Alcance</th><th>Engajamento</th><th>Publicações</th></tr></thead><tbody>${redes.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${ytPerf(r,cr)}
  <section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Posts do período · ${todos.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">${rf==='todas'?'Instagram, Facebook'+(ytp.length?' e YouTube':''):NETNAME[rf]}${S.prod?' · '+(S.prod==='—'?'sem produto':esc(S.prod)):''}. O produto vem do calendário, quando o post publicado tem o link colado lá.</p></div>
   <div class="filters">${RDF.map(([k,l])=>`<button class="chip" data-prede="${k}" aria-pressed="${rf===k}">${l}</button>`).join('')}<span class="muted" style="font-size:12px;align-self:center;margin-left:8px">Ordenar por</span>${[['alc','Alcance'],['eng','Engajamento'],['recent','Mais recentes']].map(([k,l])=>`<button class="chip" data-psort="${k}" aria-pressed="${(S.psort||'alc')===k}">${l}</button>`).join('')}</div></div>
   ${list.length?`<div class="crgrid">${list.slice(0,MAX).map(x=>x.rede==='yt'?cardYT(x):cardReal(x,x===topA?tagPill('Maior alcance do período','--ok'):x===topE?tagPill('Maior engajamento do período','--ok'):'')).join('')}</div>${list.length>MAX?`<p class="muted" style="font-size:12px">Mostrando ${MAX} de ${list.length}. Encurte o período para ver os demais.</p>`:''}`:'<p class="muted">Nenhum post publicado nesse período.</p>'}</section>`}

// YouTube com os dados reais
function cardYT(v){const sh=v.formato==='short';
  return `<article class="crcard"><div class="crprev"><a class="ytprev${sh?' vert':''}" href="${ytLink(v)}" target="_blank" rel="noopener">${imgTag(v.img,'ytimg')}<small>${sh?'Short':v.formato==='live'?'AO VIVO':durTxt(v.duracao)}</small></a></div><div class="crbody"><div><b>${esc(v.titulo)}</b><div class="muted" style="font-size:12px">YouTube · ${sh?'Short':'Vídeo'} · ${fmtLong(v.date)}</div></div>
    <div class="crm"><div><span>Visualizações</span><b>${fk(v.views)}</b></div><div><span>Curtidas</span><b>${n(v.curt)}</b></div><div><span>Comentários</span><b>${n(v.com)}</b></div><div><span>Visto em média</span><b>${v.pctVisto!=null?Math.round(v.pctVisto)+'%':'—'}</b></div></div>
    <a class="linkbtn" href="${ytLink(v)}" target="_blank" rel="noopener">Ver no YouTube ›</a></div></article>`}
const durTxt=s=>{s=Math.round(s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+x:m+':'+x};
const ytLink=v=>'https://www.youtube.com/'+(v.formato==='short'?'shorts/':'watch?v=')+encodeURIComponent(v.id);
function ytCard(v){const ret=v.pctVisto!=null?' · '+Math.round(v.pctVisto)+'% visto em média':'';
  return `<a class="ytv${v.formato==='short'?' short':''}" href="${ytLink(v)}" target="_blank" rel="noopener"><div class="th" style="background:#E3E4D3">${imgTag(v.img,'ytimg')}<small>${v.formato==='live'?'AO VIVO':v.formato==='short'?'Short':durTxt(v.duracao)}</small></div><b style="font-size:13px">${esc(v.titulo)}</b><span class="muted" style="font-size:12px">${fk(v.views)} visualizações · ${v.date?fmt(v.date):''}${ret}</span></a>`}
function redesYT(){const P=META.yt.perfil||{},V=META.yt.videos.filter(v=>v.publico);
  const grupos=[['videos','Vídeos',V.filter(v=>v.formato==='video')],['shorts','Shorts',V.filter(v=>v.formato==='short')],['lives','Ao vivo',V.filter(v=>v.formato==='live')]].filter(g=>g[2].length||g[0]==='videos');
  if(!grupos.some(g=>g[0]===S.ytsub))S.ytsub=grupos[0][0];
  const g=grupos.find(x=>x[0]===S.ytsub),ord=S.ytord||'recent';
  const lista=g[2].slice().sort(ord==='views'?(a,b)=>b.views-a.views:(a,b)=>b.ts.localeCompare(a.ts));
  const link=P.url?'https://www.youtube.com/'+encodeURIComponent(P.url):P.id?'https://www.youtube.com/channel/'+encodeURIComponent(P.id):'';
  return `${perfilTopo({capa:P.banner||'',logo:P.logo,nome:esc(P.titulo||YT.canal||'Spraytec Brasil'),sub:P.url?esc(P.url):'',stats:[[P.inscritos!=null?fk(P.inscritos):'—','inscritos'],[n(P.videos||0),'vídeos'],[fk(P.views||0),'visualizações']],link,linkTxt:'Abrir no YouTube'})}
   <div class="toolbar">${subtabs(grupos.map(([k,l,it])=>[k,l+' · '+it.length]),'ytsub','YouTube')}<div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['recent','Mais recentes'],['views','Mais vistos']].map(([k,l])=>`<button class="chip" data-ytord="${k}" aria-pressed="${ord===k}">${l}</button>`).join('')}</div></div>
   ${lista.length?`<div class="ytgrid ${S.ytsub==='shorts'?'shorts':''}">${lista.map(ytCard).join('')}</div>`:'<p class="muted">Nada publicado aqui.</p>'}`}

function ytConexao(){if(!isTeam()||!YT.configurado)return '';
  if(!YT.conectado)return `<section class="panel drivep"><div><b>Conectar o YouTube da Spraytec</b><p class="muted" style="margin:4px 0 0;font-size:13px">Antes de clicar, entre neste navegador na conta Google dona do canal. Se o canal for de uma conta de marca, o Google pergunta qual canal usar: escolha o da Spraytec.</p></div><a class="btn primary" href="/api/yt/conectar">Conectar YouTube</a></section>`;
  return `<p class="muted" style="font-size:12px;margin-top:12px">Canal ${esc(YT.canal||'')} conectado pela conta ${esc(YT.conta||'')}. <button class="linkbtn" data-act="yt-desconectar">Desconectar</button></p>`}
function ytStats(R){const D=META.yt.dias.filter(x=>inR(R,x.d));const sm=k=>D.reduce((a,x)=>a+(x[k]||0),0);
  return {v:sm('views'),h:sm('minutos')/60,ins:D.length?sm('ganhos')-sm('perdidos'):null,pub:META.yt.videos.filter(x=>x.publico&&inR(R,x.date)).length}}
function ytPerf(r,cr){if(!metaTem('yt'))return '';const A=ytStats(r),C=cr?ytStats(cr):null;
  const top=META.yt.videos.filter(x=>x.publico&&inR(r,x.date)).sort((a,b)=>b.views-a.views).slice(0,8);
  const hTxt=h=>h>=10?n(Math.round(h)):h.toFixed(1).replace('.',','),sg=v=>v==null?'—':(v>=0?'+':'')+n(v);
  return `<section class="panel"><div class="headrow" style="margin-bottom:6px"><h2 style="margin:0">YouTube</h2><span class="muted" style="font-size:12px">${esc(YT.canal||'')}</span></div>${metaRodape(['yt'],'YouTube')}
   ${kpisC([{l:'Visualizações',v:fk(A.v),s:'todos os vídeos do canal no período',cur:A.v,prev:C&&C.v,prevTxt:C&&fk(C.v)},
     {l:'Horas assistidas',v:hTxt(A.h),cur:A.h,prev:C&&C.h,prevTxt:C&&hTxt(C.h)},
     {l:'Inscritos',v:sg(A.ins),s:'ganhos menos perdidos',cur:A.ins,prev:C&&C.ins,prevTxt:C&&sg(C.ins)},
     {l:'Vídeos publicados',v:A.pub,cur:A.pub,prev:C&&C.pub,prevTxt:C&&String(C.pub)}],cr)}
   <p class="muted" style="font-size:12px;margin:6px 0 10px">O YouTube leva uns 2 dias para fechar os números de cada dia.</p>
   ${top.length?`<h3 style="font-size:14px;margin:0 0 8px">Vídeos publicados no período</h3><div class="ytgrid">${top.map(ytCard).join('')}</div>`:''}</section>`}
function avisoYTRetorno(){const q=new URLSearchParams(location.search),r=q.get('yt');if(!r)return;history.replaceState(null,'',location.pathname);
  const M={ok:'YouTube conectado. Os vídeos e os números aparecem em alguns minutos.',cancelado:'A conexão com o YouTube foi cancelada.',expirou:'O pedido de conexão venceu. Clique em Conectar de novo.','sem-config':'As chaves do Google ainda não estão no servidor.',erro:'Não foi possível conectar o YouTube: '+(q.get('msg')||'erro desconhecido')};
  S.view='redes';S.rede='youtube';toast(M[r]||M.erro);if(r==='ok')[45e3,120e3,300e3].forEach(t=>setTimeout(carregarMeta,t))}

// Google Ads com os dados reais
const CANAL_GADS={SEARCH:'Pesquisa',DISPLAY:'Display',VIDEO:'YouTube',PERFORMANCE_MAX:'Performance Max',SHOPPING:'Shopping',DEMAND_GEN:'Geração de demanda',DISCOVERY:'Geração de demanda',SMART:'Inteligente',LOCAL:'Local',MULTI_CHANNEL:'App'};
const ST_GADS={ENABLED:['Ativa','--ok'],PAUSED:['Pausada','--muted'],REMOVED:['Removida','--muted']};
function gadsTot(r){return META.gads.dias.filter(x=>inR(r,x.d)).reduce((a,x)=>({i:a.i+x.investido,im:a.im+x.impressoes,c:a.c+x.cliques,ct:a.ct+x.conversoes}),{i:0,im:0,c:0,ct:0})}
function gadsPor(lista,chave,r){const o={};lista.filter(x=>inR(r,x.d)).forEach(x=>{const t=o[x[chave]]||(o[x[chave]]={i:0,im:0,c:0,ct:0});t.i+=x.investido;t.im+=x.impressoes;t.c+=x.cliques;t.ct+=x.conversoes});return o}
function gadsSecao(r,cr){const rs=v=>'R$ '+n(Math.round(v)),rs2=v=>'R$ '+v.toFixed(2).replace('.',','),cv=v=>v%1?v.toFixed(1).replace('.',','):n(v);
  const P=gadsPor(META.gads.dias,'campanha',r),PC=cr?gadsPor(META.gads.dias,'campanha',cr):{};
  const camps=[...META.gads.campanhas.values()].filter(c=>P[c.id]||c.status==='ENABLED').map(c=>({c,t:P[c.id]||{i:0,im:0,c:0,ct:0},p:PC[c.id]})).sort((a,b)=>b.t.i-a.t.i);
  const AD=gadsPor(META.gads.adDias,'ad',r);const ads=Object.keys(AD).map(id=>({a:META.gads.anuncios.get(id)||{id,nome:'Anúncio '+id,titulos:[]},t:AD[id]})).filter(x=>x.t.im).sort((a,b)=>b.t.ct-a.t.ct||b.t.i-a.t.i).slice(0,12);
  const linha=x=>{const st=ST_GADS[x.c.status]||[x.c.status,'--muted'];return `<tr><td><b>${esc(x.c.nome||'')}</b><div class="muted" style="font-size:12px">${CANAL_GADS[x.c.tipo]||esc(x.c.tipo||'')}${x.c.orcamentoDia?' · '+rs(x.c.orcamentoDia)+'/dia':''}</div></td><td>${tagPill(st[0],st[1])}</td><td class="mono">${rs(x.t.i)}</td><td class="mono">${fk(x.t.im)}</td><td class="mono">${fk(x.t.c)}</td><td class="mono">${x.t.im?pct(x.t.c/x.t.im*100):'—'}</td><td class="mono">${cv(x.t.ct)}</td><td class="mono">${x.t.ct?rs(x.t.i/x.t.ct):'—'}</td></tr>`};
  const camp=META.gads.campanhas;
  return `<section class="panel"><div class="headrow" style="margin-bottom:6px"><div><h2 style="margin:0">Campanhas do Google Ads · ${camps.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">${esc(GADS.conta||'')} · ${perLabel()}. Conversões como contadas no Google Ads.</p></div></div>${metaRodape(['gads'],'Google Ads')}
   ${camps.length?`<div class="tablewrap" style="border:0"><table class="ap" style="min-width:820px"><thead><tr><th>Campanha</th><th>Situação</th><th>Investido</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>Conversões</th><th>Custo por conversão</th></tr></thead><tbody>${camps.map(linha).join('')}</tbody></table></div>`:`<p class="muted">Nenhuma campanha ativa ou com veiculação no período.${[...META.gads.campanhas.values()].filter(c=>c.status==='PAUSED').length?' A conta tem '+[...META.gads.campanhas.values()].filter(c=>c.status==='PAUSED').length+' campanhas pausadas.':''}</p>`}
   ${ads.length?`<h3 style="font-size:14px;margin:14px 0 6px">Anúncios que mais converteram</h3><div class="tablewrap" style="border:0"><table class="ap" style="min-width:760px"><thead><tr><th>Anúncio</th><th>Investido</th><th>Cliques</th><th>Conversões</th><th>Custo por conversão</th></tr></thead><tbody>${ads.map(x=>{const a=x.a,tit=(a.titulos||[]).slice(0,3).join(' | ')||a.nome||'Anúncio '+a.id;return `<tr><td style="max-width:420px"><b>${esc(tit)}</b><div class="muted" style="font-size:12px">${esc((camp.get(a.campanha)||{}).nome||'')}${a.grupo?' · '+esc(a.grupo):''}</div></td><td class="mono">${rs(x.t.i)}</td><td class="mono">${fk(x.t.c)}</td><td class="mono">${cv(x.t.ct)}</td><td class="mono">${x.t.ct?rs(x.t.i/x.t.ct):'—'}</td></tr>`}).join('')}</tbody></table></div><p class="muted" style="font-size:12px;margin:6px 0 0">Campanhas Performance Max não têm anúncio individual: entram só na tabela de campanhas.</p>`:''}
   ${gadsConexao()}</section>`}
function gadsConexao(){if(!isTeam())return '';
  if(!GADS.configurado)return '<p class="muted" style="font-size:13px">Google Ads: falta o token de desenvolvedor no servidor.</p>';
  if(!GADS.conectado)return `<section class="panel drivep"><div><b>Conectar o Google Ads</b><p class="muted" style="margin:4px 0 0;font-size:13px">Antes de clicar, entre neste navegador com uma conta Google que é usuária do MCC da Cancha. O portal só lê os números.</p></div><a class="btn primary" href="/api/gads/conectar">Conectar Google Ads</a></section>`;
  if(!GADS.conta)return `<section class="panel drivep"><div><b>Qual conta de anúncios é a da Spraytec?</b></div><div class="perdates"><select id="gads-conta" class="pe" aria-label="Conta do Google Ads">${(GADS.opcoes||[]).map(o=>`<option value="${esc(o.id)}">${esc(o.nome)} · ${esc(o.id)}</option>`).join('')}</select><button class="btn primary sm" data-act="gads-escolher">Usar esta</button></div></section>`;
  return `<p class="muted" style="font-size:12px;margin:8px 0 0">Google Ads conectado pela conta ${esc(GADS.email||'')}. <button class="linkbtn" data-act="gads-desconectar">Desconectar</button></p>`}
function avisoGAdsRetorno(){const q=new URLSearchParams(location.search),r=q.get('gads');if(!r)return;history.replaceState(null,'',location.pathname);
  const M={ok:'Google Ads conectado. Os números aparecem em alguns minutos.',escolher:'Google Ads conectado. Escolha a conta de anúncios da Spraytec.',cancelado:'A conexão com o Google Ads foi cancelada.',expirou:'O pedido de conexão venceu. Clique em Conectar de novo.','sem-config':'Falta o token do Google Ads no servidor.',erro:'Não foi possível conectar o Google Ads: '+(q.get('msg')||'erro desconhecido')};
  S.view='performance';S.psub='trafego';toast(M[r]||M.erro);if(r==='ok')[60e3,180e3,360e3].forEach(t=>setTimeout(carregarMeta,t))}

// Performance › Tráfego com os anúncios reais do Meta
const OBJ={OUTCOME_LEADS:'Contatos',LEAD_GENERATION:'Contatos',OUTCOME_TRAFFIC:'Tráfego',LINK_CLICKS:'Tráfego',OUTCOME_ENGAGEMENT:'Engajamento',POST_ENGAGEMENT:'Engajamento',OUTCOME_AWARENESS:'Alcance',REACH:'Alcance',BRAND_AWARENESS:'Reconhecimento',MESSAGES:'Mensagens',VIDEO_VIEWS:'Visualizações de vídeo',OUTCOME_SALES:'Vendas',CONVERSIONS:'Conversões',OUTCOME_APP_PROMOTION:'App'};
const OTIM={LINK_CLICKS:'Cliques no link',LANDING_PAGE_VIEWS:'Visualizações da página',REACH:'Alcance',IMPRESSIONS:'Impressões',POST_ENGAGEMENT:'Engajamento',THRUPLAY:'Reproduções de vídeo',LEAD_GENERATION:'Contatos (formulário)',QUALITY_LEAD:'Contatos de qualidade',CONVERSATIONS:'Conversas',OFFSITE_CONVERSIONS:'Conversões no site',PROFILE_VISIT:'Visitas ao perfil',ENGAGED_USERS:'Pessoas engajadas',VALUE:'Valor das conversões'};
// contato = formulário (lead) + conversa iniciada no WhatsApp, Direct ou Messenger
const contatosDe=a=>(a.lead||0)+(a['onsite_conversion.messaging_conversation_started_7d']||0);
function adsTotais(r){const o={};META.ads.dias.forEach(l=>{if(r&&!inR(r,l.d))return;const t=o[l.ad]||(o[l.ad]={inv:0,im:0,c:0,ct:0,de:l.d,ate:l.d});
  t.inv+=l.investido;t.im+=l.impressoes;t.c+=l.cliques;t.ct+=contatosDe(l.acoes||{});if(l.d<t.de)t.de=l.d;if(l.d>t.ate)t.ate=l.d});return o}
const somaAds=o=>Object.values(o).reduce((a,x)=>({i:a.i+x.inv,im:a.im+x.im,c:a.c+x.c,ct:a.ct+x.ct}),{i:0,im:0,c:0,ct:0});
const centavos=c=>Number(c)>0?'R$ '+n(Math.round(Number(c)/100)):'';
function orcDe(a){const s=a.adset||{},c=a.campaign||{};return centavos(s.daily_budget)?centavos(s.daily_budget)+'/dia':centavos(s.lifetime_budget)?centavos(s.lifetime_budget)+' no total':centavos(c.daily_budget)?centavos(c.daily_budget)+'/dia (campanha)':centavos(c.lifetime_budget)?centavos(c.lifetime_budget)+' no total (campanha)':'—'}
function publicoDe(t){t=t||{};const g=t.geo_locations||{};const cut=(s,k)=>s.length>k?s.slice(0,k-1)+'…':s;
  const loc=[...(g.cities||[]).map(c=>c.name+(c.radius?` (+${c.radius} km)`:'')),...(g.regions||[]).map(x=>x.name),...(g.countries||[]).map(c=>c==='BR'?'Brasil':c)];
  const cust=(g.custom_locations||[]).length;if(cust)loc.push(cust+(cust>1?' pontos':' ponto')+' no mapa');
  const ida=t.age_min?`${t.age_min} a ${t.age_max>=65?'65+':t.age_max}`:'—';const gen=(t.genders||[]).length===1?(t.genders[0]===1?'Homens':'Mulheres'):'Todos';
  const int=[];(t.flexible_spec||[]).forEach(f=>['interests','behaviors','work_positions','industries'].forEach(k=>(f[k]||[]).forEach(x=>int.push(x.name))));(t.interests||[]).forEach(x=>int.push(x.name));
  const aud=(t.custom_audiences||[]).map(x=>x.name),exc=(t.excluded_custom_audiences||[]).map(x=>x.name);
  const adv=t.targeting_automation&&t.targeting_automation.advantage_audience;
  const quem=[...(aud.length?['Públicos: '+aud.join(', ')]:[]),...(int.length?['Interesses: '+int.slice(0,8).join(', ')+(int.length>8?` e mais ${int.length-8}`:'')]:[])].join(' · ')||'Aberto';
  return {loc:cut(loc.join(', ')||'—',140),ida,gen,quem:quem+(adv?' (Advantage+ pode ampliar)':''),excl:exc.join(', ')||'—',
    pos:(t.publisher_platforms||[]).map(x=>({facebook:'Facebook',instagram:'Instagram',audience_network:'Audience Network',messenger:'Messenger'}[x]||x)).join(', ')||'Automático (Advantage+)'}}
function adRealPreview(a){const cr=a.creative||{};const im=cr.image_url||orgImg(cr.instagram_permalink_url)||cr.thumbnail_url;const b=(cr.body||'').split('\n').find(l=>l.trim())||'';
  return `<div class="pv"><div class="hd">${avS()}<span><b>Spraytec Brasil</b><br><span class="sm">Patrocinado</span></span></div>${b?`<div class="txt">${esc(b.slice(0,160))}</div>`:''}<div class="img adimg" style="--bg:#E3E4D3">${imgTag(im,'pvimg')}${cr.object_type==='VIDEO'?'<span class="cnt">▶ vídeo</span>':''}<span>${esc(cr.title||a.name||'')}</span></div><div class="ctabar"><span class="sm">${esc(OBJ[(a.campaign||{}).objective]||'')}</span><b>Saiba mais ›</b></div></div>`}
function midiaReal(){const r={de:S.per.de,ate:S.per.ate},cr=cmpRange();const A=adsTotais(r),TM=somaAds(A),CM=cr?somaAds(adsTotais(cr)):null;const temM=metaTem('ads'),temG=metaTem('gads'),GT=gadsTot(r),GC=cr?gadsTot(cr):null;
  const soma=(a,b)=>({i:a.i+b.i,im:a.im+b.im,c:a.c+b.c,ct:a.ct+b.ct}),T=temG?soma(TM,GT):TM,C=cr?(temG?soma(CM,GC):CM):null,cOk=C&&(C.i||C.im);
  const plats=[temM&&'Meta Ads',temG&&'Google Ads'].filter(Boolean).join(' e ');
  const meta=plano&&plano.dados&&plano.dados.metas?plano.dados.metas.cpl:null;const rs=v=>'R$ '+n(Math.round(v)),rs2=v=>'R$ '+v.toFixed(2).replace('.',',');
  const ads=Object.keys(A).filter(id=>A[id].inv||A[id].im).map(id=>{const t=A[id];return {a:META.ads.anuncios.get(id)||{id,name:'Anúncio '+id},...t,ctr:t.im?t.c/t.im*100:0,cpl:t.ct?t.inv/t.ct:null}});
  const ord={cont:(x,y)=>y.ct-x.ct||y.inv-x.inv,cpl:(x,y)=>(x.cpl??1e9)-(y.cpl??1e9),ctr:(x,y)=>y.ctr-x.ctr,inv:(x,y)=>y.inv-x.inv}[S.cord||'cont'];
  const list=ads.slice().sort(ord),best=ads.filter(x=>x.cpl).sort((x,y)=>x.cpl-y.cpl)[0];
  const conj=[...new Map(ads.map(x=>[(x.a.adset||{}).id||x.a.id,x.a])).values()];
  return `<h2 style="font-size:16px;margin:4px 0 0">Mídia paga · ${plats}</h2>
  ${kpisC([{l:'Investimento',v:rs(T.i),s:plats,cur:T.i,prev:cOk?C.i:null,prevTxt:cOk?rs(C.i):null},{l:'Impressões',v:fk(T.im),cur:T.im,prev:cOk?C.im:null,prevTxt:cOk?fk(C.im):null},
    {l:'Cliques no link',v:fk(T.c),s:'CTR '+(T.im?pct(T.c/T.im*100):'—'),cur:T.c,prev:cOk?C.c:null,prevTxt:cOk?fk(C.c):null},{l:'Contatos',v:n(Math.round(T.ct)),s:temG?'formulários, conversas e conversões do Google':'formulários e conversas iniciadas',cur:T.ct,prev:cOk?C.ct:null,prevTxt:cOk?n(Math.round(C.ct)):null},
    {l:'Custo por contato',v:T.ct?rs(T.i/T.ct):'—',s:meta?'meta: até R$ '+meta:'',cur:T.ct?T.i/T.ct:null,prev:cOk&&C.ct?C.i/C.ct:null,prevTxt:cOk&&C.ct?rs(C.i/C.ct):null,low:true}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Plataforma</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>Custo por clique</th><th>Contatos</th><th>Custo por contato</th></tr></thead><tbody>
   ${[temM&&['Meta Ads',TM],temG&&['Google Ads',GT]].filter(Boolean).map(([l,x])=>`<tr><td>${l}</td><td class="mono">${rs(x.i)}</td><td class="mono">${fk(x.im)}</td><td class="mono">${fk(x.c)}</td><td class="mono">${x.c?rs2(x.i/x.c):'—'}</td><td class="mono">${n(Math.round(x.ct))}</td><td class="mono">${x.ct?rs(x.i/x.ct):'—'}</td></tr>`).join('')}
   ${temM?'':'<tr><td>Meta Ads</td><td colspan="6" class="muted">Sem dados do Meta.</td></tr>'}${temG?'':'<tr><td>Google Ads</td><td colspan="6" class="muted">Integração pendente: entra quando o acesso for liberado.</td></tr>'}</tbody></table></div>
  ${temG?gadsSecao(r,cr):gadsConexao()}
  ${temM?`<section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Anúncios que veicularam · ${ads.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Gerenciador de Anúncios da Meta · ${perLabel()}.</p></div>
   <div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['cont','Contatos'],['cpl','Custo por contato'],['ctr','Taxa de cliques'],['inv','Investimento']].map(([k,l])=>`<button class="chip" data-cord="${k}" aria-pressed="${(S.cord||'cont')===k}">${l}</button>`).join('')}</div></div>
   ${list.length?`<div class="crgrid">${list.map(x=>{const a=x.a,pb=publicoDe((a.adset||{}).targeting),lk=(a.creative||{}).instagram_permalink_url;
     const flag=x===best?tagPill('Melhor custo por contato','--ok'):meta&&x.cpl>meta?tagPill('Acima da meta de R$ '+meta,'--bad'):'';
     return `<article class="crcard"><div class="crprev">${adRealPreview(a)}</div><div class="crbody">
      <div><b>${esc(a.name)}</b><div class="muted" style="font-size:12px">${esc((a.campaign||{}).name||'')}${OBJ[(a.campaign||{}).objective]?' · '+OBJ[a.campaign.objective]:''} · ${fmt(x.de)} a ${fmt(x.ate)}</div></div>
      <div>${a.effective_status==='ACTIVE'?tagPill('Ativo','--ok'):tagPill('Pausado','--muted')} ${flag}</div>
      <div class="crm"><div><span>Investido</span><b>${rs(x.inv)}</b></div><div><span>Impressões</span><b>${n(x.im)}</b></div><div><span>Cliques</span><b>${n(x.c)}</b></div><div><span>Taxa de cliques</span><b>${pct(x.ctr)}</b></div><div><span>Contatos</span><b>${n(x.ct)}</b></div><div><span>Custo por contato</span><b class="${meta&&x.cpl>meta?'bad':''}">${x.cpl?rs(x.cpl):'—'}</b></div></div>
      <div class="aud"><span class="eyebrow">Público</span><div>${esc(pb.quem)}</div><div class="muted" style="font-size:12px">${esc(pb.loc)} · ${pb.ida} anos · ${pb.gen} · ${esc(pb.pos)}</div></div>
      ${lk?`<a class="linkbtn" href="${esc(lk)}" target="_blank" rel="noopener">Ver o post ›</a>`:''}</div></article>`}).join('')}</div>`:'<p class="muted">Nenhum anúncio veiculou nesse período.</p>'}</section>`:''}
  ${temM&&conj.length?`<section class="panel"><h2>Públicos dos conjuntos de anúncios</h2><div class="tablewrap" style="border:0"><table class="ap" style="min-width:900px"><thead><tr><th>Conjunto</th><th>Onde</th><th>Idade</th><th>Quem</th><th>Fora do público</th><th>Posicionamento</th><th>Otimizado para</th><th>Orçamento</th></tr></thead><tbody>
   ${conj.map(a=>{const s=a.adset||{},pb=publicoDe(s.targeting);return `<tr><td><b>${esc(s.name||a.name)}</b><div class="muted" style="font-size:12px">${esc((a.campaign||{}).name||'')}</div></td><td style="max-width:220px">${esc(pb.loc)}</td><td>${pb.ida} · ${pb.gen}</td><td style="max-width:260px">${esc(pb.quem)}</td><td style="max-width:200px">${esc(pb.excl)}</td><td>${esc(pb.pos)}</td><td>${OTIM[s.optimization_goal]||'—'}</td><td class="mono">${orcDe(a)}</td></tr>`}).join('')}
  </tbody></table></div></section>`:''}`}

// Acervo com os dados reais: stories que já saíram do ar e anúncios que não são post do perfil (dark posts)
function acvStoriesReal(){const old=META.stories.filter(s=>Date.parse(s.ts)<=Date.now()-864e5).sort((a,b)=>b.ts.localeCompare(a.ts));
  const cats=[['img','Imagens',old.filter(s=>s.tipo!=='VIDEO').length],['vid','Vídeos',old.filter(s=>s.tipo==='VIDEO').length]];
  const vis=old.filter(s=>acvMatch('stories',s.tipo==='VIDEO'?'vid':'img','story '+s.hora+' '+fmt(s.date)));const dates=[...new Set(vis.map(s=>s.date))];
  const desde=META.stories.reduce((a,s)=>s.date<a?s.date:a,'9999');
  return `${acvToolbar('stories',cats)}${dates.length?gridGroups(dates.map(d=>({t:fmtLong(d),items:vis.filter(s=>s.date===d).map(s=>acard(`<div class="stthumb">${imgTag(s.img,'stimg')}<span class="sttxt">Story das ${s.hora}</span>${s.tipo==='VIDEO'?'<span class="stplay">▶</span>':''}</div>`,ktag(s.tipo==='VIDEO'?'VÍDEO':'IMAGEM','--k-post'),'Story das '+s.hora,`alcance ${s.alc!=null?n(s.alc):'—'} · ${s.resp} resp.`,s.hora,s.drive?`data-arq="${esc(s.drive)}" tabindex="0" role="button"`:''))})),'stories')
    :`<p class="muted">${old.length?'Nenhum story com esse filtro.':'Os stories aparecem aqui 24 h depois de publicados, quando saem do ar.'+(META.stories.length?' A captura começou em '+fmt(desde)+'.':'')}</p>`}
   <p class="muted" style="font-size:12px;margin:0">O portal guarda os números de cada story enquanto ele está no ar (o Instagram apaga depois de 24 h). As imagens ficam na pasta Stories do Drive.</p>`}
function acvDarkReal(){const org=new Set(META.posts.map(x=>x.nl)),tot=adsTotais(null);
  const seis=addDays(TODAY,-183);
  const L=[...META.ads.anuncios.values()].filter(a=>a.effective_status==='ACTIVE'||(tot[a.id]&&tot[a.id].ate>=seis)).filter(a=>{const u=(a.creative||{}).instagram_permalink_url;return !(u&&org.has(normLink(u)))&&!/^(post|publica[cç][aã]o) do (instagram|facebook)/i.test(a.name||'')});
  const st=a=>a.effective_status==='ACTIVE'?'Ativo':'Encerrado';
  const cats=[['Ativo','Ativos',L.filter(a=>st(a)==='Ativo').length],['Encerrado','Encerrados',L.filter(a=>st(a)!=='Ativo').length]];
  const ult=a=>String((tot[a.id]&&tot[a.id].ate)||a.created_time||'').slice(0,10),txtA=a=>(a.name||'')+' '+((a.campaign||{}).name||'')+' '+((a.creative||{}).body||'')+' '+((a.creative||{}).title||''),PA=new Map(L.map(a=>[a.id,prodDe('ad:'+a.id,txtA(a),null)]));
  const vis=L.filter(a=>prodOkL(PA.get(a.id).l)&&perOkA(ult(a))&&acvMatch('dark',st(a),txtA(a)+' '+PA.get(a.id).l.join(' ')));vis.sort((x,y)=>ult(y).localeCompare(ult(x)));
  return `${acvToolbar('dark',cats,prodFiltro()+perFiltro(L.map(ult))+prodToggle())}${vis.length?`<div class="agrid">${vis.map(a=>{const t=tot[a.id];
    return acard(adRealPreview(a),ktag(st(a).toUpperCase(),st(a)==='Ativo'?'--ok':'--muted'),esc(a.name),(t?`${fk(t.im)} impressões · ${n(t.c)} cliques`:'sem veiculação registrada')+((a.campaign||{}).name?' · '+esc(a.campaign.name):''),t?fmt(t.de)+' a '+fmt(t.ate):'','',prodLinha('ad:'+a.id,PA.get(a.id)))}).join('')}</div>`:`<p class="muted">${L.length?'Nenhum anúncio com esse filtro.':'Nenhum dark post nos últimos 6 meses: os anúncios foram posts do perfil impulsionados.'}</p>`}
   <p class="muted" style="font-size:12px;margin:0">Anúncios que rodam só como mídia paga, do Gerenciador de Anúncios da Meta (últimos 6 meses).</p>`}

// ARQUIVOS NO GOOGLE DRIVE: enviados pelo portal, guardados no Drive da Spraytec e vistos aqui dentro.
// Ninguém precisa abrir o Drive nem ter acesso a ele: o portal mostra o arquivo para quem pode ver o item.
let DRIVE={conectado:false,configurado:false},GA4={conectado:false,configurado:false},YT={conectado:false,configurado:false},GADS={conectado:false,configurado:false},materiais=[];
const PASTAS_M=['Fotos de campo','Produtos','Institucional','Eventos','Guia de marca'];
const arqUrl=id=>'/api/arquivos/'+encodeURIComponent(id)+'/conteudo';
const miniUrl=(id,t)=>'/api/arquivos/'+encodeURIComponent(id)+'/miniatura?t='+(t||400);
const tipoArq=a=>/^image\//.test(a.tipo||'')?'img':/^video\//.test(a.tipo||'')?'video':/pdf/.test(a.tipo||'')?'pdf':'doc';
const tamTxt=b=>b>=1e9?(b/1e9).toFixed(1).replace('.',',')+' GB':b>=1e6?(b/1e6).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1e3))+' KB';
const arqVivos=x=>((x&&x.arquivos)||[]).filter(a=>!a.removido);
const versaoAtual=x=>{const L=arqVivos(x);return L.length?Math.max(...L.map(a=>a.v||1)):0};
// peças da versão mais recente (imagens e vídeos), na ordem em que foram enviadas
// A versão para postar de um vídeo (a.leve) acompanha o original: não conta como peça nem lâmina.
function pecasAtuais(p){const v=versaoAtual(p);return arqVivos(p).filter(a=>!a.leve&&(a.v||1)===v&&['img','video'].includes(tipoArq(a)))}
function capaDe(p){const a=pecasAtuais(p)[0];return a?miniUrl(a.id,800):null}
function acharArq(id){for(const l of [posts,videos,demandas])for(const x of l){const a=(x.arquivos||[]).find(y=>y.id===id);if(a)return a}
  const st=META&&META.stories.find(x=>x.drive===id);if(st)return {id,nome:`Story de ${fmtLong(st.date)} às ${st.hora}`,tipo:st.driveTipo||'image/jpeg',por:'Instagram',q:st.alc!=null?'alcance '+n(st.alc):''};
  return materiais.find(m=>m.id===id)||null}
function arqThumb(a){const t=tipoArq(a);return `<span class="arqth ${t}">${t==='img'||t==='video'?`<img src="${miniUrl(a.id,400)}" alt="" loading="lazy" data-falha>`:''}<i>${t==='video'?'▶':t==='pdf'?'PDF':t==='img'?'':'ARQ'}</i></span>`}
function arqTile(a,ref){return `<button type="button" class="arq" data-arq="${esc(a.id)}" data-ref="${esc(ref)}" title="${esc(a.nome)}">${arqThumb(a)}<span class="arqn">${esc(a.nome)}</span><span class="arqm">${tamTxt(a.tam||0)} · ${esc((a.por||'').split(' ')[0])}${a.q?' · '+esc(a.q):''}</span></button>`}
// Bloco de arquivos de um item: o que já foi enviado (por versão, nos posts) e a área para enviar mais.
function arqSecao(ref,x,o){o=o||{};const L=arqVivos(x),pode=o.pode&&DRIVE.conectado;
  if(!L.length&&!o.pode)return '';
  let corpo='';
  if(o.versoes&&L.length){const vs=[...new Set(L.map(a=>a.v||1))].sort((a,b)=>b-a);
    corpo=vs.map((v,i)=>{const G=L.filter(a=>(a.v||1)===v);const aprov=['aprovado','agendado','publicado'].includes(x.status)&&x.vEnviada===v;
      const lbl=`Versão ${v}${aprov?' · aprovada':(x.vEnviada||0)>=v?' · enviada para aprovação':' · ainda não enviada'}${G.every(a=>a.antiga)?' · guardada em "Versões antigas" no Drive':''}`;const grid=`<div class="arqgrid">${G.map(a=>arqTile(a,ref)).join('')}</div>`;
      return i===0?`<div class="arqv"><span class="muted" style="font-size:12px">${lbl}</span>${grid}</div>`:`<details class="arqv"><summary class="muted" style="font-size:12px">${lbl}</summary>${grid}</details>`}).join('')}
  else if(L.length)corpo=`<div class="arqgrid">${L.map(a=>arqTile(a,ref)).join('')}</div>`;
  // Arquivo que já está no Drive: cola o link (ou usa o link do calendário) e o Google copia para a pasta do item.
  const pend=o.driveLink?linksPendentes(x):[],sug=pend.length===1?pend[0]:'';
  const dl=o.driveLink&&pode&&isTeam()?`<div class="drvlink">${sug?`<button class="btn sm primary" data-act="drive-link" data-ref="${esc(ref)}" data-link="${esc(sug)}">Usar o arquivo do link do calendário</button>`:pend.length>1?`<button class="btn sm primary" data-act="drive-links" data-id="${esc(x.id)}">Usar os ${pend.length} arquivos dos links do calendário</button>`:''}<div class="ler"><input class="pe" id="dl-${esc(ref.replace(':','-'))}" placeholder="Ou cole o link de um arquivo do Google Drive" aria-label="Link do arquivo no Google Drive"><button class="btn sm" data-act="drive-link" data-ref="${esc(ref)}">Usar do Drive</button></div></div>`:'';
  const up=pode?`<label class="arqdrop" data-drop="${esc(ref)}"><input type="file" multiple data-enviar="${esc(ref)}" hidden><b>${o.rotulo||'Enviar arquivos'}</b><span class="muted">Arraste aqui ou clique para escolher. O arquivo vai para o Drive da Spraytec${o.dica?'. '+o.dica:''}.</span></label>${dl}`
    :o.pode&&!DRIVE.conectado?'<p class="muted" style="font-size:12px;margin:0">O Google Drive da Spraytec ainda não está conectado ao portal.</p>':o.trava?`<p class="muted" style="font-size:12px;margin:0">${o.trava}</p>`:'';
  return `<div class="arqsec"><div class="eyebrow" style="margin-bottom:6px">${o.titulo||'Arquivos'}${L.length?' · '+L.length:''}</div>${corpo}${o.extra||''}<div data-envios="${esc(ref)}">${envList(ref)}</div>${up}</div>`}

// ---------- envio (em partes de 8 MB, com nova tentativa se a conexão cair) ----------
const ENVIOS=[];
function envList(ref){const L=ENVIOS.filter(x=>x.ref===ref&&!x.ok);return L.length?`<div class="envios">${L.map(x=>`<div class="envio ${x.erro?'erro':''}" id="env-${x.id}"><span class="envn">${esc(x.nome)}</span>${x.erro?`<span class="badt">${esc(x.erro)}</span>`:`<span class="mono">${Math.floor(x.enviado/x.tam*100)}%</span><i style="width:${x.enviado/x.tam*100}%"></i>`}</div>`).join('')}</div>`:''}
function envAtualizar(ref){document.querySelectorAll('[data-envios]').forEach(el=>{if(el.dataset.envios===ref)el.innerHTML=envList(ref)})}
const TIPO_EXT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',heic:'image/heic',mp4:'video/mp4',mov:'video/quicktime',pdf:'application/pdf',zip:'application/zip',psd:'image/vnd.adobe.photoshop',ai:'application/postscript'};
const tipoDe=f=>f.type||TIPO_EXT[(f.name.split('.').pop()||'').toLowerCase()]||'application/octet-stream';
async function enviarUm(f,it){
  const ini=await api('/api/arquivos/iniciar',{ref:it.ref,nome:f.name,tipo:tipoDe(f),tam:f.size});
  let pos=0,j=null;
  for(;;){const fim=Math.min(f.size,pos+ini.parte);let tent=0;
    for(;;){try{const r=await fetch('/api/arquivos/enviar/'+ini.envio,{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/octet-stream','x-inicio':String(pos)},body:f.slice(pos,fim)});
        j=await r.json().catch(()=>({}));
        if(r.status===409&&typeof j.recebido==='number'&&j.recebido!==pos){pos=j.recebido;break}
        if(!r.ok){const e=new Error(j.erro||'O envio falhou.');e.final=r.status<500;throw e}
        pos=j.recebido;break}
      catch(e){if(e.final||++tent>=3)throw e;await new Promise(ok=>setTimeout(ok,2000*tent))}}
    it.enviado=pos;const el=document.getElementById('env-'+it.id);if(el){const pc=el.querySelector('.mono'),br=el.querySelector('i');if(pc)pc.textContent=Math.floor(pos/it.tam*100)+'%';if(br)br.style.width=(pos/it.tam*100)+'%'}
    if(j&&j.feito)return j}}
async function enviarArquivos(ref,files){
  if(!DRIVE.conectado){toast('O Google Drive da Spraytec ainda não está conectado ao portal.');return}
  const lista=[...files].map(f=>({f,it:{id:Math.random().toString(36).slice(2,9),ref,nome:f.name,tam:Math.max(1,f.size),enviado:0}}));
  ENVIOS.splice(0,ENVIOS.length,...ENVIOS.filter(x=>!(x.ref===ref&&x.erro)));lista.forEach(x=>ENVIOS.push(x.it));envAtualizar(ref);
  let ult=null,okN=0;
  for(const {f,it} of lista){try{ult=await enviarUm(f,it);it.ok=true;okN++}catch(e){it.erro=e.message||'O envio falhou.'}envAtualizar(ref)}
  if(ult&&ult.dados){aplicar(ult);render()}
  const ruins=lista.filter(x=>x.it.erro).length;
  toast(ruins?`${okN} enviado${okN===1?'':'s'}, ${ruins} com problema. Veja a mensagem ao lado do arquivo.`:okN===1?'Arquivo enviado para o Drive.':`${okN} arquivos enviados para o Drive.`)}
window.addEventListener('beforeunload',e=>{if(ENVIOS.some(x=>!x.ok&&!x.erro)){e.preventDefault();e.returnValue=''}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[data-enviar]')&&t.files&&t.files.length){enviarArquivos(t.dataset.enviar,t.files);t.value=''}
  if(t&&t.id==='m-pasta'){S.mpasta=t.value;render()}});
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-drop]');if(z){e.preventDefault();z.classList.add('sobre')}});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('sobre')});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();z.classList.remove('sobre');if(e.dataTransfer&&e.dataTransfer.files.length)enviarArquivos(z.dataset.drop,e.dataTransfer.files)});

// ---------- visor: imagem, vídeo e PDF dentro do portal, com setas entre as peças ----------
function renderVisor(){let L=document.getElementById('visor');
  if(!S.visor){if(L)L.remove();return}
  const {ids,i,ref}=S.visor,a=acharArq(ids[i]);if(!a){S.visor=null;return renderVisor()}
  if(!L){L=document.createElement('div');L.id='visor';document.body.appendChild(L)}
  const t=tipoArq(a),src=arqUrl(a.id),pode=ref&&(isTeam()||a.porId===EU.id);
  const corpo=t==='img'?`<img src="${src}" alt="${esc(a.nome)}">`:t==='video'?`<video src="${src}" controls playsinline preload="metadata"></video>`
    :`<div class="visdoc"><b>${esc(a.nome)}</b>${t==='pdf'?`<a class="btn primary" href="${src}" target="_blank" rel="noopener">Abrir o PDF</a>`:'<span class="muted">Este tipo de arquivo não abre no navegador. Use Baixar.</span>'}</div>`;
  L.innerHTML=`<div class="visfundo" data-vis="fechar"></div><div class="viscaixa" role="dialog" aria-modal="true" aria-label="${esc(a.nome)}">
   <div class="vistopo"><div style="min-width:0"><b class="visn">${esc(a.nome)}</b><div class="muted" style="font-size:12px">${a.v?'Versão '+a.v+' · ':''}${esc(a.por||'')}${a.q?' · '+esc(a.q):''}${a.tam?' · '+tamTxt(a.tam):''}</div></div>
    <div class="actions"><a class="btn sm" href="${src}?baixar=1">Baixar</a>${pode?`<button class="btn sm" data-vis="remover">Tirar do portal</button>`:''}<button class="btn sm" data-vis="fechar">Fechar</button></div></div>
   <div class="viscorpo">${ids.length>1?'<button class="visnav ant" data-vis="ant" aria-label="Anterior">‹</button>':''}${corpo}${ids.length>1?'<button class="visnav prox" data-vis="prox" aria-label="Próximo">›</button>':''}</div>
   ${ids.length>1?`<div class="muted" style="text-align:center;font-size:12px">${i+1} de ${ids.length}</div>`:''}</div>`}
document.addEventListener('click',e=>{
  const v=e.target.closest&&e.target.closest('[data-vis]');
  if(v&&S.visor){e.stopPropagation();e.preventDefault();const V=S.visor,k=v.dataset.vis;
    if(k==='fechar')S.visor=null;else if(k==='ant')V.i=(V.i-1+V.ids.length)%V.ids.length;else if(k==='prox')V.i=(V.i+1)%V.ids.length;
    else if(k==='remover'&&confirm('Tirar este arquivo do portal? Ele continua guardado no Drive da Spraytec.')){const id=V.ids[V.i];S.visor=null;renderVisor();acao('arquivo-remover',{ref:V.ref,id});return}
    renderVisor();return}
  const t=e.target.closest&&e.target.closest('[data-arq]');
  if(t){e.stopPropagation();e.preventDefault();const box=t.closest('.arqgrid,.rgroup,.rings')||document;const ids=[...box.querySelectorAll('[data-arq]')].map(x=>x.dataset.arq);
    S.visor={ids,i:Math.max(0,ids.indexOf(t.dataset.arq)),ref:t.dataset.ref};renderVisor()}},true);
document.addEventListener('keydown',e=>{if(!S.visor&&(e.key==='Enter'||e.key===' ')&&e.target&&e.target.matches&&e.target.matches('[data-arq]:not(button)')){e.preventDefault();e.target.click();return}if(!S.visor)return;if(e.key==='Escape'){S.visor=null;renderVisor()}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const V=S.visor;V.i=(V.i+(e.key==='ArrowRight'?1:-1)+V.ids.length)%V.ids.length;renderVisor()}});

// ---------- conexão do Drive (Cancha) e materiais do Acervo ----------
function drivePainel(){if(!isTeam())return '';
  if(!DRIVE.configurado)return '<section class="panel drivep"><div><b>Google Drive</b><p class="muted" style="margin:4px 0 0;font-size:13px">As chaves do Google ainda não estão no servidor.</p></div></section>';
  if(!DRIVE.conectado)return `<section class="panel drivep"><div><b>Conectar o Google Drive da Spraytec</b><p class="muted" style="margin:4px 0 0;font-size:13px">Antes de clicar, entre neste navegador na conta Google da Spraytec. O portal grava só na pasta "Portal Spraytec", que ele mesmo cria, e lê os arquivos que vocês indicarem pelo link.</p></div><a class="btn primary" href="/api/drive/conectar">Conectar Google Drive</a></section>`;
  const s=S.driveSit;if(!s&&!S.driveSitPedido){S.driveSitPedido=true;api('/api/drive/situacao').then(j=>{S.driveSit=j;if(S.view==='acervo')render()}).catch(()=>{})}
  const uso=s&&s.usado!=null?' · '+tamTxt(s.usado)+(s.limite?' de '+tamTxt(s.limite):'')+' usados':'';
  return `<section class="panel drivep"><div><b>Google Drive conectado</b><div class="muted" style="font-size:13px">${esc(DRIVE.conta||'')}${uso}${s&&s.limite&&s.usado/s.limite>.85?' · <span class="badt">pouco espaço livre</span>':''}${s&&s.erro?' · <span class="badt">'+esc(s.erro)+'</span>':''}</div>${DRIVE.leitura?'':'<div class="muted" style="font-size:12px;margin-top:4px">Para usar vídeos e fotos que já estão no Drive pelo link (sem baixar e subir de novo), conecte de novo na conta da Spraytec e aceite a leitura dos arquivos. Nada do que já está no portal muda.</div>'}</div><div class="actions">${DRIVE.leitura?'':'<a class="btn sm primary" href="/api/drive/conectar">Conectar de novo</a>'}<button class="btn sm" data-act="drive-desconectar">Desconectar</button></div></section>`}
function acvMateriaisReal(){const M=materiais.filter(m=>!m.removido);
  const pastas=[...new Set([...PASTAS_M,...M.map(m=>m.pasta),...(S.mpasta?[S.mpasta]:[])])];
  const cats=pastas.map(p=>[p,p,M.filter(m=>m.pasta===p).length]);
  const vis=M.filter(m=>acvMatch('materiais',m.pasta,m.nome+' '+m.pasta+' '+(m.por||'')));
  const sel=S.acat.materiais&&S.acat.materiais!=='todos'?S.acat.materiais:null,dest=S.mpasta||sel||pastas[0];
  const up=(isTeam()||isM())?(DRIVE.conectado?`<div class="arqup"><div class="perdates"><label for="m-pasta" class="muted">Enviar para a pasta</label><select id="m-pasta" class="pe">${pastas.map(p=>`<option ${p===dest?'selected':''}>${esc(p)}</option>`).join('')}</select><button class="linkbtn" data-act="m-nova-pasta">+ Nova pasta</button></div>
    <label class="arqdrop" data-drop="m:${esc(dest)}"><input type="file" multiple data-enviar="m:${esc(dest)}" hidden><b>Enviar materiais para "${esc(dest)}"</b><span class="muted">Fotos, logos, vídeos e documentos. Arraste aqui ou clique para escolher.</span></label><div data-envios="m:${esc(dest)}">${envList('m:'+dest)}</div></div>`
    :'<p class="muted">O Google Drive da Spraytec ainda não está conectado ao portal.</p>'):'';
  return `${drivePainel()}${up}${acvToolbar('materiais',cats)}${vis.length?gridGroups(pastas.map(p=>({t:p,items:vis.filter(m=>m.pasta===p).map(m=>acard(arqThumb(m),ktag(tipoArq(m)==='img'?'FOTO':tipoArq(m)==='video'?'VÍDEO':tipoArq(m)==='pdf'?'PDF':'ARQUIVO','--k-design'),esc(m.nome),tamTxt(m.tam||0)+' · '+esc(m.por||''),esc(m.q||''),`data-arq="${esc(m.id)}" data-ref="m:${esc(m.pasta)}" tabindex="0" role="button"`))}))):`<p class="muted">${M.length?'Nenhum material com esse filtro.':'Nenhum material enviado ainda.'}</p>`}`}
function avisoDriveRetorno(){const q=new URLSearchParams(location.search),r=q.get('drive');if(!r)return;history.replaceState(null,'',location.pathname);
  const M={ok:'Google Drive conectado. A pasta "Portal Spraytec" foi criada no Drive.',cancelado:'A conexão com o Drive foi cancelada.',expirou:'O pedido de conexão venceu. Clique em Conectar de novo.','sem-config':'As chaves do Google ainda não estão no servidor.',erro:'Não foi possível conectar o Drive: '+(q.get('msg')||'erro desconhecido')};
  S.view='acervo';S.asub='materiais';toast(M[r]||M.erro)}

let LINKS=[];
function related(ref){return LINKS.filter(l=>l[0]===ref||l[1]===ref).map(l=>l[0]===ref?l[1]:l[0]).filter((x,i,a)=>a.indexOf(x)===i)}
function resolve(ref){const [k,id]=ref.split(':');
  if(k==='p'){const p=posts.find(x=>x.id===id);if(!p)return null;const tc=tipoCal(p);return {k,id,t:p.titulo,tipo:{post:NETNAME[p.rede],email:'E-mail',design:'Design',video:'Vídeo',midia:'Mídia paga'}[tc],kc:tc==='midia'?'--muted':'--k-'+tc,st:stInfo(p).l,date:p.date,attr:`data-open="${id}"`}}
  if(k==='d'){const d=demandas.find(x=>x.id===id);return d&&{k,id,t:d.t,tipo:'Demanda '+QUEM[d.quem],kc:'--k-'+d.quem,st:d.feito?'Concluída':'Em aberto',date:d.data,attr:`data-dem="${id}"`}}
  const v=videos.find(x=>x.id===id);return v&&{k,id,t:'Pauta: '+v.titulo,tipo:'Vídeo',kc:'--k-video',st:(STAGES.find(s=>s[0]===v.stage)||[0,'Entregue'])[1],date:null,attr:`data-video="${id}"`}}
function linksSection(ref){let r=related(ref).map(resolve).filter(Boolean);if(S.role==='produtora')r=r.filter(x=>x.k==='v');if(!r.length)return'';
  return `<div><div class="eyebrow" style="margin-bottom:6px">Ligado a · ${r.length}</div><div class="list">${r.map(x=>`<div class="row clickable" ${x.attr}><span class="kt" style="--kc:var(${x.kc});min-width:86px">${esc(x.tipo.toUpperCase())}</span><div class="grow t">${esc(x.t)}</div><span class="muted mono" style="font-size:12px">${x.date?fmt(x.date):''}</span><span class="muted" style="font-size:12px;white-space:nowrap">${x.st}</span></div>`).join('')}</div></div>`}

// CONVERSAS (tipo Slack, por tema)
let threads=[];
function unreadCount(){const me=isM()?'spraytec':'cancha';return threads.reduce((a,t)=>a+t.unread[me],0)}
function chatSection(){
  const me=isM()?'spraytec':'cancha';
  if(!threads.length)return `<section class="panel"><h2>Conversas com a Cancha</h2><p class="muted">Nenhuma conversa ainda.</p><button class="btn" data-act="novo-tema">Novo tema</button>${S.novoTema?`<div class="newt" style="margin-top:8px"><input type="text" id="nt" placeholder="Tema da conversa" aria-label="Tema da conversa"><button class="btn primary" data-act="criar-tema">Criar</button></div>`:''}</section>`;
  const th=threads.find(t=>t.id===S.thread)||threads[0];S.thread=th.id;
  if(th.unread[me]){th.unread[me]=0;acaoSilenciosa('conversa-lida',{id:th.id})}
  const r=th.ref&&resolve(th.ref);
  return `<section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">${isTeam()?'Conversas com a Spraytec':'Conversas com a Cancha'}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Cada conversa tem um tema, e tudo fica registrado.</p></div></div>
  <div class="chat">
   <aside class="threads">${S.novoTema?`<div class="newt"><input type="text" id="nt" placeholder="Tema da conversa" aria-label="Tema da conversa"><button class="btn primary" data-act="criar-tema">Criar</button></div>`:`<button class="btn" data-act="novo-tema">Novo tema</button>`}
    ${threads.map(t=>{const last=t.msgs[t.msgs.length-1];const un=t.unread[me];return `<button class="thr" data-thread="${t.id}" aria-pressed="${t.id===th.id}"><span class="tt"><span># ${esc(t.tema)}</span>${un?`<span class="badge">${un}</span>`:''}</span><span class="ls">${last?esc(last.nome+': '+last.txt):'Sem mensagens ainda'}</span></button>`}).join('')}</aside>
   <div class="conv"><div class="convh"><b># ${esc(th.tema)}</b>${S.linkPick?`<span class="linkpick"><label for="ld" class="muted" style="font-size:12px">Demanda</label><select id="ld">${demandas.filter(x=>!x.feito||'d:'+x.id===th.ref).sort((a,b)=>a.data.localeCompare(b.data)).map(x=>`<option value="d:${x.id}" ${'d:'+x.id===th.ref?'selected':''}>${fmt(x.data)} · ${esc(x.t)} (${QUEM[x.quem]})</option>`).join('')}</select><button class="btn primary" data-act="ligar-salvar">Ligar</button>${th.ref?'<button class="btn" data-act="ligar-remover">Remover ligação</button>':''}<button class="btn" data-act="ligar-cancelar">Cancelar</button></span>`
      :r?`<button class="lnk" ${r.attr}>Ligado a <span class="kt" style="--kc:var(${r.kc})">${esc(r.tipo.toUpperCase())}</span> ${esc(r.t)}</button><button class="linkbtn" data-act="ligar-abrir">Trocar</button>`:`<button class="linkbtn" data-act="ligar-abrir">+ Ligar a uma demanda</button>`}</div>
    <div class="msgs" id="msgs">${th.msgs.map(m=>`<div class="msg"><span class="av2 ${m.de}">${m.nome[0]}</span><div style="min-width:0"><div class="mh"><b>${esc(m.nome)}</b><span class="muted mono" style="font-size:11px">${m.q}</span></div><div>${mencHtml(m.txt)}</div></div></div>`).join('')||'<p class="muted">Comece a conversa.</p>'}</div>
    <div class="composer"><textarea id="cm" rows="2" placeholder="Escrever em # ${esc(th.tema)} (use @ para mencionar alguém)" aria-label="Mensagem" data-mencao></textarea><button class="btn primary" data-act="enviar-msg">Enviar</button></div></div>
  </div></section>`;
}
function demChip(d,drag){return `<div class="dm ${d.feito?'done':''} ${!d.feito&&d.data<TODAY?'late':''}" style="--kc:var(--k-${d.quem})" data-dem="${d.id}" ${drag&&!d.feito?`draggable="true" data-ddrag="${d.id}"`:''}><span class="who">${QUEM[d.quem].toUpperCase()}</span><span>${esc(d.t)}</span></div>`}

// PLANO DE MÍDIA ATUAL: uma estratégia unificada (jornada, temas, ritmo, fases). Editado por blocos pela Cancha; alterações vão para aprovação.
const clone=o=>JSON.parse(JSON.stringify(o));
const CH={social:'Social',trafego:'Tráfego pago',email:'E-mail',design:'Design',video:'Vídeo'};
const CH_COR={social:'--k-post',trafego:'--k-trafego',email:'--k-email',design:'--k-design',video:'--k-video'};
const PF_COR={'Meta Ads':'#2F6FA8','Google Ads':'#3E8E4E','YouTube Ads':'#C2492F'};
let plano=null,planoItem=null;
const PARTES=[['objetivo','Objetivo e metas'],['jornada','Jornada do produtor'],['verba','Investimento']];
const TPL={acao:{c:'social',t:''},etapa:{n:'',d:'',acoes:[{c:'social',t:''}]},tema:{n:'',prod:'',periodo:'',msg:'',acoes:[{c:'social',t:''}]},ritmo:{num:'',unid:'',c:'social'},verba:{k:'',v:0},fase:{n:'',d:''},crono:{d:'',t:''},str:''};
function getPath(o,p){return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o)}
function setPath(o,p,v){const ks=p.split('.');const last=ks.pop();const t=ks.reduce((a,k)=>a[k],o);t[last]=v}
function partOf(d,k){return k==='objetivo'?{o:d.objetivo,i:d.objItens,m:d.metas}:k==='verba'?d.verba:k==='fases'?{f:d.fases,a:d.fase}:d[k]}
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
const indEx=k=>({alcance:!metaTem('ads')||!metaSocial(),cliques:!metaTem('ads'),contatos:!funilReal(),interacoes:!metaSocial()}[k]?EX:'');
function indValor(k){const r={de:TODAY.slice(0,8)+'01',ate:TODAY};const F=funilStats(r,true);const SC=socialStats(r);const A=metaTem('ads')?somaAds(adsTotais(r)):null;
  return {alcance:fk((A?A.im:F.impr)+SC.alc),cliques:fk(A?A.c:F.clk),contatos:String(metaMes().cont),interacoes:fk(SC.inter)}[k]||'—'}
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
     ${temMeta(cur.metas.contatos)?`<div class="qm"><span class="ql">Contatos no mês ${m.real?'':EX}</span><b>${m.cont}<small> / ${cur.metas.contatos}</small></b>${wasP('metas.contatos',cur.metas.contatos,v=>'meta '+v)}<div class="qbar"><i style="width:${Math.min(100,m.cont/cur.metas.contatos*100)}%"></i><u style="left:${Math.min(100,m.proj/Math.max(cur.metas.contatos,m.proj)*100)}%"></u></div><span class="ql">projeção ${m.proj} · ${m.proj>=cur.metas.contatos?'<em class="okt">no caminho</em>':'<em class="badt">abaixo</em>'}</span></div>`:`<div class="qm"><span class="ql">Meta de contatos no mês</span><b class="badt">Não definida</b><span class="ql">${isTeam()?'Clique no quadro para definir com a Spraytec':'A Cancha e a Spraytec vão definir'}</span></div>`}
     <div class="qm"><span class="ql">Custo por contato da mídia ${m.real?'':EX}</span><b>${m.cpl!=null?'R$ '+Math.round(m.cpl):'—'}</b><span class="ql">${temMeta(cur.metas.cpl)?`meta até R$ ${cur.metas.cpl}${wasP('metas.cpl',cur.metas.cpl,v=>' (era R$ '+v+')')} · ${m.cpl==null?'sem contatos da mídia':m.cpl<=cur.metas.cpl?'<em class="okt">dentro</em>':'<em class="badt">acima</em>'}`:'meta não definida'}</span></div>
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
  const res=`<div class="qc qrow qfoot"><i style="background:var(--ok)"></i>Resultado</div>${cur.jornada.map(e=>`<div class="qc qfoot"><b>${indValor(e.ind)}</b>${indEx(e.ind)}<span class="muted">${IND[e.ind]||'—'} no mês</span></div>`).join('')}`;
  const matriz=`<section class="qwrap"><div class="qhd"><div><h3>Como cada frente leva o produtor de um passo ao outro</h3><p class="muted">Leia por coluna para ver a jornada, ou por linha para ver o papel de cada frente.</p></div>
    <div class="qtot" ${edT('verba')}><span class="ql">Investimento em mídia</span><b>${brl(tot)}<small>/mês</small></b>${tot!==totO?`<span class="was">${brl(totO)}</span>`:''}<span class="ql">${cur.verba.map(x=>esc(x.k.replace(/ Ads$/,''))+' '+fk(x.v)).join(' · ')}</span></div></div>
    <div class="qscroll"><div class="qgrid" style="${gridStyle}">${head}${rows}${verba}${res}</div></div></section>`;
  return `<div class="pvis">${hero}${matriz}</div>`;
}
// ----- caixinha de edição no próprio quadro -----
function popHtml(){const P=S.pop;if(!P)return '';const d=curPlano();let t='',body='';
  const li=(arr,id)=>`<div class="le">${arr.map((x,j)=>`<div class="ler"><input type="text" class="pe" id="${id}${j}" value="${esc(x)}" placeholder="O que essa frente faz aqui" aria-label="Ação ${j+1}"><button class="iconbtn" data-act="pop-del" data-j="${j}" aria-label="Remover">×</button></div>`).join('')}<button class="linkbtn" data-act="pop-add">+ Adicionar</button></div>`;
  if(P.k==='cell'){const e=d.jornada[P.i];t=`${(FRENTES_Q.find(x=>x[0]===P.f)||[])[1]} em “${e.n}”`;body=li(P.list,'pp-l')}
  else if(P.k==='etapa'){const e=d.jornada[P.i];t='Momento '+(P.i+1);body=`<label for="pp-n">Nome</label><input id="pp-n" class="pe" value="${esc(e.n)}"><label for="pp-d">Quem está aqui</label><input id="pp-d" class="pe" value="${esc(e.d)}"><div class="ler"><div style="flex:1"><label for="pp-v">Verba (R$/mês)</label><input id="pp-v" type="number" step="500" min="0" class="pe" value="${e.v||0}"></div><div style="flex:1"><label for="pp-i">Resultado medido</label><select id="pp-i" class="pe">${Object.entries(IND).map(([k,l])=>`<option value="${k}" ${e.ind===k?'selected':''}>${l}</option>`).join('')}</select></div></div>${d.jornada.length>1?'<button class="linkbtn" data-act="pop-rmetapa" style="color:var(--bad)">Remover este momento</button>':''}`}
  else if(P.k==='tese'){t='Aposta e metas';body=`<label for="pp-o">A aposta do período</label><textarea id="pp-o" class="pe" rows="2">${esc(d.objetivo)}</textarea><div class="ler"><div style="flex:1"><label for="pp-c">Meta de contatos</label><input id="pp-c" type="number" class="pe" value="${d.metas.contatos}"></div><div style="flex:1"><label for="pp-p">Custo por contato (R$)</label><input id="pp-p" type="number" class="pe" value="${d.metas.cpl}"></div></div>`}
  else if(P.k==='tema'||P.k==='tema-novo'){const tm=P.k==='tema'?d.temas[P.i]:{n:'',prod:'',periodo:'',msg:''};t=P.k==='tema'?'Tema':'Novo tema';body=`<label for="pp-n">Nome</label><input id="pp-n" class="pe" value="${esc(tm.n)}"><label for="pp-m">Mensagem</label><input id="pp-m" class="pe" value="${esc(tm.msg)}"><div class="ler"><div style="flex:1"><label for="pp-pr">Produto</label><input id="pp-pr" class="pe" value="${esc(tm.prod)}"></div><div style="flex:1"><label for="pp-pe">Período</label><input id="pp-pe" class="pe" value="${esc(tm.periodo)}" placeholder="01/12 a 22/12"></div></div>${P.k==='tema'?'<button class="linkbtn" data-act="pop-rmtema" style="color:var(--bad)">Remover tema</button>':''}`}
  else if(P.k==='verba'){t='Investimento em mídia';body=`<span class="eyebrow">Verba por plataforma (R$/mês)</span><div class="le">${d.verba.map((x,j)=>`<div class="ler"><input class="pe" id="pp-vk${j}" value="${esc(x.k)}" aria-label="Plataforma"><input class="pe" type="number" step="500" id="pp-vv${j}" value="${x.v}" aria-label="Valor"></div>`).join('')}</div>`}
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
  else if(P.k==='verba'){d.verba=d.verba.map((x,j)=>({k:v('pp-vk'+j)||x.k,v:Number(v('pp-vv'+j))||0}))}
  else if(P.k==='ritmo'){d.ritmo=P.list.filter(r=>(r.num+r.unid).trim());d.verba=d.verba.map((x,j)=>({k:v('pp-vk'+j)||x.k,v:Number(v('pp-vv'+j))||0}))}
  return true}

// PLANO POR PLANILHA: exporta objetivo, metas, jornada (com ações por frente) e investimento.
// Importar monta um rascunho; ele só vale depois de enviado e aprovado pela Spraytec, como qualquer edição.
const PL_COLS=['secao','nome','frente','valor','indicador','descricao'];
const PL_METAS=[['contatos','Contatos no mês'],['cpl','Custo por contato']];
function planoExportar(){const d=curPlano();const L=[PL_COLS];
  L.push(['objetivo','','','','',d.objetivo||'']);(d.objItens||[]).forEach(x=>L.push(['foco','','','','',x]));
  PL_METAS.forEach(([k,l])=>L.push(['meta',l,'',d.metas[k]??'','','']));
  d.jornada.forEach(e=>{L.push(['etapa',e.n,'',e.v||0,IND[e.ind]||'',e.d||'']);(e.acoes||[]).forEach(a=>L.push(['acao',e.n,CH[a.c]||a.c,'','',a.t]))});
  d.verba.forEach(v=>L.push(['verba',v.k,'',v.v||0,'','']));
  baixarArquivo('plano-de-midia-spraytec.csv','﻿'+L.map(l=>l.map(csvCampo).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  toast('Plano exportado. Edite e importe de volta: vira um rascunho para enviar à Spraytec.')}
function planoProcessar(txt){const L=lerCSV(txt);if(!L.length)return {erros:['O arquivo está vazio.']};
  const cab=L[0].map(semAcento),idx={};PL_COLS.forEach(c=>{idx[c]=cab.indexOf(c)});
  if(idx.secao<0)return {erros:['Falta a coluna "secao". Comece pelo plano exportado.']};
  const pega=(r,c)=>idx[c]>=0?String(r[idx[c]]||'').trim():'';const num=v=>{const x=Number(String(v).replace(/[R$\s.]/g,'').replace(',','.'));return isFinite(x)?x:NaN};
  const base=clone(curPlano()),d={objItens:[],metas:clone(base.metas),jornada:[],verba:[]},erros=[];let temObj=false;
  const frenteDe=v=>{const s=semAcento(v);return Object.keys(CH).find(k=>k===s||semAcento(CH[k])===s||(s==='trafego'&&k==='trafego'))};
  const indDe=v=>{const s=semAcento(v);return s?Object.keys(IND).find(k=>k===s||semAcento(IND[k])===s):''};
  L.slice(1).forEach((r,i)=>{const n=i+2,sec=semAcento(pega(r,'secao')),nome=pega(r,'nome'),desc=pega(r,'descricao'),val=pega(r,'valor');
    if(!sec)return;
    if(sec==='objetivo'){d.objetivo=desc||nome;temObj=true}
    else if(sec==='foco'){if(desc||nome)d.objItens.push(desc||nome)}
    else if(sec==='meta'){const m=PL_METAS.find(([k,l])=>semAcento(l)===semAcento(nome)||k===semAcento(nome));if(!m)erros.push(`Linha ${n}: meta "${nome}" desconhecida (use ${PL_METAS.map(x=>x[1]).join(' ou ')}).`);else if(isNaN(num(val)))erros.push(`Linha ${n}: valor da meta inválido.`);else d.metas[m[0]]=num(val)}
    else if(sec==='etapa'){if(!nome){erros.push(`Linha ${n}: etapa sem nome.`);return}const ind=indDe(pega(r,'indicador'));if(ind===undefined)erros.push(`Linha ${n}: indicador desconhecido (use ${Object.values(IND).join(', ')}).`);
      const v=val?num(val):0;if(isNaN(v))erros.push(`Linha ${n}: valor inválido.`);d.jornada.push({n:nome,d:desc,v:v||0,ind:ind||'',acoes:[]})}
    else if(sec==='acao'){const e=d.jornada.find(x=>x.n===nome);const c=frenteDe(pega(r,'frente'));
      if(!e)erros.push(`Linha ${n}: a ação aponta para a etapa "${nome}", que não aparece antes na planilha.`);else if(!c)erros.push(`Linha ${n}: frente desconhecida (use ${Object.values(CH).join(', ')}).`);else if(desc)e.acoes.push({c,t:desc})}
    else if(sec==='verba'){const v=num(val);if(!nome)erros.push(`Linha ${n}: investimento sem nome.`);else if(isNaN(v))erros.push(`Linha ${n}: valor do investimento inválido.`);else d.verba.push({k:nome,v})}
    else erros.push(`Linha ${n}: seção "${pega(r,'secao')}" desconhecida (use objetivo, foco, meta, etapa, acao ou verba).`)});
  if(!temObj||!d.objetivo)erros.push('Falta a linha do objetivo.');if(!d.jornada.length)erros.push('Falta pelo menos uma etapa da jornada.');if(!d.verba.length)erros.push('Falta pelo menos uma linha de investimento.');
  if(erros.length)return {erros};
  // a jornada guarda o mesmo formato do editor (campos ausentes ficam como estavam na versão atual)
  d.jornada.forEach(e=>{const o=base.jornada.find(x=>x.n===e.n);if(o)Object.keys(o).forEach(k=>{if(!(k in e))e[k]=clone(o[k])})});
  return {dados:Object.assign(base,{objetivo:d.objetivo,objItens:d.objItens,metas:d.metas,jornada:d.jornada,verba:d.verba})}}
async function planoLerArquivo(file){const buf=await file.arrayBuffer();let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(_){txt=new TextDecoder('windows-1252').decode(buf)}
  const r=planoProcessar(txt);
  if(r.erros){toast(r.erros.slice(0,3).join(' ')+(r.erros.length>3?` (e mais ${r.erros.length-3})`:''));return}
  readPlanoForm();S.pdraft=r.dados;S.pedit=null;S.pnota=S.pnota||'';render();
  toast(changedParts(S.pdraft).length?'Rascunho montado a partir da planilha. Confira as alterações, explique o que mudou e envie para aprovação.':'A planilha é igual à versão aprovada: nada mudou.')}
function planoSection(){
  if(!plano)return '<p class="muted">O plano de mídia ainda não foi cadastrado.</p>';
  const pd=plano.pendente,team=isTeam(),dr=S.pdraft,ch=dr?changedParts(dr):[];
  return `<section class="planosec"><div class="headrow" style="margin-bottom:4px"><div><p class="muted" style="margin:0;font-size:13px">Versão ${plano.versao}, aprovada em ${plano.aprovado}.${(h=>h&&h.antes?` <button class="linkbtn" data-act="ver-mud" data-id="${h.v}">O que mudou nesta versão</button>`:'')(plano.hist[plano.hist.length-1])}${team&&!dr?' Clique em qualquer parte do quadro para editar.':''}</p></div>${team?`<div class="actions"><button class="btn sm" data-act="plano-exportar">Exportar planilha</button><label class="btn sm" style="cursor:pointer">Importar planilha<input type="file" id="plano-arq" accept=".csv,text/csv,text/plain" hidden></label></div>`:''}</div>
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
  b.verba.forEach(x=>{const o=a.verba.find(y=>y.k===x.k);if(!o)add('Investimento','novo',x.k,'',brl(x.v));else if(o.v!==x.v)add('Investimento','mudou',x.k,brl(o.v),brl(x.v))});
  a.verba.filter(x=>!b.verba.some(y=>y.k===x.k)).forEach(x=>add('Investimento','removido',x.k,brl(x.v),''));
  val('Investimento','Investimento total por mês',brl(totVerba(a)),brl(totVerba(b)));
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
const NOVO_TIPOS=[['ig|post','Instagram · post'],['ig|carrossel','Instagram · carrossel'],['ig|reel','Instagram · reel'],['ig|story','Instagram · story'],['fb|post','Facebook · post'],['yt|video','YouTube · vídeo'],['yt|short','YouTube · Short'],['email|newsletter','E-mail marketing'],['design|producao','Produção de design'],['video|gravacao','Gravação de vídeo'],['video|entrega','Entrega de vídeo'],['demanda|cancha','Demanda da Cancha'],['demanda|spraytec','Demanda da Spraytec']];
function drawerNovo(){const date=S.drawer.id||TODAY;const tipo=S.novoTipo||(isM()?'demanda|spraytec':'ig|post');const isDem=tipo.startsWith('demanda'),isProd=/^(design|video)\|/.test(tipo);
  const perto=x=>x&&x>=addDays(date,-45)&&x<=addDays(date,45);const ligaveis=[...posts.filter(p=>perto(p.date)&&p.formato!=='plano').map(p=>['p:'+p.id,fmt(p.date)+' · '+NETNAME[p.rede]+' · '+p.titulo]),...demandas.filter(x=>!x.feito&&perto(x.data)).map(x=>['d:'+x.id,fmt(x.data)+' · Demanda · '+x.t])].sort((a,b)=>a[1].slice(3,5).localeCompare(b[1].slice(3,5))||a[1].localeCompare(b[1]));
  return `<header><div><div class="eyebrow">Calendário</div><h2>Adicionar em ${fmtLong(date)}</h2></div>${closeBtn()}</header>
  <div class="content">
   <label for="nt-tipo">O que é</label><select id="nt-tipo" data-act-change="novo-tipo">${NOVO_TIPOS.map(([k,l])=>`<option value="${k}" ${k===tipo?'selected':''}>${l}</option>`).join('')}</select>
   <label for="nt-titulo">${isDem?'O que precisa ser feito':'Título'}</label><input type="text" id="nt-titulo" placeholder="${isDem?'Ex.: Enviar fotos da feira':isProd?'Ex.: Peças da 1ª quinzena de janeiro':'Ex.: Manejo do florescimento em 5 passos'}">
   <div class="ler"><div style="flex:1"><label for="nt-data">Data</label><input type="date" id="nt-data" value="${date}" class="pe"></div>${!isDem&&!isProd?`<div style="flex:1"><label for="nt-hora">Horário</label><input type="time" id="nt-hora" value="11:30" class="pe"></div>`:''}</div>
   ${!isDem?`<div class="ler"><div style="flex:1"><label for="nt-pilar">Pilar</label><select id="nt-pilar">${Object.keys(PILAR_HUE).map(k=>`<option>${k}</option>`).join('')}</select></div><div style="flex:1"><label for="nt-prod">Produto</label><input type="text" id="nt-prod" placeholder="Opcional"></div></div>`:''}
   <label for="nt-texto">${isDem?'Detalhes':isProd?'Descrição':'Pauta (tema, ideia e abordagem)'}</label><textarea id="nt-texto" placeholder="Opcional, dá para escrever depois"></textarea>
   ${!isDem?`<label for="nt-drive">Material no Google Drive</label><input type="text" id="nt-drive" placeholder="https://drive.google.com/... (opcional)">`:''}
   <label for="nt-liga">Ligar a</label><select id="nt-liga"><option value="">Nada por enquanto</option>${ligaveis.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select>
   ${isM()&&!isDem?'<p class="muted" style="font-size:12px;margin:0">Entra como pauta sugerida por você. A Cancha produz e manda para sua aprovação.</p>':''}
   <div class="actions"><button class="btn primary" data-act="novo-salvar">Adicionar ao calendário</button></div></div>`}
function lerNovo(){const t=($('#nt-titulo').value||'').trim();if(!t){toast('Dê um título.');$('#nt-titulo').focus();return null}
  const v=id=>{const e=$('#'+id);return e?(e.value||'').trim():''};
  return {tipo:v('nt-tipo'),titulo:t,data:v('nt-data')||TODAY,hora:v('nt-hora')||null,pilar:v('nt-pilar'),produto:v('nt-prod'),texto:v('nt-texto'),drive:v('nt-drive'),liga:v('nt-liga')||null}}

const S={acat:{},aq:{},prod:'',per:{preset:'30',de:'',ate:'',cmp:'prev',cde:null,cate:null},psort:'alc',pdraft:null,pedit:null,pnota:'',thread:null,novoTema:false,linkPick:false,role:'',view:'hoje',month:'',dmonth:'',tipos:{post:true,email:true,design:true,video:true,demanda:true},quem:'todas',atipo:'todos',psub:'funil',asub:'materiais',rede:'instagram',drawer:null,pasta:null,sel:{}};

// helpers
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=iso=>iso?iso.slice(8)+'/'+iso.slice(5,7):'sem data';
const WD=['dom','seg','ter','qua','qui','sex','sáb'];
const fmtLong=iso=>iso?WD[dow(iso)]+', '+fmt(iso):'sem data';
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const n=v=>v.toLocaleString('pt-BR');
const isTeam=()=>S.role==='cancha';
const isM=()=>S.role==='operacao';
// Posts com pauta passam duas vezes por "producao": antes dos textos aprovados (copy) e depois (arte).
const STV={copy:{l:'Copy em produção',c:'--s-producao'},arte:{l:'Arte em criação',c:'--s-producao'}};
const stK=p=>p.status==='producao'&&temPauta(p)&&!p.faltaTexto?(p.textoOk?'arte':'copy'):p.status;
// Reels, vídeos e Shorts usam vídeo pronto da produtora: depois da copy não há arte a criar, só anexar o vídeo.
const ehVideo=p=>temPauta(p)&&['reel','video','short'].includes(p.formato);
const AJ_ONDE={pauta:'na pauta',texto:'na copy',peca:'na arte'};
const stInfo=p=>p.status==='ajuste'?{l:'Ajuste '+(p.etapaAjuste==='peca'&&ehVideo(p)?'no vídeo':AJ_ONDE[p.etapaAjuste]||'pedido'),c:'--s-ajuste'}:stK(p)==='arte'&&ehVideo(p)?{l:'Vídeo a anexar',c:'--s-producao'}:STV[stK(p)]||STATUS[p.status]||{l:p.status,c:'--muted'};
const stCurto=p=>p.status==='ajuste'?stInfo(p).l:stK(p)==='arte'&&ehVideo(p)?'Vídeo a anexar':ST_CURTO[stK(p)]||stInfo(p).l;
function pill(st){const s=typeof st==='object'?stInfo(st):STATUS[st];return `<span class="pill" style="color:var(${s.c})"><i></i><span style="color:var(--ink)">${s.l}</span></span>`}
function tagPill(txt,c){return `<span class="pill" style="color:var(${c})"><i></i><span style="color:var(--ink)">${txt}</span></span>`}
function hiddenForClient(p){return isCliente()&&(p.status==='pauta'||p.status==='producao')&&!['video','design'].includes(p.rede)}
function toast(msg){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
function tipoCal(p){return {email:'email',design:'design',video:'video',ads:'midia'}[p.rede]||'post'}
function tipoAprov(p){if(p.status==='pauta_aprovacao'||(p.status==='ajuste'&&p.etapaAjuste==='pauta'))return'Pauta';if(p.status==='texto_aprovacao'||(p.status==='ajuste'&&p.etapaAjuste==='texto'))return'Textos';if(p.rede==='email')return'E-mail marketing';if(p.formato==='plano')return'Plano de mídia';if(p.rede==='design')return'Peça de anúncio';if(p.formato==='story')return'Story';if(['reel','video','short'].includes(p.formato))return'Vídeo';return'Post'}
const EM_APROVACAO=['pauta_aprovacao','texto_aprovacao','aprovacao'];
const temPauta=p=>!['video','design'].includes(p.rede)&&p.formato!=='plano';
function pendingApprovals(){return posts.filter(p=>EM_APROVACAO.includes(p.status)&&!p.faltaTexto)}
// (onde é o ajuste já vem no nome da etapa: "Ajuste na arte", "Ajuste na copy"…)
function marcas(p){return p.validacao?'<span class="tag">validação interna</span>':''}
function roteirosPend(){return videos.filter(v=>v.stage==='roteiro')}
function badgeCount(){return pendingApprovals().length+roteirosPend().length}
function inWindow(p){return p.date&&p.date>=TODAY&&p.date<=addDays(TODAY,7)}
function prazoDe(p){return p.prazo||addDays(TODAY,2)}

// Situação da versão para postar de cada vídeo do post (feita pelo servidor, sem perder qualidade).
function notaLeve(p){const L=pecasAtuais(p).filter(a=>tipoArq(a)==='video');if(!L.length)return '';const mb=n=>Math.round((n||0)/1e6)+' MB';
  return '<div class="leves">'+L.map(a=>{const l=a.leveId&&acharArq(a.leveId);
    const t=l?`<b>Para postar:</b> use "${esc(l.nome)}" (${mb(l.tam)} em vez de ${mb(a.tam)}; qualidade conferida: ${String(((l.ssim||0)*100).toFixed(1)).replace('.',',')}% igual ao original). Clique nele para baixar.`
      :a.leveOk?`<b>Para postar:</b> o original já está no formato das redes (${esc(a.leveOk)}). Poste o próprio "${esc(a.nome)}".`
      :(a.leveTentativas||0)>=3?`<b>Para postar:</b> não deu para gerar a versão leve (${esc(a.leveErro||'')}). Poste o original.`
      :'<b>Para postar:</b> gerando a versão leve deste vídeo, sem perder qualidade. Leva alguns minutos; atualize a página depois.';
    return `<p class="muted leve">${t}</p>`}).join('')+'</div>'}
// prévias
// Carrossel com as peças enviadas: arrasta para o lado ou usa as setas, como no Instagram.
function carrosselPv(p){const L=pecasAtuais(p);
  return `<div class="img foto car" data-car><div class="cartrack">${L.map((a,i)=>tipoArq(a)==='video'?vidTag(a):`<img src="${miniUrl(a.id,1080)}" alt="Lâmina ${i+1}" loading="lazy" draggable="false" data-falha>`).join('')}</div>
   <span class="cnt" data-carcnt>1/${L.length}</span><button type="button" class="carb ant" data-carb="-1" aria-label="Lâmina anterior" hidden>‹</button><button type="button" class="carb prox" data-carb="1" aria-label="Próxima lâmina">›</button></div>`}
function carAtual(car,alvo){const t=car.querySelector('.cartrack'),n=t.children.length,pv=car.closest('.pv');
  const k=Math.min(n-1,Math.max(0,alvo!=null?alvo:car._alvo!=null?car._alvo:Math.round(t.scrollLeft/Math.max(1,t.clientWidth))));
  const c=car.querySelector('[data-carcnt]');if(c)c.textContent=(k+1)+'/'+n;
  car.querySelector('.carb.ant').hidden=k===0;car.querySelector('.carb.prox').hidden=k===n-1;
  if(pv)pv.querySelectorAll('[data-cardots] i').forEach((d,j)=>d.classList.toggle('on',j===k));return k}
// Seta: vai direto para a lâmina seguinte (contador e pontos mudam na hora, a rolagem acompanha).
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-carb]');if(!b)return;e.stopPropagation();e.preventDefault();
  const car=b.closest('[data-car]'),t=car.querySelector('.cartrack'),k=carAtual(car,carAtual(car)+Number(b.dataset.carb));
  car._alvo=k;clearTimeout(car._tm);car._tm=setTimeout(()=>{car._alvo=null},700);t.scrollTo({left:k*t.clientWidth,behavior:'smooth'})},true);
// Arrastar com o mouse: segue o mouse e, ao soltar, vai para a lâmina seguinte (ou volta), como no Instagram.
let carDrag=null;
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;const t=e.target.closest&&e.target.closest('.cartrack');if(!t)return;
  const car=t.closest('[data-car]');carDrag={t,car,x0:e.clientX,s0:t.scrollLeft,i0:carAtual(car),dx:0};t.classList.add('arrastando');e.preventDefault()});
document.addEventListener('pointermove',e=>{if(!carDrag)return;carDrag.dx=e.clientX-carDrag.x0;carDrag.t.scrollLeft=carDrag.s0-carDrag.dx});
document.addEventListener('pointerup',()=>{if(!carDrag)return;const {t,car,dx,i0}=carDrag,w=Math.max(1,t.clientWidth);carDrag=null;
  const k=carAtual(car,Math.abs(dx)>w*.15?i0+(dx<0?1:-1):i0);car._alvo=k;clearTimeout(car._tm);car._tm=setTimeout(()=>{car._alvo=null},700);
  t.classList.remove('arrastando');t.scrollTo({left:k*w,behavior:'smooth'});
  if(Math.abs(dx)>4){const bloq=ev=>{ev.stopPropagation();ev.preventDefault()};document.addEventListener('click',bloq,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',bloq,true),50)}});
// Arrastar com o dedo ou o trackpad também troca de lâmina.
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('cartrack'))carAtual(t.closest('[data-car]'))},true);
// Legenda como no Instagram: o começo e "… mais" para abrir o resto (só na prévia grande, no detalhe do item).
function capTxt(p){const t=String(p.legenda||'').replace(/\r\n?/g,'\n').trim();if(!t)return '';const lim=125;if(t.length<=lim+15)return `<span class="capc">${esc(t)}</span>`;
  let k=t.lastIndexOf(' ',lim);if(k<60)k=lim;return `<span class="capc">${esc(t.slice(0,k))}</span><button type="button" class="capmais" data-capmais>… mais</button><span class="capr" hidden>${esc(t.slice(k))}</span>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-capmais]');if(!b)return;e.stopPropagation();e.preventDefault();const r=b.nextElementSibling;if(r)r.hidden=false;b.remove()},true);
// Vídeo anexado: capa do Drive e o vídeo só baixa quando alguém dá play (os vídeos têm 70 a 140 MB).
// Na prévia toca a versão para postar, quando já existe (mais leve, mesma qualidade); a capa é a do original.
const vidTag=(a,cls)=>`<video class="${cls||''}" src="${arqUrl(a.leveId&&acharArq(a.leveId)?a.leveId:a.id)}" poster="${miniUrl(a.id,800)}" preload="none" controls playsinline></video>`;
function preview(p,o){o=o||{};
  const bg=PILAR_HUE[p.pilar]||'#E3E4D3',capa=hiddenForClient(p)?null:capaDe(p),nP=capa?pecasAtuais(p).length:0;
  const vid=o.grande&&!hiddenForClient(p)?pecasAtuais(p).find(a=>tipoArq(a)==='video'):null;
  const foto=(cls,extra)=>`<div class="img ${cls} foto">${extra||''}<img src="${capa}" alt="" loading="lazy" data-falha></div>`;
  if(hiddenForClient(p))return `<div class="pv"><div class="ph">Em preparação</div></div>`;
  const T=esc(p.titulo),first=o.grande?capTxt(p):esc((p.legenda||'').split('\n')[0]);
  const capV=o.grande&&p.legenda?`<div class="pvcap"><b>${p.rede==='yt'?'@spraytecbrasil':igUser()}</b> ${capTxt(p)}</div>`:'';
  const comVideo=extra=>`<div class="pv vert comvideo">${vidTag(vid,'pvvideo')}${extra||''}</div>${capV}`;
  if(p.rede==='video'||(p.rede==='design'&&p.formato==='producao'))return `<div class="pv prod" style="--kc:var(--k-${p.rede})"><span class="ptp">${p.rede==='video'?'Produção de vídeo':'Produção de design'}</span><b>${T}</b><span class="sm">${p.rede==='video'?(p.formato==='gravacao'?'Gravação com a produtora':'Entrega do vídeo final'):'Entrega das peças para aprovação'}</span></div>`;
  const hd=sub=>`<div class="hd">${avS()}<span style="min-width:0"><b>${p.rede==='ig'?igUser():'Spraytec Brasil'}</b>${sub?`<br><span class="sm">${sub}</span>`:''}</span></div>`;
  const vert=(top,bottom,extra)=>`<div class="pv vert${capa?' comfoto':''}" style="--bg:${bg}">${capa?`<img class="pvfundo" src="${capa}" alt="" loading="lazy" data-falha>`:''}<div class="full">${top}<div class="big">${T}</div>${bottom}</div>${extra||''}</div>`;
  if(p.rede==='ig'){
    if(p.formato==='story')return vert('<div class="bars3"><i></i><i></i><i></i></div><div class="hd lite">'+avS()+'<b>'+igUser()+'</b></div>','<div class="sm">Enviar mensagem</div>');
    if((p.formato==='reel'||p.formato==='story')&&vid)return comVideo();
    if(p.formato==='reel')return vert('<div class="sm">Reels</div>','<div class="sm">'+igUser()+' · ♪ áudio original</div>','<div class="play">▶</div>')+capV;
    if(capa&&nP>1)return `<div class="pv">${hd('')}${carrosselPv(p)}<div class="ft"><div class="icons">♡ ○ ▷</div><div class="dots" data-cardots>${pecasAtuais(p).map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div><div class="cap"><b>${igUser()}</b> ${first}</div></div></div>`;
    return `<div class="pv">${hd('')}${capa?foto('',nP>1?`<span class="cnt">1/${nP}</span>`:''):`<div class="img" style="--bg:${bg}">${p.formato==='carrossel'?'<span class="cnt">1/6</span>':''}<span>${T}</span></div>`}<div class="ft"><div class="icons">♡ ○ ▷</div>${p.formato==='carrossel'?'<div class="dots"><i class="on"></i><i></i><i></i><i></i></div>':''}<div class="cap"><b>${igUser()}</b> ${first}</div></div></div>`;
  }
  if(p.rede==='fb')return `<div class="pv">${hd('2 h · Público')}<div class="txt">${first}</div>${capa?foto('wide'):`<div class="img wide" style="--bg:${bg}"><span>${T}</span></div>`}<div class="ft row3"><span>Curtir</span><span>Comentar</span><span>Compartilhar</span></div></div>`;
  if(p.rede==='yt'){
    if(p.formato==='short')return vid?comVideo():vert('','<div class="sm">@spraytecbrasil</div>','<span class="short">Shorts</span><div class="play">▶</div>')+capV;
    if(vid)return `<div class="pv"><div class="img v169 foto">${vidTag(vid,'pvvideo')}</div><div class="hd">${avS()}<span style="min-width:0"><b>${T}</b><br><span class="sm">Spraytec Brasil</span></span></div></div>${capV}`;
    return `<div class="pv">${capa?foto('v169'):`<div class="img v169" style="--bg:${bg}"><span>${T}</span><span class="dur">8:42</span></div>`}<div class="hd">${avS()}<span style="min-width:0"><b>${T}</b><br><span class="sm">Spraytec Brasil</span></span></div></div>`;
  }
  if(p.rede==='email')return `<div class="pv"><div class="mailtop"><span class="sm">De: Spraytec Brasil</span><b>${T}</b></div><div class="mailbar">SPRAYTEC</div><div class="img wide" style="--bg:${bg}"></div><div class="lines"><i></i><i></i><i style="width:60%"></i></div><div class="cta">Ler no site</div></div>`;
  if(p.rede==='ads'){const vb=plano?(plano.pendente?plano.pendente.dados:plano.dados).verba:[];return `<div class="pv doc"><span class="sm">PLANO DE MÍDIA</span><b>${T}</b><div class="tbl">${vb.map(x=>`<span>${esc(x.k.replace(/ Ads$/,''))}</span><span>${brl(x.v)}</span>`).join('')}</div></div>`}
  return `<div class="pv art3"><div class="f sq" style="--bg:${bg}"></div><div class="f vt" style="--bg:${bg}"></div><div class="f wd" style="--bg:${bg}"></div><div class="cap3">${T}</div></div>`;
}
function adPreview(d){const bg=PILAR_HUE[d.pilar];return `<div class="pv"><div class="hd">${avS()}<span><b>Spraytec Brasil</b><br><span class="sm">Patrocinado</span></span></div><div class="img" style="--bg:${bg}"><span>${esc(d.titulo)}</span></div><div class="ctabar"><span class="sm">spraytec.com.br</span><b>Saiba mais ›</b></div></div>`}
function storyPreview(s){return `<div class="pv vert" style="--bg:${PILAR_HUE[s.pilar]}"><div class="full"><div class="bars3"><i></i><i></i><i></i></div><div class="sm">${s.rotulo||(s.tipo==='repost'?'Repost':'Story agendado')}</div><div class="big">${esc(s.titulo)}</div></div></div>`}

// navegação
const VIEWS=[
  ['hoje','Início',['operacao','cancha','diretoria']],
  ['plano','Estratégia',['operacao','cancha','diretoria']],
  ['aprovacao','Aprovação',['operacao','cancha']],
  ['calendario','Calendário',['operacao','cancha']],
  ['redes','Redes sociais',['operacao','cancha']],
  ['performance','Performance',['operacao','cancha','diretoria']],
  ['videos','Vídeos',['produtora']],
  ['acervo','Acervo',['operacao','cancha','produtora','diretoria']],
  ['atividade','Registro de atividades',['cancha']],
  ['pessoas','Pessoas e acessos',['cancha']],
];
function renderRoles(){
  $('#roles').innerHTML=EU?`<span class="eu"><b>${esc(EU.nome)}</b><span class="muted">${esc(ROLES[EU.papel]||EU.papel)}</span></span>${DEMO?'<button class="iconbtn" data-act="trocar-pessoa">Trocar pessoa</button>':''}<button class="iconbtn" data-act="sair">Sair</button>`:'';
  const dm=$('#demo');if(dm){dm.hidden=true}}
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
function subtabs(list,key,label){return `<div class="subtabs" role="tablist" aria-label="${label}">${list.map(([k,l])=>`<button role="tab" data-tab="${key}" data-val="${k}" aria-selected="${(S[key]??list[0][0])===k}">${l}</button>`).join('')}</div>`}

// INÍCIO
// ===================== NOVOS MÓDULOS =====================
const isDir=()=>S.role==='diretoria';
const isCliente=()=>S.role==='operacao'||S.role==='diretoria'||S.role==='leitor';

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
  const tabs=[['plano','Plano atual'],['ano','Eventos e ano safra']];const sb=S.esub==='ano'?'ano':'plano';
  const body=sb==='ano'?estAno():planoSection();
  return `${head('Estratégia','O plano de mídia, os eventos e o ano safra.')}${subtabs(tabs,'esub','Estratégia')}${body}`}
function estAno(){
  const aviso=MOSTRAR_EXEMPLO?'<section class="panel metaaviso" role="note"><b>Exemplo: este quadro ainda não é o calendário da Spraytec</b><p style="margin:6px 0 0">Ele mostra como vai ficar. A Spraytec vai enviar o calendário real do ano: safra das culturas, janelas comerciais, feiras, dias de campo e demais eventos.</p></section>':'';
  if(!ANO.length)return aviso+'<p class="muted">Os eventos e o ano safra ainda não foram cadastrados.</p>';
  const ci=Math.max(0,ANO.findIndex(x=>x.m===TODAY.slice(0,7)));const cur=ANO[ci];
  const tp=ANO.reduce((a,x)=>a+x.p,0),te=ANO.reduce((a,x)=>a+(x.e||0),0);
  const dia=Number(TODAY.slice(8)),ndias=new Date(Date.UTC(+TODAY.slice(0,4),+TODAY.slice(5,7),0)).getUTCDate();
  const ritmo=cur&&cur.e!=null?cur.e/(cur.p*dia/ndias):1;const prox=ANO.slice(ci+1).find(x=>x.mo!==cur.mo);
  const mx=Math.max(...ANO.map(x=>x.p));
  const col=i=>`grid-column:${i+2}`;
  const cols=ANO.map((x,i)=>`<button class="tl-m ${i===ci?'cur':''}" style="${col(i)};grid-row:1" data-act="mes-edit" data-idx="${i}" aria-label="Ver ${mesLbl(x.m)}">${mesLbl(x.m)}</button>`).join('');
  const lanes=LANES.map((ln,r)=>`<div class="tl-l" style="grid-row:${r+2}">${ln.l}</div>${ln.it.map(([s,d,t])=>`<span class="tl-b b-${ln.k}" style="grid-column:${s+2}/span ${d};grid-row:${r+2}" title="${esc(t)}">${esc(t)}</span>`).join('')}`).join('');
  const rC=LANES.length+2,rV=LANES.length+3;
  const camp=`<div class="tl-l" style="grid-row:${rC}">Foco do mês</div>${ANO.map((x,i)=>`<button class="tl-c" style="${col(i)};grid-row:${rC}" data-act="mes-edit" data-idx="${i}">${esc(x.tema)}</button>`).join('')}`;
  const verba=`<div class="tl-l" style="grid-row:${rV}">Verba</div>${ANO.map((x,i)=>`<button class="tl-v" style="${col(i)};grid-row:${rV}" data-act="mes-edit" data-idx="${i}" aria-label="${mesLbl(x.m)}: ${brl(x.p)} planejados"><span class="bar"><i style="height:${x.p/mx*100}%"></i>${x.e!=null?`<b style="height:${Math.min(x.e,x.p)/mx*100}%"></b>`:''}</span><span class="mono">${Math.round(x.p/1000)}k</span></button>`).join('')}`;
  const today=`<span class="tl-today" style="grid-column:${ci+2};grid-row:1/${rV+1}"></span>`;
  const mom=MOMENTOS.map(([k,l])=>{const ms=ANO.filter(x=>x.mo===k);if(!ms.length)return '';const v=ms.reduce((a,x)=>a+x.p,0),ex=ms.reduce((a,x)=>a+(x.e||0),0);const fr=[...new Set(ms.flatMap(x=>x.fr))];const now=ms.includes(cur);
    return `<article class="pcard mom ${now?'cur':''}"><div class="eyebrow">${mesLbl(ms[0].m)}${ms.length>1?' a '+mesLbl(ms[ms.length-1].m):''}${now?' · agora':''}</div><b class="anot">${l}</b>
      <p class="momobj">${esc(ms[0].obj)}</p>
      <dl class="kv mk"><dt>Produtos</dt><dd>${esc([...new Set(ms.flatMap(x=>x.prods.split(' · ')))].join(' · '))}</dd><dt>Meta</dt><dd>${[...new Set(ms.map(x=>x.kpi))].map(esc).join(' · ')}</dd></dl>
      <div class="frch">${FRENTES_E.map(([f,fl])=>`<span class="${fr.includes(f)?'on':''}">${fl}</span>`).join('')}</div>
      <div class="anov"><span class="muted">${Math.round(v/tp*100)}% da verba do ano</span><b>${brl(v)}</b></div>${ex?`<div class="meter"><b class="ok" style="width:${ex/v*100}%"></b></div><span class="muted" style="font-size:12px">${brl(ex)} executados</span>`:''}</article>`}).join('');
  return `${aviso}<div class="kpis">
    <div class="kpi"><div class="l">Agora</div><div class="v" style="font-size:18px">${esc(cur.fase)}</div><div class="l">Foco do mês: ${esc(cur.tema)}</div></div>
    <div class="kpi"><div class="l">Ritmo de verba em ${mesLbl(cur.m)} ${EX}</div><div class="v ${ritmo>1.1?'bad':''}">${Math.round(ritmo*100)}%</div><div class="l">${cur.e!=null?brl(cur.e):'—'} de ${brl(cur.p)} · ${ritmo>1.1?'acima do ritmo':ritmo<.85?'abaixo do ritmo':'no ritmo'}</div></div>
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
  const aviso=MOSTRAR_EXEMPLO?'<section class="panel metaaviso" role="note"><b>Exemplo: os concorrentes e os números desta aba são ilustrativos</b><p style="margin:6px 0 0">Mostram como vai ficar o acompanhamento. Os concorrentes reais entram com a lista da Spraytec e a ferramenta de monitoramento.</p></section>':'';
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
  return `${aviso}<div class="kpis">
    <div class="kpi"><div class="l">Share of voice da Spraytec ${EX}</div><div class="v">${sov}%</div><div class="l">${SPRAY.ads} de ${tot} anúncios ativos no grupo</div></div>
    <div class="kpi"><div class="l">Quem mais anuncia</div><div class="v" style="font-size:18px">${esc(lider.nome)}</div><div class="l">${lider.ads} anúncios · ${lider.novos} novos na semana</div></div>
    <div class="kpi"><div class="l">Anúncios novos na semana</div><div class="v">${nov}</div><div class="l">somando todas as marcas</div></div>
    <div class="kpi"><div class="l">Concorrentes monitorados</div><div class="v">${CONC.length}</div><div class="l">na Biblioteca de Anúncios da Meta</div></div></div>
  <section class="panel"><div class="toolbar" style="margin-bottom:10px"><h2 style="margin:0">Presença em anúncios ${EX}</h2>${isTeam()?'<button class="btn" data-act="conc-novo">+ Concorrente</button>':''}</div>${sovBar}<div style="margin-top:14px">${tbl}</div></section>
  <div>
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
  <label for="ms-t">Foco do mês</label><input type="text" id="ms-t" class="pe" value="${esc(x.tema)}">
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
const temMeta=v=>Number(v)>0;
// ---------- CONTATOS REAIS ----------
// Regra: um contato é (a) um formulário ou WhatsApp enviado no site, contado pelo GA4 (eventos-chave, de qualquer origem),
// (b) um formulário instantâneo da Meta, preenchido dentro do Facebook ou Instagram, ou (c) uma conversa iniciada por anúncio
// (WhatsApp, Direct, Messenger). O Lead do pixel da Meta e as conversões do Google Ads NÃO somam ao total: são os mesmos
// envios do site, que o GA4 já contou. Entram só na tabela por campanha, que mostra a atribuição de cada plataforma.
const funilReal=()=>metaTem('ads')||metaTem('ga4')||metaTem('gads');
const CANAL_PAGO=c=>/^(Paid |Cross-network$|Display$)/.test(c||'');
const CONV_META='onsite_conversion.messaging_conversation_started_7d';
const formMeta=a=>{const v=a['onsite_conversion.lead_grouped']??a['leadgen_grouped'];return v!=null?Number(v)||0:Math.max(0,(Number(a.lead)||0)-(Number(a['offsite_conversion.fb_pixel_lead'])||0))};
const EV_CONTATO={lead_formulario:'Formulário do site',lead_whatsapp:'WhatsApp do site'};
function siteDesde(){const d=META.ga4.dias.filter(x=>x.sessoes>0).map(x=>x.d).sort();return d[0]||null}
function contatosReal(r){const G=META.ga4,soma=(L,k)=>L.reduce((a,x)=>a+(Number(x[k])||0),0);
  const ev=G.eventos.filter(x=>inR(r,x.d)),evs=new Map();ev.forEach(x=>evs.set(x.evento,(evs.get(x.evento)||0)+(x.eventosChave||0)));
  const cn=G.canais.filter(x=>inR(r,x.d)),can=new Map();cn.forEach(x=>{if(x.eventosChave)can.set(x.canal,(can.get(x.canal)||0)+x.eventosChave)});
  const site=soma(ev,'eventosChave'),sitePago=[...can].filter(([c])=>CANAL_PAGO(c)).reduce((a,[,v])=>a+v,0);
  let mf=0,mc=0,inv=0,im=0,c=0;META.ads.dias.forEach(l=>{if(!inR(r,l.d))return;const a=l.acoes||{};mf+=formMeta(a);mc+=Number(a[CONV_META])||0;inv+=l.investido||0;im+=l.impressoes||0;c+=l.cliques||0});
  const g=gadsTot(r);
  return {inv:inv+g.i,invM:inv,invG:g.i,im:im+g.im,c:c+g.c,evs,can,site,sitePago,sesPago:soma(cn.filter(x=>CANAL_PAGO(x.canal)),'sessoes'),mf,mc,
    total:site+mf+mc,midia:sitePago+mf+mc,gconv:g.ct}}
// por campanha: atribuição de cada plataforma (a Meta inclui o Lead do pixel; o Google, as conversões dele)
function contatosPorCampanha(r){const o=new Map();
  META.ads.dias.forEach(l=>{if(!inR(r,l.d))return;const a=META.ads.anuncios.get(l.ad)||{},cp=a.campaign||{},k='m'+(cp.id||l.ad);
    const t=o.get(k)||{nome:cp.name||a.name||'Campanha da Meta',plat:'Meta Ads',obj:OBJ[cp.objective]||'',inv:0,ct:0,conv:0,pix:0};
    const ac=l.acoes||{};t.inv+=l.investido||0;t.ct+=contatosDe(ac);t.conv+=Number(ac[CONV_META])||0;t.pix+=Number(ac['offsite_conversion.fb_pixel_lead'])||0;o.set(k,t)});
  const G=gadsPor(META.gads.dias,'campanha',r);Object.entries(G).forEach(([id,x])=>{const c=META.gads.campanhas.get(id)||{};o.set('g'+id,{nome:c.nome||'Campanha '+id,plat:'Google Ads',obj:CANAL_GADS[c.tipo]||'',inv:x.i,ct:x.ct,conv:0,pix:0})});
  return [...o.values()].filter(x=>x.inv>0||x.ct>0).sort((a,b)=>b.ct-a.ct||b.inv-a.inv)}
function metaMes(){const diasPass=Number(TODAY.slice(8)),diasMes=new Date(Date.UTC(+TODAY.slice(0,4),+TODAY.slice(5,7),0)).getUTCDate(),mt=plano&&plano.dados&&plano.dados.metas||{},metaC=Number(mt.contatos)||0,metaCpl=Number(mt.cpl)||0;
  if(funilReal()){const K=contatosReal({de:TODAY.slice(0,8)+'01',ate:TODAY}),cont=K.total,proj=Math.round(cont/diasPass*diasMes),cpl=K.midia?K.inv/K.midia:null;
    return {diasPass,diasMes,cont,proj,metaC,cpl,metaCpl,inv:K.inv,ok:proj>=metaC,ritmo:Math.round(metaC*diasPass/diasMes),real:true}}
  // exemplo: ritmo de ~7,6 contatos e ~R$ 606 de mídia por dia
  const cont=Math.max(1,Math.round(7.56*diasPass)),inv=Math.round(606*diasPass),proj=Math.round(cont/diasPass*diasMes);
  return {diasPass,diasMes,cont,proj,metaC,cpl:inv/cont,metaCpl,inv,ok:proj>=metaC,ritmo:Math.round(metaC*diasPass/diasMes),real:false}}
function metaBlock(compact){const m=metaMes();
  if(!m.metaC)return `<div class="metab ${compact?'compact':''}"><div class="mhead"><b>Meta de contatos · ${MONTHS[+TODAY.slice(5,7)-1].toLowerCase()}</b><span class="badt">Não definida</span></div><p class="muted" style="font-size:13px;margin:6px 0 0">A meta de contatos do mês ainda não foi definida com a Spraytec. ${isTeam()?'Defina em Estratégia › Plano atual.':''}</p></div>`;const w=v=>Math.min(100,v/Math.max(m.metaC,m.proj)*100);
  return `<div class="metab ${compact?'compact':''}"><div class="mhead"><b>Meta de contatos · ${MONTHS[+TODAY.slice(5,7)-1].toLowerCase()} ${m.real?'':EX}</b><span class="${m.ok?'okt':'badt'}">${m.ok?'No caminho':'Abaixo do ritmo'}</span></div>
   <div class="mbar"><span class="mfill" style="width:${w(m.cont)}%"></span><span class="mproj" style="width:${w(m.proj)}%"></span><i class="mmeta" style="left:${w(m.metaC)}%" title="Meta: ${m.metaC}"></i></div>
   <div class="mlegend"><span><b>${m.cont}</b> até hoje (dia ${m.diasPass} de ${m.diasMes})</span><span>projeção <b>${m.proj}</b></span><span>meta <b>${m.metaC}</b></span></div>
   ${compact?'':`<div class="mlegend"><span>Custo por contato da mídia no mês <b>${m.cpl!=null?'R$ '+Math.round(m.cpl):'—'}</b> · ${m.metaCpl?'meta até R$ '+m.metaCpl:'meta não definida'}</span>${m.metaCpl&&m.cpl!=null?`<span class="${m.cpl<=m.metaCpl?'okt':'badt'}">${m.cpl<=m.metaCpl?'dentro da meta':'acima da meta'}</span>`:''}</div>`}</div>`}
function perfFunil(){
  if(!funilReal())return perfFunilEx();
  const r={de:S.per.de,ate:S.per.ate},cr=cmpRange(),K=contatosReal(r),P=cr?contatosReal(cr):null;
  const rs=v=>brl(Math.round(v)),cpl=x=>x&&x.midia?x.inv/x.midia:null,pc=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const desde=siteDesde(),antes=desde&&r.de<desde,semSite=!metaTem('ga4');
  const k=kpisC([{l:'Investimento em mídia',v:rs(K.inv),s:[K.invM&&'Meta '+rs(K.invM),K.invG&&'Google '+rs(K.invG)].filter(Boolean).join(' · ')||'Meta Ads e Google Ads',cur:K.inv,prev:P&&P.inv,prevTxt:P&&rs(P.inv)},
    {l:'Contatos',v:n(K.total),s:'site, formulários e conversas',cur:K.total,prev:P&&P.total,prevTxt:P&&n(P.total)},
    {l:'Contatos da mídia paga',v:n(K.midia),s:K.total?pc(K.midia,K.total)+' do total':'vindos de anúncio',cur:K.midia,prev:P&&P.midia,prevTxt:P&&n(P.midia)},
    {l:'Custo por contato da mídia',v:cpl(K)!=null?rs(cpl(K)):'—',s:'investimento ÷ contatos da mídia',cur:cpl(K),prev:cpl(P),prevTxt:cpl(P)!=null?rs(cpl(P)):null,low:true}],cr);
  const aviso=semSite?'<p class="metaaviso" style="padding:10px 12px;border-radius:8px;font-size:13px;margin:0 0 10px">O Google Analytics ainda não trouxe dados: os contatos do site não estão entrando nesta conta.</p>'
    :antes?`<p class="muted" style="font-size:13px;margin:0 0 10px">O site é medido desde ${fmt(desde)}, quando o Tag Manager foi instalado. Antes disso, só entram os contatos dos anúncios da Meta.</p>`:'';
  const steps=[['Impressões',K.im],['Cliques',K.c],['Contatos da mídia',K.midia]];
  const funil=K.im?`<div class="funil">${steps.map((st,i)=>{const w=Math.max(18,100-i*25);const conv=i&&steps[i-1][1]?st[1]/steps[i-1][1]*100:null;
    return `<div class="fstep"><div class="fbar" style="width:${w}%"><span>${st[0]}</span><b>${fk(st[1])}</b></div><span class="fconv">${conv!=null?pct(conv)+' do passo anterior':''}</span></div>`}).join('')}</div>
    <p class="muted" style="font-size:12px;margin:8px 0 0">Dos ${n(K.midia)} contatos da mídia: ${n(K.mc)} ${K.mc===1?'conversa iniciada':'conversas iniciadas'} pelo anúncio, ${n(K.mf)} ${K.mf===1?'formulário':'formulários'} da Meta e ${n(K.sitePago)} pelo site, vindos de anúncio.</p>`
    :'<p class="muted">Nenhum anúncio veiculou no período.</p>';
  // de onde vieram: o que é mídia paga primeiro, depois cada canal do site
  const orig=[['Conversa iniciada por anúncio','WhatsApp, Direct ou Messenger',K.mc,true],['Formulário da Meta','preenchido dentro do Facebook ou Instagram',K.mf,true],
    ...[...K.can].map(([c,v])=>['Site · '+canalPt(c),CANAL_PAGO(c)?'veio de anúncio':'',v,CANAL_PAGO(c)])].filter(x=>x[2]>0).sort((a,b)=>(b[3]-a[3])||b[2]-a[2]);
  const tipos=[['Formulário do site',K.evs.get('lead_formulario')||0],['WhatsApp do site',K.evs.get('lead_whatsapp')||0],
    ...[...K.evs].filter(([e])=>!EV_CONTATO[e]).map(([e,v])=>[e,v]),['Conversa iniciada por anúncio',K.mc],['Formulário da Meta',K.mf]].filter(x=>x[1]>0);
  const tab=(cab,linhas)=>`<div class="tablewrap" style="border:0"><table class="ap" style="min-width:0"><thead><tr>${cab.map((c,i)=>`<th${i?' class="mono"':''}>${c}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div>`;
  const origens=K.total?`<div class="grid2"><div><h3 style="font-size:14px;margin:0 0 6px">De onde vieram</h3>${tab(['Origem','Contatos','%'],orig.map(([l,s2,v,pago])=>`<tr><td><b>${esc(l)}</b>${s2?`<div class="muted" style="font-size:12px">${pago?tagPill('Mídia paga','--k-trafego')+' ':''}${esc(s2)}</div>`:''}</td><td class="mono">${n(v)}</td><td class="mono">${pc(v,K.total)}</td></tr>`))}</div>
    <div><h3 style="font-size:14px;margin:0 0 6px">Como chegaram</h3>${tab(['Tipo','Contatos','%'],tipos.map(([l,v])=>`<tr><td>${esc(l)}</td><td class="mono">${n(v)}</td><td class="mono">${pc(v,K.total)}</td></tr>`))}</div></div>`
    :'<p class="muted">Nenhum contato no período.</p>';
  const camps=contatosPorCampanha(r);
  const campT=camps.length?`<div class="tablewrap" style="border:0"><table class="ap" style="min-width:620px"><thead><tr><th>Campanha</th><th>Investimento</th><th>Contatos</th><th>Custo por contato</th></tr></thead><tbody>
   ${camps.map(c=>`<tr><td><b>${esc(c.nome)}</b><div class="muted" style="font-size:12px">${c.plat}${c.obj?' · '+esc(c.obj):''}${c.pix?' · '+n(c.pix)+' pelo site (pixel)':''}</div></td><td class="mono">${rs(c.inv)}</td><td class="mono">${n(Math.round(c.ct))}</td><td class="mono">${c.ct?rs(c.inv/c.ct):'—'}</td></tr>`).join('')}</tbody></table></div>
   <p class="muted" style="font-size:12px;margin:6px 0 0">Nesta tabela, cada plataforma atribui os contatos às próprias campanhas, incluindo os envios do site que ela credita ao anúncio. Por isso a soma pode ser diferente do total acima, que conta cada contato uma vez.</p>`
    :'<p class="muted">Nenhuma campanha veiculou no período.</p>';
  return `<section class="panel">${metaBlock(false)}</section>
  ${aviso}${k}
  <section class="panel"><h2>Do anúncio ao contato</h2>${funil}</section>
  <section class="panel"><h2>Contatos do período · ${n(K.total)}</h2>${origens}</section>
  <section class="panel"><h2>Contatos por campanha</h2>${campT}</section>
  <details class="accmini"><summary>Como contamos os contatos</summary><ul class="muted" style="font-size:13px;margin:6px 0 0;padding-left:18px;line-height:1.6">
   <li><b>Site:</b> cada envio do formulário ou do WhatsApp do site, registrado pelo Google Analytics, venha a pessoa de onde vier.</li>
   <li><b>Meta:</b> conversas iniciadas pelo anúncio (WhatsApp, Direct e Messenger) e formulários preenchidos dentro do Facebook ou do Instagram.</li>
   <li><b>Sem contar duas vezes:</b> quando a pessoa clica no anúncio e preenche o formulário do site, a Meta (pelo pixel) e o Google Ads também registram. Esses registros não somam ao total, porque o site já contou.</li>
   <li><b>Mídia paga:</b> conversas e formulários da Meta, mais os envios do site de quem chegou por anúncio.</li>
   <li>Oportunidades e vendas entram quando o funil com o comercial estiver definido.</li></ul></details>`}
function perfFunilEx(){
  const F=funilStats({de:S.per.de,ate:S.per.ate},true),cr=cmpRange(),P=cr?funilStats(cr,false):null;
  const steps=[['Impressões',F.impr],['Cliques',F.clk],['Contatos',F.cont]];
  return `<section class="panel">${metaBlock(false)}</section>
  ${exLinha('Investimento e contatos de exemplo: entram com as plataformas de anúncio e o site.')}${kpisC([{l:'Investimento em mídia',v:brl(Math.round(F.inv)),cur:F.inv,prev:P&&P.inv,prevTxt:P&&brl(Math.round(P.inv))},{l:'Contatos',v:n(F.cont),s:'formulários e conversas',cur:F.cont,prev:P&&P.cont,prevTxt:P&&n(P.cont)},{l:'Custo por contato',v:F.cont?brl(Math.round(F.inv/F.cont)):'—',cur:F.cont?F.inv/F.cont:null,prev:P&&P.cont?P.inv/P.cont:null,prevTxt:P&&P.cont?brl(Math.round(P.inv/P.cont)):null,low:true}],cr)}
  <section class="panel"><h2>Do anúncio ao contato ${EX}</h2><div class="funil">${steps.map((s,i)=>{const w=Math.max(18,100-i*25);const conv=i?s[1]/steps[i-1][1]*100:null;
    return `<div class="fstep"><div class="fbar" style="width:${w}%"><span>${s[0]}</span><b>${fk(s[1])}</b></div><span class="fconv">${conv!=null?pct(conv)+' do passo anterior':''}</span></div>`}).join('')}</div>
   <p class="muted" style="font-size:12px;margin:8px 0 0">Impressões, cliques e contatos vêm das plataformas de anúncio e do site. Oportunidades e vendas entram depois, quando o funil com o comercial estiver definido.</p></section>
  <section class="panel"><h2>Contatos por campanha ${EX}</h2><div class="tablewrap" style="border:0"><table class="ap" style="min-width:560px"><thead><tr><th>Campanha</th><th>Investimento</th><th>Contatos</th><th>Custo por contato</th></tr></thead><tbody>
   ${CAMP_RET.map(c=>{const f=perF();const inv=c[2]*f,ct=Math.round(c[3]*f);return `<tr><td><b>${c[0]}</b><div class="muted" style="font-size:12px">${c[1]}</div></td><td class="mono">${brl(Math.round(inv))}</td><td class="mono">${ct}</td><td class="mono">${ct?brl(Math.round(inv/ct)):'—'}</td></tr>`}).join('')}</tbody></table></div></section>`}

// ---------- DESDE A SUA ÚLTIMA VISITA ----------
function novidadesBlock(){
  const desde=ULTIMA_VISITA?ULTIMA_VISITA.slice(0,10):addDays(TODAY,-2);
  const pubs=posts.filter(p=>p.status==='publicado'&&p.date&&p.date>=desde&&p.date<=TODAY&&['ig','fb','yt'].includes(p.rede));
  const its=[];
  if(plano&&plano.pendente)its.push({tag:['ESTRATÉGIA','--k-trafego'],t:'Nova versão do plano de mídia '+(isM()?'para aprovar':'enviada'),a:'data-view="plano"'});
  const rx=RELATORIOS.find(r=>r.tipo==='Executivo semanal'&&r.status==='entregue');if(rx)its.push({tag:['RELATÓRIO','--k-email'],t:rx.t+' disponível',a:`data-act="rel-ver" data-id="${rx.id}"`});
  its.push({tag:['RESULTADO','--ok'],ex:!funilReal(),t:'Contatos no mês: '+metaMes().cont+', projeção de '+metaMes().proj+(metaMes().metaC?' para a meta de '+metaMes().metaC:' (meta ainda não definida)'),a:'data-view="performance"'});
  if(!isDir()){if(pubs.length)its.push({tag:['POSTS','--k-post'],t:pubs.length+(pubs.length>1?' posts publicados':' post publicado')+' desde então',a:'data-view="calendario"'});const un=unreadCount();if(un)its.push({tag:['CONVERSA','--k-spraytec'],t:un+(un>1?' mensagens novas':' mensagem nova')+(isM()?' com a Cancha':' da Spraytec'),a:'data-act="ir-chat"'});
    const late=demandas.filter(d=>!d.feito&&d.data<TODAY&&d.quem==='spraytec');if(late.length)its.push({tag:['DEMANDA','--bad'],t:late.length+(late.length>1?' demandas atrasadas':' demanda atrasada')+' com a Spraytec',a:`data-dem="${late[0].id}"`})}
  return `<section class="panel novid"><div class="mhead"><h2>Desde a sua última visita</h2><span class="muted" style="font-size:12px">${ULTIMA_VISITA?fmtVisita(ULTIMA_VISITA):'primeira visita'}</span></div><div class="list">${its.map(x=>`<button class="nrow" ${x.a}>${ktag(x.tag[0],x.tag[1])}<span>${esc(x.t)}${x.ex?' '+EX:''}</span><span class="muted">›</span></button>`).join('')}</div></section>`}

// ---------- RELATÓRIOS EXECUTIVO E GERENCIAL (gerados automaticamente) ----------
function relAuto(r){return r.tipo==='Executivo semanal'||r.tipo==='Gerencial semanal'}
function drawerRelView(){const r=RELATORIOS.find(x=>x.id===S.drawer.id);const ed=isTeam()&&r.status==='rascunho';const m=metaMes();
  const K=r.k||{cont:52,contP:44,cpl:82,cplP:91,alc:24100,alcP:19800,pub:4};
  const kp=`<div class="kpis">${[['Contatos na semana',K.cont,K.contP,0],['Custo por contato','R$ '+K.cpl,'R$ '+K.cplP,1],['Alcance nas redes',fk(K.alc),fk(K.alcP),0],['Projeção do mês',m.metaC?m.proj+' / '+m.metaC:m.proj+' · sem meta',null,0]].map(([l,v,pv,low])=>`<div class="kpi"><div class="l">${l} ${EX}</div><div class="v">${v}</div>${pv?`<div class="l">semana anterior: ${pv}</div>`:''}</div>`).join('')}</div>`;
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
  <div class="content">${ed?'<div class="notice">Os números já vieram das plataformas. Revise os textos e valide para o cliente ver.</div>':''}${body}
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
  return `${MOSTRAR_EXEMPLO?exLinha('Guia de exemplo: o guia de marca da Spraytec entra quando o material dela for cadastrado.'):''}<div class="toolbar"><p class="sub" style="margin:0">A referência de quem produz conteúdo para a Spraytec. Logos, fontes e cores ficam em Materiais, na pasta Guia de marca.</p><div class="actions"><button class="btn" data-act="guia-arquivos">Arquivos da marca</button>${isTeam()?'<button class="btn primary" data-act="guia-edit">Editar guia</button>':''}</div></div>
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
   ${p.formato==='plano'?'<button class="linkbtn" data-act="ver-mud" data-id="pendente">Ver alterações do plano</button>':`<div class="caption" style="max-height:120px;overflow:auto">${esc(p.status==='pauta_aprovacao'?p.pauta:p.legenda)}</div>`}
   <button class="btn primary big" data-act="rap-aprovar" data-id="${p.id}">Aprovar</button>
   <details class="padj2"><summary class="btn big" style="text-align:center;list-style:none">Pedir ajuste</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><textarea id="rap-adj" class="pe" placeholder="O que precisa mudar?"></textarea><button class="btn danger" data-act="rap-ajuste" data-id="${p.id}">Enviar ajuste</button></div></details>
   <button class="linkbtn" data-act="rap-pular" style="align-self:center">Pular por enquanto</button>
   <p class="muted" style="font-size:12px;margin:0;text-align:center">Pensado para o celular: aprove um item por vez.</p></div>`}
function relRowRasc(r){return `<details class="rrow"><summary>${ktag('RASCUNHO','--warn')}<span class="rt"><b>${esc(r.t)}</b><span class="muted">${esc(r.per)} · gerado automaticamente</span></span><span class="rd mono">${fmt(r.entrega)}</span><span class="ra"><button class="linkbtn" data-act="rel-ver" data-id="${r.id}">Revisar e validar</button></span></summary></details>`}

function mcard(title,go,goLabel,body){return `<section class="panel mcard"><div class="mhead"><h2>${title}</h2><button class="linkbtn" data-view="${go}">${goLabel} ›</button></div>${body}</section>`}
// Início enxuto: três números, a estratégia numa linha e as conversas logo em seguida.
// Todo Reel do Instagram também vai para os Shorts do YouTube (combinado com a Spraytec em 10/11).
// Um Short conta para o Reel quando sai no mesmo dia ou até 7 dias depois; primeiro casa pelo assunto (palavras
// em comum entre o título do Short e a legenda; mesmo dia vale mais). Aviso só para a Cancha, a partir de 10/11, e só depois do dia seguinte ao Reel (dá tempo de subir o Short).
const SHORTS_DESDE='2026-11-10';
const PAL_FORA=new Set('spraytec para como mais pela pelo com sua seu nossa nosso esta este essa esse voce quer fale site acesse agro brasil safra lavoura'.split(' '));
const palavras=t=>new Set(semAcento(t).split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!PAL_FORA.has(w)));
function reelsSemShort(){if(!isTeam()||!metaTem('ig'))return [];
  const sh=metaTem('yt')?META.yt.videos.filter(v=>v.formato==='short'&&v.date>=SHORTS_DESDE):[];
  const reels=META.posts.filter(x=>x.rede==='ig'&&x.formato==='reel'&&x.date>=SHORTS_DESDE&&x.date<addDays(TODAY,-1)).sort((a,b)=>a.ts.localeCompare(b.ts));
  const pares=[];reels.forEach((r,i)=>{const pr=palavras(r.legenda);sh.forEach((v,k)=>{if(v.date<r.date||v.date>addDays(r.date,7))return;
    const sc=[...palavras(v.titulo)].filter(w=>pr.has(w)).length*2+(v.date===r.date?3:0);if(sc>=3)pares.push([sc,i,k])})});
  const rOk=new Set(),vOk=new Set();pares.sort((a,b)=>b[0]-a[0]).forEach(([,i,k])=>{if(!rOk.has(i)&&!vOk.has(k)){rOk.add(i);vOk.add(k)}});
  // sem assunto em comum, qualquer Short que sobrou no prazo também conta (o aviso só aparece quando falta mesmo)
  reels.forEach((r,i)=>{if(rOk.has(i))return;const k=sh.findIndex((v,j)=>!vOk.has(j)&&v.date>=r.date&&v.date<=addDays(r.date,7));if(k>=0){rOk.add(i);vOk.add(k)}});
  return reels.filter((r,i)=>!rOk.has(i))}
function avisoShorts(){const l=reelsSemShort();if(!l.length)return '';
  return `<section class="panel"><h2 style="margin:0">${l.length===1?'1 Reel sem Short':l.length+' Reels sem Short'} no YouTube</h2><p class="muted" style="margin:4px 0 8px;font-size:13px">Todo Reel do Instagram também vai para os Shorts do YouTube, com até 1 minuto. Só a Cancha vê este aviso.</p>
  <div class="list">${l.map(r=>`<div class="row"><span class="mono muted" style="font-size:12px;min-width:44px">${fmt(r.date)}</span><div class="grow">${esc(r.titulo)}</div><a class="linkbtn" href="${esc(r.link||'#')}" target="_blank" rel="noopener">Ver Reel ›</a></div>`).join('')}</div></section>`}
function viewHoje(){
  if(!plano)return `${head('Início')}<p class="muted">Ainda não há dados cadastrados.</p>`;
  const cur=plano.dados,pd=plano.pendente,tot=totVerba(pd?pd.dados:cur);
  const n=badgeCount();
  const pz=pendingApprovals().map(prazoDe).concat(roteirosPend().map(v=>v.prazo).filter(Boolean)).sort()[0];
  const late=demandas.filter(d=>!d.feito&&d.data<TODAY);
  const num=(b,l,view,cls)=>{const tag=view?'button':'div';return `<${tag} class="hnum ${cls||''}" ${view?`data-view="${view}"`:''}><b>${b}</b><span>${l}</span></${tag}>`};
  const meuLado=isM()?'spraytec':'cancha',minhas=isDir()?[]:acoes().filter(o=>o.quem===meuLado),pzM=minhas.map(o=>o.prazo).filter(Boolean).sort()[0],atr=minhas.filter(o=>o.late).length;
  const nums=!isDir()?`<section class="hnums">
    <button class="hnum" data-act="go-quem"><b>${minhas.length}</b><span>${isM()?(minhas.length===1?'item esperando você':'itens esperando você'):(minhas.length===1?'tarefa com a Cancha':'tarefas com a Cancha')}</span></button>
    <button class="hnum ${pzM&&pzM<TODAY?'bad':''}" data-act="go-quem"><b>${pzM?fmt(pzM):'—'}</b><span>${pzM?(pzM<TODAY?'prazo vencido':'prazo mais próximo'):'nenhum prazo aberto'}</span></button>
    <button class="hnum ${atr?'bad':''}" data-act="go-quem"><b>${atr}</b><span>${atr===1?'item atrasado':'itens atrasados'}</span></button></section>`:`<section class="hnums">
    ${num(n,isM()?(n===1?'item esperando você':'itens esperando você'):isDir()?'itens em aprovação':'itens com a Spraytec para aprovar',isDir()?'':'aprovacao')}
    ${num(pz?fmt(pz):'—',pz?(pz<TODAY?'prazo vencido':'prazo mais próximo'):'nenhum prazo aberto',isDir()?'':'aprovacao',pz&&pz<TODAY?'bad':'')}
    ${num(late.length,late.length===1?'demanda atrasada':'demandas atrasadas',isDir()?'':'calendario',late.length?'bad':'')}</section>`;
  const linhaEst=`<button class="hlinha" data-view="plano"><span class="eyebrow">Estratégia</span><span class="hl-obj">${esc(cur.objetivo)}</span><span class="hl-meta">${temMeta(cur.metas.contatos)?cur.metas.contatos+' contatos/mês':'meta de contatos não definida'}${temMeta(cur.metas.cpl)?' · até R$ '+cur.metas.cpl+' por contato':''} · ${brl(tot)}/mês em mídia</span>${pd?`<span class="hl-novo"><span class="pdot"></span>Versão ${pd.versao} ${isM()?'para aprovar':'aguardando aprovação'}</span>`:`<span class="hl-meta">Versão ${plano.versao} em vigor</span>`}<span class="hl-ir">›</span></button>`;
  const exec=RELATORIOS.find(x=>x.tipo==='Executivo semanal'&&x.status==='entregue');
  const linhaExec=exec?`<button class="hlinha" data-act="rel-ver" data-id="${exec.id}"><span class="eyebrow">Resumo executivo</span><span class="hl-obj">${esc(exec.frase||exec.t)}</span><span class="hl-meta">${esc(exec.t)}</span><span class="hl-ir">›</span></button>`:'';
  return `<div class="headrow hello"><div><div class="eyebrow">Spraytec Brasil · ${fmtLong(TODAY)}</div><h1>${'Olá, '+esc(EU.nome.split(' ')[0])}</h1></div></div>
  ${nums}
  ${isDir()?'':cicloStrip(addMonth(TODAY.slice(0,7),1))}
  ${avisoShorts()}
  ${linhaEst}
  ${isDir()?linhaExec:chatSection()}
  ${novidadesBlock()}`;
}

// APROVAÇÃO
const ATIPOS=[['todos','Todos'],['Pauta','Pautas'],['Textos','Textos'],['Post','Posts'],['Story','Stories'],['Vídeo','Vídeos'],['E-mail marketing','E-mail marketing'],['Plano de mídia','Plano de mídia'],['Peça de anúncio','Peças de anúncio']];
// Na Aprovação: a preparação em andamento (mês seguinte) e a do mês atual enquanto não terminou.
// Na Aprovação: a preparação do mês seguinte e, se quiser adiantar (insumos de janeiro, por exemplo), a dos meses depois.
function cicloAprov(){if(isDir())return '';const m0=TODAY.slice(0,7),prox=addMonth(m0,1),a=m0>=CICLO_DESDE&&!cicloEtapas(m0).S8.slice(0,7).every(x=>x.done)?cicloStrip(m0):'';
  const ms=[0,1,2,3,4,5].map(k=>addMonth(prox,k)).filter(m=>m>=CICLO_DESDE),sel=ms.includes(S.apm)?S.apm:ms[0];if(!sel)return a;
  const nav=`<div class="filters apmnav" role="group" aria-label="Mês da preparação"><span class="muted" style="font-size:12px">Preparar o calendário de</span>${ms.map(m=>`<button class="chip" data-act="apm" data-m="${m}" aria-pressed="${m===sel}">${MONTHS[+m.slice(5)-1]}${m.slice(0,4)!==m0.slice(0,4)?' '+m.slice(0,4):''}</button>`).join('')}</div>`;
  return a+nav+cicloStrip(sel)}
// Na tabela: a arte de verdade quando já foi anexada; antes disso (pauta, textos), só o formato.
function miniAprov(p){const capa=capaDe(p);if(capa)return `<span class="amini"><img src="${capa}" alt="" loading="lazy" data-falha></span>`;
  return `<span class="amini vazio" style="--kc:var(--k-${tipoCal(p)})">${esc(FORMATO[p.formato]||"")}</span>`}
function viewAprovacao(){
  const rows=[...posts.filter(p=>['pauta_aprovacao','texto_aprovacao','aprovacao','ajuste'].includes(p.status)).sort((a,b)=>(a.date||'9').localeCompare(b.date||'9')).map(p=>({p,tipo:tipoAprov(p)})),...roteirosPend().map(v=>({v,tipo:'Vídeo'}))];
  const vis=rows.filter(r=>S.atipo==='todos'||r.tipo===S.atipo);
  const cnt=t=>rows.filter(r=>(t==='todos'||r.tipo===t)&&!(r.p&&r.p.status==='ajuste')).length;
  const keys=vis.filter(r=>!(r.p&&r.p.status==='ajuste')).map(r=>r.p?r.p.id:'v:'+r.v.id);S.selKeys=keys;const nSel=keys.filter(k=>S.sel[k]).length;const all=keys.length&&nSel===keys.length;
  return `${head('Aprovação',isM()?'Tudo o que espera por você numa tabela só. Marque e aprove de uma vez, ou abra o item para ver em tamanho real e pedir ajuste.':'Itens com a Spraytec: pautas e peças. Aprovação por WhatsApp ou e-mail é registrada dentro do item.')}
  ${cicloAprov()}
  <div class="toolbar"><div class="filters">${ATIPOS.filter(([k])=>k==='todos'||rows.some(r=>r.tipo===k)).map(([k,l])=>`<button class="chip" data-atipo="${k}" aria-pressed="${S.atipo===k}">${l} · ${cnt(k)}</button>`).join('')}</div>
   ${isM()?'<div class="actions"><button class="btn" data-act="rapida">Aprovar um por um</button><button class="btn primary" data-act="approve-sel">Aprovar selecionados'+(nSel?' ('+nSel+')':'')+'</button></div>':''}</div>
  <div class="tablewrap"><table class="ap aprov"><thead><tr>${isM()?`<th><input type="checkbox" data-selall="1" aria-label="Selecionar todos" ${all?'checked':''} ${keys.length?'':'disabled'}></th>`:''}<th>Item</th><th>Tipo</th><th>Publicação</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>
  ${vis.map(r=>{
    if(r.v){const v=r.v;return `<tr>${isM()?`<td><input type="checkbox" data-selv="${v.id}" ${S.sel['v:'+v.id]?'checked':''} aria-label="Selecionar"></td>`:''}<td><div class="itemcell clickable" data-video="${v.id}"><div class="mini"><div class="pv doc"><span class="sm">ROTEIRO</span></div></div><div><div class="t">Roteiro: ${esc(v.titulo)}</div><div class="muted" style="font-size:12px">Para a produtora gravar</div></div></div></td><td>Vídeo</td><td class="due">gravação ${v.gravacao}</td><td class="due">${fmtLong(v.prazo)}</td><td>${tagPill('Roteiro em aprovação','--s-aprovacao')}</td><td>${isM()?`<button class="btn" data-act="v-next" data-id="${v.id}">Aprovar</button>`:''}</td></tr>`}
    const p=r.p,pz=prazoDe(p),hot=pz<=addDays(TODAY,1);
    return `<tr>${isM()?`<td>${p.status!=='ajuste'?`<input type="checkbox" data-sel="${p.id}" ${S.sel[p.id]?'checked':''} aria-label="Selecionar">`:''}</td>`:''}<td><div class="itemcell clickable" data-open="${p.id}">${miniAprov(p)}<div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="muted" style="font-size:12px">${NETNAME[p.rede]} · ${FORMATO[p.formato]}</div></div></div></td><td>${r.tipo}</td><td class="due">${fmtLong(p.date)}${p.time?' '+p.time:''}</td><td class="due ${hot&&p.status!=='ajuste'?'hot':''}">${p.status==='ajuste'?'com a Cancha':fmtLong(pz)}</td><td>${pill(p)} ${marcas(p)}</td>
    <td>${isM()&&p.status!=='ajuste'?`<div class="actions" style="flex-wrap:nowrap"><button class="btn primary" data-act="approve" data-id="${p.id}">${p.status==='pauta_aprovacao'?'Aprovar pauta':p.status==='texto_aprovacao'?'Aprovar textos':'Aprovar'}</button><button class="btn" data-open="${p.id}">Ajuste</button></div>`:`<button class="btn" data-open="${p.id}">Abrir</button>`}</td></tr>`}).join('')||`<tr><td colspan="7" class="muted">Nada para aprovar.</td></tr>`}
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
    return `<div class="wk" style="grid-template-rows:26px ${lanes?`repeat(${lanes},22px) `:''}auto">${w.map((d,i)=>{const out=!d.startsWith(month);if(out)return `<div class="day out" style="grid-column:${i+1};grid-row:1 / -1" aria-hidden="true"></div>`;return `<div class="day ${d===TODAY?'today':''}" data-day="${d}" style="grid-column:${i+1};grid-row:1 / -1"><div class="dn"><span>${Number(d.slice(8))}</span>${feriado(d)?`<span class="hol">${feriado(d)}</span>`:''}${addAct?`<button class="addd" data-act="${addAct}" data-date="${d}" aria-label="Adicionar em ${fmt(d)}">+</button>`:''}</div>${lanes?`<div style="height:${lanes*22}px;flex:none"></div>`:''}${out?'':renderDay(d)}</div>`}).join('')}
      ${segs.map(x=>`<button class="band b-${x.m.tipo} ${x.st?'s':''} ${x.en?'e':''}" data-act="${isTeam()?'marcos':''}" style="grid-column:${x.s+1} / ${x.e+2};grid-row:${x.L+2}" title="${esc(MK_TIPO[x.m.tipo]+': '+x.m.nome+' · '+fmt(x.m.ini)+' a '+fmt(x.m.fim))}"><b>${MK_TIPO[x.m.tipo]}</b><span>${esc(x.m.nome)}</span></button>`).join('')}</div>`}).join('')}</div>`;
}
function monthNav(key){const [y,m]=S[key].split('-').map(Number);return `<div class="monthnav"><button class="iconbtn" data-month="-1" data-mk="${key}" aria-label="Mês anterior">‹</button><h2>${MONTHS[m-1]} ${y}</h2><button class="iconbtn" data-month="1" data-mk="${key}" aria-label="Próximo mês">›</button></div>`}
function calItem(p){
  const drag=isTeam()&&p.status!=='publicado';const k=tipoCal(p);
  return `<div class="it" style="--kc:var(--k-${k})" data-open="${p.id}" ${drag?`draggable="true" data-drag="${p.id}"`:''} title="${esc(p.titulo)}">
    <div class="lb"><span class="kt">${{post:NET[p.rede],email:'E-MAIL',design:'DESIGN',video:'VÍDEO'}[k]}</span><span class="mono">${[p.time,FORMATO[p.formato]].filter(Boolean).join(' · ')}</span>${(n=>n?`<span class="lk" title="Ligado a ${n} itens">↔${n}</span>`:'')(related('p:'+p.id).length)}</div><b class="itt">${esc(p.titulo)}</b><span class="itst" style="--sc:var(${stInfo(p).c})"><i></i>${stCurto(p)}</span></div>`;
}
function viewCalendario(){
  const vp=posts.filter(p=>tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]);
  const byTime=(a,b)=>(a.time||'99').localeCompare(b.time||'99');
  const [y,m]=S.month.split('-').map(Number);const days=new Date(Date.UTC(y,m,0)).getUTCDate();
  const list=Array.from({length:days},(_,i)=>S.month+'-'+String(i+1).padStart(2,'0')).filter(d=>vp.some(p=>p.date===d)).map(d=>`<section class="panel"><div class="eyebrow">${fmtLong(d)}</div><div class="items">${vp.filter(p=>p.date===d).sort(byTime).map(calItem).join('')}</div></section>`).join('');
  const mk=MARCOS.filter(x=>x.ini<=S.month+'-31'&&x.fim>=S.month+'-01');
  const espera=vp.filter(p=>p.status==='espera');
  if(S.calv==='video')S.calv='kanban';
  const sw=`<div class="seg" role="group" aria-label="Visão"><button data-calv="mes" aria-pressed="${(S.calv||'mes')==='mes'}">Calendário</button>${isTeam()||isM()?`<button data-calv="kanban" aria-pressed="${S.calv==='kanban'}">Kanban</button>`:''}</div>`;
  if(S.calv==='kanban'&&(isTeam()||isM())){const g=S.kgrp||'quem';
    const grp=`<div class="toolbar">${quemBar()}<div class="seg" role="group" aria-label="Agrupar por"><button data-kgrp="quem" aria-pressed="${g==='quem'}">Com quem está</button><button data-kgrp="etapa" aria-pressed="${g==='etapa'}">Etapa</button></div></div>`;
    return `${head('Calendário','O que vai ao ar, o que cada time precisa fazer e até quando.',sw)}${grp}${g==='quem'?viewQuem():isTeam()?viewStatusKanban():viewClientKanban()}`}
  return `${head('Calendário','Posts, e-mail, produção de design e vídeo e as demandas, tudo ligado. Clique num item para ver os detalhes e o que está ligado a ele.',sw)}
  <div class="toolbar">${monthNav('month')}
   <div class="filters" role="group" aria-label="Tipos">${TIPOS.map(([k,l])=>`<button class="chip kchip" style="--kc:var(--k-${k})" data-tipo="${k}" aria-pressed="${S.tipos[k]}"><i></i>${l}</button>`).join('')}</div>
   <div class="actions">${isTeam()?'<button class="btn" data-act="marcos">Editar safra, eventos e feriados</button><button class="btn" data-act="importar">Planilha</button>':''}<button class="btn primary" data-act="cal-add" data-date="">+ Adicionar</button></div></div>
  <div class="calwrap">
   ${calGrid(S.month,d=>vp.filter(p=>p.date===d).sort(byTime).map(calItem).join('')+(S.tipos.demanda?demandas.filter(x=>x.data===d).map(x=>demChip(x,!isDir())).join(''):''),true,'cal-add')}
   <div class="calist"><section class="panel"><div class="eyebrow" style="margin-bottom:6px">Safra, comercial e eventos</div><div class="mkchips">${mk.length?'':'<span class="muted" style="font-size:13px">Nenhum evento cadastrado neste mês.</span>'}${mk.map(x=>`<button class="band b-${x.tipo}" data-act="${isTeam()?'marcos':''}"><b>${MK_TIPO[x.tipo]}</b><span>${esc(x.nome)} · ${fmt(x.ini)}–${fmt(x.fim)}</span></button>`).join('')}</div></section>${list||'<p class="muted">Nada neste mês.</p>'}</div>
   ${espera.length?`<section class="espera" data-day="espera"><div class="eyebrow">Em espera, sem data · ${espera.length}</div><div class="items">${espera.map(calItem).join('')}</div></section>`:''}
  </div>`;
}

// REDES SOCIAIS
const IG_EXTRA=[['Dia do agrônomo','Institucional'],['Colheita do trigo no PR','Campo'],['Como ler a bula foliar','Educação'],['Bastidores do laboratório','Institucional']];
function viewRedes(){
  const tabs=[['instagram','Instagram'],['facebook','Facebook'],['youtube','YouTube']];
  if(META===undefined)return metaCarregando('Redes sociais','Instagram, Facebook e YouTube da Spraytec dentro do portal.')+subtabs(tabs,'rede','Redes');
  const conn=S.rede==='youtube'?(metaTem('yt')?metaRodape(['yt'],'YouTube'):''):metaRodape([S.rede==='instagram'?'ig':'fb'].filter(f=>META&&META.conectado||metaTem(f)));
  let body='';
  if(S.rede==='youtube'&&metaTem('yt'))body=redesYT()+ytConexao();
  else if(S.rede==='youtube'&&YT.conectado)body=`<p class="muted">Canal conectado. Buscando os vídeos e os números do YouTube…</p>${META&&META.situacao.yt&&META.situacao.yt.erro&&isTeam()?`<p class="badt" style="font-size:13px">${esc(META.situacao.yt.erro)}</p>`:''}${ytConexao()}`;
  else if(S.rede==='instagram'&&metaTem('ig'))body=redesIG();
  else if(S.rede==='facebook'&&metaTem('fb'))body=redesFB();
  else if(S.rede==='instagram'){
    const ig=posts.filter(p=>p.rede==='ig'&&['publicado'].includes(p.status)).sort((a,b)=>b.date.localeCompare(a.date));
    const hoje=stories.filter(s=>s.date===TODAY);
    const tiles=[...ig.map(p=>({t:p.titulo,c:PILAR_HUE[p.pilar],f:p.formato,id:p.id})),...IG_EXTRA.map(x=>({t:x[0],c:PILAR_HUE[x[1]]}))];
    body=`<div class="prof"><span class="avbig">S</span><div style="display:flex;flex-direction:column;gap:8px"><b style="font-size:18px">${igUser()}</b><div class="cnts"><span><b>412</b> publicações</span><span><b>18,6 mil</b> seguidores</span><span><b>210</b> seguindo</span></div><span class="muted" style="font-size:13px">Spraytec Brasil · Nutrição vegetal · Maringá/PR</span></div></div>
     <section class="panel"><div class="headrow" style="margin-bottom:8px"><h2 style="margin:0">Stories no ar agora · ${hoje.length}</h2><span class="muted" style="font-size:12px">Depois de 24 h, ficam guardados no Acervo › Stories.</span></div>
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
    body=ytConexao()+`<div class="cover" style="background:linear-gradient(120deg,#16331F,#235F3F 60%,#6FA83A)"></div><div class="prof" style="padding:0 4px"><span class="avbig" style="box-shadow:none">S</span><div><b style="font-size:18px">Spraytec Brasil</b><div class="muted" style="font-size:13px">@spraytecbrasil · 3,1 mil inscritos · 86 vídeos</div></div></div>
     <h2 style="font-size:16px">Vídeos</h2><div class="ytgrid">${vids.map(v=>`<div class="ytv" ${v.id?`data-open="${v.id}"`:''}><div class="th" style="background:${v.c}">${esc(v.t)}<small>${v.st&&v.st!=='publicado'?'em breve':'8:42'}</small></div><b style="font-size:13px">${esc(v.t)}</b><span class="muted" style="font-size:12px">Spraytec Brasil</span></div>`).join('')}</div>
     <h2 style="font-size:16px">Shorts</h2><div class="postgrid">${yt.filter(p=>p.formato==='short').map(p=>`<div data-open="${p.id}">${preview(p)}</div>`).join('')}</div>`;
  }
  return `${head('Redes sociais','Instagram, Facebook e YouTube da Spraytec dentro do portal.')}${subtabs(tabs,'rede','Redes')}${conn}${(S.rede==='instagram'&&metaTem('ig'))||(S.rede==='facebook'&&metaTem('fb'))||(S.rede==='youtube'&&(metaTem('yt')||YT.conectado))?'':exLinha(S.rede==='youtube'?'Canal de exemplo: o YouTube entra com a integração do Google.':'Perfil e posts de exemplo: entram com a integração do Meta.')}<div class="social">${body}</div>`;
}

// PERFORMANCE
function kpis(arr){return `<div class="kpis">${arr.map(k=>`<div class="kpi"><div class="l">${k[0]}</div><div class="v">${k[1]}</div><div class="l">${k[2]||''}</div></div>`).join('')}</div>`}
function viewPerformance(){
  const tabs=[['funil','Funil'],['trafego','Tráfego'],['social','Social'],['email','E-mail']];
  const fontes=({social:['ig','fb'],trafego:['ads']}[S.psub]||[]);
  if(META===undefined&&fontes.length)return metaCarregando('Performance','Mídia paga, redes sociais e e-mail num lugar só, com comparação entre períodos.')+subtabs(tabs,'psub','Performance');
  const body={funil:perfFunil,trafego:perfTrafego,social:perfSocial,email:perfEmail}[S.psub]();
  return `${head('Performance','Mídia paga, redes sociais e e-mail num lugar só, com comparação entre períodos.')}${periodBar()}${subtabs(tabs,'psub','Performance')}${metaRodape(fontes.filter(f=>META&&META.conectado||metaTem(f)))}${body}`;
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
  return `<div class="pv"><div class="hd">${avS()}<span><b>Spraytec Brasil</b><br><span class="sm">Patrocinado</span></span></div><div class="img" style="--bg:${bg}">${c.fmt==='Carrossel'?'<span class="cnt">1/5</span>':''}<span>${esc(c.t)}</span></div><div class="ctabar"><span class="sm">spraytec.com.br</span><b>Saiba mais ›</b></div></div>`}
const brl2=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function secCriativos(){
  const ord={cont:(a,b)=>b.cont-a.cont,cpl:(a,b)=>(a.cpl||1e9)-(b.cpl||1e9),ctr:(a,b)=>b.ctr-a.ctr,inv:(a,b)=>b.inv-a.inv}[S.cord||'cont'];
  const f=perF();const CR=CRIATIVOS.map(c=>{const x={...c,inv:Math.round(c.inv*f),impr:Math.round(c.impr*f),clk:Math.max(1,Math.round(c.clk*f)),cont:Math.round(c.cont*f)};x.ctr=x.clk/x.impr*100;x.cpc=x.inv/x.clk;x.cpl=x.cont?x.inv/x.cont:null;return x});
  const list=CR.slice().sort(ord);const best=CR.filter(c=>c.cpl).sort((a,b)=>a.cpl-b.cpl)[0];
  return `<section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Criativos ativos · ${CR.length} ${EX}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Gerenciador de Anúncios da Meta e Google Ads · ${perLabel()}.</p></div>
   <div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['cont','Contatos'],['cpl','Custo por contato'],['ctr','Taxa de cliques'],['inv','Investimento']].map(([k,l])=>`<button class="chip" data-cord="${k}" aria-pressed="${(S.cord||'cont')===k}">${l}</button>`).join('')}</div></div>
   <div class="crgrid">${list.map(c=>{const as=ADSETS.find(a=>a.id===c.as);const flag=c===best?tagPill('Melhor custo por contato','--ok'):c.cpl>plano.dados.metas.cpl?tagPill('Acima da meta de R$ '+plano.dados.metas.cpl,'--bad'):'';
     return `<article class="crcard"><div class="crprev">${adCreativePreview(c)}</div><div class="crbody">
      <div><b>${esc(c.t)}</b>${c.sub?` <span class="tag">${c.sub}</span>`:''}<div class="muted" style="font-size:12px">${as.plat} · ${c.fmt} · ${esc(as.nome)}</div></div>
      ${flag?`<div>${flag}</div>`:''}
      <div class="crm"><div><span>Investido</span><b>${brl(c.inv)}</b></div><div><span>Impressões</span><b>${n(c.impr)}</b></div><div><span>Cliques</span><b>${n(c.clk)}</b></div><div><span>Taxa de cliques</span><b>${c.ctr.toFixed(1).replace('.',',')}%</b></div><div><span>Contatos</span><b>${c.cont}</b></div><div><span>Custo por contato</span><b class="${c.cpl>plano.dados.metas.cpl?'bad':''}">${c.cpl?brl(Math.round(c.cpl)):'—'}</b></div></div>
      <div class="aud"><span class="eyebrow">Público</span><div>${esc(as.publico)}</div><div class="muted" style="font-size:12px">${as.loc}${as.idade!=='—'?' · '+as.idade+' anos':''} · ${esc(as.posic)}</div></div>
     </div></article>`}).join('')}</div></section>
  <section class="panel"><h2>Públicos dos conjuntos de anúncios ${EX}</h2><div class="tablewrap" style="border:0"><table class="ap" style="min-width:900px"><thead><tr><th>Conjunto</th><th>Onde</th><th>Idade</th><th>Quem</th><th>Fora do público</th><th>Posicionamento</th><th>Otimizado para</th><th>Orçamento</th></tr></thead><tbody>
   ${ADSETS.map(a=>`<tr><td><b>${esc(a.nome)}</b><div class="muted" style="font-size:12px">${a.plat}</div></td><td>${a.loc}</td><td>${a.idade}</td><td style="max-width:260px">${esc(a.publico)}</td><td style="max-width:200px">${esc(a.excl)}</td><td>${esc(a.posic)}</td><td>${a.otim}</td><td class="mono">${a.orc}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}

function perfTrafego(){
  const {base,T}=trafStats({de:S.per.de,ate:S.per.ate},true);const cr=cmpRange();const C=cr?trafStats(cr,false).T:null;
  const rs=v=>'R$ '+n(Math.round(v)),rs2=v=>'R$ '+v.toFixed(2).replace('.',',');
  const pl=base.map(x=>[x.k,rs(x.i),fk(x.im),fk(x.c),rs2(x.i/x.c),x.ct,x.ct?rs(x.i/x.ct):'—']);
  const tot=18200,exc=tot-15000;
  return `${siteSecao()}
  ${metaTem('ads')||metaTem('gads')?midiaReal():`${gadsConexao()}<h2 style="font-size:16px;margin:4px 0 0">Mídia paga ${EX}</h2>
  ${kpisC([{l:'Investimento',v:rs(T.i),s:'3 plataformas',cur:T.i,prev:C&&C.i,prevTxt:C&&rs(C.i)},{l:'Impressões',v:fk(T.im),cur:T.im,prev:C&&C.im,prevTxt:C&&fk(C.im)},{l:'Cliques',v:fk(T.c),s:'CTR '+pct(T.c/T.im*100),cur:T.c,prev:C&&C.c,prevTxt:C&&fk(C.c)},{l:'Contatos',v:T.ct,s:'formulário e WhatsApp',cur:T.ct,prev:C&&C.ct,prevTxt:C&&String(C.ct)},{l:'Custo por contato',v:T.ct?rs(T.i/T.ct):'—',s:plano&&temMeta(plano.dados.metas.cpl)?'meta: até R$ '+plano.dados.metas.cpl:'',cur:T.ct?T.i/T.ct:null,prev:C&&C.ct?C.i/C.ct:null,prevTxt:C&&C.ct?rs(C.i/C.ct):null,low:true}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Plataforma</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>Custo por clique</th><th>Contatos</th><th>Custo por contato</th></tr></thead><tbody>${pl.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  ${secCriativos()}`}`;
}
// SITE (Google Analytics 4)
const CANAL_PT={'Organic Search':'Busca orgânica','Direct':'Direto','Organic Social':'Social orgânico','Paid Social':'Social pago','Paid Search':'Busca paga','Referral':'Outros sites','Email':'E-mail','Unassigned':'Não identificado','Display':'Display','Organic Video':'Vídeo orgânico','Paid Video':'Vídeo pago','Cross-network':'Várias redes do Google','Paid Other':'Outros pagos','Organic Shopping':'Shopping orgânico','Paid Shopping':'Shopping pago','Affiliates':'Afiliados','SMS':'SMS','Mobile Push Notifications':'Notificações','Audio':'Áudio'};
const canalPt=c=>CANAL_PT[c]||c;
function siteStats(r){const G=META.ga4,D=G.dias.filter(x=>inR(r,x.d));const sm=(L,k)=>L.reduce((a,x)=>a+(x[k]||0),0);
  const agr=(L,k,v)=>{const m=new Map();L.filter(x=>inR(r,x.d)).forEach(x=>m.set(x[k],(m.get(x[k])||0)+(x[v]||0)));return [...m].sort((a,b)=>b[1]-a[1])};
  const ses=sm(D,'sessoes');return {ses,nov:sm(D,'novos'),eng:sm(D,'engajadas'),vis:sm(D,'visualizacoes'),ev:sm(D,'eventosChave'),
    canais:agr(G.canais,'canal','sessoes').map(([c,n])=>[c,n,G.canais.filter(x=>x.canal===c&&inR(r,x.d)).reduce((a,x)=>a+(x.eventosChave||0),0)]),
    paginas:agr(G.paginas,'pagina','visualizacoes'),eventos:agr(G.eventos,'evento','eventosChave')}}
function siteExemplo(){const f=perF(),ses=Math.round(14200*f),usu=Math.round(9800*f),con=Math.round(96*f);return kpis([['Sessões',fk(ses),'orgânico 41% · social 23% · mídia 28% · e-mail 8%'],['Usuários',fk(usu),''],['Contatos pelo site',con,'formulário e WhatsApp'],['Taxa de conversão',pct(con/ses*100),'contatos ÷ sessões']])}
function siteConexao(){if(!isTeam())return '';
  if(!GA4.configurado)return '<p class="muted" style="font-size:13px">As chaves do Google ainda não estão no servidor.</p>';
  if(!GA4.conectado)return `<div class="drivep"><div><b>Conectar o Google Analytics</b><p class="muted" style="margin:4px 0 0;font-size:13px">Antes de clicar, entre neste navegador com a conta Google que tem acesso ao GA4 da Spraytec. O portal só lê os números.</p></div><a class="btn primary" href="/api/ga4/conectar">Conectar Google Analytics</a></div>`;
  if(!GA4.propriedade)return `<div class="drivep"><div><b>Qual propriedade é a do site da Spraytec?</b><p class="muted" style="margin:4px 0 0;font-size:13px">A conta ${esc(GA4.conta||'')} enxerga mais de uma.</p></div><div class="perdates"><select id="ga4-prop" class="pe" aria-label="Propriedade do Google Analytics">${(GA4.opcoes||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.conta)}</option>`).join('')}</select><button class="btn primary sm" data-act="ga4-escolher">Usar esta</button></div></div>`;
  return `<p class="muted" style="font-size:12px;margin:8px 0 0">Conectado pela conta ${esc(GA4.conta||'')}. <button class="linkbtn" data-act="ga4-desconectar">Desconectar</button></p>`}
function siteSecao(){
  const tit=(ex)=>`<div class="headrow" style="margin-bottom:6px"><h2 style="margin:0">Site ${ex?EX:''}</h2><span class="muted" style="font-size:12px">Google Analytics 4${GA4.propriedade?' · '+esc(GA4.propriedade):''}</span></div>`;
  if(!metaTem('ga4')){
    const espera=GA4.conectado&&GA4.propriedade?`<p class="muted">Conectado. Buscando os primeiros números do Google Analytics…</p>${META&&META.situacao.ga4&&META.situacao.ga4.erro&&isTeam()?`<p class="badt" style="font-size:13px">${esc(META.situacao.ga4.erro)}</p>`:''}`:'';
    return `<section class="panel">${tit(!espera)}${espera||siteExemplo()}${siteConexao()}</section>`}
  const r={de:S.per.de,ate:S.per.ate},cr=cmpRange(),A=siteStats(r),C=cr?siteStats(cr):null;
  const semVisitas=!META.ga4.dias.some(x=>x.sessoes>0);
  const tx=(a,b)=>b?a/b*100:null,pc=v=>v==null?'—':pct(v);
  const mix=A.canais.slice(0,4).map(([c,n])=>canalPt(c).toLowerCase()+' '+Math.round(n/A.ses*100)+'%').join(' · ');
  const k=kpisC([{l:'Sessões',v:fk(A.ses),s:mix,cur:A.ses,prev:C&&C.ses,prevTxt:C&&fk(C.ses)},
    {l:'Novos usuários',v:fk(A.nov),cur:A.nov,prev:C&&C.nov,prevTxt:C&&fk(C.nov)},
    {l:'Páginas vistas',v:fk(A.vis),cur:A.vis,prev:C&&C.vis,prevTxt:C&&fk(C.vis)},
    {l:'Taxa de engajamento',v:pc(tx(A.eng,A.ses)),s:'sessões engajadas ÷ sessões',cur:tx(A.eng,A.ses),prev:C&&tx(C.eng,C.ses),prevTxt:C&&pc(tx(C.eng,C.ses)),pp:true},
    {l:'Eventos-chave',v:n(A.ev),s:'contatos marcados no GA4',cur:A.ev,prev:C&&C.ev,prevTxt:C&&n(C.ev)},
    {l:'Taxa de conversão',v:pc(tx(A.ev,A.ses)),s:'eventos-chave ÷ sessões',cur:tx(A.ev,A.ses),prev:C&&tx(C.ev,C.ses),prevTxt:C&&pc(tx(C.ev,C.ses)),pp:true}],cr);
  const aviso=semVisitas?`<p class="metaaviso" style="padding:10px 12px;border-radius:8px;font-size:13px;margin:0 0 10px"><b>O Google Analytics está conectado, mas ainda não registrou nenhuma visita.</b> A tag do GA4 (ou do Tag Manager) ainda não está instalada no site. Assim que entrar, os números aparecem aqui.</p>`:'';
  const tab=(cab,linhas,vazio)=>linhas.length?`<div class="tablewrap" style="border:0"><table class="ap"><thead><tr>${cab.map((c,i)=>`<th${i?' class="mono"':''}>${c}</th>`).join('')}</tr></thead><tbody>${linhas.map(l=>`<tr>${l.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="muted" style="font-size:13px">${vazio}</p>`;
  const det=semVisitas?'':`<div class="grid2" style="margin-top:12px"><div><h3 style="font-size:14px;margin:0 0 6px">De onde vêm as visitas</h3>${tab(['Canal','Sessões','%','Eventos-chave'],A.canais.map(([c,s,e])=>[esc(canalPt(c)),n(s),A.ses?Math.round(s/A.ses*100)+'%':'—',n(e)]),'Sem visitas no período.')}</div>
    <div><h3 style="font-size:14px;margin:0 0 6px">Páginas mais vistas</h3>${tab(['Página','Visualizações'],A.paginas.slice(0,10).map(([p,v])=>[`<span class="mono" style="font-size:12px;word-break:break-all">${esc(p)}</span>`,n(v)]),'Sem visitas no período.')}</div></div>
    ${A.eventos.length?`<div style="margin-top:12px"><h3 style="font-size:14px;margin:0 0 6px">Eventos-chave do período</h3>${tab(['Evento','Quantidade'],A.eventos.map(([e,v])=>[esc(e),n(v)]),'')}</div>`:''}`;
  return `<section class="panel">${tit(false)}${metaRodape(['ga4'],'Google Analytics')}${aviso}${k}${det}${siteConexao()}</section>`}
function avisoGA4Retorno(){const q=new URLSearchParams(location.search),r=q.get('ga4');if(!r)return;history.replaceState(null,'',location.pathname);
  const M={ok:'Google Analytics conectado. Os números do site aparecem em alguns minutos.',escolher:'Google Analytics conectado. Escolha qual propriedade é a do site.',cancelado:'A conexão com o Google Analytics foi cancelada.',expirou:'O pedido de conexão venceu. Clique em Conectar de novo.','sem-config':'As chaves do Google ainda não estão no servidor.',erro:'Não foi possível conectar o Google Analytics: '+(q.get('msg')||'erro desconhecido')};
  S.view='performance';S.psub='trafego';toast(M[r]||M.erro);if(r==='ok')[60e3,180e3].forEach(t=>setTimeout(carregarMeta,t))}
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
function socialStats(r){if(metaSocial())return socialStatsReal(r);const pub=posts.filter(p=>['ig','fb','yt'].includes(p.rede)&&p.status==='publicado'&&inR(r,p.date)&&prodOk(p.produto));const st=stories.filter(s=>inR(r,s.date)&&prodOk(s.produto));
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
function metricsOf(p){const rl=META&&p.pubLink?META.posts.find(x=>x.nl===normLink(p.pubLink)):null;if(rl)return {alc:rl.alc||0,eng:rl.eng||0,curt:rl.curt,com:rl.com,salv:rl.salv,comp:rl.comp,views:rl.views};if(p._m)return p._m;let h=0;for(const ch of p.id+p.titulo)h=(h*31+ch.charCodeAt(0))>>>0;const b=p.metrics||{};const alc=b.alcance||(p.rede==='fb'?1200:2400)+h%7000;const eng=b.eng||(p.rede==='fb'?1.5:3)+(h%45)/10;const it=Math.round(alc*eng/100);
  p._m={alc,eng,curt:Math.round(it*.72),com:Math.round(it*.08),salv:Math.round(it*.12),comp:Math.round(it*.08),views:['reel','video','short'].includes(p.formato)?Math.round(alc*1.7):null};return p._m}
function perfSocial(){
  if(metaSocial())return perfSocialReal();
  const SC=socialStats({de:S.per.de,ate:S.per.ate}),cr=cmpRange(),SP=cr?socialStats(cr):null;const pub=SC.pub,st=SC.st;
  const sum=k=>pub.reduce((a,p)=>a+metricsOf(p)[k],0);const alc=sum('alc'),inter=sum('curt')+sum('com')+sum('salv')+sum('comp');
  const engM=pub.length?pub.reduce((a,p)=>a+metricsOf(p).eng,0)/pub.length:0;
  const by=r=>pub.filter(p=>p.rede===r);
  const redes=[['ig','Instagram','18,6 mil',412],['fb','Facebook','25 mil',96],['yt','YouTube','3,1 mil',104]].map(([r,l,seg,nov])=>{const ps=by(r);const a=ps.reduce((x,p)=>x+metricsOf(p).alc,0);const e=ps.length?ps.reduce((x,p)=>x+metricsOf(p).eng,0)/ps.length:0;return [l,seg,'+'+Math.round(nov*perF()),fk(a),ps.length?pct(e):'—',ps.length+(r==='ig'?' · '+st.length+' stories':'')]});
  const ord={alc:(a,b)=>metricsOf(b).alc-metricsOf(a).alc,eng:(a,b)=>metricsOf(b).eng-metricsOf(a).eng,recent:(a,b)=>b.date.localeCompare(a.date)}[S.psort||'alc'];
  const list=pub.slice().sort(ord);const topA=pub.slice().sort((a,b)=>metricsOf(b).alc-metricsOf(a).alc)[0],topE=pub.slice().sort((a,b)=>metricsOf(b).eng-metricsOf(a).eng)[0];
  const has=SP&&(SP.pub.length||SP.st.length);
  return `${exLinha('Números de exemplo: entram com a integração do Meta.')}<div class="actions" style="align-items:center"><span class="eyebrow">Produto</span>${prodFiltro()}</div>${kpisC([{l:'Alcance',v:fk(alc),s:pub.length+' publicações',cur:alc,prev:has?SP.alc:null,prevTxt:has?fk(SP.alc):null},{l:'Interações',v:fk(inter),s:'curtidas, comentários, salvos e compartilhamentos',cur:inter,prev:has?SP.inter:null,prevTxt:has?fk(SP.inter):null},{l:'Engajamento médio',v:pct(engM),cur:engM,prev:has?SP.eng:null,prevTxt:has&&SP.eng!=null?pct(SP.eng):null,pp:true},{l:'Publicações',v:pub.length,s:'IG, FB e YT',cur:pub.length,prev:SP?SP.pub.length:null,prevTxt:SP?String(SP.pub.length):null},{l:'Stories',v:st.length,s:'alcance médio '+(SC.stAlc?fk(SC.stAlc):'—'),cur:st.length,prev:has&&cr.de>=STORIES_DESDE?SP.st.length:null,prevTxt:has&&cr.de>=STORIES_DESDE?String(SP.st.length):'sem dados'},{l:'Novos seguidores','v':'+'+SC.seg,s:'nas três redes',cur:SC.seg,prev:SP&&SP.seg,prevTxt:SP&&SP.seg!=null?'+'+SP.seg:null}],cr)}
  <div class="tablewrap"><table class="ap" style="min-width:640px"><thead><tr><th>Rede</th><th>Seguidores</th><th>Novos</th><th>Alcance</th><th>Engajamento</th><th>Publicações</th></tr></thead><tbody>${redes.map(r=>`<tr>${r.map((c,i)=>`<td class="${i?'mono':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <section class="panel"><div class="headrow" style="margin-bottom:10px"><div><h2 style="margin:0">Posts do período · ${pub.length}</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Instagram, Facebook e YouTube${S.prod?' · '+(S.prod==='—'?'sem produto':esc(S.prod)):''}.</p></div>
   <div class="filters"><span class="muted" style="font-size:12px;align-self:center">Ordenar por</span>${[['alc','Alcance'],['eng','Engajamento'],['recent','Mais recentes']].map(([k,l])=>`<button class="chip" data-psort="${k}" aria-pressed="${(S.psort||'alc')===k}">${l}</button>`).join('')}</div></div>
   ${pub.length?`<div class="crgrid">${list.map(p=>{const m=metricsOf(p);const flag=p===topA?tagPill('Maior alcance do período','--ok'):p===topE?tagPill('Maior engajamento do período','--ok'):'';
     return `<article class="crcard clickable" data-open="${p.id}"><div class="crprev">${preview(p)}</div><div class="crbody"><div><b>${esc(p.titulo)}</b><div class="muted" style="font-size:12px">${NETNAME[p.rede]} · ${FORMATO[p.formato]} · ${fmtLong(p.date)}${semProd(p.produto)?'':' · '+esc(p.produto)}</div></div>${flag?`<div>${flag}</div>`:''}
      <div class="crm"><div><span>Alcance</span><b>${fk(m.alc)}</b></div><div><span>Engajamento</span><b>${pct(m.eng)}</b></div><div><span>${m.views?'Visualizações':'Curtidas'}</span><b>${fk(m.views||m.curt)}</b></div><div><span>Comentários</span><b>${n(m.com)}</b></div><div><span>Salvamentos</span><b>${n(m.salv)}</b></div><div><span>Compartilh.</span><b>${n(m.comp)}</b></div></div></div></article>`}).join('')}</div>`:'<p class="muted">Nenhum post publicado nesse período.</p>'}</section>`;
}
function perfEmail(){
  const E=emailStats({de:S.per.de,ate:S.per.ate}),cr=cmpRange(),EP=cr?emailStats(cr):null;const camp=E.camp;const okp=EP&&EP.camp.length;
  return `${exLinha('E-mail marketing de exemplo: entra com a integração do Brevo.')}
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

// PRODUTOS: nomes que aparecem nas legendas da Spraytec (levantados em 06/11/2026), do mais específico ao mais geral.
// A sugestão automática procura esses nomes no texto do post; quem classifica pode corrigir.
// Produtos como estão no site da Spraytec (spraytec.com/produtos, conferido em 10/11/2026), por linha.
// Cada um é um produto (Tractus Reforce, não "Tractus"); citar só a linha não sugere nada.
const CATALOGO=[
 ['Fulltec Drone',/full\s*tec\s*drone/,'Lançamentos'],['Fulltec Xtreme',/full\s*tec\s*x\s*-?\s*treme/,'Lançamentos'],['Carbon Seed',/carbon\s*seed/,'Lançamentos'],['Tractus Regenerative',/tractus\s*regenerative/,'Lançamentos'],
 ['Nutrol Max',/nutrol/,'Tecnologia de Aplicação'],['Fulltec Max',/full\s*tec\s*max/,'Tecnologia de Aplicação'],['Emultec Max',/emultec/,'Tecnologia de Aplicação'],['Compative Max',/compative/,'Tecnologia de Aplicação'],['Fulltec S Max',/full\s*tec\s*s\s*max/,'Tecnologia de Aplicação'],['Imantic Orange',/imantic\s*orange(?!\s*neutro)/,'Tecnologia de Aplicação'],['Imantic Orange Neutro',/imantic\s*orange\s*neutro/,'Tecnologia de Aplicação'],['Omega',/(^|[^a-z#])omega([^a-z0-9-]|$)/,'Tecnologia de Aplicação'],
 ['Nodofix AZP',/nodo\s*fix\s*azp/,'Linha TS, Sulco e Vegetativo'],['Nodofix Feijão',/nodo\s*fix\s*feijao/,'Linha TS, Sulco e Vegetativo'],['Nodofix Soja',/nodo\s*fix\s*soja/,'Linha TS, Sulco e Vegetativo'],['Pack Seed',/pack\s*seed/,'Linha TS, Sulco e Vegetativo'],['Comotec Arranque + Níquel',/comotec/,'Linha TS, Sulco e Vegetativo'],
 ['Tractus Kit Evolution',/tractus\s*kit/,'Linha Tractus'],['Tractus Carbono',/tractus\s*carbono/,'Linha Tractus'],['Tractus Reforce',/tractus\s*reforce/,'Linha Tractus'],['Tractus Supera',/tractus\s*supera/,'Linha Tractus'],['Tractus Max',/tractus\s*max/,'Linha Tractus'],
 ['Ultra Mn Max',/(^|[^a-z])(ultra\s*)?mn\s*max/,'Linha Ultra'],['Ultra Zn Max',/(^|[^a-z])(ultra\s*)?zn\s*max/,'Linha Ultra'],['Twin Pack Max',/twin\s*pack/,'Linha Ultra'],['Ultra K Max',/ultra\s*k\s*max/,'Linha Ultra'],
 ['Absortec IR',/absortec/,'Linha Inductor'],['Arrow IR',/arrow\s*ir/,'Linha Inductor'],['Cubo IR',/cubo\s*ir/,'Linha Inductor'],['Ultrazeb Inox',/ultra\s*zeb|zebinox/,'Linha Inductor'],
 ['Fulltec Regenerative',/full\s*tec\s*regenerative/,'Linha Regenerative'],['Nutrekit + Imantic',/nutrekit/,'Linha Pastagem']];
function sugereProdutos(txt){const t=semAcento(txt);return CATALOGO.filter(([,re])=>re.test(t)).map(([n])=>n)}
let CLASSIF=[];
// produto de um item do acervo: o que alguém marcou > o do item do calendário ligado a ele > sugestão pelo texto
function prodDe(key,txt,cal){const m=CLASSIF.find(c=>c.id===key);if(m)return {l:m.produto==='—'?[]:[m.produto],fonte:'manual',v:m.produto};
  if(cal&&!semProd(cal.produto))return {l:[cal.produto],fonte:'calendario',v:''};const l=sugereProdutos(txt);return {l,fonte:l.length?'auto':'',v:''}}
const prodOkL=l=>!S.prod||(S.prod==='—'?!l.length:l.includes(S.prod));
// O produto fica oculto nos cards (usa-se o filtro); "Mostrar produtos" abre para conferir e corrigir.
const prodToggle=()=>`<button class="linkbtn" data-act="acv-prod" style="font-size:12px">${S.aprod?'Ocultar produtos':'Mostrar produtos'}</button>`;
function prodLinha(key,P){if(!S.aprod)return '';const chips=P.l.map(x=>`<span class="pchip">${esc(x)}</span>`).join('')||'<span class="muted" style="font-size:12px">sem produto</span>';
  const ed=isTeam()||isM();if(!ed)return `<div class="prodl">${chips}</div>`;const l=produtosLista();if(P.v&&P.v!=='—'&&!l.includes(P.v))l.push(P.v);
  return `<div class="prodl">${chips}${P.fonte==='auto'?'<span class="muted" style="font-size:11px">sugerido</span>':''}<select class="pe cprod" data-cprod="${esc(key)}" aria-label="Produto"><option value="">${P.fonte==='manual'?'Voltar à sugestão':'Mudar produto…'}</option>${l.map(x=>`<option value="${esc(x)}" ${P.v===x?'selected':''}>${esc(x)}</option>`).join('')}<option value="—" ${P.v==='—'?'selected':''}>Sem produto</option></select></div>`}
// período do acervo
const APER=[['tudo','Todo o período'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['365','Últimos 12 meses']];
function perOkA(d){const p=S.aper||'tudo';if(p==='tudo')return true;if(/^\d{4}$/.test(p))return (d||'').startsWith(p);return (d||'')>=addDays(TODAY,-Number(p))}
function perFiltro(datas){const anos=[...new Set(datas.filter(Boolean).map(d=>d.slice(0,4)))].sort().reverse();const p=S.aper||'tudo';
  return `<select id="f-aper" class="pe" aria-label="Período" style="width:auto">${[...APER,...anos.map(a=>[a,'Ano de '+a])].map(([k,l])=>`<option value="${k}" ${p===k?'selected':''}>${l}</option>`).join('')}</select>`}
// grade contínua (sem quebra por mês), com "mostrar mais"
function gradeA(cards,cls){const lim=S.alim||48;return cards.length?`<p class="muted" style="font-size:13px;margin:0">${n(cards.length)} ${cards.length===1?'item':'itens'}</p><div class="agrid ${cls||''}">${cards.slice(0,lim).join('')}</div>${cards.length>lim?`<div class="actions" style="justify-content:center"><button class="btn" data-act="acv-mais">Mostrar mais (${n(cards.length-lim)})</button></div>`:''}`:'<p class="muted">Nada encontrado com esses filtros.</p>'}
// PRODUTOS: o catálogo, depois os do guia de marca e os que já aparecem nos posts
function produtosLista(){const g=[...CATALOGO.map(c=>c[0]),...GUIA.produtos.map(x=>x.split('|')[0].trim()).filter(Boolean)].filter((x,i,a)=>a.indexOf(x)===i);const usados=[...new Set([...posts.map(p=>p.produto),...CLASSIF.map(c=>c.produto)].filter(x=>x&&x!=='—'))].filter(x=>!g.includes(x)).sort((a,b)=>a.localeCompare(b,'pt-BR'));return g.concat(usados)}
const semProd=x=>!x||x==='—';
function prodOk(x){return !S.prod||(S.prod==='—'?semProd(x):x===S.prod)}
function prodFiltro(){const l=produtosLista();if(S.prod&&S.prod!=='—'&&!l.includes(S.prod))l.push(S.prod);const op=x=>`<option value="${esc(x)}" ${S.prod===x?'selected':''}>${esc(x)}</option>`;
  const linhas=[...new Set(CATALOGO.map(c=>c[2]))],outros=l.filter(x=>!CATALOGO.some(c=>c[0]===x));
  return `<select id="f-prod" class="pe" aria-label="Filtrar por produto" style="width:auto"><option value="">Todos os produtos</option>${linhas.map(g=>`<optgroup label="${esc(g)}">${CATALOGO.filter(c=>c[2]===g).map(c=>op(c[0])).join('')}</optgroup>`).join('')}${outros.length?`<optgroup label="Outros">${outros.map(op).join('')}</optgroup>`:''}<option value="—" ${S.prod==='—'?'selected':''}>Sem produto</option></select>`}
// classificação na gaveta do post (Operação e Cancha)
function classifPost(p){const l=produtosLista();if(!semProd(p.produto)&&!l.includes(p.produto))l.push(p.produto);
  return `<details class="padj"><summary class="linkbtn">Classificar</summary><div class="extbox"><label class="muted" for="pc-prod">Produto</label><select id="pc-prod" class="pe"><option value="—">Sem produto</option>${l.map(x=>`<option ${p.produto===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
   <label class="muted" for="pc-pilar">Pilar</label><select id="pc-pilar" class="pe">${[...new Set(Object.keys(PILAR_HUE).concat(p.pilar))].map(k=>`<option ${k===p.pilar?'selected':''}>${esc(k)}</option>`).join('')}</select>
   <p class="muted" style="font-size:12px;margin:0">A lista de produtos vem do guia de marca (Acervo › Guia de marca).</p><div class="actions"><button class="btn" data-act="p-classif" data-id="${p.id}">Salvar classificação</button></div></div></details>`}

// ACERVO: listas limpas por categoria (mesmo padrão dos relatórios)
function acvToolbar(sub,cats,extra){const sel=S.acat[sub]||'todos';const tot=cats.reduce((a,c)=>a+c[2],0);
  return `<div class="toolbar"><div class="filters"><button class="chip" data-acat="${sub}|todos" aria-pressed="${sel==='todos'}">Todos · ${tot}</button>${cats.filter(c=>c[2]).map(([k,l,c])=>`<button class="chip" data-acat="${sub}|${k}" aria-pressed="${sel===k}">${l} · ${c}</button>`).join('')}</div>
   <div class="actions" style="align-items:center"><input type="search" class="pe acq" id="acq-${sub}" data-sub="${sub}" placeholder="Buscar" value="${esc(S.aq[sub]||'')}" aria-label="Buscar" style="width:200px">${extra||''}</div></div>`}
function acvMatch(sub,cat,txt){const sel=S.acat[sub]||'todos';const q=(S.aq[sub]||'').toLowerCase().trim();return (sel==='todos'||sel===cat)&&(!q||txt.toLowerCase().includes(q))}
function rowD(tag,main,sub2,date,actions,more){return `<details class="rrow"><summary>${tag}<span class="rt"><b>${main}</b><span class="muted">${sub2}</span></span><span class="rd mono">${date}</span><span class="ra">${actions}</span></summary>${more?`<div class="rmore rflex">${more}</div>`:''}</details>`}
function groupsHtml(groups){return groups.filter(g=>g.items.length).map(g=>`<section class="rgroup"><h3>${g.t} <span class="muted">${g.items.length}</span></h3><div class="rlist">${g.items.join('')}</div></section>`).join('')||'<p class="muted">Nada encontrado.</p>'}
const ktag=(txt,c)=>`<span class="ktag" style="--kc:var(${c})">${txt}</span>`;
function gridGroups(groups,cls){return groups.filter(g=>g.items.length).map(g=>`<section class="rgroup"><h3>${g.t} <span class="muted">${g.items.length}</span></h3><div class="agrid ${cls||''}">${g.items.join('')}</div></section>`).join('')||'<p class="muted">Nada encontrado.</p>'}
function acard(thumb,tag,title,meta,date,attrs,extra){return `<article class="acard" ${attrs||''}><div class="athumb">${thumb}</div><div class="ainfo"><div class="arow">${tag}<span class="mono muted">${date}</span></div><b>${title}</b><span class="muted">${meta}</span>${extra||''}</div></article>`}
function acvMateriais(){
  if(DRIVE.conectado||(isTeam()&&DRIVE.configurado))return acvMateriaisReal();
  const exm=exLinha('Materiais de exemplo: entram com a integração do Google Drive da Spraytec.');
  const cats=PASTAS.map(f=>[f,f,acervo.filter(a=>a.pasta===f).length]);
  const vis=acervo.filter(a=>acvMatch('materiais',a.pasta,a.titulo+' '+a.arquivo+' '+a.safra+' '+a.produto+' '+a.cultura));
  const drive=`<a class="btn" href="https://drive.google.com/" target="_blank" rel="noopener" style="text-decoration:none">Abrir pasta no Drive</a>`;
  return `${exm}${acvToolbar('materiais',cats,drive)}${gridGroups(PASTAS.map(f=>({t:f,items:vis.filter(a=>a.pasta===f).map(a=>`<a class="acard" href="https://drive.google.com/" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="athumb"><div class="mthumb" style="background:${a.cor}">${a.tipo==='vídeo'?'<span class="mplay">▶</span>':''}<span>${esc(a.titulo)}</span></div></div><div class="ainfo"><div class="arow">${ktag(a.tipo==='vídeo'?'VÍDEO':'FOTO',a.tipo==='vídeo'?'--k-video':'--k-design')}<span class="mono muted">${a.mod}</span></div><b>${esc(a.arquivo)}</b><span class="muted">${esc(a.safra)}${a.produto!=='—'?' · '+esc(a.produto):''} · ${esc(a.origem)}</span></div></a>`)})))}
   <p class="muted" style="font-size:12px;margin:0">Os arquivos ficam no Google Drive da Spraytec. Clique para abrir no Drive.</p>`}
function acvPosts(){
  if(metaTem('ig')||metaTem('fb'))return acvPostsReal();
  const RD=[['ig','Instagram'],['fb','Facebook'],['yt','YouTube'],['email','E-mail marketing']];
  const pub=posts.filter(p=>RD.some(r=>r[0]===p.rede)&&p.status==='publicado').sort((a,b)=>b.date.localeCompare(a.date));
  const cats=RD.map(([k,l])=>[k,l,pub.filter(p=>p.rede===k).length]);
  const vis=pub.filter(p=>prodOk(p.produto)&&acvMatch('posts',p.rede,p.titulo+' '+p.pilar+' '+p.produto));
  return `${acvToolbar('posts',cats,prodFiltro())}${gridGroups(RD.map(([k,l])=>({t:l,items:vis.filter(p=>p.rede===k).map(p=>{const m=k!=='email'?metricsOf(p):null;
    return acard(preview(p),ktag(FORMATO[p.formato].toUpperCase(),'--k-'+(k==='email'?'email':'post')),esc(p.titulo),(semProd(p.produto)?'':esc(p.produto)+' · ')+(m?`alcance ${fk(m.alc)} · ${pct(m.eng)}`:esc(p.pilar)),fmt(p.date),`data-open="${p.id}" tabindex="0" role="button"`)})})))}`}
function acvPostsReal(){
  const RD=[['ig','Instagram'],['fb','Facebook'],['yt','YouTube']];
  const yt=metaTem('yt')?META.yt.videos.filter(v=>v.publico).map(v=>({...v,rede:'yt',link:ytLink(v),formato:v.formato==='short'?'short':'video'})):[];
  const pub=[...META.posts,...yt].filter(x=>x.date).sort((a,b)=>(b.ts||b.date).localeCompare(a.ts||a.date)).map(x=>{const cal=calDe&&x.rede!=='yt'?calDe(x):null,key=x.rede+':'+x.id;
    return {x,cal,key,P:prodDe(key,(x.titulo||'')+' '+(x.legenda||x.descricao||''),cal)}});
  const base=pub.filter(o=>prodOkL(o.P.l)&&perOkA(o.x.date));
  const cats=RD.map(([k,l])=>[k,l,base.filter(o=>o.x.rede===k).length]);
  const vis=base.filter(o=>acvMatch('posts',o.x.rede,(o.x.titulo||'')+' '+(o.x.legenda||'')+' '+o.P.l.join(' ')));
  const fmtN={reel:'REEL',carrossel:'CARROSSEL',video:'VÍDEO',short:'SHORT',post:'POST'};
  const card=({x,cal,key,P})=>{const num=x.rede==='yt'?fk(x.views)+' visualizações':x.alc!=null?'alcance '+fk(x.alc)+(x.eng!=null?' · '+pct(x.eng):''):n(x.curt||0)+' curtidas';
    return acard(`<a class="apost" href="${esc(x.link||'#')}" target="_blank" rel="noopener">${imgTag(x.img,'apimg')}<span class="apcap">${esc((x.titulo||'').slice(0,60))}</span></a>`,ktag((fmtN[x.formato]||'POST')+' · '+NETNAME[x.rede].toUpperCase(),'--k-post'),esc(x.titulo||'(sem legenda)'),num,fmt(x.date),cal?`data-open="${cal.id}" tabindex="0" role="button"`:'',prodLinha(key,P))};
  return `${acvToolbar('posts',cats,prodFiltro()+perFiltro(pub.map(o=>o.x.date))+prodToggle())}${gradeA(vis.map(card))}
   <p class="muted" style="font-size:12px;margin:0">Tudo o que foi publicado no Instagram, no Facebook e no YouTube da Spraytec. O produto vem do texto do post quando aparece o nome dele; para conferir ou corrigir, use "Mostrar produtos". Clique na imagem para abrir na rede.</p>`}
function acvStories(){
  if(metaTem('ig'))return acvStoriesReal();
  const exm=exLinha('Stories de exemplo: entram com a integração do Meta.');
  const old=stories.filter(s=>s.date<TODAY);const cats=[['repost','Reposts',old.filter(s=>s.tipo==='repost').length],['agendado','Agendados',old.filter(s=>s.tipo!=='repost').length]];
  const vis=old.filter(s=>prodOk(s.produto)&&acvMatch('stories',s.tipo==='repost'?'repost':'agendado',s.titulo+' '+s.pilar+' '+(s.produto||'')));const dates=[...new Set(vis.map(s=>s.date))];
  return `${exm}${acvToolbar('stories',cats,prodFiltro())}${gridGroups(dates.map(d=>({t:fmtLong(d),items:vis.filter(s=>s.date===d).map(s=>acard(storyPreview(s),ktag(s.tipo==='repost'?'REPOST':'AGENDADO',s.tipo==='repost'?'--k-post':'--k-email'),esc(s.titulo),'alcance '+n(s.alcance)+' · '+s.respostas+' resp.',s.hora))})),'stories')}
   <p class="muted" style="font-size:12px;margin:0">Os stories são guardados aqui enquanto estão no ar; as miniaturas ficam na pasta Stories do Drive.</p>`}
function acvDark(){
  if(metaTem('ads'))return acvDarkReal();
  const exm=exLinha('Anúncios de exemplo: entram com a integração do Meta.');
  const cats=[['Ativo','Ativos',darkposts.filter(d=>d.status==='Ativo').length],['Encerrado','Encerrados',darkposts.filter(d=>d.status!=='Ativo').length]];
  const vis=darkposts.filter(d=>acvMatch('dark',d.status,d.titulo+' '+d.campanha));const camps=[...new Set(vis.map(d=>d.campanha))];
  return `${exm}${acvToolbar('dark',cats)}${gridGroups(camps.map(c=>({t:c,items:vis.filter(d=>d.campanha===c).map(d=>acard(adPreview(d),ktag(d.status.toUpperCase(),d.status==='Ativo'?'--ok':'--muted'),esc(d.titulo),d.impr+' impressões · '+d.cliques+' cliques',d.periodo))})))}
   <p class="muted" style="font-size:12px;margin:0">Anúncios que rodam só como mídia paga, do Gerenciador de Anúncios da Meta.</p>`}

// PRODUÇÃO DE VÍDEO (kanban para Cancha e Spraytec, dentro do Calendário)
const VCOLS=[['pauta','Pauta','Cancha'],['viabilidade','Viabilidade','Produtora'],['roteiro','Roteiro','Spraytec aprova'],['gravacao','Gravação e edição','Produtora'],['entregue','Entregue','Cancha publica']];
function vidStatusTxt(v){if(v.stage==='pauta')return v.viavel===false?'Voltou da produtora: inviável':'Cancha escrevendo a pauta';if(v.stage==='viabilidade')return 'Aguardando a produtora';if(v.stage==='roteiro')return 'Aguardando aprovação da Spraytec';if(v.stage==='gravacao')return v.gravacao&&v.gravacao!=='—'?'Gravação em '+v.gravacao:'Produtora agendando';const p=v.postId&&posts.find(x=>x.id===v.postId);return p?(p.faltaTexto?'Cancha escrevendo os textos':stInfo(p).l):'Pronto para publicar'}
// Vídeos da produtora no mesmo kanban: cada etapa do vídeo cai na coluna equivalente.
const VSK={pauta:'pauta',viabilidade:'producao',roteiro:'aprovacao',gravacao:'producao'};
const VCK={pauta:'plan',viabilidade:'prod',gravacao:'prod',roteiro:'voce'};
const VSTXT={pauta:'pauta',viabilidade:'viabilidade',roteiro:'roteiro',gravacao:'gravação'};
const vidsAbertos=()=>S.tipos.video?videos.filter(v=>VSK[v.stage]):[];
function vidCard(v,client){return `<div class="card" data-video="${v.id}" style="border-left:3px solid var(--k-video)"><div class="meta"><span class="kt" style="--kc:var(--k-video)">VÍDEO · ${VSTXT[v.stage].toUpperCase()}</span>${v.prazo&&v.stage==='roteiro'?`<span class="mono">até ${fmt(v.prazo)}</span>`:v.stage==='gravacao'&&v.gravacao&&v.gravacao!=='—'?`<span class="mono">grava ${v.gravacao}</span>`:''}</div><span class="t">${esc(v.titulo)}</span><span class="muted" style="font-size:12px">${esc(vidStatusTxt(v))}</span>${client&&isM()&&v.stage==='roteiro'?`<button class="btn primary sm" data-act="v-next" data-id="${v.id}">Aprovar roteiro</button>`:''}</div>`}
function viewVideoKanban(){
  return `<div class="toolbar"><p class="sub" style="margin:0">Cada vídeo do pedido da pauta até a publicação, e com quem ele está agora. ${isTeam()?'Arraste para mudar a etapa.':''}</p>${isTeam()?'<button class="btn primary" data-act="vk-novo">+ Pauta</button>':''}</div>
  <div class="kanban vk">${VCOLS.map(([k,l,quem])=>{const it=videos.filter(v=>v.stage===k);return `<div class="col" data-vcol="${k}"><h3>${l}<span class="mono muted">${it.length}</span></h3><span class="vkq">com ${quem}</span>${it.map(v=>`<div class="card" data-video="${v.id}" ${isTeam()?`draggable="true" data-vdrag="${v.id}"`:''}><span class="t">${esc(v.titulo)}</span><div class="meta">${v.viavel===false?tagPill('Inviável','--bad'):''}<span>${esc(vidStatusTxt(v))}</span></div>${v.prazo&&k==='roteiro'?`<div class="meta"><span class="mono">aprovar até ${fmt(v.prazo)}</span></div>`:''}</div>`).join('')}</div>`}).join('')}</div>`}

// CICLO DO MÊS (combinado na reunião de 05/11): insumos até dia 1, pautas até 10, aprovação até 12,
// calendário com os textos até 15, aprovação até 20 e peças até o fim do mês anterior ao da publicação.
let CICLOS=[];
const INS_F=[['foco','Foco comercial do mês','Produtos e mensagens que o comercial quer reforçar'],['eventos','Eventos e datas','Feiras, dias de campo, visitas, datas da empresa'],['lanc','Lançamentos e novidades','Produtos novos, registros, mudanças de linha'],['fotos','Fotos e materiais','O que tem de foto e material novo, e onde está'],['obs','Observações','O que a Cancha deve evitar ou priorizar']];
function addMonth(m,k){return new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7)-1+k,1)).toISOString().slice(0,7)}
const mesCiclo=m=>MONTHS[+m.slice(5)-1].toLowerCase();
const fimMes=m=>new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).toISOString().slice(0,10);
function addBiz(iso,k){let d=iso;const sn=k<0?-1:1;let c=Math.abs(k);while(c>0){d=addDays(d,sn);if(isBiz(d))c--}return d}
function prazosCiclo(m){const a=addMonth(m,-1),dep=(d,ant)=>{d=proxUtil(d);const min=addBiz(ant,1);return d<min?min:d};
  const ins=proxUtil(a+'-01'),pau=proxUtil(a+'-10'),aprP=dep(a+'-12',pau),txt=dep(a+'-15',aprP),aprT=dep(a+'-20',txt);let pec=antUtil(fimMes(a));if(pec<=aprT)pec=addBiz(aprT,1);
  return {ins,pau,aprP,txt,aprT,pec}}
const cicloDe=m=>CICLOS.find(x=>x.id===m)||{id:m};
const CICLO_DESDE='2026-12';
// Em que ponto do caminho está cada item: 0 pauta, 1 pauta em aprovação, 2 textos, 3 textos em aprovação,
// 4 arte, 5 peça em aprovação, 6 aprovado, 7 publicado.
function fase(p){const s=p.status,e=p.etapaAjuste;if(s==='pauta'||(s==='ajuste'&&e==='pauta'))return 0;if(s==='pauta_aprovacao')return 1;if(s==='producao')return temPauta(p)&&!p.textoOk?2:4;
  if(s==='ajuste'&&e==='texto')return 2;if(s==='texto_aprovacao')return 3;if(s==='ajuste')return 4;if(s==='aprovacao')return 5;if(s==='aprovado'||s==='agendado')return 6;if(s==='publicado')return 7;return -1}
const pautasDe=m=>posts.filter(p=>p.date&&p.date.startsWith(m)&&temPauta(p)&&p.status!=='espera'&&p.rede!=='ads').sort((a,b)=>a.date.localeCompare(b.date));
const quemNome=q=>q==='spraytec'&&isM()?'Você · Spraytec':q==='cancha'&&isTeam()?'Você · Cancha':q==='produtora'?'Produtora':q==='auto'?'Publicação':QUEM[q];
function cicloEtapas(m){const c=cicloDe(m),z=prazosCiclo(m),ps=pautasDe(m),tot=ps.length,cnt=k=>ps.filter(p=>fase(p)>=k).length;
  const em=st=>ps.some(p=>p.status===st);
  const S8=[
    {l:'Insumos do mês',q:'spraytec',done:!!c.ins,ate:z.ins,d:c.ins?'Recebidos em '+fmt(c.ins.ok):'Até '+fmtLong(z.ins),btn:[c.ins?'Ver insumos':isM()?'Enviar insumos':isTeam()?'Registrar recebidos':'Ver insumos','ins-open',!c.ins&&isM()]},
    {l:'Pautas',q:'cancha',done:tot>0&&cnt(1)===tot,ate:z.pau,d:tot?cnt(1)+' de '+tot+' enviadas':'Nenhuma pauta ainda',btn:isTeam()?['Revisar e enviar','pau-open',tot>0&&cnt(1)<tot]:null},
    {l:'Aprovação das pautas',q:'spraytec',done:tot>0&&cnt(2)===tot,ate:z.aprP,d:tot?cnt(2)+' de '+tot+' aprovadas':'Depois do envio',btn:em('pauta_aprovacao')?[isM()?'Revisar e aprovar':'Ver pautas','pau-open',isM()]:null},
    {l:'Calendário com os textos',q:'cancha',done:tot>0&&cnt(3)===tot,ate:z.txt,d:tot?cnt(3)+' de '+tot+' enviados':'Depois das pautas',btn:isTeam()&&cnt(2)>cnt(3)?['Revisar e enviar','txt-open',1]:null},
    {l:'Aprovação dos textos',q:'spraytec',done:tot>0&&cnt(4)===tot,ate:z.aprT,d:tot?cnt(4)+' de '+tot+' aprovados':'Depois do envio',btn:em('texto_aprovacao')?[isM()?'Revisar e aprovar':'Ver textos','txt-open',isM()]:null},
    {l:'Peças',q:'cancha',sub:'e produtora',done:tot>0&&cnt(5)===tot,ate:z.pec,d:tot?cnt(5)+' de '+tot+' enviadas':'Depois dos textos'},
    {l:'Aprovação das peças',q:'spraytec',done:tot>0&&cnt(6)===tot,d:tot?cnt(6)+' de '+tot+' aprovadas':'2 dias úteis por peça',btn:em('aprovacao')&&isM()?['Aprovar agora','go-aprov',1]:null},
    {l:'Publicação',q:'auto',done:tot>0&&cnt(7)===tot,d:tot?cnt(7)+' de '+tot+' no ar':''}];
  return {S8,cur:S8.findIndex(x=>!x.done),z}}
const cicloTit=m=>'Preparação do calendário de '+mesCiclo(m);
function cicloStrip(m){if(m<CICLO_DESDE)return '';const {S8,cur}=cicloEtapas(m);
  if(S8.slice(0,7).every(x=>x.done))return `<section class="ciclobox ciclook"><div class="ciclohead"><h2>✓ ${cicloTit(m)} concluída</h2><span class="muted" style="font-size:12px">Pautas, textos e peças aprovados · ${S8[7].d}</span></div></section>`;
  return `<section class="ciclobox"><div class="ciclohead"><h2>${cicloTit(m)}</h2><span class="muted" style="font-size:12px">Combinado: insumos até dia 1 · pautas até dia 10 · textos até dia 15 · peças até o fim do mês · cada aprovação em até 2 dias úteis · prazo que cai em fim de semana ou feriado passa para o dia útil seguinte</span></div>
  <div class="ciclo">${S8.map((x,i)=>{const late=!x.done&&x.ate&&x.ate<TODAY;return `<div class="cs ${x.done?'done':i===cur?'cur':''} ${late?'late':''}" style="--kc:var(--k-${x.q==='auto'?'post':x.q})"><span class="n">${x.done?'✓':i+1}</span><b>${x.l}</b><span class="q">${quemNome(x.q)+(x.sub?' '+x.sub:'')}</span><span class="d">${late?'Atrasado · ':''}${x.d}${x.ate&&!x.done&&!late&&!/^Até/.test(x.d)?' · até '+fmt(x.ate):''}</span>${x.btn?`<button class="btn ${x.btn[2]?'primary':''} sm" data-act="${x.btn[1]}" data-m="${m}">${x.btn[0]}</button>`:''}</div>`}).join('')}</div></section>`}
function drawerIns(){const m=S.drawer.id,c=cicloDe(m),z=prazosCiclo(m),x=(c.ins&&c.ins.txt)||{},pode=isM()||isTeam();
  return `<header><div><div class="eyebrow">Ciclo de ${mesCiclo(m)} · etapa 1</div><h2>Insumos do mês</h2></div>${closeBtn()}</header>
  <div class="content"><p class="muted" style="margin:0">O que a Cancha precisa saber da Spraytec para montar as pautas de ${mesCiclo(m)}. Prazo: ${fmtLong(z.ins)}.</p>
  ${INS_F.map(([k,l,ph])=>pode?`<label for="in-${k}">${l}</label><textarea id="in-${k}" class="pe" rows="2" placeholder="${ph}">${esc(x[k]||'')}</textarea>`:`<dt>${l}</dt><dd>${esc(x[k]||'—')}</dd>`).join('')}
  ${pode?`<div class="actions"><button class="btn primary" data-act="ins-salvar" data-m="${m}">${c.ins?'Salvar':isM()?'Enviar para a Cancha':'Registrar como recebidos'}</button></div>`:''}
  ${c.ins?`<p class="muted" style="font-size:12px;margin:0">Recebidos em ${fmt(c.ins.ok)} · ${esc(c.ins.por||'')}.</p>`:''}</div>`}
function cicloLista(ps,txt){return `<div class="list">${ps.map(p=>`<div class="pr" data-open="${p.id}"><span class="mono muted" style="font-size:12px;min-width:40px">${fmt(p.date)}</span><span class="kt" style="--kc:var(--k-${tipoCal(p)});min-width:46px">${KTAG[tipoCal(p)](p)}</span><div style="min-width:0;flex:1"><b style="font-size:14px">${esc(p.titulo)}</b><div class="muted" style="font-size:12px">${stInfo(p).l}</div>${txt&&p.legenda?`<div style="font-size:13px;margin-top:4px;white-space:pre-line">${esc(p.legenda.slice(0,280))}${p.legenda.length>280?'…':''}</div>`:!txt&&p.pauta?`<div class="muted" style="font-size:13px;margin-top:4px">${esc(p.pauta.slice(0,220))}</div>`:''}</div></div>`).join('')||'<p class="muted">Nada aqui ainda.</p>'}</div>`}
function insResumo(m){const c=cicloDe(m);return c.ins?`<details><summary class="linkbtn">Ver os insumos que a Spraytec enviou</summary><dl class="kv" style="margin-top:8px">${INS_F.map(([k,l])=>c.ins.txt[k]?`<dt>${l}</dt><dd>${esc(c.ins.txt[k])}</dd>`:'').join('')}</dl></details>`:`<p class="muted" style="font-size:13px;margin:0">Os insumos da Spraytec ainda não chegaram (prazo ${fmt(prazosCiclo(m).ins)}).</p>`}
function drawerPautas(){const m=S.drawer.id,ps=pautasDe(m),z=prazosCiclo(m);
  const env=ps.filter(p=>p.status==='pauta'&&(p.pauta||'').trim()),semTxt=ps.filter(p=>p.status==='pauta'&&!(p.pauta||'').trim()),apr=ps.filter(p=>p.status==='pauta_aprovacao');
  let acts='';
  if(isTeam())acts=`<div class="actions"><button class="btn" data-act="cal-add" data-date="${m}-01">+ Pauta</button><button class="btn" data-act="importar">Importar planilha</button>${env.length?`<button class="btn primary" data-act="pau-env" data-ids="${env.map(p=>p.id).join(',')}">Enviar ${env.length} pauta${env.length>1?'s':''} para a Spraytec</button>`:''}</div>${semTxt.length?`<p class="muted" style="font-size:12px;margin:0">${semTxt.length} sem o texto da pauta: abra o item e escreva antes de enviar.</p>`:''}`;
  if(isM()&&apr.length)acts=`<div class="actions"><button class="btn primary" data-act="lote-aprovar" data-ids="${apr.map(p=>p.id).join(',')}">Aprovar ${apr.length} pauta${apr.length>1?'s':''}</button></div><p class="muted" style="font-size:12px;margin:0">Para pedir mudança numa pauta, abra o item e use "Pedir ajuste".</p>`;
  return `<header><div><div class="eyebrow">Ciclo de ${mesCiclo(m)} · pautas até ${fmt(z.pau)}</div><h2>Pautas de ${mesCiclo(m)} · ${ps.length}</h2></div>${closeBtn()}</header>
  <div class="content">${insResumo(m)}${cicloLista(ps,false)}${acts}</div>`}
function drawerTextos(){const m=S.drawer.id,ps=pautasDe(m).filter(p=>fase(p)>=2),z=prazosCiclo(m);
  const env=ps.filter(p=>p.status==='producao'&&!p.textoOk&&(p.legenda||'').trim()),semTxt=ps.filter(p=>p.status==='producao'&&!p.textoOk&&!(p.legenda||'').trim()),apr=ps.filter(p=>p.status==='texto_aprovacao');
  let acts='';
  if(isTeam())acts=`<div class="actions">${env.length?`<button class="btn primary" data-act="txt-env" data-ids="${env.map(p=>p.id).join(',')}">Enviar os textos de ${env.length} post${env.length>1?'s':''} para a Spraytec</button>`:''}</div>${semTxt.length?`<p class="muted" style="font-size:12px;margin:0">${semTxt.length} ainda sem legenda: abra o item, escreva em "Editar conteúdo" e envie.</p>`:''}`;
  if(isM()&&apr.length)acts=`<div class="actions"><button class="btn primary" data-act="lote-aprovar" data-ids="${apr.map(p=>p.id).join(',')}">Aprovar os textos de ${apr.length} post${apr.length>1?'s':''}</button></div><p class="muted" style="font-size:12px;margin:0">Para pedir mudança num texto, abra o item e use "Pedir ajuste".</p>`;
  return `<header><div><div class="eyebrow">Ciclo de ${mesCiclo(m)} · textos até ${fmt(z.txt)}, aprovação até ${fmt(z.aprT)}</div><h2>Calendário com os textos · ${ps.length}</h2></div>${closeBtn()}</header>
  <div class="content"><p class="muted" style="margin:0">A legenda de cada post, para a Spraytec aprovar antes de a Cancha produzir a arte.</p>${cicloLista(ps,true)}${acts}</div>`}
// COM QUEM ESTÁ: o próximo passo de cada item, de quem é e até quando
const tagOf=p=>{const k=tipoCal(p);return [KTAG[k]?KTAG[k](p):'POST','--k-'+(k==='midia'?'post':k)]};
function passo(p){const s=p.status,z=p.date?prazosCiclo(p.date.slice(0,7)):{};
  if(p.formato==='plano'||s==='publicado'||s==='agendado')return null;
  if(p.faltaTexto)return {quem:'cancha',acao:'Escrever os textos do vídeo',prazo:addBiz(TODAY,1)};
  if(s==='espera')return {quem:'cancha',acao:'Definir a data',prazo:null};
  if(s==='pauta'||(s==='ajuste'&&p.etapaAjuste==='pauta'))return temPauta(p)?{quem:'cancha',acao:s==='ajuste'?'Ajustar a pauta e reenviar':'Escrever e enviar a pauta',prazo:s==='ajuste'?addBiz(TODAY,1):z.pau}:{quem:p.rede==='video'?'produtora':'cancha',acao:'Começar a produção',prazo:p.date};
  if(s==='pauta_aprovacao')return {quem:'spraytec',acao:'Aprovar a pauta',prazo:prazoDe(p)};
  if(s==='texto_aprovacao')return {quem:'spraytec',acao:'Aprovar os textos',prazo:prazoDe(p)};
  if(s==='aprovacao')return {quem:'spraytec',acao:p.validacao?'Validação interna (agronomia e comercial)':'Aprovar',prazo:prazoDe(p)};
  if(s==='ajuste')return {quem:'cancha',acao:p.etapaAjuste==='texto'?'Ajustar os textos e reenviar':'Fazer o ajuste pedido',prazo:addBiz(TODAY,1)};
  if(s==='producao'){if(!temPauta(p))return {quem:p.rede==='video'?'produtora':'cancha',acao:p.rede==='video'?'Gravar e entregar':'Produzir as peças',prazo:p.date};
    if(!p.textoOk)return {quem:'cancha',acao:'Escrever os textos e enviar',prazo:z.txt};
    return {quem:'cancha',acao:ehVideo(p)?'Anexar o vídeo e enviar':'Produzir a arte e enviar',prazo:z.pec&&z.pec<p.date?z.pec:addBiz(p.date,-5)}}
  if(s==='aprovado')return {quem:'cancha',acao:'Agendar a publicação na rede e marcar como agendado',prazo:addDays(p.date,-1)};
  return null}
function acoes(){const out=[];const lim=addDays(TODAY,45);const push=o=>{if(o.prazo&&o.prazo>lim)return;out.push(o)};
  const m0=TODAY.slice(0,7);[m0,addMonth(m0,1),addMonth(m0,2)].filter(m=>m>=CICLO_DESDE).forEach(m=>{if(!cicloDe(m).ins)push({quem:'spraytec',acao:'Enviar os insumos de '+mesCiclo(m),t:'Foco comercial, eventos, lançamentos e fotos',prazo:prazosCiclo(m).ins,tag:['CICLO','--accent-ink'],attr:`data-act="ins-open" data-m="${m}"`})});
  posts.forEach(p=>{if(p.date&&p.date<addDays(TODAY,-60))return;const ps=passo(p);if(ps)push({...ps,t:p.titulo,tag:tagOf(p),attr:`data-open="${p.id}"`})});
  demandas.filter(d=>!d.feito).forEach(d=>push({quem:d.quem,acao:d.t,t:d.det||'',prazo:d.data,tag:['DEMANDA','--k-'+d.quem],attr:`data-dem="${d.id}"`}));
  videos.forEach(v=>{const m={pauta:['cancha','Escrever a pauta do vídeo'],viabilidade:['produtora','Dar o parecer de viabilidade'],roteiro:['spraytec','Aprovar o roteiro'],gravacao:['produtora','Gravar e entregar editado']}[v.stage];if(m)push({quem:m[0],acao:m[1],t:v.titulo,prazo:v.stage==='roteiro'?v.prazo||null:null,tag:['VÍDEO','--k-video'],attr:`data-video="${v.id}"`})});
  return out.map(o=>({...o,late:!!o.prazo&&o.prazo<TODAY}))}
function quemBar(){const A=acoes();
  return `<div class="wbar">${['cancha','spraytec','produtora'].map(q=>{const a=A.filter(o=>o.quem===q),l=a.filter(o=>o.late).length;
    return `<button class="wb-i" data-kgrp="quem" style="--kc:var(--k-${q})"><i></i><span>${q==='spraytec'&&isM()?'Com você':'Com a '+(q==='produtora'?'produtora':QUEM[q])}</span><b>${a.length}</b>${l?`<span class="bad">${l} atrasad${l>1?'os':'o'}</span>`:''}</button>`}).join('')}</div>`}
function acCard(o){return `<div class="wc ${o.late?'late':''}" ${o.attr} tabindex="0" role="button"><div class="meta"><span class="kt" style="--kc:var(${o.tag[1]})">${o.tag[0]}</span><span class="mono ${o.late?'bad':''}">${o.prazo?(o.late?'venceu '+fmt(o.prazo):'até '+fmtLong(o.prazo)):'sem prazo'}</span></div><b class="wa">${esc(o.acao)}</b>${o.t?`<span class="wt">${esc(o.t)}</span>`:''}</div>`}
function viewQuem(){const A=acoes();const me=isM()?'spraytec':'cancha';const ord=['cancha','spraytec','produtora'].sort((a,b)=>(b===me)-(a===me));
  const fimSem=addDays(TODAY,6-((dow(TODAY)+6)%7));
  const grp=a=>[['Atrasado',a.filter(o=>o.late)],['Esta semana',a.filter(o=>!o.late&&o.prazo&&o.prazo<=fimSem)],['Próximas semanas',a.filter(o=>!o.late&&(!o.prazo||o.prazo>fimSem))]];
  return `<p class="muted" style="font-size:13px;margin:0">O que está esperando cada time nas próximas semanas, por prazo. Clique para abrir.</p>
  <div class="wboard">${ord.map(q=>{const a=A.filter(o=>o.quem===q).sort((x,y)=>(x.prazo||'9').localeCompare(y.prazo||'9'));
    return `<section class="wcol" style="--kc:var(--k-${q})"><h3><i></i>${q===me?'Com você':'Com a '+(q==='produtora'?'produtora':QUEM[q])}<span class="mono muted">${a.length}</span></h3>
    ${grp(a).filter(g=>g[1].length).map(([l,it])=>`<div class="wg"><div class="eyebrow ${l==='Atrasado'?'bad':''}">${l} · ${it.length}</div>${it.map(acCard).join('')}</div>`).join('')||'<p class="muted" style="font-size:13px;margin:0">Nada pendente.</p>'}</section>`}).join('')}</div>`}

// STATUS EDITÁVEL E KANBAN DE STATUS (visão de processo da Cancha)
const SKCOLS=['pauta','pauta_aprovacao','producao','texto_aprovacao','aprovacao','ajuste','aprovado','agendado','publicado','espera'];
// Colunas do kanban: copy e arte separadas; "Em produção" fica para design e vídeo.
const SKCOLS_V=['pauta','pauta_aprovacao','copy','texto_aprovacao','arte','aprovacao','ajuste','aprovado','agendado','publicado','producao','espera'];
// Etapas na ordem do fluxo; posts com pauta mostram copy e arte separadas, design e vídeo mostram "Em produção".
const etapasDo=p=>temPauta(p)?SKCOLS_V.filter(k=>k!=='producao'):SKCOLS;
// Leva o item para a etapa escolhida (no seletor ou arrastando no kanban). Copy e arte são a mesma etapa no servidor.
function irParaEtapa(p,col){if(!p||!col)return;
  if(col==='arte'&&p.status==='producao'&&!p.textoOk){toast('Para ir para a arte, os textos precisam ser aprovados pela Spraytec (ou registre a aprovação no item).');return}
  if(col==='copy'&&p.textoOk&&['producao','aprovacao','ajuste'].includes(p.status)){toast('Os textos deste post já foram aprovados: a etapa agora é a arte.');return}
  const st=STV[col]?'producao':col;if(st===p.status&&stK(p)===col){toast('Sem mudança.');return}
  acao('status',{id:p.id,status:st},()=>toast('Status: '+(STV[col]||STATUS[col]).l+'.'))}
function statusEditor(p){if(p.formato==='plano')return '';const ok=['aprovado','agendado'].includes(p.status);
  return `<div class="stedit"><div class="ler" style="align-items:flex-end"><div style="flex:1"><label for="st-sel" class="muted" style="font-size:12px">Status</label><select id="st-sel" class="pe">${etapasDo(p).map(k=>`<option value="${k}" ${stK(p)===k?'selected':''}>${k==='arte'&&ehVideo(p)?'Vídeo a anexar':(STV[k]||STATUS[k]).l}</option>`).join('')}</select></div><button class="btn" data-act="st-save" data-id="${p.id}">Salvar</button></div>
   ${ok?`<div class="ler"><input id="pub-link" class="pe" placeholder="Link do post publicado (opcional)" aria-label="Link do post publicado"><button class="btn primary" data-act="st-pub" data-id="${p.id}">Marcar como publicado</button></div>`:''}
   <span class="muted" style="font-size:12px">Toda mudança fica no histórico.</span></div>`}
function kanbanBarra(){return `<div class="toolbar">${monthNav('month')}<div class="filters" role="group" aria-label="Tipos">${TIPOS.filter(t=>t[0]!=='demanda').map(([k,l])=>`<button class="chip kchip" style="--kc:var(--k-${k})" data-tipo="${k}" aria-pressed="${S.tipos[k]}"><i></i>${l}</button>`).join('')}</div>
   <div class="actions">${isTeam()?'<button class="btn" data-act="vk-novo">+ Pauta de vídeo</button><button class="btn" data-act="importar">Importar planilha</button>':''}<button class="btn primary" data-act="cal-add" data-date="">+ Adicionar</button></div></div>`}
const KTAG={post:p=>NET[p.rede],email:()=>'E-MAIL',design:()=>'DESIGN',video:()=>'VÍDEO'};
function viewStatusKanban(){
  const vp=posts.filter(p=>tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]&&((p.date&&p.date.startsWith(S.month))||!p.date));
  return `${kanbanBarra()}
  <p class="muted" style="font-size:13px;margin:0">Arraste para mudar o status. Para tirar um item de "Pauta em aprovação" ou "Em aprovação", o portal pede o registro da aprovação da Spraytec.</p>
  <div class="kanban sk">${SKCOLS_V.map(c=>{const it=vp.filter(p=>stK(p)===c),iv=vidsAbertos().filter(v=>VSK[v.stage]===c);if(c==='producao'&&!it.length&&!iv.length)return '';return `<div class="col" data-scol="${c}"><h3>${c==='arte'?'Arte em criação / vídeo a anexar':(STV[c]||STATUS[c]).l}<span class="mono muted">${it.length+iv.length}</span></h3>${iv.map(v=>vidCard(v)).join('')}${it.map(p=>{const k=tipoCal(p);return `<div class="card" data-open="${p.id}" draggable="true" data-sdrag="${p.id}" style="border-left:3px solid var(--k-${k})"><div class="meta"><span class="kt" style="--kc:var(--k-${k})">${KTAG[k](p)}</span><span class="mono">${fmt(p.date)}</span>${c==='publicado'?`<span class="tag">${p.anterior?'agência anterior':'manual'}</span>`:''}${marcas(p)}${p.status==='ajuste'?`<span class="tag">${stInfo(p).l.replace(/^Ajuste /,'')}</span>`:''}</div><span class="t">${esc(p.titulo)}</span>${p.faltaTexto?'<span class="flag">Faltam textos</span>':''}</div>`}).join('')}</div>`}).join('')}</div>`}

// Kanban simplificado da Operação Spraytec: sem arrastar; aprova pauta e peça direto na coluna "Com você".
const CKCOLS=[['plan','Planejado',['pauta']],['voce','Com você',['pauta_aprovacao','texto_aprovacao','aprovacao']],['prod','Com a Cancha',['producao','ajuste']],['pronto','Pronto',['aprovado','agendado']],['pub','Publicado',['publicado']]];
function viewClientKanban(){
  const vp=posts.filter(p=>p.formato!=='plano'&&tipoCal(p)!=='midia'&&S.tipos[tipoCal(p)]&&p.date&&p.date.startsWith(S.month));
  return `${kanbanBarra()}
  <div class="kanban ck">${CKCOLS.map(([c,l,sts])=>{const it=vp.filter(p=>sts.includes(p.status)).sort((a,b)=>a.date.localeCompare(b.date));
    const iv=vidsAbertos().filter(v=>VCK[v.stage]===c);
    return `<div class="col ${c==='voce'?'voce':''}"><h3>${l}<span class="mono muted">${it.length+iv.length}</span></h3>${iv.map(v=>vidCard(v,true)).join('')}${it.map(p=>{const k=tipoCal(p);const draft=hiddenForClient(p);
      return `<div class="card ${draft?'draft':''}" ${draft?'':`data-open="${p.id}"`} style="border-left:3px solid var(--k-${k})"><div class="meta"><span class="kt" style="--kc:var(--k-${k})">${KTAG[k](p)}</span><span class="mono">${fmt(p.date)}</span>${p.status==='pauta_aprovacao'?'<span class="tag">pauta</span>':p.status==='texto_aprovacao'?'<span class="tag">textos</span>':''}${p.status==='agendado'?'<span class="tag">agendado</span>':''}${marcas(p)}${p.status==='ajuste'?`<span class="tag">${stInfo(p).l.replace(/^Ajuste /,'')}</span>`:''}</div><span class="t">${esc(p.titulo)}</span>
      ${draft?'<span class="muted" style="font-size:12px">A Cancha está produzindo</span>':''}${c==='voce'?`<button class="btn primary sm" data-act="approve" data-id="${p.id}">${p.status==='pauta_aprovacao'?'Aprovar pauta':p.status==='texto_aprovacao'?'Aprovar textos':'Aprovar'}</button>`:''}${c==='pub'&&p.pubLink?`<a class="linkbtn" href="${esc(p.pubLink)}" target="_blank" rel="noopener">Ver post</a>`:''}</div>`}).join('')||'<p class="muted" style="font-size:13px;margin:4px 0">Nada aqui.</p>'}</div>`}).join('')}</div>`}
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
   <div class="filters">${[['todas','Todas'],['cancha','Cancha'],['spraytec','Spraytec']].map(([k,l])=>`<button class="chip ${k!=='todas'?'kchip':''}" style="--kc:var(--k-${k})" data-quem="${k}" aria-pressed="${S.quem===k}">${k!=='todas'?'<i></i>':''}${l}</button>`).join('')}</div>
   <button class="btn primary" data-act="nova-dem">Nova demanda</button></div>
  <div class="dwrap">${calGrid(S.dmonth,d=>vis.filter(x=>x.data===d).map(chip).join(''),false,'nova-dem')}
   <aside class="dside">
    <section class="panel"><h2>Atrasadas · ${late.length}</h2><div class="list">${late.map(row).join('')||'<p class="muted" style="margin:0">Nada atrasado.</p>'}</div></section>
    <section class="panel"><h2>Próximos 7 dias</h2><div class="list">${next.map(row).join('')||'<p class="muted" style="margin:0">Nada nos próximos dias.</p>'}</div></section>
   </aside></div>`;
}

// VÍDEOS (produtora)
function viewVideos(){
  return `${head('Vídeos','As pautas de vídeo da Spraytec, da pauta à entrega. Diga se a pauta é viável e entregue o vídeo final na pasta do Drive.')}
  <div class="kanban vk">${VCOLS.map(([k,l,quem])=>{const it=videos.filter(v=>v.stage===k);return `<div class="col"><h3>${l}<span class="mono muted">${it.length}</span></h3><span class="vkq">com ${quem}</span>${it.map(v=>`<div class="card" data-video="${v.id}"><span class="t">${esc(v.titulo)}</span><div class="meta">${k==='viabilidade'?tagPill('Aguardando vocês','--warn'):k==='gravacao'?tagPill('Com vocês','--warn'):v.viavel===false?tagPill('Inviável','--bad'):''}${v.gravacao&&v.gravacao!=='—'?'<span>gravação '+esc(v.gravacao)+'</span>':''}</div></div>`).join('')}</div>`}).join('')}</div>
  <div class="notice lock">Como produtora, vocês veem só as pautas de vídeo. Posts, resultados e comentários internos da Cancha não aparecem aqui.</div>`;
}

// ===================== IMPORTAR CALENDÁRIO POR PLANILHA =====================
// Planilha padrão (CSV). Pode ser preenchida à mão, no Google Sheets/Excel ou gerada pelo Claude.
const IMP_COLS=['id','data','hora','canal','formato','etapa','titulo','pilar','produto','pauta','legenda','link_drive'];
const IMP_EXEMPLO=[
  ['','04/12/2026','11:00','Instagram','Reel','Textos em aprovação','Depoimento: revendedor no campo','Relacionamento','','Reels com o vídeo pronto da produtora (link do Drive na última coluna).','Legenda completa do Reel, com hashtags.','https://drive.google.com/file/d/ID_DO_VIDEO/view'],
  ['','05/12/2026','11:30','Instagram','Carrossel','Pauta','Florescimento: 5 cuidados com o calor','Manejo','Bioestimulante','Carrossel educativo com os 5 cuidados no florescimento. Fechar com chamada para o RTV.','',''],
  ['','08/12/2026','18:00','Instagram','Reel','Pauta em aprovação','Dia de campo em 30 segundos','Eventos','','Reel com os melhores momentos do dia de campo.','',''],
  ['','10/12/2026','08:00','E-mail','Newsletter','Pauta','Newsletter de dezembro','Manejo','Linha foliar','Assunto: o manejo de dezembro. Destaque para a nutrição foliar.','',''],
  ['','12/12/2026','','Demanda Spraytec','','','Enviar fotos do dia de campo','','','Fotos na pasta do Drive.','',''],
];
function impPrompt(){const pr=produtosLista();return `Monte o calendário de conteúdo da Spraytec para [MÊS] em formato CSV, separado por ponto e vírgula, com exatamente estas colunas na primeira linha:
${IMP_COLS.join(';')}

Regras:
- id: deixe vazio (o portal cria o id).
- data no formato dd/mm/aaaa; hora no formato hh:mm (pode ficar vazia).
- canal: Instagram, Facebook, YouTube, E-mail, Design, Vídeo, Demanda Cancha ou Demanda Spraytec.
- formato: Post, Carrossel, Reel ou Story (Instagram); Post (Facebook); Vídeo ou Short (YouTube); Newsletter (E-mail); Peças (Design); Gravação ou Entrega (Vídeo). Para demandas, deixe vazio.
- etapa: Pauta.
- pilar: Manejo, Campo, Produto, Educação, Institucional, Relacionamento ou Eventos.
- produto: ${pr.length?pr.join(', ')+', ou vazio se o conteúdo não for de um produto':'vazio'}.
- pauta: o tema e a ideia do conteúdo, em uma ou duas frases.
- legenda: deixe vazia, a não ser que a copy já esteja pronta (aí use a etapa Textos em aprovação).
- link_drive: o link do vídeo (ou da arte) no Google Drive, como está no calendário (drive.google.com/file/d/...). Mais de um arquivo (carrossel): links separados por espaço. O portal copia sozinho o arquivo para o post.
Responda só com o CSV, sem comentários.`}
const semAcento=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function lerCSV(txt){
  txt=txt.replace(/^﻿/,'');const primeira=txt.split(/\r?\n/)[0]||'';
  const sep=[';','\t',','].sort((a,b)=>primeira.split(b).length-primeira.split(a).length)[0];
  const linhas=[];let campo='',linha=[],aspas=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(aspas){if(c==='"'){if(txt[i+1]==='"'){campo+='"';i++}else aspas=false}else campo+=c;continue}
    if(c==='"')aspas=true;else if(c===sep){linha.push(campo);campo=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;linha.push(campo);campo='';if(linha.some(x=>x.trim()))linhas.push(linha);linha=[]}else campo+=c}
  linha.push(campo);if(linha.some(x=>x.trim()))linhas.push(linha);return linhas}
function impData(v){v=String(v||'').trim();let iso=null;const m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){const y=m[3].length===2?'20'+m[3]:m[3];iso=`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}else if(/^\d{4}-\d{2}-\d{2}$/.test(v))iso=v;
  // só datas que existem (31/02 não passa)
  return iso&&!isNaN(Date.parse(iso))&&new Date(iso+'T12:00:00Z').toISOString().slice(0,10)===iso?iso:null}
function impTipo(canal,formato){const c=semAcento(canal),f=semAcento(formato);
  if(c.startsWith('demanda'))return c.includes('spraytec')?'demanda|spraytec':c.includes('cancha')?'demanda|cancha':null;
  if(c==='instagram')return {post:'ig|post',carrossel:'ig|carrossel',reel:'ig|reel',story:'ig|story','':'ig|post'}[f]||null;
  if(c==='facebook')return 'fb|post';
  if(c==='youtube')return {video:'yt|video',short:'yt|short','':'yt|video'}[f]||null;
  if(c==='e-mail'||c==='email')return 'email|newsletter';
  if(c==='design')return 'design|producao';
  if(c==='video')return {gravacao:'video|gravacao',entrega:'video|entrega'}[f]||null;
  return null}
function etapaDe(v){const s=semAcento(v);if(!s)return '';for(const [k,x] of Object.entries(STATUS))if(semAcento(x.l)===s||k===s.replace(/ /g,'_'))return k;
  return {producao:'producao','ajuste solicitado':'ajuste','em ajuste':'ajuste',aprovacao:'aprovacao'}[s]||null}
const etapaPautaCli=p=>temPauta(p)&&(p.status==='pauta'||p.status==='espera'||(p.status==='ajuste'&&p.etapaAjuste==='pauta'));
// O que uma linha com id muda no item (mesmas regras do servidor). Campo vazio = mantém.
function impDiff(p,d){const eq=(a,b)=>String(a??'').replace(/\r\n?/g,'\n').trim()===String(b??'').replace(/\r\n?/g,'\n').trim();
  const ed=['pauta','producao','ajuste','espera'].includes(p.status),st=k=>(STATUS[k]||{l:k}).l;
  if(d.tipo&&d.tipo!==p.rede+'|'+p.formato)return {erro:'canal e formato não mudam pela planilha',campos:[]};
  let pauta=d.pauta,leg=d.legenda;if(!temPauta(p)&&pauta&&!leg){leg=pauta;pauta=''}
  const campos=[];let erro='';
  const ct=(nome,a,b,pode)=>{if(!b||eq(a,b))return;if(!ed){erro=erro||'está em "'+st(p.status)+'": '+nome+' não muda mais';return}if(pode===false){erro=erro||'a pauta já foi aprovada e não muda';return}campos.push(nome)};
  ct('título',p.titulo,d.titulo);ct('pauta',p.pauta,pauta,etapaPautaCli(p));ct('legenda',p.legenda,leg);ct('link do Drive',p.drive,d.drive);if(!['video','design'].includes(p.rede))ct('horário',p.time,d.hora);
  if(d.pilar&&d.pilar!==p.pilar)campos.push('pilar');if(d.produto&&d.produto!==p.produto)campos.push('produto');
  if(d.data&&d.data!==p.date){if(p.status==='publicado')erro=erro||'já publicado: a data não muda';else campos.push('data')}
  if(d.etapa&&d.etapa!==p.status){const ok=(d.etapa==='texto_aprovacao'&&p.status==='producao'&&temPauta(p)&&!p.textoOk)||(p.status==='ajuste'&&p.etapaAjuste==='texto'&&d.etapa==='texto_aprovacao')||(d.etapa==='pauta_aprovacao'&&p.status==='pauta')||(d.etapa==='aprovacao'&&p.status==='producao'&&!['video','design'].includes(p.rede))||(p.status==='ajuste'&&d.etapa===(p.etapaAjuste==='pauta'?'pauta_aprovacao':'aprovacao'));
    if(!ok)erro=erro||'etapa: de "'+st(p.status)+'" para "'+st(d.etapa)+'" só pelo portal';
    else if(d.etapa==='pauta_aprovacao'&&p.status==='pauta'&&!(pauta||p.pauta))erro=erro||'sem pauta para enviar para aprovação';
    else campos.push('enviar para '+st(d.etapa).toLowerCase())}
  return {erro,campos}}
function impProcessar(txt,arquivo){
  const L=lerCSV(txt);if(!L.length)return {arquivo,erroGeral:'O arquivo está vazio.',linhas:[]};
  const cab=L[0].map(semAcento),idx={};IMP_COLS.forEach(c=>{idx[c]=cab.indexOf(c)});
  if(idx.titulo<0||(idx.id<0&&(idx.data<0||idx.canal<0)))return {arquivo,erroGeral:'Faltam colunas no cabeçalho (título, data e canal, ou id). Use o modelo ou exporte o mês.',linhas:[]};
  const pega=(r,c)=>idx[c]>=0?String(r[idx[c]]||'').trim():'';
  const pilares=Object.keys(PILAR_HUE),pilarDe=v=>pilares.find(p=>semAcento(p)===semAcento(v))||'';
  const ids=new Set();
  const linhas=L.slice(1).map((r,i)=>{const id=pega(r,'id'),p=id?posts.find(x=>x.id===id&&x.formato!=='plano'):null;
    const dv=pega(r,'data'),data=dv?impData(dv):null,cv=pega(r,'canal'),tipo=cv?impTipo(cv,pega(r,'formato')):null;
    const titulo=pega(r,'titulo'),hora=pega(r,'hora'),drive=pega(r,'link_drive'),ev=pega(r,'etapa'),etapa=etapaDe(ev),pv=pega(r,'pilar');
    const erros=[];
    if(id&&!p)erros.push('id não encontrado no portal');if(id&&ids.has(id))erros.push('id repetido na planilha');if(id)ids.add(id);
    if(dv?!data:!id)erros.push('data inválida');if(cv?!tipo:!id)erros.push('canal/formato não reconhecido');if(!id&&!titulo)erros.push('sem título');
    if(hora&&!/^\d{1,2}:\d{2}$/.test(hora))erros.push('hora inválida');if(drive&&!/^https?:\/\//i.test(drive))erros.push('link do Drive inválido');
    if(pv&&!pilarDe(pv))erros.push('pilar desconhecido');if(ev&&etapa===null)erros.push('etapa desconhecida');
    const dados={n:i+2,id:id||undefined,tipo,titulo,data,hora:hora?hora.padStart(5,'0'):null,pilar:pilarDe(pv),produto:pega(r,'produto'),pauta:pega(r,'pauta'),legenda:pega(r,'legenda'),drive,etapa:etapa||''};
    if(!id&&tipo&&!tipo.startsWith('demanda')){if(etapa&&!['pauta','pauta_aprovacao','texto_aprovacao'].includes(etapa))erros.push('item novo entra como Pauta, Pauta em aprovação ou Textos em aprovação');
      else if(etapa==='pauta_aprovacao'&&!dados.pauta)erros.push('sem pauta para enviar para aprovação');
      else if(etapa==='texto_aprovacao'&&(!dados.pauta||!dados.legenda||['video','design'].includes(tipo.split('|')[0])))erros.push('para entrar em Textos em aprovação, o post precisa de pauta e legenda')}
    let acao='novo',campos=[];
    if(p&&!erros.length){const r2=impDiff(p,dados);if(r2.erro)erros.push(r2.erro);campos=r2.campos;acao=campos.length?'atualiza':'igual'}
    return {n:i+2,erros,acao,campos,dados,item:p}});
  return {arquivo,linhas}}
// Exporta o mês na mesma planilha: editar e importar de volta atualiza os itens pelo id, sem duplicar.
const CANAL_DE={ig:'Instagram',fb:'Facebook',yt:'YouTube',email:'E-mail',design:'Design',video:'Vídeo'};
const FORMATO_DE={'ig|post':'Post','ig|carrossel':'Carrossel','ig|reel':'Reel','ig|story':'Story','fb|post':'Post','yt|video':'Vídeo','yt|short':'Short','email|newsletter':'Newsletter','design|producao':'Peças','video|gravacao':'Gravação','video|entrega':'Entrega'};
const mesNome=()=>MONTHS[+S.month.slice(5,7)-1].toLowerCase()+' de '+S.month.slice(0,4);
function exportarMes(){const its=posts.filter(p=>p.date&&p.date.startsWith(S.month)&&FORMATO_DE[p.rede+'|'+p.formato]).sort((a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99')));
  if(!its.length){toast('Nada no calendário de '+mesNome()+' para exportar.');return}
  const dt=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
  const linhas=its.map(p=>[p.id,dt(p.date),p.time||'',CANAL_DE[p.rede],FORMATO_DE[p.rede+'|'+p.formato],STATUS[p.status].l,p.titulo,p.pilar,p.produto==='—'?'':p.produto,p.pauta||'',p.legenda||'',p.drive||'']);
  baixarArquivo('calendario-spraytec-'+S.month+'.csv','﻿'+[IMP_COLS,...linhas].map(l=>l.map(csvCampo).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  toast(its.length+' itens de '+mesNome()+' exportados.')}
function baixarArquivo(nome,conteudo,tipo){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([conteudo],{type:tipo}));a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function csvCampo(v){v=String(v==null?'':v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function drawerImportar(){const I=S.imp;const L=I?I.linhas:[];const ruins=L.filter(l=>l.erros.length).length,novos=L.filter(l=>!l.erros.length&&l.acao==='novo').length,atu=L.filter(l=>!l.erros.length&&l.acao==='atualiza').length,iguais=L.filter(l=>!l.erros.length&&l.acao==='igual').length;
  const nomeTipo=t=>(NOVO_TIPOS.find(x=>x[0]===t)||[0,t||'—'])[1];
  const acaoTxt=l=>l.erros.length?`<span style="color:var(--bad);font-size:12px">${esc(l.erros.join(', '))}</span>`:l.acao==='novo'?tagPill('novo','--ok'):l.acao==='igual'?'<span class="muted" style="font-size:12px">sem mudança</span>':`<span style="font-size:12px">atualiza: ${esc(l.campos.join(', '))}</span>`;
  return `<header><div><div class="eyebrow">Calendário</div><h2>Planilha do calendário</h2></div>${closeBtn()}</header>
  <div class="content">
   <ol class="impsteps"><li><b>Comece pelo modelo ou pelo mês do calendário.</b> Uma linha por item (post, e-mail, produção ou demanda).<div class="actions" style="margin-top:6px"><button class="btn" data-act="imp-modelo">Baixar modelo (CSV)</button><button class="btn" data-act="exportar-mes">Exportar ${esc(mesNome())}</button></div>
     <p class="muted" style="font-size:12px;margin:6px 0 0">Linhas sem id viram itens novos. Linhas com id (as do mês exportado) atualizam o item, sem duplicar; campo vazio mantém o que está no portal. Para enviar uma pauta para aprovação, troque a etapa para "Pauta em aprovação"; para enviar a peça, "Em aprovação". Post novo com a pauta já combinada e a legenda pronta pode entrar direto em "Textos em aprovação". <b>Vídeo ou arte no Drive:</b> cole o link na coluna link_drive (mais de um, separados por espaço) e o portal copia sozinho para o post.</p></li>
    <li><b>Ou peça ao Claude</b>: copie o pedido abaixo, troque [MÊS] e salve a resposta como arquivo .csv.<details class="padj" style="margin-top:6px"><summary class="linkbtn">Ver o pedido para o Claude</summary><textarea class="pe" rows="9" readonly id="imp-prompt">${esc(impPrompt())}</textarea><button class="btn sm" data-act="imp-copiar">Copiar pedido</button></details></li>
    <li><b>Envie o arquivo</b>. No Google Sheets: Arquivo › Fazer download › CSV. No Excel: Salvar como › CSV UTF-8.<div style="margin-top:6px"><input type="file" id="imp-arq" accept=".csv,text/csv,text/plain"></div></li></ol>
   ${I&&I.erroGeral?`<div class="notice">${esc(I.erroGeral)}</div>`:''}
   ${L.length?`<div class="eyebrow">${esc(I.arquivo)} · ${L.length} linhas · ${novos} novos · ${atu} atualizações${iguais?` · ${iguais} sem mudança`:''}${ruins?` · <span style="color:var(--bad)">${ruins} com erro</span>`:''}</div>
   <div class="tablewrap"><table class="ap" style="min-width:600px"><thead><tr><th>Linha</th><th>Data</th><th>Tipo</th><th>Título</th><th></th></tr></thead><tbody>${L.map(l=>{const p=l.item;const data=l.dados.data||(p&&p.date);const tit=l.dados.titulo||(p&&p.titulo)||'';const tipo=l.dados.tipo||(p&&p.rede+'|'+p.formato);
     return `<tr><td class="mono">${l.n}</td><td class="mono">${data?fmt(data):'—'}${l.dados.hora?' '+l.dados.hora:''}</td><td>${esc(nomeTipo(tipo))}</td><td>${esc(tit)}</td><td>${acaoTxt(l)}</td></tr>`}).join('')}</tbody></table></div>
   ${ruins?'<p class="muted" style="font-size:13px;margin:0">Corrija as linhas com erro na planilha e envie de novo. Nada é importado enquanto houver erro.</p>':''}
   <div class="actions"><button class="btn primary" data-act="imp-confirmar" ${ruins||!(novos+atu)?'disabled':''}>${novos+atu?`Importar: ${[novos?novos+(novos===1?' novo':' novos'):'',atu?atu+(atu===1?' atualização':' atualizações'):''].filter(Boolean).join(' e ')}`:'Nada para importar'}</button></div>
   <p class="muted" style="font-size:12px;margin:0">Itens novos entram como pauta (ou já em aprovação, se a etapa disser). Tudo fica no histórico de cada item.</p>`:''}
  </div>`}
async function impLerArquivo(file){const buf=await file.arrayBuffer();let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(_){txt=new TextDecoder('windows-1252').decode(buf)}
  S.imp=impProcessar(txt,file.name);renderDrawer()}

// ===================== PESSOAS E ACESSOS (Cancha) =====================
function viewPessoas(){
  if(!PESSOAS){api('/api/pessoas').then(j=>{PESSOAS=j;if(S.view==='pessoas')render()}).catch(e=>{if(!e.silencioso)toast(e.message)});return `${head('Pessoas e acessos')}<p class="muted">Carregando…</p>`}
  const papeis=PESSOAS.papeis||ROLES,ativos=PESSOAS.pessoas.filter(p=>p.ativo),inativos=PESSOAS.pessoas.filter(p=>!p.ativo);
  const acesso=p=>p.tem_senha?(p.visto_em?'<span class="muted">entrou '+fmtVisita(p.visto_em)+'</span>':tagPill('senha criada','--ok')):p.convite_enviado_em?tagPill('convite enviado','--warn'):tagPill('sem convite','--muted');
  const linha=p=>`<tr><td><b>${esc(p.nome)}</b></td><td class="mono" style="font-size:12.5px">${esc(p.email||'—')}</td><td>${esc(papeis[p.papel]||p.papel)}</td><td style="font-size:12.5px">${p.ativo?acesso(p):'<span class="muted">desativado</span>'}</td><td><button class="btn sm" data-act="pessoa-edit" data-id="${esc(p.id)}">Abrir</button></td></tr>`;
  return `${head('Pessoas e acessos','Quem entra no portal e o que cada um pode fazer. Cada pessoa recebe um convite, cria a própria senha e entra com e-mail e senha.','<button class="btn primary" data-act="pessoa-nova">+ Pessoa</button>')}
  ${PESSOAS.email?'':'<div class="notice">O envio de e-mail ainda não está configurado. Para liberar o acesso agora, abra a pessoa, clique em "Copiar link de convite" e mande o link pelo WhatsApp.</div>'}
  <div class="tablewrap"><table class="ap" style="min-width:680px"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Acesso</th><th></th></tr></thead><tbody>${ativos.map(linha).join('')||'<tr><td colspan="5" class="muted">Ninguém cadastrado ainda.</td></tr>'}</tbody></table></div>
  ${inativos.length?`<details class="ferramentas"><summary>Acessos desativados · ${inativos.length}</summary><div class="tablewrap" style="margin-top:8px"><table class="ap" style="min-width:640px"><tbody>${inativos.map(linha).join('')}</tbody></table></div></details>`:''}
  <section class="panel"><h2>O que cada papel faz</h2><dl class="kv"><dt>Operação Spraytec</dt><dd>Aprova pautas, peças, roteiros e o plano de mídia; pede ajustes; conversa com a Cancha.</dd><dt>Diretoria Spraytec</dt><dd>Acompanha estratégia, resultados e relatórios. Não aprova.</dd><dt>Cancha</dt><dd>Produz, envia para aprovação, publica e gerencia os acessos.</dd><dt>Produtora de vídeo</dt><dd>Vê só as pautas de vídeo: viabilidade, gravação e entrega.</dd></dl></section>`}
function drawerPessoa(){const id=S.drawer.id;const p=id?PESSOAS.pessoas.find(x=>x.id===id):{nome:'',email:'',papel:'operacao',ativo:true};const papeis=PESSOAS.papeis||ROLES;
  const conv=S.convite&&S.convite.id===id?S.convite:null;
  const acesso=!id||!p.ativo?'':`<section class="extbox"><b>${p.tem_senha?'Nova senha':'Convite'}</b>
    <span class="muted" style="font-size:13px">${p.tem_senha?'A pessoa já criou a senha. Se ela esqueceu, ela mesma pode usar "Esqueci minha senha" na tela de entrada, ou você manda um link para criar uma nova (vale 24 horas).':p.convite_enviado_em?'Convite já gerado. Mandar de novo invalida o link anterior. O link vale 7 dias.':'A pessoa recebe um link para criar a senha. O link vale 7 dias e funciona uma vez só.'}</span>
    <div class="actions">${PESSOAS.email?`<button class="btn primary sm" data-act="pessoa-convite" data-enviar="1" data-id="${esc(id)}">${p.tem_senha?'Enviar link de nova senha':'Enviar convite por e-mail'}</button>`:''}<button class="btn sm" data-act="pessoa-convite" data-id="${esc(id)}">Copiar link${p.tem_senha?'':' de convite'}</button></div>
    ${conv&&conv.link?`<label class="muted" for="ps-link" style="font-size:12px">Link gerado (mande só para ${esc(p.nome.split(' ')[0])}):</label><input id="ps-link" class="pe mono" readonly value="${esc(conv.link)}" style="font-size:12px">`:''}</section>`;
  return `<header><div><div class="eyebrow">Pessoas e acessos</div><h2>${id?esc(p.nome):'Nova pessoa'}</h2></div>${closeBtn()}</header>
  <div class="content"><label for="ps-nome">Nome</label><input id="ps-nome" class="pe" value="${esc(p.nome)}" placeholder="Nome e sobrenome">
   <label for="ps-email">E-mail</label><input id="ps-email" type="email" class="pe" value="${esc(p.email||'')}" placeholder="nome@empresa.com.br">
   <label for="ps-papel">Papel</label><select id="ps-papel" class="pe">${['operacao','diretoria','cancha','produtora'].map(k=>`<option value="${k}" ${p.papel===k?'selected':''}>${esc(papeis[k]||k)}</option>`).join('')}</select>
   <label class="check"><input type="checkbox" id="ps-ativo" ${p.ativo?'checked':''}> Acesso ativo</label>
   <p class="muted" style="font-size:12px;margin:0">Ao desativar ou trocar o papel, a pessoa sai do portal na hora. Tudo fica no Registro de atividades.</p>
   <div class="actions"><button class="btn ${id?'':'primary'}" data-act="pessoa-salvar">${id?'Salvar alterações':'Cadastrar'}</button></div>
   ${acesso}</div>`}

// ===================== CRIAR SENHA (convite) E NOVA SENHA =====================
async function telaSenha(t,caminho){
  EU=null;$('#nav').innerHTML='';$('#roles').innerHTML='';document.body.classList.add('entrando');
  const voltar='<p class="muted" style="font-size:13px;margin:0"><a href="/">Ir para a tela de entrada</a></p>';
  let info;try{info=await api('/api/senha/link?t='+encodeURIComponent(t))}catch(e){
    $('#main').innerHTML=`<div class="wrap"><div class="entrar"><div><h1>Link inválido</h1></div><div class="notice">${esc(e.message)}</div>${voltar}</div></div>`;return}
  const novo=info.tipo==='convite';
  $('#main').innerHTML=`<div class="wrap"><div class="entrar"><div><h1>${novo?'Crie sua senha':'Crie uma nova senha'}</h1><p class="sub">Olá, ${esc(info.nome.split(' ')[0])}. ${novo?'Este é o seu acesso ao Portal de marketing Spraytec.':''}</p></div>
   <section class="panel"><form class="entrarform" data-form="definir" data-t="${esc(t)}">
    <input type="email" autocomplete="username" value="${esc(info.email)}" readonly class="pe" aria-label="E-mail">
    <label for="ns1">Senha</label><input type="password" id="ns1" class="pe" autocomplete="new-password" minlength="8" required>
    <label for="ns2">Repita a senha</label><input type="password" id="ns2" class="pe" autocomplete="new-password" minlength="8" required>
    <p class="muted" style="font-size:12.5px;margin:0">No mínimo 8 caracteres.</p>
    <button class="btn primary">${novo?'Criar senha e entrar':'Salvar nova senha e entrar'}</button></form></section>
   <footer class="porcancha"><span>Um portal feito por</span><img src="/cancha-vertical.png" alt="Cancha Marketing" height="44"></footer></div></div>`;
  $('#ns1').focus();
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
    const ehPauta=p.status==='pauta_aprovacao',ehTexto=p.status==='texto_aprovacao';
    if(isM()&&p.formato!=='plano'&&EM_APROVACAO.includes(p.status))acts=`${ehPauta?'<div class="notice">Esta é a pauta: o tema e a ideia do conteúdo. Aprovando, a Cancha escreve os textos.</div>':ehTexto?'<div class="notice">Estes são os textos (legenda) do post. Aprovando, a Cancha produz a arte.</div>':''}<div class="actions"><button class="btn primary" data-act="approve" data-id="${p.id}">${ehPauta?'Aprovar pauta':ehTexto?'Aprovar textos':'Aprovar'}</button>${p.status==='aprovacao'&&!p.validacao?`<button class="btn" data-act="validacao" data-id="${p.id}">Levar para validação interna</button>`:''}</div>
      <label for="adj">Pedir ajuste${ehPauta?' na pauta':ehTexto?' nos textos':''} (comentário obrigatório)</label><textarea id="adj" placeholder="O que precisa mudar?"></textarea><div class="actions"><button class="btn danger" data-act="adjust" data-id="${p.id}">Pedir ajuste</button></div>`;
    if(team){const b=[];
      if(p.status==='pauta')b.push(temPauta(p)?`<button class="btn primary" data-act="enviar-pauta" data-id="${p.id}">Enviar pauta para aprovação</button>`:`<button class="btn dark" data-act="to-prod" data-id="${p.id}">Mover para produção</button>`);
      if(p.status==='producao'&&temPauta(p)&&!p.textoOk)b.push(`<button class="btn primary" data-act="enviar-textos" data-id="${p.id}">Enviar textos para aprovação</button>`);
      if(p.status==='producao')b.push(`<button class="btn ${temPauta(p)&&!p.textoOk?'':'primary'}" data-act="send" data-id="${p.id}">${['video','design'].includes(p.rede)?'Marcar como concluído':temPauta(p)&&!p.textoOk?'Enviar peça completa (textos e arte)':'Enviar peça para aprovação'}</button>`);
      if(p.status==='ajuste')b.push(`<button class="btn primary" data-act="newver" data-id="${p.id}">${p.etapaAjuste==='pauta'?'Reenviar pauta ajustada':p.etapaAjuste==='texto'?'Reenviar textos ajustados':'Subir nova versão e reenviar'}</button>`);
      const ext=EM_APROVACAO.includes(p.status)?`<details class="padj" ${S.needExt===p.id?'open':''}><summary class="btn ${S.needExt===p.id?'primary':''}">Registrar aprovação por WhatsApp/e-mail</summary><div class="extbox"><label class="muted" for="ext-quem">Quem da Spraytec aprovou</label><select id="ext-quem" class="pe">${APROVADORES.map(a=>`<option value="${esc(a.id)}">${esc(a.nome)}</option>`).join('')||'<option value="">Nenhuma pessoa da Operação cadastrada</option>'}</select><label class="muted" for="ext-canal">Por onde aprovou</label><select id="ext-canal" class="pe"><option>WhatsApp</option><option>E-mail</option><option>Reunião</option></select><label class="muted" for="ext-link">Link do print ou do e-mail no Drive (recomendado)</label><input id="ext-link" class="pe" placeholder="https://drive.google.com/..."><button class="btn primary sm" data-act="external" data-id="${p.id}">Registrar aprovação${ehPauta?' da pauta':ehTexto?' dos textos':''}</button><span class="muted" style="font-size:12px">Fica no histórico com o nome de quem aprovou, o seu e o comprovante.</span></div></details>`:'';
      const edita=['pauta','producao','ajuste','espera'].includes(p.status)&&p.formato!=='plano'?`<details class="padj"><summary class="btn">Editar conteúdo</summary><div class="extbox"><label class="muted" for="pe-titulo">Título</label><input id="pe-titulo" class="pe" value="${esc(p.titulo)}">${etapaPautaCli(p)?`<label class="muted" for="pe-pauta">Pauta (tema, ideia e abordagem)</label><textarea id="pe-pauta" class="pe" rows="4">${esc(p.pauta||'')}</textarea>`:''}${temPauta(p)&&(p.status==='pauta'||(p.status==='ajuste'&&p.etapaAjuste==='pauta'))?'':`<label class="muted" for="pe-leg">${({email:'Assunto e texto',design:'Descrição',video:'Descrição'}[p.rede]||'Legenda')}</label><textarea id="pe-leg" class="pe" rows="5">${esc(p.legenda)}</textarea>`}${['video','design'].includes(p.rede)?'':`<label class="muted" for="pe-hora">Horário</label><input id="pe-hora" type="time" class="pe" value="${p.time||''}">`}<label class="muted" for="pe-drive">Link do material no Google Drive</label><input id="pe-drive" class="pe" value="${esc(p.drive||'')}" placeholder="https://drive.google.com/..."><button class="btn primary sm" data-act="post-editar" data-id="${p.id}">Salvar conteúdo</button></div></details>`:'';
      const exclui=p.formato==='plano'?'':`<details class="padj excl"><summary class="linkbtn">Excluir item</summary><div class="extbox"><span class="muted" style="font-size:12px">Para testes, duplicados ou itens criados por engano. Sai do calendário para todos. Os arquivos continuam no Google Drive, e uma cópia do item fica no Registro de atividades.</span><button class="btn danger sm" data-act="post-excluir" data-id="${p.id}">Excluir "${esc(p.titulo.slice(0,40))}"</button></div></details>`;
      acts=`<div class="actions">${b.join('')}</div>${ext}${edita}${statusEditor(p)}${exclui}`;}
  }
  const textoLabel={email:'Assunto e texto',ads:'Resumo',design:'Descrição',video:'Descrição'}[p.rede]||'Legenda';
  const naPauta=temPauta(p)&&(['pauta','pauta_aprovacao'].includes(p.status)||(p.status==='ajuste'&&p.etapaAjuste==='pauta'));
  const pautaBloco=temPauta(p)&&(p.pauta||naPauta)?`<div><div class="eyebrow" style="margin-bottom:6px">${naPauta||p.status==='espera'?'Pauta':'Pauta aprovada'}</div><div class="caption">${p.pauta?esc(p.pauta):'Ainda sem pauta.'}</div></div>`:'';
  const legBloco=naPauta&&!p.legenda?'':`<div><div class="eyebrow" style="margin-bottom:6px">${textoLabel}</div><div class="caption">${p.faltaTexto?'Ainda sem textos.':p.legenda?esc(p.legenda):'Ainda sem texto.'}</div></div>`;
  const prep=hid&&p.status==='producao';
  // Ajuste pedido: o que a Spraytec pediu, quem, quando e em qual etapa; para a Cancha, o que fazer a seguir.
function ajusteAviso(p,team){const a=p.ajustePedido||(()=>{const c=(p.comments||[]).filter(x=>!x.interno).slice(-1)[0];return c?{quem:c.who,txt:c.text,quando:c.quando,etapa:p.etapaAjuste}:null})();
  const e=p.etapaAjuste,V=ehVideo(p),onde=e==='pauta'?'na pauta':e==='texto'?'na copy (legenda)':V?'no vídeo':'na arte';
  const novaV=pecasAtuais(p).length&&versaoAtual(p)>(p.vEnviada||1);
  const fazer=!team?'A Cancha está ajustando. Quando reenviar, o item volta para a sua aprovação.'
    :e==='pauta'?'Mude a pauta em "Editar conteúdo" (mais abaixo) e clique em "Reenviar pauta ajustada".'
    :e==='texto'?'Mude a legenda em "Editar conteúdo" (mais abaixo) e clique em "Reenviar textos ajustados".'
    :novaV?`Nova versão anexada (versão ${versaoAtual(p)}). Confira e reenvie.`
    :`Envie ${V?'o vídeo corrigido':'a arte corrigida'} no quadro "${V?'Vídeo':'Peças (arte)'}" logo abaixo: ela vira a versão ${(p.vEnviada||1)+1} e a anterior fica guardada. Depois clique em "Subir nova versão e reenviar".`;
  const btn=team&&(e!=='peca'||novaV)?`<div class="actions" style="margin-top:8px"><button class="btn primary" data-act="newver" data-id="${p.id}">${e==='pauta'?'Reenviar pauta ajustada':e==='texto'?'Reenviar textos ajustados':'Subir nova versão e reenviar'}</button></div>`:'';
  return `<div class="notice passo ajp"><b>${team?'Ajuste pedido '+onde:'Você pediu ajuste '+onde}</b>${a?` · ${esc(a.quem||'')}${a.quando?' em '+esc(a.quando):''}`:''}${a&&a.txt?`<blockquote>${esc(a.txt)}</blockquote>`:''}<span>${fazer}</span>${btn}</div>`}
// Próximo passo da Cancha, no topo do item (o envio da arte fica logo abaixo da prévia).
  const temArte=pecasAtuais(p).length>0;
  const avisoCli=!team&&p.status==='ajuste'?ajusteAviso(p,false):'';
  const V=ehVideo(p),qd=V?'"Vídeo"':'"Peças (arte)"';
  const passo=!team||p.formato==='plano'||!temPauta(p)?'':p.status==='texto_aprovacao'?(V?'<div class="notice passo"><b>Textos com a Spraytec.</b> Você já pode anexar o vídeo da produtora no quadro "Vídeo" logo abaixo. Quando a copy for aprovada, o vídeo vai direto para a aprovação da Spraytec.</div>':'<div class="notice passo"><b>Textos com a Spraytec.</b> Você já pode ir enviando a arte no quadro "Peças (arte)" logo abaixo. Ela só vai para aprovação depois que os textos forem aprovados.</div>')
    :p.status==='producao'&&p.textoOk?(temArte?`<div class="notice passo"><b>${V?'Vídeo anexado':'Arte em criação · arte anexada'}.</b> Confira ${V?'o vídeo':'as peças'} abaixo e envie para a Spraytec aprovar.<div class="actions" style="margin-top:8px"><button class="btn primary" data-act="send" data-id="${p.id}">Enviar peça para aprovação</button></div></div>`
      :V?'<div class="notice passo"><b>Vídeo a anexar · copy aprovada.</b> Anexe o vídeo da produtora no quadro "Vídeo" logo abaixo (do computador ou pelo link do Drive) e clique em "Enviar peça para aprovação".</div>'
      :'<div class="notice passo"><b>Arte em criação · copy aprovada.</b> Agora é a arte: envie no quadro "Peças (arte)" logo abaixo e depois clique em "Enviar peça para aprovação".</div>')
    :p.status==='producao'&&!p.textoOk?'<div class="notice passo"><b>Copy em produção · pauta aprovada.</b> Escreva a legenda (em "Editar conteúdo") e envie os textos para aprovação.</div>'
    :p.status==='ajuste'?ajusteAviso(p,true)
    :p.status==='aprovado'?`<div class="notice passo"><b>Aprovado pela Spraytec.</b> Agende a publicação na rede (${p.date?fmtLong(p.date)+(p.time?' às '+p.time:''):'sem data'}) e marque aqui.<div class="actions" style="margin-top:8px"><button class="btn primary" data-act="agendar" data-id="${p.id}">Marcar como agendado</button></div></div>`
    :p.status==='agendado'?'<div class="notice passo"><b>Agendado na rede.</b> Depois que for ao ar, marque como publicado e cole o link do post (no fim desta página).</div>':'';
  return `<header><div><div class="eyebrow">${NETNAME[p.rede]} · ${FORMATO[p.formato]}</div><h2>${hid&&!prep?'Em preparação pela Cancha':esc(p.titulo)}</h2></div>${closeBtn()}</header>
  <div class="content">
   ${passo}${avisoCli}
   ${p.formato==='plano'?planoSection().replace('<section class="panel">','<div>').replace(/<\/section>$/,'</div>'):`<div class="pv-lg">${preview(p,{grande:true})}</div><p class="muted" style="font-size:12px;margin:-8px 0 0;text-align:center">${pecasAtuais(p).some(a=>tipoArq(a)==='video')?'Prévia com o vídeo enviado: dê play para assistir.':capaDe(p)?'Prévia com a peça enviada. Clique nas peças abaixo para ver em tamanho real.':'Prévia aproximada. '+(p.drive?`<a href="${esc(p.drive)}" target="_blank" rel="noopener">Abrir a arte no Google Drive</a>`:'A arte fica na pasta do Google Drive.')}</p>`}
   ${p.formato==='plano'?'':arqSecao('p:'+p.id,p,{extra:notaLeve(p),pode:team&&p.status!=='aprovacao',versoes:true,titulo:ehVideo(p)?'Vídeo':'Peças (arte)',rotulo:ehVideo(p)?'Enviar o vídeo':'Enviar a arte',driveLink:true,dica:p.status==='ajuste'&&(p.vEnviada||0)>=(p.vPeca||1)?'Entra como nova versão':['pauta_aprovacao','texto_aprovacao'].includes(p.status)?'Pode enviar já: a arte vai para aprovação depois que os textos forem aprovados':'',trava:team&&p.status==='aprovacao'?'A arte está em aprovação: para trocar, espere a resposta ou registre o ajuste.':''})}
   <dl class="kv" style="margin:0"><dt>Status</dt><dd>${pill(p)} ${marcas(p)}</dd><dt>Data</dt><dd class="mono">${p.date?fmtLong(p.date)+(p.time?' '+p.time:''):'sem data'}</dd><dt>Pilar</dt><dd>${p.pilar}</dd><dt>Produto</dt><dd>${esc(p.produto)}</dd>${peso?`<dt>Cota de design</dt><dd>${peso} peça${peso>1?'s':''} · rodada ${p.rodada} de 2</dd>`:''}</dl>
   ${p.formato==='plano'?'':hid?(prep?pautaBloco:'')+`<div class="notice lock">${prep?'A legenda e a arte aparecem quando a peça for enviada para aprovação.':'O texto aparece quando a pauta for enviada para aprovação.'}</div>`:pautaBloco+legBloco}
   ${acts}
   ${(isTeam()||isM())&&p.formato!=='plano'&&!hid?classifPost(p):''}
   ${linksSection('p:'+p.id)}
   <div><div class="eyebrow" style="margin-bottom:6px">Comentários</div><div style="display:flex;flex-direction:column;gap:6px">${coms.map(c=>`<div class="comment ${c.interno?'internal':''}"><div class="who"><b>${esc(c.who)}</b>${c.quando}${c.interno?'<span class="tag">interno</span>':''}</div>${mencHtml(c.text)}</div>`).join('')||'<p class="muted" style="margin:0">Sem comentários.</p>'}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px"><textarea id="newc" placeholder="Escrever comentário (use @ para mencionar alguém)" data-mencao></textarea>${team?'<label class="check"><input type="checkbox" id="newci" checked> Interno (o cliente não vê)</label>':''}<div class="actions"><button class="btn" data-act="comment" data-id="${p.id}">Comentar</button></div></div></div>
   <div><div class="eyebrow" style="margin-bottom:6px">Histórico</div><div class="hist">${histHtml(p.hist)}</div></div>
  </div>`;
}
// MENÇÕES: destaque do @Nome no texto e lista de nomes ao digitar @
let MENCIONAVEIS=[];
function mencHtml(txt){let h=esc(txt);if(!/@/.test(txt))return h;
  const nomes=MENCIONAVEIS.map(p=>p.nome).concat(EU?[EU.nome]:[]).sort((a,b)=>b.length-a.length);
  for(const nm of nomes){const re=new RegExp('@'+esc(nm).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\d])','giu');h=h.replace(re,m=>`<b class="mencao">${m}</b>`)}
  return h}
let MENC=null;// {el, ini, itens, i}
function mencFechar(){MENC=null;const p=document.getElementById('mencpop');if(p)p.remove()}
function mencAbrir(el){const pos=el.selectionStart,antes=el.value.slice(0,pos);const m=antes.match(/(^|\s)@([\p{L}]*)$/u);if(!m){mencFechar();return}
  const q=semAcento(m[2]);const interno=el.id==='newc'&&$('#newci')&&$('#newci').checked;
  const itens=MENCIONAVEIS.filter(p=>(!interno||p.papel==='cancha')&&semAcento(p.nome).split(/\s+/).some(w=>w.startsWith(q))).slice(0,6);
  if(!itens.length){mencFechar();return}
  MENC={el,ini:pos-m[2].length-1,itens,i:MENC&&MENC.el===el?Math.min(MENC.i,itens.length-1):0};
  let p=document.getElementById('mencpop');if(!p){p=document.createElement('div');p.id='mencpop';p.className='mencpop';p.setAttribute('role','listbox');document.body.appendChild(p)}
  const r=el.getBoundingClientRect();p.style.left=Math.max(8,r.left)+'px';p.style.top=(r.bottom+4)+'px';p.style.minWidth=Math.min(r.width,280)+'px';
  p.innerHTML=itens.map((x,k)=>`<button type="button" role="option" aria-selected="${k===MENC.i}" data-menc="${k}"><b>${esc(x.nome)}</b><span class="muted">${esc(ROLES[x.papel]||x.papel)}</span></button>`).join('')}
function mencEscolher(k){if(!MENC)return;const {el,ini}=MENC,x=MENC.itens[k];const fim=el.selectionStart;const ins='@'+x.nome+' ';
  el.value=el.value.slice(0,ini)+ins+el.value.slice(fim);const c=ini+ins.length;mencFechar();el.focus();el.setSelectionRange(c,c)}
document.addEventListener('mousedown',e=>{const b=e.target.closest&&e.target.closest('[data-menc]');if(b){e.preventDefault();mencEscolher(Number(b.dataset.menc));return}if(MENC&&e.target!==MENC.el)mencFechar()});
document.addEventListener('input',e=>{if(e.target&&e.target.dataset&&'mencao' in e.target.dataset)mencAbrir(e.target)});
document.addEventListener('keydown',e=>{if(!MENC||e.target!==MENC.el)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();MENC.i=(MENC.i+(e.key==='ArrowDown'?1:MENC.itens.length-1))%MENC.itens.length;mencAbrir(MENC.el)}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();mencEscolher(MENC.i)}
  else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();mencFechar()}},true);
window.addEventListener('scroll',()=>{if(MENC)mencFechar()},true);
// Link do e-mail de aviso: /?abrir=p:ID (post) ou t:ID (conversa)
function abrirDoLink(){const a=new URLSearchParams(location.search).get('abrir');if(!a)return;history.replaceState(null,'','/');
  const [k,id]=a.split(':');if(k==='p'&&posts.some(p=>p.id===id))openDrawer('post',id);else if(k==='t'&&threads.some(t=>t.id===id)){S.thread=id;S.view='hoje';render();irChat()}}
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
   ${team?`<div class="actions"><button class="btn" data-act="video-salvar" data-id="${v.id}">Salvar nome e roteiro</button></div>`:''}${acts}${arqSecao('v:'+v.id,v,{pode:team||isP,titulo:'Arquivos do vídeo',dica:'Roteiro, cortes e vídeo final'})}${linksSection('v:'+v.id)}
   ${(v.hist||[]).length?`<div><div class="eyebrow" style="margin-bottom:6px">Histórico</div><div class="hist">${histHtml(v.hist)}</div></div>`:''}</div>`;
}
function drawerMarcos(){
  return `<header><div><div class="eyebrow">Calendário</div><h2>Safra, foco comercial e eventos</h2></div>${closeBtn()}</header>
  <div class="content"><p class="muted" style="margin:0">Essas faixas aparecem no topo dos dias do calendário. Feriado e recesso também tiram os dias da contagem de prazos (os feriados nacionais já entram sozinhos; cadastre aqui os de Maringá ou do Paraná e os recessos). Ajuste o nome e as datas de cada fase.</p>
  ${(S.marcosEd||MARCOS).map(m=>`<div class="panel" style="display:grid;gap:8px">
    <div style="display:grid;grid-template-columns:1fr 150px;gap:8px"><div><label for="mn-${m.id}" class="muted" style="font-size:12px">Nome</label><input type="text" id="mn-${m.id}" value="${esc(m.nome)}"></div><div><label for="mt-${m.id}" class="muted" style="font-size:12px">Tipo</label><select id="mt-${m.id}">${Object.entries(MK_TIPO).map(([k,l])=>`<option value="${k}" ${m.tipo===k?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end"><div><label for="mi-${m.id}" class="muted" style="font-size:12px">Início</label><input type="date" id="mi-${m.id}" value="${m.ini}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px;width:100%"></div><div><label for="mf-${m.id}" class="muted" style="font-size:12px">Fim</label><input type="date" id="mf-${m.id}" value="${m.fim}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px;width:100%"></div><button class="btn danger" data-act="marco-del" data-id="${m.id}">Remover</button></div></div>`).join('')}
  <div class="actions"><button class="btn" data-act="marco-add">Adicionar fase</button><button class="btn primary" data-act="marcos-salvar">Salvar</button></div></div>`;
}
function drawerDemanda(d){
  if(!d)return `<header><div><div class="eyebrow">Demandas</div><h2>Nova demanda</h2></div>${closeBtn()}</header>
  <div class="content"><label for="dt">O que precisa ser feito?</label><input type="text" id="dt" placeholder="Ex.: Enviar fotos da feira regional">
   <label for="dq">Com quem está</label><select id="dq"><option value="spraytec" ${isM()?'':'selected'}>Spraytec</option><option value="cancha" ${isM()?'selected':''}>Cancha</option></select>
   <label for="dd">Data</label><input type="date" id="dd" value="${S.novaDemData||addDays(TODAY,3)}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px">
   <label for="dx">Detalhes</label><textarea id="dx" placeholder="Opcional"></textarea>
   <div class="actions"><button class="btn primary" data-act="dem-salvar">Criar demanda</button></div></div>`;
  return `<header><div><div class="eyebrow" style="color:var(--k-${d.quem})">${d.quem==='cancha'?'Com a Cancha':'Com a Spraytec'}</div><h2>${esc(d.t)}</h2></div>${closeBtn()}</header>
  <div class="content"><dl class="kv" style="margin:0"><dt>Data</dt><dd class="mono">${fmtLong(d.data)}</dd><dt>Situação</dt><dd>${d.feito?tagPill('Concluída','--ok'):d.data<TODAY?tagPill('Atrasada','--bad'):tagPill('Em aberto','--muted')}</dd></dl>
   ${d.det?`<div class="caption">${esc(d.det)}</div>`:''}
   <label for="dnd">Mudar a data</label><input type="date" id="dnd" value="${d.data}" style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px">
   <div class="actions"><button class="btn" data-act="dem-data" data-id="${d.id}">Salvar data</button><button class="btn primary" data-act="dem-feito" data-id="${d.id}">${d.feito?'Reabrir':'Marcar como concluída'}</button></div>${linksSection('d:'+d.id)}${arqSecao('d:'+d.id,d,{pode:isTeam()||isM()})}${(t=>t?`<button class="lnk" data-thread-go="${t.id}"># ${esc(t.tema)} · ver conversa</button>`:S.role==='produtora'?'':`<button class="btn" data-act="conversa-dem" data-id="${d.id}">Abrir conversa sobre esta demanda</button>`)(threads.find(t=>t.ref==='d:'+d.id))}</div>`;
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
  else if(k==='ins')html=drawerIns();
  else if(k==='pau')html=drawerPautas();
  else if(k==='txt')html=drawerTextos();
  else if(k==='conc')html=drawerConc();
  else if(k==='cacoes')html=drawerAcoes();
  else if(k==='apr')html=drawerApr();
  else if(k==='guia')html=drawerGuia();
  else if(k==='rapida')html=drawerRapida();
  else if(k==='importar')html=drawerImportar();
  else if(k==='pessoa')html=drawerPessoa();
  else html=drawerDemanda(demandas.find(x=>x.id===S.drawer.id));
  L.innerHTML=`<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
}

function setTopH(){const t=document.querySelector('.top');if(t)document.documentElement.style.setProperty('--toph',t.offsetHeight+'px')}
window.addEventListener('resize',setTopH);
function render(){
  if(!EU){if(d.act==='esqueci')telaEntrar(null,'esqueci');else if(d.act==='voltar-entrar')telaEntrar();return}
  renderRoles();
  const allowed=VIEWS.find(v=>v[0]===S.view);if(!allowed||!allowed[2]||!allowed[2].includes(S.role))S.view=S.role==='produtora'?'videos':'hoje';
  renderNav();
  const V={hoje:viewHoje,plano:viewPlano,aprovacao:viewAprovacao,calendario:viewCalendario,redes:viewRedes,performance:viewPerformance,acervo:viewAcervo,demandas:viewDemandas,videos:viewVideos,atividade:viewAtividade,pessoas:viewPessoas}[S.view];
  $('#main').innerHTML=`<div class="wrap">${V()}</div>`;
  const ms=$('#msgs');if(ms)ms.scrollTop=ms.scrollHeight;
  renderDrawer();
  setTopH();
}
function readMarcos(){(S.marcosEd||[]).forEach(m=>{const g=k=>document.getElementById(k+'-'+m.id);if(!g('mn'))return;m.nome=g('mn').value.trim()||m.nome;m.tipo=g('mt').value;m.ini=g('mi').value||m.ini;m.fim=g('mf').value||m.fim;if(m.fim<m.ini)m.fim=m.ini})}
function irChat(foco){setTimeout(()=>{const c=document.querySelector('.chat');if(c&&c.scrollIntoView)c.scrollIntoView({block:'start',behavior:'smooth'});if(foco){const x=$('#cm');if(x)x.focus()}},0)}

// ===================== SERVIDOR =====================
// A tela só mostra; toda alteração vai para o servidor, que confere o papel, grava e devolve o estado novo.
let EU=null,DEMO=false,ULTIMA_VISITA=null,VERSAO=0,ocupado=false,ATIVIDADE=null,APROVADORES=[],PESSOAS=null;
function fmtVisita(iso){const p=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(iso));const g=t=>(p.find(x=>x.type===t)||{}).value||'';return `${g('weekday').replace('.','')}, ${g('day')}/${g('month')} às ${g('hour')}:${g('minute')}`}
function aplicar(j){
  const primeira=!EU,novoDia=TODAY!==j.hoje;
  EU=j.eu;DEMO=!!j.demo;VERSAO=j.versao;TODAY=j.hoje;APROVADORES=j.aprovadores||[];MENCIONAVEIS=j.mencionaveis||[];if(j.ultimaVisita!==undefined)ULTIMA_VISITA=j.ultimaVisita;
  const d=j.dados||{};
  posts=d.posts||[];videos=d.videos||[];demandas=d.demandas||[];threads=d.threads||[];MARCOS=d.marcos||[];ANO=d.ano||[];CONC=d.conc||[];
  APRENDIZADOS=d.aprendizados||[];RELATORIOS=d.relatorios||[];plano=d.plano||null;GUIA=d.guia||GUIA;LANES=d.lanes||[];CONC_ACOES=d.concAcoes||[];LINKS=d.links||[];
  planoItem=posts.find(p=>p.formato==='plano')||null;
  S.role=EU.papel;
  CICLOS=d.ciclos||[];CLASSIF=d.classif||[];
  DRIVE=j.drive||{conectado:false,configurado:false};GA4=j.ga4||{conectado:false,configurado:false};YT=j.yt||{conectado:false,configurado:false};GADS=j.gads||{conectado:false,configurado:false};materiais=d.materiais||[];
  if(primeira){if(EU.papel==='produtora')META=null;else{META=undefined;carregarMeta()}}
  if(primeira||novoDia){carregarFonteExemplo();if(!S.month){S.month=(Number(TODAY.slice(8))>=15?addDays(TODAY.slice(0,8)+'01',40):TODAY).slice(0,7);S.dmonth=TODAY.slice(0,7)}setPreset(S.per.preset&&S.per.preset!=='custom'?S.per.preset:'30')}
}
async function api(url,corpo){
  const r=await fetch(url,corpo===undefined?{credentials:'same-origin'}:{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(corpo)});
  let j={};try{j=await r.json()}catch(_){}
  if(r.status===401&&!url.startsWith('/api/entrar')){telaEntrar(EU?'Sua sessão terminou. Entre de novo.':undefined);const e=new Error('sem sessão');e.silencioso=true;throw e}
  if(!r.ok){const e=new Error(j.erro||'Não foi possível completar. Tente de novo.');e.codigo=j.codigo;throw e}
  return j}
// Link de arquivo do Drive salvo no item: o portal copia o arquivo para o post sozinho (o mesmo que "Usar do Drive").
const linkArqDrive=s=>/drive\.google\.com\/(file\/d\/|open\?id=|uc\?)/.test(String(s||''));
const linksDrive=s=>String(s||'').split(/[\s,;|]+/).filter(linkArqDrive);
const linksPendentes=p=>linksDrive(p&&p.drive).filter(l=>!(p.arquivos||[]).some(a=>!a.removido&&a.origem===l));
const precisaCopiar=p=>isTeam()&&DRIVE.conectado&&DRIVE.leitura&&p&&p.formato!=='plano'&&p.status!=='aprovacao'&&linksPendentes(p).length>0;
async function copiarPendentes(ids){const L=[...new Set(ids)].map(id=>posts.find(x=>x.id===id)).filter(precisaCopiar);if(!L.length)return;
  const tarefas=L.flatMap(p=>linksPendentes(p).map(l=>[p,l]));let ok=0;const ruins=[];toast(tarefas.length===1?'Copiando o arquivo do Drive para o post…':'Copiando '+tarefas.length+' arquivos do Drive para os posts…');
  for(const [p,l] of tarefas){try{const j=await api('/api/arquivos/do-drive',{ref:'p:'+p.id,link:l});if(j&&j.dados)aplicar(j);ok++}catch(e){ruins.push('"'+p.titulo+'": '+(e.message||'falhou'))}}
  render();toast(ruins.length?(ok?ok+' copiado'+(ok>1?'s':'')+'. ':'')+'Não deu para copiar '+ruins.join('; '):ok===1?'Arquivo copiado do Drive para o post.':ok+' arquivos copiados do Drive para os posts.')}
async function acao(nome,dados,depois){
  if(ocupado)return null;ocupado=true;document.body.classList.add('salvando');
  try{const j=await api('/api/acao',Object.assign({acao:nome},dados||{}));aplicar(j);render();if(depois)depois(j);return j}
  catch(e){if(!e.silencioso){if(e.codigo==='precisa-registro'&&dados&&dados.id){S.needExt=dados.id;openDrawer('post',dados.id)}toast(e.message)}return null}
  finally{ocupado=false;document.body.classList.remove('salvando')}}
function acaoSilenciosa(nome,dados){api('/api/acao',Object.assign({acao:nome},dados||{})).then(j=>{VERSAO=j.versao}).catch(()=>{})}
async function iniciar(){
  try{const j=await api('/api/estado');document.body.classList.remove('entrando');EU=null;S.view=j.eu.papel==='produtora'?'videos':'hoje';S.drawer=null;S.sel={};S.pdraft=null;S.pop=null;S.thread=null;ATIVIDADE=null;aplicar(j);render();window.scrollTo(0,0);abrirDoLink();const qs=new URLSearchParams(location.search);if(qs.get('drive')){avisoDriveRetorno();render()}else if(qs.get('ga4')){avisoGA4Retorno();render()}else if(qs.get('yt')){avisoYTRetorno();render()}else if(qs.get('gads')){avisoGAdsRetorno();render()}}catch(_){}}
// Atualiza sozinho quando outra pessoa muda algo (ex.: a Spraytec aprova pelo celular), sem atrapalhar quem está editando.
setInterval(async()=>{
  if(!EU||document.hidden||ocupado)return;
  try{const j=await api('/api/versao');if(j.versao===VERSAO)return;
    const ae=document.activeElement;if(S.drawer||S.pdraft||S.pop||(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)))return;
    const e=await api('/api/estado');if(S.view==='atividade')ATIVIDADE=null;aplicar(e);render()}catch(_){}},15000);

// Dados do Meta: o servidor coleta a cada hora; a tela relê a cada 10 minutos.
setInterval(()=>{if(EU&&EU.papel!=='produtora'&&!document.hidden)carregarMeta()},10*60e3);

// imagem do Meta com link vencido: some e deixa o desenho que está por baixo
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.hasAttribute('data-falha'))t.remove()},true);

// ---------- entrada ----------
const DESC_PAPEL={operacao:'Aprova pautas, peças, roteiros e o plano de mídia.',diretoria:'Acompanha estratégia, resultados e relatórios.',cancha:'Produz, envia para aprovação e publica.',produtora:'Vê só as pautas de vídeo: viabilidade e entrega.'};
async function telaEntrar(msg,modo){
  EU=null;S.drawer=null;$('#nav').innerHTML='';$('#roles').innerHTML='';$('#layer').innerHTML='';document.body.classList.add('entrando');
  let o={};try{o=await (await fetch('/api/entrar/opcoes',{credentials:'same-origin'})).json()}catch(_){}
  const dm=$('#demo');dm.hidden=true;
  let h=`<div class="entrar"><div><h1>Entrar no portal</h1><p class="sub">Portal de marketing da Spraytec Brasil.</p></div>`;
  if(msg)h+=`<div class="notice">${esc(msg)}</div>`;
  if(modo==='esqueci')h+=`<section class="panel"><h2>Esqueci minha senha</h2><p class="muted" style="margin-top:0">${o.email?'Digite o seu e-mail. Mandamos um link para você criar uma nova senha.':'Peça à equipe da Cancha um link para criar uma nova senha.'}</p>
    ${o.email?`<form class="entrarform" data-form="esqueci"><label for="eq">E-mail</label><input type="email" id="eq" class="pe" autocomplete="username" required><button class="btn primary">Enviar link</button></form>`:''}
    <p style="margin:10px 0 0"><button class="linkbtn" data-act="voltar-entrar">Voltar para a entrada</button></p></section>`;
  else h+=`<section class="panel"><form class="entrarform" data-form="senha"><label for="em">E-mail</label><input type="email" id="em" class="pe" autocomplete="username" required>
    <label for="sn">Senha</label><input type="password" id="sn" class="pe" autocomplete="current-password" required>
    <button class="btn primary">Entrar</button></form><p style="margin:10px 0 0"><button class="linkbtn" data-act="esqueci">Esqueci minha senha</button></p></section>`;
  let demo='';
  if(o.demo&&!o.demoLiberado)demo+=`<section class="panel"><p class="muted" style="margin-top:0">Digite o código de acesso.</p><form class="ler" data-form="demo-codigo"><input type="password" id="dc" class="pe" autocomplete="off" aria-label="Código de acesso" placeholder="Código de acesso"><button class="btn">Continuar</button></form></section>`;
  if(o.demo&&o.demoLiberado)demo+=`<section class="panel"><h2>Entrar como</h2><p class="muted" style="margin-top:0">Cada perfil vê o portal de um jeito. Tudo o que for feito fica registrado com o nome de quem fez.</p><div class="pessoas">${(o.pessoas||[]).map(p=>`<button class="pessoa" data-pessoa="${esc(p.id)}"><b>${esc(p.nome)}</b><span>${esc(ROLES[p.papel]||p.papel)}</span><small class="muted">${esc(DESC_PAPEL[p.papel]||'')}</small></button>`).join('')}</div></section>`;
  if(demo&&modo!=='esqueci')h+=`<details class="padj" ${o.demoLiberado?'open':''}><summary class="linkbtn">Acesso de demonstração</summary><div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">${demo}</div></details>`;
  h+=`<footer class="porcancha"><span>Um portal feito por</span><img src="/cancha-vertical.png" alt="Cancha Marketing" height="44"></footer></div>`;
  $('#main').innerHTML=`<div class="wrap">${h}</div>`;
  const f=$(modo==='esqueci'?'#eq':'#em');if(f)f.focus();
}
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();
  const botao=f.querySelector('button');if(botao)botao.disabled=true;
  try{
    if(f.dataset.form==='demo-codigo'){await api('/api/entrar/demo-codigo',{codigo:$('#dc').value});telaEntrar()}
    else if(f.dataset.form==='senha'){await api('/api/entrar/senha',{email:$('#em').value,senha:$('#sn').value});iniciar()}
    else if(f.dataset.form==='esqueci'){const j=await api('/api/senha/esqueci',{email:$('#eq').value});telaEntrar(j.msg)}
    else if(f.dataset.form==='definir'){const s1=$('#ns1').value,s2=$('#ns2').value;if(s1!==s2){toast('As duas senhas não são iguais.');return}
      await api('/api/senha/definir',{t:f.dataset.t,senha:s1});history.replaceState(null,'','/');iniciar()}
  }catch(err){toast(err.message);if(f.dataset.form==='senha'){const x=$('#sn');if(x){x.value='';x.focus()}}}
  finally{if(botao)botao.disabled=false}});

// ---------- registro de atividades (equipe da Cancha) ----------
function viewAtividade(){
  if(!ATIVIDADE){api('/api/atividade').then(j=>{ATIVIDADE=j.itens;if(S.view==='atividade')render()}).catch(e=>{if(!e.silencioso)toast(e.message)});return `${head('Registro de atividades')}<p class="muted">Carregando…</p>`}
  return `${head('Registro de atividades','Cada ação feita no portal, com quem fez e quando. Este registro não pode ser alterado nem apagado.','<button class="btn" data-act="atividade-atualizar">Atualizar</button>')}
  <div class="tablewrap"><table class="ap" style="min-width:560px"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead><tbody>${ATIVIDADE.map(a=>`<tr><td class="mono" style="white-space:nowrap">${fmtVisita(a.em)}</td><td>${esc(a.usuario_nome||'—')}${a.papel?`<div class="muted" style="font-size:12px">${esc(ROLES[a.papel]||a.papel)}</div>`:''}</td><td>${esc(a.resumo||a.acao)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Nada registrado ainda.</td></tr>'}</tbody></table></div>
  ${DEMO?`<details class="ferramentas"><summary>Ferramentas</summary><p class="muted" style="margin:6px 0">Volta os itens ao estado inicial, com as datas ajustadas para hoje. O registro acima continua guardado.</p><button class="btn sm" data-act="demo-restaurar">Recarregar dados</button></details>`:''}`}

// ---------- cliques ----------
document.addEventListener('click',e=>{
  if(e.target.closest('.cprod'))return;
  const t=e.target.closest('[data-pessoa],[data-selall],[data-calv],[data-kgrp],[data-acat],[data-relcat],[data-per],[data-psort],[data-prede],[data-ytord],[data-cord],[data-thread],[data-thread-go],[data-tab],[data-tipo],[data-atipo],[data-quem],[data-pasta],[data-view],[data-open],[data-video],[data-dem],[data-act],[data-month],[data-sel],[data-selv]');
  if(!t)return;
  const d=t.dataset;
  if(d.pessoa){api('/api/entrar/demo',{usuarioId:d.pessoa}).then(iniciar).catch(err=>toast(err.message));return}
  if(!EU){if(d.act==='esqueci')telaEntrar(null,'esqueci');else if(d.act==='voltar-entrar')telaEntrar();return}
  if(d.calv){S.calv=d.calv;render();return}
  if(d.kgrp){S.kgrp=d.kgrp;render();return}
  if(d.acat){const [sb,k]=d.acat.split('|');S.acat[sb]=k;render();return}
  if(d.relcat){S.relCat=d.relcat;render();return}
  if(d.per){setPreset(d.per);render();return}
  if(d.psort){S.psort=d.psort;render();return}
  if(d.prede){S.prede=d.prede;render();return}
  if(d.ytord){S.ytord=d.ytord;render();return}
  if(d.cord){S.cord=d.cord;render();return}
  if(d.thread){S.thread=d.thread;S.linkPick=false;render();return}
  if(d.threadGo){S.thread=d.threadGo;S.view='hoje';S.drawer=null;render();irChat();return}
  if(d.tab){S[d.tab]=d.val;render();return}
  if(d.tipo){S.tipos[d.tipo]=!S.tipos[d.tipo];render();return}
  if(d.atipo){S.atipo=d.atipo;render();return}
  if(d.quem){S.quem=d.quem;render();return}
  if(d.pasta!==undefined){S.pasta=d.pasta||null;render();return}
  if(d.view){S.view=d.view;S.drawer=null;if(d.view==='atividade')ATIVIDADE=null;if(d.view==='pessoas')PESSOAS=null;render();window.scrollTo(0,0);return}
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
    case 'close':{const wasV=S.drawer&&S.drawer.kind==='video';S.needExt=null;S.marcosEd=null;S.convite=null;closeDrawer();if(wasV)render();break}
    case 'importar':S.imp=null;openDrawer('importar');break;
    case 'imp-modelo':baixarArquivo('modelo-calendario-spraytec.csv','\uFEFF'+[IMP_COLS,...IMP_EXEMPLO].map(l=>l.map(csvCampo).join(';')).join('\r\n'),'text/csv;charset=utf-8');break;
    case 'imp-copiar':{const x=$('#imp-prompt');try{navigator.clipboard.writeText(impPrompt()).then(()=>toast('Pedido copiado.'),()=>{x.select();toast('Selecionei o texto: copie com Ctrl+C.')})}catch(_){x.select()}break}
    case 'imp-confirmar':{const I=S.imp;if(!I)break;const env=I.linhas.filter(l=>l.acao!=='igual');const linhas=env.map(l=>l.dados);const nv=env.filter(l=>l.acao==='novo').length,at=env.length-nv;
      const antes=new Set(posts.map(x=>x.id));acao('calendario-importar',{arquivo:I.arquivo,linhas},()=>{copiarPendentes(posts.filter(x=>!antes.has(x.id)||linhas.some(l=>l.id===x.id)).map(x=>x.id));S.imp=null;closeDrawer();const m=env.filter(l=>l.acao==='novo').map(l=>l.dados.data).filter(Boolean).sort()[0];if(m)S.month=m.slice(0,7);render();toast([nv?nv+(nv===1?' item novo':' itens novos'):'',at?at+(at===1?' atualizado':' atualizados'):''].filter(Boolean).join(' e ')+'.')});break}
    case 'exportar-mes':exportarMes();break;
    case 'plano-exportar':readPlanoForm();planoExportar();break;
    case 'pessoa-nova':openDrawer('pessoa',null);setTimeout(()=>{const x=$('#ps-nome');if(x)x.focus()},0);break;
    case 'pessoa-edit':openDrawer('pessoa',id);break;
    case 'pessoa-salvar':{const corpo={id:S.drawer.id||null,nome:val('#ps-nome'),email:val('#ps-email'),papel:$('#ps-papel').value,ativo:$('#ps-ativo').checked};let novoId=null;
      api('/api/pessoas/salvar',corpo).then(j=>{novoId=corpo.id?null:j.id;return api('/api/pessoas')}).then(j=>{PESSOAS=j;S.convite=null;render();if(novoId){openDrawer('pessoa',novoId);toast('Pessoa cadastrada. Agora mande o convite.')}else{closeDrawer();toast('Cadastro salvo.')}}).catch(e=>{if(!e.silencioso)toast(e.message)});break}
    case 'pessoa-convite':{const enviar=!!d.enviar;api('/api/pessoas/convite',{id,enviar}).then(j=>{S.convite={id,link:j.link};return api('/api/pessoas').then(k=>{PESSOAS=k;render();openDrawer('pessoa',id);
        if(j.enviado)toast('E-mail enviado.');else{const x=$('#ps-link');try{navigator.clipboard.writeText(j.link).then(()=>toast('Link copiado. Mande só para essa pessoa.'),()=>{if(x)x.select();toast('Selecionei o link: copie com Ctrl+C.')})}catch(_){if(x)x.select()}}})}).catch(e=>{if(!e.silencioso)toast(e.message)});break}
    case 'sair':api(DEMO?'/api/sair-demo':'/api/sair',{}).catch(()=>{}).finally(()=>telaEntrar());break;
    case 'trocar-pessoa':api('/api/sair',{}).catch(()=>{}).finally(()=>telaEntrar());break;
    case 'atividade-atualizar':ATIVIDADE=null;render();break;
    case 'drive-desconectar':if(confirm('Desconectar o Google Drive? Os arquivos continuam no Drive da Spraytec, mas o portal deixa de mostrar e de enviar até conectar de novo.'))api('/api/drive/desconectar',{}).then(()=>{toast('Drive desconectado.');S.driveSit=null;S.driveSitPedido=false;iniciar()}).catch(err=>toast(err.message));break;
    case 'ga4-escolher':{const sel=$('#ga4-prop');if(!sel)break;api('/api/ga4/propriedade',{id:sel.value}).then(()=>{toast('Propriedade escolhida. Os números do site aparecem em alguns minutos.');[60e3,180e3].forEach(t=>setTimeout(carregarMeta,t));iniciar()}).catch(err=>toast(err.message));break}
    case 'gads-escolher':{const sel=$('#gads-conta');if(!sel)break;api('/api/gads/conta',{id:sel.value}).then(()=>{toast('Conta escolhida. Os números aparecem em alguns minutos.');[60e3,180e3].forEach(t=>setTimeout(carregarMeta,t));iniciar()}).catch(err=>toast(err.message));break}
    case 'gads-desconectar':if(confirm('Desconectar o Google Ads? Os números já coletados continuam no portal, mas param de ser atualizados.'))api('/api/gads/desconectar',{}).then(()=>{toast('Google Ads desconectado.');iniciar()}).catch(err=>toast(err.message));break;
    case 'yt-desconectar':if(confirm('Desconectar o YouTube? Os números já coletados continuam no portal, mas param de ser atualizados.'))api('/api/yt/desconectar',{}).then(()=>{toast('YouTube desconectado.');iniciar()}).catch(err=>toast(err.message));break;
    case 'ga4-desconectar':if(confirm('Desconectar o Google Analytics? Os números já coletados continuam no portal, mas param de ser atualizados.'))api('/api/ga4/desconectar',{}).then(()=>{toast('Google Analytics desconectado.');iniciar()}).catch(err=>toast(err.message));break;
    case 'acv-mais':S.alim=(S.alim||48)+48;render();break;
    case 'acv-prod':S.aprod=!S.aprod;render();break;
    case 'apm':S.apm=t.dataset.m;render();break;
    case 'guia-arquivos':S.asub='materiais';S.acat.materiais='Guia de marca';S.mpasta='Guia de marca';render();break;
    case 'm-nova-pasta':{const n=(prompt('Nome da nova pasta de materiais:')||'').trim().slice(0,60);if(n){S.mpasta=n;render()}break}
    case 'meta-atualizar':api('/api/integracoes/atualizar',{}).then(j=>{toast(j.jaRodando?'A coleta já está rodando. Os números novos aparecem em alguns minutos.':'Coleta iniciada. Os números novos aparecem em alguns minutos.');[60e3,180e3,360e3].forEach(t=>setTimeout(carregarMeta,t))}).catch(err=>toast(err.message));break;
    case 'demo-restaurar':if(!confirm('Recarregar os dados? Os itens voltam ao estado inicial.'))break;
      api('/api/demo/restaurar',{}).then(()=>api('/api/estado')).then(j=>{ATIVIDADE=null;S.pdraft=null;aplicar(j);render();toast('Dados recarregados.')}).catch(err=>toast(err.message));break;
    case 'ligar-abrir':S.linkPick=true;render();break;
    case 'ligar-cancelar':S.linkPick=false;render();break;
    case 'ligar-salvar':{const ref=$('#ld').value;S.linkPick=false;acao('conversa-ligar',{id:S.thread,ref},()=>{const r=resolve(ref);toast('Conversa ligada à demanda "'+(r?r.t:'')+'".')});break}
    case 'ligar-remover':S.linkPick=false;acao('conversa-ligar',{id:S.thread,ref:null},()=>toast('Ligação removida.'));break;
    case 'conversa-dem':acao('conversa-nova',{tema:dm.t,ref:'d:'+dm.id},j=>{S.thread=j.criado;S.view='hoje';S.drawer=null;render();irChat(true)});break;
    case 'novo-tema':S.novoTema=true;render();setTimeout(()=>{const x=$('#nt');if(x)x.focus()},0);break;
    case 'criar-tema':{const tt=val('#nt');if(!tt){toast('Dê um tema para a conversa.');return}acao('conversa-nova',{tema:tt},j=>{S.thread=j.criado;S.novoTema=false;render();setTimeout(()=>{const x=$('#cm');if(x)x.focus()},0)});break}
    case 'enviar-msg':{const tx=val('#cm');if(!tx)return;acao('mensagem',{id:S.thread,txt:tx});break}
    case 'approve':{const isPl=p&&p.formato==='plano',isPa=p&&p.status==='pauta_aprovacao',isTx=p&&p.status==='texto_aprovacao';if(S.drawer&&S.drawer.kind==='mud')S.drawer=null;acao('aprovar',{id},()=>toast(isPl?'Alterações do plano aprovadas. A versão '+plano.versao+' passa a valer.':isPa?'Pauta aprovada. A Cancha escreve os textos.':isTx?'Textos aprovados. A Cancha produz a arte.':'Aprovado.'));break}
    case 'pe-edit':readPlanoForm();if(S.pdraft)prune(S.pdraft);if(!S.pdraft){S.pdraft=clone(plano.pendente?plano.pendente.dados:plano.dados);S.pnota=plano.pendente?plano.pendente.nota:''}S.pedit=d.card;render();break;
    case 'pe-done':readPlanoForm();prune(S.pdraft);S.pedit=null;render();break;
    case 'pa-add':readPlanoForm();getPath(S.pdraft,d.path).push(clone(TPL[d.tpl]));render();break;
    case 'pa-del':readPlanoForm();getPath(S.pdraft,d.path).splice(Number(d.idx),1);render();break;
    case 'cal-add':S.novoTipo=null;openDrawer('novo',d.date||(S.month===TODAY.slice(0,7)?TODAY:S.month+'-01'));setTimeout(()=>{const x=$('#nt-titulo');if(x)x.focus()},0);break;
    case 'novo-salvar':{const dados=lerNovo();if(!dados)return;acao('calendario-novo',dados,j=>{if(j&&typeof j.criado==='string'&&j.criado.startsWith('p:'))copiarPendentes([j.criado.slice(2)]);S.month=dados.data.slice(0,7);S.novoTipo=null;closeDrawer();render();toast('Adicionado ao calendário em '+fmtLong(dados.data)+'.')});break}
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
    case 'post-editar':acao('post-editar',{id,titulo:val('#pe-titulo'),legenda:$('#pe-leg')?$('#pe-leg').value:undefined,pauta:$('#pe-pauta')?$('#pe-pauta').value:undefined,hora:val('#pe-hora')||null,drive:val('#pe-drive')},()=>{toast('Conteúdo salvo.');copiarPendentes([id])});break;
    case 'st-save':irParaEtapa(posts.find(x=>x.id===id),$('#st-sel').value);break;
    case 'drive-link':{const ref=t.dataset.ref,inp=document.getElementById('dl-'+ref.replace(':','-')),link=(t.dataset.link||(inp&&inp.value)||'').trim();if(!link){toast('Cole o link do arquivo no Google Drive.');break}
      const txt=t.textContent;t.disabled=true;t.textContent='Copiando do Drive…';
      api('/api/arquivos/do-drive',{ref,link}).then(j=>{if(j&&j.dados){aplicar(j);render()}toast('"'+(j&&j.nome||'Arquivo')+'" copiado do Drive para o post.')}).catch(e=>{t.disabled=false;t.textContent=txt;toast(e.message||'Não foi possível usar esse arquivo do Drive.')});break}
    case 'post-excluir':if(p&&confirm('Excluir "'+p.titulo+'"'+(p.date?' ('+fmtLong(p.date)+')':'')+'?\n\nO item sai do calendário para todos. Os arquivos continuam no Google Drive e uma cópia fica no Registro de atividades.'))acao('post-excluir',{id},()=>{closeDrawer();toast('Item excluído.')});break;
    case 'drive-links':copiarPendentes([id]);break;
    case 'agendar':acao('status',{id,status:'agendado'},()=>toast('Marcado como agendado.'));break;
    case 'st-pub':acao('publicar',{id,link:val('#pub-link')},()=>toast('Marcado como publicado.'));break;
    case 'ver-mud':openDrawer('mud',id);break;
    case 'pe-discard':S.pdraft=null;S.pedit=null;S.pnota='';render();toast('Rascunho descartado.');break;
    case 'pe-send':{readPlanoForm();prune(S.pdraft);const nota=(S.pnota||'').trim();if(!changedParts(S.pdraft).length){toast('Nada mudou em relação à versão aprovada.');return}if(!nota){toast('Explique o que mudou e por quê antes de enviar.');const x=$('#pnota');if(x)x.focus();return}
      acao('plano-enviar',{dados:S.pdraft,nota},()=>{S.pdraft=null;S.pedit=null;S.pnota='';render();toast('Alterações enviadas. A Spraytec vê o que mudou e precisa aprovar.')});break}
    case 'plano-ajuste':{const c=val('#padj');if(!c){toast('Escreva o que precisa mudar.');return}acao('plano-ajuste',{txt:c},()=>toast('Ajuste pedido. A Cancha foi avisada.'));break}
    case 'validacao':acao('validacao',{id},()=>toast('Marcado como em validação interna. O prazo continua correndo.'));break;
    case 'adjust':{const c=val('#adj');if(!c){toast('Escreva o que precisa mudar para pedir ajuste.');return}acao('ajuste',{id,txt:c},()=>toast('Ajuste pedido. A Cancha foi avisada.'));break}
    case 'to-prod':acao('para-producao',{id},()=>toast('Movido para produção.'));break;
    case 'send':{const prod=p&&['video','design'].includes(p.rede);acao('enviar',{id},()=>toast(prod?'Marcado como concluído.':'Enviado para aprovação.'));break}
    case 'newver':acao('nova-versao',{id},()=>toast('Nova versão enviada para aprovação.'));break;
    case 'enviar-pauta':acao('enviar-pauta',{id},()=>toast('Pauta enviada para aprovação da Spraytec.'));break;
    case 'enviar-textos':acao('enviar-textos',{id},()=>toast('Textos enviados para aprovação da Spraytec.'));break;
    case 'cal-mes':S.view='calendario';S.calv='mes';S.month=t.dataset.m;render();scrollTo(0,0);break;
    case 'ins-open':openDrawer('ins',t.dataset.m);break;
    case 'pau-open':openDrawer('pau',t.dataset.m);break;
    case 'txt-open':openDrawer('txt',t.dataset.m);break;
    case 'ins-salvar':{const txt={};INS_F.forEach(([k])=>{const x=$('#in-'+k);txt[k]=x?x.value:''});acao('insumos-salvar',{m:t.dataset.m,txt},()=>{closeDrawer();toast(isM()?'Insumos enviados para a Cancha.':'Insumos registrados.')});break}
    case 'pau-env':acao('enviar-pautas',{ids:(t.dataset.ids||'').split(',').filter(Boolean)},()=>toast('Pautas enviadas para aprovação da Spraytec.'));break;
    case 'txt-env':acao('enviar-textos',{ids:(t.dataset.ids||'').split(',').filter(Boolean)},()=>toast('Textos enviados para aprovação da Spraytec.'));break;
    case 'lote-aprovar':acao('aprovar-lote',{ids:(t.dataset.ids||'').split(',').filter(Boolean)},()=>toast('Aprovado.'));break;
    case 'go-quem':S.view='calendario';S.calv='kanban';S.kgrp='quem';closeDrawer();render();window.scrollTo(0,0);break;
    case 'go-aprov':S.view='aprovacao';closeDrawer();render();break;
    case 'external':acao('aprovacao-externa',{id,quem:val('#ext-quem'),canal:$('#ext-canal')?$('#ext-canal').value:'WhatsApp',evidencia:val('#ext-link')},()=>{S.needExt=null;render();toast('Aprovação externa registrada no histórico.')});break;
    case 'textos':acao('textos',{id,legenda:val('#tx-leg')},()=>toast('Textos adicionados. Foi para validação interna da Spraytec.'));break;
    case 'p-classif':acao('post-classificar',{id,produto:val('#pc-prod'),pilar:val('#pc-pilar')},()=>toast('Classificação salva.'));break;
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
  if(g.k==='st'){irParaEtapa(posts.find(x=>x.id===g.id),c.dataset.scol);return}
  if(g.k==='vid'){const col=c.dataset.vcol,v=videos.find(x=>x.id===g.id);if(col&&v&&v.stage!==col)acao('video-etapa',{id:g.id,etapa:col},()=>toast('Vídeo movido para '+VCOLS.find(x=>x[0]===col)[1]+'.'));return}
  const day=c.dataset.day;if(!day)return;
  if(g.k==='dem'){if(day!=='espera')acao('demanda-data',{id:g.id,data:day},()=>toast('Demanda movida para '+fmtLong(day)+'.'));return}
  if(day==='espera')acao('post-data',{id:g.id,data:null},()=>toast('Movido para em espera.'));
  else{const was=(posts.find(x=>x.id===g.id)||{}).status;acao('post-data',{id:g.id,data:day},()=>toast(was==='agendado'?'Data alterada. Agende de novo na rede e marque como agendado.':'Data alterada para '+fmtLong(day)+'.'))}});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.id==='plano-arq'&&t.files&&t.files[0]){const fl=t.files[0];t.value='';planoLerArquivo(fl);return}if(t&&t.id==='f-prod'){S.prod=t.value;S.alim=0;render();return}if(t&&t.id==='f-aper'){S.aper=t.value;S.alim=0;render();return}if(t&&t.dataset&&t.dataset.cprod){acao('acervo-produto',{id:t.dataset.cprod,produto:t.value},()=>toast('Produto salvo.'));return}if(t&&t.id==='imp-arq'&&t.files&&t.files[0]){impLerArquivo(t.files[0]);return}if(t&&t.id==='per-cmp'){S.per.cmp=t.value;if(t.value==='custom'){const r={de:addDays(S.per.de,-perDays()),ate:addDays(S.per.de,-1)};S.per.cde=r.de;S.per.cate=r.ate}render();return}if(t&&(t.id==='per-cde'||t.id==='per-cate')&&t.value){S.per[t.id==='per-cde'?'cde':'cate']=t.value;if(S.per.cde>S.per.cate){const x=S.per.cde;S.per.cde=S.per.cate;S.per.cate=x}render();return}if(t&&(t.id==='per-de'||t.id==='per-ate')&&t.value){S.per.preset='custom';S.per[t.id==='per-de'?'de':'ate']=t.value;if(S.per.de>S.per.ate){const x=S.per.de;S.per.de=S.per.ate;S.per.ate=x}render();return}if(t&&t.id==='nt-tipo'){const keep={ti:$('#nt-titulo').value,da:$('#nt-data').value};S.novoTipo=t.value;S.drawer.id=keep.da;renderDrawer();$('#nt-titulo').value=keep.ti;$('#nt-tipo').focus()}});
document.addEventListener('input',e=>{if(e.target&&e.target.classList.contains('acq')){const sb=e.target.dataset.sub;S.aq[sb]=e.target.value;const pos=e.target.selectionStart;render();const x=document.getElementById('acq-'+sb);if(x){x.focus();try{x.setSelectionRange(pos,pos)}catch(_){}}return}if(e.target&&e.target.id==='rel-q'){S.relQ=e.target.value;const pos=e.target.selectionStart;render();const x=$('#rel-q');if(x){x.focus();try{x.setSelectionRange(pos,pos)}catch(_){}}return}const t=e.target;if(t.classList&&t.classList.contains('pe')&&t.dataset.orig!==undefined)t.classList.toggle('chgd',t.value!==t.dataset.orig)});
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.pop){S.pop=null;renderPop();return}if(e.key==='Enter'&&e.target&&e.target.dataset&&e.target.dataset.act==='pop'){e.preventDefault();e.target.click();return}if(e.key==='Escape'&&S.drawer){S.needExt=null;S.marcosEd=null;closeDrawer()}if(e.key==='Enter'&&!e.shiftKey&&e.target&&e.target.id==='cm'){e.preventDefault();const b=document.querySelector('[data-act="enviar-msg"]');if(b)b.click()}});

{const tk=new URLSearchParams(location.search).get('t');
 if(tk&&(location.pathname==='/criar-senha'||location.pathname==='/nova-senha'))telaSenha(tk,location.pathname);
 else iniciar();}
})();
