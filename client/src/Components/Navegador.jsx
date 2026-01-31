import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../Supabase/Client"
import "./Navegador.css"

function Navbar() {
  const navigate = useNavigate()

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
