const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  phase: 1,
  helicase: 0,
  ssb: new Set(),
  tension: 12,
  topoUsed: false,
  leading: 0,
  leadingPrimed: false,
  fragment: 0,
  fragmentSteps: [0, 0, 0],
  selectedTool: null,
  mistakes: 0,
  timer: null,
  audio: false,
  finished: false
};

const phaseCopy = {
  1: { title: 'Abrir la doble hélice', instruction: '<b>MISIÓN:</b> Desliza la Helicasa, fija las proteínas SSB y descarga la tensión con la Topoisomerasa.' },
  2: { title: 'Sintetizar la cadena líder', instruction: '<b>MISIÓN:</b> Coloca un único cebador con la Primasa y mantén presionada la ADN Pol III para copiar de forma continua.' },
  3: { title: 'Construir fragmentos de Okazaki', instruction: '<b>MISIÓN:</b> En cada segmento, alterna Primasa y ADN Pol III. La cadena retrasada se sintetiza a saltos.' },
  4: { title: 'Reemplazar y unir', instruction: '<b>MISIÓN:</b> Usa ADN Pol I en cada cebador y arrastra la Ligasa sobre las muescas para sellarlas.' },
  5: { title: 'Control de calidad', instruction: '<b>ESCÁNER ACTIVO:</b> La actividad exonucleasa revisará y corregirá nucleótidos mal apareados.' }
};

function createDna() {
  const hero = $('#dnaHero');
  for (let i = 0; i < 25; i++) {
    const rung = document.createElement('i');
    rung.className = 'dna-rung';
    rung.style.top = `${i * 4}%`;
    rung.style.transform = `scaleX(${0.35 + Math.abs(Math.sin(i * .42)) * .65}) rotate(${Math.sin(i * .42) * 9}deg)`;
    rung.style.opacity = .42 + Math.abs(Math.cos(i * .42)) * .58;
    hero.appendChild(rung);
  }
  const bases = $('#basePairs');
  const letters = ['A', 'T', 'C', 'G'];
  for (let i = 0; i < 31; i++) {
    const base = document.createElement('i');
    base.className = 'base';
    base.style.left = `${i * 3.3}%`;
    base.dataset.base = letters[i % 4];
    bases.appendChild(base);
  }
}

