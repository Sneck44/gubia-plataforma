'use server';
import {requireStaff} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
async function context(){const c=await requireStaff('team:manage');const {data,error}=await c.supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(error||data.currentLevel!=='aal2')redirect('/seguridad');return c;}
export async function createMember(f:FormData){const {supabase}=await context();const {data,error}=await supabase.functions.invoke('gubia-staff',{body:{action:'create',email:String(f.get('email')||''),password:String(f.get('password')||''),name:String(f.get('name')||''),role:String(f.get('role')||''),branch_id:String(f.get('branch_id')||'')}});revalidatePath('/admin/equipo');redirect('/admin/equipo?'+(error||!data?.ok?'error='+encodeURIComponent('No se creó la cuenta. Revisa correo, contraseña y sucursal; el correo no debe estar registrado.'):'saved=1'));}
export async function updateMember(f:FormData){const {supabase}=await context();const {error}=await supabase.rpc('manage_profile',{p_id:String(f.get('id')||''),p_role:String(f.get('role')||''),p_active:f.get('active')==='on',p_branch:String(f.get('branch_id')||'')||null});revalidatePath('/admin/equipo');redirect('/admin/equipo?'+(error?'error='+encodeURIComponent('No se pudo cambiar el acceso. Revisa la sucursal y los permisos.'):'saved=1'));}
