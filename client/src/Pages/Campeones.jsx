import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Campeones.css"

function Champions() {
  const navigate = useNavigate()
  const [champions, setChampions] = useState([])
  const [filteredChampions, setFilteredChampions] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [lane, setLane] = useState("all")
  const [type, setType] = useState("all")

  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem("favorites")) || []
  })

  const toggleFavorite = (champion) => {
  let updatedFavorites

  if (favorites.some(fav => fav.id === champion.id)) {
    updatedFavorites = favorites.filter(fav => fav.id !== champion.id)
  } else {
    updatedFavorites = [...favorites, champion]
  }

  setFavorites(updatedFavorites)
  localStorage.setItem("favorites", JSON.stringify(updatedFavorites))
}



  useEffect(() => {
    fetch("http://localhost:3000/api/champions")
      .then(res => res.json())
      .then(data => {
        setChampions(data)
        setFilteredChampions(data)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let result = champions

    // Buscar por nombre o id
    if (search) {
      result = result.filter(champ =>
        champ.name.toLowerCase().includes(search.toLowerCase()) ||
        champ.id.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Filtrar por carril (mapeado a tags)
    if (lane !== "all") {
      const laneMap = {
        Top: ["Fighter", "Tank"],
        Mid: ["Mage", "Assassin"],
        ADC: ["Marksman"],
        Jungle: ["Assassin", "Fighter"],
        Support: ["Support", "Tank"]
      }
      result = result.filter(champ =>
        laneMap[lane]?.some(role => champ.tags.includes(role))
      )
    }


    // Filtrar por tipo (tags)
    if (type !== "all") {
      result = result.filter(champ =>
        champ.tags.includes(type)
      )
    }

    setFilteredChampions(result)
  }, [search, lane, type, champions])

  if (loading) {
    return <h2>Cargando campeones...</h2>
  }

  return (
    <div className="champions-container">
      <h1>League of Legends Champions</h1>

      {/* 🔍 BUSCADOR Y FILTROS */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar campeón..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select value={lane} onChange={e => setLane(e.target.value)}>
          <option value="all">Carril</option>
          <option value="Top">Top</option>
          <option value="Mid">Mid</option>
          <option value="ADC">ADC</option>
          <option value="Jungle">Jungle</option>
          <option value="Support">Support</option>
        </select>

        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="all">Tipo</option>
          <option value="Assassin">Assassin</option>
          <option value="Mage">Mage</option>
          <option value="Tank">Tank</option>
          <option value="Fighter">Fighter</option>
          <option value="Marksman">Marksman</option>
          <option value="Support">Support</option>
        </select>
      </div>

      {/* 🧩 GRID */}
      <div className="grid">
        {filteredChampions.map(champ => (
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

              <button className={`favorite-btn ${favorites.some(fav => fav.id === champ.id) ? "active" : ""}`}
              onClick={() => toggleFavorite(champ)}
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

export default Champions
