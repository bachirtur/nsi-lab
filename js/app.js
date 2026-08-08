/**
 * NSI LAB - Moteur principal
 * Architecture modulaire : moteur separe du contenu
 */

class App {
  constructor() {
    this.structure = null;
    this.currentPage = 'home';
    this.theme = localStorage.getItem('nsi-theme') || 'light';
    this.progress = this.loadProgress();
    this.searchIndex = [];
    this.pyodide = null;
    this.sqlEngine = null;
    this.codeMirrorInstance = null;
    this.init();
  }

  async init() {
    this.applyTheme();
    await this.loadStructure();
    this.buildSearchIndex();
    this.renderSidebar();
    this.setupEventListeners();
    this.handleRoute();
  }

  async loadStructure() {
    try {
      const resp = await fetch('data/structure.json');
      this.structure = await resp.json();
    } catch (e) {
      console.error('Erreur chargement structure:', e);
      this.structure = { program: { modules: [] }, projects: [] };
    }
  }

  async loadJSON(path) {
    try {
      const resp = await fetch(path);
      return await resp.json();
    } catch (e) {
      console.error('Erreur chargement', path, e);
      return null;
    }
  }

  async loadExercise(exerciseId) {
    return await this.loadJSON('exercises/terminale/' + exerciseId + '.json');
  }

  async loadSeries(seriesId) {
    return await this.loadJSON('series/terminale/' + seriesId + '.json');
  }

  navigate(page, params) {
    params = params || {};
    this.currentPage = page;
    let hash = '#' + page;
    let q = new URLSearchParams();
    for (let k in params) q.set(k, params[k]);
    let qs = q.toString();
    if (qs) hash += '?' + qs;
    window.location.hash = hash;
    this.handleRoute();
  }

  handleRoute() {
    let hash = window.location.hash.slice(1) || 'home';
    let parts = hash.split('?');
    let page = parts[0];
    let params = new URLSearchParams(parts[1] || '');
    this.currentPage = page;
    this.updateNavActive();

    switch (page) {
      case 'home': this.renderHome(); break;
      case 'courses': this.renderCourses(); break;
      case 'course': this.renderCourse(params.get('module'), params.get('chapter')); break;
      case 'lesson': this.renderLesson(params.get('module'), params.get('chapter'), params.get('lesson')); break;
      case 'exercises': this.renderExercisesList(); break;
      case 'exercise': this.renderExercise(params.get('id')); break;
      case 'series': this.renderSeriesList(); break;
      case 'serie': this.renderSerie(params.get('id')); break;
      case 'projects': this.renderProjects(); break;
      case 'revision': this.renderRevision(); break;
      case 'progress': this.renderProgress(); break;
      default: this.renderHome();
    }
    window.scrollTo(0, 0);
  }

