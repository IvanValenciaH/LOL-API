import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../Supabase/Client"
import "./Navegador.css"

function Navbar() {
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    loadPendingCount()
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('friendships_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          loadPendingCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadPendingCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count, error } = await supabase
        .from("friendships")
        .select("*", { count: 'exact', head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending")

      if (!error) {
        setPendingCount(count || 0)
      }
    } catch (err) {
      console.error("Error cargando notificaciones:", err)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (!error) {
      navigate("/login")
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h2 className="logo">LOL API</h2>
        <div className="links">
          <Link to="/">Campeones</Link>
          <Link to="/favorites">Favoritos</Link>
          <Link to="/buscar-amigos" className="buscar-amigos-link">
            Buscar Amigos
            {pendingCount > 0 && (
              <span className="notification-dot" />
            )}
          </Link>
          <Link to="/profile">Perfil</Link>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </nav>
  )
}

export default Navbar
