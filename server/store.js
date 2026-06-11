import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Simple JSON-file backed collection store (list of records with an id).
export function makeStore(dataDir, filename) {
  const file = path.join(dataDir, filename);

  function readAll() {
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      return [];
    }
  }

  function writeAll(items) {
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
  }

  return {
    list: () => readAll(),
    create(item) {
      const items = readAll();
      const created = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...item };
      items.push(created);
      writeAll(items);
      return created;
    },
    update(id, patch) {
      const items = readAll();
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...patch, id };
      writeAll(items);
      return items[idx];
    },
    remove(id) {
      const items = readAll();
      const next = items.filter((i) => i.id !== id);
      if (next.length === items.length) return false;
      writeAll(next);
      return true;
    },
  };
}
