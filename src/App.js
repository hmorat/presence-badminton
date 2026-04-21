import { useEffect, useState } from "react";
import supabase from "./supabase";

const API = "https://presence-badminton-backend.vercel.app";

const COACHS = [
  "coach1@club.fr",
  "president.abac92@gmail.com",
  "secretaire.abac92@gmail.com",
];

function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [creneaux, setCreneaux] = useState([]);
  const [dates, setDates] = useState([]);
  const [joueurs, setJoueurs] = useState([]);

  const [creneau, setCreneau] = useState("");
  const [date, setDate] = useState("");

  const [presences, setPresences] = useState({});

  // =============================
  // SESSION AUTO (IMPORTANT)
  // =============================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // =============================
  // LOGIN
  // =============================
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erreur login");
      return;
    }

    if (!COACHS.includes(data.user.email)) {
      alert("Accès refusé");
      await supabase.auth.signOut();
      return;
    }

    setUser(data.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // =============================
  // LOAD CRENEAUX + DATES
  // =============================
  useEffect(() => {
    if (!user) return;

    fetch(`${API}/api/creneaux`)
      .then((r) => r.json())
      .then((data) => {
        console.log("CRENEAUX:", data);
        setCreneaux(
          data.sort((a, b) =>
            a.creneau_code.localeCompare(b.creneau_code)
          )
        );
      });

    fetch(`${API}/api/dates`)
      .then((r) => r.json())
      .then((data) => {
        console.log("DATES:", data);
        setDates(data);
      });
  }, [user]);

  // =============================
  // LOAD JOUEURS
  // =============================
  useEffect(() => {
    if (!creneau) {
      setJoueurs([]);
      return;
    }

    console.log("FETCH JOUEURS:", creneau);

    fetch(`${API}/api/joueurs?creneau=${encodeURIComponent(creneau)}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("JOUEURS:", data);
        setJoueurs(data);
      });
  }, [creneau]);

  // =============================
  // LOAD PRESENCES
  // =============================
  useEffect(() => {
    if (!creneau || !date) {
      setPresences({});
      return;
    }

    console.log("FETCH PRESENCES:", creneau, date);

    fetch(`${API}/api/presences?creneau=${creneau}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach((p) => {
          map[p.licence] = p.present;
        });
        setPresences(map);
      });
  }, [creneau, date]);

  // =============================
  // SAVE PRESENCE
  // =============================
  const setPresence = async (licence, present) => {
    if (!date) {
      alert("Choisir une date !");
      return;
    }

    await fetch(`${API}/api/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licence,
        creneau_code: creneau,
        date_seance: date,
        present,
      }),
    });

    setPresences((prev) => ({
      ...prev,
      [licence]: present,
    }));
  };

  // =============================
  // FILTRE DATES (jour du créneau)
  // =============================
  const getJour = () => {
    const c = creneaux.find((c) => c.creneau_code === creneau);
    return c?.jour;
  };

  const datesFiltrees = dates
    .filter((d) => {
      if (!creneau) return false;

      const jours = [
        "DIMANCHE",
        "LUNDI",
        "MARDI",
        "MERCREDI",
        "JEUDI",
        "VENDREDI",
        "SAMEDI",
      ];

      const dateObj = new Date(d.date_seance);
      return jours[dateObj.getDay()] === getJour();
    })
    .sort((a, b) => new Date(b.date_seance) - new Date(a.date_seance));

  // =============================
  // LOGIN SCREEN
  // =============================
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Connexion entraîneur</h2>

        <input
          placeholder="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="mot de passe"
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button onClick={handleLogin}>
          Se connecter
        </button>
      </div>
    );
  }

  // =============================
  // APP
  // =============================
  return (
    <div style={{ padding: 20 }}>
      <h1>🏸 Présences Badminton</h1>

      <button onClick={handleLogout}>Se déconnecter</button>

      <br /><br />

      {/* FILTRES */}
      <div style={{ display: "flex", gap: 10 }}>
        <select
          value={creneau}
          onChange={(e) => {
            console.log("SELECT CRENEAU:", e.target.value);
            setCreneau(e.target.value);
            setDate("");
          }}
        >
          <option value="">Choisir un créneau</option>

          {creneaux.map((c) => (
            <option key={c.creneau_code} value={c.creneau_code}>
              {c.creneau_code} — {c.jour} {c.horaire}
            </option>
          ))}
        </select>

        <select
          value={date}
          onChange={(e) => {
            console.log("SELECT DATE:", e.target.value);
            setDate(e.target.value);
          }}
        >
          <option value="">Choisir une date</option>

          {datesFiltrees.map((d) => {
            const iso = d.date_seance.split("T")[0];
            const dateObj = new Date(d.date_seance);

            return (
              <option key={iso} value={iso}>
                {dateObj.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </option>
            );
          })}
        </select>
      </div>

      {/* JOUEURS */}
      <h2 style={{ marginTop: 20 }}>👥 Joueurs</h2>

      {!creneau ? (
        <p>Choisir un créneau</p>
      ) : joueurs.length === 0 ? (
        <p>Aucun joueur trouvé</p>
      ) : (
        joueurs.map((j) => {
          const present = presences[j.licence];

          return (
            <div
              key={j.licence}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #ddd",
                padding: 5,
              }}
            >
              <span>
                {j.prenom} {j.nom}
              </span>

              <div>
                <button
                  onClick={() => setPresence(j.licence, true)}
                  style={{
                    background:
                      present === true ? "green" : "#ccc",
                    color: "white",
                    marginRight: 5,
                  }}
                >
                  Présent
                </button>

                <button
                  onClick={() => setPresence(j.licence, false)}
                  style={{
                    background:
                      present === false ? "red" : "#ccc",
                    color: "white",
                  }}
                >
                  Absent
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default App;