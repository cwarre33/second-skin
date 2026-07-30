import { useEffect, useState } from "react";
import { improveListing } from "@/lib/api";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useExtension } from "@/hooks/useExtension";
import styles from "@/styles/Home.module.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState([]);
  const [measurements, setMeasurements] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [published, setPublished] = useState(null);

  const { track } = useAnalytics();
  const { status: extStatus, lastError: extError, retry: retryExtension, parseDepop, autofillGrailed, publishDepop } = useExtension();

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

    if (paramUrl) setUrl(paramUrl);
    if (paramTitle) setTitle(paramTitle);
    if (paramDescription) setDescription(paramDescription);
    if (paramTags) setTags(paramTags);
    if (paramPrice) setPrice(paramPrice);
    if (paramImage) setImages([paramImage]);
    if (paramMeasurements) setMeasurements(paramMeasurements);

    if (source) {
      track("prefill_from_query", { source });
    }
  }, [track]);

  const handleImprove = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    track("improve_clicked", { has_url: !!url });

    try {
      const payload = {
        platform: "grailed",
        title,
        description,
        tags,
        price,
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
    if (!result) return;
    track("autofill_grailed_clicked");
    const response = await autofillGrailed(result);
    if (response?.ok) {
      track("autofill_grailed_succeeded");
      setPublished("grailed");
    } else {
      setError(response?.error || "Could not autofill Grailed.");
      track("autofill_grailed_failed", { error: response?.error });
    }
  };

  const handlePublishDepop = async () => {
    if (!title.trim()) return;
    setError("");
    setPublished(null);
    track("publish_depop_clicked");

    const job = buildJob();
    const response = await publishDepop(job);
    if (response?.ok) {
      track("publish_depop_succeeded");
      setPublished("depop");
    } else {
      setError(response?.error || "Could not publish to Depop.");
      track("publish_depop_failed", { error: response?.error });
    }
  };

  const buildJob = () => ({
    title,
    description: [description, measurements].filter(Boolean).join("\n\n"),
    tags: tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    price,
    images,
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
        <p>Create once, publish everywhere. Start from scratch or import a Depop listing.</p>
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

      {extStatus === "missing" && (
        <section className={`${styles.card} ${styles.ctaCard}`}>
          <h2>Install the Second Skin extension</h2>
          <p>
            Copy buttons work without it, but the extension enables one-click
            Grailed autofill.
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

        {images.length > 0 && (
          <div className={styles.thumbnails}>
            {images.slice(0, 4).map((src, i) => (
              <img key={i} src={src} alt={`Depop image ${i + 1}`} />
            ))}
          </div>
        )}
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
            <div className={styles.thumbnails}>
              {images.map((src, i) => (
                <div key={i} className={styles.thumbWrap}>
                  <img src={src} alt={`Uploaded ${i + 1}`} />
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
          )}
        </div>
        <div className={styles.actions}>
          <button
            className={styles.primary}
            onClick={handleImprove}
            disabled={(!title.trim() && !description.trim()) || loading}
          >
            {loading ? "Improving..." : "Improve with AI"}
          </button>
        </div>
      </section>

      {result && (
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
      )}
    </div>
  );
}
