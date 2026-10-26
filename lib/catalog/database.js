import 'server-only';
import pg from 'pg';
const state=globalThis.__musicCatalogDatabase??={pool:null,url:null};
export function catalogConfigured(){return !!process.env.MUSIC_DATABASE_URL;}
export function database(){
 const url=process.env.MUSIC_DATABASE_URL;
 if(!url)throw new Error('MUSIC_DATABASE_URL is not configured');
 if(state.pool&&state.url===url&&state.ca===process.env.MUSIC_DATABASE_CA)return state.pool;
 // Supabase: use the transaction pooler URL and sslmode=verify-full.
 // No named prepared statements, so this also works through transaction pooling.
 state.url=url;
 state.ca=process.env.MUSIC_DATABASE_CA;
 const connection=new URL(url);
 if(state.ca)for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])connection.searchParams.delete(key);
 state.pool=new pg.Pool({connectionString:connection.toString(),...(state.ca?{ssl:{ca:state.ca,rejectUnauthorized:true}}:{}),max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:3000,statement_timeout:5000,allowExitOnIdle:true});
 state.pool.on('error',()=>console.warn('[catalog] Database connection interrupted'));
 return state.pool;
}
export async function closeDatabase(){if(state.pool)await state.pool.end();state.pool=null;state.url=null;}
export async function transaction(task){
 const client=await database().connect();
 try{await client.query('begin');const value=await task(client);await client.query('commit');return value;}
 catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
