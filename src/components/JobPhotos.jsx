import React, { useEffect, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadJobPhoto, fetchJobPhotos, photoUrl } from "../lib/api";

// Photos on a job. Two faces of the same thing:
//   <PhotoButton />  - the small camera on a Today card. One tap opens the
//                      camera, the photo lands on the job, a count appears.
//   <PhotoStrip />   - inside the job record: the photos so far, plus add.
// Both go straight to the camera on a phone (capture="environment"); on a
// desktop the same control is a file picker.

export function PhotoButton({ job, count = 0, onAdded }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await uploadJobPhoto(job, file);
      onAdded?.(job);
    } catch {
      alert("Couldn't save that photo - try again when you've got signal.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label
      title="Take a photo for this job"
      aria-label="Take a photo for this job"
      className="relative flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-300 cursor-pointer shrink-0"
    >
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={busy} />
      {busy ? <Loader2 size={17} className="animate-spin" /> : <Camera size={18} />}
      {count > 0 && !busy && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-semibold">{count}</span>
      )}
    </label>
  );
}

export function PhotoStrip({ job }) {
  const [photos, setPhotos] = useState(null);
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  const load = async () => {
    const rows = await fetchJobPhotos(job.id).catch(() => []);
    setPhotos(rows);
    const next = {};
    await Promise.all(rows.map(async (p) => { next[p.id] = await photoUrl(p.path).catch(() => null); }));
    setUrls(next);
  };
  useEffect(() => { if (job?.id) load(); /* eslint-disable-next-line */ }, [job?.id]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await uploadJobPhoto(job, file);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!job?.id) return null;
  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">Photos</div>
      <div className="flex gap-2 flex-wrap">
        {(photos || []).map((p) => (
          <button key={p.id} type="button" onClick={() => setOpen(p)} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            {urls[p.id] ? <img src={urls[p.id]} alt="" className="w-full h-full object-cover" /> : <Loader2 size={14} className="animate-spin m-auto mt-6 text-slate-400" />}
          </button>
        ))}
        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center text-slate-500 cursor-pointer text-[11px]">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} disabled={busy} />
          {busy ? <Loader2 size={16} className="animate-spin" /> : <><Camera size={16} /> Add</>}
        </label>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setOpen(null)} aria-label="Close"><X size={24} /></button>
          {urls[open.id] && <img src={urls[open.id]} alt="" className="max-w-full max-h-full rounded-lg" />}
        </div>
      )}
    </div>
  );
}
