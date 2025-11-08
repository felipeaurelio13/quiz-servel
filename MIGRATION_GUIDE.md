# 🚀 Guía de Migración Paso a Paso

## Objetivo

Migrar de la arquitectura actual (procedural, monolítica) a la nueva arquitectura ULTRATHINK (orientada a dominio, modular) **sin downtime** y de forma incremental.

---

## ⚠️ Antes de Empezar

### Respaldo
```bash
# Crear branch de backup
git checkout -b backup-before-ultrathink
git push origin backup-before-ultrathink

# Volver a main
git checkout main
```

### Verificar que todo funciona
```bash
# Abrir index.html en navegador
open index.html

# Verificar que:
# ✓ Carga preguntas
# ✓ Muestra opciones
# ✓ Guarda puntaje
# ✓ Ranking funciona
```

---

## Paso 1: Probar Nueva Arquitectura (Sin Riesgo)

### 1.1 Verificar archivos creados

```bash
# Listar nueva estructura
ls -R src/

# Deberías ver:
# src/
#   domain/
#     Question.js
#     QuizSession.js
#   application/
#     QuizEngine.js
#     ScoreCalculator.js
#   infrastructure/
#     FirebaseAdapter.js
#     StorageAdapter.js
#   presentation/
#     UIController.js
#     NotificationManager.js
#   main.js
#   styles.css
```

### 1.2 Abrir versión nueva en paralelo

```bash
# Abrir en navegador
open index-new.html

# O con Live Server
npx live-server --port=8081 --entry-file=index-new.html
```

### 1.3 Comparar ambas versiones

| Funcionalidad | Original | Nueva | Status |
|---------------|----------|-------|--------|
| Cargar preguntas | ✓ | ⏳ | Probar |
| Mostrar opciones | ✓ | ⏳ | Probar |
| Responder | ✓ | ⏳ | Probar |
| Guardar score | ✓ | ⏳ | Probar |
| Ranking | ✓ | ⏳ | Probar |

---

## Paso 2: Debugging (Si Algo No Funciona)

### 2.1 Abrir Console del Navegador

```javascript
// En DevTools > Console
console.log('Quiz Engine:', window.engine) // Debe existir
console.log('Firebase Config:', window.firebaseConfig) // Debe tener tu apiKey
```

### 2.2 Errores Comunes

#### Error: "Firebase no configurado"
```javascript
// En src/main.js, verificar:
const APP_CONFIG = {
  firebase: {
    apiKey: "TU_API_KEY_AQUI", // ← Cambiar por tu key
    // ...
  }
}
```

#### Error: "Cannot read property of undefined"
```bash
# Verificar que todos los archivos existen
find src/ -name "*.js"

# Debe mostrar:
# src/main.js
# src/domain/Question.js
# src/domain/QuizSession.js
# ...
```

#### Error: "CORS policy"
```bash
# No abrir con file://, usar servidor HTTP
npx live-server

# O
python3 -m http.server 8000
```

---

## Paso 3: Tests Unitarios

### 3.1 Instalar runner de tests

```bash
# Opción 1: Usar Node.js built-in test runner
npm install --save-dev @types/node

# Opción 2: Usar Vitest (recomendado)
npm install --save-dev vitest
```

### 3.2 Ejecutar tests

```bash
# Si usas Node.js
node --test tests/domain.test.js

# Si usas Vitest
npx vitest tests/domain.test.js
```

### 3.3 Resultados esperados

```
✓ Question creates valid question from data
✓ Question validates correct answer
✓ Question is immutable
✓ QuizSession creates valid session
✓ QuizSession advances through questions
✓ QuizSession calculates score correctly

6 tests passed
```

---

## Paso 4: Feature Flag (Opcional)

### 4.1 Agregar selector de versión

En `index.html` (original):

```html
<!-- Agregar al final del body -->
<div style="position: fixed; bottom: 1rem; right: 1rem;">
  <a href="index-new.html" style="
    background: #0066FF;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
  ">
    🧠 Probar Nueva Versión
  </a>
</div>
```

En `index-new.html`:

```html
<!-- Agregar al final del body -->
<div style="position: fixed; bottom: 1rem; right: 1rem;">
  <a href="index.html" style="
    background: #666;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    text-decoration: none;
  ">
    ← Volver a Versión Original
  </a>
</div>
```

---

## Paso 5: A/B Testing (Recomendado)

