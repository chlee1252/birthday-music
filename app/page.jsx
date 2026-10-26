export const maxDuration = 120;
import {BirthdayInput} from '../components/birthday-input.jsx';
import {SearchForm} from '../components/search-form.jsx';
import {MusicSection} from '../components/music-section.jsx';
import {getSearchResults} from '../lib/search-provider.js';
import {Fragment} from 'react';
import {connection} from 'next/server';
import {ShareButton} from '../components/actions.jsx';
import {parseDate} from '../lib/date.js';
import {readFilters} from '../lib/section-filters.js';
export default async function Page({searchParams}) {
 await connection();
 const params=await searchParams,raw=typeof params.date==='string'?params.date:'';
 const date=parseDate(raw),invalid=!!raw&&!date;
 const filters=readFilters(params);
 const results=date?await getSearchResults(date):null;
 return <><header><a className="brand" href="/"><svg className="brand-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/><circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><path d="M7 16a9 9 0 0 1 9-9m9 9a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>그날의 트랙</span></a><a className="header-help" href="#about">이용 안내</a></header><main className={date?'has-results':''}>
 <section className="intro" aria-labelledby="headline"><div className="intro-copy"><span className="intro-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span><h1 id="headline">내 생일에는<br/>어떤 음악이 태어났을까?</h1><p>같은 날 태어난 노래, 생일이 같은 가수까지.</p></div>
 <SearchForm><label htmlFor="birthday">당신이 태어난 날</label><div className="input-shell"><BirthdayInput key={date||'empty'} id="birthday" name="date" type="text" inputMode="numeric" placeholder="YYYY.MM.DD" defaultValue={date?.replaceAll('-','.')||raw} maxLength={10} autoComplete="bday" aria-invalid={invalid||undefined} aria-describedby={invalid?'date-error':'date-hint'} required/></div>{invalid?<p id="date-error" role="alert">올바른 생년월일을 입력해주세요.</p>:<p id="date-hint">생년월일 8자리</p>}<button className="primary" type="submit">{date?'검색':'내 생일의 음악 찾기'}<span aria-hidden="true">↗</span></button></SearchForm>
 {!date&&<div className="discovery"><p>당신의 날짜와 이어지는 음악</p><ul className="discovery-list"><li><span aria-hidden="true">◉</span><div><b>나와 같은 날 태어난 노래</b></div></li><li><span aria-hidden="true">↶</span><div><b>다른 해, 같은 날짜의 음악</b></div></li><li><span aria-hidden="true">♫</span><div><b>생일이 같은 가수의 노래</b></div></li></ul></div>}</section>
 {date&&<section className="results" id="results">
 {results.map(section=><Fragment key={`${date}-${section.key}`}>
 {section.key==='year'&&<div className="annual-divider"><h2>그 시절 인기곡</h2></div>}
 <MusicSection {...section} date={date} filterKey={section.key} filters={filters}/>
 </Fragment>)}
 <ShareButton date={date}/></section>}
 <footer id="about"><details><summary>검색 기준 · 출처</summary><p>발매일은 수록 앨범 기준. 가수 생일은 월·일 기준입니다. 멜론·Wikidata·MusicBrainz·Apple의 확인 가능한 기록에서 찾습니다.</p><p>팝송은 멜론 역대 팝 차트 수록곡이나 Wikidata에 널리 등재된 해외 곡을 보여줍니다. 연도별 차트는 해당 연도의 상위곡입니다.</p><p>검색 결과가 모든 음악을 포함하지는 않습니다. 최초 싱글 발매일은 앨범과 다를 수 있습니다. 결과는 최대 24시간 캐시합니다.</p></details><details><summary>개인정보</summary><p>날짜는 URL과 브라우저 기록에 남습니다. 검색에 필요한 날짜를 외부 데이터 서비스에 전달하며, 생일을 별도 데이터베이스에 저장하지 않습니다.</p></details><p className="footer-note">그날의 트랙</p></footer></main></>;
}
