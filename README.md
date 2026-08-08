# 🧠 NSI LAB

Plateforme pedagogique interactive pour l'enseignement de NSI en Terminale.

## Deploiement

1. Copiez l integralite du dossier `nsi-lab/` sur votre depot GitHub.
2. Activez GitHub Pages dans les parametres (source : dossier racine).
3. Le site est accessible a `https://votre-pseudo.github.io/nsi-lab/`.

Aucun serveur backend n est requis. Tout fonctionne dans le navigateur.

## Architecture

- **Moteur** : `js/app.js` (navigation, rendu, progression)
- **Moteur Python** : `js/engines/python-engine.js` (Pyodide)
- **Moteur SQL** : `js/engines/sql-engine.js` (sql.js / SQLite)
- **Contenu** : `content/terminale/` (JSON independants)
- **Exercices** : `exercises/terminale/` (JSON independants)
- **Series** : `series/terminale/` (JSON independants)
- **Templates** : `templates/` (modeles vides a copier)

---

## COMMENT AJOUTER UNE NOUVELLE LECON

### Etape 1 : Creer le fichier JSON

Copiez `templates/TEMPLATE_LESSON.json` dans le dossier du chapitre cible.

**Exemple reel** — Ajouter une lecon sur les sous-requetes dans le chapitre SQL :

Creez `content/terminale/module-01/chapitre-03/lecon-sql-06.json` :

```json
{
  "id": "lecon-sql-06",
  "chapter": "chapitre-03",
  "title": "3.6 Sous-requetes",
  "order": 6,
  "type": "course",
  "objectives": [
    "Comprendre l interet des sous-requetes",
    "Utiliser IN avec une sous-requete"
  ],
  "content": "# Sous-requetes\n\nUne sous-requete...",
  "examples": [],
  "activities": [],
  "exerciseSeries": [],
  "summary": "Les sous-requetes permettent d imbriquer des SELECT.",
  "keywords": ["sous-requete", "IN", "SELECT imbrique"],
  "duration": 40,
  "difficulty": 3
}
```

### Etape 2 : C est tout

Rechargez la page. La lecon apparait automatiquement dans le chapitre 3, triee par `order`.

---

## COMMENT AJOUTER UN EXERCICE

### Etape 1 : Creer le fichier JSON

Creez `exercises/terminale/sql-006.json` :

```json
{
  "id": "sql-006",
  "title": "Sous-requete avec IN",
  "chapter": "chapitre-03",
  "lesson": "lecon-sql-06",
  "type": "sql",
  "language": "sql",
  "difficulty": 3,
  "points": 5,
  "statement": "Affichez les noms des eleves qui ont une note en NSI.",
  "starterCode": "",
  "solution": "SELECT nom FROM eleves WHERE id IN (SELECT eleve_id FROM notes WHERE matiere = 'NSI');",
  "hints": ["Utilisez IN avec une sous-requete.", "La sous-requete selectionne les eleve_id de la table notes."],
  "tests": [
    {"name": "Sous-requete IN", "check": "has_function", "expected": "IN", "points": 3},
    {"name": "Table eleves", "check": "from", "expected": "eleves", "points": 2}
  ],
  "correction": {
    "explanation": "IN permet de tester si une valeur appartient a un ensemble retourne par une sous-requete.",
    "commonErrors": ["Utiliser = au lieu de IN"]
  }
}
```

### Etape 2 : Lier a une serie (optionnel)

Ajoutez `"sql-006"` dans le tableau `exercises` d une serie existante ou creez-en une nouvelle.

---

## COMMENT CREER UNE SERIE

Creez `series/terminale/serie-sql-03.json` :

```json
{
  "id": "serie-sql-03",
  "title": "🔴 Serie 3 — Challenge SQL",
  "chapter": "chapitre-03",
  "difficulty": 4,
  "description": "Requetes complexes avec sous-requetes et jointures.",
  "exercises": ["sql-005", "sql-006"],
  "timeLimit": 30,
  "totalPoints": 10
}
```

La serie apparait automatiquement dans la liste des series.

---

## COMMENT AJOUTER UN PROJET

Creez `projects/projet-06.json` a partir du template `TEMPLATE_PROJECT.json` :

```json
{
  "id": "projet-06",
  "title": "Projet 6 : Mon nouveau projet",
  "module": "module-02",
  "description": "Description du projet...",
  "objectives": ["Objectif 1"],
  "skills": ["Competence 1"],
  "specifications": "Cahier des charges...",
  "steps": [{"order": 1, "title": "Etape 1", "description": "Faire ceci"}],
  "starterCode": "# Debut",
  "resources": [],
  "tests": [],
  "rubric": [{"criteria": "Critere A", "points": 5}],
  "totalPoints": 5
}
```

Puis ajoutez le projet dans `data/structure.json` dans le tableau `projects`.

---

## Evolutivite

L architecture permet d ajouter d autres niveaux sans toucher au moteur :

- `content/premiere/` pour Premiere NSI
- `content/snt/` pour SNT
- `content/technologie/` pour Technologie

Il suffit de creer une nouvelle structure dans `data/` et d adapter le menu.
