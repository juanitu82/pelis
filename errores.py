import requests
import json
import time

# --- Configuración ---
JSON_URL_NOVISTAS = "https://raw.githubusercontent.com/juanitu82/pelis/main/pelisNoVistas.json"
OMDB_API_KEY = "6143b05e"
REPORTE_FILE = "reporteNoVistas.json"

# --- Función para consultar OMDb ---
def consultar_omdb(title, year=None):
    url = f"http://www.omdbapi.com/?t={title}&apikey={OMDB_API_KEY}&plot=short"
    if year:
        url += f"&y={year}"
    try:
        resp = requests.get(url)
        return resp.json()
    except Exception as e:
        return {"Response": "False", "Error": str(e)}

# --- Función principal ---
def test_no_vistas():
    # Cargar JSON de no vistas

    url_json = f"{JSON_URL_NOVISTAS}?nocache={int(time.time())}"
    peliculas = requests.get(url_json, headers={"Cache-Control": "no-cache"}).json()
    resultados = []

    errores_count = 0

    for p in peliculas:
        data = consultar_omdb(p["title"], p.get("year"))

        encontrado = data.get("Response") == "True"
        poster = data.get("Poster")
        plot = data.get("Plot")
        genre = data.get("Genre")

        # Determinar status
        if not encontrado:
            status = "No encontrada"
            errores_count += 1
        elif not poster or poster == "N/A":
            status = "Sin poster"
        elif not plot or plot == "N/A":
            status = "Sin sinopsis"
        elif genre and ("Short" in genre or "Documentary" in genre):
            status = "Especial (Short/Documentary)"
        else:
            status = "OK"

        resultado = {
            "title": p["title"],
            "year": p.get("year"),
            "encontrado": encontrado,
            "error": data.get("Error"),
            "tipo": genre,
            "poster": poster,
            "plot": plot,
            "status": status
        }
        resultados.append(resultado)
        print(f'{resultado["title"]} ({resultado.get("year")}) → {status}')

    # Guardar reporte completo
    with open(REPORTE_FILE, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    print("\n--- RESUMEN ---")
    print(f"Total películas: {len(peliculas)}")
    print(f"Películas con errores/no encontradas: {errores_count}")
    print(f"Reporte completo guardado en: {REPORTE_FILE}")

if __name__ == "__main__":
    test_no_vistas()
