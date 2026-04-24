import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import fr from 'date-fns/locale/fr';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('fr', fr);

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  // TEST DE CHARGEMENT
  useEffect(() => {
    console.log("--- L'APPLICATION EST CHARGÉE ---");
    alert("Application chargée ! Si vous voyez ce message, le code est à jour.");
  }, []);

  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  // 1. Charger les créneaux
  useEffect(() => {
    console.log("Fetching créneaux...");
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        console.log("Créneaux reçus:", data);
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      })
      .catch(err => console.error("Erreur créneaux:", err));
  }, []);

  // 2. Charger les joueurs
  useEffect(() => {
    if (creneau && date) {
      const codeNettoye = creneau.split(':')[0].trim();
      const dStr = date.toISOString().split("T")[0];
      console.log(`Appel /api/joueurs pour ${codeNettoye} au ${dStr}`);

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(codeNettoye)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          console.log("Données joueurs reçues:", data);
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
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
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Badminton Présences</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <select value={creneau} onChange={e => setCreneau(e.target.value)}>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour}</option>
          ))}
        </select>
        <DatePicker selected={date} onChange={d => setDate(d)} dateFormat="dd/MM/yyyy" locale="fr" />
      </div>

      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th>Nom</th><th>Prénom</th><th>Présent</th>
          </tr>
        </thead>
        <tbody>
          {joueurs.map(j => (
            <tr key={j.licence} onClick={() => togglePresence(j.licence)} style={{ cursor: 'pointer' }}>
              <td>{j.nom}</td><td>{j.prenom}</td>
              <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {joueurs.length === 0 && <p style={{ color: 'red' }}>Aucun joueur trouvé pour ce créneau.</p>}

      <button onClick={sauvegarder} style={{ marginTop: '20px', padding: '10px', backgroundColor: 'green', color: 'white' }}>
        ENREGISTRER
      </button>
    </div>
  );
}

export default App;