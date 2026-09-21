function main(workbook: ExcelScript.Workbook) {
  const SHEET_NAME = "CLIENTE";
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error('No se encontró la hoja "' + SHEET_NAME + '".');
  }

  const used = sheet.getUsedRange();
  if (!used) {
    throw new Error("La hoja CLIENTE está vacía.");
  }

  const texts = used.getTexts();
  const maxHeaderScan = Math.min(15, texts.length);

  function norm(value: string): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function findHeaderIndex(headers: string[], exacts: string[], containsAll?: string[]): number {
    const normalized = headers.map(norm);
    for (const wanted of exacts) {
      const w = norm(wanted);
      const exact = normalized.findIndex(h => h === w);
      if (exact >= 0) return exact;
    }
    if (containsAll && containsAll.length) {
      const parts = containsAll.map(norm);
      const idx = normalized.findIndex(h => parts.every(p => h.includes(p)));
      if (idx >= 0) return idx;
    }
    for (const wanted of exacts) {
      const w = norm(wanted);
      const idx = normalized.findIndex(h => h.includes(w));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  let headerRow = -1;
  for (let r = 0; r < maxHeaderScan; r++) {
    const row = texts[r].map(norm);
    const hasRoute = row.some(x => x === "ruta" || x.includes("ruta"));
    const hasOutnum = row.some(x => x === "outnum" || x.includes("outnum"));
    const hasClient = row.some(x => x === "razon social" || x === "cliente" || x.includes("razon social"));
    if (hasRoute && hasOutnum && hasClient) {
      headerRow = r;
      break;
    }
  }

  if (headerRow < 0) {
    throw new Error("No pude identificar la fila de encabezados. Debe contener Ruta, OUTNUM y Razón Social/Cliente.");
  }

  const headers = texts[headerRow];

  const colRoute = findHeaderIndex(headers, ["Ruta"]);
  const colOutnum = findHeaderIndex(headers, ["OUTNUM", "Código Cliente", "Cod Cliente"]);
  const colClient = findHeaderIndex(headers, ["Razón Social", "Razon Social", "Cliente"]);
  const colChannel = findHeaderIndex(headers, ["Canal"]);
  const colTerritory = findHeaderIndex(headers, ["Territorio"]);

  if (colRoute < 0 || colOutnum < 0 || colClient < 0) {
    throw new Error("Faltan columnas obligatorias: Ruta, OUTNUM o Razón Social.");
  }

  // Busca por nombre; si el archivo conserva el formato habitual, usa también
  // las posiciones conocidas como respaldo (índices base 0).
  function productColumn(exacts: string[], parts: string[], fallback: number): number {
    const found = findHeaderIndex(headers, exacts, parts);
    return found >= 0 ? found : fallback;
  }

  const cols = {
    aq15: productColumn(["Aquarius 1.5 L PET", "Aquarius 1,5 L PET"], ["aquarius","1.5"], 13),
    aq225: productColumn(["Aquarius 2.25 L PET", "Aquarius 2,25 L PET"], ["aquarius","2.25"], 14),
    aq25ret: productColumn(["Aquarius 2.5 L Ret PET", "Aquarius 2,5 L Ret PET"], ["aquarius","2.5","ret"], 15),
    aq375: productColumn(["Aquarius 375 ml PET"], ["aquarius","375"], 16),
    aq500nr: productColumn(["Aquarius 500 ml NR PET"], ["aquarius","500","nr"], 17),
    aq500ret: productColumn(["Aquarius 500 ml Ret"], ["aquarius","500","ret"], 18),
    fresh15: productColumn(["Cepita Fresh 1.5 L PET", "Cepita Fresh 1,5 L PET"], ["cepita","fresh","1.5"], 31),
    fresh3: productColumn(["Cepita Fresh 3 L PET", "Cepita Fresh 3L PET"], ["cepita","fresh","3"], 32)
  };

  function buyer(value: string): boolean {
    const v = norm(value);
    return v === "1" || v === "1,0" || v === "1.0" || v === "si" || v === "sí";
  }

  function routeValue(value: string): string {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    for (let r = 40; r <= 45; r++) {
      const rr = String(r);
      if (raw === rr || digits === rr || digits.endsWith(rr)) return rr;
    }
    return "";
  }

  const compact: (string | number)[][] = [];

  for (let r = headerRow + 1; r < texts.length; r++) {
    const row = texts[r];
    const route = routeValue(row[colRoute]);
    if (!route) continue;

    if (colTerritory >= 0) {
      const territory = norm(row[colTerritory]);
      if (territory && !territory.includes("tucum")) continue;
    }

    const outnum = String(row[colOutnum] || "").trim();
    const client = String(row[colClient] || "").trim();
    const channel = colChannel >= 0 ? String(row[colChannel] || "").trim() : "";

    if (!outnum || !client) continue;

    let mask = 0;
    if (buyer(row[cols.fresh15])) mask |= 1;
    if (buyer(row[cols.fresh3])) mask |= 2;
    if (buyer(row[cols.aq15])) mask |= 4;
    if (buyer(row[cols.aq225])) mask |= 8;
    if (buyer(row[cols.aq25ret])) mask |= 16;
    if (buyer(row[cols.aq375])) mask |= 32;
    if (buyer(row[cols.aq500nr])) mask |= 64;
    if (buyer(row[cols.aq500ret])) mask |= 128;

    compact.push([route, outnum, client, channel, mask]);
  }

  compact.sort((a, b) => {
    const routeCompare = String(a[0]).localeCompare(String(b[0]));
    if (routeCompare !== 0) return routeCompare;
    return String(a[2]).localeCompare(String(b[2]), "es");
  });

  return {
    u: new Date().toISOString(),
    c: compact
  };
}
