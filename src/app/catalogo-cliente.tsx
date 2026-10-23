
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useCart } from '@/context/CartContext';
import { db } from '@/database/firebaseConfig';

type VarianteProducto = {
  talla: string;
  color: string;
  stock: number;
  imagenUrl?: string;
};

type Producto = {
  id: string;
  nombre: string;
  codigo?: string | number;
  categoria?: string;
  marca?: string;
  precioVenta: number;
  stock?: number;
  stockMinimo?: number;
  imagenUrl?: string;
  variantes?: VarianteProducto[];
};

const COLORES = {
  fondo: '#FFFAFC',
  blanco: '#FFFFFF',
  rosa: '#C94F82',
  rosaOscuro: '#8E3158',
  rosaClaro: '#FFF0F6',
  rosaSuave: '#FCE5EF',
  borde: '#F1DFE8',
  texto: '#442C37',
  secundario: '#997080',
  verde: '#568466',
  rojo: '#B83250',
};

const CATEGORIAS = [
  'Ver todo',
  'Blusas',
  'Pantalones',
  'Faldas',
  'Vestidos',
  'Zapatos',
  'Perfumes',
  'Carteras',
  'Accesorios',
  'Otros',
];

const normalizar = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const PALABRAS = {
  blusas: [
    'blusa', 'blusas', 'bluson', 'blusones',
    'camisa', 'camisas', 'camiseta', 'camisetas',
    'top', 'tops', 'crop top', 'body', 'bodys',
  ],
  pantalones: [
    'pantalon', 'pantalones', 'jean', 'jeans',
    'vaquero', 'vaqueros', 'pantaloneta', 'pantalonetas',
    'legging', 'leggings', 'licra', 'licras',
    'jogger', 'joggers', 'pants',
  ],
  faldas: [
    'falda', 'faldas', 'minifalda', 'minifaldas',
    'maxifalda', 'maxifaldas',
  ],
  vestidos: [
    'vestido', 'vestidos', 'maxivestido', 'maxivestidos',
    'minivestido', 'minivestidos', 'vestido de noche',
    'vestido elegante', 'vestido de fiesta', 'vestido casual',
  ],
  zapatos: [
    'zapato', 'zapatos', 'calzado', 'calzados',
    'tenis', 'zapatilla', 'zapatillas', 'sandalia',
    'sandalias', 'bota', 'botas', 'chinela', 'chinelas',
    'chancla', 'chanclas', 'tacon', 'tacones',
    'mocasin', 'mocasines', 'sneaker', 'sneakers',
    'zueco', 'zuecos', 'alpargata', 'alpargatas',
  ],
  perfumes: [
    'perfume', 'perfumes', 'perfumeria', 'fragancia',
    'fragancias', 'colonia', 'colonias', 'eau de parfum',
    'eau de toilette', 'body mist', 'mist corporal',
  ],
  carteras: ['cartera', 'carteras', 'bolso', 'bolsos'],
  accesorios: [
    'accesorio', 'accesorios', 'pulsera', 'pulseras',
    'collar', 'collares', 'arete', 'aretes', 'joyeria',
    'reloj', 'relojes', 'anillo', 'anillos', 'lente',
    'lentes', 'gafa', 'gafas', 'gorra', 'gorras',
    'sombrero', 'sombreros',
  ],
};

const contienePalabra = (
  texto: string,
  palabras: string[],
): boolean => palabras.some((palabra) => texto.includes(palabra));

const perteneceCategoria = (
  producto: Producto,
  categoriaSeleccionada: string,
): boolean => {
  const categoria = normalizar(producto.categoria);
  const nombre = normalizar(producto.nombre);
  const marca = normalizar(producto.marca);
  const seleccionada = normalizar(categoriaSeleccionada);

  if (seleccionada === 'ver todo') return true;

  const coincide = (palabras: string[]) =>
    contienePalabra(categoria, palabras) ||
    contienePalabra(nombre, palabras);

  const esBlusa = coincide(PALABRAS.blusas);
  const esPantalon = coincide(PALABRAS.pantalones);
  const esFalda = coincide(PALABRAS.faldas);
  const esVestido = coincide(PALABRAS.vestidos);
  const esZapato = coincide(PALABRAS.zapatos);
  const esPerfume =
    coincide(PALABRAS.perfumes) ||
    contienePalabra(marca, PALABRAS.perfumes);
  const esCartera = coincide(PALABRAS.carteras);
  const esAccesorio = coincide(PALABRAS.accesorios);

  switch (seleccionada) {
    case 'blusas':
      return esBlusa;
    case 'pantalones':
      return esPantalon;
    case 'faldas':
      return esFalda;
    case 'vestidos':
      return esVestido;
    case 'zapatos':
      return esZapato;
    case 'perfumes':
      return esPerfume;
    case 'carteras':
      return esCartera;
    case 'accesorios':
      return esAccesorio;
    case 'otros': {
      const conocida =
        esBlusa || esPantalon || esFalda || esVestido ||
        esZapato || esPerfume || esCartera || esAccesorio;

      if (conocida) return false;

      return (
        !categoria ||
        ['otro', 'otros', 'varios', 'ropa', 'ropa americana'].includes(categoria)
      );
    }
    default:
      return false;
  }
};

