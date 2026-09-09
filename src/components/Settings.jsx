import React, { useEffect, useState } from "react";
import { listPasskeys, registerPasskey, deletePasskey, passkeysSupported } from "../lib/api";
import { pushAvailable, currentSubscription, subscribeThisDevice, unsubscribeThisDevice } from "../lib/push";
import { Loader2, Building2, Car, Users, ClipboardList, Bell, Wrench, Globe, FlaskConical, Download, ChevronRight, MousePointerClick, ShieldAlert, LogOut, Plus, Fingerprint, Smartphone, Megaphone } from "lucide-react";
import { formatDate, todayStr } from "../lib/dates";
import { Card, Field, TextInput, Button, SectionTitle } from "./ui";
import EditChecklistModal from "./EditChecklistModal";
import { PRICE_GROUPS } from "../lib/pricing";
import { geocode } from "../lib/geo";
import TaxPack from "./TaxPack";

// Every number Tyson might reasonably change, in one place, in his hands.
// Nothing here is a daily action - it's the sit-down-once screen - so it's
// organised by what the number is about, not by which tab reads it.

function Section({ icon: Icon, title, blurb, children }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon size={17} className="text-blue-600" /></div>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {blurb && <p className="text-xs text-slate-500 mt-0.5">{blurb}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function SaveRow({ dirty, saving, onSave }) {
  return (
    <div className="flex justify-end mt-3">
      <Button onClick={onSave} disabled={!dirty || saving} className="!px-4 !py-1.5 !text-xs">
        {saving ? <Loader2 size={13} className="animate-spin" /> : null} {dirty ? "Save" : "Saved"}
      </Button>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 py-2">
      <span>
        <span className="block text-sm text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-blue-600 shrink-0 mt-0.5" />
    </label>
  );
}

// A small hook for the per-section "edit locally, save once" pattern.
function useDraft(initial, onSave) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };
  return { draft, set, dirty, saving, save };
}

