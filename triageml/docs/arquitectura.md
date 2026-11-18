# Arquitectura implementada

```mermaid
flowchart LR
  U[Enfermería / Médico / Administrador] --> F[Frontend React + Vite]
  F -- "JSON + token Bearer" --> A[API Flask]
  A --> V[Validación y control de roles]
  V --> M[Pipeline SVM RBF · scikit-learn · .joblib]
  M --> A
  A <--> DB[(MySQL)]
  A -- "prioridad, probabilidades, factores" --> F
```

Flujo: registro del paciente → `POST /api/atenciones` → validación → SVM → guarda entrada, prioridad ML y evento →
resultado → revisión profesional (`PATCH .../revision`, motivo obligatorio si cambia) → cola ordenada (`GET /api/cola`).
