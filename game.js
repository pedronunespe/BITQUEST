// BitQuest: batalha em turnos movida por perguntas (8-bit medieval)
const $ = id => document.getElementById(id);
const SAVE_KEY = "bitquest_sp3_v3";
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- Motor de sprites (troca de quadros via JS: funciona em qualquer navegador) ----------
const SHEETS = {
  hero:  { dir: "soldier", idle: ["Soldier_Idle", 6], attack: ["Soldier_Attack01", 6], hit: ["Soldier_Hit", 5], dead: ["Soldier_Death", 4] },
  enemy: { dir: "orc",     idle: ["Orc_Idle", 6],     attack: ["Orc_Attack01", 6],     hit: ["Orc_Hit", 5],     dead: ["Orc_Death", 4] }
};
class Sprite {
  constructor(el, sheet) { this.el = el; this.sheet = sheet; this.timer = null; }
  play(name, { loop = false, fps = 8 } = {}) {
    clearInterval(this.timer);
    const [file, n] = this.sheet[name]; let f = 0;
    this.el.style.backgroundImage = `url("assets/${this.sheet.dir}/${file}.png")`;
    return new Promise(done => {
      const tick = () => {
        if (f >= n) { if (loop) f = 0; else { clearInterval(this.timer); return done(); } }
        this.el.style.backgroundPosition = `${-f * 100}px 0px`; f++;
      };
      tick(); this.timer = setInterval(tick, 1000 / fps);
      if (loop) done();
    });
  }
  idle() { return this.play("idle", { loop: true, fps: 7 }); }
}

