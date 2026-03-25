import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../Supabase/Client"
import "./BuscarAmigos.css"


function BuscarAmigos() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

  const [searchResults, setSearchResults] = useState([])
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [receivedRequests, setReceivedRequests] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

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


  useEffect(() => {
    getCurrentUser()
    loadFriends()
    loadPendingRequests()
    loadReceivedRequests()
  }, [])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  // Buscar usuarios usando función RPC (bypass RLS)
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setMessage("Escribe algo para buscar")
      return
    }
    
    setLoading(true)
    setMessage(null)
    setDebugInfo(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage("Debes iniciar sesión")
        setLoading(false)
        return
      }

      console.log("Buscando:", searchQuery)

      // USAR FUNCIÓN RPC - bypass RLS
      const { data: searchData, error: searchError } = await supabase
        .rpc('search_users_by_nickname', { 
          search_query: searchQuery 
        })

      if (searchError) {
        console.error("Error en función RPC:", searchError)
        // Si falla RPC, intentar método directo como fallback
        return searchUsersDirect(user.id)
      }

      console.log("Resultados RPC:", searchData)

      // Si RPC devuelve resultados, usarlos
      if (searchData && searchData.length > 0) {
        setSearchResults(searchData)
        setDebugInfo(`Encontrados: ${searchData.length}`)
        setLoading(false)
        return
      }

      // Si RPC no devuelve nada, probar búsqueda directa
      console.log("RPC no devolvió resultados, intentando búsqueda directa...")
      return searchUsersDirect(user.id)

    } catch (err) {
      console.error("Error completo:", err)
      setMessage("Error al buscar: " + (err.message || "Error desconocido"))
      setLoading(false)
    }
  }

  // Método directo de búsqueda (fallback)
  const searchUsersDirect = async (userId) => {
    try {
      // Obtener IDs de amigos y solicitudes pendientes para excluirlos
      const { data: existingConnections, error: connError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      if (connError) {
        console.error("Error obteniendo conexiones:", connError)
      }

      const excludeIds = new Set([userId])
      existingConnections?.forEach(conn => {
        excludeIds.add(conn.requester_id)
        excludeIds.add(conn.addressee_id)
      })

      console.log("IDs a excluir:", Array.from(excludeIds))

      // Búsqueda directa a profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, first_name, last_name, avatar_url, role")
        .or(`nickname.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) {
        console.error("Error en búsqueda directa:", error)
        throw error
      }

      console.log("Resultados directos:", data)

      // Filtrar resultados
      const filteredResults = data?.filter(profile => {
        return !excludeIds.has(profile.id)
      }) || []

      console.log("Resultados filtrados:", filteredResults)

      setSearchResults(filteredResults)
      setDebugInfo(`Encontrados: ${data?.length || 0}, Mostrados: ${filteredResults.length}`)
      
      if (filteredResults.length === 0) {
        if (data?.length > 0) {
          setMessage("Usuarios encontrados pero ya son tus amigos o tienes solicitudes pendientes con ellos")
        } else {
          setMessage(`No se encontraron usuarios con "${searchQuery}"`)
        }
      }
    } catch (err) {
      console.error("Error en búsqueda directa:", err)
      setMessage("Error al buscar: " + (err.message || "Error desconocido"))
    } finally {
      setLoading(false)
    }
  }

  // Cargar amigos aceptados
  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")

      if (error) throw error

      const friendIds = friendships?.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || []

      if (friendIds.length === 0) {
        setFriends([])
        return
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname, first_name, last_name, avatar_url, role")
        .in("id", friendIds)

      if (profileError) throw profileError

      setFriends(profiles || [])
    } catch (err) {
      console.error("Error cargando amigos:", err)
    }
  }

  // Cargar solicitudes enviadas pendientes
  const loadPendingRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("addressee_id, id")
        .eq("requester_id", user.id)
        .eq("status", "pending")

      if (error) throw error

      if (!friendships || friendships.length === 0) {
        setPendingRequests([])
        return
      }

      const addresseeIds = friendships.map(f => f.addressee_id)

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname, first_name, last_name, avatar_url")
        .in("id", addresseeIds)

      if (profileError) throw profileError

      const combined = friendships.map(f => ({
        ...f,
        ...profiles?.find(p => p.id === f.addressee_id)
      }))

      setPendingRequests(combined)
    } catch (err) {
      console.error("Error cargando solicitudes pendientes:", err)
    }
  }

  // Cargar solicitudes recibidas
  const loadReceivedRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("id, requester_id")
        .eq("addressee_id", user.id)
        .eq("status", "pending")

      if (error) throw error

      if (!friendships || friendships.length === 0) {
        setReceivedRequests([])
        return
      }

      const requesterIds = friendships.map(f => f.requester_id)

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname, first_name, last_name, avatar_url")
        .in("id", requesterIds)

      if (profileError) throw profileError

      const combined = friendships.map(f => ({
        friendship_id: f.id,
        requester_id: f.requester_id,
        ...profiles?.find(p => p.id === f.requester_id)
      }))

      setReceivedRequests(combined)
    } catch (err) {
      console.error("Error cargando solicitudes recibidas:", err)
    }
  }

  // Enviar solicitud de amistad
  const sendFriendRequest = async (userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: "pending"
        })

      if (error) throw error

      setMessage("✅ Solicitud enviada")
      loadPendingRequests()
      setSearchResults(searchResults.filter(u => u.id !== userId))
    } catch (err) {
      setMessage("❌ Error: " + err.message)
    }
  }

  // Aceptar solicitud
  const acceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId)

      if (error) throw error

      setMessage("✅ Solicitud aceptada")
      loadReceivedRequests()
      loadFriends()
    } catch (err) {
      setMessage("❌ Error al aceptar: " + err.message)
    }
  }

  // Rechazar solicitud
  const rejectRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId)

      if (error) throw error

      setMessage("❌ Solicitud rechazada")
      loadReceivedRequests()
    } catch (err) {
      setMessage("❌ Error al rechazar: " + err.message)
    }
  }

  // Cancelar solicitud enviada
  const cancelRequest = async (userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("requester_id", user.id)
        .eq("addressee_id", userId)
        .eq("status", "pending")

      if (error) throw error

      setMessage("🚫 Solicitud cancelada")
      loadPendingRequests()
    } catch (err) {
      setMessage("❌ Error al cancelar: " + err.message)
    }
  }

  return (
    <div className="buscar-amigos-container">
      <h1>👥 Buscar Amigos</h1>

      {/* Buscador */}
      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por apodo, nombre o apellido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
          />
          <button onClick={searchUsers} disabled={loading}>
            {loading ? "Buscando..." : "🔍 Buscar"}
          </button>
        </div>
        
        {message && <p className="message">{message}</p>}
        {debugInfo && <p style={{color: '#888', fontSize: '0.9rem'}}>{debugInfo}</p>}
      </div>

      {/* Resultados de búsqueda */}
      {searchResults.length > 0 && (
        <div className="section">
          <h2>Resultados de búsqueda ({searchResults.length})</h2>
          <div className="users-grid">
            {searchResults.map(user => (
              <div key={user.id} className="user-card">
                <img 
                  src={getPublicAvatarUrl(user.avatar_url) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"} 
                  alt={user.nickname || "Usuario"}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"
                  }}
                />

                <div className="user-info">
                  <h3>{user.nickname || "Sin apodo"}</h3>
                  <p>{user.first_name || ""} {user.last_name || ""}</p>
                  {user.role && <span className="role-badge">{user.role}</span>}
                </div>
                <button 
                  className="btn-add"
                  onClick={() => sendFriendRequest(user.id)}
                >
                  ➕ Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solicitudes recibidas */}
      {receivedRequests.length > 0 && (
        <div className="section">
          <h2>📨 Solicitudes recibidas ({receivedRequests.length})</h2>
          <div className="users-grid">
            {receivedRequests.map(user => (
              <div key={user.friendship_id} className="user-card request-card">
                <img 
                  src={getPublicAvatarUrl(user.avatar_url) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"} 
                  alt={user.nickname || "Usuario"}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"
                  }}
                />

                <div className="user-info">
                  <h3>{user.nickname || "Sin apodo"}</h3>
                  <p>{user.first_name || ""} {user.last_name || ""}</p>
                </div>
                <div className="request-actions">
                  <button 
                    className="btn-accept"
                    onClick={() => acceptRequest(user.friendship_id)}
                  >
                    ✓ Aceptar
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => rejectRequest(user.friendship_id)}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solicitudes enviadas pendientes */}
      {pendingRequests.length > 0 && (
        <div className="section">
          <h2>⏳ Solicitudes enviadas ({pendingRequests.length})</h2>
          <div className="users-grid">
            {pendingRequests.map(user => (
              <div key={user.id} className="user-card pending-card">
                <img 
                  src={getPublicAvatarUrl(user.avatar_url) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"} 
                  alt={user.nickname || "Usuario"}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"
                  }}
                />

                <div className="user-info">
                  <h3>{user.nickname || "Sin apodo"}</h3>
                  <p>{user.first_name || ""} {user.last_name || ""}</p>
                  <span className="pending-badge">Pendiente</span>
                </div>
                <button 
                  className="btn-cancel"
                  onClick={() => cancelRequest(user.id)}
                >
                  🚫 Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de amigos */}
      {friends.length > 0 && (
        <div className="section">
          <h2>✅ Mis Amigos ({friends.length})</h2>
          <div className="users-grid">
            {friends.map(friend => (
              <div key={friend.id} className="user-card friend-card">
                <img 
                  src={getPublicAvatarUrl(friend.avatar_url) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"} 
                  alt={friend.nickname || "Amigo"}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236b7280'/%3E%3C/svg%3E"
                  }}
                />

                <div className="user-info">
                  <h3>{friend.nickname || "Sin apodo"}</h3>
                  <p>{friend.first_name || ""} {friend.last_name || ""}</p>
                  {friend.role && <span className="role-badge">{friend.role}</span>}
                </div>
                <div className="friend-actions">
                  <span className="friend-badge">🤝 Amigo</span>
                  <button 
                    className="btn-view-profile"
                    onClick={() => navigate(`/friend/${friend.id}`)}
                  >
                    👁️ Ver perfil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {friends.length === 0 && receivedRequests.length === 0 && pendingRequests.length === 0 && searchResults.length === 0 && !loading && (
        <div className="empty-state">
          <p>🔍 Busca amigos por su apodo, nombre o apellido</p>
          <p style={{color: '#666', fontSize: '0.9rem', marginTop: '10px'}}>
            Si no encuentras a nadie, verifica que hayan configurado su apodo en su perfil
          </p>
        </div>
      )}
    </div>
  )
}

export default BuscarAmigos
