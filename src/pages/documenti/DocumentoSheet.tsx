// Fogli dei documenti (#52): «Nuovo documento» (file, nome, visibilità proposta in base al tipo) e dettaglio
// (anteprima, apri, offline, chi lo vede, cambio di visibilità solo per chi l'ha caricato, elimina).
import { useEffect, useRef, useState } from "react";
import {
  Campo,
  Chip,
  Interruttore,
  Pulsante,
  Segmenti,
} from "../../faraway/base";
import { Foglio, useConferma } from "../../faraway/Foglio";
import { Sv } from "../../faraway/icons";
import {
  checkFile,
  imageUrl,
  isFileCached,
  openBookingFile,
  cacheBookingFile,
} from "../../lib/bookingFiles";
import {
  allarga,
  anteprimaImmagine,
  chiVede,
  controllaVisibilita,
  dimensione,
  proponi,
  puoCambiare,
  TIPO_LABEL,
  VIS_LABEL,
  type TipoCarico,
} from "../../lib/documenti";
import { isDocOffline, setDocOffline } from "../../lib/documentiOffline";
import { useAuth } from "../../lib/auth";
import { showToast } from "../../state/toast";
import { useTrips } from "../../state/trip";
import { useMe } from "../../state/me";
import { parseAmount, rateFor, tripCurrencies } from "../../lib/money";
import { CATEGORIE_BASE, catKey } from "../../lib/ricevuta";
import { tripToday } from "../../lib/today";
import type { ExpenseInput } from "../../lib/moneyData";
import type {
  DocKind,
  Documento,
  Expense,
  Trip,
  Visibilita,
} from "../../types";

/** Costo (facoltativo) di un documento: diventa una spesa collegata, nella categoria scelta. */
export interface CostoDoc {
  importo: string;
  valuta: string;
  categoria: string;
  paidBy: string;
}

const CATEGORIA_DEFAULT = "Altro";

export const costoVuoto = (trip: Trip, me?: string): CostoDoc => ({
  importo: "",
  valuta: trip.baseCurrency,
  categoria: CATEGORIA_DEFAULT,
  paidBy: me ?? trip.travelers[0]?.id ?? "",
});

export const costoDi = (e: Expense, base: string): CostoDoc => ({
  importo: String(e.amount).replace(".", ","),
  valuta: e.currency ?? base,
  categoria: e.category ?? "Altro",
  paidBy: e.paidBy ?? "",
});

export const spesaDelDocumento = (trip: Trip, docId: string) =>
  trip.expenses.find(
    (e) => e.source?.kind === "document" && e.source.id === docId
  );

/** Spesa pronta da salvare, oppure il messaggio che dice cosa manca. `null` = nessun costo scritto. */
export function spesaDaCosto(
  trip: Trip,
  c: CostoDoc,
  nome: string,
  docId: string,
  esistente?: Expense
): { input: ExpenseInput } | { errore: string } | null {
  if (!c.importo.trim()) return null;
  const amount = parseAmount(c.importo);
  if (amount === null || !(amount > 0))
    return { errore: "L'importo non è chiaro: scrivi per esempio 45,90." };
  if (!c.paidBy) return { errore: "Manca chi ha pagato. Scegli una persona." };
  const rate = c.valuta === trip.baseCurrency ? 1 : rateFor(trip, c.valuta);
  if (!rate)
    return {
      errore: `Manca il cambio di ${c.valuta}: impostalo in Altro › Cambio valuta.`,
    };
  return {
    input: {
      ...(esistente ? {} : { id: crypto.randomUUID() }),
      label: nome,
      category: c.categoria.trim() || CATEGORIA_DEFAULT,
      amount,
      currency: c.valuta,
      fxRate: c.valuta !== trip.baseCurrency ? rate : null,
      paidBy: c.paidBy,
      splitMode: "equal",
      shares: trip.travelers.map((p) => ({ travelerId: p.id, weight: 1 })),
      spentDate: esistente ? esistente.spentAt.slice(0, 10) : tripToday(trip),
      notes: "",
      travelerIds: trip.travelers.map((p) => p.id),
      source: { kind: "document", id: docId },
    },
  };
}

