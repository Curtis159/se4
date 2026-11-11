// Run locally once. The output file is private; never deploy it with the static app.
import {generateKeyPairSync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=privateKey.export({format:'jwk'});
const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
const destination=process.argv[2];if(!destination)throw Error('Usage: node create-push-keys.mjs <private-env-file>');
writeFileSync(destination,`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${jwk.d}\nPUSH_WORKER_SECRET=${(await import('node:crypto')).randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});
console.log('Private push environment written. Copy only VAPID_PUBLIC_KEY into online-config.json.');
