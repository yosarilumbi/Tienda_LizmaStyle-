
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../database/firebaseConfig";

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  direccion: string;
  fechaRegistro?: any;
}

export default function ClientesScreen() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  // ===============================
  // CARGAR CLIENTES
  // ===============================
  const cargarClientes = async () => {
    try {
      setCargando(true);

      const resultado = await getDocs(
        collection(db, "clientes")
      );

      const lista: Cliente[] = resultado.docs.map((item) => {
        const datos = item.data();

        return {
          id: item.id,
          nombre: datos.nombre || "",
          apellido: datos.apellido || "",
          telefono: datos.telefono || "",
          correo: datos.correo || "",
          direccion: datos.direccion || "",
          fechaRegistro: datos.fechaRegistro,
        };
      });

      setClientes(lista);
    } catch (error) {
      console.error("Error cargando clientes:", error);

      Alert.alert(
        "Error",
        "No se pudieron cargar los clientes."
      );
    } finally {
      setCargando(false);
    }
  };

  // ===============================
  // LIMPIAR FORMULARIO
  // ===============================
  const limpiarFormulario = () => {
    setNombre("");
    setApellido("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setClienteId(null);
    setEditando(false);
  };

  // ===============================
  // ABRIR NUEVO CLIENTE
  // ===============================
  const abrirNuevoCliente = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  // ===============================
  // ABRIR EDITAR
  // ===============================
  const abrirEditar = (cliente: Cliente) => {
    setClienteId(cliente.id);

    setNombre(cliente.nombre || "");
    setApellido(cliente.apellido || "");
    setTelefono(cliente.telefono || "");
    setCorreo(cliente.correo || "");
    setDireccion(cliente.direccion || "");

    setEditando(true);
    setModalVisible(true);
  };

  // ===============================
  // GUARDAR CLIENTE
  // ===============================
  const guardarCliente = async () => {
    const nombreLimpio = nombre.trim();
    const apellidoLimpio = apellido.trim();
    const telefonoLimpio = telefono.trim();
    const correoLimpio = correo.trim();
    const direccionLimpia = direccion.trim();

    if (!nombreLimpio) {
      Alert.alert(
        "Campo requerido",
        "Ingresa el nombre del cliente."
      );
      return;
    }

    if (!apellidoLimpio) {
      Alert.alert(
        "Campo requerido",
        "Ingresa el apellido del cliente."
      );
      return;
    }

    if (!telefonoLimpio) {
      Alert.alert(
        "Campo requerido",
        "Ingresa el teléfono del cliente."
      );
      return;
    }

    try {
      setGuardando(true);

      const datosCliente = {
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        telefono: telefonoLimpio,
        correo: correoLimpio,
        direccion: direccionLimpia,
      };

      // ACTUALIZAR CLIENTE
      if (editando && clienteId) {
        await updateDoc(
          doc(db, "clientes", clienteId),
          datosCliente
        );

        Alert.alert(
          "Cliente actualizado",
          "Los datos del cliente se actualizaron correctamente."
        );
      }

      // CREAR CLIENTE
      else {
        await addDoc(
          collection(db, "clientes"),
          {
            ...datosCliente,
            fechaRegistro: serverTimestamp(),
          }
        );

        Alert.alert(
          "Cliente registrado",
          "El cliente se registró correctamente."
        );
      }

      setModalVisible(false);
      limpiarFormulario();

      await cargarClientes();
    } catch (error) {
      console.error("Error guardando cliente:", error);

      Alert.alert(
        "Error",
        "No se pudo guardar el cliente. Intenta nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ===============================
  // ELIMINAR CLIENTE
  // ===============================
  const eliminarCliente = (cliente: Cliente) => {
    Alert.alert(
      "Eliminar cliente",
      `¿Deseas eliminar a ${cliente.nombre} ${cliente.apellido}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "clientes", cliente.id)
              );

              setClientes((actuales) =>
                actuales.filter(
                  (item) => item.id !== cliente.id
                )
              );

              Alert.alert(
                "Cliente eliminado",
                "El cliente se eliminó correctamente."
              );
            } catch (error) {
              console.error(
                "Error eliminando cliente:",
                error
              );

              Alert.alert(
                "Error",
                "No se pudo eliminar el cliente."
              );
            }
          },
        },
      ]
    );
  };

  // ===============================
  // BUSCADOR
  // ===============================
  const clientesFiltrados = clientes.filter(
    (cliente) => {
      const texto = busqueda.toLowerCase().trim();

      if (!texto) {
        return true;
      }

      const nombreCompleto =
        `${cliente.nombre} ${cliente.apellido}`.toLowerCase();

      const telefono =
        cliente.telefono?.toLowerCase() || "";

      const correo =
        cliente.correo?.toLowerCase() || "";

      return (
        nombreCompleto.includes(texto) ||
        telefono.includes(texto) ||
        correo.includes(texto)
      );
    }
  );

  // ===============================
  // TARJETA CLIENTE
  // ===============================
  const renderCliente = ({
    item,
  }: {
    item: Cliente;
  }) => {
    return (
      <View style={styles.clienteCard}>
        <View style={styles.avatar}>
          <Ionicons
            name="person"
            size={27}
            color="#C63F7D"
          />
        </View>

        <View style={styles.infoCliente}>
          <Text style={styles.nombreCliente}>
            {item.nombre} {item.apellido}
          </Text>

          <View style={styles.datoFila}>
            <Ionicons
              name="call-outline"
              size={16}
              color="#C0638B"
            />
            <Text style={styles.datoTexto}>
              {item.telefono}
            </Text>
          </View>

          {item.correo ? (
            <View style={styles.datoFila}>
              <Ionicons
                name="mail-outline"
                size={16}
                color="#C0638B"
              />
              <Text style={styles.datoTexto}>
                {item.correo}
              </Text>
            </View>
          ) : null}

          {item.direccion ? (
            <View style={styles.datoFila}>
              <Ionicons
                name="location-outline"
                size={16}
                color="#C0638B"
              />
              <Text style={styles.datoTexto}>
                {item.direccion}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.botonEditar}
            onPress={() => abrirEditar(item)}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#A52E65"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonEliminar}
            onPress={() => eliminarCliente(item)}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#C23E5B"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      {/* ENCABEZADO */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.botonRegresar}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#A52E65"
          />
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text style={styles.titulo}>Clientes</Text>
          <Text style={styles.subtitulo}>
            Gestiona los clientes de Lizma Style
          </Text>
        </View>
      </View>

      {/* BUSCADOR */}
      <View style={styles.contenedorBusqueda}>
        <Ionicons
          name="search-outline"
          size={21}
          color="#C0638B"
        />

        <TextInput
          style={styles.inputBusqueda}
          placeholder="Buscar por nombre, teléfono o correo..."
          placeholderTextColor="#B39AA7"
          value={busqueda}
          onChangeText={setBusqueda}
        />

        {busqueda.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusqueda("")}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#B39AA7"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* NUEVO CLIENTE */}
      <TouchableOpacity
        style={styles.botonNuevo}
        onPress={abrirNuevoCliente}
      >
        <Ionicons
          name="add-circle-outline"
          size={23}
          color="#FFFFFF"
        />

        <Text style={styles.textoBotonNuevo}>
          Nuevo cliente
        </Text>
      </TouchableOpacity>

      {/* ENCABEZADO DE LISTA */}
      <View style={styles.encabezadoLista}>
        <View>
          <Text style={styles.tituloLista}>
            Mis clientes
          </Text>
          <Text style={styles.subtituloLista}>
            Clientes registrados en tu tienda
          </Text>
        </View>

        <View style={styles.contador}>
          <Text style={styles.textoContador}>
            {clientesFiltrados.length}
          </Text>
        </View>
      </View>

      {/* LISTA DE CLIENTES */}
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderCliente}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          clientesFiltrados.length === 0
            ? styles.listaVacia
            : styles.lista
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <View style={styles.iconoVacio}>
              <Ionicons
                name="people-outline"
                size={48}
                color="#D66C9B"
              />
            </View>

            <Text style={styles.textoVacio}>
              {cargando
                ? "Cargando clientes..."
                : busqueda
                ? "No se encontraron clientes"
                : "Aún no tienes clientes registrados"}
            </Text>

            {!cargando && !busqueda && (
              <Text style={styles.subtextoVacio}>
                Presiona "Nuevo cliente" para registrar uno.
              </Text>
            )}
          </View>
        }
      />

      {/* MODAL CLIENTE */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!guardando) {
            setModalVisible(false);
            limpiarFormulario();
          }
        }}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            {/* CABECERA DEL MODAL */}
            <View style={styles.indicadorModal} />

            <View style={styles.headerModal}>
              <View style={styles.iconoModal}>
                <Ionicons
                  name={
                    editando
                      ? "person-outline"
                      : "person-add-outline"
                  }
                  size={24}
                  color="#C63F7D"
                />
              </View>

              <View style={styles.textosHeaderModal}>
                <Text style={styles.tituloModal}>
                  {editando
                    ? "Editar cliente"
                    : "Nuevo cliente"}
                </Text>

                <Text style={styles.subtituloModal}>
                  Información del cliente
                </Text>
              </View>

              <TouchableOpacity
                style={styles.botonCerrarModal}
                onPress={() => {
                  if (!guardando) {
                    setModalVisible(false);
                    limpiarFormulario();
                  }
                }}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color="#8E6075"
                />
              </TouchableOpacity>
            </View>

            {/* FORMULARIO */}
            <FlatList
              data={[{ id: "formulario" }]}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={() => (
                <View style={styles.formulario}>
                  {/* NOMBRE */}
                  <Text style={styles.label}>
                    Nombre *
                  </Text>

                  <View style={styles.inputContenedor}>
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color="#C0638B"
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Nombre"
                      placeholderTextColor="#B39AA7"
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!guardando}
                    />
                  </View>

                  {/* APELLIDO */}
                  <Text style={styles.label}>
                    Apellido *
                  </Text>

                  <View style={styles.inputContenedor}>
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color="#C0638B"
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Apellido"
                      placeholderTextColor="#B39AA7"
                      value={apellido}
                      onChangeText={setApellido}
                      editable={!guardando}
                    />
                  </View>

                  {/* TELÉFONO */}
                  <Text style={styles.label}>
                    Teléfono *
                  </Text>

                  <View style={styles.inputContenedor}>
                    <Ionicons
                      name="call-outline"
                      size={19}
                      color="#C0638B"
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Número de teléfono"
                      placeholderTextColor="#B39AA7"
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                      editable={!guardando}
                    />
                  </View>

                  {/* CORREO */}
                  <Text style={styles.label}>
                    Correo electrónico
                  </Text>

                  <View style={styles.inputContenedor}>
                    <Ionicons
                      name="mail-outline"
                      size={19}
                      color="#C0638B"
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Correo electrónico"
                      placeholderTextColor="#B39AA7"
                      value={correo}
                      onChangeText={setCorreo}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!guardando}
                    />
                  </View>

                  {/* DIRECCIÓN */}
                  <Text style={styles.label}>
                    Dirección
                  </Text>

                  <View
                    style={[
                      styles.inputContenedor,
                      styles.inputDireccion,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={19}
                      color="#C0638B"
                    />

                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                      ]}
                      placeholder="Dirección del cliente"
                      placeholderTextColor="#B39AA7"
                      value={direccion}
                      onChangeText={setDireccion}
                      multiline
                      editable={!guardando}
                    />
                  </View>

                  {/* GUARDAR */}
                  <TouchableOpacity
                    style={[
                      styles.botonGuardar,
                      guardando &&
                        styles.botonDeshabilitado,
                    ]}
                    onPress={guardarCliente}
                    disabled={guardando}
                  >
                    <Ionicons
                      name={
                        editando
                          ? "checkmark-circle-outline"
                          : "save-outline"
                      }
                      size={22}
                      color="#FFFFFF"
                    />

                    <Text style={styles.textoGuardar}>
                      {guardando
                        ? "Guardando..."
                        : editando
                        ? "Actualizar cliente"
                        : "Guardar cliente"}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 25 }} />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7FB",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F7E6EE",
  },

  botonRegresar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  encabezadoTexto: {
    flex: 1,
  },

  titulo: {
    fontSize: 27,
    fontWeight: "800",
    color: "#422536",
    letterSpacing: -0.5,
  },

  subtitulo: {
    fontSize: 12,
    color: "#987F8D",
    marginTop: 4,
  },

  contenedorBusqueda: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: "#F0D8E3",
  },

  inputBusqueda: {
    flex: 1,
    fontSize: 14,
    color: "#422536",
    marginLeft: 10,
  },

  botonNuevo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D94F8A",
    marginHorizontal: 20,
    marginTop: 14,
    height: 52,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#B83272",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  textoBotonNuevo: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  encabezadoLista: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 14,
  },

  tituloLista: {
    fontSize: 19,
    fontWeight: "800",
    color: "#422536",
  },

  subtituloLista: {
    fontSize: 12,
    color: "#A18A96",
    marginTop: 3,
  },

  contador: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FCE7F1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#F4CDDE",
  },

  textoContador: {
    color: "#B83272",
    fontWeight: "800",
    fontSize: 15,
  },

  lista: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  listaVacia: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 25,
  },

  clienteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F2DFE8",
    elevation: 2,
    shadowColor: "#8D4767",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoCliente: {
    flex: 1,
    justifyContent: "center",
  },

  nombreCliente: {
    fontSize: 16,
    fontWeight: "800",
    color: "#422536",
    marginBottom: 6,
  },

  datoFila: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  datoTexto: {
    flex: 1,
    fontSize: 12,
    color: "#8D7884",
    marginLeft: 7,
  },

  acciones: {
    justifyContent: "center",
    marginLeft: 8,
  },

  botonEditar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FCEAF2",
    borderWidth: 1,
    borderColor: "#F4D3E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  botonEliminar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF0F2",
    borderWidth: 1,
    borderColor: "#F9D8DF",
    alignItems: "center",
    justifyContent: "center",
  },

  vacio: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  iconoVacio: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  textoVacio: {
    fontSize: 16,
    fontWeight: "800",
    color: "#604253",
    textAlign: "center",
    marginTop: 12,
  },

  subtextoVacio: {
    fontSize: 13,
    color: "#A18A96",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(48, 22, 37, 0.42)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#FFF9FC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 12,
    overflow: "hidden",
  },

  indicadorModal: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E9C7D7",
    alignSelf: "center",
    marginBottom: 18,
  },

  headerModal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  iconoModal: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FCEAF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  textosHeaderModal: {
    flex: 1,
  },

  tituloModal: {
    fontSize: 21,
    fontWeight: "800",
    color: "#422536",
  },

  subtituloModal: {
    fontSize: 12,
    color: "#987F8D",
    marginTop: 4,
  },

  botonCerrarModal: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8EAF0",
    alignItems: "center",
    justifyContent: "center",
  },

  formulario: {
    paddingBottom: 5,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#604253",
    marginBottom: 7,
    marginTop: 12,
  },

  inputContenedor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBD5DF",
    borderRadius: 13,
    minHeight: 50,
    paddingHorizontal: 14,
  },

  inputDireccion: {
    alignItems: "flex-start",
    paddingTop: 14,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#422536",
    marginLeft: 10,
    paddingVertical: 10,
  },

  textArea: {
    minHeight: 65,
    textAlignVertical: "top",
    paddingTop: 0,
  },

  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 53,
    backgroundColor: "#D94F8A",
    borderRadius: 15,
    marginTop: 25,
    elevation: 2,
    shadowColor: "#B83272",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoGuardar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
});
