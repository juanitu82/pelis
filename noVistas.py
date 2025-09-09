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
    """
    Saca puntos, extrae año si lo hay y devuelve:
    { "title": "Nombre", "year": 2000 }
    """
    if not nombre or not nombre.strip():
        return None
        
    nombre = nombre.replace(".", " ").strip()
    
    # Detectar año (1900–2099) - buscar patrón más completo
    # Busca año que puede estar entre paréntesis o solo
    m = re.search(r"[\(\s]*(19|20)\d{2}[\)\s]*", nombre)
    if m:
        year = int(re.search(r"(19|20)\d{2}", m.group(0)).group(0))
        # Tomar todo lo que está ANTES del patrón del año
        titulo = nombre[:m.start()].strip()
        
        # Limpiar caracteres sobrantes al final del título
        titulo = re.sub(r"[\(\s]+$", "", titulo).strip()
        
        if not titulo:  # Si el título queda vacío después de quitar el año
            return None
        return {"title": titulo, "year": year}
    else:
        # Limpiar paréntesis sueltos que puedan haber quedado
        titulo = re.sub(r"[\(\)\s]+$", "", nombre).strip()
        if not titulo:  # Si el nombre está vacío
            return None
        return {"title": titulo}


def verificar_ruta_red(path):
    """Verifica si una ruta de red es accesible"""
    print(f"   🔍 Verificando acceso a ruta de red: {path}")
    
    # Verificar si es una ruta UNC o de unidad mapeada
    if path.startswith(r'\\') or (len(path) >= 2 and path[1] == ':'):
        try:
            # Intentar listar el contenido para verificar acceso
            contenido_prueba = os.listdir(path)
            print(f"   ✅ Acceso confirmado. Contenido: {len(contenido_prueba)} items")
            return True
        except PermissionError:
            print(f"   ❌ Sin permisos de acceso")
            return False
        except FileNotFoundError:
            print(f"   ❌ Ruta no encontrada (posible unidad no mapeada)")
            return False
        except Exception as e:
            print(f"   ❌ Error de acceso: {e}")
            return False
    return True


def escanear_directorio_primer_nivel(base_path, exclude_dirs, exclude_files):
    """Escanea SOLO el primer nivel del directorio (no recursivo)"""
    peliculas = []
    
    print(f"📁 Intentando escanear: {base_path}")
    
    # Verificar acceso especial para rutas de red
    if not verificar_ruta_red(base_path):
        return []
    
    # Verificar si la ruta existe
    if not os.path.exists(base_path):
        print(f"   ❌ Ruta no encontrada: {base_path}")
        print(f"   💡 Sugerencia: Verificar que la unidad esté mapeada correctamente")
        return []
    
    if not os.path.isdir(base_path):
        print(f"   ❌ No es un directorio: {base_path}")
        return []

    try:
        # Obtener contenido del directorio (solo primer nivel)
        contenido = os.listdir(base_path)
        print(f"   📋 Contenido encontrado: {len(contenido)} items")
        
        carpetas_procesadas = 0
        archivos_procesados = 0
        
        for item in contenido:
            item_path = os.path.join(base_path, item)
            
            try:
                # Si es carpeta
                if os.path.isdir(item_path):
                    # Verificar si no está en la lista de exclusión
                    if item.lower() not in [x.lower() for x in exclude_dirs]:
                        peli = normalizar_nombre(item)
                        if peli:
                            peliculas.append(peli)
                            carpetas_procesadas += 1
                            print(f"      📂 Carpeta: {item} -> {peli}")
                    else:
                        print(f"      🚫 Carpeta excluida: {item}")
                
                # Si es archivo
                elif os.path.isfile(item_path):
                    # Verificar si no está en la lista de exclusión
                    if item.lower() not in [x.lower() for x in exclude_files]:
                        # Verificar si es archivo de video
                        video_extensions = (".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".m4v")
                        if item.lower().endswith(video_extensions):
                            nombre_sin_ext = os.path.splitext(item)[0]
                            peli = normalizar_nombre(nombre_sin_ext)
                            if peli:
                                peliculas.append(peli)
                                archivos_procesados += 1
                                print(f"      🎞️ Archivo: {item} -> {peli}")
                    else:
                        print(f"      🚫 Archivo excluido: {item}")
                        
            except Exception as e:
                print(f"      ⚠️ Error procesando {item}: {e}")
                continue

        print(f"   ✅ Procesadas {carpetas_procesadas} carpetas y {archivos_procesados} archivos")

    except PermissionError:
        print(f"   ❌ Sin permisos para acceder a: {base_path}")
        print(f"   💡 Sugerencia: Ejecutar como administrador o verificar permisos de red")
    except Exception as e:
        print(f"   ❌ Error escaneando {base_path}: {e}")

    print(f"   └─ Total encontrado: {len(peliculas)} películas\n")
    return peliculas


def generar_clave_unica(peli):
    """Genera clave única para detectar duplicados"""
    title_clean = peli.get("title", "").lower().strip()
    year = peli.get("year", "")
    return f"{title_clean}_{year}"


# --- Main ---
def main():
    print("🎬 Escaneando películas no vistas (solo primer nivel)...\n")
    
    todas_las_peliculas = []

    # Escanear cada ruta configurada
    for path, config in paths.items():
        print(f"🔍 Procesando ruta: {path}")
        peliculas = escanear_directorio_primer_nivel(
            path, 
            config["exclude_dirs"], 
            config["exclude_files"]
        )
        todas_las_peliculas.extend(peliculas)
        print("-" * 50)

    print(f"\n📊 RESUMEN:")
    print(f"Total encontrado en todas las rutas: {len(todas_las_peliculas)}")

    if not todas_las_peliculas:
        print("❌ No se encontraron películas. Verificar rutas y permisos.")
        return

    # Eliminar duplicados usando clave única
    seen_keys = set()
    peliculas_unicas = []
    duplicados = 0

    for peli in todas_las_peliculas:
        key = generar_clave_unica(peli)
        if key not in seen_keys:
            seen_keys.add(key)
            peliculas_unicas.append(peli)
        else:
            duplicados += 1

    print(f"🗑️  Duplicados eliminados: {duplicados}")

    # Ordenar alfabéticamente por título
    peliculas_unicas.sort(key=lambda x: x.get("title", "").lower())

    # Guardar JSON
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(peliculas_unicas, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Archivo generado: {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ Error guardando archivo: {e}")
        return

    print(f"🎯 Total películas únicas: {len(peliculas_unicas)}")
            
    # Mostrar algunas estadísticas
    con_año = sum(1 for p in peliculas_unicas if 'year' in p)
    sin_año = len(peliculas_unicas) - con_año
    
    print(f"📅 Con año: {con_año} | Sin año: {sin_año}")

    # Mostrar las primeras 5 películas como ejemplo
    if peliculas_unicas:
        print(f"\n🎬 Primeras 5 películas encontradas:")
        for i, peli in enumerate(peliculas_unicas[:5]):
            year_text = f" ({peli['year']})" if 'year' in peli else ""
            print(f"   {i+1}. {peli['title']}{year_text}")


if __name__ == "__main__":
    main()