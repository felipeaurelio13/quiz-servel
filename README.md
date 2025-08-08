### Quiz Electoral Chile (SERVEL) – Migrado a Firebase Firestore

App estática de preguntas y ranking. Ahora usa Firebase Firestore.

Qué hace:
- 15 preguntas aleatorias
- Feedback y resumen con explicación
- Ranking persistente

Lo que debes hacer tú
1) Crear proyecto en Firebase y habilitar Firestore (modo producción)
2) Registrar app Web y copiar la config
3) Pegar la config en `script.js` dentro de `firebaseConfig`
4) Crear colecciones y reglas

Colecciones
- `questions` (lectura pública)
  - `question_text` string
  - `options` array de objetos `{ key, text }`
  - `correct_answer_key` string ("a"|"b"|"c"|"d")
  - `explanation` string (opcional)
- `leaderboard` (lectura pública + create)
  - `player_name` string 2–50
  - `score` number >= 0
  - `total_questions_in_quiz` number > 0
  - `created_at` timestamp (lo setea la app con `serverTimestamp()`)

Reglas Firestore (pegar en Rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{doc} {
      allow read: if true;
      allow write: if false;
    }
    match /leaderboard/{doc} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll([
        'player_name','score','total_questions_in_quiz'
      ]) &&
      (request.resource.data.player_name is string &&
       request.resource.data.player_name.size() >= 2 &&
       request.resource.data.player_name.size() <= 50) &&
      (request.resource.data.score is number && request.resource.data.score >= 0) &&
      (request.resource.data.total_questions_in_quiz is number && request.resource.data.total_questions_in_quiz > 0);
      allow update, delete: if false;
    }
  }
}
```

Índice compuesto recomendado
- Colección: `leaderboard`
- Campos: `score` Desc, `created_at` Asc

Cómo correr
- Abre `index.html` o usa un servidor estático (Live Server/Vercel/Netlify)
- Asegúrate de configurar `firebaseConfig` en `script.js`

Notas
- `questions.json` es de referencia y no se usa en runtime (el esquema difiere)
- La `apiKey` de Firebase es pública por diseño; mantén reglas estrictas
