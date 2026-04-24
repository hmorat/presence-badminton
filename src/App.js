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

  // 1. Chargement des créneaux pour l'interface
  useEffect(() => {
    fetch(`${API}/api/creneaux`)
      .then(res => res.json())
      .then(data => {
        setCreneaux(data);
        if (data.length > 0) setSelectedCreneau(data[0]);
      })
      .catch(err => console.error("Erreur API créneaux:", err));
  }, []);

  // 2. Dates pour le sélecteur (Interface)
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

  useEffect(() => {
    if (datesSaison.length > 0) {
      const auj = new Date().toISOString().split('T')[0];
      const prochaine = datesSaison.find(d => d >= auj) || datesSaison[0];
      setDate(prochaine);
    }
  }, [datesSaison]);

  // 3. Chargement des joueurs pour l'affichage
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

  // --- FONCTION D'EXPORT GLOBAL (BASÉE SUR LA BDD) ---
  const exporterToutDepuisBDD = async () => {
    setIsExporting(true);
    try {
      // On récupère TOUTES les lignes de la table presences via le backend
      // Note : Il faudra s'assurer que ton backend a une route pour tout récupérer
      // Si tu n'as pas de route globale, on va boucler sur les dates enregistrées
      const response = await fetch(`${API}/api/export-global`); 
      const data = await response.json();

      if (!data || data.length === 0) {
        alert("Aucune donnée de présence enregistrée dans la base.");
        return;
      }

      // Formatage pour l'Excel
      const formattedData = data.map(row => ({
        "Code Créneau": row.creneau_code,
        "Date Séance": new Date(row.date_seance).toLocaleDateString('fr-FR'),
        "Nom": row.nom,
        "Prénom": row.prenom,
        "État": row.present ? "PRÉSENT" : "ABSENT"
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historique Présences");
      XLSX.writeFile(wb, "Historique_Complet_Presences.xlsx");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'export. Vérifiez que la route /api/export-global est prête.");
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
    <div style={{ padding: '15px', maxWidth: '500px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>🏸 Bad Présences</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label><b>Créneau :</b></label>
        <select 
          style={{ padding: '12px', borderRadius: '8px' }}
          value={selectedCreneau?.creneau_code || ""}
          onChange={(e) => setSelectedCreneau(creneaux.find(c => c.creneau_code === e.target.value))}
        >
          {creneaux.map(c => (
            <option key={c.creneau_code} value={c.creneau_code}>{c.creneau_code} : {c.jour} ({c.horaire})</option>
          ))}
        </select>

        <label><b>Séance :</b></label>
        <select value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }}>
          {datesSaison.map(d => (
            <option key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</option>
          ))}
        </select>

        <button 
          onClick={exporterToutDepuisBDD} 
          disabled={isExporting}
          style={{ marginTop: '10px', backgroundColor: '#007bff', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isExporting ? "⏳ Extraction..." : "📥 EXPORTER TOUT L'HISTORIQUE (XLSX)"}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => {const m={}; joueurs.forEach(j=>m[j.licence]=true); setPresences(m)}} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #2196F3' }}>Tout Présent</button>
        <button onClick={() => setPresences({})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>Tout Absent</button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: '10px', backgroundColor: '#fff', overflow: 'hidden' }}>
        {joueurs.map(j => (
          <div key={j.licence} onClick={() => setPresences(p => ({ ...p, [j.licence]: !p[j.licence] }))} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', alignItems: 'center', backgroundColor: presences[j.licence] ? '#e8f5e9' : 'transparent' }}>
            <span>{j.nom} {j.prenom}</span>
            <input type="checkbox" checked={presences[j.licence] || false} readOnly />
          </div>
        ))}
      </div>

      <button onClick={sauvegarder} style={{ width: '100%', marginTop: '20px', padding: '16px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
        💾 ENREGISTRER
      </button>
    </div>
  );
}

export default App;