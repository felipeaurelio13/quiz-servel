# 🧠 ULTRATHINK Architecture Document
**Versión actual: v2.0 - Noviembre 2025**
**Estado: ✅ Implementado en Producción**

## Filosofía de Diseño

Esta aplicación fue rediseñada bajo los principios de **ULTRATHINK**:

1. **Think Different**: Reimaginamos el quiz sin heredar patrones anticuados
2. **Obsess Over Details**: Cada nombre de variable expresa intención de dominio
3. **Plan Like Da Vinci**: Arquitectura en capas clara antes de implementar
4. **Craft, Don't Code**: Abstracciones naturales, código que lee como prosa
5. **Iterate Relentlessly**: Diseñado para cambiar, no solo para funcionar
6. **Simplify Ruthlessly**: Cada línea gana su lugar, cero complejidad accidental

---

## Arquitectura en Capas

```
┌─────────────────────────────────────────┐
│     Presentation Layer (UI)             │
│  - UIController (orquestador)           │
│  - NotificationManager                  │
│  - View Components (futuro)             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Application Layer (Logic)           │
│  - QuizEngine (state machine)           │
│  - ScoreCalculator (business rules)     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Domain Layer (Core)                 │
│  - Question (value object)              │
│  - QuizSession (entity)                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Infrastructure Layer (I/O)          │
│  - FirebaseAdapter                      │
│  - StorageAdapter                       │
└─────────────────────────────────────────┘
```

---

## Decisiones de Diseño

### 1. **State Machine Explícita**

**Antes (procedural):**
```javascript
let answerSubmitted = false
let currentSelectedAnswer = null
let currentQuestionIndex = 0

if (!answerSubmitted && currentSelectedAnswer) {
  // logic
}
```

**Después (declarative):**
```javascript
class QuizEngine {
  #state = 'IDLE' | 'READY' | 'PLAYING' | 'COMPLETE'
  
  isPlaying() { return this.#state === 'PLAYING' }
}
```

**Por qué**: Estados imposibles de representar = bugs imposibles de tener.

---

### 2. **Value Objects Inmutables**

**Antes:**
```javascript
const question = { text: "...", options: [...] }
question.options.push({ ... }) // mutación accidental
```

**Después:**
```javascript
class Question {
  #options
  
  constructor({ options }) {
    this.#options = Object.freeze([...options])
    Object.freeze(this)
  }
}
```

**Por qué**: Inmutabilidad elimina bugs de estado compartido.

---

### 3. **Dependency Injection**

**Antes:**
```javascript
// script.js
let db = initializeFirebase() // singleton global
```

**Después:**
```javascript
class Application {
  constructor(config) {
    this.firebase = new FirebaseAdapter(config.firebase)
    this.engine = new QuizEngine({ 
      questionRepository: this.firebase 
    })
  }
}
```

**Por qué**: Testeable, no hay dependencias ocultas.

---

### 4. **UX Friction Removal**

**Antes:**
- Seleccionar opción → Confirmar → Siguiente (3 pasos)

**Después:**
- Seleccionar opción → Auto-avance (1 paso)

**Por qué**: "Seleccionar" ya expresa intención. No necesitamos confirmación extra.

---

### 5. **Graceful Degradation**

```javascript
async loadQuestions() {
  try {
    return await this.#loadFromFirebase()
  } catch {
    return this.#loadFromCache()
  }
}
```

**Por qué**: La app funciona incluso sin Firebase.

---

## Flujo de Datos

```
User Action → UIController → QuizEngine → Domain Model
                 ↓                          ↓
            Notifications              QuizSession
                 ↓                          ↓
              View Update ← State Change ← Answer
```

**Unidireccional**: Los datos fluyen en una sola dirección.

---

## Naming Conventions

### Métodos de Consulta (Query)
- `isPlaying()` - Pregunta sobre estado
- `currentQuestion()` - Obtiene dato actual
- `calculateScore()` - Calcula valor derivado

### Métodos de Comando (Command)
- `start()` - Inicia proceso
- `answer()` - Registra acción del usuario
- `saveScore()` - Persiste dato

### Clases
- `Question` - Sustantivo, value object
- `QuizSession` - Sustantivo, entity
- `QuizEngine` - Sustantivo + Metáfora (es un "motor")
- `FirebaseAdapter` - Sustantivo + Patrón (Adapter)

**Regla de oro**: Si tienes que explicar qué hace, el nombre está mal.

---

## Testing Strategy

```javascript
// Domain layer: Pure logic, easy to test
const question = new Question({ ... })
expect(question.isCorrect('a')).toBe(true)

// Application layer: State machine tests
const engine = new QuizEngine({ ... })
engine.start({ ... })
expect(engine.isPlaying()).toBe(true)

// Infrastructure: Mocked
const mockFirebase = new MockFirebaseAdapter()
```

---

## Performance Considerations

1. **Lazy Loading**: Preguntas se cargan en background
2. **Event Delegation**: Un solo listener para todas las opciones
3. **RequestAnimationFrame**: Animaciones suaves
4. **LocalStorage Cache**: Offline-first

---

## Future Enhancements

- [ ] Component-based UI (React/Svelte)
- [ ] Advanced scoring (time bonus, difficulty)
- [ ] Multiplayer mode
- [ ] Analytics integration
- [ ] PWA support

---

## Migration Guide

**NO migrar todo de golpe**. Estrategia incremental:

1. ✅ Crear nueva arquitectura (hecho)
2. ⏳ Mantener `script.js` como legacy
3. ⏳ Migrar vista por vista
4. ⏳ Tests paralelos (old vs new)
5. ⏳ Feature flag para A/B testing
6. ⏳ Deprecar código viejo cuando new = 100% coverage

---

## Conclusión

Este refactor no es sobre "modernizar por modernizar".  
Es sobre **inevitabilidad**: hacer que el código correcto sea el código obvio.

Cuando lees `question.isCorrect(selectedKey)`, no necesitas documentación.  
El código se explica solo. Eso es ULTRATHINK.

---

**"Simplicity is the ultimate sophistication."**  
— Leonardo da Vinci (citado en Think Different campaign)