export default function Settings({
  settings,
  onSave,
  customers,
  invoices,
  expenses,
  trips,
  onOpenDev,
  onOpenUsage,
  onOpenPublicPage,
  demoMode,
  onToggleDemo,
  renewals = [],
  onSaveRenewal,
  onDeleteRenewal,
  onLogout,
}) {
  const [newRenewal, setNewRenewal] = useState(null); // { name, due_date } while adding

  // Passkeys on this account, and whether this phone has one.
  const [passkeys, setPasskeys] = useState(null);
  const [passkeyMsg, setPasskeyMsg] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const canPasskey = passkeysSupported();
  useEffect(() => {
    if (!canPasskey) return;
    listPasskeys().then(setPasskeys).catch(() => setPasskeys([]));
  }, [canPasskey]);
  const addPasskey = async () => {
    setPasskeyBusy(true);
    setPasskeyMsg("");
    try {
      await registerPasskey();
      setPasskeys(await listPasskeys());
      setPasskeyMsg("Done - next time, sign in with this phone.");
    } catch (e) {
      const m = String(e?.message || "");
      setPasskeyMsg(/relying|rp|not configured/i.test(m) ? "Passkeys aren't switched on for this site yet (Supabase -> Authentication -> Passkeys)." : m || "Couldn't set that up.");
    } finally {
      setPasskeyBusy(false);
    }
  };

  // Push: is this device subscribed?
  const canPush = pushAvailable();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  useEffect(() => {
    if (!canPush) return;
    currentSubscription().then((s) => setPushOn(!!s)).catch(() => {});
  }, [canPush]);
  const togglePush = async (on) => {
    setPushBusy(true);
    setPushMsg("");
    try {
      if (on) await subscribeThisDevice();
      else await unsubscribeThisDevice();
      setPushOn(on);
    } catch (e) {
      setPushMsg(e?.message || "Couldn't change that.");
    } finally {
      setPushBusy(false);
    }
  };

  const pub = useDraft(
    { public_tagline: settings.public_tagline || "", service_area: settings.service_area || "", public_blurb: settings.public_blurb || "", google_review_url: settings.google_review_url || "", review_count: settings.review_count ?? "", instagram_url: settings.instagram_url || "", facebook_url: settings.facebook_url || "" },
    (d) => onSave({ public_tagline: d.public_tagline.trim() || null, service_area: d.service_area.trim() || null, public_blurb: d.public_blurb.trim() || null, google_review_url: d.google_review_url.trim() || null, review_count: d.review_count === "" ? null : Number(d.review_count) || null, instagram_url: d.instagram_url.trim() || null, facebook_url: d.facebook_url.trim() || null })
  );
  const business = useDraft({ abn: settings.abn || "", gst_registered: !!settings.gst_registered, invoice_due_days: settings.invoice_due_days ?? 14 }, onSave);
  const bank = useDraft(
    { bank_account_name: settings.bank_account_name || "", bank_bsb: settings.bank_bsb || "", bank_account_number: settings.bank_account_number || "", payment_note: settings.payment_note || "" },
    (d) => onSave({ bank_account_name: d.bank_account_name.trim() || null, bank_bsb: d.bank_bsb.trim() || null, bank_account_number: d.bank_account_number.trim() || null, payment_note: d.payment_note.trim() || null })
  );
  const van = useDraft({ home_base_address: settings.home_base_address || "", mileage_rate_cents: settings.mileage_rate_cents ?? 88 }, async (d) => {
    const coords = d.home_base_address.trim() ? await geocode(d.home_base_address.trim()) : null;
    await onSave({ home_base_address: d.home_base_address.trim() || null, home_base_lat: coords?.lat ?? null, home_base_lng: coords?.lng ?? null, mileage_rate_cents: Number(d.mileage_rate_cents) || 88 });
  });
  const people = useDraft({ due_soon_days: settings.due_soon_days ?? 7, lapsed_days: settings.lapsed_days ?? 180, renewal_lead_days: settings.renewal_lead_days ?? 30 }, (d) =>
    onSave({ due_soon_days: Number(d.due_soon_days) || 7, lapsed_days: Number(d.lapsed_days) || 180, renewal_lead_days: Number(d.renewal_lead_days) || 30 })
  );

  const [editingList, setEditingList] = useState(null); // "everyday" | a PRICE_GROUPS title
  const [showTaxPack, setShowTaxPack] = useState(false);

  const saveList = async (items) => {
    if (editingList === "everyday") await onSave({ packing_checklist: items });
    else await onSave({ type_checklists: { ...(settings.type_checklists || {}), [editingList]: items } });
    setEditingList(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">The numbers behind the app. Change them here and every screen follows.</p>
      </div>

      <Section icon={Building2} title="Business" blurb="What goes on every invoice.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="ABN">
            <TextInput value={business.draft.abn} onChange={(e) => business.set("abn", e.target.value)} placeholder="55 202 207 046" />
          </Field>
          <Field label="Invoice terms (days)">
            <TextInput type="number" inputMode="numeric" value={business.draft.invoice_due_days} onChange={(e) => business.set("invoice_due_days", e.target.value)} />
          </Field>
        </div>
        <div className="mt-2">
          <Toggle
            label="Registered for GST"
            hint={business.draft.gst_registered ? 'Invoices say "Tax Invoice" and show the GST component.' : 'Invoices say "Invoice" and show no GST. Registration is required once turnover passes $75,000.'}
            checked={business.draft.gst_registered}
            onChange={(v) => business.set("gst_registered", v)}
          />
        </div>
        <SaveRow dirty={business.dirty} saving={business.saving} onSave={() => business.save()} />
      </Section>

      <Section icon={Building2} title="Getting paid" blurb="Printed on every invoice, with the invoice number as the reference.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Account name">
            <TextInput value={bank.draft.bank_account_name} onChange={(e) => bank.set("bank_account_name", e.target.value)} placeholder="Tydie Cleaning" />
          </Field>
          <Field label="BSB">
            <TextInput inputMode="numeric" value={bank.draft.bank_bsb} onChange={(e) => bank.set("bank_bsb", e.target.value)} placeholder="062-000" />
          </Field>
          <Field label="Account number">
            <TextInput inputMode="numeric" value={bank.draft.bank_account_number} onChange={(e) => bank.set("bank_account_number", e.target.value)} placeholder="1234 5678" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Anything else about paying (optional)">
            <TextInput value={bank.draft.payment_note} onChange={(e) => bank.set("payment_note", e.target.value)} placeholder="Cash on the day is fine. Card has a 1.8% surcharge." />
          </Field>
        </div>
        <SaveRow dirty={bank.dirty} saving={bank.saving} onSave={() => bank.save()} />
      </Section>

      <Section icon={Car} title="Van" blurb="For working out distances and the cents-per-km claim.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Home base address">
            <TextInput value={van.draft.home_base_address} onChange={(e) => van.set("home_base_address", e.target.value)} placeholder="Where you set off from" />
          </Field>
          <Field label="Cents per km">
            <TextInput type="number" inputMode="numeric" value={van.draft.mileage_rate_cents} onChange={(e) => van.set("mileage_rate_cents", e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-2">The ATO rate is 88c for 2025-26, capped at 5,000 km. Confirm with your accountant each July.</p>
        <SaveRow dirty={van.dirty} saving={van.saving} onSave={() => van.save()} />
      </Section>

      <Section icon={Users} title="Customers" blurb="When the app nudges you about people.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="'Due soon' means within (days)">
            <TextInput type="number" inputMode="numeric" value={people.draft.due_soon_days} onChange={(e) => people.set("due_soon_days", e.target.value)} />
          </Field>
          <Field label="'Reach out again' after (days)">
            <TextInput type="number" inputMode="numeric" value={people.draft.lapsed_days} onChange={(e) => people.set("lapsed_days", e.target.value)} />
          </Field>
          <Field label="Renewal warning (days ahead)">
            <TextInput type="number" inputMode="numeric" value={people.draft.renewal_lead_days} onChange={(e) => people.set("renewal_lead_days", e.target.value)} />
          </Field>
        </div>
        <SaveRow dirty={people.dirty} saving={people.saving} onSave={() => people.save()} />
      </Section>

      <Section icon={ClipboardList} title="Kit lists" blurb="What to check before leaving. The everyday list shows on every working day; a type's extras show only when that kind of job is on.">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-sm font-medium text-slate-900">Everyday kit</div>
              <div className="text-xs text-slate-400">{(settings.packing_checklist || []).length} items</div>
            </div>
            <button onClick={() => setEditingList("everyday")} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
          </div>
          {PRICE_GROUPS.map((g) => {
            const n = (settings.type_checklists?.[g.title] || []).length;
            return (
              <div key={g.title} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm text-slate-800">{g.title}</div>
                  <div className="text-xs text-slate-400">{n === 0 ? "No extras" : `${n} extra item${n === 1 ? "" : "s"}`}</div>
                </div>
                <button onClick={() => setEditingList(g.title)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={Bell} title="Emails and texts" blurb="Nothing is sent on its own.">
        <p className="text-sm text-slate-700">Every message the app wants to send - a reminder, a confirmation, a chase, an invoice - shows up on Today under <b>Needs you</b>. You see exactly what it says, change it if you like, and tap Send. If you don't, it doesn't go.</p>
        <p className="text-xs text-slate-500 mt-2">This can be loosened later, one kind of message at a time, once you've seen enough of them to trust it.</p>
      </Section>

      <Section icon={Download} title="Tax pack" blurb="Everything the accountant needs for a financial year, as spreadsheets. Records only - not a tax calculation.">
        <button onClick={() => setShowTaxPack(true)} className="flex items-center justify-between w-full text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-xl px-4 py-3 hover:bg-blue-100 transition-colors">
          <span>Download a year's records</span><ChevronRight size={15} />
        </button>
      </Section>

      <Section icon={Wrench} title="Builder tools" blurb="Not part of running the business.">
        <div className="divide-y divide-slate-100">
          <button onClick={onOpenPublicPage} className="flex items-center justify-between w-full py-2.5 text-sm text-slate-700 hover:text-blue-700">
            <span className="flex items-center gap-2"><Globe size={14} /> See the public booking page</span><ChevronRight size={15} className="text-slate-300" />
          </button>
          <button onClick={() => onToggleDemo(!demoMode)} className="flex items-center justify-between w-full py-2.5 text-sm text-slate-700 hover:text-blue-700">
            <span className="flex items-center gap-2"><FlaskConical size={14} /> {demoMode ? "Back to real data" : "Switch to the demo business"}</span><ChevronRight size={15} className="text-slate-300" />
          </button>
          <button onClick={onOpenUsage} className="flex items-center justify-between w-full py-2.5 text-sm text-slate-700 hover:text-blue-700">
            <span className="flex items-center gap-2"><MousePointerClick size={14} /> What he actually does - screens, taps, time, suggestions</span><ChevronRight size={15} className="text-slate-300" />
          </button>
          <button onClick={onOpenDev} className="flex items-center justify-between w-full py-2.5 text-sm text-slate-700 hover:text-blue-700">
            <span className="flex items-center gap-2"><Wrench size={14} /> Changelog and the Journey walkthrough</span><ChevronRight size={15} className="text-slate-300" />
          </button>
          <button onClick={onLogout} className="flex items-center justify-between w-full py-2.5 text-sm text-slate-700 hover:text-rose-700">
            <span className="flex items-center gap-2"><LogOut size={14} /> Sign out</span><ChevronRight size={15} className="text-slate-300" />
          </button>
        </div>
      </Section>

      {editingList && (
        <EditChecklistModal
          title={editingList === "everyday" ? "Everyday kit" : editingList}
          items={editingList === "everyday" ? settings.packing_checklist || [] : settings.type_checklists?.[editingList] || []}
          onCancel={() => setEditingList(null)}
          onSave={saveList}
        />
      )}

      {showTaxPack && <TaxPack invoices={invoices} customers={customers} expenses={expenses} trips={trips} settings={settings} onClose={() => setShowTaxPack(false)} />}
    </div>
  );
}
