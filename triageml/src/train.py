"""Entrena SVM (RBF) y Regresión Logística con las mismas condiciones del APF2
y serializa el modelo ganador. Uso: python src/train.py"""
import json, os
import joblib, pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, accuracy_score, confusion_matrix, recall_score

BASE = os.path.dirname(os.path.abspath(__file__))
SEED = 42
df = pd.read_csv(os.path.join(BASE, "..", "data", "dataset_triaje_sintetico.csv"))
FEATURES = [c for c in df.columns if c != "prioridad"]
X, y = df[FEATURES], df["prioridad"]          # 0=Baja, 1=Media, 2=Alta
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)

modelos = {
    "svm_rbf": Pipeline([("sc", StandardScaler()),
        ("clf", SVC(kernel="rbf", class_weight="balanced", probability=True, random_state=SEED))]),
    "reg_logistica": Pipeline([("sc", StandardScaler()),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=SEED))]),
}
cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
res = {}
for nombre, pipe in modelos.items():
    cvf1 = cross_val_score(pipe, Xtr, ytr, cv=cv, scoring="f1_macro")
    pipe.fit(Xtr, ytr)
    p = pipe.predict(Xte)
    cm = confusion_matrix(yte, p, labels=[0, 1, 2])
    res[nombre] = {"f1_macro_cv": round(cvf1.mean(), 3), "f1_macro_cv_std": round(cvf1.std(), 3),
                   "f1_macro_test": round(f1_score(yte, p, average="macro"), 3),
                   "accuracy_test": round(accuracy_score(yte, p), 3),
                   "recall_baja_media_alta": [round(r, 3) for r in recall_score(yte, p, average=None)],
                   "alta_clasificada_baja": f"{cm[2][0]} de {cm[2].sum()}",
                   "matriz_confusion": cm.tolist()}
    print(nombre, json.dumps(res[nombre], ensure_ascii=False))

os.makedirs(os.path.join(BASE, "..", "models"), exist_ok=True)
joblib.dump(modelos["svm_rbf"], os.path.join(BASE, "..", "models", "svm_triaje.joblib"))
json.dump({"features": FEATURES, "clases": {"0": "Baja", "1": "Media", "2": "Alta"}, "metricas": res},
          open(os.path.join(BASE, "..", "models", "model_card.json"), "w"), ensure_ascii=False, indent=2)
print("Modelo guardado en models/svm_triaje.joblib")
