# 음악 데이터 흐름

## 생일 연결 (화면 최우선)
`app/page.jsx` → `lib/birthday-provider.js` → `lib/birthday-data.js` → `components/music-section.jsx`.

발매: Wikidata P577의 일 단위 precision >=11 날짜에서 월·일 검색. 국내 아티스트의 국적/출신국가를 확인. 생년월일까지 일치하는 발매는 MusicBrainz 국내/한국어/공식 release 검색으로 보강. 제공처 검색이 부분 날짜도 반환하므로 결과 날짜를 다시 엄격하게 검증한다.

가수 별칭은 Wikidata entity labels/aliases를 가져온다. 멜론 앨범 검색에서 같은 가수·같은 발매일인 앨범의 실제 대표곡과 커버를 파싱. 앨범 발매와 싱글 최초 발매는 구분한다. 같은 날짜 섹션에서는 입력 연도의 정확히 같은 날짜를 제외한다. 한 앨범의 전곡으로 결과를 채우지 않는다.

가수 생일: Wikidata 대한민국 국적 가수/싱어송라이터/래퍼/음악가의 생일 월·일 검색 → 멜론 곡 검색 → 아티스트 이름 및 프로필 전체 생년월일 검증 → 아티스트 ID가 같은 크레딧만 채택 → 곡 상세 페이지의 커버. 동명이인 방지. 최대 6명의 후보, 가수당 4곡, 가수별 교차 배치 후 최대 10곡.

발매 후보는 최대 24개씩 확인한다. 후보 수 제한은 limited로 표시하며, 실제 조회 실패가 있을 때만 부분 결과 상태로 처리한다. 검색 완전성을 보장하지 않는다. 출처 장애와 일치 기록 없음은 별도 상태.

## 연도별 차트 (생일 연결 아래)
`lib/chart-provider.js`에서 멜론 `/chart/age/list.htm` 공개 HTML 조회, `lib/charts.js` 파싱. 국내 3개 연도 + 해외 1개 연도, 차트 순서 최대 10곡. 실제 커버 URL 포함. 과거 차트 집계 방식은 동일하지 않을 수 있다.

## 캐시와 한계
성공한 생일 검색 원천 응답·차트·전체 검색은 Next Data Cache에 최대 24시간 보관. 메모리 캐시 600개 제한과 중복 요청 병합도 적용. 멜론 작업은 배치당 동시 3개 제한. MusicBrainz는 프로세스 내 1.1초 간격, 8초 타임아웃. Wikidata 10초(타임아웃 재시도 없음), 멜론 8초 타임아웃. 다중 인스턴스 운영 시 공용 요청 제한 필요.

앨범 커버는 허용된 멜론 CDN HTTPS URL만 사용. 실패 시 클라이언트 음표 대체. YouTube는 검색 링크로 공식 영상 여부를 보장하지 않는다.

이전 `catalog.js`, `search.js`, `musicbrainz.js`, `music-policy.js`는 현재 페이지 결과 경로에서 사용하지 않는 과거 코드다. 정적 예시 곡을 fallback으로 사용하지 않는다.

## 카테고리별 한국 노래 / 팝송
`lib/section-filters.js`에서 exact/same/artists/year/ten/twenty 6개 선택을 분리한다. 한국 노래 기본, 팝송만 URL에 저장. 최초 SSR에서 두 지역을 모두 조회한다. 칩은 React 상태만 바꾸며 native history.replaceState로 다른 카테고리 선택과 공유 URL을 보존한다. 네트워크 재검색과 스크롤 이동은 없다.
팝송 후보는 위 6개 영어권 국가, 아티스트 sitelinks >=50 (발매 후보는 작품 >=5) 범위. 실제 채택은 멜론 역대 연도별 POP 차트의 곡 ID 또는 제목/가수 일치가 추가로 필요하다. 차트는 전체 최대 100곡을 서버에서 검사하며 UI는 10곡만 제공. 역대 차트 조회는 동시 3개로 제한, 성공 응답 24시간 캐시.
Wikidata는 연도별 동일 월일의 VALUES 목록으로 범위를 먼저 제한한 POST 쿼리 사용. 일 단위 날짜 precision 검증 유지. 월일을 전체 DB에 필터하던 쿼리의 지연 및 긴 GET URL의 431 오류를 해결.

## 오류 구분 및 재시도
외부 요청은 timeout/408/429/5xx/네트워크 오류에 한해 1회 재시도한다. 비용이 큰 Wikidata 쿼리는 timeout 재시도를 하지 않는다. 일부 조회가 실패해도 확인된 곡을 유지하며 실패/빈 결과/후보 수 제한을 구분한다. 일부 실패가 포함된 응답은 15초 캐시한다. MUSIC_DEBUG=1은 제공처 hostname과 오류 코드만 기록한다.
가수 검색에서 `(가수)` 등 직업 설명 접미사를 제거한다. 4월 7일 김수철 4곡 누락이 해결됐다. 생년월일이 제공처 간 다르거나 프로필에 없으면 검증상 제외될 수 있다.
2026-10-25 재검증에서 멜론 앨범 검색 HTTP 406이 실제 재현됐다. 외부 제공처 요청 거절로 발매일 카테고리는 unavailable이 될 수 있으며, 성공한 가수/차트 결과는 유지된다. 406은 반복 재시도하지 않는다.

