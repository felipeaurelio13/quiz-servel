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

---

## Configuración Firebase

### Proyecto actual
- **Project ID:** `quiz-servel`
- **Región Firestore:** `nam5` (North America)
- **Hosting URL:** https://quiz-servel.web.app

### Estructura de archivos
- `.firebaserc` – Proyecto configurado como `quiz-servel`
- `firebase.json` – Configuración de Firestore (reglas/índices) y Hosting
- `firestore.rules` – Reglas de seguridad de Firestore
- `firestore.indexes.json` – Índices compuestos para consultas

### Colecciones en Firestore

#### `questions` (lectura pública)
Campos requeridos:
- `question_text` (string) – Texto de la pregunta
- `options` (array) – Array de objetos `{ key: string, text: string }`
- `correct_answer_key` (string) – Clave de respuesta correcta ("a"|"b"|"c"|"d")
- `explanation` (string, opcional) – Explicación de la respuesta

#### `leaderboard` (lectura pública + create)
Campos requeridos:
- `player_name` (string, 2-50 chars) – Nombre del jugador
- `score` (number, >= 0) – Puntaje obtenido
- `total_questions_in_quiz` (number, > 0) – Total de preguntas del quiz
- `created_at` (timestamp) – Fecha de registro (auto con `serverTimestamp()`)

### Reglas de seguridad (firestore.rules)

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

### Índice compuesto requerido

En Firestore Console o automático vía `firestore.indexes.json`:
- **Colección:** `leaderboard`
- **Campos:** 
  - `total_questions_in_quiz` (Ascending)
  - `score` (Descending)
  - `created_at` (Ascending)

---

## Deployment

### Requisitos previos
1. Tener instalado Firebase CLI: `npm install -g firebase-tools`
2. Autenticarse: `firebase login`
3. Verificar proyecto activo: `firebase use quiz-servel`

### Deploy completo
```bash
firebase deploy
```

### Deploy selectivo
```bash
# Solo hosting
firebase deploy --only hosting

# Solo reglas e índices de Firestore
firebase deploy --only firestore:rules,firestore:indexes

# Solo reglas
firebase deploy --only firestore:rules
```

### Verificar deploy
Después del deploy, visita:
- **Hosting:** https://quiz-servel.web.app
- **Console:** https://console.firebase.google.com/project/quiz-servel/overview

---

## Sincronización de preguntas

### Método 1: Navegador (sync.html)
1. Levantar servidor local:
   ```bash
   npx serve .
   # o
   python3 -m http.server 8000
   ```
2. Abrir: `http://localhost:8000/sync.html?sync=1`
3. El script borra todas las preguntas existentes y sube las 78 del archivo `questions.json`

### Método 2: Script de terminal
Usa las herramientas en `/tools`:
```bash
# Validar questions.json
node tools/validate-questions.mjs

# Renumerar IDs (si es necesario)
node tools/renumber-ids.mjs

# Deduplicar preguntas
node tools/dedupe-questions.mjs --threshold=0.8 --lev=0.92
```

**Nota:** El sync mediante `sync.html` normaliza automáticamente el formato de `questions.json` al esquema de Firestore.

---

## Desarrollo local

### Ejecutar tests
```bash
npm install
npm test
```

### Estructura de tests
- `tests/domain.test.js` – Lógica de dominio
- `tests/quizHelpers.test.js` – Helpers de quiz
- `tests/quizUtils.test.js` – Utilidades generales

Las pruebas validan:
- Formato correcto de `questions.json`
- Cálculo de progreso y estadísticas
- Funciones auxiliares sin dependencias externas

---

## Mantenimiento

### Backup de preguntas
El script `dedupe-questions.mjs` genera backups automáticos:
```
questions.backup.YYYYMMDD_HHMMSS.json
```

### Limpieza de duplicados
```bash
node tools/dedupe-questions.mjs
```
- Detecta duplicados exactos y similares (Jaccard + Levenshtein)
- Conserva la pregunta con ID menor
- Genera reporte de eliminaciones

### Actualizar preguntas
1. Editar `questions.json`
2. Validar: `node tools/validate-questions.mjs`
3. Sincronizar vía `sync.html?sync=1`
4. Verificar en Firestore Console

---

## Troubleshooting

### Error: "Unsupported field value: undefined"
Si el sync falla con este error:
- **Causa:** Campos requeridos faltantes o undefined en `questions.json`
- **Solución:** El script ahora valida y filtra automáticamente entradas inválidas
- **Verificar:** Revisa la consola para ver qué preguntas fueron omitidas

### Validación de questions.json
Antes de sincronizar, verifica el formato:
```bash
node tools/validate-questions.mjs
```

### Sync parcial o incompleto
Si solo se suben algunas preguntas:
1. Revisar la consola del navegador para mensajes de advertencia
2. Verificar que todas las preguntas tengan:
   - `question` o `question_text`
   - `options` array con `key` y `text`
   - `correctAnswerKey` o `correct_answer_key`
3. Corregir el JSON y volver a sincronizar

---

## Notas importantes

- La `apiKey` de Firebase es pública por diseño; la seguridad se maneja con reglas de Firestore
- `questions.json` es el archivo fuente (formato local); Firestore usa un esquema normalizado
- El ranking es público para todos los usuarios
- Las preguntas son de solo lectura para usuarios finales
- El script de sync valida automáticamente los datos y omite preguntas inválidas con advertencias en consola
