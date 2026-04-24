import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setCreneau(data[0].creneau_code);
      });
  }, []);

  useEffect(() => {
    if (creneau && date) {
      setLoading(true);
      const dStr = date.toISOString().split("T")[0];
      const codeNettoye = creneau.split(':')[0].trim();

      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(codeNettoye)}&date=${dStr}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(Array.isArray(data) ? data : []);
          const map = {};
          if (Array.isArray(data)) data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
          setLoading(false);
        })
        .catch(() => setLoading(false));
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
    }).then(() => alert("Pointage enregistré !"));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial' }}>
      <h1>🏸 Présences Badminton</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={creneau} onChange={e => setCreneau(e.target.value)} style={{ padding: '8px' }}>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour}</option>
          ))}
        </select>

        <DatePicker 
          selected={date} 
          onChange={d => setDate(d)} 
          locale="fr" 
          dateFormat="dd/MM/yyyy"
          customInput={<button style={{ padding: '8px' }}>{date.toLocaleDateString('fr-FR')}</button>}
        />
      </div>

      {loading ? <p>Chargement...</p> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Joueur</th>
                <th style={{ padding: '10px' }}>Présent</th>
              </tr>
            </thead>
            <tbody>
              {joueurs.map(j => (
                <tr key={j.licence} onClick={() => togglePresence(j.licence)} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}>
                  <td style={{ padding: '10px' }}>{j.nom} {j.prenom}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={presences[j.licence] || false} readOnly />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {joueurs.length === 0 && <p style={{ color: 'red' }}>Aucun inscrit trouvé dans "joueurs_creneaux" pour {creneau.split(':')[0]}.</p>}
          
          <button onClick={sauvegarder} style={{ width: '100%', padding: '15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
            💾 SAUVEGARDER
          </button>
        </>
      )}
    </div>
  );
}

export default App;