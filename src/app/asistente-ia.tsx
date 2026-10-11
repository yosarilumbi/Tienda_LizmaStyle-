
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
};

type Outfit = {
  titulo: string;
  descripcion: string;
  productos: Producto[];
  total: number;
};

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatoPrecio = (precio: number) =>
  `C$ ${Number(precio || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AsistenteIAScreen() {
  const router = useRouter();
  const { carrito, carritoCargado, agregarAlCarrito } = useCart();

  const [consulta, setConsulta] = useState('');
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
        const variantes = Array.isArray(datos.variantes)
          ? datos.variantes
          : [];

        const stockVariantes = variantes.reduce(
          (total: number, variante: { stock?: number }) =>
            total + Math.max(0, Number(variante.stock) || 0),
          0,
        );

        const imagen =
          typeof datos.imagenBase64 === 'string' &&
          datos.imagenBase64.length > 0
            ? datos.imagenBase64
            : typeof datos.imagen === 'string' && datos.imagen.length > 0
              ? datos.imagen
              : typeof datos.imagenUrl === 'string' &&
                  datos.imagenUrl.length > 0
                ? datos.imagenUrl
                : undefined;

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
        };
      });

      setProductos(
        lista.filter(
          (producto) => producto.stock > 0 && producto.precioVenta > 0,
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
      /(?:c\s*\$|cordobas?|presupuesto(?:\s+de)?|hasta|menos\s+de|maximo(?:\s+de)?)\s*(\d+(?:[.,]\d+)?)/,
    );

    if (!coincidencia) return null;

    const cantidad = Number(coincidencia[1].replace(',', '.'));

    return Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null;
  }, [consulta]);

  const recomendarProductos = () => {
    const textoOriginal = consulta.trim();

    if (!textoOriginal) {
      Alert.alert(
        'Cuéntame qué necesitas',
        'Ejemplo: Ármame un outfit casual para salir con presupuesto de C$1500.',
      );
      return;
    }

    if (productos.length === 0) {
      Alert.alert(
        'Catálogo sin productos disponibles',
        'No encontramos prendas con existencias y precio válido.',
      );
      return;
    }

    setBuscando(true);
    setOutfits([]);

    try {
      const texto = normalizar(textoOriginal);

      const palabras = texto
        .split(/[^a-z0-9]+/)
        .filter((palabra) => palabra.length > 2);

      const buscaOutfit =
        /\b(outfit|atuendo|look|vestirme|combina|combinar|conjunto|ropa para)\b/.test(
          texto,
        );

      const ocasiones = [
        {
          nombre: 'Casual',
          palabras: ['casual', 'diario', 'amigas', 'paseo', 'salida'],
        },
        {
          nombre: 'Elegante',
          palabras: ['elegante', 'formal', 'trabajo', 'oficina', 'reunion'],
        },
        {
          nombre: 'Fiesta',
          palabras: ['fiesta', 'cumpleanos', 'boda', 'evento', 'noche'],
        },
        {
          nombre: 'Cómodo',
          palabras: ['comodo', 'comodidad', 'relajado', 'casa'],
        },
      ];

      const ocasion = ocasiones.find((item) =>
        item.palabras.some((palabra) => texto.includes(palabra)),
      );

      const esAccesorio = (producto: Producto) => {
        const categoria = normalizar(producto.categoria);
        const nombre = normalizar(producto.nombre);

        return (
          categoria.includes('accesorio') ||
          categoria.includes('cartera') ||
          categoria.includes('bolso') ||
          categoria.includes('perfume') ||
          nombre.includes('cartera') ||
          nombre.includes('bolso') ||
          nombre.includes('perfume') ||
          nombre.includes('collar') ||
          nombre.includes('arete') ||
          nombre.includes('pulsera')
        );
      };

      const esRopa = (producto: Producto) => {
        const datos = normalizar(
          `${producto.categoria} ${producto.nombre}`,
        );

        return (
          /\b(blusa|camisa|pantalon|jean|falda|vestido|short|shorts|top|chaqueta|sueter|cardigan|ropa|zapato|zapatos|tenis|sandalia)\b/.test(
            datos,
          ) || normalizar(producto.categoria).includes('ropa')
        );
      };

      const puntuacion = (producto: Producto) => {
        const datos = normalizar(
          `${producto.nombre} ${producto.categoria} ${producto.marca}`,
        );

        let puntos = 0;

        palabras.forEach((palabra) => {
          if (datos.includes(palabra)) puntos += 3;
        });

        if (buscaOutfit && esRopa(producto)) puntos += 6;
        if (buscaOutfit && esAccesorio(producto)) puntos += 1;

        if (ocasion) {
          const nombreCategoria = normalizar(
            `${producto.nombre} ${producto.categoria}`,
          );

          if (
            ocasion.nombre === 'Elegante' &&
            /vestido|blusa|camisa|pantalon|cartera|tacon|formal/.test(
              nombreCategoria,
            )
          ) {
            puntos += 2;
          }

          if (
            ocasion.nombre === 'Casual' &&
            /jean|short|top|tenis|sandalia|blusa/.test(nombreCategoria)
          ) {
            puntos += 2;
          }

          if (
            ocasion.nombre === 'Fiesta' &&
            /vestido|blusa|falda|cartera|tacon/.test(nombreCategoria)
          ) {
            puntos += 2;
          }
        }

        return puntos;
      };

      const candidatos = productos
        .filter(
          (producto) =>
            presupuesto === null || producto.precioVenta <= presupuesto,
        )
        .map((producto) => ({
          producto,
          puntos: puntuacion(producto),
        }))
        .sort(
          (a, b) =>
            b.puntos - a.puntos ||
            a.producto.precioVenta - b.producto.precioVenta,
        )
        .map((resultado) => resultado.producto);

      if (candidatos.length === 0) {
        Alert.alert(
          'Presupuesto insuficiente',
          `No encontramos productos individuales dentro de ${formatoPrecio(
            presupuesto ?? 0,
          )}. Prueba con un presupuesto mayor.`,
        );
        return;
      }

      if (!buscaOutfit) {
        const recomendados = candidatos.slice(0, 5);

        setOutfits([
          {
            titulo: 'Recomendaciones para ti',
            descripcion:
              'Productos disponibles que coinciden con tu búsqueda.',
            productos: recomendados,
            total: recomendados.reduce(
              (total, producto) => total + producto.precioVenta,
              0,
            ),
          },
        ]);

        return;
      }

      const ropa = candidatos.filter(esRopa);
      const accesorios = candidatos.filter(esAccesorio);

      if (ropa.length === 0) {
        const recomendados = candidatos.slice(0, 5);

        setOutfits([
          {
            titulo: 'Opciones disponibles',
            descripcion:
              'No encontramos suficientes prendas para formar un outfit completo. Estas son algunas opciones del catálogo.',
            productos: recomendados,
            total: recomendados.reduce(
              (total, producto) => total + producto.precioVenta,
              0,
            ),
          },
        ]);

        return;
      }

      const prendasSeleccionadas: Producto[] = [];
      let total = 0;

      for (const prenda of ropa) {
        if (prendasSeleccionadas.length >= 3) break;

        const nombreRepetido = prendasSeleccionadas.some(
          (seleccionada) =>
            normalizar(seleccionada.nombre) === normalizar(prenda.nombre),
        );

        if (nombreRepetido) continue;

        if (
          presupuesto !== null &&
          total + prenda.precioVenta > presupuesto
        ) {
          continue;
        }

        prendasSeleccionadas.push(prenda);
        total += prenda.precioVenta;
      }

      const accesorio = accesorios.find(
        (producto) =>
          !prendasSeleccionadas.some(
            (seleccionado) => seleccionado.id === producto.id,
          ) &&
          (presupuesto === null ||
            total + producto.precioVenta <= presupuesto),
      );

      if (accesorio && prendasSeleccionadas.length < 4) {
        prendasSeleccionadas.push(accesorio);
        total += accesorio.precioVenta;
      }

      if (prendasSeleccionadas.length === 0) {
        Alert.alert(
          'No encontramos un outfit con ese presupuesto',
          'Prueba aumentando el presupuesto para combinar más prendas.',
        );

        return;
      }

      const descripcion =
        presupuesto !== null
          ? `Combinación de productos disponibles. Total: ${formatoPrecio(
              total,
            )} de ${formatoPrecio(presupuesto)} de presupuesto.`
          : 'Combinación sugerida a partir de las prendas disponibles en el catálogo.';

      setOutfits([
        {
          titulo: ocasion
            ? `Outfit ${ocasion.nombre.toLowerCase()}`
            : 'Outfit recomendado para ti',
          descripcion,
          productos: prendasSeleccionadas,
          total,
        },
      ]);
    } catch (error) {
      console.error('Error al recomendar productos:', error);

      Alert.alert(
        'Error',
        'No pudimos preparar tu recomendación. Inténtalo de nuevo.',
      );
    } finally {
      setBuscando(false);
    }
  };

  /**
   * Abre el catálogo enviando los IDs de los productos recomendados.
   * El catálogo debe leer estos parámetros y filtrar por esos IDs.
   */
  const irAlCatalogoDelOutfit = (outfit: Outfit) => {
    if (outfit.productos.length === 0) {
      Alert.alert(
        'Sin productos',
        'No hay productos recomendados para mostrar en el catálogo.',
      );
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
        'Espera un momento mientras se recupera tu carrito.',
      );
      return;
    }

    if (outfit.productos.length === 0) {
      Alert.alert(
        'Sin productos',
        'No hay productos para agregar al carrito.',
      );
      return;
    }

    const productoConVariantes = outfit.productos.find(
      (producto) => producto.tieneVariantes,
    );

    if (productoConVariantes) {
      Alert.alert(
        'Selecciona tu talla o color',
        `La prenda "${productoConVariantes.nombre}" tiene variantes. Puedes elegir la talla o el color de las prendas sugeridas desde el catálogo.`,
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
        `"${productoSinStock.nombre}" ya no tiene unidades disponibles. Genera una nueva recomendación.`,
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
        `No hay suficientes unidades de "${productoQueSuperaStock.nombre}" para agregar otra al carrito.`,
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
        `Se agregaron las prendas recomendadas. Total estimado: ${formatoPrecio(
          outfit.total,
        )}.`,
        [
          { text: 'Seguir explorando', style: 'cancel' },
          {
            text: 'Ir al carrito',
            onPress: () => router.push('/carrito'),
          },
        ],
      );
    } catch (error) {
      console.error('Error al agregar el outfit al carrito:', error);

      Alert.alert(
        'Error',
        'No se pudo agregar el outfit al carrito. Inténtalo nuevamente.',
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
          <Text style={styles.subtitle}>Tu guía personal de Lizma Style</Text>
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
            ¡Vamos a crear tu look ideal!
          </Text>

          <Text style={styles.welcomeText}>
            Dime para qué ocasión necesitas tu outfit, qué estilo te gusta y
            cuánto quieres gastar. Buscaré opciones disponibles en nuestro
            catálogo.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>¿Qué outfit quieres?</Text>

        <TextInput
          style={styles.input}
          placeholder="Ej.: Ármame un outfit casual para salir con amigas, presupuesto C$1500..."
          placeholderTextColor="#999"
          value={consulta}
          onChangeText={setConsulta}
          multiline
          maxLength={250}
        />

        <View style={styles.examples}>
          {[
            'Outfit casual',
            'Outfit elegante',
            'Look para una fiesta',
            'Outfit con C$1500',
            'Perfumes económicos',
            'Carteras',
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
                ? 'Armando tu outfit...'
                : 'Armar mi outfit'}
          </Text>
        </TouchableOpacity>

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
                  <Text style={styles.productName}>{producto.nombre}</Text>

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

                  {producto.tieneVariantes && (
                    <Text style={styles.variantNotice}>
                      Requiere elegir talla o color en el catálogo.
                    </Text>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                Total de la combinación
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
                {comprando ? 'Agregando al carrito...' : 'Comprar outfit'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.catalogButton}
              onPress={() => irAlCatalogoDelOutfit(outfit)}
              activeOpacity={0.85}
            >
              <Text style={styles.catalogButtonText}>
                Ver prendas de este outfit
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
            No hay productos disponibles para recomendar en este momento.
          </Text>
        )}

        <Text style={styles.disclaimer}>
          Las sugerencias se generan con los productos y datos disponibles en
          el catálogo de Lizma Style.
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
