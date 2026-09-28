'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {gateway} from '@/lib/gateway';
export async function cancelAppointment(f:FormData){const folio=String(f.get('folio')||'');if(!/^GUB-[A-F0-9]{16}$/.test(folio)||f.get('confirm')!=='on')throw Error('Confirma la cancelación.');const token=(await cookies()).get('gubia_manage_'+folio)?.value;if(!token)redirect('/consultar');const r=await gateway({action:'cancel',folio,management_token:token});redirect('/cita/'+folio+(r.error?'?error=No+se+pudo+cancelar.+Contacta+a+la+sucursal.':'?saved=1'));}
