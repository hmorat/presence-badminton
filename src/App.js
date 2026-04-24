import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import fr from 'date-fns/locale/fr'; // Corrigé : locale avec un 'e'
import "react-datepicker/dist/react-datepicker.css";
registerLocale('fr', fr);

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      })
      .catch(err => console.error("Erreur créneaux:", err));
  }, []);

  useEffect(() => {
    if (creneau && date) {
      const dStr = date.toISOString().split("T")[0];
      const codeNettoye = creneau.split(':')[0].trim();

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(codeNettoye)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(Array.isArray(data) ? data : []);
          const map = {};
          if (Array.isArray(data)) {
            data.forEach(j => map[j.licence] = j.present);
          }
          setPresences(map);
        })
        .catch(err => console.error("Erreur joueurs:", err));
    }
  }, [creneau, date]);

  const togglePresence = (licence) => {
    setPresences(prev => ({ ...prev, [licence]: !prev[licence] }));
  };

  const sauvegarder = () => {
    const dStr = date.toISOString().split("T")[0];
    const payload = {
      creneau,
      date: dStr,
      joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
    };

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => alert("Sauvegardé !"));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🏸 Présences</h1>
      <div style={{ marginBottom: '20px' }}>
        <select value={creneau} onChange={e => setCreneau(e.target.value)}>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code}</option>
          ))}
        </select>
        <DatePicker selected={date} onChange={d => setDate(d)} locale="fr" dateFormat="dd/MM/yyyy" />
      </div>

      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th>Joueur</th><th>Présent</th>
          </tr>
        </thead>
        <tbody>
          {joueurs.map(j => (
            <tr key={j.licence} onClick={() => togglePresence(j.licence)} style={{ cursor: 'pointer' }}>
              <td>{j.nom} {j.prenom}</td>
              <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={sauvegarder} style={{ marginTop: '20px', padding: '10px', backgroundColor: 'green', color: 'white' }}>
        ENREGISTRER
      </button>
    </div>
  );
}

export default App;