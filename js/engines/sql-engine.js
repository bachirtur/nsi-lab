/**
 * Moteur SQL - sql.js (SQLite WASM)
 */
class SqlEngine {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init(schemaContainer) {
    if (this.initialized) return;
    let SQL = await initSqlJs({ locateFile: (file) => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + file });
    this.db = new SQL.Database();

    this.db.run(
      "CREATE TABLE eleves (id INTEGER PRIMARY KEY, nom TEXT, prenom TEXT, classe TEXT, moyenne REAL);" +
      "CREATE TABLE classes (id INTEGER PRIMARY KEY, niveau TEXT, salle TEXT);" +
      "CREATE TABLE notes (id INTEGER PRIMARY KEY, eleve_id INTEGER, matiere TEXT, valeur REAL);" +
      "CREATE TABLE enseignants (id INTEGER PRIMARY KEY, nom TEXT, matiere TEXT);"
    );
    this.db.run(
      "INSERT INTO eleves VALUES (1, 'Dupont', 'Marie', 'Terminale', 14.5), (2, 'Martin', 'Luc', 'Terminale', 11.0), (3, 'Bernard', 'Anna', 'Premiere', 16.0), (4, 'Petit', 'Jean', 'Terminale', 9.5), (5, 'Robert', 'Lisa', 'Premiere', 13.0);"
    );
    this.db.run(
      "INSERT INTO classes VALUES (1, 'Terminale', 'A12'), (2, 'Premiere', 'B05');"
    );
    this.db.run(
      "INSERT INTO notes VALUES (1, 1, 'NSI', 15), (2, 1, 'Maths', 14), (3, 2, 'NSI', 10), (4, 3, 'NSI', 17), (5, 4, 'NSI', 8);"
    );
    this.db.run(
      "INSERT INTO enseignants VALUES (1, 'Durand', 'NSI'), (2, 'Leroy', 'Maths');"
    );

    this.initialized = true;
    if (schemaContainer) this.renderSchema(schemaContainer);
  }

  renderSchema(container) {
    let tables = ['eleves', 'classes', 'notes', 'enseignants'];
    let html = '<h4>📊 Schema de la base</h4>';
    for (let t of tables) {
      let res = this.db.exec("PRAGMA table_info(" + t + ")");
      html += '<div class="schema-table"><div class="schema-table-header">' + t + '</div>';
      if (res[0]) {
        for (let row of res[0].values) {
          html += '<div class="schema-table-row">' + row[1] + ' : ' + row[2] + (row[5] ? ' (PK)' : '') + '</div>';
        }
      }
      html += '</div>';
    }
    container.innerHTML = html;
  }

  async run(code, consoleEl) {
    if (!this.db) await this.init();
    try {
      let res = this.db.exec(code);
      let html = '<div class="console-prompt">>>> Resultat SQL</div>';
      if (res.length === 0) {
        html += '<div class="console-output">Requete executee avec succes (aucun retour).</div>';
      } else {
        for (let r of res) {
          html += '<table class="sql-result-table"><thead><tr>';
          for (let col of r.columns) html += '<th>' + col + '</th>';
          html += '</tr></thead><tbody>';
          for (let row of r.values) {
            html += '<tr>';
            for (let cell of row) html += '<td>' + (cell !== null ? cell : 'NULL') + '</td>';
            html += '</tr>';
          }
          html += '</tbody></table>';
        }
      }
      consoleEl.innerHTML = html;
    } catch (err) {
      consoleEl.innerHTML += '<div class="console-error">Erreur SQL : ' + err.message + '</div>';
    }
  }

  async check(code, panel, exercise, appInstance) {
    if (!this.db) await this.init();
    let score = 0;
    let total = 0;
    let html = '<div style="font-weight:700; margin-bottom:12px;">Resultats des tests</div>';

    for (let test of exercise.tests || []) {
      total += test.points || 1;
      let pass = false;
      try {
        let codeLower = code.toLowerCase();
        if (test.check === 'columns') {
          let res = this.db.exec(code);
          if (res[0]) {
            let cols = res[0].columns.map((c) => c.toLowerCase());
            pass = test.expected.every((e) => cols.indexOf(e.toLowerCase()) !== -1);
          }
        } else if (test.check === 'from') {
          pass = codeLower.indexOf('from ' + test.expected.toLowerCase()) !== -1;
        } else if (test.check === 'has_where') {
          pass = codeLower.indexOf('where') !== -1;
        } else if (test.check === 'condition') {
          pass = codeLower.indexOf(test.expected.toLowerCase()) !== -1;
        } else if (test.check === 'has_alias') {
          pass = codeLower.indexOf(' as ' + test.expected.toLowerCase()) !== -1;
        } else if (test.check === 'order_desc') {
          pass = codeLower.indexOf('order by') !== -1 && codeLower.indexOf('desc') !== -1;
        } else if (test.check === 'has_function') {
          pass = codeLower.indexOf(test.expected.toLowerCase()) !== -1;
        } else if (test.check === 'has_join') {
          pass = codeLower.indexOf('join') !== -1;
        } else if (test.check === 'join_condition') {
          pass = codeLower.indexOf('on') !== -1;
        } else if (test.check === 'no_where') {
          pass = codeLower.indexOf('where') === -1;
        }
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

window.sqlEngine = new SqlEngine();
