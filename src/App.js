import React, { useEffect, useState } from "react";

// --- Apufunktiot ---
const shuffle = (arr, seed = Math.random()) => {
  // Deterministinen xorshift32 kun seed on numero 0..1
  let x = Math.floor(seed * 0xffffffff) || 123456789;

  const rnd = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return (x % 1_000_000) / 1_000_000;
  };

  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Laske viikkonumero (aloitetaan viikko 1 = maanantai 18.8.2025)
const getWeekNumber = () => {
  const startDate = new Date("2025-08-18"); // Ensimmäinen maanantai
  const today = new Date();
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return Math.max(1, weekNumber);
};

const WEEKLY_PUZZLES = [
  {
    id: "week-1",
    title: "Viikon peli 1",
    groups: [
      { name: "Kurkkuja", words: ["Cocktail", "Mauste", "Etikka", "Suola"] },
      { name: "Lavoja", words: ["Euro", "Pää", "Keikka", "Avo"] },
      { name: "Mies", words: ["Mennyt", "Disko", "Lisko", "Nahka"] },
      {
        name: "Susijengipelaaja -kolme kirjainta",
        words: ["Muuri", "Kanto", "Grandi", "Markka"],
      },
    ],
  },
  // Lisää viikkoja tähän tarpeen mukaan...
  {
    id: "week-2",
    title: "Viikon peli 2",
    groups: [
      { name: "Onnen_", words: ["Numero", "Raha", "Apila", "Pyörä"] },
      { name: "Palloja", words: ["Pesä", "Ranta", "Lento", "Pesu"] },
      {
        name: "Pankkien säästöpossuja",
        words: ["Orava", "Maapallo", "Virtahepo", "Roope Ankka"],
      },
      {
        name: "Ensimmäinen sana Mikko Niskasen elokuvan nimessä",
        words: ["Kahdeksan", "Laulu", "Käpy", "Mona"],
      },
    ],
  },
  {
    id: "week-3",
    title: "Viikon peli 3",
    groups: [
      {
        name: "Turkulaisia baareja, joiden nimi tarkoittaa muuta",
        words: ["Vessa", "Apteekki", "Koulu", "Pankki"],
      },
      { name: "Hiekkaleluja", words: ["Lapio", "Ämpäri", "Muotti", "Harava"] },
      {
        name: "Maksuväline",
        words: ["Seteli", "Kortti", "Luotto", "Kännykkä"],
      },
      {
        name: "_Viiva",
        words: ["Punainen", "Kalkki", "Kola", "Amfetamiini"],
      },
    ],
  },
  {
    id: "week-4",
    title: "Viikon peli 4",
    groups: [
      {
        name: "Firma",
        words: ["Pulju", "Yritys", "Liike", "Kauppa"],
      },
      { name: "Demareita", words: ["Alho", "Tanner", "Sorsa", "Rinne"] },
      {
        name: "Uuden aallon bändien loppuja",
        words: ["Miljoona", "Kone", "Normaali", "Huraa!"],
      },
      {
        name: "Niveljalkaisten jalkoja",
        words: ["Tuhat", "Kuusi", "Harva", "Juoksu"],
      },
    ],
  },
];

const COLORS = [
  { bg: "#fef3c7", text: "#78350f", name: "Keltainen" },
  { bg: "#bbf7d0", text: "#14532d", name: "Vihreä" },
  { bg: "#bfdbfe", text: "#1e3a8a", name: "Sininen" },
  { bg: "#e9d5ff", text: "#581c87", name: "Violetti" },
];

// --- Pelin logiikka ---
function buildPool(groups) {
  let id = 0;
  const tiles = groups.flatMap((g, gi) =>
    g.words.map((w) => ({
      id: id++,
      label: w,
      groupIndex: gi,
    }))
  );
  return tiles;
}

function isCorrectGroup(selection, tiles) {
  if (selection.length !== 4) return false;

  const gis = selection.map((id) => tiles.find((t) => t.id === id)?.groupIndex);

  if (gis.some((g) => g === undefined)) return false;

  const first = gis[0];
  return gis.every((g) => g === first);
}