function beep(frequency = 480, duration = .05) {
  if (!state.audio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(.035, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el.toastTimer);
  el.toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function updateTension() {
  const display = Math.min(100, Math.round(state.tension));
  $('#tensionValue').textContent = `${display}%`;
  $('#tensionBar').style.width = `${display}%`;
  const schematic = $('#topoSchematic');
  const topoState = $('#topoState');
  $('#topoButton').disabled = state.phase !== 1 || display < 45;
  schematic.classList.toggle('tense', display >= 45 && !schematic.classList.contains('releasing'));
  schematic.classList.toggle('critical', display >= 82);
  if (!schematic.classList.contains('releasing')) {
    topoState.textContent = display >= 82 ? 'Riesgo de ruptura' : display >= 45 ? 'ADN superenrollado' : 'Tensión estable';
  }
  if (display >= 82) {
    $('#tensionBar').style.boxShadow = '0 0 14px #ff916d';
    if (display >= 100) {
      state.mistakes++;
      state.tension = 72;
      $('#instruction').classList.add('error');
      $('#instruction').querySelector('p').innerHTML = '<b>DAÑO POR SOBRETENSIÓN:</b> La horquilla avanzó sin aliviar el superenrollamiento. Activa ahora la Topoisomerasa para estabilizar la cadena.';
      toast('La tensión dañó la cadena: −1.7% de fidelidad');
      updateFidelity();
    }
  } else $('#tensionBar').style.boxShadow = 'none';
}

function updateFidelity() {
  const score = Math.max(82, 100 - state.mistakes * 1.7);
  $('#liveFidelity').textContent = `${score.toFixed(1)}%`;
}

function setPhaseProgress(value) {
  $('#phaseProgress').style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function openingProgress() {
  const progress = state.helicase * .6 + state.ssb.size / 3 * 25 + (state.topoUsed ? 15 : 0);
  setPhaseProgress(progress);
  const complete = state.helicase >= 98 && state.ssb.size === 3 && state.topoUsed;
  $('#nextButton').disabled = !complete;
  if (complete) $('#instruction').querySelector('p').innerHTML = '<b>FASE COMPLETA:</b> La horquilla está abierta y las cadenas permanecen estabilizadas por proteínas SSB.';
}

function handleHelicase(value) {
  const previousPosition = state.helicase;
  state.helicase = Number(value);
  $('#helicaseOutput').textContent = `${value}%`;
  $('#helicase').style.left = `calc(7% + ${value * .78}% - 22px)`;
  $('.fork-glow').style.left = `calc(7% + ${value * .78}% - 30px)`;
  $$('.base').forEach((base, index) => base.style.opacity = index / 30 * 100 < value ? .04 : 1);
  $$('.ssb-slots button').forEach((slot, index) => {
    if (value >= 25 + index * 25 && !slot.classList.contains('placed')) slot.classList.add('available');
  });
  const pendingSsb = $$('.ssb-slots button.available:not(.placed)').length;
  if (pendingSsb > 0 && !$('#instruction').classList.contains('error')) {
    $('#instruction').querySelector('p').innerHTML = '<b>CADENA EXPUESTA:</b> Haz clic en cada control “Añadir SSB” que aparece sobre el ADN para evitar que las hebras vuelvan a unirse.';
  }
  const forwardMovement = Math.max(0, state.helicase - previousPosition);
  state.tension = Math.min(105, state.tension + forwardMovement * .72);
  updateTension();
  openingProgress();
}

function configurePhase(phase) {
  state.phase = phase;
  const copy = phaseCopy[phase];
  $('#phaseNumber').textContent = `FASE 0${phase}`;
  $('#factoryTitle').textContent = copy.title;
  $('#instruction').querySelector('p').innerHTML = copy.instruction;
  $('#instruction').classList.remove('error');
  $$('#phaseList li').forEach((li, i) => {
    li.classList.toggle('active', i + 1 === phase);
    li.classList.toggle('done', i + 1 < phase);
  });
  const lifecycleOrder = ['initiation', 'elongation', 'termination'];
  const currentLifecycle = phase === 1 ? 'initiation' : phase < 5 ? 'elongation' : 'termination';
  const currentIndex = lifecycleOrder.indexOf(currentLifecycle);
  $$('.lifecycle div').forEach(item => {
    const itemIndex = lifecycleOrder.indexOf(item.dataset.lifecycle);
    item.classList.toggle('active', item.dataset.lifecycle === currentLifecycle);
    item.classList.toggle('done', itemIndex < currentIndex);
  });
  $('#nextButton').disabled = true;
  $('.action-row').classList.remove('result-ready');
  setPhaseProgress(0);
  $('#openingControls').classList.toggle('hidden', phase !== 1);
  $('#toolDock').classList.toggle('hidden', phase === 1 || phase === 5);
  $('#helicase').style.display = phase === 1 ? 'grid' : 'none';
  $('#ssbSlots').style.display = phase === 1 ? 'block' : 'none';
  $('#leadingTrack').style.display = phase === 2 ? 'block' : 'none';
  $('#primerNode').style.display = phase === 2 && state.leadingPrimed ? 'grid' : 'none';
  $('#polymerase').style.display = phase === 2 && state.leadingPrimed ? 'block' : 'none';
  $('#okazakiZone').style.display = phase === 3 || phase === 4 ? 'block' : 'none';

  if (phase === 2) setTools(['primase']);
  if (phase === 3) { buildFragments(); setTools(['primase']); }
  if (phase === 4) setTools(['pol1']);
  if (phase === 5) runScanner();
}

function setTools(enabled) {
  $$('#toolDock button').forEach(button => {
    button.disabled = !enabled.includes(button.dataset.tool);
    button.classList.remove('selected');
  });
  state.selectedTool = null;
  $('#toolDock').classList.toggle('no-tools', enabled.length === 0);
  highlightTargets();
}

function keepToolSelected(tool) {
  state.selectedTool = tool;
  $$('#toolDock button').forEach(button => button.classList.toggle('selected', button.dataset.tool === tool));
  highlightTargets();
}

function selectTool(tool) {
  state.selectedTool = tool;
  $$('#toolDock button').forEach(button => button.classList.toggle('selected', button.dataset.tool === tool));
  beep(570);

  if (state.phase === 2 && tool === 'primase' && !state.leadingPrimed) {
    state.leadingPrimed = true;
    $('#primerNode').style.display = 'grid';
    $('#polymerase').style.display = 'block';
    setPhaseProgress(10);
    setTools([]);
    $('#instruction').querySelector('p').innerHTML = '<b>CEBADOR LISTO:</b> Mantén presionado el botón ADN Pol III dentro de la cadena para sintetizar sin interrupciones.';
    return;
  }

  if (state.phase === 3) {
    $('#instruction').querySelector('p').innerHTML = tool === 'primase'
      ? '<b>PRIMASA SELECCIONADA:</b> Haz clic en el segmento marcado con “Haz clic aquí” para colocar el cebador de ARN.'
      : '<b>ADN POL III SELECCIONADA:</b> Haz clic en el segmento resaltado para extender el nuevo fragmento.';
    highlightTargets();
  }
  if (state.phase === 4) {
    $('#instruction').querySelector('p').innerHTML = tool === 'pol1'
      ? '<b>ADN POL I SELECCIONADA:</b> Haz clic en el segmento resaltado para sustituir su ARN por ADN.'
      : '<b>LIGASA SELECCIONADA:</b> Haz clic en la muesca resaltada para formar el enlace final.';
    highlightTargets();
  }
}

function synthesizeLeading() {
  if (state.phase !== 2 || !state.leadingPrimed || state.leading >= 100) return;
  state.leading = Math.min(100, state.leading + 1.1);
  $('#leadingTrack span').style.width = `${state.leading}%`;
  $('#polymerase').style.left = `calc(9% + ${state.leading * .75}%)`;
  setPhaseProgress(10 + state.leading * .9);
  state.tension += .35;
  if (state.tension > 92) state.tension = 25;
  if (state.leading >= 100) {
    stopLeading();
    $('#nextButton').disabled = false;
    $('#instruction').querySelector('p').innerHTML = '<b>CADENA LÍDER COMPLETA:</b> Una sola ADN Pol III avanzó de forma continua en dirección 5′ → 3′.';
    toast('Síntesis continua completada');
  }
}

function startLeading(event) {
  event.preventDefault();
  if (state.phase !== 2) return;
  $('#polymerase').classList.add('active');
  clearInterval(state.timer);
  state.timer = setInterval(synthesizeLeading, 28);
}
function stopLeading() { clearInterval(state.timer); $('#polymerase').classList.remove('active'); }

function buildFragments() {
  const zone = $('#okazakiZone');
  if (zone.children.length) return;
  for (let i = 0; i < 3; i++) {
    const fragment = document.createElement('button');
    fragment.type = 'button';
    fragment.className = 'fragment';
    fragment.dataset.index = i;
    fragment.setAttribute('aria-label', `Fragmento de Okazaki ${i + 1}`);
    fragment.innerHTML = `<span class="fragment-number">Fragmento ${i + 1}</span><span class="fill"></span><i class="nick"></i>`;
    fragment.addEventListener('click', () => handleFragmentClick(i));
    fragment.addEventListener('dragover', e => e.preventDefault());
    fragment.addEventListener('drop', e => { e.preventDefault(); ligateFragment(i); });
    zone.appendChild(fragment);
  }
}

function applyFragmentTool(tool, index) {
  const expectedStep = tool === 'primase' ? 0 : 1;
  if (index !== state.fragment) {
    toast(`Continúa con el fragmento ${state.fragment + 1}, que está resaltado`);
    return;
  }
  if (state.fragmentSteps[index] !== expectedStep) {
    toast(tool === 'primase' ? 'Ese fragmento ya tiene cebador' : 'Este fragmento necesita primero un cebador');
    return;
  }
  const fragment = $(`.fragment[data-index="${index}"]`);
  if (tool === 'primase') {
    state.fragmentSteps[index] = 1;
    fragment.classList.add('primed');
    toast(`Cebador ${index + 1} colocado`);
    setTools(['pol3']);
    $('#instruction').querySelector('p').innerHTML = `<b>CEBADOR COLOCADO:</b> Selecciona ADN Pol III y extiende el fragmento ${index + 1}.`;
  } else if (tool === 'pol3') {
    state.fragmentSteps[index] = 2;
    fragment.classList.add('synthesized');
    toast(`Fragmento ${index + 1} sintetizado`);
    state.fragment = state.fragmentSteps.findIndex(step => step === 0);
  }
  const completed = state.fragmentSteps.filter(s => s === 2).length;
  const primed = state.fragmentSteps.filter(s => s >= 1).length;
  setPhaseProgress((primed + completed) / 6 * 100);
  if (state.fragmentSteps.every(s => s === 2)) {
    $('#nextButton').disabled = false;
    setTools([]);
    $('#instruction').querySelector('p').innerHTML = '<b>FRAGMENTOS LISTOS:</b> Tres tramos de Okazaki fueron construidos en sentido opuesto al avance de la horquilla.';
  } else {
    if (tool === 'pol3') {
      setTools(['primase']);
      $('#instruction').querySelector('p').innerHTML = `<b>FRAGMENTO ${index + 1} COMPLETO:</b> Selecciona Primasa para comenzar el fragmento ${state.fragment + 1}.`;
    }
  }
}

function handleFragmentClick(index) {
  if (state.phase === 3) {
    if (!state.selectedTool) {
      toast('Primero selecciona una enzima');
      return;
    }
    applyFragmentTool(state.selectedTool, index);
  }
  if (state.phase === 4 && state.selectedTool === 'pol1') {
    const expected = state.fragmentSteps.findIndex(value => value === 2);
    if (index === expected) replacePrimer(index);
    else toast(`Continúa con el fragmento ${expected + 1}, que está resaltado`);
  }
  if (state.phase === 4 && state.selectedTool === 'ligase') ligateFragment(index);
}

function replacePrimer(index) {
  state.fragmentSteps[index] = 3;
  $(`.fragment[data-index="${index}"]`).classList.add('replaced');
  toast(`ARN ${index + 1} reemplazado por ADN`);
  if (state.fragmentSteps.every(step => step >= 3)) {
    setTools(['ligase']);
    $('#instruction').querySelector('p').innerHTML = '<b>ARN REEMPLAZADO:</b> Ahora selecciona la Ligasa y sella cada muesca visible.';
  } else {
    setTools(['pol1']);
    keepToolSelected('pol1');
    $('#instruction').querySelector('p').innerHTML = '<b>REEMPLAZO CORRECTO:</b> ADN Pol I sigue activa. Haz clic en el siguiente fragmento resaltado.';
  }
  finishProgress();
}

function ligateFragment(index) {
  if (state.phase !== 4) return;
  if (state.fragmentSteps[index] < 3) {
    toast('La Ligasa no puede sellar ARN: usa primero ADN Pol I');
    return;
  }
  if (state.fragmentSteps[index] === 3) {
    const expected = state.fragmentSteps.findIndex(value => value === 3);
    if (index !== expected) {
      toast(`Sella primero la muesca resaltada del fragmento ${expected + 1}`);
      return;
    }
    state.fragmentSteps[index] = 4;
    $(`.fragment[data-index="${index}"]`).classList.add('ligated');
    beep(700);
    toast(`Muesca ${index + 1} sellada`);
    if (!state.fragmentSteps.every(s => s === 4)) {
      setTools(['ligase']);
      keepToolSelected('ligase');
    }
    finishProgress();
  }
}

function highlightTargets() {
  $$('.fragment').forEach(fragment => {
    const step = state.fragmentSteps[Number(fragment.dataset.index)];
    const index = Number(fragment.dataset.index);
    const firstPol1Target = state.fragmentSteps.findIndex(value => value === 2);
    const firstLigaseTarget = state.fragmentSteps.findIndex(value => value === 3);
    const compatible = (state.phase === 3 && index === state.fragment && state.selectedTool === 'primase' && step === 0)
      || (state.phase === 3 && index === state.fragment && state.selectedTool === 'pol3' && step === 1)
      || (state.phase === 4 && index === firstPol1Target && state.selectedTool === 'pol1' && step === 2)
      || (state.phase === 4 && index === firstLigaseTarget && state.selectedTool === 'ligase' && step === 3);
    fragment.classList.toggle('target-ready', compatible);
  });
}

function finishProgress() {
  const progress = state.fragmentSteps.reduce((sum, step) => sum + Math.max(0, step - 2), 0) / 6 * 100;
  setPhaseProgress(progress);
  if (state.fragmentSteps.every(s => s === 4)) {
    $('#nextButton').disabled = false;
    $('#instruction').querySelector('p').innerHTML = '<b>CADENA SELLADA:</b> La Ligasa formó enlaces fosfodiéster y eliminó todas las muescas.';
  }
}

function runScanner() {
  $('#scannerLine').classList.add('scanning');
  setPhaseProgress(15);
  let progress = 15;
  const scan = setInterval(() => {
    progress += 4;
    setPhaseProgress(progress);
    if (progress >= 100) {
      clearInterval(scan);
      const corrected = state.mistakes + 1;
      $('#errorsFixed').textContent = corrected;
      const finalScore = Math.max(91, Math.round(100 - state.mistakes * 1.2));
      $('#resultScore').textContent = finalScore;
      $('#resultMessage').textContent = finalScore >= 98
        ? 'La actividad exonucleasa corrigió los desajustes y conservó la información genética con excelente precisión.'
        : 'La exonucleasa corrigió la mayoría de los desajustes. Una mejor coordinación enzimática elevará la fidelidad.';
      $('#nextButton').disabled = false;
      $('#nextButton').innerHTML = 'VER RESULTADO <span>→</span>';
      $('.action-row').classList.add('result-ready');
      $('#instruction').querySelector('p').innerHTML = `<b>PRUEBA SUPERADA:</b> Se corrigieron ${corrected} desajustes antes de liberar las moléculas hijas.`;
      beep(830, .15);
    }
  }, 105);
}

function nextPhase() {
  if (state.phase < 5) configurePhase(state.phase + 1);
  else showResult();
}

function showResult() {
  state.finished = true;
  $('#result').classList.remove('hidden');
  $('#result').scrollIntoView({ behavior: 'smooth' });
}

function reset() { window.location.reload(); }

createDna();
$('#startButton').addEventListener('click', () => {
  document.body.classList.add('simulation-active');
  $('#simulador').scrollIntoView({ behavior: 'smooth' });
});
$('#soundToggle').addEventListener('click', event => {
  state.audio = !state.audio;
  event.currentTarget.setAttribute('aria-pressed', String(state.audio));
  if (state.audio) beep(620, .08);
});
$('#helicaseSlider').addEventListener('input', event => handleHelicase(event.target.value));
$('#topoButton').addEventListener('click', () => {
  state.tension = Math.max(4, state.tension - 44);
  state.topoUsed = true;
  const schematic = $('#topoSchematic');
  schematic.classList.remove('tense', 'critical', 'released');
  schematic.classList.add('releasing');
  $('#instruction').classList.remove('error');
  $('#topoState').textContent = 'Corte, giro y resellado';
  updateTension();
  openingProgress();
  beep(390);
  toast('Superenrollamiento liberado');
  setTimeout(() => {
    schematic.classList.remove('releasing');
    schematic.classList.add('released');
    $('#topoState').textContent = 'Tensión liberada';
  }, 900);
});
$$('#ssbSlots button').forEach(button => button.addEventListener('click', () => {
  if (!button.classList.contains('available') || button.classList.contains('placed')) return;
  state.ssb.add(button.dataset.slot);
  button.classList.add('placed');
  button.textContent = 'SSB colocada';
  if ($$('.ssb-slots button:not(.placed)').length === 0) {
    $('#instruction').querySelector('p').innerHTML = '<b>HEBRAS ESTABILIZADAS:</b> Las tres SSB están colocadas. Termina de mover la Helicasa y libera la tensión cuando el control se habilite.';
  }
  beep(660);
  openingProgress();
}));
$$('#toolDock button').forEach(button => {
  button.addEventListener('click', () => !button.disabled && selectTool(button.dataset.tool));
  button.addEventListener('dragstart', event => {
    if (button.dataset.tool === 'ligase' && !button.disabled) {
      state.selectedTool = 'ligase';
      event.dataTransfer.setData('text/plain', 'ligase');
    }
  });
});
$('#polymerase').addEventListener('pointerdown', startLeading);
window.addEventListener('pointerup', stopLeading);
window.addEventListener('pointercancel', stopLeading);
$('#nextButton').addEventListener('click', nextPhase);
$('#restartButton').addEventListener('click', reset);
updateTension();
