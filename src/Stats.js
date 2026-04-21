import { useEffect, useState } from "react";
import "./App.css";

export default function Stats() {
  const [joueurs, setJoueurs] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [selected, setSelected] = useState("ALL");

  const API = "http://localhost:4000/api"; // adapte si besoin

  /* ========================
     FETCH CRENEAUX
  ======================== */
  const fetchCreneaux = async () => {
  try {
    const res = await fetch(
      "https://presence-badminton-backend.onrender.com/api/creneaux"
    );
    const data = await res.json();

    console.log("CRENEAUX =", data);

    // 🔥 gestion de TOUS les cas
    if (Array.isArray(data)) {
      setCreneaux(data);
    } else if (Array.isArray(data.creneaux)) {
      setCreneaux(data.creneaux);
    } else {
      setCreneaux([]);
    }
  } catch (err) {
    console.error(err);
    setCreneaux([]);
  }
};

  /* ========================
     FETCH STATS
  ======================== */
  const fetchStats = async (code = "ALL") => {
    try {
      const url =
        code === "ALL"
          ? `${API}/stats`
          : `${API}/stats?creneau=${code}`;

      const res = await fetch(url);
      const data = await res.json();

      console.log("STATS API:", data);

      setJoueurs(Array.isArray(data.joueurs) ? data.joueurs : []);
    } catch (err) {
      console.error("Erreur fetch stats:", err);
      setJoueurs([]);
    }
  };

  /* ========================
     INIT
  ======================== */
  useEffect(() => {
    fetchCreneaux();
    fetchStats();
  }, []);

  /* ========================
     CHANGE FILTRE
  ======================== */
  const handleChange = (e) => {
    const value = e.target.value;
    setSelected(value);
    fetchStats(value);
  };

  /* ========================
     TRI SAFE (ANTI BUG)
  ======================== */
  const sortedCreneaux = Array.isArray(creneaux)
    ? [...creneaux].sort((a, b) =>
        (a.creneau_code || "").localeCompare(b.creneau_code || "")
      )
    : [];
    console.log("TYPE CRENEAUX:", typeof creneaux, creneaux);

  /* ========================
     CALCUL %
  ======================== */
  const taux = (p, t) => {
    return t > 0 ? Math.round((p / t) * 100) : 0;
  };

  return (
    <div className="dashboard">
      <h1>🏸 Présences Badminton</h1>

      {/* ========================
    FILTRE CRENEAUX
======================== */}
<div className="filter">
  <label>Créneau :</label>

  <select
    value={selected}
    onChange={(e) => setSelected(e.target.value)}
  >
    <option value="ALL">Tous les créneaux</option>

    {Array.isArray(creneaux) &&
      [...creneaux]
        .filter((c) => c && c.creneau_code) // 🔥 sécurité
        .sort((a, b) =>
          a.creneau_code.localeCompare(b.creneau_code)
        )
        .map((c) => (
          <option key={c.creneau_code} value={c.creneau_code}>
            {c.creneau_code} — {c.jour} {c.horaire} | {c.gymnase} | {c.entraineur}
          </option>
        ))}
  </select>
</div>

      <div className="grid">
        {/* ========================
            JOUEURS
        ======================== */}
        <div className="card">
          <h2>🏆 Joueurs</h2>

          {joueurs.length === 0 && <p>Aucune donnée</p>}

          {joueurs.map((j) => (
            <div key={j.licence} className="row">
              <span>
                {j.prenom} {j.nom}
              </span>
              <span>{taux(j.presents, j.total)}%</span>
            </div>
          ))}
        </div>

        {/* ========================
            CRENEAUX (LISTE)
        ======================== */}
        <div className="card">
          <h2>🎾 Créneaux</h2>

          {sortedCreneaux.map((c) => (
            <div key={c.creneau_code} className="row">
              <span>
                {c.creneau_code} — {c.jour} {c.horaire}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}