function oneAway(selection, tiles) {
  if (selection.length !== 4) return false;

  const gis = selection.map((id) => tiles.find((t) => t.id === id)?.groupIndex);

  const counts = new Map();
  gis.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));

  return [...counts.values()].some((c) => c === 3);
}

function serializeShare(attemptHistory, puzzleTitle, isComplete) {
  const squares = ["🟨", "🟩", "🟦", "🟪"];

  const lines = attemptHistory.map((attempt) => {
    if (attempt.type === "correct") {
      return squares[attempt.data].repeat(4);
    } else {
      const counts = new Map();
      attempt.data.forEach((groupIndex) => {
        counts.set(groupIndex, (counts.get(groupIndex) || 0) + 1);
      });

      let line = "";
      for (let i = 0; i < 4; i++) {
        const count = counts.get(i) || 0;
        line += squares[i].repeat(count);
      }
      return line;
    }
  });

  const status = isComplete ? "ratkaistu" : "epäonnistui";
  const attempts = lines.length;
  const header = `Yhteydet – ${puzzleTitle} – ${status} ${attempts} yrityksellä`;

  return header + "\n" + lines.join("\n");
}

// Tekstin koon automaattinen säätö
const getTextSize = (text) => {
  if (text.length <= 6) return "text-sm";
  if (text.length <= 9) return "text-xs";
  return "text-xs";
};

// Konfettisade-komponentti
const Confetti = ({ show, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!show) return;

    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      color: ["#fbbf24", "#34d399", "#60a5fa", "#a78bfa"][
        Math.floor(Math.random() * 4)
      ],
      size: Math.random() * 8 + 4,
      velocityX: (Math.random() - 0.5) * 2,
      velocityY: Math.random() * 3 + 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));

    setParticles(newParticles);

    const animate = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX,
            y: p.y + p.velocityY,
            rotation: p.rotation + p.rotationSpeed,
            velocityY: p.velocityY + 0.1,
          }))
          .filter((p) => p.y < 120)
      );
    };

    const interval = setInterval(animate, 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setParticles([]);
      onComplete();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [show, onComplete]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
};

