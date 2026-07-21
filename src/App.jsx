import React, { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "./firebaseClient";
import {
  Plus, X, Calendar, Clock, MapPin, Trophy, Users, BarChart3,
  ChevronRight, ArrowLeft, Trash2, Pencil, Settings, Check, Image as ImageIcon, Video, Filter,
  MessageCircle, Copy, LogIn, LogOut
} from "lucide-react";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const POSICOES = ["Goleiro","Zagueiro","Lateral","Volante","Meia","Atacante"];
const POSITION_GROUPS = [
  { label: "Goleiro", positions: ["Goleiro"] },
  { label: "Defesa", positions: ["Zagueiro", "Lateral"] },
  { label: "Meio-campo", positions: ["Volante", "Meia"] },
  { label: "Ataque", positions: ["Atacante"] },
];
const COMP_TYPES = {
  oficial:   { label: "Oficial",   varBg: "var(--turf-dim)",      varText: "var(--turf)" },
  amistoso:  { label: "Amistoso",  varBg: "var(--amistoso-dim)",  varText: "var(--amistoso)" },
  festival:  { label: "Festival",  varBg: "var(--festival-dim)",  varText: "var(--festival)" },
};
const ROLE_TO_POSITION = { GOL: "Goleiro", ZAG: "Zagueiro", LAT: "Lateral", VOL: "Volante", MEI: "Meia", ATA: "Atacante" };
const GOAL_TYPES = ["Gol de falta","Gol de pênalti","Gol olímpico","Assistência","Gol de rebote","Gol de voleio","Gol de bicicleta","Gol de fora da área","Gol de dentro da área"];

const FORMATIONS = {
  "4-4-2": [
    { id: "gk", role: "GOL", x: 50, y: 90 },
    { id: "ld", role: "LAT", x: 80, y: 66 }, { id: "zc1", role: "ZAG", x: 60, y: 69 },
    { id: "zc2", role: "ZAG", x: 40, y: 69 }, { id: "le", role: "LAT", x: 20, y: 66 },
    { id: "md", role: "MEI", x: 78, y: 40 }, { id: "mc1", role: "VOL", x: 58, y: 46 },
    { id: "mc2", role: "VOL", x: 42, y: 46 }, { id: "me", role: "MEI", x: 22, y: 40 },
    { id: "at1", role: "ATA", x: 38, y: 15 }, { id: "at2", role: "ATA", x: 62, y: 15 },
  ],
  "4-3-3": [
    { id: "gk", role: "GOL", x: 50, y: 90 },
    { id: "ld", role: "LAT", x: 80, y: 66 }, { id: "zc1", role: "ZAG", x: 60, y: 69 },
    { id: "zc2", role: "ZAG", x: 40, y: 69 }, { id: "le", role: "LAT", x: 20, y: 66 },
    { id: "mc1", role: "VOL", x: 50, y: 46 }, { id: "mc2", role: "MEI", x: 30, y: 40 }, { id: "mc3", role: "MEI", x: 70, y: 40 },
    { id: "fe", role: "ATA", x: 20, y: 16 }, { id: "fc", role: "ATA", x: 50, y: 12 }, { id: "fd", role: "ATA", x: 80, y: 16 },
  ],
  "4-2-3-1": [
    { id: "gk", role: "GOL", x: 50, y: 90 },
    { id: "ld", role: "LAT", x: 80, y: 66 }, { id: "zc1", role: "ZAG", x: 60, y: 69 },
    { id: "zc2", role: "ZAG", x: 40, y: 69 }, { id: "le", role: "LAT", x: 20, y: 66 },
    { id: "v1", role: "VOL", x: 38, y: 46 }, { id: "v2", role: "VOL", x: 62, y: 46 },
    { id: "me", role: "MEI", x: 20, y: 28 }, { id: "mc", role: "MEI", x: 50, y: 24 }, { id: "md", role: "MEI", x: 80, y: 28 },
    { id: "a1", role: "ATA", x: 50, y: 10 },
  ],
  "3-5-2": [
    { id: "gk", role: "GOL", x: 50, y: 90 },
    { id: "z1", role: "ZAG", x: 30, y: 69 }, { id: "z2", role: "ZAG", x: 50, y: 73 }, { id: "z3", role: "ZAG", x: 70, y: 69 },
    { id: "le", role: "LAT", x: 14, y: 44 }, { id: "mc1", role: "VOL", x: 34, y: 48 }, { id: "mc3", role: "MEI", x: 50, y: 40 },
    { id: "mc2", role: "VOL", x: 66, y: 48 }, { id: "ld", role: "LAT", x: 86, y: 44 },
    { id: "a1", role: "ATA", x: 38, y: 15 }, { id: "a2", role: "ATA", x: 62, y: 15 },
  ],
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  return y !== currentYear ? `${d} ${MESES[m - 1]} ${y}` : `${d} ${MESES[m - 1]}`;
}
function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
function formatBirthDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
function calculateAge(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age;
}
const FOOT_LABELS = { destro: "Destro", canhoto: "Canhoto", ambidestro: "Ambidestro" };
function getPositions(player) {
  if (player?.positions && player.positions.length) return player.positions;
  if (player?.position) return [player.position];
  return [];
}
function groupPlayersByPosition(players) {
  const sortByNumber = (a, b) => (a.number ?? 99) - (b.number ?? 99);
  const groups = POSITION_GROUPS.map((g) => ({
    label: g.label,
    players: players.filter((p) => g.positions.includes(getPositions(p)[0])).sort(sortByNumber),
  })).filter((g) => g.players.length > 0);
  const grouped = new Set(POSITION_GROUPS.flatMap((g) => g.positions));
  const others = players.filter((p) => !grouped.has(getPositions(p)[0])).sort(sortByNumber);
  if (others.length > 0) groups.push({ label: "Sem posição definida", players: others });
  return groups;
}
function formatPositions(player) {
  const pos = getPositions(player);
  if (pos.length === 0) return "Sem posição";
  if (pos.length === 1) return pos[0];
  return `${pos[0]} (${pos.slice(1).join(", ")})`;
}
function shortenName(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 10);
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

async function storageGet(key, shared) {
  try {
    const snap = await getDoc(doc(db, "appdata", key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) { console.error("Erro ao carregar", key, e); return null; }
}
async function storageSet(key, value, shared) {
  try { await setDoc(doc(db, "appdata", key), { value }); }
  catch (e) { console.error("Falha ao salvar", key, e); }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const isAdmin = !!user;
  const [config, setConfig] = useState({ name: "Meu Time", emoji: "⚽", cidade: "" });
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [venues, setVenues] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  const [tab, setTab] = useState("jogos");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [viewingOpponentId, setViewingOpponentId] = useState(null);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [jogosJumpFilter, setJogosJumpFilter] = useState({ type: "todos", competitionId: "todas" });
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showEditMatch, setShowEditMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [showLineup, setShowLineup] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(null);
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [showMatchStaff, setShowMatchStaff] = useState(false);
  const [showPenalties, setShowPenalties] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogin(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (e) {
      return `Erro ao entrar (${e.code || e.message || "desconhecido"})`;
    }
  }
  async function handleLogout() {
    await signOut(auth);
  }

  useEffect(() => {
    (async () => {
      const [c, p, m, o, comp, v, st] = await Promise.all([
        storageGet("team-config", true),
        storageGet("players", true),
        storageGet("matches", true),
        storageGet("opponents", true),
        storageGet("competitions", true),
        storageGet("venues", true),
        storageGet("staff", true),
      ]);
      if (c) { try { setConfig(JSON.parse(c)); } catch {} }
      if (p) { try { setPlayers(JSON.parse(p)); } catch {} }
      if (m) { try { setMatches(JSON.parse(m)); } catch {} }
      if (o) { try { setOpponents(JSON.parse(o)); } catch {} }
      if (comp) { try { setCompetitions(JSON.parse(comp)); } catch {} }
      if (v) { try { setVenues(JSON.parse(v)); } catch {} }
      if (st) { try { setStaffMembers(JSON.parse(st)); } catch {} }
      setLoading(false);
    })();
  }, []);

  const anyOverlayOpen = !!(
    selectedMatchId || viewingOpponentId || viewingPlayerId ||
    showAddMatch || showAddPlayer || showConfig || showScoreForm || showLineup ||
    showAddEvent || showAddMedia || showEditMatch || showMatchStaff || showPenalties || confirmDialog
  );
  const prevOverlayOpenRef = useRef(false);
  useEffect(() => {
    if (anyOverlayOpen && !prevOverlayOpenRef.current) {
      window.history.pushState({ vilaOlindaOverlay: true }, "");
    }
    prevOverlayOpenRef.current = anyOverlayOpen;
  });

  useEffect(() => {
    function handlePopState() {
      setSelectedMatchId(null);
      setViewingOpponentId(null);
      setViewingPlayerId(null);
      setShowAddMatch(false);
      setShowAddPlayer(null);
      setShowConfig(false);
      setShowScoreForm(false);
      setShowLineup(false);
      setShowAddEvent(false);
      setShowAddMedia(false);
      setShowEditMatch(false);
      setShowMatchStaff(false);
      setShowPenalties(false);
      setConfirmDialog(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function persistConfig(next) { setConfig(next); storageSet("team-config", JSON.stringify(next), true); }
  function persistPlayers(next) { setPlayers(next); storageSet("players", JSON.stringify(next), true); }
  function persistMatches(next) { setMatches(next); storageSet("matches", JSON.stringify(next), true); }
  function persistOpponents(next) { setOpponents(next); storageSet("opponents", JSON.stringify(next), true); }
  function persistCompetitions(next) { setCompetitions(next); storageSet("competitions", JSON.stringify(next), true); }
  function updateStandings(competitionId, standings) {
    persistCompetitions(competitions.map((c) => (c.id === competitionId ? { ...c, standings } : c)));
  }
  function persistVenues(next) { setVenues(next); storageSet("venues", JSON.stringify(next), true); }
  function persistStaffMembers(next) { setStaffMembers(next); storageSet("staff", JSON.stringify(next), true); }

  function createOpponent(name) {
    const item = { id: uid(), name };
    persistOpponents([...opponents, item]);
    return item.id;
  }
  function createCompetition(name, type) {
    const item = { id: uid(), name, type };
    persistCompetitions([...competitions, item]);
    return item.id;
  }
  function createVenue(name) {
    const item = { id: uid(), name };
    persistVenues([...venues, item]);
    return item.id;
  }
  function createStaffMember(name) {
    const item = { id: uid(), name };
    persistStaffMembers([...staffMembers, item]);
    return item.id;
  }
  function getStaffName(id) {
    return staffMembers.find((s) => s.id === id)?.name || null;
  }

  function getOpponentName(match) {
    if (match.opponentType === "avulso") return match.opponentName || "Adversário avulso";
    return opponents.find((o) => o.id === match.opponentId)?.name || match.opponent || "Adversário";
  }
  function getCompetitionInfo(match) {
    const c = competitions.find((c) => c.id === match.competitionId);
    if (c) return c;
    return { name: match.competitionName || "", type: match.competitionType || "amistoso" };
  }
  function getVenueName(match) {
    return venues.find((v) => v.id === match.venueId)?.name || match.venue || "";
  }

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  );

  const upcoming = useMemo(
    () => matches.filter((m) => m.status === "agendado" && matchTimestamp(m) >= Date.now()).sort((a, b) => matchTimestamp(a) - matchTimestamp(b)),
    [matches]
  );
  const pendingResult = useMemo(
    () => matches.filter((m) => m.status === "agendado" && matchTimestamp(m) < Date.now()).sort((a, b) => matchTimestamp(b) - matchTimestamp(a)),
    [matches]
  );
  const finished = useMemo(
    () => matches.filter((m) => m.status === "encerrado").sort((a, b) => matchTimestamp(b) - matchTimestamp(a)),
    [matches]
  );

  function playerById(id) { return players.find((p) => p.id === id); }

  function getPlayerStats(playerId) { return computePlayerStats(matches, playerId); }
  function getGoalkeeperStats(playerId) { return computeGoalkeeperStats(matches, playerId); }

  function deleteMatch(id) {
    setConfirmDialog({
      message: "Apagar esta partida? Essa ação não pode ser desfeita.",
      confirmLabel: "Apagar partida",
      onConfirm: () => {
        persistMatches(matches.filter((m) => m.id !== id));
        setSelectedMatchId(null);
        setConfirmDialog(null);
      },
    });
  }
  function deletePlayer(id) {
    setConfirmDialog({
      message: "Excluir este jogador apaga também o vínculo dele com partidas, escalações e estatísticas antigas — isso não pode ser desfeito. Se ele só saiu do time nesta temporada, prefira editar o jogador e desmarcar \"Faz parte do elenco atual\" em vez de excluir. Ainda assim quer excluir?",
      confirmLabel: "Excluir permanentemente",
      onConfirm: () => {
        persistPlayers(players.filter((p) => p.id !== id));
        setConfirmDialog(null);
      },
    });
  }

  function importAllData(data) {
    setConfirmDialog({
      message: "Importar esse arquivo substitui TODOS os dados atuais do time (jogadores, partidas, competições, adversários, campos e configurações) pelo conteúdo do backup. Essa ação não pode ser desfeita. Continuar?",
      confirmLabel: "Importar e substituir",
      onConfirm: () => {
        if (data.config) persistConfig(data.config);
        if (Array.isArray(data.players)) persistPlayers(data.players);
        if (Array.isArray(data.matches)) persistMatches(data.matches);
        if (Array.isArray(data.opponents)) persistOpponents(data.opponents);
        if (Array.isArray(data.competitions)) persistCompetitions(data.competitions);
        if (Array.isArray(data.venues)) persistVenues(data.venues);
        if (Array.isArray(data.staffMembers)) persistStaffMembers(data.staffMembers);
        setSelectedMatchId(null);
        setViewingOpponentId(null);
        setConfirmDialog(null);
        setShowConfig(false);
      },
    });
  }

  if (loading) {
    return (
      <div className="app-shell" style={S.appShell}>
        <StyleBlock />
        <div style={{ ...S.center, height: 480 }}>
          <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>Carregando dados do time…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={S.appShell}>
      <StyleBlock />
      <Header config={config} isAdmin={isAdmin} onOpenConfig={() => setShowConfig(true)} onOpenLogin={() => setShowLogin(true)} />
      <div style={S.content}>
        {viewingPlayerId ? (
          <PlayerProfile
            playerId={viewingPlayerId} players={players} matches={matches}
            getPlayerStats={getPlayerStats} getGoalkeeperStats={getGoalkeeperStats}
            getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName}
            onBack={() => setViewingPlayerId(null)}
            onOpenMatch={(id) => { setViewingPlayerId(null); setTab("jogos"); setViewingOpponentId(null); setSelectedMatchId(id); }}
          />
        ) : (
          <>
            {tab === "jogos" && !selectedMatch && !viewingOpponentId && (
              <JogosTab
                key={`${jogosJumpFilter.type}-${jogosJumpFilter.competitionId}`}
                isAdmin={isAdmin}
                upcoming={upcoming} pendingResult={pendingResult} finished={finished} opponents={opponents} competitions={competitions} players={players}
                getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName}
                onOpenMatch={(id) => setSelectedMatchId(id)} onAddMatch={() => setShowAddMatch(true)}
                initialFilterType={jogosJumpFilter.type} initialFilterCompetitionId={jogosJumpFilter.competitionId}
              />
            )}
            {tab === "jogos" && !selectedMatch && viewingOpponentId && (
              <OpponentHistory
                opponentId={viewingOpponentId} opponents={opponents} matches={matches}
                getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName}
                onBack={() => setViewingOpponentId(null)} onOpenMatch={(id) => setSelectedMatchId(id)}
              />
            )}
            {tab === "jogos" && selectedMatch && (
              <MatchDetail
                isAdmin={isAdmin}
                match={selectedMatch} config={config} playerById={playerById} players={players}
                getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName}
                getStaffName={getStaffName}
                onBack={() => setSelectedMatchId(null)} onDelete={() => deleteMatch(selectedMatch.id)}
                onRegisterScore={() => setShowScoreForm(true)} onEditLineup={() => setShowLineup(true)}
                onAddEvent={() => setShowAddEvent("new")} onEditEvent={(ev) => setShowAddEvent(ev)} onAddMedia={() => setShowAddMedia(true)}
                onEditMatch={() => setShowEditMatch(true)} onEditStaff={() => setShowMatchStaff(true)}
                onEditPenalties={() => setShowPenalties(true)}
                onOpenPlayer={(id) => setViewingPlayerId(id)}
                onOpenOpponent={(match) => {
                  let oid = match.opponentId;
                  if (!oid) {
                    const name = getOpponentName(match);
                    const existing = opponents.find((o) => o.name === name);
                    oid = existing ? existing.id : createOpponent(name);
                    persistMatches(matches.map((m) => (m.id === match.id ? { ...m, opponentId: oid } : m)));
                  }
                  setViewingOpponentId(oid);
                  setSelectedMatchId(null);
                }}
                onOpenCompetition={(match) => {
                  const info = getCompetitionInfo(match);
                  setJogosJumpFilter({ type: info.type || "todos", competitionId: match.competitionId || "todas" });
                  setSelectedMatchId(null);
                  setViewingOpponentId(null);
                }}
                onRemoveEvent={(eventId) => persistMatches(matches.map((m) => m.id === selectedMatch.id ? { ...m, events: m.events.filter((e) => e.id !== eventId) } : m))}
                onRemoveMedia={(mediaId) => persistMatches(matches.map((m) => m.id === selectedMatch.id ? { ...m, media: (m.media || []).filter((x) => x.id !== mediaId) } : m))}
              />
            )}
            {tab === "elenco" && (
              <ElencoTab isAdmin={isAdmin} players={players} config={config} getPlayerStats={getPlayerStats} getGoalkeeperStats={getGoalkeeperStats} onAdd={() => setShowAddPlayer("new")} onEdit={(p) => setShowAddPlayer(p)} onDelete={deletePlayer} onOpenConfig={() => setShowConfig(true)} onOpenPlayer={(id) => setViewingPlayerId(id)} />
            )}
            {tab === "stats" && (
              <StatsTab isAdmin={isAdmin} matches={matches} players={players} competitions={competitions} getCompetitionInfo={getCompetitionInfo} config={config} onUpdateStandings={updateStandings} onOpenPlayer={(id) => setViewingPlayerId(id)} />
            )}
          </>
        )}
      </div>
      <BottomNav tab={tab} onChange={(t) => { setTab(t); setSelectedMatchId(null); setViewingOpponentId(null); setViewingPlayerId(null); }} />

      {isAdmin && showConfig && (
        <ConfigModal
          config={config} players={players} matches={matches} opponents={opponents} competitions={competitions} venues={venues} staffMembers={staffMembers}
          onClose={() => setShowConfig(false)} onSave={(next) => { persistConfig(next); setShowConfig(false); }}
          onImport={importAllData} onLogout={handleLogout}
        />
      )}

      {isAdmin && showAddMatch && (
        <AddMatchModal
          opponents={opponents} competitions={competitions} venues={venues}
          onCreateOpponent={createOpponent} onCreateCompetition={createCompetition} onCreateVenue={createVenue}
          onClose={() => setShowAddMatch(false)}
          onSave={(match) => { persistMatches([...matches, match]); setShowAddMatch(false); }}
        />
      )}

      {isAdmin && showEditMatch && selectedMatch && (
        <EditMatchModal
          match={selectedMatch} opponents={opponents} competitions={competitions} venues={venues}
          onCreateOpponent={createOpponent} onCreateCompetition={createCompetition} onCreateVenue={createVenue}
          onClose={() => setShowEditMatch(false)}
          onSave={(updated) => { persistMatches(matches.map((m) => (m.id === updated.id ? updated : m))); setShowEditMatch(false); }}
        />
      )}

      {isAdmin && showMatchStaff && selectedMatch && (
        <MatchStaffModal
          match={selectedMatch} staffMembers={staffMembers} onCreateStaff={createStaffMember}
          onClose={() => setShowMatchStaff(false)}
          onSave={(tecnicoId, auxiliarTecnicoId) => {
            persistMatches(matches.map((m) => (m.id === selectedMatch.id ? { ...m, tecnicoId, auxiliarTecnicoId } : m)));
            setShowMatchStaff(false);
          }}
        />
      )}

      {isAdmin && showPenalties && selectedMatch && (
        <PenaltyShootoutModal
          match={selectedMatch} players={players}
          onClose={() => setShowPenalties(false)}
          onSave={(penaltyShootout) => {
            persistMatches(matches.map((m) => (m.id === selectedMatch.id ? { ...m, penaltyShootout } : m)));
            setShowPenalties(false);
          }}
        />
      )}

      {isAdmin && showAddPlayer && (
        <AddPlayerModal
          player={showAddPlayer === "new" ? null : showAddPlayer}
          onClose={() => setShowAddPlayer(null)}
          onSave={(player) => {
            if (showAddPlayer === "new") persistPlayers([...players, player]);
            else persistPlayers(players.map((p) => (p.id === player.id ? player : p)));
            setShowAddPlayer(null);
          }}
        />
      )}

      {isAdmin && showScoreForm && selectedMatch && (
        <ScoreModal
          match={selectedMatch} getOpponentName={getOpponentName}
          onClose={() => setShowScoreForm(false)}
          onSave={(scoreTeam, scoreOpponent) => {
            persistMatches(matches.map((m) => m.id === selectedMatch.id ? { ...m, scoreTeam, scoreOpponent, status: "encerrado" } : m));
            setShowScoreForm(false);
          }}
        />
      )}

      {isAdmin && showLineup && selectedMatch && (
        <EscalacaoModal
          match={selectedMatch} players={players}
          onClose={() => setShowLineup(false)}
          onSave={(lineup) => { persistMatches(matches.map((m) => m.id === selectedMatch.id ? { ...m, lineup } : m)); setShowLineup(false); }}
        />
      )}

      {isAdmin && showAddEvent && selectedMatch && (
        <AddEventModal
          match={selectedMatch} players={players}
          event={showAddEvent === "new" ? null : showAddEvent}
          onClose={() => setShowAddEvent(null)}
          onSave={(event) => {
            const isEdit = showAddEvent !== "new";
            persistMatches(matches.map((m) => m.id === selectedMatch.id
              ? { ...m, events: isEdit ? m.events.map((e) => (e.id === event.id ? event : e)) : [...(m.events || []), event] }
              : m));
            setShowAddEvent(null);
          }}
        />
      )}

      {isAdmin && showAddMedia && selectedMatch && (
        <AddMediaModal
          players={players}
          onClose={() => setShowAddMedia(false)}
          onSave={(media) => { persistMatches(matches.map((m) => m.id === selectedMatch.id ? { ...m, media: [...(m.media || []), media] } : m)); setShowAddMedia(false); }}
        />
      )}

      {confirmDialog && (
        <ConfirmModal
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLogin={handleLogin} />
      )}
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ config, isAdmin, onOpenConfig, onOpenLogin }) {
  return (
    <div style={S.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={S.headerEmoji}>{config.emoji || "⚽"}</div>
        <div>
          <div style={S.headerTitle}>{config.name || "Meu Time"}</div>
          {config.cidade ? <div style={S.headerSub}>{config.cidade}</div> : null}
        </div>
      </div>
      {isAdmin ? (
        <button style={S.iconBtn} onClick={onOpenConfig} aria-label="Configurações"><Settings size={19} color="var(--text-dim)" /></button>
      ) : (
        <button style={S.iconBtn} onClick={onOpenLogin} aria-label="Entrar"><LogIn size={19} color="var(--text-dim)" /></button>
      )}
    </div>
  );
}

/* ---------- Jogos Tab ---------- */
function JogosTab({ isAdmin, upcoming, pendingResult, finished, opponents, competitions, players, getOpponentName, getCompetitionInfo, getVenueName, onOpenMatch, onAddMatch, initialFilterType, initialFilterCompetitionId }) {
  const [filterType, setFilterType] = useState(initialFilterType || "todos");
  const [showPending, setShowPending] = useState(false);
  const [filterOpponentId, setFilterOpponentId] = useState("todos");
  const [filterCompetitionId, setFilterCompetitionId] = useState(initialFilterCompetitionId || "todas");
  const [filterPlayerId, setFilterPlayerId] = useState("todos");
  const [filterPlayerName, setFilterPlayerName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  function matchHasPlayer(m, playerId) {
    const slotIds = Object.values(m.lineup?.slots || {});
    const benchIds = m.lineup?.bench || [];
    return slotIds.includes(playerId) || benchIds.includes(playerId);
  }

  const matchesFilter = (m) => {
    if (filterType !== "todos" && getCompetitionInfo(m).type !== filterType) return false;
    if (filterOpponentId !== "todos" && m.opponentId !== filterOpponentId) return false;
    if (filterCompetitionId !== "todas" && m.competitionId !== filterCompetitionId) return false;
    if (filterPlayerId !== "todos" && !matchHasPlayer(m, filterPlayerId)) return false;
    return true;
  };
  const filteredUpcoming = upcoming.filter(matchesFilter);
  const filteredPending = pendingResult.filter(matchesFilter);
  const filteredFinished = finished.filter(matchesFilter);

  const h2h = useMemo(() => {
    if (filterOpponentId === "todos") return null;
    const vs = finished.filter((m) => m.opponentId === filterOpponentId);
    return computeHeadToHead(vs);
  }, [filterOpponentId, finished]);

  const sortedOpponents = [...opponents].sort((a, b) => a.name.localeCompare(b.name));
  const byType = {
    oficial: competitions.filter((c) => c.type === "oficial"),
    amistoso: competitions.filter((c) => c.type === "amistoso"),
    festival: competitions.filter((c) => c.type === "festival"),
  };

  const searchQuery = searchText.trim().toLowerCase();
  const matchingPlayers = searchQuery ? players.filter((p) => p.name.toLowerCase().includes(searchQuery)).slice(0, 5) : [];
  const matchingOpponents = searchQuery ? opponents.filter((o) => o.name.toLowerCase().includes(searchQuery)).slice(0, 5) : [];
  const matchingCompetitions = searchQuery ? competitions.filter((c) => c.name.toLowerCase().includes(searchQuery)).slice(0, 5) : [];
  const hasSuggestions = matchingPlayers.length > 0 || matchingOpponents.length > 0 || matchingCompetitions.length > 0;

  function clearPlayerFilter() {
    setFilterPlayerId("todos");
    setFilterPlayerName("");
    setSearchText("");
  }

  return (
    <div>
      <div style={{ position: "relative", marginTop: 10 }}>
        <input
          style={S.searchInput}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          placeholder="Buscar por jogador, adversário ou liga…"
        />
        {searchOpen && searchQuery && (
          <div style={S.searchDropdown}>
            {!hasSuggestions ? (
              <div style={{ ...S.dimText, padding: "10px 12px" }}>Nada encontrado.</div>
            ) : (
              <>
                {matchingPlayers.length > 0 && (
                  <>
                    <div style={S.searchGroupLabel}>Jogadores</div>
                    {matchingPlayers.map((p) => (
                      <button key={p.id} style={S.searchOption} onMouseDown={() => { setFilterPlayerId(p.id); setFilterPlayerName(p.name); setSearchText(p.name); setSearchOpen(false); }}>
                        <JerseyBadge number={p.number} size={22} /> {p.name}
                      </button>
                    ))}
                  </>
                )}
                {matchingOpponents.length > 0 && (
                  <>
                    <div style={S.searchGroupLabel}>Adversários</div>
                    {matchingOpponents.map((o) => (
                      <button key={o.id} style={S.searchOption} onMouseDown={() => { setFilterOpponentId(o.id); setSearchText(o.name); setSearchOpen(false); }}>
                        {o.name}
                      </button>
                    ))}
                  </>
                )}
                {matchingCompetitions.length > 0 && (
                  <>
                    <div style={S.searchGroupLabel}>Competições</div>
                    {matchingCompetitions.map((c) => (
                      <button key={c.id} style={S.searchOption} onMouseDown={() => { setFilterCompetitionId(c.id); setSearchText(c.name); setSearchOpen(false); }}>
                        {c.name}
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {filterPlayerId !== "todos" && (
        <div style={S.playerFilterChip}>
          <span>Jogador: {filterPlayerName}</span>
          <button style={S.smallIconBtn} onClick={clearPlayerFilter} aria-label="Limpar filtro de jogador"><X size={13} color="var(--text-dim)" /></button>
        </div>
      )}

      <div style={S.filterRow}>
        <select style={S.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="oficial">Oficial</option>
          <option value="amistoso">Amistoso</option>
          <option value="festival">Festival</option>
        </select>
        <select style={S.filterSelect} value={filterOpponentId} onChange={(e) => setFilterOpponentId(e.target.value)}>
          <option value="todos">Todos os times</option>
          {sortedOpponents.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div style={S.filterRow}>
        <select style={{ ...S.filterSelect, flex: 1 }} value={filterCompetitionId} onChange={(e) => setFilterCompetitionId(e.target.value)}>
          <option value="todas">Todas as competições</option>
          {byType.oficial.length > 0 && <optgroup label="Oficial">{byType.oficial.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
          {byType.amistoso.length > 0 && <optgroup label="Amistoso">{byType.amistoso.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
          {byType.festival.length > 0 && <optgroup label="Festival">{byType.festival.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
        </select>
      </div>

      {h2h && (
        <div style={S.h2hCard}>
          <div style={S.h2hTitle}>Histórico de confronto</div>
          <div style={S.recordGrid}>
            <RecordCell label="Jogos" value={h2h.jogos} />
            <RecordCell label="Vitórias" value={h2h.v} accent="var(--turf)" />
            <RecordCell label="Empates" value={h2h.e} accent="var(--amber)" />
            <RecordCell label="Derrotas" value={h2h.d} accent="var(--danger)" />
          </div>
          <div style={{ ...S.dimText, marginTop: 8, textAlign: "center" }}>Gols: {h2h.gp} pró · {h2h.gc} contra</div>
        </div>
      )}

      <SectionHeader title="Próximos jogos" />
      {filteredUpcoming.length === 0 ? (
        <EmptyState text="Nenhum jogo agendado com esse filtro." />
      ) : filteredUpcoming.map((m) => (
        <MatchCard key={m.id} match={m} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName} onClick={() => onOpenMatch(m.id)} />
      ))}

      {pendingResult.length > 0 && (
        <div style={S.positionGroup}>
          <button style={S.inactiveToggle} onClick={() => setShowPending(!showPending)}>
            {showPending ? "▾" : "▸"} Aguardando resultado ({pendingResult.length})
          </button>
          {showPending && (
            filteredPending.length === 0 ? (
              <div style={{ marginTop: 10 }}><EmptyState text="Nenhum jogo pendente com esse filtro." /></div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <p style={S.helpText}>Já aconteceram, mas ainda não têm placar lançado.</p>
                {filteredPending.map((m) => (
                  <MatchCard key={m.id} match={m} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName} onClick={() => onOpenMatch(m.id)} />
                ))}
              </div>
            )
          )}
        </div>
      )}

      <SectionHeader title="Resultados" />
      {filteredFinished.length === 0 ? (
        <EmptyState text="Nenhum resultado encontrado com esse filtro." />
      ) : filteredFinished.map((m) => (
        <MatchCard key={m.id} match={m} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName} onClick={() => onOpenMatch(m.id)} />
      ))}

      {isAdmin && <FloatingAddButton onClick={onAddMatch} label="Nova partida" />}
    </div>
  );
}

function computePlayerStats(matches, playerId) {
  let goals = 0, assists = 0, jogos = 0, amarelos = 0, vermelhos = 0, golsFalta = 0, penaltisDefendidos = 0;
  matches.forEach((m) => {
    const slotIds = Object.values(m.lineup?.slots || {});
    const benchIds = m.lineup?.bench || [];
    const events = m.events || [];
    const enteredFromBench = events.some((e) => e.type === "substituicao" && e.playerInId === playerId);
    if (slotIds.includes(playerId) || (benchIds.includes(playerId) && enteredFromBench)) jogos++;
    events.forEach((e) => {
      if (e.type === "gol" && e.playerId === playerId) goals++;
      if (e.type === "gol" && e.assistId === playerId) assists++;
      if (e.type === "gol" && e.playerId === playerId && e.golType === "Gol de falta") golsFalta++;
      if (e.type === "amarelo" && e.playerId === playerId) amarelos++;
      if (e.type === "vermelho" && e.playerId === playerId) vermelhos++;
      if (e.type === "penaltidefendido" && e.playerId === playerId) penaltisDefendidos++;
    });
  });
  return { goals, assists, jogos, amarelos, vermelhos, golsFalta, penaltisDefendidos };
}

function computeGoalkeeperStats(matches, playerId) {
  let jogos = 0, golsSofridos = 0, jogosSemSofrerGol = 0;
  matches.forEach((m) => {
    if (m.status !== "encerrado") return;
    if (m.lineup?.slots?.gk !== playerId) return;
    jogos++;
    golsSofridos += m.scoreOpponent ?? 0;
    if ((m.scoreOpponent ?? 0) === 0) jogosSemSofrerGol++;
  });
  return { jogos, golsSofridos, jogosSemSofrerGol };
}

function buildShareText(match, config, playerById, getOpponentName, getCompetitionInfo, getVenueName) {
  const compInfo = getCompetitionInfo(match);
  const oppName = getOpponentName(match);
  const venueName = getVenueName(match);
  const teamName = config.name || "Nosso Time";
  const lines = [];

  if (match.status === "encerrado") {
    lines.push(`${config.emoji || "⚽"} *${teamName.toUpperCase()} ${match.scoreTeam} x ${match.scoreOpponent} ${oppName.toUpperCase()}* ${config.emoji || "⚽"}`);
    lines.push("");
    if (compInfo.name) lines.push(`🏆 ${compInfo.name}`);
    lines.push(`📅 ${formatDateLong(match.date)} · ${match.time}`);
    if (venueName) lines.push(`📍 ${venueName}`);

    const events = match.events || [];
    const timeLabel = (e) => e.minute != null ? `${e.minute}'` : (e.period === "1" ? "1ºT" : e.period === "2" ? "2ºT" : "");
    const goalEvents = events.filter((e) => e.type === "gol" || e.type === "golcontra" || e.type === "gol_adversario").sort((a, b) => eventSortValue(a) - eventSortValue(b));
    const runningScores = computeRunningScores(goalEvents);
    if (goalEvents.length) {
      lines.push("");
      lines.push("🥅 *Gols:*");
      goalEvents.forEach((e) => {
        const s = runningScores[e.id];
        const scoreTag = s ? ` (${s.our}-${s.their})` : "";
        if (e.type === "gol") {
          const scorer = playerById(e.playerId);
          const assist = e.assistId ? playerById(e.assistId) : null;
          let line = `⚽ ${timeLabel(e)} ${scorer ? scorer.name : "Jogador removido"}${scoreTag}`;
          if (e.golType) line += ` (${e.golType})`;
          if (assist) line += ` — assist. ${assist.name}`;
          lines.push(line);
        } else if (e.type === "golcontra") {
          lines.push(`⚽ ${timeLabel(e)} Gol contra do adversário${scoreTag}${e.note ? ` (${e.note})` : ""}`);
        } else if (e.type === "gol_adversario") {
          lines.push(`⚽ ${timeLabel(e)} Gol do adversário${scoreTag}${e.golType ? ` (${e.golType})` : ""}${e.note ? ` — ${e.note}` : ""}`);
        }
      });
    }

    const amarelos = events.filter((e) => e.type === "amarelo").sort((a, b) => eventSortValue(a) - eventSortValue(b));
    const vermelhos = events.filter((e) => e.type === "vermelho").sort((a, b) => eventSortValue(a) - eventSortValue(b));
    if (amarelos.length || vermelhos.length) {
      lines.push("");
      lines.push("🟨🟥 *Cartões:*");
      amarelos.forEach((e) => { const p = playerById(e.playerId); lines.push(`🟨 ${timeLabel(e)} ${p ? p.name : "Jogador removido"}`); });
      vermelhos.forEach((e) => { const p = playerById(e.playerId); lines.push(`🟥 ${timeLabel(e)} ${p ? p.name : "Jogador removido"}`); });
    }

    const subs = events.filter((e) => e.type === "substituicao").sort((a, b) => eventSortValue(a) - eventSortValue(b));
    if (subs.length) {
      lines.push("");
      lines.push("🔄 *Substituições:*");
      subs.forEach((e) => {
        const pin = playerById(e.playerInId);
        const pout = playerById(e.playerOutId);
        lines.push(`🔄 ${timeLabel(e)} Saiu ${pout ? pout.name : "?"} ➡️ Entrou ${pin ? pin.name : "?"}`);
      });
    }

    const penaltis = events.filter((e) => e.type === "penaltidefendido").sort((a, b) => eventSortValue(a) - eventSortValue(b));
    if (penaltis.length) {
      lines.push("");
      penaltis.forEach((e) => { const p = playerById(e.playerId); lines.push(`🧤 ${timeLabel(e)} Pênalti defendido por ${p ? p.name : "?"}`); });
    }

    if (match.lineup?.captainId) {
      const cap = playerById(match.lineup.captainId);
      if (cap) { lines.push(""); lines.push(`👑 Capitão: ${cap.name}`); }
    }
  } else {
    lines.push("📣 *PARTIDA MARCADA!* 📣");
    lines.push("");
    lines.push(`${config.emoji || "⚽"} *${teamName}* vs *${oppName}*`);
    if (compInfo.name) lines.push(`🏆 ${compInfo.name}`);
    lines.push(`📅 ${formatDateLong(match.date)} · ${match.time}`);
    if (venueName) lines.push(`📍 ${venueName}`);
    lines.push("");
    lines.push("Bora com tudo! 🔥");
  }

  lines.push("");
  lines.push(`_Gerado pelo app do ${teamName}_`);
  return lines.join("\n");
}

function eventSortValue(e) {
  const periodRank = e?.period === "2" ? 1 : 0;
  const minuteRank = e?.minute == null ? 9999 : e.minute;
  return periodRank * 10000 + minuteRank;
}

function computeRunningScores(sortedEvents) {
  let our = 0, their = 0;
  const map = {};
  sortedEvents.forEach((e) => {
    if (e.type === "gol" || e.type === "golcontra") our++;
    if (e.type === "gol_adversario") their++;
    if (e.type === "gol" || e.type === "golcontra" || e.type === "gol_adversario") {
      map[e.id] = { our, their };
    }
  });
  return map;
}

function matchTimestamp(m) {
  const dateStr = m?.date || "1970-01-01";
  const timeStr = m?.time || "00:00";
  const dateParts = dateStr.split("-").map(Number);
  const timeParts = timeStr.split(":").map(Number);
  const y = dateParts[0] || 1970, mo = dateParts[1] || 1, d = dateParts[2] || 1;
  const hh = timeParts[0] || 0, mi = timeParts[1] || 0;
  const t = new Date(y, mo - 1, d, hh, mi).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function computeHeadToHead(finishedMatches) {
  let v = 0, e = 0, d = 0, gp = 0, gc = 0;
  finishedMatches.forEach((m) => {
    gp += m.scoreTeam ?? 0; gc += m.scoreOpponent ?? 0;
    if (m.scoreTeam > m.scoreOpponent) v++; else if (m.scoreTeam === m.scoreOpponent) e++; else d++;
  });
  return { jogos: finishedMatches.length, v, e, d, gp, gc };
}

function OpponentHistory({ opponentId, opponents, matches, getOpponentName, getCompetitionInfo, getVenueName, onBack, onOpenMatch }) {
  const opponentName = opponents.find((o) => o.id === opponentId)?.name || "Adversário";
  const vsMatches = matches.filter((m) => m.opponentId === opponentId);
  const finishedVs = vsMatches.filter((m) => m.status === "encerrado").sort((a, b) => matchTimestamp(b) - matchTimestamp(a));
  const upcomingVs = vsMatches.filter((m) => m.status === "agendado").sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
  const record = computeHeadToHead(finishedVs);

  return (
    <div>
      <div style={S.detailTopBar}>
        <button style={S.iconBtn} onClick={onBack}><ArrowLeft size={20} color="var(--text)" /></button>
      </div>

      <div style={S.scoreboard}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, marginBottom: 12 }}>{opponentName}</div>
        <div style={S.recordGrid}>
          <RecordCell label="Jogos" value={record.jogos} />
          <RecordCell label="Vitórias" value={record.v} accent="var(--turf)" />
          <RecordCell label="Empates" value={record.e} accent="var(--amber)" />
          <RecordCell label="Derrotas" value={record.d} accent="var(--danger)" />
        </div>
        <div style={{ ...S.dimText, marginTop: 10 }}>Gols: {record.gp} pró · {record.gc} contra</div>
      </div>

      {upcomingVs.length > 0 && (
        <>
          <SectionHeader title="Próximos confrontos" />
          {upcomingVs.map((m) => (
            <MatchCard key={m.id} match={m} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName} onClick={() => onOpenMatch(m.id)} />
          ))}
        </>
      )}

      <SectionHeader title="Histórico de confrontos" />
      {finishedVs.length === 0 ? (
        <EmptyState text="Vocês ainda não jogaram contra esse adversário." />
      ) : finishedVs.map((m) => (
        <MatchCard key={m.id} match={m} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} getVenueName={getVenueName} onClick={() => onOpenMatch(m.id)} />
      ))}
    </div>
  );
}

/* ---------- Match Card ---------- */
function MatchCard({ match, getOpponentName, getCompetitionInfo, getVenueName, onClick }) {
  const compInfo = getCompetitionInfo(match);
  const comp = COMP_TYPES[compInfo.type] || COMP_TYPES.amistoso;
  const isFinished = match.status === "encerrado";
  const venueName = getVenueName(match);
  const pens = match.penaltyShootout;
  const ourPens = pens ? pens.ourKicks.filter((k) => k.scored).length : null;
  const theirPens = pens ? pens.opponentKicks.filter((k) => k.result === "gol").length : null;
  return (
    <button style={S.matchCard} onClick={onClick}>
      <div style={S.matchCardTop}>
        <span style={{ ...S.pill, background: comp.varBg, color: comp.varText }}>{comp.label}{compInfo.name ? ` · ${compInfo.name}` : ""}</span>
        <span style={S.matchCardDate}>{formatDateShort(match.date)} · {match.time}</span>
      </div>
      <div style={S.matchCardMain}>
        <div style={S.matchCardTeam}>{getOpponentName(match)}</div>
        {isFinished ? (
          <div style={{ textAlign: "right" }}>
            <div style={S.scoreDigits}>{match.scoreTeam}<span style={S.scoreDash}>–</span>{match.scoreOpponent}</div>
            {pens && <div style={S.penaltyCardNote}>pên. {ourPens}–{theirPens}</div>}
          </div>
        ) : <div style={S.matchCardVs}>vs</div>}
      </div>
      <div style={S.matchCardBottom}>
        <MapPin size={12} color="var(--text-dim)" />
        <span>{venueName || (match.homeAway === "casa" ? "Em casa" : match.homeAway === "fora" ? "Fora" : "Local a definir")}</span>
        <ChevronRight size={16} color="var(--text-dim)" style={{ marginLeft: "auto" }} />
      </div>
    </button>
  );
}

function PlayerMatchCard({ match, playerId, getOpponentName, getCompetitionInfo, getVenueName, onClick }) {
  const compInfo = getCompetitionInfo(match);
  const comp = COMP_TYPES[compInfo.type] || COMP_TYPES.amistoso;
  const isFinished = match.status === "encerrado";
  const venueName = getVenueName(match);
  const badges = getPlayerBadges(playerId, match.events || []);
  const pens = match.penaltyShootout;
  const ourPens = pens ? pens.ourKicks.filter((k) => k.scored).length : null;
  const theirPens = pens ? pens.opponentKicks.filter((k) => k.result === "gol").length : null;
  return (
    <button style={S.matchCard} onClick={onClick}>
      <div style={S.matchCardTop}>
        <span style={{ ...S.pill, background: comp.varBg, color: comp.varText }}>{comp.label}{compInfo.name ? ` · ${compInfo.name}` : ""}</span>
        <span style={S.matchCardDate}>{formatDateShort(match.date)} · {match.time}</span>
      </div>
      <div style={S.matchCardMain}>
        <div style={S.matchCardTeam}>{getOpponentName(match)}</div>
        {isFinished ? (
          <div style={{ textAlign: "right" }}>
            <div style={S.scoreDigits}>{match.scoreTeam}<span style={S.scoreDash}>–</span>{match.scoreOpponent}</div>
            {pens && <div style={S.penaltyCardNote}>pên. {ourPens}–{theirPens}</div>}
          </div>
        ) : <div style={S.matchCardVs}>vs</div>}
      </div>
      {badges && <div style={{ fontSize: 15, marginTop: 6 }}>{badges}</div>}
      <div style={S.matchCardBottom}>
        <MapPin size={12} color="var(--text-dim)" />
        <span>{venueName || (match.homeAway === "casa" ? "Em casa" : match.homeAway === "fora" ? "Fora" : "Local a definir")}</span>
        <ChevronRight size={16} color="var(--text-dim)" style={{ marginLeft: "auto" }} />
      </div>
    </button>
  );
}

function PlayerProfile({ playerId, players, matches, getPlayerStats, getGoalkeeperStats, getOpponentName, getCompetitionInfo, getVenueName, onBack, onOpenMatch }) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return <EmptyState text="Jogador não encontrado." />;

  const [profileTab, setProfileTab] = useState("partidas");
  const isGoalkeeper = getPositions(player)[0] === "Goleiro";
  const stats = isGoalkeeper ? getGoalkeeperStats(playerId) : getPlayerStats(playerId);

  const playerMatches = matches.filter((m) => {
    const slotIds = Object.values(m.lineup?.slots || {});
    const benchIds = m.lineup?.bench || [];
    return slotIds.includes(playerId) || benchIds.includes(playerId);
  }).sort((a, b) => matchTimestamp(b) - matchTimestamp(a));

  function didPlayerPlay(m) {
    const slotIds = Object.values(m.lineup?.slots || {});
    if (slotIds.includes(playerId)) return true;
    return (m.events || []).some((e) => e.type === "substituicao" && e.playerInId === playerId);
  }

  const taggedPhotos = [];
  matches.forEach((m) => {
    (m.media || []).forEach((item) => {
      if (item.type === "foto" && (item.taggedPlayerIds || []).includes(playerId)) {
        taggedPhotos.push({ ...item, matchId: m.id, matchLabel: `${getOpponentName(m)} · ${formatDateShort(m.date)}` });
      }
    });
  });

  return (
    <div>
      <div style={S.detailTopBar}>
        <button style={S.iconBtn} onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} color="var(--text)" /></button>
      </div>

      <div style={S.scoreboard}>
        <PlayerAvatar player={player} size={64} />
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, marginTop: 10, textAlign: "center" }}>{player.name}</div>
        <div style={S.dimText}>{formatPositions(player)}{player.ativo === false ? " · fora do elenco atual" : ""}</div>
        <div style={{ ...S.recordGrid, marginTop: 16, gridTemplateColumns: isGoalkeeper ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
          {isGoalkeeper ? (
            <>
              <RecordCell label="Jogos" value={stats.jogos} />
              <RecordCell label="Jogo zero" value={stats.jogosSemSofrerGol} accent="var(--turf)" />
            </>
          ) : (
            <>
              <RecordCell label="Jogos" value={stats.jogos} />
              <RecordCell label="Gols" value={stats.goals} accent="var(--turf)" />
              <RecordCell label="Assist." value={stats.assists} />
            </>
          )}
        </div>
      </div>

      {(player.fullName || player.birthDate || player.preferredFoot || player.resident != null) && (
        <div style={{ ...S.card, marginTop: 12 }}>
          {player.fullName && (
            <div style={S.infoRow}><span style={S.dimText}>Nome completo</span><span>{player.fullName}</span></div>
          )}
          {player.birthDate && (
            <div style={S.infoRow}><span style={S.dimText}>Nascimento</span><span>{formatBirthDate(player.birthDate)} ({calculateAge(player.birthDate)} anos)</span></div>
          )}
          {player.preferredFoot && (
            <div style={S.infoRow}><span style={S.dimText}>Pé preferido</span><span>{FOOT_LABELS[player.preferredFoot] || player.preferredFoot}</span></div>
          )}
          {player.resident != null && (
            <div style={S.infoRow}><span style={S.dimText}>Residente no município</span><span>{player.resident ? "Sim" : "Não"}</span></div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, marginBottom: 14 }}>
        <button style={{ ...S.segmentBtn, ...(profileTab === "partidas" ? S.segmentBtnActive : {}) }} onClick={() => setProfileTab("partidas")}>
          Partidas
        </button>
        <button style={{ ...S.segmentBtn, ...(profileTab === "midia" ? S.segmentBtnActive : {}) }} onClick={() => setProfileTab("midia")}>
          Mídia{taggedPhotos.length > 0 ? ` (${taggedPhotos.length})` : ""}
        </button>
      </div>

      {profileTab === "partidas" ? (
        <>
          {playerMatches.length === 0 ? (
            <EmptyState text="Esse jogador ainda não participou de nenhuma partida registrada." />
          ) : (
            <div style={S.card}>
              {playerMatches.map((m) => (
                <PlayerCompactMatchRow key={m.id} match={m} playerId={playerId} didPlay={didPlayerPlay(m)} getOpponentName={getOpponentName} getCompetitionInfo={getCompetitionInfo} onClick={() => onOpenMatch(m.id)} />
              ))}
            </div>
          )}
          {playerMatches.length > 0 && (
            <div style={S.legendBox}>
              <span><b>O</b> oficial</span><span><b>A</b> amistoso</span><span><b>F</b> festival</span>
              <span>⚽ gol</span><span>🅰️ assistência</span><span>🟨 amarelo</span><span>🟥 vermelho</span><span>🔄 substituição</span><span>🧤 defesa de pênalti</span>
            </div>
          )}
        </>
      ) : (
        <>
          {taggedPhotos.length === 0 ? (
            <EmptyState text="Esse jogador ainda não foi marcado em nenhuma foto." />
          ) : (
            <div style={S.taggedPhotoGrid}>
              {taggedPhotos.map((item) => (
                <div key={item.id} style={{ ...S.taggedPhotoItem, cursor: "pointer" }} onClick={() => onOpenMatch(item.matchId)}>
                  <MediaImage url={item.url} sourceUrl={item.sourceUrl} disableLink />
                  <div style={S.taggedPhotoCaption}>{item.matchLabel}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayerCompactMatchRow({ match, playerId, didPlay, getOpponentName, getCompetitionInfo, onClick }) {
  const isFinished = match.status === "encerrado";
  const badges = getPlayerBadges(playerId, match.events || [], { excludeSub: true });
  const comp = COMP_TYPES[getCompetitionInfo(match).type] || COMP_TYPES.amistoso;
  return (
    <div style={{ ...S.playerMatchRow, opacity: didPlay ? 1 : 0.55 }} onClick={onClick}>
      <span style={{ ...S.compBadge, background: comp.varBg, color: comp.varText }}>{comp.label[0]}</span>
      <span style={S.playerMatchDate}>{formatDateShort(match.date)}</span>
      <span style={S.playerMatchOpponent}>{getOpponentName(match)}</span>
      {!didPlay && <span style={S.benchTag}>Banco</span>}
      {badges && <span style={{ fontSize: 13 }}>{badges}</span>}
      {isFinished ? (
        <span style={S.playerMatchScore}>{match.scoreTeam}-{match.scoreOpponent}{match.penaltyShootout ? <span style={S.playerMatchPen}> pên.</span> : ""}</span>
      ) : <span style={S.dimText}>vs</span>}
      <ChevronRight size={14} color="var(--text-dim)" />
    </div>
  );
}

/* ---------- Match Detail ---------- */
function MatchDetail({ isAdmin, match, config, playerById, players, getOpponentName, getCompetitionInfo, getVenueName, getStaffName, onBack, onDelete, onRegisterScore, onEditLineup, onAddEvent, onEditEvent, onAddMedia, onOpenOpponent, onOpenCompetition, onEditMatch, onEditStaff, onEditPenalties, onOpenPlayer, onRemoveEvent, onRemoveMedia }) {
  const compInfo = getCompetitionInfo(match);
  const comp = COMP_TYPES[compInfo.type] || COMP_TYPES.amistoso;
  const isFinished = match.status === "encerrado";
  const events = [...(match.events || [])].sort((a, b) => eventSortValue(a) - eventSortValue(b));
  const runningScores = computeRunningScores(events);
  const formation = match.lineup?.formation || "4-4-2";
  const slots = match.lineup?.slots || {};
  const bench = (match.lineup?.bench || []).map(playerById).filter(Boolean);
  const hasLineup = Object.keys(slots).length > 0 || bench.length > 0;
  const media = match.media || [];
  const venueName = getVenueName(match);
  const [copied, setCopied] = useState(false);
  const [matchTab, setMatchTab] = useState("eventos");

  function handleShareWhatsApp() {
    const text = buildShareText(match, config, playerById, getOpponentName, getCompetitionInfo, getVenueName);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function handleCopyShareText() {
    const text = buildShareText(match, config, playerById, getOpponentName, getCompetitionInfo, getVenueName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div>
      <div style={S.detailTopBar}>
        <button style={S.iconBtn} onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} color="var(--text)" /></button>
        {isAdmin && (
          <div style={{ display: "flex", gap: 2 }}>
            <button style={S.iconBtn} onClick={onEditMatch} aria-label="Editar dados da partida"><Pencil size={17} color="var(--text-dim)" /></button>
            <button style={S.iconBtn} onClick={onDelete} aria-label="Excluir partida"><Trash2 size={18} color="var(--danger)" /></button>
          </div>
        )}
      </div>

      <div style={S.scoreboard}>
        <button style={{ ...S.pill, background: comp.varBg, color: comp.varText, marginBottom: 10, border: "none", cursor: "pointer" }} onClick={() => onOpenCompetition(match)}>
          {comp.label}{compInfo.name ? ` · ${compInfo.name}` : ""}
        </button>
        <div style={S.scoreboardRow}>
          <div style={S.scoreboardTeam}>{config.name}</div>
          {isFinished ? <div style={S.scoreboardDigits}>{match.scoreTeam} – {match.scoreOpponent}</div> : <div style={S.scoreboardVs}>vs</div>}
          {match.opponentType === "avulso" ? (
            <div style={S.scoreboardTeam}>{getOpponentName(match)}</div>
          ) : (
            <button style={S.scoreboardTeamBtn} onClick={() => onOpenOpponent(match)}>{getOpponentName(match)}</button>
          )}
        </div>
        <div style={S.scoreboardMeta}><span><Calendar size={13} /> {formatDateLong(match.date)}</span><span><Clock size={13} /> {match.time}</span></div>
        {venueName && <div style={S.scoreboardMeta}><MapPin size={13} /> {venueName}</div>}
        {isAdmin && !isFinished && <button style={S.primaryBtn} onClick={onRegisterScore}>Registrar resultado</button>}
        {isAdmin && isFinished && <button style={S.ghostBtn} onClick={onRegisterScore}><Pencil size={13} style={{ marginRight: 6 }} /> Editar placar</button>}

        <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 12 }}>
          <button style={S.whatsappBtn} onClick={handleShareWhatsApp}>
            <MessageCircle size={16} /> Compartilhar no WhatsApp
          </button>
          <button style={S.iconBtn} onClick={handleCopyShareText} aria-label="Copiar texto do resumo">
            <Copy size={17} color="var(--text-dim)" />
          </button>
        </div>
        {copied && <div style={{ ...S.dimText, marginTop: 6 }}>Texto copiado ✓</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20, marginBottom: 14 }}>
        <button style={{ ...S.segmentBtn, ...(matchTab === "eventos" ? S.segmentBtnActive : {}) }} onClick={() => setMatchTab("eventos")}>Eventos</button>
        <button style={{ ...S.segmentBtn, ...(matchTab === "escalacao" ? S.segmentBtnActive : {}) }} onClick={() => setMatchTab("escalacao")}>Escalação</button>
        <button style={{ ...S.segmentBtn, ...(matchTab === "midia" ? S.segmentBtnActive : {}) }} onClick={() => setMatchTab("midia")}>Mídia{media.length > 0 ? ` (${media.length})` : ""}</button>
      </div>

      {matchTab === "eventos" && (
        <>
          {((isFinished && match.scoreTeam === match.scoreOpponent) || match.penaltyShootout) ? (
            <>
              <SectionHeader title="Disputa de pênaltis" action={isAdmin ? { label: match.penaltyShootout ? "Editar" : "Adicionar", onClick: onEditPenalties } : undefined} />
              {!match.penaltyShootout ? (
                <EmptyState text="Empate no tempo normal? Registre aqui a disputa de pênaltis." />
              ) : (
                <div style={S.card}>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600 }}>
                      {match.penaltyShootout.ourKicks.filter((k) => k.scored).length}
                      <span style={{ color: "var(--text-dim)", fontSize: 20 }}> x </span>
                      {match.penaltyShootout.opponentKicks.filter((k) => k.result === "gol").length}
                    </div>
                    <div style={S.dimText}>Pênaltis</div>
                  </div>
                  <div style={S.penaltyHeaderRow}>
                    <span style={{ flex: 1, textAlign: "right" }}>{config.name}</span>
                    <span style={S.dimText}>#</span>
                    <span style={{ flex: 1 }}>Adversário</span>
                  </div>
                  {Array.from({ length: Math.max(match.penaltyShootout.ourKicks.length, match.penaltyShootout.opponentKicks.length) }).map((_, i) => {
                    const ourKick = match.penaltyShootout.ourKicks[i];
                    const theirKick = match.penaltyShootout.opponentKicks[i];
                    const p = ourKick ? playerById(ourKick.playerId) : null;
                    return (
                      <div key={i} style={S.penaltyPairRow}>
                        <div style={S.penaltySide}>
                          {ourKick ? (
                            <><span>{p ? p.name : "Jogador removido"}</span><span style={{ fontSize: 15 }}>{ourKick.scored ? "✅" : "❌"}</span></>
                          ) : <span style={S.dimText}>—</span>}
                        </div>
                        <span style={S.penaltyRoundNumber}>{i + 1}</span>
                        <div style={{ ...S.penaltySide, justifyContent: "flex-start" }}>
                          {theirKick ? (
                            <><span style={{ fontSize: 15 }}>{theirKick.result === "gol" ? "✅" : theirKick.result === "defendida" ? "🧤" : "❌"}</span><span>{theirKick.result === "gol" ? "Gol" : theirKick.result === "defendida" ? "Defendida" : "Perdida"}</span></>
                          ) : <span style={S.dimText}>—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          <SectionHeader title="Eventos da partida" action={isAdmin ? { label: "Adicionar", onClick: onAddEvent } : undefined} />
          {events.length === 0 ? (
            <EmptyState text="Nenhum gol ou cartão registrado ainda." />
          ) : (
            <div style={S.card}>{events.map((e) => <EventRow key={e.id} event={e} scoreAfter={runningScores[e.id]} playerById={playerById} onOpenPlayer={onOpenPlayer} isAdmin={isAdmin} onEdit={() => onEditEvent(e)} onRemove={() => onRemoveEvent(e.id)} />)}</div>
          )}
        </>
      )}

      {matchTab === "escalacao" && (
        <>
          <SectionHeader title="Escalação" action={isAdmin ? { label: "Gerenciar", onClick: onEditLineup } : undefined} />
          {!hasLineup ? (
            <EmptyState text="Escalação ainda não montada. Toque em Gerenciar para escalar o time no campo." />
          ) : (
            <div style={S.card}>
              <Pitch formation={formation} slots={slots} playersById={playerById} activeSlotId={null} onSlotClick={(slotId) => { const pid = slots[slotId]; if (pid) onOpenPlayer(pid); }} events={events} captainId={match.lineup?.captainId} />
              {bench.length > 0 && (
                <>
                  <div style={{ ...S.lineupLabel, marginTop: 14 }}>Banco</div>
                  {groupPlayersByPosition(bench).map((g) => (
                    <div key={g.label} style={{ marginBottom: 10 }}>
                      <div style={S.benchGroupLabel}>{g.label}</div>
                      <div style={S.lineupGrid}>
                        {g.players.map((p) => (
                          <div key={p.id} style={{ ...S.lineupChip, cursor: "pointer" }} onClick={() => onOpenPlayer(p.id)}><JerseyBadge number={p.number} size={26} muted /><span>{p.name}{match.lineup?.captainId === p.id ? " 🅲" : ""}{getPlayerBadges(p.id, events) ? ` ${getPlayerBadges(p.id, events)}` : ""}</span></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <SectionHeader title="Comissão técnica" action={isAdmin ? { label: "Editar", onClick: onEditStaff } : undefined} />
          {!match.tecnicoId && !match.auxiliarTecnicoId ? (
            <EmptyState text="Nenhum membro da comissão técnica definido para esta partida." />
          ) : (
            <div style={S.card}>
              <div style={S.staffGrid}>
                {match.tecnicoId && getStaffName(match.tecnicoId) && (
                  <div style={S.staffRow}><div style={S.staffAvatar}>T</div><div><div style={S.eventMain}>{getStaffName(match.tecnicoId)}</div><div style={S.eventSub}>Técnico</div></div></div>
                )}
                {match.auxiliarTecnicoId && getStaffName(match.auxiliarTecnicoId) && (
                  <div style={S.staffRow}><div style={S.staffAvatar}>A</div><div><div style={S.eventMain}>{getStaffName(match.auxiliarTecnicoId)}</div><div style={S.eventSub}>Auxiliar técnico</div></div></div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {matchTab === "midia" && (
        <>
          <SectionHeader title="Mídias" action={isAdmin ? { label: "Adicionar", onClick: onAddMedia } : undefined} />
          {media.length === 0 ? (
            <EmptyState text="Nenhuma foto ou vídeo ainda. Cole o link de uma imagem ou de um vídeo hospedado (Drive, YouTube etc.)." />
          ) : (
            <div>
              {media.map((item) => (
                <div key={item.id} style={S.mediaCard}>
                  {item.type === "foto" ? (
                    <MediaImage url={item.url} sourceUrl={item.sourceUrl} caption={item.caption} />
                  ) : (
                    <a href={item.sourceUrl || item.url} target="_blank" rel="noreferrer" style={S.mediaVideoRow}>
                      <Video size={18} /> <span style={{ flex: 1 }}>{item.caption || "Assistir vídeo"}</span>
                    </a>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {item.caption && item.type === "foto" && <div style={S.mediaCaption}>{item.caption}</div>}
                    {isAdmin && <button style={S.smallIconBtn} onClick={() => onRemoveMedia(item.id)} aria-label="Remover mídia"><Trash2 size={13} color="var(--text-dim)" /></button>}
                  </div>
                  {item.taggedPlayerIds && item.taggedPlayerIds.length > 0 && (
                    <div style={S.mediaTagRow}>
                      <span style={S.dimText}>Com: </span>
                      {item.taggedPlayerIds.map((pid, i) => {
                        const p = playerById(pid);
                        if (!p) return null;
                        return (
                          <span key={pid}>
                            <PlayerLink player={p} onOpenPlayer={onOpenPlayer}>{p.name}</PlayerLink>
                            {i < item.taggedPlayerIds.length - 1 ? ", " : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MediaImage({ url, sourceUrl, caption, disableLink }) {
  const [failed, setFailed] = useState(false);
  const finalUrl = toDirectImageUrl(url);
  const dest = sourceUrl || url;
  if (failed) {
    if (disableLink) {
      return (
        <div style={S.mediaFallback}>
          <ImageIcon size={18} />
          <span style={{ flex: 1 }}>Não consegui carregar essa imagem aqui.</span>
        </div>
      );
    }
    return (
      <a href={dest} target="_blank" rel="noreferrer" style={S.mediaFallback}>
        <ImageIcon size={18} />
        <span style={{ flex: 1 }}>
          Não consegui carregar essa imagem aqui. Toque para abrir {sourceUrl ? "a pasta/álbum de origem" : "o link original"} — se for do Google Drive, confira se o compartilhamento está como "Qualquer pessoa com o link".
        </span>
      </a>
    );
  }
  const img = <img src={finalUrl} alt={caption || "Foto da partida"} style={S.mediaImg} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  if (disableLink) return img;
  return (
    <a href={dest} target="_blank" rel="noreferrer">
      {img}
    </a>
  );
}

function PlayerLink({ player, onOpenPlayer, children }) {
  if (!player) return <>{children}</>;
  return (
    <span style={S.playerLink} onClick={(e) => { e.stopPropagation(); onOpenPlayer(player.id); }}>
      {children}
    </span>
  );
}

function EventRow({ event, scoreAfter, playerById, onOpenPlayer, isAdmin, onEdit, onRemove }) {
  const scorer = playerById(event.playerId);
  const assist = event.assistId ? playerById(event.assistId) : null;
  const playerOut = event.playerOutId ? playerById(event.playerOutId) : null;
  const playerIn = event.playerInId ? playerById(event.playerInId) : null;
  const periodLabel = event.period === "1" ? "1ºT" : event.period === "2" ? "2ºT" : "";
  const timeLabel = event.minute != null ? `${event.minute}'${periodLabel ? ` ${periodLabel}` : ""}` : (periodLabel || "—");
  const scoreLabel = scoreAfter ? ` (${scoreAfter.our}-${scoreAfter.their})` : "";
  return (
    <div style={S.eventRow}>
      <span style={S.eventMinute}>{timeLabel}</span>
      {event.type === "gol" && (
        <><span style={S.eventIcon}>⚽</span><div style={{ flex: 1 }}>
          <div style={S.eventMain}><PlayerLink player={scorer} onOpenPlayer={onOpenPlayer}>{scorer ? scorer.name : "Jogador removido"}</PlayerLink><span style={S.dimText}>{scoreLabel}</span></div>
          {event.golType && <div style={S.eventSub}>{event.golType}</div>}
          {assist && <div style={S.eventSub}>Assistência: <PlayerLink player={assist} onOpenPlayer={onOpenPlayer}>{assist.name}</PlayerLink></div>}
        </div></>
      )}
      {event.type === "gol_adversario" && (
        <><span style={S.eventIcon}>⚽</span><div style={{ flex: 1 }}>
          <div style={S.eventMain}>Gol do adversário<span style={S.dimText}>{scoreLabel}</span></div>
          {event.golType && <div style={S.eventSub}>{event.golType}</div>}
          {event.note && <div style={S.eventSub}>{event.note}</div>}
        </div></>
      )}
      {event.type === "amarelo" && (
        <><span style={{ ...S.cardChip, background: "var(--amber)" }} /><div style={{ flex: 1 }}><div style={S.eventMain}><PlayerLink player={scorer} onOpenPlayer={onOpenPlayer}>{scorer ? scorer.name : "Jogador removido"}</PlayerLink></div><div style={S.eventSub}>Cartão amarelo</div></div></>
      )}
      {event.type === "vermelho" && (
        <><span style={{ ...S.cardChip, background: "var(--danger)" }} /><div style={{ flex: 1 }}><div style={S.eventMain}><PlayerLink player={scorer} onOpenPlayer={onOpenPlayer}>{scorer ? scorer.name : "Jogador removido"}</PlayerLink></div><div style={S.eventSub}>Cartão vermelho</div></div></>
      )}
      {event.type === "substituicao" && (
        <><span style={S.eventIcon}>🔄</span><div style={{ flex: 1 }}>
          <div style={S.eventMain}><PlayerLink player={playerIn} onOpenPlayer={onOpenPlayer}>{playerIn ? playerIn.name : "Jogador removido"}</PlayerLink> entra</div>
          <div style={S.eventSub}>Sai: <PlayerLink player={playerOut} onOpenPlayer={onOpenPlayer}>{playerOut ? playerOut.name : "Jogador removido"}</PlayerLink></div>
        </div></>
      )}
      {event.type === "golcontra" && (
        <><span style={S.eventIcon}>🥅</span><div style={{ flex: 1 }}><div style={S.eventMain}>Gol contra (a favor)<span style={S.dimText}>{scoreLabel}</span></div><div style={S.eventSub}>Ponto para o nosso time{event.note ? ` · ${event.note}` : ""}</div></div></>
      )}
      {event.type === "penaltidefendido" && (
        <><span style={S.eventIcon}>🧤</span><div style={{ flex: 1 }}><div style={S.eventMain}><PlayerLink player={scorer} onOpenPlayer={onOpenPlayer}>{scorer ? scorer.name : "Jogador removido"}</PlayerLink></div><div style={S.eventSub}>Pênalti defendido</div></div></>
      )}
      {isAdmin && (
        <>
          <button style={S.smallIconBtn} onClick={onEdit} aria-label="Editar evento"><Pencil size={13} color="var(--text-dim)" /></button>
          <button style={S.smallIconBtn} onClick={onRemove} aria-label="Remover evento"><Trash2 size={14} color="var(--text-dim)" /></button>
        </>
      )}
    </div>
  );
}

/* ---------- Pitch ---------- */
function getPlayerBadges(playerId, events, options = {}) {
  let badges = "";
  (events || []).forEach((e) => {
    if (e.type === "gol" && e.playerId === playerId) badges += "⚽";
    if (e.type === "gol" && e.assistId === playerId) badges += "🅰️";
    if (e.type === "amarelo" && e.playerId === playerId) badges += "🟨";
    if (e.type === "vermelho" && e.playerId === playerId) badges += "🟥";
    if (e.type === "substituicao" && !options.excludeSub && (e.playerOutId === playerId || e.playerInId === playerId)) badges += "🔄";
    if (e.type === "penaltidefendido" && e.playerId === playerId) badges += "🧤";
  });
  return badges;
}

function Pitch({ formation, slots, playersById, activeSlotId, onSlotClick, events, captainId }) {
  const layout = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  return (
    <svg viewBox="0 0 300 474" style={{ width: "100%", height: "auto", background: "var(--pitch)", borderRadius: 12 }}>
      <rect x="6" y="6" width="288" height="448" fill="none" stroke="var(--pitch-line)" strokeWidth="2" rx="6" />
      <line x1="6" y1="230" x2="294" y2="230" stroke="var(--pitch-line)" strokeWidth="2" />
      <circle cx="150" cy="230" r="38" fill="none" stroke="var(--pitch-line)" strokeWidth="2" />
      <rect x="70" y="6" width="160" height="50" fill="none" stroke="var(--pitch-line)" strokeWidth="2" />
      <rect x="70" y="404" width="160" height="50" fill="none" stroke="var(--pitch-line)" strokeWidth="2" />
      {layout.map((slot) => {
        const px = (slot.x / 100) * 300;
        const py = (slot.y / 100) * 460;
        const playerId = slots[slot.id];
        const player = playerId ? playersById(playerId) : null;
        const active = activeSlotId === slot.id;
        const badges = player && events ? getPlayerBadges(player.id, events) : "";
        const isCaptain = player && captainId && player.id === captainId;
        const nameLabel = player ? shortenName(player.name) : "";
        const nameWidth = Math.min(76, Math.max(30, nameLabel.length * 4.6 + 10));
        const badgeWidth = Math.min(70, Math.max(24, badges.length * 5.5 + 8));
        return (
          <g key={slot.id} onClick={() => onSlotClick(slot.id)} style={{ cursor: "pointer" }}>
            <circle cx={px} cy={py} r="20" fill={player ? "var(--surface)" : "transparent"} stroke={active ? "var(--amber)" : "var(--turf)"} strokeWidth={active ? 3 : 1.5} strokeDasharray={player ? "0" : "4 3"} />
            <text x={px} y={py + 5} textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="600" fill={player ? "var(--text)" : "var(--text-dim)"}>
              {player ? (player.number ?? "?") : "+"}
            </text>
            {player && (
              <>
                <rect x={px - nameWidth / 2} y={py + 24} width={nameWidth} height={13} rx={4} fill="rgba(8,8,8,0.78)" />
                <text x={px} y={py + 33.5} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="var(--text)">{nameLabel}</text>
              </>
            )}
            {badges && (
              <>
                <rect x={px - badgeWidth / 2} y={py + 39} width={badgeWidth} height={13} rx={4} fill="rgba(8,8,8,0.78)" />
                <text x={px} y={py + 48.5} textAnchor="middle" fontSize="9">{badges}</text>
              </>
            )}
            {isCaptain && <text x={px + 15} y={py - 12} textAnchor="middle" fontSize="13">🅲</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Elenco Tab ---------- */
function ElencoTab({ isAdmin, players, config, getPlayerStats, getGoalkeeperStats, onAdd, onEdit, onDelete, onOpenConfig, onOpenPlayer }) {
  const hasStaff = config?.tecnico || config?.auxiliarTecnico;
  const activePlayers = players.filter((p) => p.ativo !== false);
  const inactivePlayers = players.filter((p) => p.ativo === false);
  const groups = groupPlayersByPosition(activePlayers);
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div>
      <SectionHeader title="Comissão técnica" action={isAdmin ? { label: "Editar", onClick: onOpenConfig } : undefined} />
      {!hasStaff ? (
        <EmptyState text="Nenhum técnico cadastrado ainda. Toque em Editar para adicionar." />
      ) : (
        <div style={S.card}>
          <div style={S.staffGrid}>
            {config.tecnico && (
              <div style={S.staffRow}><div style={S.staffAvatar}>T</div><div><div style={S.eventMain}>{config.tecnico}</div><div style={S.eventSub}>Técnico</div></div></div>
            )}
            {config.auxiliarTecnico && (
              <div style={S.staffRow}><div style={S.staffAvatar}>A</div><div><div style={S.eventMain}>{config.auxiliarTecnico}</div><div style={S.eventSub}>Auxiliar técnico</div></div></div>
            )}
          </div>
        </div>
      )}

      <SectionHeader title="Elenco" />
      {activePlayers.length === 0 ? (
        <EmptyState text="Nenhum jogador ativo cadastrado. Toque em + para montar o elenco." />
      ) : (
        groups.map((g, i) => (
          <div key={g.label} style={i > 0 ? S.positionGroup : undefined}>
            <div style={S.positionGroupLabel}>{g.label}</div>
            <div style={S.card}>
              {g.players.map((p) => {
                const isGoalkeeper = getPositions(p)[0] === "Goleiro";
                const stats = isGoalkeeper ? getGoalkeeperStats(p.id) : getPlayerStats(p.id);
                return (
                  <div key={p.id} style={S.playerListRow} onClick={() => onOpenPlayer(p.id)}>
                    <JerseyBadge number={p.number} size={32} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={S.eventMain}>{p.name}</div>
                      <div style={S.eventSub}>{formatPositions(p)}</div>
                    </div>
                    <div style={S.playerListStats}>
                      {isGoalkeeper ? (
                        <span>{stats.jogos}J · {stats.jogosSemSofrerGol}SG</span>
                      ) : (
                        <span>{stats.jogos}J · {stats.goals}G · {stats.assists}A</span>
                      )}
                    </div>
                    {isAdmin && (
                      <>
                        <button style={S.smallIconBtn} onClick={(e) => { e.stopPropagation(); onEdit(p); }} aria-label="Editar jogador"><Pencil size={13} color="var(--text-dim)" /></button>
                        <button style={S.smallIconBtn} onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} aria-label="Remover jogador"><Trash2 size={13} color="var(--text-dim)" /></button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {inactivePlayers.length > 0 && (
        <div style={S.positionGroup}>
          <button style={S.inactiveToggle} onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? "▾" : "▸"} Jogadores fora do elenco atual ({inactivePlayers.length})
          </button>
          {showInactive && (
            <div style={{ marginTop: 10 }}>
              {inactivePlayers.map((p) => (
                <div key={p.id} style={{ ...S.lineupPickRow, cursor: "pointer" }} onClick={() => onOpenPlayer(p.id)}>
                  <JerseyBadge number={p.number} size={28} muted />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.playerName}>{p.name}</div>
                    <div style={S.playerPos}>{formatPositions(p)}</div>
                  </div>
                  {isAdmin && (
                    <>
                      <button style={S.smallIconBtn} onClick={(e) => { e.stopPropagation(); onEdit(p); }} aria-label="Editar jogador"><Pencil size={13} color="var(--text-dim)" /></button>
                      <button style={S.smallIconBtn} onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} aria-label="Remover jogador"><Trash2 size={13} color="var(--text-dim)" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {players.length > 0 && (
        <div style={S.legendBox}>
          <span><b>J</b> jogos</span>
          <span><b>G</b> gols</span>
          <span><b>A</b> assistências</span>
          <span><b>SG</b> jogos sem sofrer gol</span>
        </div>
      )}
      {isAdmin && <FloatingAddButton onClick={onAdd} label="Novo jogador" />}
    </div>
  );
}
function StatMini({ label, value }) {
  return <div style={S.statMini}><div style={S.statMiniValue}>{value}</div><div style={S.statMiniLabel}>{label}</div></div>;
}

/* ---------- Stats Tab ---------- */
function StatsTab({ isAdmin, matches, players, competitions, getCompetitionInfo, config, onUpdateStandings, onOpenPlayer }) {
  const [filterCompetitionId, setFilterCompetitionId] = useState("tipo:oficial");
  const [showStandings, setShowStandings] = useState(false);

  const isTypeFilter = filterCompetitionId.startsWith("tipo:");
  const selectedCompetition = (filterCompetitionId === "todas" || isTypeFilter) ? null : competitions.find((c) => c.id === filterCompetitionId);

  const filteredMatches = filterCompetitionId === "todas"
    ? matches
    : isTypeFilter
      ? matches.filter((m) => getCompetitionInfo(m).type === filterCompetitionId.slice(5))
      : matches.filter((m) => m.competitionId === filterCompetitionId);
  const finishedFiltered = filteredMatches.filter((m) => m.status === "encerrado");
  const teamRecord = computeHeadToHead(finishedFiltered);

  const withStats = players.map((p) => ({ p, stats: computePlayerStats(filteredMatches, p.id) }));
  const artilheiros = withStats.filter((x) => x.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10);
  const garcons = withStats.filter((x) => x.stats.assists > 0).sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10);
  const maisJogos = withStats.filter((x) => x.stats.jogos > 0).sort((a, b) => b.stats.jogos - a.stats.jogos).slice(0, 10);
  const amarelados = withStats.filter((x) => x.stats.amarelos > 0).sort((a, b) => b.stats.amarelos - a.stats.amarelos).slice(0, 10);
  const vermelhados = withStats.filter((x) => x.stats.vermelhos > 0).sort((a, b) => b.stats.vermelhos - a.stats.vermelhos).slice(0, 10);
  const golsDeFalta = withStats.filter((x) => x.stats.golsFalta > 0).sort((a, b) => b.stats.golsFalta - a.stats.golsFalta).slice(0, 10);
  const penaltis = withStats.filter((x) => x.stats.penaltisDefendidos > 0).sort((a, b) => b.stats.penaltisDefendidos - a.stats.penaltisDefendidos).slice(0, 10);

  const goleiros = players.map((p) => ({ p, stats: computeGoalkeeperStats(filteredMatches, p.id) }))
    .filter((x) => x.stats.jogos > 0).sort((a, b) => b.stats.jogos - a.stats.jogos);

  const byType = {
    oficial: competitions.filter((c) => c.type === "oficial"),
    amistoso: competitions.filter((c) => c.type === "amistoso"),
    festival: competitions.filter((c) => c.type === "festival"),
  };

  return (
    <div>
      <div style={S.filterRow}>
        <select style={S.filterSelect} value={filterCompetitionId} onChange={(e) => setFilterCompetitionId(e.target.value)}>
          <option value="todas">Tudo (histórico completo)</option>
          <optgroup label="Oficial">
            <option value="tipo:oficial">Todos os oficiais</option>
            {byType.oficial.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
          <optgroup label="Amistoso">
            <option value="tipo:amistoso">Todos os amistosos</option>
            {byType.amistoso.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
          <optgroup label="Festival">
            <option value="tipo:festival">Todos os festivais</option>
            {byType.festival.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        </select>
      </div>

      {selectedCompetition && (
        <>
          <SectionHeader title="Tabela de classificação" action={isAdmin ? { label: "Editar", onClick: () => setShowStandings(true) } : undefined} />
          {!selectedCompetition.standings || selectedCompetition.standings.length === 0 ? (
            <EmptyState text="Nenhuma tabela cadastrada ainda. Toque em Editar para lançar a classificação do grupo." />
          ) : (
            <div style={S.card}>
              <div style={S.standingsHeaderRow}>
                <span style={S.standingsPosCol}>#</span>
                <span style={{ flex: 1 }} />
                <span style={S.standingsCol}>PG</span>
                <span style={S.standingsCol}>J</span>
                <span style={S.standingsCol}>V</span>
                <span style={S.standingsCol}>E</span>
                <span style={S.standingsCol}>D</span>
                <span style={S.standingsCol}>SG</span>
              </div>
              {selectedCompetition.standings
                .map((row) => {
                  const isUs = row.isUs || (config?.name && row.team.trim().toLowerCase() === config.name.trim().toLowerCase());
                  if (!isUs) return row;
                  return {
                    ...row, isUs: true, team: config.name,
                    pontos: teamRecord.v * 3 + teamRecord.e, jogos: teamRecord.jogos,
                    vitorias: teamRecord.v, empates: teamRecord.e, derrotas: teamRecord.d,
                    golsPro: teamRecord.gp, golsContra: teamRecord.gc,
                  };
                })
                .sort((a, b) => (b.pontos - a.pontos) || ((b.golsPro - b.golsContra) - (a.golsPro - a.golsContra)) || (b.golsPro - a.golsPro))
                .map((row, i) => (
                  <div key={row.id} style={{ ...S.standingsRow, color: row.isUs ? "var(--turf)" : "var(--text)" }}>
                    <span style={S.standingsPosCol}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: row.isUs ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.team}{row.isUs ? " 🔗" : ""}</span>
                    <span style={S.standingsCol}>{row.pontos}</span>
                    <span style={S.standingsCol}>{row.jogos}</span>
                    <span style={S.standingsCol}>{row.vitorias}</span>
                    <span style={S.standingsCol}>{row.empates}</span>
                    <span style={S.standingsCol}>{row.derrotas}</span>
                    <span style={S.standingsCol}>{row.golsPro - row.golsContra}</span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      <div style={S.card}>
        <div style={S.recordGrid}>
          <RecordCell label="Jogos" value={teamRecord.jogos} />
          <RecordCell label="Vitórias" value={teamRecord.v} accent="var(--turf)" />
          <RecordCell label="Empates" value={teamRecord.e} accent="var(--amber)" />
          <RecordCell label="Derrotas" value={teamRecord.d} accent="var(--danger)" />
        </div>
        <div style={{ ...S.recordGrid, marginTop: 10 }}>
          <RecordCell label="Gols pró" value={teamRecord.gp} />
          <RecordCell label="Gols contra" value={teamRecord.gc} />
          <RecordCell label="Saldo" value={teamRecord.gp - teamRecord.gc} />
        </div>
      </div>

      <SectionHeader title="Artilharia" />
      {artilheiros.length === 0 ? <EmptyState text="Ninguém balançou as redes ainda com esse filtro." /> : (
        <div style={S.card}>{artilheiros.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.goals} valueLabel="gols" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Assistências" />
      {garcons.length === 0 ? <EmptyState text="Nenhuma assistência registrada com esse filtro." /> : (
        <div style={S.card}>{garcons.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.assists} valueLabel="assist." onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Mais jogos" />
      {maisJogos.length === 0 ? <EmptyState text="Nenhuma partida com escalação registrada com esse filtro." /> : (
        <div style={S.card}>{maisJogos.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.jogos} valueLabel="jogos" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Gols de falta" />
      {golsDeFalta.length === 0 ? <EmptyState text="Nenhum gol de falta registrado com esse filtro." /> : (
        <div style={S.card}>{golsDeFalta.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.golsFalta} valueLabel="gols" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Pênaltis defendidos" />
      {penaltis.length === 0 ? <EmptyState text="Nenhum pênalti defendido registrado com esse filtro." /> : (
        <div style={S.card}>{penaltis.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.penaltisDefendidos} valueLabel="defesas" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Cartões amarelos" />
      {amarelados.length === 0 ? <EmptyState text="Ninguém foi advertido com esse filtro." /> : (
        <div style={S.card}>{amarelados.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.amarelos} valueLabel="cartões" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Cartões vermelhos" />
      {vermelhados.length === 0 ? <EmptyState text="Ninguém foi expulso com esse filtro." /> : (
        <div style={S.card}>{vermelhados.map((x, i) => <RankRow key={x.p.id} rank={i + 1} player={x.p} value={x.stats.vermelhos} valueLabel="cartões" onClick={() => onOpenPlayer(x.p.id)} />)}</div>
      )}

      <SectionHeader title="Goleiros" />
      {goleiros.length === 0 ? (
        <EmptyState text="Nenhum goleiro escalado em partidas encerradas com esse filtro." />
      ) : (
        <div style={S.card}>
          <div style={S.goalkeeperHeaderRow}>
            <span style={{ flex: 1 }} />
            <span style={S.goalkeeperHeaderLabel}>Jogos</span>
            <span style={S.goalkeeperHeaderLabel}>Jogo zero</span>
          </div>
          {goleiros.map((x) => (
            <div key={x.p.id} style={{ ...S.goalkeeperRow, cursor: "pointer" }} onClick={() => onOpenPlayer(x.p.id)}>
              <JerseyBadge number={x.p.number} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={S.eventMain}>{x.p.name}</div></div>
              <span style={S.goalkeeperValue}>{x.stats.jogos}</span>
              <span style={S.goalkeeperValue}>{x.stats.jogosSemSofrerGol}</span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && showStandings && selectedCompetition && (
        <StandingsModal
          competition={selectedCompetition} config={config} teamRecord={teamRecord}
          onClose={() => setShowStandings(false)}
          onSave={(standings) => { onUpdateStandings(selectedCompetition.id, standings); setShowStandings(false); }}
        />
      )}
    </div>
  );
}

function StandingsModal({ competition, config, teamRecord, onClose, onSave }) {
  const [rows, setRows] = useState(
    (competition.standings || []).map((r) => ({ ...r, isUs: r.isUs || (config?.name && r.team.trim().toLowerCase() === config.name.trim().toLowerCase()) }))
  );
  const hasUsRow = rows.some((r) => r.isUs);

  function addRow() {
    setRows([...rows, { id: uid(), team: "", pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0 }]);
  }
  function addUsRow() {
    setRows([{ id: uid(), isUs: true, team: config?.name || "Nosso time" }, ...rows]);
  }
  function updateRow(id, field, value) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: field === "team" ? value : (value === "" ? 0 : Number(value)) } : r)));
  }
  function removeRow(id) {
    setRows(rows.filter((r) => r.id !== id));
  }
  function save() {
    const finalRows = rows.map((r) => r.isUs ? {
      ...r, team: config?.name || r.team,
      pontos: teamRecord.v * 3 + teamRecord.e, jogos: teamRecord.jogos,
      vitorias: teamRecord.v, empates: teamRecord.e, derrotas: teamRecord.d,
      golsPro: teamRecord.gp, golsContra: teamRecord.gc,
    } : r);
    onSave(finalRows.filter((r) => r.team.trim()).map((r) => ({ ...r, team: r.team.trim() })));
  }

  return (
    <ModalShell title={`Tabela — ${competition.name}`} onClose={onClose} footer={<button style={S.primaryBtn} onClick={save}>Salvar tabela</button>}>
      <p style={S.helpText}>Preencha manualmente conforme a tabela oficial do campeonato. O saldo de gols é calculado automaticamente.</p>
      {!hasUsRow && (
        <button style={{ ...S.ghostBtnSmall, width: "100%", padding: "10px 0", marginBottom: 14 }} onClick={addUsRow}>+ Adicionar nosso time (dados automáticos)</button>
      )}
      {rows.map((r) => (
        r.isUs ? (
          <div key={r.id} style={S.standingsUsCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: "var(--turf)" }}>🔗 {config?.name || r.team}</span>
              <button style={S.smallIconBtn} onClick={() => removeRow(r.id)} aria-label="Remover"><Trash2 size={14} color="var(--text-dim)" /></button>
            </div>
            <div style={S.dimText}>PG {teamRecord.v * 3 + teamRecord.e} · J {teamRecord.jogos} · V {teamRecord.v} · E {teamRecord.e} · D {teamRecord.d} · SG {teamRecord.gp - teamRecord.gc}</div>
            <p style={{ ...S.helpText, marginTop: 6 }}>Calculado automaticamente a partir das partidas registradas dessa competição — não precisa digitar nada aqui.</p>
          </div>
        ) : (
          <div key={r.id} style={S.standingsEditRow}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input style={{ ...S.input, flex: 1 }} value={r.team} onChange={(e) => updateRow(r.id, "team", e.target.value)} placeholder="Nome do time" />
              <button style={S.smallIconBtn} onClick={() => removeRow(r.id)} aria-label="Remover time"><Trash2 size={14} color="var(--text-dim)" /></button>
            </div>
            <div style={S.standingsEditGrid}>
              <StandingsNumField label="PG" value={r.pontos} onChange={(v) => updateRow(r.id, "pontos", v)} />
              <StandingsNumField label="J" value={r.jogos} onChange={(v) => updateRow(r.id, "jogos", v)} />
              <StandingsNumField label="V" value={r.vitorias} onChange={(v) => updateRow(r.id, "vitorias", v)} />
              <StandingsNumField label="E" value={r.empates} onChange={(v) => updateRow(r.id, "empates", v)} />
              <StandingsNumField label="D" value={r.derrotas} onChange={(v) => updateRow(r.id, "derrotas", v)} />
              <StandingsNumField label="GP" value={r.golsPro} onChange={(v) => updateRow(r.id, "golsPro", v)} />
              <StandingsNumField label="GC" value={r.golsContra} onChange={(v) => updateRow(r.id, "golsContra", v)} />
            </div>
          </div>
        )
      ))}
      <button style={{ ...S.ghostBtnSmall, width: "100%", padding: "10px 0", marginTop: 4 }} onClick={addRow}>+ Adicionar time</button>
    </ModalShell>
  );
}
function StandingsNumField({ label, value, onChange }) {
  return (
    <div style={S.standingsNumField}>
      <span style={S.standingsNumLabel}>{label}</span>
      <input style={S.standingsNumInput} type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function RecordCell({ label, value, accent }) {
  return <div style={S.recordCell}><div style={{ ...S.recordValue, color: accent || "var(--text)" }}>{value}</div><div style={S.recordLabel}>{label}</div></div>;
}
function RankRow({ rank, player, value, valueLabel, onClick }) {
  return (
    <div style={{ ...S.rankRow, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <span style={S.rankNumber}>{rank}</span>
      <JerseyBadge number={player.number} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={S.eventMain}>{player.name}</div><div style={S.eventSub}>{formatPositions(player)}</div></div>
      <div style={S.rankValue}>{value} <span style={S.dimText}>{valueLabel}</span></div>
    </div>
  );
}

/* ---------- Shared bits ---------- */
function SectionHeader({ title, action }) {
  return <div style={S.sectionHeader}><span style={S.sectionTitle}>{title}</span>{action && <button style={S.sectionAction} onClick={action.onClick}>{action.label}</button>}</div>;
}
function EmptyState({ text }) { return <div style={S.emptyState}>{text}</div>; }
function JerseyBadge({ number, size = 32, muted }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `1.5px solid ${muted ? "var(--line)" : "var(--turf)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: size * 0.42, fontWeight: 600, color: muted ? "var(--text-dim)" : "var(--turf)", flexShrink: 0, background: "var(--surface)" }}>
      {number ?? "–"}
    </div>
  );
}
function PlayerAvatar({ player, size = 56 }) {
  const [failed, setFailed] = useState(false);
  if (!player?.photoUrl || failed) return <JerseyBadge number={player?.number} size={size} />;
  const finalUrl = toDirectImageUrl(player.photoUrl);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <img
        src={finalUrl} alt={player.name} referrerPolicy="no-referrer" onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--turf)", display: "block" }}
      />
      <div style={{
        position: "absolute", bottom: -2, right: -2, background: "var(--bg)", borderRadius: "50%",
        border: "1.5px solid var(--turf)", width: size * 0.4, height: size * 0.4,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontSize: size * 0.2, fontWeight: 600, color: "var(--turf)",
      }}>
        {player.number ?? "–"}
      </div>
    </div>
  );
}
function FloatingAddButton({ onClick, label }) {
  return <button style={S.fab} onClick={onClick} aria-label={label} title={label}><Plus size={24} color="var(--bg)" /></button>;
}
function BottomNav({ tab, onChange }) {
  const items = [{ key: "jogos", label: "Jogos", icon: Calendar }, { key: "elenco", label: "Elenco", icon: Users }, { key: "stats", label: "Estatísticas", icon: BarChart3 }];
  return (
    <div style={S.bottomNav}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.key;
        return (
          <button key={it.key} style={{ ...S.navBtn, color: active ? "var(--turf)" : "var(--text-dim)" }} onClick={() => onChange(it.key)}>
            <Icon size={20} /><span style={S.navLabel}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function ModalShell({ title, onClose, children, footer }) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span style={S.modalTitle}>{title}</span><button style={S.iconBtn} onClick={onClose} aria-label="Fechar"><X size={18} color="var(--text-dim)" /></button></div>
        <div style={S.modalBody}>{children}</div>
        {footer && <div style={S.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div style={{ marginBottom: 14 }}><label style={S.fieldLabel}>{label}</label>{children}</div>; }

function LoginModal({ onClose, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    const errMsg = await onLogin(email.trim(), password);
    setLoading(false);
    if (errMsg) setError(errMsg);
    else onClose();
  }

  return (
    <ModalShell title="Entrar" onClose={onClose} footer={<button style={S.primaryBtn} onClick={handleSubmit} disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>}>
      <p style={S.helpText}>Só quem tem uma conta autorizada consegue editar o app. Sem login, dá pra ver tudo normalmente.</p>
      <Field label="E-mail"><input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoCapitalize="none" /></Field>
      <Field label="Senha"><input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" /></Field>
      {error && <p style={{ ...S.helpText, color: "var(--danger)" }}>{error}</p>}
    </ModalShell>
  );
}

function ConfirmModal({ message, confirmLabel, onCancel, onConfirm }) {
  return (
    <div style={S.modalOverlay} onClick={onCancel}>
      <div style={S.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalBody}>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: "6px 0 4px" }}>{message}</p>
        </div>
        <div style={S.modalFooter}>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...S.ghostBtn, flex: 1, justifyContent: "center", marginTop: 0 }} onClick={onCancel}>Cancelar</button>
            <button style={{ ...S.primaryBtn, flex: 1, marginTop: 0, background: "var(--danger)" }} onClick={onConfirm}>{confirmLabel || "Confirmar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpponentField({ opponentType, setOpponentType, opponentId, setOpponentId, opponentName, setOpponentName, opponents, onCreateOpponent }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          style={{ ...S.segmentBtn, ...(opponentType === "cadastrado" ? S.segmentBtnActive : {}) }}
          onClick={() => setOpponentType("cadastrado")}
        >
          Time cadastrado
        </button>
        <button
          style={{ ...S.segmentBtn, ...(opponentType === "avulso" ? S.segmentBtnActive : {}) }}
          onClick={() => setOpponentType("avulso")}
        >
          Avulso / catado
        </button>
      </div>
      {opponentType === "cadastrado" ? (
        <EntityPicker label="Adversário" items={opponents} valueId={opponentId} onChange={setOpponentId} onCreate={onCreateOpponent} placeholder="Ex: Grêmio da Praça" />
      ) : (
        <Field label="Descrição do adversário">
          <input style={S.input} value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Ex: Pessoal do campo do Bosque, time misto de sábado" />
          <p style={S.helpText}>Não cria cadastro nem histórico de confronto — é só uma descrição livre pra esse jogo específico.</p>
        </Field>
      )}
    </div>
  );
}

function EntityPicker({ label, items, valueId, onChange, onCreate, placeholder }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  function handleSelect(e) { const v = e.target.value; if (v === "__new__") setCreating(true); else onChange(v); }
  function confirmCreate() { if (!newName.trim()) return; const id = onCreate(newName.trim()); onChange(id); setCreating(false); setNewName(""); }
  return (
    <Field label={label}>
      {!creating ? (
        <select style={S.input} value={valueId || ""} onChange={handleSelect}>
          <option value="">Selecionar…</option>
          {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
          <option value="__new__">+ Adicionar novo</option>
        </select>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={placeholder} autoFocus />
          <button style={S.ghostBtnSmall} onClick={confirmCreate}>OK</button>
        </div>
      )}
    </Field>
  );
}
function CompetitionPicker({ competitions, type, valueId, onChange, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const filtered = competitions.filter((c) => c.type === type);
  const typeLabel = COMP_TYPES[type]?.label || type;
  function handleSelect(e) { const v = e.target.value; if (v === "__new__") setCreating(true); else onChange(v); }
  function confirmCreate() { if (!newName.trim()) return; const id = onCreate(newName.trim(), type); onChange(id); setCreating(false); setNewName(""); }
  return (
    <Field label={type === "oficial" ? "Campeonato" : "Festival"}>
      {!creating ? (
        <select style={S.input} value={valueId || ""} onChange={handleSelect}>
          <option value="">Selecionar…</option>
          {filtered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__new__">+ Criar novo {typeLabel.toLowerCase()}</option>
        </select>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={type === "oficial" ? "Ex: Campeonato de Bairro 2026" : "Ex: Festival de Verão"} autoFocus />
          <button style={S.ghostBtnSmall} onClick={confirmCreate}>OK</button>
        </div>
      )}
    </Field>
  );
}

/* ---------- Modals ---------- */
function ConfigModal({ config, players, matches, opponents, competitions, venues, staffMembers, onClose, onSave, onImport, onLogout }) {
  const [name, setName] = useState(config.name || "");
  const [emoji, setEmoji] = useState(config.emoji || "⚽");
  const [cidade, setCidade] = useState(config.cidade || "");
  const [tecnico, setTecnico] = useState(config.tecnico || "");
  const [auxiliarTecnico, setAuxiliarTecnico] = useState(config.auxiliarTecnico || "");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  function handleExport() {
    const payload = { config, players, matches, opponents, competitions, venues, staffMembers, exportedAt: new Date().toISOString(), appVersion: 1 };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (config.name || "time").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `backup-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        onImport(data);
      } catch (err) {
        setImportError("Não consegui ler esse arquivo. Verifique se é um backup válido gerado por este app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <ModalShell title="Configurações do time" onClose={onClose} footer={<button style={S.primaryBtn} onClick={() => onSave({ name: name.trim() || "Meu Time", emoji, cidade: cidade.trim(), tecnico: tecnico.trim(), auxiliarTecnico: auxiliarTecnico.trim() })}>Salvar</button>}>
      <Field label="Nome do time"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Unidos da Vila" /></Field>
      <Field label="Emoji ou símbolo do time"><input style={S.input} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="⚽" maxLength={2} /></Field>
      <Field label="Cidade / bairro (opcional)"><input style={S.input} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: São Paulo, SP" /></Field>
      <Field label="Técnico (opcional)"><input style={S.input} value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nome do técnico" /></Field>
      <Field label="Auxiliar técnico (opcional)"><input style={S.input} value={auxiliarTecnico} onChange={(e) => setAuxiliarTecnico(e.target.value)} placeholder="Nome do auxiliar técnico" /></Field>
      <p style={S.helpText}>Esses dados ficam visíveis para todos que abrirem este app.</p>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div style={S.lineupLabel}>Backup dos dados</div>
        <button style={{ ...S.ghostBtn, width: "100%", justifyContent: "center", marginTop: 8 }} onClick={handleExport}>Exportar backup (.json)</button>
        <button style={{ ...S.ghostBtn, width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => fileInputRef.current?.click()}>Importar backup</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
        {importError && <p style={{ ...S.helpText, color: "var(--danger)" }}>{importError}</p>}
        <p style={S.helpText}>Exportar baixa um arquivo com todos os dados do time — jogadores, partidas, competições, adversários e campos. Guarde-o em local seguro. Importar substitui totalmente os dados atuais pelo conteúdo do arquivo.</p>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div style={S.lineupLabel}>Conta</div>
        <button style={{ ...S.ghostBtn, width: "100%", justifyContent: "center", marginTop: 8, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { onLogout(); onClose(); }}>
          <LogOut size={14} style={{ marginRight: 6 }} /> Sair da conta
        </button>
      </div>
    </ModalShell>
  );
}

function MatchStaffModal({ match, staffMembers, onCreateStaff, onClose, onSave }) {
  const [tecnicoId, setTecnicoId] = useState(match.tecnicoId || "");
  const [auxiliarTecnicoId, setAuxiliarTecnicoId] = useState(match.auxiliarTecnicoId || "");

  return (
    <ModalShell title="Comissão técnica da partida" onClose={onClose} footer={<button style={S.primaryBtn} onClick={() => onSave(tecnicoId || null, auxiliarTecnicoId || null)}>Salvar</button>}>
      <EntityPicker label="Técnico" items={staffMembers} valueId={tecnicoId} onChange={setTecnicoId} onCreate={onCreateStaff} placeholder="Nome do técnico" />
      <EntityPicker label="Auxiliar técnico" items={staffMembers} valueId={auxiliarTecnicoId} onChange={setAuxiliarTecnicoId} onCreate={onCreateStaff} placeholder="Nome do auxiliar técnico" />
      <p style={S.helpText}>Como a comissão pode mudar ao longo da temporada, isso fica registrado por partida — não é só uma configuração fixa do time.</p>
    </ModalShell>
  );
}

function EditMatchModal({ match, opponents, competitions, venues, onCreateOpponent, onCreateCompetition, onCreateVenue, onClose, onSave }) {
  const existingCompetition = competitions.find((c) => c.id === match.competitionId);
  const [date, setDate] = useState(match.date || "");
  const [time, setTime] = useState(match.time || "");
  const [opponentType, setOpponentType] = useState(match.opponentType || "cadastrado");
  const [opponentId, setOpponentId] = useState(match.opponentId || "");
  const [opponentName, setOpponentName] = useState(match.opponentName || "");
  const [competitionType, setCompetitionType] = useState(match.competitionType || existingCompetition?.type || "amistoso");
  const [competitionId, setCompetitionId] = useState(match.competitionId || "");
  const [homeAway, setHomeAway] = useState(match.homeAway || "casa");
  const [venueId, setVenueId] = useState(match.venueId || "");

  const needsCompetitionName = competitionType !== "amistoso";
  const opponentValid = opponentType === "cadastrado" ? !!opponentId : !!opponentName.trim();

  function handleTypeChange(next) {
    setCompetitionType(next);
    setCompetitionId("");
  }

  function save() {
    if (!date || !opponentValid) return;
    if (needsCompetitionName && !competitionId) return;
    onSave({
      ...match, date, time: time || "00:00",
      opponentType,
      opponentId: opponentType === "cadastrado" ? opponentId : null,
      opponentName: opponentType === "avulso" ? opponentName.trim() : null,
      competitionType, competitionId: competitionId || null, homeAway, venueId,
    });
  }

  return (
    <ModalShell title="Editar partida" onClose={onClose} footer={<button style={S.primaryBtn} onClick={save} disabled={!date || !opponentValid || (needsCompetitionName && !competitionId)}>Salvar alterações</button>}>
      <OpponentField
        opponentType={opponentType} setOpponentType={setOpponentType}
        opponentId={opponentId} setOpponentId={setOpponentId}
        opponentName={opponentName} setOpponentName={setOpponentName}
        opponents={opponents} onCreateOpponent={onCreateOpponent}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Data"><input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Horário (opcional)"><input style={S.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Tipo de partida">
        <select style={S.input} value={competitionType} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="oficial">Oficial</option>
          <option value="amistoso">Amistoso</option>
          <option value="festival">Festival</option>
        </select>
      </Field>
      {needsCompetitionName && (
        <CompetitionPicker competitions={competitions} type={competitionType} valueId={competitionId} onChange={setCompetitionId} onCreate={onCreateCompetition} />
      )}
      <Field label="Mandante">
        <select style={S.input} value={homeAway} onChange={(e) => setHomeAway(e.target.value)}>
          <option value="casa">Em casa</option><option value="fora">Fora</option><option value="neutro">Campo neutro</option>
        </select>
      </Field>
      <EntityPicker label="Campo / local (opcional)" items={venues} valueId={venueId} onChange={setVenueId} onCreate={onCreateVenue} placeholder="Ex: Campo do Bosque" />
      <p style={S.helpText}>Escalação, eventos, mídias e placar continuam intactos — isso só ajusta os dados básicos da partida.</p>
    </ModalShell>
  );
}

function AddMatchModal({ opponents, competitions, venues, onCreateOpponent, onCreateCompetition, onCreateVenue, onClose, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [opponentType, setOpponentType] = useState("cadastrado");
  const [opponentId, setOpponentId] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [competitionType, setCompetitionType] = useState("amistoso");
  const [competitionId, setCompetitionId] = useState("");
  const [homeAway, setHomeAway] = useState("casa");
  const [venueId, setVenueId] = useState("");

  const needsCompetitionName = competitionType !== "amistoso";
  const opponentValid = opponentType === "cadastrado" ? !!opponentId : !!opponentName.trim();

  function handleTypeChange(next) {
    setCompetitionType(next);
    setCompetitionId("");
  }

  function save() {
    if (!date || !opponentValid) return;
    if (needsCompetitionName && !competitionId) return;
    onSave({
      id: uid(), date, time: time || "00:00",
      opponentType,
      opponentId: opponentType === "cadastrado" ? opponentId : null,
      opponentName: opponentType === "avulso" ? opponentName.trim() : null,
      competitionType, competitionId: competitionId || null, homeAway, venueId,
      status: "agendado", scoreTeam: null, scoreOpponent: null,
      lineup: { formation: "4-4-2", slots: {}, bench: [] }, events: [], media: [], tecnicoId: null, auxiliarTecnicoId: null,
    });
  }

  return (
    <ModalShell title="Nova partida" onClose={onClose} footer={<button style={S.primaryBtn} onClick={save} disabled={!date || !opponentValid || (needsCompetitionName && !competitionId)}>Salvar partida</button>}>
      <OpponentField
        opponentType={opponentType} setOpponentType={setOpponentType}
        opponentId={opponentId} setOpponentId={setOpponentId}
        opponentName={opponentName} setOpponentName={setOpponentName}
        opponents={opponents} onCreateOpponent={onCreateOpponent}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Data"><input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Horário (opcional)"><input style={S.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Tipo de partida">
        <select style={S.input} value={competitionType} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="oficial">Oficial</option>
          <option value="amistoso">Amistoso</option>
          <option value="festival">Festival</option>
        </select>
      </Field>
      {needsCompetitionName && (
        <CompetitionPicker competitions={competitions} type={competitionType} valueId={competitionId} onChange={setCompetitionId} onCreate={onCreateCompetition} />
      )}
      <Field label="Mandante">
        <select style={S.input} value={homeAway} onChange={(e) => setHomeAway(e.target.value)}>
          <option value="casa">Em casa</option><option value="fora">Fora</option><option value="neutro">Campo neutro</option>
        </select>
      </Field>
      <EntityPicker label="Campo / local (opcional)" items={venues} valueId={venueId} onChange={setVenueId} onCreate={onCreateVenue} placeholder="Ex: Campo do Bosque" />
    </ModalShell>
  );
}

function AddPlayerModal({ player, onClose, onSave }) {
  const existingPositions = getPositions(player);
  const [name, setName] = useState(player?.name || "");
  const [fullName, setFullName] = useState(player?.fullName || "");
  const [photoUrl, setPhotoUrl] = useState(player?.photoUrl || "");
  const [birthDate, setBirthDate] = useState(player?.birthDate || "");
  const [resident, setResident] = useState(player?.resident ?? "");
  const [preferredFoot, setPreferredFoot] = useState(player?.preferredFoot || "");
  const [number, setNumber] = useState(player?.number ?? "");
  const [mainPosition, setMainPosition] = useState(existingPositions[0] || POSICOES[0]);
  const [secondary, setSecondary] = useState(existingPositions.slice(1));
  const [ativo, setAtivo] = useState(player?.ativo !== false);

  function toggleSecondary(pos) {
    setSecondary((s) => s.includes(pos) ? s.filter((x) => x !== pos) : [...s, pos]);
  }
  function save() {
    if (!name.trim()) return;
    onSave({
      id: player?.id || uid(), name: name.trim(), fullName: fullName.trim(),
      photoUrl: photoUrl.trim() || null,
      birthDate: birthDate || null, resident: resident === "" ? null : resident === "sim",
      preferredFoot: preferredFoot || null,
      number: number === "" ? null : Number(number),
      positions: [mainPosition, ...secondary.filter((p) => p !== mainPosition)], ativo,
    });
  }

  return (
    <ModalShell title={player ? "Editar jogador" : "Novo jogador"} onClose={onClose} footer={<button style={S.primaryBtn} onClick={save}>Salvar</button>}>
      <Field label="Nome (usado no app)"><input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cebola" /></Field>
      <Field label="Nome completo (opcional)"><input style={S.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo pra súmula/documentos" /></Field>
      <Field label="Foto de perfil (link, opcional)">
        <input style={S.input} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://... (Drive, Postimages etc.)" />
        <p style={S.helpText}>Mesma lógica das fotos de partida: cole o link de uma imagem já hospedada. Se não carregar, o app volta a mostrar só o número da camisa.</p>
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Número"><input style={S.input} type="number" min="0" max="99" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="10" /></Field>
        <Field label="Posição principal">
          <select style={S.input} value={mainPosition} onChange={(e) => setMainPosition(e.target.value)}>{POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </Field>
      </div>
      <Field label="Posições secundárias (opcional)">
        {POSICOES.filter((p) => p !== mainPosition).map((p) => (
          <label key={p} style={S.positionCheckRow}>
            <input type="checkbox" checked={secondary.includes(p)} onChange={() => toggleSecondary(p)} />
            {p}
          </label>
        ))}
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Nascimento (opcional)"><input style={S.input} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Field>
        <Field label="Pé preferido (opcional)">
          <select style={S.input} value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)}>
            <option value="">Não informado</option>
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
            <option value="ambidestro">Ambidestro</option>
          </select>
        </Field>
      </div>
      <Field label="Residente no município (opcional)">
        <select style={S.input} value={resident} onChange={(e) => setResident(e.target.value)}>
          <option value="">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
        <p style={S.helpText}>Só aparece no perfil do jogador — útil pra conferir o limite de não residentes de campeonatos municipais, mas o app não aplica nenhuma regra automaticamente.</p>
      </Field>
      {player && (
        <Field label="Situação no elenco">
          <label style={S.positionCheckRow}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Faz parte do elenco atual (temporada vigente)
          </label>
          <p style={S.helpText}>Desmarcado, ele some da lista principal do Elenco, mas continua disponível pra escalar em partidas (inclusive antigas) e mantém todo o histórico de estatísticas.</p>
        </Field>
      )}
    </ModalShell>
  );
}

function ScoreModal({ match, getOpponentName, onClose, onSave }) {
  const [scoreTeam, setScoreTeam] = useState(match.scoreTeam ?? 0);
  const [scoreOpponent, setScoreOpponent] = useState(match.scoreOpponent ?? 0);
  return (
    <ModalShell title="Resultado da partida" onClose={onClose} footer={<button style={S.primaryBtn} onClick={() => onSave(Number(scoreTeam) || 0, Number(scoreOpponent) || 0)}>Salvar resultado</button>}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", margin: "10px 0 18px" }}>
        <div style={{ textAlign: "center" }}><div style={S.dimText}>Nosso time</div><input style={S.scoreInput} type="number" min="0" value={scoreTeam} onChange={(e) => setScoreTeam(e.target.value)} /></div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-dim)" }}>×</div>
        <div style={{ textAlign: "center" }}><div style={S.dimText}>{getOpponentName(match)}</div><input style={S.scoreInput} type="number" min="0" value={scoreOpponent} onChange={(e) => setScoreOpponent(e.target.value)} /></div>
      </div>
    </ModalShell>
  );
}

function PenaltyShootoutModal({ match, players, onClose, onSave }) {
  const [ourKicks, setOurKicks] = useState((match.penaltyShootout?.ourKicks || []).map((k) => ({ ...k })));
  const [opponentKicks, setOpponentKicks] = useState((match.penaltyShootout?.opponentKicks || []).map((k) => ({ ...k })));

  function addOurKick() { setOurKicks([...ourKicks, { id: uid(), playerId: players[0]?.id || "", scored: true }]); }
  function updateOurKick(id, field, value) { setOurKicks(ourKicks.map((k) => (k.id === id ? { ...k, [field]: value } : k))); }
  function removeOurKick(id) { setOurKicks(ourKicks.filter((k) => k.id !== id)); }

  function addOpponentKick() { setOpponentKicks([...opponentKicks, { id: uid(), result: "gol" }]); }
  function updateOpponentKick(id, value) { setOpponentKicks(opponentKicks.map((k) => (k.id === id ? { ...k, result: value } : k))); }
  function removeOpponentKick(id) { setOpponentKicks(opponentKicks.filter((k) => k.id !== id)); }

  const ourScore = ourKicks.filter((k) => k.scored).length;
  const theirScore = opponentKicks.filter((k) => k.result === "gol").length;

  return (
    <ModalShell title="Disputa de pênaltis" onClose={onClose} footer={<button style={S.primaryBtn} onClick={() => onSave({ ourKicks, opponentKicks })}>Salvar disputa</button>}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 600 }}>
          {ourScore} <span style={{ color: "var(--text-dim)", fontSize: 22 }}>x</span> {theirScore}
        </div>
        <div style={S.dimText}>Placar da disputa</div>
      </div>

      <div style={S.lineupLabel}>Nosso time</div>
      {ourKicks.length === 0 ? (
        <p style={S.helpText}>Nenhuma cobrança registrada ainda.</p>
      ) : ourKicks.map((k, i) => (
        <div key={k.id} style={S.penaltyRow}>
          <span style={S.dimText}>{i + 1}</span>
          <select style={{ ...S.input, flex: 1 }} value={k.playerId} onChange={(e) => updateOurKick(k.id, "playerId", e.target.value)}>
            {players.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
          </select>
          <button style={{ ...S.penaltyToggle, background: k.scored ? "var(--turf-dim)" : "var(--surface-2)" }} onClick={() => updateOurKick(k.id, "scored", !k.scored)}>
            {k.scored ? "✅" : "❌"}
          </button>
          <button style={S.smallIconBtn} onClick={() => removeOurKick(k.id)}><Trash2 size={14} color="var(--text-dim)" /></button>
        </div>
      ))}
      <button style={{ ...S.ghostBtnSmall, width: "100%", padding: "8px 0", marginTop: 4 }} onClick={addOurKick}>+ Adicionar cobrança</button>

      <div style={{ ...S.lineupLabel, marginTop: 20 }}>Adversário</div>
      {opponentKicks.length === 0 ? (
        <p style={S.helpText}>Nenhuma cobrança registrada ainda.</p>
      ) : opponentKicks.map((k, i) => (
        <div key={k.id} style={S.penaltyRow}>
          <span style={S.dimText}>{i + 1}</span>
          <select style={{ ...S.input, flex: 1 }} value={k.result} onChange={(e) => updateOpponentKick(k.id, e.target.value)}>
            <option value="gol">Gol</option>
            <option value="perdida">Perdida / pra fora</option>
            <option value="defendida">Defendida pelo goleiro</option>
          </select>
          <button style={S.smallIconBtn} onClick={() => removeOpponentKick(k.id)}><Trash2 size={14} color="var(--text-dim)" /></button>
        </div>
      ))}
      <button style={{ ...S.ghostBtnSmall, width: "100%", padding: "8px 0", marginTop: 4 }} onClick={addOpponentKick}>+ Adicionar cobrança</button>
      <p style={S.helpText}>Como não temos o elenco do adversário, as cobranças deles ficam sem nome — só o resultado de cada uma.</p>
    </ModalShell>
  );
}

function EscalacaoModal({ match, players, onClose, onSave }) {
  const [formation, setFormation] = useState(match.lineup?.formation || "4-4-2");
  const [slots, setSlots] = useState(match.lineup?.slots || {});
  const [bench, setBench] = useState(match.lineup?.bench || []);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [pendingFormation, setPendingFormation] = useState(null);
  const [captainId, setCaptainId] = useState(match.lineup?.captainId || "");

  function playerById(id) { return players.find((p) => p.id === id); }
  const layout = FORMATIONS[formation];

  function changeFormation(next) {
    if (Object.keys(slots).length > 0) {
      setPendingFormation(next);
      return;
    }
    setFormation(next); setSlots({}); setActiveSlotId(null);
  }
  function confirmChangeFormation() {
    setFormation(pendingFormation); setSlots({}); setActiveSlotId(null); setPendingFormation(null);
  }
  function assignToSlot(playerId) {
    const next = { ...slots };
    Object.keys(next).forEach((k) => { if (next[k] === playerId) delete next[k]; });
    next[activeSlotId] = playerId;
    setSlots(next);
    setBench(bench.filter((id) => id !== playerId));
    setActiveSlotId(null);
  }
  function removeFromSlot() {
    const next = { ...slots };
    delete next[activeSlotId];
    setSlots(next);
    setActiveSlotId(null);
  }
  function toggleBench(playerId) {
    setBench((b) => b.includes(playerId) ? b.filter((id) => id !== playerId) : [...b, playerId]);
  }
  function matchesRole(p, slotId) {
    const slot = layout.find((s) => s.id === slotId);
    if (!slot) return false;
    return getPositions(p).includes(ROLE_TO_POSITION[slot.role]);
  }

  const activeSlotInfo = activeSlotId ? layout.find((s) => s.id === activeSlotId) : null;
  const availableForSlot = activeSlotId
    ? [...players].sort((a, b) => Number(matchesRole(b, activeSlotId)) - Number(matchesRole(a, activeSlotId)) || (a.number ?? 99) - (b.number ?? 99))
    : [];
  const benchCandidates = players.filter((p) => !Object.values(slots).includes(p.id));
  const squadIds = [...Object.values(slots), ...bench];
  const squadCandidates = players.filter((p) => squadIds.includes(p.id));

  return (
    <ModalShell title="Escalação em campo" onClose={onClose} footer={<button style={S.primaryBtn} onClick={() => onSave({ formation, slots, bench, captainId: captainId || null })}>Salvar escalação</button>}>
      <Field label="Formação">
        <select style={S.input} value={formation} onChange={(e) => changeFormation(e.target.value)}>
          {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      {pendingFormation && (
        <div style={S.assignPanel}>
          <p style={{ fontSize: 13, marginBottom: 10 }}>Trocar a formação limpa as posições já escaladas em campo. Continuar?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.ghostBtnSmall, flex: 1, padding: "8px 0" }} onClick={() => setPendingFormation(null)}>Cancelar</button>
            <button style={{ ...S.primaryBtn, flex: 1, marginTop: 0, background: "var(--danger)" }} onClick={confirmChangeFormation}>Trocar</button>
          </div>
        </div>
      )}

      <p style={S.helpText}>Toque em uma posição do campo para escalar um jogador.</p>
      <Pitch formation={formation} slots={slots} playersById={playerById} activeSlotId={activeSlotId} onSlotClick={setActiveSlotId} captainId={captainId} />

      {activeSlotId && (
        <div style={S.assignPanel}>
          <div style={S.assignHeader}>
            <span>Escalar para {activeSlotInfo ? ROLE_TO_POSITION[activeSlotInfo.role] : ""}</span>
            <button style={S.smallIconBtn} onClick={() => setActiveSlotId(null)}><X size={14} color="var(--text-dim)" /></button>
          </div>
          {slots[activeSlotId] && <button style={S.removeSlotBtn} onClick={removeFromSlot}>Remover jogador desta posição</button>}
          <div style={S.assignList}>
            {availableForSlot.length === 0 ? (
              <EmptyState text="Cadastre jogadores no Elenco antes de escalar o time." />
            ) : availableForSlot.map((p) => (
              <button key={p.id} style={S.assignRow} onClick={() => assignToSlot(p.id)}>
                <JerseyBadge number={p.number} size={26} />
                <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
                {matchesRole(p, activeSlotId) && <span style={S.suggestedTag}>Sugerido</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...S.lineupLabel, marginTop: 18 }}>Banco / demais jogadores</div>
      {benchCandidates.length === 0 ? (
        <EmptyState text="Todos os jogadores do elenco já estão em campo." />
      ) : groupPlayersByPosition(benchCandidates).map((g) => (
        <div key={g.label}>
          <div style={S.benchGroupLabel}>{g.label}</div>
          {g.players.map((p) => (
            <button key={p.id} style={S.lineupPickRow} onClick={() => toggleBench(p.id)}>
              <JerseyBadge number={p.number} size={28} muted={!bench.includes(p.id)} />
              <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
              <span style={{ ...S.pill, background: bench.includes(p.id) ? "var(--surface-2)" : "transparent", color: "var(--text-dim)", border: bench.includes(p.id) ? "none" : "1px solid var(--line)" }}>
                {bench.includes(p.id) ? "No banco" : "Fora"}
              </span>
            </button>
          ))}
        </div>
      ))}

      <Field label="Capitão 🅲 (opcional)">
        <select style={S.input} value={captainId} onChange={(e) => setCaptainId(e.target.value)}>
          <option value="">Sem capitão definido</option>
          {squadCandidates.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
        </select>
      </Field>
    </ModalShell>
  );
}

function AddEventModal({ match, players, event, onClose, onSave }) {
  const starterIds = Object.values(match.lineup?.slots || {}).filter(Boolean);
  const priorSubs = (match.events || [])
    .filter((e) => e.type === "substituicao" && e.id !== event?.id)
    .sort((a, b) => eventSortValue(a) - eventSortValue(b));
  const currentOnFieldSet = new Set(starterIds);
  priorSubs.forEach((e) => {
    if (e.playerOutId) currentOnFieldSet.delete(e.playerOutId);
    if (e.playerInId) currentOnFieldSet.add(e.playerInId);
  });
  const onFieldIds = Array.from(currentOnFieldSet);
  const lineupIds = [...onFieldIds, ...(match.lineup?.bench || [])];
  const options = lineupIds.length > 0 ? players.filter((p) => lineupIds.includes(p.id)) : players;
  const outOptions = players.filter((p) => onFieldIds.includes(p.id) || p.id === event?.playerOutId);
  const gkId = match.lineup?.slots?.gk;
  const gkOptions = gkId ? players.filter((p) => p.id === gkId) : (players.filter((p) => getPositions(p).includes("Goleiro")).length > 0 ? players.filter((p) => getPositions(p).includes("Goleiro")) : options);

  const [type, setType] = useState(event?.type || "gol");
  const [playerId, setPlayerId] = useState(event && event.type !== "penaltidefendido" ? (event.playerId || "") : (options[0]?.id || ""));
  const [assistId, setAssistId] = useState(event?.assistId || "");
  const [golType, setGolType] = useState(event?.golType || "");
  const [playerOutId, setPlayerOutId] = useState(event?.playerOutId || outOptions[0]?.id || "");
  const [playerInId, setPlayerInId] = useState(event?.playerInId || "");
  const [goalkeeperId, setGoalkeeperId] = useState(event?.type === "penaltidefendido" ? (event.playerId || "") : (gkOptions[0]?.id || ""));
  const [note, setNote] = useState(event?.note || "");
  const [period, setPeriod] = useState(event?.period || "");
  const [minute, setMinute] = useState(event?.minute ?? "");

  const inOptions = players.filter((p) => (!onFieldIds.includes(p.id) || p.id === event?.playerInId) && p.id !== playerOutId);
  const needsPlayer = type === "gol" || type === "amarelo" || type === "vermelho" || type === "substituicao";

  const isValid = type === "substituicao" ? (playerOutId && playerInId && playerOutId !== playerInId)
    : type === "golcontra" || type === "gol_adversario" ? true
    : type === "penaltidefendido" ? !!goalkeeperId
    : !!playerId;

  function save() {
    if (!isValid) return;
    onSave({
      id: event?.id || uid(), type,
      playerId: type === "gol" || type === "amarelo" || type === "vermelho" ? playerId : type === "penaltidefendido" ? goalkeeperId : null,
      assistId: type === "gol" && assistId ? assistId : null,
      golType: (type === "gol" || type === "gol_adversario") && golType ? golType : null,
      playerOutId: type === "substituicao" ? playerOutId : null,
      playerInId: type === "substituicao" ? playerInId : null,
      note: (type === "golcontra" || type === "gol_adversario") && note.trim() ? note.trim() : null,
      period: period || null,
      minute: minute === "" ? null : Math.max(0, Math.min(120, Number(minute))),
    });
  }

  return (
    <ModalShell title={event ? "Editar evento" : "Adicionar evento"} onClose={onClose} footer={<button style={S.primaryBtn} onClick={save} disabled={!isValid}>{event ? "Salvar alterações" : "Adicionar"}</button>}>
      <Field label="Tipo de evento">
        <select style={S.input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="gol">Gol nosso</option>
          <option value="gol_adversario">Gol do adversário</option>
          <option value="golcontra">Gol contra (a favor)</option>
          <option value="amarelo">Cartão amarelo</option>
          <option value="vermelho">Cartão vermelho</option>
          <option value="substituicao">Substituição</option>
          <option value="penaltidefendido">Pênalti defendido</option>
        </select>
      </Field>

      {needsPlayer && options.length === 0 ? (
        <EmptyState text="Cadastre jogadores no Elenco antes de registrar esse tipo de evento." />
      ) : (
        <>
          {(type === "gol" || type === "amarelo" || type === "vermelho") && (
            <Field label={type === "gol" ? "Autor do gol" : "Jogador"}>
              <select style={S.input} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                {options.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
              </select>
            </Field>
          )}

          {(type === "gol" || type === "gol_adversario") && (
            <Field label="Tipo do gol (opcional)">
              <select style={S.input} value={golType} onChange={(e) => setGolType(e.target.value)}>
                <option value="">Gol normal</option>
                {GOAL_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          )}
          {type === "gol" && (
            <Field label="Assistência (opcional)">
              <select style={S.input} value={assistId} onChange={(e) => setAssistId(e.target.value)}>
                <option value="">Sem assistência</option>
                {options.filter((p) => p.id !== playerId).map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
              </select>
            </Field>
          )}

          {type === "substituicao" && (
            <>
              <Field label="Sai de campo">
                <select style={S.input} value={playerOutId} onChange={(e) => setPlayerOutId(e.target.value)}>
                  {outOptions.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
                </select>
              </Field>
              <Field label="Entra em campo">
                <select style={S.input} value={playerInId} onChange={(e) => setPlayerInId(e.target.value)}>
                  <option value="">Selecionar…</option>
                  {inOptions.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
                </select>
              </Field>
            </>
          )}

          {type === "penaltidefendido" && (
            <Field label="Goleiro">
              <select style={S.input} value={goalkeeperId} onChange={(e) => setGoalkeeperId(e.target.value)}>
                {gkOptions.map((p) => <option key={p.id} value={p.id}>#{p.number ?? "-"} {p.name}</option>)}
              </select>
            </Field>
          )}
        </>
      )}

      {type === "golcontra" && (
        <Field label="Observação (opcional)">
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: zagueiro nº5 do adversário" />
        </Field>
      )}
      {type === "golcontra" && (
        <p style={S.helpText}>Esse gol conta como ponto para o nosso time no placar, sem entrar nas estatísticas pessoais de nenhum jogador nosso.</p>
      )}
      {type === "gol_adversario" && (
        <Field label="Observação (opcional)">
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: camisa 9 deles" />
        </Field>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Tempo (opcional)">
          <select style={S.input} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">Não especificado</option>
            <option value="1">1º tempo</option>
            <option value="2">2º tempo</option>
          </select>
        </Field>
        <Field label="Minuto (opcional)">
          <input style={S.input} type="number" min="0" max="120" value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="Se souber" />
        </Field>
      </div>
      <p style={S.helpText}>Não lembra o minuto exato? Sem problema — só marcar o tempo já ajuda a contar a história da partida.</p>
    </ModalShell>
  );
}

function toDirectImageUrl(url) {
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/) || trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  if (trimmed.includes("dropbox.com") && trimmed.includes("dl=0")) return trimmed.replace("dl=0", "raw=1");
  return trimmed;
}

function AddMediaModal({ players, onClose, onSave }) {
  const [type, setType] = useState("foto");
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [taggedPlayerIds, setTaggedPlayerIds] = useState([]);
  const isDrive = url.includes("drive.google.com");
  function toggleTag(playerId) {
    setTaggedPlayerIds((ids) => ids.includes(playerId) ? ids.filter((id) => id !== playerId) : [...ids, playerId]);
  }
  function save() {
    if (!url.trim()) return;
    const finalUrl = type === "foto" ? toDirectImageUrl(url) : url.trim();
    onSave({ id: uid(), type, url: finalUrl, sourceUrl: sourceUrl.trim() || null, caption: caption.trim(), taggedPlayerIds });
  }
  return (
    <ModalShell title="Adicionar mídia" onClose={onClose} footer={<button style={S.primaryBtn} onClick={save} disabled={!url.trim()}>Adicionar</button>}>
      <Field label="Tipo">
        <select style={S.input} value={type} onChange={(e) => setType(e.target.value)}><option value="foto">Foto</option><option value="video">Vídeo</option></select>
      </Field>
      <Field label={type === "foto" ? "Link da miniatura (imagem direta)" : "Link do vídeo"}>
        <input style={S.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </Field>
      {type === "foto" && isDrive && (
        <p style={{ ...S.helpText, color: "var(--amber)" }}>
          Detectei um link do Google Drive — vou convertê-lo para exibição direta. Para funcionar, o arquivo precisa estar compartilhado como "Qualquer pessoa com o link pode visualizar".
        </p>
      )}
      {type === "foto" && (
        <Field label="Link da pasta ou álbum de origem (opcional)">
          <input style={S.input} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Ex: link da pasta no Drive ou álbum do Google Fotos" />
        </Field>
      )}
      <Field label="Legenda (opcional)"><input style={S.input} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex: Gol do título" /></Field>
      <Field label="Marcar jogadores (opcional)">
        {players.length === 0 ? (
          <p style={S.helpText}>Nenhum jogador cadastrado ainda.</p>
        ) : (
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {players.map((p) => (
              <label key={p.id} style={S.positionCheckRow}>
                <input type="checkbox" checked={taggedPlayerIds.includes(p.id)} onChange={() => toggleTag(p.id)} />
                #{p.number ?? "-"} {p.name}
              </label>
            ))}
          </div>
        )}
      </Field>
      <p style={S.helpText}>
        A miniatura precisa ser um link de imagem direta — Imgur ou Postimages costumam ser mais confiáveis que o Drive para isso.
        {type === "foto" ? " Se preencher o link da pasta/álbum, tocar na foto leva pra lá; senão, leva para o próprio link da miniatura." : ""}
      </p>
    </ModalShell>
  );
}

/* ---------- Style block ---------- */
function StyleBlock() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Manrope:wght@400;500;600;800&display=swap');
      :root {
        --bg: #0A0A0A; --surface: #161616; --surface-2: #202020; --line: #2C2C2C;
        --turf: #D4AF37; --turf-dim: rgba(212,175,55,0.18);
        --amber: #F2B134; --amber-dim: rgba(242,177,52,0.16);
        --amistoso: #A87FE0; --amistoso-dim: rgba(168,127,224,0.18);
        --festival: #59A8C9; --festival-dim: rgba(89,168,201,0.16);
        --danger: #E3584A; --text: #F5F5F3; --text-dim: #9A9A9A;
        --pitch: #173D22; --pitch-line: rgba(241,243,239,0.32);
        --font-display: 'Teko', sans-serif; --font-body: 'Manrope', sans-serif;
      }
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; margin: 0; overflow: hidden; }
      .app-shell { height: 100vh; }
      @supports (height: 100dvh) { .app-shell { height: 100dvh; } }
      input, select { font-family: var(--font-body); }
      input::placeholder { color: var(--text-dim); }
      input:focus, select:focus { outline: none; border-color: var(--turf); }
      select { -webkit-appearance: none; appearance: none; }
      button { font-family: var(--font-body); cursor: pointer; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      ::-webkit-scrollbar { display: none; }
    `}</style>
  );
}

/* ---------- Inline style objects ---------- */
const S = {
  appShell: { width: "100%", maxWidth: 460, margin: "0 auto", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)", height: "100vh", borderRadius: 16, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" },
  center: { display: "flex", alignItems: "center", justifyContent: "center" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px", borderBottom: "1px solid var(--line)" },
  headerEmoji: { width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 },
  headerTitle: { fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1, fontWeight: 600 },
  headerSub: { fontSize: 11, color: "var(--text-dim)", marginTop: 2 },
  iconBtn: { background: "transparent", border: "none", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  smallIconBtn: { background: "transparent", border: "none", padding: 5, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, overflowY: "auto", padding: "4px 16px 90px" },
  filterRow: { display: "flex", gap: 8, marginTop: 10, marginBottom: 4 },
  filterSelect: { flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 8px", color: "var(--text)", fontSize: 12.5 },
  searchInput: { width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 12px", color: "var(--text)", fontSize: 13.5 },
  searchDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, zIndex: 10, maxHeight: 260, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" },
  searchGroupLabel: { fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 12px 4px" },
  searchOption: { width: "100%", display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: "8px 12px", color: "var(--text)", fontSize: 13, textAlign: "left" },
  playerFilterChip: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--turf-dim)", color: "var(--turf)", border: "1px solid var(--turf)", borderRadius: 999, padding: "4px 6px 4px 12px", fontSize: 12, fontWeight: 600, marginTop: 8 },
  h2hCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginTop: 12 },
  h2hTitle: { fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 0 10px" },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.6 },
  sectionAction: { background: "transparent", border: "none", color: "var(--turf)", fontSize: 13, fontWeight: 600 },
  emptyState: { padding: "22px 16px", borderRadius: 12, border: "1px dashed var(--line)", color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.5, textAlign: "center" },
  matchCard: { display: "block", width: "100%", textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderTop: "2px dashed var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 10, color: "var(--text)" },
  matchCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  matchCardDate: { fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" },
  matchCardMain: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  matchCardTeam: { fontSize: 15.5, fontWeight: 600 },
  matchCardVs: { fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-dim)" },
  scoreDigits: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--text)", letterSpacing: 1 },
  scoreDash: { color: "var(--text-dim)", margin: "0 4px" },
  penaltyCardNote: { fontSize: 10.5, color: "var(--text-dim)", marginTop: 1 },
  playerCompGroupHeader: { marginBottom: 8 },
  playerMatchRow: { display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" },
  playerMatchDate: { fontSize: 11, color: "var(--text-dim)", width: 44, flexShrink: 0 },
  compBadge: { width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  benchTag: { fontSize: 9.5, fontWeight: 700, color: "var(--text-dim)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 6px", textTransform: "uppercase", flexShrink: 0 },
  playerMatchOpponent: { flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  playerMatchScore: { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" },
  playerMatchPen: { fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-body)" },
  matchCardBottom: { display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--text-dim)" },
  pill: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4, display: "inline-block" },
  detailTopBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 4 },
  scoreboard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 },
  scoreboardRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 10 },
  scoreboardTeam: { fontSize: 14.5, fontWeight: 600, maxWidth: 110, textAlign: "center" },
  scoreboardTeamBtn: { fontSize: 14.5, fontWeight: 600, maxWidth: 110, textAlign: "center", background: "transparent", border: "none", color: "var(--text)", padding: 0, fontFamily: "var(--font-body)" },
  playerLink: { cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--line)", textUnderlineOffset: 2 },
  scoreboardDigits: { fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, letterSpacing: 1 },
  scoreboardVs: { fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-dim)" },
  scoreboardMeta: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-dim)", marginTop: 2 },
  primaryBtn: { marginTop: 14, background: "var(--turf)", color: "var(--bg)", border: "none", padding: "11px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, width: "100%" },
  ghostBtn: { marginTop: 14, background: "transparent", color: "var(--turf)", border: "1px solid var(--turf)", padding: "9px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center" },
  whatsappBtn: { flex: 1, background: "#25D366", color: "#08150E", border: "none", padding: "11px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 },
  ghostBtnSmall: { background: "transparent", border: "1px solid var(--turf)", color: "var(--turf)", borderRadius: 8, padding: "0 12px", fontSize: 13, fontWeight: 600 },
  segmentBtn: { flex: 1, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: 8, padding: "8px 4px", fontSize: 12.5, fontWeight: 600 },
  segmentBtnActive: { background: "var(--turf-dim)", border: "1px solid var(--turf)", color: "var(--turf)" },
  card: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" },
  lineupLabel: { fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  lineupGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  lineupChip: { display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", padding: "4px 10px 4px 4px", borderRadius: 999, fontSize: 12.5 },
  lineupPickRow: { width: "100%", display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", borderBottom: "1px solid var(--line)", padding: "10px 2px", color: "var(--text)" },
  eventRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" },
  eventMinute: { fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-dim)", width: 42, flexShrink: 0 },
  eventIcon: { fontSize: 16, flexShrink: 0 },
  eventMain: { fontSize: 13.5, fontWeight: 600 },
  eventSub: { fontSize: 11.5, color: "var(--text-dim)" },
  cardChip: { width: 12, height: 16, borderRadius: 2, flexShrink: 0 },
  mediaCard: { marginBottom: 12 },
  mediaImg: { width: "100%", borderRadius: 10, display: "block" },
  mediaCaption: { fontSize: 12, color: "var(--text-dim)", marginTop: 4 },
  mediaTagRow: { fontSize: 12, marginTop: 6 },
  taggedPhotoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 },
  taggedPhotoItem: { borderRadius: 10, overflow: "hidden" },
  taggedPhotoCaption: { fontSize: 11, color: "var(--text-dim)", padding: "5px 2px 0" },
  mediaVideoRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, color: "var(--text)", textDecoration: "none", fontSize: 13.5 },
  mediaFallback: { display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--surface-2)", border: "1px dashed var(--line)", borderRadius: 10, color: "var(--text-dim)", textDecoration: "none", fontSize: 12.5, lineHeight: 1.4 },
  playerGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  positionGroup: { marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" },
  positionGroupLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  inactiveToggle: { background: "transparent", border: "none", color: "var(--text-dim)", fontSize: 12.5, fontWeight: 600, padding: 0, textAlign: "left", width: "100%" },
  benchGroupLabel: { fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, margin: "10px 0 6px" },
  staffGrid: { display: "flex", flexDirection: "column", gap: 12 },
  staffRow: { display: "flex", alignItems: "center", gap: 10 },
  infoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 },
  staffAvatar: { width: 34, height: 34, borderRadius: "50%", background: "var(--surface-2)", border: "1.5px solid var(--amber)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, flexShrink: 0 },
  playerCard: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 12px" },
  playerName: { fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  playerPos: { fontSize: 10.5, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  playerStatsRow: { display: "flex", gap: 8, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 8 },
  playerListRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" },
  playerListStats: { fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "nowrap", marginRight: 2 },
  legendBox: { display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 20, paddingTop: 14, borderTop: "1px dashed var(--line)", fontSize: 11, color: "var(--text-dim)" },
  statMini: { flex: 1, textAlign: "center" },
  statMiniValue: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 },
  statMiniLabel: { fontSize: 10, color: "var(--text-dim)" },
  recordGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 },
  recordCell: { textAlign: "center" },
  recordValue: { fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600 },
  recordLabel: { fontSize: 10.5, color: "var(--text-dim)" },
  rankRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" },
  goalkeeperHeaderRow: { display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid var(--line)" },
  goalkeeperHeaderLabel: { width: 56, textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.4 },
  goalkeeperRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" },
  goalkeeperValue: { width: 56, textAlign: "center", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 },
  standingsHeaderRow: { display: "flex", alignItems: "center", gap: 4, paddingBottom: 8, marginBottom: 4, borderBottom: "1px solid var(--line)" },
  standingsPosCol: { width: 20, textAlign: "center", fontSize: 11, color: "var(--text-dim)" },
  standingsCol: { width: 30, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" },
  standingsRow: { display: "flex", alignItems: "center", gap: 4, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 },
  standingsEditRow: { paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--line)" },
  standingsUsCard: { background: "var(--turf-dim)", border: "1px solid var(--turf)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 },
  standingsEditGrid: { display: "flex", gap: 6, flexWrap: "wrap" },
  standingsNumField: { width: 42 },
  standingsNumLabel: { display: "block", fontSize: 9.5, color: "var(--text-dim)", textAlign: "center", marginBottom: 3, textTransform: "uppercase" },
  standingsNumInput: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 2px", color: "var(--text)", fontSize: 13, textAlign: "center" },
  rankNumber: { fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-dim)", width: 18, flexShrink: 0 },
  rankValue: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, whiteSpace: "nowrap" },
  dimText: { color: "var(--text-dim)", fontSize: 12 },
  fab: { position: "absolute", bottom: 78, right: 18, width: 52, height: 52, borderRadius: "50%", background: "var(--turf)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.35)" },
  bottomNav: { display: "flex", borderTop: "1px solid var(--line)", background: "var(--surface)", padding: "8px 6px calc(env(safe-area-inset-bottom, 0px) + 8px)" },
  navBtn: { flex: 1, background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" },
  navLabel: { fontSize: 10.5, fontWeight: 600 },
  modalOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 },
  modalSheet: { width: "100%", maxHeight: "88%", background: "var(--surface)", borderTopLeftRadius: 18, borderTopRightRadius: 18, display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderBottom: "none" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: "1px solid var(--line)" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 },
  modalBody: { padding: "16px 18px", overflowY: "auto" },
  modalFooter: { padding: "12px 18px 18px", borderTop: "1px solid var(--line)" },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 },
  input: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 11px", color: "var(--text)", fontSize: 14 },
  helpText: { fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5, marginTop: 6 },
  scoreInput: { width: 64, textAlign: "center", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 6px", color: "var(--text)", fontFamily: "var(--font-display)", fontSize: 26, marginTop: 6 },
  positionCheckRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13.5 },
  assignPanel: { marginTop: 12, background: "var(--surface-2)", borderRadius: 10, padding: 10 },
  assignHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 600 },
  removeSlotBtn: { width: "100%", textAlign: "left", color: "var(--danger)", fontSize: 12, padding: "6px 0", background: "transparent", border: "none", marginBottom: 6 },
  assignList: { maxHeight: 220, overflowY: "auto" },
  assignRow: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", background: "transparent", border: "none", borderBottom: "1px solid var(--line)", color: "var(--text)" },
  penaltyRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  penaltyToggle: { width: 40, height: 40, borderRadius: 8, border: "1px solid var(--line)", fontSize: 16, flexShrink: 0 },
  penaltyHeaderRow: { display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 6, borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.4 },
  penaltyPairRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 },
  penaltySide: { flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", textAlign: "right", minWidth: 0 },
  penaltyRoundNumber: { fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-dim)", width: 16, textAlign: "center", flexShrink: 0 },
  suggestedTag: { fontSize: 10, color: "var(--turf)", border: "1px solid var(--turf)", borderRadius: 999, padding: "1px 6px", marginLeft: "auto" },
};
