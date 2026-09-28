import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 const dispatch=Deno.env.get('GUBIA_DISPATCH_TOKEN');
 if(!dispatch||req.headers.get('authorization')!=='Bearer '+dispatch)return json({error:'Unauthorized'},401);
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('GUBIA_MAIL_FROM');
 if(Deno.env.get('GUBIA_MAIL_ENABLED')!=='true'||!apiKey||!from)return json({error:'Notifications are not enabled'},503);
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:jobs,error}=await db.rpc('claim_notification_jobs');if(error)return json({error:'Queue unavailable'},503);
 let accepted=0,failed=0;
 for(const job of jobs||[]){
 const valid=await db.rpc('notification_job_valid',{p_id:job.id});if(valid.error||!valid.data)continue;
 let provider:string|null=null;
 try{
 const subject=job.kind==='cancelled'?'GUBIA · Cancelación de cita':job.kind==='reminder'?'GUBIA · Recordatorio de cita':'GUBIA · Datos de tu cita';
 const text=job.kind==='cancelled'?`Tu cita con folio ${job.folio} fue cancelada. Contacta a tu sucursal si necesitas ayuda.`:`Tienes una cita registrada en ${job.branch} el ${new Date(job.starts_at).toLocaleString('es-MX',{timeZone:job.timezone})}. Folio: ${job.folio}. Conserva tu clave de consulta y confirma la preparación con la sucursal. Si reprogramaste recientemente, consulta el estado actual en la plataforma.`;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'gubia-'+job.id},body:JSON.stringify({from,to:[job.recipient],subject,text}),signal:AbortSignal.timeout(10000)});
 const result=await response.json();if(response.ok&&typeof result.id==='string')provider=result.id;
 }catch{/* No contact details, keys, bodies or provider responses in logs. */}
 const finished=await db.rpc('finish_notification_job',{p_id:job.id,p_provider:provider});if(finished.error)failed++;else if(provider)accepted++;else failed++;
 }
 return json({accepted,failed});
});
