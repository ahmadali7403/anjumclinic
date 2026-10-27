import { useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Phone,
  ImagePlus,
  Save,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  pharmacyName: "MediPOS Pharmacy",
  address: "",
  phone: "",
  logo: "",
};

const normalizeSettings = (settings) => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
});

export default function SettingsView({
  settings = DEFAULT_SETTINGS,
  onSave,
  notify,
}) {
  const [form, setForm] = useState(() => normalizeSettings(settings));
  const [original, setOriginal] = useState(() => normalizeSettings(settings));
  const [editing, setEditing] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = normalizeSettings(settings);
    setForm(next);
    setOriginal(next);
  }, [settings]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const handleEdit = () => {
    setOriginal(normalizeSettings(settings));
    setForm(normalizeSettings(settings));
    setLogoError("");
    setSaved(false);
    setEditing(true);
  };

  const handleCancel = () => {
    setForm(normalizeSettings(settings));
    setOriginal(normalizeSettings(settings));
    setLogoError("");
    setSaved(false);
    setEditing(false);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError("");
    setSaved(false);

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Sirf PNG ya JPG image upload karein.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo ka size 2 MB se kam hona chahiye.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        logo: String(reader.result || ""),
      }));
    };

    reader.onerror = () => {
      setLogoError("Logo read nahi ho saka. Dobara try karein.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removeLogo = () => {
    setForm((current) => ({ ...current, logo: "" }));
    setLogoError("");
    setSaved(false);
  };

  const handleSave = () => {
    if (typeof onSave !== "function") {
      notify?.(
        "Settings save nahi ho sakin. App.jsx mein onSave connection check karein.",
        "error",
      );
      return;
    }

    const pharmacyName = form.pharmacyName.trim();

    if (!pharmacyName) {
      notify?.("Pharmacy ka naam enter karein.", "error");
      return;
    }

    const cleanedSettings = {
      pharmacyName,
      address: form.address.trim(),
      phone: form.phone.trim(),
      logo: form.logo || "",
    };

    try {
      setSaving(true);
      onSave(cleanedSettings);
      setForm(cleanedSettings);
      setOriginal(cleanedSettings);
      setSaved(true);
      setEditing(false);
      notify?.("Pharmacy settings save ho gayi hain.", "success");
    } catch (error) {
      console.error("Settings save failed:", error);
      notify?.("Settings save nahi ho sakin. Dobara try karein.", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-600";

  const labelClass = "mb-2 block text-sm font-semibold text-stone-700";

  const displayValue = (value) =>
    value?.trim() ? value : "Abhi set nahi kiya";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-y-auto pb-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Configuration
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Pharmacy Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            Pharmacy ki details manage karein. Ye information bills par use
            hogi.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Pencil size={17} />
            Edit Settings
          </button>
        )}
      </header>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} />
          Settings successfully save ho gayi hain.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-stone-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Store size={21} />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Pharmacy Information</h2>
              <p className="mt-1 text-xs text-stone-500">
                Bill par print hone wali details
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Pharmacy Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder="e.g. MediCare Pharmacy"
                  value={form.pharmacyName}
                  disabled={!editing}
                  onChange={(e) => updateField("pharmacyName", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Pharmacy Address</label>
              <div className="relative">
                <MapPin
                  size={17}
                  className="absolute left-3.5 top-3.5 text-stone-400"
                />
                <textarea
                  className={`${inputClass} min-h-24 resize-y pl-10`}
                  placeholder="Shop number, bazaar, city..."
                  rows={3}
                  value={form.address}
                  disabled={!editing}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Phone Number(s)</label>
              <div className="relative">
                <Phone
                  size={17}
                  className="absolute left-3.5 top-3.5 text-stone-400"
                />
                <textarea
                  className={`${inputClass} min-h-20 resize-y pl-10`}
                  placeholder={"0300-1234567\n0301-7654321"}
                  rows={2}
                  value={form.phone}
                  disabled={!editing}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Multiple numbers ke liye har number alag line mein likhein.
              </p>
            </div>
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <ImagePlus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-stone-900">Pharmacy Logo</h2>
              <p className="mt-1 text-xs text-stone-500">Optional · PNG/JPG</p>
            </div>
          </div>

          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-5 text-center">
            {form.logo ? (
              <>
                <img
                  src={form.logo}
                  alt="Pharmacy logo preview"
                  className="mb-4 max-h-28 max-w-full object-contain"
                />
                <p className="mb-3 text-xs text-stone-500">Logo preview</p>
                {editing && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Remove Logo
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-400 shadow-sm">
                  <Building2 size={27} />
                </div>
                <p className="text-sm font-semibold text-stone-700">
                  No logo uploaded
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  PNG or JPG, maximum 2 MB
                </p>
              </>
            )}
          </div>

          {editing && (
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
              <ImagePlus size={17} />
              Choose Logo
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
          )}

          {logoError && (
            <p className="mt-3 flex items-start gap-2 text-xs text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {logoError}
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-stone-400">
            Logo settings ke saath save hoga. Backup banate waqt logo bhi
            include kiya ja sakta hai.
          </p>
        </section>
      </div>

      {!editing && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-bold text-stone-900">Saved Information</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="mb-1 text-stone-500">Pharmacy Name</dt>
              <dd className="font-semibold text-stone-900">
                {displayValue(original.pharmacyName)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-stone-500">Address</dt>
              <dd className="whitespace-pre-line text-stone-800">
                {displayValue(original.address)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-stone-500">Phone Number(s)</dt>
              <dd className="whitespace-pre-line text-stone-800">
                {displayValue(original.phone)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-stone-500">Logo</dt>
              <dd className="text-stone-800">
                {original.logo ? "Logo uploaded" : "No logo"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-2 text-xs text-stone-500">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              Changes apply karne ke liye Save Changes dabayein. Cancel karne
              par unsaved changes discard ho jayengi.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              <X size={17} />
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
