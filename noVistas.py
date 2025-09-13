import os
import re
import json

# --- Config ---
paths = {
    r"Z:\Juan\Peliculas No Vistas": {
        "exclude_dirs": ["nueva carpeta", "organizar2"],
        "exclude_files": ["lista.txt", "organizar2.sh"],
    },
    r"Z:\Juan\Peliculas No Vistas Nuevas": {
        "exclude_dirs": ["organizar2"],
        "exclude_files": [],
    },
    r"D:\Torrents": {
        "exclude_dirs": ["otros", "series", "temp"],
        "exclude_files": ["peliculas.txt"],
    },
}

OUTPUT_FILE = "pelisNoVistas.json"


# --- Helpers ---
def normalizar_nombre(nombre):
    """Saca puntos, extrae año si lo hay y devuelve {title, year}"""
    if not nombre or not nombre.strip():
        return None
        
    nombre = nombre.replace(".", " ").strip()
    m = re.search(r"[\(\s]*(19|20)\d{2}[\)\s]*", nombre)
    if m:
        year = int(re.search(r"(19|20)\d{2}", m.group(0)).group(0))
        titulo = nombre[:m.start()].strip()
        titulo = re.sub(r"[\(\s]+$", "", titulo).strip()
        if not titulo:
            return None
        return {"title": titulo, "year": year}
    else:
        titulo = re.sub(r"[\(\)\s]+$", "", nombre).strip()
        if not titulo:
            return None
        return {"title": titulo}


def escanear_directorio_primer_nivel(base_path, exclude_dirs, exclude_files):
    """Escanea SOLO primer nivel"""
    peliculas = []
    if not os.path.exists(base_path):
        return []
    try:
        contenido = os.listdir(base_path)
        for item in contenido:
            item_path = os.path.join(base_path, item)
            # Carpeta
            if os.path.isdir(item_path) and item.lower() not in [x.lower() for x in exclude_dirs]:
                peli = normalizar_nombre(item)
                if peli:
                    peliculas.append(peli)
            # Archivo
            elif os.path.isfile(item_path) and item.lower() not in [x.lower() for x in exclude_files]:
                if item.lower().endswith((".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".m4v")):
                    nombre_sin_ext = os.path.splitext(item)[0]
                    peli = normalizar_nombre(nombre_sin_ext)
                    if peli:
                        peliculas.append(peli)
    except Exception:
        return []
    return peliculas


def generar_clave_unica(peli):
    """Clave única para detectar duplicados"""
    return f"{peli.get('title','').lower().strip()}_{peli.get('year','')}"


# --- Main ---
def main():
    # Escanear
    todas = []
    for path, config in paths.items():
        todas.extend(escanear_directorio_primer_nivel(path, config["exclude_dirs"], config["exclude_files"]))

    # Eliminar duplicados
    seen, unicas = set(), []
    for peli in todas:
        key = generar_clave_unica(peli)
        if key not in seen:
            seen.add(key)
            unicas.append(peli)

    unicas.sort(key=lambda x: x.get("title", "").lower())

    # Comparar con versión previa
    prev = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            try:
                prev = json.load(f)
            except Exception:
                prev = []

    prev_keys = {generar_clave_unica(p): p for p in prev}
    new_keys = {generar_clave_unica(p): p for p in unicas}

    agregadas = [new_keys[k] for k in new_keys if k not in prev_keys]
    eliminadas = [prev_keys[k] for k in prev_keys if k not in new_keys]

    # Guardar nuevo archivo
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unicas, f, ensure_ascii=False, indent=2)

    # Reporte final (para auto.py)
    if agregadas or eliminadas:
        print("✅ Cambios detectados en pelisNoVistas.json:")
        if agregadas:
            print("   ➕ Agregadas:")
            for p in agregadas:
                year = f" ({p['year']})" if "year" in p else ""
                print(f"      - {p['title']}{year}")
        if eliminadas:
            print("   ➖ Eliminadas:")
            for p in eliminadas:
                year = f" ({p['year']})" if "year" in p else ""
                print(f"      - {p['title']}{year}")
    else:
        print("ℹ️ No hubo cambios en pelisNoVistas.json")

if __name__ == "__main__":
    main()
