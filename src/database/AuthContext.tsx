
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from './firebaseConfig';

export type UserRole = 'admin' | 'cliente' | null;

type AuthContextType = {
  user: User | null;
  role: UserRole;
  isLoggedIn: boolean;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoggedIn: false,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!mounted) return;

        setUser(currentUser);
        setIsLoggedIn(!!currentUser);
        setRole(null);
        setLoading(true);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(
            db,
            'usuarios',
            currentUser.uid
          );

          const userSnapshot = await getDoc(userRef);

          if (!mounted) return;

          if (!userSnapshot.exists()) {
            // Los usuarios nuevos se registran como clientes.
            // El administrador debe asignarse de forma autorizada.
            await setDoc(userRef, {
              nombre: currentUser.displayName || '',
              correo: currentUser.email || '',
              rol: 'cliente',
              fechaRegistro: serverTimestamp(),
            });

            if (!mounted) return;

            setRole('cliente');
          } else {
            const userData = userSnapshot.data();
            const userRole = userData.rol;

            if (
              userRole === 'admin' ||
              userRole === 'cliente'
            ) {
              setRole(userRole);
            } else {
              setRole(null);

              console.error(
                'El usuario no tiene un rol válido en Firestore.'
              );
            }
          }
        } catch (error) {
          if (!mounted) return;

          setRole(null);

          console.error(
            'Error al verificar el rol del usuario:',
            error
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setRole(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error(
        'Error al cerrar sesión:',
        error
      );

      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoggedIn,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
