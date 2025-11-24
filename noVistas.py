import os
import re
import json
from datetime import datetime

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
    r"D:\Torrents\peliculas": {
        "exclude_dirs": [],
        "exclude_files": [],
    }
}

OUTPUT_FILE = "pelisNoVistas.json"
BACKUP_FILE = f"pelisNoVistas_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
MIN_PELICULAS_ESPERADAS = 100  # Cantidad mínima para validar

# --- Helpers ---
def normalizar_nombre(nombre):
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
    peliculas = []
    if not os.path.exists(base_path):
        return []
    try:
        contenido = os.listdir(base_path)
        for item in contenido:
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path) and item.lower() not in [x.lower() for x in exclude_dirs]:
                peli = normalizar_nombre(item)
                if peli:
                    peliculas.append(peli)
            elif os.path.isfile(item_path) and item.lower() not in [x.lower() for x in exclude_files]:
                if item.lower().endswith((".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".m4v")):
                    nombre_sin_ext = os.path.splitext(item)[0]
                    peli = normalizar_nombre(nombre_sin_ext)
                    if peli:
                        peliculas.append(peli)
    except Exception as e:
        print(f"Error escaneando {base_path}: {e}")
        return []
    return peliculas

def generar_clave_unica(peli):
    return f"{peli.get('title','').lower().strip()}_{peli.get('year','')}"

def crear_backup(file_path):
    """Crea un backup del archivo JSON antes de modificarlo"""
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                contenido = f.read()
            with open(BACKUP_FILE, "w", encoding="utf-8") as f:
                f.write(contenido)
            print(f"Backup creado: {BACKUP_FILE}")
            return True
        except Exception as e:
            print(f"Error creando backup: {e}")
            return False
    return True

# --- Main ---
def main():
    print("=" * 60)
    print("ESCANEANDO PELICULAS NO VISTAS")
    print("=" * 60)
    
    # Validar que todas las rutas existen
    rutas_faltantes = []
    for path in paths.keys():
        if not os.path.exists(path):
            rutas_faltantes.append(path)
            print(f"ADVERTENCIA: La ruta NO existe o no es accesible:")
            print(f"  {path}")
    
    if rutas_faltantes:
        print("\n" + "!" * 60)
        print("PELIGRO: No se encontraron las siguientes rutas:")
        for ruta in rutas_faltantes:
            print(f"  - {ruta}")
        print("\nEsto podria causar la perdida de datos.")
        print("Verifica las unidades de red o discos externos.")
        print("!" * 60)
        respuesta = input("\nEscribe 'CONTINUAR' para procesar de todos modos: ")
        if respuesta != "CONTINUAR":
            print("\nOperacion cancelada por seguridad.")
            return
        print("\nContinuando con las rutas disponibles...\n")
    
    # Escanear directorios
    todas = []
    for path, config in paths.items():
        if not os.path.exists(path):
            print(f"Saltando: {path} (no accesible)")
            continue
        
        pelis_en_path = escanear_directorio_primer_nivel(
            path, 
            config["exclude_dirs"], 
            config["exclude_files"]
        )
        print(f"Encontradas {len(pelis_en_path):3d} peliculas en: {path}")
        todas.extend(pelis_en_path)
    
    print(f"\nTotal de peliculas encontradas: {len(todas)}")
    
    # Validación de cantidad mínima
    if len(todas) < MIN_PELICULAS_ESPERADAS:
        print("\n" + "!" * 60)
        print(f"ADVERTENCIA: Solo se encontraron {len(todas)} peliculas")
        print(f"Se esperaban al menos {MIN_PELICULAS_ESPERADAS}")
        print("Esto parece sospechoso. Posibles causas:")
        print("  - Unidades de red desconectadas")
        print("  - Discos externos no conectados")
        print("  - Permisos insuficientes")
        print("!" * 60)
        respuesta = input("\nEscribe 'SI' para continuar de todos modos: ")
        if respuesta != "SI":
            print("\nOperacion cancelada por seguridad.")
            return
    
    # Eliminar duplicados
    seen, unicas = set(), []
    for peli in todas:
        key = generar_clave_unica(peli)
        if key not in seen:
            seen.add(key)
            unicas.append(peli)
    
    print(f"Peliculas unicas: {len(unicas)}")
    
    # Ordenar alfabéticamente
    unicas.sort(key=lambda x: x.get("title", "").lower())
    
    # Cargar JSON anterior
    prev = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            try:
                prev = json.load(f)
                print(f"JSON anterior tenia: {len(prev)} peliculas")
            except Exception as e:
                print(f"Error leyendo JSON anterior: {e}")
                prev = []
    
    # Comparar cambios
    prev_keys = {generar_clave_unica(p): p for p in prev}
    new_keys = {generar_clave_unica(p): p for p in unicas}
    
    agregadas = [new_keys[k] for k in new_keys if k not in prev_keys]
    eliminadas = [prev_keys[k] for k in prev_keys if k not in new_keys]
    
    # Mostrar resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE CAMBIOS")
    print("=" * 60)
    
    if agregadas:
        print(f"\nAgregadas ({len(agregadas)}):")
        for p in agregadas[:10]:  # Mostrar máximo 10
            year = f" ({p['year']})" if "year" in p else ""
            print(f"  + {p['title']}{year}")
        if len(agregadas) > 10:
            print(f"  ... y {len(agregadas) - 10} mas")
    
    if eliminadas:
        print(f"\nEliminadas ({len(eliminadas)}):")
        for p in eliminadas[:10]:  # Mostrar máximo 10
            year = f" ({p['year']})" if "year" in p else ""
            print(f"  - {p['title']}{year}")
        if len(eliminadas) > 10:
            print(f"  ... y {len(eliminadas) - 10} mas")
    
    if not agregadas and not eliminadas:
        print("\nNo hay cambios")
        return
    
    # Advertencia si hay muchas eliminaciones
    if len(eliminadas) > 50:
        print("\n" + "!" * 60)
        print(f"ADVERTENCIA: Se eliminaran {len(eliminadas)} peliculas")
        print("Esto parece mucho. Verifica que sea correcto.")
        print("!" * 60)
        respuesta = input("\nEscribe 'ELIMINAR' para confirmar: ")
        if respuesta != "ELIMINAR":
            print("\nOperacion cancelada.")
            return
    
    # Crear backup antes de guardar
    if not crear_backup(OUTPUT_FILE):
        print("\nNo se pudo crear backup. Operacion cancelada.")
        return
    
    # Guardar nuevo JSON
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(unicas, f, ensure_ascii=False, indent=2)
        print(f"\nArchivo actualizado: {OUTPUT_FILE}")
        print("=" * 60)
    except Exception as e:
        print(f"\nError guardando archivo: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperacion cancelada por el usuario")
    except Exception as e:
        print(f"\nError inesperado: {e}")
        import traceback
        traceback.print_exc()