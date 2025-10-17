### Quiz Electoral Chile (SERVEL) – Firebase Firestore + Hosting (v1.1.0)

App estática de preguntas y ranking usando Firebase (Firestore + Hosting).

### Versión
- Actual: **v1.1.0**

Características clave
- 15 preguntas aleatorias por sesión
- Confirmar → Siguiente (flujo claro de respuesta)
- Explicación en línea cuando fallas (sin cambiar de pantalla)
- Contadores en vivo: correctas e incorrectas
- Gamificación: notificaciones por racha (3, 5 y múltiplos de 10) y racha máxima en resultados
- Atajos de teclado: 1–4 para elegir opción, Enter para confirmar/avanzar
- Ranking persistente (leaderboard)
- Diseño mobile-first: tarjetas limpias, barra de progreso accesible y modal de ranking con focus automático
- Recordatorio contextual y consejos iniciales para mejorar la usabilidad

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
      allow write: if false; // solo lectura
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

### Ejecutar tests
- Instala dependencias: `npm install`
- Corre la suite: `npm test`

Seed (poblar preguntas desde `questions.json`)
- Temporal: habilitar `create` en reglas de `questions` (ya se usó y luego se volvió a bloquear)
- Visitar una vez: `/?seed=1` (ej: `https://<tu-hosting>.web.app/?seed=1`)
- Luego volver a dejar `questions` en solo lectura (como en las reglas de arriba)

Hosting / Deploy
- Archivo `firebase.json` incluido (Hosting + Firestore configurados)
- Despliegue: `firebase deploy --only hosting --project <projectId>`

Pruebas locales
- Requisitos: Node.js 18+
- Instala dependencias del proyecto (no se descarga nada externo): `npm install`
- Ejecuta los tests con el runner nativo de Node: `npm test`
- Las pruebas validan que los datos reales de `questions.json` tengan el formato correcto y que el cálculo de avance funcione sin depender de servicios externos.

Notas
- `questions.json` es de referencia (esquema difiere del de Firestore) y se usa solo para seed
- La `apiKey` de Firebase es pública por diseño; mantén reglas RLS estrictas
