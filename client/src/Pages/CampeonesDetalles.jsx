import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import "./CampeonesDetalles.css"

function ChampionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [champion, setChampion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`http://localhost:3000/api/champions/${id}`)
      .then(res => res.json())
      .then(data => {
        setChampion(data)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }, [id])

  if (loading) return <h2>Cargando campeón...</h2>
  if (!champion) return <h2>Campeón no encontrado</h2>

  return (
    <div className="champion-detail">

        {/* BOTÓN VOLVER */}
        <div className="detail-back">
            <button className="back-btn" onClick={() => navigate(-1)}>
                ⬅ Volver
            </button>
        </div>

        {/* INFO PRINCIPAL */}
        <div className="detail-main">
            <img
              src={champion.image}
              alt={champion.name}
              className="detail-image"
            />

            <div className="detail-info">
              <h1>{champion.name}</h1>
              <h3>{champion.title}</h3>

              <div className="roles">
                {champion.tags.map(tag => (
                  <span key={tag} className="role">{tag}</span>
                ))}
              </div>
            </div>
        </div>

        {/* LORE Y HABILIDADES */}
        <div className="lore-section">
          <h2>Lore</h2>
          <p>{champion.lore}</p>
        </div>

        <div className="abilities-section">
          <h2>Habilidades</h2>
          <div className="abilities-grid">
            {champion.spells.map(spell => (
              <div key={spell.id} className="ability-card">
                <h4>{spell.name}</h4>
                <p dangerouslySetInnerHTML={{ __html: spell.description }} />
              </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChampionDetail
