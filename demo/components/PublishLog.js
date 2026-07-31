import styles from "@/styles/Home.module.css";

/**
 * Transient publish-outcome log surface. Extracted from demo/pages/index.js
 * (#6 structure cleanup) without behavior change. Renders nothing when empty
 * so the surrounding layout is unchanged.
 */
export function PublishLog({ entries, onClear }) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.card}>
      <div className={styles.publishLogHeader}>
        <h2>Publish log</h2>
        <button className={styles.secondary} onClick={onClear}>Clear</button>
      </div>
      <ul className={styles.publishLog}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={
              entry.status === "failed" ? styles.publishError : styles.publishSuccess
            }
          >
            <strong>{entry.title}</strong>
            {" — "}
            {entry.platform} {entry.status === "published" ? "published" : "failed"}
            {entry.error && (
              <span className={styles.publishErrorMsg}>: {entry.error}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}