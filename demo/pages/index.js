import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const { track } = useAnalytics();
  const { status: extStatus, parseDepop, autofillGrailed } = useExtension();

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
    } else {
      setError(response?.error || "Could not autofill Grailed.");
      track("autofill_grailed_failed", { error: response?.error });
    }
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
        <p>Paste a Depop listing and improve it for Grailed.</p>
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

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.card}>
        <h2>1. Source</h2>
        <div className={styles.field}>
          <label htmlFor="url">Depop URL (optional)</label>
          <input
            id="url"
            type="url"
            placeholder="https://www.depop.com/products/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className={styles.hint}>
            Requires the Second Skin extension. Leave blank to enter fields
            manually.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            onClick={handleParseDepop}
            disabled={!url.trim() || loading}
          >
            Pull from Depop
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
          <h2>3. Improved for {result.platform}</h2>

          <div className={styles.output}>
            <h3>Title</h3>
            <p>{result.title}</p>
          </div>
          <button
            className={styles.secondary}
            onClick={() => copy("title", result.title)}
          >
            {copied === "title" ? "Copied!" : "Copy title"}
          </button>

          <div className={styles.output}>
            <h3>Description</h3>
            <p>{result.description}</p>
          </div>
          <button
            className={styles.secondary}
            onClick={() => copy("description", result.description)}
          >
            {copied === "description" ? "Copied!" : "Copy description"}
          </button>

          <div className={styles.output}>
            <h3>Tags</h3>
            <ul>
              {result.tags.map((tag, i) => (
                <li key={i}>{tag}</li>
              ))}
            </ul>
          </div>
          <button
            className={styles.secondary}
            onClick={() => copy("tags", result.tags.join(", "))}
          >
            {copied === "tags" ? "Copied!" : "Copy tags"}
          </button>

          <div className={styles.actions} style={{ marginTop: "1rem" }}>
            <button
              className={styles.primary}
              onClick={handleAutofillGrailed}
              disabled={extStatus !== "ready"}
            >
              Autofill Grailed
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
