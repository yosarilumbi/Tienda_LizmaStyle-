
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface ProductoCarrito {
  // Identificador único de la línea del carrito.
  id: string;

  // Identificador real del documento del producto en Firestore.
  productoId?: string;

  nombre: string;
  codigo: string;
  categoria: string;
  marca: string;
  precioVenta: number;

  // Stock disponible para el producto o la variante seleccionada.
  stock: number;
  stockMinimo: number;

  imagenUrl: string;
  cantidad: number;

  // Variantes seleccionadas por el cliente.
  talla?: string;
  color?: string;
  usaVariantes?: boolean;
}

interface CartContextType {
  carrito: ProductoCarrito[];
  cantidadProductos: number;
  totalCarrito: number;
  carritoCargado: boolean;
  agregarAlCarrito: (producto: ProductoCarrito) => void;
  aumentarCantidad: (id: string) => void;
  disminuirCantidad: (id: string) => void;
  eliminarDelCarrito: (id: string) => void;
  vaciarCarrito: () => void;
}

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

const CLAVE_CARRITO = '@LizmaStyle_carrito';

/**
 * Genera un identificador distinto para cada combinación
 * de producto, talla y color.
 */
export const crearIdLineaCarrito = (
  productoId: string,
  talla = '',
  color = ''
): string => {
  return JSON.stringify([
    productoId,
    talla.trim(),
    color.trim(),
  ]);
};

/**
 * Convierte los valores recibidos a números válidos.
 */
const numeroSeguro = (valor: unknown, minimo = 0): number => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return minimo;
  }

  return Math.max(minimo, numero);
};

/**
 * Normaliza los datos de un producto para mantener
 * la compatibilidad con carritos guardados anteriormente.
 */
