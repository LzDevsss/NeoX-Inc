/* NeoX Studio — interface, conteúdo e estatísticas */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch (e) { /* ok */ }

  /* ---------------- Utilidades ---------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {}, addListener() {} });
  const mqReduce = mq('(prefers-reduced-motion: reduce)');
  const mqFine = mq('(hover:hover) and (pointer:fine)');
  /* "reduced" agora só desliga os movimentos GRANDES (parallax, tilt, ímã).
     O resto do site continua animando, em modo suave. */
  const reduced = () => mqReduce.matches;
  const onMQ = (m, fn) => { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); };
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const store = {
    get(key, fallback = null) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado */ } }
  };
  const debounce = (fn, wait = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  /* Só abre links para estes sites (ou o próprio). Qualquer outro vira '#'. */
  const LINK_HOSTS = new Set(['www.roblox.com', 'roblox.com', 'discord.gg', 'x.com']);
  const safeHttps = (u) => {
    try { const x = new URL(u, location.href); return x.protocol === 'https:' && (x.origin === location.origin || LINK_HOSTS.has(x.hostname)) ? x.href : '#'; }
    catch (e) { return '#'; }
  };
  const cleanLine = (s, max) => cleanText(String(s || '').replace(/[\r\n\u2028\u2029]+/g, ' '), max);
  const cleanText = (s, max) => String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

  /* posição do mouse compartilhada pelos efeitos */
  const ptr = { x: window.innerWidth / 2, y: window.innerHeight / 3, nx: 0, ny: 0 };
  document.addEventListener('pointermove', (e) => {
    ptr.x = e.clientX; ptr.y = e.clientY;
    ptr.nx = e.clientX / window.innerWidth - 0.5;
    ptr.ny = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* ---------------- Títulos: palavras que sobem uma a uma ---------------- */
  const SPLIT_SEL = '.hero h1 > span:not(.grad), .about-copy .section-title > span, .contact-head .section-title > span, .community .section-title > span';
  function splitWords(el) {
    if (!el || el.querySelector('.w')) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    const words = text.split(/\s+/).filter(Boolean);
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'wi';
      inner.style.setProperty('--wd', String(i));
      inner.textContent = word;
      w.appendChild(inner);
      el.appendChild(w);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function splitAll() { $$(SPLIT_SEL).forEach(splitWords); }

  /* ---------------- Equipe: dados e textos dos perfis ---------------- */
  const DEVS = Object.freeze([
    {
      slug: 'sasadev', name: 'SasaDev', initials: 'SD', img: 'assets/sasa.png', role: 'role_owner',
      roblox: 'https://www.roblox.com/users/5790284269/profile',
      pt: {
        tag: 'Dono da NeoX.',
        bio: 'Lidera o grupo Neo X Inc e acompanha as decisões dos projetos junto com a equipe.',
        duties: ['Direção do estúdio', 'Decisões dos projetos', 'Gestão da equipe']
      },
      en: {
        tag: 'Owner of NeoX.',
        bio: 'Leads the Neo X Inc group and works with the team on project decisions.',
        duties: ['Studio direction', 'Project decisions', 'Team management']
      }
    },
    {
      slug: 'davidev', name: 'DaviDev', initials: 'DD', img: 'assets/davi.png', role: 'role_coowner_gd',
      roblox: 'https://www.roblox.com/users/1213557895/profile',
      pt: {
        tag: 'Co-dono e game designer.',
        bio: 'Divide a gestão da NeoX e trabalha nas mecânicas e na progressão dos jogos.',
        duties: ['Gestão do estúdio', 'Mecânicas e sistemas', 'Progressão e balanceamento']
      },
      en: {
        tag: 'Co-owner and game designer.',
        bio: 'Shares the management of NeoX and works on game mechanics and progression.',
        duties: ['Studio management', 'Mechanics and systems', 'Progression and balancing']
      }
    },
    {
      slug: 'osein', name: 'oSein', initials: 'OS', img: 'assets/osein.png', role: 'role_gd',
      roblox: 'https://www.roblox.com/users/4565735367/profile',
      pt: {
        tag: 'Game designer.',
        bio: 'Trabalha nas mecânicas, missões e recompensas, além dos testes e ajustes dos jogos.',
        duties: ['Mecânicas e sistemas', 'Missões e recompensas', 'Testes e ajustes']
      },
      en: {
        tag: 'Game designer.',
        bio: 'Game designer on the team. Works on mechanics, missions and rewards.',
        duties: ['Mechanics and systems', 'Missions and rewards', 'Testing and tuning']
      }
    },
    {
      slug: 'slow', name: 'Slow', initials: 'SL', img: 'assets/slow.png', role: 'role_animator',
      roblox: 'https://www.roblox.com/users/2620031389/profile',
      pt: {
        tag: 'Animador.',
        bio: 'Dá movimento aos personagens, das animações de combate às cenas dos jogos.',
        duties: ['Animações de combate', 'Movimentação', 'Cutscenes']
      },
      en: {
        tag: 'Animator.',
        bio: 'Makes character, attack and movement animations.',
        duties: ['Combat animations', 'Movement', 'Cutscenes']
      }
    },
    {
      slug: 'flex', name: 'Flex', initials: 'FX', img: 'assets/flex.png', role: 'role_modeler',
      roblox: 'https://www.roblox.com/users/2362898887/profile',
      pt: {
        tag: 'Modelador 3D.',
        bio: 'Cria personagens, itens e cenários em 3D e prepara os modelos para o Roblox.',
        duties: ['Personagens e itens', 'Cenários', 'Otimização para o Roblox']
      },
      en: {
        tag: '3D modeler.',
        bio: 'Makes the 3D models for characters, items and environments.',
        duties: ['Characters and items', 'Environments', 'Optimization for Roblox']
      }
    },
    {
      slug: 'ogust', name: 'Ogust', initials: 'OG', img: 'assets/oguest.png', role: 'role_vfx',
      roblox: 'https://www.roblox.com/users/8093384811/profile',
      pt: {
        tag: 'Efeitos visuais.',
        bio: 'Cria os efeitos de habilidades e golpes, cuidando também das partículas e do desempenho.',
        duties: ['Efeitos de habilidades', 'Partículas', 'Desempenho dos efeitos']
      },
      en: {
        tag: 'Efeitos visuais.',
        bio: 'Makes the visual effects for abilities and attacks.',
        duties: ['Ability effects', 'Particles', 'Effect performance']
      }
    },
    {
      slug: 'reject', name: 'Reject', initials: 'RJ', img: 'assets/reject.png', role: 'role_ui',
      roblox: 'https://www.roblox.com/pt/users/1569820932/profile',
      pt: {
        tag: 'Interfaces e experiência de uso.',
        bio: 'Desenha as telas, os menus e o HUD para deixar as informações do jogo claras.',
        duties: ['Menus e interfaces', 'HUD', 'Usabilidade']
      },
      en: {
        tag: 'Interfaces e experiência de uso.',
        bio: 'Designs the menus, HUD and screens of the games.',
        duties: ['Menus and interfaces', 'HUD', 'Usability']
      }
    },
    {
      slug: 'moon', name: 'Moon', initials: 'MN', img: 'assets/moon.png', role: 'role_cm',
      roblox: 'https://www.roblox.com/users/1587723048/profile',
      pt: {
        tag: 'Comunidade.',
        bio: 'Acompanha o Discord e o grupo do Roblox, com moderação, avisos e feedback dos jogadores.',
        duties: ['Moderação', 'Avisos de atualizações', 'Feedback e dúvidas dos jogadores']
      },
      en: {
        tag: 'Comunidade.',
        bio: 'Looks after the community on Discord and in the Roblox group.',
        duties: ['Moderation', 'Update announcements', 'Player feedback and questions']
      }
    }
  ]);

  /* ---------------- Traduções ---------------- */
  const i18n = {
    pt: {
      form_continue: "Abrindo a página de confirmação…",
      stats_stale: "Não foi possível atualizar. Exibindo os últimos números recebidos.",
      skip: 'Pular para o conteúdo', loading: 'Carregando…',
      tech_anim: 'Animação', tech_vfx: 'VFX', meta_desc: "Conheça os jogos da NeoX Studio no Roblox: Anime Paradise, Anime Crash e FREE FIRE MAX.", logo_alt: 'Logo da NeoX Studio', brand_aria: 'NeoX Studio — início', nav_main: 'Principal', nav_mobile: 'Menu mobile', footer_nav: 'Links do rodapé', dev_pager: 'Navegar entre perfis', v_ac_1: 'Anime Crash — combate e movimentação', v_ap_1: 'Anime Paradise — cinemática e interface', v_ap_2: 'Anime Paradise — movimentação', alt_ac_2: 'Missões e recompensas de Anime Crash', alt_ac_3: 'Árvore de habilidades de Anime Crash', alt_ap_models: 'Modelos de Anime Paradise', team_role: 'carrossel', nav_home: "Início", nav_about: 'Sobre', nav_games: 'Jogos', nav_media: "Vídeos", nav_team: 'Equipe', nav_contact: 'Contato',
      hero_tag: "NeoX Studio · Roblox",
      hero_title_1: 'Fazemos jogos', hero_title_2: 'no Roblox.',
      rot_pre: 'Jogos cheios de', rot_words: ['anime', 'ação', 'aventura', 'sobrevivência', 'diversão'],
      hero_desc: "Entre no Anime Paradise, conheça o FREE FIRE MAX e acompanhe o que vem por aí no Anime Crash.",
      btn_explore: "Escolher um jogo",
      stat_1: 'Jogando agora', stat_2: 'Curtidas', stat_3: 'Favoritos', stat_4: 'Visitas',
      stats_region: 'Estatísticas NeoX Studio',
      about_tag: "O estúdio", about_title: "Por trás dos jogos",
      about_desc: "Somos a equipe por trás de Anime Paradise e Anime Crash, no Roblox. O SasaDev lidera o estúdio, que reúne gente de game design, arte, animação e comunidade.",
      feat_1_title: "Mundos de anime", feat_1_desc: "Explore, enfrente inimigos e monte seu time no Anime Paradise.",
      feat_2_title: "Onde você joga", feat_2_desc: "O Anime Paradise está no computador, celular, tablet e console.",
      feat_3_title: 'Anime Crash', feat_3_desc: "Ainda está em desenvolvimento. Acompanhe as novidades no Discord.",
      about_box_title: "Cada um com sua parte",
      about_box_desc: "Dos menus aos efeitos das habilidades, tem uma equipe cuidando de cada detalhe. Conheça as pessoas e o trabalho de cada uma nos perfis abaixo.",
      tech_ui: 'UI/UX', tech_model: 'Modelagem 3D',
      community_tag: "Comunidade", community_title: "Entre na conversa",
      group_title: 'Grupo Neo X Inc', group_desc: "Acompanhe os jogos pelo nosso grupo no Roblox.",
      dc_title: "Discord da comunidade", dc_desc: "Converse com a comunidade e acompanhe as novidades.",
      games_tag: 'Jogos', games_title: 'Nossos jogos',
      games_subtitle: "Escolha um jogo e entre pelo Roblox.",
      playing_now: 'jogando agora', visits: 'visitas', soon: 'Em breve', soon_note: "Acompanhe as novidades no Discord.",
      game_1_desc: "Explore mundos de anime, junte moedas nas batalhas e monte seu time de campeões.",
      game_2_desc: "Um simulador de cliques inspirado em anime. Ainda em desenvolvimento.",
      game_3_desc: "Suba nos ranks, complete missões e pegue as recompensas diárias. Também tem paraquedas, loot boxes e avatares para colecionar.",
      btn_play: "Jogar no Roblox", btn_preview: "Ver no Roblox", game_discord: "Discord do jogo", discord_soon: "Discord em breve",
      media_tag: 'Vídeos e imagens', media_title: "Veja os jogos em ação",
      media_subtitle: "Um pouco do combate, da movimentação e do visual dos nossos jogos.",
      ac_1_title: "Combate e movimentação", ac_2_title: "Missões e recompensas", ac_3_title: "Árvore de habilidades",
      media_cutscene_ui: "Cenas e interface", media_movement: 'Movimentação', media_models: 'Modelos', media_soon: 'Mídia em breve',
      media_error: 'Vídeo indisponível. Toque para tentar de novo.',
      team_tag: 'Equipe', team_title: "Quem faz a NeoX",
      team_subtitle: "Conheça a equipe e o que cada pessoa faz nos jogos.",
      role_owner: "Dono do estúdio", role_coowner_gd: "Co-dono · Game design", role_gd: "Game design", role_animator: "Animação",
      role_modeler: "Modelagem 3D", role_vfx: "Efeitos visuais", role_ui: "Interfaces · UI/UX", role_cm: "Comunidade",
      profile: "Perfil no Roblox", dev_more: 'Ver perfil',
      team_prev: 'Desenvolvedor anterior', team_next: 'Próximo desenvolvedor', team_region: 'Equipe NeoX', team_dots: 'Escolher desenvolvedor',
      team_status: (i, total, name) => `${i} / ${total} · ${name}`,
      dev_back: 'Toda a equipe', dev_tag: 'Perfil da equipe', dev_duties: "Na equipe", dev_team: 'A equipe',
      dev_prev: 'Anterior', dev_next: 'Próximo', dev_profile_of: (n) => `Perfil de ${n}`,
      contact_tag: 'Contato', contact_title: "Vamos conversar",
      contact_subtitle: "Quer falar sobre os jogos ou trocar uma ideia com a equipe? Mande uma mensagem ou chame no Discord.",
      form_name: 'Seu nome', form_email: 'Seu e-mail', form_roblox: 'Seu nick no Roblox (opcional)',
      form_msg: "Mensagem (mínimo de 16 caracteres)", form_btn: "Continuar para enviar", form_note: "Você vai confirmar o envio no FormSubmit, que recebe os dados deste formulário. Se preferir, fale com a gente no Discord.",
      official_discord: 'Nosso Discord',
      footer: '© 2026 NeoX Studio. Todos os direitos reservados.',
      stats_loading: "Carregando os números do Roblox…", stats_unavailable: "Os números do Roblox estão indisponíveis agora.",
      stats_prefix: 'Números atualizados às', src_live: 'ao vivo', src_cache: 'último valor salvo',
      form_off: "O formulário está indisponível agora. Fale com a gente pelo Discord.",
      msg_short: "Escreva pelo menos 16 caracteres.",
      email_bad: 'Digite um e-mail válido.', name_short: "Digite um nome com pelo menos 2 caracteres.",
      ph_name: 'Seu nome', ph_email: 'voce@email.com', ph_roblox: 'Seu usuário no Roblox', ph_msg: "Escreva sua mensagem aqui…",
      aria_menu_open: 'Abrir menu', aria_menu_close: 'Fechar menu', to_top: 'Voltar ao topo', scroll_hint: 'Ir para a seção Sobre',
      going_to: (name) => (name ? `Indo para ${name}…` : 'Indo…'), back_to_top: 'Voltando ao topo…',
      gp_more: "Ver detalhes do jogo", gp_back: 'Todos os jogos', gp_live: 'Ao vivo', gp_tag: 'Perfil do jogo', gp_by: 'por',
      gp_play: 'Jogar no Roblox', gp_playing: 'Jogando agora', gp_peak: 'Pico desta visita', gp_visits: 'Visitas totais',
      gp_likes: 'Curtidas', gp_favs: 'Favoritos', gp_approval: 'Aprovação',
      gp_images: 'Imagens do jogo', gp_details: 'Detalhes', gp_genre: 'Gênero', gp_max: 'Jogadores por servidor', gp_upd: 'Última atualização',
      gp_wait: "O gráfico aparece depois das primeiras atualizações.", gp_tick: "Atualização a cada 10 segundos",
      title: 'NeoX Studio | Jogos no Roblox',
      fs_tag: 'Em destaque', footer_disc: 'Estúdio independente. Sem afiliação com a Roblox Corporation.'
    },
    en: {
      form_continue: "Opening the confirmation page…",
      stats_stale: "Could not update. Showing the last numbers received.",
      skip: 'Skip to content', loading: 'Loading…',
      tech_anim: 'Animation', tech_vfx: 'VFX', meta_desc: "Explore NeoX Studio games on Roblox: Anime Paradise, Anime Crash and FREE FIRE MAX.", logo_alt: 'NeoX Studio logo', brand_aria: 'NeoX Studio — home', nav_main: 'Main', nav_mobile: 'Mobile menu', footer_nav: 'Footer links', dev_pager: 'Browse profiles', v_ac_1: 'Anime Crash — combat and movement', v_ap_1: 'Anime Paradise — cutscene and interface', v_ap_2: 'Anime Paradise — movement', alt_ac_2: 'Anime Crash missions and rewards', alt_ac_3: 'Anime Crash skill tree', alt_ap_models: 'Anime Paradise models', team_role: 'carousel', nav_home: 'Home', nav_about: 'About', nav_games: 'Games', nav_media: "Videos", nav_team: 'Team', nav_contact: 'Contact',
      hero_tag: "NeoX Studio · Roblox",
      hero_title_1: 'We make games', hero_title_2: 'on Roblox.',
      rot_pre: 'Games full of', rot_words: ['anime', 'action', 'adventure', 'survival', 'fun'],
      hero_desc: "Jump into Anime Paradise, try FREE FIRE MAX and follow what is coming next for Anime Crash.",
      btn_explore: "Find a game",
      stat_1: 'Playing now', stat_2: 'Likes', stat_3: 'Favorites', stat_4: 'Visits',
      stats_region: 'NeoX Studio statistics',
      about_tag: "The studio", about_title: "Behind the games",
      about_desc: "We are the team behind Anime Paradise and Anime Crash on Roblox. Led by SasaDev, the studio brings together game design, art, animation and community.",
      feat_1_title: "Anime worlds", feat_1_desc: "Explore, battle enemies and build your team in Anime Paradise.",
      feat_2_title: "Where you play", feat_2_desc: "Play Anime Paradise on PC, phone, tablet or console.",
      feat_3_title: 'Anime Crash', feat_3_desc: "Still in development. Follow the updates on Discord.",
      about_box_title: "Everyone has a part",
      about_box_desc: "From menus to ability effects, there is a team working on each detail. Meet the people and see their work in the profiles below.",
      tech_ui: 'UI/UX', tech_model: '3D modeling',
      community_tag: 'Community', community_title: "Join the conversation",
      group_title: 'Neo X Inc Group', group_desc: "Follow the games through our Roblox group.",
      dc_title: 'Community Discord', dc_desc: "Chat with the community and keep up with the news.",
      games_tag: 'Games', games_title: 'Our games',
      games_subtitle: "Pick a game and jump in on Roblox.",
      playing_now: 'playing', visits: 'visits', soon: 'Coming soon', soon_note: "Follow the updates on Discord.",
      game_1_desc: "Explore anime worlds, earn coins in battle and build your team of champions.",
      game_2_desc: "An anime clicker simulator, still in development.",
      game_3_desc: "Climb the ranks, complete missions and collect daily rewards, parachutes, loot boxes and avatars.",
      btn_play: "Play on Roblox", btn_preview: "View on Roblox", game_discord: 'Game Discord', discord_soon: "Discord coming soon",
      media_tag: 'Videos and images', media_title: "See the games in action",
      media_subtitle: "A look at the combat, movement and art in our games.",
      ac_1_title: "Combat and movement", ac_2_title: "Missions and rewards", ac_3_title: "Skill tree",
      media_cutscene_ui: "Cutscenes and UI", media_movement: 'Movement', media_models: 'Models', media_soon: 'Media coming soon',
      media_error: 'Video unavailable. Tap to try again.',
      team_tag: 'Team', team_title: "Meet NeoX",
      team_subtitle: "Meet the team and see what each person works on.",
      role_owner: 'Owner', role_coowner_gd: "Co-owner · Game design", role_gd: "Game design", role_animator: "Animation",
      role_modeler: "3D modeling", role_vfx: "Visual effects", role_ui: "UI/UX design", role_cm: "Community",
      profile: 'Roblox Profile', dev_more: 'View profile',
      team_prev: 'Previous developer', team_next: 'Next developer', team_region: 'NeoX Team', team_dots: 'Choose developer',
      team_status: (i, total, name) => `${i} / ${total} · ${name}`,
      dev_back: 'Whole team', dev_tag: 'Team profile', dev_duties: "On the team", dev_team: 'The team',
      dev_prev: 'Previous', dev_next: 'Next', dev_profile_of: (n) => `${n}'s profile`,
      contact_tag: 'Contact', contact_title: "Let’s talk",
      contact_subtitle: "Want to talk about the games or reach the team? Send a message or find us on Discord.",
      form_name: 'Your name', form_email: 'Your email', form_roblox: 'Roblox username (optional)',
      form_msg: 'Your message (at least 16 characters)', form_btn: "Continue to send", form_note: "You will confirm your submission on FormSubmit, which receives the information in this form. You can also reach us on Discord.",
      official_discord: 'Our Discord',
      footer: '© 2026 NeoX Studio. All rights reserved.',
      stats_loading: 'Fetching Roblox numbers…', stats_unavailable: 'Could not fetch the numbers right now.',
      stats_prefix: 'Numbers updated at', src_live: 'live', src_cache: 'last saved value',
      form_off: 'The form is down for now. Reach us on Discord.',
      msg_short: 'Please write a bit more (at least 16 characters).',
      email_bad: 'Enter a valid email.', name_short: "Enter a name with at least 2 characters.",
      ph_name: 'Your name', ph_email: 'you@email.com', ph_roblox: 'Your Roblox username', ph_msg: "Write your message here…",
      aria_menu_open: 'Open menu', aria_menu_close: 'Close menu', to_top: 'Back to top', scroll_hint: 'Go to the About section',
      going_to: (name) => (name ? `Heading to ${name}…` : 'On the way…'), back_to_top: 'Back to top…',
      gp_more: "View game details", gp_back: 'All games', gp_live: 'Live', gp_tag: 'Game profile', gp_by: 'by',
      gp_play: 'Play on Roblox', gp_playing: 'Playing now', gp_peak: 'Peak this visit', gp_visits: 'Total visits',
      gp_likes: 'Likes', gp_favs: 'Favorites', gp_approval: 'Approval',
      gp_images: 'Game images', gp_details: 'Details', gp_genre: 'Genre', gp_max: 'Players per server', gp_upd: 'Last update',
      gp_wait: "The chart appears after the first few updates.", gp_tick: "Updates every 10 seconds",
      title: 'NeoX Studio | Games on Roblox',
      fs_tag: 'Featured', footer_disc: 'Independent studio. Not affiliated with Roblox Corporation.'
    }
  };

  let lang = (() => {
    const saved = store.get('neox-lang');
    if (saved === 'pt' || saved === 'en') return saved;
    return (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  })();
  const dict = () => i18n[lang];
  const locale = () => (lang === 'pt' ? 'pt-BR' : 'en-US');

  /* ---------------- Estado compartilhado ---------------- */
  let view = null;
  let gameKey = null;
  let devIndex = -1;
  let savedScroll = 0;
  let navRaf = null;
  let navLockId = null;
  let updateTeamStatus = () => {};
  let rotTimer = null;
  let rotIdx = 0;

  const GAMES = {
    ap: { universe: '10079271418', soon: false },
    cr: { universe: '7660190629', soon: true },
    ff: { universe: '7139435866', soon: false }
  };
  const GAME_PAGES = Object.freeze({
    ap: { slug: 'anime-paradise', name: 'Anime Paradise', img: 'assets/anime-paradise.png', pos: '50% 50%', desc: 'game_1_desc', play: 'https://www.roblox.com/pt/games/96665881849072/Anime-Paradise', dc: 'https://discord.gg/yACDzUah8Z' },
    ff: { slug: 'free-fire-max', name: 'FREE FIRE MAX', img: 'assets/free-fire-max.png', pos: '62% 50%', desc: 'game_3_desc', play: 'https://www.roblox.com/pt/games/93233198656969/FREE-FIRE-MAX', dc: '' }
  });
  const UNIVERSE_TO_KEY = Object.fromEntries(Object.entries(GAMES).map(([key, g]) => [g.universe, key]));
  const FIELDS = ['playing', 'visits', 'favorites', 'likes', 'dislikes'];
  const NEOX_CONFIG = window.NEOX_CONFIG || {};
  const FORM_ENDPOINT = /^https:\/\/formsubmit\.co\/[a-f0-9]{32}$/.test(NEOX_CONFIG.formEndpoint || '') ? NEOX_CONFIG.formEndpoint : '';
  const LIVE_STATS_ENDPOINT = /^https:\/\//.test(NEOX_CONFIG.liveStatsEndpoint || '') ? NEOX_CONFIG.liveStatsEndpoint : '';

  const stats = {
    games: Object.fromEntries(Object.keys(GAMES).map((k) => [k, {}])),
    meta: {}, updatedAt: 0, source: null, loaded: false, failed: false
  };
  // Atenção: NÃO chamar de "history" (isso escondia o window.history e quebrava a troca de endereço).
  const liveHistory = { ap: [], cr: [], ff: [] };
  let lastLiveAt = 0;

  /* ---------------- Números ---------------- */
  const nfCache = {};
  const nf = (k, o) => nfCache[locale() + k] || (nfCache[locale() + k] = new Intl.NumberFormat(locale(), o));
  const fmtFull = (v) => nf('f').format(Math.round(v));
  const fmtCompact = (v) => (v < 1e6 ? fmtFull(v) : nf('c', { notation: 'compact', maximumFractionDigits: 1 }).format(v));

  function setValue(el, value, compact = false) {
    if (!el) return;
    value = num(value);
    el.classList.remove('is-loading');
    if (value === null) { el.textContent = '—'; el.dataset.value = ''; el.removeAttribute('title'); return; }
    const to = Math.round(value);
    const previous = el.dataset.value ? num(el.dataset.value) : null;
    el.dataset.value = String(to);
    el.title = fmtFull(to);
    const format = (v) => (compact ? fmtCompact(v) : fmtFull(v));

    if (previous !== null && previous !== to) {
      el.classList.remove('is-bumped');
      void el.offsetWidth;
      el.classList.add('is-bumped');
      setTimeout(() => el.classList.remove('is-bumped'), 900);
    }
    cancelAnimationFrame(el._raf);
    if (previous === to) { el.textContent = format(to); return; }
    const from = previous ?? 0;
    const started = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - started) / 1400);
      el.textContent = format(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(tick);
      else el.textContent = format(to);
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------------- Formulário (referências usadas também pelo idioma) ---------------- */
  const contactForm = $('#contact-form');
  const formBtn = $('#form-btn');
  const formStatus = $('#form-status');

  function setFormDisabled() {
    if (!contactForm) return;
    if (formBtn) formBtn.disabled = true;
    if (formStatus) {
      formStatus.dataset.state = 'off';
      formStatus.classList.remove('is-error', 'is-ok');
      formStatus.textContent = dict().form_off;
    }
    const note = $('#form-note');
    if (note) note.hidden = true;
  }

  /* ---------------- Frase que troca de palavra no hero ---------------- */
  function startRot() {
    const el = $('#rot-word');
    if (!el) return;
    clearInterval(rotTimer);
    const words = dict().rot_words;
    rotIdx = 0;
    el.textContent = words[0];
    el.classList.remove('rot-in');
    rotTimer = setInterval(() => {
      if (document.hidden) return;
      rotIdx = (rotIdx + 1) % words.length;
      el.classList.remove('rot-in');
      void el.offsetWidth;
      el.textContent = words[rotIdx];
      el.classList.add('rot-in');
    }, 2400);
  }

  /* ---------------- Idioma ---------------- */
  function applyLanguage(next, persist = true) {
    lang = next;
    const t = dict();
    root.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = t.title;
    $$('[data-i18n]').forEach((el) => { const v = t[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-aria]').forEach((el) => { const v = t[el.dataset.i18nAria]; if (typeof v === 'string') el.setAttribute('aria-label', v); });
    $$('[data-i18n-title]').forEach((el) => { const v = t[el.dataset.i18nTitle]; if (typeof v === 'string') el.setAttribute('title', v); });
    $$('[data-i18n-alt]').forEach((el) => { const v = t[el.dataset.i18nAlt]; if (typeof v === 'string') el.setAttribute('alt', v); });
    const md = $('meta[name="description"]'); if (md && t.meta_desc) md.setAttribute('content', t.meta_desc);
    $$('[data-i18n-placeholder]').forEach((el) => { const v = t[el.dataset.i18nPlaceholder]; if (typeof v === 'string') el.setAttribute('placeholder', v); });
    const label = $('#lang-label');
    if (label) label.textContent = lang === 'pt' ? 'PT-BR' : 'EN';

    splitAll();
    startRot();
    updateMenuLabel();
    if (stats.loaded) renderStats();
    renderStatsNote();
    updateTeamStatus();
    $$('.team-card').forEach((card) => {
      const d = DEVS.find((x) => x.slug === card.dataset.dev);
      if (d) {
        const a = $('.team-avatar', card);
        if (a) a.setAttribute('aria-label', t.dev_profile_of(d.name));
      }
    });
    if (!FORM_ENDPOINT) setFormDisabled();
    ['#f-msg', '#f-email', '#f-name'].forEach((id) => { const f = $(id); if (f) f.setCustomValidity(''); });
    if (formStatus) {
      if (formStatus.dataset.state === 'confirm') formStatus.textContent = t.form_continue;
    }
    if (view && view.type === 'game') { fillGamePage(); renderGamePage(); }
    if (view && view.type === 'dev') fillDevPage();
    if (persist) store.set('neox-lang', lang);
  }

  /* ---------------- Menu mobile ---------------- */
  const menuBtn = $('#menu-btn');
  const menuIconUse = $('#menu-icon use');
  const mobileMenu = $('#mobile-menu');
  const siteHeader = $('#site-header');

  function updateMenuLabel() {
    if (!menuBtn) return;
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-label', open ? dict().aria_menu_close : dict().aria_menu_open);
  }
  function setMenu(open, focusFirst = false) {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    mobileMenu.inert = !open;
    if (menuIconUse) menuIconUse.setAttribute('href', open ? '#i-close' : '#i-menu');
    if (open && siteHeader) siteHeader.classList.remove('is-hidden');
    updateMenuLabel();
    if (open && focusFirst) { const first = $('a', mobileMenu); if (first) first.focus({ preventScroll: true }); }
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    onMQ(mq('(min-width: 900px)'), (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------------- Segurança: links externos sempre com noopener ---------------- */
  $$('a[href^="http"]').forEach((a) => { if (safeHttps(a.href) === '#') { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); } });
  $$('a[target="_blank"]').forEach((a) => {
    const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener'); rel.add('noreferrer');
    a.setAttribute('rel', Array.from(rel).join(' '));
  });

  /* ---------------- Scroll: progresso, header, link ativo, parallax, pílula do menu ---------------- */
  (() => {
    const bar = $('#scroll-progress');
    const toTopBtn = $('#to-top');
    const links = $$('.nav-link');
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const heroInner = $('#home .hero-inner');
    const heroArt = $$('.hero-art img');
    const nav = $('.main-nav');
    const pill = $('.nav-pill');
    let ticking = false, lastY = window.scrollY, parallaxOn = false, lastProgress = -1, lastCurrent = null;
    let activeLink = null, pillReady = false;
    let tops = [], dirty = true;
    const measure = () => { tops = sections.map((x) => x.getBoundingClientRect().top + window.scrollY); dirty = false; };
    const markDirty = () => { dirty = true; };
    window.addEventListener('resize', markDirty, { passive: true });
    window.addEventListener('load', markDirty);
    if ('ResizeObserver' in window && $('#main')) new ResizeObserver(markDirty).observe($('#main'));

    function placePill(link) {
      if (!pill || !nav) return;
      if (!link || !nav.offsetWidth) { pill.style.opacity = '0'; return; }
      if (!pillReady) pill.style.transition = 'none';
      pill.style.opacity = '1';
      pill.style.width = (link.offsetWidth + 26) + 'px';
      pill.style.transform = `translate3d(${link.offsetLeft - 13}px,-50%,0)`;
      if (!pillReady) { void pill.offsetWidth; pill.style.transition = ''; pillReady = true; }
    }
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => placePill(a));
      a.addEventListener('pointerleave', () => placePill(activeLink));
      a.addEventListener('focus', () => placePill(a));
      a.addEventListener('blur', () => placePill(activeLink));
    });
    window.addEventListener('resize', debounce(() => placePill(activeLink), 120), { passive: true });
    window.addEventListener('load', () => placePill(activeLink));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placePill(activeLink));

    function update() {
      ticking = false;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, y / max) : 0;
      if (bar && Math.abs(progress - lastProgress) > 0.0005) { bar.style.transform = `scaleX(${progress})`; lastProgress = progress; }
      if (toTopBtn) {
        const show = y > 560;
        toTopBtn.classList.toggle('is-visible', show);
        toTopBtn.tabIndex = show ? 0 : -1;
        toTopBtn.setAttribute('aria-hidden', String(!show));
      }
      if (siteHeader) {
        siteHeader.classList.toggle('is-scrolled', y > 12);
        if (!reduced()) {
          const menuOpen = mobileMenu && mobileMenu.classList.contains('is-open');
          const navigating = root.classList.contains('is-navigating');
          if (!navigating && !menuOpen && y > 240 && y > lastY + 6) siteHeader.classList.add('is-hidden');
          else if (y < lastY - 6 || y < 120) siteHeader.classList.remove('is-hidden');
        } else siteHeader.classList.remove('is-hidden');
      }
      lastY = y;
      root.classList.toggle('hero-off', !!view || y > window.innerHeight * 1.2);

      if (heroInner) {
        if (!view && !reduced() && window.innerWidth >= 768 && y < window.innerHeight * 1.15) {
          heroInner.style.transform = `translate3d(0,${(y * 0.1).toFixed(1)}px,0)`;
          heroInner.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.9)).toFixed(3);
          parallaxOn = true;
        } else if (parallaxOn || view) {
          heroInner.style.transform = '';
          heroInner.style.opacity = '';
          parallaxOn = false;
        }
      }

      /* Parallax das capas no hero */
      if (heroArt.length) {
        if (!view && !reduced() && y < window.innerHeight * 1.3) {
          heroArt.forEach((im, i) => { im.style.translate = `0 ${(y * (0.18 + i * 0.07)).toFixed(1)}px`; });
        } else if (view || reduced()) {
          heroArt.forEach((im) => { im.style.translate = ''; });
        }
      }

      let current = sections[0] ? sections[0].id : '';
      if (view) current = view.type === 'game' ? 'games' : 'team';
      else if (navLockId && root.classList.contains('is-navigating')) current = navLockId;
      else {
        if (dirty) measure();
        if (y > 10) { const line = y + window.innerHeight * 0.35; for (let i = 0; i < sections.length; i++) if (tops[i] <= line) current = sections[i].id; }
        if (max > 0 && window.innerHeight + y >= root.scrollHeight - 4 && sections.length) current = sections[sections.length - 1].id;
      }
      if (current !== lastCurrent) {
        lastCurrent = current;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current));
        activeLink = links.find((a) => a.getAttribute('href') === '#' + current) || null;
        placePill(activeLink);
      }
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('neox:view', onScroll);
    update();
  })();

  /* ---------------- Logo 3D no hero (só roda quando o mouse mexe) ---------------- */
  (() => {
    const logoWrap = $('.hero-logo-wrap');
    if (!logoWrap || !mqFine.matches) return;
    let raf = null, mx = 0, my = 0;
    const loop = () => {
      mx += (ptr.nx - mx) * 0.1;
      my += (ptr.ny - my) * 0.1;
      if (!reduced() && !view) {
        logoWrap.style.setProperty('--lx', (-my * 26).toFixed(2) + 'deg');
        logoWrap.style.setProperty('--ly', (mx * 32).toFixed(2) + 'deg');
      }
      raf = Math.abs(ptr.nx - mx) > 0.001 || Math.abs(ptr.ny - my) > 0.001 ? requestAnimationFrame(loop) : null;
    };
    document.addEventListener('pointermove', () => {
      if (document.hidden || view || window.scrollY > window.innerHeight) return;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  })();

  /* ---------------- Reveal ao rolar ---------------- */
  (() => {
    // Marca mais elementos para entrarem suavemente (além dos que já têm data-reveal/data-stagger).
    ['#main .section-head .eyebrow', '#main .about-copy > p', '#main .about-panel h3', '#main .about-panel p',
     '#main .contact-head p', '#main .team-controls', '#main .team-progress', '#main .team-status', '#main .form-note',
     '#main .game-sub', 'footer .footer-copy'].forEach((sel) => {
      $$(sel).forEach((el, i) => {
        if (el.closest('[data-reveal]') && !el.matches('.team-controls, .team-progress, .team-status')) return;
        if (el.closest('.team-wrap') && !el.matches('.team-controls, .team-progress, .team-status')) return;
        el.setAttribute('data-reveal', 'sm'); el.style.setProperty('--d', ((i % 4) * 90) + 'ms');
      });
    });
    ['.about-tags', '.contact-links', '.footer-links', '.hero-cta'].forEach((sel) => {
      $$(sel).forEach((el) => { if (!el.closest('.hero') && !el.hasAttribute('data-stagger')) { el.classList.add('stagger'); el.setAttribute('data-stagger', ''); } });
    });

    const targets = $$('[data-reveal], [data-stagger], .media-group, .feature-grid');
    const show = (el) => el.classList.add('is-in');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  })();

  /* ---------------- Seções ao vivo (pausa animações fora da tela) + ripple nos botões ---------------- */
  (() => {
    const secs = $$('.section');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '150px 0px' });
      secs.forEach((x) => io.observe(x));
    } else secs.forEach((x) => x.classList.add('is-live'));
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest && e.target.closest('.btn:not(:disabled)');
      if (!b) return;
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
      const sp = document.createElement('span');
      sp.className = 'ripple';
      sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(sp);
      setTimeout(() => sp.remove(), 900);
    }, { passive: true });
  })();

  /* ---------------- Imagens com fallback (vale também para clones) ---------------- */
  function showMediaPlaceholder(el, key = 'media_soon', retry = false) {
    if (!el || el.dataset.missing) return;
    el.dataset.missing = '1';
    const box = el.closest('.media-frame') || el.parentElement;
    if (!box) return;
    el.style.display = 'none';
    box.classList.remove('is-loading');
    if (box.querySelector('.media-placeholder')) return;
    const ph = document.createElement('div');
    ph.className = 'media-placeholder' + (retry ? ' is-retry' : '');
    if (retry) { ph.setAttribute('role', 'button'); ph.tabIndex = 0; }
    ph.dataset.i18n = key;
    ph.textContent = dict()[key];
    box.appendChild(ph);
  }
  function onImgError(img) {
    if (img.closest && img.closest('.gp-strip')) { img.remove(); const s = $('#gp-strip'); if (s && !s.children.length) { const c = $('#gp-media-card'); if (c) c.hidden = true; } return; }
    if (img.dataset.fallbacks) {
      img._queue = img._queue || img.dataset.fallbacks.split(',').map((s) => s.trim()).filter(Boolean);
      const next = img._queue.shift();
      if (next) { img.src = next; return; }
    }
    const avatar = img.closest('.team-avatar, .dp-portrait');
    if (avatar) { avatar.classList.add('is-missing'); return; }
    if (img.closest('.media-frame')) { showMediaPlaceholder(img); return; }
    img.classList.add('is-missing');
    img.style.visibility = 'hidden';
  }
  document.addEventListener('error', (e) => { if (e.target && e.target.tagName === 'IMG') onImgError(e.target); }, true);
  $$('img').forEach((img) => { if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) onImgError(img); });

  /* ---------------- Vídeos em loop ---------------- */
  function showVideoFallback(video) {
    if (!video || video.dataset.missing) return;
    clearTimeout(video._wd);
    const frame = video.closest('.media-frame');
    if (!frame) return;
    console.warn('[NeoX] Vídeo não carregou (arquivo ausente, nome diferente, codec não suportado, link expirado ou muito pesado):', video.currentSrc || video.getAttribute('src') || (video.querySelector('source') || {}).src || '');
    try { video.pause(); } catch (e) { /* ok */ }
    const src = video.dataset.fallbackImg;
    if (src) {
      video.dataset.missing = '1';
      frame.classList.remove('is-loading');
      video.style.display = 'none';
      const img = document.createElement('img');
      img.className = 'media-fallback-img';
      img.alt = '';
      img.loading = 'lazy';
      if (video.dataset.fallbacks) img.dataset.fallbacks = video.dataset.fallbacks;
      img.src = src;
      frame.appendChild(img);
    } else showMediaPlaceholder(video, 'media_error', true);
  }
  function tryAltSource(video) {
    if (video.dataset.missing) return;
    if (!video._alt) video._alt = (video.dataset.alt || '').split(',').map((s) => s.trim()).filter(Boolean);
    const next = video._alt.shift();
    if (!next) { showVideoFallback(video); return; }
    $$('source', video).forEach((s) => s.remove());
    video.src = next;
    video.preload = 'auto';
    video.load();
  }
  (() => {
    const videos = $$('video.loop-video');
    if (!videos.length) return;
    if (navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || ''))) { videos.forEach(showVideoFallback); return; }

    const prep = (v) => {
      v.controls = false; v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
      v.disablePictureInPicture = true;
      v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    };
    const play = (v) => { if (v.dataset.missing) return; prep(v); const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const ready = (v) => { clearTimeout(v._wd); const f = v.closest('.media-frame'); if (f) f.classList.remove('is-loading'); v.classList.add('is-ready'); };
    const inView = (v) => { const r = v.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
    /* 45s de paciência: vídeos grandes (ex.: 24 MB) em conexão lenta não devem cair em "indisponível" cedo demais. */
    const arm = (v) => { clearTimeout(v._wd); v._wd = setTimeout(() => { if (!v.classList.contains('is-ready') && !v.dataset.missing) showVideoFallback(v); }, 45000); };
    const wake = (v) => {
      if (v._woke || v.dataset.missing) return;
      v._woke = true;
      v.preload = 'auto';
      if (v.networkState === 0 || v.networkState === 3) v.load();
      arm(v);
    };
    const bindSources = (v) => {
      const s = $$('source', v);
      const last = s[s.length - 1];
      if (last) last.addEventListener('error', () => tryAltSource(v));
    };

    videos.forEach((v) => {
      prep(v);
      v._srcNodes = $$('source', v).map((s) => s.cloneNode(true));
      bindSources(v);
      ['loadeddata', 'canplay'].forEach((ev) => v.addEventListener(ev, () => { ready(v); if (inView(v)) play(v); }, { passive: true }));
      v.addEventListener('playing', () => ready(v));
      v.addEventListener('error', () => tryAltSource(v));
      v.addEventListener('click', () => play(v));
      v._retry = () => {
        const frame = v.closest('.media-frame');
        if (!frame) return;
        $$('.media-placeholder, .media-fallback-img', frame).forEach((n) => n.remove());
        delete v.dataset.missing;
        v._alt = null; v._woke = false;
        v.style.display = '';
        v.classList.remove('is-ready');
        frame.classList.add('is-loading');
        v.removeAttribute('src');
        $$('source', v).forEach((s) => s.remove());
        v._srcNodes.forEach((n) => v.appendChild(n.cloneNode(true)));
        bindSources(v);
        v.load();
        wake(v);
      };
    });

    const retryFrom = (target) => {
      const ph = target.closest && target.closest('.media-placeholder.is-retry');
      if (!ph) return;
      const frame = ph.closest('.media-frame');
      const v = frame && $('video.loop-video', frame);
      if (v && v._retry) v._retry();
    };
    document.addEventListener('click', (e) => retryFrom(e.target));
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { retryFrom(e.target); } });

    if ('IntersectionObserver' in window) {
      const loader = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { wake(en.target); loader.unobserve(en.target); } });
      }, { rootMargin: window.innerWidth < 768 ? '160px 0px' : '700px 0px' });
      const player = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { wake(en.target); play(en.target); } else en.target.pause(); });
      }, { threshold: 0.22 });
      videos.forEach((v) => { loader.observe(v); player.observe(v); });
    } else videos.forEach(wake);
    const retry = () => { if (!document.hidden) videos.forEach((v) => { if (v.paused && inView(v) && !v.dataset.missing) { wake(v); play(v); } }); };
    ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, retry, { passive: true }));
    document.addEventListener('visibilitychange', retry);
  })();

  /* ---------------- Faixas infinitas (animação CSS, sem JS por quadro) ---------------- */
  const marquees = $$('.marquee');
  function fillMarquees() {
    marquees.forEach((m) => {
      const track = $('.marquee-track', m), group = track && $('.marquee-group', track);
      const w = group ? group.getBoundingClientRect().width : 0;
      if (!w) return;
      const need = Math.ceil((window.innerWidth + w) / w) + 1;
      while (track.children.length < need) { const c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
      track.style.setProperty('--mw', w + 'px');
      track.style.setProperty('--md', (w / 36).toFixed(1) + 's');
    });
  }
  fillMarquees();
  window.addEventListener('resize', debounce(fillMarquees, 150), { passive: true });
  window.addEventListener('load', fillMarquees);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fillMarquees);
  if ('IntersectionObserver' in window) {
    const mo = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-on', e.isIntersecting)));
    marquees.forEach((m) => mo.observe(m));
  } else marquees.forEach((m) => m.classList.add('is-on'));

  /* ---------------- Estatísticas Roblox ---------------- */
  const votesTimer = { at: 0 };
  const ALLORIGINS = 'https://api.allorigins.win/raw?url=';
  const JINA = 'https://r.jina.ai/';
  const POLL_MS = 20000, POLL_GAME_MS = 10000;
  let statsTimer = null, refreshing = false, liveFails = 0, lastSave = 0, votesBusy = false;

  async function fetchJSON(url, timeout = 9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function fetchJina(target, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(JINA + target, { signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'text/plain' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      const a = text.indexOf('{'), b = text.lastIndexOf('}');
      if (a < 0 || b <= a) throw new Error('resposta inesperada');
      return JSON.parse(text.slice(a, b + 1));
    } finally { clearTimeout(timer); }
  }
  const hasAnyData = (snap) => !!snap && !!snap.games && Object.values(snap.games).some((g) => g && FIELDS.some((f) => num(g[f]) !== null));

  function applySnapshot(snap, source, track = true) {
    if (!hasAnyData(snap)) return false;
    let merged = false;
    for (const key of Object.keys(GAMES)) {
      const incoming = snap.games[key];
      if (!incoming) continue;
      const target = stats.games[key] || (stats.games[key] = {});
      for (const f of FIELDS) { const v = num(incoming[f]); if (v !== null && v >= 0 && v <= 1e12) { target[f] = v; merged = true; } }
    }
    if (!merged) return false;
    if (snap.meta && typeof snap.meta === 'object') {
      for (const key of Object.keys(GAMES)) {
        const m = snap.meta[key];
        if (m && typeof m === 'object') stats.meta[key] = { genre: cleanText(m.genre, 40), maxPlayers: num(m.maxPlayers), updated: typeof m.updated === 'string' ? m.updated.slice(0, 40) : '' };
      }
    }
    const stamp = snap.updatedAt ? Date.parse(snap.updatedAt) : NaN;
    stats.updatedAt = Number.isFinite(stamp) && stamp > stats.updatedAt ? stamp : (stats.updatedAt || Date.now());
    stats.source = source;
    stats.loaded = true;
    stats.failed = false;
    if (Date.now() - lastSave > 20000) { lastSave = Date.now(); store.set('neox-stats-v4', { updatedAt: new Date(stats.updatedAt).toISOString(), games: stats.games }); }
    if (source === 'live' && track) {
      lastLiveAt = Date.now();
      for (const k of Object.keys(GAMES)) {
        const p = num((stats.games[k] || {}).playing);
        if (p !== null) { liveHistory[k].push({ v: p }); if (liveHistory[k].length > 90) liveHistory[k].shift(); }
      }
    }
    return true;
  }

  async function fetchGamesLive() {
    const ids = Object.values(GAMES).map((g) => g.universe).join(',');
    const data = await fetchJSON(`https://games.roproxy.com/v1/games?universeIds=${ids}&_=${Date.now()}`, 6000);
    const games = {};
    for (const g of (data && data.data) || []) {
      const key = UNIVERSE_TO_KEY[String(g.id)];
      if (!key) continue;
      games[key] = { playing: num(g.playing), visits: num(g.visits), favorites: num(g.favoritedCount) };
      stats.meta[key] = { genre: cleanText(g.genre, 40), maxPlayers: num(g.maxPlayers), updated: g.updated };
    }
    if (!Object.keys(games).length) throw new Error('sem dados do Roblox');
    return { games, updatedAt: new Date().toISOString() };
  }
  /* VOTES-START */
  async function fetchVotes() {
    const keys = Object.keys(GAMES);
    const ids = keys.map((k) => GAMES[k].universe).join(',');
    const games = {};
    const take = (data) => {
      for (const v of (data && data.data) || []) {
        const key = UNIVERSE_TO_KEY[String(v && v.id)];
        if (key && num(v.upVotes) !== null && num(v.downVotes) !== null) games[key] = { likes: num(v.upVotes), dislikes: num(v.downVotes) };
      }
    };
    try { take(await fetchJSON(`https://games.roproxy.com/v1/games/votes?universeIds=${ids}`, 6000)); } catch (e) { /* próximo */ }
    const missing = () => keys.filter((k) => !games[k]);
    if (missing().length) {
      await Promise.allSettled(missing().map(async (k) => {
        const v = await fetchJSON(`https://games.roproxy.com/v1/games/${GAMES[k].universe}/votes`, 6000);
        if (num(v && v.upVotes) !== null && num(v && v.downVotes) !== null) games[k] = { likes: num(v.upVotes), dislikes: num(v.downVotes) };
      }));
    }
    if (missing().length) {
      /* Último recurso (era o que funcionava antes): serviços intermediários, só para votos. */
      const target = `https://games.roblox.com/v1/games/votes?universeIds=${ids}`;
      try { take(await fetchJSON(ALLORIGINS + encodeURIComponent(target), 9000)); }
      catch (e) { try { take(await fetchJina(target)); } catch (e2) { /* sem votos agora */ } }
    }
    return games;
  }
  /* VOTES-END */
  let votesFails = 0;
  async function refreshVotes() {
    if (votesBusy || LIVE_STATS_ENDPOINT) return;
    votesBusy = true;
    try {
      const games = await fetchVotes();
      if (Object.keys(games).length && applySnapshot({ games, updatedAt: new Date().toISOString() }, 'live', false)) { votesFails = 0; votesTimer.at = Date.now(); renderStats(); }
      else throw new Error('sem votos');
    } catch (err) {
      votesFails = Math.min(votesFails + 1, 4);
      votesTimer.at = Date.now() - 60000 + Math.min(300000, 20000 * Math.pow(2, votesFails));
    } finally { votesBusy = false; }
  }

  function renderStats() {
    let players = 0, likes = 0, favorites = 0, visits = 0;
    let hp = false, hl = true, hf = false, hv = false, lkMissing = false;
    for (const key of Object.keys(GAMES)) {
      const g = stats.games[key] || {};
      const playing = num(g.playing), vis = num(g.visits), fav = num(g.favorites), lk = num(g.likes);
      if (!GAMES[key].soon) {
        setValue($(`#${key}-players`), playing, false);
        setValue($(`#${key}-visits`), vis, true);
      }
      if (playing !== null) { players += playing; hp = true; }
      if (vis !== null) { visits += vis; hv = true; }
      if (fav !== null) { favorites += fav; hf = true; }
      if (lk !== null) likes += lk; else hl = false, lkMissing = true;
    }
    setValue($('#stat-players'), hp ? players : null);
    setValue($('#stat-likes'), hl && !lkMissing ? likes : null);
    setValue($('#stat-favs'), hf ? favorites : null, true);
    setValue($('#stat-visits'), hv ? visits : null, true);
    const ap = stats.games.ap || {};
    setValue($('#fs-players'), ap.playing);
    setValue($('#fs-visits'), ap.visits, true);
    const fu = num(ap.likes), fd = num(ap.dislikes), fa = $('#fs-appr');
    if (fa) fa.textContent = fu !== null && fd !== null && fu + fd > 0 ? new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format((fu / (fu + fd)) * 100) + '%' : '—';
    renderGamePage();
  }
  function noteText() {
    const t = dict();
    if (stats.failed && stats.loaded) return t.stats_stale;
    if (stats.updatedAt) {
      const time = new Date(stats.updatedAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${t.stats_prefix} ${time} · ${stats.source === 'live' ? t.src_live : t.src_cache}`;
    }
    return stats.failed ? t.stats_unavailable : t.stats_loading;
  }
  function renderStatsNote() { const n = $('#roblox-stats-updated'); if (n) n.textContent = noteText(); }

  async function refreshStats() {
    if (refreshing) return;
    refreshing = true;
    clearTimeout(statsTimer);
    try {
      if (!document.hidden) {
        let snapshot = null;
        try { snapshot = await (LIVE_STATS_ENDPOINT ? fetchJSON(LIVE_STATS_ENDPOINT) : fetchGamesLive()); liveFails = 0; }
        catch (err) { liveFails += 1; console.warn('[NeoX] Stats ao vivo falharam:', err.message || err); }
        if (snapshot && hasAnyData(snapshot)) applySnapshot(snapshot, 'live');
        if (!stats.loaded) {
          const cached = store.get('neox-stats-v4');
          if (hasAnyData(cached)) applySnapshot(cached, 'cache');
        }
        stats.failed = !snapshot || !hasAnyData(snapshot);
        renderStats();
        renderStatsNote();
        if (stats.loaded && Date.now() - votesTimer.at > 60000) refreshVotes();
      }
    } finally {
      refreshing = false;
      const base = view && view.type === 'game' ? POLL_GAME_MS : POLL_MS;
      const delay = liveFails > 8 ? 120000 : liveFails > 3 ? 30000 : base;
      statsTimer = setTimeout(refreshStats, delay);
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStats(); });

  /* ---------------- Imagens do jogo (ícones e banners ao vivo do Roblox) ---------------- */
  /* MEDIA-START */
  const THUMBS_API = 'https://thumbnails.roproxy.com/v1/games/';
  const RBX_IMG = /^https:\/\/[a-z0-9-]+\.rbxcdn\.com\/[A-Za-z0-9\/_.-]{4,260}$/;
  const safeRbx = (u) => (typeof u === 'string' && RBX_IMG.test(u) ? u : '');
  const MEDIA_TTL = 300000;
  const ICON_LOCAL = { 'assets/anime-paradise.png': 'ap', 'assets/free-fire-max.png': 'ff' };
  const media = { icons: {}, shots: {}, at: 0 };
  function parseMedia(ic, sh) {
    const icons = {}, shots = {};
    for (const d of (ic && ic.data) || []) {
      const key = UNIVERSE_TO_KEY[String(d && d.targetId)];
      const url = d && d.state === 'Completed' ? safeRbx(d.imageUrl) : '';
      if (key && url && !GAMES[key].soon) icons[key] = url;
    }
    for (const d of (sh && sh.data) || []) {
      const key = UNIVERSE_TO_KEY[String(d && d.universeId)];
      if (!key || GAMES[key].soon) continue;
      const list = ((d && d.thumbnails) || []).filter((t) => t && t.state === 'Completed').map((t) => safeRbx(t.imageUrl)).filter(Boolean).slice(0, 12);
      if (list.length) shots[key] = list;
    }
    return { icons, shots };
  }
  /* MEDIA-END */
  function applyIcons() {
    $$('img').forEach((img) => {
      const local = img.dataset.local || img.getAttribute('src') || '';
      const key = ICON_LOCAL[local];
      if (!key) return;
      img.dataset.local = local;
      const remote = media.icons[key];
      if (remote && img.getAttribute('src') !== remote) { img._queue = null; img.dataset.fallbacks = local; img.src = remote; }
    });
  }
  function renderStrip() {
    const card = $('#gp-media-card'), strip = $('#gp-strip');
    if (!card || !strip || !gameKey) return;
    const list = media.shots[gameKey] || [];
    const sig = gameKey + '|' + list.join(',');
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.textContent = '';
    card.hidden = !list.length;
    const name = GAME_PAGES[gameKey] ? GAME_PAGES[gameKey].name : '';
    list.forEach((src, i) => {
      const im = document.createElement('img');
      im.src = src; im.alt = `${name} ${i + 1}`; im.loading = 'lazy'; im.decoding = 'async'; im.width = 768; im.height = 432;
      strip.appendChild(im);
    });
  }
  function applyMedia() { applyIcons(); if (view && view.type === 'game') fillGamePage(); }
  let mediaBusy = false;
  async function loadMedia() {
    if (mediaBusy) return;
    if (!media.at) {
      const c = store.get('neox-media-v1');
      if (c && c.icons && c.shots) {
        for (const k of Object.keys(GAMES)) {
          const i = safeRbx(c.icons[k]); if (i) media.icons[k] = i;
          const l = Array.isArray(c.shots[k]) ? c.shots[k].map(safeRbx).filter(Boolean).slice(0, 12) : [];
          if (l.length) media.shots[k] = l;
        }
        media.at = num(c.at) || 1;
        applyMedia();
      }
    }
    if (Date.now() - media.at < MEDIA_TTL) return;
    mediaBusy = true;
    const ids = Object.values(GAMES).filter((g) => !g.soon).map((g) => g.universe).join(',');
    try {
      const [ic, sh] = await Promise.all([
        fetchJSON(`${THUMBS_API}icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`, 9000),
        fetchJSON(`${THUMBS_API}multiget/thumbnails?universeIds=${ids}&countPerUniverse=12&defaults=true&size=768x432&format=Png&isCircular=false`, 9000)
      ]);
      const next = parseMedia(ic, sh);
      if (Object.keys(next.icons).length || Object.keys(next.shots).length) {
        media.icons = Object.assign({}, media.icons, next.icons);
        media.shots = Object.assign({}, media.shots, next.shots);
        media.at = Date.now();
        store.set('neox-media-v1', { at: media.at, icons: media.icons, shots: media.shots });
        applyMedia();
      } else { media.at = Date.now() - MEDIA_TTL + 120000; }
    } catch (err) {
      media.at = Date.now() - MEDIA_TTL + 120000;
      console.warn('[NeoX] Imagens ao vivo falharam:', err.message || err);
    } finally { mediaBusy = false; }
  }
  const mediaLoop = () => { if (!document.hidden) loadMedia(); setTimeout(mediaLoop, 60000); };

  /* ---------------- Equipe: monta os cards a partir de DEVS (sem innerHTML) ---------------- */
  (() => {
    const track = $('#team-track');
    if (!track) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, ...kids) => {
      const n = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'text') n.textContent = v; else n.setAttribute(k, v); });
      kids.forEach((kid) => n.append(kid));
      return n;
    };
    const arrowIcon = () => {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS(SVG_NS, 'use');
      use.setAttribute('href', '#i-arrow-up-right');
      svg.appendChild(use);
      return svg;
    };
    const frag = document.createDocumentFragment();
    DEVS.forEach((d) => {
      const href = '#/equipe/' + d.slug;
      const avatar = el('a', { class: 'team-avatar', href, draggable: 'false' },
        el('img', { src: d.img, alt: d.name, width: '380', height: '285', loading: 'lazy', decoding: 'async', draggable: 'false' }),
        el('span', { class: 'initials', 'aria-hidden': 'true', text: d.initials }));
      const info = el('div', { class: 'team-info' },
        el('h3', { class: 'team-name' }, el('a', { href, draggable: 'false', text: d.name })),
        el('p', { class: 'team-role', 'data-i18n': d.role }),
        el('a', { class: 'team-link', href, draggable: 'false' }, arrowIcon(), el('span', { 'data-i18n': 'dev_more', text: 'Ver perfil' })));
      frag.appendChild(el('article', { class: 'team-card panel', 'data-dev': d.slug }, avatar, info));
    });
    track.appendChild(frag);
  })();

  /* ---------------- Carrossel da equipe (loop infinito) ---------------- */
  (() => {
    const track = $('#team-track');
    const viewport = $('#team-viewport');
    if (!track || !viewport) return;
    const originals = $$('.team-card', track);
    const total = originals.length;
    if (total < 2) return;

    const dotsRoot = $('#team-dots'), statusEl = $('#team-status');
    const prevBtn = $('#team-prev'), nextBtn = $('#team-next'), progressEl = $('#team-progress');

    const clone = (card) => {
      const copy = card.cloneNode(true);
      copy.classList.add('is-clone');
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      $$('a,button', copy).forEach((el) => { el.tabIndex = -1; });
      return copy;
    };
    originals.map(clone).forEach((c) => track.insertBefore(c, originals[0]));
    originals.map(clone).forEach((c) => track.appendChild(c));

    const cards = $$('.team-card', track);
    const dots = originals.map((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'team-dot';
      dot.setAttribute('aria-current', 'false');
      dot.setAttribute('aria-label', `${i + 1}: ${$('.team-name', card).textContent.trim()}`);
      dot.addEventListener('click', () => goTo(i));
      if (dotsRoot) dotsRoot.appendChild(dot);
      return dot;
    });

    const AUTO_MS = 4600;
    const MOVE_MS = 1100;
    let index = total, locked = false, paused = false, inView = false;
    let lastUser = Date.now(), lockTimer = null, progressAnim = null;
    let pressed = false, dragging = false, startX = 0, startY = 0, dx = 0, pid = null, suppressClick = false;

    const logicalOf = (i) => ((i % total) + total) % total;
    const nameOf = (i) => ($('.team-name', cards[i]) || {}).textContent || 'Dev';
    const centerOffset = (i, extra = 0) => {
      const c = cards[i];
      return c ? viewport.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2) + extra : 0;
    };
    function render(animate = true, extra = 0) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = `translate3d(${centerOffset(index, extra)}px,0,0)`;
    }
    function paint() {
      cards.forEach((c, i) => c.classList.toggle('is-active', i === index));
      const l = logicalOf(index);
      dots.forEach((d, i) => d.setAttribute('aria-current', i === l ? 'true' : 'false'));
      updateTeamStatus();
    }
    updateTeamStatus = () => {
      const l = logicalOf(index);
      if (statusEl) statusEl.textContent = dict().team_status(l + 1, total, nameOf(index));
      if (prevBtn) prevBtn.setAttribute('aria-label', dict().team_prev);
      if (nextBtn) nextBtn.setAttribute('aria-label', dict().team_next);
      if (dotsRoot) dotsRoot.setAttribute('aria-label', dict().team_dots);
      viewport.setAttribute('aria-label', `${dict().team_region}: ${nameOf(index)}`);
      viewport.setAttribute('aria-roledescription', dict().team_role);
    };
    function normalize() {
      let changed = false;
      if (index >= 2 * total) { index -= total; changed = true; }
      else if (index < total) { index += total; changed = true; }
      if (changed) {
        track.classList.add('is-snapping');
        render(false);
        void track.offsetWidth;
        paint();
        requestAnimationFrame(() => { track.style.transition = ''; track.classList.remove('is-snapping'); });
      } else paint();
    }
    function settle() { clearTimeout(lockTimer); locked = false; normalize(); }
    function syncProgress() {
      if (!progressAnim) return;
      if (!paused && inView && !document.hidden && !dragging) progressAnim.play(); else progressAnim.pause();
    }
    function restartProgress() {
      if (!progressEl || !progressEl.animate) return;
      if (progressAnim) { progressAnim.onfinish = null; progressAnim.cancel(); }
      progressAnim = progressEl.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: AUTO_MS, easing: 'linear', fill: 'forwards' });
      progressAnim.onfinish = () => { if (locked || dragging) { restartProgress(); return; } index += 1; beginMove(); };
      syncProgress();
    }
    function beginMove() {
      locked = true;
      render(true);
      paint();
      clearTimeout(lockTimer);
      lockTimer = setTimeout(settle, MOVE_MS);
      restartProgress();
    }
    function step(dir) { if (locked || dragging) return; lastUser = Date.now(); index += dir; beginMove(); }
    function goTo(logical) {
      if (locked || dragging || logical === logicalOf(index)) return;
      const base = index - logicalOf(index);
      let target = base + logical;
      for (const v of [base + logical - total, base + logical + total]) {
        if (v >= 0 && Math.abs(v - index) < Math.abs(target - index)) target = v;
      }
      index = target;
      lastUser = Date.now();
      beginMove();
    }

    track.addEventListener('transitionend', (e) => { if (e.target === track && e.propertyName === 'transform') settle(); });
    if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => step(1));

    viewport.addEventListener('pointerdown', (e) => {
      if (locked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pressed = true; dragging = false; startX = e.clientX; startY = e.clientY; dx = 0; pid = e.pointerId;
      lastUser = Date.now();
    });
    window.addEventListener('pointermove', (e) => {
      if (!pressed || e.pointerId !== pid) return;
      const mx = e.clientX - startX, my = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        if (Math.abs(my) > Math.abs(mx)) { pressed = false; return; }
        dragging = true; syncProgress();
        try { viewport.setPointerCapture(pid); } catch (err) { /* Safari antigo */ }
        track.style.transition = 'none';
        viewport.classList.add('is-dragging');
      }
      dx = mx;
      track.style.transform = `translate3d(${centerOffset(index, dx)}px,0,0)`;
    }, { passive: true });
    function endDrag(e) {
      if (e && e.pointerId !== pid) return;
      const was = dragging;
      pressed = false; dragging = false; syncProgress();
      viewport.classList.remove('is-dragging');
      if (!was) return;
      try { viewport.releasePointerCapture(pid); } catch (err) { /* ok */ }
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 80);
      const delta = dx;
      dx = 0; lastUser = Date.now();
      if (Math.abs(delta) > 55) { index += delta < 0 ? 1 : -1; beginMove(); } else render(true);
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    viewport.addEventListener('click', (e) => {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      const card = e.target.closest('.team-card');
      if (card && !card.classList.contains('is-active')) {
        e.preventDefault();
        e.stopPropagation();
        const i = cards.indexOf(card);
        if (i > -1 && !locked) { index = i; lastUser = Date.now(); beginMove(); }
      }
    }, true);

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      else if (e.key === 'End') { e.preventDefault(); goTo(total - 1); }
    });

    if (!(progressEl && progressEl.animate)) {
      setInterval(() => { if (document.hidden || paused || dragging || locked || !inView) return; index += 1; beginMove(); }, AUTO_MS);
    }
    document.addEventListener('visibilitychange', syncProgress);
    const pause = () => { paused = true; syncProgress(); };
    const resume = () => { paused = false; syncProgress(); };
    viewport.addEventListener('mouseenter', pause);
    viewport.addEventListener('mouseleave', resume);
    viewport.addEventListener('focusin', pause);
    viewport.addEventListener('focusout', resume);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => entries.forEach((en) => { inView = en.isIntersecting; syncProgress(); }), { threshold: 0.15 }).observe(viewport);
    } else inView = true;

    const relayout = debounce(() => {
      if (!viewport.clientWidth) return;
      render(false);
      void track.offsetWidth;
      requestAnimationFrame(() => { track.style.transition = ''; });
    }, 140);
    window.addEventListener('resize', relayout, { passive: true });
    window.addEventListener('load', () => render(false));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render(false));

    paint();
    restartProgress();
    requestAnimationFrame(() => { render(false); paint(); });
  })();

  /* ---------------- Navegação suave + aviso ---------------- */
  const toast = $('#nav-toast');
  const toastText = $('#nav-toast-text');
  const showToast = (text) => {
    if (!toast || !toastText) return;
    toastText.textContent = text;
    toast.setAttribute('aria-hidden', 'false');
    toast.classList.add('is-visible');
  };
  const hideToast = () => { if (!toast) return; toast.classList.remove('is-visible'); toast.setAttribute('aria-hidden', 'true'); };
  function cancelNav() {
    if (navRaf) { cancelAnimationFrame(navRaf); navRaf = null; }
    navLockId = null;
    root.classList.remove('is-navigating', 'is-traveling');
  }
  function flash() { /* sem efeito de chegada: evita efeitos empilhados ao clicar rápido */ }
  function targetTop(target) {
    const offset = siteHeader && !siteHeader.classList.contains('is-hidden') ? siteHeader.offsetHeight + 18 : 24;
    return Math.max(0, Math.round(window.scrollY + target.getBoundingClientRect().top - offset));
  }
  function jumpTo(target) { window.scrollTo(0, target.id === 'home' ? 0 : targetTop(target)); }
  function animateTo(target) {
    if (!target) return;
    if (navRaf && navLockId === target.id) return; /* já está indo para lá */
    cancelNav();
    const dest = () => (target.id === 'home' ? 0 : targetTop(target));
    const from = window.scrollY;
    if (Math.abs(dest() - from) < 3) { window.scrollTo(0, dest()); return; }
    if (siteHeader) siteHeader.classList.remove('is-hidden');
    navLockId = target.id;
    root.classList.add('is-navigating', 'is-traveling');
    window.dispatchEvent(new Event('neox:view'));
    const duration = Math.min(800, Math.max(380, Math.abs(dest() - from) * 0.35));
    const started = performance.now();
    const stepFn = (now) => {
      const t = Math.min(1, (now - started) / duration);
      window.scrollTo(0, from + (dest() - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) navRaf = requestAnimationFrame(stepFn);
      else { navRaf = null; cancelNav(); window.dispatchEvent(new Event('neox:view')); }
    };
    navRaf = requestAnimationFrame(stepFn);
  }
  const stopNav = () => { if (navRaf) { cancelNav(); window.dispatchEvent(new Event('neox:view')); } };
  window.addEventListener('wheel', stopNav, { passive: true });
  window.addEventListener('touchstart', stopNav, { passive: true });
  window.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) stopNav(); });

  const toTop = $('#to-top');
  if (toTop) toTop.addEventListener('click', () => {
    if (view) { location.hash = '#home'; return; }
    animateTo($('#home') || document.body, dict().back_to_top);
  });

  (() => {
    const games = $('#games');
    if (!games) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { flash(games); io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(games);
    }
  })();

  /* ---------------- Cortina de transição entre páginas ---------------- */
  const curtain = $('#curtain');
  let curtainBusy = false;
  function withCurtain(fn) {
    if (!curtain || curtainBusy) { fn(); return; }
    curtainBusy = true;
    curtain.classList.remove('is-out');
    void curtain.offsetWidth;
    curtain.classList.add('is-in');
    setTimeout(() => {
      fn();
      curtain.classList.remove('is-in');
      void curtain.offsetWidth;
      curtain.classList.add('is-out');
      setTimeout(() => { curtain.classList.remove('is-out'); curtainBusy = false; }, 950);
    }, 680);
  }

  /* ---------------- Páginas internas: jogo e dev ---------------- */
  function parseHash() {
    const h = location.hash;
    let m = /^#\/jogos\/([a-z0-9-]+)$/.exec(h);
    if (m) {
      const key = Object.keys(GAME_PAGES).find((k) => GAME_PAGES[k].slug === m[1]);
      return key ? { type: 'game', key } : { type: 'bad' };
    }
    m = /^#\/equipe\/([a-z0-9-]+)$/.exec(h);
    if (m) {
      const index = DEVS.findIndex((d) => d.slug === m[1]);
      return index > -1 ? { type: 'dev', index } : { type: 'bad' };
    }
    if (/^#\//.test(h)) return { type: 'bad' };
    return { type: 'section', id: h.slice(1) };
  }

  function enterView(next) {
    cancelNav();
    if (!view) savedScroll = window.scrollY;
    view = next;
    root.classList.add('in-view');
    root.dataset.view = next.type;
    const page = $(next.type === 'game' ? '#game-page' : '#dev-page');
    if (page) { page.classList.remove('is-enter'); void page.offsetWidth; page.classList.add('is-enter'); }
    if (siteHeader) siteHeader.classList.remove('is-hidden');
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('neox:view'));
  }
  function leaveView() {
    if (!view) return;
    view = null; gameKey = null; devIndex = -1;
    root.classList.remove('in-view');
    delete root.dataset.view;
    document.title = dict().title;
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('neox:view'));
  }
  function focusHeading(id) {
    const el = $(id);
    if (el) el.focus({ preventScroll: true });
  }

  /* Página do jogo */
  function fillGamePage() {
    if (!gameKey) return;
    const g = GAME_PAGES[gameKey], t = dict();
    $('#gp-title').textContent = g.name;
    const cover = $('#gp-cover'), bg = $('#gp-bg');
    const remote = media.icons[gameKey] || '', want = remote || g.img;
    if (cover.getAttribute('src') !== want) { cover._queue = null; cover.dataset.fallbacks = remote ? g.img : ''; cover.src = want; }
    if (bg.getAttribute('src') !== want) { bg._queue = null; bg.dataset.fallbacks = remote ? g.img : ''; bg.src = want; }
    cover.alt = g.name;
    cover.style.setProperty('--pos', g.pos);
    $('#gp-desc').textContent = t[g.desc];
    $('#gp-play').href = safeHttps(g.play);
    $('#gp-dc').hidden = !g.dc;
    if (g.dc) $('#gp-dc').href = safeHttps(g.dc);
    $('#gp-dc-off').hidden = !!g.dc;
    document.title = `${g.name} | NeoX Studio`;
    renderStrip();
  }
  function renderSpark() {
    const pts = liveHistory[gameKey] || [];
    const W = 300, H = 72, P = 8;
    const line = $('#gp-spark-line'), area = $('#gp-spark-area'), dot = $('#gp-spark-dot');
    if (pts.length < 2) {
      line.setAttribute('d', `M${P} ${H / 2} L${W - P} ${H / 2}`);
      area.setAttribute('d', '');
      dot.setAttribute('cx', W - P); dot.setAttribute('cy', H / 2);
      $('#gp-spark-note').textContent = dict().gp_wait;
      return;
    }
    const vs = pts.map((p) => p.v);
    const min = Math.min(...vs), max = Math.max(...vs);
    const x = (i) => P + ((W - 2 * P) * i) / (pts.length - 1);
    const y = (v) => (max === min ? H / 2 : H - P - ((H - 2 * P) * (v - min)) / (max - min));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    line.setAttribute('d', d);
    area.setAttribute('d', `${d} L${x(pts.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`);
    dot.setAttribute('cx', x(pts.length - 1).toFixed(1));
    dot.setAttribute('cy', y(vs[vs.length - 1]).toFixed(1));
    $('#gp-spark-note').textContent = dict().gp_tick;
  }
  function renderGamePage() {
    if (!view || view.type !== 'game' || !gameKey) return;
    const s = stats.games[gameKey] || {}, m = stats.meta[gameKey] || {};
    setValue($('#gp-players'), s.playing);
    setValue($('#gp-visits'), s.visits);
    setValue($('#gp-likes'), s.likes);
    setValue($('#gp-favs'), s.favorites);
    const h = liveHistory[gameKey] || [];
    setValue($('#gp-peak'), h.length ? Math.max(...h.map((p) => p.v)) : num(s.playing));
    const up = num(s.likes), down = num(s.dislikes);
    const pct = up !== null && down !== null && up + down > 0 ? (up / (up + down)) * 100 : null;
    $('#gp-appr').textContent = pct === null ? '—' : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(pct) + '%';
    $('#gp-bar').style.width = (pct || 0) + '%';
    $('#gp-genre').textContent = m.genre || '—';
    $('#gp-max').textContent = num(m.maxPlayers) !== null ? fmtFull(m.maxPlayers) : '—';
    const upd = m.updated ? new Date(m.updated) : null;
    $('#gp-upd').textContent = upd && !Number.isNaN(upd.getTime()) ? upd.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    $('#gp-note').textContent = noteText();
    renderSpark();
  }
  function openGame(key, refresh) {
    const changed = !view || view.type !== 'game' || view.key !== key;
    enterView({ type: 'game', key });
    gameKey = key; devIndex = -1;
    if (changed) {
      ['gp-players', 'gp-visits', 'gp-likes', 'gp-favs', 'gp-peak'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.dataset.value = ''; el.textContent = '—'; }
      });
    }
    fillGamePage();
    renderGamePage();
    focusHeading('#gp-title');
    if (refresh && Date.now() - lastLiveAt > 2500) refreshStats();
  }

  /* Página do dev */
  function fillDevPage() {
    if (devIndex < 0) return;
    const d = DEVS[devIndex], t = dict(), tx = d[lang];
    $('#dp-name').textContent = d.name;
    $('#dp-role').textContent = t[d.role];
    $('#dp-tag').textContent = tx.tag;
    $('#dp-bio').textContent = tx.bio;
    $('#dp-roblox').href = safeHttps(d.roblox);
    const portrait = $('#dp-portrait'), img = $('#dp-img');
    portrait.classList.remove('is-missing');
    if (img.getAttribute('src') !== d.img) img.src = d.img;
    img.alt = d.name;
    $('#dp-initials').textContent = d.initials;

    const list = $('#dp-duties');
    list.textContent = '';
    tx.duties.forEach((text, i) => {
      const li = document.createElement('li');
      li.dataset.n = String(i + 1).padStart(2, '0');
      li.textContent = text;
      list.appendChild(li);
    });

    const people = $('#dp-people');
    people.textContent = '';
    DEVS.forEach((p, i) => {
      const a = document.createElement('a');
      a.className = 'dp-person' + (i === devIndex ? ' is-current' : '');
      a.href = '#/equipe/' + p.slug;
      if (i === devIndex) a.setAttribute('aria-current', 'page');
      const av = document.createElement('span');
      av.className = 'team-avatar';
      const im = document.createElement('img');
      im.src = p.img; im.alt = ''; im.loading = 'lazy'; im.width = 30; im.height = 30;
      const ini = document.createElement('span');
      ini.className = 'initials'; ini.setAttribute('aria-hidden', 'true'); ini.textContent = p.initials;
      av.append(im, ini);
      const nm = document.createElement('span');
      nm.textContent = p.name;
      a.append(av, nm);
      people.appendChild(a);
    });

    const prev = DEVS[(devIndex - 1 + DEVS.length) % DEVS.length];
    const next = DEVS[(devIndex + 1) % DEVS.length];
    $('#dp-prev').href = '#/equipe/' + prev.slug;
    $('#dp-prev-name').textContent = prev.name;
    $('#dp-next').href = '#/equipe/' + next.slug;
    $('#dp-next-name').textContent = next.name;
    document.title = `${d.name} | NeoX Studio`;
  }
  function openDev(index) {
    enterView({ type: 'dev', index });
    gameKey = null; devIndex = index;
    fillDevPage();
    focusHeading('#dp-name');
  }

  /* Roteador: a URL (hash) é a única fonte da verdade. */
  function routeToSection(r, initial) {
    const wasView = !!view;
    if (wasView) leaveView();
    if (r.type === 'bad') {
      try { window.history.replaceState(null, '', '#games'); } catch (e) { /* file:// */ }
      const g = $('#games');
      if (g) jumpTo(g);
      return;
    }
    const target = r.id ? document.getElementById(r.id) : null;
    if (wasView) {
      if (target) jumpTo(target); else window.scrollTo(0, savedScroll);
    } else if (initial && target && r.id !== 'home') {
      const go = () => jumpTo(target);
      if (document.readyState === 'complete') setTimeout(go, 60);
      else window.addEventListener('load', () => setTimeout(go, 60), { once: true });
    } else if (!initial && target) {
      animateTo(target);
    }
  }
  function syncRoute(initial = false) {
    const r = parseHash();
    if (r.type === 'game' || r.type === 'dev') {
      const go = () => (r.type === 'game' ? openGame(r.key, !initial) : openDev(r.index));
      if (initial) go(); else withCurtain(go);
      return;
    }
    if (view && !initial) { withCurtain(() => routeToSection(r, false)); return; }
    routeToSection(r, initial);
  }
  window.addEventListener('hashchange', () => syncRoute(false));

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.startsWith('#/')) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    if (view) { location.hash = href; return; }
    try { window.history.replaceState(null, '', href); } catch (e) { /* file:// */ }
    animateTo(target);
    if (target.id === 'main') target.focus({ preventScroll: true });
  });

  $$('.game-card[data-page]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button')) return;
      location.hash = '#/jogos/' + card.dataset.page;
    });
  });

  /* ---------------- Cursor personalizado ---------------- */
  (() => {
    if (!mqFine.matches) return;
    const cursor = $('#nx-cursor');
    const inner = cursor && $('.nx-cursor-inner', cursor);
    if (!cursor || !inner) return;
    let started = false, tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      inner.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      raf = Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2 ? requestAnimationFrame(loop) : null;
    };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      if (!started) { started = true; cx = tx; cy = ty; root.classList.add('has-nx-cursor'); cursor.classList.add('is-active'); }
      if (!raf) raf = requestAnimationFrame(loop);
      const overText = !!e.target.closest('input, textarea');
      cursor.classList.toggle('is-hidden', overText);
      cursor.classList.toggle('is-hover', !overText && !!e.target.closest('a, button, .game-card, .media-card, .team-card, .community-card, .chip-link, .media-placeholder.is-retry'));
    }, { passive: true });
    document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
    window.addEventListener('blur', () => cursor.classList.add('is-hidden'));
  })();

  /* ---------------- Tilt nos cards de jogo e mídia ---------------- */
  (() => {
    if (reduced() || !mqFine.matches) return;
    $$('.game-card, .media-card').forEach((card) => {
      card.classList.add('card-tilt');
      let frame = null, px = 0, py = 0;
      const apply = () => {
        frame = null;
        const r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const x = Math.min(1, Math.max(0, (px - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (py - r.top) / r.height));
        card.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
      };
      card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
      card.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(apply); }, { passive: true });
      const leave = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = null;
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      };
      card.addEventListener('pointerleave', leave);
      card.addEventListener('pointercancel', leave);
    });
  })();

  /* ---------------- Formulário ---------------- */
  if (contactForm) {
    const fName = $('#f-name'), fEmail = $('#f-email'), fRoblox = $('#f-roblox'), fMsg = $('#f-msg');
    let submitting = false;

    if (!FORM_ENDPOINT) setFormDisabled();
    else contactForm.action = FORM_ENDPOINT;

    [fName, fEmail, fMsg].forEach((field) => {
      if (field) field.addEventListener('input', () => field.setCustomValidity(''));
    });

    contactForm.addEventListener('submit', (event) => {
      if (!FORM_ENDPOINT || submitting) {
        event.preventDefault();
        if (!FORM_ENDPOINT) setFormDisabled();
        return;
      }
      const honey = contactForm.elements._honey;
      if (honey && honey.value) { event.preventDefault(); return; }

      fName.value = cleanLine(fName.value, 80);
      fEmail.value = cleanLine(fEmail.value, 120);
      fRoblox.value = cleanLine(fRoblox.value, 60);
      fMsg.value = cleanText(fMsg.value, 2000);
      const t = dict();
      fName.setCustomValidity(fName.value.length < 2 ? t.name_short : '');
      fMsg.setCustomValidity(fMsg.value.length < 16 ? t.msg_short : '');
      if (!contactForm.checkValidity()) {
        event.preventDefault();
        contactForm.reportValidity();
        return;
      }

      // O POST normal usa a confirmação e o CAPTCHA do fornecedor.
      // Não limpar os campos nem declarar sucesso antes dessa confirmação.
      submitting = true;
      if (formBtn) formBtn.disabled = true;
      if (formStatus) {
        formStatus.dataset.state = 'confirm';
        formStatus.textContent = t.form_continue;
      }
    });

    // O navegador pode restaurar esta página ao voltar da confirmação.
    window.addEventListener('pageshow', () => {
      submitting = false;
      if (formBtn) formBtn.disabled = !FORM_ENDPOINT;
      if (formStatus && FORM_ENDPOINT) {
        delete formStatus.dataset.state;
        formStatus.textContent = '';
      }
    });
  }

  /* ---------------- Tela de loading (a linha embaixo do logo vai enchendo) ---------------- */
  function initLoader() {
    const loader = $('#site-loader');
    if (!loader) return;
    const bar = $('#loader-progress');
    const started = performance.now();
    const minTime = 900;
    let done = false;
    const tick = (now) => {
      if (done) return;
      const v = Math.min(88, ((now - started) / 1500) * 88);
      if (bar) bar.style.width = v.toFixed(1) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const finish = () => {
      if (done) return;
      done = true;
      if (bar) bar.style.width = '100%';
      setTimeout(() => {
        loader.classList.add('is-done');
        root.classList.remove('is-loading');
        document.body.removeAttribute('aria-busy');
        window.dispatchEvent(new Event('resize'));
        setTimeout(() => loader.setAttribute('aria-hidden', 'true'), 800);
      }, 360);
    };
    const ready = () => setTimeout(finish, Math.max(0, minTime - (performance.now() - started)));
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready, { once: true });
    setTimeout(finish, 3600);
  }

  /* ---------------- Idioma (botão) ---------------- */
  const langBtn = $('#lang-btn');
  if (langBtn) langBtn.addEventListener('click', () => applyLanguage(lang === 'pt' ? 'en' : 'pt'));

  /* ---------------- Animações extras ---------------- */
  (() => {
    /* botões "magnéticos": seguem o mouse */
    if (mqFine.matches && !reduced()) {
      $$('.btn-primary, .btn-soft').forEach((b) => {
        b.addEventListener('pointermove', (e) => {
          if (b.disabled) return;
          const r = b.getBoundingClientRect();
          const dx = ((e.clientX - r.left) / r.width - 0.5) * 12;
          const dy = ((e.clientY - r.top) / r.height - 0.5) * 8;
          b.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        }, { passive: true });
        b.addEventListener('pointerleave', () => { b.style.translate = ''; });
      });
    }

    const amb = $('.ambient');
    if (amb && !reduced()) {
      let t = false;
      window.addEventListener('scroll', () => {
        if (t) return;
        t = true;
        requestAnimationFrame(() => { t = false; amb.style.setProperty('--py', (-window.scrollY * 0.12).toFixed(1)); });
      }, { passive: true });
    }

    const mb = $('#menu-btn');
    if (mb) mb.addEventListener('click', () => { mb.classList.remove('is-spin'); void mb.offsetWidth; mb.classList.add('is-spin'); });
  })();

  /* ---------------- Início ---------------- */
  applyLanguage(lang, false);
  initLoader();
  renderStats();
  renderStatsNote();
  refreshStats();
  mediaLoop();
  syncRoute(true);
})();
