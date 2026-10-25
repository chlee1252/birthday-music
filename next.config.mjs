import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
/** @type {import('next').NextConfig} */
const nextConfig = { poweredByHeader: false, outputFileTracingRoot: root, turbopack: { root } };
export default nextConfig;
