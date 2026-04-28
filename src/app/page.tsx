"use client";

import { useEffect, useMemo, useState } from "react";

import type { PersistedTenderStatus, UserTenderState } from "@/types/state";
import type { Tender, TenderCategory, TenderStatus } from "@/types/tender";

type ApiResponse = {
  updatedAt: string;
  total: number;
  data: Tender[];
};

type DevisResponse = {
  ok: boolean;
  message: string;
  mode: "mock" | "stub";
};

const ALL_CATEGORIES = "Toutes";

const CATEGORY_OPTIONS: (TenderCategory | typeof ALL_CATEGORIES)[] = [
  ALL_CATEGORIES,
  "BTP / BIM / SCAN 3D",
  "IMMOBILIER / VISITE VIRTUELLE",
];

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function Home() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [minScore, setMinScore] = useState(0);
  const [category, setCategory] = useState<TenderCategory | typeof ALL_CATEGORIES>(
    ALL_CATEGORIES,
  );
  const [dateFrom, setDateFrom] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  const [statusById, setStatusById] = useState<Record<string, TenderStatus>>({});
  const [stateUpdatedAt, setStateUpdatedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const appPassword = process.env.NEXT_PUBLIC_APP_PASSWORD?.trim() ?? "";
  const [isUnlocked, setIsUnlocked] = useState(appPassword.length === 0);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const loadTenders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders?refresh=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Impossible de charger les donnees.");
      }

      const payload = (await response.json()) as ApiResponse;
      setTenders(payload.data);
      setUpdatedAt(payload.updatedAt);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserState = async () => {
    try {
      const response = await fetch(`/api/state?refresh=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Impossible de charger les favoris sauvegardes.");
      }

      const payload = (await response.json()) as UserTenderState;
      setStatusById(payload.statusById);
      setStateUpdatedAt(payload.updatedAt);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur chargement etat utilisateur.";
      setError(message);
    }
  };

  const saveUserState = async (
    id: string,
    status: PersistedTenderStatus | null,
  ) => {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status }),
    });

    if (!response.ok) {
      throw new Error("Echec de sauvegarde locale.");
    }

    const payload = (await response.json()) as UserTenderState;
    setStateUpdatedAt(payload.updatedAt);
  };

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void Promise.all([loadTenders(), loadUserState()]);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isUnlocked]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const visibleTenders = useMemo(() => {
    return [...tenders]
      .filter((tender) => statusById[tender.id] !== "ignored")
      .filter((tender) => tender.score >= minScore)
      .filter((tender) =>
        category === ALL_CATEGORIES ? true : tender.category === category,
      )
      .filter((tender) => {
        if (!dateFrom) {
          return true;
        }
        return new Date(tender.publicationDate) >= new Date(dateFrom);
      })
      .filter((tender) => {
        if (!maxBudget) {
          return true;
        }

        if (!tender.budget) {
          return false;
        }

        return tender.budget <= Number(maxBudget);
      })
      .sort((a, b) => b.score - a.score);
  }, [tenders, statusById, minScore, category, dateFrom, maxBudget]);

  const onFavorite = (id: string) => {
    const previousStatus = statusById[id];
    const nextStatus: TenderStatus = previousStatus === "favorite" ? "new" : "favorite";

    setStatusById((previous) => ({
      ...previous,
      [id]: nextStatus,
    }));

    void saveUserState(id, nextStatus === "new" ? null : "favorite").catch((err) => {
      setStatusById((previous) => ({
        ...previous,
        [id]: previousStatus ?? "new",
      }));
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde locale.");
    });
  };

  const onIgnore = (id: string) => {
    const previousStatus = statusById[id];

    setStatusById((previous) => ({
      ...previous,
      [id]: "ignored",
    }));

    void saveUserState(id, "ignored").catch((err) => {
      setStatusById((previous) => ({
        ...previous,
        [id]: previousStatus ?? "new",
      }));
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde locale.");
    });
  };

  const onSendToDevis = async (tender: Tender) => {
    try {
      setSendingId(tender.id);

      const response = await fetch("/api/devis/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenderId: tender.id,
          title: tender.title,
          category: tender.category,
          city: tender.city,
          score: tender.score,
          budget: tender.budget,
        }),
      });

      const payload = (await response.json()) as DevisResponse;
      setNotice(payload.message);
    } catch {
      setError("Action Devis indisponible pour le moment.");
    } finally {
      setSendingId(null);
    }
  };

  const onUnlock = () => {
    if (passwordInput.trim() === appPassword) {
      setIsUnlocked(true);
      setAuthError(null);
      return;
    }

    setAuthError("Mot de passe incorrect.");
  };

  if (!isUnlocked) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <p className="eyebrow">Vusence Search</p>
          <h1>Acces prive</h1>
          <p className="supporting-text">
            Cette application est reservee a un usage personnel.
          </p>
          <input
            className="input"
            type="password"
            placeholder="Mot de passe"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
          />
          {authError ? <p className="error-text">{authError}</p> : null}
          <button className="btn btn-primary" onClick={onUnlock} type="button">
            Entrer
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="background-glow background-glow-1" />
      <div className="background-glow background-glow-2" />

      <section className="panel reveal panel-header">
        <div>
          <p className="eyebrow">Vusence Search</p>
          <h1>Veille intelligente appels d offres</h1>
          <p className="supporting-text">
            Outil autonome de qualification d opportunites par mots-cles, score
            et filtres metiers.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => void loadTenders()}>
            Actualiser
          </button>
          <div className="chip">
            {updatedAt
              ? `Mise a jour: ${dateFormatter.format(new Date(updatedAt))}`
              : "Mise a jour en attente"}
          </div>
          <div className="chip">
            {stateUpdatedAt
              ? `Etat local: ${dateFormatter.format(new Date(stateUpdatedAt))}`
              : "Etat local non charge"}
          </div>
        </div>
      </section>

      <section className="panel reveal panel-filters">
        <div className="filters-grid">
          <label className="field">
            <span>Score minimum</span>
            <input
              className="input"
              type="number"
              min={0}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value) || 0)}
            />
          </label>

          <label className="field">
            <span>Categorie</span>
            <select
              className="input"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value as TenderCategory | typeof ALL_CATEGORIES,
                )
              }
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date depuis</span>
            <input
              className="input"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Budget max (EUR)</span>
            <input
              className="input"
              type="number"
              min={0}
              step={1000}
              placeholder="Ex: 40000"
              value={maxBudget}
              onChange={(event) => setMaxBudget(event.target.value)}
            />
          </label>
        </div>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {loading ? (
        <section className="cards-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="card skeleton" key={`skeleton-${index}`} />
          ))}
        </section>
      ) : (
        <>
          <section className="stats reveal">
            <div className="stat-item">
              <span>Total affiche</span>
              <strong>{visibleTenders.length}</strong>
            </div>
            <div className="stat-item">
              <span>Favoris</span>
              <strong>
                {
                  Object.values(statusById).filter((status) => status === "favorite")
                    .length
                }
              </strong>
            </div>
            <div className="stat-item">
              <span>Score moyen</span>
              <strong>
                {visibleTenders.length
                  ? Math.round(
                      visibleTenders.reduce((acc, tender) => acc + tender.score, 0) /
                        visibleTenders.length,
                    )
                  : 0}
              </strong>
            </div>
          </section>

          <section className="cards-grid">
            {visibleTenders.length === 0 ? (
              <article className="card empty-state">
                <h3>Aucun resultat</h3>
                <p>Assouplis les filtres pour afficher plus d opportunites.</p>
              </article>
            ) : (
              visibleTenders.map((tender, index) => {
                const isFavorite = statusById[tender.id] === "favorite";

                return (
                  <article
                    className="card reveal"
                    key={tender.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <header className="card-head">
                      <div>
                        <p className="card-city">{tender.city}</p>
                        <h2>{tender.title}</h2>
                      </div>
                      <div className="score-badge">{tender.score}</div>
                    </header>

                    <p className="card-description">{tender.description}</p>

                    <div className="meta-grid">
                      <p>
                        <span>Categorie</span>
                        <strong>{tender.category}</strong>
                      </p>
                      <p>
                        <span>Publication</span>
                        <strong>
                          {dateFormatter.format(new Date(tender.publicationDate))}
                        </strong>
                      </p>
                      <p>
                        <span>Budget</span>
                        <strong>
                          {tender.budget ? currency.format(tender.budget) : "NC"}
                        </strong>
                      </p>
                      <p>
                        <span>Distance</span>
                        <strong>{tender.distanceKm} km</strong>
                      </p>
                    </div>

                    <div className="keyword-wrap">
                      {tender.keywords.map((keyword) => (
                        <span className="keyword" key={`${tender.id}-${keyword}`}>
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <footer className="card-actions">
                      <button
                        className={`btn ${isFavorite ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => onFavorite(tender.id)}
                        type="button"
                      >
                        {isFavorite ? "Favori ajoute" : "Mettre en favori"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => onIgnore(tender.id)}
                        type="button"
                      >
                        Ignorer
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => void onSendToDevis(tender)}
                        type="button"
                        disabled={sendingId === tender.id}
                      >
                        {sendingId === tender.id ? "Envoi..." : "Envoyer vers Devis"}
                      </button>
                    </footer>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}
    </main>
  );
}
