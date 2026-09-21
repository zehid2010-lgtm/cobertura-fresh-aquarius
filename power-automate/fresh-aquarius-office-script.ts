function main(workbook: ExcelScript.Workbook) {
  const sheet = workbook.getWorksheet("CLIENTE");
  if (!sheet) {
    throw new Error('No se encontró la hoja "CLIENTE".');
  }

  const used = sheet.getUsedRange(true);
  if (!used) {
    throw new Error('La hoja "CLIENTE" está vacía.');
  }

  const rowCount = used.getRowCount();
  if (rowCount < 8) {
    throw new Error('La hoja "CLIENTE" no tiene filas de datos.');
  }

  // El reporte usa encabezados en filas 6 y 7.
  // Leemos únicamente desde la fila 8 y columnas B:AG,
  // que contienen todos los campos necesarios.
  const rows = sheet.getRangeByIndexes(7, 1, rowCount - 7, 32).getTexts();

  function isBuyer(value: string): boolean {
    const v = String(value || "").trim().replace(",", ".");
    return v === "1" || v === "1.0";
  }

  function normalizeRoute(value: string): string {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");

    for (let r = 40; r <= 45; r++) {
      const rr = String(r);
      if (raw === rr || digits === rr || digits.endsWith(rr)) {
        return rr;
      }
    }
    return "";
  }

  // Máscara:
  // 1   Fresh 1,5 L
  // 2   Fresh 3 L
  // 4   Aquarius 1,5 L
  // 8   Aquarius 2,25 L
  // 16  Aquarius 2,5 L Ret
  // 32  Aquarius 375 ml
  // 64  Aquarius 500 ml NR
  // 128 Aquarius 500 ml Ret
  const output: (string | number)[][] = [];

  for (const row of rows) {
    // Dentro del rango B:AG:
    // B=0 Territorio, E=3 Ruta, F=4 Canal,
    // I=7 Razón Social, J=8 OUTNUM
    const territory = String(row[0] || "").trim();
    if (!territory.toLowerCase().includes("tucum")) {
      continue;
    }

    const route = normalizeRoute(row[3]);
    if (!route) {
      continue;
    }

    const channel = String(row[4] || "").trim();
    const client = String(row[7] || "").trim();
    const outnum = String(row[8] || "").trim();

    if (!client || !outnum) {
      continue;
    }

    let mask = 0;

    // Aquarius N:S => índices 12:17 dentro de B:AG
    if (isBuyer(row[12])) mask |= 4;   // 1.5 LTS NR PET
    if (isBuyer(row[13])) mask |= 8;   // 2.25 LTS NR PET
    if (isBuyer(row[14])) mask |= 16;  // 2.5 LTS RET PET
    if (isBuyer(row[15])) mask |= 32;  // 375 ML NR PET
    if (isBuyer(row[16])) mask |= 64;  // 500 ML NR PET
    if (isBuyer(row[17])) mask |= 128; // 500 ML RET

    // Cepita Fresh AF:AG => índices 30:31 dentro de B:AG
    if (isBuyer(row[30])) mask |= 1;   // 1.5 LTS NR PET
    if (isBuyer(row[31])) mask |= 2;   // 3 LTS NR

    output.push([route, outnum, client, channel, mask]);
  }

  output.sort((a, b) => {
    const routeCompare = String(a[0]).localeCompare(String(b[0]));
    if (routeCompare !== 0) return routeCompare;
    return String(a[2]).localeCompare(String(b[2]), "es");
  });

  return {
    u: new Date().toISOString(),
    c: output
  };
}
