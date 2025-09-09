

  // OMDb API Key (gratis registrándote en http://www.omdbapi.com/apikey.aspx)
//   const API_KEY = "6143b05e";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// const GOOGLE_DRIVE_URL = "https://drive.google.com/uc?export=download&id=1UXf9LAGpfecgzqEt9cy2qp33aXsaF0m7";
const JSON_URL = `https://raw.githubusercontent.com/juanitu82/pelis/main/lista.json`;
const JSON_URL_NOVISTAS = `https://raw.githubusercontent.com/juanitu82/pelis/main/pelisNoVistas.json`;

const { width, height } = Dimensions.get("window");

// 1) PONÉ TU API KEY ACÁ (la de http://www.omdbapi.com/apikey.aspx)
const OMDB_API_KEY = "6143b05e";

// --- Tipos ---
type LocalMovie = {
  title: string;
  year?: number;
  genre?: string;
};

type OmdbMovie = {
  Title?: string;
  Year?: string;
  Genre?: string;
  Runtime?: string;
  Poster?: string;
  Plot?: string;
  imdbRating?: string;
  Response?: "True" | "False";
  Error?: string;
};

const VISTAS_KEY = "vistas__ids"; // guardamos IDs "Title (Year)"

// ID estable para marcar vistas
const buildId = (t?: string, y?: string | number) =>
  t ? `${t}${y ? ` (${y})` : ""}` : "";

// --- Historial global para evitar repeticiones ---
let historial: string[] = [];
const HISTORIAL_MAX = 20;


