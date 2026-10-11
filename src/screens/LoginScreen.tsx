
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';

import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/database/firebaseConfig';

type RolUsuario = 'admin' | 'cliente';
type MetodoLogin = 'google' | 'correo';

export default function LoginScreen() {
  const router = useRouter();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  /*
   * VERIFICAR EL ROL EN FIRESTORE Y REDIRIGIR
   */
  const redirigirSegunRol = async (
    uid: string,
    metodo: MetodoLogin = 'correo'
  ): Promise<void> => {
    try {
      const userRef = doc(db, 'usuarios', uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await signOut(auth);

        Alert.alert(
          'Perfil no encontrado',
          'No existe un perfil registrado para esta cuenta. Contacta al administrador.'
        );
        return;
      }

      const rol = userSnapshot.data()?.rol as
        | RolUsuario
        | undefined;

      if (rol !== 'admin' && rol !== 'cliente') {
        await signOut(auth);

        Alert.alert(
          'Rol no válido',
          'Esta cuenta no tiene un rol válido configurado. Contacta al administrador.'
        );
        return;
      }

      // Ambos métodos respetan el rol guardado en Firestore.
      if (rol === 'admin') {
        router.replace('/home');
        return;
      }

      if (rol === 'cliente') {
        router.replace('/cliente-home');
        return;
      }
    } catch (error) {
      console.error('ERROR VERIFICANDO EL ROL:', error);

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error('ERROR CERRANDO SESIÓN:', signOutError);
      }

      Alert.alert(
        'Error',
        'No se pudo verificar el rol de la cuenta. Inténtalo nuevamente.'
      );
    }
  };

  /*
   * INICIAR SESIÓN CON CORREO Y CONTRASEÑA
   */
  const handleLogin = async () => {
    if (loadingLogin || loadingRecovery || loadingGoogle) {
      return;
    }

    if (!correo.trim() || !contrasena) {
      Alert.alert(
        'Campos incompletos',
        'Ingresa tu correo y contraseña.'
      );
      return;
    }

    try {
      setLoadingLogin(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        correo.trim(),
        contrasena
      );

      await redirigirSegunRol(
        userCredential.user.uid,
        'correo'
      );
    } catch (error: any) {
      console.error('ERROR LOGIN:', error);

      let mensaje = 'No se pudo iniciar sesión.';

      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        mensaje = 'El correo o la contraseña son incorrectos.';
      } else if (error?.code === 'auth/invalid-email') {
        mensaje = 'El correo electrónico no es válido.';
      } else if (error?.code === 'auth/user-disabled') {
        mensaje = 'Esta cuenta está deshabilitada.';
      } else if (error?.code === 'auth/too-many-requests') {
        mensaje = 'Demasiados intentos. Inténtalo más tarde.';
      }

      Alert.alert('Error', mensaje);
    } finally {
      setLoadingLogin(false);
    }
  };

  /*
   * RECUPERAR CONTRASEÑA
   */
  const handleRecuperarContrasena = async () => {
    if (loadingLogin || loadingRecovery || loadingGoogle) {
      return;
    }

    if (!correo.trim()) {
      Alert.alert(
        'Correo requerido',
        'Ingresa tu correo electrónico para recuperar la contraseña.'
      );
      return;
    }

    try {
      setLoadingRecovery(true);

      await sendPasswordResetEmail(auth, correo.trim());

      Alert.alert(
        'Solicitud procesada',
        'Si la cuenta está registrada, recibirás las instrucciones para restablecer tu contraseña.'
      );
    } catch (error: any) {
      console.error(
        'ERROR RECUPERANDO CONTRASEÑA:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudo procesar la solicitud. Verifica el correo e inténtalo nuevamente.'
      );
    } finally {
      setLoadingRecovery(false);
    }
  };

  /*
   * INICIAR SESIÓN CON GOOGLE
   */
  const handleGoogleSignIn = async () => {
    if (loadingLogin || loadingRecovery || loadingGoogle) {
      return;
    }

    try {
      setLoadingGoogle(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error(
          'Google no devolvió un ID token. Verifica la configuración de Google Sign-In.'
        );
      }

      const credential = GoogleAuthProvider.credential(idToken);

      const userCredential = await signInWithCredential(
        auth,
        credential
      );

      await redirigirSegunRol(
        userCredential.user.uid,
        'google'
      );
    } catch (error: any) {
      console.error(
        'ERROR INICIANDO SESIÓN CON GOOGLE:',
        error
      );

      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (error?.code === statusCodes.IN_PROGRESS) {
        Alert.alert(
          'Google',
          'Ya hay un inicio de sesión en progreso.'
        );
        return;
      }

      if (
        error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        Alert.alert(
          'Google',
          'Google Play Services no está disponible o necesita actualizarse.'
        );
        return;
      }

      let mensaje =
        'No se pudo completar el inicio de sesión con Google.';

      if (
        error?.code ===
        'auth/account-exists-with-different-credential'
      ) {
        mensaje =
          'Este correo ya está asociado a otro método de inicio de sesión.';
      } else if (error?.message) {
        mensaje = error.message;
      }

      Alert.alert('Error con Google', mensaje);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const bloqueado =
    loadingLogin || loadingRecovery || loadingGoogle;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            Iniciar sesión
          </Text>

          <Text style={styles.subtitle}>
            Bienvenido a Lizma Style
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#999"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!bloqueado}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry={!mostrarContrasena}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!bloqueado}
            />

            <TouchableOpacity
              onPress={() =>
                setMostrarContrasena(!mostrarContrasena)
              }
              style={styles.eyeButton}
              disabled={bloqueado}
            >
              <MaterialCommunityIcons
                name={mostrarContrasena ? 'eye-off' : 'eye'}
                size={22}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleRecuperarContrasena}
            disabled={bloqueado}
          >
            <Text style={styles.recoveryText}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              bloqueado && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={bloqueado}
          >
            {loadingLogin ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.loginButtonText}>
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>

          {loadingRecovery && (
            <ActivityIndicator
              size="small"
              color="#D94F8A"
              style={styles.recoveryLoader}
            />
          )}

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />

            <Text style={styles.dividerText}>
              O
            </Text>

            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              bloqueado && styles.loginButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={bloqueado}
          >
            {loadingGoogle ? (
              <ActivityIndicator
                size="small"
                color="#DB4437"
              />
            ) : (
              <MaterialCommunityIcons
                name="google"
                size={20}
                color="#DB4437"
                style={styles.googleIcon}
              />
            )}

            <Text style={styles.googleButtonText}>
              {loadingGoogle
                ? 'Conectando con Google...'
                : 'Continuar con Google'}
            </Text>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              ¿No tienes una cuenta?
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/register')}
              disabled={bloqueado}
            >
              <Text style={styles.registerLink}>
                Regístrate
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCE4EC',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#D94F8A',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginBottom: 28,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5B7C9',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },

  passwordContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5B7C9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
  },

  eyeButton: {
    paddingHorizontal: 14,
  },

  recoveryText: {
    color: '#D94F8A',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 20,
    fontWeight: '600',
  },

  recoveryLoader: {
    marginBottom: 12,
  },

  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#D94F8A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 13,
  },

  googleButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleIcon: {
    marginRight: 10,
  },

  googleButtonText: {
    color: '#444444',
    fontSize: 15,
    fontWeight: '600',
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },

  registerText: {
    color: '#777777',
    fontSize: 14,
  },

  registerLink: {
    color: '#D94F8A',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 5,
  },
});
