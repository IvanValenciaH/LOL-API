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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
