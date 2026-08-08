/**
 * Moteur Python - Pyodide (lazy loading)
 */
class PythonEngine {
  constructor() {
    this.pyodide = null;
    this.loading = false;
  }

  async load() {
    if (this.pyodide) return this.pyodide;
    if (this.loading) {
      while (this.loading) await new Promise((r) => setTimeout(r, 200));
      return this.pyodide;
    }
    this.loading = true;
    let script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    let loadPyodide = window.loadPyodide;
    this.pyodide = await loadPyodide();
    this.loading = false;
    return this.pyodide;
  }

  async run(code, consoleEl) {
    let py = await this.load();
    let output = '';
    py.globals.set('print', (text) => { output += text + '\n'; });
    try {
      await py.runPythonAsync(code);
      consoleEl.innerHTML = '<div class="console-prompt">>>> Execute</div><div class="console-output">' + (output || '(aucune sortie)') + '</div>';
    } catch (err) {
      consoleEl.innerHTML += '<div class="console-error">Erreur : ' + err.message + '</div>';
    }
  }

  async check(code, panel, exercise, appInstance) {
    await this.load();
    let score = 0;
    let total = 0;
    let html = '<div style="font-weight:700; margin-bottom:12px;">Resultats des tests</div>';

    for (let test of exercise.tests || []) {
      total += test.points || 1;
      let pass = false;
      try {
        let fullCode = code + '\n' + test.code;
        await this.pyodide.runPythonAsync(fullCode);
        pass = true;
      } catch (e) {
        pass = false;
      }
      if (pass) score += test.points || 1;
      html += '<div class="test-item">' +
        '<div class="test-status ' + (pass ? 'pass' : 'fail') + '">' + (pass ? '✓' : '✕') + '</div>' +
        '<div class="test-name">' + test.name + '</div>' +
        '<div class="test-points">' + (pass ? test.points || 1 : 0) + ' / ' + (test.points || 1) + '</div></div>';
    }

    html += '<div class="score-display">Score : <span class="score-value">' + score + '</span> <span class="score-total">/ ' + total + '</span></div>';
    panel.innerHTML = html;

    if (!appInstance.progress.exercises) appInstance.progress.exercises = {};
    if (score === total) {
      appInstance.progress.exercises[exercise.id] = { score: score, total: total, date: new Date().toISOString() };
      appInstance.saveProgress();
    }
  }
}

window.pythonEngine = new PythonEngine();
