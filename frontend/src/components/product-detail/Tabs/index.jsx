import { useState } from 'react';
import styles from './Tabs.module.css';

/**
 * Generic tab shell for the product detail page.
 * Consumers pass a `tabs` array: [{ id, label, Component }]
 * Each Component receives the full `product` object as a prop.
 *
 * This file has no knowledge of price history, predictions, etc —
 * it only manages which tab is active and renders the panel.
 */
export default function Tabs({ tabs, product }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);

  const activeTab = tabs.find((tab) => tab.id === activeId);
  const ActiveComponent = activeTab?.Component;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === activeId}
            className={`${styles.tab} ${tab.id === activeId ? styles.tabActive : ''}`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel} role="tabpanel">
        {ActiveComponent ? <ActiveComponent product={product} /> : null}
      </div>
    </div>
  );
}