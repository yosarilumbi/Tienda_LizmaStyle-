import { auth, db } from '@/database/firebaseConfig';
import { supabase } from '@/database/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
  User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import { decode } from 'base64-arraybuffer';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);

  const [nombre, setNombre] = useState('No registrado');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Administrador');
  const [uid, setUid] = useState('');
  const [imagenPerfil, setImagenPerfil] = useState('');

  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [nombreEditado, setNombreEditado] = useState('');
  const [correoEditado, setCorreoEditado] = useState('');

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPasswordNueva, setMostrarPasswordNueva] =
    useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] =
    useState(false);

  const [cambiandoPassword, setCambiandoPassword] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (usuarioActual) => {
        if (!usuarioActual) {
          setUsuario(null);
          setLoading(false);
          router.replace('/login');
          return;
        }

        try {
          setUsuario(usuarioActual);
          setCorreo(usuarioActual.email || '');
          setUid(usuarioActual.uid);

          const userRef = doc(
            db,
            'usuarios',
            usuarioActual.uid
          );

          const userSnapshot = await getDoc(userRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();

            const nombreUsuario =
              userData.nombre || 'No registrado';

            const correoUsuario =
              userData.correo ||
              usuarioActual.email ||
              '';

            setNombre(nombreUsuario);
            setCorreo(correoUsuario);

            setRol(
              userData.rol === 'admin'
                ? 'Administrador'
                : userData.rol || 'Administrador'
            );

            setImagenPerfil(
              userData.imagenPerfil || ''
            );
          }
        } catch (error: any) {
          console.log(
            'ERROR AL CARGAR PERFIL:',
            error
          );

          Alert.alert(
            'Error',
            'No se pudieron cargar los datos del perfil.'
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  const seleccionarFoto = async () => {
    if (!usuario || subiendoFoto) {
      return;
    }

    try {
      const permiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos permiso para acceder a tu galería y seleccionar una foto de perfil.'
        );
        return;
      }

      const resultado =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

      if (
        resultado.canceled ||
        !resultado.assets ||
        resultado.assets.length === 0
      ) {
        return;
      }

      const foto = resultado.assets[0];

      if (!foto.base64) {
        Alert.alert(
          'Error',
          'No se pudo obtener la imagen seleccionada.'
        );
        return;
      }

      setSubiendoFoto(true);

      const nombreArchivo =
        `perfil_${usuario.uid}_${Date.now()}.jpg`;

      console.log(
        'Subiendo foto de perfil:',
        nombreArchivo
      );

      const imagenBytes = decode(foto.base64);

      const resultadoUpload =
        await supabase.storage
          .from('productos')
          .upload(
            nombreArchivo,
            imagenBytes,
            {
              contentType: 'image/jpeg',
              upsert: false,
            }
          );

      if (resultadoUpload.error) {
        console.log(
          'ERROR SUPABASE:',
          resultadoUpload.error
        );

        throw resultadoUpload.error;
      }

      const resultadoUrl =
        supabase.storage
          .from('productos')
          .getPublicUrl(nombreArchivo);

      const urlPublica =
        resultadoUrl.data.publicUrl;

      console.log(
        'URL FOTO PERFIL:',
        urlPublica
      );

      await updateDoc(
        doc(db, 'usuarios', usuario.uid),
        {
          imagenPerfil: urlPublica,
        }
      );

      setImagenPerfil(urlPublica);

      Alert.alert(
        'Foto actualizada',
        'Tu foto de perfil se actualizó correctamente.'
      );
    } catch (error: any) {
      console.log(
        '========== ERROR AL SUBIR FOTO =========='
      );

      console.log('Código:', error?.code);
      console.log('Mensaje:', error?.message);
      console.log('Error completo:', error);

      console.log(
        '=========================================='
      );

      Alert.alert(
        'Error',
        'No se pudo actualizar la foto de perfil.'
      );
    } finally {
      setSubiendoFoto(false);
    }
  };

  const abrirEdicion = () => {
    setNombreEditado(nombre);
    setCorreoEditado(correo);

    setPasswordActual('');
    setPasswordNueva('');
    setConfirmarPassword('');

    setMostrarPassword(false);
    setMostrarPasswordNueva(false);
    setMostrarConfirmarPassword(false);

    setEditando(true);
  };

  const cancelarEdicion = () => {
    if (guardando || cambiandoPassword) {
      return;
    }

    setNombreEditado('');
    setCorreoEditado('');

    setPasswordActual('');
    setPasswordNueva('');
    setConfirmarPassword('');

    setMostrarPassword(false);
    setMostrarPasswordNueva(false);
    setMostrarConfirmarPassword(false);

    setEditando(false);
  };

  const guardarCambios = async () => {
    if (!usuario) {
      Alert.alert(
        'Error',
        'No hay un usuario autenticado.'
      );
      return;
    }

    const nuevoNombre =
      nombreEditado.trim();

    const nuevoCorreo =
      correoEditado.trim().toLowerCase();

    if (!nuevoNombre) {
      Alert.alert(
        'Campo requerido',
        'Ingresa tu nombre.'
      );
      return;
    }

    if (!nuevoCorreo) {
      Alert.alert(
        'Campo requerido',
        'Ingresa tu correo electrónico.'
      );
      return;
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(nuevoCorreo)) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    const correoCambio =
      nuevoCorreo !== correo.toLowerCase();

    if (
      correoCambio &&
      !passwordActual.trim()
    ) {
      Alert.alert(
        'Contraseña requerida',
        'Para cambiar el correo electrónico debes ingresar tu contraseña actual.'
      );
      return;
    }

    try {
      setGuardando(true);

      console.log(
        '========== ACTUALIZANDO PERFIL =========='
      );

      const userRef = doc(
        db,
        'usuarios',
        usuario.uid
      );

      if (correoCambio) {
        const credential =
          EmailAuthProvider.credential(
            usuario.email || correo,
            passwordActual
          );

        await reauthenticateWithCredential(
          usuario,
          credential
        );

        console.log(
          'Usuario reautenticado correctamente.'
        );

        await updateEmail(
          usuario,
          nuevoCorreo
        );

        console.log(
          'Correo actualizado en Firebase Authentication.'
        );
      }

      await updateDoc(userRef, {
        nombre: nuevoNombre,
        correo: nuevoCorreo,
      });

      setNombre(nuevoNombre);
      setCorreo(nuevoCorreo);

      setNombreEditado('');
      setCorreoEditado('');

      setPasswordActual('');
      setPasswordNueva('');
      setConfirmarPassword('');

      setMostrarPassword(false);
      setMostrarPasswordNueva(false);
      setMostrarConfirmarPassword(false);

      setEditando(false);

      console.log(
        'Perfil actualizado correctamente.'
      );

      console.log(
        '========================================'
      );

      Alert.alert(
        'Perfil actualizado',
        'Tus datos se actualizaron correctamente.'
      );
    } catch (error: any) {
      console.log(
        '========== ERROR AL ACTUALIZAR PERFIL =========='
      );

      console.log('Código:', error?.code);
      console.log('Mensaje:', error?.message);
      console.log('Error completo:', error);

      console.log(
        '================================================'
      );

      if (
        error?.code ===
        'auth/wrong-password'
      ) {
        Alert.alert(
          'Contraseña incorrecta',
          'La contraseña actual que ingresaste no es correcta.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/invalid-credential'
      ) {
        Alert.alert(
          'Datos incorrectos',
          'La contraseña actual no es correcta o las credenciales ya no son válidas.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/email-already-in-use'
      ) {
        Alert.alert(
          'Correo en uso',
          'Ese correo electrónico ya está registrado en otra cuenta.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/invalid-email'
      ) {
        Alert.alert(
          'Correo inválido',
          'El correo electrónico ingresado no es válido.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/requires-recent-login'
      ) {
        Alert.alert(
          'Inicia sesión nuevamente',
          'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente antes de cambiar tu correo.'
        );
        return;
      }

      Alert.alert(
        'Error',
        error?.message ||
          'No se pudieron guardar los cambios.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    if (!usuario) {
      Alert.alert(
        'Error',
        'No hay un usuario autenticado.'
      );
      return;
    }

    if (!passwordActual.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa tu contraseña actual.'
      );
      return;
    }

    if (!passwordNueva.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa tu nueva contraseña.'
      );
      return;
    }

    if (passwordNueva.length < 6) {
      Alert.alert(
        'Contraseña inválida',
        'La nueva contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    if (!confirmarPassword.trim()) {
      Alert.alert(
        'Campo requerido',
        'Confirma tu nueva contraseña.'
      );
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      Alert.alert(
        'Las contraseñas no coinciden',
        'La nueva contraseña y su confirmación deben ser iguales.'
      );
      return;
    }

    if (passwordActual === passwordNueva) {
      Alert.alert(
        'Contraseña no válida',
        'La nueva contraseña debe ser diferente de la contraseña actual.'
      );
      return;
    }

    try {
      setCambiandoPassword(true);

      console.log(
        '========== CAMBIANDO CONTRASEÑA =========='
      );

      const credential =
        EmailAuthProvider.credential(
          usuario.email || correo,
          passwordActual
        );

      await reauthenticateWithCredential(
        usuario,
        credential
      );

      console.log(
        'Usuario reautenticado correctamente.'
      );

      await updatePassword(
        usuario,
        passwordNueva
      );

      console.log(
        'Contraseña actualizada correctamente.'
      );

      console.log(
        '=========================================='
      );

      setPasswordActual('');
      setPasswordNueva('');
      setConfirmarPassword('');

      setMostrarPassword(false);
      setMostrarPasswordNueva(false);
      setMostrarConfirmarPassword(false);

      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña se cambió correctamente.'
      );
    } catch (error: any) {
      console.log(
        '========== ERROR AL CAMBIAR CONTRASEÑA =========='
      );

      console.log('Código:', error?.code);
      console.log('Mensaje:', error?.message);
      console.log('Error completo:', error);

      console.log(
        '================================================='
      );

      if (
        error?.code ===
          'auth/wrong-password' ||
        error?.code ===
          'auth/invalid-credential'
      ) {
        Alert.alert(
          'Contraseña incorrecta',
          'La contraseña actual que ingresaste no es correcta.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/requires-recent-login'
      ) {
        Alert.alert(
          'Inicia sesión nuevamente',
          'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente antes de cambiar tu contraseña.'
        );
        return;
      }

      if (
        error?.code ===
        'auth/weak-password'
      ) {
        Alert.alert(
          'Contraseña débil',
          'La nueva contraseña debe tener al menos 6 caracteres.'
        );
        return;
      }

      Alert.alert(
        'Error',
        error?.message ||
          'No se pudo cambiar la contraseña.'
      );
    } finally {
      setCambiandoPassword(false);
    }
  };

  const cerrarSesion = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.log(
                'ERROR AL CERRAR SESIÓN:',
                error
              );

              Alert.alert(
                'Error',
                'No se pudo cerrar la sesión.'
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FCE4EC"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#D94F8A"
          />

          <Text style={styles.loadingText}>
            Cargando perfil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (editando) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FCE4EC"
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={cancelarEdicion}
              disabled={
                guardando ||
                cambiandoPassword
              }
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color="#000000"
              />
            </TouchableOpacity>

            <View style={styles.header}>
              <TouchableOpacity
                style={styles.profileIcon}
                activeOpacity={0.8}
                onPress={seleccionarFoto}
                disabled={subiendoFoto}
              >
                {imagenPerfil ? (
                  <Image
                    source={{
                      uri: imagenPerfil,
                    }}
                    style={styles.profileImage}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account"
                    size={55}
                    color="#FFFFFF"
                  />
                )}

                <View
                  style={styles.cameraButton}
                >
                  {subiendoFoto ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="camera"
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.title}>
                Editar Perfil
              </Text>

              <Text style={styles.subtitle}>
                Toca la foto para cambiarla
              </Text>
            </View>

            <View style={styles.editCard}>
              <Text style={styles.inputLabel}>
                Nombre
              </Text>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={23}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.textInput}
                  value={nombreEditado}
                  onChangeText={
                    setNombreEditado
                  }
                  placeholder="Ingresa tu nombre"
                  placeholderTextColor="#999999"
                  editable={
                    !guardando &&
                    !cambiandoPassword
                  }
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>
                Correo electrónico
              </Text>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={23}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.textInput}
                  value={correoEditado}
                  onChangeText={
                    setCorreoEditado
                  }
                  placeholder="Ingresa tu correo"
                  placeholderTextColor="#999999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={
                    !guardando &&
                    !cambiandoPassword
                  }
                />
              </View>

              <Text style={styles.inputLabel}>
                Contraseña actual
              </Text>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={23}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.textInput}
                  value={passwordActual}
                  onChangeText={
                    setPasswordActual
                  }
                  placeholder="Contraseña actual"
                  placeholderTextColor="#999999"
                  secureTextEntry={
                    !mostrarPassword
                  }
                  editable={
                    !guardando &&
                    !cambiandoPassword
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setMostrarPassword(
                      !mostrarPassword
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      mostrarPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={23}
                    color="#777777"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.passwordHelp}>
                La contraseña actual es necesaria
                para cambiar tu correo o contraseña.
              </Text>

              <Text style={styles.inputLabel}>
                Nueva contraseña
              </Text>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-plus-outline"
                  size={23}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.textInput}
                  value={passwordNueva}
                  onChangeText={
                    setPasswordNueva
                  }
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor="#999999"
                  secureTextEntry={
                    !mostrarPasswordNueva
                  }
                  editable={
                    !guardando &&
                    !cambiandoPassword
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setMostrarPasswordNueva(
                      !mostrarPasswordNueva
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      mostrarPasswordNueva
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={23}
                    color="#777777"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Confirmar nueva contraseña
              </Text>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={23}
                  color="#D94F8A"
                />

                <TextInput
                  style={styles.textInput}
                  value={confirmarPassword}
                  onChangeText={
                    setConfirmarPassword
                  }
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor="#999999"
                  secureTextEntry={
                    !mostrarConfirmarPassword
                  }
                  editable={
                    !guardando &&
                    !cambiandoPassword
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setMostrarConfirmarPassword(
                      !mostrarConfirmarPassword
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      mostrarConfirmarPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={23}
                    color="#777777"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.passwordHelp}>
                La nueva contraseña debe tener al
                menos 6 caracteres.
              </Text>

              <TouchableOpacity
                style={[
                  styles.passwordButton,
                  cambiandoPassword &&
                    styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={cambiarPassword}
                disabled={
                  cambiandoPassword ||
                  guardando
                }
              >
                {cambiandoPassword ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="lock-reset"
                      size={23}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Cambiar contraseña
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>
                Rol
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  styles.disabledInput,
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={23}
                  color="#999999"
                />

                <Text
                  style={styles.disabledText}
                >
                  Administrador
                </Text>

                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color="#999999"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  guardando &&
                    styles.disabledButton,
                ]}
                activeOpacity={0.8}
                onPress={guardarCambios}
                disabled={
                  guardando ||
                  cambiandoPassword
                }
              >
                {guardando ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="content-save-outline"
                      size={23}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Guardar cambios
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={cancelarEdicion}
                disabled={
                  guardando ||
                  cambiandoPassword
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FCE4EC"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color="#000000"
          />
        </TouchableOpacity>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileIcon}
            activeOpacity={0.8}
            onPress={seleccionarFoto}
            disabled={subiendoFoto}
          >
            {imagenPerfil ? (
              <Image
                source={{
                  uri: imagenPerfil,
                }}
                style={styles.profileImage}
              />
            ) : (
              <MaterialCommunityIcons
                name="account"
                size={55}
                color="#FFFFFF"
              />
            )}

            <View
              style={styles.cameraButton}
            >
              {subiendoFoto ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <MaterialCommunityIcons
                  name="camera"
                  size={18}
                  color="#FFFFFF"
                />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.title}>
            Mi Perfil
          </Text>

          <Text style={styles.subtitle}>
            Información de tu cuenta
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.dataRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="account-outline"
                size={24}
                color="#D94F8A"
              />
            </View>

            <View style={styles.dataContent}>
              <Text style={styles.label}>
                Nombre
              </Text>

              <Text style={styles.value}>
                {nombre}
              </Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={24}
                color="#D94F8A"
              />
            </View>

            <View style={styles.dataContent}>
              <Text style={styles.label}>
                Correo electrónico
              </Text>

              <Text style={styles.value}>
                {correo || 'No registrado'}
              </Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="shield-account-outline"
                size={24}
                color="#D94F8A"
              />
            </View>

            <View style={styles.dataContent}>
              <Text style={styles.label}>
                Rol
              </Text>

              <Text style={styles.value}>
                {rol}
              </Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="key-outline"
                size={24}
                color="#D94F8A"
              />
            </View>

            <View style={styles.dataContent}>
              <Text style={styles.label}>
                ID de usuario
              </Text>

              <Text
                style={styles.uid}
                selectable
              >
                {uid}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={abrirEdicion}
        >
          <MaterialCommunityIcons
            name="account-edit-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.editButtonText}>
            Editar perfil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={cerrarSesion}
        >
          <MaterialCommunityIcons
            name="logout"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.logoutText}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 30,
  },

  backButton: {
    marginTop: 10,
    marginBottom: 15,
    padding: 5,
    alignSelf: 'flex-start',
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },

  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D94F8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    position: 'relative',
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D94F8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FCE4EC',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },

  subtitle: {
    fontSize: 14,
    color: '#555555',
    marginTop: 5,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  dataContent: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },

  uid: {
    fontSize: 12,
    color: '#333333',
  },

  editButton: {
    flexDirection: 'row',
    backgroundColor: '#D94F8A',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    elevation: 3,
    shadowColor: '#D94F8A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#D94F8A',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    elevation: 3,
    shadowColor: '#D94F8A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  editCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 5,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 10,
    paddingVertical: 10,
  },

  disabledInput: {
    backgroundColor: '#F1F1F1',
  },

  disabledText: {
    flex: 1,
    fontSize: 16,
    color: '#777777',
    marginLeft: 10,
  },

  passwordHelp: {
    fontSize: 12,
    color: '#777777',
    marginTop: -10,
    marginBottom: 15,
    lineHeight: 17,
  },

  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#D94F8A',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#D94F8A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  passwordButton: {
    flexDirection: 'row',
    backgroundColor: '#D94F8A',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#D94F8A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  cancelButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D94F8A',
  },

  cancelButtonText: {
    color: '#D94F8A',
    fontSize: 16,
    fontWeight: 'bold',
  },

  disabledButton: {
    opacity: 0.7,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#555555',
  },
});