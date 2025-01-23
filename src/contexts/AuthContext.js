"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const token = await user.getIdToken();
          setUser(user);
          // AuthContext.js - Cookie Security
          Cookies.set("session", token, {
            expires: 7,
            secure: process.env.NODE_ENV === "production", // Add
            sameSite: "strict", // Add
          });
        } else {
          setUser(null);
          Cookies.remove("session");
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
        Cookies.remove("session");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
