import express from "express"
import cors from "cors"
import championsRoutes from "./Routes/champions.routes.js"

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: "https://lol-api-zom5.onrender.com"
}))
app.use(express.json())

app.get("/", (req, res) => {
  res.json({ message: "LOL API Backend running 🚀" })
})

app.use("/api/champions", championsRoutes)

// Servir archivos estáticos del frontend
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDistPath = path.join(__dirname, '../../client/dist')

app.use(express.static(clientDistPath))

// Fallback a index.html para rutas no encontradas (React Router)
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
