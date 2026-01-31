import { useState } from "react"
import { supabase } from "../Supabase/Client.js"
import { useNavigate } from "react-router-dom"
import "./Login.css"

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // ✅ Validación extra de email (UX)
    if (!isValidEmail(email)) {
        setError("Ingresa un correo electrónico válido")
        setLoading(false)
        return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    // ❌ Error de credenciales
    if (error) {
        setError("Correo o contraseña incorrecta")
        setLoading(false)
        return
    }

    // ⚠️ Email no verificado
    if (!data.user.email_confirmed_at) {
        setError("Debes verificar tu correo antes de iniciar sesión")
        setLoading(false)
        return
    }

    // ✅ Login correcto
    alert("✅ Inicio de sesión exitoso")
    navigate("/") // Campeones
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <h1>Iniciar sesión</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}

        <button disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {/* 👉 LINK A REGISTRO */}
      <p className="auth-link">
        ¿No tienes cuenta?{" "}
        <span onClick={() => navigate("/register")}>
          Regístrate
        </span>
      </p>
    </div>
  )
}

export default Login
