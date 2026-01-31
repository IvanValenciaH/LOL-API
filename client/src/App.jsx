import { BrowserRouter, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "./Supabase/Client"

import Login from "./Pages/Login"
import Register from "./Pages/Register"
import Navbar from "./Components/Navegador"
import Champions from "./Pages/Campeones"
import Favorites from "./Pages/Favoritos"
import Profile from "./Pages/Perfil"
import ChampionDetail from "./Pages/CampeonesDetalles"
import ProtectedRoute from "./Components/ProtectedRoute"

import "./App.css"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <h2>Cargando...</h2>

  return (
    <BrowserRouter>
      {/* Navbar SOLO si hay sesión */}
      {session && <Navbar />}

      <Routes>
        {/* PUBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PRIVADAS */}
        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <Champions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute session={session}>
              <Favorites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/champion/:id"
          element={
            <ProtectedRoute session={session}>
              <ChampionDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
