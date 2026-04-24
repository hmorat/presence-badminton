import React, { useState, useEffect } from 'react';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  // Charger les créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      });
  }, []);

  // Charger les joueurs (Route /api/joueurs pour la lecture)
  useEffect(() => {
    if (creneau && date) {
      fetch(`${API}/api/joueurs?creneau=${creneau}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
        })
        .catch(err => console.error("Erreur chargement:", err));
    }
  }, [creneau, date]);

  const togglePresence = (licence) => {
    setPresences(prev => ({ ...prev, [licence]: !prev[licence] }));
  };

  const sauvegarder = () => {
    const payload = {
      creneau,
      date,
      joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
    };

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => alert("Présences enregistrées !"));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🏸 Présences Badminton</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <select value={creneau} onChange={e => setCreneau(e.target.value)} style={{ padding: '8px', marginRight: '10px' }}>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '7px' }} />
      </div>

      <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ padding: '10px' }}>Nom Prénom</th>
            <th>Présent</th>
          </tr>
        </thead>
        <tbody>
          {joueurs.map(j => (
            <tr key={j.licence} onClick={() => togglePresence(j.licence)} style={{ cursor: 'pointer' }}>
              <td style={{ padding: '10px' }}>{j.nom} {j.prenom}</td>
              <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={sauvegarder} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        💾 SAUVEGARDER
      </button>
    </div>
  );
}

export default App;