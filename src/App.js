import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

// Remplace par ton URL Render si elle est différente
const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]); // La liste complète (Nom, Prénom, Licence)
  const [presences, setPresences] = useState({}); // Le statut coché (Vrai/Faux)
  const [message, setMessage] = useState("");

  // 1. Charger les créneaux au démarrage
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      })
      .catch(err => console.error("Erreur créneaux:", err));
  }, []);

  // 2. Charger les joueurs quand le créneau ou la date change
  useEffect(() => {
    if (creneau && date) {
      const dStr = date.toISOString().split("T")[0];
      
      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(creneau)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setJoueurs(data); // On stocke la liste pour l'affichage
            
            // On prépare l'état des cases à cocher
            const map = {};
            data.forEach(j => {
              map[j.licence] = j.presence;
            });
            setPresences(map);
          }
        })
        .catch(err => console.error("Erreur chargement joueurs:", err));
    }
  }, [creneau, date]);

  // 3. Inverser la présence quand on clique sur une ligne
  const togglePresence = (licence) => {
    setPresences(prev => ({
      ...prev,
      [licence]: !prev[licence]
    }));
  };

  // 4. Sauvegarder sur le serveur
  const sauvegarder = () => {
    const dStr = date.toISOString().split("T")[0];
    
    // On prépare les données à envoyer
    const donnees = joueurs.map(j => ({
      licence: j.licence,
      nom: j.nom,
      prenom: j.prenom,
      presence: presences[j.licence] || false
    }));

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneau: creneau,
        date: dStr,
        joueurs: donnees
      })
    })
    .then(res => res.json())
    .then(() => {
      setMessage("✅ Sauvegardé avec succès !");
      setTimeout(() => setMessage(""), 3000);
    })
    .catch(err => {
      console.error(err);
      setMessage("❌ Erreur lors de la sauvegarde.");
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Badminton - Présences</h1>
        
        <div className="controls">
          <select value={creneau} onChange={(e) => setCreneau(e.target.value)}>
            {creneaux.map(c => (
              <option key={c.creneau_code} value={c.creneau_code}>
                {c.creneau_code} : {c.jour} {c.heure_debut}
              </option>
            ))}
          </select>

          <DatePicker 
            selected={date} 
            onChange={(d) => setDate(d)} 
            dateFormat="dd/MM/yyyy"
          />
        </div>

        {message && <p className="status-message">{message}</p>}

        <div className="liste-joueurs">
          {joueurs.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Présent</th>
                </tr>
              </thead>
              <tbody>
                {joueurs.map(j => (
                  <tr 
                    key={j.licence} 
                    onClick={() => togglePresence(j.licence)}
                    className={presences[j.licence] ? "present" : "absent"}
                  >
                    <td>{j.nom}</td>
                    <td>{j.prenom}</td>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={presences[j.licence] || false} 
                        readOnly 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Aucun joueur trouvé pour ce créneau.</p>
          )}
        </div>

        <button className="save-btn" onClick={sauvegarder}>
          Enregistrer les présences
        </button>
      </header>
    </div>
  );
}

export default App;