const G = {
  save: { stars: STAGES.map(() => 0) },
  st: null, sp: {},

  init() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.stars) this.save.stars = STAGES.map((_, i) => s.stars[i] || 0); } catch (e) {}
    this.sp.hero = new Sprite($("hero"), SHEETS.hero); this.sp.enemy = new Sprite($("enemy"), SHEETS.enemy);
    $("btn-sound").onclick = () => { soundFX.init(); $("btn-sound").textContent = soundFX.toggleMute() ? "MUDO" : "SOM"; };
    $("btn-reset").onclick = () => { if (confirm("Apagar todo o progresso?")) { this.save.stars = STAGES.map(() => 0); this.persist(); this.renderMap(); } };
    document.addEventListener("keydown", e => this.onKey(e));
    this.renderMap();
  },
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) {} },
  show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id)); },
  banner(t) { $("banner").textContent = t; },

  // ---------- MAPA ----------
  renderMap() {
    this.show("screen-map");
    const total = this.save.stars.reduce((a, b) => a + b, 0);
    $("stars-total").textContent = `★ ${total}/${STAGES.length * 3}`;
    $("stage-grid").innerHTML = STAGES.map((s, i) => {
      const open = i === 0 || this.save.stars[i - 1] > 0;
      const stars = [1, 2, 3].map(n => `<span class="${n > this.save.stars[i] ? "off" : ""}">★</span>`).join("");
      return `<button class="stage" ${open ? "" : "disabled"} data-i="${i}">
        <div class="num">${open ? i + 1 : "?"}</div>
        <div><small>${s.cap}</small><h3>${s.name}</h3><p>${s.sub}</p></div>
        <div class="stars">${stars}</div></button>`;
    }).join("");
    document.querySelectorAll(".stage").forEach(b => b.onclick = () => this.start(+b.dataset.i));
  },

  // ---------- BATALHA ----------
  start(i) {
    soundFX.init();
    const pool = QUESTIONS.filter(q => q.s === i);
    this.st = { i, hp: 100, mp: 40, foe: 100, combo: 0, shield: false, queue: shuffle(pool), pool, busy: false, mode: "menu" };
    $("overlay").classList.remove("on");
    $("stage-label").textContent = `FASE ${i + 1} · ${STAGES[i].name}`;
    $("enemy-name").textContent = STAGES[i].foe;
    $("enemy").style.filter = `hue-rotate(${STAGES[i].hue}deg)`;
    ["hero", "enemy"].forEach(w => $("fighter-" + w).className = "fighter " + w);
    this.show("screen-battle"); this.sp.hero.idle(); this.sp.enemy.idle();
    this.update(); this.menu();
  },
  async anim(who, name, fps = 12) {
    await this.sp[who].play(name, { fps });
    if (name !== "dead") this.sp[who].idle();
  },
  float(who, txt, cls) { const f = $("float-" + who); f.textContent = txt; f.className = "float"; void f.offsetWidth; f.className = "float show " + cls; },
  async flash(who) { const f = $("fighter-" + who); f.classList.add("flash"); await wait(140); f.classList.remove("flash"); },
  update() {
    const s = this.st;
    $("hero-hp").style.width = s.hp + "%"; $("hero-hp-t").textContent = `HP ${s.hp}/100`;
    $("hero-mp").style.width = Math.min(100, s.mp / 60 * 100) + "%"; $("hero-mp-t").textContent = `MP ${s.mp}/60`;
    $("enemy-hp").style.width = s.foe + "%"; $("enemy-hp-t").textContent = `HP ${s.foe}/100`;
    $("combo").textContent = s.combo >= 2 ? `COMBO x${s.combo}` : "";
    $("shield").textContent = s.shield ? "ESCUDO ATIVO" : "";
  },
  menu() {
    const s = this.st; s.mode = "menu"; s.busy = false;
    this.banner("Escolha um comando. Todo golpe depende de uma resposta certa.");
    $("panel").innerHTML = `<div class="menu">
      <button class="cmd" data-c="attack"><b>1 · ATACAR</b><small>Acerte a pergunta e cause 34 de dano</small></button>
      <button class="cmd" data-c="skill" ${s.mp < 20 ? "disabled" : ""}><b>2 · GOLPE SUPREMO</b><small>20 MP · dano dobrado (67) se acertar</small></button>
      <button class="cmd" data-c="guard"><b>3 · ESCUDO</b><small>Acerte para bloquear o próximo golpe e ganhar 15 MP</small></button>
      <button class="cmd" data-c="flee"><b>VOLTAR AO MAPA</b><small>Abandonar esta batalha</small></button></div>`;
    document.querySelectorAll(".cmd").forEach(b => b.onclick = () => this.command(b.dataset.c));
  },
  command(c) {
    const s = this.st;
    if (s.busy || s.mode !== "menu") return;
    if (c === "flee") return this.renderMap();
    if (c === "skill" && s.mp < 20) return;
    soundFX.playClick(); s.cmd = c;
    this.banner({ attack: "Um golpe de espada contra o inimigo.", skill: "Golpe Supremo: gasta 20 MP para um ataque devastador.", guard: "Escudo: bloqueia o próximo ataque inimigo." }[c]);
    if (!s.queue.length) s.queue = shuffle(s.pool);
    s.q = s.queue.pop();
    s.order = shuffle(s.q.a.map((t, k) => ({ t, ok: k === 0 })));
    s.mode = "question";
    $("panel").innerHTML = `<div class="q-meta"><span>${STAGES[s.i].name.toUpperCase()}</span><span>TECLAS A-D</span></div>
      <div class="q-text">${s.q.q}</div>
      <div class="opts">${s.order.map((o, k) => `<button class="opt" data-k="${k}"><kbd>${"ABCD"[k]}</kbd>${o.t}</button>`).join("")}</div>`;
    document.querySelectorAll(".opt").forEach(b => b.onclick = () => this.answer(+b.dataset.k));
  },
  async answer(k) {
    const s = this.st;
    if (s.mode !== "question" || s.busy) return;
    s.busy = true; s.mode = "feedback";
    const ok = s.order[k].ok;
    document.querySelectorAll(".opt").forEach((b, n) => { b.disabled = true; if (s.order[n].ok) b.classList.add("ok"); else if (n === k) b.classList.add("bad"); });
    $("panel").insertAdjacentHTML("beforeend", `<div class="explain"><b class="${ok ? "ok" : "bad"}">${ok ? "CORRETO!" : "ERROU!"}</b>${s.q.e}</div>`);
    if (ok) {
      s.combo++; soundFX.playCorrect();
      if (s.cmd === "guard") { s.shield = true; s.mp = Math.min(60, s.mp + 15); soundFX.playDefend(); this.float("hero", "+15 MP", "info"); }
      else {
        const dmg = s.cmd === "skill" ? 67 : 34;
        if (s.cmd === "skill") { s.mp -= 20; soundFX.playMagic(); } else soundFX.playAttack();
        $("fighter-hero").classList.add("lunge"); await wait(200);
        const swing = this.anim("hero", "attack", 14); await wait(260);
        s.foe = Math.max(0, s.foe - dmg); this.float("enemy", `-${dmg}`, "dmg"); this.update();
        $("arena").classList.add("shake"); setTimeout(() => $("arena").classList.remove("shake"), 300);
        this.flash("enemy"); this.anim("enemy", s.foe ? "hit" : "dead", 10);
        await swing; $("fighter-hero").classList.remove("lunge");
      }
      if (s.combo % 3 === 0) { s.mp = Math.min(60, s.mp + 10); this.float("hero", "COMBO +10 MP", "info"); }
    } else {
      s.combo = 0; soundFX.playWrong();
      if (s.cmd === "skill") s.mp -= 20;
      await wait(300); await this.enemyTurn();
    }
    this.update();
    const end = s.foe <= 0 || s.hp <= 0;
    $("panel").insertAdjacentHTML("beforeend", `<button class="btn" id="btn-next">${end ? "VER RESULTADO" : "CONTINUAR"} [ENTER]</button>`);
    $("btn-next").onclick = () => this.next();
    s.busy = false;
  },
  async enemyTurn() {
    const s = this.st;
    $("fighter-enemy").classList.add("lunge"); await wait(200);
    const swing = this.anim("enemy", "attack", 14); await wait(260);
    if (s.shield) { s.shield = false; this.float("hero", "BLOQUEADO!", "info"); soundFX.playDefend(); }
    else {
      s.hp = Math.max(0, s.hp - 25); this.float("hero", "-25", "dmg"); soundFX.playAttack(); this.update();
      $("arena").classList.add("shake"); setTimeout(() => $("arena").classList.remove("shake"), 300);
      this.flash("hero"); this.anim("hero", s.hp ? "hit" : "dead", 10);
    }
    await swing; $("fighter-enemy").classList.remove("lunge");
  },
  next() {
    const s = this.st;
    if (s.mode !== "feedback" || s.busy) return;
    if (s.foe <= 0 || s.hp <= 0) return this.finish();
    this.menu();
  },
  finish() {
    const s = this.st, won = s.foe <= 0;
    const stars = won ? (s.hp >= 75 ? 3 : s.hp >= 50 ? 2 : 1) : 0;
    if (won) { this.save.stars[s.i] = Math.max(this.save.stars[s.i], stars); this.persist(); soundFX.playVictory(); } else soundFX.playDefeat();
    const last = s.i === STAGES.length - 1;
    $("card").innerHTML = `<h2>${won ? "FASE CONCLUÍDA!" : "VOCÊ CAIU EM BATALHA"}</h2>
      <p>${won ? `Vida restante: ${s.hp}/100.` : "Releia o capítulo e tente de novo. As explicações ajudam a fixar."}</p>
      <div class="big-stars">${won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆"}</div>
      <div class="row"><button class="btn sec" id="o-retry">TENTAR DE NOVO</button>
      ${won && !last ? `<button class="btn" id="o-next">PRÓXIMA FASE</button>` : ""}<button class="btn sec" id="o-map">MAPA</button></div>`;
    $("overlay").classList.add("on");
    $("o-retry").onclick = () => this.start(s.i);
    if ($("o-next")) $("o-next").onclick = () => this.start(s.i + 1);
    $("o-map").onclick = () => { $("overlay").classList.remove("on"); this.renderMap(); };
  },
  onKey(e) {
    if (!this.st || !$("screen-battle").classList.contains("active") || $("overlay").classList.contains("on")) return;
    const s = this.st, k = e.key.toLowerCase();
    if (s.mode === "menu" && ["1", "2", "3"].includes(k)) this.command(["attack", "skill", "guard"][+k - 1]);
    else if (s.mode === "question" && ["a", "b", "c", "d"].includes(k)) this.answer("abcd".indexOf(k));
    else if (s.mode === "feedback" && e.key === "Enter") this.next();
  }
};
G.init();
