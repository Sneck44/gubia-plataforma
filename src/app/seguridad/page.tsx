import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {SecurityForm} from '@/components/security-form';
import {logout} from '@/app/login/actions';
export default async function Security(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');const [{data:f,error:fe},{data:a,error:ae}]=await Promise.all([s.auth.mfa.listFactors(),s.auth.mfa.getAuthenticatorAssuranceLevel()]);if(fe||ae)throw Error('No se pudo verificar la cuenta.');return <main className="account-page"><Link href="/admin" className="quiet-link">← Volver al panel</Link><p className="eyebrow">TU CUENTA GUBIA</p><h1>Seguridad de acceso</h1><p>{user.email}</p><SecurityForm verified={f.totp.filter(x=>x.status==='verified')} aal2={a.currentLevel==='aal2'}/><form action={logout}><button className="button button-secondary">Cerrar sesión</button></form></main>;}
