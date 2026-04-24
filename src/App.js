import React, { useState, useEffect, useMemo } from 'react';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setSelectedCreneau(data[0]);
      });
  }, []);

  // Génération des dates SANS décalage horaire
  const datesSaison = useMemo(() => {
    if (!selectedCreneau || !selectedCreneau.jour) return [];
    
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    
    // Nettoyage rigoureux du jour (suppression accents et espaces)
    const jourNettoye = selectedCreneau.jour.toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const cible = joursMap[jourNettoye];
    
    // On définit midi (12:00) pour éviter que le décalage GMT ne change le jour
    let d = new Date(2025, 8, 1, 12, 0, 0); // 1er Sept 2025
    const fin = new Date(2026, 7, 31, 12, 0, 0); // 31 Août 2026

    while (d <= fin) {
      if (d.getDay() === cible) {
        dates.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  // Sélection de la PROCHAINE séance (aujourd'hui ou futur)
  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      setDate(prochaine);
    }
  }, [datesSaison]);

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
    }).then(() => alert("✅ Enregistré avec succès !"));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Bad Présences</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px', fontSize: '15px', border: '1px solid #ccc' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value))}
        >
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire})
            </option>
          ))}
        </select>

        <label><b>Séance (Année 2025-2026) :</b></label>
        <select 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', fontSize: '15px', border: '1px solid #ccc' }}
        >
          {datesSaison.map(d => (
            <option key={d} value={d}>
              {new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => {
          const m = {}; joueurs.forEach(j => m[j.licence] = true); setPresences(m);
        }} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: '#E3F2FD' }}>Tout Présent</button>
        <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>Tout Absent</button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', overflow: 'hidden' }}>
        {joueurs.map(j => (
          <div 
            key={j.licence} 
            onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))}
            style={{ 
              display: 'flex', justifyContent: 'space-between', padding: '15px', 
              borderBottom: '1px solid #eee', alignItems: 'center',
              backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent'
            }}
          >
            <span style={{ fontSize: '16px' }}>{j.nom} {j.prenom}</span>
            <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.3)' }} />
          </div>
        ))}
      </div>

      <button onClick={sauvegarder} style={{ 
        width: '100%', marginTop: '20px', padding: '15px', backgroundColor: '#2e7d32', 
        color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '17px'
      }}>
        💾 ENREGISTRER
      </button>
    </div>
  );
}

export default App;