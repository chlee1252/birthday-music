import 'server-only';
import {persistentMusic} from './server-cache.js';
import {collectSearchResults} from './search-results.js';
import {getReleaseConnections,getBirthdayArtists} from './birthday-provider.js';
import {getChart} from './chart-provider.js';
export function getSearchResults(date){return persistentMusic(`search:${new Date().getFullYear()}:${date}`,()=>collectSearchResults(date,{releases:getReleaseConnections,artists:getBirthdayArtists,chart:getChart}));}
