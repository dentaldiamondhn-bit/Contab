// Cliente Supabase falso en memoria para tests del servicio de pólizas.
// Implementa solo las cadenas usadas por journal-service (thenable).
// NOTA: el estado interno usa prefijo _ para no colisionar con los métodos.

export function makeFakeDb(seed = {}) {
  const store = {
    Transaction: [...(seed.transactions || [])],
    JournalEntry: [],
    Account: [...(seed.accounts || [])],
    ...(seed.tables || {}),
  };
  const calls = { select: [], insert: [] };
  const failCols = new Set(seed.failCols || []);
  let seq = 1;

  const execSelect = (b) => {
    calls.select.push({ table: b.table, filters: b._filters, in: b._inFilter });
    let rows = [...(store[b.table] || [])];
    for (const [op, c, v] of b._filters) {
      if (op === 'eq') {
        if (failCols.has(`${b.table}.${c}`)) {
          return { data: null, error: { message: `column ${c} does not exist` } };
        }
        rows = rows.filter((r) => String(r[c]) === String(v));
      } else if (op === 'lt') {
        rows = rows.filter((r) => String(r[c] ?? '') < String(v));
      } else if (op === 'lte') {
        rows = rows.filter((r) => String(r[c] ?? '') <= String(v));
      } else if (op === 'gte') {
        rows = rows.filter((r) => String(r[c] ?? '') >= String(v));
      }
    }
    if (b._inFilter) {
      const [c, vs] = b._inFilter;
      rows = rows.filter((r) => vs.map(String).includes(String(r[c])));
    }
    if (b._order) {
      const [c, o] = b._order;
      const dir = o && o.ascending === false ? -1 : 1;
      rows = [...rows].sort((a, r2) => (Number(a[c]) - Number(r2[c])) * dir);
    }
    if (b._limit != null) rows = rows.slice(0, b._limit);
    if (b._single) return { data: rows[0] || null, error: null };
    return { data: rows, error: null };
  };

  const execUpdate = (b) => {
    calls.update = calls.update || [];
    calls.update.push({ table: b.table, obj: b._updateObj, filters: b._filters });
    if (!store[b.table]) store[b.table] = [];
    let rows = [...store[b.table]];
    for (const [op, c, v] of b._filters) {
      if (op === 'eq') rows = rows.filter((r) => String(r[c]) === String(v));
      else if (op === 'lt') rows = rows.filter((r) => String(r[c]) < String(v));
      else if (op === 'lte') rows = rows.filter((r) => String(r[c]) <= String(v));
      else if (op === 'gte') rows = rows.filter((r) => String(r[c]) >= String(v));
    }
    for (const r of rows) Object.assign(r, b._updateObj);
    return { data: rows, error: null };
  };

  const execInsert = (b) => {
    calls.insert.push({ table: b.table, rows: b._insertRows });
    if (seed.insertError && seed.insertError.table === b.table) {
      return { data: null, error: { message: seed.insertError.message } };
    }
    const rows = (Array.isArray(b._insertRows) ? b._insertRows : [b._insertRows]).map((r) => ({
      id: r.id || `fake-${seq++}`,
      ...r,
    }));
    if (!store[b.table]) store[b.table] = [];
    store[b.table].push(...rows);
    return { data: b._single ? rows[0] || null : rows, error: null };
  };

  const builder = (table) => {
    const b = {
      table,
      _filters: [],
      _inFilter: null,
      _order: null,
      _limit: null,
      _single: false,
      _insertRows: null,
      _updateObj: null,
      select() {
        return this;
      },
      eq(c, v) {
        this._filters.push(['eq', c, v]);
        return this;
      },
      lt(c, v) {
        this._filters.push(['lt', c, v]);
        return this;
      },
      lte(c, v) {
        this._filters.push(['lte', c, v]);
        return this;
      },
      gte(c, v) {
        this._filters.push(['gte', c, v]);
        return this;
      },
      update(obj) {
        this._updateObj = obj;
        return this;
      },
      in(c, v) {
        this._inFilter = [c, v];
        return this;
      },
      order(c, o) {
        this._order = [c, o];
        return this;
      },
      limit(n) {
        this._limit = n;
        return this;
      },
      insert(rows) {
        this._insertRows = rows;
        return this;
      },
      single() {
        this._single = true;
        return this;
      },
      maybeSingle() {
        this._single = true;
        return this;
      },
      then(resolve, reject) {
        try {
          if (this._insertRows !== null) resolve(execInsert(this));
          else if (this._updateObj !== null && this._updateObj !== undefined) resolve(execUpdate(this));
          else resolve(execSelect(this));
        } catch (e) {
          reject(e);
        }
      },
    };
    return b;
  };

  return { db: { from: (table) => builder(table) }, store, calls };
}
