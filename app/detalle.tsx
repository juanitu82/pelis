// @ts-nocheck
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

const JSON_URL = `https://raw.githubusercontent.com/juanitu82/pelis/main/app/peliculas2.json`;
const JSON_URL_NOVISTAS = `https://raw.githubusercontent.com/juanitu82/pelis/main/pelisNoVistas.json`;
const JSON_URL_BLURAY = `https://raw.githubusercontent.com/juanitu82/pelis/main/app/peliculasBluray.json`;

const { width, height } = Dimensions.get("window");

const OMDB_API_KEY = "62b9c4bf";

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

const VISTAS_KEY = "vistas__ids";

const buildId = (t?: string, y?: string | number) =>
  t ? `${t}${y ? ` (${y})` : ""}` : "";

function shuffle<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    console.warn('shuffle recibió un valor que no es array:', array);
    return [];
  }
  
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Historial global para evitar repeticiones ---
let historial: string[] = [];
const HISTORIAL_MAX = 20;

export default function Detalle() {
  const router = useRouter();
  const { genero, soloNoVistas } = useLocalSearchParams<{
    genero?: string;
    soloNoVistas?: string;
  }>();

  // Estados
  const [basePeliculas, setBasePeliculas] = useState({ todas: [] });
  const [noVistas, setNoVistas] = useState<LocalMovie[]>([]);
  const [bluray, setBluray] = useState<LocalMovie[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<LocalMovie | null>(null);
  const [info, setInfo] = useState<OmdbMovie | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // PRIMER useEffect: CARGAR JSON AL MONTAR (CON CACHÉ)
  // ========================================
  useEffect(() => {
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
    const CACHE_KEYS = {
      peliculas: 'cache_peliculas',
      noVistas: 'cache_noVistas',
      bluray: 'cache_bluray',
      timestamp: 'cache_timestamp'
    };

    const cargar = async () => {
      try {
        // Verificar si tenemos caché válido
        const cachedTimestamp = await AsyncStorage.getItem(CACHE_KEYS.timestamp);
        const now = Date.now();
        const cacheIsValid = cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_DURATION;

        if (cacheIsValid) {
          console.log('✅ Usando datos del caché');
          
          // Cargar desde caché
          const cachedPeliculas = await AsyncStorage.getItem(CACHE_KEYS.peliculas);
          const cachedNoVistas = await AsyncStorage.getItem(CACHE_KEYS.noVistas);
          const cachedBluray = await AsyncStorage.getItem(CACHE_KEYS.bluray);

          if (cachedPeliculas && cachedNoVistas && cachedBluray) {
            const data1 = JSON.parse(cachedPeliculas);
            const data2 = JSON.parse(cachedNoVistas);
            const data3 = JSON.parse(cachedBluray);

            let todasPelis: LocalMovie[] = [];
            Object.keys(data1).forEach((key) => {
              const genreMovies = data1[key];
              if (Array.isArray(genreMovies)) {
                todasPelis = todasPelis.concat(genreMovies as LocalMovie[]);
              }
            });

            setBasePeliculas({ ...data1, todas: shuffle(todasPelis) });
            setNoVistas(shuffle(data2));
            
            let todasBluray: LocalMovie[] = [];
            if (typeof data3 === 'object' && data3 !== null) {
              Object.keys(data3).forEach((key) => {
                const genreMovies = data3[key];
                if (Array.isArray(genreMovies)) {
                  todasBluray = todasBluray.concat(genreMovies as LocalMovie[]);
                }
              });
            }
            setBluray(shuffle(todasBluray));
            
            console.log('✅ Datos cargados desde caché exitosamente');
            return;
          }
        }

        // Si no hay caché válido, cargar desde red
        console.log('🌐 Cargando datos desde la red...');

        // Cargar lista principal (estructura: {accion: [...], scifi: [...], ...})
        const res1 = await fetch(JSON_URL);
        if (!res1.ok) throw new Error(`Error HTTP: ${res1.status}`);
        const data1: any = await res1.json();
        console.log('✅ Data principal cargada:', data1);
        
        // Crear array "todas" combinando todos los géneros
        let todasPelis: LocalMovie[] = [];
        Object.keys(data1).forEach((key) => {
          const genreMovies = data1[key];
          if (Array.isArray(genreMovies)) {
            todasPelis = todasPelis.concat(genreMovies as LocalMovie[]);
          }
        });
        
        setBasePeliculas({
          ...data1,
          todas: shuffle(todasPelis)
        });

        // Cargar no vistas (array directo)
        const res2 = await fetch(JSON_URL_NOVISTAS);
        if (!res2.ok) throw new Error(`Error HTTP: ${res2.status}`);
        const data2: any = await res2.json();
        console.log('✅ No vistas cargadas:', data2);
        const noVistasArray: LocalMovie[] = Array.isArray(data2) ? data2 : [];
        setNoVistas(shuffle(noVistasArray));

        // Cargar Bluray (estructura: {accion: [...], scifi: [...], ...})
        console.log('🔵 Intentando cargar Bluray desde:', JSON_URL_BLURAY);
        const res3 = await fetch(JSON_URL_BLURAY);
        console.log('🔵 Respuesta Bluray status:', res3.status);
        if (!res3.ok) throw new Error(`Error HTTP Bluray: ${res3.status}`);
        const data3: any = await res3.json();
        console.log('🔵 Bluray cargado (raw):', data3);
        
        // Extraer todas las películas de todos los géneros
        let todasBluray: LocalMovie[] = [];
        if (typeof data3 === 'object' && data3 !== null) {
          Object.keys(data3).forEach((key) => {
            const genreMovies = data3[key];
            if (Array.isArray(genreMovies)) {
              todasBluray = todasBluray.concat(genreMovies as LocalMovie[]);
            }
          });
        }
        
        console.log('🔵 Total películas Bluray:', todasBluray.length);
        setBluray(shuffle(todasBluray));

        // Guardar en caché
        await AsyncStorage.setItem(CACHE_KEYS.peliculas, JSON.stringify(data1));
        await AsyncStorage.setItem(CACHE_KEYS.noVistas, JSON.stringify(data2));
        await AsyncStorage.setItem(CACHE_KEYS.bluray, JSON.stringify(data3));
        await AsyncStorage.setItem(CACHE_KEYS.timestamp, String(now));
        console.log('💾 Datos guardados en caché');
        
      } catch (e) {
        console.error("❌ Error completo cargando JSON:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        
        // Si falla la red, intentar usar caché aunque esté expirado
        console.log('⚠️ Intentando usar caché expirado como fallback...');
        const cachedPeliculas = await AsyncStorage.getItem(CACHE_KEYS.peliculas);
        const cachedNoVistas = await AsyncStorage.getItem(CACHE_KEYS.noVistas);
        const cachedBluray = await AsyncStorage.getItem(CACHE_KEYS.bluray);

        if (cachedPeliculas && cachedNoVistas) {
          try {
            const data1 = JSON.parse(cachedPeliculas);
            const data2 = JSON.parse(cachedNoVistas);
            const data3 = cachedBluray ? JSON.parse(cachedBluray) : { accion: [] };

            let todasPelis: LocalMovie[] = [];
            Object.keys(data1).forEach((key) => {
              const genreMovies = data1[key];
              if (Array.isArray(genreMovies)) {
                todasPelis = todasPelis.concat(genreMovies as LocalMovie[]);
              }
            });

            setBasePeliculas({ ...data1, todas: shuffle(todasPelis) });
            setNoVistas(shuffle(data2));
            
            let todasBluray: LocalMovie[] = [];
            if (typeof data3 === 'object' && data3 !== null) {
              Object.keys(data3).forEach((key) => {
                const genreMovies = data3[key];
                if (Array.isArray(genreMovies)) {
                  todasBluray = todasBluray.concat(genreMovies as LocalMovie[]);
                }
              });
            }
            setBluray(shuffle(todasBluray));
            
            console.log('✅ Usando caché expirado (modo offline)');
            return;
          } catch (cacheError) {
            console.error('❌ Error usando caché:', cacheError);
          }
        }

        setErrorCarga(`No se pudo cargar la base de datos: ${errorMsg}`);
      }
    };
    cargar();
  }, []); // ← Solo se ejecuta al montar el componente

  // Lista del género elegido
  const listaGenero = useMemo<LocalMovie[]>(() => {
    console.log('🎬 Calculando listaGenero para:', genero);
    
    if (genero === "noVistas") {
      console.log('📝 NoVistas length:', noVistas.length);
      return noVistas;
    }
    
    if (genero === "bluray") {
      console.log('🔵 Bluray length:', bluray.length);
      return bluray;
    }

    if (!basePeliculas || !basePeliculas.todas) return [];
    const key = (genero || "todas") as keyof typeof basePeliculas;
    const lista = basePeliculas[key] as LocalMovie[] | undefined;
    return Array.isArray(lista) ? lista : basePeliculas.todas;
  }, [genero, basePeliculas, noVistas, bluray]);

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
    } catch {}
  };

  const LAST_PICK_KEY = "ultima_pelicula";

  const guardarUltima = async (context: string, id: string) => {
    try {
      const raw = await AsyncStorage.getItem(LAST_PICK_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data[context] = id;
      await AsyncStorage.setItem(LAST_PICK_KEY, JSON.stringify(data));
    } catch {}
  };

  const cargarUltima = async (context: string): Promise<string | null> => {
    try {
      const raw = await AsyncStorage.getItem(LAST_PICK_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data[context] || null;
    } catch {
      return null;
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
        if (intento > 50) break;
      } while (historial.includes(buildId(pick.title, pick.year)));

      const id = buildId(pick.title, pick.year);

      // Actualizar historial
      historial.push(id);
      if (historial.length > HISTORIAL_MAX) {
        historial.shift();
      }

      setSeleccion(pick);
      const context = genero === "noVistas" ? "noVistas" : genero === "bluray" ? "bluray" : genero || "todas";
      guardarUltima(context, id);

      // Buscar datos en OMDb
      if (!OMDB_API_KEY) {
        setError("Falta configurar OMDb API Key.");
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

  // =============================================
  // SEGUNDO useEffect: INICIALIZAR AL CAMBIAR DE GÉNERO
  // =============================================
  useEffect(() => {
    const inicializar = async () => {
      // Verificar que haya datos cargados
      const hayDatos = 
        (genero === "noVistas" && noVistas.length > 0) ||
        (genero === "bluray" && bluray.length > 0) ||
        (genero !== "noVistas" && genero !== "bluray" && basePeliculas.todas && basePeliculas.todas.length > 0);

      if (!hayDatos) {
        console.log('⏳ Esperando datos para género:', genero);
        return;
      }

      console.log('✅ Inicializando género:', genero, 'con', listaGenero.length, 'películas');

      const context = genero === "noVistas" ? "noVistas" : genero === "bluray" ? "bluray" : genero || "todas";

      let lista = [...listaGenero];
      if (soloNoVistas === "true") {
        const vistas = await getVistas();
        lista = lista.filter((p) => !vistas.includes(buildId(p.title, p.year)));
      }

      if (lista.length === 0) {
        setCargando(false);
        setError("No hay películas disponibles.");
        return;
      }

      // Buscar última guardada
      const lastId = await cargarUltima(context);
      const ultima = lista.find(p => buildId(p.title, p.year) === lastId);

      if (ultima) {
        setSeleccion(ultima);
        setCargando(true);
        const url =
          `https://www.omdbapi.com/?t=${encodeURIComponent(ultima.title)}` +
          (ultima.year ? `&y=${encodeURIComponent(String(ultima.year))}` : "") +
          `&plot=short&apikey=${OMDB_API_KEY}`;
        try {
          const res = await fetch(url);
          const data: OmdbMovie = await res.json();
          if (data.Response !== "False") setInfo(data);
        } catch (err) {
          console.error("Error fetching última película:", err);
        }
        setCargando(false);
      } else {
        // No hay última guardada, elegir random
        await elegirPelicula();
      }
    };

    inicializar();
  }, [genero, soloNoVistas, basePeliculas.todas, noVistas, bluray]);

  if (errorCarga) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>⚠ {errorCarga}</Text>
      </SafeAreaView>
    );
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Buscando película...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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