import subprocess
import os
import datetime

# --- 1️⃣ Ruta del repo local ---
repo_path = r"D:\apps-dev\mi-app4"  # ajustá a tu carpeta
os.chdir(repo_path)

# --- 2️⃣ Ejecutar noVistas.py para generar pelisNoVistas.json ---
subprocess.run(["python", "noVistas.py"], check=True)

# --- 3️⃣ Git: agregar solo pelisNoVistas.json ---
subprocess.run(["git", "add", "pelisNoVistas.json"], check=True)

# --- 4️⃣ Git: commit con mensaje dinámico ---
mensaje = f"Actualización automática de pelisNoVistas {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
try:
    subprocess.run(["git", "commit", "-m", mensaje], check=True)
except subprocess.CalledProcessError:
    print("No hay cambios nuevos para commit")

# --- 4.5️⃣ Git: traer cambios remotos antes de pushear ---
try:
    subprocess.run(["git", "pull", "--rebase", "origin", "main"], check=True)
except subprocess.CalledProcessError:
    print("⚠️ No se pudo hacer pull --rebase (quizás no hay cambios remotos)")

# --- 5️⃣ Git: push a main ---
subprocess.run(["git", "push", "origin", "main"], check=True)

print("pelisNoVistas.json actualizado y enviado a GitHub ✅")


