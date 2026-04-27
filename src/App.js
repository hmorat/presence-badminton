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
      fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(selectedCreneau.creneau_code)}&date=${date}`)
        .then(res => res.json()).then(data => {
          setJoueurs(data);
          const m = {}; data.forEach(j => m[j.licence] = j.present); setPresences(m);
        });
    }
  }, [selectedCreneau, date]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(joueurs.map(j => ({
      Nom: j.nom, Prénom: j.prenom, Présent: presences[j.licence] ? "OUI" : "NON"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Présences");
    XLSX.writeFile(wb, `Export_${selectedCreneau.creneau_code}_${date}.xlsx`);
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ padding: '15px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', marginBottom: '20px', backgroundColor: '#fff' }}>
        <select style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px' }} 
                value={selectedCreneau?.creneau_code || ""}
                onChange={(e) => {setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value)); setDate("");}}>
          <option value="">-- Choisir un créneau --</option>
          {creneaux.map(c => <option key={c.creneau_code} value={c.creneau_code}>
            {c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur || c.Entraineur}
          </option>)}
        </select>

        {selectedCreneau && (
          <>
            <select style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px' }} value={date} onChange={(e) => setDate(e.target.value)}>
              {datesSaison.map(d => <option key(d) value(d)>
                {new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '8px' }}>
              <strong>✅ {Object.values(presences).filter(v => v).length} / {joueurs.length} présents</strong>
              <button onClick={exportExcel} style={{ padding: '8px 15px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc' }}>📊 Export Excel</button>
            </div>
          </>
        )}
      </div>

      {selectedCreneau && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: 'white', cursor: 'pointer' }}>Tous Présents</button>
            <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', marginBottom: '20px', backgroundColor: 'white' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} onClick={() => setPresences({...presences, [j.licence]: !presences[j.licence]})} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent', cursor: 'pointer' }}>
                <span>{j.nom} {j.prenom}</span>
                <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.3)' }} />
              </div>
            )) : <p style={{textAlign:'center', padding:'30px', color:'#d32f2f'}}>Aucun joueur trouvé pour ce créneau.</p>}
          </div>
          
          <button onClick={() => {
            fetch(`${API}/api/presences`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creneau: selectedCreneau.creneau_code, date, joueurs: joueurs.map(j => ({ licence: j.licence, present: presences[j.licence] || false })) })
            }).then(() => alert("💾 Présences sauvegardées !"));
          }} style={{ width: '100%', padding: '18px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>💾 ENREGISTRER</button>
        </>
      )}
    </div>
  );
}

export default App;