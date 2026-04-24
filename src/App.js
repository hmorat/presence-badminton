import React, { useState, useEffect, useMemo } from 'react';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  // 1. Charger les créneaux complets
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setSelectedCreneau(data[0]);
      });
  }, []);

  // 2. Générer les dates de la saison pour le jour donné
  const datesSaison = useMemo(() => {
    if (!selectedCreneau) return [];
    const dates = [];
    const joursSemaine = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const cible = joursSemaine[selectedCreneau.jour.toUpperCase()];
    
    let current = new Date(new Date().getFullYear(), 8, 1); // 1er Septembre
    const fin = new Date(new Date().getFullYear() + 1, 7, 31); // 31 Août

    while (current <= fin) {
      if (current.getDay() === cible) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  // Initialiser la date par défaut (prochain cours ou aujourd'hui)
  useEffect(() => {
    if (datesSaison.length > 0 && !datesSaison.includes(date)) {
      setDate(datesSaison[0]);
    }
  }, [datesSaison, date]);

  // 3. Charger les joueurs
  useEffect(() => {
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${selectedCreneau.creneau_code}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
        });
    }
  }, [selectedCreneau, date]);

  const toggleAll = (status) => {
    const newMap = { ...presences };
    joueurs.forEach(j => newMap[j.licence] = status);
    setPresences(newMap);
  };

  const sauvegarder = () => {
    const payload = {
      creneau: selectedCreneau.creneau_code,
      date,
      joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
    };
    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => alert("✅ Enregistré !"));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'system-ui' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Bad Présences</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px', fontSize: '16px' }}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value))}
        >
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.heure_debut}) - {c.entraineur || 'Sans coach'}
            </option>
          ))}
        </select>

        <label><b>Séance :</b></label>
        <select 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', fontSize: '16px' }}
        >
          {datesSaison.map(d => (
            <option key={d} value={d}>{new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => toggleAll(true)} style={{ flex: 1, padding: '10px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '5px' }}>Tout Présent</button>
        <button onClick={() => toggleAll(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #9e9e9e', borderRadius: '5px' }}>Tout Absent</button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {joueurs.map(j => (
          <div 
            key={j.licence} 
            onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))}
            style={{ 
              display: 'flex', justifyContent: 'space-between', padding: '15px', 
              borderBottom: '1px solid #eee', alignItems: 'center',
              backgroundColor: presences[j.licence] ? '#e8f5e9' : 'white'
            }}
          >
            <span style={{ fontSize: '16px' }}>{j.nom} {j.prenom}</span>
            <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.5)' }} />
          </div>
        ))}
      </div>

      <button onClick={sauvegarder} style={{ 
        width: '100%', marginTop: '20px', padding: '15px', backgroundColor: '#2e7d32', 
        color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold',
        position: 'sticky', bottom: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
      }}>
        💾 ENREGISTRER
      </button>
    </div>
  );
}

export default App;