export default function ConnectionsApp() {
  const weekNumber = getWeekNumber();
  const weekKey = `week-${weekNumber}`;

  const [weeklyMode, setWeeklyMode] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [puzzle, setPuzzle] = useState(() => {
    const pick =
      WEEKLY_PUZZLES[(weekNumber - 1) % WEEKLY_PUZZLES.length] ||
      WEEKLY_PUZZLES[0];
    return pick;
  });

  const [weeklyCompleted, setWeeklyCompleted] = useState(null);

  const [tiles, setTiles] = useState(() => shuffle(buildPool(puzzle.groups)));
  const [selection, setSelection] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [solvedOrder, setSolvedOrder] = useState([]); // Järjestys, jossa ryhmät ratkottiin
  const [mistakes, setMistakes] = useState(0);
  const [mistakeHistory, setMistakeHistory] = useState([]);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const isComplete = solvedGroups.length === 4;
  const gameOver = mistakes >= 4 || isComplete;

  // Käynnistä konfettisade kun peli ratkaistaan
  useEffect(() => {
    if (isComplete && solvedGroups.length === 4) {
      setShowConfetti(true);
    }
  }, [isComplete, solvedGroups.length]);

  // Näppäinpikavalinnat
  useEffect(() => {
    const onKey = (e) => {
      if (gameOver) return;
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") setSelection([]);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver]);

  function resetWith(p) {
    setPuzzle(p);
    const pool = buildPool(p.groups);
    setTiles(shuffle(pool));
    setSelection([]);
    setSolvedGroups([]);
    setSolvedOrder([]);
    setMistakes(0);
    setMistakeHistory([]);
    setAttemptHistory([]);
    setMessage("");
    setWeeklyCompleted(null);
  }

  function handleToggle(id) {
    if (gameOver || (weeklyMode && weeklyCompleted)) return;

    setSelection((sel) =>
      sel.includes(id)
        ? sel.filter((x) => x !== id)
        : sel.length < 4
        ? [...sel, id]
        : sel
    );
  }

  function handleShuffle() {
    if (weeklyMode && weeklyCompleted) return;

    setTiles((ts) => {
      const unsolved = ts.filter((t) => !solvedGroups.includes(t.groupIndex));
      const solved = ts.filter((t) => solvedGroups.includes(t.groupIndex));
      const shuffled = shuffle(unsolved);
      return [...solved, ...shuffled];
    });
  }

  function handleSubmit() {
    if (weeklyMode && weeklyCompleted) return;

    if (selection.length !== 4) {
      setMessage("Valitse neljä sanaa.");
      return;
    }

    if (isCorrectGroup(selection, tiles)) {
      const gi = tiles.find((t) => t.id === selection[0]).groupIndex;

      setAttemptHistory((prev) => [...prev, { type: "correct", data: gi }]);

      setSolvedGroups((sg) => [...sg, gi]);
      setSolvedOrder((so) => [...so, gi]); // Lisää ratkaisujärjestykseen
      setTiles((ts) => {
        const solved = ts.filter((t) => t.groupIndex === gi);
        const rest = ts.filter((t) => t.groupIndex !== gi);
        return [...solved, ...rest];
      });

      setSelection([]);
      setMessage("Oikein!");
    } else {
      const attemptGroups = selection
        .map((id) => tiles.find((t) => t.id === id)?.groupIndex)
        .filter((gi) => gi !== undefined);

      const sortedAttempt = [...attemptGroups].sort();
      const isDuplicate = mistakeHistory.some((prev) => {
        const sortedPrev = [...prev].sort();
        return (
          sortedPrev.length === sortedAttempt.length &&
          sortedPrev.every((val, idx) => val === sortedAttempt[idx])
        );
      });

      if (isDuplicate) {
        setMessage("Olet jo kokeillut tätä yhdistelmää!");
        return;
      }

      setMistakeHistory((prev) => [...prev, attemptGroups]);
      setAttemptHistory((prev) => [
        ...prev,
        { type: "wrong", data: attemptGroups },
      ]);
      setMistakes((m) => m + 1);
      setMessage(
        oneAway(selection, tiles) ? "Lähellä! 3/4 oikein." : "Väärä ryhmä."
      );
    }
  }

  function handleDeselect() {
    if (weeklyMode && weeklyCompleted) return;
    setSelection([]);
    setMessage("");
  }

  function handleShare() {
    const text = serializeShare(attemptHistory, puzzle.title, isComplete);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => setMessage("Tulokset kopioitu leikepöydälle."),
        () => setMessage("Kopiointi epäonnistui.")
      );
    } else {
      setMessage("Kopiointi ei ole tuettu.");
    }
  }

  function loadWeekly() {
    const weeklyPuzzle =
      WEEKLY_PUZZLES[(weekNumber - 1) % WEEKLY_PUZZLES.length] ||
      WEEKLY_PUZZLES[0];

    if (weeklyCompleted) {
      setPuzzle(weeklyPuzzle);
      const pool = buildPool(weeklyPuzzle.groups);
      setTiles(pool);
      setSelection([]);
      setSolvedGroups(weeklyCompleted.solvedGroups);
      setSolvedOrder(
        weeklyCompleted.solvedOrder || weeklyCompleted.solvedGroups || []
      );
      setMistakes(weeklyCompleted.mistakes);
      setMessage(
        weeklyCompleted.completed
          ? "Viikon peli on jo ratkaistu!"
          : "Viikon peli on jo pelattu."
      );
    } else {
      resetWith(weeklyPuzzle);
    }

    setWeeklyMode(true);
    setShowArchive(false);
  }

  function loadArchivePuzzle(weekIndex) {
    const archivePuzzle = WEEKLY_PUZZLES[weekIndex] || WEEKLY_PUZZLES[0];
    resetWith(archivePuzzle);
    setWeeklyMode(false);
    setShowArchive(false);
  }

  function tileClasses(t) {
    const selected = selection.includes(t.id);
    const solvedIdx = solvedGroups.indexOf(t.groupIndex);
    const isPlayable = !gameOver && !(weeklyMode && weeklyCompleted);

    const base = `rounded-lg p-2 text-center font-semibold shadow-sm select-none transition-all duration-200 ${
      isPlayable ? "cursor-pointer" : "cursor-default"
    }`;

    if (solvedIdx >= 0) {
      return base + " ring-2 ring-transparent transform scale-[0.98]";
    }

    if (selected) {
      return base + " ring-4 ring-blue-500 shadow-lg transform scale-[1.02]";
    }

    return (
      base +
      " ring-2 ring-transparent hover:bg-neutral-200 hover:shadow-md hover:transform hover:scale-[1.01]"
    );
  }

  function tileStyle(t) {
    const selected = selection.includes(t.id);
    const solvedIdx = solvedGroups.indexOf(t.groupIndex);

    if (solvedIdx >= 0) {
      const color = COLORS[t.groupIndex];
      return {
        backgroundColor: color.bg,
        color: color.text,
      };
    }

    if (selected) {
      return {
        backgroundColor: "#dbeafe",
        color: "#1e40af",
      };
    }

    return {
      backgroundColor: "#f8fafc",
      color: "#0f172a",
    };
  }

  // Seuraavan maanantain päivämäärä
  const getNextMonday = () => {
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString("fi-FI", {
      day: "numeric",
      month: "numeric",
    });
  };

  // Virhepallojen komponentti
  const mistakeIndicator = (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-neutral-700">Virheet:</span>
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i < mistakes
                ? "bg-red-500 shadow-lg"
                : "bg-neutral-200 border border-neutral-300"
            }`}
          />
        ))}
      </div>
      {weeklyMode && weeklyCompleted && (
        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          Viikon peli pelattu
        </span>
      )}
    </div>
  );

  // Arkistovalikko
  const archiveMenu = showArchive && (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
      <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-4 text-center">
        📚 Pelien arkisto
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WEEKLY_PUZZLES.map((weekPuzzle, index) => {
          const isCurrentWeek =
            index === (weekNumber - 1) % WEEKLY_PUZZLES.length;
          return (
            <button
              key={weekPuzzle.id}
              onClick={() => loadArchivePuzzle(index)}
              className={`p-3 sm:p-4 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg transform hover:scale-105 text-left ${
                isCurrentWeek
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 text-blue-800"
                  : "bg-gradient-to-r from-neutral-100 to-neutral-200 border border-neutral-300 text-neutral-700 hover:from-neutral-200 hover:to-neutral-300"
              }`}
            >
              <div className="font-semibold text-sm sm:text-base">
                {weekPuzzle.title}
                {isCurrentWeek && (
                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    Nykyinen
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                Viikko {index + 1}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setShowArchive(false)}
          className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 transition-all duration-200 text-neutral-700 font-medium text-sm"
        >
          ✕ Sulje arkisto
        </button>
      </div>
    </div>
  );

  // Otsikko
  const header = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Yhteydet
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1">
          Valitse 4 sanaa, jotka kuuluvat samaan ryhmään
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {mistakeIndicator}
        <div className="flex gap-2">
          <button
            onClick={loadWeekly}
            className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-xl transform hover:scale-105 font-medium text-sm"
          >
            {weeklyMode ? puzzle.title : `Viikko ${weekNumber}`}
          </button>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all duration-200 hover:shadow-xl transform hover:scale-105 font-medium text-sm"
          >
            📚 Arkisto
          </button>
        </div>
      </div>
    </div>
  );

  // Tilarivi ylhäällä
  const statusBar = (
    <div className="text-center">
      {!gameOver &&
        !(weeklyMode && weeklyCompleted) &&
        selection.length > 0 && (
          <div className="text-xs sm:text-sm text-neutral-600 bg-blue-50 p-3 rounded-xl border border-blue-200 inline-block">
            ✨ Valittuna: {selection.length}/4
          </div>
        )}

      {message && (
        <div
          className={`text-xs sm:text-sm p-3 rounded-xl border inline-block font-medium ${
            message.includes("Oikein")
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : message.includes("Lähellä")
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {message.includes("Oikein") && "🎉 "}
          {message.includes("Lähellä") && "⚡ "}
          {!message.includes("Oikein") &&
            !message.includes("Lähellä") &&
            message.includes("Väärä") &&
            "❌ "}
          {message}
        </div>
      )}

      {weeklyMode && weeklyCompleted && !gameOver && (
        <div className="text-xs sm:text-sm text-blue-700 bg-blue-50 p-4 rounded-xl border border-blue-200 inline-block">
          <div className="font-semibold">🏆 Viikon peli on jo pelattu!</div>
          <div className="mt-1 opacity-80">
            Uusi peli julkaistaan maanantaina {getNextMonday()}.
          </div>
        </div>
      )}
    </div>
  );

  // Ratkaistut ryhmät (ratkaisujärjestyksessä)
  const solvedBanner = (
    <div className="space-y-2 sm:space-y-3">
      {solvedOrder.map((gi) => {
        const color = COLORS[gi];
        return (
          <div
            key={gi}
            className="rounded-lg p-3 sm:p-4 shadow-md flex items-center justify-between flex-wrap gap-2 sm:gap-3 border-2 border-opacity-20"
            style={{
              backgroundColor: color.bg,
              color: color.text,
              borderColor: color.text,
            }}
          >
            <div className="font-bold text-sm sm:text-lg">
              {puzzle.groups[gi].name}
            </div>
            <div className="text-xs sm:text-sm opacity-90 font-medium">
              {puzzle.groups[gi].words.join(", ")}
            </div>
          </div>
        );
      })}

      {/* Näytä ratkaisemattomat ryhmät pelin lopussa */}
      {gameOver &&
        !isComplete &&
        puzzle.groups
          .map((group, gi) => ({ group, gi }))
          .filter(({ gi }) => !solvedGroups.includes(gi))
          .map(({ group, gi }) => {
            const color = COLORS[gi];
            return (
              <div
                key={`unsolved-${gi}`}
                className="rounded-lg p-3 sm:p-4 shadow-md flex items-center justify-between flex-wrap gap-2 sm:gap-3 border-2 border-opacity-30 opacity-75"
                style={{
                  backgroundColor: color.bg,
                  color: color.text,
                  borderColor: color.text,
                }}
              >
                <div className="font-bold text-sm sm:text-lg">{group.name}</div>
                <div className="text-xs sm:text-sm opacity-90 font-medium">
                  {group.words.join(", ")}
                </div>
              </div>
            );
          })}
    </div>
  );

  // Ruudukko - Optimoitu mobiilille
  const grid = (
    <div className="w-full">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
        }}
      >
        {tiles.map((t) => {
          const textSizeClass = getTextSize(t.label);
          return (
            <button
              key={t.id}
              onClick={() => handleToggle(t.id)}
              disabled={solvedGroups.includes(t.groupIndex)}
              className={`${tileClasses(
                t
              )} ${textSizeClass} flex items-center justify-center leading-tight`}
              style={{
                ...tileStyle(t),
                aspectRatio: "1",
                minHeight: "60px",
                borderRadius: "8px",
                padding: "4px",
              }}
            >
              <span
                className="text-center break-words hyphens-auto"
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  lineHeight: "1.1",
                  maxWidth: "100%",
                }}
                lang="fi"
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Pelinappulat alhaalla
  const gameControls = (
    <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
      <button
        onClick={handleShuffle}
        disabled={weeklyMode && weeklyCompleted}
        className={`px-3 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg transition-all duration-200 font-medium text-sm ${
          weeklyMode && weeklyCompleted
            ? "bg-neutral-200 cursor-not-allowed text-neutral-500"
            : "bg-white hover:bg-neutral-50 hover:shadow-xl border-2 border-neutral-200 hover:border-blue-300 transform hover:scale-105 text-neutral-700"
        }`}
      >
        🔀 Sekoita
      </button>
      <button
        onClick={handleDeselect}
        disabled={weeklyMode && weeklyCompleted}
        className={`px-3 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg transition-all duration-200 font-medium text-sm ${
          weeklyMode && weeklyCompleted
            ? "bg-neutral-200 cursor-not-allowed text-neutral-500"
            : "bg-white hover:bg-neutral-50 hover:shadow-xl border-2 border-neutral-200 hover:border-orange-300 transform hover:scale-105 text-neutral-700"
        }`}
      >
        ↺ Tyhjennä
      </button>
      <button
        onClick={handleSubmit}
        disabled={
          gameOver || (weeklyMode && weeklyCompleted) || selection.length !== 4
        }
        className={`px-4 py-2 sm:px-8 sm:py-3 rounded-xl shadow-lg transition-all duration-200 font-bold text-sm ${
          gameOver || (weeklyMode && weeklyCompleted) || selection.length !== 4
            ? "bg-neutral-200 cursor-not-allowed text-neutral-500"
            : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-xl transform hover:scale-110 border-2 border-emerald-400"
        }`}
      >
        ✓ Vahvista
      </button>
    </div>
  );

  // Ylimääräiset toiminnot (reset, share)
  const extraControls = (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
      <button
        onClick={() => resetWith(puzzle)}
        className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-md bg-gradient-to-r from-neutral-100 to-neutral-200 hover:from-neutral-200 hover:to-neutral-300 transition-all duration-200 hover:shadow-lg border border-neutral-300 hover:border-neutral-400 transform hover:scale-105 font-medium text-neutral-700 text-sm"
      >
        🔄 Aloita alusta
      </button>
      <button
        onClick={handleShare}
        className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-md bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 transition-all duration-200 hover:shadow-lg border border-blue-300 hover:border-purple-400 transform hover:scale-105 font-medium text-neutral-700 text-sm"
      >
        📤 Jaa tulos
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-neutral-900 p-3 sm:p-6 md:p-10">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {header}
        {statusBar}
        {archiveMenu}
        {solvedBanner}

        <div className="rounded-2xl p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-xl border border-white/20 space-y-4 sm:space-y-6">
          {grid}

          {gameOver && (
            <div className="rounded-xl p-4 sm:p-6 bg-gradient-to-r from-neutral-50 to-neutral-100 text-center border-2 border-neutral-200 shadow-inner">
              {isComplete ? (
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-700 mb-3">
                    🎉 Mahtavaa! Ratkaisit pulman! 🎉
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-600">
                    Teit {mistakes} virhettä
                    {weeklyMode && (
                      <div className="mt-3 text-blue-600 font-medium bg-blue-100 p-3 rounded-lg inline-block">
                        ⏰ Uusi viikon peli julkaistaan maanantaina{" "}
                        {getNextMonday()}!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg sm:text-2xl font-bold text-red-700 mb-3">
                    💔 Peli päättyi
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-600">
                    {weeklyMode ? (
                      <div className="bg-blue-100 p-3 rounded-lg inline-block">
                        ⏰ Uusi viikon peli julkaistaan maanantaina{" "}
                        {getNextMonday()}!
                      </div>
                    ) : (
                      "Kokeile uudestaan tai luo uusi pulma."
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {gameControls}
        </div>

        {extraControls}

        <div className="text-xs text-neutral-500 text-center bg-white/60 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/30">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span>💡</span>
            <strong>Ohje:</strong>
            <span className="text-center">
              Löydä neljä ryhmää, joissa jokaisessa on neljä yhteenkuuluvaa
              sanaa
            </span>
          </div>
          <div className="mt-2 opacity-75">
            🗓️ Uusi viikon peli julkaistaan joka maanantai klo 00:00
          </div>
        </div>
      </div>
    </div>
  );
}
