import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});

  // 1. Chargement initial des créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setSelectedCreneau(data[0]);
      })
      .catch(err => console.error("Erreur API créneaux:", err));
  }, []);

  // 2. Génération des dates de la saison sans décalage horaire
  const datesSaison = useMemo(() => {
    if (!selectedCreneau || !selectedCreneau.jour) return [];
    
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    
    const jourNettoye = selectedCreneau.jour.toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const cible = joursMap[jourNettoye];
    
    // Saison 2025-2026
    let d = new Date(2025, 8, 1, 12, 0, 0); 
    const fin = new Date(2026, 7, 31, 12, 0, 0); 

    while (d <= fin) {
      if (d.getDay() === cible) {
        dates.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  // 3. Sélection automatique de la prochaine séance
  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      setDate(prochaine);
    }
  }, [datesSaison]);

  // 4. Chargement des joueurs pour le créneau et la date choisis
  useEffect(() => {
    if (selectedCreneau && date) {
      fetch(`${API}/api/joueurs?creneau=${selectedCreneau.creneau_code}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          setJoueurs(data);
          const map = {};
          data.forEach(j => map[j.licence] = j.present);
          setPresences(map);
        })
        .catch(err => console.error("Erreur API joueurs:", err));
    }
  }, [selectedCreneau, date]);

  // 5. Fonctions d'action
  const toggleAll = (status) => {
    const newMap = {};
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
    }).then(() => alert("✅ Présences enregistrées !"));
  };

  const exporterToutLeCalendrier = () => {
    const datesExport = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };

    creneaux.forEach(c => {
      const jourNettoye = c.jour.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cible = joursMap[jourNettoye];
      let d = new Date(2025, 8, 1, 12, 0, 0);
      const fin = new Date(2026, 7, 31, 12, 0, 0);

      while (d <= fin) {
        if (d.getDay() === cible) {
          datesExport.push({
            "Code Créneau": c.creneau_code, // 1ère colonne
            "Date": d.toLocaleDateString('fr-FR'), // 2ème colonne
            "Jour": c.jour,
            "Horaire": c.horaire,
            "Entraineur": c.entraineur
          });
        }
        d.setDate(d.getDate() + 1);
      }
    });

    const ws = XLSX.utils.json_to_sheet(datesExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Séances");
    XLSX.writeFile(wb, "Calendrier_Saison_2025_2026.xlsx");
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>🏸 Bad Présences</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px', fontSize: '15px', border: '1px solid #ddd' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value))}
        >
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire})
            </option>
          ))}
        </select>

        <label><b>Séance :</b></label>
        <select 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', fontSize: '15px', border: '1px solid #ddd' }}
        >
          {datesSaison.map(d => (
            <option key={d} value={d}>
              {new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>

        <button onClick={exporterToutLeCalendrier} style={{ marginTop: '5px', backgroundColor: '#f1f1f1', border: '1px solid #ccc', padding: '8px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>
          📊 Export XLSX (Toute la saison)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => toggleAll(true)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: '#E3F2FD', fontWeight: '500' }}>Tout Présent</button>
        <button onClick={() => toggleAll(false)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff' }}>Tout Absent</button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {joueurs.length > 0 ? joueurs.map(j => (
          <div 
            key={j.licence} 
            onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))}
            style={{ 
              display: 'flex', justifyContent: 'space-between', padding: '15px', 
              borderBottom: '1px solid #eee', alignItems: 'center',
              backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent',
              transition: 'background-color 0.2s'
            }}
          >
            <span style={{ fontSize: '16px' }}>{j.nom} {j.prenom}</span>
            <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.3)' }} />
          </div>
        )) : <p style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Aucun joueur sur ce créneau</p>}
      </div>

      <button onClick={sauvegarder} style={{ 
        width: '100%', marginTop: '20px', padding: '16px', backgroundColor: '#2e7d32', 
        color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '17px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer'
      }}>
        💾 ENREGISTRER LES PRÉSENCES
      </button>
    </div>
  );
}

export default App;