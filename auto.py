import subprocess
import os
import datetime
import sys
import glob

# --- 1️⃣ Ruta del repo local ---
repo_path = r"D:\apps-dev\mi-app4"  # ajustá según tu carpeta
os.chdir(repo_path)

# --- 2️⃣ Ejecutar noVistas.py y capturar salida (UTF-8) ---
result = subprocess.run(
    [sys.executable, "noVistas.py"],  # usa el mismo Python que auto.py
    capture_output=True,
    text=True,
    encoding="utf-8"
)

# --- 3️⃣ Crear log diario ---
hoy = datetime.datetime.now().strftime('%Y-%m-%d')
log_file = f"log_{hoy}.txt"

with open(log_file, "w", encoding="utf-8") as log:
    log.write(f"--- Ejecución {hoy} ---\n")
    log.write(result.stdout)
    if result.stderr:
        log.write("\n--- Errores ---\n")
        log.write(result.stderr)

# --- 4️⃣ Mantener solo los últimos 5 logs ---
logs = sorted(glob.glob("log_*.txt"))
if len(logs) > 5:
    for antiguo in logs[:-5]:
        os.remove(antiguo)

# --- 5️⃣ Git: agregar solo pelisNoVistas.json ---
subprocess.run(["git", "add", "pelisNoVistas.json"])

# --- 6️⃣ Comprobar si hay cambios y commit/push ---
status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, encoding="utf-8")
if status.stdout.strip():
    mensaje = f"Actualización automática de pelisNoVistas {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    subprocess.run(["git", "commit", "-m", mensaje])

    # Pull seguro aunque haya cambios locales en los scripts
    try:
        subprocess.run(["git", "pull", "--rebase", "--autostash", "origin", "main"], check=True)
    except subprocess.CalledProcessError:
        with open(log_file, "a", encoding="utf-8") as log:
            log.write("⚠️ No se pudo hacer pull --rebase (quizás no hay cambios remotos)\n")

    subprocess.run(["git", "push", "origin", "main"])
    with open(log_file, "a", encoding="utf-8") as log:
        log.write("✅ pelisNoVistas.json actualizado y enviado a GitHub\n")
else:
    with open(log_file, "a", encoding="utf-8") as log:
        log.write("ℹ️ No hay cambios para subir a GitHub\n")

# --- 7️⃣ Mensaje final simple para consola ---
print(f"Log generado: {log_file}")