// --- Componente ---
export default function Detalle() {
  const router = useRouter();
  const { genero, soloNoVistas } = useLocalSearchParams<{
    genero?: string;
    soloNoVistas?: string; // "true" | "false"
  }>();

  // Estados movidos DENTRO del componente
  const [basePeliculas, setBasePeliculas] = useState({ todas: [] });
  const [noVistas, setNoVistas] = useState<LocalMovie[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<LocalMovie | null>(null);
  const [info, setInfo] = useState<OmdbMovie | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar JSON externo en el montaje
  useEffect(() => {
    const cargar = async () => {
      try {
        // cargar lista principal
      const res1 = await fetch(JSON_URL);
      const data1 = await res1.json();
      setBasePeliculas(data1 || { todas: [] });

      // cargar no vistas
      const res2 = await fetch(JSON_URL_NOVISTAS);
      const data2 = await res2.json();
      setNoVistas(data2 || []);
      } catch (e) {
        console.log("Error cargando JSON externo:", e);
        setErrorCarga("No se pudo cargar la base de datos.");
      }
    };
    cargar();
  }, []);

  // Lista del género elegido (o "todas")
  const listaGenero = useMemo<LocalMovie[]>(() => {
    if (genero === "noVistas") {
        return noVistas;
    }

    if (!basePeliculas || !basePeliculas.todas) return []; // si todavía no cargó
    const key = (genero || "todas") as keyof typeof basePeliculas;
    const lista = basePeliculas[key] as LocalMovie[] | undefined;
    return Array.isArray(lista) ? lista : basePeliculas.todas;
  }, [genero, basePeliculas, noVistas]);

  // Cargar vistas desde storage
  const getVistas = async (): Promise<string[]> => {
    try {
      const raw = await AsyncStorage.getItem(VISTAS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const setVistas = async (arr: string[]) => {
    try {
      await AsyncStorage.setItem(VISTAS_KEY, JSON.stringify(arr));
    } catch {
      // nada
    }
  };

  // Elegir una peli random según filtros
  const elegirPelicula = async () => {
    setCargando(true);
    setError(null);
    setInfo(null);
    setSeleccion(null);

    try {
      let lista = [...listaGenero];

      if (soloNoVistas === "true") {
        const vistas = await getVistas();
        lista = lista.filter((p) => !vistas.includes(buildId(p.title, p.year)));
      }

      if (lista.length === 0) {
        setError("No hay más películas para mostrar en este género con el filtro actual.");
        setCargando(false);
        return;
      }

      let pick;
      let intento = 0;

      // Evitar repeticiones recientes
      do {
        pick = lista[Math.floor(Math.random() * lista.length)];
        intento++;
        if (intento > 50) break; // seguridad
      } while (historial.includes(buildId(pick.title, pick.year)));

      // Actualizar historial
      const id = buildId(pick.title, pick.year);
      historial.push(id);
      if (historial.length > HISTORIAL_MAX) {
        historial.shift(); // elimina el más viejo
      }

      setSeleccion(pick);

      // Buscar datos en OMDb
      if (!OMDB_API_KEY) {
        setError("Falta configurar OMDb API Key. Editá OMDB_API_KEY en detalle.tsx.");
        setCargando(false);
        return;
      }

      const url =
        `https://www.omdbapi.com/?t=${encodeURIComponent(pick.title)}` +
        (pick.year ? `&y=${encodeURIComponent(String(pick.year))}` : "") +
        `&plot=short&apikey=${OMDB_API_KEY}`;

      const res = await fetch(url);
      const data: OmdbMovie = await res.json();

      if (data.Response === "False") {
        if (pick.year) {
          const retry = await fetch(
            `https://www.omdbapi.com/?t=${encodeURIComponent(pick.title)}&plot=short&apikey=${OMDB_API_KEY}`
          );
          const data2: OmdbMovie = await retry.json();
          if (data2.Response === "False") {
            setError(data2.Error || "No se encontraron datos en OMDb.");
          } else {
            setInfo(data2);
          }
        } else {
          setError(data.Error || "No se encontraron datos en OMDb.");
        }
      } else {
        setInfo(data);
      }
    } catch (e: any) {
      setError("Error al buscar datos. Revisá conexión o la API key.");
    } finally {
      setCargando(false);
    }
  };

  // Marcar como vista
  const marcarVista = async () => {
    const id = buildId(info?.Title, info?.Year);
    if (!id) return;
    const vistas = await getVistas();
    if (!vistas.includes(id)) {
      vistas.push(id);
      await setVistas(vistas);
    }
    Alert.alert("Listo", "Se marcó como vista 👌");
  };

  useEffect(() => {
    if (basePeliculas.todas.length > 0) {
      elegirPelicula();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genero, soloNoVistas, basePeliculas]);

  // Mostrar error de carga si no se pudo cargar la base de datos
  if (errorCarga) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>⚠ {errorCarga}</Text>
      </SafeAreaView>
    );
  }

  // --- UI ---
  if (cargando) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Buscando película...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} >
      <View style={styles.card}>
        {info?.Poster && info.Poster !== "N/A" ? (
          <Image source={{ uri: info.Poster }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.placeholderText}>Sin póster</Text>
          </View>
        )}

        <Text style={styles.title}>
          {info?.Title || seleccion?.title || "Película"}
        </Text>

        <Text style={styles.meta}>
          {(info?.Year || seleccion?.year || "—").toString()}
          {"  •  "}
          {info?.Genre || seleccion?.genre || (genero ? String(genero) : "—")}
          {info?.Runtime ? `  •  ${info.Runtime}` : ""}
        </Text>

        {!!info?.imdbRating && info.imdbRating !== "N/A" && (
          <Text style={styles.rating}>⭐ {info.imdbRating} / 10</Text>
        )}

        <Text style={styles.plot}>
          {info?.Plot && info.Plot !== "N/A"
            ? info.Plot
            : "Sin sinopsis disponible."}
        </Text>

        {error && <Text style={styles.errorText}>⚠ {error}</Text>}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, styles.btnBack]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>⬅ Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.btnAnother]} onPress={elegirPelicula}>
          <Text style={styles.buttonText}>🔄 Otra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.btnSave]} onPress={marcarVista}>
          <Text style={styles.buttonText}>⭐ Vista</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- Estilos minimalistas oscuros ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
    paddingTop: 40
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#aaa" },

  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20
  },
  poster: {
    width: 220,
    height: 330,
    borderRadius: 10,
    marginBottom: 14,
  },
  posterPlaceholder: {
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#888",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  meta: {
    marginTop: 6,
    fontSize: 14,
    color: "#bbb",
    textAlign: "center",
  },
  rating: {
    marginTop: 8,
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  plot: {
    marginTop: 10,
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    color: "#ffb74d",
    textAlign: "center",
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnBack: { backgroundColor: "#333" },
  btnAnother: { backgroundColor: "#444" },
  btnSave: { backgroundColor: "#E50914" },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});