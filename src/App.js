import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]); 
  const [presences, setPresences] = useState({}); 
  const [loading, setLoading] = useState(false);

  // 1. Charger les créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      })
      .catch(err => console.error("Erreur chargement créneaux:", err));
  }, []);

  // 2. Charger les joueurs (La partie critique)
  useEffect(() => {
    if (creneau && date) {
      setLoading(true);
      const dStr = date.toISOString().split("T")[0];
      
      console.log(`Appel API pour : ${creneau} le ${dStr}`);

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(creneau)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          console.log("Données brutes reçues du serveur :", data);

          if (Array.isArray(data) && data.length > 0) {
            // On force les données à avoir le bon format (casse, noms de colonnes)
            const listeNormalisee = data.map(j => ({
              licence: j.licence || j.Licence || "",
              nom: j.nom || j.Nom || "Sans nom",
              prenom: j.prenom || j.Prenom || "Sans prénom",
              presence: j.presence === true
            }));

            setJoueurs(listeNormalisee);

            const map = {};
            listeNormalisee.forEach(j => {
              map[j.licence] = j.presence;
            });
            setPresences(map);
          } else {
            console.warn("Le serveur a renvoyé une liste vide.");
            setJoueurs([]);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Erreur Fetch joueurs:", err);
          setLoading(false);
        });
    }
  }, [creneau, date]);

  const togglePresence = (licence) => {
    setPresences(prev => ({ ...prev, [licence]: !prev[licence] }));
  };

  const sauvegarder = () => {
    const dStr = date.toISOString().split("T")[0];
    const payload = {
      creneau: creneau,
      date: dStr,
      joueurs: joueurs.map(j => ({
        ...j,
        presence: presences[j.licence] || false
      }))
    };

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(() => alert("Sauvegardé !"))
    .catch(err => alert("Erreur de sauvegarde"));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Badminton - Appel</h1>
        
        <div className="controls">
          <select value={creneau} onChange={(e) => setCreneau(e.target.value)}>
            {creneaux.map(c => (
              <option key={c.creneau_code} value={c.creneau_code}>
                {c.creneau_code}
              </option>
            ))}
          </select>

          <DatePicker selected={date} onChange={d => setDate(d)} dateFormat="dd/MM/yyyy" />
        </div>

        {loading ? <p>Chargement des joueurs...</p> : (
          <div className="liste-container">
            {joueurs.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Présence</th>
                  </tr>
                </thead>
                <tbody>
                  {joueurs.map(j => (
                    <tr key={j.licence} onClick={() => togglePresence(j.licence)}>
                      <td>{j.nom}</td>
                      <td>{j.prenom}</td>
                      <td>
                        <input type="checkbox" checked={presences[j.licence] || false} readOnly />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'orange' }}>Aucun joueur trouvé. Vérifie tes tables Supabase.</p>
            )}
          </div>
        )}

        <button onClick={sauvegarder} className="save-btn">Enregistrer</button>
      </header>
    </div>
  );
}

export default App;