const formatearPrecio = (precio: number): string =>
  `C$ ${precio.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const obtenerStockTotal = (producto: Producto): number => {
  if (producto.variantes?.length) {
    return producto.variantes.reduce(
      (total, variante) =>
        total + Math.max(0, Number(variante.stock || 0)),
      0,
    );
  }

  return Math.max(0, Number(producto.stock || 0));
};

export default function CatalogoCliente() {
  const router = useRouter();
  const carrito = useCart();

  const params = useLocalSearchParams<{
    categoria?: string | string[];
    busqueda?: string | string[];
    productos?: string | string[];
    modoOutfit?: string | string[];
  }>();

  const obtenerParametro = (valor?: string | string[]) =>
    Array.isArray(valor) ? valor[0] : valor;

  const categoriaParam = obtenerParametro(params.categoria);
  const busquedaParam = obtenerParametro(params.busqueda);
  const productosParam = obtenerParametro(params.productos);
  const modoOutfit = obtenerParametro(params.modoOutfit) === 'true';

  const idsOutfit = useMemo<string[]>(() => {
    if (!modoOutfit || !productosParam) return [];

    try {
      const ids: unknown = JSON.parse(productosParam);
      if (!Array.isArray(ids)) return [];
      return ids.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      );
    } catch {
      return [];
    }
  }, [modoOutfit, productosParam]);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState('Ver todo');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [imagenesFallidas, setImagenesFallidas] =
    useState<Record<string, boolean>>({});
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState('');

  useEffect(() => {
    const encontrada = CATEGORIAS.find(
      (categoria) =>
        normalizar(categoria) === normalizar(categoriaParam),
    );
    setCategoriaSeleccionada(encontrada ?? 'Ver todo');
  }, [categoriaParam]);

  useEffect(() => {
    setBusqueda(busquedaParam ?? '');
  }, [busquedaParam]);

  const cargarProductos = useCallback(async () => {
    try {
      setErrorCarga(false);

      const referencia = collection(db, 'productos');
      const consulta = query(referencia, orderBy('fechaRegistro', 'desc'));
      const resultado = await getDocs(consulta);

      const lista: Producto[] = resultado.docs.map((documento) => {
        const datos = documento.data();

        const variantes: VarianteProducto[] = Array.isArray(datos.variantes)
          ? datos.variantes.map((variante: any) => ({
              talla: String(variante.talla ?? ''),
              color: String(variante.color ?? ''),
              stock: Math.max(0, Number(variante.stock ?? 0)),
              imagenUrl:
                typeof variante.imagenUrl === 'string'
                  ? variante.imagenUrl
                  : '',
            }))
          : [];

        const stockVariantes = variantes.reduce(
          (total, variante) => total + variante.stock,
          0,
        );

        const imagenUrl =
          typeof datos.imagenUrl === 'string' && datos.imagenUrl
            ? datos.imagenUrl
            : typeof datos.imagenBase64 === 'string' && datos.imagenBase64
              ? datos.imagenBase64
              : typeof datos.imagen === 'string' && datos.imagen
                ? datos.imagen
                : '';

        return {
          id: documento.id,
          nombre: String(datos.nombre ?? 'Producto sin nombre'),
          codigo: datos.codigo,
          categoria: String(datos.categoria ?? ''),
          marca: String(datos.marca ?? ''),
          precioVenta: Math.max(0, Number(datos.precioVenta ?? 0)),
          stock: variantes.length
            ? stockVariantes
            : Math.max(0, Number(datos.stock ?? 0)),
          stockMinimo: Math.max(0, Number(datos.stockMinimo ?? 0)),
          imagenUrl,
          variantes,
        };
      });

      setProductos(lista);
      setImagenesFallidas({});
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setErrorCarga(true);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const productosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda);
    const idsPermitidos = new Set(idsOutfit);

    return productos.filter((producto) => {
      const perteneceAlOutfit =
        !modoOutfit || idsPermitidos.has(producto.id);

      const coincideCategoria = perteneceCategoria(
        producto,
        categoriaSeleccionada,
      );

      const coincideBusqueda =
        !texto ||
        normalizar(producto.nombre).includes(texto) ||
        normalizar(producto.codigo).includes(texto) ||
        normalizar(producto.marca).includes(texto) ||
        normalizar(producto.categoria).includes(texto);

      return perteneceAlOutfit && coincideCategoria && coincideBusqueda;
    });
  }, [productos, categoriaSeleccionada, busqueda, modoOutfit, idsOutfit]);

  const variantesDisponibles = useMemo(
    () =>
      (productoSeleccionado?.variantes ?? []).filter(
        (variante) => variante.stock > 0,
      ),
    [productoSeleccionado],
  );

  const tieneVariantes = Boolean(
    productoSeleccionado?.variantes?.length,
  );

  const coloresDisponibles = useMemo(
    () =>
      Array.from(
        new Map(
          variantesDisponibles
            .filter((variante) => variante.color.trim())
            .map((variante) => [
              normalizar(variante.color),
              variante.color.trim(),
            ]),
        ).values(),
      ),
    [variantesDisponibles],
  );

  const tallasDisponibles = useMemo(
    () =>
      Array.from(
        new Map(
          variantesDisponibles
            .filter(
              (variante) =>
                !colorSeleccionado ||
                normalizar(variante.color) === normalizar(colorSeleccionado),
            )
            .filter((variante) => variante.talla.trim())
            .map((variante) => [
              normalizar(variante.talla),
              variante.talla.trim(),
            ]),
        ).values(),
      ),
    [variantesDisponibles, colorSeleccionado],
  );

  const varianteElegida = useMemo(() => {
    if (!tieneVariantes) return null;

    return (
      variantesDisponibles.find(
        (variante) =>
          normalizar(variante.talla) === normalizar(tallaSeleccionada) &&
          normalizar(variante.color) === normalizar(colorSeleccionado),
      ) ?? null
    );
  }, [
    tieneVariantes,
    variantesDisponibles,
    tallaSeleccionada,
    colorSeleccionado,
  ]);

  const imagenSeleccionada = useMemo(() => {
    if (!productoSeleccionado) return '';

    const variantesDelColor = variantesDisponibles.filter(
      (variante) =>
        normalizar(variante.color) === normalizar(colorSeleccionado),
    );

    const varianteExacta = variantesDelColor.find(
      (variante) =>
        normalizar(variante.talla) === normalizar(tallaSeleccionada) &&
        Boolean(variante.imagenUrl),
    );

    const imagenDelColor = variantesDelColor.find(
      (variante) => Boolean(variante.imagenUrl),
    );

    return (
      varianteExacta?.imagenUrl ||
      imagenDelColor?.imagenUrl ||
      productoSeleccionado.imagenUrl ||
      ''
    );
  }, [
    productoSeleccionado,
    variantesDisponibles,
    colorSeleccionado,
    tallaSeleccionada,
  ]);

  const abrirDetalles = (producto: Producto) => {
    setProductoSeleccionado(producto);

    const disponibles = (producto.variantes ?? []).filter(
      (variante) => variante.stock > 0,
    );

    const primera = disponibles[0];

    setTallaSeleccionada(primera?.talla ?? '');
    setColorSeleccionado(primera?.color ?? '');
  };

  const agregarProducto = (
    producto: Producto,
    variante?: VarianteProducto,
  ): boolean => {
    const usaVariantes = Boolean(producto.variantes?.length);

    if (usaVariantes && !variante) {
      Alert.alert(
        'Seleccioná una opción',
        'Elegí una talla y un color disponibles antes de agregar el producto.',
      );
      return false;
    }

    const stockDisponible = variante
      ? Math.max(0, Number(variante.stock || 0))
      : obtenerStockTotal(producto);

    if (stockDisponible <= 0) {
      Alert.alert('Producto agotado', 'No hay unidades disponibles.');
      return false;
    }

    const talla = variante?.talla ?? '';
    const color = variante?.color ?? '';

    const productoExistente = carrito.carrito.find((item: any) => {
      const mismoProducto = (item.productoId || item.id) === producto.id;

      return (
        mismoProducto &&
        normalizar(item.talla) === normalizar(talla) &&
        normalizar(item.color) === normalizar(color)
      );
    });

    if (
      productoExistente &&
      productoExistente.cantidad >= stockDisponible
    ) {
      Alert.alert(
        'Existencias insuficientes',
        `Solo hay ${stockDisponible} unidad(es) disponibles de esta opción.`,
      );
      return false;
    }

    carrito.agregarAlCarrito({
      id: producto.id,
      productoId: producto.id,
      nombre: producto.nombre,
      codigo: String(producto.codigo ?? ''),
      categoria: producto.categoria ?? '',
      marca: producto.marca ?? '',
      precioVenta: producto.precioVenta,
      stock: stockDisponible,
      stockMinimo: producto.stockMinimo ?? 0,
      imagenUrl: variante?.imagenUrl || producto.imagenUrl || '',
      cantidad: 1,
      talla,
      color,
      usaVariantes,
    });

    Alert.alert(
      '¡Producto agregado!',
      `${producto.nombre}${talla ? `\nTalla: ${talla}` : ''}${color ? `\nColor: ${color}` : ''} se agregó al carrito.`,
    );

    return true;
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaSeleccionada('Ver todo');

    router.replace({
      pathname: '/catalogo-cliente',
      params: {
        categoria: 'Ver todo',
        ...(modoOutfit
          ? {
              productos: JSON.stringify(idsOutfit),
              modoOutfit: 'true',
            }
          : {}),
      },
    });
  };

  const renderProducto = ({ item }: { item: Producto }) => {
    const stockTotal = obtenerStockTotal(item);
    const agotado = stockTotal <= 0;
    const stockBajo = !agotado && stockTotal <= (item.stockMinimo ?? 0);
    const tieneImagen =
      Boolean(item.imagenUrl) && !imagenesFallidas[item.imagenUrl!];
    const tieneVariantesProducto = Boolean(item.variantes?.length);

    return (
      <View style={styles.tarjetaProducto}>
        <Pressable
          onPress={() => abrirDetalles(item)}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalles de ${item.nombre}`}
        >
          <View style={styles.contenedorImagen}>
            {tieneImagen ? (
              <Image
                source={{ uri: item.imagenUrl }}
                style={styles.imagenProducto}
              resizeMode="cover"
                onError={() =>
                  setImagenesFallidas((anterior) => ({
                    ...anterior,
                    [item.imagenUrl!]: true,
                  }))
                }
              />
            ) : (
              <View style={styles.imagenAlternativa}>
                <Ionicons name="image-outline" size={38} color="#D48AA9" />
                <Text style={styles.textoSinImagen}>Imagen no disponible</Text>
              </View>
            )}

            {agotado ? (
              <View style={[styles.etiquetaEstado, styles.etiquetaAgotado]}>
                <Text style={styles.textoEtiqueta}>Agotado</Text>
              </View>
            ) : stockBajo ? (
              <View style={[styles.etiquetaEstado, styles.etiquetaStockBajo]}>
                <Text style={styles.textoEtiqueta}>¡Pocas unidades!</Text>
              </View>
            ) : null}

            {!!item.marca && (
              <View style={styles.etiquetaMarca}>
                <Text style={styles.textoEtiquetaMarca} numberOfLines={1}>
                  {item.marca}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.informacionProducto}>
            <Text style={styles.nombreProducto} numberOfLines={2}>
              {item.nombre}
            </Text>
            <Text style={styles.categoriaProducto} numberOfLines={1}>
              {item.categoria || 'Sin categoría'}
            </Text>
            <Text style={styles.precioProducto}>
              {formatearPrecio(item.precioVenta)}
            </Text>

            <View style={styles.filaStock}>
              <View
                style={[
                  styles.puntoStock,
                  agotado && styles.puntoAgotado,
                  stockBajo && styles.puntoStockBajo,
                ]}
              />
              <Text
                style={[
                  styles.stockProducto,
                  agotado && styles.stockAgotado,
                  stockBajo && styles.stockBajo,
                ]}
              >
                {agotado ? 'Sin existencias' : `${stockTotal} disponibles`}
              </Text>
            </View>

            {tieneVariantesProducto && !agotado && (
              <Text style={styles.textoVariantesTarjeta}>
                Seleccioná talla y color
              </Text>
            )}

            <View style={styles.botonVerDetalles}>
              <Ionicons name="eye-outline" size={16} color={COLORES.rosaOscuro} />
              <Text style={styles.textoVerDetalles}>Ver detalles</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.contenedorBotonAgregar}>
          <Pressable
            style={({ pressed }) => [
              styles.botonAgregar,
              agotado && styles.botonDeshabilitado,
              pressed && !agotado && styles.botonPresionado,
            ]}
            onPress={() => {
              if (agotado) return;
              if (tieneVariantesProducto) abrirDetalles(item);
              else agregarProducto(item);
            }}
            disabled={agotado}
          >
            <Ionicons name="cart-outline" size={17} color={COLORES.blanco} />
            <Text style={styles.textoBotonAgregar}>
              {agotado
                ? 'Agotado'
                : tieneVariantesProducto
                  ? 'Elegir opción'
                  : 'Agregar'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const cantidadCarrito = carrito.cantidadProductos;

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORES.fondo} />

      <View style={styles.encabezado}>
        <Pressable style={styles.botonVolver} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORES.rosaOscuro} />
        </Pressable>

        <View style={styles.tituloContenedor}>
          <Text style={styles.marcaSuperior}>LIZMA STYLE</Text>
          <Text style={styles.titulo}>
            {modoOutfit ? 'Tu outfit recomendado' : 'Nuestro catálogo'}
          </Text>
          <Text style={styles.subtitulo}>
            {modoOutfit
              ? 'Selecciona las tallas y colores de tus prendas'
              : 'Encuentra algo especial para ti'}
          </Text>
        </View>

        <Pressable
          style={styles.botonCarrito}
          onPress={() => router.push('/carrito')}
          accessibilityLabel={`Carrito, ${cantidadCarrito} productos`}
        >
          <Ionicons name="bag-handle-outline" size={24} color={COLORES.blanco} />
          {cantidadCarrito > 0 && (
            <View style={styles.contadorCarrito}>
              <Text style={styles.textoContador}>
                {cantidadCarrito > 99 ? '99+' : cantidadCarrito}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {modoOutfit && (
        <View style={styles.avisoOutfit}>
          <Ionicons name="sparkles-outline" size={18} color={COLORES.rosaOscuro} />
          <Text style={styles.textoAvisoOutfit}>
            Solo se muestran las prendas de tu recomendación.
          </Text>
        </View>
      )}

      <View style={styles.seccionBusqueda}>
        <View style={styles.contenedorBusqueda}>
          <Ionicons name="search-outline" size={21} color={COLORES.rosa} />
          <TextInput
            style={styles.inputBusqueda}
            placeholder="Buscar productos, marcas..."
            placeholderTextColor="#B49AA6"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar productos"
          />
          {!!busqueda && (
            <Pressable onPress={() => setBusqueda('')} style={styles.botonLimpiarBusqueda}>
              <Ionicons name="close-circle" size={21} color="#B49AA6" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.seccionCategorias}>
        <View style={styles.encabezadoCategorias}>
          <Text style={styles.tituloCategorias}>
            {modoOutfit ? 'Filtrar prendas por categoría' : 'Explora por categoría'}
          </Text>
          <Ionicons name="sparkles-outline" size={19} color={COLORES.rosa} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listaCategorias}
        >
          {CATEGORIAS.map((categoria) => {
            const seleccionada =
              normalizar(categoriaSeleccionada) === normalizar(categoria);

            return (
              <Pressable
                key={categoria}
                onPress={() => setCategoriaSeleccionada(categoria)}
                style={[
                  styles.botonCategoria,
                  seleccionada && styles.categoriaSeleccionada,
                ]}
              >
                <Text
                  style={[
                    styles.textoCategoria,
                    seleccionada && styles.textoCategoriaSeleccionada,
                  ]}
                >
                  {categoria}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.encabezadoProductos}>
        <View>
          <Text style={styles.tituloProductos}>
            {modoOutfit
              ? 'Prendas de tu outfit'
              : busqueda.trim()
                ? 'Resultados de búsqueda'
                : categoriaSeleccionada}
          </Text>
          <Text style={styles.subtituloResultados}>
            {cargando
              ? 'Preparando tu catálogo...'
              : `${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}`}
          </Text>
        </View>

        {(busqueda.trim() || categoriaSeleccionada !== 'Ver todo') && (
          <Pressable style={styles.botonFiltros} onPress={limpiarFiltros}>
            <Ionicons name="refresh-outline" size={15} color={COLORES.rosa} />
            <Text style={styles.textoFiltros}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      {cargando ? (
        <View style={styles.estadoCarga}>
          <ActivityIndicator size="large" color={COLORES.rosa} />
          <Text style={styles.textoCarga}>Preparando algo bonito para ti...</Text>
        </View>
      ) : errorCarga ? (
        <View style={styles.estadoVacio}>
          <View style={styles.iconoEstado}>
            <Ionicons name="cloud-offline-outline" size={38} color={COLORES.rosa} />
          </View>
          <Text style={styles.tituloVacio}>No pudimos cargar el catálogo</Text>
          <Text style={styles.textoVacio}>
            Revisa tu conexión e intenta cargar los productos nuevamente.
          </Text>
          <Pressable
            style={styles.botonVerTodo}
            onPress={() => {
              setCargando(true);
              cargarProductos();
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORES.blanco} />
            <Text style={styles.textoVerTodo}>Intentar nuevamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderProducto}
          numColumns={2}
          columnWrapperStyle={styles.filaProductos}
          contentContainerStyle={styles.listaProductos}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          extraData={imagenesFallidas}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => {
                setActualizando(true);
                cargarProductos();
              }}
              colors={[COLORES.rosa]}
              tintColor={COLORES.rosa}
              progressBackgroundColor={COLORES.blanco}
            />
          }
          ListEmptyComponent={
            <View style={styles.estadoVacio}>
              <View style={styles.iconoEstado}>
                <Ionicons name="search-outline" size={38} color={COLORES.rosa} />
              </View>
              <Text style={styles.tituloVacio}>
                {modoOutfit && idsOutfit.length === 0
                  ? 'No se recibió el outfit'
                  : 'No encontramos productos'}
              </Text>
              <Text style={styles.textoVacio}>
                {modoOutfit && idsOutfit.length === 0
                  ? 'Regresa al asistente y selecciona Comprar outfit para cargar las prendas recomendadas.'
                  : busqueda.trim()
                    ? `No hay resultados para "${busqueda.trim()}". Prueba con otro nombre o marca.`
                    : modoOutfit
                      ? 'Las prendas recomendadas no coinciden con esta categoría o ya no están disponibles.'
                      : `Todavía no hay productos en ${categoriaSeleccionada.toLowerCase()}.`}
              </Text>
              <Pressable style={styles.botonVerTodo} onPress={limpiarFiltros}>
                <Text style={styles.textoVerTodo}>
                  {modoOutfit ? 'Restablecer filtros' : 'Ver todo el catálogo'}
                </Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

      <Modal
        visible={productoSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setProductoSeleccionado(null)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenedorModal}>
            <View style={styles.encabezadoModal}>
              <Text style={styles.tituloModal}>Detalles del producto</Text>
              <Pressable
                style={styles.botonCerrarModal}
                onPress={() => setProductoSeleccionado(null)}
                accessibilityLabel="Cerrar detalles"
              >
                <Ionicons name="close" size={23} color={COLORES.rosaOscuro} />
              </Pressable>
            </View>

            {productoSeleccionado && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contenidoModal}
              >
                {imagenSeleccionada &&
                !imagenesFallidas[imagenSeleccionada] ? (
                  <Image
                    key={imagenSeleccionada}
                    source={{ uri: imagenSeleccionada }}
                    style={styles.imagenDetalle}
                    resizeMode="contain"
                    onError={() =>
                      setImagenesFallidas((anterior) => ({
                        ...anterior,
                        [imagenSeleccionada]: true,
                      }))
                    }
                  />
                ) : (
                  <View style={styles.imagenDetalleAlternativa}>
                    <Ionicons name="image-outline" size={52} color="#D48AA9" />
                    <Text style={styles.textoSinImagen}>Imagen no disponible</Text>
                  </View>
                )}

                <Text style={styles.nombreDetalle}>
                  {productoSeleccionado.nombre}
                </Text>
                {!!productoSeleccionado.marca && (
                  <Text style={styles.marcaDetalle}>
                    {productoSeleccionado.marca}
                  </Text>
                )}
                <Text style={styles.categoriaDetalle}>
                  {productoSeleccionado.categoria || 'Sin categoría'}
                </Text>
                <Text style={styles.precioDetalle}>
                  {formatearPrecio(productoSeleccionado.precioVenta)}
                </Text>

                <View style={styles.divisorModal} />

                {tieneVariantes ? (
                  <>
                    {tallasDisponibles.length > 0 && (
                      <>
                        <Text style={styles.tituloSeccionDetalle}>
                          1. Seleccioná la talla
                        </Text>
                        <View style={styles.listaOpciones}>
                          {tallasDisponibles.map((talla) => {
                            const seleccionada =
                              normalizar(tallaSeleccionada) === normalizar(talla);

                            return (
                              <Pressable
                                key={talla}
                                style={[
                                  styles.opcionTalla,
                                  seleccionada && styles.opcionSeleccionada,
                                ]}
                                onPress={() => setTallaSeleccionada(talla)}
                              >
                                <Text
                                  style={[
                                    styles.textoOpcionTalla,
                                    seleccionada && styles.textoOpcionSeleccionada,
                                  ]}
                                >
                                  {talla}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}

                    <Text style={styles.tituloSeccionDetalle}>
                      {tallasDisponibles.length > 0
                        ? '2. Seleccioná el color'
                        : 'Seleccioná el color'}
                    </Text>

                    {coloresDisponibles.length > 0 ? (
                      <View style={styles.listaOpciones}>
                        {coloresDisponibles.map((color) => {
                          const seleccionada =
                            normalizar(colorSeleccionado) === normalizar(color);

                          return (
                            <Pressable
                              key={color}
                              style={[
                                styles.opcionColor,
                                seleccionada && styles.opcionSeleccionada,
                              ]}
                              onPress={() => {
                                setColorSeleccionado(color);

                                const tallasDelColor = variantesDisponibles.filter(
                                  (variante) =>
                                    normalizar(variante.color) === normalizar(color),
                                );

                                const tallaSigueDisponible = tallasDelColor.some(
                                  (variante) =>
                                    normalizar(variante.talla) ===
                                    normalizar(tallaSeleccionada),
                                );

                                if (!tallaSigueDisponible) {
                                  setTallaSeleccionada(
                                    tallasDelColor[0]?.talla ?? '',
                                  );
                                }
                              }}
                            >
                              <View style={styles.puntoColor}>
                                <Ionicons
                                  name="color-palette-outline"
                                  size={15}
                                  color={
                                    seleccionada
                                      ? COLORES.blanco
                                      : COLORES.rosaOscuro
                                  }
                                />
                              </View>
                              <Text
                                style={[
                                  styles.textoOpcionColor,
                                  seleccionada && styles.textoOpcionSeleccionada,
                                ]}
                              >
                                {color}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.textoSinVariantes}>
                        No hay colores con existencias.
                      </Text>
                    )}

                    {varianteElegida ? (
                      <View style={styles.tarjetaVarianteSeleccionada}>
                        <Ionicons
                          name="checkmark-circle"
                          size={23}
                          color={COLORES.verde}
                        />
                        <View style={styles.informacionVariante}>
                          <Text style={styles.nombreVariante}>
                            {[varianteElegida.talla, varianteElegida.color]
                              .filter(Boolean)
                              .join(' · ') || 'Opción seleccionada'}
                          </Text>
                          <Text style={styles.stockVariante}>
                            {varianteElegida.stock} unidad
                            {varianteElegida.stock === 1 ? '' : 'es'} disponibles
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.avisoSinVariantes}>
                        <Ionicons
                          name="information-circle-outline"
                          size={21}
                          color={COLORES.secundario}
                        />
                        <Text style={styles.textoAvisoVariantes}>
                          Elegí una combinación de talla y color que tenga existencias.
                        </Text>
                      </View>
                    )}

                    <View style={styles.stockGeneralDetalle}>
                      <Ionicons
                        name="cube-outline"
                        size={19}
                        color={COLORES.rosaOscuro}
                      />
                      <Text style={styles.textoStockGeneral}>
                        Existencias generales: {obtenerStockTotal(productoSeleccionado)}
                      </Text>
                    </View>

                    <Pressable
                      style={[
                        styles.botonAgregarDetalle,
                        !varianteElegida && styles.botonDeshabilitado,
                      ]}
                      disabled={!varianteElegida}
                      onPress={() => {
                        if (!varianteElegida) return;

                        if (agregarProducto(productoSeleccionado, varianteElegida)) {
                          setProductoSeleccionado(null);
                        }
                      }}
                    >
                      <Ionicons name="cart-outline" size={19} color={COLORES.blanco} />
                      <Text style={styles.textoBotonAgregarDetalle}>
                        {varianteElegida
                          ? 'Agregar opción al carrito'
                          : 'Elegí una opción disponible'}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.stockGeneralDetalle}>
                      <Ionicons
                        name="cube-outline"
                        size={19}
                        color={COLORES.rosaOscuro}
                      />
                      <Text style={styles.textoStockGeneral}>
                        Existencias: {obtenerStockTotal(productoSeleccionado)}
                      </Text>
                    </View>
                    <Pressable
                      style={[
                        styles.botonAgregarDetalle,
                        obtenerStockTotal(productoSeleccionado) <= 0 &&
                          styles.botonDeshabilitado,
                      ]}
                      disabled={obtenerStockTotal(productoSeleccionado) <= 0}
                      onPress={() => {
                        if (agregarProducto(productoSeleccionado)) {
                          setProductoSeleccionado(null);
                        }
                      }}
                    >
                      <Ionicons name="cart-outline" size={19} color={COLORES.blanco} />
                      <Text style={styles.textoBotonAgregarDetalle}>
                        {obtenerStockTotal(productoSeleccionado) <= 0
                          ? 'Producto agotado'
                          : 'Agregar al carrito'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORES.fondo },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  botonVolver: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORES.blanco,
    borderWidth: 1,
    borderColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  tituloContenedor: { flex: 1 },
  marcaSuperior: {
    color: COLORES.rosa,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 3,
  },
  titulo: { fontSize: 21, fontWeight: '800', color: COLORES.rosaOscuro },
  subtitulo: { fontSize: 11, color: COLORES.secundario, marginTop: 3 },
  avisoOutfit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: COLORES.rosaClaro,
  },
  textoAvisoOutfit: {
    flex: 1,
    color: COLORES.rosaOscuro,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  botonCarrito: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORES.rosa,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 8,
  },
  contadorCarrito: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORES.rosaOscuro,
    borderWidth: 1.5,
    borderColor: COLORES.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoContador: { color: COLORES.blanco, fontSize: 10, fontWeight: '800' },
  seccionBusqueda: { paddingHorizontal: 16, paddingBottom: 16 },
  contenedorBusqueda: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.borde,
    paddingHorizontal: 14,
  },
  inputBusqueda: {
    flex: 1,
    color: COLORES.texto,
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  botonLimpiarBusqueda: { padding: 3 },
  seccionCategorias: { paddingTop: 3, paddingBottom: 18 },
  encabezadoCategorias: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 11,
  },
  tituloCategorias: { fontSize: 15, fontWeight: '800', color: COLORES.texto },
  listaCategorias: { paddingHorizontal: 16, gap: 9 },
  botonCategoria: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: COLORES.blanco,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  categoriaSeleccionada: { backgroundColor: COLORES.rosa, borderColor: COLORES.rosa },
  textoCategoria: { color: COLORES.rosaOscuro, fontSize: 12, fontWeight: '600' },
  textoCategoriaSeleccionada: { color: COLORES.blanco, fontWeight: '800' },
  encabezadoProductos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tituloProductos: { fontSize: 18, fontWeight: '800', color: COLORES.texto },
  subtituloResultados: { color: COLORES.secundario, fontSize: 11, marginTop: 4 },
  botonFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORES.rosaClaro,
  },
  textoFiltros: { color: COLORES.rosa, fontSize: 11, fontWeight: '700' },
  listaProductos: { paddingHorizontal: 12, paddingBottom: 20, flexGrow: 1 },
  filaProductos: { justifyContent: 'space-between' },
  tarjetaProducto: {
    width: '48.5%',
    backgroundColor: COLORES.blanco,
    borderRadius: 17,
    marginBottom: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORES.borde,
    elevation: 2,
    shadowColor: '#A75C7C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },

  // Todas las tarjetas reservan la misma área para las imágenes.
  contenedorImagen: {
  width: '100%',
  height: 170,
  backgroundColor: COLORES.rosaClaro,
  position: 'relative',
  overflow: 'hidden',
},

imagenProducto: {
  width: '100%',
  height: '100%',
},
  imagenAlternativa: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  textoSinImagen: {
    color: '#B16C89',
    fontSize: 10,
    marginTop: 7,
    textAlign: 'center',
  },
  etiquetaEstado: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  etiquetaAgotado: { backgroundColor: '#8C354F' },
  etiquetaStockBajo: { backgroundColor: '#A56A34' },
  textoEtiqueta: { color: COLORES.blanco, fontSize: 9, fontWeight: '800' },
  etiquetaMarca: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    maxWidth: '85%',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  textoEtiquetaMarca: { color: COLORES.rosaOscuro, fontSize: 9, fontWeight: '800' },
  informacionProducto: { padding: 10 },
  nombreProducto: {
    color: COLORES.texto,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    minHeight: 36,
  },
  categoriaProducto: { color: COLORES.secundario, fontSize: 10, marginTop: 4 },
  precioProducto: {
    color: COLORES.rosaOscuro,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  filaStock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    marginBottom: 11,
    gap: 5,
  },
  puntoStock: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORES.verde },
  puntoAgotado: { backgroundColor: COLORES.rojo },
  puntoStockBajo: { backgroundColor: '#A56A34' },
  stockProducto: { flex: 1, color: COLORES.verde, fontSize: 10 },
  stockAgotado: { color: COLORES.rojo },
  stockBajo: { color: '#A56A34' },
  textoVariantesTarjeta: {
    color: COLORES.rosaOscuro,
    fontSize: 10,
    fontWeight: '700',
    marginTop: -5,
    marginBottom: 9,
  },
  botonVerDetalles: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.rosaClaro,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  textoVerDetalles: { color: COLORES.rosaOscuro, fontSize: 11, fontWeight: '800' },
  contenedorBotonAgregar: { paddingHorizontal: 10, paddingBottom: 10 },
  botonAgregar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORES.rosa,
    borderRadius: 11,
    paddingHorizontal: 5,
    paddingVertical: 9,
  },
  botonDeshabilitado: { backgroundColor: '#C9B8C0' },
  botonPresionado: { backgroundColor: COLORES.rosaOscuro, opacity: 0.9 },
  textoBotonAgregar: { color: COLORES.blanco, fontSize: 11, fontWeight: '800' },
  estadoCarga: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    paddingBottom: 50,
  },
  textoCarga: { color: COLORES.secundario, fontSize: 13 },
  estadoVacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 45,
  },
  iconoEstado: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: COLORES.rosaClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tituloVacio: {
    color: COLORES.rosaOscuro,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  textoVacio: {
    color: COLORES.secundario,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  botonVerTodo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORES.rosa,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  textoVerTodo: { color: COLORES.blanco, fontSize: 12, fontWeight: '800' },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(40, 18, 29, 0.48)',
    justifyContent: 'flex-end',
  },
  contenedorModal: {
    maxHeight: '92%',
    backgroundColor: COLORES.fondo,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  encabezadoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.borde,
  },
  tituloModal: { color: COLORES.rosaOscuro, fontSize: 18, fontWeight: '800' },
  botonCerrarModal: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORES.rosaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenidoModal: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 25 },
  imagenDetalle: {
    width: '100%',
    height: 210,
    backgroundColor: COLORES.blanco,
    borderRadius: 17,
  },
  imagenDetalleAlternativa: {
    height: 150,
    borderRadius: 17,
    backgroundColor: COLORES.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreDetalle: { color: COLORES.texto, fontSize: 22, fontWeight: '800', marginTop: 16 },
  marcaDetalle: { color: COLORES.rosa, fontSize: 13, fontWeight: '700', marginTop: 5 },
  categoriaDetalle: { color: COLORES.secundario, fontSize: 12, marginTop: 5 },
  precioDetalle: { color: COLORES.rosaOscuro, fontSize: 23, fontWeight: '800', marginTop: 9 },
  divisorModal: { height: 1, backgroundColor: COLORES.borde, marginVertical: 19 },
  tituloSeccionDetalle: {
    color: COLORES.texto,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 10,
  },
  listaOpciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  opcionTalla: {
    minWidth: 43,
    minHeight: 40,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORES.rosa,
    backgroundColor: COLORES.blanco,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionSeleccionada: { backgroundColor: COLORES.rosa, borderColor: COLORES.rosaOscuro },
  textoOpcionTalla: { color: COLORES.rosaOscuro, fontSize: 13, fontWeight: '800' },
  textoOpcionSeleccionada: { color: COLORES.blanco },
  opcionColor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: COLORES.blanco,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
  },
  puntoColor: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORES.rosaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoOpcionColor: { color: COLORES.texto, fontSize: 12, fontWeight: '700' },
  textoSinVariantes: { color: COLORES.secundario, fontSize: 12, lineHeight: 18 },
  tarjetaVarianteSeleccionada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORES.blanco,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  informacionVariante: { flex: 1 },
  nombreVariante: { color: COLORES.texto, fontSize: 13, fontWeight: '800' },
  stockVariante: { color: COLORES.secundario, fontSize: 11, marginTop: 4 },
  avisoSinVariantes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORES.rosaClaro,
    borderRadius: 12,
  },
  textoAvisoVariantes: {
    flex: 1,
    color: COLORES.secundario,
    fontSize: 12,
    lineHeight: 18,
  },
  stockGeneralDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 13,
    backgroundColor: COLORES.rosaClaro,
    borderRadius: 12,
  },
  textoStockGeneral: { color: COLORES.rosaOscuro, fontSize: 12, fontWeight: '800' },
  botonAgregarDetalle: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORES.rosa,
    borderRadius: 13,
    marginTop: 17,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  textoBotonAgregarDetalle: {
    color: COLORES.blanco,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});
