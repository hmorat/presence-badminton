import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { registerLocale } from  "react-datepicker";
import fr from 'date-fns/locale/fr';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('fr', fr);

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState(new Date());
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  // 1. Charger les créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      })
      .catch(err => console.error("Erreur API Créneaux:", err));
  }, []);

  // 2. Charger les joueurs (Correction de la clé de recherche)
  useEffect(() => {
    if (creneau && date) {
      // SÉCURITÉ : On ne prend que le code avant le ":" (ex: "F11")
      const codeNettoye = creneau.split(':')[0].trim();
      const dStr = date.toISOString().split("T")[0];

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(codeNettoye)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          console.log("Joueurs reçus pour " + codeNettoye + " :", data);
          if (Array.isArray(data)) {
            setJoueurs(data);
            const map = {};
            data.forEach(j => map[j.licence] = j.presence || false);
            setPresences(map);
          } else {
            setJoueurs([]);
          }
        })
        .catch(err => {
          console.error("Erreur Fetch Joueurs:", err);
          setJoueurs([]);
        });
    }
  }, [creneau, date]);

  const togglePresence = (lic) => {
    setPresences(prev => ({ ...prev, [lic]: !prev[lic] }));
  };

  const sauvegarder = () => {
    const codeNettoye = creneau.split(':')[0].trim();
    const dStr = date.toISOString().split("T")[0];
    const payload = {
      creneau: codeNettoye,
      date: dStr,
      joueurs: joueurs.map(j => ({ ...j, presence: presences[j.licence] }))
    };

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => alert("Enregistré !"));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🏸 Bad Présences</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select value={creneau} onChange={e => setCreneau(e.target.value)} style={{ padding: '10px' }}>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.heure_debut})
            </option>
          ))}
        </select>

        <DatePicker 
          selected={date} 
          onChange={d => setDate(d)} 
          locale="fr" 
          dateFormat="dd MMMM yyyy"
          customInput={<button style={{ padding: '10px' }}>{date.toLocaleDateString('fr-FR')}</button>}
        />
      </div>

      {joueurs.length > 0 ? (
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Présent</th>
            </tr>
          </thead>
          <tbody>
            {joueurs.map(j => (
              <tr key={j.licence} onClick={() => togglePresence(j.licence)} style={{ cursor: 'pointer' }}>
                <td>{j.nom}</td>
                <td>{j.prenom}</td>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={presences[j.licence] || false} readOnly />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '20px', border: '2px dashed red', color: 'red' }}>
          Aucun joueur trouvé pour le créneau <strong>{creneau.split(':')[0]}</strong>. 
          Vérifie que ta table <em>joueurs_creneaux</em> contient bien ce code.
        </div>
      )}

      <button onClick={sauvegarder} style={{ marginTop: '20px', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        💾 Enregistrer la séance
      </button>
    </div>
  );
}

export default App;