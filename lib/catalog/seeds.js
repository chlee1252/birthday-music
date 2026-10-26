// Discovery seeds only: every album, track and release date is fetched from a source.
export const popArtists=['Taylor Swift','Adele','Michael Jackson','Madonna','Whitney Houston','Mariah Carey','Céline Dion','Elton John','Billy Joel','Stevie Wonder','Prince','Queen','The Beatles','ABBA','Eagles','Fleetwood Mac','Coldplay','Maroon 5','Bruno Mars','Ed Sheeran','Beyoncé','Rihanna','Lady Gaga','Katy Perry','Britney Spears','Justin Bieber','Justin Timberlake','Ariana Grande','Billie Eilish','The Weeknd','Dua Lipa','Shakira','Oasis','Nirvana','Green Day','Linkin Park','Backstreet Boys','Westlife','Cyndi Lauper','Bon Jovi'];
// Artist identities verified on their Apple Music pages (2026-10-26).
// These are discovery identifiers, not hardcoded songs or release dates.
const verifiedArtists={
 'Ed Sheeran':{id:183313439,source:'https://www.wikidata.org/wiki/Q47447'},
 'Green Day':{id:954266,source:'https://www.wikidata.org/wiki/Q47871'},
 'Billy Joel':{id:485953,source:'https://www.wikidata.org/wiki/Q194333'},
 'Prince':{id:155814,source:'https://www.wikidata.org/wiki/Q7542'},
 'Oasis':{id:512633,source:'https://www.wikidata.org/wiki/Q382890'},
 'Queen':{id:3296287,source:'https://www.wikidata.org/wiki/Q15862'},
 'Eagles':{id:1053549,source:'https://www.wikidata.org/wiki/Q189635'},
 'Nirvana':{id:112018,source:'https://www.wikidata.org/wiki/Q11649'},
 'ABBA':{id:372976,source:'https://www.wikidata.org/wiki/Q18233'},
 'Bon Jovi':{id:122782,source:'https://www.wikidata.org/wiki/Q259254'},
 'Rihanna':{id:63346553,source:'https://music.apple.com/us/artist/rihanna/63346553'},
 'Justin Bieber':{id:320569549,source:'https://music.apple.com/us/artist/justin-bieber/320569549'},
 'Justin Timberlake':{id:398128,source:'https://music.apple.com/us/artist/justin-timberlake/398128'},
 'The Weeknd':{id:479756766,source:'https://music.apple.com/us/artist/the-weeknd/479756766'},
 'Shakira':{id:889327,source:'https://music.apple.com/us/artist/shakira/889327'},
 'Adele':{id:262836961,source:'https://music.apple.com/us/artist/adele/262836961'},
 'Michael Jackson':{id:32940,source:'https://music.apple.com/us/artist/michael-jackson/32940'},
 'Madonna':{id:20044,source:'https://music.apple.com/us/artist/madonna/20044'},
 'Céline Dion':{id:63729,source:'https://music.apple.com/us/artist/c%C3%A9line-dion/63729'},
};
export function initialJobs({artistLimit=popArtists.length,years=Array.from({length:new Date().getFullYear()-1980},(_,i)=>1980+i)}={}){
 return [...popArtists.slice(0,artistLimit).map(name=>({id:`apple:artist:${name}`,kind:'apple_artist',payload:{name,region:'pop',verified:verifiedArtists[name]||null},priority:10})),...years.flatMap(year=>['kr','pop'].map(region=>({id:`melon:chart:${region}:${year}`,kind:'melon_chart',payload:{year,region},priority:15})))];
}
