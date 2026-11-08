'use strict';
(() => {
  const layer = document.getElementById('main');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assets = key => `assets/home/appstore/${key === '3' ? '3-hand' : '4-hand'}`;
  const frameAssets = key => `assets/home/frames/${key === '3' ? '3-hand' : '4-hand'}`;
  const scenes = [
    { id: 'gallery.play', label: 'Your next hand', title: 'Your next hand of Pinochle.' },
    { id: 'gallery.characters', label: 'Like family', title: 'Just like playing with your family.' },
    { id: 'gallery.rules', label: 'Your house rules', title: 'Your house rules.' },
    { id: 'gallery.learn', label: 'Improve your play', title: 'Improve your play.' }
  ];
  const variants = {
    '4': {
      description: 'Enjoy four-hand Pinochle with lively characters, challenging computer opponents, and house rules that fit the way you play.',
      name: 'Four-hand partnership', rule: 'Shoot the moon', hand: 'Partnership hand',
      rules: 'Pass 3 with no peek, 4 with a peek, double marriages in trump worth 30? However you play, so can Pinochle Pro.'
    },
    '3': {
      description: 'Play three-hand (cutthroat) Pinochle with computer opponents and animated characters at the table.',
      name: 'Three-hand cutthroat', rule: 'Redeal', hand: 'Three-hand play',
      rules: 'Kitty and discard, redeals, double marriages in trump worth 30? However you play, so can Pinochle Pro 3.'
    }
  };
  function ruleExamples(key) {
    if (key === '4') return [
      { id: 'peek4', label: '4 peek', src: 'assets/home/rules/4-hand/four-peek.png',
        alt: 'Four received cards marked in your hand before choosing four to return',
        detail: "See your partner's four cards before choosing four to return." },
      { id: 'noPeek3', label: '3 no peek', src: 'assets/home/rules/4-hand/three-no-peek.png',
        alt: 'Three received cards marked in your hand after the no-peek exchange',
        detail: "Choose your return first. Your partner's three cards are revealed after the exchange." },
      { id: 'meld60', label: '60 meld', src: 'assets/home/rules/4-hand/meld-sixty.png',
        alt: 'Native meld screen showing a double marriage in spades and double pinochle for 60 total meld',
        detail: 'Double marriage in spades, 30. Double pinochle, 30. Total meld, 60.' }
    ];
    return [
      { id: 'choice', label: variants[key].rule, src: `${frameAssets(key)}/rules.png`, alt: 'Redeal choice in three-hand cutthroat Pinochle', detail: variants[key].rules },
      { id: 'hand', label: variants[key].hand, src: `${frameAssets(key)}/hand.png`, alt: 'Three-hand cutthroat hand', detail: variants[key].rules }
    ];
  }

  function selectRuleExample(id) {
    const example = ruleExamples(variant).find(item => item.id === id);
    if (!example) return;
    layer.querySelectorAll('[data-rule-image]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.ruleImage === id));
    });
    const image = layer.querySelector('[data-rules-image]');
    image.src = example.src;
    image.alt = example.alt;
    layer.querySelector('[data-rule-detail]').textContent = example.detail;
  }

  const variant = new URLSearchParams(location.search).get('variant') === '3' ? '3' : '4';
  let built = false, active = '', video = null;
  let userPaused = reducedMotion.matches, scheduled = false, videoVisible = true, headerObserver = null;

  function syncVideoState(message) {
    const button = layer.querySelector('[data-video-toggle]');
    const status = layer.querySelector('[data-video-status]');
    if (!video || !button) return;
    button.textContent = video.paused ? 'Play video' : 'Pause video';
    button.setAttribute('aria-label', video.paused ? 'Play the game video' : 'Pause the game video');
    status.textContent = message || (video.paused ? 'Paused' : 'Playing · muted');
  }

  function playVideo() {
    if (!video || !video.paused || userPaused || !videoVisible || document.hidden) return;
    const current = video;
    const promise = current.play();
    if (promise) promise.catch(() => {
      if (current === video) syncVideoState('Select Play video to start.');
    });
  }

  function setMediaWeights(game, rules, stats) {
    const media = layer.querySelector('[data-scene-media]');
    const weights = [game, rules, stats];
    // Composite over an opaque lower layer so the page does not wash through the blend.
    const opacity = [game > 0 ? 1 : 0, stats < 1 ? rules / (1 - stats) : 0, stats];
    [...media.children].forEach((element, index) => {
      element.style.opacity = String(opacity[index]);
      element.setAttribute('aria-hidden', String(weights[index] < .5));
    });
    media.dataset.blend = weights.map(value => value.toFixed(3)).join(',');
    videoVisible = game > 0;
    if (!videoVisible && video && !video.paused) video.pause();
    else playVideo();
  }

  function prepareMedia() {
    const root = assets(variant), frames = frameAssets(variant), media = layer.querySelector('[data-scene-media]');
    const current = document.createElement('video');
    video = current;
    current.id = 'scene-video'; current.src = `${root}/app-preview.mp4`;
    current.poster = `${frames}/hand.png`;
    current.muted = true; current.defaultMuted = true; current.playsInline = true;
    current.loop = true; current.preload = 'auto';
    current.setAttribute('muted', ''); current.setAttribute('playsinline', '');
    current.setAttribute('aria-label', `${variants[variant].name} gameplay with the current characters`);
    current.addEventListener('playing', () => { if (current === video) syncVideoState(); });
    current.addEventListener('pause', () => { if (current === video) syncVideoState(); });
    current.addEventListener('error', () => { if (current === video) syncVideoState('Video could not load. Select Play video to retry.'); });
    media.append(current);
    const firstRule = ruleExamples(variant)[0];
    for (const [src, alt, isRule] of [
      [firstRule.src, firstRule.alt, true],
      [`${frames}/stats.png`, `Actual Statistics screen for ${variants[variant].name}`, false]
    ]) {
      const image = document.createElement('img');
      image.src = src; image.alt = alt; image.width = 1920; image.height = 886;
      if (isRule) image.dataset.rulesImage = '';
      image.decoding = 'async'; image.style.opacity = '0'; image.setAttribute('aria-hidden', 'true');
      media.append(image);
    }
  }

  function selectScene(id) {
    if (id === active) return;
    active = id;
    const scene = scenes.find(item => item.id === id) || scenes[0];
    layer.dataset.activeScene = scene.id;
    layer.querySelectorAll('[data-scene-link]').forEach(link => {
      if (link.dataset.sceneLink === scene.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    layer.querySelector('[data-scene-label]').textContent = scene.label;
    layer.querySelector('[data-video-controls]').hidden = !['gallery.play', 'gallery.characters'].includes(scene.id);
    layer.querySelector('[data-rule-controls]').hidden = scene.id !== 'gallery.rules';
  }

  function sceneFromScroll() {
    scheduled = false;
    if (!built) return;
    const rail = layer.querySelector('.visual-rail').getBoundingClientRect();
    const readingLine = innerWidth <= 760 ? Math.min(innerHeight - 24, rail.bottom + 96) : innerHeight * .54;
    const chapters = [...layer.querySelectorAll('[data-chapter]')].map(section => ({ id: section.dataset.chapter, top: section.getBoundingClientRect().top }));
    let selected = scenes[0].id;
    for (const chapter of chapters) if (chapter.top <= readingLine) selected = chapter.id;
    selectScene(selected);
    if (reducedMotion.matches) {
      setMediaWeights(selected === 'gallery.rules' || selected === 'gallery.learn' ? 0 : 1, selected === 'gallery.rules' ? 1 : 0, selected === 'gallery.learn' ? 1 : 0);
      return;
    }
    const span = Math.min(360, Math.max(180, innerHeight * .3));
    const progress = top => Math.max(0, Math.min(1, (readingLine + span - top) / span));
    const rules = progress(chapters[2].top), stats = progress(chapters[3].top);
    setMediaWeights(1 - rules, Math.max(0, rules - stats), stats);
  }

  function scheduleScroll() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(sceneFromScroll); }
  }

  function moveToScene(id, animate = true) {
    const target = document.getElementById(`scene-${id.split('.')[1]}`);
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto' });
    selectScene(id); scheduleScroll();
  }

  function measureHeader() {
    layer.style.setProperty('--header-height', `${layer.querySelector('.site-banner').getBoundingClientRect().height}px`);
    scheduleScroll();
  }

  function initialize() {
    const product = variants[variant];
    layer.querySelector('[data-product-description]').textContent = product.description;
    const store = layer.querySelector('[data-store-link]');
    if (variant === '3') {
      store.href = 'https://apps.apple.com/us/app/3-hand-pinochle/id916432421';
      store.textContent = 'Get 3 Hand Pinochle';
      store.dataset.analyticsLabel = 'play_three_hand_pinochle';
    }
    const examples = ruleExamples(variant);
    layer.querySelector('[data-rule-detail]').textContent = examples[0].detail;
    const controls = layer.querySelector('[data-rule-controls]');
    for (const [index, example] of examples.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.ruleImage = example.id;
      button.textContent = example.label;
      button.setAttribute('aria-pressed', String(index === 0));
      controls.append(button);
    }
    const appVariant = variant === '3' ? 'pinochlepro3' : 'pinochlepro';
    const frame = layer.querySelector('[data-feature-votes]');
    frame.title = `Feature ideas for ${variant === '3' ? 'PinochlePro3' : 'PinochlePro'}`;
    frame.src = `https://tally.so/embed/Z9oDao?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&app_variant=${appVariant}`;
    frame.hidden = false;
    layer.querySelector('[data-form-link]').href = `https://tally.so/r/Z9oDao?app_variant=${appVariant}`;
    window.Tally?.loadEmbeds();
    layer.querySelector('[data-scene-media]').replaceChildren();
    prepareMedia();
    built = true;
    selectScene('gallery.play');
    setMediaWeights(1, 0, 0);
    syncVideoState(video.paused ? 'Paused' : 'Starting video…');
    measureHeader();
    if (window.ResizeObserver) {
      headerObserver = new ResizeObserver(measureHeader);
      headerObserver.observe(layer.querySelector('.site-banner'));
    }
    requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      scheduleScroll();
    });
  }

  layer.addEventListener('click', event => {
    const link = event.target.closest('[data-scene-link]');
    if (link) { event.preventDefault(); moveToScene(link.dataset.sceneLink); return; }
    if (event.target.closest('[data-video-toggle]') && video) {
      userPaused = !video.paused;
      if (userPaused) video.pause(); else playVideo();
    }
    const rule = event.target.closest('[data-rule-image]');
    if (rule) selectRuleExample(rule.dataset.ruleImage);
  });
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', scheduleScroll, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!video) return; if (document.hidden) video.pause(); else playVideo(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { userPaused = true; if (video) video.pause(); } scheduleScroll(); });
  initialize();
})();
