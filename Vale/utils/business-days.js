/**
 * Feriados nacionais brasileiros (fixos e móveis).
 * Retorna array de strings "YYYY-MM-DD" para o ano informado.
 */
function getBrazilianHolidays(year) {
  const fixed = [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independência
    `${year}-10-12`, // Nossa Senhora Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-12-25`, // Natal
  ];

  // Cálculo da Páscoa (algoritmo de Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day);

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const mobile = [
    format(addDays(easter, -47)), // Carnaval (segunda)
    format(addDays(easter, -46)), // Carnaval (terça)
    format(addDays(easter, -2)),  // Sexta-feira Santa
    format(easter),               // Páscoa
    format(addDays(easter, 60)),  // Corpus Christi
  ];

  return [...fixed, ...mobile];
}

/**
 * Verifica se uma data é dia útil (não é fim de semana nem feriado).
 */
function isBusinessDay(date, holidays) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Domingo ou Sábado

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  return !holidays.includes(dateStr);
}

/**
 * Adiciona N dias úteis a uma data.
 * Retorna a data final (Date object).
 */
export function addBusinessDays(startDate, businessDays) {
  const date = new Date(startDate);
  let added = 0;

  // Pré-carregar feriados do ano atual e próximo (para viradas de ano)
  const holidays = [
    ...getBrazilianHolidays(date.getFullYear()),
    ...getBrazilianHolidays(date.getFullYear() + 1),
  ];

  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date, holidays)) {
      added++;
    }
  }

  return date;
}