### 5.1 Configurar Google Analytics (opcional)

```javascript
// En src/main.js, agregar:
if (typeof gtag !== 'undefined') {
  gtag('event', 'page_view', {
    page_title: 'Quiz ULTRATHINK',
    page_location: window.location.href,
    version: 'new'
  })
}
```

### 5.2 Métricas a medir

- ⏱️ Tiempo promedio por quiz
- ✅ Tasa de completitud (% que terminan)
- 🐛 Errores en console
- 💾 % de puntajes guardados exitosamente

---

## Paso 6: Migración Completa

### 6.1 Cuando nueva versión = 100% funcional

```bash
# Backup de versión original
mv index.html index-legacy.html
mv script.js script-legacy.js
mv style.css style-legacy.css

# Promover nueva versión
mv index-new.html index.html

# Actualizar package.json
npm version minor  # v1.1.0 → v1.2.0
```

### 6.2 Actualizar README.md

```markdown
## Versión Actual: v1.2.0 (ULTRATHINK)

Arquitectura completamente rediseñada bajo principios ULTRATHINK.

### Cambios principales:
- ✨ State machine explícita
- ✨ Domain-Driven Design
- ✨ Immutable value objects
- ✨ Graceful degradation
- ✨ UX simplificado (1 click vs 3)

### Archivos legacy (deprecados):
- `index-legacy.html`
- `script-legacy.js`
- `style-legacy.css`

Se eliminarán en v1.3.0 (2 semanas)
```

### 6.3 Deploy

```bash
# Si usas Firebase Hosting
firebase deploy --only hosting

# Si usas Vercel
vercel --prod

# Si usas Netlify
netlify deploy --prod
```

---

## Paso 7: Cleanup (2 semanas después)

### 7.1 Eliminar código legacy

```bash
# Solo si nueva versión funciona 100%
git rm index-legacy.html script-legacy.js style-legacy.css
git commit -m "chore: remove legacy code after successful ULTRATHINK migration"
git push
```

### 7.2 Documentar lecciones aprendidas

Crear `LESSONS_LEARNED.md`:

```markdown
# Lecciones de la Migración ULTRATHINK

## Lo que funcionó bien
- [ ] Migración incremental sin downtime
- [ ] Tests unitarios antes de migrar
- [ ] Feature flag para A/B testing

## Desafíos
- [ ] Curva de aprendizaje de Domain-Driven Design
- [ ] Tiempo de migración mayor al estimado

## Métricas
- Bugs reportados: X
- Tiempo de desarrollo: Y horas
- Mejora en performance: Z%

## Recomendaciones para futuros refactors
1. ...
2. ...
```

---

## Troubleshooting

### Error: "Module not found"

```bash
# Verificar que los imports tienen extensión .js
# ✗ import { Question } from './Question'
# ✓ import { Question } from './Question.js'
```

### Error: "Firebase is not defined"

```javascript
// Verificar que el script de Firebase está cargando
// En src/infrastructure/FirebaseAdapter.js:
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'
```

### Performance lenta

```javascript
// Verificar que estás usando CDN, no NPM
// CDN es más rápido para este proyecto
```

---

## Checklist Final

Antes de declarar la migración completa:

- [ ] ✓ Nueva versión funciona en Chrome
- [ ] ✓ Nueva versión funciona en Safari
- [ ] ✓ Nueva versión funciona en Firefox
- [ ] ✓ Responsive en mobile
- [ ] ✓ Accesibilidad (keyboard navigation)
- [ ] ✓ Tests pasan al 100%
- [ ] ✓ No hay errores en console
- [ ] ✓ Firebase guarda puntajes
- [ ] ✓ Ranking carga correctamente
- [ ] ✓ Offline mode funciona (cached questions)
- [ ] ✓ Documentación actualizada
- [ ] ✓ Código legacy eliminado (después de 2 semanas)

---

## Soporte

Si encuentras problemas durante la migración:

1. Revisar console del navegador
2. Comparar con código legacy
3. Revisar `ARCHITECTURE.md` para entender diseño
4. Abrir issue en GitHub con:
   - Descripción del problema
   - Pasos para reproducir
   - Screenshot de console errors

---

**¡Éxito en la migración! 🚀**

Recuerda: ULTRATHINK no es sobre usar clases o módulos.  
Es sobre hacer que el código correcto sea el código obvio.
