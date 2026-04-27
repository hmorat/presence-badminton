import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  useEffect(() => {
    fetch(`${API}/api/creneaux`).then(res => res.json()).then(setCreneaux);
  }, []);

  const datesSaison = useMemo(() => {
    if (!selectedCreneau) return [];
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const cible = joursMap[selectedCreneau.jour?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()];
    let d = new Date(2025, 8, 1, 12, 0, 0);
    while (d <= new Date(2026, 7, 31)) {
      if (d.getDay() === cible) dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  useEffect(() => {
    if (datesSaison.length > 0 && !date) {
      const auj = new Date().toISOString().split('T')[0];
      setDate(datesSaison.find(d => d >= auj) || datesSaison[0]);
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

  const toggleAll = (val) => {
    const map = {};
    joueurs.forEach(j => map[j.licence] = val);
    setPresences(map);
  };

  const sauvegarder = () => {
    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneau: selectedCreneau.creneau_code,
        date,
        joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false }))
      })
    }).then(() => alert("✅ Enregistré avec succès !"));
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(joueurs.map(j => ({
      Nom: j.nom, Prénom: j.prenom, Présence: presences[j.licence] ? "PRÉSENT" : "ABSENT"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Présences");
    XLSX.writeFile(wb, `ABAC_${selectedCreneau.creneau_code}_${date}.xlsx`);
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <select 
          style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px' }}
          onChange={(e) => { setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value)); setDate(""); }}
        >
          <option value="">-- Choisir un créneau --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur}
            </option>
          ))}
        </select>

        {selectedCreneau && (
          <select 
            style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px' }}
            value={date} onChange={(e) => setDate(e.target.value)}
          >
            {datesSaison.map(d => (
              <option key={d} value={d}>
                {new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </option>
            ))}
          </select>
        )}

        {selectedCreneau && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '8px' }}>
            <strong>✅ {Object.values(presences).filter(v => v).length} / {joueurs.length} présents</strong>
            <button onClick={exportExcel} style={{ padding: '5px 10px', cursor: 'pointer' }}>📊 Export</button>
          </div>
        )}
      </div>

      {selectedCreneau && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => toggleAll(true)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: 'white', cursor: 'pointer' }}>Tous Présents</button>
            <button onClick={() => toggleAll(false)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} 
                   style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'white', cursor: 'pointer' }}>
                <span>{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.2)' }} />
              </div>
            )) : <p style={{ textAlign: 'center', color: 'red', padding: '20px' }}>Aucun joueur trouvé pour ce créneau.</p>}
          </div>

          <button onClick={sauvegarder} style={{ width: '100%', padding: '15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 ENREGISTRER LES PRÉSENCES
          </button>
        </>
      )}
    </div>
  );
}

export default App;