  updateNavActive() {
    document.querySelectorAll('.nav-main a').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === this.currentPage);
    });
  }

  renderSidebar() {
    let container = document.getElementById('sidebarContent');
    if (!this.structure || !this.structure.program) return;

    let html = '<div class="sidebar-section"><div class="sidebar-title">📚 ' + this.structure.program.title + '</div>';

    for (let m of this.structure.program.modules) {
      let expanded = this.progress.expandedModules && this.progress.expandedModules.indexOf(m.id) !== -1 ? 'expanded' : '';
      html += '<div class="module-header ' + expanded + '" onclick="app.toggleModule(\'' + m.id + '\')">' +
        '<span class="module-icon">' + m.icon + '</span>' +
        '<span>' + m.title.replace(/^Module \d+ — /, '') + '</span>' +
        '<span class="chevron">▶</span></div>' +
        '<div class="chapter-list ' + (expanded ? 'open' : '') + '" id="module-' + m.id + '">';
      for (let ch of m.chapters) {
        html += '<a href="#" class="chapter-item" onclick="app.navigate(\'course\', {module:\'' + m.id + '\',chapter:\'' + ch.id + '\'}); return false;">' + ch.title + '</a>';
      }
      html += '</div>';
    }

    html += '</div><div class="sidebar-section">' +
      '<a href="#" class="sidebar-link" onclick="app.navigate(\'projects\'); return false;"><span class="icon">🎯</span> Projets</a>' +
      '<a href="#" class="sidebar-link" onclick="app.navigate(\'revision\'); return false;"><span class="icon">📝</span> Révisions</a>' +
      '<a href="#" class="sidebar-link" onclick="app.navigate(\'progress\'); return false;"><span class="icon">🏆</span> Progression</a>' +
      '</div>';

    container.innerHTML = html;
  }

  toggleModule(moduleId) {
    let list = document.getElementById('module-' + moduleId);
    let header = list.previousElementSibling;
    let isOpen = list.classList.toggle('open');
    header.classList.toggle('expanded', isOpen);
    if (!this.progress.expandedModules) this.progress.expandedModules = [];
    if (isOpen) {
      if (this.progress.expandedModules.indexOf(moduleId) === -1) this.progress.expandedModules.push(moduleId);
    } else {
      this.progress.expandedModules = this.progress.expandedModules.filter((m) => m !== moduleId);
    }
    this.saveProgress();
  }

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    let overlay = document.getElementById('mobileOverlay');
    overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
  }

  renderHome() {
    let main = document.getElementById('mainContent');
    let modulesHtml = '';
    for (let m of this.structure.program.modules) {
      modulesHtml += '<div class="module-card" onclick="app.navigate(\'courses\', {module:\'' + m.id + '\'})">' +
        '<div class="icon">' + m.icon + '</div><h3>' + m.title + '</h3>' +
        '<p>' + m.chapters.length + ' chapitres · ' + this.getModuleProgress(m.id) + '% complete</p></div>';
    }
    let projectsHtml = '';
    for (let p of this.structure.projects) {
      projectsHtml += '<div class="module-card" onclick="app.navigate(\'projects\')"><h3>' + p.title + '</h3></div>';
    }
    main.innerHTML = '<div class="page-header fade-in"><h1>Bienvenue sur NSI LAB 🧠</h1>' +
      '<p>Plateforme pedagogique interactive pour la Terminale NSI.</p></div>' +
      '<div class="card-grid fade-in">' + modulesHtml + '</div>' +
      '<div class="card mt-3 fade-in"><div class="card-header"><span class="card-title">🎯 Projets Terminale</span></div>' +
      '<div class="card-grid">' + projectsHtml + '</div></div>';
  }

  renderCourses() {
    let main = document.getElementById('mainContent');
    let html = '<div class="page-header fade-in"><h1>📚 Cours Terminale NSI</h1><p>Accedez a l ensemble du programme officiel.</p></div><div class="fade-in">';
    for (let m of this.structure.program.modules) {
      html += '<div class="card"><div class="card-header"><span class="card-title">' + m.icon + ' ' + m.title + '</span></div>' +
        '<div style="display:flex; flex-direction:column; gap:8px;">';
      for (let ch of m.chapters) {
        html += '<a href="#" class="chapter-item" style="border-left:none; padding-left:12px;" onclick="app.navigate(\'course\', {module:\'' + m.id + '\',chapter:\'' + ch.id + '\'}); return false;">' + ch.title + '</a>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    main.innerHTML = html;
  }

  async renderCourse(moduleId, chapterId) {
    let main = document.getElementById('mainContent');
    if (!moduleId || !chapterId) { this.renderCourses(); return; }

    let module = this.structure.program.modules.find((m) => m.id === moduleId);
    let chapter = module ? module.chapters.find((c) => c.id === chapterId) : null;
    if (!chapter) { main.innerHTML = '<div class="card">Chapitre non trouve</div>'; return; }

    let lessons = [];
    if (chapterId === 'chapitre-03') {
      let known = ['lecon-sql-01','lecon-sql-02','lecon-sql-03','lecon-sql-04','lecon-sql-05'];
      for (let k of known) {
        let l = await this.loadJSON('content/terminale/' + moduleId + '/' + chapterId + '/' + k + '.json');
        if (l) lessons.push(l);
      }
    }
    if (chapterId === 'chapitre-05') {
      let known = ['lecon-listes-01','lecon-piles-01','lecon-files-01','lecon-impl-01','lecon-appli-01'];
      for (let k of known) {
        let l = await this.loadJSON('content/terminale/' + moduleId + '/' + chapterId + '/' + k + '.json');
        if (l) lessons.push(l);
      }
    }
    lessons.sort((a, b) => (a.order || 0) - (b.order || 0));

    let lessonsHtml = lessons.length === 0 ? '<div class="card">Lecons en cours de redaction...</div>' : '';
    for (let l of lessons) {
      lessonsHtml += '<div class="card" style="cursor:pointer;" onclick="app.navigate(\'lesson\', {module:\'' + moduleId + '\',chapter:\'' + chapterId + '\',lesson:\'' + l.id + '\'})">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<div><div style="font-weight:700; font-size:1.05rem; margin-bottom:4px;">' + l.title + '</div>' +
        '<div style="font-size:0.85rem; color:var(--text-secondary);">' + (l.summary || '') + '</div></div>' +
        '<span style="font-size:1.5rem;">→</span></div></div>';
    }

    main.innerHTML = '<div class="page-header fade-in"><div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:4px;">' + module.title + '</div>' +
      '<h1>' + chapter.title + '</h1></div><div class="fade-in">' + lessonsHtml + '</div>';
  }

  async renderLesson(moduleId, chapterId, lessonId) {
    let main = document.getElementById('mainContent');
    let lesson = await this.loadJSON('content/terminale/' + moduleId + '/' + chapterId + '/' + lessonId + '.json');
    if (!lesson) { main.innerHTML = '<div class="card">Lecon non trouvee</div>'; return; }

    this.markLessonRead(lessonId);
    let contentHtml = marked.parse(lesson.content || '');

    let objectivesHtml = lesson.objectives && lesson.objectives.length ?
      '<div class="objectives-box"><h3>🎯 Objectifs</h3><ul>' +
      lesson.objectives.map((o) => '<li>' + o + '</li>').join('') + '</ul></div>' : '';

    let examplesHtml = lesson.examples && lesson.examples.length ?
      '<div class="card"><div class="card-title">💡 Exemples</div>' +
      lesson.examples.map((ex) => '<div style="margin:16px 0;"><div style="font-weight:600; margin-bottom:8px;">' + ex.title + '</div>' +
      '<pre><code>' + ex.code + '</code></pre><p style="font-size:0.9rem; color:var(--text-secondary); margin-top:8px;">' + ex.explanation + '</p></div>').join('') + '</div>' : '';

    let activitiesHtml = lesson.activities && lesson.activities.length ?
      '<div class="card"><div class="card-title">🧪 Activites</div>' +
      lesson.activities.map((a) => '<div style="margin:16px 0; padding:16px; background:var(--bg); border-radius:var(--radius-sm);">' +
      '<div style="font-weight:600; margin-bottom:8px;">' + a.title + '</div><p>' + a.instruction + '</p></div>').join('') + '</div>' : '';

    let seriesHtml = lesson.exerciseSeries && lesson.exerciseSeries.length ?
      '<div class="card"><div class="card-title">📝 Exercices associes</div><div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">' +
      lesson.exerciseSeries.map((sid) => '<a href="#" class="btn btn-secondary btn-sm" style="justify-content:center;" onclick="app.navigate(\'serie\',{id:\'' + sid + '\'}); return false;">Serie ' + sid + '</a>').join('') + '</div></div>' : '';

    let summaryHtml = lesson.summary ?
      '<div class="card" style="background:linear-gradient(135deg, var(--surface), var(--bg)); border-color:var(--primary);">' +
      '<div class="card-title">📌 A retenir</div><p style="margin-top:8px;">' + lesson.summary + '</p></div>' : '';

    main.innerHTML = '<div class="page-header fade-in"><div style="font-size:0.85rem; color:var(--text-muted);">' +
      '<a href="#" onclick="app.navigate(\'course\',{module:\'' + moduleId + '\',chapter:\'' + chapterId + '\'}); return false;" style="color:var(--primary);">← Retour au chapitre</a></div>' +
      '<h1>' + lesson.title + '</h1></div><div class="lesson-content fade-in">' + objectivesHtml +
      '<div class="card">' + contentHtml + '</div>' + examplesHtml + activitiesHtml + seriesHtml + summaryHtml + '</div>';
  }

  async renderExercisesList() {
    let main = document.getElementById('mainContent');
    let exerciseIds = ['sql-001','sql-002','sql-003','sql-004','sql-005','pile-001','pile-002','pile-003','pile-004','file-001'];
    let exercises = [];
    for (let id of exerciseIds) {
      let ex = await this.loadExercise(id);
      if (ex) exercises.push(ex);
    }

    main.innerHTML = '<div class="page-header fade-in"><h1>💻 Exercices</h1><p>Entrainez-vous avec des exercices interactifs corriges.</p></div>' +
      '<div class="card-grid fade-in">' +
      exercises.map((ex) => '<div class="card" style="cursor:pointer;" onclick="app.navigate(\'exercise\',{id:\'' + ex.id + '\'})">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">' +
      '<span class="tag tag-' + ex.language + '">' + ex.language.toUpperCase() + '</span>' +
      '<span class="difficulty">' + '⭐'.repeat(ex.difficulty || 1) + '</span></div>' +
      '<div style="font-weight:700; margin-bottom:6px;">' + ex.title + '</div>' +
      '<div style="font-size:0.85rem; color:var(--text-secondary);">' + ex.points + ' points</div></div>').join('') + '</div>';
  }

  async renderExercise(exerciseId) {
    let main = document.getElementById('mainContent');
    let ex = await this.loadExercise(exerciseId);
    if (!ex) { main.innerHTML = '<div class="card">Exercice non trouve</div>'; return; }

    let isSql = ex.type === 'sql';
    let isPython = ex.language === 'python';

    main.innerHTML = '<div class="page-header fade-in"><div style="font-size:0.85rem; color:var(--text-muted);">' +
      '<a href="#" onclick="app.navigate(\'exercises\'); return false;" style="color:var(--primary);">← Retour aux exercices</a></div>' +
      '<h1>' + ex.title + '</h1><div style="display:flex; gap:12px; align-items:center; margin-top:8px;">' +
      '<span class="tag tag-' + ex.language + '">' + ex.language.toUpperCase() + '</span>' +
      '<span class="difficulty">' + '⭐'.repeat(ex.difficulty || 1) + '</span>' +
      '<span style="font-size:0.85rem; color:var(--text-muted);">' + ex.points + ' points</span></div></div>' +
      '<div class="exercise-container fade-in"><div class="exercise-statement"><h3 style="margin-bottom:12px;">Enonce</h3>' +
      '<div style="color:var(--text-secondary);">' + marked.parse(ex.statement) + '</div>' +
      (isSql ? '<div id="sqlSchema" class="sql-schema" style="margin-top:20px;"></div>' : '') + '</div>' +
      '<div class="exercise-workspace"><div class="editor-container">' +
      '<div class="editor-toolbar">' +
      '<button class="btn btn-primary btn-sm" onclick="app.runCode()">▶ Executer</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="app.checkCode()">🧪 Verifier</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="app.showHint()">💡 Indice</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="app.showSolution()">👁 Correction</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="app.resetCode()">↻ Reinitialiser</button></div>' +
      '<textarea id="codeEditor">' + (ex.starterCode || '') + '</textarea>' +
      '<div class="console-area" id="consoleOutput"><div class="console-prompt">>>> Pret a executer</div></div></div>' +
      '<div id="testsPanel" class="tests-panel" style="display:none;"></div>' +
      '<div id="hintsPanel" class="hints-panel" style="display:none;"></div></div></div>';

    let self = this;
    setTimeout(function() {
      let textarea = document.getElementById('codeEditor');
      if (textarea && window.CodeMirror) {
        self.codeMirrorInstance = CodeMirror.fromTextArea(textarea, {
          mode: isSql ? 'text/x-sql' : (isPython ? 'python' : 'javascript'),
          theme: self.theme === 'dark' ? 'dracula' : 'default',
          lineNumbers: true,
          indentUnit: 4,
          autoCloseBrackets: true,
          matchBrackets: true,
          lineWrapping: true
        });
      }
    }, 50);

    this.currentExercise = ex;
    if (isSql) setTimeout(function() { self.initSqlEngine(); }, 100);
  }

  async runCode() {
    if (!this.currentExercise) return;
    let code = this.codeMirrorInstance ? this.codeMirrorInstance.getValue() : document.getElementById('codeEditor').value;
    let consoleEl = document.getElementById('consoleOutput');
    consoleEl.innerHTML = '<div class="console-prompt">>>> Execution...</div>';

    if (this.currentExercise.type === 'sql') {
      await this.runSql(code, consoleEl);
    } else if (this.currentExercise.language === 'python') {
      await this.runPython(code, consoleEl);
    } else {
      consoleEl.innerHTML += '<div class="console-output">Execution non supportee pour ce langage.</div>';
    }
  }

  async checkCode() {
    if (!this.currentExercise) return;
    let code = this.codeMirrorInstance ? this.codeMirrorInstance.getValue() : document.getElementById('codeEditor').value;
    let panel = document.getElementById('testsPanel');
    panel.style.display = 'block';

    if (this.currentExercise.type === 'sql') {
      await this.checkSql(code, panel);
    } else if (this.currentExercise.language === 'python') {
      await this.checkPython(code, panel);
    }
  }

  showHint() {
    let panel = document.getElementById('hintsPanel');
    let ex = this.currentExercise;
    if (!ex || !ex.hints || ex.hints.length === 0) return;
    let shown = panel.querySelectorAll('.hint-item').length;
    if (shown < ex.hints.length) {
      let hint = ex.hints[shown];
      let div = document.createElement('div');
      div.className = 'hint-item';
      div.innerHTML = '<strong>Indice ' + (shown + 1) + ' :</strong> ' + hint;
      panel.appendChild(div);
      panel.style.display = 'block';
    }
  }

  showSolution() {
    if (!this.currentExercise) return;
    if (confirm('Afficher la correction ? Utilisez les indices avant de regarder la solution.')) {
      if (this.codeMirrorInstance) {
        this.codeMirrorInstance.setValue(this.currentExercise.solution || '');
      } else {
        document.getElementById('codeEditor').value = this.currentExercise.solution || '';
      }
    }
  }

  resetCode() {
    if (!this.currentExercise) return;
    if (this.codeMirrorInstance) {
      this.codeMirrorInstance.setValue(this.currentExercise.starterCode || '');
    } else {
      document.getElementById('codeEditor').value = this.currentExercise.starterCode || '';
    }
    document.getElementById('consoleOutput').innerHTML = '<div class="console-prompt">>>> Pret a executer</div>';
    document.getElementById('testsPanel').style.display = 'none';
    document.getElementById('hintsPanel').innerHTML = '';
    document.getElementById('hintsPanel').style.display = 'none';
  }

  async renderSeriesList() {
    let main = document.getElementById('mainContent');
    let seriesIds = ['serie-sql-01','serie-sql-02','serie-piles-01','serie-piles-02'];
    let series = [];
    for (let id of seriesIds) {
      let s = await this.loadSeries(id);
      if (s) series.push(s);
    }

    main.innerHTML = '<div class="page-header fade-in"><h1>📋 Series d exercices</h1><p>Entrainez-vous par blocs thematiques.</p></div>' +
      '<div class="card-grid fade-in">' +
      series.map((s) => '<div class="card" style="cursor:pointer;" onclick="app.navigate(\'serie\',{id:\'' + s.id + '\'})">' +
      '<div style="font-weight:700; font-size:1.1rem; margin-bottom:6px;">' + s.title + '</div>' +
      '<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">' + s.description + '</div>' +
      '<div style="display:flex; gap:12px; font-size:0.8rem; color:var(--text-muted);">' +
      '<span>' + (s.exercises ? s.exercises.length : 0) + ' exercices</span>' +
      '<span>' + s.totalPoints + ' points</span>' +
      '<span>' + s.timeLimit + ' min</span></div></div>').join('') + '</div>';
  }

  async renderSerie(seriesId) {
    let main = document.getElementById('mainContent');
    let serie = await this.loadSeries(seriesId);
    if (!serie) { main.innerHTML = '<div class="card">Serie non trouvee</div>'; return; }

    let exercises = [];
    for (let exId of serie.exercises || []) {
      let ex = await this.loadExercise(exId);
      if (ex) exercises.push(ex);
    }

    main.innerHTML = '<div class="page-header fade-in"><div style="font-size:0.85rem; color:var(--text-muted);">' +
      '<a href="#" onclick="app.navigate(\'series\'); return false;" style="color:var(--primary);">← Retour aux series</a></div>' +
      '<h1>' + serie.title + '</h1><p>' + serie.description + '</p></div><div class="fade-in">' +
      exercises.map((ex, idx) => '<div class="card" style="cursor:pointer;" onclick="app.navigate(\'exercise\',{id:\'' + ex.id + '\'})">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<div><div style="font-weight:700;">Exercice ' + (idx + 1) + ' : ' + ex.title + '</div>' +
      '<div style="font-size:0.85rem; color:var(--text-secondary);">' + ex.points + ' points · ' + '⭐'.repeat(ex.difficulty || 1) + '</div></div>' +
      '<span class="tag tag-' + ex.language + '">' + ex.language.toUpperCase() + '</span></div></div>').join('') + '</div>';
  }

  renderProjects() {
    let main = document.getElementById('mainContent');
    main.innerHTML = '<div class="page-header fade-in"><h1>🎯 Projets Terminale NSI</h1><p>Projets pratiques pour mettre en application vos competences.</p></div>' +
      '<div class="card-grid fade-in">' +
      this.structure.projects.map((p) => '<div class="card"><div style="font-weight:700; font-size:1.1rem; margin-bottom:8px;">' + p.title + '</div>' +
      '<div style="font-size:0.85rem; color:var(--text-secondary);">Module associe : ' + p.module + '</div></div>').join('') + '</div>';
  }

  renderRevision() {
    let main = document.getElementById('mainContent');
    main.innerHTML = '<div class="page-header fade-in"><h1>📝 Revisions BAC</h1><p>Preparez votre epreuve avec des revisions ciblees.</p></div>' +
      '<div class="card fade-in"><div class="card-title">Filtres de revision</div>' +
      '<div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:16px;">' +
      '<button class="btn btn-primary">Revision rapide</button>' +
      '<button class="btn btn-secondary">Revision complete</button>' +
      '<button class="btn btn-secondary">Challenge</button>' +
      '<button class="btn btn-secondary">Sujet type Bac</button></div></div>' +
      '<div class="card-grid fade-in">' +
      this.structure.program.modules.map((m) => '<div class="card"><div style="font-weight:700; margin-bottom:8px;">' + m.icon + ' ' + m.title + '</div>' +
      '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + this.getModuleProgress(m.id) + '%"></div></div>' +
      '<div style="font-size:0.8rem; color:var(--text-muted); text-align:right;">' + this.getModuleProgress(m.id) + '%</div></div>').join('') + '</div>';
  }

  renderProgress() {
    let main = document.getElementById('mainContent');
    let totalExercises = Object.keys(this.progress.exercises || {}).length;
    let totalLessons = Object.keys(this.progress.lessons || {}).length;

    let badgesList = ['🐍 Python','🗄️ SQL','🌳 Arbres','🕸️ Graphes','🔁 Recursivite','🧠 Algorithmique','🌐 Reseaux','💻 Programmation','🏆 Expert NSI'];
    let badgesHtml = badgesList.map((b, i) => {
      let earned = (this.progress.badges || []).indexOf('badge-' + i) !== -1;
      return '<div class="badge-item ' + (earned ? 'earned' : '') + '">' +
        '<div class="badge-icon">' + b.split(' ')[0] + '</div>' +
        '<div class="badge-name">' + b.split(' ').slice(1).join(' ') + '</div></div>';
    }).join('');

    main.innerHTML = '<div class="page-header fade-in"><h1>🏆 Ma progression</h1><p>Suivez votre avancement dans le programme NSI.</p></div>' +
      '<div class="card-grid fade-in">' +
      '<div class="card text-center"><div style="font-size:2.5rem; font-weight:800; color:var(--primary);">' + totalLessons + '</div>' +
      '<div style="color:var(--text-secondary);">Lecons consultees</div></div>' +
      '<div class="card text-center"><div style="font-size:2.5rem; font-weight:800; color:var(--success);">' + totalExercises + '</div>' +
      '<div style="color:var(--text-secondary);">Exercices reussis</div></div>' +
      '<div class="card text-center"><div style="font-size:2.5rem; font-weight:800; color:var(--warning);">' + (this.progress.totalScore || 0) + '</div>' +
      '<div style="color:var(--text-secondary);">Score total</div></div></div>' +
      '<div class="card fade-in"><div class="card-title">Progression par module</div><div style="margin-top:16px;">' +
      this.structure.program.modules.map((m) => '<div class="progress-module"><div class="progress-module-header">' +
      '<span>' + m.icon + ' ' + m.title + '</span><span>' + this.getModuleProgress(m.id) + '%</span></div>' +
      '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + this.getModuleProgress(m.id) + '%"></div></div></div>').join('') + '</div></div>' +
      '<div class="card fade-in"><div class="card-title">🎖️ Badges</div>' +
      '<div class="badges-grid" style="margin-top:16px;">' + badgesHtml + '</div></div>';
  }

  buildSearchIndex() {
    this.searchIndex = [];
    if (!this.structure) return;
    for (let m of this.structure.program.modules) {
      this.searchIndex.push({ type: 'module', title: m.title, id: m.id, module: m.id });
      for (let c of m.chapters) {
        this.searchIndex.push({ type: 'chapitre', title: c.title, id: c.id, module: m.id, chapter: c.id });
      }
    }
    for (let p of this.structure.projects) {
      this.searchIndex.push({ type: 'projet', title: p.title, id: p.id });
    }
  }

  performSearch(query) {
    if (!query || query.length < 2) return [];
    let q = query.toLowerCase();
    return this.searchIndex.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 10);
  }

  loadProgress() {
    try {
      return JSON.parse(localStorage.getItem('nsi-progress')) || {};
    } catch { return {}; }
  }

  saveProgress() {
    localStorage.setItem('nsi-progress', JSON.stringify(this.progress));
  }

  markLessonRead(lessonId) {
    if (!this.progress.lessons) this.progress.lessons = {};
    this.progress.lessons[lessonId] = true;
    this.saveProgress();
  }

  getModuleProgress(moduleId) {
    return 0;
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    let btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = this.theme === 'dark' ? '🌙' : '☀️';
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nsi-theme', this.theme);
    this.applyTheme();
    if (this.codeMirrorInstance) {
      this.codeMirrorInstance.setOption('theme', this.theme === 'dark' ? 'dracula' : 'default');
    }
  }

  setupEventListeners() {
    window.addEventListener('hashchange', () => this.handleRoute());
    let themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());
    let menuBtn = document.getElementById('menuToggle');
    if (menuBtn) menuBtn.addEventListener('click', () => this.toggleSidebar());

    let searchInput = document.getElementById('globalSearch');
    let searchResults = document.getElementById('searchResults');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        let results = this.performSearch(e.target.value);
        if (results.length > 0) {
          searchResults.innerHTML = results.map((r) => {
            let navPage = r.type === 'chapitre' ? 'course' : (r.type === 'projet' ? 'projects' : 'courses');
            let params = '';
            if (r.module) params += 'module:\'' + r.module + '\'';
            if (r.chapter) params += ',chapter:\'' + r.chapter + '\'';
            return '<div class="search-result-item" onclick="app.navigate(\'' + navPage + '\', {' + params + '}); document.getElementById(\'searchResults\').classList.remove(\'open\');">' +
              '<div class="search-result-type">' + r.type + '</div>' +
              '<div class="search-result-title">' + r.title + '</div></div>';
          }).join('');
          searchResults.classList.add('open');
        } else {
          searchResults.classList.remove('open');
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) searchResults.classList.remove('open');
      });
    }

    if (window.innerWidth <= 768) {
      let mt = document.getElementById('menuToggle');
      if (mt) mt.style.display = 'flex';
    }
  }

  async runPython(code, consoleEl) { if (window.pythonEngine) await window.pythonEngine.run(code, consoleEl); }
  async checkPython(code, panel) { if (window.pythonEngine) await window.pythonEngine.check(code, panel, this.currentExercise, this); }
  async runSql(code, consoleEl) { if (window.sqlEngine) await window.sqlEngine.run(code, consoleEl); }
  async checkSql(code, panel) { if (window.sqlEngine) await window.sqlEngine.check(code, panel, this.currentExercise, this); }
  async initSqlEngine() { if (window.sqlEngine) await window.sqlEngine.init(document.getElementById('sqlSchema')); }
}

var app = new App();
