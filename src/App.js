import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const API = "https://presence-badminton-backend.onrender.com";

function App() {
  const [creneaux, setCreneaux] = useState([]);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [date, setDate] = useState("");
  const [joueurs, setJoueurs] = useState([]);
  const [presences, setPresences] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // 1. Chargement des créneaux
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setSelectedCreneau(data[0]);
      })
      .catch(err => console.error("Erreur API créneaux:", err));
  }, []);

  // 2. Calcul des dates de la saison
  const datesSaison = useMemo(() => {
    if (!selectedCreneau || !selectedCreneau.jour) return [];
    const dates = [];
    const joursMap = { "LUNDI": 1, "MARDI": 2, "MERCREDI": 3, "JEUDI": 4, "VENDREDI": 5, "SAMEDI": 6, "DIMANCHE": 0 };
    const jourNettoye = selectedCreneau.jour.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cible = joursMap[jourNettoye];
    let d = new Date(2025, 8, 1, 12, 0, 0); 
    const fin = new Date(2026, 7, 31, 12, 0, 0); 
    while (d <= fin) {
      if (d.getDay() === cible) dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selectedCreneau]);

  // 3. Date par défaut
  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      setDate(prochaine);
    }
  }, [datesSaison]);

  // 4. Chargement des joueurs
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

  // --- COMPTEUR ---
  const nbPresents = useMemo(() => {
    return Object.values(presences).filter(v => v === true).length;
  }, [presences]);

  const exporterToutDepuisBDD = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`${API}/api/export-global`); 
      const data = await response.json();
      if (!data || data.length === 0) return alert("Aucune donnée.");
      const formattedData = data.map(row => ({
        "Code Créneau": row.creneau_code,
        "Date Séance": new Date(row.date_seance).toLocaleDateString('fr-FR'),
        "Nom": row.nom,
        "Prénom": row.prenom,
        "État": row.present ? "PRÉSENT" : "ABSENT"
      }));
      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historique");
      XLSX.writeFile(wb, "Historique_Presences.xlsx");
    } catch (error) {
      alert("Erreur export.");
    } finally {
      setIsExporting(false);
    }
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
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Bad Présences</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px', fontSize: '15px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value))}
        >
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire}) - {c.entraineur || "Sans coach"}
            </option>
          ))}
        </select>

        <label><b>Séance :</b></label>
        <select value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '12px', borderRadius: '8px', fontSize: '15px' }}>
          {datesSaison.map(d => (
            <option key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
          <button 
            onClick={exporterToutDepuisBDD} 
            disabled={isExporting}
            style={{ flex: 1, backgroundColor: '#007bff', color: 'white', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isExporting ? "..." : "📊 Export"}
          </button>
          
          <div style={{ 
            flex: 1, 
            backgroundColor: '#f1f3f4', 
            padding: '10px', 
            borderRadius: '8px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            color: '#333',
            border: '1px solid #ddd'
          }}>
             ✅ {nbPresents} / {joueurs.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3', backgroundColor: '#E3F2FD' }}>Tout Présent</button>
        <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff' }}>Tout Absent</button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', overflow: 'hidden' }}>
        {joueurs.map(j => (
          <div key={j.licence} onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', alignItems: 'center', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent' }}>
            <span>{j.nom} {j.prenom}</span>
            <input type="checkbox" checked={presences[j.licence] || false} readOnly style={{ transform: 'scale(1.3)' }} />
          </div>
        ))}
      </div>

      <button onClick={sauvegarder} style={{ width: '100%', marginTop: '20px', padding: '16px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '17px', cursor: 'pointer' }}>
        💾 ENREGISTRER
      </button>
    </div>
  );
}

export default App;