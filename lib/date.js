export function parseDate(value, today = new Date()) {
 if (typeof value !== 'string') return null;
 value=value.trim().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
 const m = value.trim().match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
 if (!m) return null;
 const [year,month,day]=m.slice(1).map(Number);
 const d=new Date(Date.UTC(year,month-1,day));
 if(year<1900 || d.getUTCFullYear()!==year || d.getUTCMonth()!==month-1 || d.getUTCDate()!==day) return null;
 const max=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const iso=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 return iso>max?null:iso;
}