export function CostoDocumento({
  trip,
  value,
  onChange,
}: {
  trip: Trip;
  value: CostoDoc;
  onChange: (c: CostoDoc) => void;
}) {
  const personali = trip.expenseCategories
    .filter((c) => !c.archived || catKey(c.label) === catKey(value.categoria))
    .map((c) => c.label)
    .filter((l) => !CATEGORIE_BASE.some((b) => catKey(b.label) === catKey(l)));
  const categorie = [
    "Voli",
    "Alloggi",
    "Trasporti",
    "Cibo",
    "Attività",
    ...personali,
    "Altro",
  ];
  const set = (p: Partial<CostoDoc>) => onChange({ ...value, ...p });
  return (
    <div
      className="fa-fld"
      role="group"
      aria-label="Costo del documento"
      style={{ gap: 16 }}
    >
      <Campo
        label="Costo (facoltativo)"
        value={value.importo}
        onChange={(v) => set({ importo: v })}
        inputMode="decimal"
        placeholder="es. 45,90"
        hint="Se lo scrivi, diventa una spesa del viaggio."
      />
      {value.importo.trim() ? (
        <>
          <div className="fa-fld" role="group" aria-label="Valuta">
            Valuta
            <div className="fa-chips">
              {tripCurrencies(trip, value.valuta).map((c) => (
                <Chip
                  key={c}
                  on={value.valuta === c}
                  onPress={() => set({ valuta: c })}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="fa-fld" role="group" aria-label="Categoria">
            Categoria
            <div className="fa-chips wrap">
              {categorie.map((c) => (
                <Chip
                  key={c}
                  on={catKey(value.categoria) === catKey(c)}
                  onPress={() => set({ categoria: c })}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="fa-fld" role="group" aria-label="Pagato da">
            Pagato da
            <div className="fa-chips wrap">
              {trip.travelers.map((p) => (
                <Chip
                  key={p.id}
                  on={value.paidBy === p.id}
                  onPress={() => set({ paidBy: p.id })}
                >
                  {first(trip, p.id)}
                </Chip>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const first = (trip: Trip, id: string) =>
  trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? "—";
const VIS: Visibilita[] = ["all", "selected", "private"];

/** Scelta della visibilità: tre segmenti e, per «selezionati», le persone. */
export function ScegliVisibilita({
  trip,
  vis,
  access,
  onChange,
}: {
  trip: Trip;
  vis: Visibilita;
  access: string[];
  onChange: (v: Visibilita, a: string[]) => void;
}) {
  const errore = controllaVisibilita(vis, access);
  return (
    <div className="fa-fld">
      Chi lo può vedere
      <Segmenti<Visibilita>
        label="Chi lo può vedere"
        value={vis}
        onChange={(v) => onChange(v, v === "selected" ? access : [])}
        options={VIS.map((v) => ({
          value: v,
          label: v === "selected" ? "Selezionati" : VIS_LABEL[v],
        }))}
      />
      {vis === "selected" ? (
        <div className="fa-chips wrap" role="group" aria-label="Persone">
          {trip.travelers.map((p) => (
            <Chip
              key={p.id}
              on={access.includes(p.id)}
              onPress={() =>
                onChange(
                  vis,
                  access.includes(p.id)
                    ? access.filter((x) => x !== p.id)
                    : [...access, p.id]
                )
              }
            >
              {first(trip, p.id)}
            </Chip>
          ))}
        </div>
      ) : null}
      {vis === "selected" && errore ? (
        <span className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {errore}
        </span>
      ) : (
        <span className="fa-help">
          {vis === "all"
            ? "Tutti i partecipanti del viaggio."
            : vis === "private"
            ? "Solo tu: gli altri non lo vedono né negli elenchi né nei download."
            : "Chi lo ha caricato lo vede sempre."}
        </span>
      )}
    </div>
  );
}

export function NuovoDocumentoSheet({
  trip,
  link,
  passeggeri,
  onClose,
}: {
  trip: Trip;
  link?: { kind: DocKind; refId: string };
  passeggeri?: string[];
  onClose: () => void;
}) {
  const t = useTrips();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCarico>("conferma");
  const [vis, setVis] = useState<Visibilita>("all");
  const [access, setAccess] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = useMe(trip);
  const [costo, setCosto] = useState<CostoDoc>(() => costoVuoto(trip, me?.id));
  const online = navigator.onLine;
  const scegliTipo = (x: TipoCarico) => {
    const p = proponi(x, passeggeri);
    setTipo(x);
    setVis(p.visibility);
    setAccess(p.access);
  };
  async function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!file) return setError("Scegli un file: una foto o un PDF.");
    const bad = checkFile(file) || controllaVisibilita(vis, access);
    if (bad) return setError(bad);
    const docId = crypto.randomUUID();
    const nomeDoc = nome.trim() || file.name.replace(/\.[^.]+$/, "");
    const spesa = spesaDaCosto(trip, costo, nomeDoc, docId);
    if (spesa && "errore" in spesa) return setError(spesa.errore);
    setBusy(true);
    const m = await t.createDocument(trip.id, {
      id: docId,
      file,
      name: nomeDoc,
      visibility: vis,
      access,
      ...(link ? { link } : {}),
    });
    if (m) {
      setBusy(false);
      return setError(m);
    }
    const ms =
      spesa && "input" in spesa
        ? await t.createExpense(trip.id, spesa.input)
        : null;
    setBusy(false);
    showToast(
      ms
        ? `Documento caricato, ma il costo no: ${
            /source_kind|check/i.test(ms)
              ? "serve la migrazione 0040 del database."
              : ms
          }`
        : spesa
        ? "Documento e spesa salvati"
        : "Documento caricato"
    );
    onClose();
  }
  return (
    <Foglio
      open
      full
      title="Nuovo documento"
      onClose={onClose}
      footer={
        <Pulsante
          type="submit"
          form="doc-form"
          isLoading={busy}
          isDisabled={!online}
        >
          {"Salva il documento"}
        </Pulsante>
      }
    >
      <form id="doc-form" className="frm" onSubmit={submit} noValidate>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0] ?? null;
            setFile(f);
            setError("");
            if (f && !nome) setNome(f.name.replace(/\.[^.]+$/, ""));
          }}
        />
        <div className="fa-fld">
          File
          <Pulsante
            color="secondary"
            iconLeading="file"
            onPress={() => input.current?.click()}
          >
            {file ? file.name : "Scegli foto o PDF"}
          </Pulsante>
        </div>
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder="es. Assicurazione di viaggio"
          maxLength={120}
        />
        <div className="fa-fld" role="group" aria-label="Tipo di documento">
          Che documento è
          <div className="fa-chips wrap">
            {(Object.keys(TIPO_LABEL) as TipoCarico[]).map((x) => (
              <Chip key={x} on={tipo === x} onPress={() => scegliTipo(x)}>
                {TIPO_LABEL[x]}
              </Chip>
            ))}
          </div>
        </div>
        <CostoDocumento trip={trip} value={costo} onChange={setCosto} />
        <ScegliVisibilita
          trip={trip}
          vis={vis}
          access={access}
          onChange={(v, a) => (setVis(v), setAccess(a))}
        />
        {!online ? (
          <span className="fa-help">
            Sei offline: carica il documento quando c’è rete.
          </span>
        ) : null}
        {error ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {error}
          </span>
        ) : null}
      </form>
    </Foglio>
  );
}

export function DocumentoDettaglio({
  trip,
  doc,
  onClose,
}: {
  trip: Trip;
  doc: Documento;
  onClose: () => void;
}) {
  const t = useTrips();
  const { session } = useAuth();
  const uid = session?.user.id;
  const mio = puoCambiare(doc, uid);
  const [ask, confirmNode] = useConferma();
  const [vis, setVis] = useState<Visibilita>(doc.visibility);
  const [access, setAccess] = useState<string[]>(doc.access);
  const [offline, setOffline] = useState(isDocOffline(doc.id));
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const me = useMe(trip);
  const spesa = spesaDelDocumento(trip, doc.id);
  const [costo, setCosto] = useState<CostoDoc>(() =>
    spesa ? costoDi(spesa, trip.baseCurrency) : costoVuoto(trip, me?.id)
  );
  const [busyCosto, setBusyCosto] = useState(false);
  const cambiata =
    vis !== doc.visibility ||
    access.slice().sort().join() !== doc.access.slice().sort().join();
  useEffect(() => {
    if (!anteprimaImmagine(doc)) return;
    let off = false;
    void imageUrl(doc.path)
      .then((u) => !off && setImg(u))
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [doc]);
  async function salva() {
    const err = controllaVisibilita(vis, access);
    if (err) return showToast(err);
    if (allarga(doc, { visibility: vis, access })) {
      const ok = await ask({
        title: "Allargare la visibilità?",
        message: `«${doc.name}» lo vedranno anche ${
          vis === "all" ? "tutti i partecipanti" : "le persone aggiunte"
        }. Puoi restringere di nuovo in qualsiasi momento.`,
        confirm: "Sì, allarga",
        cancel: "Lascia com’è",
        destructive: false,
      });
      if (!ok) return;
    }
    setBusy(true);
    const m = await t.updateDocumentVisibility(doc.id, vis, access);
    setBusy(false);
    showToast(m ?? "Visibilità aggiornata");
  }
  async function salvaCosto() {
    const r = spesaDaCosto(trip, costo, doc.name, doc.id, spesa);
    if (!r) return showToast("Scrivi il costo, oppure usa «Togli il costo».");
    if ("errore" in r) return showToast(r.errore);
    setBusyCosto(true);
    const m = spesa
      ? await t.updateExpense(trip.id, spesa, r.input)
      : await t.createExpense(trip.id, r.input);
    setBusyCosto(false);
    showToast(
      m
        ? /source_kind|check/i.test(m)
          ? "Serve la migrazione 0040 del database."
          : m
        : "Costo salvato nelle spese"
    );
  }
  async function togliCosto() {
    if (!spesa) return;
    const m = await t.setExpenseDeleted(spesa.id, true);
    if (m) return showToast(m);
    setCosto(costoVuoto(trip, me?.id));
    showToast("Costo tolto dalle spese");
  }
  async function elimina() {
    const ok = await ask({
      title: "Eliminare il documento?",
      message: `«${doc.name}» sparisce per tutti, anche dai punti a cui è collegato.`,
      confirm: "Elimina",
      cancel: "Tienilo",
      destructive: true,
    });
    if (!ok) return;
    if (spesa) await t.setExpenseDeleted(spesa.id, true);
    const m = await t.deleteDocument(doc.id, doc.path);
    if (m) return showToast(m);
    showToast("Documento eliminato");
    onClose();
  }
  async function toggleOffline(on: boolean) {
    setOffline(on);
    setDocOffline(doc.id, on);
    if (on) await cacheBookingFile(doc.path).catch(() => undefined);
    else void isFileCached(doc.path);
  }
  return (
    <Foglio open title={doc.name} onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        {img ? (
          <img
            src={img}
            alt=""
            style={{
              width: "100%",
              maxHeight: 240,
              objectFit: "contain",
              borderRadius: 12,
            }}
          />
        ) : null}
        <p className="fa-m" style={{ margin: 0 }}>
          {[
            doc.mime?.split("/")[1]?.toUpperCase(),
            dimensione(doc.size),
            `caricato il ${new Date(doc.createdAt)
              .toLocaleDateString("it-IT", { day: "numeric", month: "short" })
              .replace(/\./g, "")}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <Pulsante
          iconLeading="file"
          onPress={() =>
            void openBookingFile(doc.path).catch((e: Error) =>
              showToast(e.message)
            )
          }
        >
          Apri
        </Pulsante>
        <Interruttore
          label="Disponibile offline"
          isSelected={offline}
          onChange={(v) => void toggleOffline(v)}
        />
        <CostoDocumento trip={trip} value={costo} onChange={setCosto} />
        <div className={spesa ? "fa-btns" : undefined}>
          <Pulsante
            color="secondary-soft"
            iconLeading="check"
            isLoading={busyCosto}
            isDisabled={!costo.importo.trim()}
            onPress={() => void salvaCosto()}
          >
            Salva il costo
          </Pulsante>
          {spesa ? (
            <Pulsante
              color="tertiary-destructive"
              iconLeading="trash"
              onPress={() => void togliCosto()}
            >
              Togli il costo
            </Pulsante>
          ) : null}
        </div>
        <div className="fa-fld">
          Chi lo vede
          <span>{chiVede(doc, trip.travelers, uid)}</span>
          {doc.changedAt ? (
            <span className="fa-help">
              Visibilità cambiata il{" "}
              {new Date(doc.changedAt)
                .toLocaleDateString("it-IT", { day: "numeric", month: "short" })
                .replace(/\./g, "")}
            </span>
          ) : null}
        </div>
        {mio ? (
          <>
            <ScegliVisibilita
              trip={trip}
              vis={vis}
              access={access}
              onChange={(v, a) => (setVis(v), setAccess(a))}
            />
            <Pulsante
              color="secondary"
              isDisabled={!cambiata}
              isLoading={busy}
              onPress={() => void salva()}
            >
              Salva la visibilità
            </Pulsante>
            <Pulsante
              color="tertiary-destructive"
              iconLeading="trash"
              onPress={() => void elimina()}
            >
              Elimina il documento
            </Pulsante>
          </>
        ) : (
          <span className="fa-help">
            Solo chi l’ha caricato può cambiarne la visibilità.
          </span>
        )}
      </div>
      {confirmNode}
    </Foglio>
  );
}
