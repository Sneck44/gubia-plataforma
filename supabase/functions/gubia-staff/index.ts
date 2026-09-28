import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
const url=Deno.env.get('SUPABASE_URL')!;
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const secret=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'Método inválido.'},405);
 const jwt=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!jwt)return json({error:'Inicia sesión.'},401);
 try{
 const [{data:u,error:ue},{data:c,error:ce}]=await Promise.all([db.auth.getUser(jwt),db.auth.getClaims(jwt)]);
 if(ue||ce||!u.user||c?.claims.sub!==u.user.id)return json({error:'Sesión inválida.'},401);
 if(c.claims.aal!=='aal2')return json({error:'Verifica tu cuenta con doble factor.'},403);
 const {data:actor,error:ae}=await db.from('profiles').select('role,active').eq('id',u.user.id).single();
 if(ae||!actor?.active||!['superadmin','administrador'].includes(actor.role))return json({error:'Sin permiso.'},403);
 const {data:allowed,error:le}=await db.rpc('gateway_rate_limit',{p_bucket:'staff-create:'+u.user.id,p_limit:10,p_seconds:3600});if(le||!allowed)return json({error:'Límite de creación alcanzado. Intenta más tarde.'},429);
 const raw=await req.text();if(raw.length>4000)return json({error:'Solicitud inválida.'},400);const b=JSON.parse(raw);
 const roles=actor.role==='superadmin'?['administrador','recepcion','marketing','consulta']:['recepcion','marketing','consulta'];
 if(b.action!=='create'||!roles.includes(b.role)||typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email)||typeof b.password!=='string'||b.password.length<12||b.password.length>128||typeof b.name!=='string'||!b.name.trim()||b.name.length>150)return json({error:'Revisa los datos y usa una contraseña de al menos 12 caracteres.'},400);
 const branch=['recepcion','consulta'].includes(b.role)?b.branch_id:null;
 if(['recepcion','consulta'].includes(b.role)){
 if(typeof branch!=='string'||!/^[a-f0-9-]{36}$/i.test(branch))return json({error:'Selecciona una sucursal.'},400);
 const {data:br,error:be}=await db.from('branches').select('id').eq('id',branch).eq('active',true).maybeSingle();if(be||!br)return json({error:'Sucursal no disponible.'},400);
 }
 const created=await db.auth.admin.createUser({email:b.email.trim().toLowerCase(),password:b.password,email_confirm:true});
 if(created.error||!created.data.user)return json({error:'No se pudo crear la cuenta. Revisa si el correo ya está registrado.'},400);
 const {error:pe}=await db.from('profiles').upsert({id:created.data.user.id,full_name:b.name.trim(),role:b.role,active:true,branch_id:branch});
 if(pe){await db.auth.admin.deleteUser(created.data.user.id);return json({error:'No se pudo asignar acceso. No se activó la cuenta.'},500);}
 return json({ok:true});
 }catch{return json({error:'No fue posible procesar la solicitud.'},400);}
});
