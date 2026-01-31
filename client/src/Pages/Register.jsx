import { useState } from "react"
import { supabase } from "../Supabase/Client"
import { useNavigate } from "react-router-dom"
import "./Register.css"

const passwordRules = {
  length: (pwd) => pwd.length >= 8,
  upper: (pwd) => /[A-Z]/.test(pwd),
  lower: (pwd) => /[a-z]/.test(pwd),
  number: (pwd) => /[0-9]/.test(pwd),
  special: (pwd) => /[^A-Za-z0-9]/.test(pwd)
}

function Register() {
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showRules, setShowRules] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Todos los campos son obligatorios")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (
        !passwordRules.length(password) ||
        !passwordRules.upper(password) ||
        !passwordRules.lower(password) ||
        !passwordRules.number(password) ||
        !passwordRules.special(password)
    ) {
        setError(
            "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo"
        )
        return
    }

    setLoading(true)

    // 👉 Registro en Supabase Auth
    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Este correo ya está registrado")
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    alert(
        "✅ Registro exitoso\n\n📧 Revisa tu correo para verificar tu cuenta antes de iniciar sesión."
    )
    navigate("/login")
  }

  return (
    <div className="auth-container">
      <h1>Registro</h1>
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowRules(true)}
            onBlur={() => setShowRules(true)}
            required
        />
        {showRules && (
            <div className="password-rules">
                <p className={passwordRules.length(password) ? "valid" : ""}>
                    • Mínimo 8 caracteres
                </p>
                <p className={passwordRules.upper(password) ? "valid" : ""}>
                    • Una letra mayúscula
                </p>
                <p className={passwordRules.lower(password) ? "valid" : ""}>
                    • Una letra minúscula
                </p>
                <p className={passwordRules.number(password) ? "valid" : ""}>
                    • Un número
                </p>
                <p className={passwordRules.special(password) ? "valid" : ""}>
                    • Un carácter especial
                </p>
            </div>
        )}

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button disabled={loading}>
          {loading ? "Registrando..." : "Registrarse"}
        </button>
      </form>

      <p className="auth-link">
        ¿Ya tienes cuenta?{" "}
        <span onClick={() => navigate("/login")}>Inicia sesión</span>
      </p>
    </div>
  )
}

export default Register
