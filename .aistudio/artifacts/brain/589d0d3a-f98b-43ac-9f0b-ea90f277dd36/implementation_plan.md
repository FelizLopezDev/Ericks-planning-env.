# Plan: Repetición de Eventos y Cuaderno Académico con Carpetas

Ampliación de **Erick's Planner** incorporando repetición rápida de eventos en el calendario y una vista completa para la gestión de notas estructurada por cuatrimestres y materias.

---

## 1. Repetición de Eventos en el Calendario

### Requisitos y Opciones
- En el modal de creación y modificación de eventos (`EventModal`), se añade el selector de repetición con dos opciones exactas:
  1. **Cada día**: El evento se repite de lunes a domingo.
  2. **Cada semana el mismo día**: El evento se repite semanalmente en ese mismo día de la semana.
  *(Con opción por defecto "No repetir").*
- **Alcance temporal**: Generación de la serie durante el período académico (16 semanas / cuatrimestre completo) para que los horarios de clases o rutinas queden programados a lo largo de las semanas visibles en el calendario.
- **Identificación de serie**: Cada evento recurrente comparte un identificador `seriesId` para permitir eliminar solo esa instancia o la serie completa si el usuario lo desea.

---

## 2. Panel Completo de Notas con Jerarquía de Carpetas

### Estructura y Navegación
- Al pulsar el botón **Notas**, en lugar de un pequeño cajón lateral, se abre una **vista completa inmersiva** estilo cuaderno de estudio.
- **Barra lateral de carpetas (Árbol jerárquico)**:
  - **Cuatrimestres** (ej. `1er cuatrimestre`, con capacidad de añadir `+ Nuevo cuatrimestre`).
  - **Materias iniciales precargadas en el 1er cuatrimestre**:
    1. Pre-cálculo
    2. Introducción a algoritmos
    3. Rev. en occidente
    4. Español 1
    5. Razonamiento lógico matemático
  - Capacidad para crear nuevas materias dentro de cualquier cuatrimestre.
- **Panel central de notas**:
  - Lista de notas correspondientes a la materia seleccionada.
  - Botón «+ Nueva nota».
  - Indicador de ruta actual (ej. `1er cuatrimestre / Pre-cálculo`).
- **Editor de notas**:
  - Título y área de texto libre amplia para apuntes de clase, fórmulas o recordatorios.
  - Guardado instantáneo en `localStorage`.
- **Cierre ágil**: Botón de cerrar y tecla `Escape` para volver al calendario en cualquier instante.

---

## 3. Modelo de Datos y Persistencia

### Modelo de Eventos
```typescript
export type EventRecurrence = 'none' | 'daily' | 'weekly';

export interface CalendarEvent {
  id: string;
  seriesId?: string; // Para eventos recurrentes vinculados
  title: string;
  dateKey: string;   // YYYY-MM-DD
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  recurrence?: EventRecurrence;
}
```

### Modelo de Carpetas y Notas Académicas
```typescript
export interface SubjectFolder {
  id: string;
  name: string;
}

export interface TermFolder {
  id: string;
  name: string; // Ej. "1er cuatrimestre"
  subjects: SubjectFolder[];
}

export interface AcademicNote {
  id: string;
  termId: string;
  subjectId: string;
  title: string;
  content: string;
  updatedAt: number;
}
```

### Claves de Almacenamiento Local
- `plerd_calendar_events_v1`: Eventos del calendario con soporte de repetición.
- `plerd_academic_terms_v1`: Estructura jerárquica de cuatrimestres y materias.
- `plerd_academic_notes_v1`: Notas asociadas a materias y cuatrimestres.

---

## 4. Estructura de Componentes

```
App.tsx
  ├── TopBar.tsx (Contador de notas actualizadas)
  ├── WeeklyCalendar.tsx
  ├── EventModal.tsx (Nuevo selector: No repetir / Cada día / Cada semana)
  ├── NotesManagerModal.tsx (Nuevo panel completo)
  │     ├── FolderSidebar (Cuatrimestres y Materias)
  │     ├── NotesList (Notas de la materia activa)
  │     └── NoteEditor (Título y redacción libre)
  ├── TodoDrawer.tsx
  └── FocusTimerOverlay.tsx
```

---

## 5. Plan de Ejecución

1. **Tipos y Persistencia**:
   - Actualizar `src/types/index.ts` con `EventRecurrence`, `TermFolder`, `SubjectFolder` y `AcademicNote`.
   - Modificar `src/hooks/useStorage.ts` para manejar cuatrimestres iniciales preconfigurados y notas jerárquicas, además de la lógica de duplicación recursiva de eventos.
2. **Modal de Eventos con Repetición**:
   - Integrar selector de repetición ("No repetir", "Cada día", "Cada semana el mismo día") en `src/components/EventModal.tsx`.
3. **Componente de Cuaderno Completo (`NotesManagerModal.tsx`)**:
   - Desarrollar la vista completa con árbol de cuatrimestres/materias, creación de carpetas y editor amplio.
4. **Integración en `App.tsx` y `TopBar.tsx`**:
   - Conectar la apertura del gestor completo desde el botón "Notas" en la barra superior.
5. **Verificación y Calidad**:
   - Compilación con `compile_applet` y verificación con `lint_applet`.
