/**
 * Doble de `@/lib/supabase/server-lazy` para probar `purchase-db` sin red.
 *
 * Implementa **solo** el encadenado que la libreria usa (`.from().select()
 * .eq().in().ilike().maybeSingle().single()` y los builders de insert/update/
 * delete). Los filtros se acumulan y se resuelven al final contra las filas de
 * `mockState.bd`, para que los testes puedan afirmar sobre la consulta que se
 * dio, no sobre como se construyo.
 */

function coincide(fila, filtros) {
  for (const [col, valor] of filtros) {
    if (valor === null) {
      if (fila[col] !== null && fila[col] !== undefined) return false;
      continue;
    }
    if (Array.isArray(valor)) {
      if (!valor.map(String).includes(String(fila[col]))) return false;
      continue;
    }
    if (typeof valor === 'string' && valor.startsWith('__ilike:')) {
      const pat = new RegExp('^' + valor.slice(8).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      if (!pat.test(String(fila[col] ?? ''))) return false;
      continue;
    }
    if (String(fila[col]) !== String(valor)) return false;
  }
  return true;
}

function applying(filas, filtros, cols) {
  const out = filas.filter((f) => coincide(f, filtros));
  if (!cols || cols === '*') return out;
  const campos = String(cols).split(',').map((c) => c.trim());
  if (campos.includes('*')) return out;
  return out.map((f) => {
    const r = {};
    for (const c of campos) r[c] = f[c];
    return r;
  });
}

class Builder {
  constructor(sb, tabla, verb, filtros = [], fila = null, cols = '*') {
    this.sb = sb;
    this.tabla = tabla;
    this.verb = verb;
    this.filtros = filtros;
    this.fila = fila;
    this.cols = cols;
    this.orden = null;
  }

  _clone(extra = {}) {
    return new Builder(this.sb, this.tabla, this.verb, this.filtros, this.fila, this.cols);
  }

  select(cols) { const b = this._clone(); b.cols = cols; return b; }
  eq(col, val) { const b = this._clone(); b.filtros = [...b.filtros, [col, val]]; return b; }
  in(col, vals) { const b = this._clone(); b.filtros = [...b.filtros, [col, vals]]; return b; }
  ilike(col, val) { const b = this._clone(); b.filtros = [...b.filtros, [col, '__ilike:' + val]]; return b; }
  order(col) { const b = this._clone(); b.orden = col; return b; }
  limit() { return this._clone(); }
  single() { const b = this._clone(); b.modo = 'single'; return b; }
  maybeSingle() { const b = this._clone(); b.modo = 'maybeSingle'; return b; }

  insert(fila) { const b = this._clone(); b.fila = fila; b.verb = 'insert'; return b; }
  update(fila) { const b = this._clone(); b.fila = fila; b.verb = 'update'; return b; }
  delete() { const b = this._clone(); b.verb = 'delete'; return b; }

  async then(resolve, reject) {
    const { data, error } = await this._resolver();
    return resolve({ data, error });
  }

  async _resolver() {
    const filas = this.sb.tabla(this.tabla);
    const st = this.sb.estado;

    if (this.verb === 'insert') {
      if (!this.sb.esInsertable(this.tabla)) {
        return { data: null, error: { code: '42501', message: 'RLS: insert blocked' } };
      }
      // `.insert()` acepta una fila o un array: cada elemento es una fila.
      const entradas = Array.isArray(this.fila) ? this.fila : [this.fila];
      const creadas = entradas.map((f) => ({ id: `nuevo-${++st.seq}`, ...f }));
      filas.push(...creadas);

      if (this.cols !== '*') {
        const campos = String(this.cols).split(',').map((c) => c.trim());
        const recortadas = creadas.map((c) => {
          const r = {};
          for (const campo of campos) if (campo !== '*') r[campo] = c[campo];
          return r;
        });
        return { data: this.modo === 'single' ? recortadas[0] : recortadas, error: null };
      }
      return { data: this.modo === 'single' ? creadas[0] : creadas, error: null };
    }

    if (this.verb === 'update') {
      const afectadas = filas.filter((f) => coincide(f, this.filtros));
      for (const f of afectadas) Object.assign(f, this.fila);
      if (this.modo === 'single') {
        if (afectadas.length === 0) return { data: null, error: { code: 'PGRST116', message: '0 rows' } };
        return { data: this.cols === '*' ? afectadas[0] : applying([afectadas[0]], this.filtros, this.cols)[0], error: null };
      }
      return { data: this.cols === '*' ? afectadas : applying(afectadas, this.filtros, this.cols), error: null };
    }

    if (this.verb === 'delete') {
      const idx = [];
      for (let i = 0; i < filas.length; i++) if (coincide(filas[i], this.filtros)) idx.push(i);
      for (const i of idx.reverse()) filas.splice(i, 1);
      return { data: null, error: null };
    }

    let out = applying(filas, this.filtros, this.cols);
    if (this.orden) {
      const col = this.orden;
      out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1));
    }
    if (this.modo === 'single') {
      if (out.length === 0) return { data: null, error: { code: 'PGRST116', message: '0 rows' } };
      if (out.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } };
      return { data: out[0], error: null };
    }
    if (this.modo === 'maybeSingle') {
      if (out.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } };
      return { data: out.length ? out[0] : null, error: null };
    }
    return { data: out, error: null };
  }
}

export function crearSupabaseFalso(mockState) {
  return {
    estado: mockState,
    tabla(nombre) {
      if (!mockState.bd[nombre]) mockState.bd[nombre] = [];
      return mockState.bd[nombre];
    },
    esInsertable(nombre) {
      if (mockState.bloquearInsert?.includes(nombre)) return false;
      return true;
    },
    from(nombre) {
      return new Builder(this, nombre, 'select');
    },
  };
}