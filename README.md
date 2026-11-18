# TriageML – Sistema de triaje asistido por Machine Learning (APF3)

Apoyo a la decisión de triaje: el modelo (SVM RBF) sugiere prioridad Alta/Media/Baja; el profesional confirma o modifica
(motivo obligatorio si cambia) y cada decisión queda registrada con responsable, fecha y hora.
**Datos sintéticos: no constituye validación clínica.**

## Estructura
- `data/` dataset sintético (1,500 registros, 16 variables + `prioridad`: 0=Baja, 1=Media, 2=Alta)
- `src/train.py` entrena SVM-RBF y Regresión Logística (mismas condiciones, semilla 42) y serializa el modelo
- `models/` `svm_triaje.joblib` + `model_card.json` (variables, clases, métricas, matrices de confusión)
- `backend/app.py` API Flask: autenticación por roles, validación, modelo, persistencia (MySQL/SQLite)
- `frontend/` React + Vite (login, registro, dashboard, registro de paciente, resultado, revisión, cola, detalle)
- `docs/arquitectura.md` diagrama

## Requisitos
Python 3.12+ · Node.js 22 LTS · MySQL 8 (opcional; sin configurar usa SQLite)

## Ejecución
```bash
# 1) Backend
python -m venv .venv && .venv\Scripts\activate        # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python src/train.py                                    # genera models/svm_triaje.joblib
copy .env.example .env                                 # editar DATABASE_URL (MySQL) y SECRET_KEY
python backend/app.py                                  # API en http://127.0.0.1:5000

# 2) Frontend (otra terminal)
cd frontend
npm install
npm run dev                                            # http://localhost:5173
```

## MySQL
```sql
CREATE DATABASE triageml CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Las tablas (`usuario`, `atencion`, `evento`) se crean solas al iniciar el backend.

## Endpoints (requieren `Authorization: Bearer <token>`, salvo health y auth)
| Método | Ruta | Función |
|---|---|---|
| GET | /api/health | Estado de la API y del modelo |
| POST | /api/auth/registro · /api/auth/login | Cuenta y sesión |
| POST | /api/atenciones | Registra paciente → prioridad sugerida, probabilidades y factores (Enfermería, Médico) |
| PATCH | /api/atenciones/{id}/revision | Confirma/modifica prioridad; motivo obligatorio si cambia (Enfermería, Médico) |
| PATCH | /api/atenciones/{id}/estado | En espera / En atención / Finalizado |
| GET | /api/cola?q=&prioridad= | Cola ordenada por prioridad y hora de registro |
| GET | /api/resumen | Contadores del día |
| GET | /api/atenciones/{id} · /historial | Detalle y trazabilidad |

## Limitaciones
Datos sintéticos; los "factores" son reglas de referencia (Anexo 4 del APF2), no la explicación interna del SVM;
cualquier persona puede elegir su rol al crear la cuenta (sin aprobación); despliegue solo local; sin pruebas
con usuarios reales.