const normalizarProducto = (
  producto: ProductoCarrito
): ProductoCarrito => {
  const productoId = String(
    producto.productoId || producto.id || ''
  );

  const talla = String(producto.talla ?? '').trim();
  const color = String(producto.color ?? '').trim();

  return {
    ...producto,
    productoId,
    talla,
    color,
    usaVariantes:
      producto.usaVariantes ?? Boolean(talla || color),
    id: crearIdLineaCarrito(productoId, talla, color),
    nombre: String(producto.nombre ?? ''),
    codigo: String(producto.codigo ?? ''),
    categoria: String(producto.categoria ?? ''),
    marca: String(producto.marca ?? ''),
    imagenUrl: String(producto.imagenUrl ?? ''),
    cantidad: Math.max(
      1,
      Math.floor(numeroSeguro(producto.cantidad, 1))
    ),
    stock: Math.floor(numeroSeguro(producto.stock)),
    stockMinimo: Math.floor(
      numeroSeguro(producto.stockMinimo)
    ),
    precioVenta: numeroSeguro(producto.precioVenta),
  };
};

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [carritoCargado, setCarritoCargado] = useState(false);

  /**
   * Recuperar el carrito guardado en el dispositivo.
   * Mientras se carga, no se permite agregar productos.
   */
  useEffect(() => {
    let activo = true;

    const cargarCarrito = async () => {
      try {
        const carritoGuardado = await AsyncStorage.getItem(
          CLAVE_CARRITO
        );

        if (!activo) return;

        if (carritoGuardado) {
          const productos = JSON.parse(carritoGuardado);

          if (Array.isArray(productos)) {
            const productosNormalizados: ProductoCarrito[] =
              productos
                .filter(
                  (producto) =>
                    producto &&
                    typeof producto === 'object' &&
                    (producto.productoId || producto.id)
                )
                .map((producto) =>
                  normalizarProducto(producto)
                );

            // Consolidar líneas duplicadas del mismo producto
            // y la misma combinación de talla y color.
            const productosConsolidados = new Map<
              string,
              ProductoCarrito
            >();

            productosNormalizados.forEach((producto) => {
              const existente = productosConsolidados.get(
                producto.id
              );

              if (existente) {
                existente.cantidad = Math.min(
                  existente.stock,
                  existente.cantidad + producto.cantidad
                );
              } else {
                productosConsolidados.set(producto.id, producto);
              }
            });

            setCarrito(
              Array.from(productosConsolidados.values()).filter(
                (producto) => producto.cantidad > 0
              )
            );
          }
        }
      } catch (error) {
        console.error(
          'Error al recuperar el carrito:',
          error
        );
      } finally {
        if (activo) {
          setCarritoCargado(true);
        }
      }
    };

    cargarCarrito();

    return () => {
      activo = false;
    };
  }, []);

  /**
   * Guardar los cambios solamente después de completar
   * la carga inicial del carrito.
   */
  useEffect(() => {
    if (!carritoCargado) return;

    let activo = true;

    const guardarCarrito = async () => {
      try {
        await AsyncStorage.setItem(
          CLAVE_CARRITO,
          JSON.stringify(carrito)
        );
      } catch (error) {
        if (activo) {
          console.error(
            'Error al guardar el carrito:',
            error
          );
        }
      }
    };

    guardarCarrito();

    return () => {
      activo = false;
    };
  }, [carrito, carritoCargado]);

  /**
   * Agregar un producto o aumentar la cantidad de su variante.
   */
  const agregarAlCarrito = useCallback(
    (producto: ProductoCarrito) => {
      if (!carritoCargado) {
        console.warn(
          'Espera a que termine de cargarse el carrito.'
        );
        return;
      }

      const nuevoProducto = normalizarProducto(producto);

      if (!nuevoProducto.productoId) {
        console.warn(
          'No se puede agregar un producto sin identificador.'
        );
        return;
      }

      if (nuevoProducto.stock <= 0) {
        console.warn(
          `No hay stock disponible para ${nuevoProducto.nombre}.`
        );
        return;
      }

      setCarrito((carritoActual) => {
        const existente = carritoActual.find(
          (item) => item.id === nuevoProducto.id
        );

        if (existente) {
          if (existente.cantidad >= nuevoProducto.stock) {
            return carritoActual;
          }

          return carritoActual.map((item) =>
            item.id === nuevoProducto.id
              ? {
                  ...item,
                  stock: nuevoProducto.stock,
                  precioVenta: nuevoProducto.precioVenta,
                  nombre: nuevoProducto.nombre,
                  codigo: nuevoProducto.codigo,
                  imagenUrl: nuevoProducto.imagenUrl,
                  cantidad: Math.min(
                    item.cantidad + 1,
                    nuevoProducto.stock
                  ),
                }
              : item
          );
        }

        return [
          ...carritoActual,
          {
            ...nuevoProducto,
            cantidad: 1,
          },
        ];
      });
    },
    [carritoCargado]
  );

  /**
   * Aumentar la cantidad respetando el stock disponible.
   */
  const aumentarCantidad = useCallback((id: string) => {
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        if (
          item.id !== id ||
          item.cantidad >= item.stock
        ) {
          return item;
        }

        return {
          ...item,
          cantidad: item.cantidad + 1,
        };
      })
    );
  }, []);

  /**
   * Disminuir la cantidad.
   * Si llega a cero, elimina la línea del carrito.
   */
  const disminuirCantidad = useCallback((id: string) => {
    setCarrito((carritoActual) =>
      carritoActual
        .map((item) =>
          item.id === id
            ? {
                ...item,
                cantidad: item.cantidad - 1,
              }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }, []);

  /**
   * Eliminar una combinación específica de producto,
   * talla y color.
   */
  const eliminarDelCarrito = useCallback((id: string) => {
    setCarrito((carritoActual) =>
      carritoActual.filter((item) => item.id !== id)
    );
  }, []);

  /**
   * Vaciar completamente el carrito.
   */
  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  /**
   * Calcular la cantidad total de unidades.
   */
  const cantidadProductos = useMemo(
    () =>
      carrito.reduce(
        (total, item) => total + item.cantidad,
        0
      ),
    [carrito]
  );

  /**
   * Calcular el importe total de la compra.
   */
  const totalCarrito = useMemo(
    () =>
      carrito.reduce(
        (total, item) =>
          total + item.precioVenta * item.cantidad,
        0
      ),
    [carrito]
  );

  const valorContexto = useMemo(
    () => ({
      carrito,
      cantidadProductos,
      totalCarrito,
      carritoCargado,
      agregarAlCarrito,
      aumentarCantidad,
      disminuirCantidad,
      eliminarDelCarrito,
      vaciarCarrito,
    }),
    [
      carrito,
      cantidadProductos,
      totalCarrito,
      carritoCargado,
      agregarAlCarrito,
      aumentarCantidad,
      disminuirCantidad,
      eliminarDelCarrito,
      vaciarCarrito,
    ]
  );

  return (
    <CartContext.Provider value={valorContexto}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart debe utilizarse dentro de CartProvider'
    );
  }

  return context;
}
