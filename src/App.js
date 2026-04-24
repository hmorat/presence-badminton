import React, { useState, useEffect } from 'react';
// On retire l'import CSS qui fait planter Vercel pour l'instant
// import "react-datepicker/dist/react-datepicker.css"; 

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [joueurs, setJoueurs] = useState([]);

  useEffect(() => {
    console.log("Application démarrée");
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        console.log("Créneaux chargés:", data);
        setCreneaux(data);
      })
      .catch(err => console.error("Erreur API:", err));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>🏸 Test Présences</h1>
      <p>Si vous voyez ce texte, la mise à jour a fonctionné.</p>
      <select value={creneau} onChange={e => setCreneau(e.target.value)}>
        <option value="">Choisir un créneau</option>
        {creneaux.map(c => (
          <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code}</option>
        ))}
      </select>
    </div>
  );
}

export default App;