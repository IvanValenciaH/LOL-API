import { Navigate } from "react-router-dom"

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/Login" />
  }

  return children
}

export default ProtectedRoute
