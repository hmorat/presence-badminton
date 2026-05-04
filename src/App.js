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
    const jourNettoye = selectedCreneau.jour?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const cible = joursMap[jourNettoye];
    
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
  }, [datesSaison, date]);

  // CHARGEMENT DES JOUEURS (Version corrigée)
  useEffect(() => {
    if (selectedCreneau && date) {
      console.log("Chargement pour :", selectedCreneau.creneau_code, date);
      fetch(`${API}/api/joueurs?creneau=${selectedCreneau.creneau_code}&date=${date}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setJoueurs(data);
            const map = {};
            data.forEach(j => {
              // On s'assure de récupérer la présence même si c'est null/undefined
              map[j.licence] = j.present || "ABSENT";
            });
            setPresences(map);
          }
        })
        .catch(err => console.error("Erreur fetch joueurs:", err));
    } else {
      setJoueurs([]); // On vide si rien n'est sélectionné
    }
  }, [selectedCreneau, date]);

  const toggleAll = (val) => {
    const map = { ...presences };
    joueurs.forEach(j => map[j.licence] = val);
    setPresences(map);
  };

  const sauvegarder = () => {
    const listeEnvoi = joueurs.map(j => ({ 
      licence: j.licence, 
      present: presences[j.licence] || "ABSENT" 
    }));

    fetch(`${API}/api/presences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creneau: selectedCreneau.creneau_code,
        date,
        joueurs: listeEnvoi
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("Erreur serveur");
      return res.json();
    })
    .then(() => {
      alert("✅ Enregistré avec succès !");
      setSelectedCreneau(null); 
      setDate("");
      setJoueurs([]);
    })
    .catch((err) => {
      console.error(err);
      alert("❌ Erreur lors de l'enregistrement");
    });
  };

  const exportExcel = () => {
    fetch(`${API}/api/export-global`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) return alert("Aucune donnée à exporter.");
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historique_Presences");
        XLSX.writeFile(wb, "Historique_ABAC.xlsx");
      })
      .catch(() => alert("Erreur lors de l'export global"));
  };

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Présences ABAC</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <select 
          style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => { 
            const found = creneaux.find(c => c.creneau_code === e.target.value);
            setSelectedCreneau(found || null);
            setDate(""); 
          }}
        >
          <option value="">-- Choisir un créneau --</option>
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} : {c.jour} ({c.horaire})
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
            <strong>✅ {Object.values(presences).filter(v => v === "PRÉSENT").length} présents</strong>
            <button onClick={exportExcel} style={{ padding: '5px 10px' }}>📊 Export</button>
          </div>
        )}
      </div>

      {selectedCreneau && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => toggleAll("PRÉSENT")} style={{ flex: 1, padding: '10px', borderRadius: '5px', backgroundColor: 'white', border: '1px solid #2e7d32' }}>Tous Présents</button>
            <button onClick={() => toggleAll("ABSENT")} style={{ flex: 1, padding: '10px', borderRadius: '5px', backgroundColor: 'white', border: '1px solid #ccc' }}>Tous Absents</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
            {joueurs.length > 0 ? joueurs.map(j => (
              <div key={j.licence} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>{j.nom} {j.prenom}</span>
                <select 
                  value={presences[j.licence] || "ABSENT"} 
                  onChange={(e) => setPresences(p => ({ ...p, [j.licence]: e.target.value }))}
                  style={{ 
                    padding: '6px', 
                    borderRadius: '5px',
                    backgroundColor: presences[j.licence] === "PRÉSENT" ? '#e8f5e9' : (presences[j.licence] === "EXCUSÉ" ? '#fff3e0' : 'white')
                  }}
                >
                  <option value="PRÉSENT">✅ Présent</option>
                  <option value="ABSENT">❌ Absent</option>
                  <option value="EXCUSÉ">✉️ Excusé</option>
                </select>
              </div>
            )) : <p style={{ textAlign: 'center', padding: '20px' }}>Chargement ou aucun joueur...</p>}
          </div>

          <button onClick={sauvegarder} style={{ width: '100%', padding: '15px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            💾 ENREGISTRER
          </button>
        </>
      )}
    </div>
  );
}

export default App;