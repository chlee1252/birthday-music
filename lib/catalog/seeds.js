// Discovery seeds only: every album, track and release date is fetched from a source.
export const popArtists=['Taylor Swift','Adele','Michael Jackson','Madonna','Whitney Houston','Mariah Carey','Céline Dion','Elton John','Billy Joel','Stevie Wonder','Prince','Queen','The Beatles','ABBA','Eagles','Fleetwood Mac','Coldplay','Maroon 5','Bruno Mars','Ed Sheeran','Beyoncé','Rihanna','Lady Gaga','Katy Perry','Britney Spears','Justin Bieber','Justin Timberlake','Ariana Grande','Billie Eilish','The Weeknd','Dua Lipa','Shakira','Oasis','Nirvana','Green Day','Linkin Park','Backstreet Boys','Westlife','Cyndi Lauper','Bon Jovi'];
// Artist identities verified on their Apple Music pages (2026-10-26).
// These are discovery identifiers, not hardcoded songs or release dates.
const verifiedArtists={
 'Adele':{id:262836961,source:'https://music.apple.com/us/artist/adele/262836961'},
 'Michael Jackson':{id:32940,source:'https://music.apple.com/us/artist/michael-jackson/32940'},
 'Madonna':{id:20044,source:'https://music.apple.com/us/artist/madonna/20044'},
 'Céline Dion':{id:63729,source:'https://music.apple.com/us/artist/c%C3%A9line-dion/63729'},
};
export function initialJobs({artistLimit=popArtists.length,years=[1995,2000,2010,2020]}={}){
 return [...popArtists.slice(0,artistLimit).map(name=>({id:`apple:artist:${name}`,kind:'apple_artist',payload:{name,region:'pop',verified:verifiedArtists[name]||null},priority:10})),...years.map(year=>({id:`melon:chart:${year}`,kind:'melon_chart',payload:{year},priority:15}))];
}
