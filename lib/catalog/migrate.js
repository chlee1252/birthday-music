import 'server-only';
import {readFile,readdir} from 'node:fs/promises';
import {database} from './database.js';
export async function migrateCatalog(){
 const directory=new URL('../../supabase/migrations/',import.meta.url);
 for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort())await database().query(await readFile(new URL(name,directory),'utf8'));
}
