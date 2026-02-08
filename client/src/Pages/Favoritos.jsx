import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../Supabase/Client"
import "./Favoritos.css"

function Favorites() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      // Obtener campeones favoritos del usuario con los detalles
      const { data, error } = await supabase
        .from("favorites")
        .select("champion_name")
        .eq("user_id", user.id)

      if (error) throw error

      const championNames = data?.map(fav => fav.champion_name) || []
      
      // Obtener detalles de los campeones desde el API
      const response = await fetch("http://localhost:3000/api/champions")
      const allChampions = await response.json()
      
      const favoriteChampions = allChampions.filter(champ => 
        championNames.includes(champ.name)
      )
      
      setFavorites(favoriteChampions)
    } catch (err) {
      console.error("Error cargando favoritos:", err)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (championId) => {
    if (!user) return

    // Encontrar el nombre del campeón
    const champion = favorites.find(fav => fav.id === championId)
    if (!champion) return

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("champion_name", champion.name)

      if (error) throw error

      setFavorites(favorites.filter(fav => fav.id !== championId))
    } catch (err) {
      console.error("Error removiendo favorito:", err)
      alert("Error al eliminar de favoritos")
    }
  }

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "50px" }}>Cargando...</h2>
  }

  if (favorites.length === 0) {
    return <h2 style={{ textAlign: "center", marginTop: "50px" }}>No tienes favoritos ⭐</h2>
  }

  return (
    <div className="favorites-container">
      <h1>Mis Favoritos ⭐</h1>

      <div className="grid">
        {favorites.map(champ => (
          <div key={champ.id} className="card">
            <img src={champ.image} alt={champ.name} />
            <h3>{champ.name}</h3>
            <p>{champ.title}</p>

            <div className="tags">
              {champ.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            <div className="card-actions">
              <button className="details-btn" 
                onClick={() => navigate(`/champion/${champ.id}`)}
              >
                Ver detalles
              </button>

              <button className="favorite-btn active"
                onClick={() => removeFavorite(champ.id)}
              >
                ★
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Favorites
