import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../Supabase/Client"
import "./PerfilAmigo.css"

function PerfilAmigo() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFriend, setIsFriend] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    loadFriendProfile()
    checkFriendship()
  }, [userId])

  const getPublicAvatarUrl = (path) => {
    if (!path) return null
    
    // Si ya es una URL completa, usarla
    if (path.startsWith('http')) {
      return path
    }
    
    // Si es un path de Supabase storage, obtener URL pública
    try {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(path)
      
      return data?.publicUrl || null
    } catch (err) {
      console.error("Error obteniendo URL del avatar:", err)
      return null
    }
  }

  const loadFriendProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar que somos amigos primero
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      const { data: friendship, error: friendError } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUser.id})`)
        .eq("status", "accepted")
        .maybeSingle()

      if (friendError || !friendship) {
        setError("No tienes permiso para ver este perfil. Deben ser amigos primero.")
        setLoading(false)
        return
      }

      setIsFriend(true)

      // Cargar perfil del amigo (sin email por privacidad)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname, first_name, last_name, avatar_url, role, champions, created_at")
        .eq("id", userId)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profileData) {
        setError("Perfil no encontrado")
        setLoading(false)
        return
      }

      setProfile(profileData)
      
      // Obtener URL pública del avatar
      const publicUrl = getPublicAvatarUrl(profileData.avatar_url)
      setAvatarUrl(publicUrl)

      // Cargar favoritos del amigo
      const { data: favoritesData, error: favError } = await supabase
        .from("favorites")
        .select("champion_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (favError) {
        console.error("Error cargando favoritos:", favError)
      }

      console.log("Favoritos cargados:", favoritesData)
      setFavorites(favoritesData || [])
      setLoading(false)
    } catch (err) {
      console.error("Error cargando perfil:", err)
      setError("Error al cargar el perfil: " + err.message)
      setLoading(false)
    }
  }

  const checkFriendship = async () => {
    // Ya se verifica en loadFriendProfile, esto es para el estado del botón
  }

  if (loading) return <div className="perfil-amigo-container"><p>Cargando perfil...</p></div>
  
  if (error) return (
    <div className="perfil-amigo-container">
      <div className="error-message">
        <p>{error}</p>
        <button onClick={() => navigate("/buscar-amigos")} className="back-btn">
          ← Volver a Buscar Amigos
        </button>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="perfil-amigo-container">
      <p>Perfil no encontrado</p>
    </div>
  )

  return (
    <div className="perfil-amigo-container">
      <button onClick={() => navigate("/buscar-amigos")} className="back-btn">
        ← Volver
      </button>

      <div className="friend-profile-card">
        {/* Avatar */}
        <div className="avatar-container">
          <img
            src={avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"}
            className="friend-avatar"
            alt={profile.nickname || "Amigo"}
            onError={(e) => {
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"
            }}
          />
        </div>

        {/* Info básica */}
        <h1>{profile.nickname || "Sin apodo"}</h1>
        
        <div className="friend-info">
          <p><strong>Nombre:</strong> {profile.first_name || "No especificado"} {profile.last_name || ""}</p>
          <p><strong>Rol principal:</strong> {profile.role || "No especificado"}</p>
          <p><strong>Miembro desde:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>

        {/* Campeones principales */}
        {profile.champions && profile.champions.length > 0 && (
          <div className="friend-section">
            <h3>🏆 Campeones Principales</h3>
            <div className="champions-list">
              {profile.champions.map((champ, index) => (
                <span key={index} className="champion-tag">{champ}</span>
              ))}
            </div>
          </div>
        )}

        {/* Favoritos */}
        <div className="friend-section">
          <h3>⭐ Campeones Favoritos ({favorites.length})</h3>
          {favorites.length > 0 ? (
            <ul className="favorites-list">
              {favorites.map((fav, index) => (
                <li key={index} className="favorite-item">
                  <span className="favorite-name">{fav.champion_name}</span>
                  <span className="favorite-date">
                    Agregado: {new Date(fav.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-favorites">No tiene campeones favoritos aún</p>
          )}
        </div>

        {/* Badge de amigo */}
        <div className="friend-badge-large">
          🤝 Amigo
        </div>
      </div>
    </div>
  )
}

export default PerfilAmigo
