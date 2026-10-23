

import { db } from '@/database/firebaseConfig';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { collection, getDocs } from 'firebase/firestore';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,

  Alert,

  Image,

  SafeAreaView,

  ScrollView,

  StatusBar,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';

import { useCart, type ProductoCarrito } from '../context/CartContext';

type Variante = {

  talla?: string;

  tamaño?: string;

  color?: string;

  stock?: number;

};

type Producto = {

  id: string;

  nombre: string;

  codigo: string;

  categoria: string;

  marca: string;

  precioVenta: number;

  stock: number;

  stockMinimo: number;

  imagen?: string;

  tieneVariantes: boolean;

  tallas: string[];

  colores: string[];

};

type Outfit = {

  titulo: string;

  descripcion: string;

  productos: Producto[];

  total: number;

};

const normalizar = (texto: string) =>

  String(texto ?? '')

    .toLowerCase()

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .trim();

const formatoPrecio = (precio: number) =>

  `C$ ${Number(precio || 0).toLocaleString('es-NI', {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  })}`;

const COLORES = [

  'negro',

  'negra',

  'blanco',

  'blanca',

  'rojo',

  'roja',

  'azul',

  'verde',

  'rosado',

  'rosada',

  'rosa',

  'amarillo',

  'amarilla',

  'morado',

  'morada',

  'gris',

  'cafe',

  'beige',

  'dorado',

  'dorada',

  'plateado',

  'plateada',

  'lila',

  'naranja',

  'crema',

  'celeste',

];

const TIPOS_PRODUCTO = [

  {

    nombre: 'Zapatos',

    expresion:

      /\b(zapato|zapatos|calzado|tacon|tacones|tenis|sandalia|sandalias|zapatillas|botas)\b/,

  },

  {

    nombre: 'Vestidos',

    expresion: /\b(vestido|vestidos)\b/,

  },

  {

    nombre: 'Blusas',

    expresion: /\b(blusa|blusas)\b/,

  },

  {

    nombre: 'Camisas',

    expresion: /\b(camisa|camisas)\b/,

  },

  {

    nombre: 'Pantalones',

    expresion: /\b(pantalon|pantalones|jean|jeans)\b/,

  },

  {

    nombre: 'Faldas',

    expresion: /\b(falda|faldas)\b/,

  },

  {

    nombre: 'Carteras',

    expresion: /\b(cartera|carteras|bolso|bolsos)\b/,

  },

  {

    nombre: 'Perfumes',

    expresion: /\b(perfume|perfumes|fragancia|fragancias)\b/,

  },

  {

    nombre: 'Pulseras',

    expresion: /\b(pulsera|pulseras)\b/,

  },

  {

    nombre: 'Collares',

    expresion: /\b(collar|collares)\b/,

  },

  {

    nombre: 'Aretes',

    expresion: /\b(arete|aretes|pendiente|pendientes)\b/,

  },

  {

    nombre: 'Shorts',

    expresion: /\b(short|shorts)\b/,

  },

  {

    nombre: 'Tops',

    expresion: /\b(top|tops)\b/,

  },

  {

    nombre: 'Chaquetas',

    expresion: /\b(chaqueta|chaquetas|sueter|sueteres|cardigan)\b/,

  },

];

const PALABRAS_IGNORADAS = new Set([

  'quiero',

  'busco',

  'buscar',

  'muestra',

  'mostrar',

  'muestrame',

  'dame',

  'necesito',

  'tienes',

  'tienen',

  'hay',

  'disponible',

  'disponibles',

  'producto',

  'productos',

  'por',

  'favor',

  'para',

  'con',

  'una',

  'uno',

  'unos',

  'unas',

  'los',

  'las',

  'que',

  'este',

  'esta',

  'estos',

  'estas',

  'precio',

  'cuesta',

  'cuestan',

  'cuanto',

  'vale',

  'valor',

  'outfit',

  'atuendo',

  'look',

  'elegante',

  'elegantes',

  'casual',

  'formales',

  'formal',

  'fiesta',

  'diario',

  'oficina',

  'presupuesto',

  'cordobas',

  'cordoba',

  'menos',

  'hasta',

  'maximo',

  'maxima',

  'talla',

  'tallas',

  'color',

  'colores',

  'soy',

  'mi',

  'me',

  'gustaria',

  'armame',

  'armar',

  'combinar',

  'combina',

  'combinacion',

  'ropa',

  'barato',

  'barata',

  'baratos',

  'baratas',

  'economico',

  'economica',

  'economicos',

  'economicas',

  'mas',

  'de',

  'del',

  'el',

  'la',

  'y',

  'en',

  'es',

  'tengo',

  'necesitas',

]);

