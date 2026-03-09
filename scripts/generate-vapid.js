// Run once: node scripts/generate-vapid.js
// Then paste output into Vercel Environment Variables
const { generateVAPIDKeys } = require('web-push');
const keys = generateVAPIDKeys();
console.log('\n✅ VAPID Keys — paste into .env.local + Vercel:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:your@email.com\n');
