import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Favoritos.css"

function Favorites() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("favorites")) || [])
  }, [])

  const removeFavorite = (championId) => {
    const updated = favorites.filter(fav => fav.id !== championId)
    setFavorites(updated)
    localStorage.setItem("favorites", JSON.stringify(updated))
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