export default function AsistenteIAScreen() {

  const router = useRouter();

  const { carrito, carritoCargado, agregarAlCarrito } = useCart();

  const [consulta, setConsulta] = useState('');

  const [respuestaIA, setRespuestaIA] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);

  const [outfits, setOutfits] = useState<Outfit[]>([]);

  const [cargando, setCargando] = useState(true);

  const [buscando, setBuscando] = useState(false);

  const [comprando, setComprando] = useState(false);

  const cargarProductos = useCallback(async () => {

    setCargando(true);

    try {

      const snapshot = await getDocs(collection(db, 'productos'));

      const lista: Producto[] = snapshot.docs.map((documento) => {

        const datos = documento.data();

        const variantes: Variante[] = Array.isArray(datos.variantes)

          ? datos.variantes

          : [];

        const variantesDisponibles = variantes.filter(

          (v) => Math.max(0, Number(v.stock) || 0) > 0,

        );

        const stockVariantes = variantes.reduce(

          (total, variante) =>

            total + Math.max(0, Number(variante.stock) || 0),

          0,

        );

        const imagen =

          typeof datos.imagenBase64 === 'string' &&

          datos.imagenBase64.length > 0

            ? datos.imagenBase64

            : typeof datos.imagen === 'string' &&

                datos.imagen.length > 0

              ? datos.imagen

              : typeof datos.imagenUrl === 'string' &&

                  datos.imagenUrl.length > 0

                ? datos.imagenUrl

                : undefined;

        const tallas = [

          ...new Set(

            variantesDisponibles

              .map((v) =>

                String(v.talla ?? v.tamaño ?? '').trim(),

              )

              .filter(Boolean),

          ),

        ];

        const coloresVariantes = variantesDisponibles

          .map((v) => String(v.color ?? '').trim())

          .filter(Boolean);

        const coloresProducto =

          typeof datos.color === 'string' ? [datos.color] : [];

        const colores = [

          ...new Set([...coloresVariantes, ...coloresProducto]),

        ];

        return {

          id: documento.id,

          nombre: String(datos.nombre ?? 'Producto'),

          codigo: String(datos.codigo ?? ''),

          categoria: String(datos.categoria ?? 'Otros'),

          marca: String(datos.marca ?? ''),

          precioVenta: Math.max(0, Number(datos.precioVenta) || 0),

          stock:

            variantes.length > 0

              ? stockVariantes

              : Math.max(0, Number(datos.stock) || 0),

          stockMinimo: Math.max(0, Number(datos.stockMinimo) || 0),

          imagen,

          tieneVariantes: variantes.length > 0,

          tallas,

          colores,

        };

      });

      setProductos(

        lista.filter(

          (producto) =>

            producto.stock > 0 && producto.precioVenta > 0,

        ),

      );

    } catch (error) {

      console.error('Error al cargar productos:', error);

      Alert.alert(

        'Error',

        'No se pudieron cargar los productos. Comprueba tu conexión e inténtalo de nuevo.',

      );

    } finally {

      setCargando(false);

    }

  }, []);

  useEffect(() => {

    cargarProductos();

  }, [cargarProductos]);

  const presupuesto = useMemo(() => {

    const texto = normalizar(consulta);

    const coincidencia = texto.match(

      /\b(?:c\s*\$|cordobas?|presupuesto(?:\s+de)?|hasta|menos\s+de|maximo(?:\s+de)?)\s*(?:c\s*\$)?\s*(\d+(?:[.,]\d+)?)/,

    );

    if (!coincidencia) return null;

    const cantidad = Number(coincidencia[1].replace(',', '.'));

    return Number.isFinite(cantidad) && cantidad > 0

      ? cantidad

      : null;

  }, [consulta]);

  const recomendarProductos = async () => {

    const original = consulta.trim();

    if (!original) {

      setRespuestaIA('Escribe qué producto o información necesitas.');

      setOutfits([]);

      return;

    }

    setBuscando(true);

    setRespuestaIA('');

    setOutfits([]);

    let respuestaGeneradaIA = '';

    try {
      const texto = normalizar(original);
      const disponibles = productos.filter((p) => p.stock > 0);

      // Consultar OpenAI a través del Worker seguro de Cloudflare.
      // Si falla la conexión, la búsqueda local del catálogo sigue funcionando.
      try {
        const respuesta = await fetch(
          'https://lizma-asistente-ia.yosarilumbi579.workers.dev/',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: original,
              products: disponibles.map((producto) => ({
                id: producto.id,
                nombre: producto.nombre,
                codigo: producto.codigo,
                categoria: producto.categoria,
                marca: producto.marca,
                precioVenta: producto.precioVenta,
                stock: producto.stock,
                tallas: producto.tallas,
                colores: producto.colores,
                tieneVariantes: producto.tieneVariantes,
              })),
            }),
          },
        );

        const datosIA = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            typeof datosIA.error === 'string'
              ? datosIA.error
              : 'No se pudo consultar el asistente de IA.',
          );
        }

        if (typeof datosIA.reply === 'string' && datosIA.reply.trim()) {
          respuestaGeneradaIA = datosIA.reply.trim();
        }
      } catch (errorIA) {
        console.warn(
          'No se pudo conectar con OpenAI; se usará la búsqueda local.',
          errorIA,
        );
      }

      const responder = (mensaje: string) => {

        setRespuestaIA(mensaje);

        setOutfits([]);

      };

      // 1. Saludos y agradecimientos.

      if (

        /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|gracias|muchas gracias)[!. ]*$/.test(

          texto,

        )

      ) {

        responder(

          /gracias/.test(texto)

            ? '¡Con gusto!'

            : '¡Hola! ¿Qué producto necesitas?',

        );

        return;

      }

      // 2. Identificar talla sin confundirla con otras palabras.

      const tallaMatch = texto.match(

        /\b(2xs|xxs|xs|s|m|l|xl|xxl|xxxl|unica)\b/,

      );

      const tallaSolicitada = tallaMatch?.[1]?.toUpperCase();

      const preguntaTallas =

        /\b(talla|tallas|tamanos|medidas)\b/.test(texto) &&

        /\b(que|cuales|tienen|hay|disponibles|muestran)\b/.test(

          texto,

        );

      const preguntaColores =

        /\b(color|colores)\b/.test(texto) &&

        /\b(que|cuales|tienen|hay|disponibles)\b/.test(texto);

      // 3. Detectar color solicitado.

      const colorSolicitado = COLORES.find((color) =>

        new RegExp(`\\b${color}\\b`).test(texto),

      );

      // 4. Detectar el tipo de producto.

      const tipo = TIPOS_PRODUCTO.find((item) =>

        item.expresion.test(texto),

      );

      // 5. Detectar solicitudes de outfit.

      const esOutfit =

        /\b(outfit|atuendo|look|vestirme|combinar|combinacion|conjunto|armame|armar)\b/.test(

          texto,

        );

      const preguntaPrecio =

        /\b(precio|cuesta|cuestan|cuanto vale|cuanto cuesta|valor)\b/.test(

          texto,

        );

      // 6. Pregunta general sobre las tallas.

      if (preguntaTallas && !tallaSolicitada) {

        const tallas = [

          ...new Set(disponibles.flatMap((p) => p.tallas)),

        ];

        responder(

          tallas.length > 0

            ? `Tallas registradas: ${tallas.join(', ')}.`

            : 'No hay tallas registradas en las variantes disponibles.',

        );

        return;

      }

      // 7. Pregunta general sobre colores.

      if (preguntaColores && !colorSolicitado) {

        const colores = [

          ...new Set(disponibles.flatMap((p) => p.colores)),

        ];

        responder(

          colores.length > 0

            ? `Colores registrados: ${colores.join(', ')}.`

            : 'No hay colores registrados en los productos disponibles.',

        );

        return;

      }

      // 8. Filtrar por talla, tipo, color y presupuesto.

      let resultados = disponibles.filter((producto) => {

        const datos = normalizar(

          `${producto.nombre} ${producto.categoria} ${producto.marca} ${producto.codigo}`,

        );

        if (tipo) {

          const coincideTipo =

            tipo.expresion.test(datos) ||

            normalizar(producto.categoria).includes(

              normalizar(tipo.nombre),

            ) ||

            (tipo.nombre === 'Zapatos' &&

              /\b(calzado|zapateria)\b/.test(

                normalizar(producto.categoria),

              ));

          if (!coincideTipo) return false;

        }

        if (tallaSolicitada) {

          const tieneTalla = producto.tallas.some(

            (talla) =>

              normalizar(talla) === normalizar(tallaSolicitada),

          );

          if (!tieneTalla) return false;

        }

        if (colorSolicitado) {

          const coloresProducto = producto.colores.map(normalizar);

          const coincideColor =

            coloresProducto.some((color) =>

              color.includes(colorSolicitado),

            ) || datos.includes(colorSolicitado);

          if (!coincideColor) return false;

        }

        if (

          presupuesto !== null &&

          producto.precioVenta > presupuesto

        ) {

          return false;

        }

        return true;

      });

      // 9. Buscar palabras específicas del producto o la marca.

      const palabrasBusqueda = texto

        .split(/[^a-z0-9]+/)

        .filter(

          (palabra) =>

            palabra.length > 1 &&

            !PALABRAS_IGNORADAS.has(palabra) &&

            !COLORES.includes(palabra) &&

            ![

              '2xs',

              'xxs',

              'xs',

              's',

              'm',

              'l',

              'xl',

              'xxl',

              'xxxl',

              'unica',

            ].includes(palabra) &&

            !/^\d+$/.test(palabra),

        );

      if (palabrasBusqueda.length > 0) {

        const coincidencias = resultados.filter((producto) => {

          const datos = normalizar(

            `${producto.nombre} ${producto.categoria} ${producto.marca} ${producto.codigo}`,

          );

          return palabrasBusqueda.some((palabra) =>

            datos.includes(palabra),

          );

        });

        // No descartar el filtro por tipo cuando el cliente pide

        // una categoría general, por ejemplo: "quiero zapatos".

        if (coincidencias.length > 0) {

          resultados = coincidencias;

        } else if (

          !tipo &&

          !tallaSolicitada &&

          !colorSolicitado &&

          !esOutfit

        ) {

          responder(

            'No encontré productos que coincidan con tu búsqueda.',

          );

          return;

        }

      }

      if (resultados.length === 0) {

        responder(

          'No encontré productos que cumplan con esos criterios. Prueba otra talla, color o presupuesto.',

        );

        return;

      }

      // 10. Responder directamente una consulta de precio.

      if (preguntaPrecio && !esOutfit) {

        const producto = resultados[0];

        setRespuestaIA(

          `${producto.nombre}: ${formatoPrecio(producto.precioVenta)}.`,

        );

        setOutfits([

          {

            titulo: 'Producto encontrado',

            descripcion: 'Precio del producto solicitado.',

            productos: [producto],

            total: producto.precioVenta,

          },

        ]);

        return;

      }

      // 11. Búsqueda normal: mostrar únicamente lo solicitado.

      if (!esOutfit) {

        const lista = resultados

          .slice()

          .sort((a, b) => a.precioVenta - b.precioVenta)

          .slice(0, 5);

        setRespuestaIA(

          `${lista.length} producto(s) encontrado(s)${

            tallaSolicitada ? ` en talla ${tallaSolicitada}` : ''

          }${

            colorSolicitado ? ` en color ${colorSolicitado}` : ''

          }.`,

        );

        setOutfits([

          {

            titulo: tipo

              ? `Resultados: ${tipo.nombre}`

              : 'Productos encontrados',

            descripcion:

              'Productos disponibles que coinciden con tu solicitud.',

            productos: lista,

            total: lista.reduce(

              (total, producto) =>

                total + producto.precioVenta,

              0,

            ),

          },

        ]);

        return;

      }

      // 12. Preparar outfit según la ocasión.

      const elegante =

        /\b(elegante|elegantes|formal|oficina|reunion)\b/.test(

          texto,

        );

      const fiesta =

        /\b(fiesta|boda|cumpleanos|evento|noche)\b/.test(texto);

      const casual =

        /\b(casual|diario|paseo|amigas)\b/.test(texto);

      const esAccesorio = (producto: Producto) => {

        const datos = normalizar(

          `${producto.nombre} ${producto.categoria}`,

        );

        return /\b(cartera|carteras|bolso|bolsos|perfume|perfumes|pulsera|collar|arete|accesorio|accesorios)\b/.test(

          datos,

        );

      };

      const esPrenda = (producto: Producto) => {

        const datos = normalizar(

          `${producto.nombre} ${producto.categoria}`,

        );

        return /\b(blusa|blusas|camisa|camisas|pantalon|pantalones|jean|jeans|falda|faldas|vestido|vestidos|short|shorts|top|tops|chaqueta|chaquetas|sueter|cardigan|zapato|zapatos|tenis|sandalia|sandalias|tacon|tacones|bota|botas)\b/.test(

          datos,

        ) || /\bropa|calzado\b/.test(normalizar(producto.categoria));

      };

      const puntuacion = (producto: Producto) => {

        const datos = normalizar(

          `${producto.nombre} ${producto.categoria}`,

        );

        let puntos = 0;

        if (

          elegante &&

          /\b(vestido|blusa|camisa|pantalon|cartera|tacon|zapato)\b/.test(

            datos,

          )

        ) {

          puntos += 5;

        }

        if (

          fiesta &&

          /\b(vestido|falda|tacon|cartera|blusa|zapato)\b/.test(

            datos,

          )

        ) {

          puntos += 5;

        }

        if (

          casual &&

          /\b(jean|short|tenis|sandalia|blusa|top|camisa)\b/.test(

            datos,

          )

        ) {

          puntos += 5;

        }

        if (esPrenda(producto)) puntos += 3;

        if (esAccesorio(producto)) puntos += 1;

        return puntos;

      };

      const prendas = resultados

        .filter(esPrenda)

        .sort(

          (a, b) =>

            puntuacion(b) - puntuacion(a) ||

            a.precioVenta - b.precioVenta,

        );

      const accesorios = resultados

        .filter(esAccesorio)

        .sort((a, b) => a.precioVenta - b.precioVenta);

      if (prendas.length === 0) {

        const opciones = resultados.slice(0, 5);

        setRespuestaIA(

          'No encontré suficientes prendas para formar un outfit. Estas son las opciones disponibles que coinciden con tu búsqueda.',

        );

        setOutfits([

          {

            titulo: 'Opciones disponibles',

            descripcion: 'Productos del catálogo.',

            productos: opciones,

            total: opciones.reduce(

              (total, producto) =>

                total + producto.precioVenta,

              0,

            ),

          },

        ]);

        return;

      }

      const seleccionados: Producto[] = [];

      let total = 0;

      const agregarSeleccion = (producto: Producto) => {

        if (seleccionados.some((p) => p.id === producto.id)) {

          return false;

        }

        if (

          presupuesto !== null &&

          total + producto.precioVenta > presupuesto

        ) {

          return false;

        }

        seleccionados.push(producto);

        total += producto.precioVenta;

        return true;

      };

      // Seleccionar una prenda principal y complementar el look.

      for (const prenda of prendas) {

        if (seleccionados.length >= 3) break;

        agregarSeleccion(prenda);

      }

      const accesorio = accesorios.find(

        (producto) =>

          !seleccionados.some((p) => p.id === producto.id) &&

          (presupuesto === null ||

            total + producto.precioVenta <= presupuesto),

      );

      if (accesorio && seleccionados.length < 4) {

        agregarSeleccion(accesorio);

      }

      if (seleccionados.length === 0) {

        responder(

          'No encontré una combinación dentro de ese presupuesto. Prueba con una cantidad mayor.',

        );

        return;

      }

      const titulo = elegante

        ? 'Outfit elegante'

        : fiesta

          ? 'Outfit para fiesta'

          : casual

            ? 'Outfit casual'

            : 'Outfit recomendado';

      setRespuestaIA(

        `${titulo}: ${seleccionados.length} producto(s). Total: ${formatoPrecio(total)}.`,

      );

      setOutfits([

        {

          titulo,

          descripcion:

            presupuesto !== null

              ? `Total: ${formatoPrecio(total)} de ${formatoPrecio(

                  presupuesto,

                )} de presupuesto.`

              : 'Combinación sugerida con productos disponibles.',

          productos: seleccionados,

          total,

        },

      ]);

    } catch (error) {

      console.error('Error al recomendar productos:', error);

      setRespuestaIA(

        'No pude completar tu consulta. Inténtalo de nuevo.',

      );

    } finally {
      if (respuestaGeneradaIA) {
        setRespuestaIA(respuestaGeneradaIA);
      }
      setBuscando(false);
    }
  };

  const irAlCatalogoDelOutfit = (outfit: Outfit) => {

    if (outfit.productos.length === 0) {

      Alert.alert('Sin productos', 'No hay productos para mostrar.');

      return;

    }

    router.push({

      pathname: '/catalogo-cliente',

      params: {

        productos: JSON.stringify(

          outfit.productos.map((producto) => producto.id),

        ),

        modoOutfit: 'true',

      },

    });

  };

  const comprarOutfit = (outfit: Outfit) => {

    if (comprando) return;

    if (!carritoCargado) {

      Alert.alert(

        'Carrito cargando',

        'Espera mientras se recupera tu carrito.',

      );

      return;

    }

    if (outfit.productos.length === 0) {

      Alert.alert('Sin productos', 'No hay productos para agregar.');

      return;

    }

    const productoConVariantes = outfit.productos.find(

      (producto) => producto.tieneVariantes,

    );

    if (productoConVariantes) {

      Alert.alert(

        'Selecciona talla o color',

        `La prenda "${productoConVariantes.nombre}" tiene variantes. Selecciona la talla o el color en el catálogo.`,

        [

          { text: 'Cancelar', style: 'cancel' },

          {

            text: 'Ir al catálogo',

            onPress: () => irAlCatalogoDelOutfit(outfit),

          },

        ],

      );

      return;

    }

    const productoSinStock = outfit.productos.find(

      (producto) => producto.stock <= 0,

    );

    if (productoSinStock) {

      Alert.alert(

        'Producto sin existencias',

        `"${productoSinStock.nombre}" no tiene unidades disponibles.`,

      );

      return;

    }

    const productoQueSuperaStock = outfit.productos.find((producto) => {

      const existente = carrito.find(

        (item) => item.productoId === producto.id,

      );

      return (existente?.cantidad ?? 0) + 1 > producto.stock;

    });

    if (productoQueSuperaStock) {

      Alert.alert(

        'Stock insuficiente',

        `No hay suficientes unidades de "${productoQueSuperaStock.nombre}".`,

      );

      return;

    }

    setComprando(true);

    try {

      for (const producto of outfit.productos) {

        const productoCarrito: ProductoCarrito = {

          id: producto.id,

          productoId: producto.id,

          nombre: producto.nombre,

          codigo: producto.codigo,

          categoria: producto.categoria,

          marca: producto.marca,

          precioVenta: producto.precioVenta,

          stock: producto.stock,

          stockMinimo: producto.stockMinimo,

          imagenUrl: producto.imagen ?? '',

          cantidad: 1,

          talla: '',

          color: '',

          usaVariantes: false,

        };

        agregarAlCarrito(productoCarrito);

      }

      Alert.alert(

        '¡Outfit agregado!',

        `Total estimado: ${formatoPrecio(outfit.total)}.`,

        [

          { text: 'Seguir explorando', style: 'cancel' },

          {

            text: 'Ir al carrito',

            onPress: () => router.push('/carrito'),

          },

        ],

      );

    } catch (error) {

      console.error('Error al agregar productos:', error);

      Alert.alert(

        'Error',

        'No se pudo agregar el outfit al carrito.',

      );

    } finally {

      setComprando(false);

    }

  };

  return (

    <SafeAreaView style={styles.container}>

      <StatusBar barStyle="dark-content" backgroundColor="#FFF7FB" />

      <View style={styles.header}>

        <TouchableOpacity

          style={styles.backButton}

          onPress={() => router.back()}

          accessibilityRole="button"

          accessibilityLabel="Volver"

        >

          <Ionicons name="arrow-back" size={24} color="#D94F8A" />

        </TouchableOpacity>

        <View style={styles.headerText}>

          <Text style={styles.title}>Asistente de estilo</Text>

          <Text style={styles.subtitle}>

            Tu guía personal de Lizma Style

          </Text>

        </View>

        <TouchableOpacity

          style={styles.cartHeaderButton}

          onPress={() => router.push('/carrito')}

          accessibilityRole="button"

          accessibilityLabel="Abrir carrito"

        >

          <Ionicons name="bag-outline" size={25} color="#D94F8A" />

          {carrito.length > 0 && (

            <View style={styles.cartBadge}>

              <Text style={styles.cartBadgeText}>

                {carrito.reduce(

                  (total, item) => total + item.cantidad,

                  0,

                )}

              </Text>

            </View>

          )}

        </TouchableOpacity>

      </View>

      <ScrollView

        contentContainerStyle={styles.content}

        showsVerticalScrollIndicator={false}

        keyboardShouldPersistTaps="handled"

      >

        <View style={styles.welcomeCard}>

          <View style={styles.robotCircle}>

            <MaterialCommunityIcons

              name="robot-outline"

              size={42}

              color="#FFFFFF"

            />

          </View>

          <Text style={styles.welcomeTitle}>

            ¡Tu estilo, a tu manera!

          </Text>

          <Text style={styles.welcomeText}>

            Pregunta por productos, tallas, colores, precios o outfits.

            Te mostraré opciones del catálogo disponible.

          </Text>

        </View>

        <Text style={styles.sectionTitle}>

          ¿Qué necesitas?

        </Text>

        <TextInput

          style={styles.input}

          placeholder="Ej.: Quiero zapatos negros en talla S..."

          placeholderTextColor="#999"

          value={consulta}

          onChangeText={setConsulta}

          multiline

          maxLength={250}

          returnKeyType="search"

          onSubmitEditing={recomendarProductos}

        />

        <View style={styles.examples}>

          {[

            'Outfit casual',

            'Outfit elegante',

            'Vestidos',

            'Zapatos',

            'Talla S',

            'Perfumes económicos',

            'Carteras',

            'Tallas disponibles',

          ].map((ejemplo) => (

            <TouchableOpacity

              key={ejemplo}

              style={styles.exampleChip}

              onPress={() => setConsulta(ejemplo)}

            >

              <Text style={styles.exampleText}>{ejemplo}</Text>

            </TouchableOpacity>

          ))}

        </View>

        <TouchableOpacity

          style={[

            styles.recommendButton,

            (cargando || buscando) && styles.disabledButton,

          ]}

          onPress={recomendarProductos}

          disabled={cargando || buscando}

          activeOpacity={0.85}

        >

          {buscando || cargando ? (

            <ActivityIndicator color="#FFFFFF" />

          ) : (

            <MaterialCommunityIcons

              name="creation"

              size={21}

              color="#FFFFFF"

            />

          )}

          <Text style={styles.recommendButtonText}>

            {cargando

              ? 'Cargando catálogo...'

              : buscando

                ? 'Buscando...'

                : 'Consultar asistente'}

          </Text>

        </TouchableOpacity>

        {respuestaIA !== '' && (

          <View style={styles.responseCard}>

            <View style={styles.responseHeader}>

              <MaterialCommunityIcons

                name="robot-outline"

                size={21}

                color="#D94F8A"

              />

              <Text style={styles.responseTitle}>

                Lizma Style IA

              </Text>

            </View>

            <Text style={styles.responseText}>{respuestaIA}</Text>

          </View>

        )}

        {outfits.map((outfit, indice) => (

          <View

            key={`${outfit.titulo}-${indice}`}

            style={styles.resultsSection}

          >

            <Text style={styles.sectionTitle}>{outfit.titulo}</Text>

            <Text style={styles.outfitDescription}>

              {outfit.descripcion}

            </Text>

            {outfit.productos.map((producto) => (

              <View key={producto.id} style={styles.productCard}>

                {producto.imagen ? (

                  <Image

                    source={{ uri: producto.imagen }}

                    style={styles.productImage}

                    resizeMode="cover"

                  />

                ) : (

                  <View style={styles.productIcon}>

                    <MaterialCommunityIcons

                      name="tshirt-crew-outline"

                      size={29}

                      color="#D94F8A"

                    />

                  </View>

                )}

                <View style={styles.productInfo}>

                  <Text style={styles.productName}>

                    {producto.nombre}

                  </Text>

                  <Text style={styles.productCategory}>

                    {producto.categoria}

                    {producto.marca ? ` · ${producto.marca}` : ''}

                  </Text>

                  <Text style={styles.productPrice}>

                    {formatoPrecio(producto.precioVenta)}

                  </Text>

                  <Text style={styles.stockText}>

                    Disponible: {producto.stock}

                  </Text>

                  {producto.tallas.length > 0 && (

                    <Text style={styles.variantNotice}>

                      Tallas: {producto.tallas.join(', ')}

                    </Text>

                  )}

                  {producto.colores.length > 0 && (

                    <Text style={styles.variantNotice}>

                      Colores: {producto.colores.join(', ')}

                    </Text>

                  )}

                  {producto.tieneVariantes && (

                    <Text style={styles.variantNotice}>

                      Selecciona tu variante en el catálogo antes de comprar.

                    </Text>

                  )}

                </View>

              </View>

            ))}

            <View style={styles.totalCard}>

              <Text style={styles.totalLabel}>

                {outfit.productos.length === 1

                  ? 'Precio del producto'

                  : 'Total de la combinación'}

              </Text>

              <Text style={styles.totalPrice}>

                {formatoPrecio(outfit.total)}

              </Text>

              {presupuesto !== null && (

                <Text

                  style={[

                    styles.remainingText,

                    outfit.total > presupuesto && styles.overBudgetText,

                  ]}

                >

                  {outfit.total <= presupuesto

                    ? `Te quedan ${formatoPrecio(

                        presupuesto - outfit.total,

                      )} de tu presupuesto.`

                    : 'La combinación supera tu presupuesto.'}

                </Text>

              )}

            </View>

            <TouchableOpacity

              style={[

                styles.buyOutfitButton,

                (!carritoCargado || comprando) && styles.disabledButton,

              ]}

              onPress={() => comprarOutfit(outfit)}

              disabled={!carritoCargado || comprando}

              activeOpacity={0.85}

            >

              {comprando ? (

                <ActivityIndicator color="#FFFFFF" />

              ) : (

                <Ionicons

                  name="bag-check-outline"

                  size={21}

                  color="#FFFFFF"

                />

              )}

              <Text style={styles.buyOutfitButtonText}>

                {comprando

                  ? 'Agregando al carrito...'

                  : 'Agregar al carrito'}

              </Text>

            </TouchableOpacity>

            <TouchableOpacity

              style={styles.catalogButton}

              onPress={() => irAlCatalogoDelOutfit(outfit)}

              activeOpacity={0.85}

            >

              <Text style={styles.catalogButtonText}>

                Ver productos en el catálogo

              </Text>

              <Ionicons

                name="arrow-forward"

                size={18}

                color="#FFFFFF"

              />

            </TouchableOpacity>

          </View>

        ))}

        {!cargando && productos.length === 0 && (

          <Text style={styles.notice}>

            No hay productos disponibles para recomendar.

          </Text>

        )}

        <Text style={styles.disclaimer}>

          Las respuestas utilizan los datos disponibles en el catálogo

          de Lizma Style.

        </Text>

      </ScrollView>

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#FFF7FB',

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 18,

    paddingVertical: 14,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,

    borderBottomColor: '#F5DCE7',

  },

  backButton: {

    padding: 7,

  },

  headerText: {

    flex: 1,

    marginLeft: 10,

  },

  title: {

    fontSize: 19,

    fontWeight: '800',

    color: '#29212A',

  },

  subtitle: {

    fontSize: 12,

    color: '#777777',

    marginTop: 3,

  },

  cartHeaderButton: {

    width: 43,

    height: 43,

    borderRadius: 14,

    backgroundColor: '#FFF0F6',

    alignItems: 'center',

    justifyContent: 'center',

    marginLeft: 8,

  },

  cartBadge: {

    position: 'absolute',

    top: -4,

    right: -4,

    minWidth: 19,

    height: 19,

    paddingHorizontal: 4,

    borderRadius: 10,

    backgroundColor: '#8E3158',

    alignItems: 'center',

    justifyContent: 'center',

  },

  cartBadgeText: {

    color: '#FFFFFF',

    fontSize: 10,

    fontWeight: '900',

  },

  content: {

    padding: 20,

    paddingBottom: 35,

  },

  welcomeCard: {

    alignItems: 'center',

    backgroundColor: '#FCE4EC',

    borderRadius: 22,

    padding: 22,

    marginBottom: 26,

  },

  robotCircle: {

    width: 76,

    height: 76,

    borderRadius: 38,

    backgroundColor: '#D94F8A',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: 14,

  },

  welcomeTitle: {

    fontSize: 20,

    fontWeight: '800',

    color: '#402333',

    textAlign: 'center',

  },

  welcomeText: {

    fontSize: 14,

    color: '#705563',

    lineHeight: 21,

    textAlign: 'center',

    marginTop: 9,

  },

  sectionTitle: {

    fontSize: 18,

    fontWeight: '800',

    color: '#30242B',

    marginBottom: 12,

  },

  input: {

    minHeight: 100,

    backgroundColor: '#FFFFFF',

    borderRadius: 15,

    padding: 15,

    fontSize: 15,

    color: '#333333',

    textAlignVertical: 'top',

    borderWidth: 1,

    borderColor: '#F0D4E0',

  },

  examples: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    marginTop: 10,

    marginBottom: 20,

    gap: 8,

  },

  exampleChip: {

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#E9B8CD',

    borderRadius: 20,

    paddingHorizontal: 13,

    paddingVertical: 9,

  },

  exampleText: {

    fontSize: 12,

    color: '#B83F73',

    fontWeight: '600',

  },

  recommendButton: {

    minHeight: 52,

    borderRadius: 15,

    backgroundColor: '#D94F8A',

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 10,

    paddingHorizontal: 15,

  },

  recommendButtonText: {

    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

    textAlign: 'center',

  },

  disabledButton: {

    opacity: 0.7,

  },

  responseCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 15,

    borderWidth: 1,

    borderColor: '#F0D4E0',

    padding: 15,

    marginTop: 16,

  },

  responseHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    marginBottom: 8,

  },

  responseTitle: {

    fontSize: 14,

    fontWeight: '800',

    color: '#8E3158',

  },

  responseText: {

    fontSize: 14,

    color: '#402333',

    lineHeight: 21,

  },

  resultsSection: {

    marginTop: 28,

  },

  outfitDescription: {

    color: '#705563',

    fontSize: 13,

    lineHeight: 20,

    marginBottom: 13,

  },

  productCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 14,

    marginBottom: 12,

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#F5E2EA',

  },

  productImage: {

    width: 64,

    height: 76,

    borderRadius: 12,

    backgroundColor: '#FCE4EC',

  },

  productIcon: {

    width: 64,

    height: 76,

    borderRadius: 12,

    backgroundColor: '#FCE4EC',

    justifyContent: 'center',

    alignItems: 'center',

  },

  productInfo: {

    flex: 1,

    marginLeft: 13,

  },

  productName: {

    fontSize: 15,

    fontWeight: '800',

    color: '#30242B',

  },

  productCategory: {

    fontSize: 12,

    color: '#777777',

    marginTop: 3,

  },

  productPrice: {

    fontSize: 16,

    color: '#D94F8A',

    fontWeight: '800',

    marginTop: 5,

  },

  stockText: {

    fontSize: 11,

    color: '#58845A',

    marginTop: 3,

  },

  variantNotice: {

    fontSize: 11,

    color: '#9B526F',

    lineHeight: 16,

    marginTop: 5,

  },

  totalCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 15,

    borderWidth: 1,

    borderColor: '#F0D4E0',

    padding: 16,

    marginTop: 4,

    marginBottom: 8,

  },

  totalLabel: {

    color: '#705563',

    fontSize: 13,

  },

  totalPrice: {

    color: '#D94F8A',

    fontSize: 23,

    fontWeight: '900',

    marginTop: 5,

  },

  remainingText: {

    color: '#58845A',

    fontSize: 12,

    marginTop: 5,

  },

  overBudgetText: {

    color: '#B83250',

  },

  buyOutfitButton: {

    backgroundColor: '#8E3158',

    borderRadius: 13,

    minHeight: 50,

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 9,

    marginTop: 8,

    marginBottom: 8,

    paddingHorizontal: 12,

  },

  buyOutfitButtonText: {

    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '800',

    textAlign: 'center',

  },

  catalogButton: {

    backgroundColor: '#D94F8A',

    borderRadius: 13,

    minHeight: 48,

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 8,

    marginTop: 8,

    paddingHorizontal: 12,

  },

  catalogButtonText: {

    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '800',

    textAlign: 'center',

  },

  notice: {

    color: '#9B526F',

    textAlign: 'center',

    marginTop: 25,

    lineHeight: 21,

  },

  disclaimer: {

    fontSize: 11,

    lineHeight: 17,

    color: '#888888',

    textAlign: 'center',

    marginTop: 24,

  },

});
