import { useCallback, useEffect, useMemo, useState } from "react";
import { improveListing } from "@/lib/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useExtension } from "@/hooks/useExtension";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { usePublishLog } from "@/hooks/usePublishLog";
import { PublishLog } from "@/components/PublishLog";
import {
  CONDITION_OPTIONS,
  createListing,
  formatCondition,
  loadInventory,
  saveInventory,
  updateListingStatus,
} from "@/lib/inventory";
import { calculatePayouts, suggestListPrice, FEE_CONFIG } from "@/lib/fees";
import {
  applyTemplate,
  createTemplate,
  loadTemplates,
  saveTemplates,
} from "@/lib/templates";
import {
  drawMeasurementOverlay,
  formatMeasurements,
  MEASUREMENT_CATEGORIES,
} from "@/lib/measurements";
import styles from "@/styles/Home.module.css";

const STATUS_LABEL = {
  draft: "Draft",
  publishing: "Publishing...",
  published: "Needs review",
  review: "Needs review",
  sold: "Sold",
};

const SAMPLE_LISTING = {
  title: "Vintage NIN ‘Pretty Hate Machine’ Tee",
  description:
    "Single-stitch black tee from the 1990 Pretty Hate Machine era. Soft cotton with a faded front print. Great vintage condition with light wear consistent with age.",
  tags: "vintage, band tee, nine inch nails, 90s, single stitch",
  price: "85",
  measurements: "Pit to pit: 22in, Length: 28in, Shoulder: 19in",
  condition: "good",
  category: "Tops",
  brand: "Nine Inch Nails",
  size: "XL",
  flaws: [{ location: "print", description: "slight fading" }],
  optimizeFor: "grailed",
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [measurements, setMeasurements] = useState("");
  const [measurementCategory, setMeasurementCategory] = useState("");
  const [measurementValues, setMeasurementValues] = useState({});
  const [condition, setCondition] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [flaws, setFlaws] = useState([]);
  const [targetNet, setTargetNet] = useState("");
  const [optimizeFor, setOptimizeFor] = useState("grailed");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [published, setPublished] = useState(null);
  const { publishLog, logPublish, clearPublishLog } = usePublishLog();

  const { track } = useAnalytics();
  const { status: extStatus, lastError: extError, retry: retryExtension, parseDepop, autofillGrailed, publishDepop } = useExtension();

  // Autosave restoration happens once on mount.
  const restoreDraft = useCallback((saved) => {
    if (saved.url !== undefined) setUrl(saved.url);
    if (saved.title !== undefined) setTitle(saved.title);
    if (saved.description !== undefined) setDescription(saved.description);
    if (saved.tags !== undefined) setTags(saved.tags);
    if (saved.price !== undefined) setPrice(saved.price);
    if (saved.measurements !== undefined) setMeasurements(saved.measurements);
    if (saved.condition !== undefined) setCondition(saved.condition);
    if (saved.category !== undefined) setCategory(saved.category);
    if (saved.brand !== undefined) setBrand(saved.brand);
    if (saved.size !== undefined) setSize(saved.size);
    if (saved.flaws !== undefined) setFlaws(saved.flaws);
    if (saved.targetNet !== undefined) setTargetNet(saved.targetNet);
    if (saved.optimizeFor !== undefined) setOptimizeFor(saved.optimizeFor);
    if (saved.images && saved.images.length > 0) setImages(saved.images);
    if (saved.title?.trim() || saved.description?.trim()) {
      setView("form");
    }
  }, []);

  const draftSnapshot = useMemo(
    () => ({
      url,
      title,
      description,
      tags,
      price,
      measurements,
      condition,
      category,
      brand,
      size,
      flaws,
      targetNet,
      optimizeFor,
      images,
    }),
    [url, title, description, tags, price, measurements, condition, category, brand, size, flaws, targetNet, optimizeFor, images]
  );

  const draftApi = useMemo(
    () => ({
      snapshot: () => draftSnapshot,
      hasContent: () =>
        title.trim() ||
        description.trim() ||
        tags.trim() ||
        price.trim() ||
        measurements.trim() ||
        condition ||
        category ||
        brand ||
        size ||
        flaws.length > 0 ||
        url.trim() ||
        optimizeFor !== "grailed" ||
        images.length > 0,
      restore: restoreDraft,
    }),
    [draftSnapshot, title, description, tags, price, measurements, condition, category, brand, size, flaws, url, optimizeFor, images, restoreDraft]
  );

  const { clear: clearDraft } = useDraftAutosave(draftApi);

  // Load inventory and templates on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setInventory(loadInventory());
    setTemplates(loadTemplates());
  }, []);

  // Persist inventory on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    saveInventory(inventory);
  }, [inventory]);

  // Persist templates on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    saveTemplates(templates);
  }, [templates]);

  // Prefill the form from query params sent by the extension popup or shared links.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const paramUrl = params.get("url") || "";
    const paramTitle = params.get("title") || "";
    const paramDescription = params.get("description") || "";
    const paramTags = params.get("tags") || "";
    const paramPrice = params.get("price") || "";
    const paramImage = params.get("image") || "";
    const paramMeasurements = params.get("measurements") || "";
    const paramBrand = params.get("brand") || "";
    const paramCategory = params.get("category") || "";
    const paramSize = params.get("size") || "";
    const paramCondition = params.get("condition") || "";

    if (paramUrl || paramTitle || paramDescription || paramTags || paramPrice || paramImage || paramMeasurements || paramBrand || paramCategory || paramSize || paramCondition) {
      setView("form");
    }

    if (paramUrl) setUrl(paramUrl);
    if (paramTitle) setTitle(paramTitle);
    if (paramDescription) setDescription(paramDescription);
    if (paramTags) setTags(paramTags);
    if (paramPrice) setPrice(paramPrice);
    if (paramImage) setImages([paramImage]);
    if (paramMeasurements) setMeasurements(paramMeasurements);
    if (paramBrand) setBrand(paramBrand);
    if (paramCategory) setCategory(paramCategory);
    if (paramSize) setSize(paramSize);
    if (paramCondition) setCondition(paramCondition);

    if (source) {
      track("prefill_from_query", { source });
    }
  }, [track]);

  const resetForm = () => {
    setEditingId(null);
    setUrl("");
    setTitle("");
    setDescription("");
    setTags("");
    setPrice("");
    setImages([]);
    setMeasurements("");
    setCondition("");
    setCategory("");
    setBrand("");
    setSize("");
    setFlaws([]);
    setTargetNet("");
    setOptimizeFor("grailed");
    setResult(null);
    setError("");
    setPublished(null);
    clearDraft();
  };

  const startNew = () => {
    resetForm();
    setView("form");
    track("create_new_listing");
  };

  const loadSample = () => {
    resetForm();
    setTitle(SAMPLE_LISTING.title);
    setDescription(SAMPLE_LISTING.description);
    setTags(SAMPLE_LISTING.tags);
    setPrice(SAMPLE_LISTING.price);
    setMeasurements(SAMPLE_LISTING.measurements);
    setCondition(SAMPLE_LISTING.condition);
    setCategory(SAMPLE_LISTING.category);
    setBrand(SAMPLE_LISTING.brand);
    setSize(SAMPLE_LISTING.size);
    setFlaws(SAMPLE_LISTING.flaws);
    setOptimizeFor(SAMPLE_LISTING.optimizeFor);
    setView("form");
    track("sample_listing_loaded");
  };

  const loadIntoForm = (listing) => {
    setEditingId(listing.id);
    setUrl(listing.url || "");
    setTitle(listing.title || "");
    setDescription(listing.description || "");
    setTags(Array.isArray(listing.tags) ? listing.tags.join(", ") : listing.tags || "");
    setPrice(String(listing.price || ""));
    setImages(listing.images || []);
    setMeasurements(listing.measurements || "");
    setCondition(listing.condition || "");
    setCategory(listing.category || "");
    setBrand(listing.brand || "");
    setSize(listing.size || "");
    setFlaws(listing.flaws || []);
    setResult(null);
    setError("");
    setPublished(null);
    setView("form");
    track("edit_listing", { id: listing.id });
  };

  const saveCurrent = () => {
    if (!title.trim()) {
      setError("Title is required to save a listing.");
      return;
    }
    setError("");

    const draft = {
      url,
      title,
      description,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      price,
      measurements,
      condition,
      category,
      brand,
      size,
      flaws,
      images,
    };

    setInventory((prev) => {
      if (editingId) {
        const next = prev.map((item) =>
          item.id === editingId
            ? { ...item, ...draft, updatedAt: new Date().toISOString() }
            : item
        );
        track("listing_saved", { id: editingId, action: "update" });
        return next;
      }
      const item = createListing(draft);
      track("listing_saved", { id: item.id, action: "create" });
      setEditingId(item.id);
      return [item, ...prev];
    });
  };

  const deleteListing = (id) => {
    if (!confirm("Delete this listing?")) return;
    setInventory((prev) => prev.filter((item) => item.id !== id));
    track("listing_deleted", { id });
    if (editingId === id) {
      resetForm();
      setView("list");
    }
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      setError("Template name is required.");
      return;
    }
    const draft = {
      condition,
      flaws,
      measurements,
      tags,
      optimizeFor,
    };
    const template = createTemplate(templateName, draft);
    setTemplates((prev) => [template, ...prev]);
    setTemplateName("");
    track("template_saved", { id: template.id });
  };

  const applySelectedTemplate = (id) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    applyTemplate(template, {
      setCondition,
      setFlaws,
      setMeasurements,
      setTags,
      setOptimizeFor,
    });
    track("template_applied", { id });
  };

  const deleteTemplate = (id) => {
    if (!confirm("Delete this template?")) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    track("template_deleted", { id });
  };

  const setPlatformStatus = (id, platform, status, url = "") => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? updateListingStatus(item, platform, status, url) : item
      )
    );
  };

  const handleImprove = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    track("improve_clicked", { has_url: !!url });

    try {
      const payload = {
        platform: optimizeFor,
        title,
        description,
        tags,
        price,
        condition,
        flaws,
      };
      const improved = await improveListing(payload);
      setResult(improved);
      track("improve_succeeded", { platform: improved.platform });
    } catch (err) {
      setError(err.message);
      track("improve_failed", { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleParseDepop = async () => {
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    track("parse_depop_clicked");

    try {
      const response = await parseDepop(url.trim());
      if (!response?.ok) {
        throw new Error(response?.error || "Extension could not parse Depop.");
      }
      const job = response.job || {};
      setTitle(job.title || "");
      setDescription(job.description || "");
      setTags(Array.isArray(job.tags) ? job.tags.join(", ") : job.tags || "");
      setPrice(String(job.price || ""));
      setImages(Array.isArray(job.images) ? job.images : []);
      track("parse_depop_succeeded");
    } catch (err) {
      // Fallback: keep the URL so the user can fill fields manually.
      setError(err.message);
      track("parse_depop_failed", { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillGrailed = async () => {
    const job = result ? result : buildJob();
    if (!job.title) return;

    const id = editingId || createListing(buildJob()).id;
    if (!editingId) {
      // Auto-save a brand-new listing before publishing.
      setInventory((prev) => [createListing(buildJob()), ...prev]);
      setEditingId(id);
    }

    setPlatformStatus(id, "grailed", "publishing");
    setError("");
    track("autofill_grailed_clicked");

    const item = inventory.find((i) => i.id === id) || { id, title: job.title, platforms: {} };
    const response = await autofillGrailed(job);
    if (response?.ok) {
      track("autofill_grailed_succeeded");
      setPublished("grailed");
      setPlatformStatus(id, "grailed", "published");
      logPublish(item, "grailed", "published");
    } else {
      const err = response?.error || "Could not autofill Grailed.";
      setError(err);
      track("autofill_grailed_failed", { error: err });
      setPlatformStatus(id, "grailed", "draft");
      logPublish(item, "grailed", "failed", err);
    }
  };

  const handlePublishDepop = async () => {
    if (!title.trim()) return;

    const id = editingId || createListing(buildJob()).id;
    if (!editingId) {
      setInventory((prev) => [createListing(buildJob()), ...prev]);
      setEditingId(id);
    }

    setPlatformStatus(id, "depop", "publishing");
    setError("");
    setPublished(null);
    track("publish_depop_clicked");

    const job = buildJob();
    const item = inventory.find((i) => i.id === id) || { id, title: job.title, platforms: {} };
    const response = await publishDepop(job);
    if (response?.ok) {
      track("publish_depop_succeeded");
      setPublished("depop");
      setPlatformStatus(id, "depop", "published");
      logPublish(item, "depop", "published");
    } else {
      const err = response?.error || "Could not publish to Depop.";
      setError(err);
      track("publish_depop_failed", { error: err });
      setPlatformStatus(id, "depop", "draft");
      logPublish(item, "depop", "failed", err);
    }
  };

  const buildJob = () => ({
    title,
    description: [description, formatCondition(condition, flaws), measurements]
      .filter(Boolean)
      .join("\n\n"),
    tags: tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    price,
    images,
    // Raw structured fields for Depop autofill (#49). Condition is also folded
    // into the description above; these let the extension map to Depop's
    // category/brand/size/condition controls directly.
    category,
    brand,
    size,
    condition,
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((dataUrls) => {
        setImages((prev) => [...prev, ...dataUrls]);
        track("images_uploaded", { count: dataUrls.length });
      })
      .catch((err) => {
        console.error("[Second Skin] Image upload failed:", err);
        setError("Failed to process one or more images.");
      });
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearImages = () => {
    if (!confirm("Remove all photos?")) return;
    setImages([]);
  };

  const moveImage = (from, to) => {
    if (from === to) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateMeasurementValue = (key, value) => {
    setMeasurementValues((prev) => ({ ...prev, [key]: value }));
  };

  const insertMeasurementTemplate = () => {
    const formatted = formatMeasurements(measurementCategory, measurementValues);
    if (!formatted) return;
    setMeasurements((prev) => {
      const base = prev.trim();
      return base ? `${base}\n${formatted}` : formatted;
    });
  };

  const generateMeasurementOverlay = () => {
    const dataUrl = drawMeasurementOverlay(measurementCategory, measurementValues);
    if (!dataUrl) return;
    setImages((prev) => [...prev, dataUrl]);
    track("measurement_overlay_generated", { category: measurementCategory });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(inventory.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} listings?`)) return;
    setInventory((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    track("bulk_deleted", { count: selectedIds.size });
    setSelectedIds(new Set());
  };

  const bulkPublish = async (platform) => {
    if (extStatus !== "ready") return;
    const targets = inventory.filter((item) => selectedIds.has(item.id));
    if (targets.length === 0) return;

    track(`bulk_publish_${platform}_clicked`, { count: targets.length });

    for (const item of targets) {
      setPlatformStatus(item.id, platform, "publishing");
      const job = {
        title: item.title,
        description: [item.description, formatCondition(item.condition, item.flaws), item.measurements]
          .filter(Boolean)
          .join("\n\n"),
        tags: item.tags || [],
        price: item.price,
        images: item.images || [],
        category: item.category || "",
        brand: item.brand || "",
        size: item.size || "",
        condition: item.condition || "",
      };

      const response =
        platform === "grailed"
          ? await autofillGrailed(job)
          : await publishDepop(job);

      if (response?.ok) {
        setPlatformStatus(item.id, platform, "published");
        logPublish(item, platform, "published");
      } else {
        const err = response?.error || `Could not publish to ${platform}.`;
        setPlatformStatus(item.id, platform, "draft");
        logPublish(item, platform, "failed", err);
      }
      // Small delay between sequential publishes to avoid tab spam.
      await new Promise((r) => setTimeout(r, 500));
    }

    track(`bulk_publish_${platform}_done`, { count: targets.length });
    setSelectedIds(new Set());
  };

  const publishedPlatforms = (item) =>
    Object.entries(item.platforms || {}).filter(
      ([, p]) => p.status === "published"
    );

  const markAsSold = (item) => {
    const platforms = publishedPlatforms(item);
    if (platforms.length === 0) return;

    platforms.forEach(([platform, p]) => {
      const url = p.url || platformDefaultUrl(platform);
      setPlatformStatus(item.id, platform, "sold", p.url);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });

    track("mark_as_sold", {
      platforms: platforms.map(([p]) => p).join(","),
      hasUrls: platforms.filter(([, p]) => p.url).length,
    });
  };

  const platformDefaultUrl = (platform) => {
    if (platform === "grailed") return "https://www.grailed.com/sell";
    if (platform === "depop") return "https://www.depop.com/"; // best generic fallback
    return "";
  };

  const bulkMarkAsSold = () => {
    const targets = inventory.filter((item) => selectedIds.has(item.id));
    if (targets.length === 0) return;
    targets.forEach(markAsSold);
    setSelectedIds(new Set());
  };

  const copy = async (key, value) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const statusClass =
    extStatus === "ready"
      ? styles.ready
      : extStatus === "missing"
      ? styles.missing
      : styles.unknown;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Second Skin</h1>
        <p>Create once, publish everywhere. Manage your listings below.</p>
      </header>

      <div className={`${styles.extensionStatus} ${statusClass}`}>
        <span className={styles.dot} />
        {extStatus === "ready" && "Extension connected"}
        {extStatus === "missing" && (
          <>
            Extension not detected —{" "}
            <a
              href="https://developer.chrome.com/docs/extensions/mv3/getstarted#unpacked"
              target="_blank"
              rel="noreferrer"
            >
              load unpacked
            </a>
          </>
        )}
        {extStatus === "unknown" && "Checking extension..."}
      </div>

      {extError && extStatus !== "ready" && (
        <div className={styles.error}>
          {extError}
          <button
            className={styles.secondary}
            onClick={retryExtension}
            style={{ marginLeft: "0.75rem" }}
          >
            Retry
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <PublishLog entries={publishLog} onClear={clearPublishLog} />

      {extStatus === "missing" && (
        <section className={`${styles.card} ${styles.ctaCard}`}>
          <h2>Install the Second Skin extension</h2>
          <p>
            Copy buttons work without it, but the extension enables one-click publish to Depop and Grailed.
          </p>
          <a
            className={styles.primary}
            href="https://developer.chrome.com/docs/extensions/mv3/getstarted#unpacked"
            target="_blank"
            rel="noreferrer"
          >
            Load unpacked extension
          </a>
        </section>
      )}

      {view === "list" && (
        <>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={startNew}>+ Create New Listing</button>
          </div>
          {inventory.length === 0 ? (
            <section className={styles.card}>
              <h2>No listings yet</h2>
              <p className={styles.hint}>
                Create your first listing, or import one from a Depop URL or the extension popup.
              </p>
              <div className={styles.actions}>
                <button className={styles.primary} onClick={startNew}>Create New Listing</button>
                <button className={styles.secondary} onClick={loadSample}>Try sample listing</button>
              </div>
              <div className={styles.tourChecklist}>
                <h4>First-listing walkthrough</h4>
                <ul>
                  <li>Add item details or load the sample</li>
                  <li>Click Improve with AI to optimize for your platform</li>
                  <li>Save to inventory, then publish to Depop or Grailed</li>
                </ul>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.card}>
                <div className={styles.bulkBar}>
                  <label className={styles.selectAll}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === inventory.length && inventory.length > 0}
                      onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                    />
                    Select all
                  </label>
                  <div className={styles.bulkActions}>
                    <button
                      className={styles.secondary}
                      disabled={selectedIds.size === 0 || extStatus !== "ready"}
                      onClick={() => bulkPublish("grailed")}
                    >
                      Publish {selectedIds.size > 0 && `(${selectedIds.size})`} to Grailed
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={selectedIds.size === 0 || extStatus !== "ready"}
                      onClick={() => bulkPublish("depop")}
                    >
                      Publish {selectedIds.size > 0 && `(${selectedIds.size})`} to Depop
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={
                        selectedIds.size === 0 ||
                        !inventory.some(
                          (item) => selectedIds.has(item.id) && publishedPlatforms(item).length > 0
                        )
                      }
                      onClick={bulkMarkAsSold}
                    >
                      Mark sold {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </button>
                    <button
                      className={styles.danger}
                      disabled={selectedIds.size === 0}
                      onClick={bulkDelete}
                    >
                      Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </button>
                  </div>
                </div>
              </section>

              <div className={styles.inventoryGrid}>
                {inventory.map((item) => (
                  <div key={item.id} className={styles.inventoryCard}>
                    <label className={styles.cardCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </label>
                    <div
                      className={styles.inventoryThumb}
                      onClick={() => loadIntoForm(item)}
                      role="button"
                      tabIndex={0}
                    >
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} />
                      ) : (
                        <div className={styles.noImage}>No photo</div>
                      )}
                    </div>
                    <div className={styles.inventoryBody}>
                      <h3 onClick={() => loadIntoForm(item)} role="button" tabIndex={0}>
                        {item.title}
                      </h3>
                      <p className={styles.price}>{item.price ? `$${item.price}` : "No price"}</p>
                      <div className={styles.badgeRow}>
                        <span className={`${styles.badge} ${styles[`status${capitalize(item.platforms?.grailed?.status)}`]}`}>
                          Grailed: {STATUS_LABEL[item.platforms?.grailed?.status] || "Draft"}
                        </span>
                        <span className={`${styles.badge} ${styles[`status${capitalize(item.platforms?.depop?.status)}`]}`}>
                          Depop: {STATUS_LABEL[item.platforms?.depop?.status] || "Draft"}
                        </span>
                      </div>
                      <div className={styles.inventoryActions}>
                        <button className={styles.secondary} onClick={() => loadIntoForm(item)}>Edit / Publish</button>
                        {publishedPlatforms(item).length > 0 && (
                          <button className={styles.secondary} onClick={() => markAsSold(item)}>
                            Mark sold
                          </button>
                        )}
                        <button className={styles.danger} onClick={() => deleteListing(item.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "form" && (
        <>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => setView("list")}>← Back to Inventory</button>
          </div>

          {!editingId && (
            <section className={`${styles.card} ${styles.tourCard}`}>
              <div className={styles.tourHeader}>
                <h3>🎉 Welcome — create your first listing in 3 steps</h3>
                <button
                  className={styles.secondary}
                  onClick={() => setView("list")}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
              <ol className={styles.tourSteps}>
                <li>Add source URL or fill in title, description, and photos.</li>
                <li>Choose a platform and click Improve with AI.</li>
                <li>Save to inventory, then publish to Depop or Grailed.</li>
              </ol>
              <button className={styles.secondary} onClick={loadSample}>
                Load sample listing
              </button>
            </section>
          )}

          <section className={styles.card}>
            <h2>1. Source</h2>
            <div className={styles.field}>
              <label htmlFor="url">Listing URL (optional)</label>
              <input
                id="url"
                type="url"
                placeholder="https://www.depop.com/products/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className={styles.hint}>
                Paste a Depop listing URL, or cross-list from another supported
                platform. Leave blank to enter fields manually.
              </p>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.secondary}
                onClick={handleParseDepop}
                disabled={!url.trim() || loading}
              >
                Pull from URL
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h2>2. Listing</h2>
            <div className={styles.field}>
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Vintage Levi's 501"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item, condition, and fit..."
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vintage, levis, denim"
              />
              <p className={styles.hint}>Comma-separated.</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="price">Price (optional)</label>
              <input
                id="price"
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120"
              />
              <p className={styles.hint}>Used when improving for market-specific pricing.</p>
              {price.trim() && (
                <FeePanel price={price} targetNet={targetNet} setTargetNet={setTargetNet} setPrice={setPrice} />
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="measurements">Measurements (optional)</label>
              <textarea
                id="measurements"
                value={measurements}
                onChange={(e) => setMeasurements(e.target.value)}
                placeholder="Pit to pit: 24in, Length: 29in, Shoulder: 19in..."
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="measurementCategory">Measurement template (optional)</label>
              <select
                id="measurementCategory"
                value={measurementCategory}
                onChange={(e) => {
                  setMeasurementCategory(e.target.value);
                  setMeasurementValues({});
                }}
              >
                <option value="">— Select category —</option>
                {Object.entries(MEASUREMENT_CATEGORIES).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              {measurementCategory && (
                <>
                  <div className={styles.measurementFields}>
                    {MEASUREMENT_CATEGORIES[measurementCategory].fields.map((field) => (
                      <div key={field.key} className={styles.measurementField}>
                        <label htmlFor={`ms-${field.key}`}>{field.label}</label>
                        <input
                          id={`ms-${field.key}`}
                          type="text"
                          placeholder="in / cm"
                          value={measurementValues[field.key] || ""}
                          onChange={(e) => updateMeasurementValue(field.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.secondary}
                      onClick={insertMeasurementTemplate}
                      type="button"
                    >
                      Insert into measurements
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={generateMeasurementOverlay}
                      type="button"
                    >
                      Generate overlay image
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="category">Category (optional)</label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Tops, Bottoms, Outerwear…"
              />
              <p className={styles.hint}>Maps to Depop's category/size selectors on publish (#49).</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="brand">Brand (optional)</label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Levi's"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="size">Size (optional)</label>
              <input
                id="size"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. M, XL, 32"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="condition">Condition (optional)</label>
              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="">— Select condition —</option>
                {CONDITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {condition && (
              <div className={styles.field}>
                <label>Flaws / disclosures</label>
                <div className={styles.flawList}>
                  {flaws.map((flaw, i) => (
                    <div key={i} className={styles.flawRow}>
                      <input
                        type="text"
                        placeholder="Location (e.g. left sleeve)"
                        value={flaw.location || ""}
                        onChange={(e) => {
                          const next = [...flaws];
                          next[i] = { ...next[i], location: e.target.value };
                          setFlaws(next);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g. tiny hole)"
                        value={flaw.description || ""}
                        onChange={(e) => {
                          const next = [...flaws];
                          next[i] = { ...next[i], description: e.target.value };
                          setFlaws(next);
                        }}
                      />
                      <button
                        className={styles.removeFlaw}
                        onClick={() => setFlaws(flaws.filter((_, idx) => idx !== i))}
                        type="button"
                        title="Remove flaw"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    className={styles.secondary}
                    onClick={() => setFlaws([...flaws, { location: "", description: "" }])}
                    type="button"
                  >
                    + Add flaw
                  </button>
                </div>
                {formatCondition(condition, flaws) && (
                  <p className={styles.conditionPreview}>
                    Preview: {formatCondition(condition, flaws)}
                  </p>
                )}
              </div>
            )}

            <div className={styles.field}>
              <label>Templates / brand defaults</label>
              {templates.length > 0 && (
                <div className={styles.templateRow}>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) applySelectedTemplate(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">— Apply a template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.templateSaveRow}>
                <input
                  type="text"
                  placeholder="Template name (e.g. Vintage tees)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <button
                  className={styles.secondary}
                  onClick={saveTemplate}
                  type="button"
                >
                  Save current as template
                </button>
              </div>
              {templates.length > 0 && (
                <ul className={styles.templateList}>
                  {templates.map((t) => (
                    <li key={t.id}>
                      <span>{t.name}</span>
                      <button
                        className={styles.removeFlaw}
                        onClick={() => deleteTemplate(t.id)}
                        title="Delete template"
                        type="button"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="images">Photos (optional)</label>
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className={styles.fileInput}
              />
              {images.length > 0 && (
                <>
                  <p className={styles.hint}>Drag photos to reorder. First photo is the listing thumbnail.</p>
                  <div className={styles.thumbnails}>
                    {images.map((src, i) => (
                      <div
                        key={i}
                        className={`${styles.thumbWrap} ${draggingIdx === i ? styles.dragging : ""} ${i === 0 ? styles.primaryThumb : ""}`}
                        draggable
                        onDragStart={() => setDraggingIdx(i)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggingIdx !== i) moveImage(draggingIdx, i);
                        }}
                        onDragEnd={() => setDraggingIdx(null)}
                      >
                        <img src={src} alt={`Uploaded ${i + 1}`} />
                        {i === 0 && <span className={styles.heroBadge}>Hero</span>}
                        <button
                          className={styles.removeThumb}
                          onClick={() => removeImage(i)}
                          title="Remove"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.secondary} onClick={clearImages}>Clear all photos</button>
                  </div>
                </>
              )}
            </div>
            <div className={styles.actions}>
              <div className={styles.platformSelect}>
                <label htmlFor="optimizeFor">Optimize for</label>
                <select
                  id="optimizeFor"
                  value={optimizeFor}
                  onChange={(e) => setOptimizeFor(e.target.value)}
                  disabled={loading}
                >
                  <option value="grailed">Grailed</option>
                  <option value="depop">Depop</option>
                  <option value="poshmark">Poshmark</option>
                </select>
              </div>
              <button
                className={styles.primary}
                onClick={handleImprove}
                disabled={(!title.trim() && !description.trim()) || loading}
              >
                {loading ? "Improving..." : "Improve with AI"}
              </button>
              <button
                className={styles.secondary}
                onClick={saveCurrent}
                disabled={!title.trim()}
              >
                Save to Inventory
              </button>
            </div>
          </section>

          {result ? (
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <h2>3. Improved for {result.platform}</h2>
                <button
                  className={styles.secondary}
                  onClick={() => copy("all", `${result.title}\n\n${result.description}\n\n${result.tags.join(", ")}`)}
                >
                  {copied === "all" ? "Copied!" : "Copy all"}
                </button>
              </div>

              {[
                { key: "title", label: "Title", value: result.title },
                { key: "description", label: "Description", value: result.description },
                { key: "tags", label: "Tags", value: result.tags.join(", ") },
              ].map(({ key, label, value }) => (
                <div key={key} className={styles.outputRow}>
                  <div className={styles.output}>
                    <h3>{label}</h3>
                    {key === "tags" ? (
                      <ul>
                        {result.tags.map((tag, i) => (
                          <li key={i}>{tag}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{value}</p>
                    )}
                  </div>
                  <button
                    className={styles.secondary}
                    onClick={() => copy(key, value)}
                  >
                    {copied === key ? "Copied!" : `Copy ${label.toLowerCase()}`}
                  </button>
                </div>
              ))}

              <div className={`${styles.actions} ${styles.platformActions}`}>
                <button
                  className={styles.primary}
                  onClick={handleAutofillGrailed}
                  disabled={extStatus !== "ready"}
                >
                  {extStatus === "ready" ? "Publish to Grailed" : "Install extension to publish"}
                </button>
                <button
                  className={styles.secondary}
                  onClick={handlePublishDepop}
                  disabled={extStatus !== "ready" || !title.trim()}
                >
                  {extStatus === "ready" ? "Publish to Depop" : "Install extension to publish"}
                </button>
              </div>
              {published && (
                <div className={styles.success}>
                  {published === "grailed"
                    ? "Opened Grailed with this listing. Review and submit there."
                    : "Opened Depop with this listing. Review and submit there."}
                </div>
              )}
            </section>
          ) : (
            <section className={styles.card}>
              <h2>3. Publish</h2>
              <p className={styles.hint}>Publish directly from your current draft.</p>
              <div className={`${styles.actions} ${styles.platformActions}`}>
                <button
                  className={styles.primary}
                  onClick={handleAutofillGrailed}
                  disabled={extStatus !== "ready" || !title.trim()}
                >
                  {extStatus === "ready" ? "Publish to Grailed" : "Install extension to publish"}
                </button>
                <button
                  className={styles.secondary}
                  onClick={handlePublishDepop}
                  disabled={extStatus !== "ready" || !title.trim()}
                >
                  {extStatus === "ready" ? "Publish to Depop" : "Install extension to publish"}
                </button>
              </div>
              {published && (
                <div className={styles.success}>
                  {published === "grailed"
                    ? "Opened Grailed with this listing. Review and submit there."
                    : "Opened Depop with this listing. Review and submit there."}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FeePanel({ price, targetNet, setTargetNet, setPrice }) {
  const payouts = calculatePayouts(price);
  if (!payouts) return null;

  return (
    <div className={styles.feePanel}>
      <h4>Estimated payout by platform</h4>
      <div className={styles.feeGrid}>
        {Object.keys(FEE_CONFIG).map((key) => {
          const cfg = FEE_CONFIG[key];
          const p = payouts[key];
          return (
            <div key={key} className={styles.feeCard} style={{ borderColor: cfg.color }}>
              <div className={styles.feeName}>{cfg.name}</div>
              <div className={styles.feeNet}>${p.net.toFixed(2)}</div>
              <div className={styles.feeMeta}>
                ${p.total.toFixed(2)} fees ({p.effective.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.reverseCalc}>
        <label htmlFor="targetNet">I want to net</label>
        <div className={styles.reverseRow}>
          <span className={styles.currency}>$</span>
          <input
            id="targetNet"
            type="text"
            value={targetNet}
            onChange={(e) => setTargetNet(e.target.value)}
            placeholder="100"
          />
        </div>
        {(() => {
          if (!targetNet.trim()) return null;
          const suggestions = Object.keys(FEE_CONFIG)
            .map((key) => ({ key, ...suggestListPrice(targetNet, key) }))
            .filter((s) => s.listPrice);
          if (suggestions.length === 0) return null;
          return (
            <div className={styles.feeGrid}>
              {suggestions.map((s) => {
                const cfg = FEE_CONFIG[s.key];
                return (
                  <button
                    key={s.key}
                    className={styles.feeCard}
                    style={{ borderColor: cfg.color }}
                    onClick={() => setPrice(String(s.listPrice))}
                    type="button"
                  >
                    <div className={styles.feeName}>{cfg.name}</div>
                    <div className={styles.feeNet}>${s.listPrice.toFixed(2)}</div>
                    <div className={styles.feeMeta}>List price to net ${s.targetNet.toFixed(2)}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>
      <p className={styles.hint}>Fees are approximate. Verify current rates before listing.</p>
    </div>
  );
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
