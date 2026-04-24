import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]);

  // 1. Charger les créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0 && !creneau) setCreneau(data[0].creneau_code);
      });
  }, []);

  // 2. Charger les joueurs
  useEffect(() => {
    if (creneau && date) {
      const dStr = date.toISOString().split("T")[0];
      console.log("Tentative chargement joueurs pour:", creneau, dStr);

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(creneau)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          console.log("DATA REÇUE:", data);
          setJoueurs(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Erreur Fetch:", err));
    }
  }, [creneau, date]);

  return (
    <div style={{ padding: "20px", color: "black", backgroundColor: "white", minHeight: "100vh" }}>
      <h1>Test Présences</h1>
      
      <select value={creneau} onChange={(e) => setCreneau(e.target.value)}>
        {creneaux.map(c => (
          <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code}</option>
        ))}
      </select>

      <DatePicker selected={date} onChange={d => setDate(d)} />

      <hr />

      <h2>Nombre de joueurs trouvés : {joueurs.length}</h2>

      <div style={{ border: "1px solid red", padding: "10px" }}>
        {joueurs.length > 0 ? (
          <ul>
            {joueurs.map((j, index) => (
              <li key={index} style={{ marginBottom: "10px", fontSize: "18px" }}>
                {j.nom} {j.prenom} (Licence: {j.licence})
              </li>
            ))}
          </ul>
        ) : (
          <p>La liste est vide. Vérifie la console (F12) pour voir "DATA REÇUE".</p>
        )}
      </div>
    </div>
  );
}

export default App;