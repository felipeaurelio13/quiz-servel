# 🚀 Quick Start - Nueva Arquitectura

## 📁 Estructura de archivos

```
src/
├── domain/              # Lógica de negocio pura
│   ├── Question.js      # Value object inmutable
│   └── QuizSession.js   # Entity con estado
├── application/         # Casos de uso
│   ├── QuizEngine.js    # State machine (IDLE→READY→PLAYING→COMPLETE)
│   └── ScoreCalculator.js
├── infrastructure/      # Adaptadores externos
│   ├── FirebaseAdapter.js
│   └── StorageAdapter.js
├── presentation/        # UI Controllers
│   ├── UIController.js
│   ├── NotificationManager.js
│   └── LeaderboardView.js
├── main.js             # Bootstrap y DI container
└── styles.css          # Design system con tokens

index-new.html          # Entry point
test.html              # Testing page
sync.html              # Question sync utility
```

## 🎯 Flujo de datos

```
User Action → UIController → QuizEngine → Domain (Question/QuizSession)
                  ↓              ↓              ↓
            Presentation ← Application ← Infrastructure
                                              (Firebase)
```

## 🔑 Conceptos clave

### 1. **Inmutabilidad**
```javascript
const question = new Question({ text, options })
const shuffled = question.withShuffledOptions() // Nueva instancia
Object.isFrozen(question) // true
```

### 2. **State Machine**
```javascript
engine.state() // 'IDLE' | 'READY' | 'PLAYING' | 'COMPLETE'
engine.start() // IDLE → READY → PLAYING
engine.answer() // PLAYING → (next question OR COMPLETE)
```

### 3. **Dependency Injection**
```javascript
// No singletons globales
const ui = new UIController({ 
  engine, 
  storage, 
  notifications, 
  config 
})
```

### 4. **UI = f(state)**
```javascript
// No manipulación imperativa del DOM
// Render completo cuando cambia el estado
#showQuestion(question, progress) {
  container.innerHTML = this.#renderQuestion({ question, progress })
}
```

## ⌨️ Keyboard Shortcuts

- **1-4**: Seleccionar opciones A-D
- **Enter**: Siguiente pregunta (después de responder)
- **Escape**: Cerrar modal del leaderboard
- **Ctrl+R**: Recargar página

## 🎨 Design Tokens

```css
/* Colores semánticos, no literales */
--color-primary       /* Azul interactivo */
--color-success       /* Verde correcto */
--color-error         /* Rojo incorrecto */

/* Espaciado escala 8px */
--space-1  /* 0.5rem = 8px */
--space-4  /* 2rem = 32px */
--space-8  /* 4rem = 64px */

/* Transiciones consistentes */
--transition-fast    /* 150ms */
--transition-normal  /* 250ms */
```

## 🔥 Firebase Integration

### Colecciones
```
/questions_primarias     # Preguntas del quiz
/quiz_scores            # Resultados guardados
```

### Esquema de score
```javascript
{
  player_name: string,
  score: number,
  total_questions_in_quiz: number,
  created_at: Timestamp,
  answers: Array<{ questionId, isCorrect, ... }>
}
```

## 🧪 Testing

### Unit Tests (domain layer)
```bash
# Los tests están en tests/domain.test.js
# Ejecutar con Jest o similar
npm test
```

### Integration Testing
```bash
# Servidor local
python3 -m http.server 8000

# Abrir en navegador
open http://localhost:8000/test.html
```

### Checklist
Ver `TESTING_CHECKLIST.md` para validación completa

## 📦 Sincronizar preguntas

### Opción 1: Página dedicada
```bash
open http://localhost:8000/sync.html
# Click en "Sincronizar"
```

### Opción 2: Query parameter
```bash
open http://localhost:8000/index-new.html?sync=1
```

### Opción 3: Consola
```javascript
import { syncQuestions } from './src/sync.js'
await syncQuestions(db)
```

## 🎯 Principales mejoras vs versión anterior

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Arquitectura** | Procedural, 15+ variables globales | DDD con capas claras |
| **Estado** | Boolean flags (`isPlaying`, `gameEnded`) | State machine explícito |
| **Mutabilidad** | Modificación directa de arrays | Value objects inmutables |
| **DOM** | Manipulación imperativa | Declarativo (UI = f(state)) |
| **Testing** | Difícil de testear | Domain layer testeable |
| **Naming** | Genérico (`#quiz-area`) | Semántico (`question-container`) |
| **CSS** | Variables funcionales | Design tokens |
| **Dependencies** | Singletons globales | Injection explícita |

## 🚦 Estados del QuizEngine

```javascript
IDLE      // Inicial, sin preguntas cargadas
READY     // Preguntas cargadas, esperando start()
PLAYING   // Quiz en progreso
COMPLETE  // Todas las preguntas respondidas
```

## 🎨 Componentes de UI

### UIController
- Orquesta todas las vistas
- Maneja eventos del usuario
- Delega lógica al engine
- Nunca contiene lógica de negocio

### NotificationManager
- Sistema de toasts no-bloqueantes
- 4 tipos: success, error, warning, info
- Auto-dismiss después de 3s
- Cola de notificaciones

### LeaderboardView
- Modal overlay
- Filtros por cantidad de preguntas (5/10/15)
- Top-3 con badges (🥇🥈🥉)
- Formato de fechas localizado

## 🔒 Seguridad

### HTML Escaping
```javascript
#escapeHtml(unsafe) {
  const div = document.createElement('div')
  div.textContent = unsafe
  return div.innerHTML
}
```

### Validación
- Nombres: min 2 caracteres, max 50
- Preguntas: solo valores permitidos (5/10/15)
- Inputs sanitizados antes de render

## 📱 Responsive Design

- Mobile-first approach
- Breakpoint principal: 768px
- Touch targets mínimo 44x44px
- Grid adaptable en opciones

## 🎓 Patrones implementados

1. **Value Object**: `Question`
2. **Entity**: `QuizSession`
3. **State Machine**: `QuizEngine`
4. **Service**: `ScoreCalculator`
5. **Adapter**: `FirebaseAdapter`, `StorageAdapter`
6. **Controller**: `UIController`
7. **Observer**: Event delegation
8. **Dependency Injection**: Constructor injection

## 💡 Tips

### Debugging
```javascript
// Engine state
console.log(engine.state())

// Current session
console.log(engine.currentQuestion())

// Results
console.log(engine.results())
```

### Agregar nueva pregunta
1. Editar `questions_primarias.json`
2. Abrir `sync.html`
3. Click "Sincronizar"
4. Verificar en Firebase Console

### Modificar diseño
1. Cambiar tokens en `:root` (styles.css)
2. Los componentes heredan automáticamente
3. No hardcodear valores

### Extender funcionalidad
1. Domain logic → `domain/`
2. Use cases → `application/`
3. External APIs → `infrastructure/`
4. UI → `presentation/`

---

**Próximos pasos sugeridos:**
- [ ] Implementar analytics
- [ ] Agregar modo oscuro
- [ ] PWA con service worker
- [ ] Multiplayer con WebSockets
- [ ] Achievements system
- [ ] Time-based scoring
