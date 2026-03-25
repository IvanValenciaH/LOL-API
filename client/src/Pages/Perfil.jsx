import { useEffect, useState } from "react"
import { supabase } from "../Supabase/Client"
import "./Perfil.css"

function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newChampion, setNewChampion] = useState("")
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [avatarPublicUrl, setAvatarPublicUrl] = useState(null)
  const [nicknameError, setNicknameError] = useState(null)


  useEffect(() => {
    getProfile();
  }, []);


  async function getProfile() {
    try {
      setErrorMsg(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("Usuario no autenticado");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message || JSON.stringify(error));
        setProfile(null);
        setLoading(false);
        return;
      }

      if (data) {
        // Si por alguna razón vienen múltiples filas, toma la primera
        const profileData = Array.isArray(data) ? data[0] : data;
        // Asegurarse de que champions es un array
        if (!Array.isArray(profileData.champions)) {
          profileData.champions = [];
        }
        setProfile(profileData);
        // obtener signed url si existe avatar path
        if (profileData.avatar_url) {
          fetchSignedUrl(profileData.avatar_url);
        } else {
          setAvatarPublicUrl(null);
        }
        setLoading(false);
        return;
      }

      // Si no existe perfil, crear uno por defecto
      const insertPayload = {
        id: user.id,
        email: user.email || "",
        first_name: "",
        last_name: "",
        nickname: null,
        role: "",
        champions: [],
        avatar_url: null
      };

      // Usar upsert para evitar conflictos si el registro ya existe
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .upsert(insertPayload)
        .select("*")
        .maybeSingle();

      if (insertError) {
        // Si hay conflicto de clave primaria, intentamos volver a obtener el perfil
        if (insertError.code === "23505") {
          const { data: existing, error: fetchErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (fetchErr) {
            setErrorMsg(fetchErr.message || JSON.stringify(fetchErr));
            setLoading(false);
            return;
          }

          setProfile(existing);
          setLoading(false);
          return;
        }

        setErrorMsg(insertError.message || JSON.stringify(insertError));
        setLoading(false);
        return;
      }

      setProfile(newProfile);
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message || String(err));
      setLoading(false);
    }
  }

  /* =========================
     VALIDAR NICKNAME ÚNICO
  ========================= */
  const checkNicknameUnique = async (nickname) => {
    if (!nickname || nickname.trim() === "") return true
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", nickname.trim())
        .neq("id", user.id) // Excluir el usuario actual
        .maybeSingle()

      if (error) throw error

      return !data // true si no existe, false si ya está en uso
    } catch (err) {
      console.error("Error verificando nickname:", err)
      return false
    }
  }

  /* =========================
     GUARDAR CAMBIOS
  ========================= */
  const saveProfile = async () => {
    if (!profile.id) {
      alert("Error: No se pudo identificar tu perfil")
      return
    }

    // Validar nickname único antes de guardar
    if (profile.nickname && profile.nickname.trim() !== "") {
      const isUnique = await checkNicknameUnique(profile.nickname)
      if (!isUnique) {
        setNicknameError("❌ Este apodo ya está en uso. Por favor elige otro.")
        return
      }
    }

    setSaving(true)
    setNicknameError(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          nickname: profile.nickname || "",
          role: profile.role || "",
          champions: profile.champions || [],
          avatar_url: profile.avatar_url || ""
        })
        .eq("id", profile.id)

      if (error) {
        alert("❌ Error al guardar los cambios: " + error.message)
        setSaving(false)
        return
      }

      setSaving(false)
      setIsEditing(false)
      alert("✅ Perfil actualizado correctamente")
      
      // Recargar los datos para confirmar que se guardaron
      await getProfile()
    } catch (err) {
      alert("❌ Error al guardar los cambios")
      setSaving(false)
    }
  }

  // Eliminada función fetchSignedUrl

  /* =========================
     SUBIR AVATAR
  ========================= */
  const uploadAvatar = async (file) => {
    if (!file) return
    if (!profile || !profile.id) {
      alert("Necesitas estar autenticado para subir avatar")
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('No hay sesión activa. Inicia sesión e intenta de nuevo.')
        return
      }
      // conservar extensión original
      const parts = file.name.split('.')
      const ext = parts.length > 1 ? parts.pop() : ''
      // path relativo dentro del bucket 'avatars' usando user.id para evitar desincronía
      const filePath = `${user.id}/${user.id}-${Date.now()}${ext ? '.' + ext : ''}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        alert('Error subiendo avatar: ' + uploadError.message)
        return
      }

      // guardar el path en la BD (avatar_url almacenará el path dentro del bucket)
      const oldPath = profile.avatar_url
      const { data: updateData, error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user.id)

      if (updateErr) {
        alert('Error guardando avatar en perfil: ' + updateErr.message)
        return
      }

      // actualizar estado local y obtener signed url
      setProfile({ ...profile, avatar_url: filePath, id: user.id })
      fetchSignedUrl(filePath)

      // eliminar archivo antiguo si existe y es distinto
      try {
        if (oldPath && oldPath !== filePath) {
          const { data: delData, error: delErr } = await supabase.storage.from('avatars').remove([oldPath])
          // Silenciosamente ignorar errores al eliminar archivo antiguo
        }
      } catch (e) {
        // Silenciosamente ignorar errores
      }
    } catch (err) {
      console.error(err)
      alert('Error inesperado al subir avatar')
    }
  }

  const deleteAvatar = async () => {
    if (!profile?.avatar_url) return
    const confirm = window.confirm('¿Estás seguro de que deseas eliminar tu avatar?')
    if (!confirm) return

    try {
      const path = profile.avatar_url
      await supabase.storage.from('avatars').remove([path])

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id)

      if (updateErr) return

      setProfile({ ...profile, avatar_url: null })
      setAvatarPublicUrl(null)
    } catch (err) {
      // Silenciosamente ignorar errores
    }
  }

  /* =========================
     CAMPEONES
  ========================= */
  const addChampion = () => {
    if (!newChampion) return
    if (profile.champions.length >= 3) {
      alert("Solo puedes elegir 3 campeones")
      return
    }

    setProfile({
      ...profile,
      champions: [...profile.champions, newChampion]
    })
    setNewChampion("")
  }

  const removeChampion = (champ) => {
    setProfile({
      ...profile,
      champions: profile.champions.filter(c => c !== champ)
    })
  }

  if (loading) return <p>Cargando perfil...</p>
  if (errorMsg) return <div className="profile-container"><h1>Mi Perfil</h1><p style={{color: '#f87171'}}>Error: {errorMsg}</p></div>
  if (!profile) return <div className="profile-container"><h1>Mi Perfil</h1><p>No se encontró el perfil.</p></div>

  return (
    <div className="profile-container">
      <h1>Mi Perfil</h1>

      {/* AVATAR */}
      <img
        src={avatarPublicUrl || "/default-avatar.png"}
        className="avatar"
        alt="Avatar"
      />

      {isEditing && (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => uploadAvatar(e.target.files[0])}
        />
      )}

      {isEditing && profile?.avatar_url && (
        <button className="delete-button" onClick={deleteAvatar}>
          🗑️ Eliminar avatar
        </button>
      )}

      {/* BOTÓN EDITAR */}
      {!isEditing && (
        <button 
          className="edit-button"
          onClick={() => setIsEditing(!isEditing)}
        >
          ✏️ Editar Perfil
        </button>
      )}

      {/* INFO BÁSICA */}
      <div className="profile-info">
        {isEditing ? (
          <>
            <div className="input-group">
              <label>Nombre</label>
              <input
                type="text"
                value={profile.first_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, first_name: e.target.value })
                }
                placeholder="Tu nombre"
              />
            </div>

            <div className="input-group">
              <label>Apellido</label>
              <input
                type="text"
                value={profile.last_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, last_name: e.target.value })
                }
                placeholder="Tu apellido"
              />
            </div>

            <div className="input-group">
              <label>Apodo</label>
              <input
                type="text"
                value={profile.nickname || ""}
                onChange={(e) => {
                  setProfile({ ...profile, nickname: e.target.value })
                  setNicknameError(null) // Limpiar error al escribir
                }}
                placeholder="Tu apodo en el juego"
              />
              {nicknameError && (
                <p style={{color: '#f87171', fontSize: '0.9rem', marginTop: '5px'}}>
                  {nicknameError}
                </p>
              )}
              <p style={{color: '#888', fontSize: '0.8rem', marginTop: '5px'}}>
                Este apodo será visible para otros usuarios y debe ser único
              </p>
            </div>
          </>
        ) : (
          <>
            <p><strong>Nombre:</strong> {profile.first_name || "No especificado"}</p>
            <p><strong>Apellido:</strong> {profile.last_name || "No especificado"}</p>
            <p><strong>Apodo:</strong> {profile.nickname || "No especificado"}</p>
          </>
        )}
        <p><strong>Correo:</strong> {profile?.email}</p>
      </div>

      {/* ROL */}
      <label>Rol principal</label>
      {isEditing ? (
        <select
          value={profile?.role || ""}
          onChange={(e) =>
            setProfile({ ...profile, role: e.target.value })
          }
        >
          <option value="">Selecciona tu rol</option>
          <option value="Top">Top</option>
          <option value="Jungle">Jungle</option>
          <option value="Mid">Mid</option>
          <option value="ADC">ADC</option>
          <option value="Support">Support</option>
        </select>
      ) : (
        <div className="role-static">{profile?.role || "No especificado"}</div>
      )}

      {/* CAMPEONES */}
      <br/><br/><h3>Campeones principales (máx 3)</h3>


      {isEditing && (
        <div className="champion-input">
          <input
            type="text"
            placeholder="Ej: Ahri"
            value={newChampion}
            onChange={(e) => setNewChampion(e.target.value)}
          />
          <button onClick={addChampion}>Agregar</button>
        </div>
      )}

      <ul>
        {profile?.champions?.map((champ) => (
          <li key={champ}>
            {champ}
            {isEditing && (
              <button onClick={() => removeChampion(champ)}>❌</button>
            )}
          </li>
        ))}
      </ul>

      {/* GUARDAR Y CANCELAR */}
      {isEditing && (
        <div className="button-container">
          <button 
            onClick={saveProfile} 
            disabled={saving}
            className="save-button"
          >
            {saving ? "Guardando..." : "💾 Guardar Cambios"}
          </button>
          <button 
            onClick={() => {
              setIsEditing(false)
              setNicknameError(null)
            }}
            className="cancel-button"
          >
            ❌ Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

export default Profile
