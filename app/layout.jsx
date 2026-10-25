import './globals.css';
export const metadata = { title: '그날의 트랙 — 생일로 찾는 음악', description: '당신이 태어난 날과 연결된 음악을 찾아보세요.', robots: { index: false, follow: false } };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#121212' };
export default function Layout({children}) {return <html lang="ko"><body>{children}</body></html>}
