export const TZ = 'America/Mexico_City';
export function todayMX(){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());}
export function validDate(s: string):boolean{const d=new Date(s+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function addDays(s:string,n:number){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function dateRange(s:string,week:boolean){const d=validDate(s)?s:todayMX();return {from:d,to:addDays(d,week?7:1),days:Array.from({length:week?7:1},(_,i)=>addDays(d,i))};}
export function csv(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export const states:Record<string,string>={pending:'Pendiente',confirmed:'Confirmada',attended:'Atendida',cancelled:'Cancelada',no_show:'No asistió',rescheduled:'Reprogramada'};