후속 조사: 멜론 자체 Chrome 앨범 탭도 동일 페이지 오류를 표시했다. 406/404 시 곡 검색의 앨범명 필터와 곡 상세 발매일을 사용하도록 복구했다. 자세한 조건별 실험 결과는 `melon-406-investigation.md` 참조.

## 2014.01.01 시간 초과 / 독립 API fallback
- 1월 1일 기존 Wikidata VALUES 조회에서 발매·생일 검색 모두 TimeoutError(code 23)가 재현됐다. 연도만 알려진 기록도 내부 날짜가 1월 1일이므로 일 단위 precision >=11 검증을 유지한다. 1월 1일은 날짜 VALUES 대신 국적/음악 조건과 실제 날짜 statement에서 검색하며, label 조회 전에 후보를 제한한다. 그 외 날짜는 기존 VALUES 범위 유지.
- DOMException의 읽기 전용 숫자 code를 수정하는 대신 새 오류 객체로 감싸 TIMEOUT으로 정규화한다.
- 멜론 우선 → 앨범 406/404 시 멜론 곡 검색 → 결과가 없거나 조회 실패 시 Apple iTunes Search API. 요청당 발매 후보 fallback 최대 8개. 미국 스토어에 한국 곡이 제공되는 것을 실제 확인했으며 국적은 storefront가 아니라 기존 후보 검증에 의존한다.
- Apple 결과는 가수 별칭·앨범명·정확한 발매일을 모두 대조하며 한 앨범 대표곡만 채택. ID는 itunes: 접두사. API 출처와 Apple Music 링크를 커버 근처에 제공. 곡 미리듣기는 사용하지 않는다.
- 가수 검색의 요청 실패는 Wikidata에 연결된 Apple artist ID(P2850)가 있을 때만 Apple lookup으로 보완한다. 이름만 같은 다른 가수로 대체하지 않는다. 역사 차트의 대체 API로 Apple 검색 결과를 사용하지 않는다. 팝송의 기존 차트 검증도 유지.
- API 캐시 24시간/300개, 중복 요청 병합 및 프로세스당 3.1초 간격. 다중 서버에는 공용 제한기가 필요하다. https://performance-partners.apple.com/search-api
- 실제 API에서 AKMU/PLAY/200%/2014-04-07/커버 반환 확인. 멜론 406 강제 실패 테스트에서도 같은 곡으로 복구 확인.

## 팝송 Apple 우선 조회와 부분 재시도 (2026-10-25)
- 팝송 발매 곡은 Apple iTunes Search API를 우선 사용한다. MusicKit 인증이 필요한 Apple Music API와는 구분된다. 공개 iTunes API에 날짜 전용 검색이 없어 Wikidata 날짜 후보에 MusicBrainz 최초 발매 후보(정확한 날짜 재검증)를 보강한다. MB 결과는 최대 100개 범위이므로 완전한 목록은 아니다.
- 앨범 첫 곡 하나가 아닌 날짜·가수·앨범 일치 곡들을 검사한다. Apple에서 일치하는 곡이 없거나 요청이 실패하면 멜론을 확인한다. Apple 조회는 요청당 최대 6개 후보와 기존 간격 제한을 적용한다. 이후 후보는 멜론으로 확인한다.
- 멜론 POP 차트 외에도 동일 Wikidata 아티스트가 부른 곡/싱글 항목의 sitelinks >= 10을 인지도 근거로 허용한다. 순위나 청취량 자체는 아니다. 발매 후보 아티스트들을 한 SPARQL 요청으로 묶어 확인하며 아티스트 ID와 곡명을 함께 대조한다. 각 곡의 “인기곡 근거” 링크로 구분 가능하다.
- `/api/section?date=...&category=exact|same|artists|year|ten|twenty&region=kr|pop`는 선택한 카테고리·장르 하나만 조회한다. exact/same은 공통 월일 후보를 재사용하되 다른 분류의 곡 상세를 조회하지 않는다.
- 클라이언트는 해당 결과만 교체하고 다른 카테고리·선택 장르·페이지 스크롤을 유지한다. 진행 중 버튼 비활성화 및 로딩바, unmount 시 AbortController 처리. 실패한 메모리 응답은 재시도를 가로막지 않는다.
- 공식 자료: https://performance-partners.apple.com/search-api / https://musicbrainz.org/doc/MusicBrainz_API/Search/ReleaseGroupSearch

## 빈 결과와 조회 실패 구분 점검
- 2014-01-01 운영 API 실측: exact/kr는 ok·0곡, exact/pop는 부분 실패·1곡(Wikidata TIMEOUT), same/pop는 unavailable·0곡(TIMEOUT), artists/pop는 ok·0곡. 이는 측정 시점의 결과이며 외부 서비스에 따라 변한다.
- ok·0곡은 조회 범위 내 미발견이며 음악 전체에 존재하지 않는다는 뜻이 아니다. UI도 “조회한 데이터에서 일치하는 곡이 없어요”로 명시한다.
- Apple 실패 뒤 멜론의 빈 응답이 오류를 지우던 경로 수정. MusicBrainz 후보를 선별하는 팝 차트 조회 실패도 보존한다.
- 차트 empty는 곡 없음으로 단정하지 않고 “검색 결과를 확인하지 못했어요”와 재시도를 표시한다. 회귀 테스트 포함 총 49개 통과.
